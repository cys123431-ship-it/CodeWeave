// Optional integration suite: Node.js, GCC, Playwright and Chromium required.
// Run with: npm run test:browser. No browser dependency enters the shipped app.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { serializeMultiFileSubmission } from '../src/multi-file.js';

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
const qaDir = process.env.CODEWEAVE_QA_DIR;
const correct = '#include <stdio.h>\nint main(void){int a,b;if(scanf("%d %d",&a,&b)!=2)return 1;printf("%d\\n",a+b);return 0;}';
const failed = '#include <stdio.h>\nint main(void){puts("0");return 0;}';
const functionOnly = 'int clamp(int value,int low,int high){if(value<low)return low;if(value>high)return high;return value;}';
const arrayMaxFunction = '#include <stddef.h>\nint find_max(const int values[],size_t length,int *out_max){if(!values||length==0||!out_max)return 0;int maximum=values[0];for(size_t i=1;i<length;i++)if(values[i]>maximum)maximum=values[i];*out_max=maximum;return 1;}';
const arrayMaxWrong = '#include <stddef.h>\nint find_max(const int values[],size_t length,int *out_max){if(!values||length==0||!out_max)return 0;int maximum=0;for(size_t i=0;i<length;i++)if(values[i]>maximum)maximum=values[i];*out_max=maximum;return 1;}';
const multiFileSolution = [
  {name:'main.c',content:'#include <stdio.h>\n#include "functions.h"\nint main(void){int v,l,h;if(scanf("%d%d%d",&v,&l,&h)!=3)return 1;printf("%d\\n",clamp(v,l,h));return 0;}'},
  {name:'functions.c',content:'#include "functions.h"\nint clamp(int v,int l,int h){if(v<l)return l;if(v>h)return h;return v;}'},
  {name:'functions.h',content:'#ifndef FUNCTIONS_H\n#define FUNCTIONS_H\nint clamp(int value,int low,int high);\n#endif'}
];
const multiFileWrong = multiFileSolution.map(file => file.name === 'functions.c'
  ? { ...file, content: '#include "functions.h"\nint clamp(int v,int l,int h){(void)v;(void)l;return h;}' }
  : file);
const history = page => page.evaluate(() => JSON.parse(localStorage.getItem('codeweave.iterations.v1')));
const ready = async page => { await expect(page.locator('#grade-code')).toBeEnabled(); };
async function submit(page, code) {
  await page.locator('#code-input').fill(code);
  const response = page.waitForResponse(r => r.url().endsWith('/api/grade'));
  await page.locator('#grade-code').click();
  await response;
  await ready(page);
}
async function fillMultiFile(page, files) {
  for (const file of files) await page.locator('[data-code-file="' + file.name + '"]').fill(file.content);
}
async function expectMultiFile(page, files) {
  for (const file of files) await expect(page.locator('[data-code-file="' + file.name + '"]')).toHaveValue(file.content);
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
    'c-clamp-function': functionOnly,
    'c-array-max-function': arrayMaxFunction,
    'c-multi-file': serializeMultiFileSubmission(multiFileSolution, { requiredNames: ['main.c','functions.c','functions.h'] })
  };
  for (const [exerciseId, code] of Object.entries(solutions)) {
    const response = await fetch(base + '/api/grade', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ exerciseId, code }) });
    const result = await response.json();
    assert.equal(result.ok, true, exerciseId + ': ' + JSON.stringify(result));
  }
  console.log('PASS: all nine C exercises compile and pass their real GCC tests');

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
  await submit(page, arrayMaxWrong);
  await expect(page.locator('.terminal[role="status"]')).toContainText('채점 미통과');
  await submit(page, arrayMaxFunction);
  await expect(page.locator('.terminal[role="status"]')).toContainText('모든 테스트 통과');
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  await page.locator('#mark-theory').click();
  await page.locator('[data-quiz="c-array-max-function"][data-choice="0"]').click();
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  console.log('PASS: array function failure, correction, iterations and mastery stay in one lesson flow');
  await submit(page, functionOnly + '\nint main(void){return 0;}');
  await expect(page.locator('.terminal[role="status"]')).toContainText('링크 단계 · 같은 이름이 두 번 정의됨');
  await expect(page.locator('.terminal[role="status"]')).toContainText('multiple definition');
  await submit(page, functionOnly);
  await expect(page.locator('.terminal[role="status"]')).toContainText('모든 테스트 통과');
  console.log('PASS: function-only lesson explains a linker failure and then passes the direct-call harness');
  await page.goto(base + '/#lesson:c-array-max-function');
  await expect(page.locator('.detail-head h1')).toHaveText('배열 함수 실습: 최댓값과 출력 포인터');
  await expect(page.locator('.figure-box svg')).toContainText('out_max');
  await expect(page.locator('#code-input')).not.toHaveValue(/main\s*\(/);
  await expect(page.locator('.practice-zone')).toContainText('함수 직접 호출형');
  await page.goto(base + '/#lesson:c-multi-file');
  await expect(page.locator('.detail-head h1')).toHaveText('분할 컴파일: 헤더와 여러 소스 파일');
  await expect(page.locator('.figure-box svg')).toContainText('functions.h');
  await expect(page.locator('[data-code-file]')).toHaveCount(3);
  await expect(page.locator('.practice-zone')).toContainText('다중 파일형');
  await fillMultiFile(page, multiFileSolution);
  const multiResponse = page.waitForResponse(r => r.url().endsWith('/api/grade'));
  await page.locator('#grade-code').click(); await multiResponse; await ready(page);
  await expect(page.locator('.terminal[role="status"]')).toContainText('모든 테스트 통과');
  assert.match(await page.evaluate(() => JSON.parse(localStorage.getItem('codeweave.drafts.v1'))['c-multi-file']), /^CODEWEAVE_MULTI_FILE_V1/);
  await fillMultiFile(page, multiFileWrong);
  const failedMultiResponse = page.waitForResponse(r => r.url().endsWith('/api/grade'));
  await page.locator('#grade-code').click(); await failedMultiResponse; await ready(page);
  await expect(page.locator('.terminal[role="status"]')).toContainText('채점 미통과');
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  await expect(page.locator('#attempt-history-container .attempt-status.failed')).toHaveCount(1);
  page.once('dialog', dialog => dialog.accept());
  await page.locator('#attempt-history-container .attempt-list li').last().locator('button').click();
  await expectMultiFile(page, multiFileSolution);
  await expect(page.locator('.terminal[role="status"]')).toContainText('이전 제출 코드를 복원했습니다');

  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'multi-file lesson mobile overflow');
  for (const file of multiFileSolution) {
    const box = await page.locator('[data-code-file="' + file.name + '"]').boundingBox();
    assert.ok(box && box.x >= 0 && box.x + box.width <= 390, file.name + ' must fit the mobile viewport');
  }
  if (qaDir) {
    await mkdir(qaDir, { recursive: true });
    await page.locator('.multi-file-editors').screenshot({ path: path.join(qaDir, 'lesson-multi-file-mobile.png') });
  }

  const multiBench = await context.newPage();
  await multiBench.setViewportSize({ width: 390, height: 844 });
  await multiBench.goto(base + '/workbench.html');
  await multiBench.locator('#lesson-select').selectOption('c-multi-file');
  await expectMultiFile(multiBench, multiFileSolution);
  await expect(multiBench.locator('#attempt-list li')).toHaveCount(2);
  assert.equal(await multiBench.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'multi-file workbench mobile overflow');
  for (const file of multiFileSolution) {
    const box = await multiBench.locator('[data-code-file="' + file.name + '"]').boundingBox();
    assert.ok(box && box.x >= 0 && box.x + box.width <= 390, 'workbench ' + file.name + ' must fit the mobile viewport');
  }
  if (qaDir) await multiBench.locator('#multi-file-editors').screenshot({ path: path.join(qaDir, 'workbench-multi-file-mobile.png') });

  const multiDownloadPromise = multiBench.waitForEvent('download');
  await multiBench.locator('#export-history').click();
  const multiDownload = await multiDownloadPromise;
  const multiChunks = [];
  for await (const chunk of await multiDownload.createReadStream()) multiChunks.push(chunk);
  const multiBackup = Buffer.concat(multiChunks);
  const multiBackupData = JSON.parse(multiBackup);
  assert.equal(multiBackupData.kind, 'full-backup');
  assert.equal(multiBackupData.iterations['c-multi-file'].length, 2);

  await fillMultiFile(multiBench, multiFileWrong);
  await expect.poll(() => multiBench.evaluate(() => JSON.parse(localStorage.getItem('codeweave.drafts.v1'))['c-multi-file']))
    .not.toBe(multiBackupData.drafts['c-multi-file']);
  multiBench.on('dialog', dialog => dialog.accept());
  await multiBench.locator('#import-file').setInputFiles({ name: 'multi-file-backup.json', mimeType: 'application/json', buffer: multiBackup });
  await expect(multiBench.locator('#draft-status')).toHaveText('통합 백업을 복원했습니다.');
  await expectMultiFile(multiBench, multiFileSolution);
  await expect(multiBench.locator('#attempt-list li')).toHaveCount(2);
  await page.reload();
  await expectMultiFile(page, multiFileSolution);
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await multiBench.close();
  await page.setViewportSize({ width: 1366, height: 900 });
  console.log('PASS: multi-file mobile editors, attempt restore and unified backup round trip preserve all three files');
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
  await expect(bench.locator('#lesson-select option[value="c-array-max-function"]')).toHaveCount(1);
  await expect(bench.locator('#lesson-select option[value="c-multi-file"]')).toHaveCount(1);
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
  for (const asset of ['/src/practice.js', '/src/mastery.js', '/src/exercises.js', '/src/multi-file.js', '/src/compiler-feedback.js']) {
    assert.equal(await page.evaluate(async asset => !!(await caches.match(asset)), asset), true, 'cached ' + asset);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'mobile document overflow');
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
