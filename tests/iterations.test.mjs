import test from 'node:test';
import assert from 'node:assert/strict';
import {recordIteration,passedExerciseIds,normalizeIterations,MAX_ITERATIONS} from '../src/iterations.js';
import {classifyCompilerDiagnostic} from '../src/compiler-feedback.js';
const at='2026-10-11T02:00:00.000Z';
test('failed then successful submissions are saved newest-first',()=>{
 let h=recordIteration({},'c-types','first',{ok:false,message:'wrong'},at);
 h=recordIteration(h,'c-types','second',{ok:true,message:'pass'},at);
 assert.equal(h['c-types'].length,2);
 assert.equal(h['c-types'][0].code,'second');
 assert.deepEqual(passedExerciseIds(h),['c-types']);
});
test('attempt history is bounded',()=>{
 let h={};for(let i=0;i<15;i++)h=recordIteration(h,'c-types',String(i),{ok:true},at);
 assert.equal(h['c-types'].length,MAX_ITERATIONS);
});
test('invalid backup data is filtered',()=>{
 const out=normalizeIterations({'c-types':[{at,code:'ok',passed:true}],'unknown':[{at,code:'x'}]},['c-types']);
 assert.deepEqual(Object.keys(out),['c-types']);
});
test('compiler feedback survives v1 history normalization while unknown feedback is dropped',()=>{
 const compilerFeedback=classifyCompilerDiagnostic({output:'submission.c:1:1: error: expected expression'});
 const saved=recordIteration({},'c-types','broken',{ok:false,message:'컴파일 실패',compileOutput:'raw error',compilerFeedback},at);
 const restored=normalizeIterations(JSON.parse(JSON.stringify(saved)),['c-types']);
 assert.deepEqual(restored['c-types'][0].compilerFeedback,compilerFeedback);
 const malformed=normalizeIterations({'c-types':[{...saved['c-types'][0],compilerFeedback:{code:'invented'}}]},['c-types']);
 assert.equal(malformed['c-types'][0].compilerFeedback,undefined);
 assert.equal(malformed['c-types'][0].compileOutput,'raw error');
});
