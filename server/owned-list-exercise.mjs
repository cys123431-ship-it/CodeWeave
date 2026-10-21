// D05 preparation: importing this definition never registers a public exercise.
import { buildGradingExercises } from './exercise-contract.mjs';

export const ownedListMetadata = {
  id: 'ds-owned-list', kind: 'practice', language: 'c', grader: 'c-function',
  concepts: ['linked-list', 'owned-node', 'prepend', 'first-match-removal', 'cleanup'],
  prerequisites: ['ds-list-find', 'c-dynamic-student-array', 'c-pointer'],
  publicExample: { input: '10→20에 5 삽입, 10 삭제, 전체 해제', output: '1 1 10 3 1' }
};

const labels = [ownedListMetadata.publicExample.input, '빈 목록 앞 삽입과 해제',
  '할당 실패 때 머리 보존', '미발견 때 목록·출력 보존', '머리 노드 삭제',
  '중간 노드 삭제', '꼬리 노드 삭제', '중복 값의 첫 노드만 삭제',
  'NULL 인수·빈 목록·반복 해제', 'INT_MIN/INT_MAX·독립 목록 반복'];
export const ownedListCases = labels.map((input, index) => ({
  input, expected: index === 0 ? ownedListMetadata.publicExample.output : '1', args: [String(index)]
}));

export const ownedListStarter = `#include <stddef.h>
#include <stdlib.h>
struct Node { int value; struct Node *next; };
int list_prepend(struct Node **head, int value) {
    (void)head;
    (void)value;
    /* TODO: 새 노드를 확보해 기존 머리 앞에 연결 */
    return 0;
}
int list_remove_first(struct Node **head, int target, int *removed) {
    (void)head;
    (void)target;
    (void)removed;
    /* TODO: 첫 일치 링크를 바꾸고 그 노드 하나만 해제 */
    return 0;
}
void list_destroy(struct Node **head) {
    (void)head;
    /* TODO: 모든 노드를 한 번씩 해제하고 머리를 NULL로 설정 */
}
`;

export const ownedListHarness = `#include <stddef.h>
#include <stdint.h>
#include <limits.h>
#include <stdio.h>
#include <stdlib.h>
struct Node { int value; struct Node *next; };
int list_prepend(struct Node **head, int value);
int list_remove_first(struct Node **head, int target, int *removed);
void list_destroy(struct Node **head);

void *__real_malloc(size_t size);
static size_t allocation_calls;
static size_t free_calls;
static int fail_next_allocation;
static void *freed[16];

void *__wrap_malloc(size_t size) {
    ++allocation_calls;
    if (fail_next_allocation) {
        fail_next_allocation = 0;
        return NULL;
    }
    return __real_malloc(size);
}
void __wrap_free(void *pointer) {
    if (pointer != NULL && free_calls < 16) freed[free_calls++] = pointer;
}

static struct Node *raw_node(int value, struct Node *next) {
    struct Node *node = __real_malloc(sizeof *node);
    if (node == NULL) exit(2);
    node->value = value;
    node->next = next;
    return node;
}
static int values(const struct Node *head, const int *expected, size_t count) {
    for (size_t i = 0; i < count; ++i) {
        if (head == NULL || head->value != expected[i]) return 0;
        head = head->next;
    }
    return head == NULL;
}

int main(int argc, char **argv) {
    if (argc != 2) return 2;
    struct Node *head = NULL;
    int removed = 777;
    int ok = 1;
    switch (atoi(argv[1])) {
        case 0: {
            struct Node *tail = raw_node(20, NULL);
            struct Node *first = raw_node(10, tail);
            head = first;
            int inserted = list_prepend(&head, 5);
            int erased = list_remove_first(&head, 10, &removed);
            int expected[] = {5, 20};
            ok = inserted == 1 && erased == 1 && removed == 10
                && values(head, expected, 2) && free_calls == 1 && freed[0] == first;
            list_destroy(&head);
            printf("%d %d %d %zu %d\n", inserted, erased, removed, free_calls,
                   ok && head == NULL && free_calls == 3);
            return 0;
        }
        case 1: {
            int inserted = list_prepend(&head, 42);
            struct Node *created = head;
            ok = inserted == 1 && head != NULL && head->value == 42
                && head->next == NULL && allocation_calls == 1;
            list_destroy(&head);
            ok = head == NULL && free_calls == 1 && freed[0] == created && ok;
            break;
        }
        case 2: {
            struct Node *first = raw_node(7, NULL);
            head = first;
            fail_next_allocation = 1;
            ok = list_prepend(&head, 8) == 0 && head == first
                && head->value == 7 && head->next == NULL
                && allocation_calls == 1 && free_calls == 0;
            break;
        }
        case 3: {
            struct Node *tail = raw_node(2, NULL);
            struct Node *first = raw_node(1, tail);
            head = first;
            ok = list_remove_first(&head, 9, &removed) == 0
                && head == first && head->next == tail && removed == 777 && free_calls == 0;
            break;
        }
        case 4: {
            struct Node *tail = raw_node(2, NULL);
            struct Node *first = raw_node(1, tail);
            head = first;
            ok = list_remove_first(&head, 1, &removed) == 1
                && head == tail && removed == 1 && free_calls == 1 && freed[0] == first;
            break;
        }
        case 5: {
            struct Node *tail = raw_node(3, NULL);
            struct Node *middle = raw_node(2, tail);
            struct Node *first = raw_node(1, middle);
            head = first;
            ok = list_remove_first(&head, 2, &removed) == 1
                && head == first && head->next == tail && removed == 2
                && free_calls == 1 && freed[0] == middle;
            break;
        }
        case 6: {
            struct Node *tail = raw_node(3, NULL);
            struct Node *middle = raw_node(2, tail);
            head = raw_node(1, middle);
            ok = list_remove_first(&head, 3, &removed) == 1
                && middle->next == NULL && removed == 3
                && free_calls == 1 && freed[0] == tail;
            break;
        }
        case 7: {
            struct Node *last = raw_node(7, NULL);
            struct Node *middle = raw_node(1, last);
            struct Node *first = raw_node(7, middle);
            head = first;
            ok = list_remove_first(&head, 7, &removed) == 1
                && head == middle && middle->next == last && removed == 7
                && free_calls == 1 && freed[0] == first;
            break;
        }
        case 8: {
            ok = list_prepend(NULL, 3) == 0 && allocation_calls == 0;
            ok = list_remove_first(NULL, 3, &removed) == 0 && removed == 777 && ok;
            ok = list_remove_first(&head, 3, &removed) == 0 && removed == 777 && ok;
            list_destroy(NULL);
            struct Node *only = raw_node(4, NULL);
            head = only;
            ok = list_remove_first(&head, 4, NULL) == 0 && head == only && free_calls == 0 && ok;
            list_destroy(&head);
            size_t once = free_calls;
            list_destroy(&head);
            ok = head == NULL && once == 1 && free_calls == once && freed[0] == only && ok;
            break;
        }
        case 9: {
            struct Node *a = raw_node(INT_MIN, NULL);
            struct Node *b = raw_node(INT_MAX, NULL);
            struct Node *other = b;
            head = a;
            ok = list_prepend(&head, 0) == 1;
            ok = list_remove_first(&other, INT_MAX, &removed) == 1
                && other == NULL && removed == INT_MAX && ok;
            int expected[] = {0, INT_MIN};
            ok = values(head, expected, 2) && ok;
            list_destroy(&head);
            list_destroy(&other);
            ok = head == NULL && other == NULL && allocation_calls == 1 && free_calls == 3 && ok;
            break;
        }
        default: return 2;
    }
    printf("%d\n", ok);
    return 0;
}
`;

export const ownedListExercise = buildGradingExercises(
  [ownedListMetadata], { [ownedListMetadata.id]: ownedListCases },
  { [ownedListMetadata.id]: ownedListHarness },
  { [ownedListMetadata.id]: ['-Wl,--wrap=malloc', '-Wl,--wrap=free'] }
).get(ownedListMetadata.id);
