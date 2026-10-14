# realloc로 학생 배열 용량 늘리기

## 단원 개요

동적 배열은 현재 저장한 원소 수와 이미 확보한 슬롯 수를 따로 관리합니다.

- `length`: 지금 의미 있는 학생 수
- `capacity`: 재할당 없이 저장할 수 있는 학생 수

이 단원에서는 `reserve_students`를 만들어 용량을 더 크게 확보합니다. 목표는 단순히 `realloc`을 호출하는 것이 아닙니다. 상태 불변식, 바이트 수 오버플로, 주소 이동, 실패 시 원본 보존, 새 슬롯 초기화와 소유권을 하나의 검증 가능한 계약으로 묶습니다.

## 필요한 이유

입력 학생 수를 미리 모르면 고정 배열은 너무 작거나 지나치게 클 수 있습니다. `malloc`으로 처음 배열을 만든 뒤 원소가 늘어날 때마다 더 큰 블록을 확보하면 필요한 만큼 확장할 수 있습니다. 그러나 재할당 실패 때 기존 포인터를 잃으면 이미 저장한 모든 학생과 해제할 주소까지 잃습니다. 그래서 성공 경로보다 실패 경로의 상태 보존을 먼저 설계해야 합니다.

## 선수 지식

- `struct Student`와 구조체 배열
- `malloc`, `free`, 동적 블록의 소유권
- `size_t`, `SIZE_MAX`, `sizeof`
- 이중 포인터로 호출자 포인터 바꾸기
- 실패 시 출력 객체를 보존하는 함수 계약

## 학습 목표

학습 후에는 다음을 할 수 있어야 합니다.

1. `length <= capacity` 불변식을 설명합니다.
2. 용량 0의 정규 빈 상태를 정의합니다.
3. 성장 전용 `reserve`와 축소 정책을 분리합니다.
4. 곱셈 오버플로를 `realloc` 호출 전에 거부합니다.
5. 임시 포인터로 재할당 실패 시 기존 상태를 보존합니다.
6. 성공 뒤 늘어난 슬롯을 명시적으로 초기화합니다.
7. `realloc` 성공 후 주소가 달라질 수 있음을 설명합니다.

## 핵심 이론

### 1. 동적 배열은 포인터 하나만으로 설명되지 않는다

다음 세 값은 하나의 상태를 이룹니다.

```c
struct Student *students;
size_t length;
size_t capacity;
```

`students[0]`부터 `students[length - 1]`까지는 현재 학생입니다. `students[length]`부터 `students[capacity - 1]`까지는 확보했지만 아직 학생으로 세지 않는 슬롯입니다. 유효한 상태라면 항상 다음 조건을 만족해야 합니다.

```c
length <= capacity
```

이 과제는 용량이 0일 때 포인터도 `NULL`이어야 한다고 정합니다. 따라서 정규 빈 상태는 `(NULL, 0, 0)`입니다.

### 2. reserve는 성장 정책만 담당한다

`reserve_students`는 `new_capacity >= capacity`인 요청만 다룹니다.

- 더 작은 용량: 실패 0, 아무 상태도 변경하지 않음
- 같은 용량: 재할당 없이 성공 1
- 더 큰 용량: 안전 검사를 거쳐 확장

축소는 뒤쪽 원소를 버릴지, 메모리 반환 실패를 어떻게 다룰지 별도의 정책이 필요합니다. 이 단원은 그 책임을 섞지 않습니다.

### 3. realloc의 성공과 실패 계약

```c
void *realloc(void *pointer, size_t new_size);
```

양수 크기 재할당이 성공하면 이전 내용은 `min(이전 크기, 새 크기)` 바이트까지 보존됩니다. 반환 주소는 이전 주소와 같을 수도, 다를 수도 있습니다. 성공 뒤에는 이전 포인터 값을 사용해서는 안 됩니다.

실패하면 `NULL`을 반환하고 이전 블록은 그대로 유효합니다. 이때 가장 위험한 코드는 다음과 같습니다.

```c
/* 잘못된 조각: 실패하면 원래 주소를 잃는다. */
*students = realloc(*students, bytes);
if (*students == NULL) {
    return 0;
}
```

반환값을 임시 포인터에 보관해야 합니다.

```c
struct Student *grown = realloc(*students, bytes);
if (grown == NULL) {
    return 0;
}
```

### 4. 바이트 수를 곱하기 전에 검사한다

`new_capacity * sizeof(struct Student)`가 `size_t` 범위를 넘으면 작은 값으로 순환할 수 있습니다. 곱한 뒤에는 원래 의도를 복원할 수 없으므로 먼저 상한을 검사합니다.

```c
if (new_capacity > SIZE_MAX / sizeof **students) {
    return 0;
}
```

검사를 통과한 뒤에만 다음 계산이 안전합니다.

```c
size_t bytes = new_capacity * sizeof **students;
```

### 5. 빈 배열의 첫 확장

`realloc(NULL, 양수 크기)`는 `malloc(양수 크기)`처럼 새 블록을 요청합니다. 따라서 정규 빈 상태를 용량 3으로 키우는 작업도 같은 코드 경로를 사용할 수 있습니다.

그러나 `realloc(NULL, 0)`의 반환값은 이 과제의 상태 표현에 필요하지 않습니다. 용량 0에서 다시 0을 요청하면 호출 없이 성공시켜 구현 선택에 의존하지 않습니다.

### 6. 늘어난 메모리는 자동으로 0이 아니다

`realloc`은 새로 추가된 뒷부분을 초기화하지 않습니다. 성공한 임시 포인터에서 이전 용량부터 새 용량 직전까지 직접 기록합니다.

```c
for (size_t i = old_capacity; i < new_capacity; ++i) {
    grown[i] = (struct Student){0, 0};
}
```

`length`부터가 아니라 `old_capacity`부터 초기화하는 이유는 이전에 확보된 모든 슬롯의 바이트가 이미 기존 블록에 속하기 때문입니다. 이 과제는 새로 추가된 슬롯만 0으로 만듭니다.

### 7. 상태는 마지막에 공개한다

안전한 순서는 다음과 같습니다.

1. 출력 포인터와 기존 상태를 검사합니다.
2. 성장 전용 정책을 검사합니다.
3. 크기 오버플로를 검사합니다.
4. 임시 포인터로 `realloc`을 호출합니다.
5. 새 슬롯을 초기화합니다.
6. 호출자 포인터와 용량을 갱신합니다.

`length`는 값으로 전달되므로 함수가 바꾸지 않습니다. 6단계 전의 실패에서는 공개 상태가 바뀌지 않습니다.

## 정적 도식 읽기

화면의 도식은 입력 상태에서 크기 검사와 임시 포인터를 거쳐 두 경로로 나뉩니다.

- 실패 경로: 원래 포인터, `length`, `capacity`, 기존 레코드를 모두 유지합니다.
- 성공 경로: 새 슬롯을 0으로 만든 뒤 새 포인터와 용량을 함께 공개합니다.

도식은 메모리 주소가 항상 바뀐다고 말하지 않습니다. 바뀔 수 있기 때문에 이전 주소에 의존하지 말아야 한다는 계약을 보여 줍니다.

## 단계별 예제

### 1단계: 포인터 객체와 기존 상태를 검증한다

```c
if (students == NULL || capacity == NULL) return 0;
if (length > *capacity) return 0;
if ((*capacity == 0) != (*students == NULL)) return 0;
```

마지막 조건은 “용량 0일 때만 포인터가 NULL”이라는 이 과제의 정규 상태를 검사합니다.

### 2단계: 성장 정책과 무동작 성공을 구분한다

```c
if (new_capacity < *capacity || new_capacity < length) return 0;
if (new_capacity == *capacity) return 1;
```

같은 용량 요청에서는 `realloc`을 호출하지 않습니다.

### 3단계: 크기와 재할당 결과를 검사한다

```c
if (new_capacity > SIZE_MAX / sizeof **students) return 0;

size_t old_capacity = *capacity;
struct Student *grown =
    realloc(*students, new_capacity * sizeof *grown);
if (grown == NULL) return 0;
```

`old_capacity`는 성공 뒤 새 슬롯의 시작 인덱스로 사용합니다.

### 4단계: 초기화 뒤 새 상태를 공개한다

```c
for (size_t i = old_capacity; i < new_capacity; ++i) {
    grown[i].id = 0;
    grown[i].score = 0;
}

*students = grown;
*capacity = new_capacity;
return 1;
```

## 완성 함수

다음은 자동 채점에 제출하는 함수 완성본입니다. `main`이 없는 함수 조각이며 서버 전용 테스트 하네스가 직접 호출합니다.

```c
#include <stddef.h>
#include <stdint.h>
#include <stdlib.h>

struct Student {
    int id;
    int score;
};

int reserve_students(struct Student **students, size_t length,
                     size_t *capacity, size_t new_capacity) {
    if (students == NULL || capacity == NULL) return 0;
    if (length > *capacity) return 0;
    if ((*capacity == 0) != (*students == NULL)) return 0;
    if (new_capacity < *capacity || new_capacity < length) return 0;
    if (new_capacity == *capacity) return 1;
    if (new_capacity > SIZE_MAX / sizeof **students) return 0;

    size_t old_capacity = *capacity;
    struct Student *grown =
        realloc(*students, new_capacity * sizeof *grown);
    if (grown == NULL) return 0;

    for (size_t i = old_capacity; i < new_capacity; ++i) {
        grown[i] = (struct Student){0, 0};
    }

    *students = grown;
    *capacity = new_capacity;
    return 1;
}
```

## 완성 프로그램

다음 프로그램은 위 함수를 실제로 호출하는 독립 실행 예입니다. 함수 제출물과 달리 `main`과 출력 코드를 포함합니다.

```c
#include <stddef.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>

struct Student { int id; int score; };

int reserve_students(struct Student **students, size_t length,
                     size_t *capacity, size_t new_capacity) {
    if (students == NULL || capacity == NULL) return 0;
    if (length > *capacity) return 0;
    if ((*capacity == 0) != (*students == NULL)) return 0;
    if (new_capacity < *capacity || new_capacity < length) return 0;
    if (new_capacity == *capacity) return 1;
    if (new_capacity > SIZE_MAX / sizeof **students) return 0;

    size_t old_capacity = *capacity;
    struct Student *grown =
        realloc(*students, new_capacity * sizeof *grown);
    if (grown == NULL) return 0;

    for (size_t i = old_capacity; i < new_capacity; ++i) {
        grown[i] = (struct Student){0, 0};
    }
    *students = grown;
    *capacity = new_capacity;
    return 1;
}

int main(void) {
    size_t length = 2;
    size_t capacity = 2;
    struct Student *students = malloc(capacity * sizeof *students);
    if (students == NULL) return 1;

    students[0] = (struct Student){101, 70};
    students[1] = (struct Student){205, 88};

    if (!reserve_students(&students, length, &capacity, 4)) {
        free(students);
        return 1;
    }

    printf("length=%zu capacity=%zu\n", length, capacity);
    for (size_t i = 0; i < capacity; ++i) {
        printf("%d:%d%c", students[i].id, students[i].score,
               i + 1 == capacity ? '\n' : ' ');
    }

    free(students);
    return 0;
}
```

## 실행 결과

```text
length=2 capacity=4
101:70 205:88 0:0 0:0
```

`length`는 2로 유지되고 `capacity`만 4가 됩니다. 앞의 두 학생은 보존되며 새 슬롯 두 개는 0으로 초기화됩니다.

## 왜 이런 결과가 나오는가

`realloc`은 기존 두 `Student` 객체의 바이트를 성공한 새 블록 앞부분에 보존합니다. 반복문은 인덱스 2와 3만 초기화합니다. 이 함수는 저장된 학생 수를 늘리지 않으므로 `length`는 바뀌지 않습니다. 이후 실제 `push` 연산이 인덱스 2에 학생을 기록하고 나서 `length`를 3으로 늘려야 합니다.

## 흔한 오류

1. `*students = realloc(...)`로 기존 주소를 잃습니다.
2. 성공 전에 `*capacity = new_capacity`를 기록합니다.
3. 곱셈한 뒤 오버플로를 검사합니다.
4. `realloc`이 새 바이트를 0으로 만든다고 가정합니다.
5. 같은 용량 요청에도 불필요하게 재할당합니다.
6. 성장 함수에서 조용히 축소해 뒤쪽 원소의 정책을 숨깁니다.
7. 성공 뒤 예전 포인터 별칭을 계속 사용합니다.
8. `length > capacity`인 잘못된 상태를 받아들입니다.

`realloc` 성공 후 주소가 달라지는지, 실패가 언제 발생하는지는 구현과 실행 환경에 따라 달라집니다. 특정 실행에서 주소가 같았다는 사실은 C 언어의 주소 유지 보장이 아닙니다.

## 중간 점검

1. `length`와 `capacity`는 각각 무엇을 셉니까?
2. `realloc` 실패 뒤 기존 블록은 어떤 상태입니까?
3. 왜 임시 포인터가 필요합니까?
4. 새 슬롯 초기화는 왜 `old_capacity`부터 시작합니까?
5. 0에서 0으로의 요청에서 `realloc(NULL, 0)`을 피하는 이유는 무엇입니까?

## 개념 확인 퀴즈

재할당 실패 때 기존 배열을 보존하는 올바른 방법은 무엇입니까?

1. 임시 포인터에 결과를 받고 성공 뒤 소유 포인터와 용량을 갱신한다.
2. 소유 포인터에 즉시 대입한 뒤 NULL이면 주소를 추측해 복구한다.
3. 용량부터 갱신하고 재할당한다.
4. 새 슬롯을 먼저 쓰고 재할당한다.

정답은 1번입니다. 실패한 `realloc`은 기존 블록을 유지하지만, 기존 주소를 담은 유일한 변수를 NULL로 덮으면 프로그램은 그 블록에 접근하거나 해제할 수 없습니다.

## 핵심 요약

- 유효한 동적 배열은 `length <= capacity`를 지킵니다.
- 이 과제의 정규 빈 상태는 포인터 NULL, 길이 0, 용량 0입니다.
- `reserve_students`는 같은 용량 또는 성장만 허용합니다.
- 바이트 곱셈 전에 `SIZE_MAX` 경계를 검사합니다.
- `realloc` 반환값은 임시 포인터로 검사합니다.
- 새 슬롯은 자동 초기화되지 않습니다.
- 성공이 확정된 마지막에 포인터와 용량을 함께 공개합니다.

## 기초 코딩 연습

정규 빈 상태에서 용량 3을 요청하고 세 슬롯이 모두 `{0, 0}`인지 확인하는 `main`을 작성하세요. 종료 전에 `free`를 정확히 한 번 호출하세요.

## 응용 연습

현재 용량과 같은 값을 요청했을 때 포인터와 용량이 그대로이며 상태 1을 돌려주는지 검사하세요. 함수 내부에서 이 경로가 `realloc`을 호출하지 않는 이유도 주석으로 설명하세요.

## 도전 문제

`push_student`를 설계하세요. `length == capacity`라면 용량을 두 배로 늘리되, 0 용량에서는 후속 단원의 고정 초기 용량 4로 시작합니다. `capacity * 2` 자체의 오버플로를 먼저 검사해야 합니다. 확장에 실패하면 길이와 기존 원소를 보존해야 합니다.

## Mini Project

학생 명부에 다음 연산을 조립하세요.

- 빈 명부 만들기
- 필요할 때 용량 확장
- 학생 한 명 추가
- 학번으로 첫 학생 찾기
- 모든 저장 공간 해제

각 연산 뒤 `length <= capacity`를 확인하고, 실패를 주입했을 때 이미 추가한 학생들이 유지되는지 검사하세요.

## 테스트와 풀이 개선

자동 채점은 실제 GCC로 사용자 함수와 비공개 하네스를 별도 번역 단위로 컴파일하고 링크합니다. 13개 사례는 정상 성장, 빈 배열 첫 성장, 같은 용량, 0→0, 길이보다 작은 요청, 축소 요청, 잘못된 상태, NULL 인수, 크기 오버플로와 재할당 실패를 검사합니다.

할당 실패는 시스템 메모리를 실제로 고갈시키지 않고 제한된 `--wrap=realloc` 링커 래퍼로 결정적으로 주입합니다. 이 장치는 교육 계약을 재현하기 위한 로컬 테스트일 뿐, 임의 코드를 안전하게 격리하는 샌드박스가 아닙니다.

실패한 풀이를 고칠 때는 다음 순서로 확인하세요.

1. 공개 상태를 성공 전에 바꾸지 않았는가?
2. 오버플로 검사 전에 곱하지 않았는가?
3. 임시 포인터를 사용했는가?
4. 새 슬롯 전체를 초기화했는가?
5. 같은 용량과 축소 요청을 구분했는가?

## 복습 연결

이 단원은 앞의 `create_students`와 `destroy_students` 사이에 “용량 성장” 단계를 추가합니다. 다음에는 `push_student`와 기하급수적 성장 정책을 결합해 여러 번 추가할 때의 재할당 횟수와 총 이동 비용을 분석합니다. 이후 자료구조 단원에서는 이 동적 배열을 스택과 벡터형 컨테이너의 저장소로 재사용할 수 있습니다.
