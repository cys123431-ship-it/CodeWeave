// E05 preparation: importing this definition never registers a public endpoint.
import { buildGradingExercises } from './exercise-contract.mjs';

export const activitySelectionMetadata = {
  id: 'algo-activity-selection', kind: 'practice', language: 'c', grader: 'c-function',
  concepts: ['greedy-choice', 'earliest-finish', 'activity-selection', 'counterexample', 'invariant'],
  prerequisites: ['c-array', 'c-functions', 'algo-stable-insertion'],
  publicExample: { input: '[1,4) [3,5) [0,6) [5,7) [8,9) [5,9)', output: '3 0 3 4' }
};

const labels = [activitySelectionMetadata.publicExample.input, '빈 입력·NULL 허용',
  '단일 INT_MIN~INT_MAX 구간', '끝과 시작이 같은 세 구간',
  '가장 이른 시작 반례', '가장 짧은 길이 반례', '음수 시각·같은 종료 시각',
  '잘못된 구간·종료 시각 역순 거부', 'NULL·부족한 용량·17개 거부',
  '독립 입력·가드·반복 호출'];
export const activitySelectionCases = labels.map((input, index) => ({
  input, expected: index === 0 ? activitySelectionMetadata.publicExample.output : '1', args: [String(index)]
}));

export const activitySelectionStarter = `#include <stddef.h>
struct Activity { int start; int finish; };
int select_activities(const struct Activity activities[], size_t count,
                      size_t selected_indices[], size_t capacity,
                      size_t *selected_count) {
    (void)activities;
    (void)count;
    (void)selected_indices;
    (void)capacity;
    (void)selected_count;
    /* TODO: 계약 검증 뒤 종료가 가장 이른 호환 활동을 차례로 선택 */
    return 0;
}
`;

export const activitySelectionHarness = `#include <stddef.h>
#include <stdint.h>
#include <limits.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
struct Activity { int start; int finish; };
int select_activities(const struct Activity activities[], size_t count,
                      size_t selected_indices[], size_t capacity,
                      size_t *selected_count);

static int success(const struct Activity *input, size_t count,
                   const size_t *expected, size_t expected_count) {
    struct Activity copy[16];
    size_t output[18], before[18];
    for (size_t i = 0; i < 18; ++i) output[i] = before[i] = 900 + i;
    if (count > 0) memcpy(copy, input, count * sizeof *input);
    size_t written = 777;
    int status = select_activities(count == 0 ? NULL : input, count,
        count == 0 ? NULL : output + 1, count, &written);
    if (status != 1 || written != expected_count || output[0] != before[0]
        || output[count + 1] != before[count + 1]) return 0;
    for (size_t i = 0; i < expected_count; ++i) {
        if (output[i + 1] != expected[i]) return 0;
    }
    for (size_t i = expected_count; i < count; ++i) {
        if (output[i + 1] != before[i + 1]) return 0;
    }
    return count == 0 || memcmp(copy, input, count * sizeof *input) == 0;
}

static int reject(const struct Activity *input, size_t count,
                  size_t capacity, int null_mode) {
    size_t output[18], before[18];
    for (size_t i = 0; i < 18; ++i) output[i] = before[i] = 700 + i;
    size_t written = 777;
    int status = select_activities(null_mode == 1 ? NULL : input, count,
        null_mode == 2 ? NULL : output + 1, capacity,
        null_mode == 3 ? NULL : &written);
    return status == 0 && written == 777
        && memcmp(output, before, sizeof output) == 0;
}

int main(int argc, char **argv) {
    if (argc != 2) return 2;
    int ok = 1;
    switch (atoi(argv[1])) {
        case 0: {
            const struct Activity a[] = {{1,4},{3,5},{0,6},{5,7},{8,9},{5,9}};
            const size_t expected[] = {0,3,4};
            if (success(a, 6, expected, 3)) puts("3 0 3 4"); else puts("0");
            return 0;
        }
        case 1:
            ok = success(NULL, 0, NULL, 0);
            break;
        case 2: {
            const struct Activity a[] = {{INT_MIN, INT_MAX}};
            const size_t expected[] = {0};
            ok = success(a, 1, expected, 1);
            break;
        }
        case 3: {
            const struct Activity a[] = {{0,1},{1,2},{2,3}};
            const size_t expected[] = {0,1,2};
            ok = success(a, 3, expected, 3);
            break;
        }
        case 4: {
            const struct Activity a[] = {{1,2},{2,3},{3,4},{0,10}};
            const size_t expected[] = {0,1,2};
            ok = success(a, 4, expected, 3);
            break;
        }
        case 5: {
            const struct Activity a[] = {{0,3},{2,4},{3,6}};
            const size_t expected[] = {0,2};
            ok = success(a, 3, expected, 2);
            break;
        }
        case 6: {
            const struct Activity a[] = {{-5,0},{-1,0},{0,2}};
            const size_t expected[] = {0,2};
            ok = success(a, 3, expected, 2);
            break;
        }
        case 7: {
            const struct Activity zero[] = {{1,1}};
            const struct Activity reversed[] = {{0,5},{1,4}};
            ok = reject(zero, 1, 1, 0) && reject(reversed, 2, 2, 0);
            break;
        }
        case 8: {
            const struct Activity a[] = {{0,1}};
            ok = reject(a, 1, 1, 1) && reject(a, 1, 1, 2)
                && reject(a, 1, 1, 3) && reject(a, 1, 0, 0)
                && reject(a, 17, 17, 0) && reject(a, SIZE_MAX, SIZE_MAX, 0);
            break;
        }
        case 9: {
            const struct Activity first[] = {{-3,-1},{-1,2},{0,3},{3,4}};
            const struct Activity second[] = {{5,6},{4,7},{7,8}};
            const size_t expected1[] = {0,1,3};
            const size_t expected2[] = {0,2};
            for (size_t repeat = 0; repeat < 10; ++repeat) {
                ok = success(first, 4, expected1, 3) && ok;
                ok = success(second, 3, expected2, 2) && ok;
                ok = success(NULL, 0, NULL, 0) && ok;
            }
            break;
        }
        default: return 2;
    }
    printf("%d\\n", ok);
    return 0;
}
`;

export const activitySelectionExercise = buildGradingExercises(
  [activitySelectionMetadata],
  { 'algo-activity-selection': activitySelectionCases },
  { 'algo-activity-selection': activitySelectionHarness }
).get('algo-activity-selection');
