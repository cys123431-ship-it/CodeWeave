import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyCompilerDiagnostic } from '../src/compiler-feedback.js';

const cases = [
  {
    name: 'missing quoted header',
    output: 'main.c:1:10: fatal error: functions.h: No such file or directory',
    code: 'missing-header', phase: 'compile', title: '헤더 파일을 찾을 수 없음'
  },
  {
    name: 'declaration and definition mismatch',
    output: 'functions.c:2:6: error: conflicting types for ‘clamp’; have ‘long int(int, int, int)’',
    code: 'declaration-mismatch', phase: 'compile', title: '선언과 정의의 형식이 다름'
  },
  {
    name: 'undefined reference while linking',
    output: "main.c:(.text+0x19): undefined reference to `clamp'\ncollect2: error: ld returned 1 exit status",
    code: 'undefined-reference', phase: 'link', title: '함수나 변수의 정의를 연결하지 못함'
  },
  {
    name: 'duplicate main while linking',
    output: "harness.c:(.text+0x0): multiple definition of `main'; submission.c:(.text+0x0): first defined here",
    code: 'duplicate-definition', phase: 'link', title: '같은 이름이 두 번 정의됨'
  },
  {
    name: 'generic linker failure',
    output: 'collect2: error: ld returned 1 exit status',
    code: 'link-error', phase: 'link', title: '링크 단계 오류'
  },
  {
    name: 'generic compiler failure',
    output: 'submission.c:1:17: error: expected expression before ‘return’',
    code: 'compile-error', phase: 'compile', title: 'C 문법 또는 선언 오류'
  }
];

for (const sample of cases) {
  test('classifies ' + sample.name + ' without changing the raw diagnostic', () => {
    const feedback = classifyCompilerDiagnostic({ output: sample.output });
    assert.equal(feedback.code, sample.code);
    assert.equal(feedback.phase, sample.phase);
    assert.equal(feedback.title, sample.title);
    assert.ok(feedback.guidance.length >= 20);
    assert.equal(sample.output.includes(feedback.guidance), false);
  });
}

test('classifies compiler launch and timeout failures without inventing source diagnostics', () => {
  assert.equal(classifyCompilerDiagnostic({ error: Object.assign(new Error('spawn gcc ENOENT'), { code: 'ENOENT' }) }).code, 'compiler-unavailable');
  assert.equal(classifyCompilerDiagnostic({ error: Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' }) }).code, 'compiler-timeout');
  assert.equal(classifyCompilerDiagnostic({ output: '' }).code, 'compile-error');
});
