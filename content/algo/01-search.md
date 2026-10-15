# E01 복잡도와 선형·이진 탐색의 전제

## 개요·필요성·선수·목표
예상 25분. 배열·반복문·함수와 size_t를 먼저 익힌다.
같은 “첫 일치 위치 찾기”를 두 방법으로 풀어 입력 조건과 비용을 비교한다.
선형 탐색은 정렬 없이 가능하고, 이진 탐색은 정렬된 배열에서 후보를 줄인다.

## 위치와 실패 계약
두 함수 모두 첫 일치의 인덱스를 반환하고, 없으면 count를 반환한다.
반환값이 count보다 작을 때만 발견이다. 빈 범위에서는 count=0이므로 반환 0도 미발견이다.
count개 읽기 가능한 원소를 제공하며, count=0일 때만 NULL을 허용한다.
입력은 바꾸지 않는다. 함수는 출력·할당·해제를 하지 않는다.

## 선형 탐색: 앞에서 하나씩
0부터 count 미만까지 확인하고 첫 일치에서 바로 반환한다.
정렬되지 않은 {9,2,9,0}에서 2를 찾으면 위치 1이다.
첫 값이 목표보다 크다는 이유로 멈출 수 없다. 뒤에 작은 값이 있을 수 있다.

## 비용과 선택
선형 탐색의 최악 원소 확인 수는 n, 이진 탐색은 로그에 비례한다.
배열 원소 접근과 정수 비교가 상수 비용이라는 모델에서 각각 O(n), O(log n)이다.
추가 공간은 두 반복 구현 모두 O(1)이다. O 표기는 초 단위 실행 시간을 뜻하지 않는다.
정렬되지 않은 자료를 한 번만 찾는다면 정렬 비용까지 내는 이진 탐색이 항상 유리하지는 않다.

## 정렬 전제와 반열린 구간
이진 탐색에는 비내림차순 정렬을 호출자가 보장한다. 중복 값도 허용한다.
후보 구간은 [left,right): left는 포함하고 right는 제외한다. 처음에는 [0,count)다.
함수가 매번 정렬 여부를 전체 검사하면 그 검사만 O(n)이므로 여기서는 전제로 둔다.
정렬되지 않은 입력에 이진 함수를 호출한 결과는 이 실습에서 약속하지 않는다.

## 독자 정적 도식과 첫 위치 추적
화면 도식은 {1,3,3,3,9}, 목표 3의 [0,5) → [0,2) → [0,1) → [1,1)을 보여준다.
중간 값이 목표 이상이면 right=mid로 줄여 중복의 더 앞쪽 후보를 남긴다.
목표보다 작으면 left=mid+1이다. 구간이 비면 left가 첫 후보 위치다.
끝에 left<count와 값 일치를 확인한다. 후보가 있다고 발견을 보장하지는 않는다.

## 완성 예제
다음은 main이 있는 완성 프로그램이다. 제출할 때는 두 함수만 작성한다.
```c
#include <stddef.h>
#include <stdio.h>

size_t linear_find_first(const int values[], size_t count, int target) {
    for (size_t i = 0; i < count; ++i) {
        if (values[i] == target) return i;
    }
    return count;
}

size_t binary_find_first(const int values[], size_t count, int target) {
    size_t left = 0;
    size_t right = count;
    while (left < right) {
        size_t mid = left + (right - left) / 2;
        if (values[mid] < target) left = mid + 1;
        else right = mid;
    }
    if (left < count && values[left] == target) return left;
    return count;
}

int main(void) {
    int values[] = {1, 3, 3, 3, 9};
    size_t count = sizeof values / sizeof values[0];
    printf("%zu %zu\n", linear_find_first(values, count, 3),
           binary_find_first(values, count, 3));
    printf("%zu %zu\n", linear_find_first(values, count, 4),
           binary_find_first(values, count, 4));
    return 0;
}
```
컴파일: `gcc -std=c11 -Wall -Wextra -Werror -Wpedantic example.c -o example`

## 실제 출력과 이유
첫 줄은 `1 1`: 목표 3의 첫 인덱스는 두 방식 모두 1이다.
둘째 줄은 `5 5`: 목표 4는 없으므로 배열 길이 5를 반환한다.
중간값이 같자마자 반환하면 중복의 첫 위치가 아닐 수 있다.

## 흔한 오류와 중간 점검
- right=count인데 values[right]를 읽음: right는 제외 경계다.
- 미발견을 0으로 반환함: 첫 위치와 구별되지 않는다. count를 쓴다.
- values[mid]-target으로 비교함: 정수 뺄셈이 넘칠 수 있으므로 <와 ==를 직접 쓴다.
- left+right로 중간을 구함: left+(right-left)/2로 범위를 보존한다.
점검: 같은 값이 세 번 있어도 첫 위치를 고를 수 있는가? 빈 구간에서 원소를 읽고 있지 않은가?

## 개념 확인·핵심 요약
퀴즈: 이진 탐색에서 절반을 버릴 수 있는 이유는 정렬 전제다. 원소가 양수이기 때문이 아니다.
정렬 보장 → 후보 구간 축소 → 마지막 값 확인을 구별한다.
선형 함수는 정렬이 필요 없다. 두 함수 모두 입력과 다른 호출의 상태를 바꾸지 않는다.

## 기초·응용·도전과 Mini Project
기초: 두 함수를 완성하고 빈 범위·한 원소를 확인한다.
응용: 첫·중간·끝·미발견·중복 사례를 손으로 추적한 뒤 실행과 비교한다.
도전: INT_MIN/INT_MAX에서도 뺄셈 없이 비교하고 같은 배열에 반복 호출한다.
Mini Project: 완성 예제의 목표를 1·3·4·9로 바꾸고, 예상 위치와 실제 위치를 표로 기록한다.

## 채점·개선·복습 연결
10개 사례에서 결과와 입력 보존을 검사한다. 선형 함수에는 정렬되지 않은 입력도 준다.
공개 하네스 출력 `1 1 1`은 선형 위치·이진 위치·입력 보존 여부다. 함수가 출력하는 것이 아니다.
기능 채점은 구현의 O(log n)을 증명하지 않는다. 후보 크기가 매 반복 줄어드는 이유도 설명해야 한다.
실패 사례 추적 → 수정 → 재제출 → 이전 코드 비교를 반복하고, 이론·퀴즈·실습 상태는 따로 확인한다.
복습은 빈 범위와 중복부터, 다음 E02에서는 정렬의 비교·이동 비용을 살펴본다.
