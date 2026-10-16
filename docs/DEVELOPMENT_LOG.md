AUTONOMOUS_DEVELOPMENT.md 현재 단계: 트랙 순환 개발 확인함
## 2026-10-16 19:57 KST — D02 스택 화면·실제 채점 연결(2/2, CI 검증 대기)
- 시작/결과 SHA: 시작ccd51b4d75630f7e359023bbce33940cc845ebf4; 커밋 feat: deliver bounded stack practice through existing learner flow.
- 목표: 준비된 용량4 push/pop을 기존 ds-stack ID로 전달하고 오답→수정·재제출·백업/오프라인·숙달 연결을 검증.
- 변경 파일 수: 이번 구현8개(화면·메타데이터·registry·roadmap검사·browser·README·일지2); 인수 시 로드맵2 포함 총10개 이내.
- 테스트 결과: 신규2건0/2→2/2; 관련20/20·전체490건486통과·실패0·skip4(Rust 부재); JS/MJS5개 문법·roadmap/diff 성공; 삭제0. 브라우저는 CI에서만 실행.
- CI URL과 결과: 시작 https://github.com/cys123431-ship-it/CodeWeave/actions/runs/38885443590 성공 재확인; 구현 결과 SHA의 전체/브라우저 CI 검증 대기.
- 발견한 문제: 실제 API가 ds-stack에400을 반환하고 옛 도식만 노출함을 먼저 재현. 미채점 fixture는 실제 미채점 Rust로 옮기고 순환 fixture를 명시적 상태로 구성; 신규 메타데이터 기대값은 기존 정규화 requiredFiles:[] 누락을 수정(계약 완화 아님).
- 보안 영향: 신규 실행/파일 API 없이 기존 토큰·제한·GCC 함수형 경로 사용. 준비 하네스/10사례/호출자 비중첩 전제 불변; 사용자 v1 키와 기존 퀴즈 선택2 유지.
- 단계별 완료율: A3/5·B10/11·C5/8·D/E1/8·F/G0/8·H/I0/6 유지; D02는 CI 인수 전까지 진행 중·next=D/D02.
- 다음 작업: 결과 SHA CI의 실제 D02 오답/정답·백업·오프라인·390px·다음 이동을 확인 후에만 D02 인수 및 E 차례 전환. D02 macOS/Windows 네이티브 실행은 이번 범위에서 검증하지 않음.

---
AUTONOMOUS_DEVELOPMENT.md 현재 단계: 트랙 순환 개발 확인함
## 2026-10-16 19:04 KST — 미반영 D02 준비 작업 인계·원격 검증
- 시작/결과 SHA: 원격3c5e39f2cab1157ed76392af4ebc63a0f6e9d668; 미반영 로컬ef9c80921a2c00d496abe5a8bce6a4251eca42f1 인계; 구현131350a48d9432335b5373ccff4634f6fc378995; 후속 docs: record verified D02 preparation handoff.
- 목표: 앞선 D02 준비 계약·원고·도식을 보존하고 최신 main 대조·재검사 뒤 실제 원격 반영 및 결과 SHA CI 확인.
- 변경 파일 수: 시작 main 대비10개(신규3: 계약·검사·원고; 기존7: 도식·browser·capability검사·로드맵2·일지2).
- 테스트 결과: 앞선 신규11건 실패→통과 이력 보존, 이번 재실행11/11; 정상10사례·오답6종 거부·스타터/완성 예제 GCC 성공; 전체488건484통과·실패0·skip4(Rust 도구 부재); 문법5개·일지4/4·roadmap/diff 성공; 테스트 삭제0.
- CI URL과 결과: 시작 https://github.com/cys123431-ship-it/CodeWeave/actions/runs/38865156075 성공 재확인; 구현 https://github.com/cys123431-ship-it/CodeWeave/actions/runs/38885105450 전체488/488·skip0, 기존 macOS회귀·browser성공. D02 도식390px 컴포넌트 QA 성공이며 화면/API E2E 아님; D02 macOS/Windows 미실행. 최종 기록 SHA CI 별도 확인.
- 발견한 문제: 17:04 로컬 커밋이 아직 원격에 없었음. 덮어쓰지 않고 인계; ds-stack 영구 미채점 기대값 변경 사유·준비/실제 전달 구분은 앞선 기록 유지.
- 보안 영향: 공개 문제/실행 경로 활성화0, 기존 학습자 키 변경0. 고정 배열 함수 계약만 검증하며 임의 포인터의 유효성을 보장하지 않음.
- 단계별 완료율: A3/5·B10/11·C5/8·D/E1/8·F/G0/8·H/I0/6 유지; D02진행 중·next=D/D02.
- 다음 작업: 준비 CI 확인 뒤 2/2 화면/API 연결. catalog·exercises·registry·browser·README·roadmap검사·로드맵2·일지2 총10파일로 제한; 현재 D02는 미채점 샘플 유지.

---
AUTONOMOUS_DEVELOPMENT.md 현재 단계: 트랙 순환 개발 확인함
## 2026-10-16 17:04 KST — D02 고정 용량 스택 계약 준비(1/2)
- 시작/결과 SHA: 시작3c5e39f2cab1157ed76392af4ebc63a0f6e9d668; 커밋 feat: prepare bounded D02 stack contract and learning manuscript.
- 목표: 용량4 정수 스택 push/pop의 LIFO·경계·실패 보존·독립 상태를 기존 GCC 함수형 경로로 검증; 이번은 준비 범위.
- 변경 파일 수: 10개(계약·신규 검사·72줄 원고·도식·browser준비검사·기존 capability검사·로드맵JSON/MD·활성/보관 일지).
- 테스트 결과: 신규11건0/11→11/11; 정상10사례·안전한 오답6종 거부·스타터/완성 예제 GCC 성공; 전체488건484통과·실패0·skip4(Rust 부재); 관련26/26·일지4/4·변경JS/MJS5개 문법·roadmap/diff 성공; 삭제0.
- CI URL과 결과: 시작 https://github.com/cys123431-ship-it/CodeWeave/actions/runs/38865156075 477/477·browser/macOS성공 확인; 구현 SHA CI 대기. D02 macOS·Windows 실행은 미실행.
- 발견한 문제: 계약/원고 부재·도식 미정의로11건 실패 재현 후 구현. 기존 ds-stack 영구 미채점 기대값은 실제 서버 등록 일치로 변경(향후 전달 오탐 방지); 준비 import가 샘플을 활성화하지 않음도 별도 검사.
- 보안 영향: 신규 사용자 경로·할당·해제·프로덕션 등록0; 호출자 제공 객체와 비중첩 출력만 처리. NULL/잘못된 길이는 원소 접근 전 거부하며 구조체 패딩 비교를 피함.
- 단계별 완료율: A3/5·B10/11·C5/8·D/E1/8·F/G0/8·H/I0/6 유지; D02진행 중·next=D/D02; 기존 ds-stack ID/초안/퀴즈/진도 키 유지.
- 다음 작업: 2/2에서 catalog·exercises·registry·browser·README·roadmap검사·로드맵2·일지2(10파일)로 실제 채점/재제출·백업/오프라인·숙달 연결. roadmap검사의 ds-stack 미채점 고정 fixture와 D02 고정 선택 기대도 실제 인수 상태에 맞게 교차 검증.

---
AUTONOMOUS_DEVELOPMENT.md 현재 단계: 트랙 순환 개발 확인함
## 2026-10-16 15:57 KST — C05 PR CI 복구·인수
- 시작/결과 SHA: main3791b101b1006c7515a6cfb9c3a3009f048771dc; PR2 bf53a936682bfdb272f012d02dd5685214586297; 복구87022eb771bb3343125494f337a581255403d01d; 후속 docs: accept verified C05 delivery and rotate to D02.
- 목표: PR2 유일한 Node 실패 복구와 C05 제한 범위 인수; 최종 PR/main CI 확인 뒤 반영 확정.
- 변경 파일 수: 7개(문제 계약 검사·활성/보관 일지·로드맵JSON/MD·원고 전달 상태·공유 계약 주석).
- 테스트 결과: 기존 only implemented C exercises 검사0/1→1/1; C05/GCC 관련16/16; 로컬 전체477건473통과·실패0·skip4(Rust 부재); 문법·roadmap/diff·일지4/4 성공; 추가0·삭제0.
- CI URL과 결과: 시작38860476819의 476/477 실패 재현; 복구 https://github.com/cys123431-ship-it/CodeWeave/actions/runs/38864588349 477/477·skip0, macOS C0513/13, browser실제26문제 API·C05퀴즈/오답→수정/숙달/백업/오프라인/390px/다음 이동 성공. 후속/merge SHA CI 별도 확인.
- 발견한 문제: 고정23개 기대 ID가 검증된 C05를 거부함. 기대값 변경 이유는 오래된 허용 목록 제거이며 화면 카탈로그·공개 메타데이터·독립 서버 등록·실행 사례 대조는 유지. 원고/주석의 미연결 표기도 실제 근거로 갱신; 검사 통과용 본문 변경0.
- 보안 영향: 실행기·외부 입력·파일 접근·인증·학습자 v1 저장 변경0; C05 기존 계약/한도 유지. 오프라인→온라인 채점은 토큰 재수신을 위한 새로고침 필요.
- 단계별 완료율: A3/5(60%)·B10/11(90.9%)·C5/8(62.5%)·D/E1/8(12.5%)·F/G0/8·H/I0/6; C05 제한 범위 인수·next=D/D02.
- 다음 작업: 최종 PR/main CI 성공 확인 후 D02 스택을 C 함수형 계약으로 좁혀 진행. F01 채점/API는 진행 중이며 다음 Rust 차례에 이어감; 이번 새 단원0.

---
AUTONOMOUS_DEVELOPMENT.md 현재 단계: 트랙 순환 개발 확인함
## 2026-10-16 15:01 KST — C05 스트림 전달 후보(2/2; 미완료·14:03 준비 근거 포함)
- 시작/결과 SHA: 시작 dbbcf6b1028ea65b363aa8b6db1a627405474c8f; 구현 1a305e9ff824c287e1e61aab7e2d662af83dd59a; 검증 기록 제목 docs: record verified C05 stream preparation and clarify byte semantics. 후속 시작3791b101b1006c7515a6cfb9c3a3009f048771dc; 구현 c19d2f77d6314f3dce820154d97080e75c24f800; 후속 커밋 test: refresh online document before C05 grading.
- 목표: 현재 위치부터 최대4096바이트를 세고 EOF/오류·실패 출력 보존·빌린 스트림 수명을 구별하는 준비 계약 검증. 15:01 후속은 화면12절·퀴즈·API·오답 수정·백업/오프라인·숙달 연결.
- 변경 파일 수: 10개(서버 계약·신규 검사·81줄 원고·정적 도식·브라우저 검사·CI·로드맵 JSON/MD·활성/보관 일지). 후속10개(catalog·exercises·registry·browser·audit검사·audit문서·README·로드맵2·이 일지). 10파일 한도에 맞춰 동일 C05 기록에 후속 근거를 합치고 이전 기록 근거/다른4건/보관 원문을 유지.
- 테스트 결과: 신규13건 0/13→13/13; 정상10사례·오답8종 거부·스타터/완성 예제 GCC 성공; 전체476건472통과·실패0·skip4(Rust 부재); 변경JS/MJS4개 문법·roadmap/diff 성공; 삭제0. 후속 신규 C05 learner contract 등록 검사 실패→성공; 관련16/16; 실제HTTP 오답9/10→정답10/10; 전체477건472통과·실패1·skip4(Rust 부재); JS/MJS5개 문법·roadmap/diff·일지4/4 통과.
- CI URL과 결과: 시작 https://github.com/cys123431-ship-it/CodeWeave/actions/runs/38848984664 성공 재확인; 구현 https://github.com/cys123431-ship-it/CodeWeave/actions/runs/38854900529 전체476/476·skip0·macOS C0513/13 및 browser성공. 390px 도식 문자 범위/오버플로 검증, C05 화면 E2E 아님. 최종 기록 SHA CI 별도 확인. 후속 시작38855148799 성공; 전달 후보 https://github.com/cys123431-ship-it/CodeWeave/pull/2 (draft); 구현 https://github.com/cys123431-ship-it/CodeWeave/actions/runs/38860191829 전체477건476통과·실패1·skip0, macOS C0513/13; browser 토큰 부재 실패를 재현 후 온라인 새로고침 fixture 수정, 결과 SHA CI 재확인 필요.
- 발견한 문제: 파일/도식 부재 재현 후 구현. 로컬 렌더 cairosvg ModuleNotFoundError·파생 EPIPE로 불가; OpenGroup403/GNU timeout 뒤 POSIX 표준 재현본 확인. 재검토로 0A/42의 문자 인코딩 일반화·tmpfile 익명성 보장 표현 제거; 기대값 변경0. 후속 감사표 고정23 기대값을 실제 등록 수 비교로 바꿈(문제 증가에 숫자만 고치는 검사 방지); README 단원29/C24 동기화. 추가로 tests/exercises.test.mjs:39의 고정23개 ID 목록이 신규 C05를 거부함을 재현; 오프라인 캐시는 의도적으로 토큰을 제거하므로 온라인 복귀 후 새로고침이 필요함을 발견; C05 브라우저 setup에 온라인 reload를 넣고 토큰 일치 기대값은 보존. ID 목록을 수정하면11번째 파일이므로 이번10파일 한도에서 중단하고 main은 유지. 화면 예제는 기존 컴파일 원고와 동일함을 검사.
- 보안 영향: 신규 사용자 경로 입력0·프로덕션 등록0. 하네스는 tmpfile 임시 스트림과 고정 pipe만 사용하며 Linux/macOS POSIX 오류/소유권 검증용; Windows 네이티브 검증 아님. 닫힌 스트림은 디스크립터 확인 후 재사용하지 않아 검사 오답의 이중 fclose를 피함. 후속 사용자 경로 입력 없이 기존 인증/GCC 함수형 경로만 연결; Windows 네이티브 미지원은 화면·README에 명시.
- 단계별 완료율: A3/5·B10/11·C4/8·D1/8·E1/8·F/G0/8·H/I0/6 유지; C05 진행 중·next=C/C05, 사용자 화면/신규 공개 문제0. 후속 C05 전달 검증 대기이므로 상태/차례는 아직 유지.
- 다음 작업: C05 2/2회차에 catalog·exercises·registry·browser·README·audit·로드맵2·일지2(총10파일)로 화면/실제 API·오답→수정·백업·오프라인·숙달 검증. 준비 검사 파일은 등록 뒤에도 같은 계약 검증에 재사용하며 Windows 네이티브 제한은 명시. 다음 실행 첫 작업은 열린 C05 draft PR의 tests/exercises.test.mjs 고정목록을 실제 등록/실행 계약 검사로 수정(기대값 변경 사유 기록), CI/브라우저를 검증한 뒤에만 C05 완료·D/D02 전환. 2회 내 완료 목표는 검사 부채로 미달, 새 단원 추가 금지.
