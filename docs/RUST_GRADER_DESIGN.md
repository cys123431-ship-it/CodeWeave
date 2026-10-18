# Rust Cargo 채점 계약 — F01 설계

검토일: 2026-10-16 KST. 상태: **내부 준비와 결과 판정 어댑터**. 운영 Cargo 실행기·API·새 Rust 단원은 아직 없다.
2026-10-18 추가: 내부 단계 생명주기 연결과 CI 전용 관찰 함수를 구현했다. 이는 운영 실행기/API 활성화가 아니다.
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
구현 `c069624bb820c5c86255f1f1dd2948a6db203668`의 [CI38959868646](https://github.com/cys123431-ship-it/CodeWeave/actions/runs/38959868646)를 2026-10-18 KST에 실제 재조회했다. Ubuntu 전체522/522·skip0, macOS 경로/준비/결과/빌드예산32/32·skip0 및 browser 회귀가 성공했다. Linux는 `1.99.0-x86_64-unknown-linux-gnu/bin`, macOS는 `1.99.0-aarch64-apple-darwin/bin`의 실제 cargo/rustc와 해당 host를 기록했다. Cargo6빌드는 Linux188~212ms·macOS226~462ms였으며 정상·ignored/빈 목록 거부·단언 실패/조기 exit 결과 기대값을 유지했다. Windows·Linux arm64·macOS x64 실행은 이 CI의 검증 대상이 아니다.
RUSTC와 wrapper 의미 및 sysroot/verbose 옵션은 [Cargo 환경 변수](https://doc.rust-lang.org/cargo/reference/environment-variables.html), [rustc 명령 인수](https://doc.rust-lang.org/rustc/command-line-arguments.html) 원문으로 확인했다. 문서 본문은 복제하지 않았다.

### 내부 통합 생명주기 (2026-10-18)

`server/rust-pipeline.mjs`의 `gradeRustInternal(request, definitions, {observe,parent,signal})`은 관찰 함수가 없으면 실패한다. 기본 호스트 실행기·child_process·HTTP 등록은 없으며 기존 정의/계획의 executionEnabled:false도 유지한다. 요청 검증과 사전 취소를 통과한 뒤에만 전용 작업 공간을 생성한다.
단계는 compile→현재 manifest의 단일 산출물 검증→list→list-ignored→독립 사례별 case→전체 결과다. 첫 열거 실패/불일치는 추가 열거 전 중단한다. 성공한 일반 목록만으로 ignored 검사를 생략하지 않는다. 컴파일 실패는 진단·전체 미실행을 반환하고, 단언 실패는 계속하며 치명적 사례 실패는 남은 사례를 미실행으로 채운다. 잘못된 관찰 응답·산출물/목록 불일치·관찰 함수 예외·ENOENT/ELIMIT는 운영 오류로 전파한다.
finally에서 이 호출이 생성한 정확한 디렉터리만 정리한다. 관찰 함수가 정리 경로를 지정할 수 없고 부모의 다른 파일은 보존한다. 정리 실패는 성공 결과로 숨기지 않으며 앞선 오류와 함께 발생하면 AggregateError로 보존한다. pipeline 자체는 단계 전후 취소를 검사하며, 실행 중 중단은 관찰 함수가 signal을 실제 프로세스에 연결해야 한다. 아래 CI 전용 관찰자는 이 연결을 제공하지만 다른 관찰 함수까지 자동으로 중단하는 것은 아니다.
`tests/helpers/rust-pipeline.mjs`는 신뢰된 CI 코드만 실행한다. 검증한 실제 Cargo/rustc·명시 RUSTC·전용 Cargo home/target·기존 빌드/실행 자원 예산과 detached 그룹 관찰을 사용한다. 제한 설정125/프로세스 정리 오류는 CI 운영 오류로 전파한다. 이 코드/오류 구분은 임의 악성 제출용 운영 실행 계약이 아니며 파일·네트워크 격리도 아니다.
신규 합성 검사는 단계 순서·실패 중단·전체 분모·남의 파일 보존·예외/경계 취소 뒤 디렉터리 정리를 확인한다. 실제 CI는 정상·오답·문법 오류·경고 제출4개를 각각 새 공간에서 빌드하고 결과와 공간 삭제를 검사한다. 정리 실패 주입·빌드 자원 초과 통합·UI/API/기록 연결은 후속 인수 조건이다. F01 단원 상태·순환 차례·실습/숙달 잠금은 바꾸지 않는다.
구현 `f44965c788f584b5a9e35dcffdda4a5f74e0e090`의 [CI39073420849](https://github.com/cys123431-ship-it/CodeWeave/actions/runs/39073420849)에서 Ubuntu 전체531/531·skip0, macOS 신규9/9·skip0 및 browser 회귀를 확인했다. 두 OS 모두 고정 실제 도구와 기존 빌드/실행 예산을 사용해4제출 판정·전체 사례 수·작업 공간 삭제를 통과했다. 단원 전체 완료·운영 실행기 인수나 즉시 취소 검증의 근거로 확대하지 않는다.

### 빌드 실패 분류 (2026-10-18)

buildRustResult는 기존 ok/message/compileOutput/tests 형식을 유지한다. 관찰 오류 ETIMEDOUT·ENOBUFS는 각각 빌드 시간/출력 제한, 직접 관찰된 SIGXCPU·SIGXFSZ는 CPU/파일 제한으로 표시한다. SIGKILL·SIGABRT 등은 비정상 종료일 뿐 메모리 부족으로 단정하지 않는다. Cargo101과 진단 문자열만으로 하위 rustc의 자원 초과를 구조화된 한도 판정으로 승격하지 않는다.
ENOENT/EACCES/ELIMIT/ECLEANUP/EIO 등 그 밖의 관찰 오류는 운영 예외로 전파해 제출 오답 결과를 만들지 않는다. 원래 code/cause를 보존하고 코드 없는 관찰 오류는 ERUSTBUILD, 고정 제한 래퍼의 예약 종료125는 ELIMIT이다. ABORT_ERR는 AbortError로 전파한다. 모든 정상 반환 빌드 실패의 tests는 전체 선언 사례 수를 유지하고 전부 미실행이다. 실패 분류에 Cargo 진단 텍스트를 신뢰하지 않는다.
신규 검사는 분류·위장 진단·운영 오류와 실제 Node 시간/출력 초과의 내부 pipeline 중단/정리를 확인한다. 실제 Cargo CI fixture는 정상 15초/기존 자원 예산에 더 낮은 상속 파일 한도1KiB를 적용해 빌드 실패·목록/사례 미실행·소유 공간 삭제를 확인한다. 신뢰된 독립 fixture이며 운영 실행기나 실제 Cargo CPU/메모리 초과 검증을 뜻하지 않는다. Rust 실습/숙달과 HTTP 연결은 계속 비활성이다.
검증 SHA `7d495e41538a241e426a4b86947e5a6a0d4ee0fb`의 [CI39085330936](https://github.com/cys123431-ship-it/CodeWeave/actions/runs/39085330936)에서 Ubuntu 전체551/551·skip0, macOS 관련29/29·skip0, browser 회귀 성공을 실제 확인했다. 양 OS 모두 제한된 실제 Cargo가 status:null/signal:SIGXFSZ로 종료했고, 전체8사례 미실행과 소유 공간 삭제가 통과했다. 분류/시간·출력 초과·운영 오류 검증이며 Cargo CPU/메모리 제한의 원인별 확정이나 운영 API 인수로 확대하지 않는다.

### 실제 Cargo CPU 초과 fixture (2026-10-18)

신뢰된 테스트용 rustBuildBudget의 cpuSoftSeconds는 정수1~10만 받는다. 기본값10·hard 상한10·기존 더 낮은 상속 한도·15초 벽시계·80KB 출력·메모리/파일/프로세스 예산은 유지한다. 기존 한도를 적용한 뒤 soft만 요청값 이하로 낮추며 더 낮은 상속 soft/hard는 올리지 않는다. 새 옵션은 테스트 코드 전용이며 서버/API에서 입력받지 않는다.
실제 Cargo fixture는 long_running_const_eval만 명시적으로 허용한 독립 상수 루프를 컴파일하며 soft CPU1초를 상속한다. 정상 소스 오류·벽시계·출력 초과로 대신 통과하지 않고 Cargo 또는 rustc의 SIGXCPU/CPU time limit exceeded를 요구한다. Cargo101의 자식 신호 진단은 fixture 원인 확인에만 쓰고 운영 판정은 여전히 컴파일 실패다. 관찰 프로세스 자체의 SIGXCPU만 빌드 CPU 제한 초과로 표시한다.
검증한 Linux/macOS Cargo는 자식 종료를 이름 없이(signal:24)로 출력한다. fixture는 현재 OS의 SIGXCPU 번호·Cargo101·마지막 괄호 종료 형식을 함께 확인한다. 임의 본문에 포함된 SIGXCPU 문자열은 근거로 삼지 않으며 이 진단 해석은 고정 CI fixture 밖 운영 결과 판정에는 적용하지 않는다.
내부 pipeline이 compile 다음 열거/사례를 실행하지 않고 전체8사례 미실행을 반환하며, 소유 공간만 정리하고 부모 사용자 파일을 보존하는지 확인한다. 실제 Cargo 메모리 초과·그룹 합산 CPU·악성 제출 격리·운영 Rust 활성화 검증으로 확대하지 않는다.
검증 SHA `f0cf182cb5e5b49080b4cf4d2a028dfd870be81c`의 [CI39089131992](https://github.com/cys123431-ship-it/CodeWeave/actions/runs/39089131992)는 Ubuntu 전체554/554·skip0, macOS 관련30/30·skip0, browser 회귀를 통과했다. 실제 Cargo101/자식 rustc 신호24가 Linux1223ms·macOS1177ms에 관찰됐고, 열거 차단·전체 미실행·공간 정리·부모 파일 보존이 통과했다. 최초 CI39089018430의 양 OS 이름 전용 검사 실패를 보존하고, OS 숫자 신호 형식 보완 이유를 일지에 기록했다.

### 실제 Cargo 메모리 초과 fixture (2026-10-18)

tests/fixtures/rust-build-memory.rs는 상수 평가 중 2GiB 반복 배열을 요청하는 독립 음성 fixture다. 런타임 실행이나 새 교육 문제가 아니다. tests/rust-cargo-memory.test.mjs는 기존 trustedRustObserver와 기본 빌드 예산을 그대로 사용하며 한도/벽시계/출력 예산을 올리거나 도구를 바꾸지 않는다.
실제 Cargo101과 compiler JSON rendered 또는 stderr의 구체적인 할당 실패 진단을 요구하고, 도구 부재·제한 설정 실패·벽시계/출력 초과를 메모리 검증으로 대신하지 않는다. 작은64KiB 배열 대조군은 같은 식/예산에서 실제 컴파일과8사례를 통과해야 한다. 큰2GiB 배열은 E0080 tried to allocate more memory than available to compiler 등 구체적 원인을 확인한다. 일반 E0080만으로 메모리 실패로 인정하지 않는다. 관찰 진단은 고정 fixture 원인 확인용이며 운영 결과는 컴파일 실패로 유지한다. OS 주소 공간 한도만이 유일한 원인이라고 단정하거나 SIGKILL/임의 제출 진단을 권위 있는 메모리 초과 판정으로 바꾸지 않는다.
열거/사례 미실행·전체8사례 보존·소유 작업 공간 정리·부모 사용자 파일 보존을 검사한다. Linux 주소 공간1GiB와 macOS 시작 Bash VSZ+1GiB는 기존 정책이며 RSS/그룹 합산 메모리 보장이 아니다. CI의 실제 결과를 확인하기 전에는 이 fixture가 메모리 초과 경로를 검증했다고 기록하지 않는다. 운영 실행기/API·실습/숙달 활성화는 별도 인수 대상이다.
검증 SHA `f877ee8dbd0224ee1c9c69ac121c82584b4c458f`의 [CI39092312409](https://github.com/cys123431-ship-it/CodeWeave/actions/runs/39092312409)는 Ubuntu 전체556/556·skip0, macOS 관련32/32·skip0, browser 회귀를 통과했다. 양 OS 모두64KiB 대조군8사례가 통과했고2GiB fixture는 Cargo101/E0080의 구체적인 컴파일러 할당 실패를 반환했으며 열거 차단·전체 미실행·소유 공간 정리·부모 파일 보존이 통과했다. 첫CI39092064031와 JSON 수집CI39092179114의 진단 위치 불일치 실패를 보존하고 기대값 보완 이유를 일지에 기록했다. 이는 컴파일러 메모리 할당 거부 경로의 검증이며 OS 한도 단독 원인·RSS/그룹 합산 메모리·운영 실행기 인수의 증거는 아니다.

### 소유 작업 공간 정리 실패 (2026-10-18)

삭제 실패는 항상 code:ERUSTCLEANUP인 AggregateError로 전파한다. cause는 원래 삭제 오류이며 errors는 [원래 단계 오류, 삭제 오류] 또는 단계 예외가 없으면 [삭제 오류]다. null 같은 falsy 값의 throw도 별도 실패 표식으로 보존한다. 정상/컴파일 거부 결과도 정리에 실패하면 반환하지 않는다.
workspaceDir에는 이 호출이 생성해 캡처한 정확한 디렉터리만 담는다. 신뢰된 내부 호출자의 수동 복구용 정보이며 HTTP 응답·학습자 진단·백업에 노출하지 않는다. 자동 재시도나 부모/다른 디렉터리 삭제는 하지 않는다. 실제 권한/디스크 장애를 고치는 기능은 아니다.
테스트는 fs.rm에 정확한 소유 경로의 EACCES만 주입해 정상 결과·컴파일 거부·관찰 예외·falsy 예외·취소의 다섯 경로를 검사한다. 오류 원본/복구 경로·부모의 사용자 파일 보존·명시적 복구를 검증하며 실제 OS 권한 장애 재현이나 악성 파일 시스템 격리로 주장하지 않는다. 빌드 자원 초과 통합과 운영 API는 후속 검증이다.
macOS fixture의 부모는 서버 계약처럼 realpath로 준비해 /var 별칭과 /private/var 실경로를 혼동하지 않는다. Linux 취소 생존 검사는 signal(0) 성공 뒤 stat 읽기 실패 시 signal(0)을 재확인한다. 두 번째 ESRCH만 종료 증거이고 여전히 존재하거나 상태를 모르면 살아 있음으로 보수 판정한다. 주입 검사로 이 비원자적 관찰 경합을 재현했으며 PID 재사용·운영 프로세스 격리 문제를 해결했다는 뜻은 아니다.
검증 SHA `992d148b40869eb628281bc90bddbae0c4384766`의 [CI39082023020](https://github.com/cys123431-ship-it/CodeWeave/actions/runs/39082023020)에서 Ubuntu 전체545/545·skip0, macOS 통합/취소/정리/PID23/23·skip0, browser 회귀 성공을 실제 확인했다. 최초 CI39081758630의 macOS 경로5실패와 Linux 취소1실패는 숨기지 않고 fixture 실경로와 PID 관찰 경합 수정으로 이어졌다. 정리 주입5경로·보수적인 PID 상태3검사와 실제 Rust 기존 생명주기/취소 검증이며 운영 API 활성화나 단원 전체 완료 근거가 아니다.

### 실행 중 취소 연결 (2026-10-18)

테스트 전용 observeProcess의 선택적 abortSignal은 실제 AbortSignal만 허용한다. 이미 취소됐으면 spawn하지 않고 pid:null·ABORT_ERR/AbortError를 반환한다. 사유 문자열을 진단으로 복사하지 않는다. 실행 중 abort 이벤트는 즉시 stop을 호출해 POSIX의 해당 프로세스 그룹 전체에 SIGKILL을 요청한다. 원래 시간 제한을 기다리지 않으며 기존 close/500ms 파이프 정리와 시간/출력 상한은 유지한다. 이벤트 리스너는 성공·도구 오류·중단 뒤 제거한다. Windows는 기존 부모 kill 경로일 뿐 자손 종료 보장이 아니고 Rust 실행 지원 대상으로 확대하지 않는다.
CI Rust 관찰자는 pipeline의 signal을 abortSignal로 전달한다. 관찰자가 종료/파이프 정리를 마친 뒤 pipeline의 취소 검사가 AbortError를 전파하고 finally가 소유 작업 공간을 지운다. 취소를 오답 iteration이나 성공 응답으로 기록하지 않는다. 취소·시간·출력 오류가 겹치면 observeProcess는 최초 관찰 오류를 보존하고 pipeline은 자신의 signal 상태도 확인한다.
신규 검사는 잘못된 signal·사전 취소의 실행/파일 생성0·진행 중 부모/자식 종료·원래3초 제한 전 반환·리스너 제거·내부 pipeline 공간 정리를 검증한다. 실제 Rust 사례는 marker를 기록한 뒤10초 대기하도록 독립 작성하고, CI에서 실행 중 취소→다음 사례 미실행→프로세스 종료·작업 공간 삭제를 필수 검사한다. 프로세스 생존 상태를 확인할 수 없으면 종료 증거로 간주하지 않는다. CI 결과 전까지 실제 Rust 취소 성공을 주장하지 않는다.
구현 `5bba6d599e43d2c114ce9026cf9d534549efd954`의 [CI39077323304](https://github.com/cys123431-ship-it/CodeWeave/actions/runs/39077323304)에서 Ubuntu 전체537/537·skip0, macOS 통합/취소15/15·skip0 및 browser 회귀 성공을 확인했다. 두 OS에서 실제 Rust 첫 사례의 실행 중 취소가 AbortError로 전파되고 남은 사례가 실행되지 않으며 프로세스·소유 공간이 정리됐다. POSIX Node 부모/자식 그룹 종료와 리스너 제거도 통과했다. Windows 자손 종료·정리 실패 주입·악성 제출 격리·운영 API 검증으로 확대하지 않는다.

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

### 기본 비활성 Rust HTTP 어댑터 (2026-10-18)

server/rust-http.mjs의 createRustHttpHandler는 기본 비활성이며 신뢰된 서버 코드가 enabled:true·service·auth를 직접 제공해야 한다. 서비스는 정리 실패 감독이 연결된 createLocalRustGradingService를 사용한다. 환경 변수·클라이언트 필드로 활성화하지 않는다. 이번 구현은 로컬 HTTP fixture에서 연결을 검증하며 dev-server의 Rust 라우트·학습자 UI·실습/숙달은 아직 등록/활성화하지 않는다. HTTP 경로와 실제 문제/v1 기록의 최종 연결은 다음 인수 범위다.

server/local-auth.mjs는 기존 C 인증을 동작 변경 없이 공유한 것이다. 실제 서버 포트를 제공하는 함수마다 새32바이트 토큰을 만들고 페이지용 meta만 제공한다. Content-Type 정확히 application/json, 단일 Host의 127.0.0.1/localhost:실제PORT, 존재하는 단일 Origin의 동일 loopback HTTP 출처, 단일 X-CodeWeave-Token을 검사한다. 헤더 중복·외부/다른 포트·토큰 누락/이전 토큰은 실행 전에 거부하며 C 페이지/PWA의 기존 토큰 주입/캐시 제거 계약을 유지한다.

Rust HTTP는 POST만 허용하고 인증→명시적 활성화→공유 busy 선검사→본문 파싱→서비스 순서로 처리한다. 본문 UTF-8 바이트는 기존 MAX_CODE_LENGTH×4+4096으로 제한하며 JSON·ID/코드/추가 필드는 기존 Rust 서비스가 검증한다. 비동기 본문 뒤의 슬롯 재획득·실제 실행과 정리는 서비스 책임이다. 한글25,000자는 HTTP에서 잘리지 않으며 소스의 Rust 문법 통과를 뜻하지는 않는다.

요청 aborted 또는 완료 전 response close는 기존 createRequestCancellation의 signal로 전달한다. 정상 request close는 취소하지 않고, 닫힌 연결/늦은 결과에는 응답하지 않으며 리스너를 해제한다. HTTP가 별도로 lease를 획득하거나 정리 완료 전에 해제하지 않는다. 기본 비활성503·요청 오류400·공유 busy429·취소499·운영 장애503을 고정 메시지로 전달하며 예외의 statusCode/message/cause/workspaceDir는 사용하지 않는다. 응답은 JSON·no-store·nosniff이고 CORS 허용 헤더를 추가하지 않는다.

새 HTTP 검사는 기본 비활성/의존성 거부, 인증 거부 전 서비스/공간 생성0, 서버별 토큰 갱신, JSON/바이트/코드 경계와 네 필드 결과, 운영 오류 비공개, 연결 해제 뒤 정리 대기 중429를 검사한다. Linux/macOS 필수 CI는 실제 Cargo 오답8사례→수정8통과→정리 실패503/후속429→운영자 수동 복구를 같은 로컬 HTTP 경로에서 확인한다. 이는 신뢰 개인 코드 범위이며 공개 실행 서버 배포·파일/네트워크 격리·실기기 UI 인수는 아니다.

### 명시적 신뢰 로컬 실행 어댑터 (2026-10-18)

검증 SHA `53ff9da243109efafd4fd90eceaf110ced2f3cc6`의 [CI39106889937](https://github.com/cys123431-ship-it/CodeWeave/actions/runs/39106889937)는 Ubuntu 전체585/585·skip0, macOS 관련61/61·skip0, browser 회귀를 통과했다. 양 OS에서 새 어댑터로 실제 Cargo 정상8통과·오답8실패·문법/경고 전체 미실행·실행 중 사례 취소와 소유 공간 정리를 확인했다. 합성 도구로 비활성/버전·호스트 거부, 환경 hooks 제거, 프로세스 가족 취소/재제출, 출력 제한, launcher125/126/127 운영 오류, 조상 Cargo 설정 사전/후속 거부도 검증했다. HTTP/UI 등록과 실제 학습자 Rust 문제·숙달 인수는 포함하지 않는다.

server/rust-executor.mjs의 비동기 createLocalRustGradingService는 기본 비활성이며, enabled:true·신뢰 registry Map·운영자가 지정한 실제 sysroot가 있어야 실행 서비스를 만든다. 환경 변수/제출 필드로 활성화하거나 rustup PATH 프록시·설치/다운로드로 도구를 선택하지 않는다. 같은 sysroot의 실제 cargo/rustc 절대 경로·버전1.99.0·현재 호스트를 제한된5초/4KB probe로 검증한다. Linux/macOS만 허용하며 Windows Rust 실행은 계속 비활성이다. dev-server/HTTP/UI에는 등록하지 않았다.
기존 CI 한도 함수를 server/rust-budget.mjs로 이동하고 tests/helpers의 기존 이름은 재내보내기로 보존했다. 값·스크립트/argv·낮은 상속 한도 보존 정책은 변경하지 않았다. Cargo 빌드는 CPU10초·주소 공간1GiB·파일32MiB·벽시계15초, 테스트는 CPU2초·주소 공간256MiB·파일2MiB·벽시계2초, 양쪽 합산 출력80KB다. macOS 주소 공간은 시작 Bash VSZ에 예산을 더하며 사용자 프로세스 Linux128/macOS512·코어0도 유지한다. 프로세스 그룹 전체 CPU/메모리 합산 한도는 아니다.
PATH/HOME/LANG/LC_ALL/TMPDIR만 신뢰 운영 환경에서 캡처하고 컴파일러 hooks/플래그/대상 경로 등 나머지 상속값을 버린다. private CARGO_HOME/target·절대 RUSTC·offline/frozen·경고 실패 정책을 고정한다. Linux x64의 명시적 어댑터는 기존 CI와 같은 -Clinker-features=-lld를 사용하며 pure plan과 다른 플랫폼은 그대로다. PATH의 시스템 링커는 운영자가 신뢰해야 한다.
Cargo는 현재 디렉터리의 조상 .cargo/config와 config.toml도 읽으므로 활성화 전과 매 제출의 공간 생성 전에 부모부터 루트까지 해당 설정 존재를 검사해 거부한다. 설정 내용을 읽거나 파일을 수정·삭제하지 않는다. private CARGO_HOME으로 사용자 기본 설정도 배제한다. 검사 후 설정/도구가 바뀌는 공격을 격리하지 않으므로 부모·도구 경로는 계속 신뢰해야 한다. 근거: [Cargo 설정 탐색](https://doc.rust-lang.org/cargo/reference/config.html#hierarchical-structure), [환경 변수](https://doc.rust-lang.org/cargo/reference/environment-variables.html), 2026-10-18 확인.
각 단계는 detached 그룹으로 실행하고 정상 종료·취소·시간/출력 초과 모두 소유 그룹을 종료한 뒤 스트림 정리를 기다린다. 정리 오류는 취소로 덮지 않고 운영 오류로 전파한다. Cargo 실행기125/126/127·프로세스 정리/도구 장애는 오답 결과가 아니라 기존 서비스의 비공개503이다. 실제 Cargo101 컴파일 오류·경고와 한도 초과는 기존 전체 미실행 결과 계약을 따른다. 기존 pipeline의 소유 공간 삭제와 서비스의 공유 슬롯 해제/안전한 결과 복사를 재사용한다.
신뢰 개인 코드용 내부 어댑터이며 파일/네트워크 격리·악성 제출 판정 진위는 보장하지 않는다. 아래의 제한된 운영 상태/공간 복구 외에 프로세스 불확실성의 수동 인수와 인증된 HTTP 연결/실제 Rust 문제·숙달 인수는 아직 남아 있다.

### 정리 실패 후 차단과 명시적 공간 복구 (2026-10-18)

검증 SHA `42328c75fd5aebf5be9f8c331ae40032684d6561`의 [CI39111020162](https://github.com/cys123431-ship-it/CodeWeave/actions/runs/39111020162)는 Ubuntu 전체594/594·skip0, macOS 관련70/70·skip0, browser 회귀를 통과했다. 양 OS에서 실제 Rust 삭제 실패 뒤 공유 슬롯 차단·복구 전 재제출 거부·수동 정리 뒤 새8사례 통과를 확인했다. 프로세스 정리 불확실성은 자식 테스트의 EPERM 주입으로 복구 거부를 검증했으며 실제 OS 정리 장애를 해결했다는 뜻은 아니다.

로컬 어댑터는 공간 ERUSTCLEANUP 또는 프로세스 ECLEANUP을 만나면 C·Rust 공통 lease를 격리 상태로 보유한다. 정상 finally의 release나 중복/오래된 해제는 이 상태와 다음 소유자를 풀지 못한다. 같은 어댑터의 후속 제출은 비공개 RUST_UNAVAILABLE/503, 공유 슬롯의 다른 요청은 기존 busy로 거부하며 새 실행/공간 생성을 시작하지 않는다. prepare 도중 쓰기와 삭제가 함께 실패해도 두 원인을 AggregateError로 보존하고 정확한 소유 workspaceDir로 ERUSTCLEANUP을 전달한다.
inspect()는 동결된 state·reason·workspaceDir 세 필드만 반환한다. state는 disabled/ready/quarantined/recovering, reason은 null/workspace-cleanup/process-cleanup이다. 경로는 신뢰 로컬 운영자만 사용하는 정보이며 HTTP·학습자 결과·진도/v1 백업에 노출하지 않는다. 오류 원문·코드·프로세스 출력은 상태에 담지 않는다. 비활성 서비스의 관측/복구는 도구 probe나 공간 생성을 하지 않는다.
recover()는 경로나 강제 해제 인수를 받지 않으며 파일을 삭제·이동하거나 프로세스를 종료하지 않는다. 운영자가 장애를 해결하고 해당 공간을 직접 정리한 뒤에만 호출한다. workspace-cleanup이고, 시작 때 캡처한 정규 부모 경로·device/inode가 그대로이며, lstat으로 정확한 소유 경로가 ENOENT임을 확인한 경우에만 소유 resume capability로 슬롯을 한 번 해제한다. 존재하는 폴더/파일·끊어진 심볼릭 링크·부모 이동/교체·접근 오류는 false를 반환하며 차단을 유지한다. 부모의 다른 파일은 만지지 않는다.
중첩 오류에 ECLEANUP이 있거나 오류 그래프 확인 한도(32객체·배열16개)를 넘으면 보수적으로 process-cleanup으로 분류한다. 공간이 없어도 recover()로 해제할 수 없다. 운영자가 남은 프로세스를 확인·종료한 뒤 의도적으로 재시작해야 하며, 재시작 자체가 이전 프로세스 정리의 증거는 아니다. 상태는 메모리에만 있고 여러 Node 프로세스/worker 간 잠금이나 악성 파일 시스템 경합 격리가 아니다. 공간의 다른 경로 이동까지 추적하지 않으므로 부모와 수동 작업은 신뢰해야 한다.
주입형 내부 서비스의 선택적 onCleanupFailure는 원본 오류와 private resume을 신뢰 운영자에게만 전달한다. 이 감독 hook 없는 기존 주입 서비스의 해제 동작은 호환을 유지한다. 로컬 실행 어댑터는 항상 감독을 연결하며, 향후 HTTP는 이 어댑터를 사용해야 하고 hook/inspect/recover/resume을 외부에 노출하면 안 된다. 네 필드 채점 결과와 Rust HTTP/UI·실습/숙달 비활성 정책은 그대로다.
새 검사는 lease 격리/오래된 해제, 오류 비공개, 삭제 전 재실행 거부, 수동 삭제 뒤 재제출, 끊어진 링크, 준비 중 복합 오류, 부모 교체 거부, 프로세스 불확실성의 복구 거부를 재현한다. 실제 Rust 제출의 삭제 실패→차단→수동 정리→새 성공8사례 경로는 Linux/macOS CI에서 필수다. 권한 장애는 소유 경로의 EACCES 주입이며 실제 OS 권한 설정을 바꾸거나 임의 프로세스를 남기지 않는다.

공유 슬롯 검증 SHA `452f4a53322d41ad29e3088210bd3597dc932d02`의 [CI39099160821](https://github.com/cys123431-ship-it/CodeWeave/actions/runs/39099160821)는 Ubuntu 전체567/567·skip0, macOS 관련43/43·skip0, browser 회귀를 통과했다. 실제 C HTTP 경로를 띄워 내부 Rust 점유 중 C의429·GCC/임시 공간 생성0, 해제 후 C 정상 재제출 및 C 점유 중 내부 Rust 거부를 양 OS에서 확인했다. 취소 후 정리 대기·여러 서비스 간 배타성·이전 소유자의 중복 해제 무효도 검사했다. Rust HTTP 경로/실행 어댑터 활성화는 포함하지 않는다.

### 내부 요청 서비스 — 기본 비활성 (2026-10-18)

연결 수명 검증 SHA `27db37fe4823be3d1bf395be8a3ca657ad852a5f`의 [CI39102784378](https://github.com/cys123431-ship-it/CodeWeave/actions/runs/39102784378)는 Ubuntu 전체576/576·skip0, macOS 관련52/52·skip0, browser 회귀를 통과했다. C 실제 HTTP 연결 해제→부모/자식 종료→삭제 대기 중429→삭제 완료 뒤 정상 재제출, Rust response close 이벤트→실제 사례 취소→후속 차단/소유 공간 정리/공유 슬롯 해제를 양 OS에서 확인했다. 첫 macOS 검사의 시스템 실행 파일 제어군126은 자체 GCC C 제어군으로 수정했으며 성공0 기대값과 자원 한도는 유지했다.

연결 수명은 server/request-cancellation.mjs의 createRequestCancellation(req,res)로 AbortSignal에 연결한다. 요청 aborted 또는 아직 writableFinished가 아닌 응답 close만 취소하며, 정상 본문 수신의 request close는 취소가 아니다. 기존 C HTTP 경로에 실제 적용했고 C runCases→runSubmission으로 전달한다. 완료/오류/취소 후 dispose가 자기 리스너만 제거하며, 실행 그룹 종료·소유 공간 삭제가 settle하기 전 공유 슬롯을 해제하지 않는다. 닫힌 연결에 성공/오답 결과나500을 쓰지 않는다. C의 동기 GCC 컴파일 자체는 도중 취소할 수 없고 기존4.5초 한도와 다음 비동기 경계 검사에 의존한다. 파일 쓰기/삭제도 진행 중 I/O를 강제 중단하지 않는다.
Rust 서비스에는 동일 signal을 submit의 옵션으로 전달할 수 있다. CI는 response close 이벤트를 주입해 실제 Cargo→테스트 열거→첫 사례 실행을 취소하고 나머지 사례 차단·공간 삭제·슬롯 해제 순서를 확인한다. 실제 Rust HTTP 경로/인증/실행 어댑터 연결이나 활성화는 아직 아니다. 운영 상태/공간 복구는 위의 제한된 계약을 따르며 종료 신호/자원 제한을 격리 보장으로 확대하지 않는다.

server/rust-service.mjs의 createRustGradingService는 enabled:true·신뢰 registry·주입 grade 함수가 모두 있어야 요청을 수락한다. 환경 변수/클라이언트 요청으로 활성화하지 않고 기본 실행기·child_process·HTTP 등록도 없다. 현재 dev-server와 UI는 이 서비스를 사용하지 않는다.
요청/ID/코드 길이·AbortSignal을 실행 함수 호출 전 검증하고 코드 문자열을 동결한 스냅샷으로 전달한다. 같은 Node 프로세스의 C 채점과 모든 Rust 서비스가 server/grading-admission.mjs의 단일 슬롯을 공유한다. 동시1건, 대기열0이며 Rust 중복 요청은 RUST_BUSY/429다. 기본 비활성은 RUST_DISABLED/503, 요청 오류는 RUST_INVALID/400, 취소는 RUST_CANCELLED/499, 운영/정리/결과 오류는 RUST_UNAVAILABLE/503이다. statusCode는 내부 계약이며 실제 Rust HTTP 응답 구현이나 API 활성화 증거가 아니다.
사전 취소는 실행하지 않고 실행 중 취소는 signal을 grade에 전달한다. grade와 정리가 settle하기 전에는 슬롯을 해제하지 않으며 늦은 성공은 폐기한다. 실제 중단은 주입 grade의 책임이다. 정리 실패 등 운영 예외는 취소로 숨기지 않는다. 원래 예외/작업 경로/비밀값을 반환하지 않으며 이 서비스는 제출 이력에 쓰지 않는다.
결과는 기존4필드와 tests[{passed,detail}]의 소유 스냅샷만 반환한다. 전체 사례 수·boolean 판정·ok 일치·문자열 상한을 확인하고 sparse 배열·결과 getter 예외도 운영 오류로 거부한다. 요청/결과는 동결한다. 슬롯 획득은 동기적이며 해제 함수는 소유 lease만 해제한다. 중복/오래된 해제는 다음 소유자를 해제하지 않는다. C는 헤더 인증 뒤 조기 busy 검사와 비동기 본문 파싱 뒤 재획득을 수행하고, 임시 공간 삭제가 settle한 뒤 해제한다. Rust도 grade/정리가 settle할 때까지 소유한다. 여러 Node 프로세스·worker·중복 모듈 설치본 간 전역 한도나 호스트 격리는 아니다. 향후 Rust HTTP 연결에는 CSRF·연결 해제 취소·운영 관측/복구 계약을 별도로 검증해야 한다.
신규 합성 검사는 비활성/잘못된 활성화·요청 거부·중복 차단·코드 보존·취소 뒤 정리 대기/재수락·운영 오류 비공개·잘못된 결과 거부를 검사한다. 실제 CI는 기존 내부 Cargo pipeline을 주입해 중복 거부·정상/오답 재제출·전체8사례·작업 공간 삭제를 확인한다. 신뢰 코드 범위이며 운영 API·Rust 실습/숙달은 계속 비활성이다.
검증 SHA `b212e13b25f4487277791a80cdc72f6284686ba4`의 [CI39095657268](https://github.com/cys123431-ship-it/CodeWeave/actions/runs/39095657268)는 Ubuntu 전체563/563·skip0, macOS 관련39/39·skip0, browser 회귀를 통과했다. 양 OS에서 실제 Cargo pipeline 주입·동시 요청 거부·정상/오답 재제출8사례·소유 공간 삭제가 통과했다. 합성 검사로 사전/진행 중 취소·정리 대기·슬롯 재수락·비공개 오류·sparse/getter/사용자 iterator 결과 경계를 검증했다. HTTP/프로덕션 실행기·공유 C/Rust 전역 슬롯 인수로 확대하지 않는다.

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

기존 `tests/helpers/rust-budget.mjs`는 현재 `server/rust-budget.mjs`를 재내보낸다. CI와 명시적 신뢰 로컬 어댑터가 같은 고정 Bash 스크립트/argv와 PATH/LANG/LC_ALL/TMPDIR 허용 목록을 사용하며 HTTP/API 활성화는 하지 않는다.
실행 후보는 CPU2초, 가상 메모리256MiB, 파일2MiB, 사용자 프로세스 Linux128/macOS512, 코어0, 벽시계2초, 합산 출력80KB다. macOS는 공유 영역을 위해 Bash 초기 VSZ에256MiB를 더한 주소 공간 예산이며 RSS 상한이 아니다.
기존의 더 낮은 soft/hard 한도를 높이지 않고 설정 실패 시 바이너리 실행 전125로 멈춘다. 사용자별 프로세스 한도는 제출별 격리가 아니며 root에서는 집행되지 않을 수 있다.
CI는 실제 Rust의 getrlimit·그룹 ID·384MiB 예약 거부·4MiB 파일/SIGXFSZ·CPU 소진·정상/시간 초과 뒤 fork 자식 정리를 Linux/macOS에서 검증한다. 기존 Cargo 결과 fixture의 정상/단언 실패/조기 exit도 제한된 실행기를 거친다.
이 절의 과거 CI 예산 실험 이후 도구체인 고정과 위의 명시적 신뢰 로컬 어댑터를 구현했다. 인증된 HTTP 운영 연결/실습 인수는 여전히 미완료다. 기존 C 한도와 Rust API/실습/숙달은 변경하지 않으며 Windows Rust 실행은 지원하지 않는다.

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
