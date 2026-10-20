# D04. 동적 배열 리스트: 삽입·삭제·이동 비용

## 개요·필요성·선수·목표
배열 끝에 추가하는 push를 배웠다면 이제 중간에 끼우고 지워 보자. 길이와 용량을 구별하고 순서를 지키는 이동 방향과 횟수를 설명하는 것이 목표다.
선수는 배열, 포인터, 구조체, 함수다. 예상 25분. B09/B10의 메모리 확보·확대와 연결하지만 여기서는 **호출자가 이미 확보한 용량 안의 편집**만 구현한다. 자동 확장·할당·해제는 하지 않는다.
이번 원고·채점 계약은 준비 범위다. 화면·퀴즈·실제 제출/재제출 연결은 다음 실행에서 인수한다.

## 이론: 길이와 용량
`values`는 저장소, `length`는 살아 있는 원소 수, `capacity`는 확보된 칸 수다. 항상 `length <= capacity`여야 한다.
길이3·용량6이라면 인덱스0~2만 목록이다. 여분 칸은 원소가 아니다. 배열 리스트는 논리적 목록이고 동적 할당 여부와는 구별된다.
실제 동적 배열의 저장소는 malloc/realloc으로 확보할 수도 있다. 예제는 이동 원리를 분리하기 위해 지역 배열을 빌린다. 함수는 소유권을 받지 않는다.

## 이론: 삽입
삽입 위치는 0부터 length까지다. 자리가 있으면 마지막 원소부터 오른쪽으로 한 칸씩 복사하고 빈 위치에 새 값을 쓴다.
길이 n, 위치 p에서 기존 원소 이동은 **n-p회**다. 새 값 쓰기와 길이 변경은 이동 횟수에 포함하지 않는다. 앞에서 복사하면 아직 필요한 원소를 덮어쓴다.

## 이론: 삭제
삭제 위치는 0부터 length-1까지다. 삭제할 값을 먼저 보관하고 다음 원소부터 왼쪽으로 한 칸씩 복사한다.
기존 원소 이동은 **n-p-1회**다. 길이를 줄여도 저장소 용량은 그대로다. 마지막 남은 물리 칸을 0으로 지우지 않는다. 그 칸은 목록 밖이라 읽을 원소가 아니다.

## 도식: 순서와 이동
독자 정적 도식 `array-list-shifts`는 [10,20,30]에서 위치1에15를 삽입할 때 30→20 순으로 이동하는 모습과, 위치2의20 삭제 뒤30을 왼쪽으로 옮기는 모습을 보여 준다.
| 연산 | 결과 목록 | 이동 수 |
|---|---|---:|
| insert(1,15) | 10,15,20,30 | 2 |
| erase(2) | 10,15,30 | 1 |
| 끝 삽입·끝 삭제 | 앞 원소는 그대로 | 0 |

## 계약: 성공·거부·호출자의 책임
함수 서명은 아래 완성 프로그램과 같다. 성공1, 거부0. 성공 때 moved에 이동 수를 쓴다. 삭제는 out에 지운 값을 쓴다.
NULL 리스트·필수 출력·저장소, length>capacity, 잘못된 위치, 꽉 찬 삽입은 거부한다. 거부 때 구조체·모든 저장 칸·출력 값은 그대로다.
저장소는 capacity개 int를 실제로 담을 수 있어야 하며 구조체와 출력 포인터는 유효해야 한다. out/moved는 서로 및 리스트·저장소와 겹치지 않는 별도 객체다. C 함수가 임의 주소의 유효성이나 실제 할당 크기를 알아낼 수는 없다.
NULL 저장소·용량0 목록은 거부하고, 용량 양수의 빈 목록은 삽입할 수 있다. SIZE_MAX 위치도 비교로 거부하고 +1부터 계산하지 않는다.

## 완성 프로그램: 직접 컴파일
아래는 main을 포함한 독립 프로그램이다. 제출에는 main·stdio 출력 없이 두 함수와 구조체만 넣는다.
```c
#include <stdio.h>
#include <stddef.h>
struct IntList { int *values; size_t length; size_t capacity; };
int list_insert(struct IntList *list, size_t pos, int value, size_t *moved) {
    if (list == NULL || moved == NULL || list->values == NULL
        || list->length > list->capacity || pos > list->length
        || list->length == list->capacity) return 0;
    size_t count = 0;
    for (size_t i = list->length; i > pos; --i) {
        list->values[i] = list->values[i - 1];
        ++count;
    }
    list->values[pos] = value;
    ++list->length;
    *moved = count;
    return 1;
}
int list_erase(struct IntList *list, size_t pos, int *out, size_t *moved) {
    if (list == NULL || moved == NULL || out == NULL || list->values == NULL
        || list->length > list->capacity || pos >= list->length) return 0;
    int removed = list->values[pos];
    size_t count = 0;
    for (size_t i = pos; i + 1 < list->length; ++i) {
        list->values[i] = list->values[i + 1];
        ++count;
    }
    --list->length;
    *out = removed;
    *moved = count;
    return 1;
}

int main(void) {
    int values[6] = {10, 20, 30, 94, 95, 96};
    struct IntList list = {values, 3, 6};
    size_t moved = 777;
    int removed = 888;
    int status = list_insert(&list, 1, 15, &moved);
    printf("insert=%d moved=%zu:", status, moved);
    for (size_t i = 0; i < list.length; ++i) printf(" %d", list.values[i]);
    putchar('\n');
    status = list_erase(&list, 2, &removed, &moved);
    printf("erase=%d removed=%d moved=%zu:", status, removed, moved);
    for (size_t i = 0; i < list.length; ++i) printf(" %d", list.values[i]);
    putchar('\n');
    return 0;
}
```
컴파일: `gcc -std=c11 -Wall -Wextra -Wpedantic -Werror example.c -o example`。실행: Linux/macOS `./example`, Windows `.\example.exe`.

## 출력과 이유
```text
insert=1 moved=2: 10 15 20 30
erase=1 removed=20 moved=1: 10 15 30
```
첫 연산은 30과20 두 값을 옮긴다. 다음 연산은 삭제 전20을 저장한 뒤30 하나를 옮긴다. 호출자는 반환값을 먼저 확인한 다음 결과 출력을 사용한다.

## 흔한 오류·중간 점검
앞에서부터 오른쪽으로 밀기, length와 capacity 혼동, 위치length 삭제 허용, unsigned 인덱스를 0 아래로 줄이기가 흔한 오류다.
길이0에서 끝 삭제 이동 수를 먼저 계산하면 unsigned 뺄셈이 순환한다. 반드시 상태와 범위를 먼저 검사한다.
중간 점검: 길이5에서 위치2에 삽입하면3회, 위치2를 삭제하면2회다. 두 수의 차이는 새 원소가 들어갈 틈을 만드는지 기존 한 원소를 없애는지에 있다.

## 핵심 요약·퀴즈
앞 삽입/삭제는 원소 수에 비례하므로 O(n), 끝 편집은 용량이 이미 있으면 O(1)이다. 자동 용량 확대를 포함한 비용 분석은 별도다.
퀴즈: 길이4 목록의 위치1을 삭제하면 기존 원소 이동은? ①0 ②2 ③3 ④4. 정답②: 인덱스2·3 두 값만 왼쪽으로 간다.

## 직접 풀기·실제 테스트·개선
기초: list_insert와 list_erase를 구현한다. 응용: 빈 목록·마지막 칸·맨 앞·맨 뒤의 moved를 종이에 예측한다.
도전: 길이0~6의 모든 유효 위치에서 순서를 검토한다. 테스트10사례는 극값, 중복, 거부의 상태 보존, 두 목록의 독립성을 포함한다.
스타터는 경고 없이 컴파일되지만 정답이 아니다. 준비 검사는 실제 GCC로 정답과 오답 변형을 구분한다. 화면 연결 뒤에는 실패 사례 확인→코드 수정→재제출로 이어간다. 통과 결과만으로 퀴즈나 전체 숙달을 대신하지 않는다.

## Mini Project
용량6의 작은 할 일 목록을 만든다. 인덱스 삽입·완료 항목 삭제를 함수로 나누고 각 편집의 moved를 합산한다. 실제 문자열 입력·할당은 범위 밖이다.
같은 항목을 앞/끝에 추가할 때 총 이동 수가 어떻게 달라지는지 비교하라. 기존 실습 계약의 물리 칸 보존은 그대로 유지한다.

## 복습·다음 연결
왜 삽입은 뒤에서, 삭제는 앞에서 이동하는지 설명하고 길이1과 꽉 찬 상태를 다시 풀자.
B09 realloc·B10 push와 비교해 용량 확보와 목록 편집의 책임을 구별하라. 연결 리스트 삽입/삭제는 D05에서 별도의 소유권·해제 계약으로 배운다.
