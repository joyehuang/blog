# Narrow new-application review (Waline 1.41.4)

`waline-hooks.cjs` is wired as `preSave`, `postSave` and `postUpdate` in the
Waline deployment. Keep the existing Telegram notifier in `Promise.allSettled`
beside `hooks.postSave.call(this, comment)`; a notification is not an approval.
Copy `data.mjs`, `friend-link-hook.cjs` and `waline-hooks.cjs` together from the
same reviewed revision and install the exact ipaddr.js/parse5 versions in
`package.json`. Preserve the pinned Waline version and nullable-mail avatar patch.

The new POST path is: Waline classifier → strict application review before
insertion → saved approved comment → signed ID → durable inbox → public-source
verification → existing application workflow. No spam row is eligible in the
worker, and the worker gains neither administrator scanning nor approval writes.

Only a new top-level `/links` spam candidate can be reviewed. Manual audit must
be off, the configured forbidden-word array must be empty, and the authenticated
author must not be an administrator. Other statuses and policies are untouched.
The shared strict four-field parser checks length, markup, ambiguity and URL
normalization. The shared address-pinned HTTP validator checks every DNS result
and redirect, rejects non-public addresses and unsafe protocols, enforces a
15-second deadline per resource / 2 MiB bound / four redirects, and requires an
image content type for the avatar. Plain text remains data and generated output
uses existing escaping. Structural and network checks establish this explicit
automatic eligibility policy; they do not prove the identity or intent of a site
owner or explain a classifier decision.

Immediately before changing the in-memory status, compare the candidate again.
Only then change spam to approved. A decision log contains a policy version,
content digest and outcome, without the comment or any private author fields.
That decision alone does not assert a successful database insert. A failure
leaves the original spam state intact for operator review, including transient
network failures. There is deliberately no retry/scan that promotes saved spam.
The comment POST now incurs bounded site/avatar validation time for candidates.

In this pinned controller, preSave is called only on POST, after spam detection
and before insertion. With audit and keyword filtering off, Akismet is the
applicable classifier branch. Do not reuse this assumption on an upgraded
controller or when additional classifier plugins are configured.

In Waline 1.41.4 postUpdate receives only PUT fields. Its bound controller has
the real ID, so the hook re-fetches the full saved row and, when present, its
author. Only an administrator's explicit approved update sends the same ID-only
handoff. It never calls the new-application reviewer. Rejection, withdrawal,
author edits and likes cannot restore approval. Source checks in the worker
continue to stop changed/withdrawn applications. Missed approved callbacks are
recovered by the existing six-hour compensation; this is a separate fallback,
not the immediate trigger. The receiver's next local tick is at most about one
minute when a fresh inbox entry exists.

Compensation considers older source comments first for URL deduplication. A
previously accepted job remains authoritative, including all completed jobs;
neither it nor the quiet historical baseline is reset. Callback ACKs are only
durable IDs; unknown IDs never become fabricated applications.

Review `waline-hooks.test.ts` with the existing data, state, adapter, transport
and merge tests. The deployment-side controller contract test executes the
pinned controller and dispatcher with isolated storage/classifier/network
fixtures. It is not production end-to-end evidence. Before rollout, independently
check the exact deployment source/lockfile, a Preview, and the approved production
target; never submit synthetic comments against the shared production database.
