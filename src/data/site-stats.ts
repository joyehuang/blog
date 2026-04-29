// Numbers shown in the homepage Site stats panel that aren't derivable
// from the codebase. Update by hand when you want them to refresh:
//
// - `visitors` and `pageViews`: from the Vercel Web Analytics dashboard
//   (https://vercel.com/joyehuangs-projects/blog/analytics). Vercel has
//   no public read API for these, no CLI command either.
// - `projects`: total count of entries on /projects.

export const siteStats = {
  visitors: 1089,
  pageViews: 2143,
  projects: 12
} as const
