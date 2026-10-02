/**
 * Runs inline in <head> before first paint (inlined verbatim by
 * JojoHead.astro — keep it self-contained ES2019, no imports, no closures).
 * Decides the review mode and whether the intro is armed, and records both as
 * attributes on <html>. Arming only lets the intro script start. One thing is
 * painted here: when the picked story opens in the dark (`cfg.dark`), the
 * `data-jojo-cover` attribute lets JojoHead's CSS paint that dark before the
 * first frame, so the blog never flashes first; the CSS lifts it on its own
 * after a few seconds if the intro script never runs.
 *
 * @param {Window} w
 * @param {{ review: boolean, homePaths: string[], keys: { intro: string, reviewMode: string, story?: string }, stories?: string[], defaultStory?: string, dark?: string[] }} cfg
 * @returns {{ mode: string, intro: string | null, reason: string }}
 */
function jojoHeadGate(w, cfg) {
  var root = w.document.documentElement
  var out = { mode: 'abc', intro: null, reason: '' }
  try {
    var url = new w.URL(w.location.href)
    var valid = /^(abc|a|b|c|off)$/
    if (cfg.review) {
      var q = url.searchParams.get('jojo')
      if (q && valid.test(q)) {
        out.mode = q
        try {
          w.sessionStorage.setItem(cfg.keys.reviewMode, q)
        } catch {
          // storage blocked: fine, the mode just is not remembered
        }
      } else {
        try {
          var s = w.sessionStorage.getItem(cfg.keys.reviewMode)
          if (s && valid.test(s)) out.mode = s
        } catch {
          // storage blocked: fine, the mode just is not remembered
        }
      }
    }
    root.setAttribute('data-jojo-mode', out.mode)
    if (out.mode !== 'abc' && out.mode !== 'c') {
      out.reason = 'mode'
      return out
    }
    var path = url.pathname.replace(/\/+$/, '') || '/'
    if (cfg.homePaths.indexOf(path) < 0) {
      out.reason = 'path'
      return out
    }
    if (w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      out.reason = 'reduced-motion'
      return out
    }
    var conn = w.navigator && w.navigator.connection
    if (conn && conn.saveData) {
      out.reason = 'save-data'
      return out
    }
    if (w.document.visibilityState === 'hidden') {
      out.reason = 'hidden'
      return out
    }
    var forced = url.searchParams.get('jojo-intro') === 'play'
    if (!forced) {
      if (url.hash) {
        out.reason = 'hash'
        return out
      }
      var seen
      try {
        seen = w.localStorage.getItem(cfg.keys.intro)
      } catch {
        // no storage → we could never remember, so never play
        out.reason = 'storage'
        return out
      }
      if (seen) {
        out.reason = 'seen'
        return out
      }
      if (w.innerHeight < 480 || w.innerWidth < 320) {
        out.reason = 'viewport'
        return out
      }
    }
    out.intro = forced ? 'url' : 'first_visit'
    root.setAttribute('data-jojo-intro', 'armed')
    root.setAttribute('data-jojo-intro-trigger', out.intro)
    // the same pick as story/pick.ts: ?jojo-story=, else this session's, else the default
    var stories = cfg.stories || []
    var story = url.searchParams.get('jojo-story')
    if (stories.indexOf(story) < 0) {
      try {
        story = cfg.keys.story ? w.sessionStorage.getItem(cfg.keys.story) : null
      } catch {
        story = null
      }
    }
    if (stories.indexOf(story) < 0) story = cfg.defaultStory
    if (cfg.dark && cfg.dark.indexOf(story) >= 0) root.setAttribute('data-jojo-cover', '')
  } catch {
    out.reason = 'error'
  }
  return out
}

export { jojoHeadGate }
