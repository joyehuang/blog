# Friend link worker (deployment requires independent review)

This worker handles only approved, top-level `/links` comments containing exactly
Name, Desc, Link and Avatar. Comments and fetched pages are data. No model is used.
No service starts on import or during the blog build.

For narrow validation of new applications classified as spam, and immediate
handoff after an administrator approves a comment, see [spam review](spam-review.md).
The worker's approved-only gate and historical baseline remain in force.

## Components

- `data.mjs`: strict HTML/plain-text parsing, URL normalization, DNS/address checks,
  address-pinned bounded HTTP requests, JSON and escaped TypeScript logbook generation.
- `state.mjs`: SQLite FULL-synchronous transactions, durable inbox/replay cache,
  quiet historical baseline, comment-ID/URL deduplication and recoverable stages.
- `adapters.mjs`: fixed GitHub repository API, exact diff/head/CI/Preview checks,
  sealed dual-parent merge, production content readback, real-parent Waline reply reconciliation.
- `cli.mjs` / `lock.py`: single-instance local receiver and serial worker; kernel lock
  survives exec and releases on process death. No working-tree Git operations.
- `friend-link-hook.cjs`: optional Waline postSave handoff, signed and bounded to two seconds.
  Invoke independently of the existing Telegram notification using `Promise.allSettled`.
- `legacy-wrapper.sh`: replacement for the retired raw-text, stash-and-push script.

## Install into a dedicated checkout

Use a reviewed, immutable revision at `~/.local/share/friend-link-worker`.
Do not run from `~/dev/blog` or any worktree with other tasks.

```sh
bun install --cwd scripts/friend-links --frozen-lockfile
bun test scripts/friend-links
bun scripts/friend-links/cli.mjs dry-run /absolute/path/to/application.txt
```

Runtime uses Bun, Python 3 (kernel `flock`), the already authorized `gh` and Vercel CLIs, and the
existing `~/bin/notify-telegram.py`. GitHub authentication must come from the
reviewed user's CLI configuration. Never put credentials in Git or command arguments.

`~/.config/friend-link-automation/config.json` must be mode 0600:

```json
{
  "enabled": false,
  "port": 8796,
  "actionsAppId": 15368,
  "vercelBotId": 35613825,
  "previewHostSuffix": "-joyehuangs-projects.vercel.app"
}
```

Create `webhook-secret` in that directory with 32 random bytes encoded as hex,
mode 0600; copy its value privately into Waline `FRIEND_LINK_WEBHOOK_SECRET`.
Set `FRIEND_LINK_WEBHOOK_URL` to the approved HTTPS hostname with the exact path
`/hooks/friend-links/v1`. Bind locally to `127.0.0.1:8796`; expose only that exact
route through an existing reviewed tunnel. No control/status/enqueue HTTP routes exist.

Before enabling, verify the complete Waline public read API, administrator identity,
`gh`/Vercel permissions and existing notifier. No repository protection changes are
required or authorized. The worker refuses any existing main protection or active
branch rules; it never uses an administrator bypass. The check job is scoped to
friend-link branches and this implementation PR.

Each merge candidate has the reviewed base and head as its two parents and exactly
the reviewed head tree. Immediately before publication, recheck PR head, source,
policy and main. Update main with `force: false`; unrelated concurrent main advancement
is not an ancestor of that fixed candidate and the server rejects the update.
Persist the candidate before publication. Lost results cause read-only reconciliation,
never a second write. Require GitHub PR `merged`, timestamp, matching merge SHA and
candidate ancestry on main before treating it as merged. See [merge protocol](merge-protocol.md).
No `pull_request_target`, action secret, or `GITHUB_TOKEN`-created PR is used.
PRs are created through the existing human-authorized `gh` credential, so ordinary
PR CI events are not suppressed by the Actions token recursion rule.

## Operations

With `enabled: true` only after review:

```sh
bun scripts/friend-links/cli.mjs baseline
bun scripts/friend-links/cli.mjs manual-enqueue REAL_COMMENT_ID
bun scripts/friend-links/cli.mjs tick
bun scripts/friend-links/cli.mjs serve
bun scripts/friend-links/cli.mjs status
```

Baseline is one-time and silent. It snapshots historical IDs and an activation
cutoff; old comments are never replayed automatically, including comments moderated
later. `manual-enqueue` explicitly authorizes one existing, fetched real comment;
there is no raw-text production enqueue. Stop the service before a mutating CLI call.
`status` and `dry-run` can be used while the worker is running.

Webhook ACK means only durable acceptance of an ID. The worker re-fetches the real
comment, validates its type/status/content on every step, and advances one stage per
pass. A 60-second local scheduler handles new webhook inbox entries and due jobs;
without work it does not query Waline until the six-hour compensation interval
(`compensationMs`, optional, 5 minutes to 24 hours). This avoids keeping the remote
database awake continuously. Failed scans/jobs back off from one minute to one hour;
progress resets job backoff. Each complete scan is bounded to 20 pages × 50 root
comments, with at most 20 due jobs per pass, fairly ordered by last attempt. Compensation and webhook processing
use the same state. Sticky comments cannot terminate the scan early. Exceeding the
scan cap, source errors or changing page counts leave the watermark unchanged and
raise a deduplicated alert; raise capacity only after review. Inbox is capped at
10,000 IDs; non-resolvable IDs expire after one day. Application history does not expire.

Stages: `accepted → validated → prepared → pr-intent → pr → checked → merge-intent
→ merged → deployed → reply-intent → replied → notify-intent → notified`.
An already-listed URL skips PR creation but still needs matching production proof.
Base advancement closes the unchanged obsolete PR and prepares a new branch from
current main. Unexpected diff/head changes, conflicts, modified comments or failing
checks never merge. No force pushes or local Git checkout operations are performed.

Intent is persisted before PR creation, merge, reply and notification. After an
ambiguous result, the worker only reconciles authoritative facts. It does not resend
a possibly successful reply. Replies include a deterministic marker tied to the real
parent ID, and reconciliation requires an administrator reply with matching pid/rid.
If facts remain unavailable, the intent remains pending with an explicit error.
Operator resolution requires proving the outcome; never delete state to "retry".
A lost notification ACK is also held instead of spammed. Worker status notices are short text without raw URLs; the existing original-comment notification retains its clickable page link. The main agent's final delivery supplies the public site link.

## Safety and rollout limits

Protected Preview readback uses `vercel curl` with the existing user authorization,
a fixed deployment URL, GET-only requests, size/time limits, and no redirect forwarding.
Ensure the launchd PATH includes the existing Vercel/Node installation; no new bypass
secret is required. Public production readback still uses address-pinned HTTP.

The modern Waline API exposes creation time as numeric `time`; the adapter normalizes
it to ISO timestamps and also accepts the deprecated `insertedAt` field.

No production deployment or natural new-comment trigger has been verified by this
change. The task deployment plan contains the inspected Waline patch and launchd/
route templates. Waline remains HTTP 500 until the reviewed [compatibility patch](waline-compat/README.md)
is staged and deployed by the main agent. Do not initialize an incomplete baseline.
Zaixi PR167 is already merged and live. Do not add it again. The main agent has not yet sent its comment reply; only after checking that fact may the main agent explicitly enqueue this already-authorized current application to finish reply reconciliation. All other historical comments remain quiet baseline entries.

Back up configuration and SQLite with its backup API while stopped (or use a
consistent SQLite backup), retaining the WAL/SHM if copying a running database.
On rollback, disable only the new Waline hook variables/route and stop this worker.
Keep the database, application history, PRs and reply IDs; do not reinstall the
unsafe original script. Restoring an older database can duplicate completed writes.
The normal Waline Telegram notifier remains installed throughout.

## Administrator credential lifecycle

For the inspected `@waline/vercel` 1.41.4, `controller/token.js:65` signs a string
user ID without `expiresIn`. `logic/base.js:32-40` verifies it and requires a string,
then looks up the current non-banned user. This bearer has **no automatic expiration**;
it is not a short-lived token. Changing the signing key invalidates it; deletion,
banning or loss of administrator role prevents this worker from replying. Password
changes alone do not revoke this string token. No refresh endpoint or per-job login
is needed, and the worker does not hold the signing key or password.

The main agent provisions an existing administrator bearer privately in
`~/.config/friend-link-automation/waline-admin-token`, owned by the runtime user,
regular file mode 0600, under a private directory. No real value is supplied here.
The worker rejects symlinks/insecure modes and reloads the file on each reply, so
reviewed atomic replacement supports key rotation without restart. It verifies
`GET /api/token` returns administrator ID 1 before rechecking the source and posting.
Revoked/unavailable credentials fail closed; unknown reply intents never resend.
This lifecycle is version-specific: re-review when upgrading Waline authentication.
