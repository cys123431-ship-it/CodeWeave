import { lessons } from './catalog.js';
import { DRAFTS_KEY, PROGRESS_KEY, normalizeProgress, safeRead } from './logic.js';
import { ITERATIONS_KEY, MAX_CODE_LENGTH, normalizeIterations } from './iterations.js';
import { recordGradedSubmission, readExerciseDrafts, saveExerciseDraft } from './practice.js';
import { MAX_BACKUP_FILE_SIZE, createFullBackup, parseCodeWeaveBackup, restoreCodeWeaveBackup } from './backup.js';
import { isGradedExercise } from './exercises.js';

const $ = selector => document.querySelector(selector);
const cLessons = lessons.filter(lesson => isGradedExercise(lesson.challenge.id));
const knownIds = cLessons.map(lesson => lesson.id);
const allIds = lessons.map(l => l.id);
const storedDrafts = readExerciseDrafts(localStorage, allIds);
const state = {
  lessonId: knownIds[0],
  drafts: storedDrafts && typeof storedDrafts === 'object' && !Array.isArray(storedDrafts) ? storedDrafts : {},
  iterations: normalizeIterations(safeRead(localStorage, ITERATIONS_KEY, {}), lessons.map(l => l.id)),
  busy: false
};

function persist() {
  try {
    state.drafts = saveExerciseDraft(localStorage, allIds, state.lessonId, state.drafts[state.lessonId]);
    $('#draft-status').textContent = '이 브라우저에 자동 저장되었습니다.';
  } catch {
    $('#draft-status').textContent = '브라우저 저장 공간이 부족합니다. 백업을 내려받으세요.';
  }
}
function currentLesson() { return cLessons.find(l => l.id === state.lessonId); }
function displayExercise() {
  const lesson = currentLesson();
  $('#exercise-title').textContent = lesson.challenge.title;
  $('#exercise-description').textContent = lesson.challenge.description;
  $('#sample-input').textContent = lesson.challenge.input;
  $('#sample-output').textContent = lesson.challenge.expected;
  $('#code-input').value = typeof state.drafts[lesson.id] === 'string' ? state.drafts[lesson.id] : lesson.challenge.starter;
  $('#grade-result').textContent = '코드를 작성한 뒤 로컬 GCC로 채점하세요.';
  displayAttempts();
}
function displayAttempts() {
  const list = $('#attempt-list');
  list.replaceChildren();
  const entries = state.iterations[state.lessonId] ?? [];
  if (!entries.length) {
    const empty = document.createElement('li');
    empty.textContent = '아직 제출 기록이 없습니다.';
    list.append(empty);
    return;
  }
  entries.forEach((entry, index) => {
    const li = document.createElement('li');
    const status = document.createElement('strong');
    status.className = entry.passed ? 'wb-pass' : 'wb-fail';
    status.textContent = entry.passed ? '✓ 통과' : '× 미통과';
    const date = document.createElement('time');
    date.dateTime = entry.at;
    date.textContent = new Date(entry.at).toLocaleString('ko-KR');
    const info = document.createElement('p');
    info.textContent = entry.message || '채점 결과 저장됨';
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'secondary';
    button.textContent = '이 제출 코드 복원';
    button.addEventListener('click', () => {
      if ($('#code-input').value !== entry.code && !confirm('현재 작성 중인 코드를 이전 제출 코드로 교체할까요?')) return;
      state.drafts[state.lessonId] = entry.code;
      $('#code-input').value = entry.code;
      $('#grade-result').textContent = '이전 제출 코드를 복원했습니다. 다시 채점하면 새 제출 기록이 만들어집니다.';
      persist();
    });
    li.append(status, date, info, button); list.append(li);
  });
}
async function grade() {
  if (state.busy) return;
  state.busy = true;
  $('#grade-code').disabled = true;
  $('#lesson-select').disabled = true;
  const id = state.lessonId;
  const code = $('#code-input').value;
  state.drafts[id] = code; persist();
  $('#grade-result').textContent = '로컬 GCC 서버에서 컴파일하고 테스트하는 중...';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch('./api/grade', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({exerciseId:id,code}), signal:controller.signal
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const result = await response.json();
    state.iterations = recordGradedSubmission(localStorage, lessons.map(l => l.id), id, code, result);
    persist();
    $('#grade-result').textContent = [
      result.ok ? '✓ 모든 테스트 통과' : '× 채점 미통과', result.message || '',
      ...result.tests.map((test, index) => '테스트 '+(index+1)+': '+(test.passed ? '통과' : '실패')+' — '+(test.detail||'')),
      result.compileOutput || ''
    ].filter(Boolean).join('\n');
    displayAttempts();
  } catch (error) {
    $('#grade-result').textContent = '채점 실패: 개인 PC에서 GCC와 Node.js를 설치하고 npm start로 실행했는지 확인하세요.\n' + error.message;
  } finally {
    clearTimeout(timer);
    state.busy = false;
    $('#grade-code').disabled = false;
    $('#lesson-select').disabled = false;
  }
}
function downloadHistory() {
  state.iterations = normalizeIterations(safeRead(localStorage, ITERATIONS_KEY, {}), allIds);
  state.drafts = readExerciseDrafts(localStorage, allIds);
  const data = createFullBackup({
    progress: normalizeProgress(safeRead(localStorage, PROGRESS_KEY, {})),
    drafts: state.drafts, iterations: state.iterations
  }, allIds);
  const url = URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
  const a = document.createElement('a');
  a.href = url; a.download = 'codeweave-full-backup.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function importHistory(file) {
  if (!file) return;
  if (file.size > MAX_BACKUP_FILE_SIZE) { alert('백업 파일이 너무 큽니다(최대 5MB).'); return; }
  try {
    const input = JSON.parse(await file.text());
    const parsed = parseCodeWeaveBackup(input, { knownIds: allIds, attemptIds: knownIds });
    const label = parsed.format === 'full' ? '통합 백업' : parsed.format === 'legacy-progress' ? '기존 진도 백업' : '기존 제출 이력 백업';
    if (!confirm(label + '을 복원하면 해당 범위의 현재 기록을 교체합니다. 계속할까요?')) return;
    const data = restoreCodeWeaveBackup(localStorage, input, { knownIds: allIds, attemptIds: knownIds });
    state.drafts = data.drafts;
    state.iterations = data.iterations;
    displayExercise();
    $('#draft-status').textContent = label + '을 복원했습니다.';
  } catch (error) { alert('백업 복원 실패: ' + error.message); }
}
function init() {
  for (const lesson of cLessons) {
    const option = document.createElement('option');
    option.value = lesson.id; option.textContent = lesson.title;
    $('#lesson-select').append(option);
  }
  $('#lesson-select').addEventListener('change', event => {
    state.drafts = readExerciseDrafts(localStorage, allIds);
    state.lessonId = event.target.value;
    displayExercise();
  });
  $('#code-input').maxLength = MAX_CODE_LENGTH;
  $('#code-input').addEventListener('input', event => {
    state.drafts[state.lessonId] = event.target.value.slice(0, MAX_CODE_LENGTH);
    persist();
  });
  $('#code-input').addEventListener('keydown', event => {
    if (event.key === 'Tab' && !event.shiftKey) {
      event.preventDefault();
      const el = event.target;
      el.setRangeText('    ', el.selectionStart, el.selectionEnd, 'end');
      el.dispatchEvent(new Event('input'));
    }
  });
  $('#grade-code').addEventListener('click', grade);
  $('#reset-code').addEventListener('click', () => {
    if (!confirm('현재 코드를 처음 상태로 되돌릴까요?')) return;
    state.drafts[state.lessonId] = currentLesson().challenge.starter;
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(state.drafts));
    displayExercise();
  });
  $('#export-history').addEventListener('click', downloadHistory);
  $('#import-history').addEventListener('click', () => $('#import-file').click());
  $('#import-file').addEventListener('change', async event => {
    await importHistory(event.target.files?.[0]); event.target.value = '';
  });
  displayExercise();
}
window.addEventListener('storage', event => {
  if (event.key === DRAFTS_KEY || event.key === null) {
    const activeCode = $('#code-input').value;
    state.drafts = readExerciseDrafts(localStorage, allIds);
    state.drafts[state.lessonId] = activeCode;
  }
  if (event.key === ITERATIONS_KEY || event.key === null) {
    state.iterations = normalizeIterations(safeRead(localStorage, ITERATIONS_KEY, {}), lessons.map(l => l.id));
    displayAttempts();
  }
});
init();
