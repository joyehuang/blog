#!/bin/sh
# Install over ~/bin/friend-link.sh only after independent rollout review.
# No stash, git push, guessed comment ID, or raw-input enqueue remains.
set -eu
case "${1:-}" in
  --dry-run)
    shift
    exec bun "$HOME/.local/share/friend-link-worker/scripts/friend-links/cli.mjs" dry-run "$@"
    ;;
  status)
    exec bun "$HOME/.local/share/friend-link-worker/scripts/friend-links/cli.mjs" status
    ;;
  manual-enqueue)
    shift
    exec bun "$HOME/.local/share/friend-link-worker/scripts/friend-links/cli.mjs" manual-enqueue "$@"
    ;;
  *)
    echo 'Raw-text execution retired. Use --dry-run FILE, status, or manual-enqueue REAL_COMMENT_ID.' >&2
    exit 64
    ;;
esac
