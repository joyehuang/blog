#!/usr/bin/env bash
# Vercel "Ignored Build Step" (vercel.json → ignoreCommand).
# Exit 0 = skip the build, exit 1 = build.
#
# The project builds on a fixed Turbo machine, and Vercel can't pick a
# machine per environment, so Preview builds are opt-in instead:
#   - production (main) always builds;
#   - the indexnow-state bookkeeping branch never builds;
#   - any other push builds a Preview only if its commit message contains
#     "[preview]". Review locally first (bun dev / bun run preview:local).
# Deployments made with `vercel deploy` or "Redeploy" are not affected.

if [ "$VERCEL_GIT_COMMIT_REF" = "indexnow-state" ]; then
  echo "Skip: indexnow-state branch."
  exit 0
fi

if [ "$VERCEL_ENV" = "production" ]; then
  echo "Build: production."
  exit 1
fi

case "$VERCEL_GIT_COMMIT_MESSAGE" in
  *"[preview]"*)
    echo "Build: [preview] requested in the commit message."
    exit 1
    ;;
esac

echo "Skip: preview builds are opt-in. Add [preview] to the commit message to build one."
exit 0
