# 통합 교육과정 로드맵 — 확정본

| 단계 | 범위 | 완료 | 진행 중 | 미착수 | 완료율 |
|---|---|---:|---:|---:|---:|
| A | C 기초 | 3/5 | 0 | 2 | 60.0% |
| B | C 핵심 | 10/11 | 0 | 1 | 90.9% |
| C | C 심화 | 8/8 | 0 | 0 | 100.0% |
| D | 자료구조 — C | 4/8 | 1 | 3 | 50.0% |
| E | 알고리즘 — C | 4/8 | 0 | 4 | 50.0% |
| F | Rust 기초 | 3/8 | 0 | 5 | 37.5% |
| G | Rust 응용 | 0/8 | 0 | 8 | 0.0% |
| H | C와 Rust 연결 학습·재구현 | 0/6 | 0 | 6 | 0.0% |
| I | 종합 프로젝트·플랫폼 마무리 | 0/6 | 0 | 6 | 0.0% |

확정일: 2026-10-15. 상태 원본은 [roadmap.json](roadmap.json)이며 표는 계산 결과다.
기존 구현 검증 기준: [13d85b0](https://github.com/cys123431-ship-it/CodeWeave/commit/13d85b04c6156ed69a44637bda91f0963abc0676) · [CI](https://github.com/cys123431-ship-it/CodeWeave/actions/runs/38733858917).

## 상태와 분모의 의미

- 완료는 이름 붙인 제한 범위의 원고·화면·예제·퀴즈·실제 채점·수정/재제출 경로를 검증했다는 뜻이다. Rust의 인수 환경은 각 practiceDelivery.platforms와 인수 문서에 한정한다. 트랙 전체나 플랫폼 완성이 아니다.
- 진행 중은 기존 샘플이나 일부 경로만 있다는 뜻이다. 채점 없는 Rust·자료구조·알고리즘 샘플은 완료로 세지 않는다.
- 이론·퀴즈 인수 CI는 실제 전달한 제한 범위의 근거이며 단원 전체 완료나 학습자 숙달이 아니다. Rust의 같은 인수 기록으로 차례를 반복 건너뛸 수 없고 다음 Rust 차례는 미완료 실습 작업을 이어간다.
- 미착수는 이 제목의 독립 학습 단원/실습이 없다는 뜻이다. 관련 개념이 다른 원고에 잠깐 등장해도 완료로 올리지 않는다.
- 단원은 같은 크기의 작업량이 아니다. 단계별 완료율을 플랫폼 전체 완료율로 평균내지 않는다. H·I와 기기 인수 검사를 생략할 수 없다.
- 기존 C 23개와 타 트랙 샘플 3개를 한 번씩만 기본 매핑한다. 여러 실습을 포함한 기존 범위는 한 로드맵 단원으로 묶었으며 교차 참고로 중복 집계하지 않는다.
- 기존 단원의 분량·사례 수는 보존한다. 새 단원 한도는 기존 20사례나 긴 원고를 소급 축소할 근거가 아니다.
- A~I는 범주별 목차다. 실제 학습 순서는 src/exercises.js의 선수 단원 계약을 우선한다. 문자열·배열이 필요한 fgets/strtol은 C 심화에 배치했다. A05는 그와 다른 작은 수치 입력/출력의 독립 연습이며 아직 작성하지 않았다.

## A. C 기초

| ID | 단원 | 상태 | 기존 단원·검증 근거 |
|---|---|---|---|
| A01 | Windows·터미널·GCC 환경과 첫 진단 읽기 | 미착수 | — |
| A02 | 첫 C 프로그램: 출력·줄바꿈·성공 종료 | 완료 | `c-hello` · [원고](../content/c/01-hello.md) · [검사](../tests/hello-content.test.mjs) · [검사](../tests/app-flow.test.mjs) |
| A03 | 변수·초기화·연산과 두 정수 합 | 완료 | `c-types` · [원고](../content/c/02-variables-types.md) · [검사](../tests/types-content.test.mjs) · [검사](../tests/basic-integer-contracts.test.mjs) |
| A04 | 조건·반복 상태와 1부터 n까지의 합 | 완료 | `c-loops` · [원고](../content/c/03-conditionals-loops.md) · [검사](../tests/loops-content.test.mjs) |
| A05 | 입출력 형식·입력 성공 확인과 작은 계산기 | 미착수 | — |

## B. C 핵심

| ID | 단원 | 상태 | 기존 단원·검증 근거 |
|---|---|---|---|
| B01 | 배열·길이 계약·최댓값·고정 열 행렬 | 완료 | `c-array` · `c-array-max-function` · `c-matrix-row-sums` · [원고](../content/c/04-arrays.md) · [원고](../content/c/07-array-max-function.md) · [원고](../content/c/21-matrix-row-sums.md) · [검사](../tests/arrays-content.test.mjs) · [검사](../tests/array-max-content.test.mjs) · [검사](../tests/matrix-rows-content.test.mjs) |
| B02 | 포인터: 주소·역참조·수명과 호출자 변경 | 완료 | `c-pointer` · [원고](../content/c/05-pointers.md) · [검사](../tests/pointers-content.test.mjs) |
| B03 | 함수 설계·범위·저장 기간과 clamp 하네스 | 완료 | `c-functions` · `c-clamp-function` · [원고](../content/c/06-functions.md) · [검사](../tests/functions-content.test.mjs) · [검사](../tests/function-scope-content.test.mjs) |
| B04 | 재귀의 종료 조건과 작은 팩토리얼 | 완료 | `c-recursion-factorial` · [원고](../content/c/20-recursion-factorial.md) · [검사](../tests/recursion-content.test.mjs) |
| B05 | 문자열: 문자 세기·용량·널 종료 경계 | 완료 | `c-string-count-function` · `c-bounded-string-length` · [원고](../content/c/08-strings-count-function.md) · [원고](../content/c/09-bounded-string-length.md) · [검사](../tests/string-content.test.mjs) · [검사](../tests/bounded-string-content.test.mjs) |
| B06 | 구조체·포인터와 학생 점수의 상태 보존 | 완료 | `c-struct-student-score` · [원고](../content/c/12-struct-student-score.md) · [검사](../tests/struct-content.test.mjs) |
| B07 | 구조체 배열: 검색·안정 정렬·첫 위치 탐색 | 완료 | `c-struct-array-search` · `c-struct-array-sort` · `c-struct-array-binary-search` · [원고](../content/c/13-struct-array-search.md) · [원고](../content/c/14-struct-array-sort.md) · [원고](../content/c/15-struct-array-binary-search.md) · [검사](../tests/struct-array-content.test.mjs) · [검사](../tests/struct-array-sort-content.test.mjs) · [검사](../tests/struct-array-binary-search-content.test.mjs) |
| B08 | 동적 학생 배열: 생성·초기화·소유권·해제 | 완료 | `c-dynamic-student-array` · [원고](../content/c/17-dynamic-student-array.md) · [검사](../tests/dynamic-memory-content.test.mjs) |
| B09 | realloc: 용량 확대와 실패 보존 | 완료 | `c-realloc-student-capacity` · [원고](../content/c/18-realloc-student-capacity.md) · [검사](../tests/realloc-content.test.mjs) |
| B10 | 동적 배열 push: 기하급수 성장과 함수 합성 | 완료 | `c-student-vector-push` · [원고](../content/c/19-student-vector-push.md) · [검사](../tests/student-vector-push-content.test.mjs) |
| B11 | typedef·enum·union으로 자료형 조합하기 | 미착수 | — |

## C. C 심화

| ID | 단원 | 상태 | 기존 단원·검증 근거 |
|---|---|---|---|
| C01 | 헤더·분할 컴파일과 세 파일 clamp 조립 | 완료 | `c-multi-file` · [원고](../content/c/06-functions.md) · [검사](../tests/multi-file.test.mjs) · [검사](../tests/compiler-feedback.test.mjs) · [검사](../tests/grader-api.test.mjs) |
| C02 | 학생 명부: 안정 정렬과 첫 학번 탐색 조립 | 완료 | `c-struct-student-registry` · [원고](../content/c/16-struct-student-registry.md) · [검사](../tests/student-registry-content.test.mjs) |
| C03 | fgets 조각과 논리적인 한 줄 | 완료 | `c-fgets-logical-line` · [원고](../content/c/10-fgets-logical-line.md) · [검사](../tests/fgets-content.test.mjs) |
| C04 | strtol로 정수·범위·잔여 입력 검증 | 완료 | `c-strtol-integer-input` · [원고](../content/c/11-strtol-integer-input.md) · [검사](../tests/strtol-content.test.mjs) |
| C05 | 파일 입출력: 스트림 수명·오류·EOF | 완료 | `c-file-stream-count` · [원고](../content/c/22-file-streams.md) · [검사](../tests/stream-exercise.test.mjs) · [검사](../tests/browser-practice.mjs) · [검사](../tests/exercise-audit.test.mjs) |
| C06 | 전처리 매크로·조건부 컴파일과 중복 평가 | 완료 | `c-preprocessor-once` · [원고](../content/c/23-preprocessor-once.md) · [검사](../tests/preprocessor-exercise.test.mjs) · [검사](../tests/browser-practice.mjs) |
| C07 | 오류 반환·errno와 자원 정리 경로 | 완료 | `c-owned-stream-byte` · [원고](../content/c/24-owned-stream-errors.md) · [검사](../tests/owned-stream-exercise.test.mjs) · [검사](../tests/browser-practice.mjs) · [검사](../tests/roadmap.test.mjs) |
| C08 | 표준 라이브러리·함수 포인터와 빌드 자동화 | 완료 | `c-qsort-callback` · [원고](../content/c/25-qsort-function-pointers.md) · [검사](../tests/callback-sort-exercise.test.mjs) · [검사](../tests/browser-practice.mjs) · [검사](../tests/roadmap.test.mjs) |

## D. 자료구조 — C

| ID | 단원 | 상태 | 기존 단원·검증 근거 |
|---|---|---|---|
| D01 | 단일 연결 리스트: 순회와 첫 일치 검색 | 완료 | `ds-list-find` · [원고](../content/ds/01-linked-list.md) · [검사](../tests/ds-list.test.mjs) · [검사](../tests/roadmap.test.mjs) · [검사](../tests/browser-practice.mjs) |
| D02 | 배열 스택: push·pop·용량과 빈 상태 | 완료 | `ds-stack` · [원고](../content/ds/02-stack.md) · [검사](../tests/stack-exercise.test.mjs) · [검사](../tests/roadmap.test.mjs) · [검사](../tests/browser-practice.mjs) |
| D03 | 원형 큐: 삽입·삭제·순환 경계 | 완료 | `ds-queue` · [원고](../content/ds/03-queue.md) · [검사](../tests/queue-exercise.test.mjs) · [검사](../tests/roadmap.test.mjs) · [검사](../tests/browser-practice.mjs) |
| D04 | 동적 배열 리스트: 삽입·삭제·이동 비용 | 완료 | `ds-array-list` · [원고](../content/ds/04-array-list.md) · [검사](../tests/array-list-exercise.test.mjs) · [검사](../tests/roadmap.test.mjs) · [검사](../tests/browser-practice.mjs) |
| D05 | 연결 리스트의 소유권·삽입·삭제·해제 | 진행 중 | [원고](../content/ds/05-owned-linked-list.md) · [검사](../tests/owned-list-exercise.test.mjs) |
| D06 | 이진 탐색 트리: 탐색·삽입·순회 | 미착수 | — |
| D07 | 해시 테이블: 충돌·탐색·삭제 표식 | 미착수 | — |
| D08 | 그래프 표현: 인접 목록과 자원 정리 | 미착수 | — |

## E. 알고리즘 — C

| ID | 단원 | 상태 | 기존 단원·검증 근거 |
|---|---|---|---|
| E01 | 복잡도와 선형·이진 탐색의 전제 | 완료 | `algo-binary` · [원고](../content/algo/01-search.md) · [검사](../tests/algo-search.test.mjs) · [검사](../tests/exercises.test.mjs) · [검사](../tests/browser-practice.mjs) |
| E02 | 안정 정렬과 비교·이동 횟수 | 완료 | `algo-stable-insertion` · [원고](../content/algo/02-stable-insertion.md) · [검사](../tests/sort-exercise.test.mjs) · [검사](../tests/roadmap.test.mjs) · [검사](../tests/browser-practice.mjs) |
| E03 | 분할 정복: 병합 정렬과 보조 공간 | 완료 | `algo-merge` · [원고](../content/algo/03-merge-sort.md) · [검사](../tests/merge-exercise.test.mjs) · [검사](../tests/roadmap.test.mjs) · [검사](../tests/browser-practice.mjs) |
| E04 | 재귀 트리·백트래킹과 되돌리기 | 완료 | `algo-permutations` · [원고](../content/algo/04-backtracking-permutations.md) · [검사](../tests/permutations-exercise.test.mjs) · [검사](../tests/roadmap.test.mjs) · [검사](../tests/browser-practice.mjs) |
| E05 | 탐욕 선택과 반례로 명세 검증 | 미착수 | — |
| E06 | 동적 계획: 상태·점화식·기저 사례 | 미착수 | — |
| E07 | BFS·DFS와 방문 상태 | 미착수 | — |
| E08 | 최단 경로: 우선순위와 도달 불가 | 미착수 | — |

## F. Rust 기초

| ID | 단원 | 상태 | 기존 단원·검증 근거 |
|---|---|---|---|
| F01 | Cargo 프로젝트·cargo test와 채점 계약 | 완료 | `rust-cargo` · [원고](../content/rust/01-cargo.md) · [검사](../tests/f01-manuscript.test.mjs) · [검사](../tests/rust-delivery.test.mjs) · [검사](../tests/rust-exercises.test.mjs) · [검사](../tests/rust-http.test.mjs) · [검사](../tests/rust-executor.test.mjs) · [검사](../tests/rust-client.test.mjs) · [검사](../tests/rust-workbench.test.mjs) · [검사](../tests/start-rust.test.mjs) · [검사](../tests/browser-practice.mjs) · [검사](../tests/rust-contract.test.mjs) · [검사](../tests/rust-preparation.test.mjs) · [검사](../tests/rust-results.test.mjs) · [검사](../tests/rust-cargo-lesson.test.mjs) · [검사](../tests/theory-handoff.test.mjs) · [이론·퀴즈 인수 CI](https://github.com/cys123431-ship-it/CodeWeave/actions/runs/38843874384) · [로컬 Cargo 인수](F01_ACCEPTANCE.md) · [실제 채점 CI](https://github.com/cys123431-ship-it/CodeWeave/actions/runs/39157149118) |
| F02 | 변수 바인딩·가변성과 스칼라 형 | 완료 | `rust-mut` · [원고](../content/rust/02-bindings.md) · [검사](../tests/rust-mut-preparation.test.mjs) · [검사](../tests/f02-opt-in.test.mjs) · [검사](../tests/f02-client.test.mjs) · [검사](../tests/f02-delivery.test.mjs) · [검사](../tests/browser-practice.mjs) · [로컬 Cargo 인수](F02_ACCEPTANCE.md) · [실제 채점 CI](https://github.com/cys123431-ship-it/CodeWeave/actions/runs/39221228817) |
| F03 | 조건·반복·식과 범위 | 완료 | `rust-control-flow` · [원고](../content/rust/03-control-flow.md) · [검사](../tests/f03-control-flow.test.mjs) · [검사](../tests/browser-practice.mjs) · [로컬 Cargo 인수](ROADMAP.md) · [실제 채점 CI](https://github.com/cys123431-ship-it/CodeWeave/actions/runs/39506740517) |
| F04 | 함수·반환값과 단위 테스트 | 미착수 | — |
| F05 | 소유권·이동·복사와 자원 해제 | 미착수 | — |
| F06 | 공유 참조·가변 빌림과 슬라이스 | 미착수 | — |
| F07 | String·Vec와 경계 있는 접근 | 미착수 | — |
| F08 | Option·Result와 실패를 값으로 다루기 | 미착수 | — |

## G. Rust 응용

| ID | 단원 | 상태 | 기존 단원·검증 근거 |
|---|---|---|---|
| G01 | enum·구조체와 패턴 매칭 | 미착수 | — |
| G02 | HashMap·컬렉션 선택과 소유권 | 미착수 | — |
| G03 | 제네릭·트레이트와 인터페이스 계약 | 미착수 | — |
| G04 | 이터레이터·클로저와 오류 전달 | 미착수 | — |
| G05 | 모듈·가시성·여러 소스 파일 | 미착수 | — |
| G06 | Cargo 다중 파일 채점과 통합 테스트 | 미착수 | — |
| G07 | 파일·스트림과 오류 경로 | 미착수 | — |
| G08 | 수명 매개변수와 빌림 API 설계 | 미착수 | — |

## H. C와 Rust 연결 학습·재구현

| ID | 단원 | 상태 | 기존 단원·검증 근거 |
|---|---|---|---|
| H01 | C 포인터·수명과 Rust 빌림의 대응 | 미착수 | — |
| H02 | 학생 동적 배열을 Vec로 재구현 | 미착수 | — |
| H03 | 스택·큐를 같은 테스트 계약으로 재구현 | 미착수 | — |
| H04 | 리스트·트리의 소유권 설계 비교 | 미착수 | — |
| H05 | 탐색·정렬의 C/Rust 결과·비용 비교 | 미착수 | — |
| H06 | FFI 경계·표현·unsafe 책임을 분리하기 | 미착수 | — |

## I. 종합 프로젝트·플랫폼 마무리

| ID | 단원 | 상태 | 기존 단원·검증 근거 |
|---|---|---|---|
| I01 | C 학생 명부 CLI: 파일 저장·복구·실패 처리 | 미착수 | — |
| I02 | Rust 명부 CLI: 같은 명세와 교차 테스트 | 미착수 | — |
| I03 | 로그 분석 도구: 스트림·파싱·오류 보고 | 미착수 | — |
| I04 | 경로 탐색 실험실: 그래프 명세와 검증 | 미착수 | — |
| I05 | C/Rust 종합 프로젝트의 회귀·성능·리팩터링 | 미착수 | — |
| I06 | 통합 PWA 학습·백업·접근성·실기기 인수 검사 | 미착수 | — |

## F03 로컬 Cargo 인수 범위

- F03은 `--include-control-flow`를 명시한 Linux 신뢰 로컬 서버에서만 F01·F02와 함께 실행한다. `--include-f03` 별칭과 F02 플래그 동시 사용은 거부한다.
- 공개 하네스 없이 서버 전용 10사례로 스타터·중단점 포함 오답을 거부하고 수정 답안 10/10을 확인한다. 경고는 실패하며 Cargo는 edition 2021·오프라인·고정 sysroot를 사용한다.
- 학습 화면에서 이론·정적 도식·퀴즈 오답/재시도·코드 수정/재제출·분리 숙달·공유 이력·v1 백업 복원·390px·오프라인 읽기를 검증한다.
- 이 인수는 Linux CI 범위다. macOS·Windows·Android·태블릿 실기기, 공개 코드 실행, 샌드박스 격리를 완료로 뜻하지 않는다.

## v0.x 지원 결정과 다음 실행

- C·자료구조·알고리즘·Rust 모두 v0.x 지원 목표다. 기본 서버는 C 전용이며 F01은 명시적 Linux/macOS 개인 Cargo 서버, F02는 추가 --include-f02, F03은 추가 --include-control-flow 선택으로 채점한다. F02·F03 실제 인수 환경은 Linux다. 다른 Rust 단원과 Windows Rust 실행·Rust 트랙 전체는 미완료다.
- 기반 정리 0~2단계 종료 후 새 단원은 **D → E → Rust(F~G) → C**로 순환한다. 기반 CI 실패·보안·데이터 손실 회귀 수정은 먼저 처리하되 순환 차례를 소비하지 않는다.
- 다음 차례는 **D / D05**: 연결 리스트의 소유권·삽입·삭제·해제다. 해당 단원의 기존 근거와 최근 일지를 읽고 가장 앞선 미완료 인수 조건 하나를 진행한다.
- E 차례는 E01을 확장한다. C 구조체 정렬·이진 탐색 실습은 선수 예제로 연결하되 알고리즘 트랙 완성으로 중복 집계하지 않는다.
- Rust 첫 작업은 cargo test 채점기 설계다. 입력 스키마·스타터·별도 테스트 하네스·종료 상태·출력·실패/재제출 기록·보안 경계를 먼저 명세한다. 설계만으로 실제 Rust 채점 성공을 표시하지 않는다.
- Rust 채점기 구현 전에는 이론·퀴즈만 있는 단원을 허용하되 실습 통과/전체 숙달은 잠근다. 설계 문서만 작성한 경우 차례를 넘기지 않는다. 이론·퀴즈 범위를 실제 전달·검증한 경우는 그 제한을 일지에 명시하고 C 차례로 갈 수 있지만 로드맵 상태는 진행 중으로 유지한다.
- 새 단원은 화면10~15절·원고150줄 이하·채점8~12사례, 1회(최대2회) 안에 검증 가능한 범위로 작성한다. 초과하면 다음 단원으로 나누되 기존 승인 계약을 몰래 줄이지 않는다.
- 각 단원은 개요·필요성·선수·목표, 핵심 이론, 정적 도식, 단계별 예제/실제 출력/이유, 흔한 오류, 점검·요약·퀴즈, 기초/응용/도전·작은 프로젝트, 테스트/수정/재제출/복습 연결을 갖춘다. 표준 세부 해설은 심화로 분리한다.
- 새 단원 선택 시 선수 개념을 확인한다. 전달 범위를 검증한 뒤에만 상태·근거·다음 차례를 함께 갱신한다. 진행 중이면 같은 좁은 범위를 최대2회 안에 마무리한다. 위 Rust 이론·퀴즈 예외 외에는 미완료를 완료로 간주해 순환하지 않는다.

## 갱신·검증 방법

1. 최신 CI와 일지를 확인하고 roadmap.json의 상태·근거·next를 실제 결과로 갱신한다. 기존 분모 변경은 이유와 이동된 ID를 일지에 명시한다.
2. `node scripts/roadmap.mjs --render`의 출력을 ROADMAP.md에 반영한다. 교육 문구를 테스트에 맞추는 작업이 아니라 상태 표의 동기화다.
3. `node scripts/roadmap.mjs --check`와 `npm test`로 계산·미채점 완료 방지·중복 집계·누락 매핑·다음 차례를 검사한다.
4. 결과 SHA의 CI 성공 뒤에만 완료를 기록한다. 이론·퀴즈·실습·복습·숙달의 사용자 상태와 개발 로드맵 상태는 별개다.

## 플랫폼의 최종 인수 조건

- PC·스마트폰·태블릿·PWA에서 이론 → 예제 → 개념 확인 → 코드 작성 → 실제 테스트 → 오류 수정 → 재제출 → 숙달 → 다음 단원이 연결돼야 한다.
- C/Rust 연결 학습과 종합 프로젝트까지 완성하고, 학습자 기록 보존·기존 v1 백업·접근성·실기기 설치·오프라인 복구를 실제 검증한다. CI Chromium 성공을 실기기 성공으로 바꾸어 말하지 않는다.
- AI 멘토 없이 상세한 독자 설명·정적 도식·직접 풀어보는 문제로 배울 수 있어야 한다. 공개 코드 실행 서비스는 이 로드맵의 자동 배포 대상이 아니며 별도 격리 검증과 승인이 필요하다.
