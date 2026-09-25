/**
 * Runs inline in <head> before first paint (inlined verbatim by
 * JojoHead.astro — keep it self-contained ES2019, no imports, no closures).
 * Decides the review mode and whether the build-the-site intro is armed, and
 * records both as attributes on <html>. It never hides anything: arming only
 * lets the intro script start; if that script never runs, nothing changes.
 *
 * @param {Window} w
 * @param {{ review: boolean, homePaths: string[], keys: { intro: string, reviewMode: string } }} cfg
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
  } catch {
    out.reason = 'error'
  }
  return out
}

export { jojoHeadGate }
