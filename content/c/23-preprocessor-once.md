# C06 — 전처리 매크로: 값을 한 번만 소비하기

## 개요·필요성·선수 지식·목표
예상 25분. 함수·반환값·포인터·조건 연산자부터 복습합니다.
이미 함수를 배웠는데 왜 매크로를 배울까요? 헤더의 설정 이름이나 빌드별 기능 선택을 읽으려면
실행되는 함수와 컴파일 전에 치환되는 매크로를 구분해야 합니다. 목표는 토큰 치환을 따라가고,
값 읽기를 한 번만 수행하며, #if로 선택한 코드와 실행 중 if를 구별하는 것입니다.

## 이론: 치환은 함수 호출이 아니다
`#define CW_NONNEG(value) ((value) < 0 ? 0 : (value))`는 함수 선언이 아닙니다.
`CW_NONNEG(2 + 5)`는 괄호를 유지한 비교·조건식으로 펼쳐집니다.
괄호는 연산 우선순위 문제를 줄이지만, 두 자리에 들어간 인수의 평가 횟수를 하나로 만들지는 않습니다.
일반 함수의 한 인수 식은 호출 전에 평가됩니다. 같은 인수를 본문에서 여러 번 읽는 것과 구별하세요.

## 도식: 한 번 읽고 이름 붙이기
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 90" role="img" aria-labelledby="once-title">
<title id="once-title">커서의 원래 값을 한 번 읽어 지역 변수에 저장한 뒤 매크로에 전달</title>
<rect x="5" y="20" width="140" height="50" fill="#e8eef8"/><text x="20" y="50">cursor: 7 → 8</text>
<path d="M150 45 H200 M190 38 L200 45 L190 52" fill="none" stroke="#334155"/>
<rect x="205" y="20" width="140" height="50" fill="#e8eef8"/><text x="220" y="50">once = 7</text>
<path d="M350 45 H400 M390 38 L400 45 L390 52" fill="none" stroke="#334155"/>
<rect x="405" y="20" width="150" height="50" fill="#e8eef8"/><text x="415" y="50">CW_NONNEG(once)</text>
</svg>

## 완성 프로그램: 소비와 계산 분리
아래는 example.c 전체입니다. read_next는 현재 값을 반환한 뒤 커서를 하나 증가시킵니다.
```c
#include <stdio.h>
#ifndef CW_TRACE
#define CW_TRACE 0
#endif
#define CW_NONNEG(value) ((value) < 0 ? 0 : (value))
static int read_next(int *cursor) {
    int value = *cursor;
    *cursor = value + 1;
    return value;
}
int main(void) {
    int cursor = 7;
    int once = read_next(&cursor);
    int result = CW_NONNEG(once);
#if CW_TRACE
    puts("trace: enabled");
#endif
    printf("%d %d\n", result, cursor);
    return 0;
}
```

## 실행·출력과 이유
`gcc -std=c11 -Wall -Wextra -Wpedantic -Werror example.c -o example`로 빌드합니다.
실행 출력은 `7 8` 한 줄입니다. 읽은 값은 7, 다음 위치를 표현하는 커서는 8입니다.
`-DCW_TRACE=1`을 추가해 다시 빌드하면 `trace: enabled` 다음 줄에 `7 8`이 나옵니다.
`-DCW_TRACE=0`은 정의되어 있지만 값은 0입니다. #ifdef CW_TRACE로 바꾸면 이 경우에도 메시지가 남습니다.
#if는 전처리 단계에서 코드 포함 여부를 고릅니다. 실행 중 변수 값을 판단하는 if와 다릅니다.

## 흔한 오류: 괄호만 붙이면 안전할까?
위 프로그램의 once 선언과 result 선언을 `int result = CW_NONNEG(read_next(&cursor));`로 바꿔 봅니다.
조건에서 7을 읽어 커서가 8이 되고, 선택된 양수 갈래에서 다시 8을 읽어 커서가 9가 됩니다.
이 변형의 출력은 `8 9`입니다. ?:는 조건을 먼저 평가한 뒤 선택된 갈래 하나를 평가하므로
이 예제는 정의되지 않은 동작의 출력을 억지로 예측하는 예제가 아닙니다.
반면 같은 객체를 순서가 정해지지 않은 방식으로 여러 번 변경하는 식은 작성하지 마세요.
괄호를 더 붙이는 것으로 소비 횟수는 고쳐지지 않습니다. 원래 값부터 지역 변수에 보관합니다.

## 중간 점검·핵심 요약
cursor가 -3이면 원래 함수 읽기는 몇 번인가요? once를 사용하면 항상 한 번입니다.
매크로 안에 once가 두 번 나타나도 커서는 더 변하지 않습니다.
형이 정해진 계산은 일반 함수나 static inline 함수로 옮기는 것도 선택지입니다.
inline은 인라인 최적화를 반드시 수행하라는 보장이 아닙니다.

## 퀴즈
괄호를 갖춘 CW_NONNEG에 상태를 바꾸는 함수 호출을 직접 넘길 때 옳은 설명은?
① 괄호가 있으므로 한 번만 호출된다 ② 선택되는 갈래에 따라 다시 호출될 수 있다
③ 전처리기가 함수의 반환값을 미리 계산한다 ④ 반드시 컴파일 오류가 난다
정답 ②. 전처리기는 인수의 토큰을 치환하며 함수처럼 결과를 한 번 저장해 주지 않습니다.

## 직접 풀기: take_nonnegative
제출 조각은 `int take_nonnegative(int *cursor, int *out)` 함수이며 main은 제출하지 않습니다.
cursor/out은 살아 있는 int 객체를 가리키거나 NULL입니다. 두 포인터가 같으면 거부합니다.
원래 *cursor가 -10000~10000이면 out에 원래 값과 0 중 큰 값을 쓰고 cursor를 정확히 1 증가시켜 1을 반환합니다.
NULL·같은 객체·범위 밖 값은 0을 반환하고 접근 가능한 두 객체의 기존 값을 보존합니다.
7이면 `반환1, out7, cursor8`; -3이면 `반환1, out0, cursor-2`입니다.
정규식으로 매크로 사용을 강제하지 않습니다. 중요한 것은 한 번만 소비하는 동작과 실패 시 보존입니다.
준비된 10사례는 0·음수·양끝·NULL·범위 밖·별칭·독립/연속 호출을 구분합니다.
실제 채점은 이 계약이 화면·서버에 연결된 뒤에만 가능합니다. 코드 저장·퀴즈 통과만으로 실습 숙달이 되지 않습니다.

## 기초·응용·도전·Mini Project
기초: 완성 프로그램의 cursor를 0과 -3으로 바꾸고 실행 전/후 상태를 표로 적습니다.
응용: 중복 평가 변형을 실행하고 once 방식으로 복구한 뒤 결과·호출 횟수를 비교합니다.
도전: ifdef/if를 각각 CW_TRACE=0과 1로 빌드하여 실행 중 if와 다른 점을 설명합니다.
Mini Project: 센서 값 하나를 읽어 음수는 0으로 정리하는 작은 로그를 만듭니다.
입력 범위와 소비 횟수를 먼저 적고, 설정0/1에서도 데이터 처리 결과는 같은지 검사하세요.

## 테스트·풀이 개선·복습 연결
실패했다면 원래 값/증가 뒤 값, 평가 횟수, 거부 전에 쓴 객체를 차례로 확인합니다.
테스트의 기대값을 바꾸지 말고 구현을 수정해 전체 사례를 다시 검사합니다.
함수 단원과 연결해 값 계산과 상태 변경을 분리한 이유를 설명해 봅니다.
헤더 가드(#ifndef/#define/#endif)는 다음 다중 파일 복습으로 연결하고, 공개 매크로 설계는 별도 심화로 남깁니다.

## 근거와 작성 범위
2026-10-19 GCC 공식 [중복 평가](https://gcc.gnu.org/onlinedocs/cpp/Duplication-of-Side-Effects.html),
[#if](https://gcc.gnu.org/onlinedocs/cpp/If.html), [-D](https://gcc.gnu.org/onlinedocs/cpp/Invocation.html)를 확인했습니다.
설명·도식·계약·코드는 독자 작성이며 공식 문서 예제나 교재 문제를 옮기지 않았습니다.
