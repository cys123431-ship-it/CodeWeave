// Optional integration suite: Node.js, GCC, Playwright and Chromium required.
// Run with: npm run test:browser. No browser dependency enters the shipped app.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
let playwright, expect;
try { playwright = require('playwright'); expect = require('playwright/test').expect; }
catch {
  if (!process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES) throw Error('Playwright is required for this optional suite.');
  playwright = require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, 'playwright'));
  expect = require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, 'playwright/test')).expect;
}
const { chromium } = playwright;
const root = fileURLToPath(new URL('../', import.meta.url));
const port = process.env.CODEWEAVE_TEST_PORT || '4187';
const base = 'http://127.0.0.1:' + port;
const server = spawn(process.execPath, ['dev-server.mjs'], { cwd: root, env: { ...process.env, PORT: port }, stdio: ['ignore', 'pipe', 'pipe'] });
let output = '';
server.stdout.on('data', chunk => { output += chunk; });
server.stderr.on('data', chunk => { output += chunk; });
let browser, context, page;
const errors = [];
const correct = '#include <stdio.h>\nint main(void){int a,b;if(scanf("%d %d",&a,&b)!=2)return 1;printf("%d\\n",a+b);return 0;}';
const failed = '#include <stdio.h>\nint main(void){puts("0");return 0;}';
const functionOnly = 'int clamp(int value,int low,int high){if(value<low)return low;if(value>high)return high;return value;}';
const history = page => page.evaluate(() => JSON.parse(localStorage.getItem('codeweave.iterations.v1')));
const ready = async page => { await expect(page.locator('#grade-code')).toBeEnabled(); };
async function submit(page, code) {
  await page.locator('#code-input').fill(code);
  const response = page.waitForResponse(r => r.url().endsWith('/api/grade'));
  await page.locator('#grade-code').click();
  await response;
  await ready(page);
}

try {
  for (let i = 0; i < 100 && !output.includes('CodeWeave local learning app:'); i++) {
    if (server.exitCode !== null) throw Error(output);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.match(output, /CodeWeave local learning app:/);
  // Compile our own reference solutions through the actual local API.
  const solutions = {
    'c-hello': '#include <stdio.h>\nint main(void){puts("Hello, CodeWeave!");return 0;}',
    'c-types': correct,
    'c-loops': '#include <stdio.h>\nint main(void){int n,s=0;scanf("%d",&n);for(int i=1;i<=n;i++)s+=i;printf("%d\\n",s);return 0;}',
    'c-array': '#include <stdio.h>\nint main(void){int n,x,m;scanf("%d%d",&n,&m);for(int i=1;i<n;i++){scanf("%d",&x);if(x>m)m=x;}printf("%d\\n",m);return 0;}',
    'c-pointer': '#include <stdio.h>\nvoid add_one(int *p){++*p;}\nint main(void){int n;scanf("%d",&n);add_one(&n);printf("%d\\n",n);return 0;}',
    'c-functions': '#include <stdio.h>\nint clamp(int value,int low,int high){if(value<low)return low;if(value>high)return high;return value;}\nint main(void){int value,low,high;scanf("%d%d%d",&value,&low,&high);printf("%d\\n",clamp(value,low,high));return 0;}',
    'c-clamp-function': functionOnly
  };
  for (const [exerciseId, code] of Object.entries(solutions)) {
    const response = await fetch(base + '/api/grade', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ exerciseId, code }) });
    const result = await response.json();
    assert.equal(result.ok, true, exerciseId + ': ' + JSON.stringify(result));
  }
  console.log('PASS: all seven C exercises compile and pass their real GCC tests');

  browser = await chromium.launch({ headless: true });
  context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  context.on('page', p => p.on('pageerror', e => errors.push(e.message)));
  page = await context.newPage();
  await page.goto(base + '/#lesson:c-functions');
  await expect(page.locator('.detail-head h1')).toHaveText('함수 설계: 선언·호출·값 전달');
  await expect(page.locator('.figure-box svg')).toContainText('clamp');
  await expect(page.locator('#code-input')).toHaveValue(/int clamp\(int value, int low, int high\)/);
  await expect(page.locator('.practice-zone')).toContainText('Practice Exercise');
  await expect(page.locator('.practice-zone')).toContainText('선수 단원:');
  console.log('PASS: function lesson, exercise metadata, static call figure and starter code render together');
  await page.goto(base + '/#lesson:c-clamp-function');
  await expect(page.locator('.detail-head h1')).toHaveText('함수 구현 실습: 테스트 하네스와 계약');
  await expect(page.locator('#code-input')).not.toHaveValue(/main\s*\(/);
  await expect(page.locator('.practice-zone')).toContainText('함수 직접 호출형');
  await submit(page, functionOnly);
  await expect(page.locator('.terminal[role="status"]')).toContainText('모든 테스트 통과');
  console.log('PASS: function-only lesson submits through the separate direct-call harness');
  await page.evaluate(({ failed }) => {
    localStorage.clear();
    localStorage.setItem('codeweave.drafts.v1', JSON.stringify({ 'c-types': failed, 'rust-mut': 'keep rust draft' }));
    localStorage.setItem('codeweave.iterations.v1', JSON.stringify({ 'c-types': [{
      at: '2026-10-11T02:30:00.000Z', code: failed, passed: false,
      message: '<img src=x onerror=alert(1)>', tests: [{ passed: false, detail: 'legacy failure' }]
    }] }));
  }, { failed });
  await page.goto(base + '/#lesson:c-types');
  // Hash navigation keeps the original module state; reload after seeding v1 data.
  await page.reload();
  await expect(page.locator('#code-input')).toHaveValue(failed);
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(1);
  await expect(page.locator('#attempt-history-container .attempt-list img')).toHaveCount(0);
  await expect(page.locator('#attempt-history-container .attempt-status.failed')).toHaveCount(1);
  console.log('PASS: legacy drafts/history render safely in the lesson');

  const bench = await context.newPage();
  await bench.goto(base + '/workbench.html');
  await expect(bench.locator('#lesson-select option[value="c-clamp-function"]')).toHaveCount(1);
  await bench.locator('#lesson-select').selectOption('c-types');
  await submit(page, failed);
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  await submit(page, correct);
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(3);
  assert.ok(await page.locator('#attempt-history-container .attempt-status.passed').count() > 0);
  assert.deepEqual((await history(page))['c-types'].map(x => x.passed), [true, false, false]);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('codeweave.progress.v1') || '{"completed":[]}').completed.includes('c-types')), false);
  await page.locator('#mark-theory').click();
  await page.locator('[data-quiz="c-types"][data-choice="1"]').click();
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('codeweave.progress.v1')).theoryRead), ['c-types']);
  await page.locator('#toggle-review').click();
  await expect(page.locator('.mastery-state')).toContainText('숙달 진행 중');
  await expect(page.locator('.learning-status-list')).toContainText('! 필요');
  await page.locator('#toggle-review').click();
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  await expect(bench.locator('#attempt-list li')).toHaveCount(3);
  await page.locator('#attempt-history-container .attempt-list li').first().locator('summary').click();
  await expect(page.locator('#attempt-history-container .attempt-list li').first().locator('pre').last()).toHaveText(correct);
  await expect(page.locator('#attempt-history-container .attempt-list li').first().locator('pre').first()).toContainText('테스트 3: 통과');
  await submit(bench, correct);
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(4);
  console.log('PASS: real failing/passing submissions, separate quiz status and live shared history');

  page.once('dialog', d => d.dismiss());
  await page.locator('#attempt-history-container .attempt-list li').last().locator('button').click();
  await expect(page.locator('#code-input')).toHaveValue(correct);
  page.once('dialog', d => d.accept());
  await page.locator('#attempt-history-container .attempt-list li').last().locator('button').click();
  await expect(page.locator('#code-input')).toHaveValue(failed);
  assert.equal((await history(page))['c-types'].length, 4);
  await submit(page, failed);
  assert.equal((await history(page))['c-types'].length, 5);
  assert.ok(await page.locator('#attempt-history-container .attempt-status.passed').count() > 0);
  await page.reload();
  await expect(page.locator('#code-input')).toHaveValue(failed);
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(5);
  console.log('PASS: cancel/restore/re-submit/reload preserve previous iterations');

  await page.route('**/api/grade', route => route.fulfill({ status: 503, body: '{}' }));
  await submit(page, correct);
  assert.equal((await history(page))['c-types'].length, 5);
  await expect(page.locator('.terminal[role="status"]')).toContainText('채점 요청 실패 503');
  await page.unroute('**/api/grade');
  await page.route('**/api/grade', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"tests":[]}' }));
  await submit(page, correct);
  assert.equal((await history(page))['c-types'].length, 5);
  await expect(page.locator('.terminal[role="status"]')).toContainText('잘못된 채점 결과');
  await page.unroute('**/api/grade');
  await page.locator('#code-input').focus();
  await page.keyboard.press('Shift+Tab');
  assert.equal(await page.locator('#code-input').evaluate(el => el === document.activeElement), false);
  console.log('PASS: transport/invalid response errors do not create attempts; keyboard can leave editor');

  const downloadPromise = bench.waitForEvent('download');
  await bench.locator('#export-history').click();
  const download = await downloadPromise;
  const chunks = [];
  for await (const chunk of await download.createReadStream()) chunks.push(chunk);
  const backup = Buffer.concat(chunks);
  assert.equal(JSON.parse(backup).kind, 'full-backup');
  assert.equal(JSON.parse(backup)['iterations']['c-types'].length, 5);
  bench.on('dialog', d => d.accept());
  await bench.locator('#import-file').setInputFiles({ name: 'attempts.json', mimeType: 'application/json', buffer: backup });
  await expect(bench.locator('#draft-status')).toHaveText('통합 백업을 복원했습니다.');
  assert.equal(await bench.evaluate(() => JSON.parse(localStorage.getItem('codeweave.drafts.v1'))['rust-mut']), 'keep rust draft');
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(5);
  console.log('PASS: unified workbench backup/restore preserves all-track data');

  await page.locator('[data-route="settings"]').click();
  page.on('dialog', d => d.accept());
  await page.locator('#import-file').setInputFiles({ name: 'legacy-progress.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({
    app: 'CodeWeave', version: 1, progress: { completed: ['c-types'], results: {} }, drafts: { 'c-types': correct }
  })) });
  await expect(page.locator('#import-file')).toBeAttached();
  // Wait for the imported draft, not for the file input alone.
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('codeweave.drafts.v1'))['c-types'])).toBe(correct);
  assert.equal((await history(page))['c-types'].length, 5);
  console.log('PASS: legacy progress restore retains the independent submission history');

  await page.goto(base + '/#lesson:c-types');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  for (const asset of ['/src/practice.js', '/src/mastery.js', '/src/exercises.js']) {
    assert.equal(await page.evaluate(async asset => !!(await caches.match(asset)), asset), true, 'cached ' + asset);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'mobile document overflow');
  const qaDir = process.env.CODEWEAVE_QA_DIR;
  if (qaDir) {
    await mkdir(qaDir, { recursive: true });
    await page.locator('.attempt-history').screenshot({ path: path.join(qaDir, 'lesson-attempts-mobile.png') });
  }
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(5);
  await expect(page.locator('#code-input')).toHaveValue(correct);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await context.setOffline(false);
  assert.deepEqual(errors, []);
  console.log('PASS: 390px mobile layout and offline reload of drafts/history; no browser exceptions');
} catch (error) {
  if (page && process.env.CODEWEAVE_QA_DIR) {
    await mkdir(process.env.CODEWEAVE_QA_DIR, { recursive: true });
    await page.screenshot({ path: path.join(process.env.CODEWEAVE_QA_DIR, 'browser-failure.png'), fullPage: true }).catch(() => {});
  }
  throw error;
} finally {
  await browser?.close();
  const ended = once(server, 'exit');
  server.kill();
  await ended;
}
