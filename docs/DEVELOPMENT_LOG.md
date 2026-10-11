# CodeWeave 개발 일지

## 2026-10-11 (2차 패치 GitHub 반영)

기존 GitHub 반영 실패 패치를 재검토하여 main 브랜치에 업로드했습니다. 시작 시점 main HEAD: `6fde9b53f2e7b05ea9919e31ba43ef688d8abe01`.

**새로 반영한 파일**
- `workbench.html`, `workbench.css`: 모바일 대응 C언어 반복 제출 연습장.
- `src/workbench.js`: C언어 기존 문제·스타터 코드, 로컬 GCC 채점 API, 제출 이력/코드 복원, 작성 코드 자동 저장.
- `src/attempt-backup.js`: C 문제에 한정한 제출 기록과 코드 초안 JSON 내보내기·복원 및 검증.
- `tests/attempt-backup.test.mjs`, `tests/workbench-source.test.mjs`: 백업/복원·정적 페이지·JS 문법 테스트.

**기존 파일 변경**
- `src/app.js`: 학습 대시보드에서 별도 반복 제출 연습장으로 가는 메뉴 연결.
- `sw.js`: 새로운 연습장 파일의 PWA 캐시 추가 및 버전 갱신.
- `README.md`: 기능 이용법과 로컬 채점의 제한 문서화.

**검증**
- 최신 패치를 포함한 GitHub Actions의 Node.js 검사: 성공 (기능 연결 후 https://github.com/cys123431-ship-it/CodeWeave/actions/runs/38103497305).
- 검증된 범위: 단위 테스트 및 문법 검사. 실제 브라우저 E2E/공개 배포 검증은 아직 실시하지 않음.
- 로컬 GCC 실행은 격리된 샌드박스가 아니므로 공개 서비스 사용 금지.

**다음 작업**
1. 기존 일반 학습 백업과 연습장 반복 제출 백업을 통합하고, 이전 풀이 이력 UI를 메인 코딩 실습 화면에 직접 표시.
2. 정적 파일 서버에서 불필요한 프로젝트/비공개 파일 접근 차단.
3. `content/c/06-functions.md`를 실제 학습 카탈로그에 연결하고 교과서형 설명·자동 채점 문제 확대.
4. 실제 브라우저에서 PWA 설치·오프라인·모바일 화면을 E2E 검증.

---

## 2026-10-11 02:39 KST

GitHub main 브랜치와 README, ROADMAP, ARCHITECTURE, CONTENT_POLICY, 소스, 기존 테스트, CI를 확인했습니다.

이번 실행에서 추가한 파일:
- src/iterations.js: 문제별 제출 이력 정규화, 최대 10회 저장, 통과 문제 계산.
- tests/iterations.test.mjs: 제출 이력의 저장 순서, 길이 제한, 복원 데이터 검증 테스트.

미완료: 기존 src/app.js, src/logic.js, sw.js와 통합. 현재 UI에는 제출 이력이 나타나지 않습니다. 기존 파일 수정 요청이 연결 도구에서 거부되어 반영되지 않았습니다.

검증: GitHub Actions의 새 테스트 실행 결과를 확인합니다. 로컬 GitHub 복제는 DNS 연결 실패로 불가했습니다.

다음 작업: 반복 제출 UI 및 백업 연동, 정적 서버의 파일 노출 제한, C언어 함수 단원과 실제 컴파일 테스트 보강. 교재 원문과 그림은 복제하지 않습니다.
