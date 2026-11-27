#!/usr/bin/env python3
"""Local editor for buusystems.com.

    python3 _editor/server.py            # http://127.0.0.1:8740
    python3 _editor/server.py --port 9000 --host 0.0.0.0

Serves the site with an edit toolbar. Any element with data-edit="key" can be
edited in place; images with data-edit can be replaced by clicking or dropping
a file. Save writes the changes back into the HTML files; Publish commits and
pushes, and GitHub Pages rebuilds in a minute or two. The page reloads by itself
when files change on disk, so edits made in a text editor show up too.

Pages ignores this folder because its name starts with "_". Standard library
only, no install step.
"""
import argparse
import http.server
import json
import mimetypes
import os
import re
import subprocess
import sys
import urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EDITOR = Path(__file__).resolve().parent
UPLOADS = ROOT / "assets" / "uploads"
VOID = {"img", "br", "hr", "input", "meta", "link", "source"}
SKIP_DIRS = {".git", "_editor", "node_modules"}
INJECT = '<script src="/_editor/editor.js" defer></script>'


def site_version():
    newest = 0.0
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for name in filenames:
            try:
                newest = max(newest, os.stat(os.path.join(dirpath, name)).st_mtime)
            except OSError:
                pass
    return newest


def resolve(url_path):
    """Map a URL path to a file under ROOT, or None."""
    rel = urllib.parse.unquote(url_path).lstrip("/")
    target = (ROOT / rel).resolve()
    if target != ROOT and ROOT not in target.parents:
        return None
    if target.is_dir():
        target = target / "index.html"
    elif not target.exists() and not target.suffix and (target.with_suffix(".html")).exists():
        target = target.with_suffix(".html")
    return target if target.is_file() else None


def find_start_tag(html, key):
    marker = f'data-edit="{key}"'
    hits = [m.start() for m in re.finditer(re.escape(marker), html)]
    if len(hits) != 1:
        raise ValueError(f'expected one data-edit="{key}", found {len(hits)}')
    start = html.rfind("<", 0, hits[0])
    end, quote = hits[0], None
    while end < len(html):
        c = html[end]
        if quote:
            if c == quote:
                quote = None
        elif c in "\"'":
            quote = c
        elif c == ">":
            break
        end += 1
    tag = re.match(r"<([a-zA-Z0-9-]+)", html[start:]).group(1).lower()
    return start, end + 1, tag


def find_close(html, pos, tag):
    depth = 1
    for m in re.finditer(rf"<(/?){tag}\b[^>]*?(/?)>", html[pos:], re.I):
        if m.group(2):
            continue
        depth += -1 if m.group(1) else 1
        if depth == 0:
            return pos + m.start(), pos + m.end()
    raise ValueError(f"no closing </{tag}>")


def set_attr(start_tag, name, value):
    value = value.replace("&", "&amp;").replace('"', "&quot;")
    pattern = rf'(\s{name}=)"[^"]*"'
    if re.search(pattern, start_tag):
        return re.sub(pattern, lambda m: f'{m.group(1)}"{value}"', start_tag, count=1)
    return re.sub(r"\s*/?>$", lambda m: f' {name}="{value}"{m.group(0)}', start_tag, count=1)


def apply_edit(html, edit):
    start, end, tag = find_start_tag(html, edit["key"])
    start_tag = html[start:end]
    for attr in ("src", "href", "alt"):
        if attr in edit:
            start_tag = set_attr(start_tag, attr, edit[attr])
    html = html[:start] + start_tag + html[end:]
    end = start + len(start_tag)
    if "html" in edit and tag not in VOID:
        close_start, _ = find_close(html, end, tag)
        html = html[:end] + edit["html"] + html[close_start:]
    return html


def git(*args):
    proc = subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True)
    return proc.returncode, (proc.stdout + proc.stderr).strip()


class Handler(http.server.BaseHTTPRequestHandler):
    server_version = "buu-editor"

    def log_message(self, fmt, *args):
        if "/_editor/version" not in self.path:
            sys.stderr.write("%s %s\n" % (self.command, fmt % args))

    def send(self, code, body, ctype="application/json"):
        if isinstance(body, (dict, list)):
            body = json.dumps(body)
        if isinstance(body, str):
            body = body.encode()
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def read_body(self):
        return self.rfile.read(int(self.headers.get("Content-Length", 0)))

    def do_HEAD(self):
        self.do_GET()

    def do_GET(self):
        path = urllib.parse.urlparse(self.path).path
        if path == "/_editor/version":
            return self.send(200, {"version": site_version()})
        if path == "/_editor/status":
            _, branch = git("rev-parse", "--abbrev-ref", "HEAD")
            _, status = git("status", "--short")
            return self.send(200, {"branch": branch, "status": status})
        if path == "/_editor/editor.js":
            return self.send(200, (EDITOR / "editor.js").read_bytes(), "text/javascript")
        target = resolve(path)
        if target is None:
            return self.send(404, "Not found", "text/plain")
        if target.name == "index.html" and not path.endswith("/") and not path.endswith(".html"):
            self.send_response(301)
            self.send_header("Location", path + "/")
            self.end_headers()
            return
        body = target.read_bytes()
        ctype = mimetypes.guess_type(target.name)[0] or "application/octet-stream"
        if target.suffix == ".html":
            text = body.decode()
            text = text.replace("</body>", INJECT + "\n</body>", 1) if "</body>" in text else text + INJECT
            body, ctype = text.encode(), "text/html; charset=utf-8"
        self.send(200, body, ctype)

    def do_POST(self):
        path = urllib.parse.urlparse(self.path)
        try:
            if path.path == "/_editor/save":
                return self.save(json.loads(self.read_body()))
            if path.path == "/_editor/upload":
                return self.upload(urllib.parse.parse_qs(path.query).get("name", ["image"])[0])
            if path.path == "/_editor/publish":
                return self.publish(json.loads(self.read_body() or b"{}"))
        except Exception as exc:  # report to the toolbar instead of dropping the connection
            return self.send(400, {"error": str(exc)})
        self.send(404, {"error": "unknown endpoint"})

    def save(self, req):
        target = resolve(urllib.parse.urlparse(req["page"]).path)
        if target is None or target.suffix != ".html":
            raise ValueError("page not found")
        html = target.read_text()
        for edit in req["edits"]:
            html = apply_edit(html, edit)
        target.write_text(html)
        self.send(200, {"saved": len(req["edits"]), "file": str(target.relative_to(ROOT))})

    def upload(self, name):
        stem, ext = os.path.splitext(os.path.basename(name))
        stem = re.sub(r"[^a-zA-Z0-9_-]+", "-", stem).strip("-").lower() or "image"
        ext = ext.lower() if ext.lower() in {".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp"} else ".jpg"
        UPLOADS.mkdir(parents=True, exist_ok=True)
        dest, n = UPLOADS / f"{stem}{ext}", 1
        while dest.exists():
            n += 1
            dest = UPLOADS / f"{stem}-{n}{ext}"
        dest.write_bytes(self.read_body())
        self.send(200, {"src": "/" + str(dest.relative_to(ROOT))})

    def publish(self, req):
        message = (req.get("message") or "Update site from the editor").strip()
        log = []
        code, out = git("add", "-A")
        log.append(out)
        code, out = git("diff", "--cached", "--quiet")
        if code != 0:
            code, out = git("commit", "-m", message)
            log.append(out)
            if code != 0:
                return self.send(400, {"error": out})
        code, out = git("push")
        log.append(out)
        if code != 0:
            return self.send(400, {"error": out})
        # Refresh the copy on bpfboot.buusystems.com.
        done = subprocess.run([str(ROOT / "_tools" / "subdomains.sh")], capture_output=True, text=True)
        log.append(done.stdout + done.stderr)
        if done.returncode != 0:
            return self.send(400, {"error": "buusystems.com is published, but a subdomain copy failed:\n" + log[-1]})
        self.send(200, {"log": "\n".join(x for x in log if x)})


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=8740)
    args = ap.parse_args()
    server = http.server.ThreadingHTTPServer((args.host, args.port), Handler)
    print(f"Editing {ROOT} at http://{args.host}:{args.port}/", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
