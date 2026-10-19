// E03 preparation only: importing this module never changes the runtime registry.
import { buildGradingExercises } from './exercise-contract.mjs';

export const mergeMetadata = {
  id: 'algo-merge', kind: 'practice', language: 'c', grader: 'c-function',
  concepts: ['divide-and-conquer', 'merge-sort', 'half-open-range', 'auxiliary-space'],
  prerequisites: ['c-array', 'c-functions', 'c-recursion-factorial', 'algo-stable-insertion'],
  publicExample: { input: '{5,1,4,2,3}', output: '1 2 3 4 5' }
};
const labels = [mergeMetadata.publicExample.input, '빈 NULL·길이1·보조 공간 불필요',
  '오름차순 짝수 길이', '역순 홀수 길이', '음수·0·중복', 'INT_MIN·INT_MAX',
  '최대64개', '보조 공간 NULL·부족 실패 보존', '입력 NULL·길이65/SIZE_MAX 거부',
  '부분 배열과 두 배열 반복 호출'];
export const mergeCases = labels.map((input, index) => ({
  input, expected: index === 0 ? mergeMetadata.publicExample.output : '1', args: [String(index)]
}));
export const mergeStarter = `#include <stddef.h>
int merge_sort(int *values, size_t n, int *scratch, size_t capacity) {
    (void)values;
    (void)n;
    (void)scratch;
    (void)capacity;
    /* TODO: 검증 후 구간을 나누고 scratch로 병합해 복사 */
    return 0;
}
`;
export const mergeHarness = `#include <stdio.h>
#include <stdlib.h>
#include <stddef.h>
#include <stdint.h>
#include <limits.h>
int merge_sort(int *values, size_t n, int *scratch, size_t capacity);
static int compare(const void *a, const void *b) {
    int x = *(const int *)a;
    int y = *(const int *)b;
    return (x > y) - (x < y);
}
static int equal(const int *a, const int *b, size_t n) {
    for (size_t i = 0; i < n; ++i) if (a[i] != b[i]) return 0;
    return 1;
}
static int check(const int *input, size_t n) {
    int values[68], scratch[68], expected[68], expected_scratch[68];
    for (size_t i = 0; i < 68; ++i) {
        values[i] = expected[i] = 719;
        scratch[i] = expected_scratch[i] = -811;
    }
    for (size_t i = 0; i < n; ++i) values[i + 2] = expected[i + 2] = input[i];
    qsort(expected + 2, n, sizeof(int), compare);
    if (n >= 2) for (size_t i = 0; i < n; ++i) expected_scratch[i + 2] = expected[i + 2];
    return merge_sort(values + 2, n, scratch + 2, n) == 1
        && equal(values, expected, 68) && equal(scratch, expected_scratch, 68);
}
int main(int argc, char **argv) {
    if (argc != 2) return 2;
    int ok = 1;
    switch (atoi(argv[1])) {
        case 0: {
            const int a[] = {5, 1, 4, 2, 3};
            if (check(a, 5)) puts("1 2 3 4 5");
            else puts("0");
            return 0;
        }
        case 1: {
            int a = INT_MIN, scratch = 42;
            ok = merge_sort(NULL, 0, NULL, 0) == 1;
            ok = (merge_sort(&a, 1, NULL, 0) == 1 && a == INT_MIN) && ok;
            ok = (merge_sort(&a, 1, &scratch, 1) == 1 && a == INT_MIN && scratch == 42) && ok;
            break;
        }
        case 2: {
            const int a[] = {-3, -1, 0, 2, 4, 9};
            ok = check(a, 6);
            break;
        }
        case 3: {
            const int a[] = {9, 7, 5, 3, 1, -1, -3};
            ok = check(a, 7);
            break;
        }
        case 4: {
            const int a[] = {0, -2, 0, 4, -2, 4, 0, -2};
            const int same[] = {7, 7, 7};
            ok = check(a, 8) && check(same, 3);
            break;
        }
        case 5: {
            const int a[] = {INT_MAX, 0, INT_MIN, INT_MAX, -1, INT_MIN};
            ok = check(a, 6);
            break;
        }
        case 6: {
            int a[64];
            for (size_t i = 0; i < 64; ++i) a[i] = 63 - (int)i;
            ok = check(a, 64);
            break;
        }
        case 7: {
            int a[] = {9, 2, 1, 8}, scratch[] = {31, 32, 33, 34};
            const int before[] = {9, 2, 1, 8}, before_scratch[] = {31, 32, 33, 34};
            ok = merge_sort(a, 4, NULL, 4) == 0 && equal(a, before, 4);
            ok = (merge_sort(a, 4, scratch, 3) == 0 && equal(a, before, 4)
                && equal(scratch, before_scratch, 4)) && ok;
            break;
        }
        case 8: {
            int a[] = {3, 1}, scratch[] = {31, 32};
            const int before[] = {3, 1}, before_scratch[] = {31, 32};
            ok = merge_sort(NULL, 1, scratch, 2) == 0;
            ok = (merge_sort(NULL, 2, scratch, 2) == 0) && ok;
            ok = (merge_sort(a, 65, scratch, SIZE_MAX) == 0) && ok;
            ok = (merge_sort(a, SIZE_MAX, scratch, SIZE_MAX) == 0) && ok;
            ok = equal(a, before, 2) && equal(scratch, before_scratch, 2) && ok;
            break;
        }
        case 9: {
            int a[] = {91, 4, 1, 3, 92}, b[] = {9, -9}, scratch[] = {31, 32, 33, 34, 35};
            const int expected[] = {91, 1, 3, 4, 92}, other[] = {-9, 9};
            const int final_scratch[] = {31, 1, 3, 4, 35};
            ok = merge_sort(a + 1, 3, scratch + 1, 4) == 1 && equal(a, expected, 5);
            ok = (merge_sort(b, 2, scratch + 1, 4) == 1 && equal(b, other, 2)) && ok;
            ok = (merge_sort(a + 1, 3, scratch + 1, 4) == 1 && equal(a, expected, 5)
                && equal(scratch, final_scratch, 5)) && ok;
            break;
        }
        default: return 2;
    }
    printf("%d\\n", ok);
    return 0;
}
`;
export const mergeExercise = buildGradingExercises(
  [mergeMetadata], { 'algo-merge': mergeCases }, { 'algo-merge': mergeHarness }
).get('algo-merge');
