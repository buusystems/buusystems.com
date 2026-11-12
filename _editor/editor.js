// Edit toolbar for the local editor (_editor/server.py). Never published.
(() => {
  const css = `
  .be-bar{position:fixed;z-index:2147483000;right:16px;bottom:16px;display:flex;gap:6px;align-items:center;padding:6px;background:#161616;color:#fff;border-radius:999px;font:500 13px/1 "Helvetica Neue",Arial,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.35)}
  .be-bar button{border:0;border-radius:999px;padding:9px 14px;background:#2d2d2d;color:#fff;font:inherit;cursor:pointer}
  .be-bar button:hover{background:#444}.be-bar button.on{background:#DD0000}.be-bar button:disabled{opacity:.4;cursor:default}
  .be-bar .be-msg{padding:0 8px;max-width:340px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#bbb}
  body.be-editing [data-edit]{outline:1.5px dashed rgba(221,0,0,.55);outline-offset:3px;cursor:text}
  body.be-editing [data-edit]:hover{outline-style:solid}
  body.be-editing [data-edit]:focus{outline:2px solid #DD0000}
  body.be-editing img[data-edit]{cursor:pointer}
  body.be-editing .be-dirty{outline-color:#f0a000!important}
  body.be-editing img.be-drop{outline:4px solid #DD0000!important}
  .be-link{position:absolute;z-index:2147483001;display:flex;gap:4px;padding:6px;background:#161616;border-radius:8px;box-shadow:0 6px 20px rgba(0,0,0,.3)}
  .be-link input{width:280px;padding:6px 8px;border:0;border-radius:5px;font:13px Menlo,monospace}
  .be-link button{border:0;border-radius:5px;padding:6px 10px;background:#DD0000;color:#fff;cursor:pointer}`;
  document.head.insertAdjacentHTML("beforeend", `<style>${css}</style>`);

  const bar = document.createElement("div");
  bar.className = "be-bar";
  bar.innerHTML = `<span class="be-msg">Editor</span>
    <button data-a="edit" title="Click text to edit it, click an image to replace it">Edit</button>
    <button data-a="save" disabled title="Write changes into the HTML files (Ctrl+S)">Save</button>
    <button data-a="publish" title="Commit and push to buusystems.com">Publish</button>`;
  document.body.append(bar);
  const msg = bar.querySelector(".be-msg");
  const btn = (a) => bar.querySelector(`[data-a="${a}"]`);
  const say = (t) => { msg.textContent = t; msg.title = t; };

  const nodes = [...document.querySelectorAll("[data-edit]")];
  const original = new Map(nodes.map((el) => [el, snapshot(el)]));
  let editing = sessionStorage.getItem("be-editing") === "1";
  let confirmPublish = false;

  function snapshot(el) {
    return el.tagName === "IMG"
      ? { src: el.getAttribute("src"), alt: el.getAttribute("alt") || "" }
      : { html: el.innerHTML, href: el.getAttribute("href") };
  }
  function changes(el) {
    const a = original.get(el), b = snapshot(el), out = {};
    for (const k of Object.keys(b)) if (b[k] !== a[k] && b[k] !== null) out[k] = b[k];
    return out;
  }
  const dirtyNodes = () => nodes.filter((el) => Object.keys(changes(el)).length);
  function refresh() {
    const dirty = dirtyNodes();
    nodes.forEach((el) => el.classList.toggle("be-dirty", dirty.includes(el)));
    btn("save").disabled = !dirty.length;
    if (dirty.length) say(`${dirty.length} unsaved change${dirty.length > 1 ? "s" : ""}`);
  }

  function setEditing(on) {
    editing = on;
    sessionStorage.setItem("be-editing", on ? "1" : "0");
    document.body.classList.toggle("be-editing", on);
    btn("edit").classList.toggle("on", on);
    btn("edit").textContent = on ? "Done" : "Edit";
    nodes.forEach((el) => {
      if (el.tagName !== "IMG") el.contentEditable = on ? "true" : "false";
    });
    if (!on) closeLink();
    say(on ? "Click text to edit · click an image to replace it" : "Editor");
  }

  // Keep edits to plain text and line breaks: no pasted styles, no stray <div>s.
  document.addEventListener("paste", (e) => {
    if (!editing || !e.target.closest?.("[data-edit]")) return;
    e.preventDefault();
    document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
  });
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); save(); return; }
    if (!editing || !e.target.closest?.("[data-edit]")) return;
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) document.execCommand("insertLineBreak");
    }
    if (e.key === "Escape") e.target.blur();
  });
  document.addEventListener("input", (e) => { if (editing) refresh(); });

  // Links: in edit mode clicks don't navigate; editable links get a URL box.
  let linkBox = null;
  function closeLink() { linkBox?.remove(); linkBox = null; }
  function openLink(a) {
    closeLink();
    const r = a.getBoundingClientRect();
    linkBox = document.createElement("div");
    linkBox.className = "be-link";
    linkBox.style.left = `${r.left + scrollX}px`;
    linkBox.style.top = `${r.bottom + scrollY + 8}px`;
    linkBox.innerHTML = `<input aria-label="Link URL"><button>Set link</button>`;
    const input = linkBox.querySelector("input");
    input.value = a.getAttribute("href") || "";
    const apply = () => { a.setAttribute("href", input.value.trim()); refresh(); closeLink(); };
    linkBox.querySelector("button").onclick = apply;
    input.onkeydown = (e) => { if (e.key === "Enter") apply(); if (e.key === "Escape") closeLink(); };
    document.body.append(linkBox);
  }
  document.addEventListener("click", (e) => {
    if (!editing || bar.contains(e.target) || linkBox?.contains(e.target)) return;
    const link = e.target.closest("a");
    if (link) e.preventDefault();
    const img = e.target.closest("img[data-edit]");
    if (img) { e.preventDefault(); pickImage(img); return; }
    if (link?.hasAttribute("data-edit")) openLink(link); else closeLink();
  }, true);

  // Images: click to choose a file, or drop one on the image.
  function pickImage(img) {
    const input = Object.assign(document.createElement("input"), { type: "file", accept: "image/*" });
    input.onchange = () => input.files[0] && replaceImage(img, input.files[0]);
    input.click();
  }
  document.addEventListener("dragover", (e) => {
    const img = editing && e.target.closest?.("img[data-edit]");
    if (img) { e.preventDefault(); img.classList.add("be-drop"); }
  });
  document.addEventListener("dragleave", (e) => e.target.classList?.remove("be-drop"));
  document.addEventListener("drop", (e) => {
    const img = editing && e.target.closest?.("img[data-edit]");
    if (!img) return;
    e.preventDefault();
    img.classList.remove("be-drop");
    if (e.dataTransfer.files[0]) replaceImage(img, e.dataTransfer.files[0]);
  });
  async function shrink(file) {
    // Phone photos are several MB; resize to 1800px JPEG before it goes in the repo.
    if (!/^image\/(jpeg|png|webp|heic)/.test(file.type)) return file;
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 600e3) return file;
    const c = Object.assign(document.createElement("canvas"), { width: Math.round(bmp.width * scale), height: Math.round(bmp.height * scale) });
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    const keepPng = file.type === "image/png" && file.size < 1.5e6;
    const blob = await new Promise((r) => c.toBlob(r, keepPng ? "image/png" : "image/jpeg", 0.84));
    return new File([blob], file.name.replace(/\.\w+$/, keepPng ? ".png" : ".jpg"), { type: blob.type });
  }
  async function replaceImage(img, file) {
    try {
      say("Uploading…");
      const small = await shrink(file);
      const res = await fetch(`/_editor/upload?name=${encodeURIComponent(small.name)}`, { method: "POST", body: small });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      img.removeAttribute("srcset");
      img.src = data.src;
      img.setAttribute("src", data.src);
      refresh();
    } catch (err) { say(`Upload failed: ${err.message}`); }
  }

  async function save() {
    const dirty = dirtyNodes();
    if (!dirty.length) return true;
    say("Saving…");
    const edits = dirty.map((el) => ({ key: el.dataset.edit, ...changes(el) }));
    const res = await fetch("/_editor/save", { method: "POST", body: JSON.stringify({ page: location.pathname, edits }) });
    const data = await res.json();
    if (!res.ok) { say(`Save failed: ${data.error}`); return false; }
    dirty.forEach((el) => original.set(el, snapshot(el)));
    refresh();
    say(`Saved to ${data.file}`);
    return true;
  }

  async function publish() {
    if (!confirmPublish) {
      confirmPublish = true;
      btn("publish").textContent = "Push live?";
      btn("publish").classList.add("on");
      say("Click again to commit and push to buusystems.com");
      setTimeout(() => { confirmPublish = false; btn("publish").textContent = "Publish"; btn("publish").classList.remove("on"); }, 5000);
      return;
    }
    confirmPublish = false;
    btn("publish").textContent = "Publish";
    btn("publish").classList.remove("on");
    if (!(await save())) return;
    say("Publishing…");
    const res = await fetch("/_editor/publish", { method: "POST", body: JSON.stringify({ message: `Edit ${location.pathname} in the site editor` }) });
    const data = await res.json();
    say(res.ok ? "Pushed. Live on buusystems.com in a minute or two." : `Publish failed: ${data.error}`);
  }

  bar.addEventListener("click", (e) => {
    const a = e.target.closest("button")?.dataset.a;
    if (a === "edit") setEditing(!editing);
    if (a === "save") save();
    if (a === "publish") publish();
  });
  addEventListener("beforeunload", (e) => { if (dirtyNodes().length) e.preventDefault(); });

  // Reload when files change on disk (a text editor, git pull, or Claude), unless there are unsaved edits.
  let version = null;
  setInterval(async () => {
    try {
      const v = (await (await fetch("/_editor/version")).json()).version;
      if (version !== null && v !== version && !dirtyNodes().length && !document.activeElement?.isContentEditable) {
        sessionStorage.setItem("be-scroll", String(scrollY));
        location.reload();
      }
      version = v;
    } catch {}
  }, 1500);
  const y = sessionStorage.getItem("be-scroll");
  if (y) { sessionStorage.removeItem("be-scroll"); addEventListener("load", () => scrollTo(0, +y)); }

  setEditing(editing);
})();
