// C08 preparation: shared qsort callback contract, not a production registration.
import { buildGradingExercises } from './exercise-contract.mjs';

export const callbackSortMetadata = {
  id: 'c-qsort-callback', kind: 'concept', language: 'c', grader: 'c-function',
  concepts: ['standard-library', 'qsort', 'function-pointer', 'comparator-contract', 'build-automation'],
  prerequisites: ['c-array', 'c-functions', 'c-pointer'],
  publicExample: { input: '{3,-1,2} · 오름차순 콜백', output: '1 -1 2 3' }
};

export const callbackSortCases = [
  callbackSortMetadata.publicExample.input,
  '빈 NULL 범위',
  'INT_MIN 한 원소',
  '내림차순 콜백',
  '절댓값·값 순서 콜백',
  '짝수 우선 콜백',
  '중복을 포함한 오름차순',
  'INT_MIN·0·INT_MAX 오름차순',
  '접두부만 정렬하고 뒤 원소 보존',
  'NULL 콜백 거부와 배열 보존',
  'NULL 배열·상한 초과 거부와 배열 보존',
  '서로 다른 콜백 반복 호출'
].map((input, index) => ({
  input,
  expected: index === 0 ? callbackSortMetadata.publicExample.output : '1',
  args: [String(index)]
}));

export const callbackSortStarter = `#include <stddef.h>
#include <stdlib.h>
int sort_ints_with(int values[], size_t count,
                   int (*compare)(const void *, const void *)) {
    (void)values;
    (void)count;
    (void)compare;
    /* TODO: 계약을 검사하고 qsort에 비교 함수를 전달 */
    return 0;
}
`;

export const callbackSortHarness = `#include <stddef.h>
#include <limits.h>
#include <stdio.h>
#include <stdlib.h>

int sort_ints_with(int values[], size_t count,
                   int (*compare)(const void *, const void *));

static int ascending(const void *left, const void *right) {
    int a = *(const int *)left, b = *(const int *)right;
    return (a > b) - (a < b);
}
static int descending(const void *left, const void *right) {
    return ascending(right, left);
}
static unsigned int magnitude(int value) {
    return value < 0 ? 0u - (unsigned int)value : (unsigned int)value;
}
static int by_magnitude_then_value(const void *left, const void *right) {
    int a = *(const int *)left, b = *(const int *)right;
    unsigned int ma = magnitude(a), mb = magnitude(b);
    if (ma != mb) return (ma > mb) - (ma < mb);
    return (a > b) - (a < b);
}
static int evens_first(const void *left, const void *right) {
    int a = *(const int *)left, b = *(const int *)right;
    unsigned int pa = (unsigned int)a & 1u, pb = (unsigned int)b & 1u;
    if (pa != pb) return (pa > pb) - (pa < pb);
    return (a > b) - (a < b);
}
static size_t calls;
static int counted_descending(const void *left, const void *right) {
    ++calls;
    return descending(left, right);
}
static int same(const int actual[], const int expected[], size_t count) {
    for (size_t i = 0; i < count; ++i) if (actual[i] != expected[i]) return 0;
    return 1;
}
static int checked(int values[], size_t count,
                   int (*compare)(const void *, const void *),
                   const int expected[]) {
    int status = sort_ints_with(values, count, compare);
    return status == 1 && same(values, expected, count);
}
int main(int argc, char **argv) {
    if (argc != 2) return 2;
    int ok = 0;
    switch (atoi(argv[1])) {
        case 0: {
            int values[] = {3, -1, 2};
            int status = sort_ints_with(values, 3, ascending);
            printf("%d %d %d %d\\n", status, values[0], values[1], values[2]);
            return 0;
        }
        case 1:
            ok = sort_ints_with(NULL, 0, ascending) == 1;
            break;
        case 2: {
            int values[] = {INT_MIN}, expected[] = {INT_MIN};
            ok = checked(values, 1, ascending, expected);
            break;
        }
        case 3: {
            int values[] = {-4, 7, 0, 7, 2}, expected[] = {7, 7, 2, 0, -4};
            ok = checked(values, 5, descending, expected);
            break;
        }
        case 4: {
            int values[] = {INT_MIN, -3, 2, -2, 0, INT_MAX};
            int expected[] = {0, -2, 2, -3, INT_MAX, INT_MIN};
            ok = checked(values, 6, by_magnitude_then_value, expected);
            break;
        }
        case 5: {
            int values[] = {5, -2, 4, -3, 0, 1};
            int expected[] = {-2, 0, 4, -3, 1, 5};
            ok = checked(values, 6, evens_first, expected);
            break;
        }
        case 6: {
            int values[] = {2, 1, 2, 1, 0, 2};
            int expected[] = {0, 1, 1, 2, 2, 2};
            ok = checked(values, 6, ascending, expected);
            break;
        }
        case 7: {
            int values[] = {INT_MAX, 0, INT_MIN, -1, 1};
            int expected[] = {INT_MIN, -1, 0, 1, INT_MAX};
            ok = checked(values, 5, ascending, expected);
            break;
        }
        case 8: {
            int values[] = {4, 1, 3, 99, -99};
            int expected[] = {1, 3, 4, 99, -99};
            ok = checked(values, 3, ascending, expected) && same(values, expected, 5);
            break;
        }
        case 9: {
            int values[] = {3, 1, 2}, before[] = {3, 1, 2};
            ok = sort_ints_with(values, 3, NULL) == 0 && same(values, before, 3);
            break;
        }
        case 10: {
            int values[] = {9,8,7,6,5,4,3,2,1};
            int before[] = {9,8,7,6,5,4,3,2,1};
            ok = sort_ints_with(NULL, 1, ascending) == 0
                && sort_ints_with(values, 9, ascending) == 0
                && same(values, before, 9);
            break;
        }
        case 11: {
            int a[] = {3,1,2}, ea[] = {1,2,3};
            int b[] = {-2,4,0}, eb[] = {4,0,-2};
            calls = 0;
            ok = checked(a, 3, ascending, ea)
                && checked(b, 3, counted_descending, eb)
                && calls > 0;
            break;
        }
        default: return 2;
    }
    printf("%d\\n", ok);
    return 0;
}
`;

export const callbackSortExercise = buildGradingExercises(
  [callbackSortMetadata],
  { [callbackSortMetadata.id]: callbackSortCases },
  { [callbackSortMetadata.id]: callbackSortHarness }
).get(callbackSortMetadata.id);
