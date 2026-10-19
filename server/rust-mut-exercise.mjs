// F02 preparation only. This definition is not in the production F01 registry.
export const mutDefinition = Object.freeze({
  id: 'rust-mut', language: 'rust', grader: 'cargo-test',
  starter: `pub fn next_count(start: i32, step: i32) -> i32 {
    let _ = (start, step);
    // TODO: start에서 step만큼 바뀐 값 반환
    0
}
pub fn is_nonnegative(value: i32) -> bool {
    let _ = value;
    // TODO: 0 이상인지 판정
    false
}
`,
  cases: Object.freeze([
    '공개 예제·음수 결과', '0과 0 이상 경계', '양수 두 입력', '음수 두 입력',
    '서로 상쇄하는 증감', '변화량0과 호출자 원본', '두 입력 상한1000',
    '두 입력 하한-1000', '불리언 i32 극값', '독립 반복 호출과 부호 교차'
  ].map((label, i) => Object.freeze({ id: 'case_0' + i, label }))),
  harness: `#[test]
fn case_00() {
    let before = 3;
    let after = codeweave_submission::next_count(before, -5);
    assert_eq!(after, -2);
    assert!(!codeweave_submission::is_nonnegative(after));
    assert_eq!(before, 3);
}
#[test]
fn case_01() {
    assert_eq!(codeweave_submission::next_count(0, 0), 0);
    assert!(codeweave_submission::is_nonnegative(0));
}
#[test]
fn case_02() {
    let after = codeweave_submission::next_count(4, 7);
    assert_eq!(after, 11);
    assert!(codeweave_submission::is_nonnegative(after));
}
#[test]
fn case_03() {
    let after = codeweave_submission::next_count(-8, -7);
    assert_eq!(after, -15);
    assert!(!codeweave_submission::is_nonnegative(after));
}
#[test]
fn case_04() {
    assert_eq!(codeweave_submission::next_count(-9, 9), 0);
    assert_eq!(codeweave_submission::next_count(9, -9), 0);
    assert!(codeweave_submission::is_nonnegative(0));
}
#[test]
fn case_05() {
    let before = -37;
    assert_eq!(codeweave_submission::next_count(before, 0), -37);
    assert_eq!(codeweave_submission::next_count(23, 0), 23);
    assert_eq!(before, -37);
}
#[test]
fn case_06() {
    assert_eq!(codeweave_submission::next_count(1000, 1000), 2000);
    assert!(codeweave_submission::is_nonnegative(2000));
}
#[test]
fn case_07() {
    assert_eq!(codeweave_submission::next_count(-1000, -1000), -2000);
    assert!(!codeweave_submission::is_nonnegative(-2000));
}
#[test]
fn case_08() {
    assert!(codeweave_submission::is_nonnegative(i32::MAX));
    assert!(!codeweave_submission::is_nonnegative(i32::MIN));
    assert!(!codeweave_submission::is_nonnegative(-1));
    assert!(codeweave_submission::is_nonnegative(1));
}
#[test]
fn case_09() {
    for _ in 0..3 {
        assert_eq!(codeweave_submission::next_count(17, -9), 8);
        assert_eq!(codeweave_submission::next_count(-17, 9), -8);
        assert_eq!(codeweave_submission::next_count(1000, -1000), 0);
        assert_eq!(codeweave_submission::next_count(17, -9), 8);
    }
}
`
});
