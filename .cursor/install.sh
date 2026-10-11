#!/usr/bin/env bash
set -euo pipefail

if ! command -v bun >/dev/null 2>&1 || [ "$(bun --version)" != "1.3.10" ]; then
  curl -fsSL https://bun.sh/install | bash -s "bun-v1.3.10"
fi
sudo ln -sf "${HOME}/.bun/bin/bun" /usr/local/bin/bun
bun install --frozen-lockfile
bun install --cwd scripts/friend-links --frozen-lockfile
