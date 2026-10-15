// D01's staged contract: not exposed by the API/catalog until the UI handoff.
// Reuse the existing validated c-function builder and grading pipeline.
import { buildGradingExercises } from './grading-exercises.mjs';

export const listMetadata = {
  id: 'ds-list-find', kind: 'concept', language: 'c', grader: 'c-function',
  concepts: ['linked-list', 'pointer-traversal', 'first-match'],
  prerequisites: ['c-pointer', 'c-struct-array-search'],
  publicExample: { input: '첫 노드', output: '1' }
};

const labels = ['빈 리스트', '하나 일치', '하나 미발견', '첫 노드', '중간 노드',
  '마지막 노드', '여러 노드 미발견', '중복 첫 일치', 'INT_MIN/INT_MAX', '반복 호출'];
export const listCases = labels.map((input, index) => ({ input, args: [String(index)], expected: '1' }));

export const listHarness = `#include <stddef.h>
#include <limits.h>
#include <stdio.h>
#include <stdlib.h>
struct Node { int value; const struct Node *next; };
const struct Node *list_find(const struct Node *head, int target);

static int check(const struct Node *head, int target, const struct Node *expected,
                 struct Node nodes[], size_t count) {
    struct Node before[4];
    for (size_t i = 0; i < count; ++i) before[i] = nodes[i];
    const struct Node *actual = list_find(head, target);
    int ok = actual == expected;
    for (size_t i = 0; i < count; ++i) {
        if (nodes[i].value != before[i].value || nodes[i].next != before[i].next) ok = 0;
    }
    return ok;
}

int main(int argc, char **argv) {
    if (argc != 2) return 2;
    struct Node nodes[4] = {{2, NULL}, {9, NULL}, {7, NULL}, {7, NULL}};
    nodes[2].next = &nodes[0];
    nodes[0].next = &nodes[3];
    nodes[3].next = &nodes[1];
    int ok;
    switch (atoi(argv[1])) {
        case 0: ok = check(NULL, 7, NULL, nodes, 4); break;
        case 1: ok = check(&nodes[1], 9, &nodes[1], nodes, 4); break;
        case 2: ok = check(&nodes[1], 7, NULL, nodes, 4); break;
        case 3: ok = check(&nodes[2], 7, &nodes[2], nodes, 4); break;
        case 4: ok = check(&nodes[2], 2, &nodes[0], nodes, 4); break;
        case 5: ok = check(&nodes[2], 9, &nodes[1], nodes, 4); break;
        case 6: ok = check(&nodes[2], -1, NULL, nodes, 4); break;
        case 7:
            nodes[1].value = 7;
            ok = check(&nodes[2], 7, &nodes[2], nodes, 4);
            break;
        case 8:
            nodes[2].value = INT_MIN;
            nodes[1].value = INT_MAX;
            ok = check(&nodes[2], INT_MIN, &nodes[2], nodes, 4);
            ok = check(&nodes[2], INT_MAX, &nodes[1], nodes, 4) && ok;
            break;
        case 9:
            ok = check(&nodes[2], 9, &nodes[1], nodes, 4);
            ok = check(&nodes[2], 7, &nodes[2], nodes, 4) && ok;
            ok = check(NULL, 9, NULL, nodes, 4) && ok;
            break;
        default: return 2;
    }
    printf("%d\\n", ok);
    return 0;
}
`;

export const listExercise = buildGradingExercises(
  [listMetadata], { 'ds-list-find': listCases }, { 'ds-list-find': listHarness }
).get('ds-list-find');
