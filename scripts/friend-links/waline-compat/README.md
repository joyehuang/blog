# Waline 1.41.4 null-email compatibility patch

This is a **reviewed source patch, not an installed or deployed fix**. The two source
snapshots are from `@waline/vercel` 1.41.4 (Waline project, MIT license). The patch
changes one render-context expression. It does not change stored records, pagination,
moderation, region/UA features, custom avatar callbacks, ordinary notifications or the
new friend-link webhook. It preserves valid nonempty email behavior and renders
anonymous records using the existing empty-email avatar behavior.

## Evidence and reproducibility

A bounded production error log identifies `avatar.js:39 → formatCmt → getCommentList`.
The public failed page reports Nunjucks `Line 4, Column 23`, `null.replace`.
The installed avatar service reproduces the exact message with `mail: null`; independent
null nickname/link/UA/IP trials do not. Nunjucks' `trim` directly calls `str.replace`.
The comment POST logic requires only URL and body, so missing email is legitimate.
A registered user's nullable email also reaches the same avatar service.

`verify.cjs` reads only the specified installation's source and dependency modules.
It never loads the deployment entry point, environment files, credentials or database.
It checks the exact source version and executes the real installed list controller
with an anonymous in-memory model, actual avatar renderer and Nunjucks. Markdown and
UA/region are pure stubs. Two roots and one child return with the patch; the original
fails, and the fixtures remain unchanged. It also checks custom-avatar precedence,
empty/missing/nonempty email and the installed JWT library with a synthetic key.

```sh
node scripts/friend-links/waline-compat/verify.cjs /path/to/read-only/waline-installation
```

No private historical row was read. The evidence establishes the failing render path
and exact null-email reproducer, not a specific person's record or private email.
If production uses a different `GRAVATAR_STR` or dependency revision, review that
non-secret template/source before applying; do not generalize this into a catch-all.

## Reviewed deployment contract

In a NEW staging directory only, pin `@waline/vercel` to **1.41.4** and retain a reviewed
lockfile. Compare the installed avatar source with `avatar.original.cjs`, then dry-run
and apply `avatar-null-mail.patch` with `patch -p1` at that staging root. Compare the
result byte-for-byte with `avatar.proposed.cjs`; stop on any drift. Make this checked
patch application part of the staged build after dependency installation, so a remote
reinstall cannot discard it. Do not edit the current deployment's `node_modules`.

Keep the independently reviewed `index.cjs` postSave handoff and `friend-link-hook.cjs`
as separate changes. Test both notification paths with fake transports before the
main agent deploys the staged package. Never disable all avatars or notifications.
After authorized deployment, read the previously failing page AND the full `/links`
list, including children, with normal settings. Only a complete consistent list can
initialize the quiet historical baseline. Do not skip pages or delete records.
