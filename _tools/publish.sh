#!/usr/bin/env bash
# Publish the committed site: push main to the AWS server, where a git hook puts it live at once.
# The editor's Publish button runs this.
set -euo pipefail
cd "$(dirname "$0")/.."
git push -q aws main 2>&1 | sed 's/^remote: //'
