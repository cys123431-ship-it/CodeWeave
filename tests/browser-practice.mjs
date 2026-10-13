// Optional integration suite: Node.js, GCC, Playwright and Chromium required.
// Run with: npm run test:browser. No browser dependency enters the shipped app.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { serializeMultiFileSubmission } from '../src/multi-file.js';

const require = createRequire(import.meta.url);
let playwright, expect;
try { playwright = require('playwright'); expect = require('playwright/test').expect; }
catch {
  if (!process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES) throw Error('Playwright is required for this optional suite.');
  playwright = require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, 'playwright'));
  expect = require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, 'playwright/test')).expect;
}
const { chromium } = playwright;
const root = fileURLToPath(new URL('../', import.meta.url));
const port = process.env.CODEWEAVE_TEST_PORT || '4187';
const base = 'http://127.0.0.1:' + port;
const server = spawn(process.execPath, ['dev-server.mjs'], { cwd: root, env: { ...process.env, PORT: port }, stdio: ['ignore', 'pipe', 'pipe'] });
let output = '';
server.stdout.on('data', chunk => { output += chunk; });
server.stderr.on('data', chunk => { output += chunk; });
let browser, context, page;
const errors = [];
const qaDir = process.env.CODEWEAVE_QA_DIR;
const correct = '#include <stdio.h>\nint main(void){int a,b;if(scanf("%d %d",&a,&b)!=2)return 1;printf("%d\\n",a+b);return 0;}';
const failed = '#include <stdio.h>\nint main(void){puts("0");return 0;}';
const functionOnly = 'int clamp(int value,int low,int high){if(value<low)return low;if(value>high)return high;return value;}';
const arrayMaxFunction = '#include <stddef.h>\nint find_max(const int values[],size_t length,int *out_max){if(!values||length==0||!out_max)return 0;int maximum=values[0];for(size_t i=1;i<length;i++)if(values[i]>maximum)maximum=values[i];*out_max=maximum;return 1;}';
const arrayMaxWrong = '#include <stddef.h>\nint find_max(const int values[],size_t length,int *out_max){if(!values||length==0||!out_max)return 0;int maximum=0;for(size_t i=0;i<length;i++)if(values[i]>maximum)maximum=values[i];*out_max=maximum;return 1;}';
const stringCountFunction = '#include <stddef.h>\nint count_char(const char *text,char target,size_t *out_count){if(!text||!out_count)return 0;size_t count=0;for(size_t i=0;text[i]!=\'\\0\';++i)if(text[i]==target)++count;*out_count=count;return 1;}';
const stringCountWrong = '#include <stddef.h>\nint count_char(const char *text,char target,size_t *out_count){if(!text||!out_count)return 0;size_t count=0;do{if(*text==target)++count;}while(*text++!=\'\\0\');*out_count=count;return 1;}';
const boundedStringFunction = '#include <stddef.h>\nint bounded_length(const char *buffer,size_t capacity,size_t *out_length){if(!buffer||capacity==0||!out_length)return 0;for(size_t i=0;i<capacity;++i)if(buffer[i]==\'\\0\'){*out_length=i;return 1;}return 0;}';
const boundedStringWrong = '#include <stddef.h>\nint bounded_length(const char *buffer,size_t capacity,size_t *out_length){if(!buffer||capacity==0||!out_length)return 0;size_t i=0;while(i<capacity&&buffer[i]!=\'\\0\')++i;*out_length=i;return 1;}';
const fgetsLogicalLine = '#include <stddef.h>\n#include <stdio.h>\nint main(void){char chunk[8];size_t total=0;int saw_input=0;for(;;){if(fgets(chunk,sizeof chunk,stdin)==NULL){if(ferror(stdin))return 1;if(!saw_input){puts("NO INPUT");return 0;}break;}saw_input=1;size_t i=0;while(chunk[i]!=\'\\0\'&&chunk[i]!=\'\\n\')++i;total+=i;if(chunk[i]==\'\\n\')break;}printf("%zu\\n",total);return 0;}';
const fgetsLogicalLineWrong = '#include <stdio.h>\n#include <string.h>\nint main(void){char chunk[8];if(!fgets(chunk,sizeof chunk,stdin)){puts("NO INPUT");return 0;}printf("%zu\\n",strcspn(chunk,"\\n"));return 0;}';
const strtolIntegerInput = '#include <ctype.h>\n#include <errno.h>\n#include <stdio.h>\n#include <stdlib.h>\nint main(void){char line[64];if(fgets(line,sizeof line,stdin)==NULL){if(ferror(stdin))return 1;puts("NO INPUT");return 0;}size_t i=0;while(line[i]!=\'\\0\'&&line[i]!=\'\\n\')++i;if(line[i]==\'\\0\'){int ch=getchar();if(ch!=EOF&&ch!=\'\\n\'){do{ch=getchar();}while(ch!=EOF&&ch!=\'\\n\');if(ch==EOF&&ferror(stdin))return 1;puts("TOO LONG");return 0;}if(ch==EOF&&ferror(stdin))return 1;}errno=0;char *end;long value=strtol(line,&end,10);if(end==line){puts("INVALID");return 0;}if(errno==ERANGE){puts("RANGE");return 0;}while(*end!=\'\\0\'&&isspace((unsigned char)*end))++end;if(*end!=\'\\0\'){puts("INVALID");return 0;}printf("%ld\\n",value);return 0;}';
const strtolIntegerWrong = '#include <stdio.h>\n#include <stdlib.h>\nint main(void){char line[64];if(!fgets(line,sizeof line,stdin)){puts("NO INPUT");return 0;}printf("%d\\n",atoi(line));return 0;}';
const structStudentScore = 'struct Student{int id;int score;};\nint update_score(struct Student *student,int delta){if(!student||student->score<0||student->score>100)return 0;if(delta < -student->score || delta > 100-student->score)return 0;student->score+=delta;return 1;}';
const structStudentWrong = 'struct Student{int id;int score;};\nint update_score(struct Student *student,int delta){if(!student)return 0;student->score+=delta;if(student->score<0||student->score>100)return 0;return 1;}';
const structArraySearch = '#include <stddef.h>\nstruct Student{int id;int score;};\nint find_student_index(const struct Student students[],size_t count,int target_id,size_t *out_index){if(!students||count==0||!out_index)return 0;for(size_t i=0;i<count;++i)if(students[i].id==target_id){*out_index=i;return 1;}return 0;}';
const structArraySearchWrong = '#include <stddef.h>\nstruct Student{int id;int score;};\nint find_student_index(const struct Student students[],size_t count,int target_id,size_t *out_index){if(!students||count==0||!out_index)return 0;int found=0;for(size_t i=0;i<count;++i)if(students[i].id==target_id){*out_index=i;found=1;}return found;}';
const structArraySort = '#include <stddef.h>\nstruct Student{int id;int score;};\nint stable_sort_students_by_id(struct Student students[],size_t count){if(count==0)return 1;if(!students)return 0;for(size_t i=1;i<count;++i){struct Student key=students[i];size_t j=i;while(j>0&&students[j-1].id>key.id){students[j]=students[j-1];--j;}students[j]=key;}return 1;}';
const structArraySortWrong = '#include <stddef.h>\nstruct Student{int id;int score;};\nint stable_sort_students_by_id(struct Student students[],size_t count){if(count==0)return 1;if(!students)return 0;for(size_t i=0;i<count;i++)for(size_t j=i+1;j<count;j++)if(students[j].id<students[i].id){struct Student t=students[i];students[i]=students[j];students[j]=t;}return 1;}';
const structArrayBinarySearch = '#include <stddef.h>\nstruct Student{int id;int score;};\nint find_first_student_by_id(const struct Student a[],size_t n,int id,size_t *out){if(n==0||!a||!out)return 0;size_t l=0,r=n;while(l<r){size_t m=l+(r-l)/2;if(a[m].id<id)l=m+1;else r=m;}if(l<n&&a[l].id==id){*out=l;return 1;}return 0;}';
const structArrayBinarySearchWrong = '#include <stddef.h>\nstruct Student{int id;int score;};\nint find_first_student_by_id(const struct Student a[],size_t n,int id,size_t *out){if(!a||!out||n==0)return 0;size_t l=0,r=n-1;while(l<=r){size_t m=l+(r-l)/2;if(a[m].id==id){*out=m;return 1;}if(a[m].id<id)l=m+1;else{if(m==0)break;r=m-1;}}return 0;}';
const multiFileSolution = [
  {name:'main.c',content:'#include <stdio.h>\n#include "functions.h"\nint main(void){int v,l,h;if(scanf("%d%d%d",&v,&l,&h)!=3)return 1;printf("%d\\n",clamp(v,l,h));return 0;}'},
  {name:'functions.c',content:'#include "functions.h"\nint clamp(int v,int l,int h){if(v<l)return l;if(v>h)return h;return v;}'},
  {name:'functions.h',content:'#ifndef FUNCTIONS_H\n#define FUNCTIONS_H\nint clamp(int value,int low,int high);\n#endif'}
];
const multiFileWrong = multiFileSolution.map(file => file.name === 'functions.c'
  ? { ...file, content: '#include "functions.h"\nint clamp(int v,int l,int h){(void)v;(void)l;return h;}' }
  : file);
const history = page => page.evaluate(() => JSON.parse(localStorage.getItem('codeweave.iterations.v1')));
const ready = async page => { await expect(page.locator('#grade-code')).toBeEnabled(); };
async function submit(page, code) {
  await page.locator('#code-input').fill(code);
  const response = page.waitForResponse(r => r.url().endsWith('/api/grade'));
  await page.locator('#grade-code').click();
  await response;
  await ready(page);
}
async function fillMultiFile(page, files) {
  for (const file of files) await page.locator('[data-code-file="' + file.name + '"]').fill(file.content);
}
async function expectMultiFile(page, files) {
  for (const file of files) await expect(page.locator('[data-code-file="' + file.name + '"]')).toHaveValue(file.content);
}

try {
  for (let i = 0; i < 100 && !output.includes('CodeWeave local learning app:'); i++) {
    if (server.exitCode !== null) throw Error(output);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.match(output, /CodeWeave local learning app:/);
  // Compile our own reference solutions through the actual local API.
  const solutions = {
    'c-hello': '#include <stdio.h>\nint main(void){puts("Hello, CodeWeave!");return 0;}',
    'c-types': correct,
    'c-loops': '#include <stdio.h>\nint main(void){int n,s=0;scanf("%d",&n);for(int i=1;i<=n;i++)s+=i;printf("%d\\n",s);return 0;}',
    'c-array': '#include <stdio.h>\nint main(void){int n,x,m;scanf("%d%d",&n,&m);for(int i=1;i<n;i++){scanf("%d",&x);if(x>m)m=x;}printf("%d\\n",m);return 0;}',
    'c-pointer': '#include <stdio.h>\nvoid add_one(int *p){++*p;}\nint main(void){int n;scanf("%d",&n);add_one(&n);printf("%d\\n",n);return 0;}',
    'c-functions': '#include <stdio.h>\nint clamp(int value,int low,int high){if(value<low)return low;if(value>high)return high;return value;}\nint main(void){int value,low,high;scanf("%d%d%d",&value,&low,&high);printf("%d\\n",clamp(value,low,high));return 0;}',
    'c-clamp-function': functionOnly,
    'c-array-max-function': arrayMaxFunction,
    'c-string-count-function': stringCountFunction,
    'c-bounded-string-length': boundedStringFunction,
    'c-fgets-logical-line': fgetsLogicalLine,
    'c-strtol-integer-input': strtolIntegerInput,
    'c-struct-student-score': structStudentScore,
    'c-struct-array-search': structArraySearch,
    'c-struct-array-sort': structArraySort,
    'c-struct-array-binary-search': structArrayBinarySearch,
    'c-multi-file': serializeMultiFileSubmission(multiFileSolution, { requiredNames: ['main.c','functions.c','functions.h'] })
  };
  for (const [exerciseId, code] of Object.entries(solutions)) {
    const response = await fetch(base + '/api/grade', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ exerciseId, code }) });
    const result = await response.json();
    assert.equal(result.ok, true, exerciseId + ': ' + JSON.stringify(result));
  }
  console.log('PASS: all seventeen C exercises compile and pass their real GCC tests');

  browser = await chromium.launch({ headless: true });
  context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  context.on('page', p => p.on('pageerror', e => errors.push(e.message)));
  page = await context.newPage();
  await page.goto(base + '/#lesson:c-functions');
  await expect(page.locator('.detail-head h1')).toHaveText('함수 설계: 선언·호출·값 전달');
  await expect(page.locator('.figure-box svg')).toContainText('clamp');
  await expect(page.locator('#code-input')).toHaveValue(/int clamp\(int value, int low, int high\)/);
  await expect(page.locator('.practice-zone')).toContainText('Practice Exercise');
  await expect(page.locator('.practice-zone')).toContainText('선수 단원:');
  console.log('PASS: function lesson, exercise metadata, static call figure and starter code render together');
  await page.goto(base + '/#lesson:c-clamp-function');
  await expect(page.locator('.detail-head h1')).toHaveText('함수 구현 실습: 테스트 하네스와 계약');
  await expect(page.locator('#code-input')).not.toHaveValue(/main\s*\(/);
  await expect(page.locator('.practice-zone')).toContainText('함수 직접 호출형');
  await submit(page, functionOnly + '\nint main(void){return 0;}');
  await expect(page.locator('.terminal[role="status"]')).toContainText('링크 단계 · 같은 이름이 두 번 정의됨');
  await expect(page.locator('.terminal[role="status"]')).toContainText('multiple definition');
  await submit(page, functionOnly);
  await expect(page.locator('.terminal[role="status"]')).toContainText('모든 테스트 통과');
  console.log('PASS: function-only lesson explains a linker failure and then passes the direct-call harness');
  await page.goto(base + '/#lesson:c-array-max-function');
  await expect(page.locator('.detail-head h1')).toHaveText('배열 함수 실습: 최댓값과 출력 포인터');
  await expect(page.locator('.figure-box svg')).toContainText('out_max');
  await expect(page.locator('#code-input')).not.toHaveValue(/main\s*\(/);
  await expect(page.locator('.practice-zone')).toContainText('함수 직접 호출형');
  await submit(page, arrayMaxWrong);
  await expect(page.locator('.terminal[role="status"]')).toContainText('채점 미통과');
  await submit(page, arrayMaxFunction);
  await expect(page.locator('.terminal[role="status"]')).toContainText('모든 테스트 통과');
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  await page.locator('#mark-theory').click();
  await page.locator('[data-quiz="c-array-max-function"][data-choice="0"]').click();
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  console.log('PASS: array function failure, correction, iterations and mastery stay in one lesson flow');
  await page.goto(base + '/#lesson:c-string-count-function');
  await expect(page.locator('.detail-head h1')).toHaveText('문자열 함수 실습: 널 종료와 문자 세기');
  await expect(page.locator('.figure-box svg')).toContainText('여기서 중지');
  await expect(page.locator('#code-input')).not.toHaveValue(/main\s*\(/);
  await expect(page.locator('.practice-zone')).toContainText('함수 직접 호출형');
  await submit(page, stringCountWrong);
  await expect(page.locator('.terminal[role="status"]')).toContainText('채점 미통과');
  await submit(page, stringCountFunction);
  await expect(page.locator('.terminal[role="status"]')).toContainText('모든 테스트 통과');
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  await page.locator('#mark-theory').click();
  await page.locator('[data-quiz="c-string-count-function"][data-choice="0"]').click();
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  console.log('PASS: string terminator boundary, correction, iterations and mastery stay in one lesson flow');
  await page.goto(base + '/#lesson:c-bounded-string-length');
  await expect(page.locator('.detail-head h1')).toHaveText('경계 있는 문자열: 용량과 종료 문자');
  await expect(page.locator('.figure-box svg')).toContainText('[0, capacity)');
  await expect(page.locator('#code-input')).not.toHaveValue(/main\s*\(/);
  await expect(page.locator('.practice-zone')).toContainText('함수 직접 호출형');
  await submit(page, boundedStringWrong);
  await expect(page.locator('.terminal[role="status"]')).toContainText('채점 미통과');
  await submit(page, boundedStringFunction);
  await expect(page.locator('.terminal[role="status"]')).toContainText('모든 테스트 통과');
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  await page.locator('#mark-theory').click();
  await page.locator('[data-quiz="c-bounded-string-length"][data-choice="0"]').click();
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  console.log('PASS: bounded string capacity failure, correction, iterations and mastery stay in one lesson flow');
  await page.goto(base + '/#lesson:c-fgets-logical-line');
  await expect(page.locator('.detail-head h1')).toHaveText('fgets로 논리적 한 줄 읽기');
  await expect(page.locator('.figure-box svg')).toContainText('7 + 4');
  await expect(page.locator('#code-input')).toHaveValue(/char chunk\[8\]/);
  await expect(page.locator('.practice-zone')).toContainText('입출력형');
  await submit(page, fgetsLogicalLineWrong);
  await expect(page.locator('.terminal[role="status"]')).toContainText('채점 미통과');
  await submit(page, fgetsLogicalLine);
  await expect(page.locator('.terminal[role="status"]')).toContainText('모든 테스트 통과');
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  await page.locator('#mark-theory').click();
  await page.locator('[data-quiz="c-fgets-logical-line"][data-choice="0"]').click();
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  console.log('PASS: fgets chunk failure, correction, iterations and mastery stay in one lesson flow');
  await page.goto(base + '/#lesson:c-strtol-integer-input');
  await expect(page.locator('.detail-head h1')).toHaveText('fgets와 strtol로 정수 검증하기');
  await expect(page.locator('.figure-box svg')).toContainText('endptr');
  await expect(page.locator('#code-input')).toHaveValue(/char line\[64\]/);
  await expect(page.locator('.practice-zone')).toContainText('입출력형');
  await submit(page, strtolIntegerWrong);
  await expect(page.locator('.terminal[role="status"]')).toContainText('채점 미통과');
  await submit(page, strtolIntegerInput);
  await expect(page.locator('.terminal[role="status"]')).toContainText('모든 테스트 통과');
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  await page.locator('#mark-theory').click();
  await page.locator('[data-quiz="c-strtol-integer-input"][data-choice="0"]').click();
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  console.log('PASS: strtol syntax, range and trailing-input validation stay in one lesson flow');
  await page.goto(base + '/#lesson:c-struct-student-score');
  await expect(page.locator('.detail-head h1')).toHaveText('구조체와 포인터로 학생 점수 갱신하기');
  await expect(page.locator('.figure-box svg')).toContainText('id 유지');
  await expect(page.locator('#code-input')).toHaveValue(/struct Student/);
  await expect(page.locator('.practice-zone')).toContainText('함수 직접 호출형');
  await submit(page, structStudentWrong);
  await expect(page.locator('.terminal[role="status"]')).toContainText('채점 미통과');
  await submit(page, structStudentScore);
  await expect(page.locator('.terminal[role="status"]')).toContainText('모든 테스트 통과');
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  await page.locator('#mark-theory').click();
  await page.locator('[data-quiz="c-struct-student-score"][data-choice="0"]').click();
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  console.log('PASS: structure pointer validation, preserved failure, iterations and mastery stay in one lesson flow');
  await page.goto(base + '/#lesson:c-struct-array-search');
  await expect(page.locator('.detail-head h1')).toHaveText('구조체 배열에서 학번 찾기');
  await expect(page.locator('.figure-box svg')).toContainText('첫 일치');
  await expect(page.locator('#code-input')).toHaveValue(/find_student_index/);
  await expect(page.locator('.practice-zone')).toContainText('함수 직접 호출형');
  await submit(page, structArraySearchWrong);
  await expect(page.locator('.terminal[role="status"]')).toContainText('채점 미통과');
  await submit(page, structArraySearch);
  await expect(page.locator('.terminal[role="status"]')).toContainText('모든 테스트 통과');
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  await page.locator('#mark-theory').click();
  await page.locator('[data-quiz="c-struct-array-search"][data-choice="0"]').click();
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  console.log('PASS: structure array first-match correction, iterations and mastery stay in one lesson flow');
  await page.goto(base + '/#lesson:c-struct-array-sort');
  await expect(page.locator('.detail-head h1')).toHaveText('구조체 배열을 학번순으로 안정 정렬하기');
  await expect(page.locator('.figure-box svg')).toContainText('엄격한 >');
  await expect(page.locator('#code-input')).toHaveValue(/stable_sort_students_by_id/);
  await expect(page.locator('.practice-zone')).toContainText('함수 직접 호출형');
  await submit(page, structArraySortWrong);
  await expect(page.locator('.terminal[role="status"]')).toContainText('채점 미통과');
  await submit(page, structArraySort);
  await expect(page.locator('.terminal[role="status"]')).toContainText('모든 테스트 통과');
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  await page.locator('#mark-theory').click();
  await page.locator('[data-quiz="c-struct-array-sort"][data-choice="0"]').click();
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  console.log('PASS: stable structure sort correction, iterations and mastery stay in one lesson flow');
  await page.goto(base + '/#lesson:c-struct-array-binary-search');
  await expect(page.locator('.detail-head h1')).toHaveText('정렬된 구조체 배열에서 첫 학번 이진 탐색');
  await expect(page.locator('.figure-box svg')).toContainText('첫 위치 1');
  await expect(page.locator('#code-input')).toHaveValue(/find_first_student_by_id/);
  await expect(page.locator('.practice-zone')).toContainText('함수 직접 호출형');
  await submit(page, structArrayBinarySearchWrong);
  await expect(page.locator('.terminal[role="status"]')).toContainText('채점 미통과');
  await submit(page, structArrayBinarySearch);
  await expect(page.locator('.terminal[role="status"]')).toContainText('모든 테스트 통과');
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  await page.locator('#mark-theory').click();
  await page.locator('[data-quiz="c-struct-array-binary-search"][data-choice="0"]').click();
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  console.log('PASS: first-position binary search correction, iterations and mastery stay in one lesson flow');
  await page.goto(base + '/#lesson:c-multi-file');
  await expect(page.locator('.detail-head h1')).toHaveText('분할 컴파일: 헤더와 여러 소스 파일');
  await expect(page.locator('.figure-box svg')).toContainText('functions.h');
  await expect(page.locator('[data-code-file]')).toHaveCount(3);
  await expect(page.locator('.practice-zone')).toContainText('다중 파일형');
  await fillMultiFile(page, multiFileSolution);
  const multiResponse = page.waitForResponse(r => r.url().endsWith('/api/grade'));
  await page.locator('#grade-code').click(); await multiResponse; await ready(page);
  await expect(page.locator('.terminal[role="status"]')).toContainText('모든 테스트 통과');
  assert.match(await page.evaluate(() => JSON.parse(localStorage.getItem('codeweave.drafts.v1'))['c-multi-file']), /^CODEWEAVE_MULTI_FILE_V1/);
  await fillMultiFile(page, multiFileWrong);
  const failedMultiResponse = page.waitForResponse(r => r.url().endsWith('/api/grade'));
  await page.locator('#grade-code').click(); await failedMultiResponse; await ready(page);
  await expect(page.locator('.terminal[role="status"]')).toContainText('채점 미통과');
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  await expect(page.locator('#attempt-history-container .attempt-status.failed')).toHaveCount(1);
  page.once('dialog', dialog => dialog.accept());
  await page.locator('#attempt-history-container .attempt-list li').last().locator('button').click();
  await expectMultiFile(page, multiFileSolution);
  await expect(page.locator('.terminal[role="status"]')).toContainText('이전 제출 코드를 복원했습니다');

  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'multi-file lesson mobile overflow');
  for (const file of multiFileSolution) {
    const box = await page.locator('[data-code-file="' + file.name + '"]').boundingBox();
    assert.ok(box && box.x >= 0 && box.x + box.width <= 390, file.name + ' must fit the mobile viewport');
  }
  if (qaDir) {
    await mkdir(qaDir, { recursive: true });
    await page.locator('.multi-file-editors').screenshot({ path: path.join(qaDir, 'lesson-multi-file-mobile.png') });
  }

  const multiBench = await context.newPage();
  await multiBench.setViewportSize({ width: 390, height: 844 });
  await multiBench.goto(base + '/workbench.html');
  await multiBench.locator('#lesson-select').selectOption('c-multi-file');
  await expectMultiFile(multiBench, multiFileSolution);
  await expect(multiBench.locator('#attempt-list li')).toHaveCount(2);
  assert.equal(await multiBench.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'multi-file workbench mobile overflow');
  for (const file of multiFileSolution) {
    const box = await multiBench.locator('[data-code-file="' + file.name + '"]').boundingBox();
    assert.ok(box && box.x >= 0 && box.x + box.width <= 390, 'workbench ' + file.name + ' must fit the mobile viewport');
  }
  if (qaDir) await multiBench.locator('#multi-file-editors').screenshot({ path: path.join(qaDir, 'workbench-multi-file-mobile.png') });

  const multiDownloadPromise = multiBench.waitForEvent('download');
  await multiBench.locator('#export-history').click();
  const multiDownload = await multiDownloadPromise;
  const multiChunks = [];
  for await (const chunk of await multiDownload.createReadStream()) multiChunks.push(chunk);
  const multiBackup = Buffer.concat(multiChunks);
  const multiBackupData = JSON.parse(multiBackup);
  assert.equal(multiBackupData.kind, 'full-backup');
  assert.equal(multiBackupData.iterations['c-multi-file'].length, 2);

  await fillMultiFile(multiBench, multiFileWrong);
  await expect.poll(() => multiBench.evaluate(() => JSON.parse(localStorage.getItem('codeweave.drafts.v1'))['c-multi-file']))
    .not.toBe(multiBackupData.drafts['c-multi-file']);
  multiBench.on('dialog', dialog => dialog.accept());
  await multiBench.locator('#import-file').setInputFiles({ name: 'multi-file-backup.json', mimeType: 'application/json', buffer: multiBackup });
  await expect(multiBench.locator('#draft-status')).toHaveText('통합 백업을 복원했습니다.');
  await expectMultiFile(multiBench, multiFileSolution);
  await expect(multiBench.locator('#attempt-list li')).toHaveCount(2);
  await page.reload();
  await expectMultiFile(page, multiFileSolution);
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await multiBench.close();
  await page.setViewportSize({ width: 1366, height: 900 });
  console.log('PASS: multi-file mobile editors, attempt restore and unified backup round trip preserve all three files');
  await page.evaluate(({ failed }) => {
    localStorage.clear();
    localStorage.setItem('codeweave.drafts.v1', JSON.stringify({ 'c-types': failed, 'rust-mut': 'keep rust draft' }));
    localStorage.setItem('codeweave.iterations.v1', JSON.stringify({ 'c-types': [{
      at: '2026-10-11T02:30:00.000Z', code: failed, passed: false,
      message: '<img src=x onerror=alert(1)>', tests: [{ passed: false, detail: 'legacy failure' }]
    }] }));
  }, { failed });
  await page.goto(base + '/#lesson:c-types');
  // Hash navigation keeps the original module state; reload after seeding v1 data.
  await page.reload();
  await expect(page.locator('#code-input')).toHaveValue(failed);
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(1);
  await expect(page.locator('#attempt-history-container .attempt-list img')).toHaveCount(0);
  await expect(page.locator('#attempt-history-container .attempt-status.failed')).toHaveCount(1);
  console.log('PASS: legacy drafts/history render safely in the lesson');

  const bench = await context.newPage();
  await bench.goto(base + '/workbench.html');
  await expect(bench.locator('#lesson-select option[value="c-clamp-function"]')).toHaveCount(1);
  await expect(bench.locator('#lesson-select option[value="c-array-max-function"]')).toHaveCount(1);
  await expect(bench.locator('#lesson-select option[value="c-string-count-function"]')).toHaveCount(1);
  await expect(bench.locator('#lesson-select option[value="c-bounded-string-length"]')).toHaveCount(1);
  await expect(bench.locator('#lesson-select option[value="c-fgets-logical-line"]')).toHaveCount(1);
  await expect(bench.locator('#lesson-select option[value="c-strtol-integer-input"]')).toHaveCount(1);
  await expect(bench.locator('#lesson-select option[value="c-struct-student-score"]')).toHaveCount(1);
  await expect(bench.locator('#lesson-select option[value="c-struct-array-search"]')).toHaveCount(1);
  await expect(bench.locator('#lesson-select option[value="c-struct-array-sort"]')).toHaveCount(1);
  await expect(bench.locator('#lesson-select option[value="c-struct-array-binary-search"]')).toHaveCount(1);
  await expect(bench.locator('#lesson-select option[value="c-multi-file"]')).toHaveCount(1);
  await bench.locator('#lesson-select').selectOption('c-types');
  await submit(page, failed);
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  await submit(page, correct);
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(3);
  assert.ok(await page.locator('#attempt-history-container .attempt-status.passed').count() > 0);
  assert.deepEqual((await history(page))['c-types'].map(x => x.passed), [true, false, false]);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('codeweave.progress.v1') || '{"completed":[]}').completed.includes('c-types')), false);
  await page.locator('#mark-theory').click();
  await page.locator('[data-quiz="c-types"][data-choice="1"]').click();
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('codeweave.progress.v1')).theoryRead), ['c-types']);
  await page.locator('#toggle-review').click();
  await expect(page.locator('.mastery-state')).toContainText('숙달 진행 중');
  await expect(page.locator('.learning-status-list')).toContainText('! 필요');
  await page.locator('#toggle-review').click();
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  await expect(bench.locator('#attempt-list li')).toHaveCount(3);
  await page.locator('#attempt-history-container .attempt-list li').first().locator('summary').click();
  await expect(page.locator('#attempt-history-container .attempt-list li').first().locator('pre').last()).toHaveText(correct);
  await expect(page.locator('#attempt-history-container .attempt-list li').first().locator('pre').first()).toContainText('테스트 3: 통과');
  await submit(bench, correct);
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(4);
  console.log('PASS: real failing/passing submissions, separate quiz status and live shared history');

  page.once('dialog', d => d.dismiss());
  await page.locator('#attempt-history-container .attempt-list li').last().locator('button').click();
  await expect(page.locator('#code-input')).toHaveValue(correct);
  page.once('dialog', d => d.accept());
  await page.locator('#attempt-history-container .attempt-list li').last().locator('button').click();
  await expect(page.locator('#code-input')).toHaveValue(failed);
  assert.equal((await history(page))['c-types'].length, 4);
  await submit(page, failed);
  assert.equal((await history(page))['c-types'].length, 5);
  assert.ok(await page.locator('#attempt-history-container .attempt-status.passed').count() > 0);
  await page.reload();
  await expect(page.locator('#code-input')).toHaveValue(failed);
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(5);
  console.log('PASS: cancel/restore/re-submit/reload preserve previous iterations');

  await page.route('**/api/grade', route => route.fulfill({ status: 503, body: '{}' }));
  await submit(page, correct);
  assert.equal((await history(page))['c-types'].length, 5);
  await expect(page.locator('.terminal[role="status"]')).toContainText('채점 요청 실패 503');
  await page.unroute('**/api/grade');
  await page.route('**/api/grade', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"tests":[]}' }));
  await submit(page, correct);
  assert.equal((await history(page))['c-types'].length, 5);
  await expect(page.locator('.terminal[role="status"]')).toContainText('잘못된 채점 결과');
  await page.unroute('**/api/grade');
  await page.locator('#code-input').focus();
  await page.keyboard.press('Shift+Tab');
  assert.equal(await page.locator('#code-input').evaluate(el => el === document.activeElement), false);
  console.log('PASS: transport/invalid response errors do not create attempts; keyboard can leave editor');

  const downloadPromise = bench.waitForEvent('download');
  await bench.locator('#export-history').click();
  const download = await downloadPromise;
  const chunks = [];
  for await (const chunk of await download.createReadStream()) chunks.push(chunk);
  const backup = Buffer.concat(chunks);
  assert.equal(JSON.parse(backup).kind, 'full-backup');
  assert.equal(JSON.parse(backup)['iterations']['c-types'].length, 5);
  bench.on('dialog', d => d.accept());
  await bench.locator('#import-file').setInputFiles({ name: 'attempts.json', mimeType: 'application/json', buffer: backup });
  await expect(bench.locator('#draft-status')).toHaveText('통합 백업을 복원했습니다.');
  assert.equal(await bench.evaluate(() => JSON.parse(localStorage.getItem('codeweave.drafts.v1'))['rust-mut']), 'keep rust draft');
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(5);
  console.log('PASS: unified workbench backup/restore preserves all-track data');

  await page.locator('[data-route="settings"]').click();
  page.on('dialog', d => d.accept());
  await page.locator('#import-file').setInputFiles({ name: 'legacy-progress.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({
    app: 'CodeWeave', version: 1, progress: { completed: ['c-types'], results: {} }, drafts: { 'c-types': correct }
  })) });
  await expect(page.locator('#import-file')).toBeAttached();
  // Wait for the imported draft, not for the file input alone.
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('codeweave.drafts.v1'))['c-types'])).toBe(correct);
  assert.equal((await history(page))['c-types'].length, 5);
  console.log('PASS: legacy progress restore retains the independent submission history');

  await page.goto(base + '/#lesson:c-types');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  for (const asset of ['/src/practice.js', '/src/mastery.js', '/src/exercises.js', '/src/multi-file.js', '/src/compiler-feedback.js']) {
    assert.equal(await page.evaluate(async asset => !!(await caches.match(asset)), asset), true, 'cached ' + asset);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'mobile document overflow');
  if (qaDir) {
    await mkdir(qaDir, { recursive: true });
    await page.locator('.attempt-history').screenshot({ path: path.join(qaDir, 'lesson-attempts-mobile.png') });
  }
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(5);
  await expect(page.locator('#code-input')).toHaveValue(correct);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await context.setOffline(false);
  assert.deepEqual(errors, []);
  console.log('PASS: 390px mobile layout and offline reload of drafts/history; no browser exceptions');
} catch (error) {
  if (page && process.env.CODEWEAVE_QA_DIR) {
    await mkdir(process.env.CODEWEAVE_QA_DIR, { recursive: true });
    await page.screenshot({ path: path.join(process.env.CODEWEAVE_QA_DIR, 'browser-failure.png'), fullPage: true }).catch(() => {});
  }
  throw error;
} finally {
  await browser?.close();
  const ended = once(server, 'exit');
  server.kill();
  await ended;
}
