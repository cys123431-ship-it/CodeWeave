// E02 preparation: shared C function contract, not a production registration.
import { buildGradingExercises } from './exercise-contract.mjs';

export const sortMetadata = {
  id: 'algo-stable-insertion', kind: 'practice', language: 'c', grader: 'c-function',
  concepts: ['stable-sort', 'insertion-sort', 'operation-counts', 'prefix-boundary'],
  prerequisites: ['c-array', 'c-functions', 'c-struct-array-sort'],
  publicExample: { input: '{2:20,1:10,2:21}', output: '1 2 3 1:10 2:20 2:21' }
};
export const sortCases = [
  '빈 범위', '한 원소', sortMetadata.publicExample.input, '정렬된 8개', '역순 8개',
  '같은 키와 입력 태그 순서', 'INT_MIN/INT_MAX와 중복', '잘못된 길이·NULL과 실패 보존',
  '접두부 정렬과 뒤쪽 보존', '반복 호출·독립 객체·빈 범위'
].map((input, index) => ({ input, expected: index === 2 ? sortMetadata.publicExample.output : '1', args: [String(index)] }));

export const sortStarter = `#include <stddef.h>
struct SortItem { int key; int tag; };
int stable_sort_counted(struct SortItem items[], size_t count,
                        size_t *out_comparisons, size_t *out_moves) {
    (void)items;
    (void)count;
    (void)out_comparisons;
    (void)out_moves;
    /* TODO: 입력 검증, 안정 삽입 정렬, 횟수 공개 */
    return 0;
}
`;

export const sortHarness = `#include <stddef.h>
#include <stdint.h>
#include <limits.h>
#include <stdio.h>
#include <stdlib.h>

struct SortItem { int key; int tag; };
int stable_sort_counted(struct SortItem items[], size_t count,
                        size_t *out_comparisons, size_t *out_moves);
static int same(const struct SortItem a[], const struct SortItem b[], size_t count) {
    for (size_t i = 0; i < count; ++i) {
        if (a[i].key != b[i].key || a[i].tag != b[i].tag) return 0;
    }
    return 1;
}
static int checked(struct SortItem a[], size_t count, const struct SortItem expected[],
                   size_t expected_comparisons, size_t expected_moves) {
    size_t comparisons = 777;
    size_t moves = 888;
    int status = stable_sort_counted(a, count, &comparisons, &moves);
    return status == 1 && comparisons == expected_comparisons
        && moves == expected_moves && same(a, expected, count);
}
int main(int argc, char **argv) {
    if (argc != 2) return 2;
    int ok = 1;
    switch (atoi(argv[1])) {
        case 0:
            ok = checked(NULL, 0, NULL, 0, 0);
            break;
        case 1: {
            struct SortItem a[] = {{INT_MIN, -17}};
            const struct SortItem expected[] = {{INT_MIN, -17}};
            ok = checked(a, 1, expected, 0, 0);
            break;
        }
        case 2: {
            struct SortItem a[] = {{2, 20}, {1, 10}, {2, 21}};
            size_t comparisons = 777;
            size_t moves = 888;
            int status = stable_sort_counted(a, 3, &comparisons, &moves);
            printf("%d %zu %zu %d:%d %d:%d %d:%d\\n", status, comparisons, moves,
                   a[0].key, a[0].tag, a[1].key, a[1].tag, a[2].key, a[2].tag);
            return 0;
        }
        case 3: {
            struct SortItem a[] = {{-3,0},{-3,1},{0,2},{1,3},{1,4},{2,5},{4,6},{9,7}};
            const struct SortItem expected[] = {{-3,0},{-3,1},{0,2},{1,3},{1,4},{2,5},{4,6},{9,7}};
            ok = checked(a, 8, expected, 7, 7);
            break;
        }
        case 4: {
            struct SortItem a[] = {{8,0},{7,1},{6,2},{5,3},{4,4},{3,5},{2,6},{1,7}};
            const struct SortItem expected[] = {{1,7},{2,6},{3,5},{4,4},{5,3},{6,2},{7,1},{8,0}};
            ok = checked(a, 8, expected, 28, 35);
            break;
        }
        case 5: {
            struct SortItem a[] = {{4,20},{4,10},{4,30},{4,0}};
            const struct SortItem expected[] = {{4,20},{4,10},{4,30},{4,0}};
            ok = checked(a, 4, expected, 3, 3);
            break;
        }
        case 6: {
            struct SortItem a[] = {{INT_MAX,1},{0,2},{INT_MIN,3},{INT_MAX,4}};
            const struct SortItem expected[] = {{INT_MIN,3},{0,2},{INT_MAX,1},{INT_MAX,4}};
            ok = checked(a, 4, expected, 4, 6);
            break;
        }
        case 7: {
            struct SortItem a[] = {{3,11},{1,22},{2,33}};
            const struct SortItem before[] = {{3,11},{1,22},{2,33}};
            size_t comparisons = 777;
            size_t moves = 888;
            const size_t lengths[] = {9, SIZE_MAX};
            for (size_t i = 0; i < 2; ++i) {
                ok = (stable_sort_counted(a, lengths[i], &comparisons, &moves) == 0
                    && comparisons == 777 && moves == 888 && same(a, before, 3)) && ok;
            }
            ok = (stable_sort_counted(NULL, 1, &comparisons, &moves) == 0
                && comparisons == 777 && moves == 888) && ok;
            ok = (stable_sort_counted(a, 3, NULL, &moves) == 0
                && moves == 888 && same(a, before, 3)) && ok;
            ok = (stable_sort_counted(a, 3, &comparisons, NULL) == 0
                && comparisons == 777 && same(a, before, 3)) && ok;
            ok = (stable_sort_counted(NULL, 0, NULL, &moves) == 0 && moves == 888) && ok;
            break;
        }
        case 8: {
            struct SortItem a[] = {{3,11},{1,22},{2,33},{-99,44},{77,55}};
            const struct SortItem expected[] = {{1,22},{2,33},{3,11},{-99,44},{77,55}};
            ok = checked(a, 3, expected, 3, 4) && same(a, expected, 5);
            break;
        }
        case 9: {
            struct SortItem a[] = {{2,1},{1,2},{2,3}};
            const struct SortItem expected[] = {{1,2},{2,1},{2,3}};
            struct SortItem other[] = {{0,9},{-1,8}};
            const struct SortItem expected_other[] = {{-1,8},{0,9}};
            ok = checked(a, 3, expected, 2, 3);
            ok = checked(other, 2, expected_other, 1, 2) && ok;
            ok = checked(a, 3, expected, 2, 2) && ok;
            ok = checked(a, 0, expected, 0, 0) && same(a, expected, 3) && ok;
            break;
        }
        default: return 2;
    }
    printf("%d\\n", ok);
    return 0;
}
`;
export const sortExercise = buildGradingExercises(
  [sortMetadata], { 'algo-stable-insertion': sortCases }, { 'algo-stable-insertion': sortHarness }
).get('algo-stable-insertion');
