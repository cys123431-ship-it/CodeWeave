// E01 preparation. Import into the production registry only with the UI handoff.
// This module depends on the shared builder, never on the production registry.
import { buildGradingExercises } from './exercise-contract.mjs';

export const searchMetadata = {
  id: 'algo-binary', kind: 'practice', language: 'c', grader: 'c-function',
  concepts: ['linear-search', 'binary-search', 'sorted-precondition', 'half-open-range', 'first-match', 'complexity'],
  prerequisites: ['c-array', 'c-loops', 'c-array-max-function'],
  publicExample: { input: '중복: {1,3,3,3,9}, target=3', output: '1 1 1' }
};

const labels = ['빈 범위: NULL과 비NULL', '한 원소 일치', '한 원소 미발견', '첫 위치',
  '중간 위치', '끝 위치', '중간 값 미발견', searchMetadata.publicExample.input,
  'INT_MIN과 INT_MAX', '반복 호출과 정렬되지 않은 선형 입력'];
const expected = ['0 0 1\n0 0 1', '0 0 1', '1 1 1', '0 0 1', '2 2 1',
  '4 4 1', '5 5 1', '1 1 1', '3 3 1\n0 0 1', '3 3 1\n1 1 1\n1 1'];
export const searchCases = labels.map((input, index) => ({ input, args: [String(index)], expected: expected[index] }));

export const searchHarness = `#include <stddef.h>
#include <limits.h>
#include <stdio.h>
#include <stdlib.h>

size_t linear_find_first(const int values[], size_t count, int target);
size_t binary_find_first(const int values[], size_t count, int target);

static void report(const int values[], size_t count, int target) {
    int linear_input[5];
    int binary_input[5];
    for (size_t i = 0; i < 5; ++i) {
        linear_input[i] = i < count ? values[i] : 77;
        binary_input[i] = linear_input[i];
    }
    size_t a = linear_find_first(values == NULL ? NULL : linear_input, count, target);
    size_t b = binary_find_first(values == NULL ? NULL : binary_input, count, target);
    int preserved = 1;
    for (size_t i = 0; i < 5; ++i) {
        int before = i < count ? values[i] : 77;
        if (linear_input[i] != before || binary_input[i] != before) preserved = 0;
    }
    printf("%zu %zu %d\\n", a, b, preserved);
}

int main(int argc, char **argv) {
    if (argc != 2) return 2;
    int values[5] = {1, 3, 5, 7, 9};
    switch (atoi(argv[1])) {
        case 0:
            report(NULL, 0, 3);
            report(values, 0, 3);
            break;
        case 1: report(values, 1, 1); break;
        case 2: report(values, 1, 2); break;
        case 3: report(values, 5, 1); break;
        case 4: report(values, 5, 5); break;
        case 5: report(values, 5, 9); break;
        case 6: report(values, 5, 4); break;
        case 7:
            values[2] = 3;
            values[3] = 3;
            report(values, 5, 3);
            break;
        case 8:
            values[0] = INT_MIN;
            values[1] = -1;
            values[2] = 0;
            values[3] = INT_MAX;
            report(values, 4, INT_MAX);
            report(values, 4, INT_MIN);
            break;
        case 9: {
            values[2] = 3;
            report(values, 5, 7);
            report(values, 5, 3);
            int unordered[4] = {9, 2, 9, 0};
            size_t index = linear_find_first(unordered, 4, 2);
            int preserved = unordered[0] == 9 && unordered[1] == 2
                && unordered[2] == 9 && unordered[3] == 0;
            printf("%zu %d\\n", index, preserved);
            break;
        }
        default: return 2;
    }
    return 0;
}
`;

export const searchExercise = buildGradingExercises(
  [searchMetadata], { 'algo-binary': searchCases }, { 'algo-binary': searchHarness }
).get('algo-binary');
