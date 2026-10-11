import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { recordGradedSubmission } from '../src/practice.js';
import { ITERATIONS_KEY } from '../src/iterations.js';
import { lessons } from '../src/catalog.js';
import { gradingExercises } from '../server/grading-exercises.mjs';

const gccAvailable = spawnSync('gcc', ['--version']).status === 0;
test('local GCC API compiles whole-program and function-only C exercises', { skip: !gccAvailable, timeout: 40000 }, async t => {
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
    'c-clamp-function': 'int clamp(int value,int low,int high){if(value<low)return low;if(value>high)return high;return value;}'
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
