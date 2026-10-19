# F02 제한 범위 종합 인수

검토: 2026-10-19 KST. 대상은 기존 `rust-mut` 단원 하나다.
기준 SHA: [0726bf04df84dea0a5af036ac1b632e580b92eaa](https://github.com/cys123431-ship-it/CodeWeave/commit/0726bf04df84dea0a5af036ac1b632e580b92eaa).
[CI 39221228817](https://github.com/cys123431-ship-it/CodeWeave/actions/runs/39221228817)의 전체 검사와 browser·macos-resources 로그를 이번 검토에서 직접 재조회했다.
Linux 전체726/726·실패/skip0, 실제 Cargo F02 browser 성공이다.
macOS 공통 회귀 성공을 F02 자체 실행 증거로 확대하지 않는다. F02의 실제 인수 플랫폼은 Linux 하나다.
문서·SHA·CI URL 형식 검사는 원격 성공을 증명하지 않으며 실행자가 별도로 확인해야 한다.

## 완료로 인정하는 제한 범위

예상25분의 바인딩·가변성·가림·i32/bool과 작은 함수 두 개다.
독자81줄 원고, 화면13절(심화 접기 포함), 정적 `rust-binding-copy` 도식과 완성 예제를 검토했다.
`next_count(start, step)`은 각 인자 -1000..=1000의 합을 반환하고 `is_nonnegative(value)`는 i32 전체 범위에서 0 이상을 판정한다.
실습은 main 없이 pub 함수 두 개만 제출한다. mut 문법을 문자열로 강제하지 않고 올바른 불변 식도 인정한다.
반복·조건·소유권·참조·문자열 입력·일반적인 산술 오버플로 처리는 이 범위가 아니다.

| 인수 경로 | 검토한 파일·검사 | 확인한 근거 |
|---|---|---|
| 이론·필요성·선수·목표 | `content/rust/02-bindings.md`, `src/catalog.js` | F01 연결, 복사된 지역 값과 호출자 값, 가림과 재대입 구별 |
| 예제·오류 수정 | `tests/rust-mut-preparation.test.mjs` | 원고 함수 정답2종 각10/10, 스타터·오답8종 거부, 완성 출력 `3 -2 false`/`true`, 실제 E0384 |
| 고정10사례 | `server/rust-mut-exercise.mjs` | 음수·0·양수·상쇄·계약 상하한·i32 판정 극값·독립 반복 호출 |
| 명시적 실행 | `tests/f02-opt-in.test.mjs` | 기본 CLI는 F02 거부, --include-f02 명시 시 인증HTTP 오답→정답10/10, 작업 폴더 정리 |
| 요청·기록 경계 | `tests/f02-client.test.mjs` | 토큰/정확한 과제 목록 필요, 잘못된10사례 결과는 이력 저장 전 거부 |
| 실제 두 화면 | `tests/browser-practice.mjs` | 실제 Cargo 스타터 단언 실패→연습장 수정10/10, 공유 이력·코드 복원·퀴즈 재시도 |
| 백업·숙달·다음 | 같은 실제 Cargo browser 구간 | 통합v1/기존C 복원, 이론·퀴즈 전에는 숙달 아님, 통과 후 숙달→연결 리스트 이동·복귀 |
| 모바일 폭·오프라인 | 같은 실제 Cargo browser 구간 | 390px 넘침 없음, 오프라인 초안/이력 유지·채점/숙달 잠금, 온라인 복구 |

기존 rust-mut 저장키·퀴즈 선택 번호는 유지한다. 예전 main 초안은 자동 교체하지 않으며 백업 후 명시적 초기화를 안내한다.
이전 준비 원고 마지막 절은 당시 미연결 상태의 기록이다. 현재 연결 상태는 위 기준 SHA의 화면·검사로 확인했다.

## 남은 범위와 개발 순환

- F02 자체의 macOS 실행 인수, Windows 네이티브 Rust, 실제 휴대전화/태블릿/PWA 설치·접근성 인수(H/I)는 미완료다.
- 로컬 작업 환경에서는 CPU 제한값2/2초에도 CPU6초 프로그램이 종료되지 않았다. 위 CI Linux의 같은 CPU 회귀 검사는 통과했다. 환경별 차이를 성공으로 덮지 않는다.
- 공개 실행·배포·격리 성공은 인수하지 않는다. [상시 제약](AUTONOMOUS_DEVELOPMENT.md#상시-제약)을 따른다.
- practiceDelivery는 Linux·명시 플래그·정확한 원고/검사/과제·9개 점검 근거를 기록한다. 기본 C registry와 F01 기본 허용 목록은 확장하지 않는다.
- 개발 차례는 C/C07 오류 반환·errno와 자원 정리 경로로 전환한다. 학습자 화면의 다음 단원 ds-list-find와 개발 순환은 별개다.
