import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const liveURL = new URL('../docs/DEVELOPMENT_LOG.md', import.meta.url);
const archiveURL = new URL('../docs/log/2026-10.md', import.meta.url);
const manifestURL = new URL('../docs/log/2026-10.manifest.json', import.meta.url);
const fields = ['시작/결과 SHA', '목표', '변경 파일 수', '테스트 결과',
  'CI URL과 결과', '발견한 문제', '단계별 완료율', '다음 작업'];

function entries(text) {
  return text.trim().split(/\n\s*---\s*\n/).map(block => block.trim());
}

test('October archive preserves the original handoff bytes and provenance', async () => {
  const manifest = JSON.parse(await readFile(manifestURL, 'utf8'));
  assert.equal(manifest.sourceCommit, 'fb00f7d9b347032da99e7ad5bdeab8ec7547ea17');
  assert.equal(manifest.sourceBlob, '23c658fb8565ed0bce72820b6e4c60a060f1cdb4');
  assert.equal(manifest.sourceBytes, 250951);
  const archive = await readFile(archiveURL);
  assert.ok(archive.length >= manifest.sourceBytes, 'future archival appends must not replace the original prefix');
  const original = archive.subarray(0, manifest.sourceBytes);
  const blob = createHash('sha1').update('blob ' + original.length + '\0').update(original).digest('hex');
  assert.equal(blob, manifest.sourceBlob, 'every original byte, including old logs and disclaimers, is retained');
  assert.equal(createHash('sha256').update(original).digest('hex'), manifest.sourceSHA256);
});

test('active handoff contains exactly five newest dated records', async () => {
  const text = await readFile(liveURL, 'utf8');
  const records = entries(text);
  assert.equal(records.length, 5);
  const dates = records.map(record => {
    const heading = record.split('\n')[1];
    assert.match(heading, /^## \d{4}-\d{2}-\d{2} \d{2}:\d{2}/);
    return heading.slice(3, 19);
  });
  assert.deepEqual(dates, [...dates].sort().reverse(), 'newest records are read first');
});

test('every active handoff record fits the explicit fifteen-line budget', async () => {
  const records = entries(await readFile(liveURL, 'utf8'));
  for (const record of records) {
    const lines = record.split('\n');
    assert.match(lines[0], /^AUTONOMOUS_DEVELOPMENT\.md 현재 단계: .+ 확인함$/);
    assert.ok(lines.length <= 15, lines[1] + ': ' + lines.length + ' lines');
  }
});

test('active handoff uses the fixed evidence fields without unclassified prose', async () => {
  const records = entries(await readFile(liveURL, 'utf8'));
  for (const record of records) {
    const labels = record.split('\n').slice(2).map(line => {
      const match = line.match(/^- ([^:]+):\s*\S/);
      assert.ok(match, 'each handoff line is a named evidence field: ' + line);
      return match[1];
    });
    assert.equal(new Set(labels).size, labels.length, 'fields are not repeated');
    for (const field of fields) assert.ok(labels.includes(field), field);
    assert.ok(labels.every(label => fields.includes(label) || label === '보안 영향'));
  }
});
