# Controlled friend-link merge protocol

## Official API contract (checked 2026-09-15)

- [Update a reference](https://docs.github.com/en/rest/git/refs#update-a-reference):
  `force: false` requires a fast-forward update. This is an ancestry guard, not an
  expected-old-SHA compare-and-swap parameter.
- [Create a commit](https://docs.github.com/en/rest/git/commits#create-a-commit):
  the caller specifies the tree SHA and parent SHA array; two parents form a merge commit.
- [Indirect merges](https://docs.github.com/en/pull-requests/reference/pull-request-merges#indirect-merges):
  GitHub can mark a PR merged when its commits become reachable from its base.
  This may happen without satisfying PR protection, hence this worker refuses all
  existing branch protection and active branch rules, even when the account can bypass.

Let B be reviewed main, H the one-parent application commit with parent B, and
M the sealed commit with parents [B,H] and tree exactly H. H differs from B in only
public/links.json and src/site.config.ts; compare all recursive tree entries, modes,
blob hashes and preserved files, rejecting truncated responses. CI must come from
the configured Actions app and named pull_request workflow/check suite on H; Preview
must come from the Vercel bot deployment for H and pass actual readback.

A concurrent unrelated descendant C of B is not an ancestor of M, so advancing main
from C to M fails non-force. If another actor already advanced main to H, advancing
to M is still a fast-forward and preserves all approved content. This is why the
claim is preservation of concurrent work, not rejection of every possible ref change.
Rewinds by other actors and concurrent changes of repository policy cannot be made
atomic with this API. No force writes or policy changes are made by this worker.

Persist M before the only publication attempt. Afterwards independently read PR,
M's parents/tree and M-to-current-main ancestry. Success requires GitHub merged=true,
closed state, merged_at, and merge_commit_sha=M. The docs do not guarantee indexing
latency or exact indirect merge metadata; if those facts never appear, remain unknown
for operator review. Do not close a PR to simulate merging, infer merged from a ref ACK,
or republish an unknown outcome. A proven unrelated base advance requires rebuilding
and running all validations again; an already merged PR cannot be superseded.

Source is read again after slow checks and immediately before the write. PR head is
also re-read. These independent services cannot provide an atomic source-comment/PR
head/main transaction. A head changed after the final read cannot inject its new tree
into sealed M; reconciliation rejects the changed identity. A comment changed after
the final read cannot be prevented atomically; subsequent stage/reply source checks
hold the job. This limitation must not be described as a cross-service lock.

## Offline evidence and deployment boundary

merge.test.ts runs the actual candidate/tree/merge/reconciliation adapters against
real temporary Git objects and a non-force bare remote. It covers concurrent main,
lost ACK before and after publication, source/HEAD/tree/candidate/protection drift,
and late source/HEAD changes. GitHub indexing facts are fixtures, explicitly separate
from the real Git graph. adapters.test.ts separately exercises trusted CI and Preview
gates. No test publishes to GitHub main. Production indirect merging is untested;
first authorized natural application must be observed through actual PR facts before
replying. Existing protection or unavailable policy reads stop the worker and require
review of a compatible path, never disabling protection.
