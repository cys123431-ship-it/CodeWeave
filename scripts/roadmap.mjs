import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { lessons } from '../src/catalog.js';
import { exercises } from '../src/exercises.js';
import { gradingExercises } from '../server/grading-exercises.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const order = ['D', 'E', 'F-G', 'C'];
const statuses = new Set(['완료', '진행 중', '미착수']);
const fail = message => { throw new Error(message); };

export function nextTurn(track) {
  const index = order.indexOf(track);
  if (index < 0) fail('unknown track / 트랙');
  return order[(index + 1) % order.length];
}

export function selectUnit(data, track) {
  if (!order.includes(track)) fail('unknown track / 트랙');
  const stages = track === 'F-G' ? ['F', 'G'] : [track];
  return data.stages.filter(stage => stages.includes(stage.id))
    .flatMap(stage => stage.units).find(unit => unit.status !== '완료') ?? null;
}

export function summarize(data) {
  return data.stages.map(stage => {
    const completed = stage.units.filter(unit => unit.status === '완료').length;
    const inProgress = stage.units.filter(unit => unit.status === '진행 중').length;
    const total = stage.units.length;
    return { id: stage.id, title: stage.title, total, completed, inProgress,
      notStarted: total - completed - inProgress,
      percent: Number((100 * completed / total).toFixed(1)) };
  });
}

function evidenceFile(file, prefix) {
  if (typeof file !== 'string' || !file.startsWith(prefix) || file.includes('..') ||
      file.includes('\\') || !existsSync(path.join(root, file))) fail('invalid evidence / 근거: ' + file);
}

export function validateRoadmap(data) {
  if (data.version !== 1 || JSON.stringify(data.stages?.map(stage => stage.id)) !== JSON.stringify([...'ABCDEFGHI'])) fail('stages A-I required');
  if (JSON.stringify(data.rotation) !== JSON.stringify(order)) fail('rotation / 순환');
  if (JSON.stringify(data.limits) !== JSON.stringify({ screenSections: [10, 15], manuscriptLines: 150, gradingCases: [8, 12], maxRuns: 2 })) fail('operating limits / 운영 한도');
  const mapped = data.stages.flatMap(stage => stage.units.flatMap(unit => Array.isArray(unit.lessonIds) ? unit.lessonIds : []));
  if (new Set(mapped).size !== mapped.length) fail('duplicate catalog / 중복');
  const seen = new Set();
  for (const stage of data.stages) {
    if (stage.units.length < 5 || stage.units.length > 12) fail('stage unit budget / 단계 단원 수');
    const ids = new Set();
    for (const unit of stage.units) {
      if (!new RegExp('^' + stage.id + '\\d{2}$').test(unit.id) || ids.has(unit.id) || !unit.title?.trim()) fail('invalid unit');
      ids.add(unit.id);
      if (!statuses.has(unit.status) || !Array.isArray(unit.lessonIds) || !Array.isArray(unit.tests) || !Array.isArray(unit.manuscripts)) fail('invalid state');
      for (const id of unit.lessonIds) {
        if (seen.has(id)) fail('duplicate catalog / 중복: ' + id);
        seen.add(id);
        const lesson = lessons.find(lesson => lesson.id === id);
        const expectedTrack = 'ABC'.includes(stage.id) ? 'c' : stage.id === 'D' ? 'ds' : stage.id === 'E' ? 'algo' : 'FG'.includes(stage.id) ? 'rust' : null;
        if (!lesson || (expectedTrack && lesson.track !== expectedTrack)) fail('catalog mapping: ' + id);
        if (unit.status === '완료' && (!exercises.find(exercise => exercise.id === lesson.challenge.id)?.grader || !gradingExercises.has(lesson.challenge.id))) fail('completed units require graded practice / 채점: ' + id);
      }
      if (unit.status === '완료' && (!unit.lessonIds.length || !unit.tests.length || !unit.manuscripts.length)) fail('completion evidence / 근거');
      if (unit.status === '미착수' && unit.lessonIds.length) fail('existing sample must be in progress');
      unit.tests.forEach(file => evidenceFile(file, 'tests/'));
      unit.manuscripts.forEach(file => evidenceFile(file, 'content/'));
    }
  }
  if (lessons.some(lesson => !seen.has(lesson.id))) fail('unmapped catalog');
  if (selectUnit(data, data.next?.track)?.id !== data.next?.unit) fail('invalid next unit / 다음');
  return true;
}

export function renderRoadmap(data) {
  validateRoadmap(data);
  const out = ['# 통합 교육과정 로드맵 — 확정본', '',
    '| 단계 | 범위 | 완료 | 진행 중 | 미착수 | 완료율 |', '|---|---|---:|---:|---:|---:|'];
  for (const row of summarize(data)) out.push(`| ${row.id} | ${row.title} | ${row.completed}/${row.total} | ${row.inProgress} | ${row.notStarted} | ${row.percent.toFixed(1)}% |`);
  out.push('', `확정일: ${data.confirmedOn}. 상태 원본은 [roadmap.json](roadmap.json)이며 표는 계산 결과다.`,
    `기존 구현 검증 기준: [${data.baseline.slice(0, 7)}](https://github.com/cys123431-ship-it/CodeWeave/commit/${data.baseline}) · [CI](${data.evidenceCI}).`, '',
    '## 상태와 분모의 의미', '',
    '- 완료는 아래에 이름 붙인 제한된 학습 범위의 원고·화면·예제·퀴즈·실제 C 채점 검증이 연결됐다는 뜻이다. C 전체 교과서나 플랫폼 완성이 아니다.',
    '- 진행 중은 기존 샘플이나 일부 경로만 있다는 뜻이다. 채점 없는 Rust·자료구조·알고리즘 샘플은 완료로 세지 않는다.',
    '- 미착수는 이 제목의 독립 학습 단원/실습이 없다는 뜻이다. 관련 개념이 다른 원고에 잠깐 등장해도 완료로 올리지 않는다.',
    '- 단원은 같은 크기의 작업량이 아니다. 단계별 완료율을 플랫폼 전체 완료율로 평균내지 않는다. H·I와 기기 인수 검사를 생략할 수 없다.',
    '- 기존 C 23개와 타 트랙 샘플 3개를 한 번씩만 기본 매핑한다. 여러 실습을 포함한 기존 범위는 한 로드맵 단원으로 묶었으며 교차 참고로 중복 집계하지 않는다.',
    '- 기존 단원의 분량·사례 수는 보존한다. 새 단원 한도는 기존 20사례나 긴 원고를 소급 축소할 근거가 아니다.',
    '- A~I는 범주별 목차다. 실제 학습 순서는 src/exercises.js의 선수 단원 계약을 우선한다. 문자열·배열이 필요한 fgets/strtol은 C 심화에 배치했다. A05는 그와 다른 작은 수치 입력/출력의 독립 연습이며 아직 작성하지 않았다.', '');
  for (const stage of data.stages) {
    out.push(`## ${stage.id}. ${stage.title}`, '', '| ID | 단원 | 상태 | 기존 단원·검증 근거 |', '|---|---|---|---|');
    for (const unit of stage.units) {
      const evidence = [...unit.lessonIds.map(id => '`' + id + '`'),
        ...unit.manuscripts.map(file => `[원고](../${file})`),
        ...unit.tests.map(file => `[검사](../${file})`)].join(' · ') || '—';
      out.push(`| ${unit.id} | ${unit.title} | ${unit.status} | ${evidence} |`);
    }
    out.push('');
  }
  out.push('## v0.x 지원 결정과 다음 실행', '',
    '- C·자료구조·알고리즘·Rust 모두 v0.x의 지원 목표로 유지한다. 현재 실행 가능한 채점은 C뿐이며 Rust 지원 완료를 뜻하지 않는다.',
    '- 기반 정리 0~2단계 종료 후 새 단원은 **D → E → Rust(F~G) → C**로 순환한다. 기반 CI 실패·보안·데이터 손실 회귀 수정은 먼저 처리하되 순환 차례를 소비하지 않는다.',
    `- 다음 차례는 **${data.next.track} / ${data.next.unit}**: ${selectUnit(data, data.next.track).title}다. 해당 단원의 기존 근거와 최근 일지를 읽고 가장 앞선 미완료 인수 조건 하나를 진행한다.`,
    '- E 차례는 E01을 확장한다. C 구조체 정렬·이진 탐색 실습은 선수 예제로 연결하되 알고리즘 트랙 완성으로 중복 집계하지 않는다.',
    '- Rust 첫 작업은 cargo test 채점기 설계다. 입력 스키마·스타터·별도 테스트 하네스·종료 상태·출력·실패/재제출 기록·보안 경계를 먼저 명세한다. 설계만으로 실제 Rust 채점 성공을 표시하지 않는다.',
    '- Rust 채점기 구현 전에는 이론·퀴즈만 있는 단원을 허용하되 실습 통과/전체 숙달은 잠근다. 설계 문서만 작성한 경우 차례를 넘기지 않는다. 이론·퀴즈 범위를 실제 전달·검증한 경우는 그 제한을 일지에 명시하고 C 차례로 갈 수 있지만 로드맵 상태는 진행 중으로 유지한다.',
    '- 새 단원은 화면10~15절·원고150줄 이하·채점8~12사례, 1회(최대2회) 안에 검증 가능한 범위로 작성한다. 초과하면 다음 단원으로 나누되 기존 승인 계약을 몰래 줄이지 않는다.',
    '- 각 단원은 개요·필요성·선수·목표, 핵심 이론, 정적 도식, 단계별 예제/실제 출력/이유, 흔한 오류, 점검·요약·퀴즈, 기초/응용/도전·작은 프로젝트, 테스트/수정/재제출/복습 연결을 갖춘다. 표준 세부 해설은 심화로 분리한다.',
    '- 새 단원 선택 시 선수 개념을 확인한다. 전달 범위를 검증한 뒤에만 상태·근거·다음 차례를 함께 갱신한다. 진행 중이면 같은 좁은 범위를 최대2회 안에 마무리한다. 위 Rust 이론·퀴즈 예외 외에는 미완료를 완료로 간주해 순환하지 않는다.', '',
    '## 갱신·검증 방법', '',
    '1. 최신 CI와 일지를 확인하고 roadmap.json의 상태·근거·next를 실제 결과로 갱신한다. 기존 분모 변경은 이유와 이동된 ID를 일지에 명시한다.',
    '2. `node scripts/roadmap.mjs --render`의 출력을 ROADMAP.md에 반영한다. 교육 문구를 테스트에 맞추는 작업이 아니라 상태 표의 동기화다.',
    '3. `node scripts/roadmap.mjs --check`와 `npm test`로 계산·미채점 완료 방지·중복 집계·누락 매핑·다음 차례를 검사한다.',
    '4. 결과 SHA의 CI 성공 뒤에만 완료를 기록한다. 이론·퀴즈·실습·복습·숙달의 사용자 상태와 개발 로드맵 상태는 별개다.', '',
    '## 플랫폼의 최종 인수 조건', '',
    '- PC·스마트폰·태블릿·PWA에서 이론 → 예제 → 개념 확인 → 코드 작성 → 실제 테스트 → 오류 수정 → 재제출 → 숙달 → 다음 단원이 연결돼야 한다.',
    '- C/Rust 연결 학습과 종합 프로젝트까지 완성하고, 학습자 기록 보존·기존 v1 백업·접근성·실기기 설치·오프라인 복구를 실제 검증한다. CI Chromium 성공을 실기기 성공으로 바꾸어 말하지 않는다.',
    '- AI 멘토 없이 상세한 독자 설명·정적 도식·직접 풀어보는 문제로 배울 수 있어야 한다. 공개 코드 실행 서비스는 이 로드맵의 자동 배포 대상이 아니며 별도 격리 검증과 승인이 필요하다.', '');
  return out.join('\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const data = JSON.parse(readFileSync(path.join(root, 'docs/roadmap.json'), 'utf8'));
  const markdown = renderRoadmap(data);
  if (process.argv[2] === '--render') process.stdout.write(markdown);
  else if (process.argv[2] === '--check') {
    if (readFileSync(path.join(root, 'docs/ROADMAP.md'), 'utf8') !== markdown) fail('ROADMAP.md is out of sync');
    console.log('Roadmap states, evidence and computed table are synchronized.');
  } else fail('use --render or --check');
}
