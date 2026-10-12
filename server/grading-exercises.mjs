import { exercises } from '../src/exercises.js';

const CASES = {
  'c-hello': [{input:'',expected:'Hello, CodeWeave!'}],
  'c-types': [{input:'4 7\n',expected:'11'},{input:'-5 2\n',expected:'-3'},{input:'0 0\n',expected:'0'}],
  'c-loops': [{input:'5\n',expected:'15'},{input:'0\n',expected:'0'},{input:'10\n',expected:'55'}],
  'c-array': [{input:'5\n2 9 -3 4 1\n',expected:'9'},{input:'1\n-12\n',expected:'-12'},{input:'4\n-9 -3 -5 -10\n',expected:'-3'}],
  'c-pointer': [{input:'7\n',expected:'8'},{input:'-4\n',expected:'-3'},{input:'0\n',expected:'1'}],
  'c-functions': [{input:'5 0 10\n',expected:'5'},{input:'-3 0 10\n',expected:'0'},{input:'15 0 10\n',expected:'10'},{input:'-20 -10 -1\n',expected:'-10'},{input:'-1 -10 -1\n',expected:'-1'}],
  'c-clamp-function': [
    {input:'clamp(5, 0, 10)',args:['0'],expected:'5'},
    {input:'clamp(-3, 0, 10)',args:['1'],expected:'0'},
    {input:'clamp(15, 0, 10)',args:['2'],expected:'10'},
    {input:'clamp(-20, -10, -1)',args:['3'],expected:'-10'},
    {input:'clamp(-1, -10, -1)',args:['4'],expected:'-1'}
  ],
  'c-array-max-function': [
    {input:'find_max({4, -2, 9, 1}, 4, &out)',args:['0'],expected:'1 9'},
    {input:'find_max({-7, -3, -12}, 3, &out)',args:['1'],expected:'1 -3'},
    {input:'find_max({5, 5, 2, 5}, 4, &out)',args:['2'],expected:'1 5'},
    {input:'find_max({INT_MIN, 0, INT_MAX}, 3, &out) · out == INT_MAX',args:['3'],expected:'1 1'},
    {input:'find_max({-42}, 1, &out)',args:['4'],expected:'1 -42'},
    {input:'find_max(NULL, 3, &out) · NULL 배열',args:['5'],expected:'0 77'},
    {input:'find_max({5}, 0, &out) · 길이 0',args:['6'],expected:'0 77'},
    {input:'find_max({5}, 1, NULL)',args:['7'],expected:'0'}
  ],
  'c-string-count-function': [
    {input:'count_char("banana", \'a\', &out)',args:['0'],expected:'1 3'},
    {input:'count_char("", \'a\', &out) · 빈 문자열',args:['1'],expected:'1 0'},
    {input:'count_char("mississippi", \'s\', &out)',args:['2'],expected:'1 4'},
    {input:'count_char("CodeWeave", \'e\', &out)',args:['3'],expected:'1 3'},
    {input:'count_char("AaA", \'a\', &out) · 대소문자 구분',args:['4'],expected:'1 1'},
    {input:'count_char("abc", \'z\', &out) · 대상 없음',args:['5'],expected:'1 0'},
    {input:'count_char("abc", \'\\0\', &out) · 종료 문자는 내용에서 제외',args:['6'],expected:'1 0'},
    {input:'count_char(NULL, \'a\', &out) · NULL 문자열',args:['7'],expected:'0 77'},
    {input:'count_char("abc", \'a\', NULL)',args:['8'],expected:'0'}
  ],
  'c-bounded-string-length': [
    {input:'bounded_length({\'C\', \'A\', \'T\', \'\\0\'}, 4, &out)',args:['0'],expected:'1 3'},
    {input:'bounded_length({\'\\0\'}, 1, &out) · 빈 문자열',args:['1'],expected:'1 0'},
    {input:'bounded_length({\'A\', \'B\', \'\\0\', \'X\'}, 4, &out) · 첫 종료 문자',args:['2'],expected:'1 2'},
    {input:'bounded_length({\'A\', \'B\', \'C\', \'\\0\'}, 4, &out) · 마지막 허용 칸',args:['3'],expected:'1 3'},
    {input:'bounded_length({\'A\', \'B\', \'C\'}, 3, &out) · 종료 문자 없음',args:['4'],expected:'0 77'},
    {input:'bounded_length({\'A\', \'B\', \'C\', \'\\0\'}, 3, &out) · 종료 문자가 범위 밖',args:['5'],expected:'0 77'},
    {input:'bounded_length(buffer, 0, &out) · 용량 0',args:['6'],expected:'0 77'},
    {input:'bounded_length(NULL, 4, &out)',args:['7'],expected:'0 77'},
    {input:'bounded_length(buffer, 4, NULL)',args:['8'],expected:'0'}
  ],
  'c-fgets-logical-line': [
    {input:'CAT\n',expected:'3'},
    {input:'\n',expected:'0'},
    {input:'1234567\n',expected:'7'},
    {input:'12345678\n',expected:'8'},
    {input:'abcdefghijklmnopqrstuvwxyz\n',expected:'26'},
    {input:'tail-without-newline',expected:'20'},
    {input:'',expected:'NO INPUT'},
    {input:'first\nsecond\n',expected:'5'},
    {input:'12345678901234\n',expected:'14'}
  ],
  'c-strtol-integer-input': [
    {input:'42\n',expected:'42'},
    {input:'  -42\n',expected:'-42'},
    {input:'  +23  \n',expected:'23'},
    {input:'0',expected:'0'},
    {input:'\n',expected:'INVALID'},
    {input:'   \t\n',expected:'INVALID'},
    {input:'abc\n',expected:'INVALID'},
    {input:'+\n',expected:'INVALID'},
    {input:'12xyz\n',expected:'INVALID'},
    {input:'12  xyz\n',expected:'INVALID'},
    {input:'9999999999999999999999999999999999999999\n',expected:'RANGE'},
    {input:'-9999999999999999999999999999999999999999\n',expected:'RANGE'},
    {input:'7\n99\n',expected:'7'},
    {input:'',expected:'NO INPUT'},
    {input:'9'.repeat(63)+'\n',expected:'RANGE'},
    {input:'9'.repeat(64)+'\n',expected:'TOO LONG'}
  ],
  'c-struct-student-score': [
    {input:'update_score({101, 70}, 15)',args:['0'],expected:'1 101 85'},
    {input:'update_score({102, 10}, -10) · 하한 경계',args:['1'],expected:'1 102 0'},
    {input:'update_score({103, 95}, 5) · 상한 경계',args:['2'],expected:'1 103 100'},
    {input:'update_score({104, 42}, 0)',args:['3'],expected:'1 104 42'},
    {input:'update_score({105, 90}, 11) · 상한 초과',args:['4'],expected:'0 105 90'},
    {input:'update_score({106, 10}, -11) · 하한 미만',args:['5'],expected:'0 106 10'},
    {input:'update_score({107, 101}, -1) · 잘못된 현재 상태',args:['6'],expected:'0 107 101'},
    {input:'update_score({108, -1}, 1) · 잘못된 현재 상태',args:['7'],expected:'0 108 -1'},
    {input:'update_score(NULL, 1)',args:['8'],expected:'0'},
    {input:'update_score({109, 50}, INT_MAX) · 양의 넘침 방지',args:['9'],expected:'0 109 50'},
    {input:'update_score({110, 50}, INT_MIN) · 음의 넘침 방지',args:['10'],expected:'0 110 50'}
  ],
  'c-struct-array-search': [
    {input:'find_student_index({101, 205, 309}, 3, 205, &out)',args:['0'],expected:'1 1'},
    {input:'첫 원소의 id 101 검색',args:['1'],expected:'1 0'},
    {input:'마지막 원소의 id 309 검색',args:['2'],expected:'1 2'},
    {input:'원소 하나인 배열에서 일치',args:['3'],expected:'1 0'},
    {input:'원소 하나인 배열에서 미발견',args:['4'],expected:'0 77'},
    {input:'중복 id 7의 첫 번째 위치',args:['5'],expected:'1 0'},
    {input:'세 원소 배열에서 미발견',args:['6'],expected:'0 77'},
    {input:'students == NULL',args:['7'],expected:'0 77'},
    {input:'count == 0',args:['8'],expected:'0 77'},
    {input:'out_index == NULL',args:['9'],expected:'0'},
    {input:'INT_MIN 학번도 정상 값으로 검색',args:['10'],expected:'1 1'}
  ],
  'c-struct-array-sort': [
    {input:'stable_sort_students_by_id({309:95, 101:70, 205:88}, 3)',args:['0'],expected:'1 101:70 205:88 309:95'},
    {input:'이미 정렬된 세 레코드',args:['1'],expected:'1 1:10 2:20 3:30'},
    {input:'역순 네 레코드',args:['2'],expected:'1 1:10 2:20 3:30 4:40'},
    {input:'한 레코드',args:['3'],expected:'1 42:100'},
    {input:'중복 id의 원래 순서',args:['4'],expected:'1 101:22 101:44 205:11 205:33'},
    {input:'모든 id가 같은 배열',args:['5'],expected:'1 7:10 7:20 7:30'},
    {input:'INT_MIN과 INT_MAX 관계 비교',args:['6'],expected:'1 1 1 1 11 22 33'},
    {input:'음수와 양수 학번 혼합',args:['7'],expected:'1 -5:50 -1:10 0:20 8:80'},
    {input:'NULL인 빈 범위',args:['8'],expected:'1'},
    {input:'비NULL인 빈 범위도 원본 보존',args:['9'],expected:'1 7:70'},
    {input:'양수 길이의 NULL 배열',args:['10'],expected:'0'}
  ],
  'c-multi-file': [{input:'5 0 10\n',expected:'5'},{input:'-3 0 10\n',expected:'0'},{input:'15 0 10\n',expected:'10'},{input:'-20 -10 -1\n',expected:'-10'},{input:'-1 -10 -1\n',expected:'-1'}]
};

const HARNESSES = {
  'c-clamp-function': `#include <stdio.h>
#include <stdlib.h>

int clamp(int value, int low, int high);

int main(int argc, char **argv) {
    if (argc != 2) return 70;
    switch (atoi(argv[1])) {
        case 0: printf("%d\\n", clamp(5, 0, 10)); break;
        case 1: printf("%d\\n", clamp(-3, 0, 10)); break;
        case 2: printf("%d\\n", clamp(15, 0, 10)); break;
        case 3: printf("%d\\n", clamp(-20, -10, -1)); break;
        case 4: printf("%d\\n", clamp(-1, -10, -1)); break;
        default: return 71;
    }
    return 0;
}`,
  'c-array-max-function': `#include <limits.h>
#include <stddef.h>
#include <stdio.h>
#include <stdlib.h>

int find_max(const int values[], size_t length, int *out_max);

int main(int argc, char **argv) {
    if (argc != 2) return 70;
    int out = 77;
    int status;
    switch (atoi(argv[1])) {
        case 0: { const int values[] = {4, -2, 9, 1}; status = find_max(values, 4, &out); printf("%d %d\\n", status, out); break; }
        case 1: { const int values[] = {-7, -3, -12}; status = find_max(values, 3, &out); printf("%d %d\\n", status, out); break; }
        case 2: { const int values[] = {5, 5, 2, 5}; status = find_max(values, 4, &out); printf("%d %d\\n", status, out); break; }
        case 3: { const int values[] = {INT_MIN, 0, INT_MAX}; status = find_max(values, 3, &out); printf("%d %d\\n", status, out == INT_MAX); break; }
        case 4: { const int values[] = {-42}; status = find_max(values, 1, &out); printf("%d %d\\n", status, out); break; }
        case 5: status = find_max(NULL, 3, &out); printf("%d %d\\n", status, out); break;
        case 6: { const int values[] = {5}; status = find_max(values, 0, &out); printf("%d %d\\n", status, out); break; }
        case 7: { const int values[] = {5}; status = find_max(values, 1, NULL); printf("%d\\n", status); break; }
        default: return 71;
    }
    return 0;
}`,
  'c-string-count-function': `#include <stddef.h>
#include <stdio.h>
#include <stdlib.h>

int count_char(const char *text, char target, size_t *out_count);

int main(int argc, char **argv) {
    if (argc != 2) return 70;
    size_t out = 77;
    int status;
    switch (atoi(argv[1])) {
        case 0: status = count_char("banana", 'a', &out); printf("%d %zu\\n", status, out); break;
        case 1: status = count_char("", 'a', &out); printf("%d %zu\\n", status, out); break;
        case 2: status = count_char("mississippi", 's', &out); printf("%d %zu\\n", status, out); break;
        case 3: status = count_char("CodeWeave", 'e', &out); printf("%d %zu\\n", status, out); break;
        case 4: status = count_char("AaA", 'a', &out); printf("%d %zu\\n", status, out); break;
        case 5: status = count_char("abc", 'z', &out); printf("%d %zu\\n", status, out); break;
        case 6: status = count_char("abc", '\\0', &out); printf("%d %zu\\n", status, out); break;
        case 7: status = count_char(NULL, 'a', &out); printf("%d %zu\\n", status, out); break;
        case 8: status = count_char("abc", 'a', NULL); printf("%d\\n", status); break;
        default: return 71;
    }
    return 0;
}`,
  'c-bounded-string-length': `#include <stddef.h>
#include <stdio.h>
#include <stdlib.h>

int bounded_length(const char *buffer, size_t capacity, size_t *out_length);

int main(int argc, char **argv) {
    if (argc != 2) return 70;
    size_t out = 77;
    int status;
    switch (atoi(argv[1])) {
        case 0: { const char buffer[] = {'C', 'A', 'T', '\\0'}; status = bounded_length(buffer, 4, &out); printf("%d %zu\\n", status, out); break; }
        case 1: { const char buffer[] = {'\\0'}; status = bounded_length(buffer, 1, &out); printf("%d %zu\\n", status, out); break; }
        case 2: { const char buffer[] = {'A', 'B', '\\0', 'X'}; status = bounded_length(buffer, 4, &out); printf("%d %zu\\n", status, out); break; }
        case 3: { const char buffer[] = {'A', 'B', 'C', '\\0'}; status = bounded_length(buffer, 4, &out); printf("%d %zu\\n", status, out); break; }
        case 4: { const char buffer[] = {'A', 'B', 'C'}; status = bounded_length(buffer, 3, &out); printf("%d %zu\\n", status, out); break; }
        case 5: { const char buffer[] = {'A', 'B', 'C', '\\0'}; status = bounded_length(buffer, 3, &out); printf("%d %zu\\n", status, out); break; }
        case 6: { const char buffer[] = {'\\0'}; status = bounded_length(buffer, 0, &out); printf("%d %zu\\n", status, out); break; }
        case 7: status = bounded_length(NULL, 4, &out); printf("%d %zu\\n", status, out); break;
        case 8: { const char buffer[] = {'A', '\\0'}; status = bounded_length(buffer, 2, NULL); printf("%d\\n", status); break; }
        default: return 71;
    }
    return 0;
}`,
  'c-struct-student-score': `#include <limits.h>
#include <stdio.h>
#include <stdlib.h>

struct Student {
    int id;
    int score;
};

int update_score(struct Student *student, int delta);

int main(int argc, char **argv) {
    if (argc != 2) return 70;
    int status;
    switch (atoi(argv[1])) {
        case 0: { struct Student student = {101, 70}; status = update_score(&student, 15); printf("%d %d %d\\n", status, student.id, student.score); break; }
        case 1: { struct Student student = {102, 10}; status = update_score(&student, -10); printf("%d %d %d\\n", status, student.id, student.score); break; }
        case 2: { struct Student student = {103, 95}; status = update_score(&student, 5); printf("%d %d %d\\n", status, student.id, student.score); break; }
        case 3: { struct Student student = {104, 42}; status = update_score(&student, 0); printf("%d %d %d\\n", status, student.id, student.score); break; }
        case 4: { struct Student student = {105, 90}; status = update_score(&student, 11); printf("%d %d %d\\n", status, student.id, student.score); break; }
        case 5: { struct Student student = {106, 10}; status = update_score(&student, -11); printf("%d %d %d\\n", status, student.id, student.score); break; }
        case 6: { struct Student student = {107, 101}; status = update_score(&student, -1); printf("%d %d %d\\n", status, student.id, student.score); break; }
        case 7: { struct Student student = {108, -1}; status = update_score(&student, 1); printf("%d %d %d\\n", status, student.id, student.score); break; }
        case 8: status = update_score(NULL, 1); printf("%d\\n", status); break;
        case 9: { struct Student student = {109, 50}; status = update_score(&student, INT_MAX); printf("%d %d %d\\n", status, student.id, student.score); break; }
        case 10: { struct Student student = {110, 50}; status = update_score(&student, INT_MIN); printf("%d %d %d\\n", status, student.id, student.score); break; }
        default: return 71;
    }
    return 0;
}`,
  'c-struct-array-search': `#include <limits.h>
#include <stddef.h>
#include <stdio.h>
#include <stdlib.h>

struct Student {
    int id;
    int score;
};

int find_student_index(const struct Student students[], size_t count, int target_id, size_t *out_index);

int main(int argc, char **argv) {
    if (argc != 2) return 70;
    size_t out = 77;
    int status;
    switch (atoi(argv[1])) {
        case 0: { const struct Student students[] = {{101, 70}, {205, 88}, {309, 95}}; status = find_student_index(students, 3, 205, &out); printf("%d %zu\\n", status, out); break; }
        case 1: { const struct Student students[] = {{101, 70}, {205, 88}, {309, 95}}; status = find_student_index(students, 3, 101, &out); printf("%d %zu\\n", status, out); break; }
        case 2: { const struct Student students[] = {{101, 70}, {205, 88}, {309, 95}}; status = find_student_index(students, 3, 309, &out); printf("%d %zu\\n", status, out); break; }
        case 3: { const struct Student students[] = {{42, 100}}; status = find_student_index(students, 1, 42, &out); printf("%d %zu\\n", status, out); break; }
        case 4: { const struct Student students[] = {{42, 100}}; status = find_student_index(students, 1, 9, &out); printf("%d %zu\\n", status, out); break; }
        case 5: { const struct Student students[] = {{7, 10}, {8, 20}, {7, 30}}; status = find_student_index(students, 3, 7, &out); printf("%d %zu\\n", status, out); break; }
        case 6: { const struct Student students[] = {{1, 10}, {2, 20}, {3, 30}}; status = find_student_index(students, 3, 99, &out); printf("%d %zu\\n", status, out); break; }
        case 7: status = find_student_index(NULL, 3, 1, &out); printf("%d %zu\\n", status, out); break;
        case 8: { const struct Student students[] = {{1, 10}}; status = find_student_index(students, 0, 1, &out); printf("%d %zu\\n", status, out); break; }
        case 9: { const struct Student students[] = {{1, 10}}; status = find_student_index(students, 1, 1, NULL); printf("%d\\n", status); break; }
        case 10: { const struct Student students[] = {{0, 10}, {INT_MIN, 20}, {INT_MAX, 30}}; status = find_student_index(students, 3, INT_MIN, &out); printf("%d %zu\\n", status, out); break; }
        default: return 71;
    }
    return 0;
}`,
  'c-struct-array-sort': `#include <limits.h>
#include <stddef.h>
#include <stdio.h>
#include <stdlib.h>

struct Student {
    int id;
    int score;
};

int stable_sort_students_by_id(struct Student students[], size_t count);

static void print_students(int status, const struct Student students[], size_t count) {
    printf("%d", status);
    for (size_t i = 0; i < count; ++i) printf(" %d:%d", students[i].id, students[i].score);
    putchar('\\n');
}

int main(int argc, char **argv) {
    if (argc != 2) return 70;
    int status;
    switch (atoi(argv[1])) {
        case 0: { struct Student a[] = {{309, 95}, {101, 70}, {205, 88}}; status = stable_sort_students_by_id(a, 3); print_students(status, a, 3); break; }
        case 1: { struct Student a[] = {{1, 10}, {2, 20}, {3, 30}}; status = stable_sort_students_by_id(a, 3); print_students(status, a, 3); break; }
        case 2: { struct Student a[] = {{4, 40}, {3, 30}, {2, 20}, {1, 10}}; status = stable_sort_students_by_id(a, 4); print_students(status, a, 4); break; }
        case 3: { struct Student a[] = {{42, 100}}; status = stable_sort_students_by_id(a, 1); print_students(status, a, 1); break; }
        case 4: { struct Student a[] = {{205, 11}, {101, 22}, {205, 33}, {101, 44}}; status = stable_sort_students_by_id(a, 4); print_students(status, a, 4); break; }
        case 5: { struct Student a[] = {{7, 10}, {7, 20}, {7, 30}}; status = stable_sort_students_by_id(a, 3); print_students(status, a, 3); break; }
        case 6: { struct Student a[] = {{INT_MAX, 33}, {INT_MIN, 11}, {0, 22}}; status = stable_sort_students_by_id(a, 3); printf("%d %d %d %d %d %d %d\\n", status, a[0].id == INT_MIN, a[1].id == 0, a[2].id == INT_MAX, a[0].score, a[1].score, a[2].score); break; }
        case 7: { struct Student a[] = {{-1, 10}, {8, 80}, {-5, 50}, {0, 20}}; status = stable_sort_students_by_id(a, 4); print_students(status, a, 4); break; }
        case 8: status = stable_sort_students_by_id(NULL, 0); printf("%d\\n", status); break;
        case 9: { struct Student a[] = {{7, 70}}; status = stable_sort_students_by_id(a, 0); print_students(status, a, 1); break; }
        case 10: status = stable_sort_students_by_id(NULL, 3); printf("%d\\n", status); break;
        default: return 71;
    }
    return 0;
}`
};

export function buildGradingExercises(metadata, casesById, harnessesById = {}) {
  if (!Array.isArray(metadata) || !casesById || typeof casesById !== 'object' || Array.isArray(casesById)
      || !harnessesById || typeof harnessesById !== 'object' || Array.isArray(harnessesById)) {
    throw new Error('채점 메타데이터와 사례 객체가 필요합니다.');
  }
  const byId = new Map(metadata.map(exercise => [exercise.id, exercise]));
  for (const id of Object.keys(casesById)) {
    if (!byId.get(id)?.grader) throw new Error(`${id}: 채점 불가 문제에 사례가 등록되었습니다.`);
  }
  for (const id of Object.keys(harnessesById)) {
    if (byId.get(id)?.grader !== 'c-function') throw new Error(`${id}: 함수형이 아닌 문제에 하네스가 등록되었습니다.`);
  }
  const result = new Map();
  for (const exercise of metadata) {
    if (exercise.grader === null) continue;
    const harness = harnessesById[exercise.id];
    if (exercise.grader === 'c-function' && (typeof harness !== 'string' || harness.trim() === '')) {
      throw new Error(`${exercise.id}: 함수 채점 하네스 누락입니다.`);
    }
    if (exercise.grader !== 'c-function' && harness !== undefined) {
      throw new Error(`${exercise.id}: 함수형이 아닌 문제에는 함수 하네스를 사용할 수 없습니다.`);
    }
    const cases = casesById[exercise.id];
    if (cases === undefined) throw new Error(`${exercise.id}: 채점 사례 누락입니다.`);
    if (!Array.isArray(cases) || cases.length === 0) throw new Error(`${exercise.id}: cases는 비어 있지 않은 배열이어야 합니다.`);
    const normalized = cases.map((testCase, index) => {
      if (!testCase || typeof testCase.input !== 'string') throw new Error(`${exercise.id} cases[${index}]: input은 문자열이어야 합니다.`);
      if (typeof testCase.expected !== 'string') throw new Error(`${exercise.id} cases[${index}]: expected는 문자열이어야 합니다.`);
      if (exercise.grader === 'c-function'
          && (!Array.isArray(testCase.args) || testCase.args.length === 0 || testCase.args.some(arg => typeof arg !== 'string'))) {
        throw new Error(`${exercise.id} cases[${index}]: args는 비어 있지 않은 문자열 배열이어야 합니다.`);
      }
      return Object.freeze({
        input: testCase.input,
        expected: testCase.expected,
        args: Object.freeze(exercise.grader === 'c-function' ? [...testCase.args] : [])
      });
    });
    result.set(exercise.id, Object.freeze({ ...exercise, harness, cases: Object.freeze(normalized) }));
  }
  return result;
}

export const gradingExercises = buildGradingExercises(exercises, CASES, HARNESSES);
