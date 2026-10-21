# C08 qsort: 비교 함수를 인수로 전달하기

## 1. 개요·필요성·선수 지식·목표
예상 25분. 배열·함수·포인터를 익힌 뒤 같은 정렬 함수를 여러 순서에 재사용한다. 목표는 비교 함수 포인터를 읽고, 표준 라이브러리 `qsort`에 안전한 계약으로 전달하고, 반복 빌드를 Make로 자동화하는 것이다. 이번 범위는 int 배열 0~8개다.

## 2. 핵심 이론: 동작도 값처럼 전달한다
`int (*compare)(const void *, const void *)`는 두 원소 주소를 받고 음수·0·양수를 돌려주는 함수의 주소다. `sort_ints_with(values, count, ascending)`처럼 함수를 인수로 주면 정렬 코드는 순서를 몰라도 된다. 호출할 때 함수 이름은 그 함수의 주소로 변환된다.

## 3. 표준 라이브러리 계약
`qsort(base, count, width, compare)`는 `base`에서 시작하는 count개 원소를 width 바이트 단위로 재배치한다. 비교 함수는 첫 원소가 앞이면 음수, 같으면 0, 뒤면 양수를 반환해야 한다. 반환값의 정확한 크기는 의미가 없다. 비교 중 배열을 바꾸거나 모순된 순서를 반환하면 안 된다.

## 4. 도식: 주소에서 값으로, 결과에서 순서로
호출 흐름은 `qsort → compare(&원소A, &원소B) → int로 읽기 → -1/0/1 반환 → 재배치`다. `void *`는 원소 형식을 모르는 표준 함수와 구체적인 int 비교 함수를 잇는다. 비교 함수 안에서 `const int *`로 변환한 뒤 역참조한다.

## 5. 비교 함수에서 뺄셈하지 않는 이유
`return a - b;`는 INT_MAX와 INT_MIN에서 signed int 범위를 넘을 수 있다. `(a > b) - (a < b)`는 항상 -1, 0, 1이며 같은 순서를 표현한다. 내림차순은 인수 순서를 바꿔 오름차순 비교 함수를 재사용할 수 있다.

## 6. 함수 계약과 실패 보존
`sort_ints_with`는 compare가 NULL이거나 count>8이면 0을 반환한다. count>0인데 values가 NULL이어도 0이다. 실패하면 배열을 건드리지 않는다. count=0이면 values=NULL을 허용하지만 유효한 compare는 필요하다. 성공하면 `[0,count)`만 선택한 비교 함수 순서로 정렬하고 1을 반환한다.

## 7. 단계별 예제·완성 프로그램
제출창에는 stddef.h·stdlib.h와 `sort_ints_with`만 넣는다. 아래 main과 비교 함수는 관찰용 호출자다.
```c
#include <stddef.h>
#include <stdio.h>
#include <stdlib.h>

int sort_ints_with(int values[], size_t count,
                   int (*compare)(const void *, const void *)) {
    if (compare == NULL || count > 8 || (count > 0 && values == NULL)) return 0;
    if (count > 1) qsort(values, count, sizeof values[0], compare);
    return 1;
}
static int ascending(const void *left, const void *right) {
    int a = *(const int *)left;
    int b = *(const int *)right;
    return (a > b) - (a < b);
}
static int descending(const void *left, const void *right) {
    return ascending(right, left);
}
static void print3(const int values[3]) {
    printf("%d %d %d\n", values[0], values[1], values[2]);
}
int main(void) {
    int first[] = {3, -1, 2};
    int second[] = {3, -1, 2};
    if (!sort_ints_with(first, 3, ascending)) return 1;
    if (!sort_ints_with(second, 3, descending)) return 1;
    print3(first);
    print3(second);
    return 0;
}
```

## 8. 실제 출력·이유·빌드 자동화
출력은 `-1 2 3`, 다음 줄 `3 2 -1`이다. 배열은 같지만 전달한 함수가 반대 관계를 반환한다. 다음 Makefile은 저장 시간보다 새 실행 파일이 오래됐을 때만 다시 컴파일한다. 명령 줄 앞은 탭 한 칸이다.
```make
CC ?= gcc
CFLAGS ?= -std=c11 -Wall -Wextra -Wpedantic -Werror
example: example.c
	$(CC) $(CFLAGS) example.c -o example
clean:
	rm -f example
```
`make`, `./example`, 수정, `make`를 반복한다. `make clean`은 생성물만 지운다.

## 9. 흔한 오류와 심화
`sizeof values`는 함수 안에서 포인터 크기라 원소 크기가 아니다. `sizeof values[0]`를 쓴다. 콜백을 무시하고 오름차순을 고정하면 다른 순서를 재사용할 수 없다. 실패 검사 전에 qsort를 호출하면 배열을 이미 바꿀 수 있다.
<details><summary>심화: qsort가 보장하지 않는 것</summary>
비교 호출 횟수와 순서는 구현마다 다르며, 같은 값의 원래 순서를 보존하는 안정 정렬도 보장하지 않는다. 비교 함수는 전역 호출 횟수나 호출 순서에 의존하지 않아야 한다. 이 단원은 메모리 격리나 일반 포인터 유효성 검사를 제공하지 않는다.
</details>

## 10. 중간 점검·핵심 요약·퀴즈
오름차순 비교에서 a=7, b=7이면 무엇을 반환해야 하는가? ①음수 ②0 ③양수. 정답②. 함수 포인터는 순서 정책을 전달하고, qsort는 주소·개수·원소 크기·정책을 받아 재배치한다. 검증은 재배치 전에 끝낸다.

## 11. 직접 풀기·기초·응용·도전·Mini Project
기초: `{3,-1,2}`를 오름차순으로 제출한다. 응용: 하네스의 내림차순 콜백에서도 같은 래퍼가 동작하는지 확인한다. 도전: 절댓값이 같으면 실제 값으로 순서를 정하는 비교 함수를 종이에 설계한다. Mini Project: example.c와 Makefile을 만들고 CFLAGS에 `-Werror`가 있을 때 경고를 고쳐 다시 빌드한다.

## 12. 테스트·오류 수정·재제출·복습 연결
12사례는 빈/단일 범위, 세 비교 정책, 중복·정수 경계, 접두부, NULL·상한 실패 보존, 반복 호출을 검사한다. 실패한 사례 이름에서 입력 계약과 순서 정책을 나눠 추적하고 전체 재제출한다. 이번 준비 뒤 학습 화면·퀴즈·백업·숙달·모바일 흐름을 연결해 C08을 인수한다. 다음 복습에서는 C01의 직접 gcc 명령과 Make의 증분 빌드를 비교한다.
