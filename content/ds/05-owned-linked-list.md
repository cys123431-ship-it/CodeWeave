# D05. 연결 리스트의 소유권·삽입·삭제·해제

## 개요·필요성·선수·목표
D01에서는 호출자가 보유한 노드를 읽기만 했다. 이번에는 함수가 노드를 만들고 지우므로 “누가 해제해야 하는가”까지 계약에 포함한다.
목표는 머리 앞 삽입, 첫 일치 삭제, 전체 해제를 구현하고 실패 때 기존 목록을 보존하는 것이다. 선수는 D01 순회·검색, 포인터, 구조체, malloc/free다. 예상 30분.
이번 원고와 10사례 채점은 준비 범위다. 화면·퀴즈·실제 제출/수정·숙달 연결은 다음 실행에서 검증한다.

## 이론: 머리 포인터의 주소
머리 노드 자체를 받는 `struct Node *head`만으로는 호출자의 머리를 교체할 수 없다. `struct Node **head`는 호출자가 가진 머리 포인터의 주소다.
앞 삽입은 새 노드의 next가 기존 머리를 가리키게 한 뒤 호출자의 머리를 새 노드로 바꾼다. 순서를 바꾸면 기존 목록을 잃을 수 있다.

## 이론: 소유권과 실패 보존
`list_prepend`가 malloc에 성공하면 새 노드는 목록의 소유가 된다. 호출자는 개별 노드를 free하지 않고 삭제 함수나 destroy를 사용한다.
malloc 실패 때는 머리와 기존 연결을 그대로 둔다. NULL인 머리 포인터 주소는 호출자 상태를 바꿀 방법이 없으므로 거부한다.
값0, 음수, INT_MIN/INT_MAX는 정상 데이터다. 포인터와 할당 성공 여부로 판단하며 특정 값을 실패 표식으로 쓰지 않는다.

## 이론: 링크 자체를 따라가기
첫 일치 삭제는 현재 노드가 아니라 “현재 노드를 가리키는 링크”를 따라가면 머리와 중간을 같은 코드로 처리할 수 있다.
`struct Node **link = head`로 시작하고, 불일치할 때 `link = &(*link)->next`로 이동한다.
일치하면 victim을 보관하고 `*link = victim->next`로 연결을 우회한 다음 출력값을 기록하고 victim 하나만 free한다.

## 도식: 링크 변경 표
| 단계 | head가 보는 순서 | 소유 노드 |
|---|---|---|
| 시작 | 10 → 20 → NULL | 10, 20 |
| prepend(5) | 5 → 10 → 20 → NULL | 5, 10, 20 |
| remove_first(10) | 5 → 20 → NULL | 5, 20 |
| destroy | NULL | 없음 |

삭제 전에 다음 링크를 연결해야 한다. 해제한 노드의 next를 읽는 것은 정의되지 않은 동작이다.

## 이론: 전체 해제와 멱등성
destroy는 현재 머리를 victim에 보관하고 머리를 다음 노드로 옮긴 뒤 victim을 free한다. 목록이 빌 때까지 반복한다.
마지막에 머리는 NULL이다. 다시 호출해도 아무것도 해제하지 않는 멱등 동작이므로 오류 경로 정리에 쓰기 쉽다.
이 계약은 유한하고 순환하지 않는 목록만 받는다. 공유 노드·순환 목록·이미 해제한 포인터는 호출자 계약 위반이며 자동 탐지하지 않는다.

## 완성 프로그램: 직접 컴파일
제출에는 main과 출력 없이 세 함수와 구조체만 넣는다.
```c
#include <stddef.h>
#include <stdlib.h>
struct Node { int value; struct Node *next; };
int list_prepend(struct Node **head, int value) {
    if (head == NULL) return 0;
    struct Node *node = malloc(sizeof *node);
    if (node == NULL) return 0;
    node->value = value;
    node->next = *head;
    *head = node;
    return 1;
}
int list_remove_first(struct Node **head, int target, int *removed) {
    if (head == NULL || removed == NULL) return 0;
    struct Node **link = head;
    while (*link != NULL && (*link)->value != target) link = &(*link)->next;
    if (*link == NULL) return 0;
    struct Node *victim = *link;
    *link = victim->next;
    *removed = victim->value;
    free(victim);
    return 1;
}
void list_destroy(struct Node **head) {
    if (head == NULL) return;
    while (*head != NULL) {
        struct Node *victim = *head;
        *head = victim->next;
        free(victim);
    }
}
#include <stdio.h>
static void print_list(const char *label, const struct Node *head) {
    printf("%s:", label);
    for (const struct Node *p = head; p != NULL; p = p->next) printf(" %d", p->value);
    putchar('\n');
}
int main(void) {
    struct Node *head = NULL;
    int removed = 777;
    if (!list_prepend(&head, 20) || !list_prepend(&head, 10)
        || !list_prepend(&head, 5)) {
        list_destroy(&head);
        return 1;
    }
    print_list("list", head);
    if (!list_remove_first(&head, 10, &removed)) {
        list_destroy(&head);
        return 1;
    }
    printf("removed=%d\n", removed);
    print_list("after", head);
    list_destroy(&head);
    printf("destroyed=%d\n", head == NULL);
    return 0;
}
```
컴파일: `gcc -std=c11 -Wall -Wextra -Wpedantic -Werror example.c -o example`.

## 출력과 이유
```text
list: 5 10 20
removed=10
after: 5 20
destroyed=1
```
앞 삽입은 매번 새 머리를 만들므로 입력 20,10,5가 5,10,20 순서가 된다. 삭제는 값10인 첫 노드 하나만 해제한다.

## 흔한 오류·중간 점검
새 노드를 먼저 head에 대입해 기존 머리를 잃기, malloc 실패 뒤 head 변경, victim을 free한 뒤 next 읽기, 일치 노드를 모두 삭제하기가 흔한 오류다.
removed가 NULL이거나 값을 찾지 못하면 출력값과 목록을 그대로 둔다. 성공한 삭제에서만 removed를 쓴다.
중간 점검: 7→1→7에서 target 7을 삭제하면 1→7이며 뒤의 7은 남는다.

## 핵심 요약·퀴즈
앞 삽입은 O(1), 첫 일치 삭제는 최악 O(n), 전체 해제는 O(n)이다. 각 성공 삽입은 정확히 한 번 할당되고 최종적으로 정확히 한 번 해제돼야 한다.
퀴즈: 중간 노드를 삭제할 때 free보다 먼저 해야 하는 일은? ①머리를 NULL로 설정 ②이전 링크를 다음 노드에 연결 ③값을 0으로 변경 ④다음 노드도 해제. 정답②.

## 직접 풀기·실제 테스트·개선
기초: 세 함수를 구현하고 빈 목록·머리·중간·꼬리 삭제를 확인한다. 응용: 중복 값에서 첫 노드의 주소만 사라지는지 추적한다.
도전: 할당 실패, 미발견, NULL 출력 인수에서 머리·연결·출력이 보존되는지 표로 기록한다.
비공개 10사례는 할당/해제 호출과 실제 포인터 정체성까지 검사한다. 스타터의 경고 없는 컴파일은 정답 통과가 아니다.

## Mini Project
정수 할 일 ID 목록을 앞에서 추가하고 완료한 첫 ID만 제거하는 작은 관리기를 만든다.
모든 종료 경로에서 destroy를 한 번 호출하고, 중간 실패 뒤에도 기존 목록을 출력해 보존 여부를 확인한다.

## 복습·다음 연결
D01의 읽기 전용 탐색과 비교해 왜 이번 함수에는 이중 포인터와 free가 필요한지 설명하라.
다음 회차에는 정적 소유권 도식, 퀴즈 재시도, 실제 GCC 오답→수정→재제출, 백업 복원·모바일·오프라인 흐름을 연결한 뒤에만 D05 완료를 판단한다.
