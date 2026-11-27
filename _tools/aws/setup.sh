#!/usr/bin/env bash
# Set up (or update) buusystems.com on the AWS Lightsail server. Safe to run again.
#   _tools/aws/setup.sh
# It creates the git repository that publishes on push, installs the Caddy site and reloads Caddy.
# The main Caddyfile on that server belongs to Bool (~/code/bool/deploy/Caddyfile); it must contain the
# on_demand_tls block and "import sites/*.caddy" (it does since 2026-11-27).
set -euo pipefail
HOST="${BUU_SITE_HOST:-ubuntu@3.231.8.190}"
here="$(cd "$(dirname "$0")" && pwd)"
scp -q "$here/buusystems.caddy" "$here/post-receive" "$HOST:/tmp/"
ssh "$HOST" 'bash -s' <<'REMOTE'
set -euo pipefail
sudo install -d -o ubuntu -g ubuntu -m 755 /var/www/buusystems.com
[ -d ~/git/buusystems.com.git ] || git init -q --bare -b main ~/git/buusystems.com.git
install -m 755 /tmp/post-receive ~/git/buusystems.com.git/hooks/post-receive
sudo install -d -m 755 /etc/caddy/sites
sudo install -m 644 /tmp/buusystems.caddy /etc/caddy/sites/buusystems.caddy
sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null 2>&1 || { sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile; exit 1; }
sudo systemctl reload caddy
echo "server ready"
REMOTE
git -C "$here/../.." remote get-url aws >/dev/null 2>&1 || git -C "$here/../.." remote add aws "$HOST:git/buusystems.com.git"
