// Waline 1.41.4 calls configured hooks with the comment controller as `this`.
// Only preSave (new POST, before persistence) may change a classifier result.
const handoff = require('./friend-link-hook.cjs')
const shared = () => import('./data.mjs')

function snapshot(data) {
  return JSON.stringify([
    data.url, data.pid, data.rid, data.type, data.user_id, data.comment, data.status
  ])
}

function createHooks({ validate, send = handoff, record = (event) => console.log(JSON.stringify(event)) } = {}) {
  return {
    async preSave(data) {
      // Never undo waiting/manual audit or a configured keyword policy. In this
      // pinned version, spam at this point with those policies off is Akismet's
      // result. This is a routing inference, not a classifier explanation.
      const user = this.ctx?.state?.userInfo
      const forbidden = this.config('forbiddenWords')
      if (!data || data.status !== 'spam' || !user ||
          this.config('audit') || !Array.isArray(forbidden) || forbidden.length ||
          user.type === 'administrator' || data.type === 'administrator' ||
          String(data.user_id ?? '') !== String(user.objectId ?? '')) return
      const { eligible, parseApplication, validateReachability, digest } = await shared()
      // Hypothetical status is used only for structural screening. No worker job
      // is eligible until validation finishes and Waline saves approved status.
      if (!eligible({ ...data, objectId: 'new', status: 'approved' })) return
      const before = snapshot(data)
      const hash = digest(data.comment || '')
      const report = (decision) => {
        // Never log text, author, email, IP, URL or exception messages.
        try { record({ event: 'friend-link-review', policy: 'strict-v1', hash, decision }) } catch {}
      }
      try {
        const app = parseApplication(data.comment)
        await (validate || validateReachability)(app)
        if (snapshot(data) !== before) { report('held-source-drift'); return }
        data.status = 'approved'
        report('approved-structure-and-public-reachability')
      } catch {
        // Original spam remains durable; failed validation requires review,
        // never a broad spam scan or an automatic retry of rejected comments.
        report('held-validation')
      }
    },
    async postSave(comment) {
      // postSave's raw DB row does not contain the formatted author type.
      const user = this.ctx?.state?.userInfo
      if (!user || user.type === 'administrator') return
      await send({ ...comment, type: user.type })
    },
    async postUpdate(change) {
      // 1.41.4 passes only the PUT body, usually {status:'approved'}: it has
      // neither an ID nor scope. Re-fetch via the bound controller's real ID.
      // Never run preSave review here: manual rejection cannot be overturned.
      if (change?.status !== 'approved' || this.ctx?.state?.userInfo?.type !== 'administrator') return
      const id = String(this.id || '')
      if (!/^[A-Za-z0-9_-]{1,100}$/.test(id)) return
      try {
        const rows = await this.modelInstance.select({ objectId: this.id })
        if (rows.length !== 1 || String(rows[0].objectId) !== id) return
        const comment = rows[0]
        let type
        if (comment.user_id) {
          const users = await this.getModel('Users').select({ objectId: comment.user_id })
          if (users.length !== 1) return
          type = users[0].type
          if (!['guest', 'administrator'].includes(type)) return
        }
        await send({ ...comment, type })
      } catch {
        console.error('Friend link moderation handoff unavailable; approved-source compensation required')
      }
    }
  }
}

module.exports = { ...createHooks(), createHooks }
