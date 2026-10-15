import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const names = ['hello', 'types', 'loops', 'array-max', 'string', 'bounded-string'];
const manuscripts = ['01-hello', '02-variables-types', '03-conditionals-loops',
  '07-array-max-function', '08-strings-count-function', '09-bounded-string-length'];

async function fixture(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'codeweave-editorial-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  for (const entry of ['package.json', 'src', 'server', 'tests', 'content']) {
    await cp(path.join(root, entry), path.join(directory, entry), { recursive: true });
  }
  return directory;
}

function verify(directory, selected = names) {
  const env = { ...process.env };
  // A nested runner must discover its own tests instead of inheriting child mode.
  delete env.NODE_TEST_CONTEXT;
  return spawnSync(process.execPath, ['--test', '--test-concurrency=1',
    ...selected.map(name => 'tests/' + name + '-content.test.mjs')], {
    cwd: directory, env, encoding: 'utf8', timeout: 60000, maxBuffer: 2 * 1024 * 1024
  });
}

test('editorial prose can be rewritten without changing headings, code or grading contracts', async t => {
  const directory = await fixture(t);
  const catalog = path.join(directory, 'src/catalog.js');
  await writeFile(catalog, await readFile(catalog, 'utf8') + `
for (const lesson of lessons) {
  for (const section of lesson.sections) section.text = '새로 다듬은 독자 해설입니다.';
  lesson.challenge.description = '입력과 반환 계약에 맞게 구현하세요.';
}
`);
  for (const name of manuscripts) {
    const file = path.join(directory, 'content/c/' + name + '.md');
    let fenced = false;
    const text = (await readFile(file, 'utf8')).split('\n').map(line => {
      if (line.startsWith('```')) { fenced = !fenced; return line; }
      return fenced || line.startsWith('#') || !line.trim() ? line : '새로 다듬은 독자 해설입니다.';
    }).join('\n');
    await writeFile(file, text);
  }
  const result = verify(directory);
  assert.match(result.stdout, /tests [1-9]\d*/);
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test('required manuscript heading removal is still rejected', async t => {
  const directory = await fixture(t);
  const file = path.join(directory, 'content/c/01-hello.md');
  await writeFile(file, (await readFile(file, 'utf8')).replace('## 학습 목표', '## 목표 변경'));
  const result = verify(directory, ['hello']);
  assert.equal(result.error, undefined);
  assert.notEqual(result.status, 0);
  assert.match(result.stdout + result.stderr, /## 학습 목표/);
});

test('a broken complete example is still rejected by GCC', {
  skip: spawnSync('gcc', ['--version']).status !== 0
}, async t => {
  const directory = await fixture(t);
  const file = path.join(directory, 'content/c/01-hello.md');
  const text = await readFile(file, 'utf8');
  const start = text.indexOf('## 완성 프로그램');
  assert.ok(start >= 0);
  await writeFile(file, text.slice(0, start) + text.slice(start).replace('printf(', 'codeweave_missing_function('));
  const result = verify(directory, ['hello']);
  assert.equal(result.error, undefined);
  assert.notEqual(result.status, 0);
  assert.match(result.stdout + result.stderr, /implicit declaration|undeclared/);
});
