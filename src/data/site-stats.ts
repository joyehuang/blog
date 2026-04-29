// Numbers shown in the homepage Site stats panel that aren't derivable
// from the codebase. Update by hand when you want them to refresh:
//
// - `visitors`: from the Vercel Web Analytics dashboard
//   (https://vercel.com/joyehuangs-projects/blog/analytics). Vercel has
//   no public read API for these, no CLI command either.
// - `projects`: total count of entries on /projects.
//
// Page views aren't stored here — SiteStats fetches the live total from
// the waline server's /api/stats endpoint instead.

export const siteStats = {
  visitors: 1089,
  projects: 12
} as const
