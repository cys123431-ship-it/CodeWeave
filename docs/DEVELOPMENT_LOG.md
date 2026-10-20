AUTONOMOUS_DEVELOPMENT.md 현재 단계: 트랙 순환 개발 확인함
## 2026-10-20 16:55 KST — C07 문서 수치 회귀 수정
- 시작/결과 SHA: main04751784fe9c4f5370b38452c37187cbb90902b6; PR시작6802098541decdf7843db67f7b4eb93e189cef2a; 결과 커밋 fix: synchronize C07 published learning documentation.
- 목표: 최신 CI의 유일한 실패인 README C25/실제26 불일치를 먼저 수정하고 C07 원고의 미등록 설명을 현재화.
- 변경 파일 수: 4개(README·C07 원고·활성/보관 일지); 코드/검사 변경0·신규 단원/문제0.
- 테스트 결과: 기존 README track counts reflect lessons and actual runnable grading definitions 실패를 시작 SHA CI에서 확인(전체749건748통과/실패1/skip0); 문서 수정 뒤 전체/브라우저/macOS CI 대기, 기대값/검사 삭제0.
- CI URL과 결과: 시작 https://github.com/cys123431-ship-it/CodeWeave/actions/runs/39385771256 전체 실패1·browser/macOS 성공; 결과 SHA CI 성공 확인 전 완료로 기록하지 않음.
- 발견한 문제: README C26·총34·C07 실행 범위를 실제 등록과 일치시킴. 원고의 준비 전용 설명을 화면/연습장·재제출/복원/분리 숙달 안내로 교체; 예제 C 코드와 채점 계약은 그대로.
- 보안 영향: 문서만 변경·외부 입력/코드 실행/파일 접근/저장키 변경0; 로컬 환경409 environment_offline로 로컬 Git/npm/GCC/diff 검사는 미실행, GitHub 읽기·atomic tree/ref 쓰기로 반영.
- 단계별 완료율: C07진행 중·next=C/C07 유지; A3/5·B10/11·C6/8·D/E3/8·F2/8·G0/8·H/I0/6. 화면34·C26/DS3/알고리즘3문제, 분모/완료 수 불변.
- 다음 작업: 결과 SHA CI 성공 확인 후 C07 제한 범위 인수와 PR #3 병합을 검토; 성공한 기존 원고/실습을 다시 준비하지 않고 다음 자료구조 차례로 연결.

---
AUTONOMOUS_DEVELOPMENT.md 현재 단계: 트랙 순환 개발 확인함
## 2026-10-20 16:03 KST — C07 소유 스트림 학습 경로 연결
- 시작/결과 SHA: main04751784fe9c4f5370b38452c37187cbb90902b6; PR시작cf57793e9918d09b22eddbb71206b5e607a0e28f; RED 0649499deb30ccd8c1da660ccd4654f8ce84f4a8; 구현5188abfef29b9f50b08b0a7c13e491013cb59536; 재수정3bcd62da0f9c758f8ec0c676178135ba7fcd78c3; 후속 docs: record C07 browser proof and remaining README failure.
- 목표: 준비된 한 바이트 소유권 계약을 화면·퀴즈·실제 제출/오류 수정·재제출·백업·숙달에 연결.
- 변경 파일 수: 시작 대비 최종10개(화면·메타데이터·registry·C07 검사·browser·로드맵2개·감사표·활성/보관 일지); 신규2검사는 기존 파일로 통합·검사 삭제0.
- 테스트 결과: 신규2건 RED 실패→통과; 전체 RED749건747통과/실패2/skip0→1차728통과/21실패→재수정748통과/1실패/skip0. JS/MJS5개 node --check·roadmap·실제 GCC 정답12/12·오답11종/스타터 거부·macOS C07 통과.
- CI URL과 결과: RED https://github.com/cys123431-ship-it/CodeWeave/actions/runs/39384334474 ; 재수정 https://github.com/cys123431-ship-it/CodeWeave/actions/runs/39385319641 전체 실패1·browser/macOS 성공.C07 실제 화면·퀴즈 재시도·오답→수정12/12·이력/v1·숙달·390px·오프라인 통과, 전체 완료 아님.
- 발견한 문제: exec-server409 environment_offline로 로컬 읽기/쓰기/npm/GCC/git/browser 미실행; GitHub 읽기·atomic tree/ref 쓰기 성공.매핑/감사표 누락·C05 다음 경로 실패를 재현→수정.남은 README 수치25/실제26 회귀는 최종10파일 한도로 다음 실행 최우선.
- 보안 영향: 서버 전용12사례 재사용·공개 메타데이터에 하네스 제외·기존 JSON/Host/Origin/토큰·GCC 한도 적용; 신규 실행 API/링커 권한/사용자 저장키 변경0.
- 단계별 완료율: C07진행 중·next=C/C07 유지; A3/5·B10/11·C6/8·D/E3/8·F2/8·G0/8·H/I0/6.화면34·C26/DS3/알고리즘3문제, 개발 완료 단원 수 유지.
- 다음 작업: 첫 작업 README C26/전체34 수치 수정과 원고 준비 시점 설명 현재화→전체 CI 성공 확인→C07 제한 범위 인수/PR 병합 검토.새 원고 준비 반복 금지.미등록 기대/다음 경로 검사는 운영 전환으로만 갱신하고 성공 판정 완화0.

---
AUTONOMOUS_DEVELOPMENT.md 현재 단계: 트랙 순환 개발 확인함
## 2026-10-19 20:04 KST — C07 닫기 실패 채점 누락 수정
- 시작/결과 SHA: main04751784fe9c4f5370b38452c37187cbb90902b6; PR시작026450198765d1f0d31106eec4a777539f19bf18; RED af683acbccdb3a1b4a656fdb0fbcf8b4f8b59218; 결과 커밋 fix: reject C07 close-error and premature-output mutants.
- 목표: 닫기 실패 무시·읽기 진단 덮어쓰기·닫기 전 출력 변경 오답이 기존10사례를 통과하는 회귀를 먼저 재현하고 거부.
- 변경 파일 수: 6개(서버 하네스·검사·원고·macOS CI·활성/보관 일지); 신규 파일0·삭제 검사0.
- 테스트 결과: 신규3건 수정 전3실패→수정 후3통과; 관련16/16·정답12/12·오답11종/스타터 거부·완성 예제 출력 통과; 전체747건724통과/실패0/skip23(Cargo 부재), node --check2개/roadmap/diff 통과.
- CI URL과 결과: 기준 https://github.com/cys123431-ship-it/CodeWeave/actions/runs/39236024126 성공; 이번 결과 SHA CI 대기, 성공 전 완료로 기록하지 않음.
- 발견한 문제: 닫기 단독 실패와 동시 실패를 실제 stdio 콜백으로 주입(glibc fopencookie/macOS funopen); 사례10→12·결과 개수 기대 동기화는 누락 행동 추가 때문이며 기존 성공/거부 기대 완화0.
- 보안 영향: 독립 검사 하네스만 확장·서버 실행 API/registry/링커 허용값/사용자 저장키 변경0; macOS 실제 실패 주입 검사를 CI에 명시 추가.
- 단계별 완료율: C07진행 중·next=C/C07 유지; A3/5·B10/11·C6/8·D/E3/8·F2/8·G0/8·H/I0/6, 완료 단원 수 불변.
- 다음 작업: PR #3 결과 CI 확인 후 준비를 반복하지 말고 좁힌 한 바이트 소유권 계약의 화면·퀴즈·실제 제출/오류 수정·재제출·기록/v1·숙달 연결을 우선 완성; 이후 인수 근거 검토 전 순환 금지.

---
AUTONOMOUS_DEVELOPMENT.md 현재 단계: 트랙 순환 개발 확인함
## 2026-10-19 19:03 KST — C07 소유 스트림·오류 정리 계약 준비
- 시작/결과 SHA: 시작04751784fe9c4f5370b38452c37187cbb90902b6; RED 68aa9ea36340b62b3c3e125bc1600f41759386b8; 구현58b3d201de6c56e08237de528455c0a6c15d5be0; PR #3 후속 docs: record CI-verified C07 preparation and syntax checks; 실제 후속 SHA/CI 최종 보고.
- 목표: C05 borrowed와 대비되는 owned FILE의 한 바이트·EOF·오류/errno 스냅샷·정리10사례와 독자 원고/도식 준비; 화면/운영 채점은 미등록.
- 변경 파일 수: 총8개(신규 C07 서버 모듈·13검사·원고·정적 도식·로드맵2개·활성/보관 일지).
- 테스트 결과: PR RED CI744건731통과/실패13/skip0, 신규13건의 모듈/도식/원고 부재 확인; 구현 CI744/744·실패0/skip0·정답10/10·오답8종/스타터 거부·완성 출력 통과; 후속 CI에서 변경 JS/MJS3개 node --check 명시 검사 추가(기존 기대 유지). 로컬 npm/node/GCC/git/미커밋/브라우저 검사 미실행(409 environment_offline); V8 본문 구문 사전 확인은 node --check로 간주하지 않음.
- CI URL과 결과: 기준 https://github.com/cys123431-ship-it/CodeWeave/actions/runs/39228126437 성공731/731; RED https://github.com/cys123431-ship-it/CodeWeave/actions/runs/39235098471 의도된 실패13; 구현 https://github.com/cys123431-ship-it/CodeWeave/actions/runs/39235618568 성공744/744·실패0/skip0·browser/macOS 기존 회귀 성공. C07 준비 항목 완료·화면/단원 인수 아님, 후속 SHA CI 별도 확인.
- 발견한 문제: exec-server 연결 실패409 Conflict·environment_offline·Environment is not connected; 로컬 미완료 변경을 추정/덮어쓰지 않고 독립 PR/CI로 진행. 공식 POSIX 본문 직접 접근403은 재우회하지 않았고 독자 원고/실제 GCC 검사로 구분. fclose 단독 실패 주입은 후속 미검증 범위.
- 보안 영향: 기존 함수형 GCC 검사에 독립 하네스·tmpfile/pipe 정리만 재사용; 실행 API/운영 registry/링커 인수/저장키 변경0, main 미수정·별도 PR로 보존.
- 단계별 완료율: C07미착수→진행 중·next=C/C07 유지; 완료 A3/5·B10/11·C6/8·D/E3/8·F2/8·G0/8·H/I0/6, 화면33/기본 문제 수 불변.
- 다음 작업: PR 결과 SHA CI로 정답10/10·오답8종/스타터 거부·완성 출력 확인; 다음 실행은 이 PR부터 읽고 화면/퀴즈/등록/실제 제출·백업·숙달 연결 또는 남은 오류 수정, 인수 전 순환 금지.

---
AUTONOMOUS_DEVELOPMENT.md 현재 단계: 트랙 순환 개발 확인함
## 2026-10-19 17:59 KST — F02 제한 범위 인수와 C07 순환
- 시작/결과 SHA: 시작0726bf04df84dea0a5af036ac1b632e580b92eaa; 검증기06833e549ea8cf4c60be9edef0601e419bbb685f; 인수081949d57ea663888a0f7cd3513e356fd12d13d4; 후속 docs: record verified F02 acceptance CI.
- 목표: 검증된 F02 Linux 학습 경로만 인수하고 근거·명시 플래그·범위 검증을 보존해 C07로 순환; 새 단원/문제 추가0.
- 변경 파일 수: 총9개(로드맵 검증기·신규5검사·F01 과거 fixture 연결·인수 문서·README·로드맵2개·활성/보관 일지).
- 테스트 결과: 신규5건 중4건 실패→통과·기존 F01 이론4건 재현→통과·관련38/38·JS/MJS3개/roadmap/diff 통과; 전체731건708통과/실패0/skip23(Cargo 부재)·CPU 제한 검사 통과·CI Linux731/731·실패0/skip0·실제F02 browser/macOS 공통 회귀 성공; 기존 검사 삭제/성공 기대 변경0.
- CI URL과 결과: 기준 https://github.com/cys123431-ship-it/CodeWeave/actions/runs/39221228817 성공726/726·실패0/skip0·실제F02 Cargo/browser 로그 재조회; 인수 https://github.com/cys123431-ship-it/CodeWeave/actions/runs/39227790093 성공731/731·실패0/skip0·실제F02 browser/macOS 공통 회귀 성공. 제한 범위 인수 완료·후속 기록 SHA CI 별도 확인.
- 발견한 문제: F01 전용 인수/고정 검토 링크를 명시적 F01/F02 프로필로 분리. 과거 F01 이론 fixture에 현재 F02 완료가 섞여4검사 실패→기존 historicalRustPending 재사용, 기대값 완화0. 패치 문맥/역순 hunk 실패는 쓰기 전 검출 후 교정. 직전 로컬 CPU 실패는 이번 전체 검사에서 통과했으며 실행기 수정으로 해결했다고 주장하지 않음.
- 보안 영향: 로드맵 근거 검증만 변경·실행/API/파일 접근/사용자 저장키 변경0; F02 플래그·10사례·기본 비활성·Linux 범위를 고정하고 미검증 macOS/Windows 인수 주장 거부.
- 단계별 완료율: F02 Linux 제한 범위2/8(25%)·next=C/C07; A3/5·B10/11·C6/8·D/E3/8·G0/8·H/I0/6, 분모/화면33/기본 문제 수 불변.
- 다음 작업: 결과 SHA CI 성공 확인 뒤 C07 오류 반환·errno·자원 정리를 독립적이고 작은 GCC 실습 계약으로 준비; F02 macOS 자체 인수와 H/I 실기기 검증은 별도 미완료.
