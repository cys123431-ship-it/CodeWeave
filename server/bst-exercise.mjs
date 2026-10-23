// D06 preparation: importing this definition never registers a public endpoint.
import { buildGradingExercises } from './exercise-contract.mjs';

export const bstMetadata = {
  id: 'ds-bst', kind: 'practice', language: 'c', grader: 'c-function',
  concepts: ['binary-search-tree', 'caller-owned-node', 'insert', 'search', 'inorder'],
  prerequisites: ['ds-list-find', 'c-pointer', 'c-recursion-factorial'],
  publicExample: { input: '4, 2, 6, 1 삽입 뒤 6 탐색·중위 순회', output: '1 4 1 2 4 6' }
};

const labels = [bstMetadata.publicExample.input, '빈 트리 탐색·순회',
  '루트 하나 삽입·주소 탐색', '균형 트리 중위 순회', '오름차순 편향 트리',
  '내림차순 편향 트리', '중복 값 거부·트리 보존', '연결된 후보 거부·보존',
  'INT_MIN/INT_MAX·부분 용량', '독립 트리·용량 0·반복 탐색'];
export const bstCases = labels.map((input, index) => ({
  input, expected: index === 0 ? bstMetadata.publicExample.output : '1', args: [String(index)]
}));

export const bstStarter = `#include <stddef.h>
struct BstNode { int value; struct BstNode *left; struct BstNode *right; };
int bst_insert(struct BstNode **root, struct BstNode *node) {
    (void)root;
    (void)node;
    /* TODO: 비어 있는 링크에 호출자 소유 노드를 연결 */
    return 0;
}
const struct BstNode *bst_find(const struct BstNode *root, int target) {
    (void)root;
    (void)target;
    /* TODO: 비교 결과에 따라 한쪽 자식만 따라가기 */
    return NULL;
}
size_t bst_inorder(const struct BstNode *root, int values[], size_t capacity) {
    (void)root;
    (void)values;
    (void)capacity;
    /* TODO: 왼쪽-현재-오른쪽 순서로 기록하고 전체 개수 반환 */
    return 0;
}
`;

export const bstHarness = `#include <stddef.h>
#include <limits.h>
#include <stdio.h>
#include <stdlib.h>
struct BstNode { int value; struct BstNode *left; struct BstNode *right; };
int bst_insert(struct BstNode **root, struct BstNode *node);
const struct BstNode *bst_find(const struct BstNode *root, int target);
size_t bst_inorder(const struct BstNode *root, int values[], size_t capacity);

static int build(const int values[], size_t count, struct BstNode nodes[],
                 struct BstNode **root) {
    for (size_t i = 0; i < count; ++i) {
        nodes[i].value = values[i];
        nodes[i].left = NULL;
        nodes[i].right = NULL;
        if (!bst_insert(root, &nodes[i])) return 0;
    }
    return 1;
}
static int traversal(const struct BstNode *root, const int expected[], size_t count) {
    int output[16];
    for (size_t i = 0; i < 16; ++i) output[i] = 777;
    if (bst_inorder(root, output + 1, count) != count || output[0] != 777
        || output[count + 1] != 777) return 0;
    for (size_t i = 0; i < count; ++i) if (output[i + 1] != expected[i]) return 0;
    return 1;
}

int main(int argc, char **argv) {
    if (argc != 2) return 2;
    int ok = 1;
    switch (atoi(argv[1])) {
        case 0: {
            const int input[] = {4,2,6,1};
            const int expected[] = {1,2,4,6};
            struct BstNode nodes[4], *root = NULL;
            ok = build(input, 4, nodes, &root) && bst_find(root, 6) == &nodes[2]
                && traversal(root, expected, 4);
            if (ok) puts("1 4 1 2 4 6"); else puts("0");
            return 0;
        }
        case 1: {
            struct BstNode node = {3, NULL, NULL}, *root = NULL;
            ok = bst_find(NULL, 3) == NULL && bst_inorder(NULL, NULL, 0) == 0
                && bst_insert(NULL, &node) == 0 && bst_insert(&root, NULL) == 0
                && root == NULL && node.left == NULL && node.right == NULL;
            break;
        }
        case 2: {
            struct BstNode node = {8, NULL, NULL}, *root = NULL;
            int expected[] = {8};
            ok = bst_insert(&root, &node) == 1 && root == &node
                && bst_find(root, 8) == &node && bst_find(root, 7) == NULL
                && traversal(root, expected, 1);
            break;
        }
        case 3: {
            const int input[] = {4,2,6,1,3,5,7};
            const int expected[] = {1,2,3,4,5,6,7};
            struct BstNode nodes[7], *root = NULL;
            ok = build(input, 7, nodes, &root) && traversal(root, expected, 7)
                && bst_find(root, 5) == &nodes[5] && bst_find(root, 9) == NULL;
            break;
        }
        case 4: {
            const int input[] = {1,2,3,4,5};
            struct BstNode nodes[5], *root = NULL, *cursor;
            ok = build(input, 5, nodes, &root);
            cursor = root;
            for (size_t i = 0; i < 5 && ok; ++i) {
                ok = cursor == &nodes[i] && cursor->left == NULL;
                cursor = cursor->right;
            }
            ok = cursor == NULL && bst_find(root, 5) == &nodes[4] && ok;
            break;
        }
        case 5: {
            const int input[] = {5,4,3,2,1};
            const int expected[] = {1,2,3,4,5};
            struct BstNode nodes[5], *root = NULL;
            ok = build(input, 5, nodes, &root) && traversal(root, expected, 5)
                && root->right == NULL && root->left == &nodes[1];
            break;
        }
        case 6: {
            const int input[] = {4,2,6};
            const int expected[] = {2,4,6};
            struct BstNode nodes[3], duplicate = {2, NULL, NULL}, *root = NULL;
            ok = build(input, 3, nodes, &root);
            struct BstNode *left = root->left, *right = root->right;
            ok = bst_insert(&root, &duplicate) == 0 && root == &nodes[0]
                && root->left == left && root->right == right
                && duplicate.left == NULL && duplicate.right == NULL
                && traversal(root, expected, 3) && ok;
            break;
        }
        case 7: {
            struct BstNode child = {1, NULL, NULL};
            struct BstNode linked_left = {3, &child, NULL};
            struct BstNode linked_right = {7, NULL, &child};
            struct BstNode root_node = {5, NULL, NULL}, *root = &root_node;
            ok = bst_insert(&root, &linked_left) == 0
                && bst_insert(&root, &linked_right) == 0 && root == &root_node
                && root->left == NULL && root->right == NULL
                && linked_left.left == &child && linked_right.right == &child;
            break;
        }
        case 8: {
            const int input[] = {0,INT_MIN,INT_MAX};
            struct BstNode nodes[3], *root = NULL;
            int output[] = {111,222,333,444};
            ok = build(input, 3, nodes, &root)
                && bst_inorder(root, output + 1, 2) == 3
                && output[0] == 111 && output[1] == INT_MIN
                && output[2] == 0 && output[3] == 444;
            break;
        }
        case 9: {
            const int a[] = {10,5,15}, b[] = {-2,-4,0};
            struct BstNode an[3], bn[3], *aroot = NULL, *broot = NULL;
            ok = build(a, 3, an, &aroot) && build(b, 3, bn, &broot);
            for (size_t repeat = 0; repeat < 10; ++repeat) {
                ok = bst_find(aroot, 5) == &an[1] && bst_find(broot, 0) == &bn[2]
                    && bst_find(aroot, -4) == NULL
                    && bst_inorder(aroot, NULL, 0) == 3
                    && bst_inorder(broot, NULL, 0) == 3 && ok;
            }
            break;
        }
        default: return 2;
    }
    printf("%d\\n", ok);
    return 0;
}
`;

export const bstExercise = buildGradingExercises(
  [bstMetadata], { [bstMetadata.id]: bstCases }, { [bstMetadata.id]: bstHarness }
).get(bstMetadata.id);
