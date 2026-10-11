import test from 'node:test';
import assert from 'node:assert/strict';
import { createAttemptBackup, parseAttemptBackup } from '../src/attempt-backup.js';

const knownIds = ['c-types','c-loops'];
const at = '2026-10-11T03:40:00.000Z';
test('round trip preserves known exercise attempts and drafts', () => {
  const backup = createAttemptBackup({drafts:{'c-types':'int main(void) {}'},iterations:{'c-types':[{at,code:'x',passed:true,message:'passed',tests:[]}]}},knownIds,at);
  const restored = parseAttemptBackup(backup,knownIds);
  assert.equal(restored.drafts['c-types'],'int main(void) {}');
  assert.equal(restored.iterations['c-types'][0].passed,true);
});
test('unknown exercises and invalid entries are filtered', () => {
  const backup = createAttemptBackup({drafts:{'unknown':'danger','c-types':'ok'},iterations:{'unknown':[{at,code:'bad'}],'c-types':[{at,code:'valid'},{at:'not-a-date',code:'invalid'}]}},knownIds,at);
  const restored = parseAttemptBackup(backup,knownIds);
  assert.deepEqual(Object.keys(restored.drafts),['c-types']);
  assert.equal(restored.iterations['c-types'].length,1);
  assert.equal(restored.iterations.unknown,undefined);
});
test('unsupported formats and versions are rejected', () => {
  assert.throws(()=>parseAttemptBackup({app:'CodeWeave',kind:'attempt-history',version:2},knownIds));
  assert.throws(()=>parseAttemptBackup({app:'Other',kind:'attempt-history',version:1},knownIds));
  assert.throws(()=>parseAttemptBackup([],knownIds));
});
test('oversized drafts are bounded to 25000 characters', () => {
  const backup=createAttemptBackup({drafts:{'c-types':'a'.repeat(30000)},iterations:{}},knownIds,at);
  assert.equal(backup.drafts['c-types'].length,25000);
});
