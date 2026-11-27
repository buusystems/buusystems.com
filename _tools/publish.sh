#!/usr/bin/env bash
# Publish the committed site: push main to the AWS server, where a git hook puts it live at once.
# The editor's Publish button runs this. While the GitHub copy still exists it is kept in step too,
# so both match until DNS has moved; that push is allowed to fail.
set -euo pipefail
cd "$(dirname "$0")/.."
git push -q aws main 2>&1 | sed 's/^remote: //'
if git remote get-url origin >/dev/null 2>&1; then
  GH_TOKEN="$(gh auth token -u ross-buu 2>/dev/null || true)" git push -q origin main 2>/dev/null || echo "note: the GitHub copy was not updated"
fi
