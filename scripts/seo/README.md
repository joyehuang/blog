# Production SEO and IndexNow

The build hook reads emitted HTML after Astro has finished prerendering, replaces
`sitemap.xml` and `sitemap-0.xml`, and emits an IndexNow manifest. It sends no network
notifications. The existing `sitemap-index.xml` continues to point to sitemap-0.
Only HTML with a self canonical on `https://www.joyehuang.me` and no `noindex` is
included. API, OG and internal endpoints are excluded. Tags and paginated lists
remain indexable; every page keeps its own canonical. Sitemap alternates come
from real HTML hreflang links, never inferred tag translations.

Seven existing content routes (Contact, Projects, Links in both languages, and
Chinese tags) now prerender. Their content and layout are unchanged. About remains
SSR so its existing request-time follower counters keep refreshing. Its two
explicit sitemap entries use the same sectionMetadata as BaseHead and source
fingerprints of the page and About components (not volatile counter responses).
Future indexable SSR routes must be registered explicitly and covered by the
real-bundle audit; no arbitrary internal endpoint is inferred as indexable.
Search stays server rendered and noindex. `capture-ssr.mjs` audits these routes
using the actual Vercel Node bundle and closes its ephemeral server in `finally`.
Use Node to run that audit helper because Bun does not resolve the adapter's
traced react-dom package correctly; all dependency installation/build/test remains
Bun-based.

## Dates and fingerprints

`lastmod` follows each BlogPosting's verified source-edit timestamp: the latest
commit date touching that entry's own file, or an explicit frontmatter
`updatedDate`, whichever is later. Chinese and English files are independent.
A shallow-boundary commit is not evidence of when an old file changed and is
ignored. Uncommitted files and missing history use only explicit `updatedDate`;
without that, the date is omitted. Publication time is never silently substituted
for a modification time. The JSON-LD dateModified uses the same value.

No network fetch of history happens during build. With a shallow Vercel checkout,
some old pages may omit lastmod until reliable history is available; that is
preferable to stamping them all on the deployment date. Source edits include
formatting/metadata edits, so this is a traceable source-modification date, not an
editorial claim about how much the prose changed. Columns, tags, home, and decks
omit lastmod because they have no audited aggregate-content modification rule.
There is no build-time “today” fallback and no global git commit date.

The manifest fingerprint includes metadata, semantic main content (text, links,
images), reliable content dates and real alternates. DOM IDs, presentation and
hydration attributes, scripts/styles, GitHub activity widgets, star counters and
the marked external page-view counter do not trigger submissions. Content edits,
link/image changes and list membership still do. About keeps source fingerprints
and request-time counters. This avoids random IDs and transient external responses
causing notifications; it is not a visual/layout change detector.

## Draft review

Astro config compiles `VERCEL_ENV === 'preview'` into
`import.meta.env.DRAFT_PREVIEW` for route code. No SSR process variable is needed.
Blog and notes detail routes (both languages) allow drafts only in this Preview
build or local `bun dev`; ordinary local production builds exclude drafts.
Draft details always carry noindex and no hreflang, and cannot enter sitemap or
IndexNow manifest. Recommendations exclude drafts even in development. Published
hreflang pairs require both original and translation to be published. Existing
Vercel Preview access protection remains unchanged. Lists stay publication-oriented
in Preview; opening an explicit draft URL is the review workflow.

Run `node scripts/seo/check-draft-fixtures.mjs` for actual production and Preview
builds with temporary Chinese/English blog and note fixtures. It verifies direct
routes, noindex, sitemap/manifest exclusion, no draft recommendations/hreflang,
and removes fixtures in finally. Rebuild without fixtures afterward.

## Activation by the production reviewer

1. Review this branch, run tests/check/build and review the full HTML comparison.
   Merge to main only after independent acceptance and the configuration in steps
   2–4 is ready. This worker does not merge.
2. The real random proof is stored only under `~/.config/indexnow/` with mode 0600.
   Do not paste it into a PR, shell argument, report, log, or source. Set the same
   value as Vercel **Production** `INDEXNOW_KEY` and GitHub Actions repository
   secret `INDEXNOW_KEY` through the approved secret-management flow. These writes
   have not been performed. It is public domain-verification proof, not a Bing
   account API credential. The build emits `/indexnow-key.txt`; the fixed root
   keyLocation covers the whole canonical host without putting the value in logs.
3. Set repository variable `INDEXNOW_ALLOW_INITIAL=true` for the first rollout.
   This permits one initial manifest submission if no history exists. After a
   checkpoint has been saved, remove/set false. With history present, the flag
   never forces a full submission. Missing history with initial disabled fails
   closed rather than silently resubmitting everything.
4. Ensure Actions can write the dedicated `indexnow-state` branch (contents:write)
   and branch policies permit it. Do not merge that branch. `vercel.json`
   ignoreCommand skips its builds. No Vercel token/Bing login is needed in CI.
5. After Vercel reports success on Production, the workflow requires both event
   creators to be vercel[bot], the owning repository, main's current commit, the
   exact live manifest commit at www, and the exact public proof content. A
   preview/fork/failed event cannot send. The observed existing Vercel deployment
   has `production_environment=false` despite `environment=Production`; the gate
   uses the real environment labels plus the live-host commit, not that flag.
6. Check the independent notification workflow result and state branch. Confirm
   the public manifest contains only intended published URLs and the canonical
   host; check sitemap, robots, hreflang and a 375px reading page. No notification
   has been sent during local testing.

## Outcomes, retry and recovery

200 means received, **not indexed**. 202 means validation pending: save a pending
checkpoint, investigate verification in Bing, do not immediately spam the same
batch. 400/403/422 stop with a rejected result. 429 and 5xx have at most three
attempts; numeric/date Retry-After is honored up to 30 seconds, and longer waits
end as deferred. Network/15-second timeouts never report success. Notification
failure does not affect or roll back an already successful Vercel deployment.

A concurrency group serializes notifications. A successful or 202 checkpoint
stores the complete manifest on the durable state branch, so normal workflow
replays send zero URLs. Failed notifications preserve the old checkpoint; the
next successful deployment or an operator rerun can recover the delta. A newer
main commit or live deployment makes an old event fail/skip safely. Rerun the
successful deployment's notification workflow after fixing secrets, permissions
or a temporary promotion/cache race. There is no cron or daemon.

IndexNow has no transactional/idempotency-token API. If receipt succeeds but the
state write fails, or a timeout occurs after server receipt, a retry can resend
the same bounded delta. Exactly-once delivery cannot be promised. Inspect state
before recovery; do not delete history as a retry mechanism.

Rollback: disable the notification workflow first if needed. Preserve the state
branch and proof file while investigating. Revert the code PR through normal
review/deployment if necessary; no crawler/firewall/account setting needs undoing.
If production is rolled back to a prior commit, the main-tip gate intentionally
skips it. Redeploy an approved main commit and rerun the notification workflow to
reconcile. Keep verification proof available for any pending 202 requests.

## Reproducing the audit

At the baseline revision and then at this revision:

```sh
bun install --frozen-lockfile
bun --bun run build
node scripts/seo/capture-ssr.mjs artifacts/seo/baseline-ssr
bun scripts/seo/audit.mjs .vercel/output/static artifacts/seo/baseline.json artifacts/seo/baseline-ssr
# On the new revision substitute after-ssr / after.json above.
bun scripts/seo/verify.mjs
bun test
bun run check
```

The optional fourth CLI argument merges captured SSR pages. `verify.mjs` checks
reciprocal hreflang, canonical hosts, indexability, duplicates and unchanged
article titles/descriptions. Results retain
all duplicate groups and missing tags, not just a zero-error total. Original
standalone .html decks had no description/canonical; this patch adds only those
head tags. Nonindexed 404/V3 duplicate titles are intentionally retained.

Sources checked September 12, 2026:

- https://www.indexnow.org/documentation
- https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#deployment_status
- https://vercel.com/docs/project-configuration
- https://vercel.com/docs/security
