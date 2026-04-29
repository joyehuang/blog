// Manually-synced site stats shown on the homepage.
//
// `visitors` and `pageViews` come from the Vercel Web Analytics dashboard
// (https://vercel.com/joyehuangs-projects/blog/analytics). Vercel doesn't
// expose a public read API for these, so update them by hand when you want
// the homepage figures to refresh, then bump `lastSyncedAt`.
//
// `projects` is the count of project entries on /projects (active + old +
// personal). Update when adding or removing a project there.

export const siteStats = {
  visitors: 1089,
  pageViews: 2143,
  projects: 12,
  lastSyncedAt: '2026-04-29'
} as const
