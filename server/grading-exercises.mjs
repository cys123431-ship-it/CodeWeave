import { exercises } from '../src/exercises.js';

const CASES = {
  'c-hello': [{input:'',expected:'Hello, CodeWeave!'}],
  'c-types': [{input:'4 7\n',expected:'11'},{input:'-5 2\n',expected:'-3'},{input:'0 0\n',expected:'0'},{input:'10000 10000\n',expected:'20000'},{input:'-10000 -10000\n',expected:'-20000'}],
  'c-loops': [{input:'5\n',expected:'15'},{input:'0\n',expected:'0'},{input:'1\n',expected:'1'},{input:'10\n',expected:'55'},{input:'1000\n',expected:'500500'}],
  'c-array': [
    {input:'5\n2 9 -3 4 1\n',expected:'9'},
    {input:'1\n-12\n',expected:'-12'},
    {input:'4\n-9 -3 -5 -10\n',expected:'-3'},
    {input:'20\n-20 -19 -18 -17 -16 -15 -14 -13 -12 -11 -10 -9 -8 -7 -6 -5 -4 -3 -2 -1\n',expected:'-1'},
    {input:'4\n9 2 -3 1\n',expected:'9'},
    {input:'6\n-7 0 -7 0 -9 -2\n',expected:'0'},
    {input:'3\n-32767 0 32767\n',expected:'32767'}
  ],
  'c-pointer': [{input:'7\n',expected:'8'},{input:'-4\n',expected:'-3'},{input:'0\n',expected:'1'},{input:'9999\n',expected:'10000'},{input:'-10000\n',expected:'-9999'}],
  'c-functions': [{input:'5 0 10\n',expected:'5'},{input:'-3 0 10\n',expected:'0'},{input:'15 0 10\n',expected:'10'},{input:'-20 -10 -1\n',expected:'-10'},{input:'-1 -10 -1\n',expected:'-1'},{input:'5 5 5\n',expected:'5'}],
  'c-clamp-function': [
    {input:'clamp(5, 0, 10)',args:['0'],expected:'5'},
    {input:'clamp(-3, 0, 10)',args:['1'],expected:'0'},
    {input:'clamp(15, 0, 10)',args:['2'],expected:'10'},
    {input:'clamp(-20, -10, -1)',args:['3'],expected:'-10'},
    {input:'clamp(-1, -10, -1)',args:['4'],expected:'-1'},
    {input:'clamp(5, 5, 5)',args:['5'],expected:'5'}
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
  'c-struct-array-binary-search': [
    {input:'find_first_student_by_id({101, 205, 205, 309}, 4, 205, &out)',args:['0'],expected:'1 1'},
    {input:'첫 원소 찾기',args:['1'],expected:'1 0'},
    {input:'마지막 원소 찾기',args:['2'],expected:'1 3'},
    {input:'한 원소 배열에서 일치',args:['3'],expected:'1 0'},
    {input:'한 원소 배열에서 미발견',args:['4'],expected:'0 77'},
    {input:'세 중복 중 첫 위치',args:['5'],expected:'1 1'},
    {input:'정렬된 값 사이에서 미발견',args:['6'],expected:'0 77'},
    {input:'NULL인 빈 범위',args:['7'],expected:'0 77'},
    {input:'비NULL인 빈 범위',args:['8'],expected:'0 77'},
    {input:'양수 길이의 NULL 배열',args:['9'],expected:'0 77'},
    {input:'out_index == NULL',args:['10'],expected:'0'},
    {input:'INT_MIN과 INT_MAX 경계',args:['11'],expected:'1 2'}
  ],
  'c-multi-file': [{input:'5 0 10\n',expected:'5'},{input:'-3 0 10\n',expected:'0'},{input:'15 0 10\n',expected:'10'},{input:'-20 -10 -1\n',expected:'-10'},{input:'-1 -10 -1\n',expected:'-1'},{input:'5 5 5\n',expected:'5'}],
  'c-struct-student-registry': [
    {input:'4 205\n309 95\n205 88\n101 70\n205 91\n',expected:'101:70 205:88 205:91 309:95\nFOUND 1 88'},
    {input:'3 -5\n-5 10\n0 20\n7 30\n',expected:'-5:10 0:20 7:30\nFOUND 0 10'},
    {input:'4 4\n4 40\n3 30\n2 20\n1 10\n',expected:'1:10 2:20 3:30 4:40\nFOUND 3 40'},
    {input:'4 7\n7 10\n7 20\n7 30\n7 40\n',expected:'7:10 7:20 7:30 7:40\nFOUND 0 10'},
    {input:'4 4\n1 10\n3 30\n5 50\n7 70\n',expected:'1:10 3:30 5:50 7:70\nNOT FOUND'},
    {input:'1 42\n42 100\n',expected:'42:100\nFOUND 0 100'},
    {input:'0 42\n',expected:'EMPTY\nNOT FOUND'},
    {input:'3 2147483647\n2147483647 33\n-2147483648 11\n0 22\n',expected:'-2147483648:11 0:22 2147483647:33\nFOUND 2 33'},
    {input:'17 1\n',expected:'INVALID'},
    {input:'2 1\n1 10\n',expected:'INVALID'}
  ],
  'c-dynamic-student-array': [
    {input:'create_students(3, 70, &students)',args:['0'],expected:'1 · 3개 원소 초기화'},
    {input:'한 원소 · 점수 하한 0',args:['1'],expected:'1 0 0 1 1'},
    {input:'두 원소 · 점수 상한 100',args:['2'],expected:'1 1 1 1 1'},
    {input:'0개 정책 · malloc을 호출하지 않고 NULL 결과',args:['3'],expected:'1 1 0 0'},
    {input:'초기 점수 -1 · 출력 보존',args:['4'],expected:'0 1 0'},
    {input:'초기 점수 101 · 출력 보존',args:['5'],expected:'0 1 0'},
    {input:'out_students == NULL',args:['6'],expected:'0 0'},
    {input:'count * sizeof 오버플로 · 할당 전 거부',args:['7'],expected:'0 1 0'},
    {input:'주입된 malloc 실패 · 출력 보존',args:['8'],expected:'0 1 1 0'},
    {input:'destroy_students(NULL)',args:['9'],expected:'0'},
    {input:'destroy_students가 가리키는 포인터가 NULL',args:['10'],expected:'0 1'},
    {input:'성공한 배열을 두 번 해제해도 실제 free는 한 번',args:['11'],expected:'1 1'}
  ],
  'c-realloc-student-capacity': [
    {input:'reserve_students(&students, 2, &capacity, 4)',args:['0'],expected:'1 · 용량 4 · 기존 2개 보존 · 새 2개 0 초기화'},
    {input:'빈 배열을 용량 3으로 확장',args:['1'],expected:'1 3 1 1 1'},
    {input:'같은 용량 요청은 realloc 없이 성공',args:['2'],expected:'1 1 4 0'},
    {input:'정규 빈 상태에서 용량 0 요청',args:['3'],expected:'1 1 0'},
    {input:'새 용량이 length보다 작음',args:['4'],expected:'0 1 2 0'},
    {input:'축소 요청은 정책상 거부',args:['5'],expected:'0 1 4 0'},
    {input:'length가 현재 capacity보다 큰 잘못된 상태',args:['6'],expected:'0 1 4 0'},
    {input:'students == NULL',args:['7'],expected:'0 0'},
    {input:'capacity == NULL',args:['8'],expected:'0 0'},
    {input:'양수 capacity인데 배열 포인터가 NULL',args:['9'],expected:'0 1 2 0'},
    {input:'0 capacity인데 배열 포인터가 NULL이 아님',args:['10'],expected:'0 1 0 0'},
    {input:'new_capacity * sizeof 오버플로 · realloc 전 거부',args:['11'],expected:'0 1 0 0 1'},
    {input:'주입된 realloc 실패 · 포인터·길이·용량·원소 보존',args:['12'],expected:'0 1 2 1 1'}
  ],
  'c-student-vector-push': [
    {input:'push_student(&students, &length, &capacity, (struct Student){309, 95})',args:['0'],expected:'1 · 길이 3 · 용량 4 · 새 학생 309:95'},
    {input:'여유 슬롯에 추가 · reserve 호출 없음',args:['1'],expected:'1 2 4 1 0'},
    {input:'마지막 여유 슬롯 사용 · 용량 유지',args:['2'],expected:'1 4 4 1 0'},
    {input:'정규 빈 상태의 첫 push · 0에서 4로 성장',args:['3'],expected:'1 1 4 1 1 4'},
    {input:'용량 1이 가득 참 · 1에서 2로 성장',args:['4'],expected:'1 2 2 1 1 2'},
    {input:'용량 3이 가득 참 · 3에서 6으로 성장',args:['5'],expected:'1 4 6 1 1 6'},
    {input:'INT_MIN 학번과 INT_MAX 점수 레코드 복사',args:['6'],expected:'1 1 1 0'},
    {input:'students == NULL',args:['7'],expected:'0 0'},
    {input:'length == NULL',args:['8'],expected:'0 0'},
    {input:'capacity == NULL',args:['9'],expected:'0 0'},
    {input:'length가 capacity보다 큰 잘못된 상태',args:['10'],expected:'0 1 3 2 0'},
    {input:'양수 capacity인데 배열 포인터가 NULL',args:['11'],expected:'0 1 0 2 0'},
    {input:'0 capacity인데 배열 포인터가 NULL이 아님',args:['12'],expected:'0 1 0 0 0'},
    {input:'capacity 두 배의 size_t 오버플로 · reserve 전 거부',args:['13'],expected:'0 1 1 0'},
    {input:'두 배 용량의 바이트 크기 오버플로 · reserve가 거부',args:['14'],expected:'0 1 1 1 1'},
    {input:'주입된 reserve 실패 · 포인터·길이·용량·원소 보존',args:['15'],expected:'0 1 2 2 1 1'},
    {input:'세 번 push하며 1에서 2, 다시 4로 반복 성장',args:['16'],expected:'1 3 4 2 4 1'}
  ]
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
        case 5: printf("%d\\n", clamp(5, 5, 5)); break;
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
}`,
  'c-struct-array-binary-search': `#include <limits.h>
#include <stddef.h>
#include <stdio.h>
#include <stdlib.h>

struct Student { int id; int score; };

int find_first_student_by_id(const struct Student students[], size_t count, int target_id, size_t *out_index);

int main(int argc, char **argv) {
    if (argc != 2) return 70;
    size_t out = 77;
    int status;
    switch (atoi(argv[1])) {
        case 0: { const struct Student a[] = {{101,10},{205,20},{205,30},{309,40}}; status=find_first_student_by_id(a,4,205,&out); printf("%d %zu\\n",status,out); break; }
        case 1: { const struct Student a[] = {{1,10},{2,20},{3,30},{4,40}}; status=find_first_student_by_id(a,4,1,&out); printf("%d %zu\\n",status,out); break; }
        case 2: { const struct Student a[] = {{1,10},{2,20},{3,30},{4,40}}; status=find_first_student_by_id(a,4,4,&out); printf("%d %zu\\n",status,out); break; }
        case 3: { const struct Student a[] = {{42,100}}; status=find_first_student_by_id(a,1,42,&out); printf("%d %zu\\n",status,out); break; }
        case 4: { const struct Student a[] = {{42,100}}; status=find_first_student_by_id(a,1,9,&out); printf("%d %zu\\n",status,out); break; }
        case 5: { const struct Student a[] = {{-3,1},{7,10},{7,20},{7,30},{9,2}}; status=find_first_student_by_id(a,5,7,&out); printf("%d %zu\\n",status,out); break; }
        case 6: { const struct Student a[] = {{1,10},{3,30},{5,50},{7,70}}; status=find_first_student_by_id(a,4,4,&out); printf("%d %zu\\n",status,out); break; }
        case 7: status=find_first_student_by_id(NULL,0,1,&out); printf("%d %zu\\n",status,out); break;
        case 8: { const struct Student a[]={{1,10}}; status=find_first_student_by_id(a,0,1,&out); printf("%d %zu\\n",status,out); break; }
        case 9: status=find_first_student_by_id(NULL,3,1,&out); printf("%d %zu\\n",status,out); break;
        case 10: { const struct Student a[]={{1,10}}; status=find_first_student_by_id(a,1,1,NULL); printf("%d\\n",status); break; }
        case 11: { const struct Student a[]={{INT_MIN,10},{0,20},{INT_MAX,30}}; status=find_first_student_by_id(a,3,INT_MAX,&out); printf("%d %zu\\n",status,out); break; }
        default: return 71;
    }
    return 0;
}`,
  'c-dynamic-student-array': `#include <stddef.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>

struct Student { int id; int score; };

int create_students(size_t count, int initial_score, struct Student **out_students);
void destroy_students(struct Student **students);

void *__real_malloc(size_t size);
void __real_free(void *pointer);

static size_t allocation_calls;
static size_t free_calls;
static size_t requested_size;
static int fail_next_allocation;

void *__wrap_malloc(size_t size) {
    ++allocation_calls;
    requested_size = size;
    if (fail_next_allocation) {
        fail_next_allocation = 0;
        return NULL;
    }
    return __real_malloc(size < 4096 ? 4096 : size);
}

void __wrap_free(void *pointer) {
    if (pointer != NULL) ++free_calls;
    __real_free(pointer);
}

int main(int argc, char **argv) {
    if (argc != 2) return 70;
    struct Student *students;
    int status;
    switch (atoi(argv[1])) {
        case 0:
            students = (struct Student *)(uintptr_t)1;
            status = create_students(3, 70, &students);
            status = status && students[0].id == 0 && students[0].score == 70
                            && students[1].id == 0 && students[1].score == 70
                            && students[2].id == 0 && students[2].score == 70
                            && requested_size == 3 * sizeof *students && allocation_calls == 1;
            destroy_students(&students);
            printf("%d · 3개 원소 초기화\\n", status && free_calls == 1 && students == NULL);
            break;
        case 1:
            students = NULL;
            status = create_students(1, 0, &students);
            printf("%d %d %d ", status, status ? students[0].id : -1, status ? students[0].score : -1);
            destroy_students(&students);
            printf("%zu %d\\n", free_calls, students == NULL);
            break;
        case 2:
            students = NULL;
            status = create_students(2, 100, &students);
            printf("%d %d %d ", status,
                   status && students[0].id == 0 && students[1].id == 0,
                   status && students[0].score == 100 && students[1].score == 100);
            destroy_students(&students);
            printf("%zu %d\\n", free_calls, students == NULL);
            break;
        case 3:
            students = (struct Student *)(uintptr_t)1;
            status = create_students(0, 50, &students);
            printf("%d %d %zu %zu\\n", status, students == NULL, allocation_calls, free_calls);
            break;
        case 4:
            students = (struct Student *)(uintptr_t)1;
            status = create_students(2, -1, &students);
            printf("%d %d %zu\\n", status, students == (struct Student *)(uintptr_t)1, allocation_calls);
            break;
        case 5:
            students = (struct Student *)(uintptr_t)1;
            status = create_students(2, 101, &students);
            printf("%d %d %zu\\n", status, students == (struct Student *)(uintptr_t)1, allocation_calls);
            break;
        case 6:
            status = create_students(2, 50, NULL);
            printf("%d %zu\\n", status, allocation_calls);
            break;
        case 7: {
            size_t too_many = SIZE_MAX / sizeof(struct Student) + 1;
            students = (struct Student *)(uintptr_t)1;
            status = create_students(too_many, 50, &students);
            printf("%d %d %zu\\n", status, students == (struct Student *)(uintptr_t)1, allocation_calls);
            break;
        }
        case 8:
            students = (struct Student *)(uintptr_t)1;
            fail_next_allocation = 1;
            status = create_students(2, 50, &students);
            printf("%d %d %zu %zu\\n", status, students == (struct Student *)(uintptr_t)1,
                   allocation_calls, free_calls);
            break;
        case 9:
            destroy_students(NULL);
            printf("%zu\\n", free_calls);
            break;
        case 10:
            students = NULL;
            destroy_students(&students);
            printf("%zu %d\\n", free_calls, students == NULL);
            break;
        case 11:
            students = NULL;
            status = create_students(2, 50, &students);
            destroy_students(&students);
            destroy_students(&students);
            printf("%d %zu\\n", status && students == NULL, free_calls);
            break;
        default: return 71;
    }
    return 0;
}`,
  'c-realloc-student-capacity': `#include <stddef.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>

struct Student { int id; int score; };

int reserve_students(struct Student **students, size_t length,
                     size_t *capacity, size_t new_capacity);

void *__real_realloc(void *pointer, size_t size);

static size_t reallocation_calls;
static size_t requested_size;
static void *observed_pointer;
static int fail_next_reallocation;

void *__wrap_realloc(void *pointer, size_t size) {
    ++reallocation_calls;
    requested_size = size;
    observed_pointer = pointer;
    if (fail_next_reallocation) {
        fail_next_reallocation = 0;
        return NULL;
    }
    return __real_realloc(pointer, size);
}

static struct Student *make_students(size_t count) {
    return malloc(count * sizeof(struct Student));
}

int main(int argc, char **argv) {
    if (argc != 2) return 70;
    struct Student *students;
    struct Student *before;
    size_t capacity;
    int status;
    switch (atoi(argv[1])) {
        case 0:
            students = make_students(2);
            if (students == NULL) return 72;
            students[0] = (struct Student){101, 70};
            students[1] = (struct Student){205, 88};
            capacity = 2;
            status = reserve_students(&students, 2, &capacity, 4);
            status = status == 1 && students != NULL && capacity == 4
                     && students[0].id == 101 && students[0].score == 70
                     && students[1].id == 205 && students[1].score == 88
                     && students[2].id == 0 && students[2].score == 0
                     && students[3].id == 0 && students[3].score == 0
                     && reallocation_calls == 1
                     && requested_size == 4 * sizeof *students;
            printf("%d · 용량 4 · 기존 2개 보존 · 새 2개 0 초기화\\n", status);
            free(students);
            break;
        case 1:
            students = NULL;
            capacity = 0;
            status = reserve_students(&students, 0, &capacity, 3);
            printf("%d %zu %d %d %d\\n", status, capacity,
                   students != NULL && students[0].id == 0 && students[0].score == 0,
                   students != NULL && students[2].id == 0 && students[2].score == 0,
                   reallocation_calls == 1 && observed_pointer == NULL
                       && requested_size == 3 * sizeof *students);
            free(students);
            break;
        case 2:
            students = make_students(4);
            if (students == NULL) return 72;
            before = students;
            capacity = 4;
            status = reserve_students(&students, 2, &capacity, 4);
            printf("%d %d %zu %zu\\n", status, students == before, capacity,
                   reallocation_calls);
            free(students);
            break;
        case 3:
            students = NULL;
            capacity = 0;
            status = reserve_students(&students, 0, &capacity, 0);
            printf("%d %d %zu\\n", status, students == NULL, reallocation_calls);
            break;
        case 4:
            students = make_students(2);
            if (students == NULL) return 72;
            before = students;
            capacity = 2;
            status = reserve_students(&students, 2, &capacity, 1);
            printf("%d %d %zu %zu\\n", status, students == before, capacity,
                   reallocation_calls);
            free(students);
            break;
        case 5:
            students = make_students(4);
            if (students == NULL) return 72;
            before = students;
            capacity = 4;
            status = reserve_students(&students, 2, &capacity, 3);
            printf("%d %d %zu %zu\\n", status, students == before, capacity,
                   reallocation_calls);
            free(students);
            break;
        case 6:
            students = make_students(4);
            if (students == NULL) return 72;
            before = students;
            capacity = 4;
            status = reserve_students(&students, 5, &capacity, 8);
            printf("%d %d %zu %zu\\n", status, students == before, capacity,
                   reallocation_calls);
            free(students);
            break;
        case 7:
            capacity = 0;
            status = reserve_students(NULL, 0, &capacity, 3);
            printf("%d %zu\\n", status, reallocation_calls);
            break;
        case 8:
            students = NULL;
            status = reserve_students(&students, 0, NULL, 3);
            printf("%d %zu\\n", status, reallocation_calls);
            break;
        case 9:
            students = NULL;
            capacity = 2;
            status = reserve_students(&students, 0, &capacity, 4);
            printf("%d %d %zu %zu\\n", status, students == NULL, capacity,
                   reallocation_calls);
            break;
        case 10:
            students = make_students(1);
            if (students == NULL) return 72;
            before = students;
            capacity = 0;
            status = reserve_students(&students, 0, &capacity, 2);
            printf("%d %d %zu %zu\\n", status, students == before, capacity,
                   reallocation_calls);
            free(students);
            break;
        case 11: {
            size_t too_large = SIZE_MAX / sizeof(struct Student) + 1;
            students = NULL;
            capacity = 0;
            fail_next_reallocation = 1;
            status = reserve_students(&students, 0, &capacity, too_large);
            printf("%d %d %zu %zu %d\\n", status, students == NULL, capacity,
                   reallocation_calls, fail_next_reallocation);
            break;
        }
        case 12:
            students = make_students(2);
            if (students == NULL) return 72;
            students[0] = (struct Student){101, 70};
            students[1] = (struct Student){205, 88};
            before = students;
            capacity = 2;
            fail_next_reallocation = 1;
            status = reserve_students(&students, 2, &capacity, 4);
            printf("%d %d %zu %d %d\\n", status, students == before, capacity,
                   before[0].id == 101 && before[0].score == 70
                       && before[1].id == 205 && before[1].score == 88,
                   reallocation_calls == 1
                       && requested_size == 4 * sizeof *students);
            free(before);
            break;
        default: return 71;
    }
    return 0;
}`,
  'c-student-vector-push': `#include <limits.h>
#include <stddef.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>

struct Student { int id; int score; };

int push_student(struct Student **students, size_t *length,
                 size_t *capacity, struct Student value);

static size_t reserve_calls;
static size_t observed_length;
static size_t requested_capacity;
static int fail_next_reserve;

int reserve_students(struct Student **students, size_t length,
                     size_t *capacity, size_t new_capacity) {
    ++reserve_calls;
    observed_length = length;
    requested_capacity = new_capacity;
    if (students == NULL || capacity == NULL || length > *capacity) return 0;
    if ((*capacity == 0) != (*students == NULL)) return 0;
    if (new_capacity < *capacity || new_capacity < length) return 0;
    if (new_capacity == *capacity) return 1;
    if (new_capacity > SIZE_MAX / sizeof **students) return 0;
    if (fail_next_reserve) {
        fail_next_reserve = 0;
        return 0;
    }
    size_t old_capacity = *capacity;
    struct Student *grown = realloc(*students, new_capacity * sizeof *grown);
    if (grown == NULL) return 0;
    for (size_t i = old_capacity; i < new_capacity; ++i) {
        grown[i] = (struct Student){0, 0};
    }
    *students = grown;
    *capacity = new_capacity;
    return 1;
}

static struct Student *make_students(size_t count) {
    return malloc(count * sizeof(struct Student));
}

int main(int argc, char **argv) {
    if (argc != 2) return 70;
    struct Student *students;
    struct Student *before;
    size_t length;
    size_t capacity;
    int status;
    switch (atoi(argv[1])) {
        case 0:
            students = make_students(2);
            if (students == NULL) return 72;
            students[0] = (struct Student){101, 70};
            students[1] = (struct Student){205, 88};
            length = 2;
            capacity = 2;
            status = push_student(&students, &length, &capacity,
                                  (struct Student){309, 95});
            status = status == 1 && length == 3 && capacity == 4
                     && students[0].id == 101 && students[0].score == 70
                     && students[1].id == 205 && students[1].score == 88
                     && students[2].id == 309 && students[2].score == 95
                     && reserve_calls == 1 && observed_length == 2
                     && requested_capacity == 4;
            printf("%d · 길이 3 · 용량 4 · 새 학생 309:95\\n", status);
            free(students);
            break;
        case 1:
            students = make_students(4);
            if (students == NULL) return 72;
            students[0] = (struct Student){1, 10};
            length = 1;
            capacity = 4;
            status = push_student(&students, &length, &capacity,
                                  (struct Student){2, 20});
            printf("%d %zu %zu %d %zu\\n", status, length, capacity,
                   students[0].id == 1 && students[1].id == 2
                       && students[1].score == 20,
                   reserve_calls);
            free(students);
            break;
        case 2:
            students = make_students(4);
            if (students == NULL) return 72;
            students[0] = (struct Student){1, 10};
            students[1] = (struct Student){2, 20};
            students[2] = (struct Student){3, 30};
            before = students;
            length = 3;
            capacity = 4;
            status = push_student(&students, &length, &capacity,
                                  (struct Student){4, 40});
            printf("%d %zu %zu %d %zu\\n", status, length, capacity,
                   students == before && students[3].id == 4
                       && students[3].score == 40,
                   reserve_calls);
            free(students);
            break;
        case 3:
            students = NULL;
            length = 0;
            capacity = 0;
            status = push_student(&students, &length, &capacity,
                                  (struct Student){7, 77});
            printf("%d %zu %zu %d %zu %zu\\n", status, length, capacity,
                   students != NULL && students[0].id == 7
                       && students[0].score == 77,
                   reserve_calls, requested_capacity);
            free(students);
            break;
        case 4:
            students = make_students(1);
            if (students == NULL) return 72;
            students[0] = (struct Student){1, 10};
            length = 1;
            capacity = 1;
            status = push_student(&students, &length, &capacity,
                                  (struct Student){2, 20});
            printf("%d %zu %zu %d %zu %zu\\n", status, length, capacity,
                   students[0].id == 1 && students[1].id == 2,
                   reserve_calls, requested_capacity);
            free(students);
            break;
        case 5:
            students = make_students(3);
            if (students == NULL) return 72;
            for (size_t i = 0; i < 3; ++i) students[i] = (struct Student){(int)i, (int)i};
            length = 3;
            capacity = 3;
            status = push_student(&students, &length, &capacity,
                                  (struct Student){9, 90});
            printf("%d %zu %zu %d %zu %zu\\n", status, length, capacity,
                   students[0].id == 0 && students[2].id == 2
                       && students[3].id == 9,
                   reserve_calls, requested_capacity);
            free(students);
            break;
        case 6:
            students = make_students(2);
            if (students == NULL) return 72;
            length = 0;
            capacity = 2;
            status = push_student(&students, &length, &capacity,
                                  (struct Student){INT_MIN, INT_MAX});
            printf("%d %d %d %zu\\n", status,
                   students[0].id == INT_MIN,
                   students[0].score == INT_MAX, reserve_calls);
            free(students);
            break;
        case 7:
            length = 0;
            capacity = 0;
            status = push_student(NULL, &length, &capacity,
                                  (struct Student){1, 1});
            printf("%d %zu\\n", status, reserve_calls);
            break;
        case 8:
            students = NULL;
            capacity = 0;
            status = push_student(&students, NULL, &capacity,
                                  (struct Student){1, 1});
            printf("%d %zu\\n", status, reserve_calls);
            break;
        case 9:
            students = NULL;
            length = 0;
            status = push_student(&students, &length, NULL,
                                  (struct Student){1, 1});
            printf("%d %zu\\n", status, reserve_calls);
            break;
        case 10:
            students = make_students(2);
            if (students == NULL) return 72;
            before = students;
            length = 3;
            capacity = 2;
            status = push_student(&students, &length, &capacity,
                                  (struct Student){1, 1});
            printf("%d %d %zu %zu %zu\\n", status, students == before,
                   length, capacity, reserve_calls);
            free(students);
            break;
        case 11:
            students = NULL;
            length = 0;
            capacity = 2;
            status = push_student(&students, &length, &capacity,
                                  (struct Student){1, 1});
            printf("%d %d %zu %zu %zu\\n", status, students == NULL,
                   length, capacity, reserve_calls);
            break;
        case 12:
            students = make_students(1);
            if (students == NULL) return 72;
            before = students;
            length = 0;
            capacity = 0;
            status = push_student(&students, &length, &capacity,
                                  (struct Student){1, 1});
            printf("%d %d %zu %zu %zu\\n", status, students == before,
                   length, capacity, reserve_calls);
            free(students);
            break;
        case 13:
            students = (struct Student *)(uintptr_t)1;
            capacity = SIZE_MAX / 2 + 1;
            length = capacity;
            status = push_student(&students, &length, &capacity,
                                  (struct Student){1, 1});
            printf("%d %d %d %zu\\n", status,
                   students == (struct Student *)(uintptr_t)1,
                   length == capacity, reserve_calls);
            break;
        case 14: {
            size_t original_capacity = SIZE_MAX / sizeof(struct Student);
            students = (struct Student *)(uintptr_t)1;
            capacity = original_capacity;
            length = original_capacity;
            status = push_student(&students, &length, &capacity,
                                  (struct Student){1, 1});
            printf("%d %d %d %d %zu\\n", status,
                   students == (struct Student *)(uintptr_t)1,
                   length == original_capacity,
                   capacity == original_capacity, reserve_calls);
            break;
        }
        case 15:
            students = make_students(2);
            if (students == NULL) return 72;
            students[0] = (struct Student){101, 70};
            students[1] = (struct Student){205, 88};
            before = students;
            length = 2;
            capacity = 2;
            fail_next_reserve = 1;
            status = push_student(&students, &length, &capacity,
                                  (struct Student){309, 95});
            printf("%d %d %zu %zu %d %zu\\n", status, students == before,
                   length, capacity,
                   students[0].id == 101 && students[0].score == 70
                       && students[1].id == 205 && students[1].score == 88,
                   reserve_calls);
            free(students);
            break;
        case 16:
            students = make_students(1);
            if (students == NULL) return 72;
            students[0] = (struct Student){1, 10};
            length = 1;
            capacity = 1;
            status = push_student(&students, &length, &capacity,
                                  (struct Student){2, 20});
            status = status && push_student(&students, &length, &capacity,
                                             (struct Student){3, 30});
            printf("%d %zu %zu %zu %zu %d\\n", status, length, capacity,
                   reserve_calls, requested_capacity,
                   students[0].id == 1 && students[1].id == 2
                       && students[2].id == 3);
            free(students);
            break;
        default: return 71;
    }
    return 0;
}`
};

const LINK_ARGS = {
  'c-dynamic-student-array': ['-Wl,--wrap=malloc', '-Wl,--wrap=free'],
  'c-realloc-student-capacity': ['-Wl,--wrap=realloc']
};

export function buildGradingExercises(metadata, casesById, harnessesById = {}, linkArgsById = {}) {
  if (!Array.isArray(metadata) || !casesById || typeof casesById !== 'object' || Array.isArray(casesById)
      || !harnessesById || typeof harnessesById !== 'object' || Array.isArray(harnessesById)
      || !linkArgsById || typeof linkArgsById !== 'object' || Array.isArray(linkArgsById)) {
    throw new Error('채점 메타데이터와 사례 객체가 필요합니다.');
  }
  const byId = new Map(metadata.map(exercise => [exercise.id, exercise]));
  for (const id of Object.keys(casesById)) {
    if (!byId.get(id)?.grader) throw new Error(`${id}: 채점 불가 문제에 사례가 등록되었습니다.`);
  }
  for (const id of Object.keys(harnessesById)) {
    if (byId.get(id)?.grader !== 'c-function') throw new Error(`${id}: 함수형이 아닌 문제에 하네스가 등록되었습니다.`);
  }
  for (const [id, linkArgs] of Object.entries(linkArgsById)) {
    if (byId.get(id)?.grader !== 'c-function' || !Array.isArray(linkArgs) || linkArgs.length === 0
        || linkArgs.some(arg => typeof arg !== 'string' || !/^-Wl,--wrap=(malloc|realloc|free)$/.test(arg))
        || new Set(linkArgs).size !== linkArgs.length) {
      throw new Error(`${id}: linkArgs는 허용된 함수형 링커 래퍼 배열이어야 합니다.`);
    }
  }
  const result = new Map();
  for (const exercise of metadata) {
    if (exercise.grader === null) continue;
    const harness = harnessesById[exercise.id];
    const linkArgs = linkArgsById[exercise.id] ?? [];
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
    result.set(exercise.id, Object.freeze({ ...exercise, harness, linkArgs: Object.freeze([...linkArgs]), cases: Object.freeze(normalized) }));
  }
  return result;
}

export const gradingExercises = buildGradingExercises(exercises, CASES, HARNESSES, LINK_ARGS);
