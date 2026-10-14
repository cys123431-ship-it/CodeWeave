import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const policyURL = new URL('../docs/AUTONOMOUS_DEVELOPMENT.md', import.meta.url);
const logURL = new URL('../docs/DEVELOPMENT_LOG.md', import.meta.url);

test('operating policy declares a recognized current stage on its first line', async () => {
  const policy = await readFile(policyURL, 'utf8');
  assert.match(policy.split('\n')[0], /^현재 단계: (0단계 진행 중|1단계 진행 중|2단계 진행 중|트랙 순환 개발)$/);
});

test('operating policy contains every ordered mandatory item from stage zero through process cleanup', async () => {
  const policy = await readFile(policyURL, 'utf8');
  const ids = [...policy.matchAll(/^### (\d-\d)\./gm)].map(match => match[1]);
  assert.deepEqual(ids, ['0-1', '0-2', '0-3', '1-1', '1-2', '1-3', '1-4', '1-5', '1-6', '2-1', '2-2', '2-3', '2-4', '2-5', '2-6']);
});

test('operating policy retains required standing constraints and evidence/report sections', async () => {
  const policy = await readFile(policyURL, 'utf8');
  for (const heading of ['## 실행 시작', '## 상시 규칙', '## 상시 제약', '## 보고 형식', '## 대체한 기존 규칙']) {
    assert.ok(policy.split('\n').includes(heading), heading);
  }
});

test('latest handoff starts with the explicitly acknowledged policy stage', async () => {
  const policy = await readFile(policyURL, 'utf8');
  const current = policy.split('\n')[0].slice('현재 단계: '.length);
  const log = await readFile(logURL, 'utf8');
  assert.equal(log.split('\n')[0], 'AUTONOMOUS_DEVELOPMENT.md 현재 단계: ' + current + ' 확인함');
});
