# Rust Cargo 채점 계약 — F01 설계

검토일: 2026-10-16 KST. 상태: **내부 준비와 결과 판정 어댑터**. 운영 Cargo 실행기·API·새 Rust 단원은 아직 없다.
`server/rust-contract.mjs`는 문자열/인수 배열만 반환하며 디렉터리 생성, 파일 쓰기, 프로세스 실행을 하지 않는다.
`executionEnabled: false`는 이 상태를 표시한다. 이를 제거하는 것만으로 실행 허용 조건을 충족하지 않는다.
이번 설계는 F01 착수 근거이지 단원 완료가 아니며 next는 F-G/F01에 남긴다.

`server/rust-preparation.mjs`는 먼저 제출을 검증하고 전용 0700 임시 디렉터리/0600 고정 파일을 만든다.
도구 상태·Cargo JSON 산출물·libtest 목록을 검증하지만 프로세스를 실행하지 않으며 HTTP 경로에 연결하지 않는다.
산출물은 한 개의 성공한 build-finished와 현재 manifest/test profile/codeweave target을 요구하고 target 밖·비일반 파일·심볼릭 링크를 거부한다.
이는 신뢰된 작업 디렉터리의 준비 검사이며 악성 동시 파일 교체나 하드 링크까지 격리하는 경계가 아니다.
신뢰된 합성 Cargo 검사는 CI에서 필수다. 로컬 Cargo/rustc가 없으면 이 1건만 이유를 표시해 skip하고 도구를 자동 설치하지 않는다.
CI는 고정한 Cargo/rustc 버전을 검사한다. 준비 검증과 CI 버전 선택만으로 운영 실행기의 도구 경로 고정·Rust 채점 완료를 주장하지 않는다.

`server/rust-results.mjs`는 별도 사례의 종료/출력 관찰값을 판정하고 전체 결과를 만든다. 프로세스 모듈이나 기본 실행기는 없다.
runRustCases(plan, observe)는 명시적으로 주입한 관찰 함수만 호출한다. 현재 운영 API/등록부에서 호출하지 않는다.
CI의 신뢰된 합성 코드에 한해 실제 사례 본문을 실행한다. 전체 통과·첫 단언 실패 뒤7건 통과·보고 없이 exit0을 구분한다.

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
경고는 기본 실패로 처리한다. 버전별 경고 차이가 있으므로 CI는 아래 검증된 고정 버전을 선택하고 Cargo/rustc가 모두 일치하는지 검사한다.
현재 생성기는 환경 오버라이드만 기술한다. 실행 구현은 부모 환경 전체를 상속하지 않고 검증된 도구 경로와 필요한 시스템 값만 허용한다.
작업 디렉터리는 저장소 밖·부모 .cargo 설정이 없는 경로, 전용 CARGO_HOME/target을 사용해야 한다. 인증/사용자 캐시·RUSTC_WRAPPER·runner 설정은 전달하지 않는다.
Rustup 다운로드나 crates.io 접근, 사용자 toolchain override를 실행 중 활성화하지 않는다. 도구 부재는 운영 오류다.

### 고정 도구체인 선택 (2026-10-17)

`server/rust-preparation.mjs`의 `RUST_TOOLCHAIN_VERSION=1.99.0`이 단일 설정이다. 직전 Linux/macOS CI38945914201에서 실제 빌드·자원·결과 검사를 통과한 릴리스를 선택했으며 이동하는 stable/nightly를 사용하지 않는다. `checkRustToolchain`은 Cargo와 rustc 모두 정확한 stable 릴리스, 성공 종료·무신호·무오류 및 1024바이트 이하 단일 버전 출력을 요구한다. 다른 패치/마이너·혼합 버전·nightly/beta·추가 줄은 운영 오류로 거부한다. 버전 문자열은 도구 진위나 바이너리 해시의 인증이 아니다.
Ubuntu/macOS CI는 제출 실행 전에 이 설정을 읽어 `rustup toolchain install --profile minimal --no-self-update`로 준비하고 해당 버전을 CI runner의 기본값으로 선택한 뒤 실제 두 도구를 검사한다. 준비 실패는 이후 빌드 전에 실패하며 자동 stable 대체나 재시도는 없다. 설치·기본값 변경은 일회용 CI 호스트에서만 수행한다. 내부 준비/채점 함수는 설치·다운로드·설정 변경을 하지 않는다.
새 검사는 버전 일치·다른/혼합 버전·프리릴리스·잘못된/과대 출력·실패 도구를 검증한다. 기존 준비 검사에서 임의의 정상 버전으로 쓰던 1.90.0 fixture는 새 고정 계약의 정상 입력인 1.99.0으로 바꿨다. 기존 도구 실패·산출물·열거·실제 실행 기대값은 유지한다.
구현 `fd5d7acd34c22d0af2aaa339e27aea0cd0e44b14`의 [CI38952261425](https://github.com/cys123431-ship-it/CodeWeave/actions/runs/38952261425)에서 두 OS의 실제 Cargo/rustc 1.99.0 선택, Ubuntu 전체515/515·skip0, macOS Cargo 준비/결과/빌드예산25/25·skip0 및 browser 회귀 성공을 재조회했다. 고정된 CI 환경의 인수 근거이며 운영 도구 경로·호스트/override 검증 완료는 아니다.
후속 운영 실행기는 아래 검증된 경로 선택을 빌드/열거/실행 생명주기에 통합해야 한다. CI 기본값 선택만으로 작업 공간 밖 임의 Rustup override나 악성 도구를 격리했다고 주장하지 않는다. Rust API·실습·숙달은 계속 비활성이다.
명령과 override 우선순위는 [Rustup 도구체인](https://rust-lang.github.io/rustup/concepts/toolchains.html), [기본 사용법](https://rust-lang.github.io/rustup/basics.html), [override](https://rust-lang.github.io/rustup/overrides.html) 원문을 확인했다. 문서 본문은 복제하지 않았다.

### 실제 도구 경로와 호스트 확인 (2026-10-17)

`server/rust-tools.mjs`는 프로세스를 실행하지 않고 sysroot를 canonical 경로로 해석한다. 파일시스템 루트·상대 경로·지원하지 않는 플랫폼/아키텍처를 거부하며 bin 디렉터리와 cargo/rustc 모두 링크가 아닌 일반 실행 파일이어야 한다. 두 도구는 같은 sysroot/bin의 고정 이름만 선택한다. 지원 계약은 Linux GNU x64/arm64와 macOS x64/arm64이며 다른 대상은 실패 처리한다. 경로 검사만으로 바이너리 진위·서명·동시 파일 교체를 방지하지 않는다.
CI 전용 `tests/helpers/rust-tools.mjs`는 제한된 환경과 고정 인수로 rustc sysroot를 발견하고, 선택한 실제 Cargo/rustc의 정확한 1.99.0 버전을 다시 검사한다. 해당 rustc의 -vV 보고는 성공 종료·출력4KiB 이내·단일 host/release가 현재 Node 플랫폼/아키텍처와 일치해야 한다. probe는 각5초/4KiB이며 설치·다운로드·사용자 명령 실행은 없다.
준비/결과 합성 fixture의 Cargo6빌드는 Rustup proxy가 아닌 확인된 절대 Cargo 경로를 호출하고 RUSTC에 같은 sysroot의 실제 rustc를 지정한다. 기존 빌드 자원 예산·15초 제한·경고 실패·정상/ignored/빈 목록·단언 실패/조기 exit 판정은 유지한다. 허용 환경에 신뢰된 RUSTC만 추가하고 RUSTUP_TOOLCHAIN·wrapper·target override·임의 부모 환경은 전달하지 않는다. env/도구 설정은 CI 코드만 제공하며 제출 입력이 아니다.
새 검사는 고정 경로·불가 호스트/루트·링크·파일/실행 권한·host/release 오류·환경 보존을 검사하고 실제 도구 확인은 두 OS CI에서 필수다. F01 공개 예제의 cargo test 전체 호출은 아직 이 경로에 연결하지 않았다. 운영 API·통합 실행기·전체 취소/정리·빌드 실패 분류는 별도 미완료다.
RUSTC와 wrapper 의미 및 sysroot/verbose 옵션은 [Cargo 환경 변수](https://doc.rust-lang.org/cargo/reference/environment-variables.html), [rustc 명령 인수](https://doc.rust-lang.org/rustc/command-line-arguments.html) 원문으로 확인했다. 문서 본문은 복제하지 않았다.

## 4. 테스트 식별과 사례 실행

1. compile 성공 뒤 Cargo JSON compiler-artifact 중 현재 manifest의 integration target codeweave/test profile 실행 파일 **한 개**를 선택한다.
2. 산출물은 전용 target 아래의 실제 일반 파일인지 확인한다. 임의 경로·심볼릭 링크·0개/복수 산출물은 운영 오류다.
3. 해당 바이너리의 `--list --format terse`와 별도 `--list --ignored --format terse`를 모두 성공 종료로 얻는다. 첫 목록은 서버 cases와 정확히 대조하고 ignored 목록은 비어야 한다. 추가/누락/중복/benchmark/ignored는 계약 오류다.
4. 각 ID에 `[case_NN, --exact, --test-threads=1]`를 전달해 별도 프로세스 그룹에서 한 건씩 실행한다. 사용자 코드/인수를 명령에 보간하지 않는다.
5. exit0만 보고 통과시키지 않는다. 한 건 실행·성공 및 열거 일치까지 확인한다. 필터 오타로 0 tests가 된 경우는 실패다.
6. 일반 assert 실패는 다음 독립 사례를 계속 실행한다. 시간/출력/자원 초과·신호 종료·알 수 없는 실행 오류는 그룹을 정리하고 나머지를 미실행으로 채운다.

Cargo JSON은 컴파일/산출물 메시지이지 libtest 사례별 안정 JSON 결과가 아니다. nightly JSON 기능에 의존하지 않는다.
후속 결과 해석기는 고정 도구체인의 libtest 출력·exit·signal·에러를 함께 검사하고 비정상/모호한 결과는 실패 처리한다.
현재 결과 어댑터는 pretty 출력의 running 1 test, 해당 ID의 단일 보고, 단일 합계(1통과 또는1실패·ignored/measured0·나머지 filtered), 일치하는 exit0/101을 함께 요구한다.
0건·중복·다른 ID·추가 보고·조기 exit0·합계 불일치는 치명적 실패다. 시간/출력/신호 오류도 남은 사례를 미실행 처리한다.
단언 실패는 다음 사례를 계속하고 ENOENT/ELIMIT·관찰 함수 예외는 운영 오류로 전파해 제출 실패 이력을 꾸미지 않는다.
컴파일 실패는 Cargo rendered 진단과 stderr/오류를 최대3000자로 보존하며 전체 미실행이다. 성공 응답도 전체 사례 수와 boolean 결과가 없으면 만들지 않는다.
현재 판정기는 그룹 종료·취소·자원 제한을 수행하지 않는다. 실제 실행 관찰 함수에 그 경계를 검증해 넣기 전에는 운영 경로에 연결하지 않는다.
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

### Linux 신뢰 빌드의 시스템 링커 선택 (2026-10-16)

과거 CI는 15초 중단 시 cargo/rustc/cc/collect2의 S 상태와 rust-lld의 D 상태를 기록했다. 이는 관찰이며 디스크·LLD·도구체인 초기화 중 어느 것이 근본 원인인지는 확정하지 않는다.
Rust 1.90부터 x86_64 Linux GNU 대상의 기본 LLD를 끄는 공식 옵션 `-C linker-features=-lld`를 테스트 전용 공통 helper에 적용한다. macOS·다른 아키텍처에는 적용하지 않는다.
Cargo 준비·사례 결과·F01 예시·직접 rustc 자원 fixture가 같은 정책을 사용한다. `-Dwarnings`, 기존15초, 성공/실패 기대값과 실제 검사 본문은 유지한다. CI는 cc/ld 버전과 실제 선택 인수를 기록한다.
운영 계획기의 RUSTFLAGS나 API는 변경하지 않는다. 이 경로의 CI 성공을 기본 LLD의 근본 원인 해결·도구체인 고정·운영 Rust 채점 완료로 확대하지 않는다.
후속 CI38833653960에서도 F01 첫 빌드15007ms/ETIMEDOUT·cargo/rustc S 상태가 재현됐다. 준비/결과6빌드는199~490ms였으므로 LLD opt-out만으로 전체 중단이 해결된 것은 아니다. 다음에는 첫 rustc의 스레드 대기/파일 I/O·초기화 구간을 구분하며 제한 완화·성공 재실행으로 덮지 않는다.
근거: [Rust 공식 1.90 LLD 안내](https://blog.rust-lang.org/2025/09/01/rust-lld-on-1.90.0-stable/), 2026-10-16 확인. 설정 의미만 참고했다.

### 신뢰된 CI 테스트 바이너리의 실행 예산 (2026-10-16)

테스트 전용 `tests/helpers/rust-budget.mjs`가 고정 Bash 스크립트와 argv를 분리하며 PATH/LANG/LC_ALL/TMPDIR만 전달한다. 운영 코드·API에서는 사용하지 않는다.
실행 후보는 CPU2초, 가상 메모리256MiB, 파일2MiB, 사용자 프로세스 Linux128/macOS512, 코어0, 벽시계2초, 합산 출력80KB다. macOS는 공유 영역을 위해 Bash 초기 VSZ에256MiB를 더한 주소 공간 예산이며 RSS 상한이 아니다.
기존의 더 낮은 soft/hard 한도를 높이지 않고 설정 실패 시 바이너리 실행 전125로 멈춘다. 사용자별 프로세스 한도는 제출별 격리가 아니며 root에서는 집행되지 않을 수 있다.
CI는 실제 Rust의 getrlimit·그룹 ID·384MiB 예약 거부·4MiB 파일/SIGXFSZ·CPU 소진·정상/시간 초과 뒤 fork 자식 정리를 Linux/macOS에서 검증한다. 기존 Cargo 결과 fixture의 정상/단언 실패/조기 exit도 제한된 실행기를 거친다.
운영 Cargo 빌드 실행기와 도구체인 고정은 여전히 미완료다. 아래 CI 빌드 예산 실험과 이 실행 예산 검증은 기존 C 한도를 변경하지 않고 Rust API/실습/숙달을 활성화하지 않는다. Windows Rust 실행은 지원하지 않는다.

### 신뢰된 CI Cargo 빌드 예산 (2026-10-17)

`tests/helpers/rust-build-budget.mjs`를 준비/결과 합성 fixture의 `cargo test --no-run`에 적용한다. 별도 운영 실행기나 HTTP 라우트가 아니며 실제 Cargo 도구 경로는 신뢰된 PATH에서 선택한 절대 경로다. 고정 Bash 스크립트와 argv를 분리하고 셸 문자를 보간하지 않는다.
CPU는 프로세스별10초, 가상 메모리1GiB, 파일32MiB, 사용자 프로세스 Linux128/macOS512, 코어0을 설정한다. Cargo와 자식 rustc/링커가 한도를 상속하지만 CPU/메모리는 그룹 전체 합산 예산이 아니고 사용자 프로세스 한도는 제출별 격리가 아니다. root 등 권한 예외도 남는다. macOS의 주소 공간 한도는 시작 Bash VSZ+1GiB이며 RSS1GiB 보장이 아니다.
기존 더 낮은 soft/hard 한도는 올리지 않는다. 설정 실패125에서는 도구를 실행하지 않는다. 기존 observeProcess의 detached 그룹 정리·벽시계15초·합산 출력80KB·실패 관찰은 그대로 사용하며 재시도하지 않는다. CPU/가상메모리/파일/프로세스 제한은 파일·네트워크 격리가 아니다.
환경은 PATH/HOME/LANG/LC_ALL/TMPDIR/RUSTUP_HOME, 전용 CARGO_HOME/CARGO_TARGET_DIR와 명시한 Rust 경고·오프라인·출력 설정만 전달한다. 부모 환경 전체·RUSTC_WRAPPER·BASH_ENV·SHELLOPTS·POSIXLY_CORRECT·임의 기밀값은 전달하지 않는다. 이 helper의 env/도구 인수는 서버가 검증한 입력이 아니라 신뢰된 CI 코드만 제공하므로 운영 사용자 입력에 재사용하지 않는다.
신규 Node/GCC 검사는 인수 문자 보존·설정 실패 전 실행 방지·실제 rlimit·프로세스 그룹·2GiB 예약 실패·32MiB 파일 한도·더 낮은 상속 한도를 검사한다. 새 테스트 기대값은 유지한다. 실제 Cargo 준비3빌드와 결과3빌드는 Ubuntu/macOS에서 필수이며 새 임시 작업 공간을 쓰고 정상/ignored/빈 목록·단언 실패/조기 exit 판정을 그대로 검사한다.
구현 `5eded9deb2db5007473bf30c3db06828634d0bf5`의 [CI38945563049](https://github.com/cys123431-ship-it/CodeWeave/actions/runs/38945563049)는 Ubuntu 전체510/510·skip0, macOS 준비/결과/빌드예산25/25·skip0, browser 회귀를 통과했다. 새 예산을 적용한 실제 Cargo6빌드는 Linux212~353ms·macOS187~339ms였다. 이 기록은 신뢰된 CI fixture의 해당 경로 검증이며 운영 Rust API·전체 빌드 실패 분류·도구체인 고정까지 완료했다는 뜻이 아니다.
F01 공개 예제의 `cargo test` 전체 호출은 이번 helper 대상이 아니다. 다음에는 고정 도구체인·빌드/열거/실행 연결과 취소/정리 실패, 실제 문법·경고/빌드 자원 초과 경로를 검증한 뒤에만 운영 Rust 연결을 검토한다. F01은 진행 중이며 차례를 C로 넘기지 않는다.
한도 단위와 soft/hard 의미는 [GNU Bash 공식 ulimit 문서](https://www.gnu.org/software/bash/manual/html_node/Bash-Builtins.html#index-ulimit)를 2026-10-17에 확인했다. POSIX 모드에서는 파일 블록 단위가 달라지므로 해당 환경 변수를 상속하지 않는다. 기존 자원 runner와의 의미 일관성을 확인한 독립 구현이며 문서 본문은 복제하지 않았다.

1. 준비 어댑터와 합성 fixture의 파일 생성/도구 상태/JSON 산출물/열거 검사를 추가했다. 실제 Cargo 확인은 결과 SHA의 필수 CI 근거로 판단하며 UI/API는 계속 잠근다.
2. 실제 Cargo 합성 코드의 정상/틀린 assert/보고 없는 조기 exit와 순수 관찰값의 컴파일 진단/치명적 중단/v1 호환 검사를 추가했다. 실제 문법/경고/시간/메모리/자식 정리는 후속 실측·회귀가 남아 있다.
3. 승인된 신뢰 로컬 실행 경계가 검증되면 별도 Rust 어댑터와 API 라우팅/결과/v1 저장 호환을 연결한다.
4. F01은 그보다 좁은 이론/퀴즈 단원으로 먼저 전달할 수 있으나 로드맵 진행 중과 실습 잠금을 유지한다. 실제 전달/검증 전에는 차례를 넘기지 않는다.
5. 새 단원 분량10~15절·원고150줄·8~12사례·최대2회 규칙을 적용한다. 이 설계는 단원 제작 회수로 집계하지 않는다.

## 8. 확인한 공식 근거

### F01 이론·퀴즈 범위 인수와 차례 전환 (2026-10-16)

검증 SHA `d92dd760fcdcae96f11a8f0f14e42df59e2bff5c`의 [CI38843874384](https://github.com/cys123431-ship-it/CodeWeave/actions/runs/38843874384)는 실제 Cargo 공개 예시10건의 정상/오답/수정, 브라우저 퀴즈 재시도·이론 표시·두 Rust 초안 보존·390px 오프라인·다음 단원 이동을 통과했다. 전체459/459·skip0, macOS/browser 모두 성공한 로그를 실제 재조회했다.
로드맵의 선택적 `theoryDelivery`는 이 제한 범위를 SHA·CI·확인 항목5개로 기록한다. `recordTheoryDelivery`는 선택된 Rust 차례만 C의 첫 미완료 단원으로 넘기고 기존 완료 수·F01 진행 중·실습/숙달 잠금을 보존한다. 같은 기록을 재사용해 다음 Rust 차례를 다시 건너뛰는 것은 거부한다. URL/SHA/항목 구조 검사 자체는 원격 CI 성공의 증명이 아니므로 호출 전 실제 로그 확인이 필수다.
다음 차례는 C05 파일 입출력이다. F01의 사이트 Rust 채점 API·실습·전체 숙달, 도구체인 고정·Cargo 빌드 자원 한도는 여전히 미완료이며 다음 Rust 차례에서 이어간다. 개발 로드맵 기록은 학습자의 v1 진도·초안·제출 데이터를 바꾸지 않는다.

### 신뢰된 CI 빌드 관찰 (2026-10-16)

- 테스트 전용 observeProcess는 Cargo 빌드의 단계·경과 시간·종료 코드/신호·제한된 출력을 보존한다. 기존 15초 제한·성공 기대값·필수 CI 실행은 유지하고 자동 재시도하지 않는다.
- POSIX에서 별도 그룹을 만들고 시간/출력 초과뿐 아니라 정상 부모 종료 뒤에도 남은 그룹을 정리한다. 이는 CPU/메모리/파일/네트워크 격리나 운영 Rust 실행기 구현이 아니다.
- Linux에서는 제한 시간의 50%·85%에 자식 PID/부모/그룹/상태/명령 이름 최대32개를 관찰한다. 그중 최대6개 프로세스에서 스레드 최대16개의 이름·상태·wchan·CPU 누적 tick, VmRSS/VmSize와 누적 rchar/read_bytes/write_bytes를 읽는다. 두 표본의 차이로 진행 여부를 살피되 비원자적 관찰·누락 스레드가 있으므로 원인을 단정하지 않는다.
- 인수·환경·파일 내용·fd·maps는 수집하지 않는다. /proc와 Node의 PID 공간 불일치, 권한 부족·종료 경쟁은 관찰 불가로 명시하며 0으로 대체하지 않는다. 기존 빌드 제한과 판정은 바꾸지 않는다.
- 정상·비정상·도구 부재·강제 중단·출력 초과·부모 종료 후 자식 정리는 Node 합성 프로세스로 검사한다. 실제 Cargo 6개 빌드 단계의 시간은 CI에서 확인한다. 반복된 과거 중단의 근본 원인은 아직 확정하지 않았다.
- CI38838684764에서는 F01-project15007ms·prepare-normal15010ms 중단을 포착했다. F01 rustc 작업 스레드는 7505/12756ms 모두 D·folio_wait_bit_common, read_bytes16584704→36069376·system tick1→3이었다. 준비 빌드도 rustc의 같은 대기 뒤 시스템 ld가 D·같은 대기로 관찰됐다. 파일 페이지 대기와 일치하지만 저장장치·이미지·도구체인 중 원인은 확정하지 않는다. 결과3빌드214~477ms는 성공했다. LLD만의 문제·CPU 연산 소진·완전한 무진행으로 단정할 근거가 없다.

### 신뢰된 Linux CI 도구 파일 준비 실험 (2026-10-16)

`scripts/prepare-rust-inputs.mjs`를 Ubuntu CI의 도구 확인 뒤, 전체 검사 전에 한 번 실행한다. rustc의 `--print sysroot`/`--print target-libdir`로 선택된 설치본의 bin/rustc·lib 공유 라이브러리·현재 대상의 rlib/so/o만 1MiB 버퍼로 순차 읽는다. 파일/바이트/시간을 출력해 콜드 파일 페이지 대기 가설을 비교하며, 빌드·테스트 실행·재시도·산출물 캐시는 하지 않는다.
파일256개·합계1GiB·60초 제한이며 CLI 전체에도 별도60초 종료 타이머를 둔다. 각 경로는 실제 sysroot 안의 일반 파일이어야 하고 외부 링크·예산 초과·읽기 실패는 준비 단계 실패로 처리한다. 같은 실경로의 라이브러리 별칭은 한 번만 읽고 파일을 수정하지 않는다. 제한은 검사 준비용이지 제출 실행 예산이 아니다.
모든 실제 Cargo 검사는 새 작업 공간에서 계속 빌드하며 기존15초·필수 Rust CI·경고 오류·정상/오답/수정 판정을 유지한다. 준비 성공 자체는 컴파일 성공이 아니다. 전체 CI와 반복 중단의 재현 여부로 효과를 판단하고, 성공하더라도 호스트 저장장치의 근본 원인·도구체인 고정·운영 Rust 실행 검증을 완료 처리하지 않는다.
구현9518dd0의 CI38843603660에서 준비32파일406487746바이트/6396ms, Cargo 준비3빌드150~227ms·결과3빌드164~174ms, F01 정상/오답/수정 전체4038ms를 관찰했다. 전체459/459·skip0 및 macOS/browser가 성공했다. 읽기 준비를 적용한 완화 경로의 검증이며, 단일 성공을 호스트 지연 원인의 확정이나 운영 빌드 예산 검증으로 일반화하지 않는다.

2026-10-16 KST에 다음 Cargo 원문을 확인했다. 설정/명령 의미만 참조하고 본문·교육 문제는 복제하지 않았다.
- [cargo test](https://doc.rust-lang.org/cargo/commands/cargo-test.html): no-run·target 선택·frozen·libtest 인수.
- [Cargo targets](https://doc.rust-lang.org/cargo/reference/cargo-targets.html): integration test·자동 탐색·doctest.
- [Build scripts](https://doc.rust-lang.org/cargo/reference/build-scripts.html): 빌드 중 호스트 실행과 build 비활성.
- [External tools](https://doc.rust-lang.org/cargo/reference/external-tools.html): 컴파일 진단·compiler-artifact JSON.
- [rustc tests](https://doc.rust-lang.org/rustc/tests/index.html): list는 사례를 실행하지 않으며 ignored 필터는 별도 선택이다. 일반 목록만으로 ignored 여부를 추정하지 않는다.
