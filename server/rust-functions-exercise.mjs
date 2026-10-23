// Preparation only: importing this private definition never enables a server or CLI route.
import { createRustControlDefinitions } from './rust-control-flow-exercise.mjs';

export const functionMetadata = Object.freeze({
  id: 'rust-functions',
  concepts: Object.freeze(['function-signature', 'parameters', 'return-type', 'tail-expression', 'unit-test']),
  prerequisites: Object.freeze(['rust-control-flow']),
  publicExample: Object.freeze({ input: 'checkout_total(250, 2, 80)', output: '580' })
});

export const functionDefinition = Object.freeze({
  id: functionMetadata.id,
  language: 'rust',
  grader: 'cargo-test',
  starter: `pub fn line_total(unit_price: u32, quantity: u32) -> u32 {
    let _ = (unit_price, quantity);
    // TODO: 단가와 수량을 곱한 값을 마지막 식으로 반환하세요.
    0
}

pub fn checkout_total(unit_price: u32, quantity: u32, shipping: u32) -> u32 {
    let _ = (unit_price, quantity, shipping);
    // TODO: line_total의 결과에 배송비를 더해 반환하세요.
    0
}
`,
  cases: Object.freeze([
    '공개 예제·두 함수 조합', '모든 인수0', '수량0·배송비만 반환',
    '무료 상품·배송비 유지', '수량1·단가 보존', '배송비0·상품 합계 유지',
    '서로 다른 일반값', '단가·수량 상한', '세 인수 상한', '반복 호출·인수 보존'
  ].map((label, i) => Object.freeze({ id: 'case_0' + i, label }))),
  harness: `use codeweave_submission::{checkout_total, line_total};
#[test]
fn case_00() {
    assert_eq!(line_total(250, 2), 500);
    assert_eq!(checkout_total(250, 2, 80), 580);
}
#[test]
fn case_01() {
    assert_eq!(line_total(0, 0), 0);
    assert_eq!(checkout_total(0, 0, 0), 0);
}
#[test]
fn case_02() {
    assert_eq!(line_total(999, 0), 0);
    assert_eq!(checkout_total(999, 0, 37), 37);
}
#[test]
fn case_03() {
    assert_eq!(line_total(0, 1000), 0);
    assert_eq!(checkout_total(0, 1000, 91), 91);
}
#[test]
fn case_04() {
    assert_eq!(line_total(713, 1), 713);
    assert_eq!(checkout_total(713, 1, 24), 737);
}
#[test]
fn case_05() {
    assert_eq!(line_total(27, 13), 351);
    assert_eq!(checkout_total(27, 13, 0), 351);
}
#[test]
fn case_06() {
    assert_eq!(line_total(43, 17), 731);
    assert_eq!(checkout_total(43, 17, 29), 760);
}
#[test]
fn case_07() {
    assert_eq!(line_total(1000, 1000), 1_000_000);
    assert_eq!(checkout_total(1000, 999, 0), 999_000);
}
#[test]
fn case_08() {
    assert_eq!(checkout_total(1000, 1000, 1000), 1_001_000);
    assert_eq!(checkout_total(1, 1000, 1000), 2000);
}
#[test]
fn case_09() {
    let unit_price = 19;
    let quantity = 7;
    let shipping = 5;
    for _ in 0..3 {
        assert_eq!(line_total(unit_price, quantity), 133);
        assert_eq!(checkout_total(unit_price, quantity, shipping), 138);
    }
    assert_eq!((unit_price, quantity, shipping), (19, 7, 5));
}
`
});

// Trusted programmatic opt-in only; legacy factories keep their existing IDs.
export function createRustFunctionDefinitions() {
  return new Map([...createRustControlDefinitions(), [functionDefinition.id, functionDefinition]]);
}
