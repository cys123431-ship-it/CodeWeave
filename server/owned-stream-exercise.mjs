// C07 preparation only: never registers a production grading capability.
import { buildGradingExercises } from './exercise-contract.mjs';

export const ownedStreamMetadata = {
  "id": "c-owned-stream-byte",
  "kind": "concept",
  "language": "c",
  "grader": "c-function",
  "concepts": [
    "owned-resource",
    "error-return",
    "errno-snapshot",
    "cleanup",
    "failure-preservation"
  ],
  "prerequisites": [
    "c-file-stream-count",
    "c-functions",
    "c-pointer"
  ],
  "publicExample": {
    "input": "소유 스트림 {0x2A}",
    "output": "1 42 0 1"
  }
};
export const ownedStreamCases = [
  {
    "input": "소유 스트림 {0x2A}",
    "args": [
      "0"
    ],
    "expected": "1 42 0 1"
  },
  {
    "input": "빈 스트림과 출력 보존",
    "args": [
      "1"
    ],
    "expected": "1"
  },
  {
    "input": "0x00과0xFF",
    "args": [
      "2"
    ],
    "expected": "1"
  },
  {
    "input": "뒤의 바이트를 읽지 않음",
    "args": [
      "3"
    ],
    "expected": "1"
  },
  {
    "input": "새 읽기 오류 EAGAIN과 닫기",
    "args": [
      "4"
    ],
    "expected": "1"
  },
  {
    "input": "기존 오류·남은 입력·오래된 errno",
    "args": [
      "5"
    ],
    "expected": "1"
  },
  {
    "input": "NULL 스트림 보존",
    "args": [
      "6"
    ],
    "expected": "1"
  },
  {
    "input": "출력 인수 검증 전 소유권 미이전",
    "args": [
      "7"
    ],
    "expected": "1"
  },
  {
    "input": "성공 때 오래된 errno 무시",
    "args": [
      "8"
    ],
    "expected": "1"
  },
  {
    "input": "독립 스트림 반복과 정리",
    "args": [
      "9"
    ],
    "expected": "1"
  },
  { input: '읽기 성공·정상 EOF 뒤 닫기 실패', args: ['10'], expected: '1' },
  { input: '읽기 오류 EAGAIN을 닫기 오류 EIO보다 우선 보존', args: ['11'], expected: '1' }
];
export const ownedStreamStarter = `#include <stdio.h>
int read_owned_byte(FILE *stream, int *out_byte, int *out_error) {
    (void)stream;
    (void)out_byte;
    (void)out_error;
    /* TODO: 유효한 인수이면 소유권을 받아 한 번 읽고 닫은 뒤 결과 기록 */
    return -1;
}
`;
export const ownedStreamHarness = `#define _GNU_SOURCE
#define _DARWIN_C_SOURCE
#define _POSIX_C_SOURCE 200809L
#include <stdio.h>
#include <stdlib.h>
#include <stddef.h>
#include <errno.h>
#include <unistd.h>
#include <fcntl.h>
int read_owned_byte(FILE *stream, int *out_byte, int *out_error);
static int live(int fd) { return fcntl(fd, F_GETFD) != -1; }
static FILE *data_stream(const unsigned char *bytes, size_t count) {
    FILE *fp = tmpfile();
    if (fp == NULL) exit(2);
    if (fwrite(bytes, 1, count, fp) != count || fflush(fp) != 0 || fseek(fp, 0, SEEK_SET) != 0) exit(2);
    return fp;
}
static int probe(FILE *fp, int expected_status, int expected_byte, int expected_error, int incoming) {
    int fd = fileno(fp), byte = 777, error = 999;
    errno = incoming;
    int status = read_owned_byte(fp, &byte, &error);
    int closed = !live(fd);
    int ok = status == expected_status && byte == expected_byte && error == expected_error && closed;
    if (!closed && fclose(fp) != 0) exit(2);
    return ok;
}
static int read_failure(int preexisting) {
    int fds[2];
    if (pipe(fds) != 0 || fcntl(fds[0], F_SETFL, O_NONBLOCK) == -1) exit(2);
    FILE *fp = fdopen(fds[0], "rb");
    if (fp == NULL || setvbuf(fp, NULL, _IONBF, 0) != 0) exit(2);
    if (preexisting) {
        errno = 0;
        if (fgetc(fp) != EOF || !ferror(fp) || errno != EAGAIN) exit(2);
        if (write(fds[1], "Z", 1) != 1) exit(2);
    }
    int ok = probe(fp, -1, 777, preexisting ? EIO : EAGAIN, preexisting ? ERANGE : 0);
    if (close(fds[1]) != 0) exit(2);
    return ok;
}
static int invalid_outputs(int kind) {
    const unsigned char bytes[] = {'A', 'B'};
    FILE *fp = data_stream(bytes, sizeof bytes);
    int fd = fileno(fp), byte = 777, error = 999;
    int status = read_owned_byte(fp, kind == 0 ? NULL : &byte,
        kind == 1 ? NULL : kind == 2 ? &byte : &error);
    int open = live(fd);
    int ok = status == -1 && byte == 777 && error == 999 && open;
    if (open) {
        ok = (ftell(fp) == 0) && ok;
        if (fclose(fp) != 0) exit(2);
    }
    return ok;
}
/* Custom streams inject real stdio read/close failures without linker hooks.
   glibc uses fopencookie; macOS uses funopen. No OS descriptor is owned. */
struct failing_stream { int mode; int reads; int closes; };
#ifdef __APPLE__
static int injected_read(void *cookie, char *buffer, int size) {
#else
static ssize_t injected_read(void *cookie, char *buffer, size_t size) {
#endif
    struct failing_stream *state = cookie;
    if (size == 0) return 0;
    state->reads++;
    if (state->mode == 2) { errno = EAGAIN; return -1; }
    if (state->mode == 1 || state->reads > 1) return 0;
    buffer[0] = 42;
    return 1;
}
static int injected_close(void *cookie) {
    struct failing_stream *state = cookie;
    state->closes++;
    errno = EIO;
    return -1;
}
static int close_failure(int mode) {
    struct failing_stream state = {mode, 0, 0};
#ifdef __APPLE__
    FILE *fp = funopen(&state, injected_read, NULL, NULL, injected_close);
#else
    cookie_io_functions_t callbacks = {injected_read, NULL, NULL, injected_close};
    FILE *fp = fopencookie(&state, "r", callbacks);
#endif
    if (fp == NULL || setvbuf(fp, NULL, _IONBF, 0) != 0) exit(2);
    int byte = 777, error = 999;
    errno = ERANGE;
    int status = read_owned_byte(fp, &byte, &error);
    int ok = status == -1 && byte == 777 && error == (mode == 2 ? EAGAIN : EIO)
        && state.reads == 1 && state.closes == 1;
    if (state.closes == 0) (void)fclose(fp);
    return ok;
}
int main(int argc, char **argv) {
    if (argc != 2) return 2;
    const unsigned char star[] = {0x2a};
    const unsigned char zero[] = {0};
    const unsigned char ff[] = {0xff};
    const unsigned char pair[] = {'A', 'B'};
    int ok = 0;
    switch (atoi(argv[1])) {
        case 0: {
            FILE *fp = data_stream(star, sizeof star);
            int fd = fileno(fp), byte = 777, error = 999;
            errno = 0;
            int status = read_owned_byte(fp, &byte, &error);
            int closed = !live(fd);
            printf("%d %d %d %d\\n", status, byte, error, closed);
            if (!closed && fclose(fp) != 0) return 2;
            return 0;
        }
        case 1: ok = probe(data_stream(star, 0), 0, 777, 0, ERANGE); break;
        case 2: ok = probe(data_stream(zero, 1), 1, 0, 0, 0)
                     && probe(data_stream(ff, 1), 1, 255, 0, 0); break;
        case 3: ok = probe(data_stream(pair, 2), 1, 'A', 0, 0); break;
        case 4: ok = read_failure(0); break;
        case 5: ok = read_failure(1); break;
        case 6: {
            int byte = 777, error = 999;
            int status = read_owned_byte(NULL, &byte, &error);
            ok = status == -1 && byte == 777 && error == 999;
            break;
        }
        case 7: ok = invalid_outputs(0) && invalid_outputs(1) && invalid_outputs(2); break;
        case 8: ok = probe(data_stream(star, 1), 1, 42, 0, ERANGE); break;
        case 9: ok = probe(data_stream(star, 0), 0, 777, 0, EDOM)
                     && probe(data_stream(ff, 1), 1, 255, 0, EDOM)
                     && probe(data_stream(pair, 2), 1, 'A', 0, 0); break;
        case 10: ok = close_failure(0) && close_failure(1); break;
        case 11: ok = close_failure(2); break;
        default: return 2;
    }
    printf("%d\\n", ok);
    return 0;
}
`;
export const ownedStreamExercise = buildGradingExercises(
  [ownedStreamMetadata], { [ownedStreamMetadata.id]: ownedStreamCases },
  { [ownedStreamMetadata.id]: ownedStreamHarness }
).get(ownedStreamMetadata.id);
