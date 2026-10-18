# F01 제한 범위 종합 인수

검토: 2026-10-19 KST. 대상은 기존 `rust-cargo` 단원 하나다.
기준 SHA: [f91a931d3214e8038c8e889b5295790f29e02d50](https://github.com/cys123431-ship-it/CodeWeave/commit/f91a931d3214e8038c8e889b5295790f29e02d50).
해당 SHA의 [CI 39157149118](https://github.com/cys123431-ship-it/CodeWeave/actions/runs/39157149118)와 세 작업 로그를 직접 재조회했다.
전체 654/654, 실패/skip 0. macOS 관련 112건 중 111통과·Linux 전용 1skip, 취소 반복 120/120.
이 문서는 자동 성공 판별기가 아니다. 아래 근거를 읽은 뒤 운영자가 로드맵 인수를 기록한다.

## 완료로 인정하는 제한 범위

25분 분량의 Cargo 설정·라이브러리·통합 테스트, 함수 `total`의 수량×단가 계약,
컴파일 오류/단언 실패 구별, 수정·재제출과 기록 복원까지다.
단원 화면의 12절, 독립 원고 121줄과 완성 파일 3개를 직접 검토했다.
계약은 items 0~10, price 0~1000이며 범용 금액 처리나 소유권 학습까지 확장하지 않는다.
일반 `npm start`는 C 전용이고, 명시적으로 구성한 Linux/macOS 개인 Cargo 서버에서만 F01 실습을 실행한다.

| 인수 경로 | 검토한 파일·검사 | 실제 근거 |
|---|---|---|
| 이론·필요성·선수·목표 | `content/rust/01-cargo.md`, `src/catalog.js` | 파일 역할·C 함수와 연결, 식 반환·계약·흔한 오류·복습 검토 |
| 정적 도식 | `src/figures.js`, `tests/rust-cargo-lesson.test.mjs` | Cargo 흐름의 접근 가능한 독자 SVG, 실행 마크업 없음 |
| 완성 예제·출력 | `tests/f01-manuscript.test.mjs`, `tests/rust-cargo-lesson.test.mjs` | 원고/화면 Cargo3파일 동일, 실제 Cargo 10통과→연산자 오답→수정10통과 |
| 개념 확인·퀴즈 재시도 | `tests/rust-cargo-lesson.test.mjs`, `tests/browser-practice.mjs` | --no-run 의미, 오답→재시도, 읽음/퀴즈/실습 분리 |
| 스타터·서버 소유10사례 | `server/rust-exercises.mjs`, `tests/rust-exercises.test.mjs` | 0/상한/일반/반복 호출, 서버 소유 하네스, 기본 C registry와 분리 |
| 실제 제출·수정·재제출 | `tests/rust-http.test.mjs`, `tests/rust-client.test.mjs`, `tests/rust-workbench.test.mjs`, `tests/browser-practice.mjs` | 실제 Cargo 스타터 컴파일 실패→연습장 단언 실패→수정10/10, 단원/연습장 이력 공유 |
| 백업·오프라인 | `tests/browser-practice.mjs` | 통합v1/기존C 복원, Rust 이력 유지, 390px·오프라인 읽기/복원·실행 비활성 |
| 숙달·다음 단원 | `tests/browser-practice.mjs` | 실제Cargo 통과만으로 숙달 아님, 이론/퀴즈 뒤 숙달→rust-mut 이동→복귀 상태 유지 |
| 명시적 시작·종료 | `scripts/start-rust.mjs`, `tests/start-rust.test.mjs`, `tests/rust-executor.test.mjs` | 양 OS 실제CLI HTTP 오답→수정10/10, 신뢰/경로 필수, 종료·작업 공간 정리 |

브라우저 근거는 실제 Cargo 서비스를 사용하는 구간과 합성 UI 구간을 구분해서 읽었다.
실제 Cargo 구간에 다음 단원 이동/복귀가 포함되므로 서로 다른 구간을 하나의 E2E처럼 합치지 않는다.
기초·응용·도전·작은 영수증 프로젝트는 원고/화면에 있고, 확장 프로젝트 검사는 개인 터미널 작업이다.

## 완료로 인정하지 않는 것

- Rust 트랙 전체, F02 이후 단원, 소유권/빌림·Cargo 다중 파일 학습 채점의 완성.
- Windows 네이티브 Rust 실행, 실제 휴대전화/태블릿/PWA 설치 및 실기기 접근성 인수(H/I).
- 공개 실행 격리·배포. 실행 권한·보안 경계는 [상시 제약](AUTONOMOUS_DEVELOPMENT.md#상시-제약)을 그대로 따른다.
- Cargo 내부 자원 부족 오류의 세부 분류 완성. 빌드가 시작되기 전의 준비 장애는 운영 오류로 분리하지만,
  Cargo 내부에서 발생한 모든 자원 문제를 소스 오류와 완전히 분리했다고 주장하지 않는다.
  자원 한도·취소·정리 미확정 격리는 그대로이며 이 분류 개선은 후속 유지보수 범위다.

## 로드맵 반영 계약

`practiceDelivery.scope=trusted-local-cargo`는 위 제한 범위와 검토한 SHA/CI/9개 점검·두 OS를 기록한다.
검증기는 F01·정확한 문제 매핑·원고·관련 검사·서버10사례·기본 비활성을 확인한다.
SHA/URL 형식만으로 CI 성공을 증명하지 않는다. 원격 CI와 로그의 독립 확인은 실행자의 책임이다.
기존 theoryDelivery는 과거 이론 인수 근거로 보존하며 현재 실제 실습 인수와 혼동하지 않는다.
F01 인수 후 개발 순환은 C/C06이다. 학습자 화면의 다음 Rust 단원(rust-mut)과 개발 순환은 서로 다르다.
