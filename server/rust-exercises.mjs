import { mutDefinition } from './rust-mut-exercise.mjs';
// Default F01 only. Importing definitions never enables execution.
const definition = Object.freeze({
  id: 'rust-cargo',
  language: 'rust',
  grader: 'cargo-test',
  starter: "pub fn total(items: u32, price: u32) -> u32 {\n    // TODO: 수량과 단가로 합계 반환\n    0\n}",
  cases: Object.freeze([
  {
    "id": "case_00",
    "label": "수량·단가 모두 0"
  },
  {
    "id": "case_01",
    "label": "상품 없음·양수 단가"
  },
  {
    "id": "case_02",
    "label": "양수 수량·무료 상품"
  },
  {
    "id": "case_03",
    "label": "상품 하나"
  },
  {
    "id": "case_04",
    "label": "공개 예제"
  },
  {
    "id": "case_05",
    "label": "단가 1"
  },
  {
    "id": "case_06",
    "label": "서로 다른 일반 입력"
  },
  {
    "id": "case_07",
    "label": "수량 상한"
  },
  {
    "id": "case_08",
    "label": "단가 상한"
  },
  {
    "id": "case_09",
    "label": "계약 최댓값·반복 호출"
  }
].map(entry => Object.freeze(entry))),
  harness: `#[test]
fn case_00() {
    assert_eq!(codeweave_submission::total(0, 0), 0);
}

#[test]
fn case_01() {
    assert_eq!(codeweave_submission::total(0, 997), 0);
}

#[test]
fn case_02() {
    assert_eq!(codeweave_submission::total(7, 0), 0);
}

#[test]
fn case_03() {
    assert_eq!(codeweave_submission::total(1, 337), 337);
}

#[test]
fn case_04() {
    assert_eq!(codeweave_submission::total(2, 250), 500);
}

#[test]
fn case_05() {
    assert_eq!(codeweave_submission::total(9, 1), 9);
}

#[test]
fn case_06() {
    assert_eq!(codeweave_submission::total(3, 71), 213);
}

#[test]
fn case_07() {
    assert_eq!(codeweave_submission::total(10, 643), 6430);
}

#[test]
fn case_08() {
    assert_eq!(codeweave_submission::total(6, 1000), 6000);
}

#[test]
fn case_09() {
    assert_eq!(codeweave_submission::total(10, 1000), 10000);
    assert_eq!(codeweave_submission::total(4, 113), 452);
    assert_eq!(codeweave_submission::total(0, 301), 0);
    assert_eq!(codeweave_submission::total(4, 113), 452);
}
`
});

// A fresh registry prevents a trusted caller's Map mutation from affecting other instances.
export function createRustGradingDefinitions() {
  return new Map([[definition.id, definition]]);
}

// A separate explicit operator choice; legacy callers keep the F01-only factory.
export function createRustBindingDefinitions() {
  return new Map([...createRustGradingDefinitions(), [mutDefinition.id, mutDefinition]]);
}

