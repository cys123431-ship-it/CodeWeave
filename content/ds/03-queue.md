# D03 원형 큐: FIFO·순환 위치·실패 보존

## 1. 개요·필요성·선수 지식·목표
예상25분. 배열·구조체·포인터·함수와 D02 스택을 먼저 익힌다. 스택은 마지막 작업부터 되돌리지만, 접수한 작업은 먼저 온 순서대로 처리해야 한다. 이 FIFO 규칙을 용량4 정수 큐로 구현한다. 이번 목표는 enqueue/dequeue, 빈 상태·가득 참·순환 위치를 정확히 추적하는 것이다. 동적 확장과 다중 스레드는 다음 범위다.

## 2. 핵심 이론: FIFO와 배열 이동 비용
enqueue(2), enqueue(5), dequeue이면2를 꺼낸다. 스택의 pop 결과5와 비교하자. 매번 배열을 왼쪽으로 밀어도 FIFO는 구현할 수 있지만 원소 수만큼 복사한다. 원형 큐는 배열을 옮기지 않고 다음에 꺼낼 위치 head를 바꾸어 빈 칸을 재사용한다. 배열 자체가 원 모양의 메모리인 것은 아니다.

## 3. 상태 계약: head와 length
struct IntQueue는 int values[4], size_t head, size_t length를 갖는다. 정상 범위는 head=0..3, length=0..4다. length=0은 빈 큐,4는 가득 찬 큐다. 원소 수를 따로 보관하므로 네 칸 모두 사용한다. head가 같아도 length가 다르면 빈 큐와 가득 찬 큐를 구별할 수 있다.

## 4. 독자 정적 도식과 손 추적
queue-circular-fifo 도식은 head=3인 빈 큐에2와5를 넣는 모습을 보여준다. 물리 배열은 {5,0,0,2}지만 논리 순서는 인덱스3의2 → 인덱스0의5다. dequeue 두 번 뒤 head=1, length=0이다. 빈 큐의 head가 반드시0일 필요는 없다. 3 다음 위치를0으로 돌리는 연산이 (head+1)%4다.

## 5. enqueue: 검사 뒤 한 칸 기록
NULL·head>=4·length>=4이면 실패0이며 모든 멤버를 보존한다. 성공하면 tail=(head+length)%4 위치에만 값을 쓰고 length를1 늘린 뒤1을 반환한다. 검증을 먼저 하면 덧셈의 최댓값은6이므로 size_t의 큰 잘못된 값을 더하지 않는다. head와 다른 배열 칸은 그대로 둔다. 0·음수·중복·INT_MIN/INT_MAX도 데이터다.

## 6. dequeue: 출력과 성공 여부 분리
NULL 큐·NULL 출력·head>=4·length=0 또는 length>4이면 실패0이다. 성공 시 values[head]를 읽고 head=(head+1)%4, length를1 줄인 뒤 출력 객체에 값을 쓰며1을 반환한다. 배열 칸을 지우거나 옮기지 않는다. 실패 시 유효한 큐와 출력 객체는 모두 그대로다. 호출자는 살아 있는 쓰기 가능한 객체를 제공하고 out_value가 큐 객체와 겹치지 않게 한다. NULL 검사는 임의의 잘못된 주소까지 검출하지 않는다.

## 7. 단계별 예제: 완성 프로그램
아래는 관찰용 main까지 포함한 전체 프로그램이다. 제출창에는 구조체와 두 함수만 작성한다.
```c
#include <stddef.h>
#include <stdio.h>

struct IntQueue { int values[4]; size_t head; size_t length; };

int queue_enqueue(struct IntQueue *q, int value) {
    if (q == NULL || q->head >= 4 || q->length >= 4) return 0;
    size_t tail = (q->head + q->length) % 4;
    q->values[tail] = value;
    ++q->length;
    return 1;
}

int queue_dequeue(struct IntQueue *q, int *out_value) {
    if (q == NULL || out_value == NULL || q->head >= 4
        || q->length == 0 || q->length > 4) return 0;
    int value = q->values[q->head];
    q->head = (q->head + 1) % 4;
    --q->length;
    *out_value = value;
    return 1;
}

int main(void) {
    struct IntQueue q = {{0, 0, 0, 0}, 3, 0};
    int first = 777, second = 777;
    if (!queue_enqueue(&q, 2) || !queue_enqueue(&q, 5)) return 1;
    if (!queue_dequeue(&q, &first) || !queue_dequeue(&q, &second)) return 1;
    printf("%d %d\n", first, second);
    printf("head=%zu length=%zu\n", q.head, q.length);
    int out = 777;
    int status = queue_dequeue(&q, &out);
    printf("%d %d\n", status, out);
    return 0;
}
```
컴파일: `gcc -std=c11 -Wall -Wextra -Wpedantic -Werror example.c -o example`.

## 8. 실제 출력과 이유
```text
2 5
head=1 length=0
0 777
```
2를 먼저 넣었으므로2부터 나온다. head는3→0→1, length는2→1→0이 된다. 마지막 dequeue는 빈 큐라0을 반환하고 out의777을 보존한다. 공개 하네스의 `1 2 1`은 첫 dequeue의 성공 여부·꺼낸 값·전체 멤버 검사 결과다. 과제 함수가 직접 printf하는 출력이 아니다.

## 9. 흔한 오류와 심화
values[length]에 넣으면 head가0이 아닐 때 엉뚱한 칸을 덮어쓴다. length>=3에서 거부하면 유효한 네 번째 칸을 버린다. 마지막 원소를 꺼낸 뒤 head=0으로 초기화하는 것도 이번의 정확한 상태 계약과 다르다. 실패하기 전에 out을0으로 지우지 않는다.
<details><summary>심화: ADT와 구현 계약의 구별</summary>
FIFO 자체가 옛 배열 칸 보존이나 빈 큐 head를 강제하는 것은 아니다. 이 연습은 순환 위치를 검증하기 위해 그 동작을 계약으로 정했다. 호출당 시간O(1), 고정 공간4칸이다. 원소 수가 별도로 없는 다른 원형 큐는 한 칸을 비워 둘 수도 있지만 여기서는 해당하지 않는다. 구조체 멤버를 비교하며 패딩 바이트에는 의존하지 않는다. 이 구현은 스레드 안전 큐나 민감 정보 보안 삭제가 아니다.
</details>

## 10. 중간 점검·핵심 요약·퀴즈
head=3, length=1일 때 enqueue할 물리 인덱스는? ①3 ②0 ③1 ④4. 정답②: (3+1)%4=0이다. head는 꺼낼 위치, length는 원소 수, tail은 넣을 위치다. 검증→원소 읽기/쓰기→상태 갱신 순서를 설명해 보자.

## 11. 직접 풀기·기초·응용·도전·Mini Project
기초: 빈 큐에0을 넣고 성공 여부와 데이터0을 구별한다. 응용: head=3에서 {-2,0,-2,9}를 넣고 FIFO로 꺼내 물리 배열/논리 순서를 표로 그린다. 도전: 가득 참·빈 상태·head4/SIZE_MAX·length5/SIZE_MAX·NULL에서 멤버와 출력777이 보존되는지 확인한다. Mini Project: 두 작업 대기열을 번갈아 넣고 꺼내 서로의 순서가 섞이지 않는지 예상/실제 결과를 비교한다.

## 12. 테스트·풀이 개선·복습 연결
준비된10사례는 FIFO·네 칸 사용·3→0 순환·극값·실패 보존·반복 재사용·독립 객체를 구별한다. 스타터는 컴파일되지만 정답은 아니다. 실패 사례→head/length/배열 한 칸 추적→수정→전체 재제출 순서로 개선한다. 현재 원고·채점 계약 준비 단계이며 화면/API·퀴즈 재시도·백업·숙달은 다음 전달 작업에서 검증한다. D02 스택과 결과를 비교하고 D04 동적 배열 리스트의 이동 비용으로 연결한다.
