import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);

test('standing constraints record the CI-only browser decision once', async () => {
  const policy = await readFile(new URL('docs/AUTONOMOUS_DEVELOPMENT.md', root), 'utf8');
  const standing = policy.split('## 상시 제약\n')[1]?.split('\n## ')[0];
  assert.ok(standing?.includes('로컬 UI는 CI에서만 검증'), 'the fallback decision must be in standing constraints');
  assert.equal(standing.split('로컬 UI는 CI에서만 검증').length - 1, 1);
});

test('local browser guidance routes to the real CI job without routine installation commands', async () => {
  const guide = await readFile(new URL('docs/LOCAL_DEVELOPMENT.md', root), 'utf8');
  const section = guide.split('## 브라우저 검증 경로\n')[1]?.split('\n## ')[0];
  assert.ok(section, 'browser verification has an explicit operational path');
  assert.ok(section.includes('../.github/workflows/ci.yml'));
  assert.ok(section.includes('npm run test:browser'));
  assert.doesNotMatch(section, /^npm install|^npx .*install/gm, 'automated runs must not retry installation');
  await access(new URL('.github/workflows/ci.yml', root));
  const workflow = await readFile(new URL('.github/workflows/ci.yml', root), 'utf8');
  assert.match(workflow, /\n  browser:\n/);
  // The non-root QA job runs the same entry directly to avoid npm's extra UID
  // threads. Check the executable source, not one spelling of the shell command.
  const manifest = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
  const [command, entry, ...extra] = manifest.scripts['test:browser'].split(' ');
  assert.equal(command, 'node');
  assert.deepEqual(extra, []);
  await access(new URL(entry, root));
  assert.ok(workflow.includes('"$qa_root/' + entry + '"'), 'CI executes the package browser entry from its tracked snapshot');
  const checked = spawnSync(process.execPath, ['--check', fileURLToPath(new URL(entry, root))], { encoding: 'utf8' });
  assert.equal(checked.status, 0, checked.stderr);
});
