// Preparation only: importing this private definition never enables a server or CLI route.
import { createRustBindingDefinitions } from './rust-exercises.mjs';
export const controlMetadata = Object.freeze({
  id: 'rust-control-flow',
  concepts: Object.freeze(['if-expression', 'boolean-condition', 'inclusive-range', 'for-loop', 'break', 'continue', 'accumulator']),
  prerequisites: Object.freeze(['rust-mut']),
  publicExample: Object.freeze({ input: 'sum_even_before(10, 7)', output: '12' })
});

export const controlDefinition = Object.freeze({
  id: controlMetadata.id,
  language: 'rust',
  grader: 'cargo-test',
  starter: `pub fn sum_even_before(limit: u32, stop: u32) -> u32 {
    let _ = (limit, stop);
    // TODO: 상한1000, stop 미만의 짝수 누적. 마지막 식으로 합계를 반환하세요.
    0
}
`,
  cases: Object.freeze([
    '공개 예제·홀수 중단 경계', 'stop0·방문 없이 종료', '길이0/1과 짝수0',
    '짝수 limit 포함', '짝수 stop 제외', '홀수 stop 앞 마지막 짝수',
    '홀수 limit와 범위 뒤 stop', '정확한1000 상한·999 비교',
    '상한 초과·u32 최댓값을 먼저 제한', '반복 호출과 호출자 값 보존'
  ].map((label, i) => Object.freeze({ id: 'case_0' + i, label }))),
  harness: `use codeweave_submission::sum_even_before;
#[test]
fn case_00() {
    assert_eq!(sum_even_before(10, 7), 12);
}
#[test]
fn case_01() {
    assert_eq!(sum_even_before(0, 0), 0);
    assert_eq!(sum_even_before(10, 0), 0);
    assert_eq!(sum_even_before(u32::MAX, 0), 0);
}
#[test]
fn case_02() {
    assert_eq!(sum_even_before(0, u32::MAX), 0);
    assert_eq!(sum_even_before(1, 2), 0);
    assert_eq!(sum_even_before(1, u32::MAX), 0);
}
#[test]
fn case_03() {
    assert_eq!(sum_even_before(4, 10), 6);
    assert_eq!(sum_even_before(2, 10), 2);
}
#[test]
fn case_04() {
    assert_eq!(sum_even_before(10, 4), 2);
    assert_eq!(sum_even_before(10, 2), 0);
    assert_eq!(sum_even_before(1000, 1000), 249500);
}
#[test]
fn case_05() {
    assert_eq!(sum_even_before(10, 5), 6);
    assert_eq!(sum_even_before(10, 7), 12);
    assert_eq!(sum_even_before(10, 9), 20);
}
#[test]
fn case_06() {
    assert_eq!(sum_even_before(5, 1001), 6);
    assert_eq!(sum_even_before(7, 1001), 12);
}
#[test]
fn case_07() {
    assert_eq!(sum_even_before(1000, 1001), 250500);
    assert_eq!(sum_even_before(999, 1001), 249500);
}
#[test]
fn case_08() {
    assert_eq!(sum_even_before(1002, 1003), 250500);
    assert_eq!(sum_even_before(u32::MAX, u32::MAX), 250500);
    assert_eq!(sum_even_before(u32::MAX, 1000), 249500);
}
#[test]
fn case_09() {
    let limit = 10;
    let stop = 7;
    for _ in 0..3 {
        assert_eq!(sum_even_before(limit, stop), 12);
        assert_eq!(sum_even_before(4, 10), 6);
        assert_eq!(sum_even_before(1000, 1000), 249500);
        assert_eq!(sum_even_before(2, u32::MAX), 2);
    }
    assert_eq!(limit, 10);
    assert_eq!(stop, 7);
}
`
});

// Trusted programmatic opt-in only; legacy factories keep their existing IDs.
export function createRustControlDefinitions() {
  return new Map([...createRustBindingDefinitions(), [controlDefinition.id, controlDefinition]]);
}
