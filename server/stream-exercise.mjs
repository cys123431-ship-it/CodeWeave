// C05 preparation only: not in the production registry until the lesson handoff.
// Error/ownership probes use POSIX pipe/fcntl on Linux/macOS, not ISO C guarantees.
import { buildGradingExercises } from './exercise-contract.mjs';

export const streamMetadata = {
  id: 'c-file-stream-count', kind: 'concept', language: 'c', grader: 'c-function',
  concepts: ['file-stream', 'fgetc-int', 'eof-versus-error', 'borrowed-resource', 'failure-preservation'],
  prerequisites: ['c-functions', 'c-fgets-logical-line'],
  publicExample: { input: '현재 위치부터 {00, FF, 0A, 42} 네 바이트', output: '1 4 1' }
};
const labels = ['빈 스트림', '한 바이트', streamMetadata.publicExample.input, 'CR과 개행도 바이트',
  '현재 위치부터만 읽기', '상한4096', '상한 초과4097', 'NULL 인수와 미소비',
  '부분 읽기 오류와 기존 오류', '같은 EOF와 다른 스트림 반복'];
const expected = ['1 0 1', '1 1 1', '1 4 1', '1 5 1', '1 3 1', '1 4096 1',
  '0 777 1', '0 777 1\n0 777 1 0', '0 777 1 1\n0 777 1 1 90', '1 2 1\n1 0 1\n1 1 1'];
export const streamCases = labels.map((input, i) => ({ input, args: [String(i)], expected: expected[i] }));
export const streamStarter = `#include <stdio.h>
#include <stddef.h>
int count_stream_bytes(FILE *stream, size_t *out_count) {
    (void)stream;
    (void)out_count;
    /* TODO: int로 읽고 EOF 뒤 오류를 확인한 다음에만 결과 기록 */
    return 0;
}
`;
export const streamHarness = `#define _POSIX_C_SOURCE 200809L
#include <stdio.h>
#include <stdlib.h>
#include <stddef.h>
#include <unistd.h>
#include <fcntl.h>
#include <errno.h>

int count_stream_bytes(FILE *stream, size_t *out_count);
static int is_open(int fd) { return fd >= 0 && fcntl(fd, F_GETFD) != -1; }
static FILE *make_stream(const unsigned char *data, size_t count) {
    FILE *fp = tmpfile();
    if (fp == NULL) exit(2);
    if (fwrite(data, 1, count, fp) != count || fflush(fp) != 0 || fseek(fp, 0, SEEK_SET) != 0) exit(2);
    return fp;
}
static int report(FILE *fp) {
    int fd = fileno(fp);
    size_t count = 777;
    int ok = count_stream_bytes(fp, &count);
    int live = is_open(fd);
    printf("%d %zu %d\\n", ok, count, live);
    return live;
}
static void normal(const unsigned char *data, size_t count, long offset) {
    FILE *fp = make_stream(data, count);
    if (fseek(fp, offset, SEEK_SET) != 0) exit(2);
    if (report(fp) && fclose(fp) != 0) exit(2);
}
static void read_error(int preexisting) {
    int fds[2];
    if (pipe(fds) != 0 || fcntl(fds[0], F_SETFL, O_NONBLOCK) == -1) exit(2);
    FILE *fp = fdopen(fds[0], "rb");
    if (fp == NULL || setvbuf(fp, NULL, _IONBF, 0) != 0) exit(2);
    if (preexisting) {
        errno = 0;
        if (fgetc(fp) != EOF || !ferror(fp) || errno != EAGAIN) exit(2);
    }
    if (write(fds[1], preexisting ? "Z" : "X", 1) != 1) exit(2);
    size_t count = 777;
    int ok = count_stream_bytes(fp, &count);
    int live = is_open(fds[0]);
    int failed = live ? !!ferror(fp) : -1;
    printf("%d %zu %d %d", ok, count, live, failed);
    if (preexisting) printf(" %d", live ? fgetc(fp) : -2);
    putchar('\\n');
    if (live && fclose(fp) != 0) exit(2);
    if (close(fds[1]) != 0) exit(2);
}
int main(int argc, char **argv) {
    if (argc != 2) return 2;
    const unsigned char one[] = {'A'};
    const unsigned char binary[] = {0x00, 0xff, 0x0a, 0x42};
    const unsigned char text[] = {'a', '\\r', '\\n', 'b', '\\n'};
    const unsigned char position[] = {'X', 'Y', 'A', 'B', 'C'};
    unsigned char boundary[4097];
    for (size_t i = 0; i < sizeof boundary; ++i) boundary[i] = 'x';
    switch (atoi(argv[1])) {
        case 0: normal(one, 0, 0); break;
        case 1: normal(one, 1, 0); break;
        case 2: normal(binary, sizeof binary, 0); break;
        case 3: normal(text, sizeof text, 0); break;
        case 4: normal(position, sizeof position, 2); break;
        case 5: normal(boundary, 4096, 0); break;
        case 6: normal(boundary, 4097, 0); break;
        case 7: {
            size_t count = 777;
            int ok = count_stream_bytes(NULL, &count);
            printf("%d %zu 1\\n", ok, count);
            FILE *fp = make_stream(one, 1);
            int fd = fileno(fp);
            ok = count_stream_bytes(fp, NULL);
            int live = is_open(fd);
            printf("%d 777 %d %ld\\n", ok, live, live ? ftell(fp) : -1L);
            if (live && fclose(fp) != 0) return 2;
            break;
        }
        case 8: read_error(0); read_error(1); break;
        case 9: {
            FILE *fp = make_stream(position, 2);
            if (!report(fp)) break;
            if (report(fp) && fclose(fp) != 0) return 2;
            normal(one, 1, 0);
            break;
        }
        default: return 2;
    }
    return 0;
}
`;
export const streamExercise = buildGradingExercises(
  [streamMetadata], { 'c-file-stream-count': streamCases }, { 'c-file-stream-count': streamHarness }
).get('c-file-stream-count');
