# E03 — 병합 정렬과 보조 공간

## 개요·필요성·선수·목표
뒤섞인 점수 목록을 오름차순으로 만들자. 삽입 정렬은 한 값을 끼워 넣지만, 병합 정렬은 작은 목록을 정렬한 뒤 합친다.
선수: 배열·함수·포인터·재귀·삽입 정렬. 예상 25분. 목표는 반열린 구간을 나누고, 두 정렬된 구간을 보조 배열로 합쳐 원본에 돌려놓는 것이다.
이번 범위는 int 최대64개, 호출자가 제공한 보조 배열이다. 동적 할당·레코드 정렬·외부 파일 정렬은 다음 심화 과제다.

## 이론 — 나누기는 어디서 멈추나
구간 [left,right)는 left를 포함하고 right를 제외한다. 길이가 0 또는1이면 이미 정렬되어 있다.
mid = left + (right-left)/2로 나눠 [left,mid), [mid,right)를 먼저 정렬한다. 홀수 길이도 두 구간이 겹치거나 빠지지 않는다.
두 구간의 앞쪽 값 중 작은 것을 scratch[k]에 쓰고 선택한 쪽만 전진한다. 한쪽이 끝나면 다른 쪽의 남은 값을 모두 복사한다.
병합 후 scratch의 해당 구간을 values에 복사한다. 원본에 바로 덮어쓰면 아직 비교하지 않은 값을 잃을 수 있다.

## 도식 — 분할과 병합
독자 정적 도식 키: merge-auxiliary. 5,1,4,2,3을 [5,1]과 [4,2,3]으로 나눈 뒤 각각 1,5 / 2,3,4로 정렬한다.
마지막 병합: 1과2→1, 5와2→2, 5와3→3, 5와4→4, 남은5→5. scratch는 1,2,3,4,5가 되고 원본으로 복사한다.

## 함수 계약 — 누가 공간을 준비하나
merge_sort(values,n,scratch,capacity)는 성공1, 거부0을 반환한다. n>64는 먼저 거부한다. n=0은 NULL도 성공하며 아무것도 읽거나 쓰지 않는다.
n>0일 때 values가 NULL이면 거부한다. n=1은 values를 그대로 두고 scratch 없이 성공한다.
n>=2는 scratch != NULL, capacity>=n을 요구한다. 거부하면 두 배열을 모두 보존한다. 성공하면 두 배열의 앞 n개가 같은 오름차순 결과이며 그 밖의 칸은 보존한다.
호출자는 values에 n개, scratch에 capacity개 이상의 유효한 int 공간을 제공하며 두 영역은 겹치지 않아야 한다. 함수는 실제 할당 크기나 겹침을 검사하지 않는다.

## 완성 프로그램 — 제출할 함수와 실행 예제
다음은 완성 프로그램이다. 제출 시에는 main을 빼고 include·보조 함수·merge_sort만 작성한다.
```c
#include <stddef.h>
#include <stdio.h>
static void divide(int *values, int *scratch, size_t left, size_t right) {
    if (right - left < 2) return;
    size_t mid = left + (right - left) / 2;
    divide(values, scratch, left, mid);
    divide(values, scratch, mid, right);
    size_t i = left, j = mid, k = left;
    while (i < mid && j < right) {
        if (values[i] <= values[j]) scratch[k++] = values[i++];
        else scratch[k++] = values[j++];
    }
    while (i < mid) scratch[k++] = values[i++];
    while (j < right) scratch[k++] = values[j++];
    for (k = left; k < right; ++k) values[k] = scratch[k];
}
int merge_sort(int *values, size_t n, int *scratch, size_t capacity) {
    if (n > 64) return 0;
    if (n == 0) return 1;
    if (values == NULL) return 0;
    if (n == 1) return 1;
    if (scratch == NULL || capacity < n) return 0;
    divide(values, scratch, 0, n);
    return 1;
}
int main(void) {
    int values[] = {5, 1, 4, 2, 3};
    int scratch[5];
    printf("%d\n", merge_sort(values, 5, scratch, 5));
    for (size_t i = 0; i < 5; ++i) printf("%d%s", values[i], i == 4 ? "\n" : " ");
    for (size_t i = 0; i < 5; ++i) printf("%d%s", scratch[i], i == 4 ? "\n" : " ");
    return 0;
}
```

## 실제 출력과 이유
```text
1
1 2 3 4 5
1 2 3 4 5
```
첫1은 성공이다. 두 번째 줄은 원본, 세 번째 줄은 마지막 병합 결과가 남은 보조 배열이다. gcc -std=c11 -Wall -Wextra -Wpedantic -Werror로 컴파일한다.

## 흔한 오류 — 남은 구간을 잊지 말자
비교 루프만 쓰면 한쪽이 먼저 끝났을 때 나머지가 빠진다. 홀수 길이는 mid 양쪽 길이가 다르다. k=0으로 매번 시작하면 하위 구간의 위치가 깨진다.
capacity를 확인하기 전에 쓰면 실패해도 데이터가 바뀐다. 비교를 values[i]-values[j]로 만들면 극값에서 정수 오버플로가 날 수 있다. 관계 비교를 사용한다.

## 중간 점검·퀴즈·핵심 요약
길이5인 [0,5)의 mid는? 선택: 1 / 2 / 3 / 5. 정답2: [0,2)와 [2,5)는 길이2와3이다.
왜 scratch가 필요한지, 오른쪽이 먼저 비면 무엇을 복사해야 하는지 말해 보자. 요약: 길이1에서 중단→양쪽 정렬→앞값 비교→남은 구간→복사.

## 직접 풀기 — 기초·응용·도전
기초: 빈 입력과 길이1의 반환값을 먼저 구현한다. 응용: 홀수·짝수·음수·중복·극값까지 병합하고 보조 공간 부족 시 원본을 보존한다.
도전: 배열 중간의 부분 구간만 넘겨 양 끝 경계가 유지되는지 확인한다. 출력만 맞추지 말고 scratch 앞 n개와 범위 밖 보존도 검사한다.
준비된 실제 GCC 채점 계약은 10사례다. 이 원고 준비 단계에서는 화면·공개 실행 목록에 아직 등록하지 않는다.

## Mini Project — 점수 정리 도구
호출자가 점수 배열과 같은 길이의 작업 배열을 마련한다. 성공하면 정렬 결과를 표시하고 공간이 부족하면 원본으로 다시 시도한다. 입출력은 main에서, 정렬은 함수에서 맡긴다.

## 심화 — 시간·공간과 검증의 한계
<details><summary>심화: 삽입 정렬과 비교하기</summary>
각 깊이에서 합치는 총 길이는 O(n), 분할 깊이는 O(log n)이므로 병합 정렬 시간은 O(n log n)이다. 보조 배열은 O(n), 재귀 호출은 O(log n) 공간이다.
같은 값에서 왼쪽을 먼저 고르면 레코드로 확장할 때 안정성을 유지할 수 있다. 이번 int 결과만으로 같은 키의 원래 순서나 알고리즘의 시간 복잡도를 증명할 수는 없다.
</details>

## 테스트·개선·복습 연결
오답은 실패 사례의 구간 길이·i/j/k·남은 쪽을 표로 적고 수정해 재제출한다. 정렬된 입력·역순·전부 같은 값도 다시 확인한다.
삽입 정렬의 제자리 이동과 이번 보조 공간을 비교해 설명한 뒤 복습 표시를 한다. 다음 개발 단원은 로드맵 순환을 따르며 학습 후속 주제는 재귀 트리·백트래킹이다. 이론 읽기와 실제 실습 통과는 별개다.
