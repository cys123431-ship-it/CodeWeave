# Rust Cargo 채점 계약 — F01 설계

검토일: 2026-10-16 KST. 상태: **설계와 순수 계획 생성기만 검증**. Cargo 실행기·API·새 Rust 단원은 아직 없다.
`server/rust-contract.mjs`는 문자열/인수 배열만 반환하며 디렉터리 생성, 파일 쓰기, 프로세스 실행을 하지 않는다.
`executionEnabled: false`는 이 상태를 표시한다. 이를 제거하는 것만으로 실행 허용 조건을 충족하지 않는다.
이번 설계는 F01 착수 근거이지 단원 완료가 아니며 next는 F-G/F01에 남긴다.

## 1. 기존 C 함수형 경로와의 대응

| C 현재 경계 | Rust 후속 구현 계약 |
|---|---|
| parseRequest + 등록 ID | JSON의 exerciseId/code만 검증, Rust 전용 등록 정의 선택 |
| submission.c + harness.c | src/lib.rs + 서버의 tests/codeweave.rs |
| 고정 GCC 옵션 | 고정 Cargo.toml/Cargo.lock 및 Cargo 인수 |
| 컴파일 → 사례별 함수 실행 | cargo test --no-run → 대상 열거 → 사례별 테스트 실행 |
| 전체 사례 수·미실행·진단 | 같은 결과 형태로 환산, Rust 진단은 별도 분류 |
| 실제 결과 → iteration v1 | 검증된 응답만 기존 code 문자열/최근10건/v1 백업에 기록 |

기존 C normalize/compile/runCases에 Rust 분기를 섞지 않는다. 첫 구현은 별도 어댑터로 준비한다.
현재 gradingExercises에 cargo-test나 rust-mut을 등록하지 않고 src/exercises.js의 grader:null을 보존한다.

## 2. 입력과 서버 전용 정의

- 예정 제출 JSON: `{ "exerciseId": "서버에 등록된 ID", "code": "단일 Rust 라이브러리 소스" }`.
- code는 공백만인 제출을 거부하고 기존 MAX_CODE_LENGTH=25,000 UTF-16 코드 단위를 유지한다. 한글도 같은 문자 계약이다.
- 실제 HTTP 통합 때 기존 본문 제한(25,000×4+4096 바이트), JSON/Host/Origin/토큰 방어를 먼저 통과시킨다.
- 추가 필드는 거부한다. 파일 배열·파일명·Cargo.toml·build.rs·.cargo/config·환경·커맨드·예상 결과는 입력받지 않는다.
- 신뢰된 정의 Map은 id, language:rust, grader:cargo-test, starter, harness, cases를 갖는다. 브라우저가 이 Map을 보내지 않는다.
- cases는 고유 case_NN ID와 설명을 가진 8~12건이다. 각 ID는 하네스의 루트 #[test] 함수 한 개와 대응해야 한다.
- 현재 계획기는 ID/개수만 검사한다. 하네스가 실제 해당 테스트를 정의하는지는 후속 Cargo 열거 검사의 필수 조건이다.
- 공개 메타데이터는 함수 원형·입력/반환 계약·스타터·공개 예시만 제공한다. 하네스·정답·비공개 사례는 정적 허용 목록 밖에 둔다.
- 검사의 fixture는 합성 문자열일 뿐 새 교육 문제나 검증된 Rust 프로그램이 아니다.

## 3. 고정 패키지와 빌드

새 전용 작업 디렉터리에 계획기의 네 파일만 생성한다. 제출 code는 변형 없이 src/lib.rs에만 쓴다.
Cargo.toml은 codeweave_submission 0.0.0, edition2021, 의존성 없음, build=false, 자동 bin/example/test/bench 탐색 비활성이다.
lib의 unit test/doctest를 끄고 [[test]] codeweave 하나를 명시한다. [workspace]로 외부 workspace 편입을 막는다.
서버가 같은 dependency-free 패키지의 Cargo.lock을 제공한다. 락 누락/불일치에서 자동 생성·온라인 재시도로 성공시키지 않는다.

계획된 컴파일 인수 배열(셸 문자열을 만들지 않는다):
`cargo test --manifest-path Cargo.toml --frozen --test codeweave --no-run --message-format=json --jobs 1 --color never`

`--frozen`은 locked+offline이다. Cargo만 네트워크를 사용하지 않는다는 뜻이며 제출 프로그램의 네트워크 격리가 아니다.
기본 환경 오버라이드는 RUSTFLAGS=-Dwarnings, CARGO_NET_OFFLINE=true, CARGO_INCREMENTAL=0, CARGO_TERM_COLOR=never, RUST_BACKTRACE=0이다.
경고는 기본 실패로 처리한다. 버전별 경고 차이가 있으므로 후속 CI에서 cargo/rustc 버전을 기록하고 검증된 도구체인을 고정한다.
현재 생성기는 환경 오버라이드만 기술한다. 실행 구현은 부모 환경 전체를 상속하지 않고 검증된 도구 경로와 필요한 시스템 값만 허용한다.
작업 디렉터리는 저장소 밖·부모 .cargo 설정이 없는 경로, 전용 CARGO_HOME/target을 사용해야 한다. 인증/사용자 캐시·RUSTC_WRAPPER·runner 설정은 전달하지 않는다.
Rustup 다운로드나 crates.io 접근, 사용자 toolchain override를 실행 중 활성화하지 않는다. 도구 부재는 운영 오류다.

## 4. 테스트 식별과 사례 실행

1. compile 성공 뒤 Cargo JSON compiler-artifact 중 현재 manifest의 integration target codeweave/test profile 실행 파일 **한 개**를 선택한다.
2. 산출물은 전용 target 아래의 실제 일반 파일인지 확인한다. 임의 경로·심볼릭 링크·0개/복수 산출물은 운영 오류다.
3. 해당 바이너리의 `--list --format terse`로 실제 목록을 얻고 서버 cases와 정확히 대조한다. 추가/누락/중복/ignored 테스트는 계약 오류다.
4. 각 ID에 `[case_NN, --exact, --test-threads=1]`를 전달해 별도 프로세스 그룹에서 한 건씩 실행한다. 사용자 코드/인수를 명령에 보간하지 않는다.
5. exit0만 보고 통과시키지 않는다. 한 건 실행·성공 및 열거 일치까지 확인한다. 필터 오타로 0 tests가 된 경우는 실패다.
6. 일반 assert 실패는 다음 독립 사례를 계속 실행한다. 시간/출력/자원 초과·신호 종료·알 수 없는 실행 오류는 그룹을 정리하고 나머지를 미실행으로 채운다.

Cargo JSON은 컴파일/산출물 메시지이지 libtest 사례별 안정 JSON 결과가 아니다. nightly JSON 기능에 의존하지 않는다.
후속 결과 해석기는 고정 도구체인의 libtest 출력·exit·signal·에러를 함께 검사하고 비정상/모호한 결과는 실패 처리한다.
소스가 출력/exit를 위조하거나 파일·하네스에 접근할 수 있으므로 이 방법은 악성 제출의 진위 증명이 아니다. 개인 신뢰 코드 범위를 유지한다.

## 5. 결과·실패·재제출

| 사건 | HTTP/기록 계약 | tests와 상태 |
|---|---|---|
| JSON/ID/길이 오류 | 기존4xx, iteration 생성 안 함 | 컴파일/실행 전 거부 |
| Cargo 부재·서버 계약/산출물 오류 | 운영5xx, iteration 생성 안 함 | 성공으로 대체하지 않음 |
| 타입/문법/경고·빌드 한도 초과 | 유효한 채점 응답, 실패 iteration | 전체 사례 미실행·0/전체 |
| assert 실패 | 유효한 실패 응답, 코드·진단 보존 | 실패한 해당 사례, 독립 사례 계속 |
| 시간/자원/신호/출력 한도 초과 | 유효한 실패 응답 | 현재 실패, 뒤 사례 미실행 |
| 모든 선언 사례 실제 통과 | ok:true 응답 | 통과 수/전체 사례 수 |
| 통신/응답 파싱 오류 | iteration 생성 안 함 | 초안 보존·재시도 가능 |

응답은 ok/message/compileOutput/tests[{passed,detail}]을 유지한다. 항상 tests.length=선언 사례 수다.
컴파일 진단은 Cargo JSON message.rendered와 stderr를 제한 길이로 합치되 원문 의미를 보존한다. HTML로 삽입하지 않는다.
Rust 오류 코드/경고/운영 오류는 C compilerFeedback 분류에 억지 매핑하지 않는다. 선택 필드 확장 시 이전 v1 호환 검사를 먼저 작성한다.
재제출은 이전 시도 삭제 없이 새 iteration을 앞에 추가한다. 최신 실패에서 과거 성공은 남기되 숙달을 보류한다.
grader가 null인 동안 Rust 이론/퀴즈가 통과해도 practiceAvailable/practicePassed/mastered를 올리지 않는다.

## 6. 자원과 보안 인수 조건 — 아직 적용되지 않은 설계

- 빌드와 실행 모두 그룹 단위 종료·정리, CPU·가상 메모리·파일 크기·프로세스 수·벽시계·출력 제한이 필요하다. Cargo 자식 rustc/링커도 포함한다.
- 기존 runSubmission의 C 한도를 그대로 복사하지 않는다. Cargo 빌드와 테스트 바이너리를 분리해 Linux/macOS에서 실측한 상한을 확정한다.
- 초기 측정 후보는 빌드15초/1GiB·실행2초/256MiB·출력80KB다. 후보값은 보장/적용값이 아니며 프로세스·CPU·파일 한도는 기존 runner와 함께 별도 확정한다.
- 강제 종료·자식 생존·큰 할당·출력 폭주·컴파일 실패·정상 반환·Cargo 부재를 실제 도구로 재현한 뒤에만 로컬 실행을 고려한다.
- Rust 빌드 시 매크로·include/env 등의 호스트 파일 읽기가 가능하다. 의존성/빌드 스크립트 차단이나 안전 Rust만으로 파일·네트워크 격리가 되지 않는다.
- Windows는 POSIX 그룹/ulimit을 적용했다고 주장하지 않는다. 검증된 별도 정책 전까지 Rust 실행을 비활성으로 둔다.
- 임시 디렉터리 권한/정리 실패, 병렬 제출 한도와 중단 시 취소도 검증한다. 비밀 환경값을 로그·Cargo 진단에 노출하지 않는다.
- 공개 실행은 비루트·프로세스/파일/네트워크 격리·결과 위변조 대응을 별도 검증/승인해야 하며 이 설계의 자동 후속 배포 대상이 아니다.

## 7. 다음 구현 순서와 완료 문턱

1. 이 계획기의 합성 fixture로 파일 생성/도구 탐지/JSON 산출물/열거 검사를 테스트 주도 구현. UI/API는 아직 잠근다.
2. 실제 Cargo로 정상·틀린 assert·문법·경고·0건·ignored·가짜 출력·시간/메모리/자식 정리 회귀를 실행한다.
3. 승인된 신뢰 로컬 실행 경계가 검증되면 별도 Rust 어댑터와 API 라우팅/결과/v1 저장 호환을 연결한다.
4. F01은 그보다 좁은 이론/퀴즈 단원으로 먼저 전달할 수 있으나 로드맵 진행 중과 실습 잠금을 유지한다. 실제 전달/검증 전에는 차례를 넘기지 않는다.
5. 새 단원 분량10~15절·원고150줄·8~12사례·최대2회 규칙을 적용한다. 이 설계는 단원 제작 회수로 집계하지 않는다.

## 8. 확인한 공식 근거

2026-10-16 KST에 다음 Cargo 원문을 확인했다. 설정/명령 의미만 참조하고 본문·교육 문제는 복제하지 않았다.
- [cargo test](https://doc.rust-lang.org/cargo/commands/cargo-test.html): no-run·target 선택·frozen·libtest 인수.
- [Cargo targets](https://doc.rust-lang.org/cargo/reference/cargo-targets.html): integration test·자동 탐색·doctest.
- [Build scripts](https://doc.rust-lang.org/cargo/reference/build-scripts.html): 빌드 중 호스트 실행과 build 비활성.
- [External tools](https://doc.rust-lang.org/cargo/reference/external-tools.html): 컴파일 진단·compiler-artifact JSON.
