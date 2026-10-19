import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { parseRustArgs, startRustServer, closeRustServer } from '../scripts/start-rust.mjs';
import { createLearningServer } from '../server/learning-server.mjs';
import { createRustGradingService } from '../server/rust-service.mjs';
import { createRustGradingDefinitions } from '../server/rust-exercises.mjs';
import { mutDefinition } from '../server/rust-mut-exercise.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const api = () => import('../server/rust-exercises.mjs');
const flags = ['--trusted-personal-code', '--sysroot', '/trusted/tools', '--workspace-parent', '/trusted/work', '--port', '0'];
test('F02 requires a distinct operator flag and never changes default F01 CLI options', () => {
  assert.deepEqual(parseRustArgs(flags), { sysroot: '/trusted/tools', parent: '/trusted/work', port: 0 });
  assert.equal(parseRustArgs([...flags, '--include-f02']).includeF02, true);
  assert.throws(() => parseRustArgs([...flags, '--include-f02', '--include-f02']));
  assert.throws(() => parseRustArgs([...flags.slice(1), '--include-f02']));
  assert.throws(() => parseRustArgs([...flags, '--include-f03']));
});
test('F02 explicit registry adds only the prepared frozen definition and leaves default factories unchanged', async () => {
  const { createRustBindingDefinitions } = await api();
  const first = createRustBindingDefinitions(), second = createRustBindingDefinitions();
  assert.deepEqual([...first.keys()], ['rust-cargo', 'rust-mut']);
  assert.deepEqual([...createRustGradingDefinitions().keys()], ['rust-cargo']);
  assert.equal(first.get('rust-mut'), mutDefinition);
  assert.equal(first.get('rust-cargo'), createRustGradingDefinitions().get('rust-cargo'));
  first.clear();
  assert.equal(second.size, 2);
});
async function fixture(t, ids = ['rust-cargo', 'rust-mut']) {
  let calls = 0;
  const definitions = new Map([...createRustGradingDefinitions(), ['rust-mut', mutDefinition]]);
  const service = createRustGradingService({ enabled: true, definitions, grade: request => {
    calls++;
    return { ok: true, message: '10/10', compileOutput: '', tests: definitions.get(request.exerciseId).cases.map(() => ({ passed: true, detail: '통과' })) };
  } });
  const app = createLearningServer({ root, rustService: service, rustExerciseIds: ids });
  t.after(() => app.close());
  const { port } = await app.listen(0), url = 'http://127.0.0.1:' + port;
  const html = await (await fetch(url)).text();
  const token = html.match(/name="codeweave-token" content="([a-f0-9]{64})"/)[1];
  return { app, url, html, token, calls: () => calls };
}
const post = (f, id, headers = {}) => fetch(f.url + '/api/grade/rust', { method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-CodeWeave-Token': f.token, ...headers },
  body: JSON.stringify({ exerciseId: id, code: mutDefinition.starter }) });
test('F02 configured pages advertise exact IDs on lesson and workbench but never expose private sources', async t => {
  const f = await fixture(t);
  for (const html of [f.html, await (await fetch(f.url + '/workbench.html')).text()]) {
    assert.match(html, /name="codeweave-rust" content="rust-cargo"/);
    assert.match(html, /name="codeweave-rust-exercises" content="rust-cargo rust-mut"/);
  }
  assert.equal((await fetch(f.url + '/server/rust-mut-exercise.mjs')).status, 404);
});
test('F02 HTTP allowlist is enforced before calling even a broader configured service', async t => {
  const ids = ['rust-cargo'];
  const f = await fixture(t, ids);
  ids.push('rust-mut');
  assert.equal((await post(f, 'rust-mut')).status, 400);
  assert.equal(f.calls(), 0);
  assert.equal((await post(f, 'rust-cargo')).status, 200);
  assert.equal(f.calls(), 1);
});
test('F02 opt-in retains JSON/token/Origin rejection before service execution', async t => {
  const f = await fixture(t);
  assert.equal((await post(f, 'rust-mut', { 'Content-Type': 'text/plain' })).status, 415);
  assert.equal((await post(f, 'rust-mut', { 'X-CodeWeave-Token': '' })).status, 403);
  assert.equal((await post(f, 'rust-mut', { Origin: 'https://outside.invalid' })).status, 403);
  assert.equal((await post(f, 'rust-unknown')).status, 400);
  assert.equal(f.calls(), 0);
  assert.equal((await post(f, 'rust-mut')).status, 200);
  assert.equal(f.calls(), 1);
});
test('F02 capability configuration rejects missing service, empty, unknown, duplicated and HTML-like IDs', () => {
  assert.throws(() => createLearningServer({ root, rustExerciseIds: ['rust-mut'] }), TypeError);
  const rustService = { submit() {} };
  for (const rustExerciseIds of [[], 'rust-mut', ['rust-mut'], ['rust-cargo', ,], ['rust-cargo', 'rust-cargo'], ['rust-unknown'], ['rust-mut" onload="x']]) {
    assert.throws(() => createLearningServer({ root, rustService, rustExerciseIds }), TypeError);
  }
});
const cargo = spawnSync('cargo', ['--version'], { timeout: 3000 }).status === 0;
test('real F02 operator opt-in grades authenticated wrong/correct code and default CLI still rejects F02', {
  skip: !cargo && process.env.CODEWEAVE_REQUIRE_RUST !== '1' ? 'Cargo unavailable locally; mandatory in CI' : false, timeout: 60000
}, async t => {
  const { trustedRustTools } = await import('./helpers/rust-tools.mjs');
  const tools = await trustedRustTools();
  const parent = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-f02-opt-in-')));
  t.after(() => fs.rm(parent, { recursive: true, force: true }));
  const args = ['--trusted-personal-code', '--sysroot', path.dirname(path.dirname(tools.rustc)), '--workspace-parent', parent, '--port', '0'];
  const correct = (await fs.readFile(new URL('../content/rust/02-bindings.md', import.meta.url), 'utf8')).match(/```rust\n([\s\S]*?)\n```/)[1].split('fn main()')[0];
  for (const include of [false, true]) {
    const started = await startRustServer(include ? [...args, '--include-f02'] : args);
    try {
      const { port } = started.app.address(), url = 'http://127.0.0.1:' + port;
      const html = await (await fetch(url)).text(), token = html.match(/name="codeweave-token" content="([a-f0-9]{64})"/)[1];
      for (const [code, ok] of [[mutDefinition.starter, false], [correct, true]]) {
        const response = await fetch(url + '/api/grade/rust', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CodeWeave-Token': token }, body: JSON.stringify({ exerciseId: 'rust-mut', code }) });
        assert.equal(response.status, include ? 200 : 400);
        const result = await response.json();
        if (include) { assert.equal(result.ok, ok); assert.equal(result.tests.length, 10); }
        assert.deepEqual(await fs.readdir(parent), []);
      }
      console.log('F02 operator HTTP:', { include, verified: true });
    } finally { await closeRustServer(started); }
  }
});
