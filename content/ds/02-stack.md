# D02 배열 스택: LIFO·용량·실패 보존

## 1. 개요·필요성·선수 지식·목표
예상25분. 배열·구조체·포인터·함수를 먼저 익힌다. 되돌리기 기록처럼 마지막에 넣은 값을 먼저 꺼내는 규칙을 C로 구현한다. 이번 범위는 용량4인 정수 배열의 push/pop이며 동적 할당·스레드 안전·연결 스택은 다루지 않는다.

## 2. 핵심 이론: LIFO와 길이
length는 마지막 인덱스가 아니라 저장한 원소 수다. 유효한 원소는 [0,length), 다음 push 위치는 length다. pop할 마지막 원소는 length-1이므로 length=0이면 먼저 실패해야 한다. 0이나 음수도 유효한 데이터이므로 반환값만으로 데이터와 실패를 구분하지 않는다.

## 3. 상태 계약과 소유권
struct IntStack은 int values[4]와 size_t length를 갖는다. 호출자가 살아 있는 쓰기 가능한 스택 객체를 제공한다. length=0..4만 정상이며4는 가득 찬 상태다. 잘못된 길이는 원소 접근 전에 거부한다. NULL도 거부하지만 임의의 잘못된 포인터를 검출하는 함수는 아니다.

## 4. 독자 정적 도식과 추적
도식 stack-bounded-lifo는 push(2)→push(5)→pop에서5가 나오고 length가2→1로 바뀌는 모습을 보여준다. 남은 유효 원소는2다. 배열의 옛5는 남아 있어도 논리적 스택 원소가 아니다. 이번 과제에서는 사용하지 않는 칸도 덮어쓰지 않는 계약을 둔다.

## 5. push: 검사 뒤 기록
NULL·length>=4이면 실패0이며 모든 멤버를 보존한다. 성공하면 values[length] 한 칸에 값을 쓰고 길이를1 늘린 뒤1을 반환한다. 가득 찬 상태에서 먼저 쓰면 배열 밖 접근이 될 수 있다. 원소 값에 산술 연산을 하지 않으므로 INT_MIN/INT_MAX도 데이터로 넣을 수 있다.

## 6. pop: 값과 성공 여부 분리
NULL 스택·NULL 출력·빈 상태·length>4는 실패0이다. 성공하면 마지막 값을 별도 출력 객체에 기록하고 길이를1 줄이며1을 반환한다. 배열 자체는 변경하지 않는다. 출력 객체는 살아 있는 쓰기 가능한 int이며 스택 객체와 겹치지 않아야 한다. 이 비중첩은 호출자 전제다. 실패 시 유효한 출력 객체의 기존 값도 보존한다.

## 7. 단계별 예제: 완성 프로그램
아래는 main이 있는 관찰용 전체 프로그램이다. 제출창에는 main 없이 구조체 정의와 두 함수만 작성한다.
```c
#include <stddef.h>
#include <stdio.h>

struct IntStack { int values[4]; size_t length; };

int stack_push(struct IntStack *stack, int value) {
    if (stack == NULL || stack->length >= 4) return 0;
    stack->values[stack->length] = value;
    ++stack->length;
    return 1;
}

int stack_pop(struct IntStack *stack, int *out_value) {
    if (stack == NULL || out_value == NULL
        || stack->length == 0 || stack->length > 4) return 0;
    int value = stack->values[stack->length - 1];
    --stack->length;
    *out_value = value;
    return 1;
}

int main(void) {
    struct IntStack stack = {{0, 0, 0, 0}, 0};
    int value = 777;
    if (!stack_push(&stack, 2) || !stack_push(&stack, 5)) return 1;
    if (!stack_pop(&stack, &value)) return 1;
    printf("%zu %d\n", stack.length, value);
    return 0;
}
```
컴파일: `gcc -std=c11 -Wall -Wextra -Wpedantic -Werror example.c -o example`.

## 8. 실제 출력과 이유
출력은 `1 5` 다음 줄바꿈이다. 두 번 넣어 length=2, 한 번 꺼내 length=1이며 마지막 값5를 얻는다. 하네스 공개 예시 `1 5 1`은 pop 성공 여부·꺼낸 값·스택 멤버 보존 검사 결과다. 함수가 printf로 만드는 출력은 아니다.

## 9. 흔한 오류와 심화
첫 원소를 꺼내면 FIFO다. length=0에서 length-1을 먼저 계산하지 않는다. pop이 실패했는데 out_value를0으로 덮어쓰거나, pop에서 배열 칸을 지우면 이 계약을 위반한다.
<details><summary>심화: 논리적 제거와 보안 삭제는 다르다</summary>
길이를 줄여도 옛 값은 배열에 남는다. 이 과제는 민감 정보의 보안 삭제가 아니며 계약상 그 칸을 유지한다. 스택 ADT 일반 정의가 모든 구현에 이 보존 정책을 강제하는 것은 아니다. 고정 길이 배열 접근 모델에서 push/pop은 시간O(1), 저장 공간은 고정4칸이다. 실패 보존 검사는 멤버별로 비교하며 구조체 패딩 바이트에 의존하지 않는다.
</details>

## 10. 중간 점검·핵심 요약·퀴즈
push(2), push(5), pop의 결과는? ①2 ②5 ③길이2 ④항상0. 정답②. 검증→한 칸 기록→길이 공개, 또는 검증→마지막 값 읽기→길이 감소→출력 기록을 구별한다. 길이와 인덱스, 성공 여부와 데이터 값도 구별한다.

## 11. 직접 풀기·기초·응용·도전·Mini Project
기초는 빈 스택에0을 넣고 꺼내기다. 응용은 두 스택을 섞어 호출해 독립 상태를 확인한다. 도전은 용량4/가득 참·빈 상태·길이5/SIZE_MAX·NULL에서 상태와 출력777을 보존하는 것이다. Mini Project는 {-2,0,-2,9}를 넣고 역순으로 꺼내 예상값/실제값 표를 작성한다. main·출력·동적 할당은 과제 함수에 넣지 않는다.

## 12. 테스트·풀이 개선·복습 연결
준비된10사례는0·극값·LIFO·용량 경계·실패 보존·독립 객체·반복 재사용을 구별한다. 스타터는 경고 없이 컴파일되지만 정답은 아니다. 실패 사례→멤버 변화 추적→수정→전체 재제출 순서로 연습한다. 기존 ds-stack 초안·퀴즈·진도 키는 화면 연결 때 보존한다. 현재 계약 준비 단계이며 실제 화면/API·백업·숙달 연결은 다음 전달 작업에서 검증한다. 다음 자료구조 단원은 D03 원형 큐의 FIFO와 순환 인덱스다.
