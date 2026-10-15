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
const searchFunctions = "#include <stddef.h>\n#include <stdio.h>\n\nsize_t linear_find_first(const int values[], size_t count, int target) {\n    for (size_t i = 0; i < count; ++i) {\n        if (values[i] == target) return i;\n    }\n    return count;\n}\n\nsize_t binary_find_first(const int values[], size_t count, int target) {\n    size_t left = 0;\n    size_t right = count;\n    while (left < right) {\n        size_t mid = left + (right - left) / 2;\n        if (values[mid] < target) left = mid + 1;\n        else right = mid;\n    }\n    if (left < count && values[left] == target) return left;\n    return count;\n}\n";
const searchWrong = searchFunctions.replace('if (values[mid] < target)', 'if (values[mid] == target) return mid;\n        if (values[mid] < target)');
const listFind = '#include <stddef.h>\nstruct Node { int value; const struct Node *next; };\nconst struct Node *list_find(const struct Node *head, int target) { for (const struct Node *p = head; p != NULL; p = p->next) { if (p->value == target) return p; } return NULL; }';
const listLast = listFind.replace('for (const struct', 'const struct Node *found = NULL; for (const struct').replace('return p;', 'found = p;').replace('return NULL;', 'return found;');
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
const dynamicStudentArray = '#include <stddef.h>\n#include <stdint.h>\n#include <stdlib.h>\nstruct Student{int id;int score;};\nint create_students(size_t count,int initial_score,struct Student **out_students){if(!out_students||initial_score<0||initial_score>100)return 0;if(count==0){*out_students=NULL;return 1;}struct Student *students=NULL;if(count>SIZE_MAX/sizeof *students)return 0;students=malloc(count*sizeof *students);if(!students)return 0;for(size_t i=0;i<count;++i){students[i].id=0;students[i].score=initial_score;}*out_students=students;return 1;}\nvoid destroy_students(struct Student **students){if(!students)return;free(*students);*students=NULL;}';
const reallocStudentCapacity = '#include <stddef.h>\n#include <stdint.h>\n#include <stdlib.h>\nstruct Student{int id;int score;};\nint reserve_students(struct Student **students,size_t length,size_t *capacity,size_t new_capacity){if(!students||!capacity||length>*capacity)return 0;if((*capacity==0)!=(*students==NULL))return 0;if(new_capacity<*capacity||new_capacity<length)return 0;if(new_capacity==*capacity)return 1;if(new_capacity>SIZE_MAX/sizeof **students)return 0;size_t old=*capacity;struct Student *grown=realloc(*students,new_capacity*sizeof *grown);if(!grown)return 0;for(size_t i=old;i<new_capacity;++i)grown[i]=(struct Student){0,0};*students=grown;*capacity=new_capacity;return 1;}';
const studentVectorPush = '#include <stddef.h>\n#include <stdint.h>\nstruct Student{int id;int score;};\nint reserve_students(struct Student **students,size_t length,size_t *capacity,size_t new_capacity);\nint push_student(struct Student **students,size_t *length,size_t *capacity,struct Student value){if(!students||!length||!capacity||*length>*capacity||((*capacity==0)!=(*students==NULL)))return 0;if(*length==*capacity){size_t next;if(*capacity==0)next=4;else{if(*capacity>SIZE_MAX/2)return 0;next=*capacity*2;}if(!reserve_students(students,*length,capacity,next))return 0;}(*students)[*length]=value;(*length)++;return 1;}';
const multiFileSolution = [
  {name:'main.c',content:'#include <stdio.h>\n#include "functions.h"\nint main(void){int v,l,h;if(scanf("%d%d%d",&v,&l,&h)!=3)return 1;printf("%d\\n",clamp(v,l,h));return 0;}'},
  {name:'functions.c',content:'#include "functions.h"\nint clamp(int v,int l,int h){if(v<l)return l;if(v>h)return h;return v;}'},
  {name:'functions.h',content:'#ifndef FUNCTIONS_H\n#define FUNCTIONS_H\nint clamp(int value,int low,int high);\n#endif'}
];
const multiFileWrong = multiFileSolution.map(file => file.name === 'functions.c'
  ? { ...file, content: '#include "functions.h"\nint clamp(int v,int l,int h){(void)v;(void)l;return h;}' }
  : file);
const studentRegistrySolution = [
  {name:'main.c',content:'#include <stdio.h>\n#include "student.h"\nenum{MAX_STUDENTS=16};\nint main(void){struct Student a[MAX_STUDENTS];int n_input,target;if(scanf("%d%d",&n_input,&target)!=2||n_input<0||n_input>MAX_STUDENTS){puts("INVALID");return 0;}size_t n=(size_t)n_input;for(size_t i=0;i<n;i++)if(scanf("%d%d",&a[i].id,&a[i].score)!=2){puts("INVALID");return 0;}if(!stable_sort_students_by_id(a,n))return 1;if(n==0)puts("EMPTY");else{for(size_t i=0;i<n;i++){if(i)putchar(\' \');printf("%d:%d",a[i].id,a[i].score);}putchar(\'\\n\');}size_t index;if(find_first_student_by_id(a,n,target,&index))printf("FOUND %zu %d\\n",index,a[index].score);else puts("NOT FOUND");return 0;}'},
  {name:'student.c',content:'#include "student.h"\nint stable_sort_students_by_id(struct Student a[],size_t n){if(n==0)return 1;if(!a)return 0;for(size_t i=1;i<n;i++){struct Student key=a[i];size_t j=i;while(j>0&&a[j-1].id>key.id){a[j]=a[j-1];--j;}a[j]=key;}return 1;}\nint find_first_student_by_id(const struct Student a[],size_t n,int id,size_t *out){if(n==0||!a||!out)return 0;size_t l=0,r=n;while(l<r){size_t m=l+(r-l)/2;if(a[m].id<id)l=m+1;else r=m;}if(l<n&&a[l].id==id){*out=l;return 1;}return 0;}'},
  {name:'student.h',content:'#ifndef STUDENT_H\n#define STUDENT_H\n#include <stddef.h>\nstruct Student{int id;int score;};\nint stable_sort_students_by_id(struct Student students[],size_t count);\nint find_first_student_by_id(const struct Student students[],size_t count,int target_id,size_t *out_index);\n#endif'}
];
const history = page => page.evaluate(() => JSON.parse(localStorage.getItem('codeweave.iterations.v1')));
const ready = async page => { await expect(page.locator('#grade-code')).toBeEnabled(); };
async function submit(page, code) {
  await page.locator('#code-input').fill(code);
  const response = page.waitForResponse(r => r.url().endsWith('/api/grade'));
  await page.locator('#grade-code').click();
  const graded = await response;
  const sentToken = graded.request().headers()['x-codeweave-token'];
  assert.equal(sentToken, await page.locator('meta[name="codeweave-token"]').getAttribute('content'));
  assert.match(sentToken, /^[0-9a-f]{64}$/);
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
    'algo-binary': searchFunctions,
    'ds-list-find': listFind,
    'c-matrix-row-sums': "#include <stddef.h>\n#include <stdio.h>\n\nint sum_rows3(const int matrix[][3], size_t rows, long *out_sums) {\n    if (rows == 0) {\n        return 1;\n    }\n    if (rows > 4 || matrix == NULL || out_sums == NULL) {\n        return 0;\n    }\n    long totals[4];\n    for (size_t r = 0; r < rows; ++r) {\n        long sum = 0;\n        for (size_t c = 0; c < 3; ++c) {\n            if (matrix[r][c] < -10000 || matrix[r][c] > 10000) {\n                return 0;\n            }\n            sum += (long)matrix[r][c];\n        }\n        totals[r] = sum;\n    }\n    for (size_t r = 0; r < rows; ++r) {\n        out_sums[r] = totals[r];\n    }\n    return 1;\n}\n",
    'c-recursion-factorial': "#include <stddef.h>\n#include <stdio.h>\n\nstatic unsigned long factorial_small(unsigned int n) {\n    if (n == 0) {\n        return 1UL;\n    }\n    unsigned long smaller = factorial_small(n - 1);\n    return (unsigned long)n * smaller;\n}\n\nint factorial_checked(unsigned int n, unsigned long *out_value) {\n    if (out_value == NULL || n > 12) {\n        return 0;\n    }\n    unsigned long result = factorial_small(n);\n    *out_value = result;\n    return 1;\n}\n",
    'c-hello': '#include <stdio.h>\nint main(void){puts("Hello, CodeWeave!");return 0;}',
    'c-types': correct,
    'c-loops': '#include <stdio.h>\nint main(void){int n;if(scanf("%d",&n)!=1)return 1;long sum=0;for(int i=1;i<=n;i++)sum+=i;printf("%ld\\n",sum);return 0;}',
    'c-array': "#include <stddef.h>\n#include <stdio.h>\n\nstatic int max_nonempty(const int values[], size_t count) {\n    int maximum = values[0];\n    for (size_t i = 1; i < count; ++i) {\n        if (values[i] > maximum) {\n            maximum = values[i];\n        }\n    }\n    return maximum;\n}\n\nint main(void) {\n    enum { CAPACITY = 20 };\n    int values[CAPACITY];\n    int count_input;\n    if (scanf(\"%d\", &count_input) != 1 || count_input < 1 || count_input > CAPACITY) {\n        return 1;\n    }\n    size_t count = (size_t)count_input;\n    for (size_t i = 0; i < count; ++i) {\n        if (scanf(\"%d\", &values[i]) != 1) {\n            return 1;\n        }\n    }\n    printf(\"%d\\n\", max_nonempty(values, count));\n    return 0;\n}",
    'c-pointer': "#include <stdio.h>\n\nvoid add_one(int *value) {\n    ++(*value);\n}\n\nint main(void) {\n    int n;\n    if (scanf(\"%d\", &n) != 1) {\n        return 1;\n    }\n    if (n < -10000 || n > 9999) {\n        return 1;\n    }\n    add_one(&n);\n    printf(\"%d\\n\", n);\n    return 0;\n}",
    'c-functions': "#include <stdio.h>\n\nint clamp(int value, int low, int high);\n\nint main(void) {\n    int value, low, high;\n    if (scanf(\"%d%d%d\", &value, &low, &high) != 3) return 1;\n    printf(\"%d\\n\", clamp(value, low, high));\n    return 0;\n}\n\nint clamp(int value, int low, int high) {\n    if (value < low) return low;\n    if (value > high) return high;\n    return value;\n}\n",
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
    'c-multi-file': serializeMultiFileSubmission(multiFileSolution, { requiredNames: ['main.c','functions.c','functions.h'] }),
    'c-struct-student-registry': serializeMultiFileSubmission(studentRegistrySolution, { requiredNames: ['main.c','student.c','student.h'] }),
    'c-dynamic-student-array': dynamicStudentArray,
    'c-realloc-student-capacity': reallocStudentCapacity,
    'c-student-vector-push': studentVectorPush
  };
  const html = await (await fetch(base + '/')).text();
  const token = html.match(/<meta name="codeweave-token" content="([0-9a-f]{64})">/)?.[1];
  assert.match(token ?? '', /^[0-9a-f]{64}$/);
  for (const [exerciseId, code] of Object.entries(solutions)) {
    const response = await fetch(base + '/api/grade', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CodeWeave-Token': token }, body: JSON.stringify({ exerciseId, code }) });
    const result = await response.json();
    assert.equal(result.ok, true, exerciseId + ': ' + JSON.stringify(result));
  }
  console.log(`PASS: all ${Object.keys(solutions).length} C exercises compile and pass their real GCC tests`);

  browser = await chromium.launch({ headless: true });
  const warningContext = await browser.newContext();
  warningContext.on('page', p => p.on('pageerror', e => errors.push(e.message)));
  try {
    for (const [route, terminal, workbench] of [
      ['/#lesson:c-hello', '.terminal[role="status"]', false],
      ['/workbench.html', '#grade-result', true]
    ]) {
      const warningPage = await warningContext.newPage();
      await warningPage.goto(base + route);
      if (workbench) await warningPage.locator('#lesson-select').selectOption('c-hello');
      await submit(warningPage, '#include <stdio.h>\nint main(void){int unused=7;puts("Hello, CodeWeave!");return 0;}');
      await expect(warningPage.locator(terminal)).toContainText('컴파일 실패');
      await expect(warningPage.locator(terminal)).toContainText('unused-variable');
      await expect(warningPage.locator(terminal)).toContainText('테스트 1: 미실행');
      await submit(warningPage, solutions['c-hello']);
      await expect(warningPage.locator(terminal)).toContainText('모든 테스트 통과');
      await warningPage.close();
    }
  } finally { await warningContext.close(); }
  console.log('PASS: both submission screens reject compiler warnings, show the diagnostic and accept the corrected code');
  context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  context.on('page', p => p.on('pageerror', e => errors.push(e.message)));
  page = await context.newPage();
  for (const id of ['c-hello', 'c-types', 'c-loops']) {
    await page.goto(base + '/#lesson:' + id);
    const note = page.locator('article details.advanced').first();
    await expect(note).toHaveCount(1);
    assert.equal(await note.evaluate(el => el.open), false);
    const body = note.locator('p').first();
    await expect(body).not.toBeVisible();
    await note.locator('summary').focus();
    await page.keyboard.press('Enter');
    await expect(body).toBeVisible();
    await page.keyboard.press('Space');
    await expect(body).not.toBeVisible();
    await expect(page.locator('#code-input')).toBeVisible();
  }
  console.log('PASS: all three beginner lessons keep advanced notes closed, keyboard-toggleable and separate from practice');
  const interruptedCode = '#include <stdio.h>\nint main(void){int a,b;if(scanf("%d%d",&a,&b)!=2)return 8;if(a<0)return 7;printf("%d\\n",a+b);return 0;}';
  await page.goto(base + '/#lesson:c-types');
  await submit(page, interruptedCode);
  const interruptedTerminal = page.locator('.terminal[role="status"]');
  await expect(interruptedTerminal).toContainText('1/5개 테스트 통과');
  await expect(interruptedTerminal).toContainText('테스트 2: 실패');
  await expect(interruptedTerminal).toContainText('테스트 3: 미실행');
  await expect(interruptedTerminal).toContainText('테스트 5: 미실행');
  await expect(interruptedTerminal).not.toContainText('테스트 3: 실패');
  await page.reload();
  await expect(page.locator('#attempt-history-container')).toContainText('테스트 5: 미실행');
  const interruptedBench = await context.newPage();
  await interruptedBench.goto(base + '/workbench.html');
  await interruptedBench.locator('#lesson-select').selectOption('c-types');
  await submit(interruptedBench, interruptedCode);
  await expect(interruptedBench.locator('#grade-result')).toContainText('1/5개 테스트 통과');
  await expect(interruptedBench.locator('#grade-result')).toContainText('테스트 5: 미실행');
  await expect(interruptedBench.locator('#grade-result')).not.toContainText('테스트 3: 실패');
  await interruptedBench.close();
  console.log('PASS: fatal grading keeps the full denominator and unexecuted cases in both screens and reloaded v1 history');
  await page.goto(base + '/#lesson:c-hello');
  await expect(page.locator('.detail-head h1')).toHaveText('첫 C 프로그램의 구조');
  await expect(page.locator('.figure-box svg')).toContainText('전처리');
  await expect(page.locator('.figure-box svg')).toContainText('목적 파일 hello.o');
  await expect(page.locator('.article')).toContainText('printf 반환값과 출력 오류');
  await expect(page.locator('#code-input')).toHaveValue(/int main\(void\)/);
  await submit(page, solutions['c-hello']);
  await expect(page.locator('.terminal[role="status"]')).toContainText('모든 테스트 통과');
  await page.locator('#mark-theory').click();
  await page.locator('[data-quiz="c-hello"][data-choice="0"]').click();
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  console.log('PASS: first C lesson renders the detailed build pipeline and reaches mastery through a real submission');
  await page.goto(base + '/#lesson:c-loops');
  await expect(page.locator('.detail-head h1')).toHaveText('조건문과 반복문');
  await expect(page.locator('.article')).toContainText('불변식: 이미 더한 범위');
  await expect(page.locator('.article')).toContainText('500500');
  await expect(page.locator('.figure-box svg')).toContainText('거짓');
  await expect(page.locator('.figure-box svg')).toContainText('갱신');
  await submit(page, solutions['c-loops'].replace('i<=n', 'i<n'));
  await expect(page.locator('.terminal[role="status"]')).toContainText('채점 미통과');
  await submit(page, solutions['c-loops']);
  await expect(page.locator('.terminal[role="status"]')).toContainText('모든 테스트 통과');
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  await page.locator('#mark-theory').click();
  await page.locator('[data-quiz="c-loops"][data-choice="1"]').click();
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'loops lesson mobile overflow');
  const loopsFigure = await page.locator('.figure-box svg').boundingBox();
  assert.ok(loopsFigure && loopsFigure.x >= 0 && loopsFigure.x + loopsFigure.width <= 390, 'loops figure fits the mobile viewport');
  if (qaDir) {
    await mkdir(qaDir, { recursive: true });
    await page.locator('.figure-box').screenshot({ path: path.join(qaDir, 'loop-invariant-mobile.png') });
  }
  await page.setViewportSize({ width: 1366, height: 900 });
  console.log('PASS: detailed loops lesson rejects an off-by-one, reaches mastery and fits 390px');
  await page.goto(base + '/#lesson:c-array');
  await expect(page.locator('.detail-head h1')).toHaveText('배열과 함수');
  await expect(page.locator('.article')).toContainText('sizeof로 구할 수 있는 길이');
  await expect(page.locator('.article')).toContainText('최댓값 추적과 불변식');
  await expect(page.locator('.figure-box svg')).toContainText('[0, count)');
  await expect(page.locator('.figure-box svg')).toContainText('접근 금지');
  await submit(page, solutions['c-array'].replace('int maximum = values[0];', 'int maximum = 0;'));
  await expect(page.locator('.terminal[role="status"]')).toContainText('채점 미통과');
  await submit(page, solutions['c-array']);
  await expect(page.locator('.terminal[role="status"]')).toContainText('모든 테스트 통과');
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  await page.locator('#mark-theory').click();
  await page.locator('[data-quiz="c-array"][data-choice="2"]').click();
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'array introduction mobile overflow');
  const arrayFigure = await page.locator('.figure-box svg').boundingBox();
  assert.ok(arrayFigure && arrayFigure.x >= 0 && arrayFigure.x + arrayFigure.width <= 390, 'array figure fits the mobile viewport');
  if (qaDir) {
    await mkdir(qaDir, { recursive: true });
    await page.locator('.figure-box').screenshot({ path: path.join(qaDir, 'array-half-open-mobile.png') });
  }
  await page.setViewportSize({ width: 1366, height: 900 });
  console.log('PASS: array introduction rejects a zero candidate, reaches mastery and fits 390px');
  await page.goto(base + '/#lesson:c-pointer');
  await expect(page.locator('.detail-head h1')).toHaveText('포인터의 주소와 역참조');
  await expect(page.locator('.article')).toContainText('NULL 검사만으로는 유효성을 증명하지 못한다');
  await expect(page.locator('.article')).toContainText('포인터도 값 전달');
  await expect(page.locator('.figure-box svg')).toContainText('시점 A');
  await expect(page.locator('.figure-box svg')).toContainText('alias는 value 그대로');
  await submit(page, solutions['c-pointer'].replace('++(*value);', 'value++;'));
  await expect(page.locator('.terminal[role="status"]')).toContainText('채점 미통과');
  await submit(page, solutions['c-pointer']);
  await expect(page.locator('.terminal[role="status"]')).toContainText('모든 테스트 통과');
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  await page.locator('#mark-theory').click();
  await page.locator('[data-quiz="c-pointer"][data-choice="1"]').click();
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'pointer introduction mobile overflow');
  const pointerFigure = await page.locator('.figure-box svg').boundingBox();
  assert.ok(pointerFigure && pointerFigure.x >= 0 && pointerFigure.x + pointerFigure.width <= 390, 'pointer figure fits the mobile viewport');
  const pointerTextSizes = await page.locator('.figure-box svg').evaluate(svg => [...svg.querySelectorAll('text')].map(label => {
    const transform = label.getScreenCTM();
    return { label: label.textContent, pixels: parseFloat(getComputedStyle(label).fontSize) * Math.hypot(transform.a, transform.b) };
  }));
  assert.ok(pointerTextSizes.length > 0 && pointerTextSizes.every(label => label.pixels >= 11.5), 'pointer diagram text must remain at least 11.5 CSS px at 390px: ' + JSON.stringify(pointerTextSizes));
  if (qaDir) {
    await mkdir(qaDir, { recursive: true });
    await page.locator('.figure-box').screenshot({ path: path.join(qaDir, 'pointer-alias-mobile.png') });
  }
  await page.setViewportSize({ width: 1366, height: 900 });
  console.log('PASS: pointer introduction rejects pointer movement, reaches mastery and fits 390px');
  await page.goto(base + '/#lesson:c-functions');
  await expect(page.locator('.detail-head h1')).toHaveText('함수 설계: 선언·호출·값 전달');
  await expect(page.locator('.article')).toContainText('static 지역 객체');
  await expect(page.locator('.article')).toContainText('범위·저장기간·연결');
  await expect(page.locator('.figure-box svg')).toContainText('int age = 30;');
  await expect(page.locator('.figure-box svg')).toContainText('바깥 이름만 가려짐');
  await expect(page.locator('#code-input')).toHaveValue(/int clamp\(int value, int low, int high\)/);
  await expect(page.locator('.practice-zone')).toContainText('Practice Exercise');
  await expect(page.locator('.practice-zone')).toContainText('선수 단원:');
  await submit(page, solutions['c-functions'].replace('printf("%d\\n", clamp(value, low, high));', 'clamp(value, low, high);\n    printf("%d\\n", value);'));
  await expect(page.locator('.terminal[role="status"]')).toContainText('채점 미통과');
  await submit(page, solutions['c-functions']);
  await expect(page.locator('.terminal[role="status"]')).toContainText('모든 테스트 통과');
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  await page.locator('#mark-theory').click();
  await page.locator('[data-quiz="c-functions"][data-choice="0"]').click();
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'function lesson mobile overflow');
  const functionFigure = await page.locator('.figure-box svg').boundingBox();
  assert.ok(functionFigure && functionFigure.x >= 0 && functionFigure.x + functionFigure.width <= 390, 'function figure fits the mobile viewport');
  const functionTextSizes = await page.locator('.figure-box svg').evaluate(svg => [...svg.querySelectorAll('text')].map(label => {
    const transform = label.getScreenCTM();
    return parseFloat(getComputedStyle(label).fontSize) * Math.hypot(transform.a, transform.b);
  }));
  assert.ok(functionTextSizes.length > 0 && functionTextSizes.every(size => size >= 11.5), 'function diagram retains readable mobile text');
  if (qaDir) {
    await mkdir(qaDir, { recursive: true });
    await page.locator('.figure-box').screenshot({ path: path.join(qaDir, 'function-scope-mobile.png') });
  }
  await page.setViewportSize({ width: 1366, height: 900 });
  console.log('PASS: function lesson rejects discarded return, reaches mastery and preserves scope diagram readability at 390px');
  await page.goto(base + '/#lesson:c-recursion-factorial');
  // New DS unit must complete the same correction and mastery flow as C units.
  await page.evaluate(() => {
    const id = 'algo-binary';
    const drafts = JSON.parse(localStorage.getItem('codeweave.drafts.v1') || '{}');
    drafts[id] = '// my prior sample draft';
    localStorage.setItem('codeweave.drafts.v1', JSON.stringify(drafts));
    const progress = JSON.parse(localStorage.getItem('codeweave.progress.v1') || '{}');
    progress.completed = [...new Set([...(progress.completed || []), id])];
    progress.results = { ...progress.results, [id]: { correct: true, selected: 2 } };
    localStorage.setItem('codeweave.progress.v1', JSON.stringify(progress));
  });
  await page.goto(base + '/#lesson:algo-binary');
  await page.reload();
  await expect(page.locator('.detail-head h1')).toHaveText('복잡도와 선형·이진 탐색의 전제');
  await expect(page.locator('#code-input')).toHaveValue('// my prior sample draft');
  await expect(page.locator('.mastery-state')).not.toContainText('전체 숙달');
  await page.locator('[data-retry="algo-binary"]').click();
  await page.locator('[data-quiz="algo-binary"][data-choice="2"]').click();
  await page.locator('#mark-theory').click();
  await submit(page, searchWrong);
  await expect(page.locator('.terminal[role="status"]')).toContainText('채점 미통과');
  await expect(page.locator('.mastery-state')).not.toContainText('전체 숙달');
  await submit(page, searchFunctions);
  await expect(page.locator('.terminal[role="status"]')).toContainText('모든 테스트 통과');
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'E01 mobile overflow');
  const searchFigure = await page.locator('.figure-box svg').boundingBox();
  assert.ok(searchFigure && searchFigure.x >= 0 && searchFigure.x + searchFigure.width <= 390);
  if (qaDir) {
    await mkdir(qaDir, { recursive: true });
    await page.screenshot({ path: path.join(qaDir, 'search-first-mobile.png'), fullPage: true });
  }
  await page.locator('[data-route="track:algo"]').first().click();
  await expect(page.locator('[data-route="lesson:algo-binary"]')).toHaveCount(1);
  await page.setViewportSize({ width: 1366, height: 900 });
  console.log('PASS: E01 preserves legacy draft/quiz, corrects a duplicate error, reaches mastery and fits 390px');
  await page.goto(base + '/#lesson:ds-list-find');
  await expect(page.locator('.detail-head h1')).toHaveText('단일 연결 리스트: 순회와 첫 일치 검색');
  await expect(page.locator('.figure-box svg')).toHaveAttribute('role', 'img');
  await expect(page.locator('.practice-zone')).toContainText('함수 직접 호출형');
  await expect(page.locator('#code-input')).not.toHaveValue(/int main\s*\(/);
  await page.locator('#mark-theory').click();
  await page.locator('[data-quiz="ds-list-find"][data-choice="0"]').click();
  await expect(page.locator('.mastery-state')).not.toContainText('전체 숙달');
  await submit(page, listLast);
  await expect(page.locator('.terminal[role="status"]')).toContainText('채점 미통과');
  await expect(page.locator('.mastery-state')).not.toContainText('전체 숙달');
  await submit(page, listFind);
  await expect(page.locator('.terminal[role="status"]')).toContainText('모든 테스트 통과');
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'D01 mobile overflow');
  const listFigure = await page.locator('.figure-box svg').boundingBox();
  assert.ok(listFigure && listFigure.x >= 0 && listFigure.x + listFigure.width <= 390);
  if (qaDir) {
    await mkdir(qaDir, { recursive: true });
    await page.screenshot({ path: path.join(qaDir, 'linked-list-mobile.png'), fullPage: true });
  }
  await page.setViewportSize({ width: 1366, height: 900 });
  console.log('PASS: D01 linked-list first-match failure/correction, separate mastery and 390px layout');
  await page.locator('.next-action [data-route="lesson:ds-stack"]').click();
  await expect(page.locator('.detail-head h1')).toHaveText('스택: 나중에 넣은 것이 먼저 나온다');
  console.log('PASS: D01 next-unit navigation stays in the DS track');
  await page.goto(base + '/#lesson:c-recursion-factorial');
  await expect(page.locator('.detail-head h1')).toHaveText('재귀: 종료 조건과 작은 팩토리얼');
  await expect(page.locator('.article')).toContainText('진행 척도');
  await expect(page.locator('.article')).toContainText('재귀 사용을 증명하지');
  await expect(page.locator('.figure-box svg')).toContainText('n=0');
  await expect(page.locator('.figure-box svg')).toContainText('3 × 2 = 6');
  await expect(page.locator('#code-input')).not.toHaveValue(/main\s*\(/);
  await expect(page.locator('.practice-zone')).toContainText('함수 직접 호출형');
  await submit(page, '#include <stddef.h>\nint factorial_checked(unsigned int n,unsigned long *out){if(!out||n>12)return 0;static unsigned long result=1UL;for(unsigned int i=1;i<=n;i++)result*=i;*out=result;return 1;}');
  await expect(page.locator('.terminal[role="status"]')).toContainText('채점 미통과');
  await submit(page, solutions['c-recursion-factorial']);
  await expect(page.locator('.terminal[role="status"]')).toContainText('모든 테스트 통과');
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  await page.locator('#mark-theory').click();
  await page.locator('[data-quiz="c-recursion-factorial"][data-choice="0"]').click();
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'recursion lesson mobile overflow');
  const recursionFigure = await page.locator('.figure-box svg').boundingBox();
  assert.ok(recursionFigure && recursionFigure.x >= 0 && recursionFigure.x + recursionFigure.width <= 390, 'recursion diagram fits mobile viewport');
  const recursionTextSizes = await page.locator('.figure-box svg').evaluate(svg => [...svg.querySelectorAll('text')].map(label => {
    const transform = label.getScreenCTM();
    return parseFloat(getComputedStyle(label).fontSize) * Math.hypot(transform.a, transform.b);
  }));
  assert.ok(recursionTextSizes.length > 0 && recursionTextSizes.every(size => size >= 11.5), 'recursion diagram retains readable mobile text');
  if (qaDir) {
    await mkdir(qaDir, { recursive: true });
    await page.locator('.figure-box').screenshot({ path: path.join(qaDir, 'recursion-unwind-mobile.png') });
  }
  await page.setViewportSize({ width: 1366, height: 900 });
  console.log('PASS: recursion rejects shared state, reaches mastery and preserves call/return readability at 390px');
  await page.goto(base + '/#lesson:c-matrix-row-sums');
  await expect(page.locator('.detail-head h1')).toHaveText('다차원 배열: 행·열과 안전한 행 합');
  await expect(page.locator('.article')).toContainText('int **');
  await expect(page.locator('.article')).toContainText('C11');
  await expect(page.locator('.figure-box svg')).toContainText('열 [3] 접근 금지');
  await expect(page.locator('#code-input')).not.toHaveValue(/main\s*\(/);
  await submit(page, solutions['c-matrix-row-sums'].replace('totals[r] = sum;', 'totals[r] = sum; out_sums[r] = sum;'));
  await expect(page.locator('.terminal[role="status"]')).toContainText('채점 미통과');
  await submit(page, solutions['c-matrix-row-sums']);
  await expect(page.locator('.terminal[role="status"]')).toContainText('모든 테스트 통과');
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  await page.locator('#mark-theory').click();
  await page.locator('[data-quiz="c-matrix-row-sums"][data-choice="0"]').click();
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'matrix lesson mobile overflow');
  const matrixFigure = await page.locator('.figure-box svg').boundingBox();
  assert.ok(matrixFigure && matrixFigure.x >= 0 && matrixFigure.x + matrixFigure.width <= 390, 'matrix diagram fits mobile viewport');
  const matrixTextSizes = await page.locator('.figure-box svg').evaluate(svg => [...svg.querySelectorAll('text')].map(label => {
    const transform = label.getScreenCTM();
    return parseFloat(getComputedStyle(label).fontSize) * Math.hypot(transform.a, transform.b);
  }));
  assert.ok(matrixTextSizes.length > 0 && matrixTextSizes.every(size => size >= 11.5), 'matrix diagram retains readable mobile text');
  if (qaDir) {
    await mkdir(qaDir, { recursive: true });
    await page.locator('.figure-box').screenshot({ path: path.join(qaDir, 'matrix-rows-mobile.png') });
  }
  await page.setViewportSize({ width: 1366, height: 900 });
  console.log('PASS: matrix rejects early output publication, reaches mastery and preserves row/column readability at 390px');
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
  await page.goto(base + '/#lesson:c-struct-student-registry');
  await expect(page.locator('.detail-head h1')).toHaveText('학생 명부: 안정 정렬과 첫 학번 탐색');
  await expect(page.locator('.figure-box svg')).toContainText('안정 정렬');
  await expect(page.locator('[data-code-file]')).toHaveCount(3);
  await fillMultiFile(page, studentRegistrySolution);
  const registryResponse = page.waitForResponse(r => r.url().endsWith('/api/grade'));
  await page.locator('#grade-code').click(); await registryResponse; await ready(page);
  await expect(page.locator('.terminal[role="status"]')).toContainText('모든 테스트 통과');
  await expect(page.locator('[data-code-file="student.h"]')).toHaveValue(/struct Student/);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'student registry mobile overflow');
  await page.setViewportSize({ width: 1366, height: 900 });
  console.log('PASS: student registry lesson renders and submits its independent three-file contract');
  await page.goto(base + '/#lesson:c-dynamic-student-array');
  await expect(page.locator('.detail-head h1')).toHaveText('동적 메모리: 학생 배열의 생성과 해제');
  await expect(page.locator('.figure-box svg')).toContainText('SIZE_MAX');
  await expect(page.locator('.figure-box svg')).toContainText('malloc');
  await expect(page.locator('#code-input')).toHaveValue(/create_students/);
  await expect(page.locator('#code-input')).not.toHaveValue(/main\s*\(/);
  await submit(page, dynamicStudentArray);
  await expect(page.locator('.terminal[role="status"]')).toContainText('모든 테스트 통과');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'dynamic student array mobile overflow');
  await page.setViewportSize({ width: 1366, height: 900 });
  console.log('PASS: dynamic student array lesson renders its ownership figure and passes the allocation wrapper harness');
  await page.goto(base + '/#lesson:c-realloc-student-capacity');
  await expect(page.locator('.detail-head h1')).toHaveText('realloc로 학생 배열 용량 늘리기');
  await expect(page.locator('.figure-box svg')).toContainText('realloc');
  await expect(page.locator('.figure-box svg')).toContainText('원본 보존');
  await expect(page.locator('#code-input')).toHaveValue(/reserve_students/);
  await expect(page.locator('#code-input')).not.toHaveValue(/main\s*\(/);
  await submit(page, reallocStudentCapacity);
  await expect(page.locator('.terminal[role="status"]')).toContainText('모든 테스트 통과');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'realloc student capacity mobile overflow');
  await page.setViewportSize({ width: 1366, height: 900 });
  console.log('PASS: realloc lesson renders its preserved-failure figure and passes deterministic failure injection');
  await page.goto(base + '/#lesson:c-student-vector-push');
  await expect(page.locator('.detail-head h1')).toHaveText('동적 배열: 학생 한 명 안전하게 추가하기');
  await expect(page.locator('.figure-box svg')).toContainText('reserve_students');
  await expect(page.locator('.figure-box svg')).toContainText('0 → 4');
  await expect(page.locator('#code-input')).toHaveValue(/push_student/);
  await expect(page.locator('#code-input')).not.toHaveValue(/int main\s*\(/);
  await submit(page, studentVectorPush);
  await expect(page.locator('.terminal[role="status"]')).toContainText('모든 테스트 통과');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'student vector push mobile overflow');
  await page.setViewportSize({ width: 1366, height: 900 });
  console.log('PASS: vector push lesson renders geometric growth and passes reserve reuse cases');
  await page.evaluate(({ failed }) => {
    // Keep the actually graded DS attempts for the subsequent all-track backup check.
    // Reset legacy C data/progress independently; this fixture is not a product reset.
    const dsHistory = JSON.parse(localStorage.getItem('codeweave.iterations.v1'))['ds-list-find'];
    const dsDraft = JSON.parse(localStorage.getItem('codeweave.drafts.v1'))['ds-list-find'];
    const algoHistory = JSON.parse(localStorage.getItem('codeweave.iterations.v1'))['algo-binary'];
    const algoDraft = JSON.parse(localStorage.getItem('codeweave.drafts.v1'))['algo-binary'];
    if (algoHistory?.length !== 2 || typeof algoDraft !== 'string') throw Error('E01 setup did not produce two attempts and a draft');
    if (dsHistory?.length !== 2 || typeof dsDraft !== 'string') throw Error('D01 setup did not produce two attempts and a draft');
    localStorage.clear();
    localStorage.setItem('codeweave.drafts.v1', JSON.stringify({ 'c-types': failed, 'rust-mut': 'keep rust draft', 'ds-list-find': dsDraft, 'algo-binary': algoDraft }));
    localStorage.setItem('codeweave.iterations.v1', JSON.stringify({ 'c-types': [{
      at: '2026-10-11T02:30:00.000Z', code: failed, passed: false,
      message: '<img src=x onerror=alert(1)>', tests: [{ passed: false, detail: 'legacy failure' }]
    }], 'ds-list-find': dsHistory, 'algo-binary': algoHistory }));
  }, { failed });
  await page.goto(base + '/#lesson:c-types');
  // Hash navigation keeps the original module state; reload after seeding v1 data.
  await page.reload();
  await expect(page.locator('.detail-head h1')).toHaveText('변수·자료형·연산자');
  await expect(page.locator('.article')).toContainText('정수의 표현 범위와 구현 차이');
  await expect(page.locator('.article')).toContainText('scanf는 변환 개수를 확인한다');
  await expect(page.locator('.figure-box svg')).toContainText('double 3.0');
  await expect(page.locator('.figure-box svg')).toContainText('double 3.5');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'types lesson mobile overflow');
  const typesFigure = await page.locator('.figure-box svg').boundingBox();
  assert.ok(typesFigure && typesFigure.x >= 0 && typesFigure.x + typesFigure.width <= 390, 'types figure fits the mobile viewport');
  if (qaDir) {
    await mkdir(qaDir, { recursive: true });
    await page.locator('.figure-box').screenshot({ path: path.join(qaDir, 'types-conversion-mobile.png') });
  }
  await page.setViewportSize({ width: 1366, height: 900 });
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
  await expect(bench.locator('#lesson-select option[value="c-struct-student-registry"]')).toHaveCount(1);
  await expect(bench.locator('#lesson-select option[value="c-dynamic-student-array"]')).toHaveCount(1);
  await expect(bench.locator('#lesson-select option[value="c-realloc-student-capacity"]')).toHaveCount(1);
  await expect(bench.locator('#lesson-select option[value="c-student-vector-push"]')).toHaveCount(1);
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
  assert.equal(JSON.parse(backup)['iterations']['ds-list-find'].length, 2);
  assert.equal(JSON.parse(backup)['iterations']['algo-binary'].length, 2);
  assert.equal(JSON.parse(backup).drafts['algo-binary'], searchFunctions);
  await expect(bench.locator('#lesson-select option[value="algo-binary"]')).toHaveCount(1);
  await expect(bench.locator('#lesson-select option[value="ds-list-find"]')).toHaveCount(1);
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
  for (const asset of ['/src/catalog.js', '/src/figures.js', '/src/practice.js', '/src/mastery.js', '/src/exercises.js', '/src/multi-file.js', '/src/compiler-feedback.js']) {
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
  await expect(page.locator('.article')).toContainText('정수의 표현 범위와 구현 차이');
  await expect(page.locator('.figure-box svg')).toContainText('double 3.5');
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(5);
  await expect(page.locator('#code-input')).toHaveValue(correct);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.goto(base + '/#lesson:c-loops');
  await page.reload();
  await expect(page.locator('.detail-head h1')).toHaveText('조건문과 반복문');
  await expect(page.locator('.figure-box svg')).toContainText('갱신');
  await expect(page.locator('.article')).toContainText('누산형 범위는 반복 횟수와 다르다');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'offline loops lesson mobile overflow');
  await page.goto(base + '/#lesson:c-array');
  await page.reload();
  await expect(page.locator('.detail-head h1')).toHaveText('배열과 함수');
  await expect(page.locator('.figure-box svg')).toContainText('접근 금지');
  await expect(page.locator('.article')).toContainText('함수 매개변수와 별도 길이');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'offline array introduction mobile overflow');
  await page.goto(base + '/#lesson:c-pointer');
  await page.reload();
  await expect(page.locator('.detail-head h1')).toHaveText('포인터의 주소와 역참조');
  await expect(page.locator('.figure-box svg')).toContainText('alias는 value 그대로');
  await expect(page.locator('.article')).toContainText('객체 수명과 빌린 주소');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'offline pointer introduction mobile overflow');
  await page.goto(base + '/#lesson:c-functions');
  await page.reload();
  await expect(page.locator('.detail-head h1')).toHaveText('함수 설계: 선언·호출·값 전달');
  await expect(page.locator('.figure-box svg')).toContainText('int age = 15;');
  await expect(page.locator('.article')).toContainText('static 지역 객체');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'offline function lesson mobile overflow');
  await page.goto(base + '/#lesson:c-recursion-factorial');
  await page.reload();
  await expect(page.locator('.detail-head h1')).toHaveText('재귀: 종료 조건과 작은 팩토리얼');
  await expect(page.locator('.figure-box svg')).toContainText('return 1');
  await expect(page.locator('.article')).toContainText('ULONG_MAX');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'offline recursion lesson mobile overflow');
  await page.goto(base + '/#lesson:c-matrix-row-sums');
  await page.reload();
  await expect(page.locator('.detail-head h1')).toHaveText('다차원 배열: 행·열과 안전한 행 합');
  await expect(page.locator('.figure-box svg')).toContainText('열 [3] 접근 금지');
  await expect(page.locator('.article')).toContainText('모든 검증 뒤 출력 공개');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'offline matrix lesson mobile overflow');
  await page.goto(base + '/#lesson:ds-list-find');
  await page.reload();
  await expect(page.locator('.detail-head h1')).toHaveText('단일 연결 리스트: 순회와 첫 일치 검색');
  await expect(page.locator('.figure-box svg')).toHaveAttribute('role', 'img');
  // The deliberately restored legacy backup replaces drafts, but retains history.
  // Recover the DS draft from its latest correct attempt, then reload offline.
  await page.locator('[data-restore-attempt="0"]').click();
  await expect(page.locator('#code-input')).toHaveValue(listFind);
  await page.reload();
  await expect(page.locator('#code-input')).toHaveValue(listFind);
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'offline D01 mobile overflow');
  await context.setOffline(false);
  console.log('PASS: D01 backup preserves two attempts and offline reload restores its draft/history/diagram');
  await context.setOffline(true);
  await page.goto(base + '/#lesson:algo-binary');
  await page.reload();
  await expect(page.locator('.detail-head h1')).toHaveText('복잡도와 선형·이진 탐색의 전제');
  await expect(page.locator('.figure-box svg')).toHaveAttribute('role', 'img');
  await page.locator('[data-restore-attempt="0"]').click();
  await expect(page.locator('#code-input')).toHaveValue(searchFunctions);
  await page.reload();
  await expect(page.locator('#code-input')).toHaveValue(searchFunctions);
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'offline E01 mobile overflow');
  await context.setOffline(false);
  console.log('PASS: E01 backup and offline attempt restoration retain the original exercise ID');
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
