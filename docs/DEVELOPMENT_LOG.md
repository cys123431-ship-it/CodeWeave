AUTONOMOUS_DEVELOPMENT.md 현재 단계: 1단계 진행 중 확인함
## 2026-10-14 21:56 시작 / 22:28 재개 KST — 1-2 제출 실행 자원 제한
- 시작/결과 SHA: 시작 793418b041332641f933918e89320acb85c3c8aa; 결과는 반영 뒤 조회. 제목 fix: budget submitted C processes and terminate their groups.
- 목표: POSIX 별도 그룹 종료와 CPU/가상 메모리/파일/프로세스 예산을 적용하고 정상 제출·재제출을 보존.
- 변경 파일 수: 6개(실행 모듈·서버 연결·자원 회귀 검사·README 제한·macOS CI·일지).
- 테스트 결과: 초기 신규10건4/10→10/10; 추가 soft 제한 보존0/1→1/1, SIGXFSZ 표시0/1→1/1; 최종11/11·전체307/307·실패/skip0, 변경3 JS/MJS 문법·커밋범위diff 확인. 로컬 UI는 기존 Chromium 부재로 미실행.
- CI URL과 결과: https://github.com/cys123431-ship-it/CodeWeave/actions/runs/38570368443 및38570963445의 Linux307/307·browser success, macOS0/11 failure. 수정 SHA의 세 CI는 반영 후 재조회, 완료 아님.
- 발견한 문제: 기존 별도 그룹/유한 예산 없음; 상속 soft 예산을 올리는 오류와 신호 null 표시 재현·수정. fork 검사3건은 이 로컬 환경에서 수정 전에도 통과했으며 실패로 꾸미지 않음.
- 구현: 벽시계1.3초·출력각30000바이트, CPU2초/파일당2MiB/UID 프로세스Linux128/macOS512개; Linux AS64MiB, macOS AS기동 매핑+64MiB. 시간·출력 초과와 정상 종료에도 그룹 SIGKILL, 제한 설정 실패 시 실행하지 않음.
- 검사 수정 이유: macOS VM초기435299648KiB로64MiB EINVAL→기동+64MiB 예산 대조; UID128에서fork 반환9→macOS512, Apple 헤더의 NPROC는 Darwin 확장 선언으로 검사. CPU는빈번한 clock 호출 대신배치 연산, 신호/할당96MiB 실패 기대는 유지.
- 보안 영향: 고정 Bash 스크립트에 실행 경로/인수를 argv로 전달하고 startup 환경을 제거; 더 엄격한 상속 soft/hard 보존. Linux UID0에서는 NPROC가 강제되지 않아 설정값만 검증, 일반 계정 사용을 README에 명시.
- 단계별 완료율: 0단계3/3, 1단계1/6(1-2 CI 대기), 2단계0/6; 신규 단원·문제와 저장 형식 변경 없음.
- 다음 작업: macOS 실제 제한·Linux 전체·브라우저 결과 SHA CI 확인 후 1-2 상태 기록; 성공하면1-3 전체 사례/미실행 표시를 실패 검사부터 구현.

---
AUTONOMOUS_DEVELOPMENT.md 현재 단계: 1단계 진행 중 확인함
## 2026-10-14 21:03 시작 / 21:18 KST 검증 — 1-1 로컬 채점 요청 차단
- 시작/결과 SHA: 시작 ed87b1ed16d9201102926edabae8df5be7c6e344; 검증 결과 e581a6d8b4234ea02f47dfa15f15a567e03f63c3(보안 ad10d5c). 최종 공백 수정 제목 fix: clean security regression file ending(자기 SHA는 반영 뒤 조회).
- 목표: JSON/Host/Origin/토큰 검증을 GCC·임시 디렉터리 생성보다 앞에 두고 두 화면의 정상 채점·PWA 캐시를 보존.
- 변경 파일 수: 9개(서버·두 제출 화면·SW·API/정적/브라우저 검사·신규 보안 검사·일지).
- 테스트 결과: 신규20건 기존 HEAD 2/20→수정 후20/20; 로컬/CI 전체296/296·실패/skip 0; 변경8 JS/MJS 문법·diff 성공. 로컬 Chromium 부재로 UI는 CI에서 실행, 실제 제출/재제출·백업·390px·오프라인 재로드 성공.
- CI URL과 결과: https://github.com/cys123431-ship-it/CodeWeave/actions/runs/38563071589 — 후속 결과 e581a6d test/browser success; 보안 ad10d5c의 run38562711250도296/296·실제 브라우저PASS 확인 후 완료 기록.
- 발견한 문제: 필수4 거부 요청이 실제 GCC까지 실행됨; 캐시의 토큰 제거 및 늦은 캐시 열기/본문 선소비 실패1건 재현·수정. 최종 커밋범위diff 검사에서 신규 파일EOF 빈줄로 exit2 발생하여 제거·재검사.
- 검사 수정 이유: HTML은 동적 토큰만 제거해 원본 보존/실제 HEAD 길이를 검사하고 기존 API 검사는 유효 토큰을 추가; 중복 Host는 raw 헤더로 전송하고 HTTP 파서의400/서버403 조기 거부를 허용.
- 보안 영향: 외부 POST 입력은 저장/실행 전에 거부; 정적 요청 Host도 검사해 rebinding 토큰 노출을 막고 시작별256비트 토큰은 저장·로그·백업하지 않음.
- 단계별 완료율: 0단계3/3·이번 첫 줄로 실제 적용 확인; 1단계1/6(1-1 완료), 2단계0/6. 전체 플랫폼 완료율은 아님; 새 단원/문제 추가 없음.
- 다음 작업: 1-2 detached 프로세스 그룹·CPU/메모리/파일/프로세스 제한, fork/sleep 잔존·malloc 제한 실패 검사부터 작성.

---
AUTONOMOUS_DEVELOPMENT.md 현재 단계: 1단계 진행 중 확인함
## 2026-10-14 20:47 KST — 0-3 반영 확인과 1단계 전환
- 시작/결과 SHA: 지침 결과 2767e36b29af638ac9152f26d28bad7f02cc644e 확인; 후속 결과는 반영 뒤 조회. 제목 docs: confirm policy rollout and advance to security stage.
- 목표: 지침·예약·첫 줄 확인 계약의 반영을 검증하고 다음 항목을 1-1로 고정.
- 변경 파일 수: 2개(현재 단계·인수인계); 이번 운영 규칙 반영의 고유 변경 파일은 총3개.
- 테스트 결과: 지침 4/4·전체276/276 성공; 단계만 바꾼 중간 검사3/4로 첫 줄 불일치 재현 후 표식 수정, 후속 전체276/276·실패/skip 0 재확인.
- CI URL과 결과: https://github.com/cys123431-ship-it/CodeWeave/actions/runs/38558859232 결과 SHA test/browser 성공; 후속 SHA는 반영 후 별도 조회.
- 발견한 문제: 현재 단계와 일지 첫 줄이 달라질 수 있어 검사로 차단; 예약의 짧은 지시문은 재조회 일치, 기존 일정/활성 유지.
- 단계별 완료율: 0단계 설정3/3 확인; 1단계0/6·2단계0/6. 다음 예약이 실제 남길 확인 문장은 아직 실행 전.
- 보안 영향: 외부 입력·코드 실행·파일 허용 목록 변경 없음; 보안 수정 완료로 보고하지 않음.
- 다음 작업: 1-1 CSRF/DNS rebinding; 네 거부 요청의 GCC/임시 디렉터리 미발생을 검사한 뒤 구현.
- 이후 실행: 이 파일을 먼저 읽고 첫 줄 확인 문장을 실제 일지에 남겨야 규칙 적용으로 인정.

---
AUTONOMOUS_DEVELOPMENT.md 현재 단계: 0단계 진행 중 확인함
## 2026-10-14 20:37 KST — 0단계 새 운영 규칙 저장
- 시작/결과 SHA: 시작 a6a540f6086a6a6f278beaf24c99620c7916e8a2; 결과는 반영 뒤 조회. 커밋 제목 docs: establish staged development policy.
- 목표: 최신 사용자 지시를 영구 지침으로 저장하고 예약을 해당 파일 우선으로 연결.
- 변경 파일 수: 3개(지침·일지·필수 운영 구조 검사); 기존 코드·문제 변경 없음.
- 테스트 결과: 기준선 272/272; 정책 검사 수정 전 0/4→수정 후 4/4; 전체 276/276, 실패/skip 0; 문법/diff 검사 성공.
- CI URL과 결과: 결과 SHA의 새 실행은 반영 후 조회하며 현재 검증 대기.
- 발견한 문제: 기존 지침에 현재 단계·고정 순서·첫 줄 계약이 없었음; 대체 규칙 9건 명시. 예약은 요청한 짧은 지시문으로 갱신/재조회 일치, 일정·활성 상태 유지.
- 보안 영향: 실행 API/외부 입력/파일 허용 목록은 바꾸지 않음; 1-1의 차단 구현은 다음 항목.
- 단계별 완료율: 0단계 반영 검증 대기; 1단계 0/6, 2단계 0/6. 확정 A~I 분모는 2-6에서 결정.
- 다음 작업: 0단계 원격 지침·예약 재조회·CI 확인 후 현재 단계를 1단계로 전환하고 1-1부터 실행.

---
# CodeWeave 개발 일지

## 2026-10-14 17:04 시작 / 20:04~20:18 KST 후속 검증 — 다차원 배열의 행·열 계약과 실패 보존

- 시작 SHA: `93f99c240f6a7c84645c826fc2c0ae78e75bba2b` (`main`, tree `d79c3ef9341cc77bd1be2b780f2a10bd411a50c3`). 실제 GitHub 읽기·새 clone HEAD/tree·origin/main이 일치했고 시작 작업 트리는 깨끗했다. 필수 여섯 문서·최신 일지·관련 소스/검사·CI를 읽었다. 이전 체크아웃은 덮어쓰지 않았다. 시작 및 후속 조회의 열린 PR은 0개, 기존 Actions #57 `38531195099`는 success다. 20:17 재조회도 같은 HEAD였으며 이 기록의 시간 범위를 연속 실행이나 중간 시각의 완료로 해석하지 않는다.
- 목표/성공 조건: 최신 일지의 다차원 배열 작업을 고정 3열·0..4행의 의미 있는 작은 단원으로 완성한다. 20절 이상 이론·원고·독자 정적 SVG·두 완성 프로그램·코드 조각·퀴즈·함수형 실습을 연결하고 행/열 경계·초기화·행 우선·행 포인터/int **·C11 qualifier·빈 범위·실패 보존·미사용 출력·반복 호출을 검증한다. 기존 25개 단원/공개 정의·22개 서버 채점 정의·진도/초안/제출/백업 v1·정적 허용 목록은 그대로 유지한다.
- 테스트 우선: 신규 tests/matrix-rows-content.test.mjs의 첫 9건은 구현 전 1/9 성공·8건 예상 실패였다. GCC의 형/qualifier 컴파일 제약 검사만 이미 통과했고 새 단원·도식·원고·채점 정의의 부재를 확인했다. 이후 선언 코드 조각 검사 1건을 추가해 최종 표적은 10/10이다.
- 콘텐츠/구현: src/catalog.js에 c-matrix-row-sums의 26절·약 75분·퀴즈·함수 스타터를 추가했다. content/c/21-matrix-row-sums.md는 247줄 독립 원고로 필요성/선수/목표·깊은 이론·도식 읽기·두 완성 예제/출력 이유·예제 가까이 변형 실습·오류/점검/요약/퀴즈·세 수준 연습·센서 기록 Mini Project·테스트/복습을 연결한다. src/figures.js의 340×440 세로 SVG는 두 행 객체·세 열·합 6/15·열 [3] 금지·int ** 차이를 표시하며 애니메이션은 없다.
- 실습/서버: src/exercises.js에 Practice·선수 c-array-max-function·공개 예시를 등록했다. server/grading-exercises.mjs에는 별도 번역 단위 하네스와 20개 사례를 추가한다. sum_rows3는 0행이면 접근 없이 1, 1..4행이면 각 원소 ±10000을 검사해 long 합을 임시 저장한 뒤 사용 행만 공개한다. 크기/NULL/원소 오류는 0과 전체 출력 보존이다. 공개 하네스의 77 초기값·상태+네 출력 관찰 형식과 설명용 호출 표기가 C 소스가 아님을 명시했다.
- 검사 파일: tests/matrix-rows-content.test.mjs가 원고/화면 일치·형 경계·두 예제·두 조각·스타터·20개 사례를 실제 GCC로 확인한다. tests/grader-api.test.mjs에는 참조 풀이와 여섯 오답(마지막 열/행 누락, 검증 전 출력, 미사용 칸 변경, 빈 범위 거부, 범위 오류 허용)을 추가했다. tests/exercises.test.mjs·tests/exercise-audit.test.mjs는 23개 실제 채점 정의와 공개 예시/감사 표를 대조한다.
- 브라우저/PWA: tests/browser-practice.mjs는 26절·실제 잘못된 조기 공개→수정→재제출·이력 2회·이론/퀴즈/전체 숙달·390px 문서/SVG 경계·최소 표시 글자 크기 11.5 CSS px·오프라인 재로딩·matrix-rows-mobile.png 경로를 추가했다. sw.js는 기존 자산 목록을 유지하고 shell v34다. 이 레이아웃 회귀 기준은 접근성 인증이나 실기기/PWA 설치를 대신하지 않는다.
- 변경 범위: 신규 원고/검사 2개와 기존 15개, 총 17개 파일이다. README·ROADMAP·ARCHITECTURE·CONTENT_POLICY·C_EXERCISE_AUDIT·이 일지에 현재 범위·출처·검사·한계·다음 목표를 반영한다. dev-server.mjs·정적 허용 목록·기록 저장 구현·CodeStep·외부 서비스는 변경하지 않는다.
- 실제 최종 검사: npm test 272/272 성공·실패/skip 0, 표적 10/10, 메타데이터/감사 표적 7/7 성공. C 23문제·229개 채점 사례와 신규 여섯 오답 거부를 실제 loopback GCC API로 검증했다. A/B·두 선언 조각·함수 참조·스타터는 -std=c11 -Wall -Wextra -Werror -Wpedantic으로 경고 없이 컴파일했다. 열 폭 불일치/int **/pre-C23 qualifier 잘못된 소스는 -c 실패만 확인하며 실행하지 않았다. 변경 JS/MJS 10개 node --check와 git diff --check 성공. 시작 SHA 모듈을 직접 불러와 기존 25개 단원/공개 정의·22개 채점 정의를 deepEqual로 전부 대조했다.
- 발견/재수정: 첫 표적 15/16의 실패는 새 감사 행 미등록(22≠23)이었고 표/정의를 동기화했다. 공개 예시 설명 문자열도 실제 입력과 맞췄다. API 표적의 초기 98/105는 존재하지 않는 compiler 응답 필드 참조로 새 여섯 검사와 상위 검사가 실패한 것이며 실제 응답의 ok/tests/compileOutput으로 수정했다. 이어 전체 269/271은 가드 값 변경 오답에서 서버가 비정상 종료(72)로 3번째 사례 후 중단하는 기존 동작을 “항상 20개 반환”이라고 가정한 검사 오류였다. 필요한 실패 사례 존재·컴파일 원문 비어 있음·ok=false로 수정한 뒤 271/271, 선언 조각 추가 후 272/272를 재확인했다. 18시 후속의 경로 변수 미설정은 undefined 경로 patch 읽기 실패로 파일을 변경하지 않았고 실제 경로/소스에서 상태를 다시 복원해 진행했다. 제품 장애나 원격 쓰기 실패로 오인하지 않는다.
- 로컬 UI 한계: npm run test:browser의 선행 C 23문제 API는 모두 성공했으나 browserType.launch: Executable doesn't exist at /root/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell 때문에 화면 단계는 실행하지 못했다. 새 실제 Chromium CI·390px·오프라인·이미지 재검토는 반영 뒤 확인해 보고서에 남긴다. DOM/API/HTTP 성공을 화면 E2E로 주장하지 않는다.
- C 의미/보안 검토: 실제 행/출력 객체의 크기·수명·쓰기 가능성·입출력 비중첩은 호출자 전제이며 NULL만으로 증명하지 않는다. ±30000은 최소 int 범위에도 들어가므로 long이 꼭 필요하다고 설명하지 않는다. C11 const 행 포인터 변환은 평범한 int *의 qualifier 추가와 구분하며 C23에 일반화하지 않는다. GCC 공식 문서 https://gcc.gnu.org/onlinedocs/gcc/Pointers-to-Arrays.html 를 조회하고 엄격 C11 제약과 대조했다. N1570 재조회는 Timeout fetching 오류여서 이번 원문 읽기 성공으로 기재하지 않는다. 유한 가드/결과 검사는 임의 포인터 안전성·악성 제출 격리를 증명하지 않으며 기존 loopback 신뢰 개인 C 실행 경계를 유지한다.
- PDF 실제 접근: 별도 완전한 원본의 pdfinfo를 다시 확인해 Express 87,753,393바이트·750쪽/K&R 6,838,054바이트·288쪽을 확인했다. 렌더링/육안 읽기 범위는 Express 10.6 시작(물리 432/인쇄 430쪽), K&R 5.7 시작(물리 124/인쇄 110쪽)의 도입부다. pdftotext의 빈 결과는 스캔 파일 특성이며 전체 절/책 완독이나 본문 대조로 보고하지 않는다. 원고·코드·문제·SVG는 독립 작성이고 PDF·상용 예제·캡처는 Git/사이트에 없다. 검토용 PNG 두 개만 제거했으며 원본은 보존하고 파생물은 재생성 가능하다.
- 커밋/반영: 제목은 `feat: add matrix row contract and boundary practice`다. 최신 main 확인 뒤 기존 base tree를 보존한 GitHub atomic blob/tree/commit과 expected-SHA 비강제 ref 갱신을 사용한다. 로컬 검증본과 모든 blob/전체 tree를 대조한다. 아직 모르는 자신의 SHA는 기입하지 않으며 실제 결과 SHA·원격 HEAD/새·기존 파일·CI/이미지는 반영 후 보고한다. GitHub 저장을 실제 호스팅/공개 실행 배포로 보고하지 않는다.
- 미완료/다음 작업: 다음은 C 파일 스트림의 열기/닫기·수명·EOF/오류 구분·읽기 결과 공개를 작은 단원으로 집필하고 tmpfile 기반 독립 예제/경계 검사를 연결한다. 임의 사용자 경로를 호스트에서 실행하는 공개 API는 만들지 않는다. 가변 열/VLA·포인터 배열·자료구조/알고리즘 전체 과정·Rust/Cargo/test·실제 Windows/Android/태블릿/PWA 설치·공개 실행 격리는 후속이다.
- 분야 상태: 통합 백업/숙달 분리/정적 제한은 보존, C 23문제(입출력 8·함수 13·다중 파일 2)·229사례/전체 공개 정의·퀴즈 26개/shell v34다. 다차원 배열 입문을 추가했지만 전체 교과서 완성도/근거 없는 완료율은 계산하지 않는다.

---


## 2026-10-14 16:29 KST — 재귀 입문과 범위·반복 호출 팩토리얼 실습

- 시작 SHA: `c30332a57264aa9cb6a13b9abbdc8cceaafc26d6` (`main`, tree `20886acee0ce813fa3d0144af8ce3811073f64ac`). GitHub branches/main의 실제 읽기·새 clone HEAD/tree가 일치하고 새 작업 트리는 깨끗했다. 앞선 체크아웃은 status만 읽어 보존했다. 열린 PR 0개, 시작 SHA의 Actions #56 `38528231217`은 test·browser 모두 성공이다. 필수 여섯 문서·최신 일지·공개/비공개 채점 정의·카탈로그·도식·검사·CI를 읽었다. 기준선 npm test 240/240, 실패/skip 0. 변경 뒤 재조회한 main도 같은 SHA다.
- 목표/성공 조건: 최신 일지의 다음 작업인 재귀를 독립 단원으로 구현한다. 종료 조건·진행 척도·호출별 자동 상태·공유 static 상태·수치/깊이 계약을 20절 이상, 독자 정적 SVG, 두 컴파일 가능한 완성 예제, 함수형 스타터·선수·퀴즈·반복 제출과 연결한다. 0..12 전체와 범위/NULL·실패 보존·같은/다른 객체 반복을 실제 GCC로 검사하고 기존 24개 단원과 21개 채점 정의는 그대로 유지한다.
- 테스트 우선: 신규 tests/recursion-content.test.mjs 8건을 먼저 작성했다. 구현 전 0/8 성공·8건 예상 실패로 단원/도식/원고/계약/예제가 없는 상태를 재현했다. 구현 뒤 8/8, metadata·audit 포함 표적 15/15가 성공했다. 기능 테스트로 구현이 재귀인지 증명할 수 없으므로 재귀 사용 정규식 강제는 넣지 않고 올바른 반복형도 승인한다.
- 콘텐츠/구현: src/catalog.js에 c-recursion-factorial 25절·약 70분·독립 퀴즈/함수형 스타터를 추가하고 content/c/20-recursion-factorial.md에 251줄 원고를 작성했다. 종료/감소·호출별 상태·0!=1·복귀 곱셈·unsigned long 최소 보장·최대 13개 논리적 helper 활성 호출·실패 뒤 출력 보존·꼬리 호출 비보장·재귀/반복 비교·오류·점검·세 단계 연습·Mini Project·테스트·복습을 연결한다. src/figures.js의 340×460 세로 SVG는 n=3→2→1→0과 역순 반환 1→1→2→6을 표시한다. 물리 스택/주소/프레임 배치를 보장하거나 애니메이션을 만들지 않는다.
- 채점/파일: src/exercises.js에 c-clamp-function/c-pointer를 선수로 갖는 공개 메타데이터만 추가한다. server/grading-exercises.mjs는 기존 c-function 경로에 20개 사례·별도 main 하네스만 등록한다. 13개 허용 n 전수·13·UINT_MAX·세 NULL 경계·같은 객체 5→0→12→3→13·서로 다른 객체를 검사한다. ULONG_MAX sentinel은 기호 비교로 관찰한다. dev-server.mjs·정적 파일 허용 목록·진도/초안/iteration/백업 v1 구현은 수정하지 않는다. 원고는 HTTP로 공개하지 않는다.
- 검증 파일: 신규 콘텐츠 검사와 tests/grader-api.test.mjs의 다섯 오답 회귀(기준값 0·실패 전 출력 덮어쓰기·static 누산 공유·13 허용·디버그 출력), 올바른 반복형 승인, 참조 풀이를 추가했다. 공유 누산 오답은 단독 18개 사례는 통과하고 두 반복/독립 객체 시나리오만 실패한다. tests/exercises.test.mjs·tests/exercise-audit.test.mjs는 22문제 목록과 감사 행을 갱신했다. tests/browser-practice.mjs는 잘못된 공유 상태→수정→두 이력→이론/퀴즈→숙달·25절·390px/SVG 경계와 최소 11.5 CSS px 글자·오프라인·CI 그림 경로를 추가했다. GCC 성공 로그는 고정 영어 개수 대신 실제 풀이 개수로 출력하도록 재검토했다. sw.js는 자산 목록을 유지한 shell v33이다.
- 검사 결과: 전체 npm test 255/255 성공·실패/skip 0. API 표적 98/98, 콘텐츠/metadata/audit 15/15가 통과했다. A/B·함수 부분·스타터와 별도 하네스는 -std=c11 -Wall -Wextra -Werror -Wpedantic에서 경고 없이 컴파일했다. A의 5·0·12·13/NULL 상태·출력과 B의 enter 3→0/leave 0→3·결과 6을 대조했다. 전체 C 22문제·209개 사례를 GCC API로 검사했다. 변경 JS/MJS 10개 node --check·git diff --check 성공. 새로운 내용이 없는 기존 24개 lesson 전체·quiz/challenge·공개 메타데이터와 21개 private grader 전체를 시작 SHA의 모듈과 deepEqual로 비교해 동일함을 확인했다.
- 로컬 UI 한계: npm run test:browser의 선행 실제 GCC API 22문제는 성공했으나 browserType.launch: Executable doesn't exist at /root/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell로 화면 단계가 중단됐다. 반영 뒤 실제 Chromium CI와 생성된 이미지에서 새 시나리오를 확인한다. 현재까지 DOM/HTTP/API 성공을 브라우저 성공으로 주장하지 않으며 실제 Windows·Android·iPad/PWA 설치는 별도 미검증이다.
- 출처 확인: 두 완전한 제공 원본을 재조회/접근했다. Express 87,753,393 bytes·750쪽의 목차 물리 13/인쇄 11쪽에서 9.8 순환 호출을 확인하고 해당 시작 물리 389/인쇄 387쪽을 읽었다. K&R 6,838,054 bytes·288쪽의 4.10 Recursion 물리 100~101/인쇄 86~87쪽을 읽었다. 부분 확인이며 두 책 전체 완독/대응표 완성은 아니다. 원고/문제/도식/코드는 먼저 독립 작성했고 본문·상용 코드/문제·캡처를 복제하지 않았다. C11 위원회 초안 N1570(https://www.open-std.org/jtc1/sc22/wg14/www/docs/n1570.pdf)의 수치 최소 보장·호출별 자동 객체·직접/간접 재귀 의미를 별도 검토했다. 임시 PDF 렌더링 파생물은 검토 후 제거하며 원본은 유지한다.
- 문서/재검토: README·ROADMAP·ARCHITECTURE·CONTENT_POLICY·C_EXERCISE_AUDIT·이 일지에 22개 C/25개 공개 정의/209개 GCC 사례와 재귀 입문·현재 source 접근·후속 범위를 반영한다. 생성 2개/수정 15개, 총 17개 파일이다. 공개 정의·감사 행 순서, 원고와 화면 두 프로그램의 동일성·전체 기존 정의 보존을 확인했다. 함수형 반환은 정확한 1/0이며 비NULL 포인터는 유효한 쓰기 객체라는 전제를 숨기지 않는다. 시간 제한·유한 사례·NULL 검사로 실행 격리나 모든 포인터 안전성을 주장하지 않는다.
  신규 원고를 stage한 뒤 git diff --cached --check가 EOF의 추가 빈 줄을 검출했다. 그 빈 줄만 제거하고 재검사에 성공했으며 실제 원고는 251줄이다. 검토용 PDF PNG 29개는 제거했고 원본은 그대로 유지하므로 파생물은 재생성할 수 있다.
- 커밋/반영: 제목은 `feat: add bounded recursion factorial practice`다. 기존 base tree를 보존하는 GitHub blob/tree/commit와 expected-SHA 비강제 main ref 갱신을 사용한다. 각 blob/전체 tree와 로컬 검증본을 대조하고 ref 갱신 직전 최신 HEAD를 다시 조회한다. 자신의 SHA는 미리 넣지 않고 반영 뒤 실제 HEAD·파일·CI SHA/URL을 보고서에서 확인한다. GitHub 저장을 웹 호스팅/공개 실행 서버 배포로 보고하지 않는다.
- 미완료/위험: 이 단원은 재귀 기초이지 트리/백트래킹/분할 정복 전체 과정이나 종합 C 교과서 완성이 아니다. 함수 기능 채점은 재귀 구현 여부·물리 스택 사용·꼬리 최적화·복잡도를 증명하지 않는다. dev-server.mjs는 loopback의 신뢰하는 개인 C만 실행하는 비격리 도구다. Rust/Cargo 채점·실기기/설치형 PWA·공개 실행 격리는 후속이다. 외부 서비스/보안 설정/CodeStep/사용자 데이터는 변경하지 않는다.
- 다음 작업: 다차원 배열을 행·열의 객체/함수 매개변수 계약·초기화·행 우선 순회·행/열 경계로 제한한 작은 독립 단원으로 확장한다. 실제 일지·CI를 먼저 재조회하며 기존 배열 최댓값/재귀 단원·기록 형식은 유지한다. 자료구조/알고리즘의 재귀 트리·백트래킹은 깊이·진행 척도·자원 계약을 별도로 설계한다.
- 분야별 상태: C 22문제(입출력 8·함수형 12·다중 파일 2), 실제 GCC 사례 209개, 전체 공개 정의/퀴즈 25개, shell v33. 기존 통합 백업·숙달 분리·정적 제한과 핵심 C 상세 경로에 재귀 입문을 추가했다. 자료구조/알고리즘 전체 과정·Rust 실행·설치형/실기기 PWA·공개 실행은 미완료다.

---

## 2026-10-14 15:56~16:23 KST — 함수 범위·저장기간 확장과 원본 교재 접근 재확인

- 시작 SHA: `9b78e084c41847bf92339b5c8c01959992b579e0` (`main`, tree `b15b7d9545025475fadd478de9eb48f9b91d795e`). GitHub branches/main·새 clone HEAD/origin/main이 일치했고 미커밋 변경은 없었다. 이전 체크아웃은 읽기 전용 status로 보존했다. 열린 PR 0개, Actions #55 `38522542669`의 test·실제 Chromium browser는 모두 성공이었다. 필수 여섯 문서·최신 일지·함수 원고/화면·도식·메타데이터·현재 여섯 사례·콘텐츠/API/브라우저 검사·CI 정의를 읽었다. 기준선 npm test 229/229, 실패/skip 0. 반영 전 최신 HEAD도 같은 SHA다.
- 목표/성공 조건: 기존 함수 화면 연결을 중복 구현하지 않고 c-functions의 선언/정의·C11 원형·범위/가림·저장기간/연결·자동/static 상태를 20절 이상으로 확장한다. 세 완성 프로그램과 두 함수 부분 조각을 원고/화면 일치 상태로 실제 컴파일한다. 명시적인 코드가 보이는 세로 도식과 390px 표시 글자 크기·오프라인·오답→수정→숙달 검사를 갖춘다. 기존 challenge 전체·quiz 전체·선수·여섯 사례·저장/백업 형식은 유지한다.
- 테스트 우선: 신규 tests/function-scope-content.test.mjs의 첫 9건은 구현 전 3/9 성공·6건 예상 실패였다. 기존 challenge/quiz/선수/사례 보존과 컴파일 제약·목적 파일/링크 단계 검사는 이미 통과했고, 상세 구성·도식·원고/세 프로그램 부재를 재현했다. 이후 두 함수 부분 조각을 원고와 대조해 -c로 검사하는 1건을 추가했다. 함수 원고에는 다중 파일 채점이 아직 없다는 오래된 문장이 있어 현재 구현된 세 경로로 수정했다.
- 콘텐츠/구현 파일: src/catalog.js의 c-functions를 9→29절·약 75분으로 확장하고 제목·요약·ID·스타터·입출력·퀴즈는 유지한다. content/c/06-functions.md는 404줄로 개요·필요성·선수·목표·20개 이론·정적 도식·단계별 예제·세 완성 프로그램/출력/변형 실습·오류·점검·요약·퀴즈·기초/응용/도전·Mini Project·테스트·복습을 연결했다. 원형/빈 괄호 설명은 C11에 한정하고 실제 스택 배치를 보장하지 않는다. src/figures.js에는 int age=15, 내부 int age=30, 블록 뒤 출력 15를 코드로 보여 주는 세로 SVG를 추가하며 기존 function-call 분기는 함수형 단원용으로 보존했다.
- 검사/PWA 파일: 새 tests/function-scope-content.test.mjs는 전체 기존 계약·정적 도식·원고·세 프로그램·두 조각·컴파일 제약·정의 누락 링크를 검사한다. tests/functions-content.test.mjs는 메인 단원의 새 도식만 반영하고 기존 함수형 검사를 유지한다. tests/grader-api.test.mjs와 tests/browser-practice.mjs의 참조 풀이를 원고 A와 맞추고 반환값을 버린 뒤 호출자 원본을 출력하는 오답을 거부한다. 브라우저에는 이 오답→수정→숙달·29절·390px 문서/SVG/최소 11.5 CSS px 표시 글자 크기·오프라인·CI 이미지 경로를 추가했다. 이는 레이아웃 회귀 기준이지 전체 접근성 합격 기준은 아니다. sw.js는 자산 목록을 유지한 shell v32다.
- 문서/파일 범위: README·ROADMAP·ARCHITECTURE·CONTENT_POLICY·C_EXERCISE_AUDIT·이 일지에 함수 상세화·현재 PWA·남은 과정·PDF 재검증을 반영한다. 신규 검사 파일 1개와 기존 13개, 총 14개가 대상이다. 서버 채점 정의/정적 허용 목록·사용자 기록 구현·외부 서비스·CodeStep은 수정하지 않는다.
- 실행 검사: 표적 14/14, 전체 npm test 240/240 성공·실패/skip 0. C 21문제/189개 실제 GCC 사례와 신규 반환값 미사용 오답 거부가 통과했다. A/B/C는 -std=c11 -Wall -Wextra -Werror -Wpedantic으로 경고 없이 컴파일했다. A는 기존 여섯 사례와 low/high의 작은 다섯 대표 값·value -12~12 조합 375개, abc/즉시 EOF/세 번째 값 누락의 출력 없는 상태 1을 확인했다. B는 가림 15/30/15와 자동/정적 상태 1/1→1/2를, C는 반환 30/호출자 15와 대상 수정 뒤 30을 확인했다. 두 함수 부분 코드 조각은 main이 없는 목적 파일로 컴파일했다. 형 충돌·블록 밖 이름·정적 int의 함수 호출 초기화는 컴파일 실패, 원형만 있고 정의가 없는 소스는 -c 성공/링크 실패를 확인했다. 실패 소스와 수명 종료 포인터는 실행하지 않는다. 변경 JS/MJS 7개 node --check·git diff --check 성공.
- 로컬 UI 한계: npm run test:browser의 선행 21개 C GCC API는 성공했으나 browserType.launch: Executable doesn't exist at /root/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell 오류로 화면 단계가 중단됐다. 반영 뒤 새 실제 Chromium CI와 이미지에서 모바일/오프라인/숙달 결과를 확인한다. DOM/HTTP/GCC 성공을 화면 E2E로 주장하지 않으며 실제 Windows/Android/iPad/PWA 설치는 미검증이다.
- 발견/재수정: 배열 합의 계약은 최종 합뿐 아니라 모든 중간 합의 long long 표현 가능성으로 명확히 했다. 정적 int 초기화의 예제 정책을 일반 언어 제약과 구분하고 main의 특수 종료 규칙도 별도로 언급했다. 패치 작성기의 SyntaxError: Invalid or unexpected token은 Markdown fence 문자 처리 문제라 소스 파일 생성 전에 중단됐고 수정 후 재실행했다. README 부분 문장으로 patch verification failed가 난 시도는 파일 미변경을 확인한 뒤 정확한 문맥으로 다시 적용했다. 제품 실행 오류로 잘못 보고하지 않는다.
- PDF 접근 재검증: K&R은 6,838,054바이트·288쪽 pdfinfo와 표지 렌더링/육안 확인 성공. 초기 Express 로컬 사본 5,950,976바이트는 Invalid XRef entry/Missing endstream/trailer/xref 오류였다. 연결된 같은 이름 파일은 87,753,393바이트여서 현재 공식 다운로드 경로로 별도 사본을 가져왔고, 실제 크기 일치·750쪽 pdfinfo·개정4판 표지 렌더링/육안 확인에 성공했다. 도우미 첫 실행의 ModuleNotFoundError: library_hosted_apps는 현재 배포의 동반 파일을 함께 받아 재시도해 해결했다. 원본/손상 사본을 수정하지 않았고 교재 본문 전체 대조도 하지 않았다. 이전 읽기 실패는 그 로컬 사본에 한정하며 원본 손상을 주장하지 않는다. PDF·표지 캡처·상용 문제는 Git/사이트에 포함하지 않는다. 원고·예제·도식·연습은 독자 작성이다.
- 의미 검토/호환: 공개 WG14 C11 위원회 초안 N1570(https://www.open-std.org/jtc1/sc22/wg14/www/docs/n1570.pdf)의 6.2.1/6.2.2/6.2.4·6.5.2.2·6.7.6.3/6.7.9·6.9.1을 조회했다. ordinary 변수의 블록 범위와 레이블의 함수 범위, 지역 static 이름과 객체 수명, 함수 내부 연결과 객체 저장기간을 구분한다. 원형은 임의 입력/포인터 검증기가 아니며 C11 int f() 선언을 모든 버전에 일반화하지 않는다. challenge 전체·quiz 전체·선수 c-loops/c-pointer·여섯 사례를 deepEqual로 고정했다. c-clamp-function/c-multi-file 및 모든 progress/drafts/iterations·숙달·백업 v1을 보존한다.
- 커밋/원격 반영: 제목은 `docs: deepen function scope and storage duration lesson`이다. 승인된 GitHub 연결에서 기존 base tree 보존·검증한 각 blob/전체 tree 대조·latest HEAD 재조회·시작 SHA parent/expected-SHA·force:false 갱신으로 반영한다. 아직 모르는 자신의 SHA는 기입하지 않고 실제 결과 HEAD·파일·CI·이미지 결과를 보고서로 남긴다. 이번 일반 HTTPS git push 인증 실패를 재현했다고 주장하지 않는다.
- 미완료/위험: 여섯 핵심 단원의 상세화는 전체 교과서 완성이 아니다. 재귀·다차원 배열·파일 입출력·전체 자료구조/알고리즘·Rust/Cargo 채점·실기기/설치형 PWA·공개 실행 격리는 후속이다. 유한 검사/시간 제한은 메모리 안전이나 실행 격리가 아니다. dev-server.mjs는 loopback에서 신뢰하는 개인 C만 실행하는 비격리 로컬 도구이며 GitHub 저장은 웹 호스팅/공개 실행 서버 배포와 다르다.
- 다음 작업: 재귀를 종료 조건·호출별 자동 상태·깊이 제한·이식 가능한 수치 범위부터 정해 독립 원고/작은 문제/실제 GCC 검사로 확장한다. 완전한 두 교재 원본의 현재 접근 경로를 다시 조회해 필요한 목차/해당 장 범위만 확인하되 원문을 복제하지 않는다. 기존 clamp와 완료한 함수 화면 연결·사용자 기록은 유지한다.
- 분야별 상태: C 채점 21개(입출력 8·함수형 11·다중 파일 2), GCC 사례 189개, 공개 정의 24개, shell v32. 첫 프로그램·자료형·반복·배열·포인터·함수 상세 경로를 갖췄으며 종합 C 교과서·Rust·전체 자료구조/알고리즘·설치형/실기기 PWA·공개 실행은 미완료다.

---

## 2026-10-14 15:24~15:28 KST — CI 이미지 재검토 뒤 포인터 도식 모바일 가독성 수정

- 후속 시작 SHA: `417abd01439eb7a07681d78a5df1627169e01969` (`main`, tree `fd38b127ed659fa0e723fb0665f54b69843c77cf`). 앞선 포인터 확장 커밋의 원격 HEAD·전체 tree 및 원고/검사/카탈로그/일지/sw blob이 로컬 검증본과 일치했다. Actions #54 `38521826890`은 test·실제 Chromium browser 모두 성공했고 로그에서 229/229·실패/skip 0, C 21문제 GCC, 포인터 오답→수정→숙달·390px·오프라인 확인을 읽었다.
- 발견/성공 조건: 해당 CI의 codeweave-browser-qa 아티팩트 `11874058331`을 내려받아 ZIP SHA-256 `775a169c83aaf315171a432fe4848a1779c5004e1a2f092fabc685ed6150b631`을 API digest와 대조하고 pointer-alias-mobile.png를 실제로 열었다. 670폭의 두 열 SVG가 좁은 화면에서 지나치게 축소되어 글자가 작았다. 넘침/내용 검사 성공만으로 가독성을 완료로 간주하지 않는다. 390px에서 모든 SVG text의 변환 후 표시 크기를 11.5 CSS px 이상으로 검사하고, 두 시점/별칭 의미·정적 SVG·저장 데이터는 보존한다. 이 값은 이번 레이아웃의 회귀 기준이며 접근성 표준 합격/실기기 검증을 뜻하지 않는다.
- 테스트 우선: 기존 포인터 도식 검사에 세로 340×440 viewBox와 데스크톱 최대 폭 조건을 먼저 추가했다. 구현 전 포인터 표적 검사 6/7 성공·1건 예상 실패로 기존 가로 레이아웃을 재현했다. 브라우저 검사에는 getComputedStyle와 getScreenCTM으로 실제 글자 크기를 계산하는 조건을 추가했다. 기존 로컬 Chromium 미설치 때문에 이 화면 조건의 실제 실행은 새 원격 CI에서 확인한다.
- 수정 파일/구현: src/figures.js에서 두 시점을 세로로 배치하고 짧은 설명 줄을 나눴으며 최대 폭 340px로 데스크톱 과확대를 방지했다. wrapTall의 선택적 viewBox/style 인수는 기본값을 유지해 다른 도식 출력은 바꾸지 않는다. tests/pointers-content.test.mjs와 tests/browser-practice.mjs가 구조·실제 모바일 표시 크기를 검사한다. sw.js는 shell v31, docs/ARCHITECTURE.md도 같은 버전으로 맞췄다. 이 일지까지 기존 6개 파일을 수정하며 신규 파일/문제·애니메이션·외부 서비스는 추가하지 않는다.
- 재검사: 포인터 표적 7/7 성공, 전체 npm test 229/229 성공·실패/skip 0, C 21문제/189개 실제 GCC 사례·세 완성 프로그램도 그대로 성공했다. 변경 JS/MJS 4개 node --check 및 git diff --check 성공. 이번 후속 수정은 로컬 브라우저를 설치/실행한 결과가 아니며 새 Chromium CI와 이미지의 시각 재검토를 반영 후 확인한다.
- 호환/위험: c-pointer의 29절·스타터·퀴즈·다섯 사례·입출력 계약·모든 진도/초안/제출/백업 키는 그대로다. 원본 PDF는 변경하지 않았으며 임시 표지 렌더링 1개만 제거했다. CI 이미지와 ZIP은 검사용 임시 파일이며 사이트/저장소에 복제하지 않았다. 390px의 폰트/너비와 Chromium 오프라인 검사는 Windows·Android·태블릿 실기기/PWA 설치·안전한 공개 실행을 대신하지 않는다.
- 커밋/원격 반영: 후속 제목은 `fix: keep pointer diagram legible on mobile`이다. 최신 원격 HEAD를 다시 읽고 위 후속 시작 SHA를 parent/expected SHA로 사용해 기존 base tree 보존·blob/tree 대조·비강제 ref 갱신을 수행한다. 아직 모르는 후속 결과 SHA는 기입하지 않으며 HEAD·파일·CI·모바일 이미지의 실제 결과를 보고서로 남긴다.
- 다음 작업/분야 상태: 앞선 함수 선언/정의·범위/저장기간 확장 우선순위를 유지한다. C 21개/189사례·공개 24개·포인터 상세 29절은 유지되며 shell v31이다. 전체 C 교과서·Rust/Cargo·전체 자료구조/알고리즘·실기기/설치형 PWA·공개 실행 격리는 미완료다.

---

## 2026-10-14 15:04~15:21 KST — 포인터 입문 교과서형 확장과 별칭·수명 계약

- 시작 SHA: `e5f41f07851969bdfcba192ac5aef8f649721274` (`main`, tree `16e5f5d76add59494c3937eb845ff62d7854aee7`). 새 clone의 HEAD·origin/main·GitHub branches/main 읽기가 일치했고 미커밋 작업은 없었다. 이전 체크아웃도 읽기 전용 status로 확인해 보존했다. 열린 PR 0개, 시작 SHA의 Actions #53 `38516228295`는 test·실제 Chromium browser 모두 성공이었다. 필수 여섯 문서와 최신 일지, 포인터 입문·도식·문제 메타데이터·비공개 사례·콘텐츠/API/브라우저 검사·CI 정의를 읽었다. 기준선 npm test 220/220 성공, 실패/skip 0.
- 목표/성공 조건: 최신 일지의 다음 작업 c-pointer를 20절 이상 상세 화면·독립 원고·정적 별칭 비교 도식·세 실제 컴파일 완성 프로그램으로 확장한다. 포인터/대상 객체·주소/역참조·초기화·NULL·수명·별칭·재대입·값 전달·배열/길이·호출자 계약을 연결한다. 기존 ID·스타터·퀴즈 정답 인덱스·공개 입력/출력·선수 관계·다섯 채점 사례·저장 키·백업 v1을 유지한다.
- 테스트 우선: tests/pointers-content.test.mjs 신규 7건을 먼저 작성했다. 변경 전 1/7 성공·6건 예상 실패로 상세 화면·전용 도식·독립 원고·컴파일 프로그램의 부재를 재현했다. 기존 문제 정체성·스타터·퀴즈·선수·다섯 사례 보존 검사는 변경 전부터 성공했다. 기존 정상 풀이 전체가 틀렸다는 판정이나 입력 정책 변경은 아니다.
- 구현/파일: src/catalog.js의 c-pointer를 4절에서 29절·약 70분으로 확장하고 코드 조각과 완성 프로그램을 구분했다. 새 content/c/05-pointers.md는 382줄 독립 원고로 개요·필요성·선수·목표·20개 핵심 이론·도식 읽기·단계별 예제·세 완성 프로그램과 실제 출력 이유·예제 변형·오류·점검·퀴즈·요약·기초/응용/도전·Mini Project·테스트·복습을 갖춘다. src/figures.js의 독자 SVG는 p/alias가 value=8을 공유하는 시점 A와 p만 other=21로 바뀌는 시점 B를 정적으로 비교하며 기존 pointer 도식 분기를 보존한다.
- 채점/검사 파일: tests/pointers-content.test.mjs는 원고/화면 소스 일치·주소 표현 비고정·별칭/재대입·기존 증가 범위·NULL/INT_MAX 실패 보존을 검사한다. tests/grader-api.test.mjs는 참조 풀이를 원고 B와 일치시키고 포인터만 이동/두 번 증가 오답 회귀 2건을 추가했다. 서버 채점 정의는 변경하지 않았다. try_add_one의 상태 반환 예제는 기존 void add_one과 다른 계약이며 새 문제나 대체 채점 규칙으로 등록하지 않았다.
- 브라우저/PWA/문서 파일: tests/browser-practice.mjs는 29절·NULL/값 전달 설명·별칭 SVG·포인터만 이동 오답→대상 증가 수정→실제 제출→이론/퀴즈→숙달·390px 문서/SVG 경계·오프라인 포인터 재로딩·CI 스크린샷 경로를 추가했다. sw.js는 자산 목록을 유지하고 shell v30으로 갱신한다. README·ROADMAP·ARCHITECTURE·CONTENT_POLICY·C_EXERCISE_AUDIT는 포인터 상세화·남은 C 핵심 콘텐츠·실제 PDF 상태를 기록한다. 이 일지를 포함해 새 파일 2개/기존 파일 11개, 총 13개를 변경한다.
- C 의미 검토: 공개 WG14 C11 위원회 초안 N1570(https://www.open-std.org/jtc1/sc22/wg14/www/docs/n1570.pdf)의 수명·NULL/변환·역참조·sizeof·포인터 연산·값 전달·%p 의미를 조회했다. NULL 검사만으로 임의 포인터의 유효성/수명을 증명하지 않으며 수명 종료 포인터를 읽기·비교해 확인하지 않는다. %p에는 void *를 전달하고 구현 정의 주소 문자열·고정 비트 폭을 정답으로 요구하지 않는다. 같은 배열/끝 바로 다음의 포인터 형성과 역참조 가능 범위를 구분한다. 쓰기 함수 호출과 대상 관찰을 별도 문장으로 분리해 인수 평가 순서에 의존하지 않는다. 최종 표준과 초안을 구분하며 원문은 복제하지 않았다.
- 실행 검사: npm test 229/229 성공, 실패/skip 0. 실제 GCC로 C 21문제·189개 채점 사례 및 신규 두 오답 거부를 확인했다. 완성 A/B/C는 -std=c11 -Wall -Wextra -Werror -Wpedantic으로 경고 없이 컴파일했다. A는 구현 정의 주소 부분을 고정하지 않고 값/별칭 두 줄을 대조한다. B는 기존 다섯 사례와 -9999/-1/1/9998을 통과하고 표현 가능한 -10001/10000·abc·즉시 EOF에서는 출력 없이 상태 1로 종료했다. C는 정상 상태 1/값 8·INT_MAX 상태 0/기존 값 보존·NULL 상태 0을 확인한다. 포인터 표적과 기존 정수 계약 검사 9/9도 성공했다. 변경 JS/MJS 6개 node --check 및 git diff --check 성공.
- 발견/재수정: 재검토에서 C 예제가 INT_MAX 숫자를 출력한다고 한 설명과 실제 limit==INT_MAX 참/거짓 출력이 달랐다. 숫자/고정 폭을 가정하지 않고 상한 기호와 실패 뒤 비교 결과를 출력한다는 설명으로 수정했다. 수정 뒤 전체 229건을 다시 통과했다. 유한 사례가 임의 숫자 텍스트·임의 포인터 안전성·메모리 안전이나 보안 격리를 증명하지 않음을 명시했다.
- 로컬 UI 한계: npm run test:browser의 선행 실제 GCC API는 21문제 모두 성공했으나 browserType.launch: Executable doesn't exist at /root/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell 오류로 로컬 화면 단계가 중단됐다. 새 실제 Chromium·390px·오프라인 결과는 반영 뒤 원격 CI에서 확인한다. DOM/HTTP/GCC 성공을 화면 E2E로 주장하지 않으며 실기기/PWA 설치는 별도 미검증이다.
- PDF 접근: K&R은 6,838,054 bytes·288쪽 메타데이터·표지 렌더링/육안 확인에 성공했다. 현재 Express는 5,950,976 bytes로 존재하지만 Invalid XRef entry·Missing endstream·trailer/xref 오류로 페이지/본문을 읽지 못했다. 파일 복구나 두 교재의 본문 전체 대조를 주장하지 않는다. PDF·캡처·상용 문제를 저장소에 복제하지 않았고 원고·도식·코드·연습은 독자 작성했다.
- 호환/재검토: 기존 스타터를 전체 문자열로 고정하고 ID c-pointer·퀴즈 인덱스 1/선택지 8·입력 7/출력 8·선수 c-types·다섯 채점 사례가 그대로임을 검사했다. 진도/초안/iteration·숙달·통합 백업 v1 구현·정적 파일 허용 목록은 변경하지 않았다. 새 원고를 HTTP 공개 허용 목록에 추가하지 않았으며 사용자의 과거 기록은 변경하지 않는다.
- 커밋/원격 반영: 커밋 제목은 `docs: deepen pointer lifetime and alias lesson`이다. 승인된 GitHub 연결의 기존 base tree를 보존하는 atomic blob/tree/commit·expected-SHA 비강제 ref 갱신을 사용한다. 각 blob/전체 tree를 로컬 검증본과 비교하고 ref 갱신 직전 최신 main을 다시 확인한다. 아직 모르는 자신의 SHA는 기입하지 않고 반영 뒤 실제 HEAD·새/기존 파일·CI 결과 SHA/URL을 보고서로 남긴다. 이번에는 일반 HTTPS git push 인증 실패를 새로 재현했다고 주장하지 않는다.
- 미완료/위험: 첫 다섯 기초 단원의 상세화가 전체 C 교과서 완성은 아니다. 함수 범위/저장기간·재귀·파일 입출력 등 남은 C 내용, 전체 자료구조/알고리즘·Rust/Cargo 채점·실기기/설치형 PWA·공개 실행 격리는 후속이다. dev-server.mjs는 loopback의 신뢰하는 개인 C 전용 비격리 도구이며 시간 제한은 샌드박스가 아니다. GitHub 반영은 웹 호스팅/공개 실행 서버 배포가 아니다.
- 다음 작업: 이미 연결된 c-functions 원고/화면의 상세성을 점검하고 함수의 선언/정의·범위/저장기간·호출 프레임을 작은 검증 가능한 단위로 확장한다. 재귀는 종료 조건·깊이·수치 범위의 계약을 먼저 정한 뒤 후속으로 도입한다. 기존 clamp 및 직접 함수 채점·사용자 기록을 유지하고 완료된 화면 연결을 중복 구현하지 않는다.
- 분야별 상태: C 채점 21개(입출력 8·함수형 11·다중 파일 2), GCC 사례 189개, 공개 문제 정의 24개, shell v30. 첫 프로그램·변수/자료형·조건/반복·배열·포인터의 상세 기초 경로를 갖췄다. 함수/입출력/구조체/동적 메모리 상세 실습도 있지만 전체 교과서·Rust·자료구조/알고리즘 전체 과정·실기기/설치형 PWA·안전한 공개 실행은 미완료다.

---

## 2026-10-14 13:01~14:19 KST — 배열 입문 교과서형 확장과 대표 경계 보강

- 시작 SHA: `62d5fac881ee38a79cbe8d42d878f6d06552bf01` (`main`, tree `b2d3f9ad109a55c31c022b9c3ae456f5cfd1afb6`). 새 clone에서 HEAD·origin/main·GitHub branches/main이 일치했고 미커밋 변경은 없었다. 앞선 작업 체크아웃도 read-only status로 확인해 변경을 덮어쓰지 않았다. 열린 PR 0개, 시작 SHA의 Actions #52 `38505374771`은 test·실제 Chromium browser 모두 성공이었다. 필수 여섯 문서와 최신 일지, 배열 입문/함수형 카탈로그·도식·문제 메타데이터·비공개 사례·콘텐츠/API/브라우저 검사·CI 정의를 읽었다. 기준선 npm test 212/212 성공, 실패/skip 0. 구현 직전 최신 main도 같은 SHA로 다시 확인했다.
- 목표/성공 조건: 최신 일지의 c-array 후속을 수행한다. 18절 이상 화면·독립 원고·정적 반열린 경계 도식·두 완성 프로그램으로 배열 객체·인덱스·초기화·용량/사용 길이·sizeof·매개변수 조정·별도 길이·최댓값 불변식을 연결한다. 기존 ID·스타터·퀴즈 정답 인덱스·공개 예시·1~20 개수·선수 관계·기록·v1 백업은 보존하고 c-array-max-function을 새로 중복 생성하지 않는다.
- 테스트 우선: tests/arrays-content.test.mjs의 신규 6건을 먼저 작성했다. 구현 전 0/6 성공·6건 예상 실패로 상세 구성·전용 도식·독립 원고와 첫 원소 최대/중복/대표 정수 경계 사례의 부재를 재현했다. 이는 기존 모든 정상 풀이가 틀렸다는 판정이 아니라 콘텐츠와 사례 분포의 결손이다.
- 구현/파일: src/catalog.js의 c-array를 3절에서 24절·약 65분으로 확장하고 코드 조각과 완성 프로그램을 구별했다. content/c/04-arrays.md는 332줄 독립 원고로 상세 이론·정적 도식 읽기·추적 표·두 완성 프로그램·예제 가까이 배치한 변형 연습·오류·점검·요약·퀴즈·기초/응용/도전·Mini Project·테스트·복습을 갖춘다. src/figures.js는 int a[5]={4,-2}의 다섯 값/인덱스와 제외된 [5]를 구분하는 독자 SVG를 추가했다. 기존 array 도식 분기도 보존했다.
- 채점/검사: server/grading-exercises.mjs에 첫 칸 최대, 음수/중복/0, ±32767 대표 경계 3개를 추가해 c-array는 기존 4개를 포함한 7개 사례, 전체 C 21문제는 189개 사례가 됐다. 입력 가능 범위의 확대나 축소가 아니라 기존 int 입력 계약의 명시다. tests/grader-api.test.mjs·tests/browser-practice.mjs의 참조 풀이를 원고 B와 같은 배열/함수 완성 프로그램으로 바꾸고 API에는 후보 0·마지막 원소 누락 오답 회귀를 추가했다. 잘못된 입력용 신규 문제나 채점 정책은 만들지 않았다.
- 브라우저/PWA/문서: tests/browser-practice.mjs는 24절·sizeof/불변식 설명·경계 SVG·후보 0 오답→수정→실제 제출→이론/퀴즈→숙달·390px 문서/SVG 경계·오프라인 배열 재로딩과 CI 스크린샷을 추가했다. sw.js는 shell v29다. README·ROADMAP·ARCHITECTURE·CONTENT_POLICY·C_EXERCISE_AUDIT는 189개 사례·배열 상세화·남은 포인터 기초 부채와 현재 PDF 접근 결과를 반영한다.
- C 의미 검토: 공개 WG14 C11 위원회 초안 N1570(https://www.open-std.org/jtc1/sc22/wg14/www/docs/n1570.pdf)의 6.2.5·6.3.2.1·6.5.2.1/6.5.6·6.5.3.4·6.7.6.3·6.7.9 관련 의미를 조회했다. int 고정 4바이트, 자동 배열의 자동 0 초기화, 매개변수 sizeof로 원래 길이 추측, 배열 전체 복사, 범위 밖 접근의 정상 동작을 보장처럼 설명하지 않는다. 물리 용량과 초기화된 사용 길이를 분리하고 함수의 읽기 가능성/양수 길이는 호출자 전제임을 명시했다. 최종 표준과 위원회 초안을 구분하며 원문은 복제하지 않았다.
- 실행 검사: npm test 220/220 성공, 실패/skip 0. C 21문제·189개 GCC 사례와 두 대표 오답 회귀가 성공했다. 완성 A/B는 -std=c11 -Wall -Wextra -Werror -Wpedantic으로 경고 없이 컴파일됐다. A의 count=5 및 부분 초기화 6줄 출력을 확인했다. B는 현재 7개 사례와 길이 1~20/각 최댓값 위치를 조합한 210개 대표 음수 배열을 통과했다. 0·21·-1 개수, abc·즉시 EOF·원소 부족·원소 변환 실패에서 출력 없이 상태 1도 확인했다. 이는 임의 숫자 텍스트 안전성이나 모든 배열 전수 검사·메모리 안전 증명이 아니다. JS/MJS 7개 node --check 및 git diff --check 성공. 문서 표현과 코드 조각 표기를 재검토한 뒤 배열 표적 6/6·catalog 문법·diff 검사를 다시 통과했다.
- 로컬 UI 한계: npm run test:browser의 선행 실제 GCC API는 C 21문제 모두 성공했으나 browserType.launch: Executable doesn't exist로 로컬 Chromium UI 단계가 중단됐다. 새 실제 Chromium·390px·오프라인 결과는 반영 후 원격 CI에서 별도로 확인한다. HTTP/DOM/GCC 성공을 UI E2E로 주장하지 않으며 실기기/PWA 설치는 별도 미검증이다.
- PDF 접근: K&R은 6,838,054 bytes·288쪽 메타데이터와 표지 렌더링/육안 확인에 성공했다. 현재 Express 파일은 5,950,976 bytes로 앞선 일지의 크기와 다르며 Invalid XRef entry·Missing endstream·trailer/xref 누락으로 읽지 못했다. 원본을 변경하거나 복구했다고 주장하지 않았고 교재 본문 전체 대조도 하지 않았다. PDF·캡처·상용 문제는 저장소에 추가하지 않았고 새 콘텐츠는 독자 작성했다.
- 호환/재검토: 기존 c-array 스타터를 문자열 전체 비교로 고정했다. ID·퀴즈 인덱스 2·공개 입력 5/2 9 -3 4 1·출력 9·선수 c-loops는 그대로다. 모든 진도/초안/iteration·숙달·통합 백업 v1 구현과 정적 파일 허용 목록은 변경하지 않았으며 새 원고를 HTTP 공개 허용 목록에 넣지 않았다. 원고 A/B와 화면 소스는 동일함을 검사하고 기존 함수형 최댓값 실습과 API의 역할 차이를 설명했다.
- 미완료/위험: c-pointer는 아직 4절 시범 콘텐츠다. 전체 C 교과서·Rust/Cargo 채점·자료구조/알고리즘 전체 과정·실기기/설치형 PWA·안전한 공개 실행 격리는 후속이다. dev-server.mjs는 loopback의 신뢰하는 개인 C 전용 비격리 도구이며 시간 제한은 샌드박스가 아니다. GitHub 커밋과 실제 웹 호스팅/공개 채점 배포를 구분한다.
- 커밋/원격 반영: 커밋 제목은 `docs: deepen arrays and explicit length lesson`이다. 승인된 GitHub 연결의 atomic blob/tree/commit·expected-SHA 비강제 ref 갱신을 사용하고 각 blob 및 전체 tree를 로컬 검증본과 비교한다. 이 일지에는 아직 모르는 자신의 SHA를 기입하지 않는다. 반영 뒤 HEAD·새/기존 파일·CI를 재조회한 실제 결과 SHA/URL은 보고서에 남긴다.
- 다음 작업: c-pointer를 주소/값·선언/역참조·초기화·NULL·수명·호출자 객체 변경·배열과 포인터 차이·sizeof와 길이·유효 범위·정의되지 않은 동작을 갖춘 교과서형 단원으로 확장한다. 기존 -10000~9999 계약·스타터·사용자 기록을 보존하고 실제 컴파일 예제와 경계 검사부터 작성한다.
- 분야별 상태: C 채점 21개(입출력 8·함수형 11·다중 파일 2), 실제 GCC 사례 189개, 공개 문제 정의 24개다. 첫 프로그램·변수/자료형·조건/반복·배열 네 기초 단원은 상세 확장됐고 포인터 및 전체 교과서·Rust·자료구조/알고리즘·실기기/설치형 PWA·공개 실행은 미완료다.

---

## 2026-10-14 11:55~12:13 KST — 조건문·반복문 교과서형 확장과 이식 가능한 누산

- 시작 SHA: `59e18295c1e280c9d766db70691b3fde67718921` (`main`, tree `99883835cf278513d389b870ab670fca55b553f3`). 새 clone의 로컬 HEAD·origin/main·GitHub branches/main 읽기가 일치했고 미커밋 작업은 없었다. 열린 PR은 0개, 시작 SHA의 Actions #51 `38499668710`은 성공이었다. README·ROADMAP·ARCHITECTURE·CONTENT_POLICY·AUTONOMOUS_DEVELOPMENT·최신 일지와 관련 카탈로그·도식·채점 사례·콘텐츠/API/브라우저 검사·CI 정의를 읽었다. 기준선 npm test는 203/203 성공, 실패/skip 0이었다. 반영 전 branches/main 재조회도 같은 SHA였다.
- 목표/성공 조건: 최신 일지의 다음 작업 c-loops를 16절 이상 교과서형 화면·독립 원고·정적 불변식 도식·두 실제 컴파일 완성 프로그램으로 확장한다. 0/비0 조건·분기·반복 상태·종료·off-by-one·누산 범위를 설명하고 0회·1회·상한을 검사한다. 기존 ID·퀴즈 정답 인덱스·스타터·공개 예시·입력 범위·선수 관계·저장 키·v1 백업을 유지한다.
- 테스트 우선/발견: 신규 tests/loops-content.test.mjs의 7개 검사를 먼저 작성해 구현 전 7건 예상 실패를 확인했다. 기존 참조 풀이가 int 누산형을 사용했고 n=1 채점 사례·전용 원고·불변식 SVG·상세 교육 구성이 없었다. 최대 합 500500은 C 최소 int 최댓값 32767을 넘으므로 단순 PC 실행 성공을 이식성 근거로 쓰지 않았다.
- 구현/파일: src/catalog.js의 c-loops를 3절에서 22절·약 60분으로 확장했다. 조건·단락 평가·분기·반복 시점·상태 추적·불변식·종료·break/continue·off-by-one·long/%ld·입력 전제·오류·점검·요약·기초/응용/도전·Mini Project·복습을 연결했다. src/figures.js에는 초기화→조건→참 본문→갱신→재검사와 거짓 종료를 구분하는 독자 SVG를 추가했다. content/c/03-conditionals-loops.md는 299줄 독립 원고와 상태 추적/채점용 완성 프로그램을 갖춘다. server/grading-exercises.mjs에 n=1을 추가해 이 문제는 5개, 전체 C 21문제는 186개 GCC 사례가 되었다. tests/grader-api.test.mjs와 tests/browser-practice.mjs의 참조 풀이도 long/%ld로 바꾸고 API에는 마지막 항 누락·본문 안 누산값 초기화 오답 회귀를 추가했다.
- 브라우저/문서: tests/browser-practice.mjs는 반복문 22절·불변식 도식·오답→수정→실제 재제출→이론/퀴즈→숙달·390px 문서/SVG 경계·오프라인 재로딩을 추가하고 CI용 도식 스크린샷을 저장한다. sw.js는 shell v28로 갱신한다. README·ROADMAP·ARCHITECTURE·CONTENT_POLICY·C_EXERCISE_AUDIT는 상세 단원과 186개 사례 및 남은 두 기초 단원 부채를 반영했다.
- C 의미 재검토: 공개 WG14 C11 위원회 초안 N1570(https://www.open-std.org/jtc1/sc22/wg14/www/docs/n1570.pdf)의 정수 최소 범위·논리 연산·분기/반복/점프·형식 입출력 의미를 조회했다. long의 최소 최댓값 2147483647과 최대 합/중간 곱 범위, i 최대 1001을 별도로 논증했다. 고정 비트폭이나 현재 GCC 결과를 언어 전체 보장으로 단정하지 않으며 signed overflow와 임의 큰 텍스트의 scanf 변환 한계를 명시했다. 코드 조각과 완성 프로그램을 구별했고 표준 원문·교재 본문을 복제하지 않았다.
- 실행 검사: 최종 npm test 212/212 성공, 실패/skip 0. C 21문제·186개 기존/추가 GCC 사례와 두 오답 회귀가 성공했다. 새 완성 프로그램은 -std=c11 -Wall -Wextra -Werror -Wpedantic으로 경고 없이 컴파일됐다. A의 4줄 상태 추적 출력, B의 현재 5개 채점 사례 및 모든 허용 정수 n=0~1000의 1001개 수학적 기대값을 확인했다. B는 표현 가능한 범위 밖 -1/1001·abc·즉시 EOF에서 출력 없이 상태 1을 반환했다. 이 예제 검증은 기존 채점 입력 계약 확대가 아니다. 변경 JS/MJS 7개 node --check와 git diff --check도 성공했다.
- 로컬 브라우저 제한: npm run test:browser의 선행 실제 GCC API는 C 21문제 모두 통과했으나 browserType.launch: Executable doesn't exist로 Chromium UI 단계가 중단됐다. 실제 Chromium·390px·오프라인 결과는 반영 뒤 원격 CI에서 별도 조회한다. DOM/HTTP/GCC 성공을 UI E2E 성공으로 보고하지 않으며 Windows/Android/iPad 실기기·PWA 설치는 이번 범위 밖이다.
- PDF 접근: 현재 K&R 파일은 6,838,054 bytes·288쪽이며 pdfinfo·첫 페이지 렌더링·육안 확인에 성공했다. Express 파일은 15,179,776 bytes로 존재하지만 XRef/endstream/trailer 손상으로 파싱·렌더링하지 못했다. K&R 전체 본문 대조나 Express 읽기를 주장하지 않았고 어느 책의 PDF·본문·캡처·상용 문제도 저장소에 복제하지 않았다. 원고·도식·예제·문제는 독자 작성했다.
- 호환/재검토: c-loops의 ID·정답 인덱스 1·스타터·공개 입력 5/출력 15·0~1000 입력 전제·선수 관계는 그대로다. n=1은 기존 계약 안의 추가 경계이며 정상 풀이 출력은 변하지 않는다. 모든 저장 키·v1 백업·초안·제출·숙달 구현과 정적 파일 허용 목록을 변경하지 않았다. 새 원고는 개발 문서이며 기존 catalog/figures 모듈이 화면과 오프라인 콘텐츠를 제공한다.
- 미완료/실제 위험: c-array·c-pointer는 짧은 시범 콘텐츠다. Rust/Cargo 채점·전체 자료구조/알고리즘·실기기/PWA 설치·안전한 공개 실행 격리는 미완료다. dev-server.mjs는 loopback의 신뢰하는 개인 C 코드만 실행하는 비격리 도구이고 시간 제한은 샌드박스가 아니다. GitHub 반영은 실제 사이트 호스팅/공개 실행 배포와 다르다.
- 커밋/원격 확인: 커밋 제목은 `docs: deepen conditionals and loops lesson`이다. 시작 SHA를 expected SHA로 사용하고 기존 base tree를 보존하며 강제 푸시하지 않는다. 자신의 결과 SHA를 일지에 미리 기입하지 않고 반영 뒤 원격 HEAD·tree·새/기존 파일 blob·CI를 조회해 보고서로 남긴다.
- 반영 경로: 일반 HTTPS git push origin main은 `fatal: could not read Username for 'https://github.com': No such device or address`로 실패했다. GitHub 연결의 실제 원격 읽기는 성공했다. 승인된 연결의 blob/tree/commit·expected-SHA ref 갱신을 사용하며 각 파일 blob SHA를 로컬 git hash-object와 대조하고 원격 전체 tree도 로컬 검증 tree와 비교한다. 새 파일·기존 파일·일지의 실제 반영 및 CI 결과는 보고서에서 별도로 확인한다.
- 다음 작업: c-array를 배열 객체·0 기반 인덱스·반열린 구간·길이 전달·전체 음수 최댓값·배열 초기화/접근 전제·함수 연계·경계 테스트를 갖춘 교과서형 단원으로 확장한다. c-array-max-function을 중복 생성하지 않고 입문 배열 문제와 기존 함수 실습의 역할을 구분한다. 1~20 개수 계약·스타터·기록을 보존하고 필요한 검사부터 작성한다.
- 분야별 상태: C 채점 21개(입출력 8·함수형 11·다중 파일 2), GCC 사례 186개, 공개 문제 정의 24개다. 첫 프로그램·변수/자료형·조건/반복 기초 단원은 상세 확장했고 나머지 두 기초 단원과 전체 교과서·Rust·자료구조/알고리즘·실기기/설치형 PWA·공개 실행은 계속 개발해야 한다.

---

## 2026-10-14 10:55~11:07 KST — 변수·자료형 교과서형 확장

- 시작 SHA: `581b4d6d62ab7a8229f1784342bc2ca99bf8340b` (`main`, tree `ad7112b1a52a189e72342ae7d38e5044c64ce73e`). 새 clone의 로컬 HEAD·origin/main·GitHub branches/main 읽기가 일치했고 미커밋 작업은 없었다. 열린 PR은 0개, 시작 SHA의 Actions `38494949209`는 성공이었다. README·ROADMAP·ARCHITECTURE·CONTENT_POLICY·AUTONOMOUS_DEVELOPMENT·최신 일지와 관련 카탈로그·도식·입력 계약·브라우저·콘텐츠 검사·CI 정의를 읽었다. 기준선 `npm test`는 198/198 성공, 실패/skip 0이었다.
- 목표/성공 조건: 최신 일지의 다음 작업 `c-types`를 교과서형으로 확장한다. 기존 ID·퀴즈 정답 인덱스·스타터·공개 예시·입력 범위·5개 채점 사례·선수 관계·저장 키와 v1 백업은 유지한다. 16절 이상 화면, 독립 원고, 연산 전후 변환 비교 SVG, 실제 GCC로 검사할 두 완성 프로그램, 오류·점검·세 단계 연습·Mini Project·복습과 모바일/오프라인 브라우저 시나리오를 갖춘다.
- 테스트 우선: 신규 `tests/types-content.test.mjs`의 5개 검사를 먼저 추가했다. 기존 도식 이름, 전용 SVG와 원고 부재로 구현 전 0/5 성공·5건 예상 실패를 확인했다. 이후 표적 검사와 기존 정수 계약 검사 7/7이 성공했다. 새 검사는 화면과 원고의 완성 프로그램 A 소스가 동일함을 고정해 중복 예제의 drift도 막는다.
- 구현/파일: `src/catalog.js`의 c-types를 4절에서 21절·약 55분으로 확장했다. 객체·선언·초기화·대입·지역 변수의 미초기화 읽기·C11 수치 최소 보장·CHAR_BIT·부동소수 범위/정밀도·정수 나눗셈·나머지·캐스트 시점·signed/unsigned 경계·printf/scanf 형식을 연결했다. `src/figures.js`는 `7 / 2 → int 3 → double 3.0`과 `(double)7 / 2 → double 3.5`를 대비하는 독자 정적 SVG를 추가했다. `content/c/02-variables-types.md`는 315줄 독립 원고로 필수 교육 구성을 갖췄다. `tests/browser-practice.mjs`는 상세 절·변환 도식·390px 문서/도식 경계·오프라인 콘텐츠를 기존 오답→수정→제출→숙달 흐름에 연결하고 CI용 도식 이미지를 저장한다. `sw.js`는 shell v27, README·ROADMAP·ARCHITECTURE·CONTENT_POLICY·C_EXERCISE_AUDIT는 두 기초 상세 단원과 남은 세 단원 부채를 반영했다.
- C 정확성 검토: 공개된 WG14 C11 위원회 초안 N1570(https://www.open-std.org/jtc1/sc22/wg14/www/docs/n1570.pdf)을 조회해 5.2.4.2·6.3.1.3~4·6.5.5·6.7.9·7.21.6.1~2 관련 의미를 검토했다. 원고는 int/long 고정 폭·8비트 바이트·IEEE 754를 언어 보장으로 단정하지 않는다. 범위 밖 signed 정수 변환의 구현 정의 결과/신호와 signed 산술 넘침의 정의되지 않은 동작을 구분했다. scanf 변환 개수 2가 입력 범위나 임의 텍스트 안전성을 증명하지 않으며 int로 표현할 수 없는 변환은 정의되지 않은 동작일 수 있다고 명시했다. 표준 초안과 최종 표준을 구분하고 원문을 복제하지 않았다.
- 실행 검사: 최종 `npm test` 203/203 성공, 실패/skip 0. 실제 GCC가 기존 C 21문제·185개 사례와 두 완성 프로그램을 검사했다. 프로그램 A는 `-std=c11 -Wall -Wextra -Werror -Wpedantic`으로 경고 없이 컴파일되어 초기화/대입·양수/음수 몫·나머지·3.0/3.5 변환·-3 캐스트의 4줄 출력을 확인했다. 프로그램 B는 기존 5개 입력을 정확히 통과하고 abc·한 정수 후 EOF·즉시 EOF에서 출력 없이 상태 1을 반환했다. 이 추가 예제 검증은 기존 채점 계약 확대가 아니다. 변경 JS/MJS 5개 `node --check`와 `git diff --check`도 성공했다.
- 브라우저 제한: `npm run test:browser`의 선행 C 21문제 실제 GCC API는 모두 성공했으나 Chromium 실행 파일 부재(`browserType.launch: Executable doesn't exist`)로 로컬 UI 단계는 중단됐다. 상세 화면·390px·오프라인의 실제 실행 결과는 커밋 뒤 설치된 Chromium의 원격 CI로 별도 판정하며 Node/HTTP 성공을 브라우저 성공으로 보고하지 않는다. 실기기와 설치형 PWA는 이번 범위 밖이다.
- PDF 접근: 현재 K&R 파일은 6,838,054 bytes·288쪽으로 pdfinfo와 첫 페이지 렌더링·육안 확인이 성공했다. 현재 C Express 파일은 15,179,776 bytes로 존재하나 XRef/endstream/trailer 손상으로 파싱·렌더링하지 못했다. K&R 본문 전체 대조나 Express 읽기를 주장하지 않았으며 두 책의 PDF·본문·캡처·상용 문제를 저장소에 복제하지 않았다. 원고·도식·예제·문제는 독자 작성했다.
- 호환/재검토: c-types의 ID·정답 인덱스 1·스타터·공개 입력 4 7/출력 11·5개 사례와 모든 저장 형식은 그대로다. 원고는 정적 서버 허용 목록에 추가하지 않아 프로젝트 파일 접근 제한을 보존했다. 렌더링 모듈만 기존 오프라인 자산에서 갱신하며 사용자의 과거 숙달·초안·제출 데이터는 변경하지 않는다.
- 미완료/위험: c-loops·c-array·c-pointer는 여전히 짧은 시범 콘텐츠다. Rust/Cargo 채점·전체 자료구조/알고리즘·실기기/PWA 설치·안전한 공개 실행 격리는 미완료다. dev-server.mjs는 loopback의 신뢰하는 개인 C 코드만 실행하는 비격리 도구이며 시간 제한은 샌드박스가 아니다. GitHub 반영은 실제 웹 호스팅/공개 실행 서버 배포와 다르다.
- 커밋/원격 확인: 커밋 제목은 `docs: deepen C types and conversions lesson`이다. 시작 SHA를 expected SHA로 사용해 강제 푸시하지 않으며, 결과 SHA·원격 tree/파일 blob·새 CI는 반영 뒤 보고서로 남긴다. 커밋 일지에 자신의 SHA를 미리 채우지 않는다.
- 반영 경로: 일반 HTTPS `git push origin main`은 `fatal: could not read Username for 'https://github.com': No such device or address`로 실패했다. 원격 읽기는 성공했고 HEAD는 시작 SHA 그대로였다. 검증한 변경 파일을 full-block base64로 읽어 GitHub 연결에서 blob SHA를 로컬과 대조하고 기존 base tree를 보존하는 commit·expected-SHA ref 갱신을 사용한다. 새 파일·기존 파일·일지의 실제 반영 결과는 원격 tree와 blob을 재조회해 보고한다.
- 다음 작업: `c-loops`를 조건식·0/비0·분기·반복 상태·초기값/종료 조건·불변식·off-by-one·최대 합의 이식 가능한 누산형을 갖춘 교과서형 단원으로 확장한다. n=1000의 합 500500이 최소 int 범위를 넘는 점을 검토해 long 기반 누산 예제를 먼저 테스트로 고정하고 기존 ID·출력·저장 데이터를 유지한다.
- 분야별 상태: C 채점 21개(입출력 8·함수형 11·다중 파일 2), GCC 사례 185개, 전체 공개 정의 24개, shell v27. c-hello와 c-types의 상세 기초 학습 경로를 마련했으나 전체 교과서 완료율은 주장하지 않는다.

---

## 2026-10-14 10:01~10:13 KST — 첫 C 프로그램 교과서형 확장

- 실행 시작 커밋: `26bff37edccfc503cbccb5e27814697962755c82` (`main`, tree `bcf310f60106cd4997c791ed566b736533f5fda1`). 새 작업 디렉터리에 원격 저장소를 다시 복제했고 로컬 HEAD·`origin/main`·`git ls-remote`와 GitHub 커밋 읽기가 일치하며 작업 트리가 깨끗함을 확인했다. 열린 PR은 0개였다. 시작 SHA의 Actions 실행 `38488520890`은 2026-10-14 09:09~09:10 KST에 완료됐고 결론은 성공이었다. 필수 `README.md`, `docs/ROADMAP.md`, `docs/ARCHITECTURE.md`, `docs/CONTENT_POLICY.md`, `docs/AUTONOMOUS_DEVELOPMENT.md`, 최신 개발 일지와 관련 카탈로그·도식·콘텐츠·브라우저 검사를 읽었다. 변경 전 `npm test`는 194/194 성공, 실패/skip 0이며 실제 GCC를 사용했다.
- 목표/성공 조건: 최신 일지의 다음 작업인 `c-hello`를 기존 문제 ID·채점·저장 데이터와 호환되는 교과서형 단원으로 확장한다. 화면에 개요·필요성·선수 지식·목표부터 전처리→번역→목적 파일→링크→실행·종료 상태, 표준 `int main(void)`, 문자열 리터럴·개행, `printf` 반환과 오류 경계, 실행 결과·흔한 오류·점검·요약·세 단계 연습·Mini Project·테스트 개선·복습을 연결한다. 독자 정적 SVG와 독립 원고를 만들고 원고의 완성 프로그램을 C11 경고 옵션으로 실제 컴파일·실행하며, 설치된 Chromium CI가 상세 화면→실제 제출→이론·퀴즈→숙달을 확인해야 한다.
- 테스트 우선 재현: 신규 `tests/hello-content.test.mjs`에 12개 이상 화면 절, 필수 개념과 C 경계, `hello-build-pipeline` 정적 도식, 독립 원고 필수 구성, 완성 프로그램의 `gcc -std=c11 -Wall -Wextra -Wpedantic` 컴파일·실행을 먼저 고정했다. 구현 전 표적 검사 4건은 기존 `pipeline` 이름, 전용 도식과 `content/c/01-hello.md` 부재 때문에 모두 의도대로 실패했다. 구현 뒤 같은 표적 검사는 4/4 성공했다.
- 구현/변경 파일: `src/catalog.js`의 3절짜리 `c-hello`를 17절·42분 단원으로 확장하되 `c-hello` ID, 퀴즈 정답 인덱스, 스타터와 채점 계약은 유지했다. `src/figures.js`에는 소스→전처리→번역→목적 파일→링크→실행→종료 상태를 구분하는 독자 정적 SVG를 추가했다. `content/c/01-hello.md`는 개요·필요성·선수 지식·목표·이론·도식·조각/완성 프로그램·실제 출력과 이유·오류·점검·퀴즈·요약·기초/응용/도전·Mini Project·테스트·복습을 독자 작성했다. `tests/browser-practice.mjs`는 상세 화면과 도식, 실제 GCC 제출, 이론 읽기와 퀴즈 뒤 전체 숙달을 검사한다. `README.md`, `docs/ROADMAP.md`, `docs/ARCHITECTURE.md`, `docs/CONTENT_POLICY.md`, `docs/C_EXERCISE_AUDIT.md`는 첫 기초 단원 완료와 남은 네 기초 단원 부채, 현재 PDF 접근 상태를 반영했고 PWA shell은 v26으로 갱신했다.
- C 언어 경계: 화면과 원고는 흔한 도구 체인의 목적 파일·명령·확장자를 C 표준의 고정 형식으로 말하지 않는다. `#include`를 물리적 파일 복사 보장으로 설명하지 않고 선언 사용 계약으로 한정했다. `int main(void)`와 C99 이후 `main` 끝 도달의 성공 종료를 설명하되 프리스탠딩 환경을 구분했다. 문자열 리터럴 수정은 정의되지 않은 동작이며, 텍스트 스트림의 실제 줄 끝 표현은 구현에 따라 달라질 수 있음을 명시했다. `printf`의 음수 반환은 출력/인코딩 오류지만 버퍼의 후속 flush 오류까지 한 호출 검사가 모두 증명하지는 않는다는 한계도 남겼다.
- 실행 검사: 최종 `npm test`는 198/198 성공, 실패/skip 0이다. 기존 C 21문제·185개 GCC 사례와 새 원고 완성 프로그램을 실제 GCC로 컴파일·실행했으며 새 프로그램은 경고 없이 정확히 `Hello, CodeWeave!`와 개행을 출력하고 상태 0으로 끝났다. 변경 JS/MJS의 `node --check`와 `git diff --check`도 성공했다. `npm run test:browser`는 선행 단계의 C 21문제 실제 GCC API를 모두 통과했으나 로컬 Playwright Chromium 실행 파일 부재(`browserType.launch: Executable doesn't exist`)로 UI 단계가 종료됐다. 따라서 로컬 실제 렌더링·숙달·390px 화면·오프라인 재로딩·설치형 PWA 성공을 주장하지 않는다.
- 참고 PDF 접근: `/workspace/scratch/d205f960d8c8/upload/C_Programming.pdf`는 6,838,054 bytes, 288쪽이며 `pdfinfo`와 첫 페이지 렌더링·육안 확인에 성공했다. `/workspace/scratch/d205f960d8c8/upload/c언어 압축 (1)(1).pdf`는 15,179,776 bytes로 존재하지만 Poppler가 잘못된 XRef/endstream/trailer를 보고해 파싱·렌더링하지 못했다. 따라서 현재 Express 파일을 읽었다고 기록하지 않았고 K&R 본문 전체를 대조했다고도 주장하지 않는다. 어느 PDF도 저장소에 추가하거나 본문·캡처·상용 문제를 복제하지 않았다.
- 재검토/호환성: 문제 수, 비공개 채점 사례, 공개 예시, 선수 관계, 로컬 저장 키와 통합 백업 v1 형식은 바꾸지 않았다. 기존 사용자의 `c-hello` 이론·퀴즈·실습·복습·숙달과 초안·제출 이력은 같은 ID로 유지된다. 기존 퀴즈의 정답 인덱스와 문제 스타터도 유지해 과거 결과의 의미를 바꾸지 않았다. 새 원고는 런타임에 공개 제공되는 파일이 아니므로 서버 정적 허용 목록을 넓히지 않았고 기존 문서·테스트 비공개 경계를 보존한다.
- 미해결/위험: `c-types`·`c-loops`·`c-array`·`c-pointer`는 여전히 3~4절 시범 콘텐츠다. 로컬 실제 Chromium, Windows/Android/iPad 실기기와 설치형 PWA는 미검증이다. `dev-server.mjs`는 loopback에서 신뢰하는 개인 C 코드만 실행하는 비격리 개발 도구이며 공개 실행 서버가 아니다. GitHub 반영은 실제 웹 호스팅이나 안전한 공개 채점 배포를 뜻하지 않는다.
- GitHub 반영: 이 일지를 포함하는 커밋 제목은 `docs: expand first C program lesson`이다. 자신의 SHA와 새 CI 결과는 커밋 뒤 원격 HEAD·tree·원고·일지·Actions를 다시 조회해 실행 보고서에 기록한다. 시작 SHA `26bff37edccfc503cbccb5e27814697962755c82`을 expected SHA로 사용하고 강제 푸시하지 않는다.
- 다음 우선 작업: 남은 첫 기초 단원 중 `c-types`를 교과서형으로 확장한다. 객체·선언·초기화, 정수/부동소수 자료형의 최소 보장과 구현 차이, 정수 나눗셈·변환·표현 범위, `scanf` 반환값과 현재 `[-10000, 10000]` 채점 계약을 독립 원고·정적 도식·실제 컴파일 예제로 연결하되 강건한 문자열 파싱은 후속 `fgets`·`strtol`과 중복하지 않는다.
- 분야별 상태: 채점 가능한 C 21개(입출력형 8, 함수형 11, 다중 파일형 2), 실제 GCC 사례 185개, 전체 공개 문제 정의 24개, PWA shell v26이다. `c-hello`는 교과서형 상세 단원이 됐고 나머지 네 기초 단원, Rust/Cargo 채점, 자료구조·알고리즘 확장, 실기기/PWA 설치와 안전한 공개 실행 격리는 후속 작업이다.

---

## 2026-10-14 05:02~09:05 KST — 기하급수 성장 학생 push 함수 합성

- 실행 시작 커밋: `f5f61efa15f2573367080bcbc8b29895d12c5468` (`main`, tree `4f3326e62236bd0822bd59cca8330c59457c8e23`). 새 작업 디렉터리의 로컬 HEAD·`origin/main`·`git ls-remote`와 GitHub 커밋 읽기가 일치하고 작업 트리가 깨끗하며 열린 PR이 0개임을 확인했다. 이 SHA에 연결된 새 Actions 실행은 없었고, 직전 확인 가능한 성공 기준은 이전 SHA의 `38444380655`였다. 필수 `README.md`, `docs/ROADMAP.md`, `docs/ARCHITECTURE.md`, `docs/CONTENT_POLICY.md`, `docs/AUTONOMOUS_DEVELOPMENT.md`, 최신 개발 일지와 관련 구현·검사를 읽었다. 변경 전 `npm test`는 187/187 성공, 실패/skip 0이며 실제 GCC를 사용했다.
- 목표/성공 조건: 최신 일지의 다음 작업인 `int push_student(struct Student **students, size_t *length, size_t *capacity, struct Student value)`를 별도 함수형 문제로 추가한다. 여유 슬롯에서는 재할당하지 않고, 가득 찼으면 0→4 또는 현재 용량의 두 배를 요청하되 `capacity * 2`를 계산하기 전에 오버플로를 검사한다. 검증된 `reserve_students`를 다른 번역 단위에서 재사용하고 예약 실패 때 포인터·길이·용량·기존 레코드를 보존하며 성공 뒤에만 새 레코드와 길이를 공개한다. 공개 메타데이터·화면·원고·도식·비공개 사례·브라우저 흐름·감사 문서를 함께 연결하고 기존 진도·초안·제출·숙달·통합 백업 v1 형식은 변경하지 않는다.
- 테스트 우선 재현: `tests/exercises.test.mjs`, `tests/exercise-audit.test.mjs`, 신규 `tests/student-vector-push-content.test.mjs`에 21번째 C 정의, 선수 관계, 17개 사례, 단원·정적 SVG·원고의 필수 경로를 먼저 고정했다. 구현 전 표적 검사에서 감사 행·문제·단원·도식·원고가 없어 5건이 의도대로 실패했다. 구현 뒤 하네스의 C `printf` 개행이 JavaScript 템플릿에서 실제 개행으로 해석되어 컴파일이 실패하는 문제를 발견했고 `String.raw` 템플릿으로 고쳤다. 정렬된 ID 기대 순서와 원고의 백틱 표기 때문에 실패한 두 검사도 실제 계약을 정확히 검사하도록 바로잡았다.
- 구현/변경 파일: `src/exercises.js`에 `c-student-vector-push` 공개 정의와 `c-realloc-student-capacity` 선수 관계를, `server/grading-exercises.mjs`에 17개 실제 사례와 검증된 `reserve_students` 하네스를 추가했다. `src/catalog.js`에는 이론→예제→퀴즈→함수 제출 흐름을, `src/figures.js`에는 여유 슬롯·0→4·두 배·예약 성공·실패 보존을 대비하는 독자 정적 SVG를 연결했다. `content/c/19-student-vector-push.md`는 개요·필요성·선수 지식·목표·상세 이론·도식·단계 예제·완성 함수와 프로그램 조각 구분·출력·오류·점검·요약·세 단계 연습·Mini Project·테스트 개선·복습을 독자 작성했다. `content/c/18-realloc-student-capacity.md`의 후속 도전 정책도 0→4로 맞췄다. `tests/grader-api.test.mjs`는 선형 `+1` 성장, 실패 전에 길이를 바꾸는 풀이, `reserve_students`를 건너뛰고 직접 `realloc`하는 풀이를 실제 GCC로 거부한다. `tests/browser-practice.mjs`는 21개 C 정답의 API 검사와 새 화면·도식·함수 전용 스타터·실제 제출·390px 폭·연습장 항목을 추가했다.
- 채점/경계: 17개 사례는 공개 2→4 성장, 여유 슬롯과 마지막 슬롯의 무할당, 정규 빈 상태 0→4, 1→2, 3→6, 세 번 push의 반복 성장, `INT_MIN`/`INT_MAX` 레코드, 세 출력 인수의 `NULL`, `length > capacity`, 양수 용량/`NULL` 포인터, 0 용량/비NULL 포인터, 용량 두 배의 `size_t` 오버플로, 두 배 뒤 바이트 크기 오버플로와 주입된 예약 실패를 구분한다. 하네스는 reserve 호출 횟수·전달 length·요청 용량을 관찰한다. 실패 사례는 포인터·길이·용량·기존 원소가 모두 보존되는지 확인한다. 전체 채점 가능한 C 21문제의 실제 GCC 사례는 185개다.
- 교육/C 언어 경계: 첫 용량 4는 이 과제의 정책이지 C 언어 보장이 아님을 명시했다. 원소 수 두 배와 바이트 크기 곱셈을 별도 경계로 설명하고, 기하급수 성장의 여러 push에 대한 상각 비용 O(1)과 한 번의 확장 O(n)을 구분했다. 포인터가 실제 capacity개 객체를 가리킨다는 조건은 호출자 전제이며 거짓 상태에서 범위 밖 접근은 정의되지 않은 동작이다. 유한한 사례와 시간 제한은 메모리·파일·네트워크를 격리하거나 모든 입력의 안전·복잡도를 증명하지 않는다.
- 문서/PWA: `README.md`, `docs/ROADMAP.md`, `docs/ARCHITECTURE.md`, `docs/C_EXERCISE_AUDIT.md`를 C 21개·전체 공개 정의 24개·입출력형 8개·함수 직접 호출형 11개·다중 파일형 2개·185개 GCC 사례에 맞췄다. PWA shell은 v25로 갱신했다. 정적 서버 허용 파일 수와 저장 키·백업 버전은 그대로다.
- 실행 검사: 수정 뒤 표적 콘텐츠·메타데이터·감사 검사 10/10, 함수 채점 API 검사 84/84가 성공했다. 최종 `npm test`는 194/194 성공, 실패/skip 0이며 실제 GCC가 C 21문제와 새 정상·경계 17개 및 대표 오답 세 종류를 컴파일·실행했다. 변경 JS/MJS의 `node --check`와 `git diff --check`도 성공했다. `npm run test:browser`는 선행 단계에서 C 21문제의 실제 GCC API 검사를 모두 통과했으나 로컬 Playwright Chromium 실행 파일 부재(`browserType.launch: Executable doesn't exist`)로 UI 단계가 종료됐다. 따라서 실제 렌더링·390px 화면·오프라인 재로딩·설치형 PWA 성공을 로컬 결과로 주장하지 않는다.
- 참고 PDF 접근: `/workspace/scratch/d205f960d8c8/upload/C_Programming.pdf`는 6,838,054 bytes, 288쪽이며 `pdfinfo`와 첫 페이지 렌더링·육안 확인에 성공했다. `/workspace/scratch/d205f960d8c8/upload/c언어 압축 (1)(1).pdf`는 15,179,776 bytes로 존재하지만 Poppler가 잘못된 XRef/endstream/trailer를 보고해 파싱·렌더링하지 못했다. 따라서 C Express를 읽었다고 기록하지 않았다. 어느 PDF도 저장소에 추가하거나 본문·캡처·상용 문제를 복제하지 않았고 원고·도식·코드·문제는 독자 작성했다.
- 재검토/호환성: `push_student`는 기존 `reserve_students` ID와 계약을 바꾸지 않고 함수 합성만 추가한다. 새 문제 ID를 추가했으므로 기존 로컬 저장 데이터는 그대로 유지되고 새 ID는 빈 상태로 시작한다. 이론 읽기·퀴즈 통과·실습 통과·복습·전체 숙달 계산도 기존 메타데이터 경계를 사용한다. 직접 `realloc`하는 풀이가 기능상 일부 사례를 통과하더라도 예약 실패 주입과 호출 관찰에서 거부되어 학습 목표가 실제 검사된다.
- 미해결/위험: 첫 다섯 C 기초 단원은 여전히 3~4절 시범 콘텐츠라 전체 교과서 필수 구성을 충족하지 않는다. 로컬 실제 Chromium, Windows/Android/iPad 실기기와 설치형 PWA는 미검증이다. `dev-server.mjs`는 loopback에서 신뢰하는 개인 C 코드만 실행하는 개발 도구이며 샌드박스가 아니다. GitHub 저장소 반영은 웹 호스팅 또는 안전한 공개 실행 서버 배포를 의미하지 않는다.
- GitHub 반영: 이 일지를 포함하는 커밋 제목은 `feat: add geometric student push exercise`다. 자신의 SHA와 새 CI 결과는 커밋 뒤 원격 HEAD·tree·원고·일지·Actions를 다시 조회해 실행 보고서에 기록한다. 시작 SHA `f5f61efa15f2573367080bcbc8b29895d12c5468`을 expected SHA로 사용하고 강제 푸시하지 않는다.
- 다음 우선 작업: 감사 문서의 남은 우선순위대로 첫 C 기초 단원 `c-hello`를 교과서형으로 확장한다. 전처리→컴파일→링크→실행, 표준 `int main(void)`와 종료 상태, 문자열 리터럴·개행·`printf` 반환과 오류 경계를 독자 원고·정적 도식·실제 컴파일 예제로 연결하되 기존 문제 ID와 저장 데이터를 유지한다.
- 분야별 상태: 채점 가능한 C 21개(입출력형 8, 함수형 11, 다중 파일형 2), 실제 GCC 사례 185개, 전체 공개 문제 정의 24개, PWA shell v25다. 동적 배열 생성→예약→push 연계는 마련됐지만 기초 단원 교과서형 확장, Rust/Cargo 채점, 자료구조·알고리즘 확장, 실기기/PWA 설치와 안전한 공개 실행 격리는 후속 작업이다.

---

## 2026-10-14 04:05~04:20 KST — 기초 정수 문제의 이식 가능한 입력·오버플로 계약

- 실행 시작 커밋: `1da860625a7d4888b008671780148a2d163b9d68` (`main`, tree `366a934a1d3b00b9bc96b81aed0fcbfd61e4f7ab`). 새 작업 디렉터리에 최신 원격 `main`을 복제했고 로컬 HEAD·`origin/main`·`git ls-remote`가 일치하며 작업 트리가 깨끗함을 확인했다. GitHub 저장소·커밋 읽기에 성공했고 열린 PR은 0개였다. 시작 SHA의 Actions 실행 `38444380655`는 `test`와 실제 Chromium `browser` 작업을 포함해 성공 상태였다. 필수 `README.md`, `docs/ROADMAP.md`, `docs/ARCHITECTURE.md`, `docs/CONTENT_POLICY.md`, `docs/AUTONOMOUS_DEVELOPMENT.md`, 최신 개발 일지와 관련 구현·검사를 읽었다. 변경 전 `npm test`는 185/185 성공, 실패/skip 0이었다.
- 목표/성공 조건: 최신 일지의 첫 우선 작업인 `c-types` 두 정수 덧셈과 `c-pointer` 1 증가에 C 구현 폭에 의존하지 않는 입력 범위를 선언한다. 계산 결과가 C가 보장하는 최소 `int` 범위 안에 머무는 이유, 유효 입력의 정확한 개수, 범위 밖·변환 실패·추가 토큰·조기 EOF 정책을 학습 화면에서 구분한다. 양수·음수 양쪽 경계를 실제 GCC 사례로 검사하고 문제 메타데이터·감사 표·로드맵이 실행 정의와 일치해야 한다. 기존 문제 ID, 공개 예시, 진도·초안·iteration·숙달·통합 백업 v1 형식은 바꾸지 않는다.
- 테스트 우선 재현: `tests/basic-integer-contracts.test.mjs`와 `tests/exercises.test.mjs`에 범위 문구, `scanf` 변환 개수 검사, `input-contract`·`signed-overflow` 개념, 양쪽 경계와 사례 수를 먼저 고정했다. 구현 전 표적 검사는 계약 문구와 경계 사례가 없어 7개 중 3개가 의도대로 실패했다. 구현 후 첫 재검사에서 한국어 활용을 지나치게 한 형태로 가정한 정규식 두 개가 실패해, 의미 있는 두 문구를 각각 검사하도록 테스트 자체를 수정했다.
- 구현/변경 파일: `src/catalog.js`의 두 기초 단원에 입력·결과 범위와 signed overflow 설명을 각각 한 절씩 추가했다. `c-types`는 두 피연산자를 `[-10000, 10000]`, 합을 `[-20000, 20000]`으로 정하고 스타터에서 `scanf` 반환값 2를 확인한다. `c-pointer`는 증가 전 값을 `[-10000, 9999]`, 결과를 `[-9999, 10000]`으로 정한다. 두 문제 모두 채점기는 계약에 맞는 정수만 제공하고 범위 밖·변환 실패·추가 토큰·조기 EOF는 이 입문 문제의 채점 대상이 아니며 강건한 입력은 후속 `fgets`·`strtol` 단원에서 다룬다고 명시했다. `src/exercises.js`는 두 개념 태그를 보강했고 `server/grading-exercises.mjs`는 각 문제에 양·음 경계 두 개씩을 추가했다. `docs/C_EXERCISE_AUDIT.md`와 `docs/ROADMAP.md`는 168개 실제 GCC 사례와 해결된 계약/남은 콘텐츠 부채를 반영했다.
- 실행 검사: 수정 후 표적 검사 9/9, 최종 `npm test` 187/187 성공, 실패/skip 0이다. 실제 GCC가 채점 가능한 C 20문제의 총 168개 사례를 컴파일·실행했고 새 합의 `20000`/`-20000`, 포인터 증가 결과 `10000`/`-9999`를 통과했다. 변경 JS/MJS 다섯 파일의 `node --check`, `git diff --check`, 감사 표↔실행 정의 동기화도 성공했다. 로컬 Playwright 패키지와 Chromium 실행 파일이 없어 `npm run test:browser`는 실행하지 않았으며, 실제 UI·390px 화면·오프라인·설치형 PWA 성공을 로컬 결과로 주장하지 않는다. 원격 CI의 설치된 Chromium 결과를 별도로 확인한다.
- 참고 PDF 접근: `/workspace/scratch/d205f960d8c8/upload/C_Programming.pdf`는 6,838,054 bytes, 288쪽이며 `pdfinfo`와 첫 페이지 렌더링·육안 확인에 성공했다. `/workspace/scratch/d205f960d8c8/upload/c언어 압축 (1)(1).pdf`는 15,179,776 bytes로 존재하지만 Poppler가 `Invalid XRef entry`, `Missing endstream`, trailer/xref 누락을 보고하여 파싱·렌더링하지 못했다. 따라서 C Express를 읽었다고 기록하지 않았다. 어느 PDF도 저장소에 추가하거나 본문·캡처·상용 문제를 복제하지 않았고, 계약 설명·테스트는 독자 작성했다.
- 재검토/호환성: `int`의 정확한 크기가 아니라 표준이 보장하는 최소 표현 범위를 기준으로 문제 범위를 잡아 16비트 이상 구현에서도 유효 입력 계산이 넘치지 않는다. 유효 입력만 제공한다는 계약과 `scanf`가 실제로 확인하는 변환 개수를 구분했고, 강건한 텍스트 파싱 단원과 기능을 중복하지 않았다. 문제 ID와 공개 예시는 그대로라 기존 진도·초안·제출 이력·숙달·백업 데이터를 유지한다.
- 미해결/위험: 첫 다섯 기초 단원은 여전히 3~4절짜리 시범 콘텐츠로 전체 교과서 필수 구성을 충족하지 않는다. 이 두 문제의 범위 밖·잘못된 입력을 거부하는 강건한 프로그램을 구현한 것은 아니며 명시적으로 채점 계약 밖이다. 시간 제한과 GCC 하네스는 메모리·프로세스·파일·네트워크를 격리하지 않으므로 `dev-server.mjs`는 신뢰하는 개인 코드 전용이다. 로컬 실제 Chromium, Windows/Android/iPad 실기기와 설치형 PWA는 미검증이다.
- GitHub 반영: 이 일지를 포함하는 커밋 제목은 `test: define portable integer exercise contracts`다. 자신의 SHA와 새 CI 결과는 커밋 후 원격 HEAD·tree·관련 문서·Actions를 다시 조회해 실행 보고서에 기록한다. 시작 SHA를 기준으로 새 원격 변경 여부를 재확인하고 강제 푸시하지 않는다.
- 원격 반영 중 발견/해결: 일반 HTTPS `git push origin main`은 이 실행 환경에 Git 자격 증명이 없어 `fatal: could not read Username for 'https://github.com': No such device or address`로 실패했다. GitHub 연결의 base tree·commit·expected SHA ref 갱신으로 구현 커밋 `73ead92cfb0ae74977973a1684823bb4e29f5231`을 fast-forward 반영했다. 직후 파일별 blob SHA를 재검증해 출력 한도 때문에 `docs/DEVELOPMENT_LOG.md`만 154,439 bytes가 아니라 150,060 bytes로 잘려 전송된 것을 발견했다. 코드·테스트·다른 문서 일곱 파일은 기대 blob과 일치했다. 일지를 고정 크기 full-block으로 다시 읽어 기대 blob `f2b060563b4e2e2a1715e052159f44bbfad52c37`과 일치시킨 뒤 교정 커밋 `201d45b7dd1989722479075232e3e2d3611058ac`으로 복구했으며, 원격 tree가 검증한 로컬 tree `4c433df4b087a83a3466a3d51bede23c00454b56`와 같음을 확인했다. 이 사후 기록은 별도 소규모 문서 커밋 제목과 최종 SHA를 실행 보고서에 남긴다.
- 다음 우선 작업: `reserve_students`를 재사용하는 `push_student`와 기하급수적 성장 정책을 별도 문제로 테스트 우선 개발한다. `length == capacity`일 때 0→초기 용량과 이후 배수 성장, `SIZE_MAX` 근처의 덧셈·곱셈 오버플로, `realloc` 실패 시 포인터·길이·용량·기존 원소 보존, 성공 뒤에만 새 레코드와 길이를 공개하는 계약을 먼저 고정한다.
- 분야별 상태: 채점 가능한 C 20개(입출력형 8, 함수형 10, 다중 파일형 2), 실제 GCC 사례 168개, 전체 공개 문제 정의 23개다. 두 기초 정수 문제의 입력·오버플로 계약은 고정됐지만 기초 단원의 교과서형 확장, Rust/Cargo 채점, 자료구조·알고리즘 확장, 실제 기기/PWA 설치와 안전한 공개 실행 격리는 후속 작업이다.

---

## 2026-10-13 22:56~2026-10-14 03:04 KST — C 20문제 교차 품질 감사와 경계 보강

- 실행 시작 커밋: `e8f3c927512219b5aa848c26d6682c3e5a3e3575` (`main`, tree `5cef5f916f6bb9348c15f2e6bf67dd6e85b83743`). 새 작업 디렉터리에 원격 `main`을 복제해 로컬 HEAD·`origin/main`·`git ls-remote`를 일치시켰고 작업 트리가 깨끗함을 확인했다. GitHub 저장소 읽기와 권한 조회에 성공했고 열린 PR은 없었다. 시작 SHA의 Actions 실행 목록·combined status 조회는 비어 있었지만, 직전 일지의 실행 ID `38404620743`을 다시 조회해 `test`와 실제 Chromium `browser` 작업이 모두 성공했음을 확인했다. 필수 `README.md`, `docs/ROADMAP.md`, `docs/ARCHITECTURE.md`, `docs/CONTENT_POLICY.md`, `docs/AUTONOMOUS_DEVELOPMENT.md`, 최신 개발 일지와 관련 구현·검사를 읽었다. 변경 전 `npm test`는 183/183 성공, 실패/skip 0이었다.
- 목표/성공 조건: 채점 가능한 C 20문제 전부를 한 표에서 공개 예시↔비공개 사례, 선수 그래프, 채점 방식, 정상·경계·부작용, C 계약, 콘텐츠 성숙도로 교차 점검한다. 감사 표가 실행 정의와 자동 동기화되고, 발견한 실제 결함은 먼저 실패하는 회귀 검사로 재현한 뒤 수정한다. 20문제 정답이 실제 GCC에서 모두 통과하며 기존 진도·초안·iteration·숙달·통합 백업 v1과 PWA shell은 변경하지 않는다.
- 감사 결과/새 파일: `docs/C_EXERCISE_AUDIT.md`에 20문제의 채점 방식, 사례 수, 주요 경계, 콘텐츠 판정을 고정했다. 공개 예시 20개가 모두 실제 사례와 일치하고 문제 안의 사례 설명·함수 인수 조합에 중복이 없음을 확인했다. `tests/exercise-audit.test.mjs`는 감사 표의 ID 순서·채점기·사례 수를 실행 중인 `src/exercises.js`·`server/grading-exercises.mjs`와 비교하고 공개 예시·중복 부재를 자동 검사한다. 전체 실제 GCC 사례는 164개다.
- 테스트 우선 발견/수정: `validateExerciseMetadata`가 직접 자기 참조와 없는 선수 ID는 거부하지만 `A -> B -> C -> A` 간접 순환은 허용함을 먼저 실패하는 검사로 재현했다. `src/exercises.js`에 DFS 방문 상태와 현재 경로 추적을 추가해 모든 간접 순환을 모듈 초기화 전에 거부하고 실제 순환 경로를 오류에 표시한다. 이어 선언한 입력 상한과 경계 계약을 검사로 먼저 고정한 뒤 `server/grading-exercises.mjs`에 `c-loops`의 `n=1000`, `c-array`의 20개 전체 음수, `c-functions`·`c-clamp-function`·`c-multi-file`의 `low == high == value` 사례와 함수 하네스 분기를 추가했다.
- 문서: `README.md`에 선수 그래프 순환 검증과 감사 문서 링크를 추가했다. `docs/ROADMAP.md`에는 감사 범위·164개 사례·기초 콘텐츠 부채를, `docs/ARCHITECTURE.md`에는 간접 순환 진단·사례 중복 검사 책임을 기록했다. 코드 채점 계약과 저장 형식만 다뤘으므로 브라우저 자산과 PWA shell v24는 변경하지 않았다.
- 실행 검사: 테스트 작성 직후 3노드 순환이 거부되지 않아 표적 검사가 의도대로 실패했고, 경계 검사 추가 직후에는 `c-loops` 상한 사례 부재로 다시 의도대로 실패했다. 수정 뒤 관련 검사 7/7, 문제·GCC API 표적 검사 85/85가 성공했다. 최종 `npm test`는 185/185 성공, 실패/skip 0이며 실제 GCC가 C 20문제와 보강한 경계를 모두 컴파일·실행했다. 변경 JS/MJS 네 파일의 `node --check`와 `git diff --check`도 성공했다. `npm run test:browser`는 API 선행 단계에서 C 20문제 전체가 통과했지만 로컬 Playwright Chromium 실행 파일 부재(`browserType.launch: Executable doesn't exist`)로 UI 단계는 미실행이다. 따라서 실제 브라우저·390px 화면·오프라인·설치형 PWA 성공을 주장하지 않는다.
- 참고 PDF 접근: `/workspace/scratch/d205f960d8c8/upload/C_Programming.pdf`는 6,838,054 bytes, 288쪽이며 `pdfinfo`와 첫 페이지 렌더링·육안 확인에 성공했다. `/workspace/scratch/d205f960d8c8/upload/c언어 압축 (1)(1).pdf`는 15,179,776 bytes로 존재하지만 Poppler가 `Invalid XRef entry`, `Missing endstream`, trailer/xref 누락을 보고하여 파싱·렌더링하지 못했다. 따라서 C Express를 읽었다고 기록하지 않았다. 어느 PDF도 저장소에 추가하거나 본문·캡처·상용 문제를 복제하지 않았다.
- 재검토/호환성: 간접 순환 검사는 알려진 ID 검사 뒤에 실행되므로 없는 선수 문제 진단을 가리지 않고, 완료된 노드는 재방문하지 않아 비순환 공유 선수 그래프를 허용한다. `low == high`는 기존 세 채점 경로 모두에서 동일하게 검증한다. 감사와 경계 추가는 문제 ID, 공개 예시, 저장 키, 백업 버전, 제출 이력 구조를 바꾸지 않는다.
- 미해결/위험: 첫 다섯 기초 단원은 3절짜리 시범 콘텐츠로 전체 교과서 품질에 미달한다. `c-types`의 `int` 덧셈과 `c-pointer`의 1 증가는 signed overflow를 피하는 입력 범위를 더 명시적으로 고정해야 한다. 초기 stdin 문제의 잘못된 입력·초과 토큰·조기 EOF 정책도 아직 정의되지 않았다. 시간 제한과 GCC 하네스는 메모리·프로세스·파일·네트워크를 격리하지 않으므로 `dev-server.mjs`는 신뢰하는 개인 코드 전용이다. 로컬 실제 Chromium, Windows/Android/iPad 실기기와 설치형 PWA는 미검증이다.
- GitHub 반영: 이 일지를 포함하는 커밋 제목은 `test: audit C exercise coverage and prerequisites`다. 자신의 SHA와 새 CI 결과는 커밋 후 원격 HEAD·tree·감사 문서·일지를 재조회하여 실행 보고서에 기록한다. 시작 SHA를 expected SHA로 사용하고 강제 푸시하지 않는다.
- 다음 우선 작업: 먼저 `c-types`·`c-pointer`의 안전한 숫자 입력 범위와 초기 stdin 문제의 잘못된 입력/EOF 계약을 작은 테스트 우선 단위로 정리한다. 그 다음 `reserve_students`를 재사용하는 `push_student`와 기하급수적 성장 정책을 별도 문제로 개발한다.
- 분야별 상태: 채점 가능한 C 20개(입출력형 8, 함수형 10, 다중 파일형 2), 실제 GCC 사례 164개, 전체 공개 문제 정의 23개다. C 20문제의 교차 감사와 자동 동기화 검사는 마련됐지만 첫 기초 콘텐츠 확장, Rust/Cargo 채점, 자료구조·알고리즘 확장, 실제 기기/PWA 설치와 안전한 공개 실행 격리는 후속 작업이다.

---

## 2026-10-13 21:56~22:20 KST — realloc 학생 배열 용량 확장 계약

- 실행 시작 커밋: `b2cf12d649e2c89f45d2e02e122535a277e96513` (`main`, tree `0b63bdc52f7d362766c1efdc6848965c44b0c224`). 로컬 HEAD·`origin/main`·`git ls-remote`·GitHub 커밋 읽기가 일치하고 열린 PR이 없음을 확인했다. 이 SHA의 workflow run과 combined status는 비어 있어 CI 성공으로 간주하지 않았고, 직전 알려진 성공 CI는 이전 SHA `4ced4534ca24fa40438d813d5897893334061f13`의 https://github.com/cys123431-ship-it/CodeWeave/actions/runs/38355474951 이다. 필수 운영·로드맵·아키텍처·콘텐츠 정책·최신 일지를 읽고 직전 우선 작업인 20번째 C `realloc` 문제를 선택했다. 변경 전 `npm test`는 176/176 성공, 실패/skip 0이었다.
- 목표/성공 조건: `int reserve_students(struct Student **students, size_t length, size_t *capacity, size_t new_capacity)`가 `length <= capacity`와 용량 0/`NULL`의 정규 상태를 검사하고 성장 또는 같은 용량만 허용한다. `new_capacity * sizeof` 오버플로를 `realloc` 전에 거부하고, 반환값을 임시 포인터로 검사하며, 성공 시 이전 레코드를 보존하고 새 슬롯을 `{0, 0}`으로 초기화한 뒤에만 포인터와 용량을 공개한다. 재할당 실패와 모든 계약 실패는 포인터·길이·용량·기존 원소를 보존한다. 기존 진도·초안·iteration·통합 백업 v1 키와 형식은 변경하지 않는다.
- 구현/변경 파일: `src/exercises.js`에 선수 관계와 공개 예시를 가진 `c-realloc-student-capacity`를, `server/grading-exercises.mjs`에 13개 사례·함수 하네스·정확한 `--wrap=realloc` 허용 항목을 추가했다. `src/catalog.js`에는 이론→예제→퀴즈→함수 제출 흐름을, `src/figures.js`에는 성공 공개/실패 보존을 대비하는 독자 정적 SVG를 연결하고 기존 동적 배열 그림의 중복 분기를 하나 제거했다. `content/c/18-realloc-student-capacity.md`는 개요·필요성·선수 지식·목표·상세 이론·도식 읽기·단계 예제·함수 조각과 완성 프로그램 구분·실제 출력·오류·점검·요약·세 단계 연습·Mini Project·테스트 개선·복습을 독자 작성했다. `tests/realloc-content.test.mjs`, `tests/exercises.test.mjs`, `tests/grader-api.test.mjs`, `tests/browser-practice.mjs`가 공개/비공개 계약과 화면 연결을 고정한다.
- 채점/경계: 13개 실제 GCC 사례는 용량 2→4 성장, 빈 배열 0→3, 같은 용량과 0→0 무동작 성공, 길이보다 작은 요청, 성장 전용 정책의 축소 거부, `length > capacity`, 두 출력 인수 `NULL`, 포인터/용량 불일치 두 종류, `SIZE_MAX` 곱셈 경계와 주입된 재할당 실패를 구분한다. 정상 성장에서는 기존 두 레코드·새 두 슬롯·요청 바이트 수·호출 횟수를 확인한다. 실패 하네스는 `__wrap_realloc`으로 OS 메모리 고갈 없이 실패를 주입하고 직접 소유 포인터에 대입하는 풀이, 성공 전 용량을 공개하는 풀이, 오버플로 검사를 생략한 풀이를 실제 API 회귀로 거부한다. 제한된 링커 allowlist는 `malloc`, `realloc`, `free` 외 플래그와 중복을 계속 거부한다.
- 교육/C 언어 경계: `realloc` 성공 시 주소가 같을 수도 달라질 수도 있고 실패 시 기존 블록이 유효하다는 계약을 구분했다. 늘어난 뒷부분은 자동 초기화되지 않으며, `realloc(NULL, 양수)`는 첫 할당으로 사용할 수 있지만 0→0은 `realloc(NULL, 0)` 결과에 의존하지 않는다. reserve에서 축소를 암묵적으로 수행하지 않고 별도 파괴 정책으로 남겼다. 유한한 하네스는 임의 포인터의 실제 유효성이나 모든 메모리 오류를 증명하지 않는다.
- 문서/PWA: `README.md`, `docs/ROADMAP.md`, `docs/ARCHITECTURE.md`를 C 20개·전체 시범 단원/공개 정의 23개·입출력형 8개·함수 직접 호출형 10개·다중 파일형 2개에 맞췄다. PWA shell은 v24로 갱신했다. 브라우저 시나리오는 20개 정답의 실제 API 사전 검사, 새 단원 제목·정적 도식·함수 전용 스타터·성공 제출·390px 폭·연습장 항목을 검사하도록 확장했다.
- 실행 검사: 최종 `npm test` 183/183 성공, 실패/skip 0. 실제 GCC가 C 20문제와 신규 13개 정상·경계 사례 및 세 대표 오답을 컴파일·실행했다. 원고의 독립 완성 프로그램도 `gcc -std=c11 -Wall -Wextra -Werror -pedantic`로 컴파일하고 `length=2 capacity=4`, `101:70 205:88 0:0 0:0` 출력을 확인했다. 변경 JS/MJS의 `node --check`와 `git diff --check`도 성공했다. `npm run test:browser`의 API 선행 단계에서 C 20문제가 모두 통과했지만 로컬 Playwright Chromium 실행 파일 부재(`browserType.launch: Executable doesn't exist`)로 실제 UI 단계는 미실행이다. 따라서 새 단원 렌더링·390px·오프라인·설치형 PWA 성공을 주장하지 않는다.
- 참고 PDF 접근: `/workspace/scratch/d205f960d8c8/upload/C_Programming.pdf`는 6,838,054 bytes이며 `pdfinfo`로 열고 첫 페이지를 1028×1478 PNG로 렌더링해 직접 확인했다. `/workspace/scratch/d205f960d8c8/upload/c언어 압축 (1)(1).pdf`는 15,179,776 bytes로 존재하지만 Poppler가 `Invalid XRef entry`, `Missing endstream`, trailer/xref 누락을 보고하여 열지 못했다. 따라서 C Express 본문을 읽었다고 간주하지 않았다. 어느 PDF도 저장소에 추가하지 않았고 본문·캡처·상용 문제를 복제하지 않았다.
- 발견·수정·재검토: `src/figures.js`에 같은 `dynamic-student-array` 분기가 연속 두 번 있음을 발견해 동작을 바꾸지 않는 중복 하나를 제거했다. 공개 예시가 비공개 첫 사례와 정확히 일치하는지, 실패 때 감시 포인터·capacity·두 기존 레코드가 보존되는지, 오버플로 경로가 래퍼 호출 자체를 하지 않는지 재검토했다. 새 ID 추가가 기존 저장 키와 백업 버전을 변경하지 않고 알려진 ID 집합만 확장함을 확인했다.
- 미해결/위험: 실제 Chromium, Windows/Android/iPad, PWA 설치·오프라인과 새 SHA의 원격 CI는 아직 확인되지 않았다. GNU/ELF `--wrap`은 현재 GCC 교육 하네스의 기능이며 C 표준이나 Windows 링커 보장이 아니다. `dev-server.mjs`의 시간 제한과 래퍼는 프로세스·파일·네트워크를 격리하지 않으므로 신뢰하는 개인 코드 전용이다. C 20문제 목표에는 도달했지만 전체 교과서, 전 문제 교차 품질 감사, 자료구조/알고리즘 확장, Rust/Cargo 채점과 공개 샌드박스는 미완성이다.
- GitHub 반영: 이 일지를 포함하는 커밋 제목 `feat: add realloc capacity exercise`. 자신의 SHA와 새 CI 결과는 커밋 후 원격 HEAD·tree·신규 원고·Actions를 재조회하여 실행 보고서에 기록한다. 최신 base SHA `b2cf12d649e2c89f45d2e02e122535a277e96513`과 expected SHA를 사용하고 강제 푸시하지 않는다.
- 다음 우선 작업: **현재 C 20문제의 교차 품질 감사**. 공개 예시↔비공개 사례 일치, 선수 그래프, 정상/경계/오답 분포, 함수 부작용, C 표준/구현 의존 표현, 콘텐츠 필수 절, 모바일/오프라인 시나리오를 전 문제 표로 점검하고 발견한 실제 결함을 재현 검사부터 수정한다. 감사 뒤에 `reserve_students`를 사용하는 `push_student`와 기하급수적 성장 정책을 별도 의미 단위로 진행한다.
- 분야별 상태: C 20개/Rust·자료구조·알고리즘 각 1개 시범 단원, 공개 문제 정의 23개. 로컬 GCC 전체 프로그램 입출력형 8개·함수 직접 호출형 10개·다중 파일형 2개가 공유 이력·통합 백업·숙달·PWA 흐름에 연결됨. 20개 C 문제의 로컬 GCC 품질 기준은 통과했으나 실제 Chromium/기기/PWA 설치, 전체 C 교과서, 자료구조/알고리즘 확장, Rust/Cargo 채점과 공개 실행 격리는 후속 작업이다.

---

## 2026-10-13 16:57~21:01 KST — 동적 학생 배열의 안전한 생성과 해제

- 실행 시작 커밋: `6e91d9e81f8c1747317bb2ad37667b27b350853c` (`main`, tree `5e01e873b5bfac1fa0e224d1dca51370cfee1114`). GitHub 원격 `main`과 분리 작업 트리의 시작 tree가 일치하고 열린 PR이 없음을 확인했다. 이 SHA 자체의 Actions 실행은 없었으며, 직전 확인 가능한 성공 CI는 이전 SHA `4ced4534ca24fa40438d813d5897893334061f13`의 https://github.com/cys123431-ship-it/CodeWeave/actions/runs/38355474951 이므로 이번 기준선의 CI 성공으로 간주하지 않았다. 필수 운영·로드맵·아키텍처·콘텐츠 정책과 최신 일지를 읽고 직전 우선 작업인 첫 동적 메모리 단원을 선택했다. 변경 전 `npm test`는 169/169 성공, 실패/skip 0이었다.
- 목표/성공 조건: `int create_students(size_t count, int initial_score, struct Student **out_students)`가 점수와 출력 포인터를 검사하고, 곱셈 전에 `count > SIZE_MAX / sizeof *students`를 거부하며, 성공 시 정확한 크기의 배열을 할당·초기화한 뒤에만 소유권을 공개한다. 0개는 `malloc(0)` 결과에 의존하지 않고 할당 없이 성공/`NULL`로 정한다. 할당 실패와 모든 계약 실패는 기존 출력값을 보존한다. `destroy_students`는 `NULL`에 안전하고 정확히 한 번 해제한 뒤 호출자 포인터를 `NULL`로 만든다. 기존 진도·초안·iteration·통합 백업 v1 형식은 변경하지 않는다.
- 테스트 우선 재현: 공개 메타데이터, 12개 서버 사례, 함수 하네스·제한된 링커 인수, 화면 단원·정적 SVG·독자 원고 검사를 먼저 작성했다. 구현 전 표적 검사에서 신규 기능 부재에 해당하는 5건이 의도대로 실패했다. 구현 뒤 `node --test tests/exercises.test.mjs tests/dynamic-memory-content.test.mjs tests/grader-api.test.mjs` 84/84가 성공했다. 곱셈 오버플로 검사를 생략한 풀이, 할당 실패 전에 출력 포인터를 덮어쓰는 풀이, 해제 뒤 포인터를 지우지 않아 반복 해제하는 풀이를 실제 GCC 회귀로 고정했다.
- 교육 콘텐츠/UI: `src/catalog.js`, `src/exercises.js`, `src/figures.js`와 `content/c/17-dynamic-student-array.md`에 C 열아홉 번째 단원을 연결했다. 화면 13개 절과 원고에서 저장 기간과 수명, `size_t` 곱셈 오버플로, `malloc` 반환 계약, 0개 정책, 임시 포인터와 실패 시 출력 보존, 초기화 뒤 소유권 전달, `free` 뒤 수명 종료, 이중 해제와 별칭 위험을 설명했다. 완성 가능한 함수·호출 프로그램과 실제 출력, 흔한 오류, 중간 점검·요약·퀴즈, 기초/응용/도전, Mini Project, 테스트 개선과 복습 연결을 독자 작성했다. 정적 SVG는 크기 상한 검사에서 할당·초기화·소유권 전달·해제/`NULL`로 이어지는 흐름을 애니메이션 없이 표시한다.
- 채점/실행 경계: `server/grading-exercises.mjs`의 12개 사례는 3/1/2개 생성, 점수 0/100, 0개, 점수 범위 오류, `out_students == NULL`, `SIZE_MAX` 경계, 주입된 할당 실패, 두 종류의 안전한 빈 해제와 반복 해제를 검사한다. 하네스의 `__wrap_malloc`·`__wrap_free`와 GCC/ld `--wrap`을 사용해 OS 메모리 고갈 없이 실패·요청 크기·호출 횟수를 결정적으로 관찰한다. 문제별 링커 인수는 함수형 문제에만 허용하며 `malloc`/`free` 래퍼 외 플래그와 중복을 시작 시 거부한다. `dev-server.mjs`는 이 검증된 배열을 `spawnSync`의 인수 배열로 전달한다. 이는 교육용 계약 검사이며 메모리 오류 탐지기나 보안 샌드박스가 아니다.
- 브라우저/PWA/문서: `tests/browser-practice.mjs`에 19개 정답의 실제 API 사전 검사, 동적 배열 단원 제목·`SIZE_MAX`/`malloc` 도식·함수 전용 스타터·성공 제출·390px 넘침·연습장 항목을 추가했다. PWA shell을 v23으로 갱신했다. `README.md`, `docs/ROADMAP.md`, `docs/ARCHITECTURE.md`를 C 19개·전체 시범 단원/공개 정의 22개·입출력형 8개·함수 직접 호출형 9개·다중 파일형 2개와 할당 실패 래퍼의 제한에 맞췄다.
- 로컬 검사: 최종 `npm test` 176/176 성공, 실패/skip 0. 실제 GCC로 C 19문제와 신규 정상·경계 12개 및 세 대표 오답을 검사했다. 변경 JS/MJS의 `node --check`와 `git diff --check`도 성공했다. `npm run test:browser`의 API 선행 단계에서 C 19문제가 모두 통과했지만 로컬 Playwright Chromium 실행 파일 부재(`browserType.launch: Executable doesn't exist`)로 실제 UI 단계는 미실행이다. 따라서 새 단원 렌더링·390px 화면·오프라인 재로딩·설치형 PWA를 성공으로 주장하지 않는다.
- 참고 PDF 접근: `/workspace/scratch/d205f960d8c8/upload/C_Programming.pdf`는 6,838,054 bytes, 288쪽, 비암호화로 `pdfinfo`가 열었고 첫 페이지 PNG 렌더링을 직접 확인했다. `/workspace/scratch/d205f960d8c8/upload/c언어 압축 (1)(1).pdf`는 파일이 존재하지만 Poppler가 `Invalid XRef entry`, `Missing endstream`, trailer/xref 누락을 보고하여 메타데이터와 첫 페이지 렌더링에 실패했다. 따라서 C Express 본문을 읽었다고 간주하지 않았다. 두 PDF를 저장소에 넣거나 원문·캡처·상용 문제를 복제하지 않았고 원고·도식·코드·문제는 독자 작성했다.
- 발견·수정·재검토: 공개 예시는 `1 · 3개 원소 초기화`인데 초기 하네스가 내부 검증값을 여러 숫자로 출력하여 메타데이터 예시 일치 검사가 실패할 수 있었다. 하네스는 모든 내부 조건을 먼저 결합하고 공개 예시와 동일한 문장을 출력하도록 수정했다. 링커 인수를 일반 문자열로 열어 두지 않고 정확한 allowlist 검증을 추가했으며 잘못된 `-pthread` 예를 거부하는 단위 검사를 넣었다. 기존 저장 키·직렬화 버전·다중 파일 계약은 변경하지 않았다.
- 미해결/위험: `free` 뒤 별칭 포인터까지 자동으로 무효화할 수 없고 전달 포인터가 실제 유효 객체인지 하네스가 일반적으로 증명하지 않는다. GNU/ELF 계열 `--wrap` 동작은 현재 GCC 개발 환경의 채점 장치이며 C 언어 표준 기능이나 Windows 링커 보장으로 설명하지 않는다. 로컬 실제 Chromium, Windows/Android/iPad, PWA 설치·오프라인과 새 SHA의 원격 CI는 아직 확인되지 않았다. GCC 시간 제한과 래퍼는 프로세스·파일·네트워크를 격리하지 않으므로 서버는 계속 신뢰하는 개인 코드 전용이다. C 20문제, 전체 C 교과서, Rust/Cargo 채점과 공개 샌드박스는 미완성이다.
- GitHub 반영: 이 일지를 포함하는 커밋 제목 `feat: add checked dynamic student allocation`. 자신의 SHA와 새 CI 결과는 커밋 후 원격 HEAD·tree·신규 원고·Actions를 재조회하여 실행 보고서에 기록한다. 최신 base tree와 expected SHA를 사용하고 강제 푸시하지 않는다.
- 다음 우선 작업: **20번째 C 문제로 `realloc`을 이용한 학생 배열 용량 증가 계약을 설계**한다. 새 용량의 곱셈 오버플로, 0 용량 정책, 임시 포인터를 통한 실패 시 원본 포인터·길이·용량 보존, 새 슬롯 초기화, 축소 여부와 소유권을 먼저 문서화하고 결정적 `realloc` 실패 주입·정상/경계/오답 GCC 사례를 추가한다.
- 분야별 상태: C 19개/Rust·자료구조·알고리즘 각 1개 시범 단원, 공개 문제 정의 22개. 로컬 GCC 전체 프로그램 입출력형 8개·함수 직접 호출형 9개·다중 파일형 2개가 공유 이력·통합 백업·숙달·PWA 흐름에 연결됨. 검증된 C 20문제, 전체 C 교과서, 자료구조/알고리즘 확장, Rust/Cargo 채점, 실기기/PWA 설치와 공개 샌드박스는 후속 작업이다.

---

## 2026-10-13 16:00~16:17 KST — 구조체 배열 학생 명부 다중 파일 Mini Project

- 실행 시작 커밋: `4ced4534ca24fa40438d813d5897893334061f13` (`main`, tree `64ad87a2bceac60a319b026f3b4f0bf0df2d2e01`). GitHub 원격 HEAD와 별도 작업 트리의 파일 트리가 일치하고 열린 PR이 없으며 직전 Actions https://github.com/cys123431-ship-it/CodeWeave/actions/runs/38355474951 의 `test`·실제 Chromium `browser` 작업이 모두 성공한 기준선을 확인했다. 필수 운영·아키텍처·콘텐츠 문서와 최신 일지를 읽고 직전 우선 작업인 구조체 배열 다중 파일 프로젝트를 선택했다. 변경 전 `npm test`는 163/163 성공, 실패/skip 0이었다.
- 목표/성공 조건: 기존 `c-multi-file`과 `CODEWEAVE_MULTI_FILE_V1` 저장 형식을 바꾸지 않고 별도 `c-struct-student-registry` ID를 추가한다. `student.h`는 구조체·함수 계약, `student.c`는 안정 정렬·첫 위치 이진 탐색, `main.c`는 입력·출력을 담당한다. 실제 GCC가 정렬 전/후, 안정 중복, 첫·마지막, 미발견, 한 원소, 빈 입력, 현재 환경의 정수 극값, 잘못된 개수, 불완전한 입력과 링크 실패를 구분해야 한다. 기존 진도·초안·iteration·통합 백업 v1 데이터는 그대로 읽어야 한다.
- 테스트 우선 재현: 새 공개 메타데이터, 10개 서버 사례, 화면 단원·세 파일 스타터·정적 SVG·독자 원고 검사를 먼저 작성했다. 구현 전 표적 검사 8건 중 기존 4건은 성공하고 새 문제·단원·그림·원고가 없어 4건이 의도대로 실패했다. 이후 불안정한 `>=` 삽입 정렬, 중복을 만나는 즉시 반환하는 이진 탐색, 검색 정의 누락을 실제 API 회귀로 추가했다.
- 교육 콘텐츠/UI: `src/catalog.js`, `src/exercises.js`, `src/figures.js`와 `content/c/16-struct-student-registry.md`에 C 열여덟 번째 단원을 연결했다. 화면 13개 절과 원고에서 파일별 책임, 스스로 완전한 헤더, 구조체 전체 이동, 엄격한 비교와 signed overflow, 정렬 전제, `[left, right)` 하한, 안정 중복과 첫 위치, 빈 입력, 컴파일·링크 단계, 복잡도와 이식성 경계를 설명했다. 완성 코드·실제 출력·흔한 오류·점검·요약·퀴즈·기초/응용/도전·Mini Project·테스트 개선·복습 연결을 독자 작성했다. 정적 SVG는 선언·정의·호출에서 안정 정렬과 첫 위치 결과로 이어지는 흐름을 애니메이션 없이 표시한다.
- 채점/경계: 새 과제는 `main.c`, `student.c`, `student.h` 세 파일을 요구하고 기존 다중 파일 파서와 서버 컴파일 경로를 재사용한다. 10개 사례는 공개 예시, 이미 정렬된 첫 값, 역순 마지막 값, 모든 키 중복, 값 사이 미발견, 한 원소, 빈 배열, 현 GCC의 32비트 `int` 극값, 최대 개수 초과와 레코드 누락을 검사한다. C가 `int`를 정확히 32비트로 보장한다고 설명하지 않고 이 사례가 현재 실행 환경의 경계임을 원고에 명시했다.
- 발견·수정·재검토: 첫 음성 회귀에서 즉시 반환 오답이 공개 예시의 첫 중복을 우연히 선택하여 `tests[0]`은 통과했다. 모든 키가 같은 네 번째 사례에서 인덱스 1을 반환해 실제 결함이 드러나는 것을 확인하고 검사를 그 사례로 바로잡았다. 원고 검사는 Markdown 백틱 유무보다 `같은 id의 상대 순서`라는 계약 문구를 직접 확인하도록 표현을 명확히 했다. 저장 키·직렬화 버전·기존 `c-multi-file` 계약과 서버 보안 경계는 변경하지 않았다.
- 로컬 검사: 최종 `npm test` 169/169 성공, 실패/skip 0. 실제 GCC로 C 18문제와 새 정상·경계 10개, 불안정 정렬·첫 중복 위반·정의 누락 링크 실패를 검사했다. 변경 JS/MJS의 `node --check`와 `git diff --check`도 성공했다. `npm run test:browser`의 API 선행 단계에서 C 18문제는 모두 통과했으나 로컬 Playwright Chromium 실행 파일 부재(`browserType.launch: Executable doesn't exist`)로 UI 단계는 미실행이다. 새 단원 렌더링·세 편집기·실제 제출·390px 넘침·연습장 항목과 오프라인 회귀는 반영 후 GitHub Actions의 설치된 Chromium으로 판정하며 API 성공을 브라우저 성공으로 보고하지 않는다.
- 참고 PDF 접근: `/workspace/scratch/d205f960d8c8/upload/C_Programming.pdf`는 6,838,054 bytes, 288쪽, 비암호화로 `pdfinfo`가 열었고 첫 페이지 PNG 렌더링도 성공했다. `/workspace/scratch/d205f960d8c8/upload/c언어 압축 (1)(1).pdf` 파일은 25,383,424 bytes로 존재하고 읽기 권한도 있으나 Poppler가 `Invalid XRef entry`, trailer/xref 누락을 보고하여 메타데이터 읽기와 첫 페이지 렌더링에 실패했다. 따라서 C Express 본문을 읽었다고 간주하지 않았다. 어느 PDF도 저장소에 추가하지 않았고 이번 원고·도식·코드·문제는 독자 작성했다.
- 문서/PWA: `README.md`, `docs/ROADMAP.md`, `docs/ARCHITECTURE.md`를 C 18개·전체 시범 단원/공개 정의 21개·입출력형 8개·함수형 8개·다중 파일형 2개에 맞췄다. Chromium 시나리오에는 새 세 파일 실제 제출·모바일 너비·연습장 선택을 추가했고 PWA shell은 v22로 갱신했다.
- 미해결/위험: 유한한 출력 사례는 임의 입력에서의 정렬 안정성·로그 탐색을 수학적으로 증명하지 않는다. 현재 극값 입력은 검사 환경의 `int` 폭에 의존한다. GCC 시간 제한과 파일명 검증은 프로세스·파일·네트워크를 격리하지 않으므로 로컬 서버는 계속 신뢰하는 개인 코드 전용이다. 로컬 실제 Chromium, Windows/Android/iPad, PWA 설치와 공개 배포는 검증하지 않았다. C 20문제, 동적 메모리·파일 입출력 등 전체 C 교과서, 자료구조/알고리즘 확장, Rust 채점과 공개 샌드박스는 미완성이다.
- GitHub 반영: 이 일지를 포함하는 커밋 제목 `feat: add multi-file student registry project`. 자신의 SHA와 새 CI 결과는 커밋 후 원격 HEAD·신규 원고·Actions를 재조회하여 실행 보고서에 기록한다. 최신 base tree와 expected SHA를 사용하고 강제 푸시하지 않는다.
- 다음 우선 작업: **C 동적 메모리의 첫 교과서형 단원과 19번째 채점 문제**. `size_t` 곱셈 오버플로를 먼저 검사한 뒤 `malloc`/`free`로 학생 배열을 만들고 모든 실패·조기 반환 경로에서 자원을 정리하는 작은 전체 프로그램을 설계한다. 빈 개수 정책, 할당 실패를 안정적으로 주입하는 테스트 가능 계약, 0바이트 할당의 구현 의존성을 먼저 문서화하고 기존 학생 명부와 중복되지 않는 정상·경계·오답 사례를 작성한다.
- 분야별 상태: C 18개/Rust·자료구조·알고리즘 각 1개 시범 단원, 공개 문제 정의 21개. 로컬 GCC 전체 프로그램 입출력형 8개·함수 직접 호출형 8개·다중 파일형 2개가 공유 이력·통합 백업·숙달·PWA 흐름에 연결됨. 검증된 C 20문제, 전체 C 교과서, 자료구조/알고리즘 확장, Rust/Cargo 채점, 실기기/PWA 설치와 공개 샌드박스는 후속 작업이다.

---

## 2026-10-13 15:03~15:10 KST — 정렬된 구조체 배열에서 첫 학번 이진 탐색

- 실행 시작 커밋: `1ddaca6346d97e0af22af0b270263d2583824739` (`main`, tree `389780a4e05d6080540a3c559eca3dfe142b8b09`). GitHub 원격 HEAD와 별도 작업 트리의 파일 트리가 일치하고 열린 PR이 없으며 직전 Actions https://github.com/cys123431-ship-it/CodeWeave/actions/runs/38257998934 의 `test`·실제 Chromium `browser` 작업이 모두 성공한 기준선을 확인했다. 필수 운영·아키텍처·콘텐츠 문서와 최신 일지를 읽고 안정 정렬 다음 작업을 선택했다.
- 목표/성공 조건: `int find_first_student_by_id(const struct Student students[], size_t count, int target_id, size_t *out_index)`가 학번 오름차순 정렬을 호출자 전제로 받아 중복 학번의 첫 위치를 찾는다. 반열린 `[left, right)`와 `left + (right - left) / 2`를 사용하고, 빈 범위·잘못된 포인터·미발견에서는 0을 반환하며 유효한 출력 객체를 보존한다. 배열을 바꾸거나 출력하지 않고 기존 진도·초안·iteration·통합 백업 v1 형식도 변경하지 않는다.
- 테스트 우선 재현: 공개 메타데이터·선수 단원·12개 서버 사례·하네스와 단원·정적 그림·독자 원고 검사를 먼저 추가했다. 구현 전 표적 검사 8건 중 기존 4건은 성공하고 새 문제·단원·도식·원고가 없어 4건이 의도대로 실패했다. 중복을 만나는 즉시 반환하는 풀이, 미발견/실패 전에 출력을 덮는 풀이, 표준 출력 부작용과 무한 반복을 실제 GCC 회귀로 고정했다. 선형 탐색을 작은 유한 입력만으로 안정적으로 배제하는 검사는 시간 측정에 의존해 거짓 판정을 만들 수 있어 추가하지 않았고, 그 검증 한계를 원고와 설계 문서에 명시했다.
- 교육 콘텐츠/UI: `c-struct-array-binary-search`를 C 열일곱 번째 단원으로 추가했다. 화면 12개 절과 `content/c/15-struct-array-binary-search.md`에서 정렬 전제, 선형 탐색과 이진 탐색, 반열린 구간 불변식, 안전한 중간점, lower-bound 방식의 첫 중복 위치, 실패 시 출력 보존, `const`, 호출자 포인터 범위 전제와 `O(log n)` 시간·`O(1)` 공간을 설명했다. 완성 프로그램과 실제 출력, 흔한 오류, 중간 점검·요약, 기초/응용/도전·Mini Project·테스트 개선·복습 연결을 독자 작성했다. 정적 SVG는 `7:A`, `7:B`, `7:C` 중 첫 위치로 왼쪽 경계를 좁히는 과정을 애니메이션 없이 보여 준다.
- 채점/경계: 서버 전용 하네스의 12개 사례는 공개 중복 예시, 첫·마지막 원소, 단일 원소 성공·실패, 세 중복의 첫 위치, 값 사이 미발견, `NULL, 0`, 비NULL 0 길이, 양수 길이 `NULL`, `NULL` 출력 포인터와 `INT_MIN`/0/`INT_MAX`를 포함한다. 실패 사례는 감시값 77을 보존한다. 배열은 읽기 전용이며 정렬 여부를 함수가 다시 선형 확인하지 않는 계약으로 문서와 채점을 맞췄다.
- 통합/PWA/브라우저: 새 ID를 메인 단원·반복 제출 연습장·공유 iteration·숙달 흐름에 연결했고 저장 키와 백업 버전은 유지했다. Chromium 시나리오에는 중복 즉시 반환 오답 → lower-bound 정답 → 두 iteration → 이론 읽기 → 퀴즈 → 전체 숙달과 연습장 선택을 추가했다. PWA shell은 v21로 갱신했다.
- 로컬 검사: 관련 공개·원고·GCC 표적 검사 77/77 성공. 최종 `npm test` 163/163 성공, 실패/skip 0이며 실제 GCC로 C 17문제, 신규 정상·경계 12개와 네 대표 오답을 검사했다. 변경 JS/MJS의 `node --check`와 `git diff --check`도 성공했다.
- 로컬 브라우저 시도: `npm run test:browser`에서 C 17문제의 실제 GCC API 검증은 모두 성공했으나 Playwright Chromium 실행 파일 부재(`browserType.launch: Executable doesn't exist`)로 UI 단계는 미실행이다. 새 단원 렌더링·iteration·숙달·연습장·오프라인 회귀는 반영 후 GitHub Actions의 설치된 Chromium으로 판정하며 API 성공을 브라우저 E2E 성공으로 보고하지 않는다.
- 문서/자료: `README.md`, `docs/ROADMAP.md`, `docs/ARCHITECTURE.md`를 C 17개·공개 정의 20개·입출력형 8개·함수 직접 호출형 8개·다중 파일형 1개·PWA shell v21에 맞췄다. 두 참고 PDF의 로컬 접근과 크기(25,383,424 bytes/6,838,054 bytes)를 다시 확인했지만 이번 원고·도식·코드·문제는 독자 작성했고 PDF 본문·캡처·상용 문제를 복제하지 않았다.
- 미해결/위험: 정렬 전제와 포인터가 실제로 `count`개 객체를 가리키는지는 함수가 증명하지 않는다. 유한 사례 통과는 모든 입력에서의 로그 복잡도 증명이 아니다. 함수 하네스와 시간 제한은 메모리·파일·네트워크를 격리하지 않으므로 로컬 GCC 서버는 계속 신뢰하는 개인 코드 전용이다. 로컬 실제 Chromium, Windows/Android/iPad, PWA 설치와 공개 배포는 검증하지 않았다. C 20문제, 전체 교과서, Rust/Cargo 채점과 공개 샌드박스는 미완성이다.
- GitHub 반영: 이 일지를 포함하는 커밋 제목 `feat: add structure array binary search exercise`. 자신의 SHA와 새 CI 결과는 커밋 후 원격 HEAD·신규 원고·Actions를 재조회하여 실행 보고서에 기록한다. 최신 base tree와 expected SHA를 사용하고 강제 푸시하지 않는다.
- 다음 우선 작업: **안정 정렬과 첫 위치 이진 탐색을 결합한 구조체 배열 다중 파일 미니 프로젝트**. `student.h`, `student.c`, `main.c`의 선언·정의·호출 경계를 고정하고 정렬 전/후, 중복, 미발견, 빈 입력과 링크 실패를 실제 GCC 사례로 설계한다. 기존 `c-multi-file`의 저장 형식과 세 파일 계약을 깨지 않고 별도 문제 ID로 확장한다.
- 분야별 상태: C 17개/Rust·자료구조·알고리즘 각 1개 시범 단원, 공개 문제 정의 20개. 로컬 GCC 전체 프로그램 입출력형 8개·함수 직접 호출형 8개·다중 파일형 1개가 공유 이력·통합 백업·숙달·PWA 흐름에 연결됨. C 20문제, 동적 메모리·파일 입출력 등 전체 C 교과서, 자료구조/알고리즘 확장, Rust 채점, 실기기/PWA 설치와 공개 샌드박스는 후속 작업이다.

---

## 2026-10-12 18:55~22:42 KST — 구조체 배열을 학번순으로 안정 정렬

- 실행 시작 커밋: `4433714fef31f0a8c8b9038de280f159d6dcc07d` (`main`, tree `08267ae39de685d84f7b3746a1ba025505c29dbb`). GitHub 원격 HEAD와 별도 작업 트리의 파일 트리가 일치하고 열린 PR이 없으며 직전 Actions https://github.com/cys123431-ship-it/CodeWeave/actions/runs/38227843960 의 `test`·실제 Chromium `browser` 작업이 모두 성공한 기준선을 확인했다. 필수 운영·아키텍처·콘텐츠 문서와 최신 일지를 읽고 변경 전 `npm test` 146/146 성공을 확인했다.
- 목표/성공 조건: `int stable_sort_students_by_id(struct Student students[], size_t count)`가 `id` 오름차순으로 구조체 전체를 안정 정렬한다. 같은 학번의 기존 순서와 `score` 결합을 보존하고, `count == 0`은 `students == NULL`이어도 성공하며 양수 길이의 `NULL`은 실패한다. `INT_MIN`/`INT_MAX`도 뺄셈 없이 비교하고 표준 출력 부작용이 없어야 하며 기존 진도·초안·iteration·통합 백업 v1 형식은 변경하지 않는다.
- 테스트 우선 재현: 공개 메타데이터·선수 단원·11개 서버 사례·하네스와 단원·정적 그림·독자 원고 검사를 먼저 추가했다. 구현 전 표적 검사 8건 중 기존 4건은 성공하고 새 문제·단원·도식·원고가 없어 4건이 의도대로 실패했다. 이후 불안정 선택 정렬, `id`만 이동하는 풀이, `NULL, 0`을 거부하는 풀이, 표준 출력 부작용, 무한 반복을 실제 GCC 회귀로 고정했다.
- 교육 콘텐츠/UI: `c-struct-array-sort`를 C 열여섯 번째 단원으로 추가했다. 화면 12개 절과 `content/c/14-struct-array-sort.md`에서 정렬 키와 레코드 전체 이동, 안정성, 삽입 정렬의 `[0, i)` 불변식, 엄격한 `>`, `size_t`의 0 경계, 비교 뺄셈의 signed overflow, 빈 범위 계약, 시간·공간 복잡도를 설명했다. 완성 프로그램과 실제 출력, 흔한 오류, 점검·요약, 기초/응용/도전·Mini Project·테스트 개선·복습 연결을 독자 작성했다. 정적 SVG는 같은 학번 `205:A`, `205:B`의 상대 순서가 유지되는 이유를 애니메이션 없이 보여 준다.
- 채점/경계: 서버 전용 하네스의 11개 사례는 공개 혼합 입력, 이미 정렬, 역순, 한 원소, 중복 안정성, 모두 같은 키, `INT_MIN`/0/`INT_MAX`, 음수·양수 혼합, `NULL, 0`, 비NULL 0 길이와 객체 보존, 양수 길이 `NULL`을 포함한다. 정답은 구조체 대입으로 레코드 전체를 이동하고 `students[j - 1].id > key.id`로 직접 비교한다. 삽입 정렬은 최악·평균 `O(n²)`, 이미 정렬된 입력 `O(n)`, 추가 공간 `O(1)`임을 계약과 문서에 일치시켰다.
- 통합/PWA/브라우저: 새 ID를 메인 단원·반복 제출 연습장·공유 iteration·숙달 흐름에 연결했고 저장 키와 백업 버전은 유지했다. Chromium 시나리오에는 불안정 오답 → 안정 정답 → 두 iteration → 이론 읽기 → 퀴즈 → 전체 숙달과 연습장 선택을 추가했다. PWA shell은 v20으로 갱신했다.
- 로컬 검사: 구현 후 관련 공개·원고·GCC 표적 검사 72/72 성공. 최종 `npm test` 155/155 성공, 실패/skip 0이며 실제 GCC로 C 16문제, 신규 정상·경계 11개와 다섯 대표 오답을 검사했다. `src/catalog.js`, `src/exercises.js`, `src/figures.js`, `server/grading-exercises.mjs`, `tests/browser-practice.mjs`, `tests/exercises.test.mjs`, `tests/grader-api.test.mjs`, `tests/struct-array-sort-content.test.mjs`, `sw.js`의 `node --check`와 `git diff --check`도 성공했다.
- 로컬 브라우저 시도: `npm run test:browser`에서 C 16문제의 실제 GCC API 검증은 모두 성공했으나 Playwright Chromium 실행 파일 부재(`browserType.launch: Executable doesn't exist`)로 UI 단계는 미실행이다. Chromium 설치 시도는 환경의 자동 승인 검토 사용 한도로 명령 자체가 실행되지 않았고 우회하지 않았다. 새 단원 렌더링·iteration·숙달·연습장·오프라인 회귀는 반영 후 GitHub Actions의 설치된 Chromium으로 판정하며 API 성공을 브라우저 E2E 성공으로 보고하지 않는다.
- 문서/자료: `README.md`, `docs/ROADMAP.md`, `docs/ARCHITECTURE.md`를 C 16개·공개 정의 19개·입출력형 8개·함수 직접 호출형 7개·다중 파일형 1개·PWA shell v20에 맞췄다. 두 참고 PDF의 로컬 접근과 크기(87,753,393 bytes/6,838,054 bytes)를 다시 확인했지만 이번 원고·도식·코드·문제는 독자 작성했고 PDF 본문·캡처·상용 문제를 복제하지 않았다.
- 미해결/위험: 함수는 포인터가 실제로 `count`개 객체를 가리키는지 증명하지 않으며 하네스와 시간 제한은 메모리·파일·네트워크를 격리하지 않는다. 로컬 GCC 서버는 계속 신뢰하는 개인 코드 전용이다. 로컬 실제 Chromium, Windows/Android/iPad, PWA 설치와 공개 배포는 검증하지 않았다. C 20문제, 전체 교과서, Rust/Cargo 채점과 공개 샌드박스는 미완성이다.
- GitHub 반영: 이 일지를 포함하는 커밋 제목 `feat: add stable structure array sort exercise`. 자신의 SHA와 새 CI 결과는 커밋 후 원격 HEAD·신규 원고·Actions를 재조회하여 실행 보고서에 기록한다. 최신 base tree와 expected SHA를 사용하고 강제 푸시하지 않는다.
- 다음 우선 작업: **정렬된 구조체 배열에서 첫 학번을 이진 탐색하는 함수형 실습의 테스트 우선 설계**. 빈 배열·첫/마지막·중복의 첫 위치·미발견·`NULL`·출력 보존을 검사하고, `left + (right - left) / 2` 경계와 정렬 전제, 선형 검색과의 복잡도 차이를 설명한다. 기존 검색·안정 정렬 단원의 ID와 저장 데이터를 유지한다.
- 분야별 상태: C 16개/Rust·자료구조·알고리즘 각 1개 시범 단원, 공개 문제 정의 19개. 로컬 GCC 전체 프로그램 입출력형 8개·함수 직접 호출형 7개·다중 파일형 1개가 공유 이력·통합 백업·숙달·PWA 흐름에 연결됨. C 20문제, 동적 메모리·파일 입출력 등 전체 C 교과서, 자료구조/알고리즘 확장, Rust 채점, 실기기/PWA 설치와 공개 샌드박스는 후속 작업이다.

---

## 2026-10-12 17:57~18:06 KST — 구조체 배열에서 첫 일치 학번 검색

- 실행 시작 커밋: `1d30630265cb0a0f58c95837faae0a7b5589014f` (`main`). GitHub 원격 HEAD와 깨끗한 별도 worktree를 일치시켰고 열린 PR이 없으며 직전 Actions https://github.com/cys123431-ship-it/CodeWeave/actions/runs/38223484536 의 `test`·실제 Chromium `browser` 작업이 모두 성공한 기준선을 확인했다. 필수 운영·콘텐츠 문서와 최신 일지의 다음 작업을 읽고 변경 전 `npm test` 137/137 성공을 확인했다.
- 목표/성공 조건: `struct Student` 배열의 `[0, count)` 범위에서 `id`가 같은 첫 원소를 찾아 `size_t` 인덱스를 출력 객체에 기록한다. 중복 학번은 첫 일치를 선택하고, 미발견·`NULL` 배열·0 길이·`NULL` 출력에서는 0을 반환하며 유효한 출력 객체를 보존한다. 배열은 `const`로 읽기 전용임을 드러내고 기존 진도·초안·iteration·통합 백업 v1 형식은 변경하지 않는다.
- 테스트 우선 재현: 공개 정의·선수 단원·11개 비공개 사례·하네스와 단원·정적 그림·독자 원고 검사를 먼저 추가했다. 구현 전 표적 검사 8건 중 기존 4건은 성공하고 새 문제·단원·도식·원고가 없어 4건이 실패하는 상태를 확인했다. 이후 정답과 마지막 중복을 반환하는 풀이, 실패 전에 출력을 덮는 풀이, 인덱스 0을 건너뛰는 풀이, 표준 출력 부작용, 무한 반복 회귀를 실제 GCC 검사로 고정했다.
- 교육 콘텐츠/UI: `c-struct-array-search`를 C 열다섯 번째 단원으로 추가했다. 화면 12개 절과 `content/c/13-struct-array-search.md`에서 구조체 배열 원소와 패딩 경계, `students[i].id`와 `students->id` 차이, 배열 매개변수의 포인터 조정, `sizeof students`의 한계, 별도 `count`, `const`, `[0, count)`, 첫 일치 정책, 실패 시 출력 보존, `O(n)` 시간·`O(1)` 공간을 설명했다. 완성 프로그램과 결과, 흔한 오류, 점검·요약, 기초/응용/도전·Mini Project·테스트 개선·복습 연결을 독자 작성했다. 정적 SVG는 세 학생을 순서대로 검사해 학번 205의 첫 일치 인덱스 1을 기록하는 성공과 세 실패 분기를 애니메이션 없이 대비한다.
- 채점/경계: 서버 전용 하네스의 11개 사례는 중간 공개 예시, 첫·마지막 원소, 단일 원소 성공·미발견, 중복의 첫 위치, 일반 미발견, `students == NULL`, `count == 0`, `out_index == NULL`, `INT_MIN` 학번을 포함한다. 실패 사례에서는 감시값 77을 보존한다. 검색에 관계없는 `score` 유효성 정책을 임의로 추가하지 않으며, 포인터가 실제 `count`개 객체를 가리키는지는 C 함수가 증명할 수 없음을 원고와 설계 문서에 명시했다.
- 통합/PWA/브라우저: 새 ID를 메인 단원·반복 제출 연습장·공유 iteration·숙달 흐름에 연결했고 저장 키와 백업 버전은 유지했다. 실제 Chromium 시나리오에는 마지막 중복 위치 오답 → 첫 일치 정답 → 두 iteration → 이론 읽기 → 퀴즈 → 전체 숙달과 연습장 선택을 추가했다. PWA shell은 v19로 갱신했다.
- 로컬 검사: 최종 `npm test` 146/146 성공, 실패/skip 0. 실제 GCC로 C 15문제와 새 11개 정상·경계 사례 및 다섯 오답 회귀를 검사했다. `src/catalog.js`, `src/exercises.js`, `src/figures.js`, `server/grading-exercises.mjs`, `tests/browser-practice.mjs`, `tests/grader-api.test.mjs`, `sw.js`의 `node --check`와 `git diff --check`도 성공했다.
- 로컬 브라우저 시도: `npm run test:browser`에서 C 15문제의 실제 GCC API 검증은 모두 성공했으나 Playwright Chromium 실행 파일 부재(`browserType.launch: Executable doesn't exist`)로 UI 단계는 미실행이다. 새 단원 렌더링·iteration·숙달·연습장·오프라인 회귀는 반영 후 GitHub Actions의 설치된 Chromium으로 판정하며 API 성공을 브라우저 E2E 성공으로 보고하지 않는다.
- 문서/자료: `README.md`, `docs/ROADMAP.md`, `docs/ARCHITECTURE.md`를 C 15개·공개 정의 18개·입출력형 8개·함수 직접 호출형 6개·다중 파일형 1개·PWA shell v19에 맞췄다. 두 참고 PDF의 로컬 접근과 크기(87,753,393 bytes/6,838,054 bytes)를 다시 확인했지만 이번 원고·도식·코드·문제는 독자 작성했고 PDF 본문·캡처·상용 문제를 복제하지 않았다.
- 미해결/위험: `const`는 일반적인 소스 대입을 막을 뿐 유효한 포인터·실제 배열 길이·악의적인 형 변환을 증명하지 않는다. 함수 하네스와 시간 제한도 메모리·파일·네트워크를 격리하지 않으므로 로컬 서버는 계속 신뢰하는 개인 코드 전용이다. 로컬 실제 Chromium, Windows/Android/iPad, PWA 설치와 공개 배포는 검증하지 않았다.
- GitHub 반영: 이 일지를 포함하는 커밋 제목 `feat: add structure array search exercise`. 자신의 SHA와 새 CI 결과는 커밋 후 원격 HEAD·파일·Actions를 재조회하여 실행 보고서에 기록한다. 최신 base tree와 expected SHA를 사용하고 강제 푸시하지 않는다.
- 다음 우선 작업: **구조체 배열을 학번 기준으로 안정 정렬하는 함수형 실습의 테스트 우선 설계**. 구조체 전체 이동, 오름차순, 같은 학번의 기존 순서 유지, 이미 정렬/역순/한 원소/0 길이/`NULL`/`INT_MIN`·`INT_MAX`를 먼저 실제 GCC 사례로 고정하고 비교식 뺄셈의 signed 넘침과 배열 범위를 설명한다. 현재 검색 단원의 ID·저장 데이터와 백업 v1을 유지한다.
- 분야별 상태: C 15개/Rust·자료구조·알고리즘 각 1개 시범 단원, 공개 문제 정의 18개. 로컬 GCC 전체 프로그램 입출력형 8개·함수 직접 호출형 6개·다중 파일형 1개가 공유 이력·통합 백업·숙달·PWA 흐름에 연결됨. C 20문제, 동적 메모리·파일 입출력 등 전체 C 교과서, 자료구조/알고리즘 확장, Rust 채점, 실기기/PWA 설치와 공개 샌드박스는 후속 작업이다.

---

## 2026-10-12 17:00~17:22 KST — 구조체 포인터로 학생 점수 안전하게 갱신

- 실행 시작 커밋: `a3e7a04a8625b6a861234eb2a625b6d984e200b7` (`main`). 로컬과 `origin/main`이 일치하고 작업 트리가 깨끗한 상태에서 시작했다. 열린 PR은 없고 직전 Actions https://github.com/cys123431-ship-it/CodeWeave/actions/runs/38219069463 의 `test`·실제 Chromium `browser` 작업이 모두 성공한 기준선을 이어받았다. 필수 운영 문서와 최신 일지의 구조체 우선 작업을 확인했으며 변경 전 `npm test`는 128/128 성공했다.
- 목표/성공 조건: `struct Student { int id; int score; }`의 객체와 자료형을 구분하고 값 복사와 주소 전달, 점/화살표 멤버 접근을 설명한다. `int update_score(struct Student *student, int delta)`는 유효한 현재 점수와 결과 범위를 모두 0~100으로 제한하고, 성공 시 `score`만 바꾸며 실패 시 객체 전체를 보존해야 한다. `NULL`, 잘못된 현재 상태, `INT_MIN`/`INT_MAX` 변화량, 출력 부작용과 시간 초과를 실제 GCC로 검사하고 기존 진도·초안·iteration·통합 백업 v1 형식을 유지한다.
- 테스트 우선 재현: 공개 문제·선수 단원·11개 비공개 사례·하네스, 단원·정적 그림·독자 원고 및 다섯 대표 오답 회귀를 먼저 작성했다. 구현 전 표적 검사 60건 중 기존 49건은 성공하고 미등록 문제·단원·도식·원고 때문에 11건이 실패했다. 구현 후 59/60 성공 상태에서 정렬된 기대 ID 목록의 `strtol`/`struct` 순서가 뒤바뀐 fixture 1건을 발견해 고치고 전체 검사를 다시 실행했다.
- 교육 콘텐츠/UI: `c-struct-student-score`를 C 열네 번째 단원으로 추가했다. 화면 12개 절과 `content/c/12-struct-student-score.md`에서 구조체 정의와 객체, 지정 초기화, `.`와 `->`, 값 복사와 객체 주소 전달, `NULL` 검사 순서, 유효한 현재 상태, 검증 후 변경, 구조체 대입과 얕은 복사, 패딩·정렬·직렬화 이식성 경계를 설명했다. 완성 프로그램과 실행 결과, 흔한 오류, 중간 점검·요약, 기초/응용/도전·Mini Project·테스트 개선·복습 연결을 독자 작성했다. 정적 SVG는 성공 시 `score`만 변경하고 `id`를 유지하는 경로와 실패 시 원본 보존 경로를 애니메이션 없이 대비한다.
- 넘침 없는 계약/채점: 현재 `score`가 0~100임을 먼저 확인한 다음 `delta < -student->score || delta > 100 - student->score`를 검사한다. 이 범위에서는 비교식의 피연산 자체가 안전하므로 signed 덧셈을 하기 전에 범위 밖 요청을 거부할 수 있다. 서버 전용 하네스의 11개 사례는 정상, 하한 0, 상한 100, 변화량 0, 양쪽 범위 초과, 양쪽 잘못된 현재 점수, `NULL`, `INT_MAX`와 `INT_MIN`을 포함한다. 실패 전에 변경하는 풀이, 잘못된 현재 상태를 정상으로 수리하는 풀이, `id`까지 변경하는 풀이, 표준 출력 부작용과 무한 반복을 실제로 거부했다.
- 호환/PWA/브라우저: 새 ID를 메인 단원·반복 제출 연습장·공유 iteration·숙달 흐름에 연결했고 저장 키와 백업 버전은 변경하지 않았다. 브라우저 시나리오에는 실패 전 원본을 바꾸는 오답 → 정답 → 두 iteration → 이론 읽기 → 퀴즈 → 전체 숙달과 연습장 선택을 추가했다. PWA shell은 v18로 갱신했다.
- 로컬 검사: 최종 `npm test` 137/137 성공, 실패/skip 0. 실제 GCC로 C 14문제, 새 11개 정상·경계 사례와 다섯 오답 회귀를 검사했다. `src/catalog.js`, `src/exercises.js`, `src/figures.js`, `server/grading-exercises.mjs`, `tests/browser-practice.mjs`, `sw.js`의 `node --check`와 `git diff --check`도 성공했다.
- 로컬 브라우저 시도: `npm run test:browser`에서 C 14문제의 실제 GCC API 검증은 모두 성공했으나 Playwright Chromium 실행 파일 부재(`browserType.launch: Executable doesn't exist`)로 UI 단계는 미실행이다. 새 단원 렌더링·iteration·숙달·연습장·오프라인 회귀는 반영 후 GitHub Actions의 설치된 Chromium으로 판정하며 API 성공을 브라우저 E2E 성공으로 보고하지 않는다.
- 문서/자료: `README.md`, `docs/ROADMAP.md`, `docs/ARCHITECTURE.md`를 C 14개·공개 정의 17개·입출력형 8개·함수 직접 호출형 5개·다중 파일형 1개·PWA shell v18에 맞췄다. 두 참고 PDF의 로컬 접근과 크기(87,753,393 bytes/6,838,054 bytes)를 확인했지만 이번 원고·도식·코드·문제는 독자 작성했고 PDF 본문·캡처·상용 문제를 복제하지 않았다.
- 미해결/위험: 함수 하네스는 임의 포인터의 유효성을 증명하거나 메모리 오류를 격리하지 않는다. 로컬 Chromium, Windows/Android/iPad 실기기와 PWA 설치는 미검증이다. 로컬 GCC 서버는 신뢰하는 개인 코드 전용 비격리 도구이며 공개 실행 서버가 아니다. C 20문제, Rust/Cargo 채점과 전체 교과서는 미완성이다.
- GitHub 반영: 이 일지를 포함하는 커밋 제목 `feat: add structure pointer update exercise`. 자신의 SHA와 CI 결과는 커밋 후 원격 HEAD·변경 파일·Actions를 재조회해 실행 보고서에 기록한다. 최신 base SHA lease를 사용하며 강제 푸시하지 않는다.
- 다음 우선 작업: **구조체 배열에서 학번으로 학생 찾기**. `const struct Student students[]`, `size_t count`, 찾은 위치를 기록할 출력 포인터를 사용해 값/주소·배열 길이·첫 일치·실패 시 출력 보존을 연결한다. 빈 배열·중복 학번·`NULL`·경계 위치·출력 부작용을 먼저 테스트로 설계하고 기존 함수형 채점 경로와 숙달 흐름을 재사용한다.
- 분야별 상태: C 14개/Rust·자료구조·알고리즘 각 1개 시범 단원, 공개 정의 17개. C 채점은 입출력 8·함수 직접 호출 5·다중 파일 1이고 공유 iteration·통합 백업·숙달·컴파일 피드백·PWA 회귀 구조를 유지한다. C 20문제, Rust 채점, 전체 교과서, 실기기·공개 샌드박스는 후속 작업이다.

## 2026-10-12 13:02~16:37 KST — `fgets`와 `strtol`로 검증 가능한 정수 입력

- 실행 시작 커밋: `44b925192c6d2b5ff10feb25cc080f2077a2f17d` (`main`). 로컬과 `origin/main`이 일치하고 직전 Actions https://github.com/cys123431-ship-it/CodeWeave/actions/runs/38198556488 의 `test`·실제 Chromium `browser` 작업이 모두 성공한 기준선을 이어받았다. 필수 운영 문서와 최신 일지의 다음 우선 작업을 확인했다.
- 목표/성공 조건: `fgets`로 첫 논리 줄을 안전하게 받고 `strtol(..., 10)`의 `endptr`와 `errno`로 정수 전체를 검증한다. 정상 양수·음수·앞뒤 공백·빈 줄·숫자 없음·뒤따르는 쓰레기 문자·표현 범위 초과·즉시 EOF·입력 길이 경계를 구분한다. C가 `long`의 비트 수를 고정하지 않는다는 사실을 지키고 기존 진도·초안·iteration·통합 백업 v1 형식을 바꾸지 않는다.
- 테스트 우선 재현: 공개 메타데이터, 단원·그림·원고, 16개 서버 사례와 네 대표 오답 검사를 먼저 추가했다. 구현 전 표적 검사에서 미등록 단원·도식·원고·채점 정의로 10개가 실패했다. 구현 뒤에는 공개 예시 입력과 채점 fixture가 어긋난 1개 실패를 확인해 동일한 앞 공백 음수 입력으로 맞추고 다시 검사했다.
- 교육 콘텐츠/UI: `c-strtol-integer-input`을 C 열세 번째 단원으로 추가했다. `content/c/11-strtol-integer-input.md`와 화면 절에서 `atoi`가 오류 원인을 구분하지 못하는 이유, `endptr == line`, 후행 공백 검사, `errno = 0` 선행 설정, `ERANGE`, `LONG_MIN/LONG_MAX`, `isspace((unsigned char)...)`, 밑 10 계약을 설명했다. 완성 프로그램·실행 결과·흔한 오류·중간 점검·요약·기초/응용/도전·Mini Project·테스트 개선·복습 연결을 독자 작성했다. 정적 SVG는 `-42` 변환값, `endptr`, 후행 공백, 범위 초과 분기를 애니메이션 없이 보여 준다.
- 입력 경계/채점: 64바이트 배열에서 첫 줄이 최대 63바이트일 때는 개행 없는 EOF도 유효하게 처리하고, 저장된 조각에 개행이 없으면 한 문자를 더 확인해 실제 64바이트 이상인 줄만 `TOO LONG`으로 분류한다. 깨끗한 즉시 EOF는 `NO INPUT`, 문법 오류는 `INVALID`, `ERANGE`는 `RANGE`, 정상 값은 `%ld`로 정규화한다. 실제 GCC 사례 16개로 정상·경계·오류를 검사하고 `atoi`, 후행 문자 미검사, 범위 미검사, 길이 미검사 오답을 거부했다.
- 호환/PWA/브라우저: 새 문제 ID를 메인 단원·연습장·공유 iteration·숙달 흐름에 연결했다. 저장 키와 백업 버전은 유지했으며 PWA shell을 v17로 갱신했다. 브라우저 시나리오에는 오답→정답→두 iteration→이론 읽기→퀴즈→전체 숙달과 연습장 선택을 추가했다.
- 로컬 검사: 최종 `npm test` 128/128 성공, 실패/skip 0. 실제 GCC로 C 13문제, 새 16개 정상·경계 사례와 네 오답 회귀를 검사했다. 변경 JS/MJS의 `node --check`와 `git diff --check`도 성공했다.
- 로컬 브라우저 시도: `npm run test:browser`에서 C 13문제의 실제 GCC API 검증은 모두 성공했으나 Playwright Chromium 실행 파일 부재(`browserType.launch: Executable doesn't exist`)로 UI 단계는 미실행이다. 새 단원 렌더링·iteration·숙달·연습장·오프라인 회귀는 반영 후 GitHub Actions의 설치된 Chromium으로 판정하며 API 성공을 브라우저 E2E 성공으로 보고하지 않는다.
- 문서/자료: `README.md`, `docs/ROADMAP.md`, `docs/ARCHITECTURE.md`를 C 13개·공개 정의 16개·입출력형 8개·함수 직접 호출형 4개·다중 파일형 1개·PWA shell v17에 맞췄다. 두 참고 PDF의 로컬 접근과 크기(87,753,393 bytes/6,838,054 bytes)를 확인했지만 이번 원고·도식·코드·문제는 독자 작성했고 PDF 본문·캡처·상용 문제를 복제하지 않았다.
- 미해결/위험: 실제 스트림 읽기 오류 주입, 로컬 Chromium, Windows/Android/iPad 실기기와 PWA 설치는 미검증이다. 로컬 GCC 서버는 신뢰하는 개인 코드 전용 비격리 도구이며 공개 실행 서버가 아니다. `strtol`은 문자열이 실제 읽기 가능한 널 종료 객체라는 호출 전제를 없애지 않는다. C 20문제, Rust/Cargo 채점과 전체 교과서는 미완성이다.
- GitHub 반영: 이 일지를 포함하는 커밋 제목 `feat: add strtol integer input exercise`. 자신의 SHA와 CI 결과는 커밋 후 원격 HEAD·변경 파일·Actions를 재조회해 실행 보고서에 기록한다. 최신 base SHA lease를 사용하며 강제 푸시하지 않는다.
- 다음 우선 작업: **구조체 기초와 포인터로 레코드 갱신하기**. `struct Student`의 필드, 값 복사와 객체 주소 전달, 유효 범위 검증, 실패 시 원본 보존을 먼저 독자 원고·정적 메모리 도식·함수형 스타터·서버 전용 GCC 하네스로 설계한다. 정상/경계/`NULL`/부작용/시간 초과 사례를 갖춘 뒤 기존 함수형 채점기·iteration·숙달 흐름에 연결한다.
- 분야별 상태: C 13개/Rust·자료구조·알고리즘 각 1개 시범 단원, 공개 정의 16개. C 채점은 입출력 8·함수 직접 호출 4·다중 파일 1이고 공유 iteration·통합 백업·숙달·컴파일 피드백·PWA 회귀 구조를 유지한다. C 20문제, Rust 채점, 전체 교과서, 실기기·공개 샌드박스는 후속 작업이다.

## 2026-10-12 11:57~12:06 KST — `fgets` 여러 조각으로 첫 논리 줄 완성

- 실행 시작 커밋: `e208d504aac4dc488d613c8fcba8b48b1355fcd2` (`main`). 로컬과 `origin/main` 일치 및 깨끗한 작업 트리를 확인했다. GitHub 연결로 최신 원격 커밋과 열린 PR 없음도 재조회했고, 직전 Actions https://github.com/cys123431-ship-it/CodeWeave/actions/runs/38195152125 의 `test`·실제 Chromium `browser` 작업이 모두 성공한 기준선을 이어받았다. 최신 일지의 다음 작업인 긴 줄 `fgets` 실습을 선택했다.
- 목표/성공 조건: `char chunk[8]`을 반복 사용해 첫 개행 전까지의 바이트 수를 누적한다. 짧은 줄, 빈 줄, 정확히 7바이트 뒤 개행, 8바이트 이상, 여러 조각, 개행 없는 마지막 줄, 즉시 EOF, 두 번째 줄 무시를 구분한다. `fgets`의 `NULL` 반환 뒤 입력 오류와 깨끗한 EOF 정책을 문서화하고, 기존 진도·초안·iteration·통합 백업 v1 키와 형식을 바꾸지 않는다.
- 테스트 우선 재현: 공개 메타데이터·9개 서버 사례·단원 원고·정적 그림 검사를 먼저 추가했다. 구현 전 표적 검사 8개 중 4개가 문제·단원·그림·원고 미등록으로 실패했다. 구현 뒤 원고 검사가 요구한 즉시 EOF 계약 문장이 의미는 있었지만 명시적 표현과 일치하지 않는 1개 실패를 발견해, `EOF 전에 읽은 바이트가 하나도 없으면 NO INPUT`이라는 계약을 본문에 직접 적고 재검사했다.
- 교육 콘텐츠/UI: `c-fgets-logical-line`을 C 열두 번째 단원으로 추가했다. 화면 12개 절과 `content/c/10-fgets-logical-line.md`에서 한 버퍼 조각과 논리적 한 줄, `sizeof chunk - 1`, 개행 보존, 정확한 버퍼 경계, 빈 줄/즉시 EOF/데이터 뒤 EOF, `ferror`, 바이트와 UTF-8 글자 수 차이, `size_t` 누적 한계를 설명했다. 완성 프로그램과 실행 결과, 흔한 오류, 점검·요약, 기초/응용/도전·Mini Project·테스트 개선·복습 연결을 독자 집필했다. 정적 SVG는 7바이트 첫 조각과 `HIJK\n` 두 번째 조각을 7 + 4로 누적하는 흐름을 애니메이션 없이 표시한다.
- 채점/경계: 전체 프로그램 입출력형 사례 9개를 등록했다. 정상 풀이를 실제 GCC로 통과시키고, 첫 `fgets` 조각만 세는 풀이, 저장된 개행을 포함하는 풀이, 두 번째 줄까지 세는 풀이, 즉시 EOF를 빈 줄처럼 0으로 출력하는 풀이를 각각 거부했다. 표준 입력 파이프로 실제 읽기 오류를 결정적으로 주입하지 못하므로 `ferror` 분기의 실행 성공은 주장하지 않고 코드·원고 계약과 향후 전용 하네스 범위로 남겼다.
- 호환/PWA/브라우저: 새 ID는 기존 v1 객체에 선택적으로 추가되며 저장 키·버전·과거 데이터를 바꾸지 않는다. 브라우저 시나리오에 오답→정답→두 iteration→이론 읽기→퀴즈→전체 숙달과 연습장 선택 항목을 추가하고 PWA shell을 v16으로 갱신했다.
- 로컬 검사: 최종 `npm test` 120/120 성공, 실패/skip 0. 실제 GCC로 C 12문제와 새 9개 정상·경계 사례 및 네 오답 분기를 검사했다. `src/app.js`, `src/catalog.js`, `src/exercises.js`, `src/figures.js`, `src/workbench.js`, `server/grading-exercises.mjs`, `tests/browser-practice.mjs`, `dev-server.mjs`의 `node --check`와 `git diff --check`도 성공했다.
- 로컬 브라우저 시도: `npm run test:browser`에서 C 12문제의 실제 GCC API 검증은 모두 성공했으나 Playwright Chromium 실행 파일 부재(`browserType.launch: Executable doesn't exist`)로 UI 단계는 미실행이다. 새 단원 렌더링·iteration·숙달·연습장·오프라인 회귀는 반영 후 GitHub Actions의 설치된 Chromium으로 판정하며 API 성공을 브라우저 E2E 성공으로 보고하지 않는다.
- 문서/자료: `README.md`, `docs/ROADMAP.md`, `docs/ARCHITECTURE.md`를 C 12개·공개 정의 15개·입출력형 7개·함수 직접 호출형 4개·다중 파일형 1개·PWA shell v16에 맞췄다. 두 참고 PDF의 로컬 접근과 크기(87,753,393 bytes/6,838,054 bytes)를 확인했지만 이번 원고·도식·코드·문제는 독자 작성했고 PDF 본문·캡처·상용 문제를 읽거나 복제하지 않았다.
- 미해결/위험: 실제 입력 오류 주입, 로컬 Chromium, Windows/Android/iPad 실기기, PWA 설치는 미검증이다. 로컬 GCC 서버는 계속 신뢰하는 개인 코드 전용 비격리 도구이며 공개 실행 서버가 아니다. 줄 전체를 저장하는 동적 버퍼, C 20문제, Rust/Cargo 채점과 전체 교과서는 미완성이다.
- GitHub 반영: 이 일지를 포함하는 커밋 제목 `feat: add fgets logical line exercise`. 자신의 SHA와 CI 결과는 커밋 후 원격 HEAD·변경 파일·Actions를 재조회해 실행 보고서에 기록한다. 최신 base SHA lease를 사용하며 강제 푸시하지 않는다.
- 다음 우선 작업: **`fgets`와 `strtol`을 결합한 검증 가능한 정수 입력 실습**. 빈 입력·공백·숫자 없음·뒤따르는 쓰레기 문자·범위 초과·정상 음수를 구분하는 계약을 먼저 작성하고, `endptr`·`errno`·`LONG_MIN/LONG_MAX`를 구현 보장 범위 안에서 설명한다. 문제 성격에 맞는 전체 프로그램 사례와 오답 회귀를 만든 뒤 메인 학습 흐름에 연결한다.
- 분야별 상태: C 12개/Rust·자료구조·알고리즘 각 1개 시범 단원, 공개 정의 15개. C 채점은 입출력 7·함수 직접 호출 4·다중 파일 1이고 공유 iteration·통합 백업·숙달·컴파일 피드백·PWA 회귀 구조를 유지한다. C 20문제, Rust 채점, 전체 교과서, 실기기·공개 샌드박스는 후속 작업이다.

## 2026-10-12 11:03~11:14 KST — 읽기 용량을 지키는 C 문자열 길이 함수

- 실행 시작 커밋: `9568f6a734105b614d2690ae9d542084a0cf4cc2` (`main`). 로컬과 `origin/main` 일치 및 깨끗한 시작 상태를 확인했다. 직전 커밋의 Actions https://github.com/cys123431-ship-it/CodeWeave/actions/runs/38190721452 에서 `test`·실제 Chromium `browser`가 모두 성공한 기준선을 이어받았다. 필수 운영 문서와 최신 일지의 다음 우선 작업을 확인했다.
- 목표/성공 조건: `int bounded_length(const char *buffer, size_t capacity, size_t *out_length)`가 `[0, capacity)`에서만 첫 널 문자를 찾는다. 정상·빈 문자열·첫 종료 문자·마지막 허용 칸·종료 누락·범위 바로 밖 종료·용량 0·두 `NULL` 계약을 실제 GCC로 검사한다. 모든 실패는 유효한 출력 객체의 기존 값을 보존하고, 기존 v1 진도·초안·iteration·통합 백업 키와 형식은 바꾸지 않는다.
- 테스트 우선 재현: 새 단원·정적 그림·원고·공개 메타데이터·비공개 하네스 검사를 먼저 작성했다. 구현 전 표적 검사 8개 중 4개가 미등록 단원·그림·원고·문제로 실패했다. 구현 후 콘텐츠 검사가 표현의 조사와 Markdown 코드 표기를 지나치게 정확히 가정한 두 실패를 확인해 의미 있는 핵심 문구와 계약을 검사하도록 고쳤다.
- 교육 콘텐츠: `c-bounded-string-length`를 C 열한 번째 단원으로 추가했다. 화면 12개 절과 `content/c/09-bounded-string-length.md`에서 포인터에 크기가 없다는 사실, 호출자의 읽기 가능 객체 전제, 반열린 범위, 정확한 마지막 칸, 실패 시 출력 보존을 설명했다. `fgets`가 성공하면 널 종료하지만 개행을 보존할 수 있고, 버퍼가 먼저 차면 개행이 남으며, `NULL` 반환 뒤 새 문자열을 가정하면 안 된다는 입력 계약도 연결했다. 정적 SVG는 capacity 4의 성공과 capacity 3의 실패를 같은 배열에서 대비하며 애니메이션을 사용하지 않는다.
- 채점/경계: 서버 전용 직접 호출 하네스에 9개 사례를 등록했다. 정상 풀이와 함께 종료 누락을 길이로 잘못 발표하는 풀이, 마지막 허용 칸을 검사하지 않는 풀이, 실패 전에 출력값을 덮어쓰는 풀이, 표준 출력 부작용을 실제 GCC API로 거부했다. 하네스의 비종료 배열은 실제 배열 크기와 같은 capacity만 전달해 검사 자체에서 의도적인 범위 밖 읽기를 만들지 않았다.
- UI/PWA/호환: 새 문제는 기존 카탈로그·메인 실습·연습장·iteration·숙달 계산에 같은 ID로 연결했다. 브라우저 시나리오에 오답→정답→두 제출 이력→이론 읽기→퀴즈→전체 숙달과 연습장 선택 항목을 추가했다. 저장 키와 버전은 그대로이며 PWA shell을 v15로 갱신했다.
- 로컬 검사: 최종 `npm test` 112/112 성공, 실패/skip 0. 실제 GCC C 11문제와 새 9개 정상·경계 사례, 네 오답 분기가 통과했다. `src/app.js`, `src/catalog.js`, `src/exercises.js`, `src/figures.js`, `src/workbench.js`, `server/grading-exercises.mjs`, `dev-server.mjs`의 `node --check`와 `git diff --check`도 성공했다.
- 로컬 브라우저 시도: `npm run test:browser`에서 C 11문제의 실제 GCC API 검증은 모두 성공했으나 Playwright Chromium 실행 파일 부재(`browserType.launch: Executable doesn't exist`)로 UI 단계는 미실행이다. 새 단원 렌더링·iteration·숙달·연습장·오프라인 회귀는 반영 후 GitHub Actions의 설치된 Chromium으로 판정하며 API 성공을 브라우저 E2E 성공으로 보고하지 않는다.
- 문서/자료: `README.md`, `docs/ROADMAP.md`, `docs/ARCHITECTURE.md`를 C 11개·공개 정의 14개·함수 직접 호출형 4개·PWA shell v15에 맞췄다. 두 참고 PDF의 로컬 접근과 크기(87,753,393 bytes/6,838,054 bytes)를 확인했지만 이번 원고·도식·코드·문제는 독자 작성했고 PDF 본문·캡처·상용 문제를 읽거나 복제하지 않았다.
- 미해결/위험: capacity는 실제 포인터와 객체 크기를 검증하지 않으며 이 하네스는 메모리 오류 탐지기나 보안 격리가 아니다. 로컬 GCC 서버는 계속 신뢰하는 개인 코드 전용이다. 로컬 Chromium과 실제 Windows/Android/iPad, PWA 설치는 미검증이다. 긴 줄의 나머지 소비 정책, C 20문제, Rust/Cargo 채점과 전체 교과서는 미완성이다.
- GitHub 반영: 이 일지를 포함하는 커밋 제목 `feat: add bounded C string exercise`. 자신의 SHA와 CI 결과는 커밋 후 원격 HEAD·변경 파일·Actions를 재조회해 실행 보고서에 기록한다. 최신 base SHA lease를 사용하며 강제 푸시하지 않는다.
- 다음 우선 작업: **`fgets`로 긴 줄을 처리하는 전체 프로그램형 입력 실습**. 빈 줄, 개행 포함, 버퍼에 정확히 맞는 입력, 여러 조각이 필요한 긴 줄, EOF와 입력 오류를 구분하는 정책을 먼저 문서화한다. 개행이 없다는 사실만으로 잘림을 단정하지 말고 다음 조각을 소비해 한 논리 줄을 완성하는 스타터·정상/경계 테스트를 설계한다.
- 분야별 상태: C 11개/Rust·자료구조·알고리즘 각 1개 시범 단원, 공개 정의 14개. C 채점은 입출력 6·함수 직접 호출 4·다중 파일 1이고 공유 iteration·통합 백업·숙달·컴파일 피드백·PWA 회귀 구조를 유지한다. C 20문제, Rust 채점, 전체 교과서, 실기기·공개 샌드박스는 후속 작업이다.

## 2026-10-12 07:56~10:05 KST — 널 종료 문자열과 문자 세기 함수 실습

- 실행 시작 커밋: `a776b5d7f8df51a3d34e7e72fe6f1b0a7cbeb32b` (`main`). 로컬과 `origin/main` 일치 및 깨끗한 시작 상태를 확인했다. 열린 PR은 없고 직전 Actions https://github.com/cys123431-ship-it/CodeWeave/actions/runs/38179296778 의 `test`·실제 Chromium `browser` 작업이 모두 성공했다. 변경 직전 `npm test` 96/96과 실제 GCC C 9문제를 통과했다.
- 목표/성공 조건: 첫 C 문자열 단원에서 문자 배열과 널 종료 문자열의 차이, `'\\0'`과 `'0'`, `const char *`와 알 수 없는 버퍼 길이, 읽기 경계를 정확히 설명한다. 기존 `c-function` 경로로 `count_char` 함수만 제출하며 정상·빈 문자열·반복·대소문자·대상 없음·널 문자 target·`NULL` 두 종류를 실제 GCC로 검증한다. 실패 시 출력 보존, 출력 부작용, 시간 초과를 구분하고 기존 초안·iteration·progress·통합 백업 v1 형식은 유지한다.
- 테스트 우선 재현: 공개 메타데이터·하네스 계약, 교과서 원고의 필수 절, 정적 도식과 브라우저 실패→수정→숙달 흐름을 먼저 추가했다. 구현 전 표적 검사 8개 중 4개가 단원·그림·원고·문제 미등록으로 실패했다. 구현 뒤 첫 전체 검사에서 종료 문자 오답 검사가 공개 API에 없는 설명 필드를 과도하게 가정해 실패했고, 비공개 사례 순서와 실제 `passed` 결과를 검사하도록 고쳐 채점 동작과 검사 책임을 분리했다.
- 교육 콘텐츠: `c-string-count-function`을 C 열 번째 단원으로 추가했다. 화면의 12개 절과 `content/c/08-strings-count-function.md`에서 개요·필요성·선수 지식·목표, 문자 배열/문자열 차이, 종료 문자, 포인터 계약, `const`, 반복 불변식, 컴파일 가능한 전체 예제와 출력, 정의되지 않은 동작, 점검·요약·기초/응용/도전·Mini Project·테스트 개선·복습 연결을 독자 집필했다. 정적 SVG는 `banana`의 문자 칸·인덱스·`\\0` 중지 지점과 `out_count` 결과를 애니메이션 없이 표시한다.
- 채점/경계: `int count_char(const char *text, char target, size_t *out_count)`의 서버 전용 직접 호출 하네스와 9개 사례를 등록했다. 첫 널 문자 전까지만 세므로 `target == '\\0'` 결과는 0이며, `text == NULL` 실패에서는 sentinel 77을 보존한다. 잘못된 종료 문자 포함, 실패 전 출력 덮어쓰기, 디버그 출력, 무한 반복을 실제 GCC API로 재현한다. 널 종료되지 않은 버퍼는 포인터만으로 검사할 수 없고 호출자가 읽기 가능한 종료 문자를 제공해야 한다는 한계를 명시했다.
- 저장/PWA/브라우저 흐름: 새 ID는 기존 v1 객체에 선택적으로 추가되어 키·버전·과거 데이터를 바꾸지 않는다. 메인 단원에서 오답→정답→최근 두 iteration→이론 읽기→퀴즈→전체 숙달, 연습장 선택 항목, 실제 API 정답 제출을 Chromium 시나리오에 추가하고 shell을 v14로 갱신했다.
- 로컬 검사: 최종 `npm test` 104/104 성공, 실패/skip 0. 실제 GCC C 10문제와 새 9개 정상·경계 사례, 종료 문자 포함 오답, 출력 보존 위반, 출력 부작용, 시간 초과가 통과했다. 변경 JS/MJS `node --check`와 `git diff --check`도 성공했다.
- 로컬 브라우저 시도: `npm run test:browser`에서 C 10문제의 실제 GCC API 검증은 모두 성공했으나 로컬 Playwright Chromium 실행 파일 부재(`browserType.launch: Executable doesn't exist`)로 UI 단계는 미실행이다. 새 문자열 단원 렌더링·iteration·숙달·연습장·오프라인 회귀는 반영 후 GitHub Actions의 설치된 Chromium으로 판정하며, 로컬 API 성공을 브라우저 E2E 성공으로 보고하지 않는다.
- 문서/자료: `README.md`, `docs/ROADMAP.md`, `docs/ARCHITECTURE.md`를 C 10개·공개 정의 13개·함수 직접 호출형 3개와 PWA shell v14에 맞췄다. 두 참고 PDF의 로컬 접근과 크기(87,753,393 bytes/6,838,054 bytes)를 확인했지만 이번 원고·도식·코드·문제는 독자 작성했고 PDF 본문·캡처·상용 문제를 읽거나 복제하지 않았다.
- 미해결/위험: 하네스는 출력 비교 기반이며 널 종료 누락 같은 메모리 오류를 안전하게 탐지하는 도구가 아니다. 로컬 GCC 서버는 계속 신뢰하는 개인 코드 전용이고 실제 Windows/Android/iPad 및 PWA 설치는 미검증이다. C 문자열의 복사·비교·입력 버퍼 후속 단원, 검증된 C 20문제, Rust/Cargo 채점, 전체 교과서는 미완성이다.
- GitHub 반영: 이 일지를 포함하는 커밋 제목 `feat: add null-terminated string exercise`. 자신의 SHA와 CI 결과는 커밋 후 원격 HEAD·변경 파일·Actions를 재조회해 실행 보고서에 기록한다. 최신 base SHA lease를 사용하며 강제 푸시하지 않는다.
- 다음 우선 작업: **길이 상한을 받는 C 문자열 함수와 입력 버퍼 경계**. 첫 널 문자를 찾지 못했을 때 실패하는 bounded 계약을 설계하고 `fgets`의 줄바꿈·버퍼 크기·빈 입력을 교과서형 설명과 경계 테스트로 연결한다. 먼저 현재 `count_char`와 중복되지 않는 학습 목표, 스타터, 정상/용량 0/종료 누락/정확한 경계/출력 보존 사례를 정의한다.
- 분야별 상태: C 10개/Rust·자료구조·알고리즘 각 1개 시범 단원, 공개 정의 13개. C 채점은 입출력 6·함수 직접 호출 3·다중 파일 1이고 공유 iteration·통합 백업·숙달·컴파일 피드백·PWA 회귀 구조를 유지한다. C 20문제, Rust 채점, 전체 교과서, 실기기·공개 샌드박스는 후속 작업이다.

## 2026-10-12 06:57~07:05 KST — 배열·출력 포인터를 다루는 두 번째 C 함수형 문제

- 실행 시작 커밋: `e8306b6ad29a288680ec2d0b4b534dbf9955a11a` (`main`). 로컬과 `origin/main` 일치 및 깨끗한 시작 상태를 확인하고 GitHub 연결로 최신 커밋 읽기와 열린 PR 없음도 재조회했다. 커밋별 workflow 조회는 직전 실행 목록을 반환하지 않아 시작 시 CI를 새로 성공했다고 주장하지 않았으며, 변경 전 로컬 `npm test` 88/88 성공으로 기준선을 확보했다.
- 목표/성공 조건: 특정 `clamp`에 묶이지 않도록 기존 `c-function` 채점 경로를 그대로 재사용해 배열·길이·출력 포인터 계약을 갖춘 두 번째 문제를 연결한다. 정상·모든 음수·중복·표현 범위 끝값·한 원소·`NULL`·길이 0·`NULL` 출력 포인터를 실제 GCC로 검사하고, 실패 시 출력 객체 보존·불필요한 출력·시간 초과를 구분한다. 메인 단원과 연습장, iteration, 숙달, PWA를 기존 v1 저장 키 변경 없이 이어야 한다.
- 테스트 우선 재현: 공개 메타데이터, 비공개 하네스, 독자 원고·정적 그림·스타터 계약과 실제 GCC 오류 분기를 먼저 작성했다. 구현 전 표적 검사는 8개 중 4개가 실패해 미등록 단원·그림·원고·채점 정의를 재현했다. 구현 후 첫 GCC 표적 검사에서 테스트가 공개 응답에 없는 `input` 필드를 참조한 결함을 발견하여, 정상 계산은 맞고 실패 시 sentinel만 덮어쓰는 오답 코드와 실제 예상/출력 진단을 기준으로 수정했다.
- 교육 콘텐츠/UI: `c-array-max-function`을 C 아홉 번째 단원으로 등록했다. 배열 매개변수의 포인터 조정, 별도 `size_t` 길이, 반환 상태와 `int *out_max` 결과 분리, 역참조 전 검사, 첫 원소 초기화, `size_t` 언더플로와 정의되지 않은 동작을 10개 화면 절·퀴즈·스타터로 설명했다. `content/c/07-array-max-function.md`에는 개요·선수 지식·목표·핵심 이론·실행 결과·오류·점검·요약·기초/응용/도전·Mini Project·테스트 개선·복습 연결을 독자 집필했다. 정적 SVG는 배열/길이 입력과 성공 상태/출력 포인터, 실패 시 출력 보존을 애니메이션 없이 표시한다.
- 채점/경계: 공개 메타데이터에 배열·길이·출력 포인터·경계 개념과 선수 단원을 추가하고, 서버 전용 하네스에 8개 사례를 등록했다. 모든 음수에서 0으로 잘못 초기화한 구현, 실패 전에 `out_max`를 덮어쓰는 구현, 디버그 출력, 무한 반복을 각각 재현한다. `INT_MAX`의 실제 숫자 폭을 C 언어의 고정 보장으로 가르치지 않도록 숫자 `2147483647` 비교 대신 하네스에서 `out == INT_MAX`를 검사한다.
- 저장/PWA/브라우저 흐름: 새 ID는 기존 `codeweave.drafts.v1`, `codeweave.iterations.v1`, progress/full-backup v1 객체에 선택적으로 추가되므로 키·버전·과거 기록을 바꾸지 않는다. 메인 단원에서 실패 제출→수정→성공→이론 읽기→퀴즈→전체 숙달, 연습장 선택 항목, 실제 API 정답 제출을 Chromium 시나리오에 추가하고 shell을 v13으로 갱신했다.
- 로컬 검사: 최종 `npm test` 96/96 성공, 실패/skip 0. 실제 GCC로 C 9문제와 새 8개 정상/경계 사례, 음수 초기화 오류, 출력 보존 위반, 출력 부작용, 시간 초과를 통과했다. 변경 JS/MJS `node --check`와 `git diff --check` 성공.
- 로컬 브라우저 시도: `npm run test:browser`에서 C 9문제의 실제 GCC API 검증은 모두 성공했으나 Playwright Chromium 실행 파일 부재(`browserType.launch: Executable doesn't exist`)로 UI 단계는 미실행이다. 새 단원 렌더링·iteration·숙달·연습장·오프라인은 반영 후 GitHub Actions의 설치된 Chromium으로 판정하며, 로컬 API 성공을 브라우저 E2E 성공으로 보고하지 않는다.
- CI 재검토/수정: 첫 원격 Actions 실행의 `test` 작업과 96개 검사는 성공했지만 `browser` 작업이 실패했다. 로그에서 배열 오답/정답 제출 단계가 새 배열 단원으로 이동하기 전에 `c-clamp-function` 화면에 잘못 삽입되어 하네스가 `clamp` 정의를 찾지 못한 테스트 순서 오류를 확인했다. 배열 단원 렌더링 확인 뒤에 해당 제출·숙달 흐름을 배치하도록 수정하고 문법·전체 회귀를 다시 검사했다. 수정 커밋의 새 Actions 결과를 최종 보고서에서 판정한다.
- 문서/자료: `README.md`, `docs/ROADMAP.md`, `docs/ARCHITECTURE.md`를 C 9개·공개 정의 12개·함수 직접 호출형 2개와 새 계약/PWA shell v13에 맞췄다. 두 참고 PDF의 로컬 접근과 크기(87,753,393 bytes/6,838,054 bytes)를 재확인했지만 이번 원고·도식·코드·문제는 독자 작성했고 PDF 본문·캡처·상용 문제를 읽거나 복제하지 않았다.
- 미해결/위험: 함수 하네스는 출력 비교 기반이며 메모리 오류 탐지기나 보안 격리가 아니다. 로컬 GCC 서버는 계속 신뢰하는 개인 코드 전용이고 실제 Windows/Android/iPad 및 PWA 설치는 미검증이다. 전체 C 교과서·검증된 20문제와 Rust/Cargo 채점도 미완성이다.
- GitHub 반영: 이 일지를 포함하는 커밋 제목 `feat: add array maximum function exercise`. 자신의 SHA와 새 CI 결과는 커밋 후 원격 HEAD·변경 파일·Actions를 재조회해 실행 보고서에 기록한다. 최신 base SHA lease를 사용하며 강제 푸시하지 않는다.
- 다음 우선 작업: **문자열의 널 종료와 안전한 범위를 설명하는 첫 C 문자열 단원/함수 실습**. 먼저 독자 원고와 정적 메모리 도식으로 배열과 문자열의 차이, `\0`, 길이, 읽기 경계를 설명하고, 작은 함수 계약·스타터·비공개 정상/빈 문자열/중복/`NULL`/부작용/시간 초과 사례를 설계한다. 기존 `c-function` 재사용 여부와 문제에 맞는 별도 계약을 테스트로 결정한다.
- 분야별 상태: C 9개/Rust·자료구조·알고리즘 각 1개 시범 단원, 공개 정의 12개. C 채점은 입출력 6·함수 직접 호출 2·다중 파일 1이고 공유 iteration·통합 백업·숙달·컴파일 피드백·PWA 회귀 구조를 유지한다. C 20문제, Rust 채점, 전체 교과서, 실기기·공개 샌드박스는 후속 작업이다.

## 2026-10-12 06:02~06:10 KST — 컴파일·링크 진단 학습 피드백 분류

- 실행 시작 커밋: `221ce58c2988197773ce4eb8c352e2741feb01b0` (`main`). 로컬과 `origin/main` 일치, 깨끗한 작업 트리, 열린 PR 없음, 직전 Actions https://github.com/cys123431-ship-it/CodeWeave/actions/runs/38170613019 의 `test`·`browser` 성공을 확인했다. 필수 운영 문서와 최신 일지에서 컴파일·링크 진단 분류를 이번 작업으로 선택했다.
- 목표/성공 조건: GCC/ld 원문을 바꾸지 않으면서 누락 헤더, 선언·정의 형식 충돌, 미정의 참조, 중복 정의, 일반 컴파일/링크 오류를 초보자가 구분할 한국어 범주와 점검 항목으로 표시한다. 컴파일러 실행 불가·시간 초과는 소스 오류와 구분한다. 피드백을 메인 단원과 연습장에 같은 형식으로 표시하고 제출 이력·통합 백업 v1 왕복에서 보존하되 기존 필드 없는 기록을 계속 읽는다.
- 테스트 우선 재현: `tests/compiler-feedback.test.mjs`와 제출 이력 검사를 먼저 추가했다. 구현 전 표적 실행은 새 모듈을 찾지 못했고 `compilerFeedback`이 이력에서 사라져 8개 중 2개가 실패했다. 분류·저장 구현 뒤 실제 정적 서버 합성 체크아웃에 새 PWA 파일이 빠져 404가 발생한 것도 검사로 발견해 허용 자산 fixture를 함께 수정했다.
- 구현: `src/compiler-feedback.js`에 결정적인 GCC/ld 패턴만 사용하는 순수 분류기, 허용 값 정규화, 공통 출력 포맷을 추가했다. `dev-server.mjs`는 실패 원문 `compileOutput`을 그대로 보존하면서 구조화된 피드백을 추가한다. `src/iterations.js`와 `src/practice.js`는 고정된 허용 값만 검증·저장·출력하고 알 수 없는 선택 필드는 원문을 보존한 채 버린다. `src/workbench.js`는 메인 화면과 같은 formatter를 재사용한다.
- 호환/PWA: 기존 `codeweave.iterations.v1`·통합 백업 v1 키와 버전을 바꾸지 않고 `compilerFeedback`을 선택 필드로 추가했다. 필드가 없는 과거 기록은 그대로 읽는다. 새 브라우저 모듈을 정적 파일 허용 목록과 shell v12에 포함하고 CI 문법 검사도 갱신했다.
- 실제 GCC/브라우저 검사: 다중 파일의 `missing.h`, 정의가 없는 `clamp`, 헤더와 다른 반환형, 함수 하네스와 중복된 `main`을 실제 GCC로 컴파일해 각각 누락 헤더·미정의 참조·선언/정의 불일치·중복 정의로 분류되는지 검사했다. Chromium 시나리오는 중복 `main`의 한국어 링크 피드백과 원문을 확인한 뒤 올바른 함수로 재제출하도록 확장했다.
- 로컬 검사: 변경 전 `npm test` 79/79 성공. 최종 `npm test` 88/88 성공, 실패/skip 0. 분류기, 이력/백업 호환, 실제 GCC 8문제와 오류 분기, 정적 서버/PWA 자산 검사가 모두 통과했다. 변경 JS/MJS `node --check`와 `git diff --check` 성공.
- 로컬 브라우저 시도: `npm run test:browser`의 C 8문제 실제 GCC API 검증은 성공했으나 Playwright Chromium 실행 파일 부재(`browserType.launch: Executable doesn't exist`)로 UI 단계는 미실행. 새 UI E2E는 반영 후 GitHub Actions의 설치된 Chromium으로 판정한다.
- 문서/자료: `README.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`에 원문 보존, 고정 분류의 경계, 선택 필드 호환, PWA shell v12를 기록했다. 두 참고 PDF의 로컬 접근과 크기는 재확인했지만 이번 작업은 채점 피드백 코드 범위여서 본문·그림·문제를 읽거나 복제하지 않았다.
- 미해결/위험: 분류기는 GCC/ld 출력 패턴에 근거한 보조 안내이며 모든 컴파일러·지역화 출력·복합 오류의 근본 원인을 증명하지 않는다. 반드시 함께 표시되는 원문과 첫 오류를 확인해야 한다. 로컬 GCC 실행기는 계속 비격리 개인용이고 실제 Windows/Android/iPad 및 PWA 설치는 미검증이다. Rust/Cargo 진단·채점은 구현 전이다.
- GitHub 반영: 이 일지를 포함하는 커밋 제목 `feat: classify compiler diagnostics for learners`. 자신의 SHA와 새 CI 결과는 커밋 후 원격 HEAD·변경 파일·Actions를 재조회해 실행 보고서에 기록한다. 최신 base SHA lease를 사용하며 강제 푸시하지 않는다.
- 다음 우선 작업: **두 번째 함수 구현형 C 문제**. 배열과 함수 선수 개념을 사용하는 작은 계약을 선택해 문제 메타데이터·독자 원고·스타터·서버 하네스·경계값·부작용/시간 초과·반복 제출을 한 묶음으로 추가하고, 특정 `clamp` 문제에 묶이지 않은 `c-function` 스키마 재사용성을 검증한다.
- 분야별 상태: C 8개/Rust·자료구조·알고리즘 각 1개 시범 단원, 공개 정의 11개. C 채점은 입출력 6·함수 직접 호출 1·다중 파일 1이고 컴파일·링크 실패에 원문과 한국어 학습 피드백을 함께 제공한다. 공유 이력·통합 백업·숙달/PWA 자동 검사는 유지한다. C 20문제, Rust 채점, 전체 교과서, 실기기·공개 샌드박스는 후속 작업이다.

## 2026-10-12 02:01~05:00 KST — 다중 파일 모바일·제출 복원·통합 백업 E2E 고정

- 실행 시작 커밋: `91d6a2e172706902930c4d23908d55c2db70a7f4` (`main`). 로컬 `main`과 `origin/main` 일치 및 깨끗한 시작 상태를 확인했다. GitHub 연결로 저장소 읽기와 push/admin 권한, 열린 PR 없음, 직전 Actions 실행 https://github.com/cys123431-ship-it/CodeWeave/actions/runs/38154632973 의 `test`·`browser` 작업 성공을 재확인했다. 필수 운영 문서와 최신 일지에서 다중 파일의 390px 실제 조작·제출 복원·통합 백업 왕복을 이번 작업으로 선택했다.
- 목표/성공 조건: 메인 단원과 반복 제출 연습장의 `main.c`·`functions.c`·`functions.h` 편집기가 390px에서 문서 가로 넘침 없이 화면 안에 있어야 한다. 실제 GCC의 성공·실패 제출 두 건을 보존하고 이전 성공 코드를 세 파일 모두로 복원해야 한다. 통합 백업을 내보낸 뒤 초안을 변경하고 다시 가져오면 세 파일과 두 제출 이력이 원상복원되어야 한다. 기존 v1 저장 키·직렬화·학습 상태와 C 8문제는 유지한다.
- 테스트 우선 재현: `tests/workbench-source.test.mjs`에 편집기·다중 파일 컨테이너·연습장 카드의 최소 너비/최대 너비 경계 검사를 먼저 추가했다. 변경 전 표적 실행은 3개 중 2개 성공·1개 실패로 모바일 너비 방어 규칙 부재를 확인했다.
- UI 수정: `styles.css`에서 모든 코드 편집기를 block, `min-width:0`, `max-width:100%`, 내부 overflow로 제한하고 다중 파일 컨테이너의 축소를 허용했다. 630px 이하에서는 세 편집기의 간격·패딩·글자 크기와 최소 높이를 조정했다. `workbench.css`는 카드·샘플 grid·이력 항목의 축소/줄바꿈 경계를 보강하고 800px 이하 grid를 `minmax(0,1fr)`로 고정했다. 변경된 스타일이 기존 PWA 캐시에 남지 않도록 shell을 v11로 갱신했다.
- Chromium 시나리오: `tests/browser-practice.mjs`에서 다중 파일 정답 제출 뒤 `functions.c` 오답 제출을 만들고, 이력의 이전 성공 제출을 복원해 세 편집기 값과 이력 개수가 유지되는지 검사한다. 메인 단원과 연습장을 각각 390×844로 전환해 문서와 각 편집기의 실제 경계를 검사하며 QA 이미지를 남긴다. 연습장에서 통합 백업을 다운로드하고 세 파일을 변경한 뒤 가져와 세 파일·두 제출 이력을 복원하고, 메인 단원을 새로고침해 같은 상태를 다시 확인한다. 이는 기존 단일 파일 390px·오프라인 검사와 별도인 다중 파일 표적 흐름이다.
- 로컬 검사: 변경 전 `npm test` 78/78 성공. 모바일 CSS 재현 실패를 수정한 뒤 최종 `npm test` 79/79 성공, 실패/skip 0. 실제 GCC로 전체 프로그램 6·함수 직접 호출 1·다중 파일 1문제와 컴파일 오류·오답·비정상 종료·시간 초과·파일 계약·헤더/링크 실패를 검사했다. `tests/browser-practice.mjs`와 `sw.js` 문법 검사, `git diff --check` 성공.
- 로컬 브라우저 시도: `npm run test:browser`에서 C 8문제의 실제 GCC API 검증은 모두 성공했으나 Playwright Chromium 실행 파일 부재(`browserType.launch: Executable doesn't exist`)로 UI 단계가 중단됐다. 따라서 로컬에서 모바일·복원·백업 E2E 성공을 주장하지 않으며 반영 후 GitHub Actions가 설치한 Chromium 결과로 판정한다.
- 문서/자료: `README.md`와 `docs/ARCHITECTURE.md`에 다중 파일 390px 실제 경계, 성공·실패 이력 복원, 통합 백업 왕복 검사 범위와 PWA shell v11을 기록했다. 두 참고 PDF는 로컬에 존재함을 확인했지만 이번 작업은 UI/QA 범위여서 본문·그림·문제를 읽거나 저장소에 복제하지 않았다.
- 미해결/위험: 자동 Chromium은 실제 Android/iPad/Windows 기기 및 PWA 설치 검증을 대체하지 않는다. 세 파일은 고정 계약이며 범용 프로젝트 편집기가 아니다. localStorage는 기기 간 동기화나 트랜잭션 DB가 아니고, 로컬 GCC 실행기는 계속 신뢰하는 개인 코드 전용 비격리 도구다. Rust/Cargo 채점은 미구현이다.
- GitHub 반영: 이 일지를 포함하는 커밋 제목 `test: verify multi-file mobile restore and backup flow`. 자신의 SHA와 새 CI 결과는 커밋 후 원격 HEAD·변경 파일·Actions를 재조회해 실행 보고서에 기록한다. 최신 base SHA를 다시 확인하고 강제 푸시는 사용하지 않는다.
- 다음 우선 작업: **컴파일·링크 진단의 학습 피드백 분류**. 기존 원문 진단을 보존하면서 누락 헤더, 선언/정의 불일치, 미정의 참조를 초보자가 구분할 수 있는 한국어 범주로 표시하는 순수 분류기와 회귀 검사를 먼저 만든다. 이후 두 번째 함수형 또는 문자열 C 문제를 추가해 채점 스키마의 재사용성을 검증한다.
- 분야별 상태: C 8개/Rust·자료구조·알고리즘 각 1개 시범 단원, 공개 정의 11개. C 채점은 입출력 6·함수 직접 호출 1·다중 파일 1. 학습 상태/공유 이력/통합 백업/PWA 자동 검사 구조는 유지하며, 이번 변경은 다중 파일의 모바일·복원·백업 회귀 범위를 강화한다. C 20문제, Rust 채점, 전체 교과서, 실기기·공개 샌드박스는 후속 작업이다.

## 2026-10-12 01:01~01:12 KST — C 다중 파일 편집·저장·컴파일·채점 통합

- 실행 시작 커밋: `baa7af9abc1841da35609cad202d0faba47947d7` (`main`). GitHub 읽기/쓰기 권한, 원격·로컬 HEAD와 깨끗한 작업 트리 일치, 열린 PR 없음, 직전 Actions https://github.com/cys123431-ship-it/CodeWeave/actions/runs/38150172408 성공을 확인. 필수 운영 문서와 최신 일지에서 `main.c`·`functions.c`·`functions.h` 다중 파일 계약을 다음 작업으로 선택.
- 목표/성공 조건: 필수 세 파일만 각각 편집·자동 저장·제출·복원하고 실제 GCC로 함께 컴파일·링크. 경로형 이름, 누락·중복·추가 파일, 파일 수와 개별/전체 크기를 컴파일 전에 거부. 헤더 누락과 함수 정의 누락은 GCC 컴파일/링크 진단으로 반환. 기존 단일 문자열 `codeweave.drafts.v1`, `codeweave.iterations.v1`, 통합/기존 백업 v1을 변경하지 않음.
- 테스트 우선 재현: `tests/multi-file.test.mjs`, 문제 스키마 검사와 실제 API 검사를 먼저 작성. 구현 전 표적 실행에서 신규 직렬화 모듈 누락, 미지원 `c-multi-file`, 문제 미등록으로 4개 실패를 확인. 구현 후 표적 29/29 성공.
- 제출 형식: `src/multi-file.js`에 `CODEWEAVE_MULTI_FILE_V1` 표식과 JSON payload를 사용하는 결정적 문자열 형식을 추가. 안전한 단일 파일명, 최대 6개, 파일별 10,000자, 내용 합계 24,000자, 전체 직렬화 25,000자를 검사. 고정 필수 목록과 비교해 누락·중복·추가 파일을 거부하고 제출 이력에서는 파일별 제목으로 읽기 쉽게 표시. 기존 저장소/백업은 계속 문자열 하나를 보존하므로 키와 v1 스키마 변경 없음.
- 교육/UI: `c-multi-file`을 C 여덟 번째 시범 단원으로 추가. 헤더 계약, include guard, 별도 번역 단위, 링크, 컴파일·링크 오류를 독자 원고·퀴즈와 `main.c/functions.h/functions.c → 목적 파일 → 실행 프로그램` 정적 SVG로 설명. 메인 단원과 반복 제출 연습장에 세 개의 접근 가능한 편집기를 연결하고 파일별 자동 저장, 초기화, 제출 이력 복원, 통합 백업을 기존 흐름과 공유. PWA shell v10과 정적 파일 허용 목록에 신규 브라우저 모듈을 등록.
- 서버 채점: 공개 메타데이터에 필수 파일 계약을 추가하고 서버 사례 5개를 등록. `dev-server.mjs`는 문자열을 검증한 뒤 임시 디렉터리에 세 파일을 쓰고 두 `.c` 파일을 `-I` 헤더 경로와 함께 GCC로 컴파일·링크한다. 경로를 포함한 사용자 파일명은 쓰기 전에 거부. 정상·하한·상한·음수 범위 결과를 기존 시간/출력 제한으로 검사.
- 발견/수정: 전체 회귀 첫 실행에서 새 채점 클릭 래퍼가 비동기 `grade` Promise를 반환하지 않아 기존 DOM fixture가 채점 완료 전에 검사하는 1개 실패를 발견. 이벤트 핸들러가 Promise를 반환하도록 수정한 뒤 표적/전체 검사를 재실행. 다른 탭 저장 이벤트가 다중 파일의 첫 편집기만 보존할 위험도 검토 중 발견하여 세 파일을 다시 직렬화해 활성 편집 상태 전체를 유지하도록 수정.
- 로컬 검사: 최종 `npm test` 78/78 성공, 실패/skip 0. 실제 GCC로 C 8문제의 정상·경계 사례, 기존 오류 종류, 다중 파일 누락·중복, 헤더 누락, 링크 정의 누락을 검사. 관련 JS/MJS `node --check`와 `git diff --check` 성공.
- 브라우저 시도: `npm run test:browser`에서 새 다중 파일형을 포함한 C 8문제의 실제 GCC API 검증은 성공. 로컬 Playwright Chromium 실행 파일이 없어 UI·390px·오프라인 단계는 미실행. 반영 후 Actions의 설치된 Chromium `browser` 작업에서 세 파일 편집·저장·제출·오프라인 캐시를 별도 확인한다.
- 자료 접근/저작권: 두 참고 PDF는 작업 폴더에서 접근 가능하지만 이번 원고·코드·문제는 독자 작성했고 책 본문·그림·상용 문제를 열람·복제하거나 저장소에 포함하지 않음.
- 미해결/위험: 다중 파일 UI는 고정 세 파일 계약이며 사용자가 임의 파일을 추가·이름 변경하는 범용 프로젝트 편집기는 아님. GCC 실행은 메모리 검사나 보안 샌드박스가 아니고 신뢰하는 개인 코드 전용. 로컬 Chromium, 실제 Windows/Android/iPad, PWA 설치와 공개 배포는 미검증. Rust/Cargo 채점 미구현.
- GitHub 반영: 이 일지를 포함하는 커밋 제목 `feat: add multi-file C grading workflow`. 자신의 SHA와 새 CI 결과는 커밋 후 원격 HEAD·파일·Actions를 재조회하여 실행 보고서에 기록한다. 최신 base tree와 expected SHA를 사용하고 강제 푸시하지 않는다.
- 다음 우선 작업: **다중 파일 학습 품질과 범용성 검증**. 실제 Chromium에서 모바일 세 편집기·이력 복원·통합 백업 왕복을 고정한다. 이어 선언/정의 불일치 진단을 학습 피드백으로 분류하고, 같은 스키마로 두 번째 함수형 또는 문자열 C 문제를 추가해 채점기가 한 문제에 과적합되지 않았는지 검증한다.
- 분야별 상태: C 8개/Rust·자료구조·알고리즘 각 1개 시범 단원, 공개 정의 11개. C 채점은 입출력 6·함수 직접 호출 1·다중 파일 1. 학습 상태/공유 이력/복원/통합 백업/PWA 자동 회귀 구조는 유지. Rust 채점, C 20문제, 전체 교과서, 실기기·공개 샌드박스는 후속 작업.

## 2026-10-11 23:56~2026-10-12 00:07 KST — 별도 하네스로 C 함수 구현 직접 채점

- 실행 시작 커밋: `c550b03cd7c880b5fbe1dc5fbcfacb5741a5d862` (`main`). 로컬·원격 HEAD와 깨끗한 작업 트리 일치, 열린 PR 없음, 기존 Actions https://github.com/cys123431-ship-it/CodeWeave/actions/runs/38134534076 의 Node/GCC·Chromium 성공을 확인. 필수 문서와 최신 일지에서 기존 `c-functions` 전체 프로그램 초안을 보존하는 별도 함수형 문제를 다음 작업으로 선택.
- 목표/성공 조건: 새 ID `c-clamp-function`은 함수 본문만 저장·제출하고 서버 전용 하네스가 직접 호출. 정상·경계 반환값 5개, 중복 `main`, 불필요한 표준 출력 부작용, 잘못된 반환값과 컴파일 진단을 구분. 기존 C 입출력 6문제, `c-functions` 초안·이력, v1 저장 키와 통합/기존 백업 형식을 변경하지 않음.
- 테스트 우선 재현: 메타데이터·콘텐츠·실제 GCC API 검사를 먼저 확장. 구현 전 표적 검사 26개 중 성공 17·실패 9로 미등록 문제, 미지원 `c-function`, 하네스/사례 계약 부재와 API 400을 재현. 구현 직후에는 기존 검사가 모든 채점기를 `stdin-output`이라고 가정한 1개 실패를 발견하여 채점 전략 열거를 검증하도록 수정.
- 문제/콘텐츠 구현: `src/catalog.js`에 함수 계약, 별도 하네스, 반환값과 출력 부작용, 링크 오류를 설명하는 C 일곱 번째 실습 단원을 추가. 스타터에는 `clamp` 함수만 두고 `main`, 입력, 출력을 제외. 퀴즈·공개 호출 예시·기존 정적 함수 호출 도식을 연결하고 `src/exercises.js`에 선수 단원과 `c-function` 채점기를 등록.
- 서버 채점 구현: `server/grading-exercises.mjs`가 함수형에 비어 있지 않은 서버 하네스와 사례별 인수를 요구하고 잘못된 하네스 연결을 초기화 단계에서 거부. `dev-server.mjs`는 `submission.c`와 서버의 `harness.c`를 별도 번역 단위로 컴파일·링크한 뒤 같은 실행 파일을 5개 호출 인수로 실행. 제출 `main`은 중복 정의로 실패하고, 제출 함수의 출력은 하네스 결과에 섞여 오답이 되며, 반환값은 경계 사례별로 비교.
- UI/PWA: 단원 화면에 `입출력형`과 `함수 직접 호출형`을 명시하고 새 문제를 메인 학습 흐름과 반복 제출 연습장에 연결. 새 ID가 기존 localStorage 객체에 선택적으로 추가되는 방식이어서 기존 데이터와 키를 보존. PWA shell을 v9로 갱신하고 기존 18개 공개 자산 목록은 그대로 유지.
- 검사: 최종 `npm test` 71/71 성공, 실패/skip 0. 실제 GCC로 기존 전체 프로그램형 6개와 함수형 1개 정상·경계 사례, 컴파일 실패, 오답, 비정상 종료, 프로그램·함수 시간 초과, 중복 `main`, 출력 부작용, 잘못된 반환값, 즉시 재제출을 검사. 관련 JS/MJS `node --check`와 `git diff --check` 성공.
- 로컬 브라우저 시도: `npm run test:browser`에서 7개 C 문제의 실제 GCC API 검증까지 성공한 뒤 로컬 Playwright Chromium 실행 파일 부재로 중단. 함수형 단원 렌더링·메인 화면 제출·연습장 선택·390px·오프라인 단계는 로컬 미실행이며 반영 후 Actions `browser` 결과로 별도 확인한다.
- 자료 접근/저작권: 두 참고 PDF(`c언어 압축 (1)(1).pdf` 87,753,393 bytes, `C_Programming.pdf` 6,838,054 bytes)의 읽기 접근을 확인. 이번 함수 하네스 설명·코드·문제는 독자 작성했고 PDF 본문·그림·상용 문제를 사용하거나 저장소에 포함하지 않음.
- 발견/해결: 기존 서버는 제출 파일 자체에 `main`이 있다는 전제로 한 파일만 컴파일했다. 함수 문제를 별도 ID와 번역 단위로 분리해 과거 풀이를 마이그레이션하지 않고 두 채점 전략을 공존시켰다. 공개 메타데이터와 서버 하네스의 누락·잘못된 연결·사례 인수 형식을 시작 시 검증해 구성 오류를 실제 학습 제출 오류와 구분한다. 무한 반복이 각 후속 사례에서 다시 시간 초과를 일으키던 점은 첫 치명적 실행 오류에서 나머지 사례를 중단하도록 수정했다.
- 미해결/위험: 함수 하네스는 현재 `clamp` 한 문제에 특화되어 있고 사용자 다중 파일 제출·헤더·Rust/Cargo 채점은 미구현. 출력 비교 기반이라 메모리 오류 탐지기나 격리 기능이 아니며 로컬 GCC 실행기는 계속 신뢰하는 개인 코드 전용. 로컬 Chromium, 실제 Windows/Android/iPad, PWA 설치와 공개 배포는 미검증.
- GitHub 반영: 이 일지를 포함하는 커밋 제목 `feat: add direct C function grading harness`. 자신의 SHA와 새 CI 결과는 커밋 후 원격 HEAD·파일·Actions를 재조회하여 실행 보고서에 기록한다. 최신 base tree와 expected SHA를 사용하고 강제 푸시하지 않는다.
- 다음 우선 작업: **다중 파일형 채점 계약의 테스트 우선 설계**. `main.c`·`functions.c`·`functions.h`의 파일명/크기/중복/누락 검증과 헤더 포함·링크 진단을 먼저 순수 모듈 검사로 고정한다. 현재 단일 문자열 초안과 백업 v1을 깨뜨리지 않도록 별도 문제 ID 및 하위 호환 직렬화 방식을 설계한 뒤 UI 편집 구조를 확장한다.
- 분야별 상태: C 7개/Rust·자료구조·알고리즘 각 1개 시범 단원, 공개 문제 정의 10개. 로컬 GCC 전체 프로그램 입출력형 6개와 함수 직접 호출형 1개, 공유 이력·통합 백업·숙달·PWA 흐름이 연결됨. 다중 파일·Rust 채점, C 20문제, 전체 교과서, 실기기/PWA 설치와 공개 샌드박스는 후속 작업.

---

## 2026-10-11 20:00~20:07 KST — 검증 가능한 문제 메타데이터와 서버 전용 채점 사례 분리

- 실행 시작 커밋: `471382887d29d7c8d7c85a689a052b71df0a3c83` (`main`). 로컬·원격 HEAD 일치, 깨끗한 작업 트리, 열린 PR 없음, 기존 Actions https://github.com/cys123431-ship-it/CodeWeave/actions/runs/38131023569 의 Node/GCC·Chromium 성공을 확인. 필수 문서와 최신 일지의 다음 우선 작업을 기준으로 문제 스키마의 첫 수직 조각을 선택.
- 목표/성공 조건: 9개 단원 연습마다 Concept/Practice 유형·언어·선수 단원·핵심 개념·채점기·공개 예시를 검증. 실제 채점 가능한 C 6개만 연습장·숙달 대상으로 인정. 기존 인라인 GCC 사례를 브라우저 비공개 서버 모듈로 분리하고 기존 API 응답, 문제 ID, v1 초안·제출·백업 형식과 PWA 흐름을 보존.
- 테스트 우선 재현: `tests/exercises.test.mjs`를 먼저 작성하고 `src/exercises.js`가 없는 `ERR_MODULE_NOT_FOUND` 실패를 확인. 중복 ID, 지원하지 않는 유형·언어·채점기, 빈 개념, 잘못된 공개 예시, 자기 참조·알 수 없는 선수 단원, 누락·알 수 없는·형식 오류 채점 사례를 거부하는 검사를 고정.
- 공개 스키마 구현: `src/exercises.js`에 9개 연습의 메타데이터와 로드 시 검증을 추가. 공개 예시와 기존 `src/catalog.js`의 입출력이 일치하고 Concept/Practice가 모두 존재하는지 검사. `exerciseById`와 `isGradedExercise`로 소비 코드가 트랙 이름 대신 명시적 채점기 등록을 사용하게 함.
- 서버 채점 분리: `server/grading-exercises.mjs`에 C 6문제의 비공개 입력·출력 사례를 이동하고, `dev-server.mjs`는 검증된 정의만 조회. 채점 가능 문제의 사례 누락과 채점 불가 문제에 붙은 사례를 서버 모듈 초기화 단계에서 거부. GCC API 검사는 각 응답의 테스트 수가 등록 사례 수와 정확히 일치하는지도 확인.
- UI/학습 상태: `src/app.js`가 문제 유형, 언어, 선수 단원을 코딩 실습에 표시하고 채점 가능 여부로 버튼·제출 이력·숙달을 판정. `src/workbench.js`도 실제 채점기가 있는 문제만 나열. `src/mastery.js`는 호출자가 제공한 채점 가능 판정을 트랙 집계에 사용하되 기존 기본 동작은 호환을 위해 유지. 저장 키와 백업 버전은 변경하지 않음.
- PWA/정적 서버/CI: `src/exercises.js`를 18번째 공개 자산과 shell v8 캐시에 포함하고 정적 서버 회귀 검사 갱신. `.github/workflows/ci.yml`에 공개·서버 문제 모듈 문법 검사를 추가. 실제 Chromium 시나리오는 함수 단원에서 Practice Exercise·선수 단원 표시와 새 오프라인 자산을 확인하도록 확장.
- 로컬 검사: 변경 전 `npm test` 60/60 성공. 구현 후 표적 스키마·숙달·정적 서버·GCC 검사 30/30 성공, 최종 `npm test` 65/65 성공, 실패/skip 0. 실제 GCC로 C 6문제와 컴파일 실패·오답·비정상 종료·시간 초과·즉시 재제출 성공. CI 대상 JS/MJS 전체 `node --check`, `git diff --check` 성공.
- 로컬 브라우저 시도: `npm run test:browser`가 C 6문제의 실제 GCC API 검증까지 성공한 뒤 Playwright Chromium 실행 파일 부재로 중단. 문제 메타데이터 UI·390px·오프라인 브라우저 단계는 로컬 미실행이며 반영 후 Actions `browser` 결과로 별도 확인한다.
- 자료 접근/저작권: 두 참고 PDF(`c언어 압축 (1)(1).pdf` 87,753,393 bytes, `C_Programming.pdf` 6,838,054 bytes)의 읽기 접근을 다시 확인. 이번 작업은 문제 구조 작업으로 본문·그림을 사용하거나 저장소에 포함하지 않음.
- 발견/해결: `track === 'c'`이면 무조건 채점 가능하다고 판단하던 결합을 확인. 이후 채점기 없는 C 자료구조·알고리즘 단원을 추가할 때 허위 실습/숙달이 생길 수 있어, 검증된 `grader` 등록 여부를 단일 기준으로 교체. 공개 예시가 실제 채점 사례 중 하나와 일치하는지도 검사하여 문서와 채점의 불일치를 방지.
- 미해결/위험: 현재 유일한 채점 유형은 전체 C 프로그램 입출력형 `stdin-output`이다. 함수 직접 호출·다중 파일·Rust 채점은 미구현. 공개 메타데이터와 카탈로그의 제목·설명·스타터 코드는 아직 서로 다른 모듈에 있어 일치 검사가 필요하다. 로컬 GCC 실행기는 계속 비격리 개인용이며 실기기 PWA 설치·공개 배포는 검증하지 않음.
- GitHub 반영: 이 일지를 포함하는 커밋 제목 `refactor: validate exercise metadata and grading cases`. 자신의 SHA와 새 CI 결과는 커밋 후 원격 HEAD·파일·Actions를 재조회하여 실행 보고서에 기록한다. 최신 base tree와 expected SHA를 사용하고 강제 푸시하지 않는다.
- 다음 우선 작업: **함수 구현형 채점 설계의 비파괴적 첫 단계**. 기존 `c-functions`의 저장된 전체 프로그램 초안을 깨뜨리지 않도록 별도 문제 ID와 테스트 하네스 계약을 설계하고, 사용자 코드와 하네스의 결합·중복 `main`·컴파일 진단·함수 반환값/부작용·시간 제한을 재현하는 검사부터 작성한다. 직접 호출형이 안전하게 검증되기 전 현재 문제의 채점 유형을 변경하지 않는다.
- 분야별 상태: C 6개/Rust·자료구조·알고리즘 각 1개 시범 단원, 공개 문제 정의 9개, 로컬 GCC 입출력 문제 6개. 문제 유형·선수 단원·공개 예시·채점 가능 기준과 서버 전용 사례 분리는 구현됨. 함수형·다중 파일형·Rust 채점, C 20문제, 전체 교과서, 실제 기기/PWA 설치와 공개 샌드박스는 후속 작업.

---

## 2026-10-11 18:58~19:08 KST — C 함수 원고를 단원·도식·GCC 실습으로 연결

- 실행 시작 커밋: `ebf18cae35cf37aad9306a3f54c5c1d89392e4f5` (`main`). 로컬과 원격 HEAD가 일치하고 작업 시작 전 깨끗함을 확인. 열린 PR 없음, 기존 GitHub Actions https://github.com/cys123431-ship-it/CodeWeave/actions/runs/38113848629 의 Node/GCC·Chromium 작업 성공을 확인. 필수 문서와 최신 일지에서 앞선 정적 파일 제한·통합 백업·숙달 분리가 이미 완료된 것을 확인하여 중복 구현하지 않음.
- 목표/성공 조건: 독립 파일이던 `content/c/06-functions.md`를 실제 `c-functions` 단원으로 연결. 선수 지식·학습 목표·상세 이론·실행 결과·흔한 오류·점검·요약·단계별 연습·Mini Project·복습 연결을 갖추고, 독자 정적 도식·퀴즈·스타터 코드와 하나의 흐름으로 제공. `clamp`의 범위 안/하한 밖/상한 밖/음수 경계 입력을 실제 GCC로 검증하고 기존 진도·백업·제출 이력·PWA 흐름을 보존.
- 테스트 우선 재현: `tests/functions-content.test.mjs`와 기존 GCC·브라우저 검사의 여섯 번째 해답을 먼저 추가. 구현 전 표적 검사에서 단원 누락, 빈 도식, 원고 필수 절 누락, 미지원 채점 ID를 재현하여 성공 11·실패 5를 확인.
- 콘텐츠/UI 구현: `content/c/06-functions.md`를 값 전달·포인터 값·지역 변수 수명·배열 매개변수 조정·컴파일/링크/실행 오류를 구분하는 독자 원고로 보완. `src/catalog.js`에 아홉 번째 시범 단원과 퀴즈·`clamp` 스타터를 등록하고 `src/figures.js`에 `main → clamp → return`의 정적 SVG 호출 도식을 추가. 복잡한 실행 애니메이션과 교재 원문·그림 복제는 사용하지 않음.
- 채점/PWA 구현: `dev-server.mjs`에 `c-functions`의 실제 GCC 5개 테스트를 추가하여 범위 안 값, 양·음수 하한/상한 경계를 검사. 기존 단원 화면과 연습장은 카탈로그를 공유하므로 새 문제의 초안·최근 10회 이력·복원·통합 백업·숙달 계산을 기존 v1 키 변경 없이 사용. `sw.js`를 shell v7로 갱신. `tests/browser-practice.mjs`가 함수 단원 제목·정적 도식·스타터 코드와 여섯 문제의 실제 컴파일을 검사하도록 확장.
- 문서 수정: `README.md`, `docs/ROADMAP.md`, `docs/ARCHITECTURE.md`를 C 6개/Rust·자료구조·알고리즘 각 1개, 퀴즈 9개, GCC 문제 6개, PWA shell v7 기준으로 갱신. 원본 PDF 두 파일은 실행 환경에서 접근 가능함을 확인했지만 이번 작업에서 본문·그림을 복제하거나 전체 목차를 대조하지 않았으며 저장소에도 포함하지 않음.
- 로컬 검사: 구현 후 표적 검사 16/16 성공. 최종 `npm test` 60/60 성공, 실패/skip 0. 실제 GCC로 C 6문제 정상·경계 입력과 컴파일 실패·오답·비정상 종료·시간 초과·즉시 재제출 검사 성공. 변경 및 CI 대상 JS/MJS 전체 `node --check`, `git diff --check` 성공.
- 로컬 브라우저 시도: `npm run test:browser`가 실제 C 6문제 API 채점까지 성공한 뒤 `browserType.launch: Executable doesn't exist`로 중단. 로컬에 Playwright Chromium 실행 파일이 없어 함수 화면 렌더링·390px·오프라인 브라우저 검사는 미실행이며, 단위/API 성공을 E2E 성공으로 보고하지 않음. 반영 후 GitHub Actions `browser` 작업 결과를 별도로 확인한다.
- 발견/해결: 원고가 함수 사용 이유·값 전달·배열 함수까지만 설명하고 화면/채점에 연결되지 않은 상태를 확인. 반환 경로 누락과 수명 종료 객체 접근을 정의되지 않은 동작으로 명시하고, 포인터도 포인터 값이 복사된다는 설명으로 “주소 전달” 오해를 피함. 음수 전용 범위를 포함한 채점 사례를 추가해 대표 입력 한 개만 통과하는 풀이를 방지.
- 미해결/위험: 현재 `dev-server.mjs`의 문제 정의는 인라인 입력/출력 사례이며 Concept/Practice, 선수 개념, 문제 유형을 표현하는 구조화된 스키마가 없다. 함수형 문제도 제출 프로그램 전체를 컴파일하는 방식이라 테스트 하네스가 사용자의 `clamp`를 직접 호출하지는 않는다. 로컬 실행기는 계속 비격리 개인용이며 공개 배포·PWA 설치·실제 Windows/Android/iPad 검증은 수행하지 않음.
- GitHub 반영: 이 일지를 포함하는 커밋 제목 `feat: connect C function lesson and GCC practice`. 자신의 SHA와 새 CI 결과는 커밋 후 원격 HEAD·파일·Actions를 재조회하여 실행 보고서에 기록한다. 최신 base tree와 expected SHA를 사용하고 강제 푸시하지 않는다.
- 다음 우선 작업: **문제 데이터 스키마의 첫 수직 조각**. 현재 인라인 채점 정의를 기존 ID와 호환되는 별도 모듈로 추출하고 Concept/Practice 구분, 선수 개념, 언어·채점 유형, 공개 예시를 표현한다. 먼저 잘못된 스키마·중복 ID·지원되지 않는 채점 유형과 기존 6문제 회귀 검사를 작성하고, 함수 직접 호출형 하네스는 별도 안전 설계로 이어간다.
- 분야별 상태: C 6개/Rust·자료구조·알고리즘 각 1개 시범 단원, 퀴즈 9개, 로컬 GCC 문제 6개. 함수 원고·도식·퀴즈·실습 연결과 기존 공유 이력·통합 백업·숙달 상태는 구현됨. 전체 C 교육과정/20문제 품질 검증, 문제 스키마, 함수형·다중 파일 채점, Rust 채점, 실기기/PWA 설치와 공개 샌드박스는 후속 작업.

---

## 2026-10-11 13:55~14:06 KST — 이론·퀴즈·실습·복습·숙달 상태 분리

- 실행 시작 커밋: `8b86c8d6d4434f8ccc135cf14cc6147a1821770b` (`main`). 로컬과 원격 HEAD가 일치하고 작업 시작 전 깨끗함을 확인. 열린 PR 없음, 기존 GitHub Actions https://github.com/cys123431-ship-it/CodeWeave/actions/runs/38110715308 의 Node/GCC·Chromium 작업 성공을 확인하여 통합 백업을 중복 구현하지 않음.
- 목표/성공 조건: 이론 읽기, 개념 퀴즈 통과, 코딩 실습 통과, 복습 필요, 전체 숙달을 독립적으로 저장·계산·표시. 기존 `codeweave.progress.v1`, `codeweave.iterations.v1`, 통합 백업 v1과 두 기존 v1 파일을 계속 읽음. C만 검증된 실습 통과를 인정하고 자동 채점이 없는 트랙은 숙달을 과대 표시하지 않음. 최신 실패와 수동 복습이 숙달을 해제하며 대시보드·트랙·단원·오프라인 화면이 회귀하지 않아야 함.
- 테스트 우선 재현/생성: 새 `tests/mastery.test.mjs`가 구현 전 `ERR_MODULE_NOT_FOUND`로 실패하는 것을 확인한 뒤 `src/mastery.js`를 생성. 과거 진도 마이그레이션, 세 완료 조건의 독립성, 최신 퀴즈/실습 실패와 수동 복습, 미지원 채점기, 트랙별 집계, 불변 플래그 갱신을 6개 검사로 고정.
- 구현: 기존 progress v1 객체에 선택 배열 `theoryRead`와 `review`를 추가하고 누락 필드는 빈 배열로 정규화. `src/mastery.js`가 퀴즈의 과거 통과, 제출 이력의 과거 성공, 최신 실패, 수동 복습을 합성한다. 전체 숙달은 이론+퀴즈+C 실습 통과와 복습 불필요가 모두 성립할 때만 참이다. 과거 통과를 삭제하지 않으면서 최신 실패는 복습으로 표시한다.
- UI/데이터 수정: `src/app.js`, `styles.css`에서 대시보드·트랙·단원별 이론/퀴즈/실습/복습/숙달을 텍스트와 기호로 표시하고 이론 완료·수동 복습 토글을 제공. 퀴즈 완료율을 숙달률로 오인하던 진행 막대를 실제 숙달 집계로 교체. `src/logic.js`, `src/backup.js`는 새 배열을 중복 제거·알려진 ID 제한 후 통합 백업에 보존하고, 기존 파일은 빈 배열로 안전하게 이관. 초기화도 새 상태를 함께 지움.
- PWA/서버/검사 수정: `sw.js` shell v6와 `server/static-files.mjs`의 정확한 17개 자산 목록에 `src/mastery.js`를 추가. `.github/workflows/ci.yml` 문법 검사, 정적 서버 회귀, DOM 흐름, 통합 백업 round trip, 실제 Chromium 시나리오에 새 모듈과 숙달 전환을 포함. 색상만으로 상태를 구분하지 않도록 `✓`, `○`, `!`와 상태 문구를 함께 사용.
- 문서 수정: `README.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`에 판정 조건, 자동 채점 미지원 트랙의 경계, progress v1 호환, PWA shell v6와 E2E 범위를 기록. 이 일지를 포함해 생성 2개·수정 16개 파일.
- 로컬 검사: `npm test` 56/56 성공, 실패/skip 0. 실제 GCC로 C 5문제 정상/경계 입력과 컴파일 실패·오답·비정상 종료·시간 초과·즉시 재제출 검사 성공. 상태·백업·실제 앱 DOM 표적 검사 20/20 성공. 변경 JS/MJS 전체 `node --check`와 `git diff --check` 성공.
- 브라우저 검사: `npm run test:browser`에서 실제 GCC 5문제는 다시 모두 통과했으나 로컬 Playwright Chromium 실행 파일이 없어(`browserType.launch: Executable doesn't exist`) UI 단계는 미실행. 새 E2E는 최신 실패→성공, 이론 완료, 퀴즈 통과, 전체 숙달, 수동 복습으로 숙달 해제/복원, `mastery.js` 오프라인 캐시를 검사하도록 작성했으며 반영 후 GitHub Actions 결과를 별도 확인한다.
- 발견/해결: 이전에는 퀴즈 한 번 통과가 단원 완료와 진행률을 뜻해 실습·이론 숙달처럼 보였음. 완료 차원을 분리하고, 성공 후 재시도 실패를 과거 성공 삭제가 아니라 복습 신호로 모델링. 상태 UI와 백업을 추가하면서 정적 허용 목록/PWA 캐시 누락 시 앱이 깨지는 회귀를 자산 검사로 방지.
- 자료 접근/저작권: 로컬에서 두 첨부 PDF `c언어 압축 (1)(1).pdf`, `C_Programming.pdf` 접근을 다시 확인. 이번 변경은 학습 상태 기능이므로 본문을 읽거나 PDF·원문·그림을 저장소에 복제하지 않음.
- 미해결/경계: 로컬 환경에는 Chromium 바이너리가 없어 실제 UI·390px·오프라인 검증은 새 CI 대기. PWA 설치와 Windows/Android/iPad 실기기는 미검증. Rust·자료구조·알고리즘은 자동 채점 전이라 전체 숙달 불가. 브라우저 로컬 기록은 외부 성적 증명이 아니며 C 실행기는 계속 비격리 개인용 도구다.
- GitHub 반영: 이 일지를 포함하는 커밋 제목 `feat: separate learning mastery states`. 자신의 SHA와 새 CI 결과는 커밋 후 원격 HEAD·파일·Actions를 재조회하여 실행 보고서에 기록한다. 반영 직전 원격 main이 시작 SHA와 일치하는지 확인하고 강제 푸시하지 않는다.
- 다음 우선 작업: **`content/c/06-functions.md` 함수 원고의 학습 화면 연결**. 먼저 기존 원고와 카탈로그 구조를 대조하고, 선수 지식·목표·상세 이론·독자 정적 호출/스택 도식·완성 예제 출력·흔한 오류·퀴즈·C 실습 및 GCC 경계 테스트를 하나의 고품질 단원으로 설계한다. 원고의 일부만 연결할 경우 미완성 범위를 명시한다.
- 분야별 상태: C 5개/Rust·자료구조·알고리즘 각 1개 시범 단원, C 5문제 유지. 공유 제출 이력·통합 백업·두 v1 호환·다섯 학습 상태 분리는 구현됨. 함수 원고 화면 연결, 전체 C 교과서/문제 은행, 자료구조·알고리즘 확장, Rust 전용 채점, PWA 실기기 검증은 후속 작업.

---

## 2026-10-11 13:02~13:09 KST — 진도·초안·제출 이력 통합 백업

- 실행 시작 커밋: `e92b482fb58c0986a95e5acae0a4fd8b69a7be44` (`main`). 원격 HEAD와 깨끗한 로컬 체크아웃 일치, 열린 PR 없음. 기존 GitHub Actions https://github.com/cys123431-ship-it/CodeWeave/actions/runs/38107138362 의 Node/GCC와 실제 Chromium 작업 모두 성공을 확인. 이전 정적 서버 작업을 중복하지 않음.
- 목표/성공 조건: 퀴즈 진도·모든 트랙 코드 초안·반복 제출 기록을 파일 하나로 내보내고 다시 복원. 기존 `CodeWeave version:1` 진도 파일과 `kind:attempt-history version:1` 제출 파일을 계속 읽으며, 기존 제출 파일은 C 범위 밖 데이터와 퀴즈 진도를 보존. 잘못된 형식/버전/단원/과대 파일과 저장 실패를 안전하게 처리. 기존 저장 키와 형식은 변경하지 않음.
- 생성: `src/backup.js` — `full-backup` v1 생성·정규화·두 기존 v1 판별/마이그레이션·세 localStorage 키 복원과 실패 시 원문 rollback. `tests/backup.test.mjs` — 전체 round trip, 기존 진도 호환, 기존 제출의 다른 트랙 보존/C 범위 교체, 통합 범위 교체, 중간 저장 실패 rollback, 잘못된 형식/버전/ID 검사 6개.
- 수정: `src/app.js`, `src/workbench.js`, `workbench.html` — 두 화면에서 최신 저장값을 읽어 같은 통합 파일을 다운로드하고 통합/기존 두 형식을 복원. 5MB 선검사, 복원 형식/교체 범위 확인, 성공·실패 안내. `src/attempt-backup.js` — 기존 v1 정규화 함수를 통합 모듈에서도 재사용하도록 export하되 기존 형식/API 보존. `sw.js`, `server/static-files.mjs` — 새 모듈을 PWA shell v5와 정확한 정적 허용 목록에 포함.
- 검사/문서 수정: `tests/browser-practice.mjs`는 실제 다운로드의 `full-backup` 형식과 재복원을 검사. `tests/static-server.test.mjs`, `tests/workbench-source.test.mjs`, `.github/workflows/ci.yml`은 신규 자산/문법 회귀 검사. `README.md`, `docs/ARCHITECTURE.md`는 형식별 교체 범위, 5MB 제한, rollback과 localStorage 비트랜잭션 경계를 기록. 이 일지를 포함하여 총 15개 파일 변경.
- 발견/해결: 기존 대시보드와 연습장이 각각 다른 JSON을 내려받아 두 파일을 별도로 보관해야 했음. 기존 진도 복원은 제출 이력을 유지하고, 기존 C 제출 복원은 C 초안/이력만 교체하면서 Rust 등 다른 트랙과 퀴즈 진도를 유지하도록 명시적인 범위 마이그레이션을 구현. 새 통합 복원만 세 범위를 모두 교체함. 다중 키 두 번째 쓰기 실패를 재현하여 첫 번째 변경까지 원래 직렬화 값으로 되돌리는 것을 확인.
- 로컬 검사: 변경 전 기준 44/44 성공. 구현 후 `npm test` 50/50 성공, 실패/skip 0. 실제 GCC로 기존 C 5문제 정상/경계 입력과 컴파일 실패·오답·비정상 종료·시간 초과·즉시 재제출 검사 성공. 변경 JS/MJS `node --check`와 `git diff --check` 성공.
- 브라우저 검사: `npm run test:browser`에서 실제 GCC 5문제는 통과했으나 로컬 Playwright Chromium 실행 파일 부재(`browserType.launch: Executable doesn't exist`)로 UI 단계는 미실행. 반영 후 GitHub Actions의 Chromium 작업으로 통합 파일 다운로드/재복원, 기존 진도 v1, 390px/오프라인 회귀를 확인한다. HTTP/DOM/단위 검사만으로 브라우저 성공을 주장하지 않음.
- 자료 접근/저작권: 첨부 `c언어 압축 (1)(1).pdf`(87,753,393 bytes), `C_Programming.pdf`(6,838,054 bytes)의 로컬 파일 접근을 다시 확인. 이번 작업은 교육 콘텐츠가 아니므로 목차/본문은 읽지 않았고 PDF/본문/그림을 저장소에 포함하지 않음.
- 미해결/경계: localStorage는 트랜잭션 DB가 아니며 동시에 다른 탭이 쓰는 순간까지 직렬화할 수 없음. rollback 자체도 브라우저 저장소 장애로 실패할 수 있어 별도 경고를 제공하며 복원 전 파일 백업을 권장. PWA 설치·실제 Windows/Android/iPad와 공개 배포는 미검증. C 실행기는 계속 비격리 개인용 도구임.
- GitHub 반영: 이 일지를 포함하는 커밋 제목 `feat: unify progress and attempt backups`. 자신의 SHA와 새 CI 결과는 커밋 후 원격 HEAD/파일/Actions를 재조회하여 실행 보고서에 기록한다. 최신 base tree와 expected SHA를 사용하고 강제 푸시하지 않는다.
- 다음 우선 작업: **학습 상태 모델 분리**. 이론 읽기, 개념 퀴즈 통과, 코딩 실습 통과, 복습 필요, 전체 숙달을 각각 표현하되 기존 `progress.v1`과 통합 백업을 마이그레이션하는 테스트부터 작성. 이어 `content/c/06-functions.md`를 검토하여 화면/도식/퀴즈/컴파일 검증 실습에 연결.
- 분야별 상태: C 5개/Rust·자료구조·알고리즘 각 1개 시범 단원, C 5문제. 공유 제출 이력·초안 보존·통합 백업과 두 v1 호환이 구현됨. 숙달 상태 분리, 함수 원고 연결, Rust 채점, 전체 교과서/문제 은행은 후속 작업.

---

## 2026-10-11 11:56 KST — 로컬 정적 파일 접근 제한

- 실행 시작 커밋: `d1cb7ba7d79906432d47a40fb830732a7ff51cf8` (`main`). 원격 HEAD/트리와 열린 PR(없음)을 확인하고 깨끗한 로컬 체크아웃을 fast-forward로 동기화. 기존 CI https://github.com/cys123431-ship-it/CodeWeave/actions/runs/38105230756 성공, 변경 전 `npm test` 38/38 성공. 이미 반영된 초안 보존/Chromium 검사는 중복 구현하지 않음.
- 목표/성공 조건: 학습/PWA의 현재 15개 파일과 `/`만 정적으로 제공하고 비공개/미등록 파일, 잘못된 경로와 파일·디렉터리 심볼릭 링크를 차단. 기존 GET/HEAD/query, API 경로, C 5문제 채점과 제출/백업 검사가 계속 통과해야 함.
- 생성: `server/static-files.mjs` — 정확한 파일 허용 목록, 원래 요청 경로 검증, 링크/실제 경로 확인, 열린 파일 메타데이터 제공. `tests/static-server.test.mjs` — 합성 비공개 파일을 둔 임시 프로젝트에서 실제 HTTP 차단/학습 자산/HEAD/PWA shell/API/잘못된 경로/링크/누락 파일 검사.
- 수정: `dev-server.mjs` — 허용 정책 연결, URL 정규화 전 경로 검사, 파일 핸들 기반 읽기와 연결 종료/오류 정리. `.github/workflows/ci.yml` — 신규 서버 모듈 문법 검사. `README.md`, `docs/ARCHITECTURE.md` — 파일 제공 범위/새 자산 등록법/보안 경계. 이 일지 — 재현·검증·다음 작업.
- 발견/재현: 변경 전 검사에서 합성 `.env`의 GET, 점 경로의 정상 파일 접근, 허용 파일 위치의 외부 심볼릭 링크가 HTTP 200을 반환. 세 차단 시나리오 실패(상위 검사 포함 실패 4, 성공 2). 실제 자격 증명은 만들거나 읽지 않았고 저장소 파일을 링크로 교체하지 않음.
- 해결/검토: 원래 요청을 한 번만 디코딩하고 점 경로/중복 구분자/역슬래시/인코딩된 구분자/중복 인코딩/제어 문자/잘못된 UTF-8/퍼센트 인코딩을 400으로 거부. 미등록 경로와 내부·외부 링크는 404. 허용 파일도 부모를 확인하고 지원 OS에서 최종 파일을 `O_NOFOLLOW`로 열어 같은 핸들에서 크기와 본문을 읽음. HEAD/끊긴 연결/스트림 오류의 핸들 정리 검토. 기존 채점 로직·저장 키·백업 형식은 그대로 사용.
- 로컬 검사: 수정 후 정적 서버 검사 6/6 성공. 마지막 `npm test` 44/44 성공, 실패/skip 0. 실제 GCC로 C 5문제의 정상/경계 입력, 컴파일 실패·오답·비정상 종료·시간 초과·즉시 재제출 검사 성공. `node --check` 변경 JS/MJS와 app/catalog/workbench 성공. `git diff --check` 성공.
- 로컬 브라우저 시도: `npm run test:browser`가 실제 C 5문제 채점까지 통과한 뒤 `browserType.launch: Executable doesn't exist`로 중단. Chromium 실행 파일이 없어 로컬 브라우저/모바일/오프라인 검사는 수행하지 못함. 반영 후 기존 GitHub Actions `browser` 작업의 실제 Chromium 결과를 따로 조회하며 HTTP 검사 성공을 E2E 성공으로 보고하지 않음.
- 미해결/경계: 파일 허용 정책은 신뢰하는 로컬 체크아웃의 HTTP 제공 제한이며 C 실행 샌드박스가 아님. 공개 실행 서버/배포, PWA 설치, 실제 Windows/모바일 기기는 검증하지 않음. 첨부 두 PDF는 로컬에 존재하지만 이번 작업에서 장·절/본문 대조는 수행하지 않음.
- GitHub 반영: 이 일지를 포함하는 커밋 제목 `fix: restrict local static files to learning assets`. 자신의 SHA와 반영 후 CI는 커밋 생성 뒤 원격 재조회/실행 보고서에서 확인한다. 기존 base tree를 보존하고 최신 HEAD와 expected SHA를 확인하여 강제 푸시 없이 반영한다.
- 다음 우선 작업: **통합 백업**. 기존 `CodeWeave version:1` 진도/초안 백업과 `kind:attempt-history version:1` 제출 백업을 모두 읽되 다른 트랙 기록을 보존. 잘못된 데이터/큰 파일/저장 실패/복원 실패의 회귀 검사부터 작성. 이어 이론·퀴즈·실습·복습·숙달 상태 모델, 함수 원고 화면 연결.
- 분야별 상태: C 5개/Rust·자료구조·알고리즘 각 1개 시범 단원과 C 5문제. 공유 제출 이력/초안 보존은 구현됨. Rust 전용 채점/전체 교과서/함수 원고 연결/통합 백업/전체 숙달은 후속 작업. PWA/390px/오프라인 재로딩의 기존 Chromium 검사는 구현되어 있으며 이번 변경에서도 CI 결과를 확인해야 함.

---

## 2026-10-11 11:16~11:25 KST — 원격 갱신 후 초안 저장/브라우저 검증 후속

- 최초 확인 SHA: `033f29a4e8fa67267eab82f52881e729bde4ae2d`. 반영 직전 `main`이 `0fa9875c941a1292f8d421d8ea3ffa7d655c1ccc`로 갱신된 것을 재조회하여 확인.
- 저장된 원격 구현을 덮어쓰지 않고 새 작업 폴더에서 최신 버전을 기준으로 후속 개발. 동일한 제출 이력 모듈/UI/운영 문서는 중복 추가하지 않음.
- 이번 목표: 서로 다른 문제/트랙의 초안 저장 충돌 방지, 퀴즈 동작이 초안을 덮어쓰지 않도록 분리, 실제 브라우저 자동 검사 추가.
- 변경 파일: `src/practice.js`, `src/app.js`, `src/workbench.js`, `styles.css`, `sw.js`, `tests/drafts.test.mjs`, `tests/app-flow.test.mjs`, `tests/browser-practice.mjs`, `package.json`, `.github/workflows/ci.yml`, `README.md`, `docs/ARCHITECTURE.md`, `docs/CONTENT_POLICY.md`, 이 일지.
- 구현: 두 화면에서 저장 직전에 최신 v1 초안을 읽고 한 문제만 갱신. 과거 데이터 정규화/길이 검증/저장 실패 안내. 코드 저장은 진도를 다시 쓰지 않고, 퀴즈는 최신 진도에서 해당 단원 결과만 갱신하여 다른 탭의 완료 기록을 보존. 백업 복원 시 다른 트랙의 최신 초안 보존. Shift+Tab으로 편집기를 벗어날 수 있음. PWA shell v4.
- 검증: `npm test` 38/38 성공(실패/skip 0), JS 문법·diff 공백 검사 성공. PR #1 최초 Actions 실행의 Node/GCC 검사 성공. Chromium 설치/실행은 성공했으나 테스트용 v1 데이터를 주입한 뒤 hash 이동만 하여 앱 상태가 다시 읽히지 않는 검사 준비 오류로 초기 초안 검증 실패. 주입 후 새로고침을 수행하도록 테스트를 수정하고 실패 화면도 CI artifact로 남기도록 보완. 두 번째 Chromium 실행은 실제 제출/공유 이력/복원/재제출/오류/키보드/백업 호환 검사까지 통과했으나 390px에서 페이지 가로 넘침을 발견. CI 실패 화면을 확인하여 모바일 grid의 자동 최소 너비가 원인임을 확인했고 최소 너비 0의 열과 sidebar로 수정. 코드 저장이 진도를 덮어쓰는 문제도 함께 회귀 검사로 수정. 세 번째 실행에서 Node/GCC 38개와 실제 Chromium의 8개 검사 묶음 전부 성공. CI https://github.com/cys123431-ship-it/CodeWeave/actions/runs/38105007046 (소스 커밋 `46cad516d782e87605bc6552394348586c450c58`). 390px 화면·오프라인 재로딩·브라우저 예외 없음까지 확인. 검사 화면은 해당 실행의 `codeweave-browser-qa` artifact로 7일 보존한다. PWA 설치와 실제 기기 검증은 미실행.
- 로컬 브라우저 제약: Chromium 실행 파일 부재, 공식 다운로드가 유효한 ZIP을 반환하지 않아 설치 실패. 클라우드 브라우저는 loopback 서버에 ERR_CONNECTION_REFUSED. 이를 UI 성공으로 보고하지 않고 별도 PR의 GitHub Actions에서 실제 Chromium 검사를 수행.
- GitHub 반영: 문서 갱신 `b56f0354c74326c2c9c00ceb4876328749c0e1a9`까지 보존하여 PR https://github.com/cys123431-ship-it/CodeWeave/pull/1 생성. 최초 커밋 `d36ee037de332dfe97b8788c35f66481aff0d483`, 13개 변경 파일의 로컬/원격 Git blob hash 일치. 실패한 두 실행은 수정 후 재검증했고 소스 변경 `46cad516`의 검사 전부 성공. 현재 PR의 검증 기록을 갱신한 뒤 main 반영을 진행한다. 자신의 최종 SHA는 이 문서를 포함하는 커밋에서 확인한다. 개발 실행과 반복 예약 성공은 별도 확인.
- 예약 확인: 새 Work `CodeWeave 자동 개발`이 활성 `true`, `Asia/Seoul`, 첫 규칙 시각 2026-10-11 12:00, 매 1시간. 이미 요청대로 생성된 예약을 확인하여 중복 생성하지 않음. 재조회된 `next_run_time`은 null이므로 첫 규칙 시각과 실제 첫 무인 실행 성공을 구분한다.
- 미완료: 동일 문제 동시 편집은 마지막 저장 적용. 통합 백업/이론·복습·숙달/함수 단원/Rust/전체 교과서/PWA 설치/실기기/공개 배포는 후속 작업.
- 다음 목표: 먼저 이번 PR의 실제 Chromium 검사 오류 해결 → 정적 서버 허용 자산 정책/회귀 검사 → 두 v1 백업을 읽는 통합 백업 → 숙달 모델 → 함수 원고 연결.

---

## 2026-10-11 11:06–11:15 KST — Work 최초 개발 실행

- 실행 시작 커밋: `033f29a4e8fa67267eab82f52881e729bde4ae2d` (`main`). 최신 원격 조회와 로컬 clone 결과가 일치했으며 기존 CI는 성공이었다.
- 목표: 메인 C 단원에서 제출 → 테스트 결과 → 최근 10회 기록 → 이전 코드 복원 → 재제출을 연결한다. 기존 연습장/저장 키/백업 형식/퀴즈 진도를 유지한다.
- 성공 조건: 기존 연습장 기록 읽기, 결과를 같은 이력에 저장, 다른 문제 기록 보존, 실패 코드 복원과 취소, 복원이 제출로 처리되지 않음, 재제출 시 새 결과 추가, 전송/응답 오류가 통과 기록으로 변환되지 않음, 기존 검사 통과.

### 수정 및 생성 파일

- `src/app.js`: C 단원 제출 기록/코드·테스트 상세/복원 UI, 채점 중 중복 요청 방지, 저장 실패 안내. 퀴즈 완료와 실습 결과를 별도 표시한다. 다른 탭의 이력 갱신은 활성 편집기를 다시 만들지 않는다.
- `src/practice.js` (신규): 채점 응답 검증, 최신 저장 이력에 결과 추가, 복원 코드 조회, HTML 이스케이프를 적용한 제출 상세 렌더링. 기존 v1 이력을 그대로 사용한다.
- `src/workbench.js`: 메인 화면과 동일한 기록 저장 절차 사용. 코드 자동 저장이 이전 이력 snapshot을 다시 덮어쓰지 않도록 분리한다. 다른 탭의 제출 이력 변경을 반영한다.
- `styles.css`, `sw.js`: 제출 상세/터치 대상/키보드 포커스 스타일, 새 모듈 캐시와 shell v3.
- `dev-server.mjs`: 채점 종료 후 임시 파일 정리/슬롯 해제 전에 응답하던 경쟁 조건 수정. 실제 listen 포트 출력으로 통합 검사에 임의 포트 사용.
- `tests/practice.test.mjs` (신규): 공유 이력/문제 보존, 복원/재제출/10회 제한, 응답 검증, 저장 실패, 코드·진단 이스케이프, 상세 없는 과거 기록 검사.
- `tests/app-flow.test.mjs` (신규): 실제 app 모듈을 DOM/event fixture로 실행해 기존 이력 → 입력 저장 → 제출 → 중복 요청 거부 → 복원 취소/승인 → 오프라인 실패 → 편집기 보존 흐름 검사. 실제 브라우저 E2E가 아니다.
- `tests/grader-api.test.mjs` (신규): loopback Node 서버와 실제 GCC로 기존 C 5문제 전체 정상 사례, 컴파일 실패, 오답, 비정상 종료, 무한 반복 제한, 잘못된 문제/길이, 즉시 연속 제출 검사.
- `.github/workflows/ci.yml`: 신규 모듈 문법 검사 및 GCC 존재 확인. CI에서 실제 채점 검사가 조용히 skip되지 않게 한다.
- `README.md`: 메인 제출 흐름과 백업 분리 안내.
- `docs/AUTONOMOUS_DEVELOPMENT.md` (신규): 승인된 목표/제외 기능/교육 범위/품질/안전 경계/테스트/커밋/예약/실패 처리/보고 규칙을 다음 실행에 전달.

### 테스트 결과와 재수정

- 변경 전 `npm test`: 16/16 성공.
- 첫 GCC 통합 검사: 연속 제출 직후 기존 서버가 HTTP 429를 반환하여 컴파일 실패 검사가 실패했다. 응답이 임시 파일 정리보다 먼저 전달되는 것이 원인이었다.
- 실제 수정: 채점 결과를 준비하고 임시 파일 정리·슬롯 해제를 마친 다음 응답한다. 요청 본문을 읽은 뒤에도 슬롯을 재확인하고 슬롯을 소유하지 않은 요청은 다른 작업의 busy 상태를 해제하지 않는다.
- 수정 후 `npm test`: 35/35 성공, 실패 0, skip 0. C 5문제 정상 풀이와 실패 종류를 실제 GCC로 검증했다. 즉시 연속 제출 회귀 검사도 통과했다.
- `node --check`: app/catalog/workbench/practice/dev-server/sw 성공. `git diff --check` 성공.
- 실제 브라우저/모바일 레이아웃/PWA 설치/오프라인 E2E는 미실행: 사용 가능한 브라우저 제어 도구가 없다. DOM fixture/API 검사 성공을 브라우저 성공으로 보고하지 않는다.
- 첨부 두 PDF의 로컬 접근과 메타데이터(750쪽/288쪽) 확인. 전체 본문/목차는 아직 대조하지 않았고 공개 저장소에 PDF를 포함하지 않았다.

### 미해결 및 다음 실행

1. **정적 파일 서버 접근 제한**: 현재 프로젝트 루트의 불필요한 파일까지 정적으로 접근 가능하다. 다음 실행은 허용할 학습 자산을 명시하고 Git 메타데이터/환경/테스트/서버 파일·심볼릭 링크/잘못된 경로를 차단하는 회귀 검사를 먼저 작성한다. 기존 UI/PWA/채점 API를 검증한다.
2. 진도/초안/이력을 한 백업으로 통합하되 두 기존 v1 형식과 다른 트랙 데이터를 보존하고 큰 파일/잘못된 데이터/복원 실패를 검사한다. 여러 탭의 초안 저장 충돌은 아직 해결하지 않았다.
3. 이론·퀴즈·실습·복습·전체 숙달 상태 분리, 함수 원고 화면 연결/새 문제/독자 그림, 두 교재 장·절 대응표.
4. 실제 브라우저/모바일/PWA E2E, Rust 전용 채점, 전체 교과서/문제 은행은 후속 작업이다.

### GitHub 및 예약

- 이 기록을 포함하는 커밋 제목: `feat: integrate lesson submission history and verify GCC resubmissions`.
- 개발 커밋: `0fa9875c941a1292f8d421d8ea3ffa7d655c1ccc`, https://github.com/cys123431-ship-it/CodeWeave/commit/0fa9875c941a1292f8d421d8ea3ffa7d655c1ccc (`main`). 원격 HEAD 재조회 일치, 13개 변경 파일의 Git blob hash 대조 일치. 로컬 체크아웃도 해당 커밋으로 동기화했다.
- 해당 개발 커밋 CI 성공: https://github.com/cys123431-ship-it/CodeWeave/actions/runs/38104571849 . 이 후속 기록 커밋의 CI는 별도로 조회한다.
- 11:16 KST에 이 Work 대화의 새 `CodeWeave 자동 개발` 예약 생성 성공. 재조회 결과 활성화 `true`, 시간대 `Asia/Seoul`, `DTSTART;TZID=Asia/Seoul:20261011T120000`, `RRULE:FREQ=HOURLY;INTERVAL=1`. 저장된 규칙의 첫 예정 시각은 2026-10-11 12:00 KST다.
- 예약 도구의 `next_run_time`과 `last_run_time`은 재조회 시 `null`이었다. 예약 생성/활성화와 첫 무인 개발 실행 성공을 구분하며 실제 최초 무인 실행은 아직 검증 전이다.
- 기존 일반 ChatGPT의 `CodeWeave 자동 개발` 예약은 조회 당시 비활성 상태였다. 이를 자동 이전했다고 간주하지 않는다.

---

## 2026-10-11 (2차 패치 GitHub 반영)

기존 GitHub 반영 실패 패치를 재검토하여 main 브랜치에 업로드했습니다. 시작 시점 main HEAD: `6fde9b53f2e7b05ea9919e31ba43ef688d8abe01`.

**새로 반영한 파일**
- `workbench.html`, `workbench.css`: 모바일 대응 C언어 반복 제출 연습장.
- `src/workbench.js`: C언어 기존 문제·스타터 코드, 로컬 GCC 채점 API, 제출 이력/코드 복원, 작성 코드 자동 저장.
- `src/attempt-backup.js`: C 문제에 한정한 제출 기록과 코드 초안 JSON 내보내기·복원 및 검증.
- `tests/attempt-backup.test.mjs`, `tests/workbench-source.test.mjs`: 백업/복원·정적 페이지·JS 문법 테스트.

**기존 파일 변경**
- `src/app.js`: 학습 대시보드에서 별도 반복 제출 연습장으로 가는 메뉴 연결.
- `sw.js`: 새로운 연습장 파일의 PWA 캐시 추가 및 버전 갱신.
- `README.md`: 기능 이용법과 로컬 채점의 제한 문서화.

**검증**
- 최신 패치를 포함한 GitHub Actions의 Node.js 검사: 성공 (기능 연결 후 https://github.com/cys123431-ship-it/CodeWeave/actions/runs/38103497305).
- 검증된 범위: 단위 테스트 및 문법 검사. 실제 브라우저 E2E/공개 배포 검증은 아직 실시하지 않음.
- 로컬 GCC 실행은 격리된 샌드박스가 아니므로 공개 서비스 사용 금지.

**다음 작업**
1. 기존 일반 학습 백업과 연습장 반복 제출 백업을 통합하고, 이전 풀이 이력 UI를 메인 코딩 실습 화면에 직접 표시.
2. 정적 파일 서버에서 불필요한 프로젝트/비공개 파일 접근 차단.
3. `content/c/06-functions.md`를 실제 학습 카탈로그에 연결하고 교과서형 설명·자동 채점 문제 확대.
4. 실제 브라우저에서 PWA 설치·오프라인·모바일 화면을 E2E 검증.

---

## 2026-10-11 02:39 KST

GitHub main 브랜치와 README, ROADMAP, ARCHITECTURE, CONTENT_POLICY, 소스, 기존 테스트, CI를 확인했습니다.

이번 실행에서 추가한 파일:
- src/iterations.js: 문제별 제출 이력 정규화, 최대 10회 저장, 통과 문제 계산.
- tests/iterations.test.mjs: 제출 이력의 저장 순서, 길이 제한, 복원 데이터 검증 테스트.

미완료: 기존 src/app.js, src/logic.js, sw.js와 통합. 현재 UI에는 제출 이력이 나타나지 않습니다. 기존 파일 수정 요청이 연결 도구에서 거부되어 반영되지 않았습니다.

검증: GitHub Actions의 새 테스트 실행 결과를 확인합니다. 로컬 GitHub 복제는 DNS 연결 실패로 불가했습니다.

다음 작업: 반복 제출 UI 및 백업 연동, 정적 서버의 파일 노출 제한, C언어 함수 단원과 실제 컴파일 테스트 보강. 교재 원문과 그림은 복제하지 않습니다.
