import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

test('workbench JavaScript modules pass Node syntax checks',()=>{
  for(const file of ['src/workbench.js','src/attempt-backup.js','src/backup.js']){
    const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
    assert.equal(r.status,0,file+' '+r.stderr);
  }
});
test('workbench HTML has the required local-only grading UI',()=>{
  const html=readFileSync('workbench.html','utf8');
  for(const id of ['lesson-select','code-input','grade-code','attempt-list','export-history','import-history']){
    assert.ok(html.includes('id="'+id+'"'),id);
  }
  assert.ok(html.includes('src/workbench.js'));
});
