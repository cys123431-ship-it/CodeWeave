import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { recordGradedSubmission } from '../src/practice.js';
import { ITERATIONS_KEY } from '../src/iterations.js';
import { lessons } from '../src/catalog.js';
import { gradingExercises } from '../server/grading-exercises.mjs';
import { MULTI_FILE_DRAFT_PREFIX, serializeMultiFileSubmission } from '../src/multi-file.js';

const gccAvailable = spawnSync('gcc', ['--version']).status === 0;
test('local GCC API compiles whole-program, function-only and multi-file C exercises', { skip: !gccAvailable, timeout: 45000 }, async t => {
  const child = spawn(process.execPath, ['dev-server.mjs'], {
    env: { ...process.env, PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe']
  });
  t.after(async () => {
    if (child.exitCode === null) {
      const exit = once(child, 'exit');
      child.kill();
      await exit;
    }
  });
  const url = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('server startup timed out')), 5000);
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('exit', code => { clearTimeout(timer); reject(new Error('server exited: ' + code)); });
    let output = '';
    child.stdout.on('data', chunk => {
      output += chunk;
      const match = output.match(/http:\/\/127\.0\.0\.1:\d+/);
      if (match) { clearTimeout(timer); resolve(match[0]); }
    });
  });
  const submit = async (exerciseId, code) => {
    const response = await fetch(url + '/api/grade', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exerciseId, code }), signal: AbortSignal.timeout(10000)
    });
    return { status: response.status, result: await response.json() };
  };
  const solutions = {
    'c-hello': '#include <stdio.h>\nint main(void){puts("Hello, CodeWeave!");return 0;}',
    'c-types': '#include <stdio.h>\nint main(void){int a,b;if(scanf("%d%d",&a,&b)!=2)return 1;printf("%d\\n",a+b);return 0;}',
    'c-loops': '#include <stdio.h>\nint main(void){int n,s=0;if(scanf("%d",&n)!=1)return 1;for(int i=1;i<=n;i++)s+=i;printf("%d\\n",s);return 0;}',
    'c-array': '#include <stdio.h>\nint main(void){int n,x,m;if(scanf("%d%d",&n,&m)!=2)return 1;for(int i=1;i<n;i++){if(scanf("%d",&x)!=1)return 1;if(x>m)m=x;}printf("%d\\n",m);return 0;}',
    'c-pointer': '#include <stdio.h>\nvoid add_one(int *p){++*p;}\nint main(void){int n;if(scanf("%d",&n)!=1)return 1;add_one(&n);printf("%d\\n",n);return 0;}',
    'c-functions': '#include <stdio.h>\nint clamp(int value,int low,int high){if(value<low)return low;if(value>high)return high;return value;}\nint main(void){int value,low,high;if(scanf("%d%d%d",&value,&low,&high)!=3)return 1;printf("%d\\n",clamp(value,low,high));return 0;}',
    'c-clamp-function': 'int clamp(int value,int low,int high){if(value<low)return low;if(value>high)return high;return value;}',
    'c-array-max-function': '#include <stddef.h>\nint find_max(const int values[],size_t length,int *out_max){if(values==NULL||length==0||out_max==NULL)return 0;int maximum=values[0];for(size_t i=1;i<length;i++)if(values[i]>maximum)maximum=values[i];*out_max=maximum;return 1;}',
    'c-string-count-function': '#include <stddef.h>\nint count_char(const char *text,char target,size_t *out_count){if(text==NULL||out_count==NULL)return 0;size_t count=0;for(size_t i=0;text[i]!=\'\\0\';++i)if(text[i]==target)++count;*out_count=count;return 1;}',
    'c-bounded-string-length': '#include <stddef.h>\nint bounded_length(const char *buffer,size_t capacity,size_t *out_length){if(buffer==NULL||capacity==0||out_length==NULL)return 0;for(size_t i=0;i<capacity;++i){if(buffer[i]==\'\\0\'){*out_length=i;return 1;}}return 0;}',
    'c-fgets-logical-line': '#include <stddef.h>\n#include <stdio.h>\nint main(void){char chunk[8];size_t total=0;int saw_input=0;for(;;){if(fgets(chunk,sizeof chunk,stdin)==NULL){if(ferror(stdin))return 1;if(!saw_input){puts("NO INPUT");return 0;}break;}saw_input=1;size_t i=0;while(chunk[i]!=\'\\0\'&&chunk[i]!=\'\\n\')++i;total+=i;if(chunk[i]==\'\\n\')break;}printf("%zu\\n",total);return 0;}',
    'c-strtol-integer-input': '#include <ctype.h>\n#include <errno.h>\n#include <stdio.h>\n#include <stdlib.h>\nint main(void){char line[64];if(fgets(line,sizeof line,stdin)==NULL){if(ferror(stdin))return 1;puts("NO INPUT");return 0;}size_t i=0;while(line[i]!=\'\\0\'&&line[i]!=\'\\n\')++i;if(line[i]==\'\\0\'){int ch=getchar();if(ch!=EOF&&ch!=\'\\n\'){do{ch=getchar();}while(ch!=EOF&&ch!=\'\\n\');if(ch==EOF&&ferror(stdin))return 1;puts("TOO LONG");return 0;}if(ch==EOF&&ferror(stdin))return 1;}errno=0;char *end;long value=strtol(line,&end,10);if(end==line){puts("INVALID");return 0;}if(errno==ERANGE){puts("RANGE");return 0;}while(*end!=\'\\0\'&&isspace((unsigned char)*end))++end;if(*end!=\'\\0\'){puts("INVALID");return 0;}printf("%ld\\n",value);return 0;}',
    'c-struct-student-score': 'struct Student{int id;int score;};\nint update_score(struct Student *student,int delta){if(student==0||student->score<0||student->score>100)return 0;if(delta < -student->score || delta > 100-student->score)return 0;student->score+=delta;return 1;}',
    'c-struct-array-search': '#include <stddef.h>\nstruct Student{int id;int score;};\nint find_student_index(const struct Student students[],size_t count,int target_id,size_t *out_index){if(!students||count==0||!out_index)return 0;for(size_t i=0;i<count;++i)if(students[i].id==target_id){*out_index=i;return 1;}return 0;}',
    'c-multi-file': serializeMultiFileSubmission([
      {name:'main.c',content:'#include <stdio.h>\n#include "functions.h"\nint main(void){int v,l,h;if(scanf("%d%d%d",&v,&l,&h)!=3)return 1;printf("%d\\n",clamp(v,l,h));return 0;}'},
      {name:'functions.c',content:'#include "functions.h"\nint clamp(int v,int l,int h){if(v<l)return l;if(v>h)return h;return v;}'},
      {name:'functions.h',content:'#ifndef FUNCTIONS_H\n#define FUNCTIONS_H\nint clamp(int value,int low,int high);\n#endif'}
    ], { requiredNames: ['main.c','functions.c','functions.h'] })
  };
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  for (const [id, code] of Object.entries(solutions)) {
    await t.test(id + ' passes real compiler and all grading cases', async () => {
      const { status, result } = await submit(id, code);
      assert.equal(status, 200);
      assert.equal(result.ok, true, JSON.stringify(result));
      assert.equal(result.tests.length, gradingExercises.get(id).cases.length);
      assert.ok(result.tests.length > 0 && result.tests.every(test => test.passed));
      recordGradedSubmission(storage, lessons.map(l => l.id), id, code, result);
    });
  }
  await t.test('compiler failure is stored as a failed iteration', async () => {
    const { result } = await submit('c-hello', 'int main(void){ syntax error }');
    assert.equal(result.ok, false);
    assert.equal(result.message, '컴파일 실패');
    assert.ok(result.compileOutput);
    assert.equal(result.compilerFeedback.code, 'compile-error');
    assert.equal(result.compilerFeedback.phase, 'compile');
    recordGradedSubmission(storage, lessons.map(l => l.id), 'c-hello', 'broken', result);
    const history = JSON.parse(storage.getItem(ITERATIONS_KEY));
    assert.equal(history['c-hello'][0].passed, false);
    assert.equal(history['c-hello'][1].passed, true);
  });
  await t.test('wrong output is distinguished from compiler failure', async () => {
    const { result } = await submit('c-hello', '#include <stdio.h>\nint main(void){puts("wrong");return 0;}');
    assert.equal(result.ok, false);
    assert.match(result.tests[0].detail, /예상:.*실제:/);
  });
  await t.test('nonzero exit is reported as a runtime failure', async () => {
    const { result } = await submit('c-hello', 'int main(void){return 1;}');
    assert.equal(result.ok, false);
    assert.match(result.tests[0].detail, /비정상 종료/);
  });
  await t.test('non-terminating trusted test program hits the time limit', async () => {
    const { result } = await submit('c-hello', 'int main(void){for(;;){}return 0;}');
    assert.equal(result.ok, false);
    assert.equal(result.tests[0].detail, '시간 제한 초과');
  });
  await t.test('function grader rejects a submitted main through the separate harness link', async () => {
    const { result } = await submit('c-clamp-function', 'int clamp(int value,int low,int high){return value;}\nint main(void){return 0;}');
    assert.equal(result.ok, false);
    assert.equal(result.message, '컴파일 실패');
    assert.match(result.compileOutput, /main/);
    assert.equal(result.compilerFeedback.code, 'duplicate-definition');
    assert.equal(result.compilerFeedback.phase, 'link');
  });
  await t.test('function grader detects forbidden standard-output side effects', async () => {
    const { result } = await submit('c-clamp-function', '#include <stdio.h>\nint clamp(int value,int low,int high){printf("debug\\n");if(value<low)return low;if(value>high)return high;return value;}');
    assert.equal(result.ok, false);
    assert.match(result.tests[0].detail, /예상:.*실제:/);
  });
  await t.test('function grader reports a wrong return value', async () => {
    const { result } = await submit('c-clamp-function', 'int clamp(int value,int low,int high){(void)low;(void)high;return value;}');
    assert.equal(result.ok, false);
    assert.ok(result.tests.some(test => !test.passed));
  });
  await t.test('non-terminating function implementation hits the same time limit', async () => {
    const { result } = await submit('c-clamp-function', 'int clamp(int value,int low,int high){(void)value;(void)low;(void)high;for(;;){}}');
    assert.equal(result.ok, false);
    assert.equal(result.tests.length, 1, 'fatal execution failures stop later cases');
    assert.equal(result.tests[0].detail, '시간 제한 초과');
  });
  await t.test('array function rejects zero initialization for an all-negative array', async () => {
    const { result } = await submit('c-array-max-function', '#include <stddef.h>\nint find_max(const int values[],size_t length,int *out_max){if(!values||!length||!out_max)return 0;int maximum=0;for(size_t i=0;i<length;i++)if(values[i]>maximum)maximum=values[i];*out_max=maximum;return 1;}');
    assert.equal(result.ok, false);
    assert.ok(result.tests.some(test => !test.passed));
  });
  await t.test('array function preserves the output object when its contract fails', async () => {
    const { result } = await submit('c-array-max-function', '#include <stddef.h>\nint find_max(const int values[],size_t length,int *out_max){if(out_max)*out_max=0;if(!values||!length||!out_max)return 0;int maximum=values[0];for(size_t i=1;i<length;i++)if(values[i]>maximum)maximum=values[i];*out_max=maximum;return 1;}');
    assert.equal(result.ok, false);
    assert.ok(result.tests.some(test => !test.passed && /예상: 0 77/.test(test.detail)));
  });
  await t.test('array function grader detects output side effects', async () => {
    const { result } = await submit('c-array-max-function', '#include <stddef.h>\n#include <stdio.h>\nint find_max(const int values[],size_t length,int *out_max){puts("debug");if(!values||!length||!out_max)return 0;*out_max=values[0];return 1;}');
    assert.equal(result.ok, false);
    assert.match(result.tests[0].detail, /예상:.*실제:/);
  });
  await t.test('non-terminating array function stops after the first timed-out case', async () => {
    const { result } = await submit('c-array-max-function', '#include <stddef.h>\nint find_max(const int values[],size_t length,int *out_max){(void)values;(void)length;(void)out_max;for(;;){}}');
    assert.equal(result.ok, false);
    assert.equal(result.tests.length, 1);
    assert.equal(result.tests[0].detail, '시간 제한 초과');
  });
  await t.test('string function stops at the terminator and excludes it from the count', async () => {
    const { result } = await submit('c-string-count-function', '#include <stddef.h>\nint count_char(const char *text,char target,size_t *out_count){if(!text||!out_count)return 0;size_t count=0;do{if(*text==target)++count;}while(*text++!=\'\\0\');*out_count=count;return 1;}');
    assert.equal(result.ok, false);
    assert.equal(result.tests[6].passed, false, 'target이 널 문자여도 종료 표시는 내용으로 세지 않아야 합니다.');
  });
  await t.test('string function preserves the output object when text is NULL', async () => {
    const { result } = await submit('c-string-count-function', '#include <stddef.h>\nint count_char(const char *text,char target,size_t *out_count){(void)target;if(out_count)*out_count=0;if(!text||!out_count)return 0;return 1;}');
    assert.equal(result.ok, false);
    assert.ok(result.tests.some(test => !test.passed && /예상: 0 77/.test(test.detail)));
  });
  await t.test('string function grader detects output side effects', async () => {
    const { result } = await submit('c-string-count-function', '#include <stddef.h>\n#include <stdio.h>\nint count_char(const char *text,char target,size_t *out_count){puts("debug");if(!text||!out_count)return 0;*out_count=0;return 1;}');
    assert.equal(result.ok, false);
    assert.match(result.tests[0].detail, /예상:.*실제:/);
  });
  await t.test('non-terminating string function stops after the first timed-out case', async () => {
    const { result } = await submit('c-string-count-function', '#include <stddef.h>\nint count_char(const char *text,char target,size_t *out_count){(void)text;(void)target;(void)out_count;for(;;){}}');
    assert.equal(result.ok, false);
    assert.equal(result.tests.length, 1);
    assert.equal(result.tests[0].detail, '시간 제한 초과');
  });
  await t.test('bounded string function rejects a missing terminator without publishing capacity as a length', async () => {
    const { result } = await submit('c-bounded-string-length', '#include <stddef.h>\nint bounded_length(const char *buffer,size_t capacity,size_t *out_length){if(!buffer||!capacity||!out_length)return 0;size_t i=0;while(i<capacity&&buffer[i]!=\'\\0\')++i;*out_length=i;return 1;}');
    assert.equal(result.ok, false);
    assert.ok(result.tests.some(test => !test.passed && /예상: 0 77/.test(test.detail)));
  });
  await t.test('bounded string function accepts a terminator in the last readable slot', async () => {
    const { result } = await submit('c-bounded-string-length', '#include <stddef.h>\nint bounded_length(const char *buffer,size_t capacity,size_t *out_length){if(!buffer||!capacity||!out_length)return 0;for(size_t i=0;i+1<capacity;++i){if(buffer[i]==\'\\0\'){*out_length=i;return 1;}}return 0;}');
    assert.equal(result.ok, false);
    assert.equal(result.tests[3].passed, false);
  });
  await t.test('bounded string function preserves the output object on every contract failure', async () => {
    const { result } = await submit('c-bounded-string-length', '#include <stddef.h>\nint bounded_length(const char *buffer,size_t capacity,size_t *out_length){if(out_length)*out_length=0;if(!buffer||!capacity||!out_length)return 0;for(size_t i=0;i<capacity;++i)if(buffer[i]==\'\\0\'){*out_length=i;return 1;}return 0;}');
    assert.equal(result.ok, false);
    assert.ok(result.tests.some(test => !test.passed && /예상: 0 77/.test(test.detail)));
  });
  await t.test('bounded string function grader detects output side effects', async () => {
    const { result } = await submit('c-bounded-string-length', '#include <stddef.h>\n#include <stdio.h>\nint bounded_length(const char *buffer,size_t capacity,size_t *out_length){puts("debug");if(!buffer||!capacity||!out_length)return 0;for(size_t i=0;i<capacity;++i)if(buffer[i]==\'\\0\'){*out_length=i;return 1;}return 0;}');
    assert.equal(result.ok, false);
    assert.match(result.tests[0].detail, /예상:.*실제:/);
  });
  await t.test('fgets exercise rejects reading only the first buffer chunk', async () => {
    const { result } = await submit('c-fgets-logical-line', '#include <stdio.h>\n#include <string.h>\nint main(void){char chunk[8];if(!fgets(chunk,sizeof chunk,stdin)){puts("NO INPUT");return 0;}size_t n=strcspn(chunk,"\\n");printf("%zu\\n",n);return 0;}');
    assert.equal(result.ok, false);
    assert.ok(result.tests.some(test => !test.passed && /예상: 8|예상: 26|예상: 20/.test(test.detail)));
  });
  await t.test('fgets exercise excludes the stored newline from the logical length', async () => {
    const { result } = await submit('c-fgets-logical-line', '#include <stdio.h>\n#include <string.h>\nint main(void){char chunk[64];if(!fgets(chunk,sizeof chunk,stdin)){puts("NO INPUT");return 0;}printf("%zu\\n",strlen(chunk));return 0;}');
    assert.equal(result.ok, false);
    assert.equal(result.tests[0].passed, false);
    assert.equal(result.tests[1].passed, false);
  });
  await t.test('fgets exercise stops at the first logical line', async () => {
    const { result } = await submit('c-fgets-logical-line', '#include <stdio.h>\nint main(void){size_t n=0;int ch;while((ch=getchar())!=EOF)if(ch!=\'\\n\')++n;printf("%zu\\n",n);return 0;}');
    assert.equal(result.ok, false);
    assert.equal(result.tests[7].passed, false);
  });
  await t.test('fgets exercise distinguishes immediate EOF from an empty line', async () => {
    const { result } = await submit('c-fgets-logical-line', '#include <stdio.h>\nint main(void){char chunk[8];size_t n=0;while(fgets(chunk,sizeof chunk,stdin)){size_t i=0;while(chunk[i]&&chunk[i]!=\'\\n\')++i;n+=i;if(chunk[i]==\'\\n\')break;}printf("%zu\\n",n);return 0;}');
    assert.equal(result.ok, false);
    assert.equal(result.tests[6].passed, false);
    assert.equal(result.tests[1].passed, true);
  });
  await t.test('strtol exercise rejects atoi because invalid input is not the integer zero', async () => {
    const { result } = await submit('c-strtol-integer-input', '#include <stdio.h>\n#include <stdlib.h>\nint main(void){char line[64];if(!fgets(line,sizeof line,stdin)){puts("NO INPUT");return 0;}printf("%d\\n",atoi(line));return 0;}');
    assert.equal(result.ok, false);
    assert.equal(result.tests[4].passed, false);
    assert.equal(result.tests[6].passed, false);
  });
  await t.test('strtol exercise rejects trailing non-whitespace after the number', async () => {
    const { result } = await submit('c-strtol-integer-input', '#include <stdio.h>\n#include <stdlib.h>\nint main(void){char line[64],*end;if(!fgets(line,sizeof line,stdin)){puts("NO INPUT");return 0;}long value=strtol(line,&end,10);(void)end;printf("%ld\\n",value);return 0;}');
    assert.equal(result.ok, false);
    assert.equal(result.tests[8].passed, false);
    assert.equal(result.tests[9].passed, false);
  });
  await t.test('strtol exercise checks ERANGE instead of printing a clamped value', async () => {
    const { result } = await submit('c-strtol-integer-input', '#include <ctype.h>\n#include <stdio.h>\n#include <stdlib.h>\nint main(void){char line[64],*end;if(!fgets(line,sizeof line,stdin)){puts("NO INPUT");return 0;}long value=strtol(line,&end,10);if(end==line){puts("INVALID");return 0;}while(*end&&isspace((unsigned char)*end))++end;if(*end){puts("INVALID");return 0;}printf("%ld\\n",value);return 0;}');
    assert.equal(result.ok, false);
    assert.equal(result.tests[10].passed, false);
    assert.equal(result.tests[11].passed, false);
  });
  await t.test('strtol exercise rejects a first line longer than its declared buffer policy', async () => {
    const { result } = await submit('c-strtol-integer-input', '#include <errno.h>\n#include <stdio.h>\n#include <stdlib.h>\nint main(void){char line[64],*end;if(!fgets(line,sizeof line,stdin)){puts("NO INPUT");return 0;}errno=0;long value=strtol(line,&end,10);if(errno==ERANGE){puts("RANGE");return 0;}printf("%ld\\n",value);return 0;}');
    assert.equal(result.ok, false);
    assert.equal(result.tests[15].passed, false);
  });
  await t.test('student update preserves the whole object when the requested score is invalid', async () => {
    const { result } = await submit('c-struct-student-score', 'struct Student{int id;int score;};\nint update_score(struct Student *student,int delta){if(!student)return 0;student->score+=delta;if(student->score<0||student->score>100)return 0;return 1;}');
    assert.equal(result.ok, false);
    assert.ok(result.tests.some(test => !test.passed && /예상: 0 105 90/.test(test.detail)));
  });
  await t.test('student update rejects an invalid initial score instead of repairing it', async () => {
    const { result } = await submit('c-struct-student-score', 'struct Student{int id;int score;};\nint update_score(struct Student *student,int delta){if(!student)return 0;if(delta < -student->score || delta > 100-student->score)return 0;student->score+=delta;return 1;}');
    assert.equal(result.ok, false);
    assert.equal(result.tests[6].passed, false);
    assert.equal(result.tests[7].passed, false);
  });
  await t.test('student update changes only the score member', async () => {
    const { result } = await submit('c-struct-student-score', 'struct Student{int id;int score;};\nint update_score(struct Student *student,int delta){if(!student||student->score<0||student->score>100)return 0;if(delta < -student->score || delta > 100-student->score)return 0;student->id+=delta;student->score+=delta;return 1;}');
    assert.equal(result.ok, false);
    assert.equal(result.tests[0].passed, false);
  });
  await t.test('student update grader detects output side effects', async () => {
    const { result } = await submit('c-struct-student-score', '#include <stdio.h>\nstruct Student{int id;int score;};\nint update_score(struct Student *student,int delta){puts("debug");if(!student||student->score<0||student->score>100)return 0;if(delta < -student->score || delta > 100-student->score)return 0;student->score+=delta;return 1;}');
    assert.equal(result.ok, false);
    assert.match(result.tests[0].detail, /예상:.*실제:/);
  });
  await t.test('non-terminating student update stops after the first timed-out case', async () => {
    const { result } = await submit('c-struct-student-score', 'struct Student{int id;int score;};\nint update_score(struct Student *student,int delta){(void)student;(void)delta;for(;;){}}');
    assert.equal(result.ok, false);
    assert.equal(result.tests.length, 1);
    assert.equal(result.tests[0].detail, '시간 제한 초과');
  });
  await t.test('structure array search returns the first duplicate match', async () => {
    const { result } = await submit('c-struct-array-search', '#include <stddef.h>\nstruct Student{int id;int score;};\nint find_student_index(const struct Student students[],size_t count,int target_id,size_t *out_index){if(!students||!count||!out_index)return 0;int found=0;for(size_t i=0;i<count;++i)if(students[i].id==target_id){*out_index=i;found=1;}return found;}');
    assert.equal(result.ok, false);
    assert.equal(result.tests[5].passed, false);
  });
  await t.test('structure array search preserves the output object when no student matches', async () => {
    const { result } = await submit('c-struct-array-search', '#include <stddef.h>\nstruct Student{int id;int score;};\nint find_student_index(const struct Student students[],size_t count,int target_id,size_t *out_index){if(out_index)*out_index=0;if(!students||!count||!out_index)return 0;for(size_t i=0;i<count;++i)if(students[i].id==target_id){*out_index=i;return 1;}return 0;}');
    assert.equal(result.ok, false);
    assert.ok(result.tests.some(item => !item.passed && /예상: 0 77/.test(item.detail)));
  });
  await t.test('structure array search checks index zero', async () => {
    const { result } = await submit('c-struct-array-search', '#include <stddef.h>\nstruct Student{int id;int score;};\nint find_student_index(const struct Student students[],size_t count,int target_id,size_t *out_index){if(!students||!count||!out_index)return 0;for(size_t i=1;i<count;++i)if(students[i].id==target_id){*out_index=i;return 1;}return 0;}');
    assert.equal(result.ok, false);
    assert.equal(result.tests[1].passed, false);
  });
  await t.test('structure array search grader detects output side effects', async () => {
    const { result } = await submit('c-struct-array-search', '#include <stddef.h>\n#include <stdio.h>\nstruct Student{int id;int score;};\nint find_student_index(const struct Student students[],size_t count,int target_id,size_t *out_index){puts("debug");if(!students||!count||!out_index)return 0;for(size_t i=0;i<count;++i)if(students[i].id==target_id){*out_index=i;return 1;}return 0;}');
    assert.equal(result.ok, false);
    assert.match(result.tests[0].detail, /예상:.*실제:/);
  });
  await t.test('non-terminating structure array search stops after the first timed-out case', async () => {
    const { result } = await submit('c-struct-array-search', '#include <stddef.h>\nstruct Student{int id;int score;};\nint find_student_index(const struct Student students[],size_t count,int target_id,size_t *out_index){(void)students;(void)count;(void)target_id;(void)out_index;for(;;){}}');
    assert.equal(result.ok, false);
    assert.equal(result.tests.length, 1);
    assert.equal(result.tests[0].detail, '시간 제한 초과');
  });
  await t.test('multi-file submission validates the file manifest before GCC', async () => {
    const missing = MULTI_FILE_DRAFT_PREFIX + JSON.stringify({ version: 1, files: [
      { name: 'main.c', content: 'int main(void){return 0;}' },
      { name: 'functions.c', content: 'int clamp(int v,int l,int h){return v;}' }
    ] });
    const response = await submit('c-multi-file', missing);
    assert.equal(response.status, 400);
    assert.match(response.result.message, /누락/);
    const duplicate = MULTI_FILE_DRAFT_PREFIX + JSON.stringify({ version: 1, files: [
      { name: 'main.c', content: 'int main(void){return 0;}' },
      { name: 'main.c', content: 'int other(void){return 0;}' },
      { name: 'functions.c', content: '' }, { name: 'functions.h', content: '' }
    ] });
    assert.equal((await submit('c-multi-file', duplicate)).status, 400);
  });
  await t.test('multi-file header and linker failures return compiler diagnostics', async () => {
    const missingHeader = serializeMultiFileSubmission([
      { name: 'main.c', content: '#include "missing.h"\nint main(void){return 0;}' },
      { name: 'functions.c', content: '#include "functions.h"\nint clamp(int v,int l,int h){return v<l?l:v>h?h:v;}' },
      { name: 'functions.h', content: 'int clamp(int,int,int);' }
    ], { requiredNames: ['main.c','functions.c','functions.h'] });
    let response = await submit('c-multi-file', missingHeader);
    assert.equal(response.status, 200);
    assert.equal(response.result.message, '컴파일 실패');
    assert.match(response.result.compileOutput, /missing\.h/);
    assert.equal(response.result.compilerFeedback.code, 'missing-header');
    const missingDefinition = serializeMultiFileSubmission([
      { name: 'main.c', content: '#include "functions.h"\nint main(void){return clamp(1,0,2);}' },
      { name: 'functions.c', content: '#include "functions.h"' },
      { name: 'functions.h', content: 'int clamp(int,int,int);' }
    ], { requiredNames: ['main.c','functions.c','functions.h'] });
    response = await submit('c-multi-file', missingDefinition);
    assert.equal(response.result.message, '컴파일 실패');
    assert.match(response.result.compileOutput, /clamp/);
    assert.equal(response.result.compilerFeedback.code, 'undefined-reference');
    assert.equal(response.result.compilerFeedback.phase, 'link');
    const mismatch = serializeMultiFileSubmission([
      { name: 'main.c', content: '#include "functions.h"\nint main(void){return clamp(1,0,2);}' },
      { name: 'functions.c', content: '#include "functions.h"\nlong clamp(int v,int l,int h){return v<l?l:v>h?h:v;}' },
      { name: 'functions.h', content: 'int clamp(int,int,int);' }
    ], { requiredNames: ['main.c','functions.c','functions.h'] });
    response = await submit('c-multi-file', mismatch);
    assert.equal(response.result.compilerFeedback.code, 'declaration-mismatch');
    assert.match(response.result.compileOutput, /conflicting types/);
  });
  await t.test('unknown exercises and oversized code are rejected', async () => {
    assert.equal((await submit('unknown', 'int main(void){return 0;}')).status, 400);
    assert.equal((await submit('c-hello', 'x'.repeat(25001))).status, 400);
  });
  await t.test('immediate sequential resubmissions never see a stale busy flag', async () => {
    for (let index = 0; index < 8; index++) {
      const response = await submit('c-hello', 'int main(void){ syntax error }');
      assert.equal(response.status, 200);
      assert.equal(response.result.message, '컴파일 실패');
    }
  });
});
