#!/usr/bin/env bash
# Copy product pages to their own GitHub Pages repos, one per subdomain:
#   dan/ -> buusystems/dan.buusystems.com -> https://dan.buusystems.com
# The source of truth is this repo; never edit the copies. The editor's Publish runs this.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
export GH_TOKEN="$(gh auth token -u ross-buu)"
for p in ${@:-bpfboot}; do
  host="$p.buusystems.com"; repo="buusystems/$host"
  gh repo view "$repo" >/dev/null 2>&1 || gh repo create "$repo" --public --description "Landing page for $host (copied from buusystems.com)" >/dev/null
  tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
  git clone -q "github-buu:$repo.git" "$tmp" 2>/dev/null
  git -C "$tmp" checkout -qB main
  rm -rf "$tmp"/assets; cp "$root/$p/index.html" "$root"/{home.css,product.css,home.js,favicon.ico} "$tmp"/
  # only the assets this page uses
  { grep -oE '/assets/[A-Za-z0-9_./-]+' "$tmp/index.html" | sort -u; } | while read -r a; do
    [ -f "$root$a" ] && mkdir -p "$tmp$(dirname "$a")" && cp "$root$a" "$tmp$a"; done
  echo "$host" > "$tmp/CNAME"
  echo "Copy of \`$p/\` in buusystems/buusystems.com, made by \`_tools/subdomains.sh\`. Edit it there." > "$tmp/README.md"
  git -C "$tmp" add -A
  if ! git -C "$tmp" diff --cached --quiet; then
    git -C "$tmp" -c user.name="Ross Mikulskis" -c user.email=ross@buusystems.com commit -qm "Copy from buusystems.com $(git -C "$root" rev-parse --short HEAD)"
    git -C "$tmp" push -q -u origin main
  fi
  gh api "repos/$repo/pages" >/dev/null 2>&1 || gh api -X POST "repos/$repo/pages" -f 'source[branch]=main' -f 'source[path]=/' >/dev/null
  echo "$host: $(gh api "repos/$repo/pages" -q '.cname + " " + (.status // "building")')"
  rm -rf "$tmp"
done
