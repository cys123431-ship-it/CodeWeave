// E04 preparation: importing this module never registers an execution endpoint.
import { buildGradingExercises } from './exercise-contract.mjs';

export const permutationsMetadata = {
  id: 'algo-permutations', kind: 'practice', language: 'c', grader: 'c-function',
  concepts: ['recursion-tree', 'backtracking', 'choice-state', 'undo', 'permutation', 'capacity'],
  prerequisites: ['c-array', 'c-functions', 'c-pointer', 'c-recursion-factorial'],
  publicExample: { input: '{1,2,3}: swap DFS', output: '6 123 132 213 231 321 312' }
};
const labels = [permutationsMetadata.publicExample.input, '빈 순열·NULL 입력·출력 칸 보존',
  '원소1·INT_MIN', '원소2·입력 순서가 방문 순서 기준', '중복 값을 위치로 구별해6행',
  'INT_MIN·0·INT_MAX 교환', '원소4·정확한24행과 앞뒤 가드',
  '출력 용량0/5/23 거부·원본/출력 보존', 'NULL·길이5/SIZE_MAX 거부·출력 보존',
  '서로 다른 두 입력과 열거 반복·지역 상태'];
export const permutationsCases = labels.map((input, index) => ({
  input, expected: index === 0 ? permutationsMetadata.publicExample.output : '1', args: [String(index)]
}));
export const permutationsStarter = `#include <stddef.h>
int enumerate_permutations(int values[], size_t count,
                           int rows[][4], size_t capacity,
                           size_t *out_count) {
    (void)values;
    (void)count;
    (void)rows;
    (void)capacity;
    (void)out_count;
    /* TODO: 용량 검증 뒤 선택, 재귀, 원상 복원 */
    return 0;
}
`;
export const permutationsHarness = `#include <stdio.h>
#include <stdlib.h>
#include <stddef.h>
#include <stdint.h>
#include <limits.h>
int enumerate_permutations(int values[], size_t count,
                           int rows[][4], size_t capacity,
                           size_t *out_count);
static const unsigned char order1[][4] = {{0,0,0,0}};
static const unsigned char order2[][4] = {{0,1,0,0},{1,0,0,0}};
static const unsigned char order3[][4] = {
    {0,1,2,0},{0,2,1,0},{1,0,2,0},{1,2,0,0},{2,1,0,0},{2,0,1,0}
};
static const unsigned char order4[][4] = {
    {0,1,2,3},{0,1,3,2},{0,2,1,3},{0,2,3,1},{0,3,2,1},{0,3,1,2},
    {1,0,2,3},{1,0,3,2},{1,2,0,3},{1,2,3,0},{1,3,2,0},{1,3,0,2},
    {2,1,0,3},{2,1,3,0},{2,0,1,3},{2,0,3,1},{2,3,0,1},{2,3,1,0},
    {3,1,2,0},{3,1,0,2},{3,2,1,0},{3,2,0,1},{3,0,2,1},{3,0,1,2}
};
static int equal(const int *a, const int *b, size_t count) {
    for (size_t i = 0; i < count; ++i) {
        if (a[i] != b[i]) {
            return 0;
        }
    }
    return 1;
}
static int same_rows(int rows[][4], int expected[][4]) {
    for (size_t r = 0; r < 26; ++r) {
        if (!equal(rows[r], expected[r], 4)) {
            return 0;
        }
    }
    return 1;
}
static void initialize_rows(int rows[][4], int expected[][4]) {
    for (size_t r = 0; r < 26; ++r) {
        for (size_t c = 0; c < 4; ++c) {
            rows[r][c] = expected[r][c] = -1000 - (int)(r * 4 + c);
        }
    }
}
static int check(const int *input, size_t count, size_t capacity) {
    int values[6] = {71,72,73,74,75,76};
    int before[6] = {71,72,73,74,75,76};
    int rows[26][4], expected[26][4];
    initialize_rows(rows, expected);
    for (size_t i = 0; i < count; ++i) {
        values[i + 1] = before[i + 1] = input[i];
    }
    const size_t totals[] = {1,1,2,6,24};
    const unsigned char (*order)[4] = count == 4 ? order4
        : count == 3 ? order3 : count == 2 ? order2 : order1;
    for (size_t r = 0; r < totals[count]; ++r) {
        for (size_t c = 0; c < count; ++c) {
            expected[r + 1][c] = input[order[r][c]];
        }
    }
    size_t written = 777;
    int status = enumerate_permutations(input == NULL ? NULL : values + 1,
                                        count, rows + 1, capacity, &written);
    return status == 1 && written == totals[count] && equal(values, before, 6)
        && same_rows(rows, expected);
}
static int reject(size_t count, size_t capacity, int null_mode) {
    int values[6] = {71,1,2,3,4,76};
    const int before[6] = {71,1,2,3,4,76};
    int rows[26][4], expected[26][4];
    initialize_rows(rows, expected);
    size_t written = 777;
    int status = enumerate_permutations(null_mode == 1 ? NULL : values + 1,
        count, null_mode == 2 ? NULL : rows + 1, capacity,
        null_mode == 3 ? NULL : &written);
    return status == 0 && written == 777 && equal(values, before, 6)
        && same_rows(rows, expected);
}
int main(int argc, char **argv) {
    if (argc != 2) {
        return 2;
    }
    int ok = 1;
    switch (atoi(argv[1])) {
        case 0: {
            const int input[] = {1,2,3};
            if (check(input, 3, 6)) {
                puts("6 123 132 213 231 321 312");
            } else {
                puts("0");
            }
            return 0;
        }
        case 1: {
            const int input[] = {7};
            ok = check(NULL, 0, 1) && check(input, 0, 1);
            break;
        }
        case 2: {
            const int input[] = {INT_MIN};
            ok = check(input, 1, 1);
            break;
        }
        case 3: {
            const int input[] = {9,-3};
            ok = check(input, 2, 2);
            break;
        }
        case 4: {
            const int input[] = {2,2,1};
            const int same[] = {5,5,5};
            ok = check(input, 3, 6) && check(same, 3, 6);
            break;
        }
        case 5: {
            const int input[] = {INT_MIN,0,INT_MAX};
            ok = check(input, 3, 6);
            break;
        }
        case 6: {
            const int input[] = {4,-1,0,9};
            ok = check(input, 4, 24);
            break;
        }
        case 7:
            ok = reject(3, 0, 0) && reject(3, 5, 0)
                && reject(4, 23, 0) && reject(0, 0, 0);
            break;
        case 8:
            ok = reject(3, 6, 1) && reject(3, 6, 2) && reject(0, 1, 2)
                && reject(3, 6, 3) && reject(5, 24, 0)
                && reject(SIZE_MAX, SIZE_MAX, 0);
            break;
        case 9: {
            const int first[] = {-8,3,0}, second[] = {7,7};
            for (size_t repeat = 0; repeat < 10; ++repeat) {
                ok = check(first, 3, 24) && ok;
                ok = check(second, 2, 24) && ok;
                ok = check(NULL, 0, 24) && ok;
            }
            break;
        }
        default: return 2;
    }
    printf("%d\\n", ok);
    return 0;
}
`;
export const permutationsExercise = buildGradingExercises(
  [permutationsMetadata], { 'algo-permutations': permutationsCases }, { 'algo-permutations': permutationsHarness }
).get('algo-permutations');
