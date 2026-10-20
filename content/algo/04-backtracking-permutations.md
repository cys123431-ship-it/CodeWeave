# E04. 재귀 트리와 백트래킹: 순열 생성 후 원상 복원

## 개요·필요성·선수·목표
같은 세 작업의 실행 순서를 모두 비교하려면 순서를 직접 나열해야 한다. 반복문을 원소 수만큼 겹치는 대신 재귀로 다음 자리를 채워 보자.
선수는 배열·포인터·함수·2차원 배열의 행 폭, B04의 재귀 종료 조건이다. 예상25분. 목표는 선택→재귀→복원, 방문 순서, 출력 용량과 입력 보존을 설명하고 구현하는 것이다.
범위는 원소0~4개다. 이번 원고·독자 도식·GCC 계약은 준비 단계이며 화면·퀴즈·제출/재제출 연결은 다음 실행에서 인수한다.

## 이론: 재귀 호출과 상태
pos는 이번에 채울 자리다. pos 앞은 확정된 접두부, pos부터 끝까지는 아직 고를 후보다.
values[pos]와 values[i]를 교환하면 i의 값을 이번 자리에 놓는다. pos+1 호출은 다음 자리부터 완성한다. 호출이 끝나면 같은 두 칸을 다시 교환해 이전 상태를 복원한다.
지역 변수 pos/i는 호출별로 따로 있지만 배열 저장소는 공유한다. 함수가 반환했다고 공유 배열까지 자동으로 되돌아가지는 않는다.

## 이론: 재귀 트리·종료 조건
{1,2,3}에서 첫 자리 선택은1·2·3의 세 갈래, 다음 자리는 각각 두 갈래, 마지막은 한 갈래다. 잎은3!=6개다.
pos==count가 되면 모든 자리가 확정됐으므로 현재 배열을 한 행에 복사하고 반환한다. 빈 입력도 아무것도 배치하지 않은 방법 하나가 있으므로0!=1행이다.

## 이론: 되돌리기가 필요한 이유
첫 가지에서 얻은 배열이 다음 가지의 출발 상태로 새어 들어가면 순서가 섞이고 호출자 입력도 바뀐다.
각 반복은 교환→재귀→같은 교환의 짝이다. 재귀가 더 깊은 자리를 모두 복원하고 돌아온 뒤 부모도 자신의 선택을 복원한다.
이것이 백트래킹의 기본 뼈대다. 이번에는 모든 잎을 열거한다. 제약을 보고 불가능한 가지를 자르는 가지치기는 다음 확장 범위다.

## 도식: 선택→재귀→복원
독자 정적 도식 `permutation-backtrack`은 첫 값1을 고른 뒤123·132를 얻고, 복원한 뒤 첫 값2를 고르는 흐름을 보여 준다.
| 자리 | 후보 | 하는 일 |
|---|---|---|
| pos0 | 원래 인덱스0~2 | 하나 교환해 첫 자리 확정 |
| pos1 | 현재 인덱스1~2 | 남은 자리로 재귀 |
| pos3 | 후보 없음 | 한 행 저장, 부모로 반환 |

## 계약: 행 용량·순서·보존
`enumerate_permutations(values,count,rows,capacity,out_count)`는 성공1·거부0이다. rows의 행 폭은 항상4이며 capacity는 행 수다.
count는0~4, rows와 out_count는 NULL이 아니어야 한다. count>0이면 values도 NULL이 아니어야 한다. capacity는 count! 이상이다.
호출자는 count개의 int 입력과 capacity행의 실제 쓰기 가능한 저장소, 별도의 size_t 출력 객체를 제공한다. 세 영역은 겹치면 안 된다. 함수가 임의 주소의 유효성이나 실제 할당 크기를 알아내지는 못한다.
성공 시 첫 count!행의 앞 count열만 쓰고 입력·나머지 열·여분 행을 보존한다. 빈 순열은 행 개수1만 기록하고 배열 칸은 쓰지 않는다. 거부 시 입력·모든 행·유효 out_count를 보존한다.
교환 DFS의 i를 pos부터 증가시키는 순서가 이번 과제의 출력 계약이다. 정렬된 순서가 아니다. 중복 값도 원래 위치를 구별하므로 {2,2,1}은 중복 행을 포함해6행이다.

## 완성 프로그램: 직접 컴파일
아래는 main 포함 관찰용 완성 프로그램이다. 제출에는 main·stdio 출력 없이 함수와 보조 함수만 넣는다.
```c
#include <stdio.h>
#include <stddef.h>
static void exchange(int *a, int *b) {
    int saved = *a;
    *a = *b;
    *b = saved;
}
static void explore(int values[], size_t count, size_t pos,
                    int rows[][4], size_t *written) {
    if (pos == count) {
        for (size_t k = 0; k < count; ++k) {
            rows[*written][k] = values[k];
        }
        ++*written;
        return;
    }
    for (size_t i = pos; i < count; ++i) {
        exchange(values + pos, values + i);
        explore(values, count, pos + 1, rows, written);
        exchange(values + pos, values + i); /* undo */
    }
}
int enumerate_permutations(int values[], size_t count,
                           int rows[][4], size_t capacity,
                           size_t *out_count) {
    if (out_count == NULL || rows == NULL || count > 4
        || (count > 0 && values == NULL)) {
        return 0;
    }
    size_t required = 1;
    for (size_t i = 2; i <= count; ++i) {
        required *= i;
    }
    if (capacity < required) {
        return 0;
    }
    size_t written = 0;
    explore(values, count, 0, rows, &written);
    *out_count = written;
    return 1;
}

int main(void) {
    int values[] = {1,2,3};
    int rows[6][4] = {{0}};
    size_t written = 0;
    if (!enumerate_permutations(values, 3, rows, 6, &written)) {
        return 1;
    }
    printf("count=%zu\n", written);
    for (size_t r = 0; r < written; ++r) {
        printf("%d %d %d\n", rows[r][0], rows[r][1], rows[r][2]);
    }
    printf("restored: %d %d %d\n", values[0], values[1], values[2]);
    return 0;
}
```
컴파일: `gcc -std=c11 -Wall -Wextra -Wpedantic -Werror example.c -o example`。실행: Linux/macOS `./example`, Windows `.\example.exe`.

## 출력과 이유
```text
count=6
1 2 3
1 3 2
2 1 3
2 3 1
3 2 1
3 1 2
restored: 1 2 3
```
첫 자리1의 두 행을 끝내고 복원한 뒤2, 다음3의 가지로 간다. 첫 자리3을 고른 순간 남은 배열은 {2,1} 순서라321이312보다 먼저다.
마지막 줄은 입력이 원래대로 돌아왔다는 관찰이다. 공개 하네스 출력의 6은 행 개수, 뒤 여섯 묶음은 행 내용이며 함수 자체가 printf하는 출력이 아니다.

## 흔한 오류·중간 점검
재귀 뒤 교환 생략, 잎마다 행 번호를0으로 초기화, 마지막 후보 건너뛰기, 용량 검사 전에 입력/출력 수정이 흔한 오류다.
중간 점검: 자식 함수가 반환했을 때 부모의 다음 후보는 어떤 배열에서 출발해야 하는가? 부모 반복 시작 때와 같은 배열이다. 호출 스택 복귀와 공유 배열 복원은 따로 생각하자.

## 핵심 요약·퀴즈
퀴즈: 다음 후보를 고르기 전에 공유 입력 배열을 원래 상태로 만드는 단계는? ①행 개수 증가 ②재귀 뒤 같은 두 칸 재교환 ③pos를 전역에 저장 ④출력을 정렬. 정답②.
결과 복사까지 시간 O(n·n!), 재귀 스택 O(n), 호출자 출력 공간 O(n·n!)이다. 모든 결과를 담기 때문에 출력 크기 자체가 빠르게 늘어난다. 이 실습은 최대4개로 제한한다.

## 직접 풀기·실제 테스트·개선
기초: 교환 함수와 pos==count의 종료 조건을 작성한다. 응용: {1,2,3}의 여섯 행과 마지막 원본을 예측한다.
도전: 중복·INT_MIN/INT_MAX·빈 입력·정확한 용량·부족한 용량·반복 호출에서 상태를 확인한다. 10사례는 결과 순서뿐 아니라 입력과 여분 행/열, 거부 출력 보존도 검사한다.
스타터는 경고 없이 컴파일되지만 정답이 아니다. 실패 행→선택과 복원 짝 추적→수정→전체 재제출로 개선한다. 기능 테스트만으로 재귀 구현이나 시간 복잡도가 증명되는 것은 아니므로 호출 트리도 직접 설명한다.

## Mini Project
작업 번호3개의 가능한 실행 순서를 표로 만들고 각 행의 첫 작업을 비교한다. 서로 다른 작업 번호를 쓰며 현실의 실행 비용이나 제약은 아직 넣지 않는다.
확장 아이디어로 특정 순서를 금지하는 규칙을 적되 이번 과제의 중복/방문 순서 계약은 바꾸지 않는다.

## 복습·다음 연결
D04는 한 위치의 원소 이동을, E04는 여러 후보를 탐색한 뒤 공유 상태 복원을 다룬다. 두 경우 모두 입력/출력 계약과 변경할 수 있는 범위를 먼저 확인한다.
B04의 단일 재귀 호출과 이번 재귀 트리의 여러 자식을 비교하고, 다음에는 불가능한 선택의 가지치기와 탐색 공간을 학습한다.
