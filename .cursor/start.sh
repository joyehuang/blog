#!/usr/bin/env bash
set -euo pipefail

if (echo >/dev/tcp/127.0.0.1/4321) >/dev/null 2>&1; then
  echo "astro already listening on 4321"
  exit 0
fi

exec bun run dev -- --host 0.0.0.0 --port 4321
