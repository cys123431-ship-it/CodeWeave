# D06. 이진 탐색 트리: 탐색·삽입·중위 순회

## 개요·필요성·선수·목표
정렬된 배열은 빠르게 찾을 수 있지만 중간 삽입 때 값을 옮겨야 한다. 이진 탐색 트리(BST)는 각 노드의 왼쪽에 작은 값, 오른쪽에 큰 값을 두어 연결을 따라 찾고 삽입한다.
목표는 호출자가 보유한 노드를 중복 없이 연결하고, 한쪽 경로 탐색과 용량 제한 중위 순회를 구현하는 것이다. 선수는 포인터, 구조체, 재귀, D01의 읽기 전용 탐색이다. 예상 30분.
이번 원고와 10사례 채점은 준비 범위다. 화면·정적 도식·퀴즈·실제 제출/수정·숙달 연결은 다음 실행에서 검증한다.

## 이론: 순서 불변식
모든 노드에서 왼쪽 하위 트리의 값은 현재 값보다 작고 오른쪽 하위 트리의 값은 크다. 이 계약은 중복 값을 저장하지 않는다.
탐색 값이 현재 값보다 작으면 왼쪽만, 크면 오른쪽만 본다. 균형에 가까우면 높이가 작지만 정렬된 순서로 삽입하면 한쪽으로 기울어 연결 리스트처럼 O(n)이 된다.

## 이론: 호출자 소유 삽입
`bst_insert`는 malloc하지 않는다. 호출자가 만든 연결되지 않은 노드의 주소를 받아 빈 링크에 그대로 연결한다.
`struct BstNode **link`를 쓰면 루트와 자식 링크를 같은 방식으로 바꿀 수 있다. root·node가 NULL이거나 후보가 이미 자식을 가지거나 같은 값이 있으면 0을 반환하고 모두 보존한다.
성공 뒤 노드는 트리에 연결되지만 메모리 소유권은 여전히 호출자에게 있다. 스택 배열 노드는 트리보다 오래 살아 있어야 한다.

## 도식: 비교가 고르는 한 경로
| 현재 | 비교 | 다음 링크 |
|---:|---|---|
| 4 | 2 < 4 | 왼쪽 2 |
| 2 | 3 > 2 | 오른쪽 3 |
| 3 | 3 == 3 | 탐색 성공 / 삽입 거부 |

중위 순회는 왼쪽 → 현재 → 오른쪽이다. 순서 불변식이 유지되면 결과는 작은 값부터 정렬된다.

## 이론: 용량 제한 중위 순회
`bst_inorder`는 전체 노드 수를 반환하되 배열에는 앞에서부터 `capacity`개까지만 쓴다. 그래서 `capacity == 0`이면 `values == NULL`로 필요한 크기만 셀 수 있다.
재귀의 offset은 지금까지 방문한 전체 개수다. 기록 공간이 끝나도 나머지 트리를 방문해 전체 개수를 계산하며 배열 경계를 넘지 않는다.
이 계약은 유한하고 순환하지 않으며 순서가 올바른 트리를 받는다. 임의 포인터, 공유 노드, 순환, 너무 깊은 트리를 자동 검증하지 않는다.

## 완성 프로그램: 직접 컴파일
제출에는 main과 출력 없이 구조체와 세 공개 함수(필요한 static 도우미 포함)만 넣는다.
```c
#include <stddef.h>
struct BstNode { int value; struct BstNode *left; struct BstNode *right; };
int bst_insert(struct BstNode **root, struct BstNode *node) {
    if (root == NULL || node == NULL || node->left != NULL || node->right != NULL) return 0;
    struct BstNode **link = root;
    while (*link != NULL) {
        if (node->value == (*link)->value) return 0;
        link = node->value < (*link)->value ? &(*link)->left : &(*link)->right;
    }
    *link = node;
    return 1;
}
const struct BstNode *bst_find(const struct BstNode *root, int target) {
    while (root != NULL) {
        if (target == root->value) return root;
        root = target < root->value ? root->left : root->right;
    }
    return NULL;
}
static size_t inorder_write(const struct BstNode *root, int values[],
                            size_t capacity, size_t offset) {
    if (root == NULL) return offset;
    offset = inorder_write(root->left, values, capacity, offset);
    if (offset < capacity) values[offset] = root->value;
    ++offset;
    return inorder_write(root->right, values, capacity, offset);
}
size_t bst_inorder(const struct BstNode *root, int values[], size_t capacity) {
    return inorder_write(root, values, capacity, 0);
}
#include <stdio.h>
int main(void) {
    int input[] = {4, 2, 6, 1};
    struct BstNode nodes[4], *root = NULL;
    for (size_t i = 0; i < 4; ++i) {
        nodes[i] = (struct BstNode){input[i], NULL, NULL};
        if (!bst_insert(&root, &nodes[i])) return 1;
    }
    const struct BstNode *found = bst_find(root, 6);
    int output[4];
    size_t count = bst_inorder(root, output, 4);
    printf("found=%d\ncount=%zu\n", found != NULL ? found->value : -1, count);
    for (size_t i = 0; i < count; ++i) printf("%s%d", i ? " " : "", output[i]);
    putchar('\n');
    return 0;
}
```
컴파일: `gcc -std=c11 -Wall -Wextra -Wpedantic -Werror example.c -o example`.

## 출력과 이유
```text
found=6
count=4
1 2 4 6
```
6은 4의 오른쪽에서 찾는다. 중위 순회는 왼쪽 하위 트리 1,2를 먼저 방문한 뒤 4와 6을 기록한다.

## 흔한 오류·중간 점검
작은 값을 오른쪽에 연결하기, 중복 노드를 성공 처리하기, 이미 연결된 후보의 자식을 덮어쓰기, 전위 순회로 출력하기, capacity 뒤에 쓰기가 흔한 오류다.
중간 점검: 4,2,6,1,3을 삽입한 뒤 중위 결과는 1,2,3,4,6이고 5 탐색은 NULL이어야 한다.

## 핵심 요약·퀴즈
탐색과 삽입은 한 경로만 따라가 O(h), 중위 순회는 모든 노드를 보아 O(n)이다. h는 트리 높이이며 균형 보장은 이번 범위 밖이다.
퀴즈: BST의 값을 오름차순으로 얻는 방문 순서는? ①현재-왼쪽-오른쪽 ②왼쪽-현재-오른쪽 ③오른쪽-현재-왼쪽 ④현재만. 정답②.

## 직접 풀기·실제 테스트·개선
기초: 세 함수를 구현하고 빈 트리·루트 하나·균형 트리를 확인한다. 응용: 오름차순/내림차순 입력에서 실제 높이를 그린다.
도전: 중복·이미 연결된 후보가 트리를 바꾸지 않는지 주소로 확인하고, capacity 2에서 전체 개수와 앞의 두 값이 모두 맞는지 검사한다.
비공개 10사례는 INT_MIN/INT_MAX, 경계 보호, 독립 트리와 반복 호출까지 구분한다. 스타터의 경고 없는 컴파일은 정답 통과가 아니다.

## Mini Project
고유한 정수 책 ID를 트리에 등록하고, 특정 ID 탐색과 정렬된 목록 미리보기를 제공한다. 먼저 용량 0으로 개수를 얻고 필요한 배열을 준비하는 두 단계 호출을 시험한다.

## 복습·다음 연결
D01의 선형 탐색과 비교해 BST가 한쪽 링크만 고르는 근거를 설명하라. 입력 순서가 성능에 미치는 영향도 작은 그림으로 기록한다.
다음 회차에는 독자 정적 도식, 퀴즈 재시도, 실제 GCC 오답→수정→재제출, 백업 복원·모바일·오프라인 흐름을 연결한 뒤에만 D06 완료를 판단한다.
