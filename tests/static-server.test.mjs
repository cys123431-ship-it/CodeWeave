import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';

const project = fileURLToPath(new URL('../', import.meta.url));
const publicFiles = [
  'index.html', 'workbench.html', 'styles.css', 'workbench.css', 'sw.js',
  'manifest.webmanifest', 'assets/icon.svg', 'src/app.js', 'src/catalog.js',
  'src/figures.js', 'src/logic.js', 'src/workbench.js', 'src/practice.js',
  'src/iterations.js', 'src/attempt-backup.js', 'src/backup.js', 'src/mastery.js',
  'src/exercises.js', 'src/multi-file.js', 'src/compiler-feedback.js'
];

// Use raw request targets: fetch/URL would normalize traversal before sending it.
function request(url, target, method = 'GET', body) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { path: target, method }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
      res.on('error', reject);
    });
    req.setTimeout(5000, () => req.destroy(new Error('request timed out')));
    req.on('error', reject);
    req.end(body);
  });
}

test('static server serves the learning shell without exposing project files', { timeout: 30000 }, async t => {
  // A disposable checkout with synthetic secrets; never create or read real credentials.
  const sandbox = await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-static-test-'));
  const root = path.join(sandbox, 'project');
  await fs.mkdir(root);
  const secret = 'synthetic-private-file-for-static-policy-test';
  for (const file of publicFiles) {
    await fs.mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await fs.copyFile(path.join(project, file), path.join(root, file));
  }
  for (const file of ['.env', '.git/config', 'package.json', 'dev-server.mjs', 'server/static-files.mjs', 'tests/private.mjs', 'docs/private.md', 'content/c/private.md', 'src/private.js', 'assets/private.svg']) {
    await fs.mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await fs.writeFile(path.join(root, file), secret);
  }
  await fs.writeFile(path.join(sandbox, 'outside.svg'), secret);
  const child = spawn(process.execPath, [path.join(project, 'dev-server.mjs')], {
    cwd: root, env: { ...process.env, PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe']
  });
  t.after(async () => {
    try {
      if (child.exitCode === null && child.signalCode === null) {
        const exit = once(child, 'exit');
        child.kill();
        await exit;
      }
    } finally { await fs.rm(sandbox, { recursive: true, force: true }); }
  });
  const url = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('server startup timed out')), 5000);
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('exit', code => { clearTimeout(timer); reject(new Error('server exited: ' + code)); });
    let output = '';
    child.stdout.on('data', chunk => {
      output += chunk;
      const match = output.match(/http:\/\/127\.0\.0\.1:\d+/);
      if (match) { clearTimeout(timer); resolve(match[0]); }
    });
  });
  await t.test('non-public files are denied for GET and HEAD', async () => {
    for (const file of ['.env', '.git/config', 'package.json', 'dev-server.mjs', 'server/static-files.mjs', 'tests/private.mjs', 'docs/private.md', 'content/c/private.md', 'src/private.js', 'assets/private.svg']) {
      for (const method of ['GET', 'HEAD']) {
        const response = await request(url, '/' + file, method);
        assert.equal(response.status, 404, method + ' ' + file);
        assert.ok(!response.body.includes(Buffer.from(secret)));
      }
    }
  });
  await t.test('all current learning and PWA assets retain their content and HEAD metadata', async () => {
    for (const file of publicFiles) {
      const expected = await fs.readFile(path.join(project, file));
      const response = await request(url, '/' + file + '?v=regression');
      assert.equal(response.status, 200, file);
      assert.deepEqual(response.body, expected, file);
      assert.equal(response.headers['x-content-type-options'], 'nosniff');
      const head = await request(url, '/' + file, 'HEAD');
      assert.equal(head.status, 200, file);
      assert.equal(Number(head.headers['content-length']), expected.length);
      assert.equal(head.headers['content-type'], response.headers['content-type']);
      assert.equal(head.body.length, 0);
    }
    assert.deepEqual((await request(url, '/')).body, await fs.readFile(path.join(project, 'index.html')));
    assert.equal((await request(url, '/src/')).status, 404);
    assert.equal((await request(url, '/styles.css', 'POST')).status, 405);
    const shell = await fs.readFile(path.join(project, 'sw.js'), 'utf8');
    const assets = JSON.parse(shell.match(/const ASSETS=(\[[^;]+\]);/)[1].replaceAll("'", '"'));
    for (const asset of assets) assert.equal((await request(url, '/' + asset.slice(2))).status, 200, asset);
  });
  await t.test('malformed and traversal targets are rejected without stopping the server', async () => {
    for (const target of ['/src/../index.html', '/%2e%2e/index.html', '/src/%2e%2e/index.html', '/src%2fapp.js', '/src%5capp.js', '/src\\app.js', '/%252e%252e/index.html', '/index.html%00', '/%E0%A4%A', '/%', '//index.html', 'http://localhost/index.html', '/index.html#fragment']) {
      assert.equal((await request(url, target)).status, 400, target);
    }
    assert.equal((await request(url, '/index.html')).status, 200);
    assert.equal((await request(url, '/api/grade')).status, 405);
    const invalidGrade = await request(url, '/api/grade?source=test', 'POST', JSON.stringify({ exerciseId: 'unknown', code: '' }));
    assert.equal(invalidGrade.status, 400);
    assert.equal(JSON.parse(invalidGrade.body).ok, false);
  });
  await t.test('allowed file and directory symlinks cannot escape or alias the checkout', async () => {
    const icon = path.join(root, 'assets/icon.svg');
    await fs.rm(icon);
    await fs.symlink(path.join(sandbox, 'outside.svg'), icon);
    assert.equal((await request(url, '/assets/icon.svg')).status, 404);
    assert.equal((await request(url, '/assets/icon.svg', 'HEAD')).status, 404);
    await fs.rm(icon);
    await fs.symlink(path.join(root, 'index.html'), icon);
    assert.equal((await request(url, '/assets/icon.svg')).status, 404);
    await fs.rename(path.join(root, 'src'), path.join(sandbox, 'external-src'));
    await fs.symlink(path.join(sandbox, 'external-src'), path.join(root, 'src'), 'dir');
    assert.equal((await request(url, '/src/app.js')).status, 404);
    assert.equal((await request(url, '/index.html')).status, 200);
  });
  await t.test('a missing allowed file returns 404 and later requests still work', async () => {
    await fs.rm(path.join(root, 'styles.css'));
    assert.equal((await request(url, '/styles.css')).status, 404);
    assert.equal((await request(url, '/workbench.html')).status, 200);
  });
});
