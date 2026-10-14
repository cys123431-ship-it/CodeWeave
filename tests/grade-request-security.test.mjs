import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath, pathToFileURL } from 'node:url';
import vm from 'node:vm';

const project = fileURLToPath(new URL('../', import.meta.url));
function request(url, { method = 'GET', headers = {}, body, target = '/' } = {}) {
  return new Promise((resolve, reject) => {
    const rawHeaders = Object.entries(headers).flatMap(([name, value]) =>
      (Array.isArray(value) ? value : [value]).flatMap(item => [name, item]));
    if (!Object.keys(headers).some(name => name.toLowerCase() === 'host')) {
      rawHeaders.push('Host', new URL(url).host);
    }
    const req = http.request(url, { path: target, method, headers: rawHeaders }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') }));
      res.on('error', reject);
    });
    req.setTimeout(5000, () => req.destroy(new Error('request timed out')));
    req.on('error', reject);
    req.end(body);
  });
}

test('grade requests require a local authority, JSON and a per-start token before side effects', { timeout: 30000 }, async t => {
  const sandbox = await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-request-test-'));
  const trace = path.join(sandbox, 'effects.txt');
  const hook = path.join(sandbox, 'audit.mjs');
  await fs.writeFile(trace, '');
  // Instrument actual builtin calls, not a mock implementation of the server.
  await fs.writeFile(hook, [
    "import fs from 'node:fs/promises';",
    "import { appendFileSync } from 'node:fs';",
    "import cp from 'node:child_process';",
    "import { syncBuiltinESMExports } from 'node:module';",
    "const trace = process.env.CODEWEAVE_EFFECT_TRACE;",
    "const originalTemp = fs.mkdtemp;",
    "fs.mkdtemp = (...args) => { appendFileSync(trace, 'mkdtemp\\n'); return originalTemp(...args); };",
    "const originalSpawn = cp.spawnSync;",
    "cp.spawnSync = (command, ...args) => { if (command === 'gcc') appendFileSync(trace, 'gcc\\n'); return originalSpawn(command, ...args); };",
    "syncBuiltinESMExports();"
  ].join('\n'));
  const children = [];
  t.after(async () => {
    for (const child of children) {
      if (child.exitCode === null && child.signalCode === null) {
        const ended = once(child, 'exit'); child.kill(); await ended;
      }
    }
    await fs.rm(sandbox, { recursive: true, force: true });
  });
  async function start() {
    const child = spawn(process.execPath, ['--import', pathToFileURL(hook).href, 'dev-server.mjs'], {
      cwd: project, env: { ...process.env, PORT: '0', TMPDIR: sandbox, TEMP: sandbox, TMP: sandbox, CODEWEAVE_EFFECT_TRACE: trace },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    children.push(child);
    const url = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error('server startup timed out')), 5000);
      child.once('error', e => { clearTimeout(timer); reject(e); });
      child.once('exit', code => { clearTimeout(timer); reject(Error('server exited: ' + code)); });
      let output = '';
      child.stdout.on('data', chunk => {
        output += chunk;
        const match = output.match(/http:\/\/127\.0\.0\.1:\d+/);
        if (match) { clearTimeout(timer); resolve(match[0]); }
      });
    });
    return url;
  }
  const url = await start();
  const html = await request(url);
  const token = html.body.match(/<meta name="codeweave-token" content="([0-9a-f]{64})">/)?.[1];
  const headers = { 'Content-Type': 'application/json', 'X-CodeWeave-Token': token ?? 'a'.repeat(64) };
  const body = JSON.stringify({ exerciseId: 'c-hello', code: '#include <stdio.h>\nint main(void){puts("Hello, CodeWeave!");return 0;}' });
  const port = new URL(url).port;
  for (const [name, override, status] of [
    ['text/plain', { 'Content-Type': 'text/plain' }, 415],
    ['JSON with parameters', { 'Content-Type': 'application/json; charset=utf-8' }, 415],
    ['foreign Origin', { Origin: 'https://untrusted.example' }, 403],
    ['opaque Origin', { Origin: 'null' }, 403],
    ['wrong local Origin port', { Origin: 'http://127.0.0.1:1' }, 403],
    ['forged Host', { Host: 'untrusted.example:' + port }, 403],
    ['wrong Host port', { Host: 'localhost:1' }, 403],
    ['missing token', { 'X-CodeWeave-Token': undefined }, 403],
    ['wrong token', { 'X-CodeWeave-Token': '0'.repeat(64) }, 403],
    ['duplicate Content-Type', { 'Content-Type': ['application/json', 'text/plain'] }, 415],
    // Some Node versions reject duplicate Host in the HTTP parser before our handler.
    ['duplicate Host', { Host: ['127.0.0.1:' + port, 'untrusted.example:' + port] }, [400, 403]],
    ['duplicate Origin', { Origin: [url, 'https://untrusted.example'] }, 403],
    ['duplicate token', { 'X-CodeWeave-Token': [headers['X-CodeWeave-Token'], headers['X-CodeWeave-Token']] }, 403]
  ]) {
    await t.test('rejects ' + name + ' before GCC or temporary directory creation', async () => {
      await fs.writeFile(trace, '');
      const h = { ...headers, ...override };
      for (const key of Object.keys(h)) if (h[key] === undefined) delete h[key];
      const response = await request(url, { target: '/api/grade', method: 'POST', headers: h, body });
      if (Array.isArray(status)) assert.ok(status.includes(response.status));
      else assert.equal(response.status, status);
      if (response.status !== 400) assert.equal(JSON.parse(response.body).ok, false);
      assert.equal(await fs.readFile(trace, 'utf8'), '', 'source allocation and GCC must never begin');
      assert.ok(!(await fs.readdir(sandbox)).some(name => name.startsWith('codeweave-')));
    });
  }
  await t.test('injects the same unpredictable token into both pages but not cached source files', async () => {
    assert.match(token ?? '', /^[0-9a-f]{64}$/);
    assert.equal(html.headers['cache-control'], 'no-store');
    const bench = await request(url, { target: '/workbench.html' });
    assert.ok(bench.body.includes('content="' + token + '"'));
    assert.equal(bench.headers['cache-control'], 'no-store');
    assert.equal(Number(bench.headers['content-length']), Buffer.byteLength(bench.body));
    const head = await request(url, { method: 'HEAD' });
    assert.equal(Number(head.headers['content-length']), Buffer.byteLength(html.body));
    const module = await request(url, { target: '/src/app.js' });
    assert.ok(!module.body.includes(token));
  });
  await t.test('rejects rebinding Host on token-bearing pages', async () => {
    const response = await request(url, { headers: { Host: 'untrusted.example:' + port } });
    assert.equal(response.status, 403);
    assert.ok(!response.body.includes(token ?? 'a'.repeat(64)));
  });
  await t.test('rejects cross-origin preflight without CORS permission or execution', async () => {
    await fs.writeFile(trace, '');
    const response = await request(url, { target: '/api/grade', method: 'OPTIONS', headers: { Origin: 'https://untrusted.example', 'Access-Control-Request-Method': 'POST' } });
    assert.equal(response.status, 405);
    assert.equal(response.headers['access-control-allow-origin'], undefined);
    assert.equal(await fs.readFile(trace, 'utf8'), '');
  });
  await t.test('accepts both allowed local authorities with the injected token', async () => {
    for (const host of ['127.0.0.1:' + port, 'localhost:' + port]) {
      const response = await request(url, { target: '/api/grade', method: 'POST', headers: { ...headers, Host: host, Origin: 'http://' + host }, body: '{"exerciseId":"unknown","code":""}' });
      assert.equal(response.status, 400, 'valid headers must reach ordinary exercise validation');
    }
  });
  await t.test('rotates the token on server restart and refuses a previous server token', async () => {
    const secondURL = await start();
    const secondHTML = await request(secondURL);
    const secondToken = secondHTML.body.match(/<meta name="codeweave-token" content="([0-9a-f]{64})">/)?.[1];
    assert.match(secondToken ?? '', /^[0-9a-f]{64}$/);
    assert.notEqual(secondToken, token);
    await fs.writeFile(trace, '');
    const response = await request(secondURL, { target: '/api/grade', method: 'POST', headers, body });
    assert.equal(response.status, 403);
    assert.equal(await fs.readFile(trace, 'utf8'), '');
  });
});

test('PWA caches token-free HTML while online pages retain the live token', async () => {
  const handlers = new Map();
  const saved = new Map();
  const origin = 'http://127.0.0.1:4173';
  const token = 'a'.repeat(64);
  let html = '<html><head>\n  <meta name="codeweave-token" content="' + token + '">\n</head><body>Learning shell</body></html>';
  let offline = false;
  let delayCache = false;
  let openCache;
  const cacheKey = key => new URL(typeof key === 'string' ? key : key.url, origin + '/').href;
  const cache = {
    async put(key, response) { saved.set(cacheKey(key), response.clone()); },
    async addAll(keys) { for (const key of keys) await this.put(key, await network(key)); }
  };
  async function network(key) {
    if (offline) throw Error('offline');
    const isHTML = /\/(?:index\.html|workbench\.html)?$/.test(cacheKey(key));
    return new Response(isHTML ? html : 'static asset', { headers: {
      'Content-Type': isHTML ? 'text/html; charset=utf-8' : 'text/javascript',
      ...(isHTML ? { 'Cache-Control': 'no-store', 'Content-Length': String(Buffer.byteLength(html)) } : {})
    } });
  }
  vm.runInNewContext(await fs.readFile(path.join(project, 'sw.js'), 'utf8'), {
    self: { location: { origin }, addEventListener: (name, handler) => handlers.set(name, handler),
      skipWaiting: async () => {}, clients: { claim: async () => {} } },
    caches: { open: async () => {
      if (delayCache) await new Promise(resolve => { openCache = resolve; });
      return cache;
    }, match: async key => saved.get(cacheKey(key))?.clone() },
    fetch: network, URL, Response, Headers
  });
  let installing;
  handlers.get('install')({ waitUntil: promise => { installing = promise; } });
  await installing;
  for (const key of ['/', '/index.html', '/workbench.html']) {
    const cached = saved.get(cacheKey(key));
    assert.ok(cached, 'offline shell must still be cached');
    assert.ok(!(await cached.clone().text()).includes(token), 'startup token must not persist in the cache');
    assert.equal(cached.headers.get('content-length'), null, 'sanitized HTML has a different byte length');
  }
  const pending = [];
  function dispatch(target) {
    let responding;
    handlers.get('fetch')({ request: new Request(origin + target),
      respondWith: promise => { responding = promise; },
      waitUntil: promise => pending.push(promise) });
    return responding;
  }
  delayCache = true;
  html = html.replace('Learning shell', 'New session');
  const online = await dispatch('/index.html');
  assert.ok((await online.text()).includes(token), 'online response must retain the current token');
  openCache();
  await Promise.all(pending);
  const updated = await saved.get(cacheKey('/index.html')).clone().text();
  assert.ok(!updated.includes(token));
  assert.ok(updated.includes('New session'), 'cache updates must survive the client consuming the online body first');
  offline = true;
  const fallback = await dispatch('/workbench.html');
  const offlineHTML = await fallback.text();
  assert.ok(offlineHTML.includes('Learning shell'));
  assert.ok(!offlineHTML.includes(token));
  assert.equal(dispatch('/api/grade'), undefined, 'the worker must not cache API requests');
});

