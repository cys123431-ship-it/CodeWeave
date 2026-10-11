import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MULTI_FILE_DRAFT_PREFIX,
  parseMultiFileSubmission,
  serializeMultiFileSubmission,
  formatSubmissionForDisplay
} from '../src/multi-file.js';
import { createFullBackup, parseCodeWeaveBackup } from '../src/backup.js';
import { figureFor } from '../src/figures.js';

const required = ['main.c', 'functions.c', 'functions.h'];
const files = [
  { name: 'main.c', content: '#include "functions.h"\nint main(void){return clamp(4,0,3)!=3;}' },
  { name: 'functions.c', content: '#include "functions.h"\nint clamp(int v,int lo,int hi){return v<lo?lo:v>hi?hi:v;}' },
  { name: 'functions.h', content: '#ifndef FUNCTIONS_H\n#define FUNCTIONS_H\nint clamp(int,int,int);\n#endif' }
];

test('multi-file submission round trips as one bounded legacy draft string', () => {
  const encoded = serializeMultiFileSubmission(files, { requiredNames: required });
  assert.match(encoded, new RegExp('^' + MULTI_FILE_DRAFT_PREFIX));
  assert.deepEqual(parseMultiFileSubmission(encoded, { requiredNames: required }), files);
  const backup = createFullBackup({ progress: {}, drafts: { 'c-multi-file': encoded }, iterations: {} }, ['c-multi-file']);
  const restored = parseCodeWeaveBackup(backup, { knownIds: ['c-multi-file'] });
  assert.equal(restored.drafts['c-multi-file'], encoded);
  assert.match(formatSubmissionForDisplay(encoded), /===== main\.c =====[\s\S]*===== functions\.h =====/);
});

test('multi-file contract rejects missing, duplicate, extra and path-like names', () => {
  const raw = entries => MULTI_FILE_DRAFT_PREFIX + JSON.stringify({ version: 1, files: entries });
  assert.throws(() => parseMultiFileSubmission(raw(files.slice(0, 2)), { requiredNames: required }), /누락/);
  assert.throws(() => parseMultiFileSubmission(raw([...files, files[0]]), { requiredNames: required }), /중복/);
  assert.throws(() => parseMultiFileSubmission(raw([...files, { name: 'extra.c', content: '' }]), { requiredNames: required }), /허용되지 않은 파일/);
  assert.throws(() => parseMultiFileSubmission(raw(files.map((file, index) => index ? file : { ...file, name: '../main.c' }))), /파일명/);
});

test('multi-file contract rejects malformed versions and file size limits', () => {
  assert.throws(() => parseMultiFileSubmission('plain C source', { requiredNames: required }), /다중 파일 제출/);
  assert.throws(() => parseMultiFileSubmission(MULTI_FILE_DRAFT_PREFIX + '{', { requiredNames: required }), /JSON/);
  assert.throws(() => parseMultiFileSubmission(MULTI_FILE_DRAFT_PREFIX + JSON.stringify({ version: 2, files })), /버전/);
  assert.throws(() => serializeMultiFileSubmission(files.map((file, index) => index === 0 ? { ...file, content: 'x'.repeat(10_001) } : file), { requiredNames: required }), /파일 크기/);
  assert.throws(() => serializeMultiFileSubmission(files.map(file => ({ ...file, content: 'x'.repeat(9_000) })), { requiredNames: required }), /전체 크기/);
});

test('multi-file lesson diagram explains compilation and linking without animation', () => {
  const svg = figureFor('multi-file');
  assert.match(svg, /role="img"/);
  for (const label of ['main.c', 'functions.h', 'functions.c', 'main.o', 'functions.o', '실행 프로그램', '링크']) {
    assert.match(svg, new RegExp(label.replace('.', '\\.')));
  }
  assert.doesNotMatch(svg, /<animate|<script/);
});
