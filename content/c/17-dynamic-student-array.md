# 동적 메모리: 학생 배열의 생성과 해제

## 단원 개요

지금까지 학생 배열은 컴파일할 때 최대 크기를 정해 두었습니다. 그러나 실제 프로그램에서는 실행하기 전까지 학생 수를 모르는 경우가 많습니다. 동적 메모리는 필요한 시점에 필요한 크기의 저장 공간을 요청하고, 사용이 끝나면 반납하게 합니다.

이 단원에서는 두 함수를 하나의 소유권 계약으로 설계합니다.

- create_students: 학생 배열을 만들고 호출자에게 소유권을 전달합니다.
- destroy_students: 소유한 배열을 반납하고 호출자 포인터를 NULL로 바꿉니다.

단순히 malloc과 free의 철자를 외우는 것이 목표가 아닙니다. 바이트 수 오버플로, 0개 정책, 할당 실패, 출력값 보존, 초기화, 정확히 한 번의 해제를 연결해 검증 가능한 프로그램을 만드는 것이 목표입니다.

## 선수 지식

- struct Student와 구조체 배열
- size_t와 sizeof
- 포인터 및 이중 포인터
- 성공 상태와 출력 포인터를 분리하는 함수 계약
- 함수 실패 시 출력 객체 보존

## 학습 목표

이 단원을 마치면 다음을 할 수 있어야 합니다.

1. count개 구조체에 필요한 바이트 수를 설명합니다.
2. size_t 곱셈이 오버플로되기 전에 검사합니다.
3. 0개 배열 정책을 malloc(0)의 결과와 분리합니다.
4. malloc 실패를 정상적인 실패 경로로 처리합니다.
5. 초기화가 끝난 뒤에만 호출자에게 포인터를 공개합니다.
6. free 뒤 포인터를 NULL로 만들어 이중 해제 위험을 줄입니다.
7. 생성 함수와 해제 함수 사이의 소유권을 설명합니다.

## 핵심 이론

### 1. 배열 크기와 바이트 크기는 다르다

malloc은 원소 수가 아니라 바이트 수를 받습니다. Student가 count개 필요하다면 필요한 바이트 수는 다음과 같습니다.

    count * sizeof(struct Student)

실제 코드에서는 자료형 이름을 반복하기보다 대상 포인터를 기준으로 쓰면 형식을 바꿀 때 실수를 줄일 수 있습니다.

    count * sizeof *students

sizeof *students는 students를 실제로 역참조해 값을 읽지 않습니다. 피연산자의 형식을 기준으로 크기를 계산합니다.

### 2. size_t 곱셈도 오버플로될 수 있다

size_t는 부호 없는 정수형입니다. 표현 범위를 넘는 곱셈은 모듈러 연산처럼 작은 값으로 돌아옵니다. 다음 검사는 너무 늦습니다.

    size_t bytes = count * sizeof *students;
    if (bytes > SIZE_MAX) { /* 도달할 수 없는 검사 */ }

bytes 자체가 이미 size_t이므로 SIZE_MAX보다 클 수 없습니다. 따라서 곱하기 전에 나눗셈으로 안전한 상한을 확인합니다.

    if (count > SIZE_MAX / sizeof *students) {
        return 0;
    }

이 단원의 Student 크기는 0이 될 수 없으므로 나눗셈의 제수도 0이 아닙니다.

### 3. 0개 정책을 API가 결정한다

C 구현에서 malloc(0)이 NULL을 반환할 수도 있고, 역참조할 수 없는 고유 포인터를 반환할 수도 있습니다. 어느 결과든 프로그램이 의존하지 않도록 이 단원은 정책을 직접 정합니다.

- count == 0은 성공입니다.
- malloc을 호출하지 않습니다.
- *out_students에 NULL을 기록합니다.

이렇게 하면 호출자는 상태 1과 NULL을 보고 “비어 있지만 정상적으로 만들어진 배열”로 해석할 수 있습니다.

### 4. 출력 이중 포인터가 필요한 이유

함수 안의 지역 포인터에 주소를 저장해도 함수가 끝나면 그 지역 변수는 사라집니다. 호출자가 가진 포인터 객체를 바꾸려면 그 객체의 주소를 받습니다.

    int create_students(size_t count, int initial_score,
                        struct Student **out_students);

성공이 확정되기 전에는 *out_students를 변경하지 않습니다. 실패 후에도 호출자가 기존 값을 신뢰할 수 있게 만드는 계약입니다.

### 5. malloc 성공은 초기화 성공이 아니다

malloc이 돌려준 저장 공간의 바이트는 초기화되지 않았습니다. 읽기 전에 각 Student 객체의 멤버를 기록해야 합니다.

    for (size_t i = 0; i < count; ++i) {
        students[i].id = 0;
        students[i].score = initial_score;
    }

모든 초기화가 끝난 뒤에만 다음 대입으로 소유권을 호출자에게 전달합니다.

    *out_students = students;

### 6. 할당 실패를 정상 경로로 취급한다

양수 바이트를 요청해도 malloc은 NULL을 반환할 수 있습니다. 이 경우 NULL을 역참조하거나 초기화 반복을 시작하면 안 됩니다.

    struct Student *students = malloc(count * sizeof *students);
    if (students == NULL) {
        return 0;
    }

실제 메모리 고갈을 기다리는 테스트는 느리고 재현하기 어렵습니다. CodeWeave의 로컬 GCC 하네스는 링크 단계의 malloc 호출을 감싸 한 사례에서만 실패를 주입합니다. 이것은 교육용 결정적 테스트이며 프로세스를 격리하는 보안 샌드박스가 아닙니다.

### 7. 소유권은 “누가 free할 책임이 있는가”다

성공 전에는 함수가 임시 포인터를 관리합니다. 성공 대입 뒤에는 호출자가 그 블록을 소유합니다. 호출자는 더 이상 필요하지 않을 때 destroy_students를 호출해야 합니다.

포인터 값을 다른 변수에 복사했다고 소유권이 자동으로 둘이 되는 것은 아닙니다. 해제 책임을 가진 소유자를 하나로 정하지 않으면 같은 블록을 두 번 해제하거나 아무도 해제하지 않는 문제가 생깁니다.

### 8. free 뒤 포인터는 더 이상 객체를 가리키지 않는다

free는 동적 블록의 수명을 끝냅니다. 주소 숫자가 변수에 남아 있어도 그 포인터로 멤버를 읽거나 쓰면 정의되지 않은 동작입니다. 이를 댕글링 포인터라고 합니다.

    void destroy_students(struct Student **students) {
        if (students == NULL) return;
        free(*students);
        *students = NULL;
    }

free(NULL)은 아무 일도 하지 않도록 정의되어 있습니다. 하지만 students 자체가 NULL이면 *students를 계산할 수 없으므로 먼저 검사합니다.

### 9. NULL 대입은 모든 별칭을 고치지 않는다

destroy_students(&owner)가 owner를 NULL로 바꾸더라도 이전에 같은 주소를 복사한 alias는 자동으로 바뀌지 않습니다.

    struct Student *alias = owner;
    destroy_students(&owner);
    /* owner는 NULL이지만 alias는 사용하면 안 되는 댕글링 포인터 */

따라서 “해제 후 NULL”은 유용한 방어지만 명확한 소유권 규칙을 대신하지는 않습니다.

## 단계별 예제

### 1단계: 계약 실패를 먼저 처리한다

출력 포인터가 없거나 점수가 범위 밖이면 할당하지 않습니다.

    if (out_students == NULL ||
        initial_score < 0 || initial_score > 100) {
        return 0;
    }

실패 전에 *out_students를 NULL로 덮지 않습니다.

### 2단계: 0개 정책을 처리한다

    if (count == 0) {
        *out_students = NULL;
        return 1;
    }

이 경로는 성공이므로 출력을 공개합니다. 반면 잘못된 점수는 count가 0이어도 실패하도록 점수 검사를 앞에 두었습니다. 함수 계약에서 정한 순서입니다.

### 3단계: 곱셈 전에 상한을 확인한다

    if (count > SIZE_MAX / sizeof(struct Student)) {
        return 0;
    }

동일한 의미를 포인터 기준으로 쓰려면 실제 지역 포인터 선언 뒤 sizeof *students를 사용할 수 있습니다.

### 4단계: 임시 포인터에 할당한다

    struct Student *students =
        malloc(count * sizeof *students);
    if (students == NULL) {
        return 0;
    }

아직 *out_students는 바뀌지 않았습니다.

### 5단계: 모든 원소를 초기화하고 소유권을 전달한다

    for (size_t i = 0; i < count; ++i) {
        students[i].id = 0;
        students[i].score = initial_score;
    }
    *out_students = students;
    return 1;

### 6단계: 사용이 끝난 뒤 해제한다

    destroy_students(&students);

반환 뒤 students == NULL이므로 같은 해제 함수를 다시 호출해도 실제 블록을 두 번 free하지 않습니다.

## 완성 프로그램

아래 프로그램은 두 함수의 일반적인 사용 예입니다. 학습 실습에는 main을 제출하지 않고 두 함수만 구현합니다.

    #include <stddef.h>
    #include <stdint.h>
    #include <stdio.h>
    #include <stdlib.h>

    struct Student {
        int id;
        int score;
    };

    int create_students(size_t count, int initial_score,
                        struct Student **out_students) {
        if (out_students == NULL ||
            initial_score < 0 || initial_score > 100) {
            return 0;
        }
        if (count == 0) {
            *out_students = NULL;
            return 1;
        }
        struct Student *students = NULL;
        if (count > SIZE_MAX / sizeof *students) {
            return 0;
        }
        students = malloc(count * sizeof *students);
        if (students == NULL) {
            return 0;
        }
        for (size_t i = 0; i < count; ++i) {
            students[i].id = 0;
            students[i].score = initial_score;
        }
        *out_students = students;
        return 1;
    }

    void destroy_students(struct Student **students) {
        if (students == NULL) return;
        free(*students);
        *students = NULL;
    }

    int main(void) {
        struct Student *students = NULL;
        if (!create_students(3, 70, &students)) {
            puts("CREATE FAILED");
            return 1;
        }
        for (size_t i = 0; i < 3; ++i) {
            printf("%d:%d\n", students[i].id, students[i].score);
        }
        destroy_students(&students);
        printf("released: %s\n", students == NULL ? "yes" : "no");
        return 0;
    }

## 실행 결과

    0:70
    0:70
    0:70
    released: yes

각 원소는 읽기 전에 초기화되었습니다. released가 yes인 것은 free가 성공 여부를 반환한다는 뜻이 아니라, 해제 함수가 호출자 포인터를 NULL로 바꾼 결과입니다.

## 흔한 오류

### count바이트만 할당한다

    malloc(count)

원소 하나가 1바이트라는 보장은 없습니다. 반드시 count * sizeof *students를 사용합니다.

### 곱셈 뒤에 오버플로를 검사한다

곱셈 결과가 이미 순환한 뒤에는 원래 요청이 너무 컸다는 정보를 잃습니다. 나눗셈 검사를 먼저 합니다.

### malloc 반환값을 검사하지 않는다

NULL에서 students[i]를 계산하면 유효한 객체를 가리키지 않습니다.

### 실패 전에 출력을 덮는다

함수 시작과 동시에 *out_students = NULL을 수행하면 실패 시 출력 보존 계약을 깨뜨립니다. 0개 성공 또는 실제 생성 성공에서만 기록합니다.

### free 뒤 계속 사용한다

해제한 배열의 멤버를 읽거나 쓰면 정의되지 않은 동작입니다.

### 같은 블록을 두 번 해제한다

이중 해제는 정의되지 않은 동작입니다. 해제 뒤 소유자 포인터를 NULL로 만들고, 별칭을 통해 다시 해제하지 않습니다.

## 중간 점검

1. SIZE_MAX 검사보다 곱셈을 먼저 하면 왜 늦습니까?
2. count == 0에서 malloc을 호출하지 않는 이유는 무엇입니까?
3. 임시 포인터와 출력 포인터를 분리하면 실패 계약이 어떻게 단순해집니까?
4. free 뒤 NULL 대입이 별칭 포인터까지 고치지 못하는 이유는 무엇입니까?
5. 할당 실패를 실제 메모리 고갈 없이 어떻게 검증할 수 있습니까?

## 핵심 요약

- 동적 배열 크기는 원소 수와 원소 크기의 곱입니다.
- size_t 곱셈 전에 count > SIZE_MAX / sizeof *students를 검사합니다.
- 0개는 malloc을 호출하지 않는 명시적 성공 정책으로 처리합니다.
- malloc 실패에서는 출력값을 보존합니다.
- 할당한 메모리는 읽기 전에 초기화합니다.
- 초기화 완료 뒤 호출자에게 소유권을 전달합니다.
- free 뒤 소유자 포인터를 NULL로 만듭니다.
- NULL 대입은 별칭과 잘못된 소유권 설계를 자동으로 해결하지 않습니다.

## 기초 코딩 연습

create_students에서 count가 0일 때 malloc을 호출하지 않고 성공하도록 구현하세요. out_students가 NULL이면 어떤 count에서도 실패해야 합니다.

## 응용 연습

초기화 값을 하나가 아니라 id_start와 initial_score로 받아, id가 id_start부터 순서대로 증가하도록 바꾸세요. id_start + i가 int 범위를 넘지 않는지 덧셈 전에 검사하는 계약도 설계하세요.

## 도전 문제

이미 생성된 배열의 용량을 늘리는 함수를 설계하세요. realloc 실패 시 기존 포인터가 여전히 유효하다는 점 때문에 반환값을 원래 포인터에 바로 대입하면 안 되는 이유를 설명하고 임시 포인터를 사용하세요.

## Mini Project

학생 명부 프로그램을 다음 흐름으로 확장하세요.

1. 검증한 학생 수만큼 동적 배열을 생성합니다.
2. 각 학생을 입력하되 점수 범위를 확인합니다.
3. 중간 입력 실패 시 이미 소유한 배열을 해제합니다.
4. 안정 정렬과 첫 위치 이진 탐색을 수행합니다.
5. 모든 정상·실패 종료 경로에서 소유권을 정리합니다.

## 테스트와 풀이 개선

좋은 테스트는 정상 출력만 비교하지 않습니다.

- 요청한 바이트 수가 count * sizeof(struct Student)인지 확인합니다.
- 0개에서 할당 함수가 호출되지 않는지 확인합니다.
- SIZE_MAX 경계가 실제 malloc 호출 전에 거부되는지 확인합니다.
- 할당 실패를 주입하고 출력 포인터가 보존되는지 확인합니다.
- 모든 원소가 초기화되는지 확인합니다.
- destroy_students(NULL)과 *students == NULL을 구분합니다.
- 두 번 파괴해도 실제 free가 한 번뿐인지 확인합니다.
- 디버그 출력이 함수 계약을 오염시키지 않는지 확인합니다.

CodeWeave 하네스의 링커 래퍼는 malloc과 free 호출 횟수 및 요청 크기를 관찰합니다. 이 방식은 GCC 기반 로컬 학습 검사에 한정되며 C 언어 자체의 이식 가능한 기능으로 가르치지 않습니다.

## 복습 연결

앞 단원의 고정 길이 학생 명부와 비교해 보세요. 정렬·탐색 알고리즘은 같은 [0, count) 계약을 사용하지만 저장 공간의 수명과 해제 책임이 새로 생겼습니다.

다음 단원에서는 realloc으로 capacity를 키울 때 “성공해야만 소유권을 교체한다”는 원칙과, 여러 자원을 얻는 도중 실패했을 때 역순으로 정리하는 패턴을 학습합니다.
