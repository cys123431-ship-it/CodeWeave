# F01 — Cargo 프로젝트와 실패하는 테스트 읽기

## 개요·목표·선수 지식
예상 25분. C의 함수·반환값·컴파일을 먼저 배웠다면 시작할 수 있습니다.
Cargo는 프로젝트 설정·빌드·테스트를 묶습니다. 이번 목표는 파일 역할을 구별하고,
컴파일 오류와 실행된 테스트의 실패를 나누어 읽고, 구현을 고쳐 재실행하는 것입니다.
소유권·빌림이나 범용 금액 검증은 이번 계약에 포함하지 않습니다.

## 시작과 정적 도식
화면의 독자 정적 도식 `cargo-test-flow`를 함께 봅니다.
Cargo.toml(설정) → src/lib.rs(구현) → tests/receipt.rs(검사) → 실패 원인 수정 → 재실행.
Cargo.lock은 패키지 버전 기록이고 target은 생성 산출물입니다. 직접 구현하는 파일과 구별하세요.
아래는 개인 터미널 명령이며 Rust 소스가 아닙니다. 생성은 한 번만 합니다.
```sh
cargo new weave_receipt --lib
cd weave_receipt
```

## Cargo.toml
파일 전체입니다. 외부 의존성은 없습니다.
```toml
[package]
name = "weave_receipt"
version = "0.1.0"
edition = "2021"

[lib]
doctest = false
```

## src/lib.rs
파일 전체입니다. pub는 통합 테스트에서 함수를 호출할 수 있도록 공개합니다.
`-> u32`는 반환 형이며 마지막 곱셈 식에는 세미콜론이 없습니다.
계약은 items 0~10, price 0~1000입니다. 최댓값 10000은 u32 범위 안입니다.
계약 밖 입력·넘침까지 처리하는 범용 계산기로 일반화하지 않습니다.
```rust
pub fn total(items: u32, price: u32) -> u32 {
    items * price
}
```

## tests/receipt.rs
tests 폴더를 만든 뒤 저장할 파일 전체입니다. #[test] 하나가 독립 검사 한 개입니다.
assert_eq!의 첫 값은 실제값, 두 번째는 기대값입니다. 2 × 250은 500입니다.
아래는 개인 프로젝트에서 직접 실행하는 공개 예시입니다. 사이트 서버 소유 검사는 별도입니다.
```rust
#[test]
fn case_00() { assert_eq!(weave_receipt::total(0, 0), 0); }

#[test]
fn case_01() { assert_eq!(weave_receipt::total(0, 250), 0); }

#[test]
fn case_02() { assert_eq!(weave_receipt::total(1, 0), 0); }

#[test]
fn case_03() { assert_eq!(weave_receipt::total(1, 250), 250); }

#[test]
fn case_04() { assert_eq!(weave_receipt::total(2, 250), 500); }

#[test]
fn case_05() { assert_eq!(weave_receipt::total(3, 70), 210); }

#[test]
fn case_06() { assert_eq!(weave_receipt::total(4, 125), 500); }

#[test]
fn case_07() { assert_eq!(weave_receipt::total(5, 99), 495); }

#[test]
fn case_08() { assert_eq!(weave_receipt::total(10, 1000), 10000); }

#[test]
fn case_09() { assert_eq!(weave_receipt::total(10, 1), 10); }
```

## 실제 실행과 결과
위에서 만든 weave_receipt 프로젝트 폴더 안에서 실행합니다.
```sh
cargo generate-lockfile --offline
cargo test --test receipt --frozen --jobs 1 -- --test-threads=1
```
정상 구현의 실제 실행 합계는 `test result: ok. 10 passed; 0 failed;`입니다.
순서·시간 등은 도구 버전에 따라 달라집니다. --frozen은 잠금 변경/온라인 해석을 막고,
--jobs 1은 빌드 작업 수, -- 뒤의 --test-threads=1은 검사 실행 스레드 수입니다.
--no-run은 빌드만 하며 0개만 실행되는 필터로도 이번 목표를 달성한 것은 아닙니다.

## 오류 수정·재제출
곱셈을 덧셈으로 바꾸고 다시 검사하세요. 컴파일은 되지만 case_04의 실제값은 252입니다.
기대값 500을 바꾸지 말고 구현을 곱셈으로 복구한 다음 전체 10개를 다시 실행합니다.
반환 식에 세미콜론을 붙이고 반환값이 없으면 u32와 맞지 않아 컴파일에서 멈춥니다.
설정 없는 폴더 오류·컴파일 오류·실행된 단언 실패를 각각 구분하세요.

## 사이트에서 직접 풀기
일반 npm start·정적 사이트·오프라인에서는 Rust 실행이 비활성입니다.
Linux/macOS 개인 PC의 선택적 서버 시작은 `npm run start:rust -- --help`에서 확인하고,
고정 도구 버전·절대 경로·신뢰 코드 확인을 갖춰 [로컬 안내](../../docs/LOCAL_DEVELOPMENT.md)를 따릅니다.
이 단원과 별도 연습장에서 제출하는 것은 `pub fn total` 함수 소스뿐입니다.
서버가 Cargo 설정·검사·기대값을 소유합니다. 스타터의 0 반환을 직접 구현하세요.
서버는 경고도 실패로 처리하므로 미사용 매개변수 경고가 있으면 컴파일 실패·10건 미실행입니다.
오답을 고쳐 재제출하고 이력에서 이전 코드를 복원해 비교하세요. 복원은 새 제출이 아닙니다.
이론 읽음·퀴즈·실습 통과는 별개이며 전체 숙달에는 각 상태가 모두 필요합니다.
통합 v1 백업을 내보내고 복원할 수 있고, 오프라인에서는 저장한 이력만 읽고 복원합니다.

## 개념 확인
질문: `cargo test --no-run` 성공으로 확인한 것은 무엇인가요?
정답: 테스트 실행 파일은 빌드했지만 검사 본문은 실행하지 않았습니다.
오답 점검: 모든 검사 통과·사이트 숙달·반드시 10개 실행을 뜻하지 않습니다.

## 연습·작은 프로젝트
기초: 0개·1개의 결과를 먼저 예측하고 실제값과 비교합니다.
응용: 계약 범위 안의 서로 다른 두 구매 합계를 검사하는 로컬 테스트를 작성합니다.
도전: 계약 밖 입력을 거부할 별도 명세를 적습니다. 아직 배우지 않은 검증을 구현했다고 주장하지 않습니다.
Mini Project: 두 품목 영수증의 입력 약속·예상 합계·실제 검사 결과를 표로 기록합니다.
확장 검사는 개인 터미널에서 실행하며 F01 단일 함수 제출과 섞지 않습니다.

## 복습·다음 단원
Cargo.toml/lock, 빌드/실행, 컴파일 오류/단언 실패, 0건 실행/10건 통과를 설명해 봅니다.
C의 함수 테스트와 비교하고 실패한 코드를 고친 이유를 짧게 기록하세요.
다음 단원은 변수 바인딩과 mut(rust-mut)입니다. F01 통과는 Rust 트랙 전체 완료가 아닙니다.
