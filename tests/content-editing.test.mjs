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
const secondBatch = ['arrays', 'pointers', 'function-scope', 'functions', 'recursion', 'matrix-rows'];
const secondManuscripts = ['04-arrays', '05-pointers', '06-functions',
  '20-recursion-factorial', '21-matrix-row-sums'];
const thirdBatch = ['fgets', 'strtol', 'struct', 'struct-array',
  'struct-array-sort', 'struct-array-binary-search'];
const thirdManuscripts = ['10-fgets-logical-line', '11-strtol-integer-input',
  '12-struct-student-score', '13-struct-array-search',
  '14-struct-array-sort', '15-struct-array-binary-search'];

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

async function rewriteProse(directory, files, quizCopy = false) {
  const catalog = path.join(directory, 'src/catalog.js');
  await writeFile(catalog, await readFile(catalog, 'utf8') + `
for (const lesson of lessons) {
  for (const section of lesson.sections) section.text = '새로 다듬은 독자 해설입니다.';
  lesson.challenge.description = '입력과 반환 계약에 맞게 구현하세요.';
  ${quizCopy ? `lesson.quiz.question = '핵심 개념을 확인해 보세요.';
  lesson.quiz.explanation = '예제와 핵심 개념을 다시 연결해 보세요.';
  if (lesson.id === 'c-functions') {
    lesson.quiz.options[0] = '호출 전에 인수와 반환 값의 자료형을 알린다';
  }` : ''}
}
`);
  for (const name of files) {
    const file = path.join(directory, 'content/c/' + name + '.md');
    let fenced = false;
    const text = (await readFile(file, 'utf8')).split('\n').map(line => {
      if (line.startsWith('```')) { fenced = !fenced; return line; }
      return fenced || line.startsWith('#') || !line.trim() ? line : '새로 다듬은 독자 해설입니다.';
    }).join('\n');
    await writeFile(file, text);
  }
}

test('editorial prose can be rewritten without changing headings, code or grading contracts', async t => {
  const directory = await fixture(t);
  await rewriteProse(directory, manuscripts);
  const result = verify(directory);
  assert.match(result.stdout, /tests [1-9]\d*/);
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test('second content batch accepts edited explanations without changing runnable contracts', async t => {
  const directory = await fixture(t);
  await rewriteProse(directory, secondManuscripts, true);
  const result = verify(directory, secondBatch);
  assert.match(result.stdout, /tests [1-9]\d*/);
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test('input and structure content accepts editorial changes without changing starter interfaces', async t => {
  const directory = await fixture(t);
  await rewriteProse(directory, thirdManuscripts);
  const result = verify(directory, thirdBatch);
  assert.match(result.stdout, /tests [1-9]\d*/);
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test('second content batch still rejects a missing function learning heading', async t => {
  const directory = await fixture(t);
  const file = path.join(directory, 'content/c/06-functions.md');
  await writeFile(file, (await readFile(file, 'utf8')).replace('## 학습 목표', '## 목표 변경'));
  const result = verify(directory, ['function-scope', 'functions']);
  assert.equal(result.error, undefined);
  assert.notEqual(result.status, 0);
  assert.match(result.stdout + result.stderr, /## 학습 목표/);
});

test('second content batch still rejects an uncompilable matrix example', {
  skip: spawnSync('gcc', ['--version']).status !== 0
}, async t => {
  const directory = await fixture(t);
  const file = path.join(directory, 'content/c/21-matrix-row-sums.md');
  const text = await readFile(file, 'utf8');
  const start = text.indexOf('## 완성 프로그램 A');
  assert.ok(start >= 0);
  const fence = String.fromCharCode(96).repeat(3) + 'c\n';
  await writeFile(file, text.slice(0, start) + text.slice(start).replace(fence, fence + '#error codeweave_matrix_fixture\n'));
  const catalog = path.join(directory, 'src/catalog.js');
  await writeFile(catalog, await readFile(catalog, 'utf8') + `
lessons.find(item => item.id === 'c-matrix-row-sums').sections
  .find(section => section.heading.includes('완성 프로그램 A')).code =
  '#error codeweave_matrix_fixture\\n' + lessons.find(item => item.id === 'c-matrix-row-sums').sections
    .find(section => section.heading.includes('완성 프로그램 A')).code;
`);
  const result = verify(directory, ['matrix-rows']);
  assert.equal(result.error, undefined);
  assert.notEqual(result.status, 0);
  assert.match(result.stdout + result.stderr, /error: (?:#error )?codeweave_matrix_fixture/);
});

test('required manuscript heading removal is still rejected', async t => {
  const directory = await fixture(t);
  for (const [name, selected] of [['01-hello', 'hello'], ['12-struct-student-score', 'struct']]) {
    const file = path.join(directory, 'content/c/' + name + '.md');
    await writeFile(file, (await readFile(file, 'utf8')).replace('## 학습 목표', '## 목표 변경'));
    const result = verify(directory, [selected]);
    assert.equal(result.error, undefined);
    assert.notEqual(result.status, 0);
    assert.match(result.stdout + result.stderr, /## 학습 목표/);
  }
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
