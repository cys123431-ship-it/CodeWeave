# C07 — 오류 반환·errno와 소유 스트림 정리

## 개요·필요성·선수·목표
C05에서는 빌린 FILE을 읽고도 닫지 않았다. 이번에는 호출자가 소유권을 넘긴 FILE을 함수가 책임지고 닫는다.
파일 읽기에 실패했을 때 바로 return하면 열린 자원이 남을 수 있고, 닫은 뒤 errno를 읽으면 읽기 실패의 원인을 잃을 수 있다.
선수: 함수·포인터·C05의 int/fgetc·EOF/ferror. 예상25분. 목표는 결과·진단·소유권·정리를 따로 추적하는 것이다.
이번 첫 범위는 한 바이트 읽기다. 경로 열기, 여러 자원, 동적 메모리와 복구 재시도는 후속 범위다.

## 이론 — 반환 상태와 출력값을 분리하기
read_owned_byte(FILE *stream, int *out_byte, int *out_error)를 작성한다. 1은 한 바이트 성공, 0은 정상 EOF, -1은 오류다.
1일 때만 out_byte를 변경한다. 정상 EOF와 오류에서는 기존 값을 보존한다. out_error는 정상 읽기/EOF에0, 오류에는 저장한 진단 코드다.
NULL 스트림·NULL 출력 인수·두 출력 포인터의 같은 객체는 -1이며 출력과 스트림을 모두 건드리지 않는다. 이 경우 소유권도 넘어오지 않았다.

## 이론 — 소유권이 넘어오는 시점
인수 검증을 모두 통과하면 스트림 소유권이 함수로 넘어온다. 그 뒤에는 읽기 성공·EOF·오류 어느 경로든 한 번 fclose한다.
반환 후 호출자는 그 FILE 포인터로 읽기·닫기를 반복하지 않는다. fclose가 실패한 뒤에도 이미 닫기를 시도한 FILE을 재사용하지 않는다.
C05의 borrowed 계약과 이번 owned 계약은 어느 쪽이 더 좋다는 뜻이 아니라 누가 정리할지 정한 서로 다른 약속이다.

## 이론 — errno는 실패 판정기가 아니다
먼저 fgetc의 반환과 ferror를 확인한다. 이전 작업이 남긴 errno가0이 아니어도 이번 읽기는 성공할 수 있다.
실패한 작업 직후 필요한 errno를 지역 saved에 복사한다. 이후 fclose가 errno를 바꾸어도 읽기 진단은 saved에 남는다.
이 API는 기존 스트림 오류 또는 실패 시 진단0이면 EIO를 쓰기로 정했다. 이 fallback은 이 실습의 정책이지 모든 C 함수의 언어 규칙이 아니다.
읽기와 닫기가 모두 실패하면 먼저 저장한 읽기 오류를 우선한다. 읽기는 정상인데 닫기만 실패하면 -1이며 바이트 출력은 보존한다.

## 도식 — 저장한 진단을 들고 정리 지점으로
독자 정적 도식 키: owned-stream-cleanup. 유효 인수→소유권 이전→읽기 결과/진단 저장→fclose→최종 상태와 출력 확정.
실패와 정상 EOF가 모두 fclose로 이어지는 선을 종이에 그려 보자. 인수 검증 실패만 호출자에게 소유권이 남는다.

## 완성 프로그램 — 읽기와 정상 EOF
아래는 완성 프로그램이다. 실습 제출에는 main을 제외한 read_owned_byte 함수와 필요한 include만 작성한다.
```c
#include <stdio.h>
#include <errno.h>
int read_owned_byte(FILE *stream, int *out_byte, int *out_error) {
    if (stream == NULL || out_byte == NULL || out_error == NULL || out_byte == out_error) return -1;
    int status = -1, value = 0, saved = 0;
    if (ferror(stream)) saved = EIO;
    else {
        errno = 0;
        value = fgetc(stream);
        if (value == EOF) {
            if (ferror(stream)) saved = errno != 0 ? errno : EIO;
            else status = 0;
        } else status = 1;
    }
    errno = 0;
    int closed = fclose(stream);
    if (closed != 0 && saved == 0) {
        saved = errno != 0 ? errno : EIO;
        status = -1;
    }
    if (saved != 0) status = -1;
    if (status == 1) *out_byte = value;
    *out_error = saved;
    return status;
}
int main(void) {
    FILE *stream = tmpfile();
    if (stream == NULL) return 2;
    if (fputc('A', stream) == EOF || fseek(stream, 0, SEEK_SET) != 0) {
        (void)fclose(stream);
        return 2;
    }
    int byte = 777, error = 999;
    int status = read_owned_byte(stream, &byte, &error);
    printf("%d %d %d\n", status, byte, error);
    stream = tmpfile();
    if (stream == NULL) return 2;
    byte = 777;
    status = read_owned_byte(stream, &byte, &error);
    printf("%d %d %d\n", status, byte, error);
    return 0;
}
```

## 실제 출력과 단계별 이유
```text
1 65 0
0 777 0
```
첫 스트림은 A를 읽고 닫아1과65를 얻는다. 두 번째 빈 스트림은 정상 EOF이므로0이며 기존 바이트 출력777을 보존한다.
표시65는 CI의 ASCII 호환 환경에서 A의 값이다. C가 모든 문자 집합에서 A의 숫자값65를 보장한다는 뜻은 아니다.
gcc -std=c11 -Wall -Wextra -Wpedantic -Werror example.c -o example 뒤 실행한다. tmpfile 준비 실패는 main의 별도 오류 경로다.

## 흔한 오류 — 정리와 진단의 순서
fgetc 결과를 char로 저장하면 0xFF와 EOF를 혼동하기 쉽다. int를 유지한다.
errno만 보고 실패로 판단하지 말자. fclose 뒤의 errno를 읽기 오류라고 보고하지 말자.
정상 EOF를 오류로 취급하거나 출력값부터 덮어쓰지 않는다. 소유권을 받은 뒤 중간 return으로 닫기를 건너뛰지 않는다.
반대로 잘못된 출력 인수를 받은 단계에서 호출자의 스트림까지 닫는 것도 계약 위반이다.

## 중간 점검·퀴즈·핵심 요약
퀴즈: 읽기 오류를 발견했지만 fclose도 호출해야 한다. 무엇을 먼저 할까?
A) errno를 saved에 저장 B) FILE을 다시 읽기 C) 출력값0 기록 D) 호출자가 닫기를 추측하게 두기. 정답A.
점검: 빈 스트림의 out_byte는? 기존 값이다. 인수 검증 실패 뒤 누가 닫나? 호출자다. 유효 인수로 호출한 뒤 누가 닫나? 함수다.
요약: 상태와 출력 분리→소유자 확인→실패 직후 진단 저장→정리→최종 출력 확정.

## 직접 풀기 — 기초·응용·도전
기초: 한 바이트와 빈 스트림을 비교한다. 응용: 오래된 errno가 있어도 성공을 반환하고 0x00/0xFF를 구별한다.
도전: 새 읽기 오류·기존 오류·NULL/별칭 인수·독립 반복 호출에서도 출력 보존과 닫기가 맞는지 검사한다.
이전 실패 코드를 정답으로 바꾸는 것만으로 끝내지 말고 모든12사례를 다시 실행한다.

## Mini Project — 자원 책임 표 만들기
파일을 여는 호출자와 읽고 닫는 함수의 책임을 두 열로 정리한다. 각 return 옆에 열린 FILE의 최종 소유자를 써 본다.
같은 읽기 작업을 C05 borrowed 계약으로 바꾸면 어느 fclose를 호출자로 옮겨야 하는지 설명한다.

## 심화 — ISO C와 POSIX 검사 범위
<details><summary>심화: 오류 코드·실패 주입·닫기 실패</summary>
FILE/fgetc/ferror/fclose 개념과 POSIX의 구체 errno를 구별한다. EIO/EAGAIN 및 pipe·fcntl·fdopen을 쓰는 하네스는 POSIX 범위다.
12사례에는 읽기 성공·정상 EOF 뒤의 닫기 실패와 읽기 EAGAIN·닫기 EIO 동시 실패가 포함된다. glibc의 fopencookie, macOS의 funopen으로 stdio 콜백에 실패를 주입하고, 출력 보존·첫 진단 우선·닫기 콜백 1회를 확인한다. 이 확장 API는 ISO C 기능이 아니다.
운영체제별 진단 문자열이나 errno 숫자를 고정 답으로 외우지 않는다.
참조: https://pubs.opengroup.org/onlinepubs/9799919799/functions/fgetc.html
참조: https://pubs.opengroup.org/onlinepubs/9799919799/functions/fclose.html
</details>

## 테스트·개선·복습 연결
학습 화면과 연습장은 같은 스타터와 서버 전용12사례를 사용한다. 제출에는 main을 제외한 함수와 필요한 include만 넣는다.
실패 사례에서 반환값·출력값·닫기 책임을 추적하고 수정·재제출한다. 이력에서 앞선 코드를 복원하고 통합 백업으로 보관한다. 이론·퀴즈·실습·복습·전체 숙달은 서로 다른 상태다.
C05의 빌린 자원과 대비해 복습하고, 뒤에서 여러 자원을 얻었을 때 역순으로 정리하는 문제로 확장한다.
