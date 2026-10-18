// C06 preparation only: importing this never changes the production registry.
import { buildGradingExercises } from './exercise-contract.mjs';

export const preprocessorMetadata = {
  id: 'c-preprocessor-once', kind: 'concept', language: 'c', grader: 'c-function',
  concepts: ['preprocessor', 'macro-expansion', 'single-evaluation', 'conditional-compilation', 'failure-preservation'],
  prerequisites: ['c-functions', 'c-pointer'],
  publicExample: { input: 'cursor=7, take_nonnegative(&cursor, &out)', output: '1 7 8' }
};
const labels = [preprocessorMetadata.publicExample.input, '음수도 한 번 소비', '0 소비',
  '하한 -10000', '상한 10000', 'NULL cursor 출력 보존', 'NULL out 입력 보존',
  '범위 밖 양수·음수 실패 보존', '입출력 같은 객체 거부', '연속 호출과 독립 객체'];
export const preprocessorCases = labels.map((input, index) => ({
  input, expected: index === 0 ? preprocessorMetadata.publicExample.output : '1', args: [String(index)]
}));
export const preprocessorStarter = `#include <stddef.h>
int take_nonnegative(int *cursor, int *out) {
    (void)cursor;
    (void)out;
    /* TODO: 검증 뒤 원래 값을 한 번만 소비하고 결과 기록 */
    return 0;
}
`;
export const preprocessorHarness = `#include <stdio.h>
#include <stdlib.h>
#include <stddef.h>
int take_nonnegative(int *cursor, int *out);
static int accept(int initial, int expected) {
    int cursor = initial, out = 777;
    int status = take_nonnegative(&cursor, &out);
    return status == 1 && out == expected && cursor == initial + 1;
}
static int reject_range(int initial) {
    int cursor = initial, out = 777;
    int status = take_nonnegative(&cursor, &out);
    return status == 0 && out == 777 && cursor == initial;
}
int main(int argc, char **argv) {
    if (argc != 2) return 2;
    int ok = 0;
    switch (atoi(argv[1])) {
        case 0: {
            int cursor = 7, out = 777;
            int status = take_nonnegative(&cursor, &out);
            printf("%d %d %d\\n", status, out, cursor);
            return 0;
        }
        case 1: ok = accept(-3, 0); break;
        case 2: ok = accept(0, 0); break;
        case 3: ok = accept(-10000, 0); break;
        case 4: ok = accept(10000, 10000); break;
        case 5: {
            int out = 777;
            ok = take_nonnegative(NULL, &out) == 0 && out == 777;
            ok = (take_nonnegative(NULL, NULL) == 0) && ok;
            break;
        }
        case 6: {
            int cursor = 7;
            ok = take_nonnegative(&cursor, NULL) == 0 && cursor == 7;
            break;
        }
        case 7: ok = reject_range(-10001) && reject_range(10001); break;
        case 8: {
            int cursor = 7;
            ok = take_nonnegative(&cursor, &cursor) == 0 && cursor == 7;
            break;
        }
        case 9: {
            int cursor = -1, out = 777;
            ok = 1;
            for (int value = -1; value <= 2; ++value) {
                int status = take_nonnegative(&cursor, &out);
                ok = (status == 1 && cursor == value + 1 && out == (value < 0 ? 0 : value)) && ok;
            }
            ok = accept(99, 99) && ok;
            ok = (cursor == 3 && out == 2) && ok;
            break;
        }
        default: return 2;
    }
    printf("%d\\n", ok);
    return 0;
}
`;
export const preprocessorExercise = buildGradingExercises(
  [preprocessorMetadata], { 'c-preprocessor-once': preprocessorCases },
  { 'c-preprocessor-once': preprocessorHarness }
).get('c-preprocessor-once');
