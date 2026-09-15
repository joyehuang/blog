// Offline only. Reads installed source/dependencies; never imports the deployment entry or .env.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { createHash } = require('node:crypto');
const root = process.argv[2];
if (!root) throw Error('usage: node verify.cjs /path/to/waline-deploy');
const req = createRequire(path.join(root, 'package.json'));
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'anonymous.json')));
const original = fs.readFileSync(path.join(__dirname, 'avatar.original.cjs'), 'utf8');
assert.equal(original, fs.readFileSync(path.join(root, 'node_modules/@waline/vercel/src/service/avatar.js'), 'utf8'), 'reviewed source version drift');
const proposed = fs.readFileSync(path.join(__dirname, 'avatar.proposed.cjs'), 'utf8');
const load = (src, think, requireFn = req) => {
  const sandbox = { module: { exports: {} }, think, require: requireFn, process: { env: {} } };
  vm.runInNewContext(src, sandbox);
  return sandbox.module.exports;
};
const think = {
  Service: class {}, service: () => undefined, config: () => undefined, isFunction: x => typeof x === 'function',
  isString: x => typeof x === 'string', isArray: Array.isArray,
  isEmpty: x => x == null || Object.keys(x).length === 0,
  uaParser: () => ({ browser: {}, os: {} }), ip2region: async () => '',
};
(async () => {
  const Old = load(original, think), New = load(proposed, think);
  const old = new Old(), fixed = new New();
  const error = "(unknown path) [Line 4, Column 23]\n  TypeError: Cannot read properties of null (reading 'replace')";
  await assert.rejects(() => old.stringify(fixture), e => e.message === error);
  const results = [];
  for (const field of ['mail', 'nick', 'link', 'ua', 'ip']) {
    const c = { ...fixture, mail: 'anonymous@example.invalid', [field]: null };
    let failed = false;
    try { await old.stringify(c); } catch (e) { failed = true; assert.equal(e.message, error); }
    assert.equal(failed, field === 'mail'); results.push({ field, originalFails: failed });
  }
  for (const mail of [null, undefined, '', ' User@Example.invalid ', '12345@qq.com']) {
    const c = { ...fixture, mail };
    const value = await fixed.stringify(c);
    assert.equal(value, await old.stringify({ ...c, mail: mail ?? '' }));
    assert.equal(c.mail, mail); // no data mutation
  }
  assert.match(await fixed.stringify(fixture), /d41d8cd98f00b204e9800998ecf8427e/);
  think.config = key => key === 'avatarUrl' ? c => { assert.equal(c.mail, null); return 'https://example.invalid/custom.png'; } : undefined;
  assert.equal(await fixed.stringify(fixture), 'https://example.invalid/custom.png');
  think.config = () => undefined;
  // Execute installed getCommentList + formatCmt against an in-memory read-only model.
  // Markdown is a pure stub here; real avatar code/Nunjucks and list pagination execute.
  const controllerSrc = fs.readFileSync(path.join(root, 'node_modules/@waline/vercel/src/controller/comment.js'), 'utf8');
  const roots = [fixture, { ...fixture, objectId: 'fixture-second', mail: 'normal@example.invalid' }];
  const child = { ...fixture, objectId: 'fixture-child', pid: fixture.objectId, rid: fixture.objectId };
  let writes = 0;
  const model = {
    count: async where => where.rid === undefined && Object.hasOwn(where, 'rid') ? roots.length : 3,
    select: async (where, options) => where.rid ? [structuredClone(child)] : structuredClone(roots.slice(options.offset, options.offset + options.limit)),
    add: () => { writes++; throw Error('no writes'); }, update: () => { writes++; throw Error('no writes'); }, delete: () => { writes++; throw Error('no writes'); },
  };
  class Rest {
    constructor(ctx) { this.ctx = ctx; }
    getModel(name) { return name === 'Comment' ? model : { select: async () => [] }; }
    get() { return { path: '/links', page: 1, pageSize: 50, sortBy: 'insertedAt_desc' }; }
    config() { return {}; }
  }
  const Controller = load(controllerSrc, think, name => name === './rest.js' ? Rest : name === '../service/markdown/index.js' ? { getMarkdownParser: async () => x => `<p>${x}</p>` } : req(name));
  think.service = () => old;
  await assert.rejects(() => new Controller({state:{userInfo:{}}}).getCommentList(), e => e.message === error);
  think.service = () => fixed;
  const page = await new Controller({state:{userInfo:{}}}).getCommentList();
  assert.equal(page.count, 3); assert.equal(page.totalPages, 1); assert.equal(page.data.length, 2);
  assert.equal(page.data[0].children.length, 1); assert.equal(page.data[0].objectId, fixture.objectId);
  assert.equal(page.data[0].children[0].objectId, child.objectId); assert.equal(writes, 0);
  assert.equal(fixture.mail, null); assert.equal(child.mail, null);
  // Actual installed JWT library with synthetic, non-credential fixture key.
  const jwt = req('jsonwebtoken');
  const token = jwt.sign('fixture-admin', 'offline-fixture-key');
  assert.equal(jwt.decode(token), 'fixture-admin');
  assert.equal(jwt.verify(token, 'offline-fixture-key', { clockTimestamp: 4102444800 }), 'fixture-admin');
  assert.throws(() => jwt.verify(token, 'different-fixture-key'));
  console.log(JSON.stringify({ passed:true, originalError:error, fields:results, fullList:{roots:2,children:1,writes}, jwt:{payloadType:'string',expiration:false,verifiedIn2100:true}, controllerSha256:createHash('sha256').update(controllerSrc).digest('hex') }, null, 2));
})().catch(e => { console.error(e); process.exitCode = 1; });
