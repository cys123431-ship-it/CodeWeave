// D04 preparation: importing this definition never registers a public exercise.
import { buildGradingExercises } from './exercise-contract.mjs';

export const arrayListMetadata = {
  id: 'ds-array-list', kind: 'practice', language: 'c', grader: 'c-function',
  concepts: ['array-list', 'length-capacity', 'indexed-insert', 'indexed-erase', 'shift-cost'],
  prerequisites: ['c-array', 'c-functions', 'c-pointer'],
  publicExample: { input: '10 20 30: insert(1,15), erase(2)', output: '1 2 20 1 1' }
};
const labels = [arrayListMetadata.publicExample.input, '맨 앞 삽입·삭제와 이동 네 번',
  '마지막 용량 칸·끝 삭제의 이동0', '빈 배열·한 칸·0 삽입과 재사용',
  '가득 찬 삽입 거부와 상태 보존', '범위 밖 위치·NULL 출력·SIZE_MAX',
  '잘못된 길이·NULL 저장소·용량0·NULL 리스트', '극값·음수·중복의 순서 보존',
  '길이0~6의 모든 유효 위치와 물리적 여분 칸 보존', '두 리스트 독립성·반복 삽입과 삭제'];
export const arrayListCases = labels.map((input, index) => ({
  input, expected: index === 0 ? arrayListMetadata.publicExample.output : '1', args: [String(index)]
}));
export const arrayListStarter = `#include <stddef.h>
struct IntList { int *values; size_t length; size_t capacity; };
int list_insert(struct IntList *list, size_t pos, int value, size_t *moved) {
    (void)list;
    (void)pos;
    (void)value;
    (void)moved;
    /* TODO: 거부 조건을 먼저 확인한 뒤 뒤에서 앞으로 이동 */
    return 0;
}
int list_erase(struct IntList *list, size_t pos, int *out, size_t *moved) {
    (void)list;
    (void)pos;
    (void)out;
    (void)moved;
    /* TODO: 삭제할 값을 보관하고 앞에서 뒤로 이동 */
    return 0;
}
`;
export const arrayListHarness = `#include <stdio.h>
#include <stdlib.h>
#include <stddef.h>
#include <stdint.h>
#include <limits.h>
struct IntList { int *values; size_t length; size_t capacity; };
int list_insert(struct IntList *list, size_t pos, int value, size_t *moved);
int list_erase(struct IntList *list, size_t pos, int *out, size_t *moved);
static int same(const struct IntList *list, int *storage, size_t length,
                size_t capacity, const int expected[6]) {
    if (list->values != storage || list->length != length || list->capacity != capacity) return 0;
    for (size_t i = 0; i < 6; ++i) if (storage[i] != expected[i]) return 0;
    return 1;
}
static int insert_ok(struct IntList *list, size_t pos, int value) {
    int expected[6];
    size_t length = list->length, capacity = list->capacity, moved = 777;
    int *storage = list->values;
    for (size_t i = 0; i < 6; ++i) {
        expected[i] = i < pos || i > length ? storage[i]
                    : i == pos ? value : storage[i - 1];
    }
    return list_insert(list, pos, value, &moved) == 1
        && moved == length - pos && same(list, storage, length + 1, capacity, expected);
}
static int erase_ok(struct IntList *list, size_t pos) {
    int expected[6];
    size_t length = list->length, capacity = list->capacity, moved = 777;
    int *storage = list->values, out = 777, removed = storage[pos];
    for (size_t i = 0; i < 6; ++i) {
        expected[i] = i >= pos && i < length - 1 ? storage[i + 1] : storage[i];
    }
    return list_erase(list, pos, &out, &moved) == 1 && out == removed
        && moved == length - pos - 1 && same(list, storage, length - 1, capacity, expected);
}
static int insert_no(struct IntList *list, size_t pos) {
    int expected[6];
    for (size_t i = 0; i < 6; ++i) expected[i] = list->values[i];
    int *storage = list->values;
    size_t length = list->length, capacity = list->capacity, moved = 777;
    return list_insert(list, pos, 8, &moved) == 0 && moved == 777
        && same(list, storage, length, capacity, expected);
}
static int erase_no(struct IntList *list, size_t pos) {
    int expected[6];
    for (size_t i = 0; i < 6; ++i) expected[i] = list->values[i];
    int *storage = list->values, out = 888;
    size_t length = list->length, capacity = list->capacity, moved = 777;
    return list_erase(list, pos, &out, &moved) == 0 && moved == 777 && out == 888
        && same(list, storage, length, capacity, expected);
}
int main(int argc, char **argv) {
    if (argc != 2) return 2;
    int storage[6] = {10, 20, 30, 94, 95, 96};
    struct IntList list = {storage, 3, 6};
    size_t moved = 777;
    int out = 888, ok = 1;
    switch (atoi(argv[1])) {
        case 0: {
            int inserted = list_insert(&list, 1, 15, &moved);
            size_t insertion_moves = moved;
            int expected_insert[6] = {10, 15, 20, 30, 95, 96};
            ok = inserted == 1 && moved == 2 && same(&list, storage, 4, 6, expected_insert);
            int erased = list_erase(&list, 2, &out, &moved);
            int expected_erase[6] = {10, 15, 30, 30, 95, 96};
            ok = erased == 1 && out == 20 && moved == 1 && same(&list, storage, 3, 6, expected_erase) && ok;
            printf("%d %zu %d %zu %d\\n", inserted, insertion_moves, out, moved, ok);
            return 0;
        }
        case 1:
            list.length = 4;
            ok = insert_ok(&list, 0, -9);
            ok = erase_ok(&list, 0) && ok;
            break;
        case 2:
            list.length = 2;
            list.capacity = 3;
            ok = insert_ok(&list, 2, INT_MAX);
            ok = erase_ok(&list, 2) && ok;
            break;
        case 3:
            list.length = 0;
            list.capacity = 1;
            ok = erase_no(&list, 0);
            ok = insert_ok(&list, 0, 0) && ok;
            ok = erase_ok(&list, 0) && ok;
            ok = erase_no(&list, 0) && ok;
            break;
        case 4:
            list.length = 6;
            ok = insert_no(&list, 0);
            ok = insert_no(&list, 6) && ok;
            ok = insert_no(&list, SIZE_MAX) && ok;
            ok = erase_ok(&list, 5) && ok;
            break;
        case 5: {
            ok = insert_no(&list, 4) && erase_no(&list, 3);
            ok = insert_no(&list, SIZE_MAX) && erase_no(&list, SIZE_MAX) && ok;
            int expected[6] = {10, 20, 30, 94, 95, 96};
            ok = list_insert(&list, 0, 7, NULL) == 0 && same(&list, storage, 3, 6, expected) && ok;
            ok = list_erase(&list, 0, NULL, &moved) == 0 && moved == 777 && same(&list, storage, 3, 6, expected) && ok;
            ok = list_erase(&list, 0, &out, NULL) == 0 && out == 888 && same(&list, storage, 3, 6, expected) && ok;
            break;
        }
        case 6: {
            list.length = 7;
            ok = insert_no(&list, 0) && erase_no(&list, 0);
            list.length = SIZE_MAX;
            ok = insert_no(&list, 0) && erase_no(&list, 0) && ok;
            const size_t states[][2] = {{0, 6}, {0, 0}, {1, 0}};
            for (size_t i = 0; i < 3; ++i) {
                list.values = NULL;
                list.length = states[i][0];
                list.capacity = states[i][1];
                ok = list_insert(&list, 0, 8, &moved) == 0 && moved == 777 && ok;
                ok = list_erase(&list, 0, &out, &moved) == 0 && moved == 777 && out == 888 && ok;
                ok = list.values == NULL && list.length == states[i][0] && list.capacity == states[i][1] && ok;
            }
            ok = list_insert(NULL, 0, 8, &moved) == 0 && moved == 777 && ok;
            ok = list_erase(NULL, 0, &out, &moved) == 0 && moved == 777 && out == 888 && ok;
            break;
        }
        case 7:
            list.length = 0;
            ok = insert_ok(&list, 0, INT_MIN);
            ok = insert_ok(&list, 1, INT_MAX) && ok;
            ok = insert_ok(&list, 1, -3) && ok;
            ok = insert_ok(&list, 1, -3) && ok;
            ok = erase_ok(&list, 2) && ok;
            ok = erase_ok(&list, 0) && ok;
            break;
        case 8:
            for (size_t n = 0; n < 6; ++n) {
                for (size_t pos = 0; pos <= n; ++pos) {
                    for (size_t i = 0; i < 6; ++i) storage[i] = (int)i * 7 - 13;
                    list.length = n;
                    ok = insert_ok(&list, pos, 42) && ok;
                }
            }
            for (size_t n = 1; n <= 6; ++n) {
                for (size_t pos = 0; pos < n; ++pos) {
                    for (size_t i = 0; i < 6; ++i) storage[i] = (int)i * 7 - 13;
                    list.length = n;
                    ok = erase_ok(&list, pos) && ok;
                }
            }
            break;
        case 9: {
            int second[6] = {61, 62, 63, 64, 65, 66};
            struct IntList other = {second, 0, 2};
            list.length = 0;
            for (int round = 0; round < 12; ++round) {
                ok = insert_ok(&list, 0, round) && ok;
                ok = insert_ok(&other, 0, -round) && ok;
                ok = insert_ok(&list, 0, 0) && ok;
                ok = erase_ok(&other, 0) && ok;
                ok = erase_ok(&list, 1) && ok;
                ok = erase_ok(&list, 0) && ok;
            }
            break;
        }
        default: return 2;
    }
    printf("%d\\n", ok);
    return 0;
}
`;
export const arrayListExercise = buildGradingExercises(
  [arrayListMetadata], { 'ds-array-list': arrayListCases }, { 'ds-array-list': arrayListHarness }
).get('ds-array-list');
