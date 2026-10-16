// Prepared D02 contract. No production registration before learner handoff.
import { buildGradingExercises } from './exercise-contract.mjs';

export const stackMetadata = {
  id: 'ds-stack', kind: 'practice', language: 'c', grader: 'c-function',
  concepts: ['stack', 'lifo', 'array-implementation', 'capacity', 'failure-preservation'],
  prerequisites: ['c-array', 'c-functions'],
  publicExample: { input: 'push(2), push(5), pop', output: '1 5 1' }
};
const labels = ['빈 스택에 0 push', '마지막 빈 칸과 INT_MAX', stackMetadata.publicExample.input,
  '한 원소 INT_MIN pop', '가득 찬 push 실패 보존', '빈 pop 출력 보존',
  'NULL 스택과 NULL 출력', '길이5와 SIZE_MAX 거부', '독립 스택과 혼합 호출', '채우기·역순 비우기·재사용'];
export const stackCases = labels.map((input, i) => ({
  input, expected: i === 2 ? stackMetadata.publicExample.output : '1', args: [String(i)]
}));
export const stackStarter = `#include <stddef.h>
struct IntStack { int values[4]; size_t length; };
int stack_push(struct IntStack *stack, int value) {
    (void)stack;
    (void)value;
    /* TODO: 검증 뒤 새 원소와 길이 기록 */
    return 0;
}
int stack_pop(struct IntStack *stack, int *out_value) {
    (void)stack;
    (void)out_value;
    /* TODO: 마지막 원소를 반환하고 길이만 감소 */
    return 0;
}
`;
export const stackHarness = `#include <stdio.h>
#include <stdlib.h>
#include <stddef.h>
#include <stdint.h>
#include <limits.h>

struct IntStack { int values[4]; size_t length; };
int stack_push(struct IntStack *stack, int value);
int stack_pop(struct IntStack *stack, int *out_value);
static int same(const struct IntStack *a, const struct IntStack *b) {
    if (a->length != b->length) return 0;
    for (size_t i = 0; i < 4; ++i) if (a->values[i] != b->values[i]) return 0;
    return 1;
}
int main(int argc, char **argv) {
    if (argc != 2) return 2;
    struct IntStack s = {{91, 92, 93, 94}, 0};
    struct IntStack before;
    int out = 777;
    int ok = 1;
    switch (atoi(argv[1])) {
        case 0: {
            struct IntStack expected = {{0, 92, 93, 94}, 1};
            ok = stack_push(&s, 0) == 1 && same(&s, &expected);
            break;
        }
        case 1: {
            s.length = 3;
            struct IntStack expected = {{91, 92, 93, INT_MAX}, 4};
            ok = stack_push(&s, INT_MAX) == 1 && same(&s, &expected);
            break;
        }
        case 2: {
            ok = stack_push(&s, 2) == 1;
            ok = (stack_push(&s, 5) == 1) && ok;
            int status = stack_pop(&s, &out);
            struct IntStack expected = {{2, 5, 93, 94}, 1};
            printf("%d %d %d\\n", status, out, ok && same(&s, &expected));
            return 0;
        }
        case 3: {
            s.values[0] = INT_MIN;
            s.length = 1;
            before = s;
            before.length = 0;
            ok = stack_pop(&s, &out) == 1 && out == INT_MIN && same(&s, &before);
            break;
        }
        case 4:
            s.length = 4;
            before = s;
            ok = stack_push(&s, 5) == 0 && same(&s, &before);
            break;
        case 5:
            before = s;
            ok = stack_pop(&s, &out) == 0 && out == 777 && same(&s, &before);
            break;
        case 6:
            ok = stack_push(NULL, 8) == 0;
            ok = (stack_pop(NULL, &out) == 0 && out == 777) && ok;
            s.length = 1;
            before = s;
            ok = (stack_pop(&s, NULL) == 0 && same(&s, &before)) && ok;
            break;
        case 7: {
            const size_t lengths[] = {5, SIZE_MAX};
            for (size_t i = 0; i < 2; ++i) {
                s.length = lengths[i];
                before = s;
                ok = (stack_push(&s, 8) == 0 && same(&s, &before)) && ok;
                ok = (stack_pop(&s, &out) == 0 && out == 777 && same(&s, &before)) && ok;
            }
            break;
        }
        case 8: {
            struct IntStack other = {{11, 12, 13, 14}, 0};
            ok = stack_push(&s, -7) == 1;
            ok = (stack_push(&other, 20) == 1) && ok;
            ok = (stack_push(&s, 0) == 1) && ok;
            ok = (stack_pop(&s, &out) == 1 && out == 0) && ok;
            ok = (stack_pop(&other, &out) == 1 && out == 20) && ok;
            ok = (stack_pop(&s, &out) == 1 && out == -7) && ok;
            struct IntStack expected = {{-7, 0, 93, 94}, 0};
            struct IntStack expected_other = {{20, 12, 13, 14}, 0};
            ok = same(&s, &expected) && same(&other, &expected_other) && ok;
            break;
        }
        case 9: {
            const int values[] = {-2, 0, -2, 9};
            for (size_t i = 0; i < 4; ++i) ok = (stack_push(&s, values[i]) == 1) && ok;
            for (size_t i = 4; i > 0; --i) {
                before = s;
                before.length = i - 1;
                ok = (stack_pop(&s, &out) == 1 && out == values[i - 1] && same(&s, &before)) && ok;
            }
            before = s;
            out = 777;
            ok = (stack_pop(&s, &out) == 0 && out == 777 && same(&s, &before)) && ok;
            ok = (stack_push(&s, 42) == 1) && ok;
            ok = (stack_pop(&s, &out) == 1 && out == 42 && s.length == 0) && ok;
            break;
        }
        default: return 2;
    }
    printf("%d\\n", ok);
    return 0;
}
`;
export const stackExercise = buildGradingExercises(
  [stackMetadata], { 'ds-stack': stackCases }, { 'ds-stack': stackHarness }
).get('ds-stack');
