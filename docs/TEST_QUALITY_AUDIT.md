# 콘텐츠 검사 품질 정리 — 2-4

기준: `9d3908d6efa91d52cb142c0ed0fc70782d8b250e`의 `tests/*-content.test.mjs` 22개 파일. 교육 문장·특정 단어·절 수를 코드 품질의 대리 지표로 쓰지 않는다. 필수 헤딩과 예제의 실제 컴파일·출력 검사는 유지하고, 채점·저장/백업·보안·화면 접근성 동작 검사는 이 정리 때문에 제거하지 않는다. 교육 내용의 사실성·깊이는 원고 검토로 확인한다.

## 전체 목록과 처리 상태

아래 이름은 모두 `tests/` 아래 파일이다. 최소 절 수는 수정 전 요구값이다. 각 파일의 단원 소개 검사, SVG 문구 검사, 원고 설명 검사에 있던 단어/문장 포함 조건을 조사했다. 필수 헤딩 배열과 컴파일용 코드 블록 추출 정규식은 삭제 대상이 아니다. 콘텐츠 파일에서 별도의 원고 줄 수 강제 조건은 발견하지 못했다. README150줄·일지15줄은 사용자가 명시한 운영 계약이므로 별도 유지한다.

| 파일 | 기존 최소 절 수 | 표현 강제의 예 | 처리 |
|---|---:|---|---|
| hello-content.test.mjs | 12 | C99·printf 음수·문자열 리터럴 문장, 번역/링크 도식 문구 | 1차 정리 |
| types-content.test.mjs | 16 | CHAR_BIT·FLT_DIG·정의되지 않은 동작, 변환 도식 문구 | 1차 정리 |
| loops-content.test.mjs | 16 | 500500·32767·N1570, 반복 도식 문구 | 1차 정리 |
| array-max-content.test.mjs | 9 | INT_MIN·출력 보존 설명, 상태 도식 문구 | 1차 정리 |
| string-content.test.mjs | 10 | 널 종료·문자열 리터럴 문장, 여기서 중지 도식 문구 | 1차 정리 |
| bounded-string-content.test.mjs | 11 | 읽기 가능 보장·fgets 성공 문장, capacity 도식 문구 | 1차 정리 |
| arrays-content.test.mjs | 18 | 미초기화·const·N1570, 인덱스 도식 문구 | 2차 정리 |
| pointers-content.test.mjs | 20 | 포인터도 값 전달·NULL 검사만·수명, 별칭 도식 문구 | 2차 정리 |
| function-scope-content.test.mjs | 20 | 저장기간·상수 식·스택·N1570, 가림 도식 문구/고정 치수 | 2차 정리 |
| functions-content.test.mjs | 8 및 5 | 퀴즈 정답 문장·하네스/부작용 설명 | 2차 정리 |
| recursion-content.test.mjs | 20 | 재귀/자원 설명, 호출/반환 도식 문구/고정 치수 | 2차 정리 |
| matrix-rows-content.test.mjs | 20 | 행 객체/경계 설명, 도식 레이블 | 2차 정리 |
| fgets-content.test.mjs | 11 | 정확히7바이트·EOF·잘림 판단 문장 | 미처리 |
| strtol-content.test.mjs | 12 | endptr·errno·ERANGE·비트 수 가정 문장 | 미처리 |
| struct-content.test.mjs | 11 | 값 복사·padding·덧셈 전 범위/원본 보존 문장 | 미처리 |
| struct-array-content.test.mjs | 11 | sizeof students·중복 첫 위치·출력 객체 문장 | 미처리 |
| struct-array-sort-content.test.mjs | 11 | 안정 정렬·구조체 전체·오버플로 문장 | 미처리 |
| struct-array-binary-search-content.test.mjs | 11 | 정렬 전제·right = mid·첫 위치 문장 | 미처리 |
| student-registry-content.test.mjs | 12 | 파일 이름/순서·같은 id 상대 순서 문장 | 미처리 |
| dynamic-memory-content.test.mjs | 12 | malloc(0)·소유권·할당 실패 주입 문장 | 미처리 |
| realloc-content.test.mjs | 12 | 임시 포인터·주소 변경·--wrap=realloc 문장 | 미처리 |
| student-vector-push-content.test.mjs | 12 | 0→4·두 배·길이 공개·격리 설명 문장 | 미처리 |

처리 범위는 12/22 파일이며 2-4 전체 완료가 아니다. 1회 변경 파일10개 제한을 지키기 위해 나머지10개는 후속 실행에서 같은 원칙으로 정리한다. 다음 묶음은 fgets/strtol/struct/struct-array/struct-array-sort/struct-array-binary-search를 우선한다.

## 1차에 삭제한 검사

- 완전 삭제한 테스트: `loop reference solutions use a portable long accumulator and matching output format`. 다른 검사 파일의 C 소스 문자열에서 변수 이름·`long`·`%ld`를 찾던 검사다. 실제 GCC 출력·전체 허용 n(0~1000)·잘못된 입력·채점 API·브라우저 검사는 그대로 유지한다.
- 위6개 파일의 `lesson.sections.length >= ...` 조건을 삭제했다.
- hello/types/loops의 화면 본문 개념 단어 목록, 6개 원고의 특정 설명/문장 정규식, array-max의 실습 설명 문장 정규식을 삭제했다.
- 6개 SVG의 교육 레이블 문자열 일치 검사를 삭제했다. 기존 SVG 형식·이미지 역할·스크립트/애니메이션 거부 검사는 유지한다.
- loops 완성 프로그램의 변수 선언 철자 `long sum = 0` 정규식을 삭제했다. 실제 컴파일과 기대 출력 검사는 유지한다.

기존 테스트 기대값이나 학습 본문을 통과에 맞춰 바꾸지 않았다. 복합 테스트에서는 표현 검사 부분만 삭제했으므로 전체 테스트 함수 삭제 수와 제거한 표현 조건 수는 다르다. 기존 364건에서 위1건 삭제, 아래3건 추가로 전체366건이 된다.

## 먼저 작성한 회귀 검사

`tests/content-editing.test.mjs`는 임시 복사본에서만 변형하고 저장소 원고는 수정하지 않는다.

1. `editorial prose can be rewritten without changing headings, code or grading contracts`: 화면 설명·문제 설명과 원고의 코드/헤딩 밖 문장만 새 문장으로 교체해6개 검사 파일을 실제 실행한다. 수정 전 실패, 수정 후 통과.
2. `required manuscript heading removal is still rejected`: hello 필수 헤딩을 제거하면 기존 검사가 계속 실패해야 한다. 수정 전후 통과.
3. `a broken complete example is still rejected by GCC`: hello 완성 프로그램의 호출을 잘못된 함수로 바꾸면 GCC 오류로 계속 실패해야 한다. 수정 전후 통과. GCC 없으면 이 검사만 명시적 skip이다.

회귀 도구 검토에서 중첩 Node runner의 `NODE_TEST_CONTEXT` 상속과 첫 코드 조각 대신 완성 프로그램을 선택해야 하는 문제가 발견돼 도구를 교정했다. 기대값을 완화하지 않고 자식 runner의 실제 검사 수, 필수 헤딩 오류, GCC 진단을 확인한 뒤 수정 전2/3·수정 후3/3을 기록했다.

보안 영향: 임시 복사본에서 기존의 신뢰하는 예제만 실행하며 외부 입력·채점 API·정적 파일 허용 범위·학습자 저장 키와 백업 형식은 변경하지 않는다.

## 2차 — 배열·포인터·함수·재귀·행렬

기준은 `dd60685f646dc23c1ef6fe07c59e5ce599fa6f23`이다. 위6개 파일을 추가 정리했으며 이번에 완전히 삭제한 테스트 함수는 없다. 복합 테스트 이름은 남아 있는 헤딩·인터페이스·정적 SVG 검증 범위에 맞게 고쳤다.

- 삭제: 6개 파일의 최소 절 수, 화면/원고 개념 단어 목록, 도식 교육 레이블과 고정 viewBox/max-width 문자열 조건, 실습 설명의 단어 조건, 원고의 오래된 문장 부재 조건.
- 함수의 문제 설명·제목과 퀴즈 질문/선택지/해설 전체를 고정하던 문자열/객체 조건은 제거했다. 이는 사용자 요청에 따른 교육 문구 결합 해제다. 실습 id/starter/input/expected, 퀴즈 정답 인덱스·선택지 수·유효 인덱스, 선수 개념과6개 채점 사례 값은 유지한다. 실제 앱·문제·퀴즈 데이터는 바꾸지 않았다.
- 함수/행렬의 코드 조각 수2개 고정은 제거하고 비어 있으면 실패하도록 했다. 모든 발견된 조각의 실제 컴파일·화면/원고 코드 일치 검사는 계속한다. 행렬 설명에 `코드 조각`이라는 단어를 강제하던 조건도 제거했다.
- 재귀/행렬 채점 사례의 설명 레이블 단어 조건은 제거했다. 각20개 실제 GCC 하네스 실행·입출력·반환/출력 보존과 기존 배열/포인터 경계·컴파일/링크 오류 검사는 유지한다.

수정 전 추가한3개 회귀 검사는 다음과 같다(기존3개도 계속 실행).

1. `second content batch accepts edited explanations without changing runnable contracts`: 같은 임시 변형 도구로 새6개 검사 파일을 실행하고 설명·퀴즈 해설과 함수 정답 선택지의 동의 표현을 허용하는지 확인한다. 수정 전 실패→수정 후 통과.
2. `second content batch still rejects a missing function learning heading`: 함수 원고의 학습 목표 헤딩 누락은 계속 거부한다. 수정 전후 통과.
3. `second content batch still rejects an uncompilable matrix example`: 화면/원고의 동일한 완성 예제에 함께 `#error`를 넣고 코드 일치 검사만이 아니라 실제 컴파일 진단으로 거부함을 확인한다. 수정 전후 통과. GCC/Clang의 `#error` 진단 표기 차이는 허용하되 실제 `error:`를 요구한다.

신규3개는 수정 전2/3→수정 후3/3, 변형 회귀 전체는5/6→6/6이다. 테스트 함수 삭제 없이3개 추가해 전체366→369건이다. 2-4 전체 완료와 A~I 로드맵 완료율은 아직 주장하지 않는다.
