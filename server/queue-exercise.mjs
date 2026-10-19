// D03 preparation: this module does not register a production exercise.
import { buildGradingExercises } from './exercise-contract.mjs';

export const queueMetadata = {
  id: 'ds-queue', kind: 'practice', language: 'c', grader: 'c-function',
  concepts: ['queue', 'fifo', 'circular-index', 'capacity', 'failure-preservation'],
  prerequisites: ['c-array', 'c-functions', 'c-pointer'],
  publicExample: { input: 'enqueue(2), enqueue(5), dequeue', output: '1 2 1' }
};
const labels = [queueMetadata.publicExample.input, '빈 큐와 출력 보존', '네 번째 칸과 INT_MAX',
  '가득 찬 삽입 실패 보존', '인덱스3에서0으로 삽입', '극값 FIFO와 꺼내기 순환',
  'head4/SIZE_MAX·length5/SIZE_MAX 거부', 'NULL 큐·NULL 출력',
  '음수·0·중복 채우기/비우기20회', 'INT_MIN 삽입과 두 큐의 독립 혼합 호출'];
export const queueCases = labels.map((input, index) => ({
  input, expected: index === 0 ? queueMetadata.publicExample.output : '1', args: [String(index)]
}));
export const queueStarter = `#include <stddef.h>
struct IntQueue { int values[4]; size_t head; size_t length; };
int queue_enqueue(struct IntQueue *q, int value) {
    (void)q;
    (void)value;
    /* TODO: 상태 검증 뒤 순환 위치 한 칸에 기록 */
    return 0;
}
int queue_dequeue(struct IntQueue *q, int *out_value) {
    (void)q;
    (void)out_value;
    /* TODO: 먼저 들어온 값을 꺼내고 head를 순환 */
    return 0;
}
`;
export const queueHarness = `#include <stdio.h>
#include <stdlib.h>
#include <stddef.h>
#include <stdint.h>
#include <limits.h>
struct IntQueue { int values[4]; size_t head; size_t length; };
int queue_enqueue(struct IntQueue *q, int value);
int queue_dequeue(struct IntQueue *q, int *out_value);
static int same(const struct IntQueue *a, const struct IntQueue *b) {
    if (a->head != b->head || a->length != b->length) return 0;
    for (size_t i = 0; i < 4; ++i) if (a->values[i] != b->values[i]) return 0;
    return 1;
}
int main(int argc, char **argv) {
    if (argc != 2) return 2;
    struct IntQueue q = {{91, 92, 93, 94}, 0, 0};
    struct IntQueue before;
    int out = 777;
    int ok = 1;
    switch (atoi(argv[1])) {
        case 0: {
            ok = queue_enqueue(&q, 2) == 1;
            ok = (queue_enqueue(&q, 5) == 1) && ok;
            int status = queue_dequeue(&q, &out);
            struct IntQueue expected = {{2, 5, 93, 94}, 1, 1};
            printf("%d %d %d\\n", status, out, ok && same(&q, &expected));
            return 0;
        }
        case 1:
            q.head = 3;
            before = q;
            ok = queue_dequeue(&q, &out) == 0 && out == 777 && same(&q, &before);
            break;
        case 2: {
            q.head = 2;
            q.length = 3;
            struct IntQueue expected = {{91, INT_MAX, 93, 94}, 2, 4};
            ok = queue_enqueue(&q, INT_MAX) == 1 && same(&q, &expected);
            break;
        }
        case 3:
            q.head = 2;
            q.length = 4;
            before = q;
            ok = queue_enqueue(&q, 8) == 0 && same(&q, &before);
            break;
        case 4: {
            q.head = 3;
            q.length = 1;
            struct IntQueue expected = {{-7, 92, 93, 94}, 3, 2};
            ok = queue_enqueue(&q, -7) == 1 && same(&q, &expected);
            break;
        }
        case 5: {
            q.values[0] = INT_MAX;
            q.values[3] = INT_MIN;
            q.head = 3;
            q.length = 2;
            struct IntQueue expected = q;
            expected.head = 0;
            expected.length = 1;
            ok = queue_dequeue(&q, &out) == 1 && out == INT_MIN && same(&q, &expected);
            expected.head = 1;
            expected.length = 0;
            ok = (queue_dequeue(&q, &out) == 1 && out == INT_MAX && same(&q, &expected)) && ok;
            out = 777;
            ok = (queue_dequeue(&q, &out) == 0 && out == 777 && same(&q, &expected)) && ok;
            break;
        }
        case 6: {
            const size_t states[][2] = {{4, 1}, {SIZE_MAX, 1}, {0, 5}, {3, SIZE_MAX}};
            for (size_t i = 0; i < 4; ++i) {
                q.head = states[i][0];
                q.length = states[i][1];
                before = q;
                out = 777;
                ok = (queue_enqueue(&q, 8) == 0 && same(&q, &before)) && ok;
                ok = (queue_dequeue(&q, &out) == 0 && out == 777 && same(&q, &before)) && ok;
            }
            break;
        }
        case 7:
            ok = queue_enqueue(NULL, 8) == 0;
            ok = (queue_dequeue(NULL, &out) == 0 && out == 777) && ok;
            ok = (queue_dequeue(NULL, NULL) == 0) && ok;
            q.length = 1;
            before = q;
            ok = (queue_dequeue(&q, NULL) == 0 && same(&q, &before)) && ok;
            break;
        case 8: {
            const int values[] = {-2, 0, -2, 9};
            q.head = 3;
            struct IntQueue expected = q;
            for (size_t round = 0; round < 20; ++round) {
                for (size_t i = 0; i < 4; ++i) {
                    expected.values[(3 + i) % 4] = values[i];
                    expected.length = i + 1;
                    ok = (queue_enqueue(&q, values[i]) == 1 && same(&q, &expected)) && ok;
                }
                for (size_t i = 0; i < 4; ++i) {
                    expected.head = i % 4;
                    expected.length = 3 - i;
                    ok = (queue_dequeue(&q, &out) == 1 && out == values[i] && same(&q, &expected)) && ok;
                }
            }
            break;
        }
        case 9: {
            q.head = 2;
            struct IntQueue other = {{11, 12, 13, 14}, 1, 0};
            ok = queue_enqueue(&q, INT_MIN) == 1;
            ok = (queue_enqueue(&other, 20) == 1) && ok;
            ok = (queue_enqueue(&q, 0) == 1) && ok;
            ok = (queue_dequeue(&q, &out) == 1 && out == INT_MIN) && ok;
            ok = (queue_dequeue(&other, &out) == 1 && out == 20) && ok;
            ok = (queue_dequeue(&q, &out) == 1 && out == 0) && ok;
            struct IntQueue expected = {{91, 92, INT_MIN, 0}, 0, 0};
            struct IntQueue expected_other = {{11, 20, 13, 14}, 2, 0};
            ok = same(&q, &expected) && same(&other, &expected_other) && ok;
            break;
        }
        default: return 2;
    }
    printf("%d\\n", ok);
    return 0;
}
`;
export const queueExercise = buildGradingExercises(
  [queueMetadata], { 'ds-queue': queueCases }, { 'ds-queue': queueHarness }
).get('ds-queue');
