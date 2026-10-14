import { serializeMultiFileSubmission } from './multi-file.js';

// 사용자 업로드 교과서의 학습 범주를 참고하여 신규 작성한 독자적인 교육 콘텐츠 초안.
// 두 PDF 자체/원문/원본 그림은 저장소에 포함하지 않습니다.
export const tracks = [
  {id:'c',name:'C언어',tag:'기초부터 시스템 프로그래밍까지',icon:'C',color:'mint',description:'변수·제어문·함수·배열·포인터를 이론과 코드 실습으로 연결합니다.'},
  {id:'rust',name:'Rust',tag:'안전한 시스템 프로그래밍',icon:'R',color:'orange',description:'C에서 배운 개념을 소유권과 빌림으로 확장합니다.'},
  {id:'ds',name:'자료구조',tag:'데이터를 조직하는 방법',icon:'DS',color:'purple',description:'스택·큐·연결 리스트·트리·그래프를 직접 구현합니다.'},
  {id:'algo',name:'알고리즘',tag:'문제 해결과 효율성',icon:'AL',color:'blue',description:'정렬·탐색·재귀·그래프 탐색과 복잡도 분석을 학습합니다.'}
];
export const lessons = [
  {
    id:'c-hello',track:'c',level:'기초',title:'첫 C 프로그램의 구조',minutes:42,source:'C 프로그램 구조와 표준 입출력에 관한 독자 작성 단원',
    summary:'소스가 전처리·번역·링크를 거쳐 실행되고 종료 상태를 돌려주는 전체 흐름을 읽습니다.',figure:'hello-build-pipeline',
    sections:[
      {heading:'단원 개요',text:'첫 프로그램을 한 줄 외우는 대신 소스 파일, 전처리, 번역, 목적 파일, 링크, 실행, 종료 상태가 어떤 역할을 나누는지 따라갑니다. 화면의 도식은 흔한 도구 흐름을 단순화한 정적 그림이며 C 표준이 특정 파일 확장자나 명령 이름을 강제한다는 뜻은 아닙니다.'},
      {heading:'필요한 이유',text:'문법 오류, 링크 오류, 잘못된 출력, 비정상 종료는 서로 다른 단계에서 생깁니다. 어느 단계에서 실패했는지 구분하면 컴파일러 메시지를 무작정 고치는 대신 헤더 선언, 함수 정의, 출력 계약과 종료 상태를 차례로 확인할 수 있습니다.'},
      {heading:'선수 지식',text:'파일을 저장하고 터미널에서 명령을 실행하는 정도면 충분합니다. 아직 변수, 포인터, 메모리 주소를 알 필요는 없습니다. 중괄호와 괄호, 큰따옴표가 서로 다른 기호라는 점만 구분해 보세요.'},
      {heading:'학습 목표',text:'학습 후에는 전처리·번역·링크·실행을 구분하고, #include <stdio.h>, int main(void), printf, 문자열 리터럴, \\n, return 0의 역할을 설명할 수 있습니다. 또한 컴파일 성공, 기대 출력, 성공 종료를 별개의 검사로 확인할 수 있습니다.'},
      {heading:'전처리: 선언을 사용할 준비',text:'#include <stdio.h>는 표준 입출력 인터페이스의 선언을 사용할 수 있도록 처리하는 전처리 지시문입니다. 설명할 때 흔히 “헤더를 붙인다”고 줄이지만 구현이 파일 텍스트를 물리적으로 복사해야 한다는 보장은 아닙니다. 중요한 계약은 printf를 올바른 선언과 함께 호출하는 것입니다.',code:'#include <stdio.h>'},
      {heading:'번역과 목적 파일',text:'전처리된 번역 단위를 컴파일러가 문법과 자료형에 맞게 번역하고, 흔한 도구 체인에서는 기계어 조각과 재배치 정보가 든 목적 파일을 만듭니다. .o나 .obj 같은 이름과 컴파일 명령은 플랫폼·도구의 관례이지 C 언어가 고정한 형식은 아닙니다.'},
      {heading:'링크: 필요한 정의를 하나로 연결',text:'링커는 프로그램의 목적 파일과 필요한 라이브러리 정의를 연결해 실행 가능한 결과를 만듭니다. 선언이 있어 컴파일되어도 실제 정의를 찾지 못하면 이 단계에서 실패할 수 있습니다. 그래서 컴파일 오류와 “undefined reference” 같은 링크 오류를 구분합니다.'},
      {heading:'main: 호스트 환경의 시작 함수',text:'int main(void)는 인자를 받지 않는 표준적인 호스트 C 프로그램 진입 형태입니다. void main은 이 이식 가능한 형태가 아닙니다. C99 이후에는 main의 닫는 중괄호까지 도달하면 return 0과 같은 성공 종료로 처리되지만, 처음에는 종료 상태를 눈에 보이게 적어 계약을 익힙니다.'},
      {heading:'명령문과 블록',text:'중괄호는 main의 함수 몸체를 묶고, printf 호출과 return은 각각 세미콜론으로 끝나는 명령문입니다. 세미콜론이 빠졌을 때 진단 위치가 다음 줄을 가리킬 수 있으므로 표시된 줄뿐 아니라 바로 앞 명령문도 확인합니다.'},
      {heading:'문자열 리터럴과 개행',text:'"Hello, CodeWeave!\\n"은 끝에 널 문자를 포함하는 char 배열 형태의 문자열 리터럴입니다. \\n은 소스의 두 글자를 그대로 출력하라는 뜻이 아니라 새 줄 문자를 나타내는 이스케이프 시퀀스입니다. 문자열 리터럴을 수정하려는 동작은 정의되지 않은 동작이므로 출력할 읽기 전용 데이터처럼 다룹니다.'},
      {heading:'printf 반환값과 출력 오류',text:'printf는 성공하면 기록한 문자 수에 해당하는 음수가 아닌 값을, 출력 또는 인코딩 오류가 생기면 음수를 반환합니다. 예제가 0바이트 이상을 출력했다는 사실과 프로그램 종료 상태는 별개입니다. 단순한 첫 실습은 정확한 표준 출력과 종료 상태 0을 채점하며, 완성 예제는 즉시 보고된 printf 실패를 1로 전달합니다.',code:'#include <stdio.h>\n\nint main(void) {\n    if (printf("Hello, CodeWeave!\\n") < 0) {\n        return 1;\n    }\n    return 0;\n}'},
      {heading:'실행 결과와 종료 상태',text:'표준 출력에는 Hello, CodeWeave! 다음에 개행이 기록됩니다. return 0은 호스트 환경에 성공 종료 상태를 돌려줍니다. 출력 문자열이 맞아도 0이 아닌 상태로 끝나면 자동화에서는 실패일 수 있고, 반대로 상태 0이어도 출력이 다르면 이 문제의 계약에는 맞지 않습니다.',code:'Hello, CodeWeave!'},
      {heading:'흔한 오류',text:'stdio.h 누락, 스마트 따옴표 사용, 문자열의 닫는 큰따옴표 누락, 세미콜론 누락, main 철자나 반환형 변경을 따로 확인합니다. 경고를 무시한 채 실행 결과만 맞추지 말고 -Wall -Wextra -Wpedantic으로 다시 번역합니다.'},
      {heading:'중간 점검',text:'질문 1: printf 선언을 준비하는 단계는 무엇인가요? 질문 2: 목적 파일은 왜 곧바로 완성 프로그램이 아닐 수 있나요? 질문 3: 표준 출력과 종료 상태를 왜 따로 검사해야 하나요? 각 답을 전처리, 링크, 호스트 계약이라는 말로 설명해 보세요.'},
      {heading:'핵심 요약',text:'소스는 전처리와 번역을 거치고 흔한 도구 체인에서 목적 파일이 되며, 링크 후 실행됩니다. stdio.h는 printf 선언을 제공하고 int main(void)는 이식 가능한 시작 형태입니다. \\n은 개행, return 0은 성공 상태이며 printf의 음수 반환은 출력 오류를 뜻합니다.'},
      {heading:'기초·응용·도전 연습과 Mini Project',text:'기초로 인사 문구를 정확히 출력하고, 응용으로 printf 반환값과 종료 상태를 확인하세요. 도전으로 두 줄의 학습 카드를 출력하되 공백과 개행까지 예상 결과를 먼저 적습니다. Mini Project에서는 컴파일 명령, 실제 출력, 종료 상태, 일부러 만든 문법 오류와 링크 오류를 한 표에 기록합니다.'},
      {heading:'테스트와 풀이 개선·복습 연결',text:'먼저 -std=c11 -Wall -Wextra -Wpedantic으로 경고 없이 번역하고, 출력 바이트와 종료 상태를 각각 확인합니다. 오답을 고친 뒤 이전 제출과 비교해 어떤 단계의 문제였는지 적으세요. 다음 변수 단원으로 가기 전에 헤더·main·문자열·개행·종료 상태를 코드에서 가리킬 수 있는지 복습합니다.'}
    ],
    quiz:{question:'printf("C\\n");을 실행하면 올바른 출력은?',options:['C 다음 줄로 이동한다','C\\n 문자 네 개가 그대로 나온다','아무 것도 출력되지 않는다','반드시 컴파일 오류가 발생한다'],answer:0,explanation:'문자열 안의 \\n은 줄바꿈을 의미하는 이스케이프 시퀀스입니다.'},
    challenge:{id:'c-hello',title:'첫 인사 출력하기',description:'프로그램을 실행하면 Hello, CodeWeave!와 줄바꿈이 출력되게 만드세요.',starter:'#include <stdio.h>\n\nint main(void) {\n    // TODO: 인사 문구를 출력하세요.\n    return 0;\n}',input:'입력 없음',expected:'Hello, CodeWeave!'}
  },
  {
    id:'c-types',track:'c',level:'기초',title:'변수·자료형·연산자',minutes:25,source:'쉽게 풀어쓴 C언어 Express 4~5장, The C Programming Language 1.2·2장 (주제 참조)',
    summary:'값을 저장하고 계산할 때 자료형과 연산 결과가 왜 중요한지 이해합니다.',figure:'variables',
    sections:[
      {heading:'변수는 이름이 붙은 저장 공간이다',text:'int는 정수, double은 실수 값을 나타내는 데 자주 사용합니다. 변수는 선언 후 값을 대입할 수 있으며, 선언과 동시에 초기화할 수도 있습니다. 자료형마다 표현 범위가 다르고, 실제 메모리 크기는 구현 환경의 영향을 받을 수 있습니다.',code:'int count = 3;\ndouble price = 12.5;\ncount = count + 1;'},
      {heading:'정수 나눗셈은 실수 나눗셈과 다르다',text:'정수 7을 정수 2로 나누면 소수 부분을 버린 정수 결과 3이 나옵니다. 7.0 / 2처럼 실수 연산이 되도록 피연산자를 구성하면 3.5가 됩니다. 값뿐 아니라 연산식에 참여하는 자료형을 함께 살펴보세요.',code:'printf("%d\\n", 7 / 2);    // 3\nprintf("%.1f\\n", 7.0 / 2); // 3.5'},
      {heading:'입력을 받으면 변환된 값을 저장한다',text:'scanf("%d", &a)는 입력된 정수를 a에 저장하도록 요청합니다. 이때 &a는 a의 주소를 나타냅니다. 실제 프로그램에서는 scanf의 반환값을 검사하여 올바르게 입력받았는지 확인하는 습관이 중요합니다.'},
      {heading:'연산 전에 입력과 결과의 범위를 정한다',text:'C는 int가 적어도 -32767부터 32767까지 표현됨을 보장하지만 정확한 폭은 구현마다 다를 수 있습니다. 이 실습은 a와 b를 각각 -10000 이상 10000 이하로 제한해 합을 -20000 이상 20000 이하로 만듭니다. 따라서 계약에 맞는 입력에서는 signed int 덧셈 오버플로가 일어나지 않습니다. 채점기는 정확히 두 정수만 제공하며 범위 밖 값, 변환 실패, 조기 EOF와 추가 토큰은 이 기초 문제의 채점 대상이 아닙니다. 이런 입력 검증은 뒤의 fgets·strtol 단원에서 다룹니다.'}
    ],
    quiz:{question:'C에서 int a = 7, b = 2; 일 때 a / b의 값은?',options:['3.5','3','4','컴파일 오류'],answer:1,explanation:'정수끼리 / 연산을 하면 정수 나눗셈 결과가 만들어집니다.'},
    challenge:{id:'c-types',title:'두 정수의 합',description:'표준 입력에서 -10000 이상 10000 이하의 정수 두 개를 받아 합을 출력하세요. 채점 입력은 계약에 맞는 정수 두 개만 제공하며 결과 범위는 -20000~20000입니다.',starter:'#include <stdio.h>\n\nint main(void) {\n    int a, b;\n    if (scanf("%d%d", &a, &b) != 2) return 1;\n    // TODO: 계약 범위 안의 두 정수 합을 출력하세요.\n    return 0;\n}',input:'4 7',expected:'11'}
  },
  {
    id:'c-loops',track:'c',level:'기초',title:'조건문과 반복문',minutes:28,source:'쉽게 풀어쓴 C언어 Express 6~7장, The C Programming Language 1.3·3장 (주제 참조)',
    summary:'조건에 따라 분기하고 반복 횟수를 통제하는 프로그램을 작성합니다.',figure:'loop',
    sections:[
      {heading:'if는 조건에 따라 실행 경로를 고른다',text:'조건식이 참이면 if의 블록을 수행하며, 거짓이면 else 블록으로 이동할 수 있습니다. ==는 비교이고 =는 대입이므로 서로 바꾸어 쓰지 않아야 합니다.',code:'if (score >= 60) {\n    printf("pass\\n");\n} else {\n    printf("retry\\n");\n}'},
      {heading:'for는 반복 범위를 눈에 보이게 만든다',text:'for 문의 세 부분은 초기식, 반복 조건식, 증감식입니다. 반복 조건이 거짓이 되는 시점을 반드시 생각해야 무한 반복을 피할 수 있습니다.',code:'int sum = 0;\nfor (int i = 1; i <= 5; i++) {\n    sum += i;\n}\nprintf("%d\\n", sum); // 15'},
      {heading:'입력이 달라져도 올바른가?',text:'정답이 한 가지 입력에서만 맞는 것은 충분하지 않습니다. 0, 1, 음수처럼 경계값을 다루는 문제에서는 어떤 값이 허용되는지 먼저 문제 조건을 확인한 뒤 테스트해야 합니다.'}
    ],
    quiz:{question:'for (int i=0; i<4; i++) 안의 명령문은 몇 번 실행될까?',options:['3번','4번','5번','무한 반복'],answer:1,explanation:'i는 0, 1, 2, 3 값을 차례대로 가지므로 네 번 반복됩니다.'},
    challenge:{id:'c-loops',title:'1부터 n까지의 합',description:'0 이상 1000 이하의 정수 n을 입력받아 1부터 n까지 합을 출력하세요. n=0이면 0을 출력합니다.',starter:'#include <stdio.h>\n\nint main(void) {\n    int n;\n    if (scanf("%d", &n) != 1) return 1;\n    // TODO: for 문으로 합을 계산하세요.\n    return 0;\n}',input:'5',expected:'15'}
  },
  {
    id:'c-array',track:'c',level:'중급',title:'배열과 함수',minutes:32,source:'쉽게 풀어쓴 C언어 Express 8~9장, The C Programming Language 1.6·4장 (주제 참조)',
    summary:'배열 요소에 접근하고 기능을 별도 함수로 분리합니다.',figure:'array',
    sections:[
      {heading:'배열의 인덱스는 0에서 시작한다',text:'int numbers[5]에는 int형 원소 다섯 개를 담을 수 있습니다. 인덱스는 0부터 4까지 유효합니다. 범위 밖의 원소에 접근하는 동작은 C에서 정의되지 않으므로, 반복문의 경계를 정확히 지켜야 합니다.',code:'int numbers[5] = {2, 4, 6, 8, 10};\nprintf("%d\\n", numbers[2]); // 6'},
      {heading:'함수로 동작을 분리한다',text:'배열 출력, 최대값 찾기, 정렬 같은 기능은 함수로 분리할 수 있습니다. 함수를 호출할 때는 매개변수의 자료형과 역할을 확인해야 합니다. 배열을 함수에 전달하는 경우 배열의 길이도 함께 넘기면 안전한 반복 범위를 알 수 있습니다.',code:'int find_max(const int a[], int n) {\n    int m = a[0];\n    for (int i = 1; i < n; i++) {\n        if (a[i] > m) m = a[i];\n    }\n    return m;\n}'},
      {heading:'문제를 나누면 시험과 실습에 유리하다',text:'전체 프로그램을 한 번에 작성하는 대신 입력 처리, 배열 생성, 계산, 출력으로 나누어 보면 오류 원인을 쉽게 좁힐 수 있습니다. 이후 별도의 .c 파일과 헤더 파일을 활용하는 프로젝트 구조로 확장할 수 있습니다.'}
    ],
    quiz:{question:'int a[5]의 마지막 유효한 인덱스는?',options:['5','1','4','0'],answer:2,explanation:'길이가 5인 배열의 인덱스 범위는 0~4입니다.'},
    challenge:{id:'c-array',title:'배열에서 최댓값 찾기',description:'첫 번째 줄에 원소 개수 n(1~20), 두 번째 줄에 정수 n개를 입력받아 최댓값을 출력하세요.',starter:'#include <stdio.h>\n\nint main(void) {\n    int n, a[20];\n    if (scanf("%d", &n) != 1) return 1;\n    for (int i = 0; i < n; i++) scanf("%d", &a[i]);\n    // TODO: 가장 큰 값을 찾아 출력하세요.\n    return 0;\n}',input:'5\n2 9 -3 4 1',expected:'9'}
  },
  {
    id:'c-pointer',track:'c',level:'중급',title:'포인터의 주소와 역참조',minutes:34,source:'쉽게 풀어쓴 C언어 Express 11장, The C Programming Language 5.1~5.3 (주제 참조)',
    summary:'주소 연산자와 역참조 연산자의 의미를 예제로 설명합니다.',figure:'pointer',
    sections:[
      {heading:'포인터 변수는 다른 객체의 주소를 저장한다',text:'&x는 x의 주소를 구하고 *p는 p가 가리키는 객체에 접근합니다. 포인터를 사용하기 전에는 유효한 객체를 가리키는지 확인해야 합니다. 포인터 선언의 *와 역참조 연산의 *는 나타나는 문맥에 따라 역할이 다릅니다.',code:'int x = 7;\nint *p = &x;\n*p = 8;\nprintf("%d\\n", x); // 8'},
      {heading:'주소와 값은 서로 다른 개념이다',text:'p는 주소를 담은 변수이고 *p는 그 주소에 위치한 int 객체의 값입니다. 따라서 p 자체를 바꾸는 동작과 *p를 바꾸는 동작을 구별해야 합니다.'},
      {heading:'함수에서 호출자의 값을 바꿀 수 있다',text:'함수 인수로 주소를 전달하면 함수 안에서 호출자 객체의 값을 수정할 수 있습니다. 다만 잘못된 주소, 초기화하지 않은 포인터, 수명이 끝난 객체에 접근하는 것은 위험합니다.',code:'void add_one(int *value) {\n    ++(*value);\n}'},
      {heading:'역참조 연산에도 값 범위 계약이 필요하다',text:'++(*value)는 가리키는 int가 표현할 수 있는 최댓값일 때 signed overflow를 일으켜 정의되지 않은 동작이 됩니다. 이 실습은 증가 전 n을 -10000 이상 9999 이하로 제한하므로 결과는 -9999 이상 10000 이하이고 C가 보장하는 최소 int 범위 안에 있습니다. 채점기는 정확히 한 정수만 제공하며 범위 밖 값, 변환 실패, 조기 EOF와 추가 토큰은 이 기초 문제의 채점 대상이 아닙니다.'}
    ],
    quiz:{question:'int x = 7; int *p = &x; *p = 8; 이후 x의 값은?',options:['7','8','주소값','정의되지 않음'],answer:1,explanation:'p는 x를 가리키고, *p = 8은 x에 8을 대입합니다.'},
    challenge:{id:'c-pointer',title:'포인터로 값 증가시키기',description:'-10000 이상 9999 이하의 정수 n 하나를 입력받아 함수를 통해 포인터로 값을 1 증가시킨 뒤 출력하세요. 결과 범위는 -9999~10000입니다.',starter:'#include <stdio.h>\n\nvoid add_one(int *value) {\n    // TODO: 포인터로 가리키는 값을 1 증가시키세요.\n}\n\nint main(void) {\n    int n;\n    if (scanf("%d", &n) != 1) return 1;\n    add_one(&n);\n    printf("%d\\n", n);\n    return 0;\n}',input:'7',expected:'8'}
  },
  {
    id:'c-functions',track:'c',level:'중급',title:'함수 설계: 선언·호출·값 전달',minutes:45,source:'쉽게 풀어쓴 C언어 Express 함수 단원, The C Programming Language 4.1~4.3 (주제 참조·독자 작성)',
    summary:'함수의 계약을 읽고 값 전달·지역 변수·배열 매개변수를 안전하게 설계합니다.',figure:'function-call',
    sections:[
      {heading:'선수 지식과 함수가 필요한 이유',text:'이 단원은 변수, if 문, return 문, 배열, 포인터 기초를 사용합니다. 프로그램을 입력·계산·출력처럼 이름 붙은 동작으로 나누면 같은 계산을 재사용하고 오류를 검사할 범위를 줄일 수 있습니다.'},
      {heading:'학습 목표',text:'함수 선언·정의·호출을 구분하고, 인수와 매개변수 사이의 값 전달을 설명하며, 지역 변수의 수명을 지키는 함수를 작성합니다. 배열을 받을 때 원소 개수도 함께 전달하고 컴파일·링크·논리 오류를 구분합니다.'},
      {heading:'선언, 정의, 호출은 서로 다른 역할이다',text:'함수 원형은 이름, 반환형, 매개변수 자료형을 컴파일러에 알리는 계약입니다. 정의에는 실제 동작이 있고 호출은 인수를 주어 함수를 실행합니다. 선언과 정의의 자료형은 일치해야 합니다.',code:'int clamp(int value, int low, int high); // 선언\n\nint clamp(int value, int low, int high) { // 정의\n    if (value < low) return low;\n    if (value > high) return high;\n    return value;\n}'},
      {heading:'완성 예제의 실행 결과를 따라가기',text:'입력 15 0 10에서 main은 clamp(15, 0, 10)을 호출합니다. value가 high보다 크므로 함수가 10을 반환하고 printf가 10과 줄바꿈을 출력합니다.',code:'#include <stdio.h>\n\nint clamp(int value, int low, int high);\n\nint main(void) {\n    int value, low, high;\n    if (scanf("%d%d%d", &value, &low, &high) != 3) return 1;\n    printf("%d\\n", clamp(value, low, high));\n    return 0;\n}\n\nint clamp(int value, int low, int high) {\n    if (value < low) return low;\n    if (value > high) return high;\n    return value;\n}'},
      {heading:'값 전달과 포인터 값을 구분한다',text:'C의 함수 인수는 모두 값으로 전달됩니다. 정수를 넘기면 정수 값이 복사되고 포인터를 넘기면 주소를 나타내는 포인터 값이 복사됩니다. 복사된 포인터로 같은 객체를 역참조할 때 호출자의 객체를 수정할 수 있습니다.'},
      {heading:'지역 변수의 범위와 수명을 지킨다',text:'매개변수와 블록 안의 자동 지역 변수는 해당 블록에서 이름을 사용할 수 있고, 일반적으로 블록 실행이 끝나면 수명도 끝납니다. 지역 변수의 값을 반환하는 것은 가능하지만 그 주소를 반환해 나중에 역참조하면 정의되지 않은 동작입니다.'},
      {heading:'배열 매개변수에는 길이가 들어 있지 않다',text:'함수 매개변수에서 배열 표기는 포인터 매개변수로 조정되므로 원소 개수를 별도 인수로 전달해야 합니다. count가 유효하고 values가 그만큼의 원소를 가리킨다는 계약도 필요합니다.',code:'long long sum_array(const int values[], int count) {\n    long long sum = 0;\n    for (int i = 0; i < count; ++i) {\n        sum += values[i];\n    }\n    return sum;\n}'},
      {heading:'흔한 오류를 컴파일·링크·실행 단계로 나눈다',text:'호출 전에 올바른 원형이 보이지 않거나 선언과 정의가 충돌하면 컴파일 진단을 확인합니다. 선언만 있고 정의가 링크되지 않으면 링크가 실패할 수 있습니다. 반환 경로 누락, 수명이 끝난 객체 접근, 잘못된 배열 경계는 실행 결과나 정의되지 않은 동작으로 이어질 수 있습니다.'},
      {heading:'핵심 요약과 복습 연결',text:'선언은 함수의 자료형 계약, 정의는 동작, 호출은 실행 요청입니다. 값 전달·수명·배열 길이 계약은 안전한 인터페이스의 핵심입니다. 이 지식은 재귀, 헤더와 분할 컴파일, 자료구조 인터페이스, Rust의 빌림 비교로 이어집니다.'}
    ],
    quiz:{question:'함수 원형(prototype)의 가장 중요한 역할은?',options:['호출하기 전에 함수의 이름·매개변수·반환형을 컴파일러에 알린다','함수의 지역 변수를 프로그램이 끝날 때까지 유지한다','함수의 실행 결과를 자동으로 출력한다','모든 입력값이 유효한지 자동으로 검사한다'],answer:0,explanation:'원형은 컴파일러가 호출 식의 인수와 반환형을 검사할 수 있게 하는 자료형 계약입니다.'},
    challenge:{id:'c-functions',title:'범위 제한 함수 clamp 구현',description:'정수 value, low, high를 입력받아 low <= high일 때 value를 [low, high] 범위로 제한하세요. int clamp(int value, int low, int high)를 구현하고 main에서 호출해야 합니다. 범위 안 값은 그대로, 하한보다 작으면 low, 상한보다 크면 high를 출력합니다.',starter:'#include <stdio.h>\n\nint clamp(int value, int low, int high);\n\nint main(void) {\n    int value, low, high;\n    if (scanf("%d%d%d", &value, &low, &high) != 3) return 1;\n    printf("%d\\n", clamp(value, low, high));\n    return 0;\n}\n\nint clamp(int value, int low, int high) {\n    // TODO: value를 [low, high] 범위로 제한해 반환하세요.\n    return value;\n}',input:'15 0 10',expected:'10'}
  },
  {
    id:'c-clamp-function',track:'c',level:'중급 실습',title:'함수 구현 실습: 테스트 하네스와 계약',minutes:25,source:'C 함수 계약과 테스트 하네스에 관한 독자 작성 실습',
    summary:'main 없이 clamp 함수만 구현하고, 별도 테스트 코드가 함수를 직접 호출하는 과정을 익힙니다.',figure:'function-call',
    sections:[
      {heading:'연습 목표와 함수 계약',text:'앞 단원의 함수 선언·정의·호출을 실제 인터페이스 문제에 적용합니다. 구현해야 할 계약은 int clamp(int value, int low, int high)이며 low <= high가 전제입니다. 반환값은 value가 범위 안이면 value, 하한 밖이면 low, 상한 밖이면 high입니다.'},
      {heading:'테스트 하네스가 main 역할을 맡는다',text:'이 문제에서는 학습자가 main을 작성하지 않습니다. 서버의 별도 테스트 하네스가 clamp를 선언하고 여러 인수로 직접 호출합니다. 제출 코드와 하네스를 서로 다른 C 소스 파일로 컴파일·링크하므로 함수 이름, 반환형, 매개변수 자료형이 계약과 정확히 일치해야 합니다.'},
      {heading:'반환값으로 결과를 전달하고 부작용을 피한다',text:'clamp는 계산한 정수를 반환하는 함수입니다. 함수 안에서 printf나 puts로 출력하면 하네스가 만드는 결과에 불필요한 문자가 섞여 실패합니다. 전역 상태 변경도 필요하지 않습니다. 입력을 읽고 결과를 출력하는 책임과 값을 계산하는 책임을 분리해 보세요.'},
      {heading:'단계별 예제와 실행 결과',text:'하네스가 clamp(15, 0, 10)을 호출하면 value가 high보다 크므로 10을 반환해야 합니다. 하네스는 반환값 10을 출력해 예상 결과와 비교합니다. clamp(5, 0, 10)은 5, clamp(-3, 0, 10)은 0이 되어야 합니다.',code:'int clamp(int value, int low, int high) {\n    if (value < low) return low;\n    if (value > high) return high;\n    return value;\n}'},
      {heading:'흔한 오류와 진단 읽기',text:'main을 함께 제출하면 하네스의 main과 중복되어 링크가 실패합니다. 함수 이름이나 매개변수 자료형이 다르면 하네스가 요구한 기호를 찾지 못합니다. 모든 경로에서 반환하지 않거나 디버그 출력을 남기면 컴파일 경고 또는 테스트 실패가 생깁니다.'},
      {heading:'핵심 요약과 복습 연결',text:'함수 구현형 문제에서는 공개된 함수 계약만 구현하고 입출력과 호출은 하네스에 맡깁니다. 이 구조는 헤더 파일, 분할 컴파일, 자료구조 인터페이스와 유닛 테스트 학습으로 이어집니다. 실패하면 컴파일 진단과 첫 실패 사례를 확인한 뒤 함수 본문만 고쳐 다시 제출하세요.'}
    ],
    quiz:{question:'함수 구현형 clamp 문제에서 학습자가 main을 작성하지 않는 이유는?',options:['별도 테스트 하네스가 main을 제공하고 clamp를 직접 호출하기 때문이다','C에서는 main 없이도 실행 파일이 항상 만들어지기 때문이다','clamp가 입력과 출력을 자동으로 처리하기 때문이다','함수 원형이 main을 대신 실행하기 때문이다'],answer:0,explanation:'테스트 하네스가 실행 시작점과 여러 호출 사례를 제공하므로 제출에는 계약에 맞는 함수 구현만 둡니다.'},
    challenge:{id:'c-clamp-function',title:'clamp 함수 본문만 구현하기',description:'int clamp(int value, int low, int high)의 함수 구현만 제출하세요. main 함수와 입력·출력 코드는 작성하지 마세요. low <= high이며 범위 안 값은 그대로, 하한 밖은 low, 상한 밖은 high를 반환합니다.',starter:'int clamp(int value, int low, int high) {\n    // TODO: 함수 계약에 맞는 값을 반환하세요.\n    return value;\n}',input:'clamp(15, 0, 10)',expected:'10'}
  },
  {
    id:'c-array-max-function',track:'c',level:'중급 실습',title:'배열 함수 실습: 최댓값과 출력 포인터',minutes:38,source:'C 배열·포인터·함수 계약에 관한 독자 작성 실습',
    summary:'배열과 길이를 받아 최댓값을 출력 매개변수에 기록하고 성공 여부를 반환하는 함수를 설계합니다.',figure:'array-output-contract',
    sections:[
      {heading:'선수 지식과 필요한 이유',text:'배열의 유효 인덱스, 함수의 선언·호출·반환값, 포인터의 역참조, NULL의 의미를 알고 시작합니다. 최댓값 자체가 모든 int 값을 가질 수 있으므로 특정 숫자를 오류 표시로 쓰기보다 성공 여부와 계산 결과를 분리하면 계약이 명확해집니다.'},
      {heading:'학습 목표',text:'배열 매개변수와 별도 길이가 필요한 이유를 설명하고, 출력 포인터로 결과를 전달하며, 잘못된 입력에서 역참조와 결과 변경을 피하는 함수를 작성합니다. 모든 원소가 음수이거나 INT_MIN·INT_MAX가 포함된 경계 사례도 검증합니다.'},
      {heading:'함수 계약을 먼저 고정한다',text:'int find_max(const int values[], size_t length, int *out_max)는 성공하면 1을 반환하고 *out_max에 최댓값을 기록합니다. values가 NULL이거나 length가 0이거나 out_max가 NULL이면 0을 반환합니다. 실패할 때 유효한 out_max가 있더라도 그 객체의 기존 값은 변경하지 않습니다.'},
      {heading:'배열 매개변수와 길이는 한 쌍이다',text:'함수 매개변수의 const int values[]는 const int *values로 조정됩니다. 포인터 값만으로는 원소 개수를 알 수 없으므로 length를 별도로 전달해야 합니다. const는 이 함수가 배열 원소를 바꾸지 않는다는 인터페이스 약속이며, 유효한 원소 범위는 0부터 length - 1까지입니다.',code:'int find_max(const int values[], size_t length, int *out_max);'},
      {heading:'출력 포인터와 상태 반환을 분리한다',text:'함수의 int 반환값은 성공 여부를, *out_max는 실제 최댓값을 담당합니다. 먼저 세 입력 조건을 모두 검사한 뒤에만 배열과 출력 포인터를 역참조해야 합니다. 이렇게 하면 빈 배열이라는 별도 최댓값을 억지로 만들지 않고 호출자가 실패를 명확히 처리할 수 있습니다.'},
      {heading:'단계별 예제와 실행 결과',text:'{4, -2, 9, 1}에서는 첫 원소 4를 maximum으로 시작합니다. -2는 유지, 9에서 갱신, 1은 유지하여 마지막에 9를 기록합니다. 호출 결과를 status와 out 순서로 출력하면 1 9입니다.',code:'#include <stddef.h>\n\nint find_max(const int values[], size_t length, int *out_max) {\n    if (values == NULL || length == 0 || out_max == NULL) return 0;\n    int maximum = values[0];\n    for (size_t i = 1; i < length; ++i) {\n        if (values[i] > maximum) maximum = values[i];\n    }\n    *out_max = maximum;\n    return 1;\n}'},
      {heading:'모든 원소가 음수인 경우를 놓치지 않는다',text:'maximum을 0으로 초기화하면 {-7, -3, -12}에서 배열에 없는 0을 답으로 만들게 됩니다. length > 0을 확인한 뒤 첫 원소로 초기화하면 별도의 범위 가정 없이 모든 int 값에 같은 반복 불변식을 적용할 수 있습니다.'},
      {heading:'흔한 오류와 정의되지 않은 동작',text:'입력 검증 전에 values[0] 또는 *out_max를 사용하면 NULL이나 빈 배열에서 정의되지 않은 동작이 생길 수 있습니다. 실패 전에 *out_max를 0으로 바꾸면 계약을 위반합니다. length - 1을 반복 조건에 직접 쓰면 length가 0일 때 size_t 언더플로가 생길 수 있으므로 검증 뒤 i < length 형태를 사용합니다.'},
      {heading:'중간 점검',text:'왜 최댓값의 초기값을 0이 아니라 values[0]으로 잡아야 할까요? out_max가 NULL일 때 무엇을 먼저 해야 할까요? 실패한 호출 뒤 호출자가 보관하던 out 값은 어떻게 되어야 할까요? 각각 음수 배열, 역참조 순서, 부작용 없는 실패 계약과 연결해 답해 보세요.'},
      {heading:'핵심 요약과 복습 연결',text:'배열 포인터에는 길이가 포함되지 않으며 출력 포인터는 반환값 하나로 부족한 결과를 전달할 수 있습니다. 검증을 역참조보다 먼저 하고, 성공한 경우에만 출력 객체를 변경합니다. 이 계약은 문자열 처리, 검색 함수, 자료구조 API와 Rust의 Option·Result 비교 학습으로 이어집니다.'}
    ],
    quiz:{question:'find_max가 실패한 경우 out_max가 가리키는 기존 값은 어떻게 해야 할까?',options:['변경하지 않는다','항상 0으로 바꾼다','INT_MIN으로 바꾼다','배열 첫 원소로 바꾼다'],answer:0,explanation:'계약은 성공한 경우에만 결과를 기록합니다. 실패에서는 유효한 출력 객체의 기존 값을 보존합니다.'},
    challenge:{id:'c-array-max-function',title:'find_max 함수 본문만 구현하기',description:'int find_max(const int values[], size_t length, int *out_max)를 구현하세요. 성공하면 최댓값을 기록하고 1, values/out_max가 NULL이거나 length가 0이면 0을 반환합니다. 실패하면 out_max가 가리키는 기존 값을 변경하지 마세요. main과 출력 코드는 작성하지 않습니다.',starter:'#include <stddef.h>\n\nint find_max(const int values[], size_t length, int *out_max) {\n    // TODO: 입력 계약을 검사하고 성공한 경우에만 *out_max를 변경하세요.\n    return 0;\n}',input:'find_max({4, -2, 9, 1}, 4, &out)',expected:'1 9'}
  },
  {
    id:'c-string-count-function',track:'c',level:'중급 실습',title:'문자열 함수 실습: 널 종료와 문자 세기',minutes:42,source:'C 문자 배열·널 종료 문자열·함수 계약에 관한 독자 작성 실습',
    summary:'문자 배열이 문자열이 되는 조건을 이해하고 종료 문자 전까지 특정 문자를 세는 함수를 구현합니다.',figure:'string-terminator-contract',
    sections:[
      {heading:'단원 개요와 필요한 이유',text:'C 문자열은 별도의 내장 문자열 객체가 아니라 널 문자로 끝나는 문자 배열입니다. 라이브러리와 직접 작성한 함수는 이 종료 약속을 믿고 다음 문자를 읽으므로, 문자열의 경계와 함수 계약을 함께 이해해야 메모리 범위를 벗어난 읽기를 피할 수 있습니다.'},
      {heading:'선수 지식과 학습 목표',text:'배열 인덱스, 포인터 역참조, 함수의 상태 반환과 출력 포인터, NULL 검사를 알고 시작합니다. 학습 후에는 문자 배열과 C 문자열의 차이, 종료 문자 \'\\0\'의 역할, const char * 매개변수의 의미를 설명하고 문자 수 세기 함수를 계약에 맞게 구현할 수 있어야 합니다.'},
      {heading:'문자 배열과 문자열은 같은 말이 아니다',text:'char data[3] = {\'C\', \'A\', \'T\'};는 문자 배열이지만 널 종료가 없어 C 문자열은 아닙니다. char text[] = "CAT";에는 C, A, T 다음에 컴파일러가 \'\\0\'을 추가하므로 네 칸이 필요합니다. 문자열 함수에 첫 배열을 넘기면 종료 문자를 찾기 위해 배열 밖을 읽을 수 있습니다.',code:'char data[3] = {\'C\', \'A\', \'T\'}; // 문자열 아님\nchar text[] = "CAT";              // {\'C\', \'A\', \'T\', \'\\0\'}'},
      {heading:'널 문자는 숫자 문자 0과 다르다',text:'\'\\0\'은 값이 0인 널 문자이고 문자열의 끝을 표시합니다. \'0\'은 화면에 보이는 숫자 문자이며 값이 다릅니다. 종료 문자는 저장 공간에는 존재하지만 문자열 내용의 문자 수나 검색 대상 범위에는 포함하지 않습니다. 따라서 이 단원의 계약에서 target이 \'\\0\'이면 결과는 0입니다.'},
      {heading:'포인터만으로 읽을 수 있는 길이는 알 수 없다',text:'const char *text는 첫 문자의 주소를 전달하지만 사용 가능한 배열 크기는 담지 않습니다. count_char는 호출자가 text부터 첫 \'\\0\'까지 읽을 수 있는 객체를 제공한다고 전제합니다. 포인터가 NULL인지 검사할 수는 있어도, 유효한 종료 문자가 있는지를 포인터 하나만으로 사전에 증명할 수는 없습니다.'},
      {heading:'const와 출력 포인터의 계약',text:'const char *는 이 함수가 text가 가리키는 문자를 변경하지 않는다는 약속입니다. size_t *out_count는 성공 결과를 기록할 객체를 가리킵니다. text 또는 out_count가 NULL이면 0을 반환하고, 유효한 out_count가 있더라도 기존 값은 바꾸지 않습니다. 두 포인터를 검증한 뒤에만 읽고 씁니다.',code:'int count_char(const char *text, char target, size_t *out_count);'},
      {heading:'단계별 알고리즘과 반복 불변식',text:'count를 0으로 시작하고 text[i]가 \'\\0\'이 아닌 동안만 읽습니다. 매 반복 시작 시 count는 인덱스 0부터 i-1까지 발견한 target의 개수입니다. 현재 문자가 target이면 증가시키고 다음 인덱스로 이동합니다. 종료 문자를 만나면 그 문자는 세지 않고 결과를 기록합니다.'},
      {heading:'완성 예제와 실행 결과',text:'"banana"에서 인덱스 1, 3, 5의 문자가 a이므로 count는 3입니다. 함수는 성공 상태 1과 out_count의 결과 3을 분리해 전달합니다. 하네스가 두 값을 출력하면 1 3이 됩니다.',code:'#include <stddef.h>\n\nint count_char(const char *text, char target, size_t *out_count) {\n    if (text == NULL || out_count == NULL) return 0;\n    size_t count = 0;\n    for (size_t i = 0; text[i] != \'\\0\'; ++i) {\n        if (text[i] == target) ++count;\n    }\n    *out_count = count;\n    return 1;\n}'},
      {heading:'문자열 리터럴과 수정 가능성을 구분한다',text:'문자열 리터럴은 수정하려 해서는 안 됩니다. const char *label = "CAT";처럼 읽기 전용으로 다루세요. char label[] = "CAT";는 별도 배열을 만들어 그 배열의 원소를 바꿀 수 있습니다. count_char는 const 매개변수이므로 어느 경우에도 원본 문자를 변경할 이유가 없습니다.'},
      {heading:'흔한 오류와 정의되지 않은 동작',text:'종료 문자를 찾기 전에 읽을 수 있는 객체가 끝나면 정의되지 않은 동작입니다. text[i]를 검사하기 전에 포인터를 증가시키거나 do-while로 종료 문자까지 target과 비교하면 \'\\0\'을 내용으로 잘못 셀 수 있습니다. sizeof(text)는 함수 안에서 문자열 길이가 아니라 포인터 크기이며, 실패 전에 *out_count를 0으로 쓰면 출력 보존 계약을 위반합니다.'},
      {heading:'중간 점검과 핵심 요약',text:'왜 "CAT"에 네 칸이 필요한지, 왜 \'0\'과 \'\\0\'이 다른지, 빈 문자열의 첫 문자가 무엇인지 설명해 보세요. C 문자열은 첫 널 문자 전까지이고, 포인터에는 길이가 없으며, 검증 뒤 읽고 성공한 경우에만 출력 객체를 변경한다는 세 원칙을 기억합니다.'},
      {heading:'연습과 다음 연결',text:'기초로 빈 문자열과 문자가 없는 문자열을 시험하고, 응용으로 대소문자를 구분해 여러 문자의 빈도를 세어 보세요. 도전 문제에서는 최대 읽기 길이를 별도 인수로 받아 종료 문자가 없을 때 실패하는 bounded 함수를 설계할 수 있습니다. 이 계약은 strlen류 순회, 토큰 처리, 파일 입력 버퍼, 동적 문자열과 Rust의 &str 비교로 이어집니다.'}
    ],
    quiz:{question:'count_char가 문자열의 종료 문자 \'\\0\'을 검색 대상으로 받으면 이 단원 계약에서 결과는?',options:['0이다. 종료 문자는 문자열 내용에서 제외한다','1이다. 모든 문자열에는 종료 문자가 하나 있다','문자열 길이와 같다','항상 정의되지 않은 동작이다'],answer:0,explanation:'반복은 첫 널 문자 전에 끝나며 종료 표시는 문자열 내용으로 세지 않습니다.'},
    challenge:{id:'c-string-count-function',title:'count_char 함수 본문만 구현하기',description:'int count_char(const char *text, char target, size_t *out_count)를 구현하세요. text와 out_count가 유효하면 첫 널 문자 전까지 target의 개수를 기록하고 1을 반환합니다. 둘 중 하나가 NULL이면 0을 반환하고 유효한 출력 객체의 기존 값을 보존하세요. 종료 문자 자체는 세지 않으며 main과 출력 코드는 작성하지 않습니다.',starter:'#include <stddef.h>\n\nint count_char(const char *text, char target, size_t *out_count) {\n    // TODO: 포인터를 검증하고 첫 널 문자 전까지만 target을 세세요.\n    return 0;\n}',input:'count_char("banana", \'a\', &out)',expected:'1 3'}
  },
  {
    id:'c-bounded-string-length',track:'c',level:'중급 실습',title:'경계 있는 문자열: 용량과 종료 문자',minutes:48,source:'C 문자 버퍼·경계 제한 순회·표준 입력 계약에 관한 독자 작성 실습',
    summary:'문자 버퍼의 읽기 가능 용량 안에서만 종료 문자를 찾아 문자열 길이를 안전한 계약으로 반환합니다.',figure:'bounded-string-contract',
    sections:[
      {heading:'단원 개요와 필요한 이유',text:'널 종료 문자열 함수는 종료 문자가 나타날 때까지 읽습니다. 외부 입력이나 고정 버퍼를 다룰 때는 종료가 보장되지 않을 수 있으므로, 최대 읽기 범위를 함께 전달하고 그 안에서 종료 문자를 찾지 못하면 실패하는 계약이 필요합니다.'},
      {heading:'선수 지식과 학습 목표',text:'문자 배열, 널 종료, size_t, NULL, 출력 포인터를 알고 시작합니다. 학습 후에는 문자열과 단순 문자 버퍼를 구별하고, 반열린 구간 [0, capacity)만 검사하며, 성공한 경우에만 길이를 기록하는 bounded 함수를 구현할 수 있습니다.'},
      {heading:'capacity가 보장하는 것과 보장하지 않는 것',text:'capacity는 함수가 읽어도 되는 char 객체의 최대 개수입니다. 호출자는 buffer부터 capacity개의 char 객체가 읽기 가능함을 보장해야 합니다. 숫자만 전달한다고 잘못된 포인터가 안전해지지는 않으며, 함수는 포인터가 실제로 그만큼의 저장 공간을 가리키는지 스스로 확인할 수 없습니다.'},
      {heading:'반열린 범위로 경계를 표현한다',text:'검사 인덱스는 [0, capacity), 즉 0 이상 capacity 미만입니다. i < capacity 조건은 마지막 허용 인덱스 capacity - 1을 포함하면서 바로 다음 칸은 읽지 않습니다. capacity가 0이면 유효한 검사 인덱스가 없으므로 실패합니다.',code:'for (size_t i = 0; i < capacity; ++i) {\n    if (buffer[i] == \'\\0\') { /* 길이는 i */ }\n}'},
      {heading:'함수 계약과 출력 보존',text:'int bounded_length(const char *buffer, size_t capacity, size_t *out_length)는 범위 안에서 첫 종료 문자를 찾으면 길이를 기록하고 1을 반환합니다. buffer 또는 out_length가 NULL이거나 capacity가 0이거나 종료 문자가 범위 안에 없으면 0을 반환하며, 유효한 out_length의 기존 값은 보존합니다.'},
      {heading:'정확한 경계 사례',text:'{\'A\', \'B\', \'C\', \'\\0\'}에 capacity 4를 주면 인덱스 3은 범위 안이므로 성공하고 길이 3입니다. 같은 배열에 capacity 3을 주면 인덱스 3은 읽어서는 안 되므로 종료 문자를 발견하지 못한 실패입니다. 배열에 종료 문자가 실제로 있느냐와 허용 범위 안에 있느냐는 다른 질문입니다.'},
      {heading:'단계별 완성 예제와 실행 결과',text:'포인터와 용량을 먼저 검증하고, 범위 안의 각 문자를 차례로 검사합니다. 종료 문자를 발견한 시점의 인덱스가 문자열 길이입니다. 전체 범위를 검사해도 발견하지 못하면 출력 객체를 건드리지 않고 실패합니다. CAT 예제의 출력은 1 3입니다.',code:'#include <stddef.h>\n\nint bounded_length(const char *buffer, size_t capacity, size_t *out_length) {\n    if (buffer == NULL || capacity == 0 || out_length == NULL) return 0;\n    for (size_t i = 0; i < capacity; ++i) {\n        if (buffer[i] == \'\\0\') {\n            *out_length = i;\n            return 1;\n        }\n    }\n    return 0;\n}'},
      {heading:'fgets와 입력 버퍼의 연결',text:'다음은 앞 절의 bounded_length 구현과 함께 컴파일하는 호출 코드 조각입니다. fgets(buffer, sizeof buffer, stdin)는 성공하면 최대 sizeof buffer - 1개의 문자를 저장하고 끝에 널 문자를 씁니다. 줄의 개행 문자가 공간 안에 들어오면 그 개행도 배열에 남습니다. 빈 줄은 ""가 아니라 "\\n"으로 읽힐 수 있고, EOF나 오류로 NULL을 반환하면 버퍼에 새 문자열이 생겼다고 가정해서는 안 됩니다.',code:'#include <stdio.h>\n\nint main(void) {\n    char line[8];\n    if (fgets(line, sizeof line, stdin) == NULL) return 1;\n    size_t length;\n    if (!bounded_length(line, sizeof line, &length)) return 2;\n    printf("저장된 문자 수: %zu\\n", length);\n    return 0;\n}'},
      {heading:'개행과 잘린 입력을 해석한다',text:'입력이 짧으면 fgets가 개행까지 저장하므로 길이에는 개행이 포함됩니다. 버퍼가 먼저 가득 차면 그 호출에는 개행이 없을 수 있지만 널 종료는 성공 시 보장됩니다. 개행이 없다는 사실만으로 줄이 끝났다고 단정할 수 없으며, 남은 입력 처리 정책은 호출자가 별도로 정해야 합니다.'},
      {heading:'흔한 오류와 정의되지 않은 동작',text:'i <= capacity는 한 칸을 더 읽습니다. 종료 문자가 없을 때 capacity를 정상 길이로 발표하면 비종료 버퍼를 문자열로 오인합니다. 실패 전에 *out_length를 0으로 바꾸면 출력 보존 계약을 깨뜨립니다. capacity가 실제 배열 크기보다 크면 이 함수도 범위 밖을 읽을 수 있으므로 호출자 전제를 문서화해야 합니다.'},
      {heading:'중간 점검과 핵심 요약',text:'capacity 4일 때 인덱스 4를 읽어도 되는지, 마지막 허용 칸의 종료 문자는 성공인지, fgets가 반환한 문자열에 개행이 남을 수 있는지 답해 보세요. 핵심은 읽기 가능한 범위, 첫 종료 문자, 실패 시 출력 보존을 하나의 계약으로 묶는 것입니다.'},
      {heading:'연습과 복습 연결',text:'기초로 빈 문자열과 마지막 칸 종료를 시험하고, 응용으로 개행을 제외한 논리적 줄 길이를 계산하세요. 도전으로 여러 번 fgets를 호출해 긴 줄을 조각별로 소비하는 도구를 설계하세요. 이 경계 계약은 토큰화, 파일 입력, 네트워크 버퍼, 길이 기반 C API와 Rust 슬라이스 비교로 이어집니다.'}
    ],
    quiz:{question:'capacity가 3일 때 buffer[3]에 종료 문자가 있다는 사실을 함수가 사용해도 될까?',options:['안 된다. 검사 범위는 인덱스 0, 1, 2뿐이다','된다. 종료 문자는 언제나 한 칸 더 읽어도 된다','out_length가 유효하면 된다','buffer가 NULL이 아니면 된다'],answer:0,explanation:'[0, capacity)는 capacity 자체를 포함하지 않습니다. buffer[3]을 읽으려면 capacity가 적어도 4여야 합니다.'},
    challenge:{id:'c-bounded-string-length',title:'bounded_length 함수 본문만 구현하기',description:'int bounded_length(const char *buffer, size_t capacity, size_t *out_length)를 구현하세요. [0, capacity)에서 첫 널 문자를 찾으면 길이를 기록하고 1을 반환합니다. 포인터가 NULL이거나 capacity가 0이거나 종료 문자가 범위 안에 없으면 0을 반환하고 유효한 출력 객체의 기존 값을 보존하세요. main과 출력 코드는 작성하지 않습니다.',starter:'#include <stddef.h>\n\nint bounded_length(const char *buffer, size_t capacity, size_t *out_length) {\n    // TODO: [0, capacity) 안에서만 종료 문자를 찾으세요.\n    return 0;\n}',input:'bounded_length({\'C\', \'A\', \'T\', \'\\0\'}, 4, &out)',expected:'1 3'}
  },
  {
    id:'c-fgets-logical-line',track:'c',level:'중급 실습',title:'fgets로 논리적 한 줄 읽기',minutes:52,source:'C 표준 스트림·fgets·EOF와 입력 오류에 관한 독자 작성 실습',
    summary:'고정 크기 버퍼로 긴 입력을 여러 번 읽어 첫 논리적 한 줄의 바이트 길이를 정확히 계산합니다.',figure:'fgets-chunks',
    sections:[
      {heading:'단원 개요와 필요한 이유',text:'한 번의 fgets 호출은 한 줄 전체가 아니라 버퍼에 들어가는 한 조각만 돌려줄 수 있습니다. 사용자 입력, 설정 파일, 로그처럼 길이를 미리 모르는 줄을 처리하려면 여러 조각을 하나의 논리적 한 줄로 합쳐 해석해야 합니다.'},
      {heading:'선수 지식과 학습 목표',text:'문자 배열, 널 종료, size_t, 반복문, 표준 입력과 bounded 순회를 알고 시작합니다. 학습 후에는 fgets의 저장 한도, 개행 보존, 정확한 버퍼 경계, 깨끗한 EOF와 입력 오류를 구분하고 첫 논리적 한 줄의 바이트 수를 계산할 수 있어야 합니다.'},
      {heading:'fgets가 성공할 때 저장하는 것',text:'fgets(chunk, sizeof chunk, stdin)는 최대 sizeof chunk - 1바이트를 저장하고 끝에 널 문자를 덧붙입니다. 그 전에 개행을 만나면 개행 문자까지 저장하고 호출을 마칩니다. char chunk[8]에서는 한 번에 입력 내용 7바이트까지만 들어갑니다.',code:'char chunk[8];\nif (fgets(chunk, sizeof chunk, stdin) != NULL) {\n    /* chunk는 널 종료되지만 한 줄 전체인지는 아직 모른다. */\n}'},
      {heading:'버퍼 조각과 논리적 한 줄을 구분한다',text:'이 단원의 논리적 한 줄은 개행 직전까지의 입력이며 개행 자체는 길이에서 제외합니다. 첫 조각에 개행이 없다면 다음 fgets 호출로 계속 읽습니다. 각 조각에서 널 문자나 개행 전까지의 바이트만 누적하고, 개행을 발견한 순간 첫 줄 처리를 끝냅니다.'},
      {heading:'정확한 경계에서는 한 번 더 읽어야 한다',text:'char chunk[8]에 정확히 7바이트를 입력한 뒤 개행했다면 첫 호출은 7바이트와 널 문자로 가득 차고 개행은 스트림에 남습니다. 개행이 없다는 사실만으로 입력이 잘렸다고 단정하면 안 됩니다. 두 번째 호출이 남은 개행을 소비해야 첫 논리적 한 줄이 끝났음을 알 수 있습니다.'},
      {heading:'빈 줄과 입력 없는 EOF는 다르다',text:'빈 줄은 첫 호출이 "\\n"을 성공적으로 읽은 경우이므로 길이 0을 출력합니다. 반대로 아무 바이트도 읽기 전에 fgets가 NULL을 반환하고 feof(stdin)가 참이면 이 실습은 NO INPUT을 출력합니다. 둘은 결과 길이가 우연히 0이라는 이유로 같은 상태가 아닙니다.'},
      {heading:'EOF 뒤에도 이미 읽은 데이터는 유효하다',text:'마지막 줄에 개행이 없어도 파일은 정상적으로 끝날 수 있습니다. 한 바이트 이상 누적한 뒤 다음 fgets가 깨끗한 EOF를 만나면 지금까지의 누적 길이를 출력합니다. 예를 들어 tail-without-newline은 개행 없이 끝나도 20을 출력합니다.'},
      {heading:'EOF와 입력 오류를 분리한다',text:'fgets가 NULL을 반환한 뒤 ferror(stdin)가 참이면 읽기 오류이며, 이 프로그램은 정상 결과를 출력하지 않고 1을 반환합니다. feof와 ferror는 읽기 시도 결과를 해석하는 상태이므로 반환값을 먼저 확인합니다. 일반 파일 끝과 장치·스트림 오류를 같은 성공으로 처리해서는 안 됩니다.'},
      {heading:'단계별 완성 프로그램과 실행 결과',text:'다음은 이 단원의 완성 프로그램입니다. 각 성공 조각을 순회해 개행 전 바이트를 더하고, 개행이나 깨끗한 EOF에서 종료합니다. abcdefghijklmnopqrstuvwxyz와 개행을 넣으면 여러 조각을 거쳐 26을 출력합니다.',code:'#include <stddef.h>\n#include <stdio.h>\n\nint main(void) {\n    char chunk[8];\n    size_t total = 0;\n    int saw_input = 0;\n    for (;;) {\n        if (fgets(chunk, sizeof chunk, stdin) == NULL) {\n            if (ferror(stdin)) return 1;\n            if (!saw_input) { puts("NO INPUT"); return 0; }\n            break;\n        }\n        saw_input = 1;\n        size_t i = 0;\n        while (chunk[i] != \'\\0\' && chunk[i] != \'\\n\') ++i;\n        total += i;\n        if (chunk[i] == \'\\n\') break;\n    }\n    printf("%zu\\n", total);\n    return 0;\n}'},
      {heading:'길이는 문자 수가 아니라 바이트 수다',text:'char 배열의 인덱스와 이 실습의 total은 바이트 단위입니다. UTF-8 한국어 한 글자는 여러 바이트일 수 있으므로 화면에 보이는 글자 수와 결과가 다를 수 있습니다. 매우 큰 입력을 일반 제품에서 다룬다면 size_t 덧셈의 넘침 정책도 별도로 설계해야 합니다.'},
      {heading:'흔한 오류와 입력 정책',text:'strlen 한 번으로 첫 조각만 세거나, 조각마다 개행을 길이에 포함하거나, EOF 전에 읽은 데이터를 버리는 실수가 흔합니다. 첫 줄 뒤의 입력은 이 문제에서 의도적으로 무시합니다. Windows 텍스트 스트림의 줄 끝 변환 같은 구현 환경 차이가 있으므로 원시 파일 바이트 수를 세는 문제와도 구분해야 합니다.'},
      {heading:'중간 점검·핵심 요약·다음 연결',text:'정확히 7바이트 뒤 개행이 왜 두 번의 호출을 요구하는지, 빈 줄과 즉시 EOF가 왜 다른지 설명해 보세요. 핵심은 성공한 조각을 누적하고 개행에서 멈추며, NULL 반환 뒤 ferror와 EOF를 구분하는 것입니다. 이 흐름은 줄 단위 파서, 동적 버퍼, 파일 분석과 스트림 상태 처리로 이어집니다.'}
    ],
    quiz:{question:'char chunk[8]로 정확히 7바이트 뒤의 개행까지 읽을 때 올바른 설명은?',options:['첫 호출 뒤 다음 호출로 남은 개행을 확인해야 한다','첫 호출에 반드시 개행까지 들어간다','개행이 없으면 즉시 입력 오류다','널 종료가 없으므로 문자열로 다룰 수 없다'],answer:0,explanation:'첫 호출은 내용 7바이트와 널 문자로 가득 찰 수 있으므로, 다음 호출이 남은 개행을 읽어야 줄의 끝을 확인할 수 있습니다.'},
    challenge:{id:'c-fgets-logical-line',title:'첫 논리 줄의 바이트 길이',description:'char chunk[8]과 fgets를 반복 사용하여 첫 논리적 한 줄의 바이트 길이를 개행 없이 출력하세요. 빈 줄은 0, 개행 없이 끝난 마지막 줄은 누적 길이, 아무 바이트도 없는 즉시 EOF는 NO INPUT을 출력합니다. 입력 오류는 성공 결과로 처리하지 마세요.',starter:'#include <stddef.h>\n#include <stdio.h>\n\nint main(void) {\n    char chunk[8];\n    size_t total = 0;\n    int saw_input = 0;\n\n    // TODO: 여러 fgets 조각을 첫 개행 또는 EOF까지 소비하세요.\n\n    (void)chunk;\n    (void)total;\n    (void)saw_input;\n    return 0;\n}',input:'CAT',expected:'3'}
  },
  {
    id:'c-strtol-integer-input',track:'c',level:'중급 실습',title:'fgets와 strtol로 정수 검증하기',minutes:58,source:'C 표준 문자열 변환·오류 상태·문자 분류 계약에 관한 독자 작성 실습',
    summary:'한 줄을 먼저 읽고 숫자 없음, 뒤따르는 문자, 표현 범위 초과를 서로 다른 결과로 판정합니다.',figure:'strtol-parse-contract',
    sections:[
      {heading:'단원 개요와 필요한 이유',text:'사용자가 입력한 문자가 정수처럼 보인다는 사실과 C의 long 값으로 안전하게 변환되었다는 사실은 다릅니다. 이 단원은 fgets로 입력 경계를 먼저 확보하고 strtol의 반환값, endptr, errno를 함께 해석해 정상 정수·문법 오류·범위 오류를 구분합니다.'},
      {heading:'선수 지식과 학습 목표',text:'널 종료 문자열, fgets의 버퍼 경계, EOF와 입력 오류, 함수 반환값을 알고 시작합니다. 학습 후에는 10진수 변환의 시작·끝을 설명하고, 정상 음수·숫자 없음·뒤따르는 문자·long 범위 초과·빈 입력·너무 긴 줄을 서로 다른 계약으로 처리할 수 있어야 합니다.'},
      {heading:'atoi보다 strtol이 검증에 알맞다',text:'atoi는 0이라는 정상 입력과 변환할 숫자가 없는 입력을 반환값만으로 구분할 수 없고 표현 범위를 벗어난 입력을 검증하는 인터페이스도 제공하지 않습니다. strtol은 변환이 끝난 위치와 범위 오류 상태를 따로 알려 주므로 입력 검증 정책을 코드로 표현할 수 있습니다.'},
      {heading:'먼저 한 줄의 저장 경계를 확정한다',text:'char line[64]에는 최대 63바이트와 널 문자가 들어갑니다. 이 실습은 첫 줄 내용이 63바이트 이하면 변환하고, 64바이트 이상이면 남은 첫 줄을 소비한 뒤 TOO LONG을 출력합니다. 정확히 63바이트 뒤 개행은 다음 getchar 호출에서 개행만 확인하므로 허용됩니다.',code:'char line[64];\nif (fgets(line, sizeof line, stdin) == NULL) {\n    if (ferror(stdin)) return 1;\n    puts("NO INPUT");\n    return 0;\n}'},
      {heading:'strtol의 세 결과를 함께 읽는다',text:'strtol(line, &endptr, 10)은 10진수 long 값을 반환하고, endptr에는 변환에 사용하지 않은 첫 문자의 주소를 기록합니다. 앞쪽 공백과 선택적인 부호는 처리하지만, 성공을 반환값 하나로 판단해서는 안 됩니다. 값, 끝 위치, errno는 서로 다른 질문에 답합니다.',code:'errno = 0;\nchar *endptr;\nlong value = strtol(line, &endptr, 10);'},
      {heading:'숫자가 하나도 없으면 endptr가 시작점을 가리킨다',text:'빈 줄, 공백뿐인 줄, abc, 부호만 있는 + 같은 입력에서는 변환할 숫자가 없습니다. 이때 endptr == line인지 검사하여 INVALID로 판정합니다. 정상 값 0도 strtol의 반환값은 0이므로 value == 0만 검사해서는 이 상태를 구분할 수 없습니다.'},
      {heading:'뒤따르는 문자는 별도로 끝까지 검사한다',text:'12xyz는 12까지 변환 자체는 성공하지만 이 실습의 전체 줄 정수 계약에는 맞지 않습니다. endptr부터 널 문자까지 공백 문자만 허용합니다. isspace에는 EOF 또는 unsigned char로 표현 가능한 값을 전달해야 하므로 문자열 바이트를 (unsigned char)로 변환한 뒤 호출합니다.',code:'while (*endptr != \'\\0\' && isspace((unsigned char)*endptr)) {\n    ++endptr;\n}\nif (*endptr != \'\\0\') puts("INVALID");'},
      {heading:'errno를 0으로 지운 뒤 ERANGE를 확인한다',text:'strtol은 결과가 long의 표현 범위를 벗어나면 errno를 ERANGE로 설정하고 LONG_MIN 또는 LONG_MAX 방향의 값을 반환합니다. 이전 라이브러리 호출이 남긴 errno와 혼동하지 않도록 호출 직전에 errno = 0으로 초기화하고, 호출 직후 ERANGE인지 검사해 RANGE를 출력합니다.'},
      {heading:'long의 범위는 구현에서 확인한다',text:'C는 long의 비트 수나 최댓값을 고정해 가정하지 않습니다. <limits.h>의 LONG_MIN과 LONG_MAX가 현재 구현의 범위를 나타냅니다. 특정 컴퓨터의 64비트 long 값을 모든 환경의 언어 보장처럼 설명하지 않고, 실제 변환 가능 여부는 strtol과 ERANGE로 판정합니다.'},
      {heading:'판정 순서가 오류 의미를 보존한다',text:'먼저 입력 읽기와 줄 길이를 확정하고, errno를 지운 뒤 변환합니다. 그 다음 endptr == line으로 숫자 없음을, errno == ERANGE로 범위 초과를, 마지막으로 잔여 문자를 검사합니다. 서로 다른 실패를 하나의 0이나 비정상 종료로 뭉개지 않아야 학습자와 호출자가 원인을 알 수 있습니다.'},
      {heading:'완성 프로그램과 실행 결과',text:'완성 프로그램은 첫 줄만 처리합니다. 입력 "  -42  "는 앞뒤 공백을 허용해 -42를 출력하고, 12xyz는 INVALID, 충분히 큰 10진수는 RANGE를 출력합니다. 64바이트 이상의 첫 줄은 값 해석 전에 TOO LONG으로 판정합니다.',code:'#include <ctype.h>\n#include <errno.h>\n#include <stdio.h>\n#include <stdlib.h>\n\nint main(void) {\n    char line[64];\n    if (fgets(line, sizeof line, stdin) == NULL) {\n        if (ferror(stdin)) return 1;\n        puts("NO INPUT");\n        return 0;\n    }\n\n    size_t i = 0;\n    while (line[i] != \'\\0\' && line[i] != \'\\n\') ++i;\n    if (line[i] == \'\\0\') {\n        int ch = getchar();\n        if (ch != EOF && ch != \'\\n\') {\n            do { ch = getchar(); } while (ch != EOF && ch != \'\\n\');\n            if (ch == EOF && ferror(stdin)) return 1;\n            puts("TOO LONG");\n            return 0;\n        }\n        if (ch == EOF && ferror(stdin)) return 1;\n    }\n\n    errno = 0;\n    char *endptr;\n    long value = strtol(line, &endptr, 10);\n    if (endptr == line) { puts("INVALID"); return 0; }\n    if (errno == ERANGE) { puts("RANGE"); return 0; }\n    while (*endptr != \'\\0\' && isspace((unsigned char)*endptr)) ++endptr;\n    if (*endptr != \'\\0\') { puts("INVALID"); return 0; }\n    printf("%ld\\n", value);\n    return 0;\n}'},
      {heading:'흔한 오류와 정의된 범위',text:'atoi로 모든 입력을 0과 섞거나, endptr를 무시해 12xyz를 12로 승인하거나, errno를 초기화하지 않아 과거 오류를 현재 오류로 오인하는 실수가 흔합니다. isspace에 음수 char를 그대로 넘기는 호출은 허용된 인수 계약을 어길 수 있습니다. 고정 버퍼보다 긴 줄을 첫 조각만 변환하면 남은 입력까지 잘못된 상태로 남깁니다.'},
      {heading:'중간 점검·핵심 요약·연습 연결',text:'0과 abc를 무엇으로 구분하는지, 12xyz에서 endptr가 어디를 가리키는지, 왜 ERANGE와 LONG_MIN/LONG_MAX를 함께 알아야 하는지 설명해 보세요. 기초로 부호와 공백을 시험하고, 응용으로 허용 범위를 별도 정책으로 좁혀 보세요. 도전으로 여러 필드를 파싱하고 각 필드의 끝 위치를 연결하면 설정 파일·명령행 인수·파일 데이터 검증으로 확장할 수 있습니다.'}
    ],
    quiz:{question:'strtol이 0을 반환했을 때 입력이 유효한 정수 0인지 숫자가 없었는지 구분하는 핵심 검사는?',options:['endptr == line인지 확인한다','LONG_MAX와만 비교한다','strlen이 0인지 확인한다','항상 errno가 ERANGE인지 확인한다'],answer:0,explanation:'변환된 숫자가 하나도 없으면 endptr가 시작 주소와 같습니다. 정상 입력 0은 숫자를 소비하므로 끝 위치가 이동합니다.'},
    challenge:{id:'c-strtol-integer-input',title:'한 줄의 10진수 long 검증하기',description:'char line[64]로 첫 줄을 읽어 10진수 long 하나만 허용하세요. 정상 값은 정규화해 출력하고, 입력 없음은 NO INPUT, 64바이트 이상인 첫 줄은 TOO LONG, 숫자 없음이나 뒤따르는 비공백 문자는 INVALID, long 범위 초과는 RANGE를 출력합니다. 앞뒤 공백과 정상 음수는 허용하며 입력 오류는 성공 결과로 처리하지 마세요.',starter:'#include <ctype.h>\n#include <errno.h>\n#include <stdio.h>\n#include <stdlib.h>\n\nint main(void) {\n    char line[64];\n\n    // TODO: 첫 줄의 길이를 확정하고 strtol의 세 결과를 검증하세요.\n\n    (void)line;\n    return 0;\n}',input:'  -42',expected:'-42'}
  },
  {
    id:'c-struct-student-score',track:'c',level:'중급 실습',title:'구조체와 포인터로 학생 점수 갱신하기',minutes:55,source:'C 구조체·포인터·상태 보존 계약에 관한 독자 작성 실습',
    summary:'학생의 학번과 점수를 한 객체로 묶고, 모든 검증을 통과한 경우에만 포인터로 점수를 갱신합니다.',figure:'struct-update-contract',
    sections:[
      {heading:'단원 개요와 필요한 이유',text:'struct Student는 서로 관련된 id와 score를 하나의 객체로 묶습니다. 이 단원에서는 호출자가 가진 학생 객체의 주소를 함수에 전달하고, 성공했을 때만 점수를 바꾸는 안전한 갱신 계약을 설계합니다.'},
      {heading:'선수 지식과 학습 목표',text:'함수의 반환값과 매개변수, 변수의 주소, 포인터 역참조를 알고 시작합니다. 학습 후에는 struct Student를 정의하고, 값 복사와 주소 전달을 구분하며, student->score로 멤버를 읽고 쓸 수 있어야 합니다.'},
      {heading:'구조체 정의와 객체는 다르다',text:'struct Student 정의는 id와 score라는 멤버 배치를 설명하는 자료형이고, 실제 값을 저장하는 객체는 별도로 선언합니다. 지정 초기화는 각 값이 어느 멤버에 들어가는지 코드에 드러냅니다.',code:'struct Student {\n    int id;\n    int score;\n};\n\nstruct Student student = {.id = 101, .score = 70};'},
      {heading:'점 연산자와 화살표 연산자',text:'구조체 객체 자체가 있으면 student.score처럼 점 연산자를 사용합니다. 구조체를 가리키는 포인터가 있으면 student->score를 사용하며, 이는 (*student).score와 같은 뜻입니다. 괄호 없이 *student.score라고 쓰면 연산자 결합 순서가 달라집니다.'},
      {heading:'값 복사는 호출자의 객체를 바꾸지 않는다',text:'구조체를 값으로 매개변수에 전달하면 함수는 멤버 값의 복사본을 받습니다. 복사본의 score를 바꾸어도 호출자의 원본에는 반영되지 않습니다. 원본 상태를 갱신하려면 객체의 주소와 포인터 매개변수가 필요합니다.'},
      {heading:'주소 전달은 변경 권한도 전달한다',text:'update_score(&student, delta)를 호출하면 함수가 호출자의 객체에 접근할 수 있습니다. 따라서 포인터가 NULL인지 먼저 검사하고, 함수 계약이 허용한 멤버만 변경해야 합니다. 이 실습에서는 id는 항상 유지합니다.'},
      {heading:'현재 상태부터 검증한다',text:'유효한 점수는 0 이상 100 이하입니다. student가 NULL이거나 현재 student->score가 이 범위를 벗어나면 0을 반환합니다. 이미 잘못된 객체를 delta로 우연히 정상 범위에 넣어 성공시키지 않습니다.'},
      {heading:'덧셈 전에 결과 범위를 판정한다',text:'signed int 덧셈이 표현 범위를 벗어나면 정의되지 않은 동작이므로 result = student->score + delta를 먼저 계산하면 안 됩니다. 현재 점수를 검증한 뒤 delta < -student->score 또는 delta > 100 - student->score인지 검사하면 위험한 덧셈 없이 결과 범위를 알 수 있습니다.'},
      {heading:'검증 뒤 한 번만 변경한다',text:'실패 시 원본 전체를 보존하려면 NULL, 현재 상태, delta 범위를 모두 검사한 뒤 마지막에 student->score += delta를 한 번만 수행합니다. 성공하면 1, 실패하면 0을 반환하며 id는 성공과 실패 모두에서 유지됩니다.'},
      {heading:'완성 함수와 실행 결과',text:'점수 70인 학생에 15를 더하면 1 101 85가 출력됩니다. 그 다음 20을 더하려는 요청은 100을 넘으므로 0 101 85를 출력하며 실패 전 상태가 그대로 남습니다.',code:'int update_score(struct Student *student, int delta) {\n    if (student == NULL) return 0;\n    if (student->score < 0 || student->score > 100) return 0;\n    if (delta < -student->score || delta > 100 - student->score) return 0;\n    student->score += delta;\n    return 1;\n}'},
      {heading:'흔한 오류와 구조체 표현',text:'검증 전에 score를 바꾸었다가 실패하는 코드, NULL 검사보다 먼저 멤버를 읽는 코드, id까지 덮어쓰는 코드가 흔합니다. 구조체에는 정렬을 위한 패딩이 있을 수 있으므로 sizeof(struct Student)를 멤버 크기의 단순 합으로 단정하거나 원시 바이트를 이식 가능한 파일 형식처럼 저장해서도 안 됩니다.'},
      {heading:'중간 점검·핵심 요약·연습 연결',text:'값 복사와 주소 전달의 차이, student->score의 의미, 실패 시 원본을 보존하는 검사 순서를 설명해 보세요. 핵심은 유효한 현재 상태를 확인하고 안전한 비교로 결과 범위를 판정한 뒤 허용된 멤버만 변경하는 것입니다. 이 계약은 구조체 배열, 연결 리스트 노드, 파일 레코드 갱신으로 이어집니다.'}
    ],
    quiz:{question:'갱신 실패 시 Student 원본 전체를 가장 확실히 보존하는 구현 순서는?',options:['모든 조건을 검사한 뒤 마지막에 score만 변경한다','먼저 score를 더하고 실패하면 대략 되돌린다','id와 score를 모두 0으로 만든 뒤 검사한다','NULL이어도 멤버를 읽어 현재 점수를 확인한다'],answer:0,explanation:'상태를 바꾸기 전에 모든 실패 조건을 확정하면 되돌리기 코드 없이 원본 보존 계약을 지킬 수 있습니다.'},
    challenge:{id:'c-struct-student-score',title:'학생 점수 안전하게 갱신하기',description:'struct Student의 id와 score를 사용하고 int update_score(struct Student *student, int delta)를 구현하세요. 현재 score와 요청 결과는 모두 0 이상 100 이하여야 합니다. 성공하면 score만 바꾸고 1을, NULL·잘못된 현재 점수·범위 밖 결과에서는 객체 전체를 보존하고 0을 반환하세요. signed int 넘침이 일어날 수 있는 덧셈을 검사 전에 수행하지 않습니다. main과 출력 코드는 작성하지 않습니다.',starter:'struct Student {\n    int id;\n    int score;\n};\n\nint update_score(struct Student *student, int delta) {\n    // TODO: 검증을 모두 마친 뒤 score만 변경하세요.\n    (void)student;\n    (void)delta;\n    return 0;\n}',input:'update_score({101, 70}, 15)',expected:'1 101 85'}
  },
  {
    id:'c-struct-array-search',track:'c',level:'중급 실습',title:'구조체 배열에서 학번 찾기',minutes:58,source:'C 구조체 배열·선형 탐색·출력 계약에 관한 독자 작성 실습',
    summary:'구조체 배열의 유효 범위를 순회하여 첫 일치 학번의 인덱스를 찾고, 실패 시 출력 객체를 보존합니다.',figure:'struct-array-search',
    sections:[
      {heading:'단원 개요와 필요한 이유',text:'학생 한 명을 struct Student로 묶었다면 다음 단계는 여러 학생을 배열로 관리하는 것입니다. 이 단원은 학번으로 학생을 찾는 선형 탐색을 통해 구조체 배열, 명시적인 원소 수, 첫 일치 정책과 실패 시 출력 보존을 하나의 함수 계약으로 연결합니다.'},
      {heading:'선수 지식과 학습 목표',text:'배열과 size_t, 함수의 상태 반환값·출력 포인터, 구조체의 점 연산자를 알고 시작합니다. 학습 후에는 students[i].id로 각 원소의 멤버를 읽고, [0, count) 범위를 안전하게 순회하며, 첫 번째 일치 위치만 출판할 수 있어야 합니다.'},
      {heading:'구조체 배열의 각 원소는 완전한 객체다',text:'struct Student students[3]은 Student 객체 세 개를 연속된 배열 원소로 둡니다. 각 구조체 내부에는 정렬을 위한 패딩이 있을 수 있지만 배열 원소 사이는 sizeof(struct Student) 단위로 이동하므로 students[i]가 올바른 i번째 객체를 가리킵니다.',code:'struct Student students[] = {\n    {.id = 101, .score = 70},\n    {.id = 205, .score = 88},\n    {.id = 309, .score = 95}\n};'},
      {heading:'배열 매개변수만으로 길이는 알 수 없다',text:'함수 매개변수의 const struct Student students[]는 const struct Student *students로 조정됩니다. 따라서 함수 안의 sizeof students는 배열 전체 크기가 아니라 포인터 크기입니다. 원소 수 count를 별도 매개변수로 전달해야 하며 호출자는 실제 배열 범위를 넘지 않는 값을 제공할 책임이 있습니다.'},
      {heading:'const는 검색 함수의 읽기 전용 의도를 나타낸다',text:'검색은 학생 정보를 바꿀 이유가 없으므로 students를 const로 받습니다. 이는 함수 본문에서 일반적인 멤버 대입을 막아 읽기 전용 계약을 드러냅니다. 다만 NULL이 아닌 포인터가 정말 count개 유효 객체를 가리키는지는 C 함수가 스스로 증명할 수 없으므로 호출자 계약이 필요합니다.'},
      {heading:'유효 범위는 [0, count)다',text:'size_t i = 0에서 시작해 i < count인 동안만 읽습니다. count가 0이면 읽을 원소가 없으므로 students[0]에 접근하지 않습니다. i <= count나 count - 1을 상한으로 쓰면 범위 밖 접근 또는 unsigned 언더플로를 만들 수 있습니다.'},
      {heading:'점 연산자로 현재 원소의 학번을 비교한다',text:'students[i]는 구조체 객체이므로 학번은 students[i].id로 읽습니다. students->id는 (*students).id, 즉 첫 원소의 학번만 뜻하므로 반복문의 모든 원소를 검사하는 표현이 아닙니다. 목표 학번과 같은지 각 인덱스에서 비교합니다.'},
      {heading:'중복 학번은 첫 번째 일치를 선택한다',text:'현실의 학번은 고유해야 할 수 있지만 검색 함수의 동작은 잘못된 데이터에서도 결정적이어야 합니다. 이 계약은 중복이 있으면 가장 작은 인덱스, 즉 첫 번째 일치를 반환합니다. 일치를 발견한 즉시 출력하고 반환해야 마지막 중복 원소로 덮어쓰지 않습니다.'},
      {heading:'실패 시 출력 객체를 보존한다',text:'students가 NULL이거나 count가 0이거나 out_index가 NULL이면 0을 반환합니다. 끝까지 학번을 찾지 못해도 0을 반환합니다. 어느 실패 경로에서도 유효한 out_index가 가리키는 값을 바꾸지 않고, 성공이 확정된 순간에만 *out_index = i를 수행합니다.'},
      {heading:'완성 함수와 실행 결과',text:'학번 205를 찾으면 인덱스 1이므로 상태와 위치를 합쳐 1 1이 출력됩니다. 같은 배열에서 999를 찾으면 상태 0을 반환하고 호출자가 미리 넣어 둔 77을 그대로 유지하여 0 77이 출력됩니다.',code:'int find_student_index(const struct Student students[], size_t count,\n                       int target_id, size_t *out_index) {\n    if (students == NULL || count == 0 || out_index == NULL) return 0;\n    for (size_t i = 0; i < count; ++i) {\n        if (students[i].id == target_id) {\n            *out_index = i;\n            return 1;\n        }\n    }\n    return 0;\n}'},
      {heading:'비용과 흔한 오류',text:'최악에는 count개 원소를 모두 보므로 시간 복잡도는 O(n), 추가 공간은 O(1)입니다. sizeof students로 길이를 구하기, students->id만 반복 비교하기, 인덱스 1부터 시작하기, 실패 전에 out_index를 0으로 덮기, 중복을 끝까지 찾아 마지막 위치를 반환하기가 대표적인 오류입니다.'},
      {heading:'중간 점검·핵심 요약·다음 연결',text:'왜 count가 별도로 필요한지, count가 0일 때 어떤 배열 접근도 하면 안 되는지, 중복 정책과 출력 보존이 테스트 가능한 계약인 이유를 설명해 보세요. 핵심은 [0, count)에서 멤버를 읽고 첫 일치에서만 출력 객체를 기록하는 것입니다. 이후 정렬된 구조체 배열의 이진 탐색, 키 비교 함수, 동적 배열과 인덱스로 확장합니다.'}
    ],
    quiz:{question:'함수 매개변수로 받은 students 배열의 원소 수를 별도 count로 전달해야 하는 이유는?',options:['배열 매개변수는 포인터로 조정되어 함수 안의 sizeof로 전체 원소 수를 얻을 수 없기 때문이다','구조체 배열에는 인덱스를 사용할 수 없기 때문이다','size_t는 구조체와 함께 쓸 수 없기 때문이다','const 배열은 첫 원소만 읽을 수 있기 때문이다'],answer:0,explanation:'배열 매개변수 표기는 함수 형식에서 포인터로 조정됩니다. 유효한 읽기 범위를 알려면 호출자가 원소 수를 별도로 전달해야 합니다.'},
    challenge:{id:'c-struct-array-search',title:'학번으로 첫 학생 위치 찾기',description:'int find_student_index(const struct Student students[], size_t count, int target_id, size_t *out_index)를 구현하세요. 첫 번째로 일치하는 id의 인덱스를 기록하고 1을 반환합니다. 미발견, students == NULL, count == 0, out_index == NULL이면 0을 반환하며 유효한 출력 객체는 그대로 보존합니다. 학생 배열을 변경하거나 main·출력 코드를 작성하지 않습니다.',starter:'#include <stddef.h>\n\nstruct Student {\n    int id;\n    int score;\n};\n\nint find_student_index(const struct Student students[], size_t count, int target_id, size_t *out_index) {\n    // TODO: [0, count)에서 첫 일치만 찾아 성공할 때 기록하세요.\n    (void)students;\n    (void)count;\n    (void)target_id;\n    (void)out_index;\n    return 0;\n}',input:'find_student_index({101, 205, 309}, 3, 205, &out)',expected:'1 1'}
  },
  {
    id:'c-struct-array-sort',track:'c',level:'중급 실습',title:'구조체 배열을 학번순으로 안정 정렬하기',minutes:62,source:'C 구조체 배열·안정 삽입 정렬·비교 계약에 관한 독자 작성 실습',
    summary:'학생 레코드 전체를 이동하는 안정 삽입 정렬을 구현하고 빈 범위와 정수 극값까지 검증합니다.',figure:'struct-array-sort',
    sections:[
      {heading:'단원 개요와 필요한 이유',text:'검색 전에 레코드를 키 순서로 정리하면 출력·그룹화·후속 탐색이 쉬워집니다. 이 단원은 struct Student 배열을 id 오름차순으로 정렬하면서 같은 학번의 원래 순서를 유지하는 안정 정렬과 함수 계약을 연결합니다.'},
      {heading:'선수 지식과 학습 목표',text:'구조체 배열, [0, count) 범위, size_t와 첫 일치 검색을 알고 시작합니다. 학습 후에는 구조체 전체를 한 레코드로 이동하고, 삽입 정렬의 빈 구간 불변식을 설명하며, 동등 키 안정성·빈 범위·잘못된 포인터를 구분할 수 있어야 합니다.'},
      {heading:'정렬 키와 레코드는 분리하지 않는다',text:'id가 비교 기준이어도 score는 같은 학생에 속한 데이터입니다. id만 맞바꾸면 학번과 점수가 서로 다른 학생의 값으로 섞입니다. C의 구조체 대입은 모든 멤버 값을 복사하므로 struct Student 임시 객체로 레코드 전체를 이동합니다.',code:'struct Student key = students[i];\nstudents[j] = students[j - 1];\nstudents[j] = key;'},
      {heading:'안정 정렬은 같은 키의 상대 순서를 보존한다',text:'입력에 205:A, 101:C, 205:B가 있다면 정렬 뒤에도 205:A가 205:B보다 앞서야 합니다. 점수는 실제 정렬 키가 아니지만 A와 B를 구별해 안정성을 관찰하게 해 줍니다. 같은 학번의 순서를 뒤집는 정렬은 오름차순처럼 보여도 이 계약에는 맞지 않습니다.'},
      {heading:'삽입 정렬은 정렬된 앞 구간을 확장한다',text:'반복 시작 시 [0, i)는 이미 정렬되어 있다고 봅니다. students[i]를 key에 복사하고 앞쪽의 더 큰 레코드를 한 칸씩 오른쪽으로 옮긴 뒤 빈 자리에 key를 넣습니다. i가 1부터 시작하므로 한 원소 배열에는 이동이 없습니다.'},
      {heading:'엄격한 비교가 안정성을 만든다',text:'이전 학번이 key보다 클 때만 이동해야 하므로 조건은 students[j - 1].id > key.id입니다. >=를 사용하면 같은 학번도 이동해 새 레코드가 기존 동등 키 앞에 들어가므로 안정성이 깨집니다.'},
      {heading:'비교를 뺄셈으로 바꾸지 않는다',text:'a.id - b.id의 부호로 순서를 판정하면 INT_MIN과 INT_MAX 조합에서 signed int 오버플로가 발생할 수 있습니다. 이는 정의되지 않은 동작입니다. 학번끼리 > 또는 < 관계 연산자로 직접 비교하여 표현 범위 끝값도 안전하게 처리합니다.'},
      {heading:'빈 범위와 NULL 계약의 순서',text:'count == 0이면 읽거나 쓸 원소가 없는 유효한 빈 범위이므로 students가 NULL이어도 1을 반환합니다. count > 0인데 students == NULL이면 접근할 배열이 없으므로 0입니다. 이 계약을 지키려면 count 검사를 NULL 검사보다 먼저 둡니다.'},
      {heading:'완성 함수와 실행 결과',text:'309:95, 101:70, 205:88을 정렬하면 상태 1과 함께 101:70 205:88 309:95가 됩니다. 205:11, 101:22, 205:33, 101:44에서는 같은 id 안의 점수 순서 22→44와 11→33이 보존됩니다.',code:'int stable_sort_students_by_id(struct Student students[], size_t count) {\n    if (count == 0) return 1;\n    if (students == NULL) return 0;\n    for (size_t i = 1; i < count; ++i) {\n        struct Student key = students[i];\n        size_t j = i;\n        while (j > 0 && students[j - 1].id > key.id) {\n            students[j] = students[j - 1];\n            --j;\n        }\n        students[j] = key;\n    }\n    return 1;\n}'},
      {heading:'시간·공간 비용과 선택 이유',text:'역순 배열의 삽입 정렬은 비교와 이동이 O(n²)이고 추가 공간은 구조체 하나뿐이라 O(1)입니다. 이미 정렬된 배열은 각 원소에서 한 번의 비교만 하므로 O(n)입니다. 큰 데이터의 범용 최적 알고리즘이라는 뜻은 아니며, 안정성과 불변식을 직접 연습하는 작은 배열용 선택입니다.'},
      {heading:'흔한 오류와 C 표현 경계',text:'id만 교환하기, 같은 키에 >= 사용하기, j가 0인데 j - 1을 읽기, a.id - b.id로 비교하기, 양수 길이의 NULL을 성공시키기가 흔한 오류입니다. 구조체 대입은 멤버 값을 복사하지만 패딩 바이트를 이식 가능한 파일 형식으로 저장한다는 뜻은 아닙니다.'},
      {heading:'중간 점검·핵심 요약·다음 연결',text:'같은 학번의 점수 순서로 안정성을 어떻게 관찰하는지, 구조체 전체를 이동해야 하는 이유, count == 0 검사를 먼저 하는 이유를 설명해 보세요. 핵심은 정렬된 앞 구간을 유지하며 더 큰 레코드만 오른쪽으로 옮기는 것입니다. 다음에는 이 결과를 전제로 이진 탐색과 정렬 알고리즘 비교로 확장합니다.'}
    ],
    quiz:{question:'삽입 정렬에서 같은 id의 원래 상대 순서를 유지하는 이동 조건은?',options:['이전 id가 key.id보다 클 때만 이동한다','이전 id가 key.id보다 크거나 같으면 이동한다','score가 다르면 항상 이동한다','두 id를 빼서 결과가 0 이상이면 이동한다'],answer:0,explanation:'엄격한 > 비교는 동등한 키를 건너뛰지 않으므로 먼저 있던 레코드가 계속 앞에 남습니다.'},
    challenge:{id:'c-struct-array-sort',title:'학생 배열 안정 정렬하기',description:'int stable_sort_students_by_id(struct Student students[], size_t count)를 구현하세요. id 오름차순으로 정렬하되 같은 id의 원래 상대 순서를 유지하고 레코드 전체를 이동합니다. count == 0은 students가 NULL이어도 성공 1, count > 0인 NULL은 실패 0입니다. 비교 뺄셈·main·출력 코드는 작성하지 않습니다.',starter:'#include <stddef.h>\n\nstruct Student {\n    int id;\n    int score;\n};\n\nint stable_sort_students_by_id(struct Student students[], size_t count) {\n    // TODO: 구조체 전체를 이동하는 안정 삽입 정렬을 구현하세요.\n    (void)students;\n    (void)count;\n    return 0;\n}',input:'stable_sort_students_by_id({309:95, 101:70, 205:88}, 3)',expected:'1 101:70 205:88 309:95'}
  },
  {
    id:'c-struct-array-binary-search',track:'c',level:'중급 실습',title:'정렬된 구조체 배열에서 첫 학번 이진 탐색',minutes:64,source:'C 반열린 구간·하한 이진 탐색·출력 계약에 관한 독자 작성 실습',
    summary:'정렬된 학생 배열의 반열린 후보 구간을 줄여 중복 학번의 첫 위치를 O(log n)에 찾습니다.',figure:'struct-array-binary-search',
    sections:[
      {heading:'단원 개요와 필요한 이유',text:'선형 탐색은 정렬 여부와 관계없이 사용할 수 있지만 원소가 많으면 모두 확인할 수 있습니다. 이 단원은 앞에서 안정 정렬한 struct Student 배열을 전제로 후보 구간을 절반씩 줄이는 이진 탐색과 첫 중복 위치 계약을 연결합니다.'},
      {heading:'선수 지식과 학습 목표',text:'구조체 배열, 첫 일치 선형 탐색, id 안정 정렬과 size_t를 알고 시작합니다. 학습 후에는 정렬 전제, [left, right) 반열린 구간, 안전한 중간점, 하한 탐색과 출력값 보존을 설명하고 구현할 수 있어야 합니다.'},
      {heading:'정렬 전제는 선택이 아니라 정확성 조건이다',text:'이 함수는 students[0].id부터 오름차순으로 정렬되어 있다고 가정합니다. 정렬되지 않은 배열에서는 어느 절반을 버려도 되는지 근거가 없어 결과를 보장할 수 없습니다. 함수가 매 호출마다 정렬 여부를 선형 검사하면 전체 비용이 O(n)이 되므로 호출자가 전제를 지켜야 합니다.'},
      {heading:'후보 구간은 [left, right)다',text:'left는 포함하고 right는 포함하지 않는 후보 구간을 유지합니다. 처음에는 [0, count)입니다. 빈 배열이면 left와 right가 모두 0이어서 반복을 시작하지 않습니다. 이 표현은 right에 count를 둘 수 있고 count - 1의 unsigned 언더플로를 피하게 합니다.'},
      {heading:'중간점은 차이를 먼저 계산한다',text:'중간점은 left + (right - left) / 2로 계산합니다. 불변식 때문에 left <= right이므로 뺄셈이 안전하고, left + right를 먼저 더하는 방식의 표현 범위 초과 위험을 피합니다.',code:'size_t mid = left + (right - left) / 2;'},
      {heading:'작으면 왼쪽 구간을 버린다',text:'students[mid].id < target_id이면 mid와 그 왼쪽은 첫 일치 후보가 될 수 없습니다. 따라서 left = mid + 1로 갱신합니다. mid를 그대로 남기면 구간이 줄지 않아 무한 반복할 수 있습니다.'},
      {heading:'같거나 크면 오른쪽 경계를 당긴다',text:'students[mid].id >= target_id이면 mid가 첫 위치일 수도 있고 더 왼쪽에 같은 값이 있을 수도 있습니다. 따라서 성공으로 즉시 반환하지 않고 right = mid로 좁힙니다. 이 규칙이 중복 중 첫 위치인 lower bound를 찾습니다.'},
      {heading:'수렴 뒤 실제 일치를 검증한다',text:'반복이 끝나면 left == right이고 target_id 이상인 첫 후보 위치입니다. 그러나 target이 아예 없으면 다른 큰 값 또는 count를 가리킬 수 있습니다. left < count와 students[left].id == target_id를 모두 확인한 뒤에만 성공합니다.'},
      {heading:'실패 시 출력값을 보존한다',text:'count == 0, students == NULL, out_index == NULL, 미발견에서는 0을 반환합니다. 유효한 out_index는 성공이 확정될 때만 기록하므로 출력값을 보존합니다. 빈 범위에서는 students가 NULL이어도 어떤 역참조도 하지 않습니다.'},
      {heading:'완성 함수와 실행 결과',text:'101, 205, 205, 309에서 205의 하한은 인덱스 1입니다. 상태와 위치는 1 1입니다. 250을 찾으면 상태 0이고 감시값 77은 그대로 남아 0 77이 됩니다.',code:'int find_first_student_by_id(const struct Student students[], size_t count,\n                             int target_id, size_t *out_index) {\n    if (count == 0 || students == NULL || out_index == NULL) return 0;\n    size_t left = 0;\n    size_t right = count;\n    while (left < right) {\n        size_t mid = left + (right - left) / 2;\n        if (students[mid].id < target_id) left = mid + 1;\n        else right = mid;\n    }\n    if (left < count && students[left].id == target_id) {\n        *out_index = left;\n        return 1;\n    }\n    return 0;\n}'},
      {heading:'복잡도와 검증 경계',text:'후보 수가 반복마다 절반가량 줄어 시간 복잡도는 O(log n), 추가 공간은 O(1)입니다. 자동 채점은 결과·경계·부작용을 검증하지만 임의의 모든 입력에서 복잡도를 수학적으로 증명하지는 않습니다. 풀이에서 구간이 매번 엄격히 줄어드는지 직접 검토해야 합니다.'},
      {heading:'흔한 오류와 다음 연결',text:'일치 즉시 반환해 중복의 중간 위치를 내기, right = count - 1로 바꾸며 빈 배열 언더플로 만들기, mid를 경계에 그대로 남겨 무한 반복하기, 수렴 뒤 동등성 검사를 생략하기, 실패 전에 out_index를 덮기가 흔한 오류입니다. 다음에는 탐색과 정렬의 비용 비교 및 구조체 배열 관리 프로젝트로 확장합니다.'}
    ],
    quiz:{question:'중복된 target_id의 첫 위치를 찾기 위해 students[mid].id == target_id일 때 해야 할 일은?',options:['right = mid로 두어 왼쪽의 같은 값 가능성을 계속 검사한다','즉시 mid를 반환한다','left = mid + 1로 오른쪽만 검사한다','배열을 역순으로 다시 정렬한다'],answer:0,explanation:'같은 값을 찾았어도 더 왼쪽에 중복이 있을 수 있습니다. right를 mid로 당겨 하한 위치로 수렴해야 합니다.'},
    challenge:{id:'c-struct-array-binary-search',title:'첫 학번 위치를 이진 탐색하기',description:'정렬된 배열을 전제로 int find_first_student_by_id(const struct Student students[], size_t count, int target_id, size_t *out_index)를 구현하세요. 중복이면 첫 위치만 기록합니다. 빈 범위·NULL·미발견은 0을 반환하고 유효한 출력값을 보존합니다. 배열 변경·main·출력 코드는 작성하지 않습니다.',starter:'#include <stddef.h>\n\nstruct Student {\n    int id;\n    int score;\n};\n\nint find_first_student_by_id(const struct Student students[], size_t count, int target_id, size_t *out_index) {\n    // TODO: [left, right) 하한 탐색을 구현하세요.\n    (void)students;\n    (void)count;\n    (void)target_id;\n    (void)out_index;\n    return 0;\n}',input:'find_first_student_by_id({101, 205, 205, 309}, 4, 205, &out)',expected:'1 1'}
  },
  {
    id:'c-multi-file',track:'c',level:'중급 실습',title:'분할 컴파일: 헤더와 여러 소스 파일',minutes:35,source:'C 헤더·분할 컴파일·링크 과정에 관한 독자 작성 실습',
    summary:'main.c, functions.c, functions.h의 역할을 나누고 하나의 프로그램으로 컴파일·링크합니다.',figure:'multi-file',
    sections:[
      {heading:'선수 지식과 학습 목표',text:'함수의 선언·정의·호출과 테스트 하네스를 이해한 뒤 진행합니다. 학습을 마치면 헤더에 인터페이스를 선언하고, 소스 파일에 구현을 두며, main에서 헤더를 포함해 함수를 호출할 수 있어야 합니다.'},
      {heading:'헤더는 여러 번 공유할 선언을 모은다',text:'functions.h에는 clamp의 함수 원형을 둡니다. main.c와 functions.c가 같은 선언을 포함하면 호출부와 정의부가 하나의 계약을 공유합니다. include guard는 한 번의 번역 과정에서 같은 헤더가 중복 포함될 때 선언이 반복되는 일을 막습니다.',code:'#ifndef FUNCTIONS_H\n#define FUNCTIONS_H\n\nint clamp(int value, int low, int high);\n\n#endif'},
      {heading:'각 .c 파일은 별도의 번역 단위다',text:'main.c와 functions.c는 각각 전처리와 컴파일을 거칩니다. 한 파일이 다른 .c 파일을 직접 include하는 방식은 피하고, 필요한 선언을 헤더로 공유합니다. 컴파일된 목적 파일은 링크 단계에서 clamp 정의와 호출을 연결합니다.'},
      {heading:'완성 프로그램의 흐름과 출력',text:'main.c가 15 0 10을 읽고 clamp를 호출하면 functions.c의 구현이 10을 반환합니다. main.c가 그 값을 출력하므로 결과는 10입니다. 입력 처리, 함수 계약, 구현 책임이 파일마다 분리됩니다.'},
      {heading:'흔한 오류를 단계별로 찾는다',text:'헤더 파일명이 틀리면 전처리·컴파일 단계에서 파일을 찾지 못합니다. 원형과 정의의 자료형이 다르면 충돌 진단이 생깁니다. functions.c에 정의가 없거나 컴파일 대상에서 빠지면 링크 단계에서 clamp 기호를 찾지 못합니다. 파일명은 대소문자를 포함해 계약과 정확히 일치해야 합니다.'},
      {heading:'핵심 요약과 다음 연결',text:'헤더는 공개 계약, .c 파일은 구현과 사용 위치를 담습니다. 분할 컴파일은 코드 재사용과 독립 검사를 돕지만 파일 간 계약을 자동으로 대신 설계하지는 않습니다. 이 구조는 전처리기, 빌드 시스템, 자료구조 라이브러리와 다중 파일 프로젝트로 이어집니다.'}
    ],
    quiz:{question:'functions.c에 clamp 정의가 없고 main.c에는 호출만 있을 때 가장 가능성 높은 실패 단계는?',options:['링크 단계','키보드 입력 단계','정상 실행 뒤 출력 단계','PWA 설치 단계'],answer:0,explanation:'선언을 보고 main.c는 컴파일될 수 있지만 실제 clamp 정의를 찾지 못하면 링크가 실패합니다.'},
    challenge:{id:'c-multi-file',title:'세 파일로 clamp 프로그램 완성하기',description:'main.c는 입력과 출력을, functions.h는 함수 원형을, functions.c는 clamp 구현을 담당하게 하세요. 필수 파일명은 바꿀 수 없고 .c 파일을 서로 include하지 않습니다.',starter:serializeMultiFileSubmission([
      {name:'main.c',content:'#include <stdio.h>\n#include "functions.h"\n\nint main(void) {\n    int value, low, high;\n    if (scanf("%d%d%d", &value, &low, &high) != 3) return 1;\n    printf("%d\\n", clamp(value, low, high));\n    return 0;\n}'},
      {name:'functions.c',content:'#include "functions.h"\n\nint clamp(int value, int low, int high) {\n    // TODO: 범위에 맞는 값을 반환하세요.\n    return value;\n}'},
      {name:'functions.h',content:'#ifndef FUNCTIONS_H\n#define FUNCTIONS_H\n\nint clamp(int value, int low, int high);\n\n#endif'}
    ],{requiredNames:['main.c','functions.c','functions.h']}),input:'15 0 10',expected:'10'}
  },
  {
    id:'c-struct-student-registry',track:'c',level:'중급 Mini Project',title:'학생 명부: 안정 정렬과 첫 학번 탐색',minutes:90,source:'C 구조체 배열·안정 정렬·하한 이진 탐색·분할 컴파일을 결합한 독자 작성 프로젝트',
    summary:'student.h, student.c, main.c를 나누어 학생 명부를 안정 정렬하고 중복 학번의 첫 레코드를 이진 탐색합니다.',figure:'student-registry-project',
    sections:[
      {heading:'단원 개요와 필요한 이유',text:'지금까지 함수 하나씩 연습한 안정 정렬과 첫 위치 이진 탐색을 실제 프로그램 경계에서 결합합니다. 입력·출력은 main.c, 자료형과 함수 계약은 student.h, 알고리즘 정의는 student.c가 담당합니다. 세 파일이 따로 컴파일된 뒤 링크되어야 명부 프로그램이 완성됩니다.'},
      {heading:'선수 지식과 학습 목표',text:'구조체 배열, stable_sort_students_by_id, find_first_student_by_id, [left, right) 하한 탐색, 헤더와 링크 단원을 마친 뒤 진행합니다. 학습 후에는 선언·정의·호출을 파일별로 배치하고 정렬 전/후 계약, 중복 안정성, 첫 위치, 빈 입력과 링크 실패를 한 흐름에서 설명할 수 있어야 합니다.'},
      {heading:'입력과 출력 계약을 먼저 고정한다',text:'첫 줄은 count target_id이고 이어 count개의 id score 쌍을 읽습니다. count는 0 이상 16 이하입니다. 정상 입력은 정렬된 모든 레코드를 id:score 형식으로 출력하고, 다음 줄에 FOUND index score 또는 NOT FOUND를 출력합니다. 빈 입력 배열은 첫 줄 EMPTY, 둘째 줄 NOT FOUND입니다.'},
      {heading:'student.h는 공유 인터페이스다',text:'student.h에는 struct Student 정의와 두 함수 원형을 둡니다. size_t를 선언하는 <stddef.h>도 헤더가 직접 포함해야 이 헤더만 포함한 번역 단위에서도 계약이 완전합니다. include guard는 한 번의 번역 단위에서 중복 포함을 안전하게 만듭니다.',code:'#ifndef STUDENT_H\n#define STUDENT_H\n#include <stddef.h>\nstruct Student { int id; int score; };\nint stable_sort_students_by_id(struct Student students[], size_t count);\nint find_first_student_by_id(const struct Student students[], size_t count, int target_id, size_t *out_index);\n#endif'},
      {heading:'student.c는 알고리즘 정의를 소유한다',text:'student.c는 student.h를 먼저 포함하고 두 함수를 정의합니다. 정렬은 이전 id가 key.id보다 클 때만 구조체 전체를 이동하여 안정성을 지킵니다. id의 차를 계산하면 signed int 오버플로가 생길 수 있으므로 관계 연산자로 직접 비교합니다.'},
      {heading:'정렬 후에만 이진 탐색한다',text:'main.c가 입력 순서의 배열에 곧바로 이진 탐색을 적용하면 어느 절반을 버릴지 보장할 수 없습니다. stable_sort_students_by_id가 성공한 뒤에만 find_first_student_by_id를 호출합니다. 이 순서가 알고리즘의 정렬 전제를 프로그램 흐름으로 보장합니다.'},
      {heading:'중복은 안정성과 첫 위치를 함께 드러낸다',text:'205:88과 205:91이 이 순서로 입력되었다면 안정 정렬 뒤에도 88점 레코드가 먼저입니다. 하한 이진 탐색은 중복 중 첫 위치를 반환하므로 FOUND 줄의 점수도 88이어야 합니다. 정렬 결과와 탐색 결과를 함께 출력하면 두 계약을 동시에 관찰할 수 있습니다.'},
      {heading:'반열린 구간은 빈 배열도 표현한다',text:'이진 탐색 후보는 [left, right)이고 처음 right는 count입니다. count가 0이면 [0, 0)이라 반복하지 않습니다. mid는 left + (right - left) / 2로 계산하고 같은 id를 만나도 right = mid로 좁혀 첫 위치를 찾습니다.'},
      {heading:'main.c는 입출력과 순서를 조정한다',text:'main.c는 최대 16개 배열을 소유하고 입력 개수와 각 레코드 읽기를 검사합니다. 범위를 벗어나거나 필요한 정수를 읽지 못하면 INVALID를 출력합니다. 정상 입력에서는 정렬, 배열 출력, 검색 결과 출력 순서를 명확히 유지합니다.'},
      {heading:'완성 프로그램의 실행 결과',text:'4 205와 309:95, 205:88, 101:70, 205:91을 입력하면 첫 줄은 101:70 205:88 205:91 309:95입니다. 둘째 줄은 FOUND 1 88입니다. 같은 id의 상대 순서가 보존되고 첫 205의 인덱스와 점수가 선택된 결과입니다.'},
      {heading:'컴파일과 링크 경계를 읽는다',text:'각 .c 파일은 student.h를 통해 동일한 선언을 봅니다. student.c의 정의가 빠지면 main.c는 컴파일될 수 있어도 링크에서 undefined reference가 발생합니다. 헤더 선언과 정의 형식이 다르면 컴파일 진단이 생깁니다. .c 파일을 서로 include하지 않습니다.'},
      {heading:'흔한 오류와 C 경계',text:'id만 이동해 score와 학생을 분리하기, >=로 동등 키를 뒤집기, 정렬 전에 검색하기, 일치 즉시 반환해 중복의 중간 위치를 고르기, count가 0인데 원소를 읽기, id 뺄셈으로 비교하기가 흔한 오류입니다. int의 정확한 비트 수는 C가 고정하지 않으므로 특정 플랫폼의 극값과 언어 최소 보장을 구별합니다.'},
      {heading:'중간 점검·핵심 요약·다음 연결',text:'왜 student.h가 <stddef.h>를 직접 포함해야 하는지, 정렬 출력의 점수 순서가 안정성을 어떻게 증명하는지, FOUND의 index가 첫 위치 정책을 어떻게 드러내는지 설명해 보세요. 핵심은 파일 계약과 알고리즘 전제를 실행 순서로 연결하는 것입니다. 다음에는 데이터 저장, 동적 배열, 비교 함수와 빌드 자동화로 확장합니다.'}
    ],
    quiz:{question:'입력에 같은 id의 학생이 여러 명 있을 때 FOUND가 가리켜야 하는 레코드는?',options:['안정 정렬 뒤 같은 id 중 첫 레코드','같은 id 중 점수가 가장 높은 레코드','이진 탐색이 우연히 처음 만난 레코드','입력 배열의 마지막 레코드'],answer:0,explanation:'안정 정렬은 동등 id의 입력 순서를 보존하고 하한 이진 탐색은 그 그룹의 첫 위치를 선택합니다.'},
    challenge:{id:'c-struct-student-registry',title:'세 파일 학생 명부 완성하기',description:'student.h에 구조체와 두 함수 계약, student.c에 안정 삽입 정렬과 첫 위치 이진 탐색, main.c에 입력·출력 흐름을 완성하세요. 필수 파일명과 출력 형식을 지키고 .c 파일을 서로 include하지 마세요.',starter:serializeMultiFileSubmission([
      {name:'main.c',content:'#include <stdio.h>\n#include "student.h"\n\nenum { MAX_STUDENTS = 16 };\n\nint main(void) {\n    struct Student students[MAX_STUDENTS];\n    int count_input, target_id;\n    if (scanf("%d%d", &count_input, &target_id) != 2 || count_input < 0 || count_input > MAX_STUDENTS) {\n        puts("INVALID");\n        return 0;\n    }\n    size_t count = (size_t)count_input;\n    for (size_t i = 0; i < count; ++i) {\n        if (scanf("%d%d", &students[i].id, &students[i].score) != 2) {\n            puts("INVALID");\n            return 0;\n        }\n    }\n    if (!stable_sort_students_by_id(students, count)) return 1;\n    if (count == 0) puts("EMPTY");\n    else {\n        for (size_t i = 0; i < count; ++i) {\n            if (i > 0) putchar(\' \');\n            printf("%d:%d", students[i].id, students[i].score);\n        }\n        putchar(\'\\n\');\n    }\n    size_t index;\n    if (find_first_student_by_id(students, count, target_id, &index))\n        printf("FOUND %zu %d\\n", index, students[index].score);\n    else puts("NOT FOUND");\n    return 0;\n}'},
      {name:'student.c',content:'#include "student.h"\n\nint stable_sort_students_by_id(struct Student students[], size_t count) {\n    // TODO: 같은 id의 상대 순서를 보존하는 삽입 정렬을 구현하세요.\n    (void)students;\n    (void)count;\n    return 0;\n}\n\nint find_first_student_by_id(const struct Student students[], size_t count,\n                             int target_id, size_t *out_index) {\n    // TODO: [left, right) 하한 탐색으로 첫 위치를 찾으세요.\n    (void)students;\n    (void)count;\n    (void)target_id;\n    (void)out_index;\n    return 0;\n}'},
      {name:'student.h',content:'#ifndef STUDENT_H\n#define STUDENT_H\n\n#include <stddef.h>\n\nstruct Student {\n    int id;\n    int score;\n};\n\nint stable_sort_students_by_id(struct Student students[], size_t count);\nint find_first_student_by_id(const struct Student students[], size_t count,\n                             int target_id, size_t *out_index);\n\n#endif'}
    ],{requiredNames:['main.c','student.c','student.h']}),input:'4 205\n309 95\n205 88\n101 70\n205 91',expected:'101:70 205:88 205:91 309:95\nFOUND 1 88'}
  },
  {
    id:'c-dynamic-student-array',track:'c',level:'중급 실습',title:'동적 메모리: 학생 배열의 생성과 해제',minutes:72,source:'C 동적 메모리·크기 계산·소유권·실패 처리에 관한 독자 작성 실습',
    summary:'배열 크기 오버플로와 할당 실패를 구분하고 malloc으로 만든 학생 배열의 소유권을 free까지 관리합니다.',figure:'dynamic-student-array',
    sections:[
      {heading:'단원 개요와 필요한 이유',text:'컴파일할 때 원소 수를 모르는 학생 명부는 실행 중에 필요한 크기를 결정해야 합니다. 이 단원은 malloc으로 struct Student 배열을 만들고 free로 반납하는 전체 수명과, 성공하지 못했을 때 기존 출력값을 보존하는 함수 계약을 연결합니다.'},
      {heading:'선수 지식과 학습 목표',text:'구조체 배열, size_t, 출력 포인터, 실패 시 출력 보존과 학생 명부 프로젝트를 알고 시작합니다. 학습 후에는 바이트 수를 안전하게 계산하고, 할당 실패·0개 정책·소유권 이동·이중 해제 예방을 설명하며 생성·해제 함수를 구현할 수 있어야 합니다.'},
      {heading:'malloc은 바이트 수를 받고 void 포인터를 돌려준다',text:'count개 Student에 필요한 크기는 count * sizeof *students입니다. C에서는 malloc의 void *가 객체 포인터로 변환되므로 반환값에 불필요한 형 변환을 붙이지 않습니다. 성공한 메모리는 아직 초기화되지 않았으므로 각 원소의 id와 score를 명시적으로 기록합니다.',code:'struct Student *students = malloc(count * sizeof *students);'},
      {heading:'곱셈은 계산하기 전에 오버플로를 검사한다',text:'count * sizeof *students를 먼저 계산한 뒤 결과를 검사하면 이미 size_t에서 나머지 연산처럼 순환한 뒤입니다. sizeof *students가 0이 아니므로 count > SIZE_MAX / sizeof *students를 먼저 검사해야 합니다. 이 경계는 할당 함수 호출 전 적용합니다.',code:'if (count > SIZE_MAX / sizeof *students) return 0;'},
      {heading:'0개 배열 정책을 명시한다',text:'이 계약에서 0개 생성은 성공이며 *out_students를 NULL로 설정하고 malloc을 호출하지 않습니다. malloc(0)은 구현이 선택할 수 있는 결과에 의존하지 않도록 피합니다. 따라서 호출자는 0개와 할당 실패를 반환 상태로 구분할 수 있습니다.'},
      {heading:'출력 이중 포인터가 소유권을 전달한다',text:'생성 함수의 지역 포인터는 반환과 함께 사라지므로 struct Student **out_students를 통해 호출자 포인터를 갱신합니다. 성공 전에는 *out_students를 바꾸지 않습니다. 정상 생성이 끝난 순간 새 블록의 소유권이 호출자에게 넘어갑니다.'},
      {heading:'할당 실패는 정상적인 실패 경로다',text:'count가 양수여도 malloc은 NULL을 반환할 수 있습니다. 이때 배열 원소를 쓰지 않고 0을 반환하며 유효한 출력 포인터의 기존 값을 보존합니다. 자동 채점은 실제 시스템 메모리 고갈을 기다리지 않고 링커 래퍼로 할당 실패를 결정적으로 주입합니다.'},
      {heading:'초기화가 끝난 뒤에만 결과를 공개한다',text:'임시 포인터에 할당하고 모든 원소를 id 0과 initial_score로 초기화한 뒤 *out_students에 대입합니다. 점수가 0부터 100 범위인지도 할당 전에 검사합니다. 검증과 초기화를 마치기 전에는 호출자가 새 블록을 소유한다고 표시하지 않습니다.'},
      {heading:'free 뒤 포인터를 NULL로 바꾼다',text:'free는 블록의 수명을 끝내며 그 주소를 다시 역참조하면 정의되지 않은 동작입니다. destroy_students는 포인터 객체의 주소를 받아 free(*students) 후 *students = NULL로 만듭니다. free(NULL)은 안전하지만 students 자체가 NULL인 경우 역참조하지 않습니다.',code:'if (students != NULL) {\n    free(*students);\n    *students = NULL;\n}'},
      {heading:'해제 함수가 이중 해제 위험을 줄인다',text:'같은 유효 포인터를 두 번 free하면 정의되지 않은 동작입니다. 첫 해제 후 호출자 포인터를 NULL로 바꾸면 destroy_students를 다시 호출해도 free(NULL)이 되어 실제 블록은 한 번만 반납됩니다. 복사해 둔 별칭 포인터까지 자동으로 NULL이 되는 것은 아니므로 소유자를 하나로 정해야 합니다.'},
      {heading:'완성 함수와 실행 결과',text:'3개, 초기 점수 70으로 생성하면 상태 1과 원소 세 개가 만들어집니다. 각 id는 0, score는 70입니다. destroy_students 호출 뒤 포인터는 NULL입니다. 0개 생성은 할당 없이 상태 1과 NULL을 내고, 잘못된 점수·크기 오버플로·할당 실패는 상태 0과 기존 출력을 보존합니다.',code:'int create_students(size_t count, int initial_score, struct Student **out_students) {\n    if (out_students == NULL || initial_score < 0 || initial_score > 100) return 0;\n    if (count == 0) { *out_students = NULL; return 1; }\n    if (count > SIZE_MAX / sizeof(struct Student)) return 0;\n    struct Student *students = malloc(count * sizeof *students);\n    if (students == NULL) return 0;\n    for (size_t i = 0; i < count; ++i) {\n        students[i].id = 0;\n        students[i].score = initial_score;\n    }\n    *out_students = students;\n    return 1;\n}'},
      {heading:'흔한 오류와 검증 경계',text:'오버플로 검사 전에 곱하기, count바이트만 할당하기, malloc 실패 뒤 원소 쓰기, 실패 전에 출력 포인터 덮기, 0개에서 malloc(0) 결과에 의존하기, free 뒤 댕글링 포인터를 남기기, 같은 블록을 두 번 해제하기가 흔한 오류입니다. 링커 래퍼는 로컬 GCC 채점용 실패 주입 장치이며 공개 실행 격리는 아닙니다.'},
      {heading:'중간 점검·핵심 요약·다음 연결',text:'왜 SIZE_MAX 나눗셈을 곱셈보다 먼저 해야 하는지, 임시 포인터가 필요한 이유, 소유권이 어느 시점에 호출자로 이동하는지, 0개와 실패가 어떻게 다른지 설명해 보세요. 핵심은 크기 검증 → 할당 → 초기화 → 소유권 전달 → 정확히 한 번 해제입니다. 다음에는 realloc을 이용한 용량 증가와 부분 실패 정리로 확장합니다.'}
    ],
    quiz:{question:'count개 구조체의 바이트 수를 계산하기 전에 검사해야 하는 조건은?',options:['count > SIZE_MAX / sizeof(struct Student)','count * sizeof(struct Student) > SIZE_MAX를 계산한 뒤 검사','malloc(0)이 항상 NULL인지 검사','free를 먼저 호출했는지 검사'],answer:0,explanation:'size_t 곱셈 자체가 오버플로되기 전에 나눗셈으로 count의 안전한 상한을 확인해야 합니다.'},
    challenge:{id:'c-dynamic-student-array',title:'학생 동적 배열 생성·해제 함수 구현',description:'create_students는 점수 0~100과 바이트 크기를 검사하고 count개 Student를 malloc으로 할당해 id 0, score initial_score로 초기화합니다. 0개는 malloc 없이 성공하고 NULL을 기록합니다. 실패 시 출력값을 보존하세요. destroy_students는 NULL에 안전하며 free 뒤 호출자 포인터를 NULL로 만듭니다. main과 출력 코드는 작성하지 않습니다.',starter:'#include <stddef.h>\n#include <stdint.h>\n#include <stdlib.h>\n\nstruct Student {\n    int id;\n    int score;\n};\n\nint create_students(size_t count, int initial_score, struct Student **out_students) {\n    // TODO: 검증 → 크기 오버플로 검사 → 할당 → 초기화 → 소유권 전달\n    (void)count;\n    (void)initial_score;\n    (void)out_students;\n    return 0;\n}\n\nvoid destroy_students(struct Student **students) {\n    // TODO: NULL에 안전하게 해제하고 호출자 포인터를 NULL로 만드세요.\n    (void)students;\n}',input:'create_students(3, 70, &students)',expected:'1 · 3개 원소 초기화'}
  },
  {
    id:'c-realloc-student-capacity',track:'c',level:'중급 실습',title:'realloc로 학생 배열 용량 늘리기',minutes:78,source:'C 동적 배열·용량 계약·재할당 실패 처리에 관한 독자 작성 실습',
    summary:'길이와 용량을 분리하고 realloc 실패에도 포인터·용량·기존 원소를 보존하면서 학생 배열을 확장합니다.',figure:'realloc-student-capacity',
    sections:[
      {heading:'단원 개요와 필요한 이유',text:'학생 명부에 원소를 계속 추가하려면 현재 길이와 확보한 용량을 분리해야 합니다. 이 단원은 기존 동적 배열을 더 큰 블록으로 옮길 수 있는 realloc을 사용하되, 실패했을 때 유효한 배열을 잃지 않는 reserve_students 계약을 설계합니다.'},
      {heading:'선수 지식과 학습 목표',text:'malloc과 free, 구조체 배열, size_t 곱셈 오버플로, 이중 포인터와 실패 시 출력 보존을 알고 시작합니다. 학습 후에는 length <= capacity 불변식, 정규 빈 상태, 성장 전용 정책, 임시 포인터, 새 슬롯 초기화와 소유권을 설명하고 구현할 수 있어야 합니다.'},
      {heading:'길이와 용량은 서로 다른 상태다',text:'length는 현재 의미 있는 Student 원소 수이고 capacity는 재할당 없이 저장할 수 있는 전체 슬롯 수입니다. 항상 length <= *capacity여야 하며, *capacity가 0이면 *students도 NULL인 정규 빈 상태로 둡니다. 양수 용량과 NULL 포인터 또는 0 용량과 비NULL 포인터는 이 과제에서 잘못된 상태입니다.'},
      {heading:'reserve는 성장만 맡는다',text:'새 용량이 현재 용량보다 작으면 축소하지 않고 실패 0을 반환합니다. 같은 용량이면 아무것도 옮길 필요가 없으므로 realloc을 호출하지 않고 성공 1을 반환합니다. 축소와 원소 파괴 정책을 별도 함수로 미뤄 소유권 계약을 단순하게 유지합니다.'},
      {heading:'realloc은 같은 주소를 보장하지 않는다',text:'realloc이 성공하면 기존 바이트는 새 블록의 앞부분에 보존되지만 반환 주소는 달라질 수 있습니다. 성공한 순간 이전 포인터 값은 더 이상 사용할 수 없으므로 반환값을 기준으로만 새 배열을 다룹니다. 주소가 우연히 같았다는 한 번의 실행 결과를 언어 보장으로 해석하지 않습니다.'},
      {heading:'실패에 대비해 임시 포인터를 쓴다',text:'realloc이 실패하면 NULL을 반환하고 기존 블록은 여전히 유효합니다. 반환값을 곧바로 *students에 대입하면 기존 주소를 잃어 누수가 생깁니다. 먼저 grown에 받고 NULL을 검사한 뒤에만 *students와 *capacity를 갱신합니다.',code:'struct Student *grown = realloc(*students, new_capacity * sizeof *grown);\nif (grown == NULL) return 0;'},
      {heading:'바이트 수는 호출 전에 검증한다',text:'new_capacity * sizeof(struct Student)는 size_t에서 오버플로될 수 있습니다. 곱셈을 하기 전에 new_capacity > SIZE_MAX / sizeof **students를 검사합니다. 실패 경로에서는 realloc을 호출하지 않고 포인터와 용량을 그대로 둡니다.'},
      {heading:'빈 배열의 첫 확장도 같은 계약을 쓴다',text:'정규 빈 상태에서는 *students가 NULL이고 *capacity가 0입니다. realloc(NULL, 양수 바이트)는 malloc과 같은 할당 동작을 하므로 첫 확장에도 같은 코드를 사용할 수 있습니다. 다만 0에서 0으로의 요청은 realloc(NULL, 0)에 의존하지 않고 즉시 성공합니다.'},
      {heading:'새 슬롯은 성공 뒤 명시적으로 초기화한다',text:'realloc은 늘어난 뒷부분을 0으로 채우지 않습니다. 성공한 grown에서 이전 capacity부터 new_capacity 직전까지 id와 score를 0으로 기록합니다. 기존 원소뿐 아니라 사용 전 새 슬롯의 상태도 결정적으로 만들어 다음 추가 연산의 전제를 분명히 합니다.'},
      {heading:'상태 공개 순서를 고정한다',text:'검증, 오버플로 검사, realloc, 새 슬롯 초기화가 모두 끝난 뒤 *students = grown과 *capacity = new_capacity를 기록합니다. length는 값으로 전달되어 바뀌지 않습니다. 실패하면 호출자가 보던 포인터·길이·용량·기존 원소가 모두 그대로입니다.'},
      {heading:'완성 함수와 실행 결과',text:'용량 2에 두 학생이 든 배열을 용량 4로 늘리면 상태 1, 용량 4가 되고 앞의 두 레코드는 보존됩니다. 새 두 슬롯은 {0, 0}입니다. 같은 용량과 빈 0→0 요청은 재할당 없이 성공하고, 축소·불변식 위반·오버플로·할당 실패는 상태 0과 기존 상태 보존으로 끝납니다.',code:'int reserve_students(struct Student **students, size_t length, size_t *capacity, size_t new_capacity) {\n    if (students == NULL || capacity == NULL) return 0;\n    if (length > *capacity) return 0;\n    if ((*capacity == 0) != (*students == NULL)) return 0;\n    if (new_capacity < *capacity || new_capacity < length) return 0;\n    if (new_capacity == *capacity) return 1;\n    if (new_capacity > SIZE_MAX / sizeof **students) return 0;\n    size_t old_capacity = *capacity;\n    struct Student *grown = realloc(*students, new_capacity * sizeof *grown);\n    if (grown == NULL) return 0;\n    for (size_t i = old_capacity; i < new_capacity; ++i) grown[i] = (struct Student){0, 0};\n    *students = grown;\n    *capacity = new_capacity;\n    return 1;\n}'},
      {heading:'흔한 오류와 C 경계',text:'realloc 반환값을 소유 포인터에 직접 대입하기, 용량을 성공 전에 갱신하기, 곱셈 뒤 오버플로를 검사하기, 늘어난 슬롯을 초기화되었다고 가정하기, 이동 가능성을 무시하고 이전 별칭을 사용하기, reserve에서 암묵적으로 축소하기가 흔한 오류입니다. 실패 시 기존 블록 보존은 realloc의 계약이지만 성공 시 주소 유지 여부는 구현과 실행 상황에 달려 있습니다.'},
      {heading:'중간 점검·핵심 요약·다음 연결',text:'왜 임시 포인터가 필요한지, length와 capacity 중 어떤 값부터 검사하는지, 0→0과 0→양수 경로가 어떻게 다른지 설명해 보세요. 핵심은 성공 전까지 공개 상태를 바꾸지 않는 것입니다. 다음에는 기하급수적 용량 성장 정책과 push 연산을 조립해 불필요한 재할당을 줄입니다.'}
    ],
    quiz:{question:'realloc 실패 때 기존 배열을 보존하는 올바른 순서는?',options:['임시 포인터에 결과를 받고 성공 뒤 소유 포인터와 용량을 갱신한다','소유 포인터에 즉시 대입한 뒤 NULL이면 되돌린다','용량부터 갱신하고 realloc을 호출한다','새 슬롯을 먼저 쓰고 realloc을 호출한다'],answer:0,explanation:'realloc 실패는 기존 블록을 유지하므로 반환값을 임시 포인터로 검사해야 기존 주소와 공개 상태를 잃지 않습니다.'},
    challenge:{id:'c-realloc-student-capacity',title:'학생 배열의 용량을 안전하게 확장하기',description:'reserve_students는 정규 상태와 length <= capacity를 검사하고 성장 또는 같은 용량만 허용합니다. 곱셈 오버플로를 realloc 전에 거부하고, 임시 포인터로 실패를 처리하며, 새 슬롯을 id 0·score 0으로 초기화한 뒤에만 포인터와 용량을 공개하세요. 실패 시 포인터·길이·용량·기존 원소를 보존하고 main과 출력 코드는 작성하지 않습니다.',starter:'#include <stddef.h>\n#include <stdint.h>\n#include <stdlib.h>\n\nstruct Student {\n    int id;\n    int score;\n};\n\nint reserve_students(struct Student **students, size_t length,\n                     size_t *capacity, size_t new_capacity) {\n    // TODO: 상태 검증 → 성장 정책 → 크기 검사 → 임시 포인터 → 새 슬롯 초기화 → 상태 공개\n    (void)students;\n    (void)length;\n    (void)capacity;\n    (void)new_capacity;\n    return 0;\n}',input:'reserve_students(&students, 2, &capacity, 4)',expected:'1 · 용량 4 · 기존 2개 보존 · 새 2개 0 초기화'}
  },
  {
    id:'c-student-vector-push',track:'c',level:'중급 실습',title:'동적 배열: 학생 한 명 안전하게 추가하기',minutes:82,source:'C 동적 배열·기하급수 성장·함수 합성·실패 원자성에 관한 독자 작성 실습',
    summary:'빈 슬롯은 바로 사용하고, 가득 찼을 때만 reserve_students로 용량을 늘린 뒤 학생과 길이를 공개합니다.',figure:'student-vector-push',
    sections:[
      {heading:'단원 개요와 필요한 이유',text:'reserve_students로 저장 공간을 늘릴 수 있어도 호출자가 매번 용량을 계산하면 추가 연산의 규칙이 여러 곳에 흩어집니다. push_student는 학생 한 명 추가라는 의도를 하나의 계약으로 묶고, 용량 부족·오버플로·할당 실패를 기존 배열 손상 없이 처리합니다.'},
      {heading:'선수 지식과 학습 목표',text:'동적 학생 배열 생성·해제, length와 capacity 불변식, reserve_students의 성장·실패 보존 계약을 알고 시작합니다. 학습 후에는 빈 슬롯 빠른 경로, 0 → 4 초기 용량, capacity 두 배 성장, SIZE_MAX 오버플로 검사와 성공한 뒤 상태 공개를 설명하고 구현할 수 있어야 합니다.'},
      {heading:'push도 같은 상태 불변식에서 시작한다',text:'students, length, capacity 포인터는 모두 유효해야 하고 *length <= *capacity여야 합니다. *capacity가 0인 것과 *students가 NULL인 것은 서로 같아야 합니다. 잘못된 상태는 원소를 읽거나 쓰기 전에 실패 0으로 거부합니다.'},
      {heading:'빈 슬롯이 있으면 재할당하지 않는다',text:'*length < *capacity라면 이미 소유한 배열의 인덱스 *length가 다음 빈 슬롯입니다. 그 위치에 value를 복사한 뒤 길이를 1 늘리고 성공 1을 반환합니다. 이 경로에서는 reserve_students를 부르지 않아 주소 이동과 불필요한 할당을 피합니다.',code:'(*students)[*length] = value;\n(*length)++;'},
      {heading:'가득 찬 경우에만 새 용량을 계산한다',text:'*length == *capacity이면 빈 슬롯이 없습니다. 현재 용량이 0이면 첫 용량을 4로 정하고, 그 뒤에는 현재 capacity의 두 배를 요청합니다. 0 → 4와 이후 capacity × 2라는 정책은 함수 계약의 일부이므로 호출마다 임의의 증가 폭을 섞지 않습니다.'},
      {heading:'두 배 계산도 먼저 오버플로를 검사한다',text:'size_t는 부호 없는 형이므로 *capacity * 2가 범위를 넘으면 작은 값으로 순환합니다. 현재 용량이 0이 아닌 경우 *capacity > SIZE_MAX / 2를 먼저 검사한 뒤에만 두 배를 계산합니다. 바이트 크기 오버플로는 검증된 reserve_students가 다시 검사합니다.',code:'if (*capacity > SIZE_MAX / 2) return 0;\nsize_t new_capacity = *capacity * 2;'},
      {heading:'검증된 reserve_students를 재사용한다',text:'push_student는 realloc을 직접 호출하거나 새 슬롯 초기화 규칙을 복제하지 않습니다. reserve_students(students, *length, capacity, new_capacity)를 호출하여 저장 공간과 소유권 변경을 맡깁니다. 0을 받으면 새 학생이나 길이를 쓰지 않고 그대로 실패합니다.'},
      {heading:'성공한 뒤에만 레코드와 길이를 공개한다',text:'reserve_students가 성공하면 새 capacity와 배열 포인터가 유효하고 인덱스 *length는 쓸 수 있는 슬롯입니다. value 전체를 복사한 다음에만 (*length)++를 수행합니다. 따라서 실패 경로에서는 포인터·길이·용량·기존 레코드가 바뀌지 않습니다.'},
      {heading:'기하급수 성장은 재할당 횟수를 줄인다',text:'용량을 1씩 늘리면 n개를 추가하는 동안 거의 매번 재할당하고 기존 원소를 반복해서 옮길 수 있습니다. 4, 8, 16처럼 두 배로 늘리면 확장 횟수는 로그 수준으로 줄고, 여러 push에 걸친 원소 이동의 평균 비용은 상수 시간으로 설명할 수 있습니다. 한 번의 확장은 여전히 현재 길이에 비례할 수 있습니다.'},
      {heading:'완성 함수와 실행 결과',text:'길이 2·용량 2인 배열에 309:95를 추가하면 reserve_students가 용량 4를 요청합니다. 성공 뒤 세 번째 슬롯에 레코드를 쓰고 길이를 3으로 공개합니다. 빈 배열의 첫 push는 용량 4를 만들고, 여유 슬롯이 있으면 용량과 주소를 바꾸지 않습니다.',code:'int push_student(struct Student **students, size_t *length,\n                 size_t *capacity, struct Student value) {\n    if (students == NULL || length == NULL || capacity == NULL) return 0;\n    if (*length > *capacity) return 0;\n    if ((*capacity == 0) != (*students == NULL)) return 0;\n    if (*length == *capacity) {\n        size_t new_capacity;\n        if (*capacity == 0) new_capacity = 4;\n        else {\n            if (*capacity > SIZE_MAX / 2) return 0;\n            new_capacity = *capacity * 2;\n        }\n        if (!reserve_students(students, *length, capacity, new_capacity)) return 0;\n    }\n    (*students)[*length] = value;\n    (*length)++;\n    return 1;\n}'},
      {heading:'흔한 오류와 C 경계',text:'가득 찼는데 먼저 원소를 써 범위를 벗어나기, length를 성공 전에 증가시키기, capacity + 1로 매번 확장하기, 두 배 계산 뒤 오버플로를 검사하기, reserve 실패를 무시하기, realloc 코드를 push에 복제하기가 흔한 오류입니다. 유효 포인터가 실제 capacity개 객체를 가리키는지는 호출자 전제이며 이 로컬 하네스는 메모리 안전 탐지기나 공개 실행 격리가 아닙니다.'},
      {heading:'중간 점검·핵심 요약·다음 연결',text:'왜 여유 슬롯 경로에서 reserve_students를 호출하지 않는지, 0 용량의 첫 값을 4로 고정한 이유, 어떤 검사 뒤에만 capacity × 2를 계산하는지, 실패 때 length가 유지되어야 하는 이유를 설명해 보세요. 핵심은 상태 검증 → 필요할 때만 성장 → 성공 뒤 레코드 기록 → 마지막에 길이 공개입니다. 다음에는 pop·remove와 축소 정책을 분리하고 동적 배열을 스택 구현에 연결합니다.'}
    ],
    quiz:{question:'가득 찬 동적 배열에 학생을 추가할 때 올바른 상태 공개 순서는?',options:['두 배 계산의 오버플로 확인 → reserve 성공 확인 → 레코드 기록 → 길이 증가','길이 증가 → 레코드 기록 → reserve 호출','레코드 기록 → reserve 호출 → 길이 증가','capacity를 먼저 두 배로 기록하고 실패하면 되돌리기'],answer:0,explanation:'확장 성공 전에는 쓰기 가능한 새 슬롯이 없으므로 reserve 성공 뒤에 레코드를 쓰고 길이를 마지막에 증가시켜야 합니다.'},
    challenge:{id:'c-student-vector-push',title:'기하급수 성장으로 학생 한 명 추가하기',description:'push_student는 정규 상태를 검사하고 빈 슬롯이 있으면 재할당 없이 value를 추가합니다. 가득 찼으면 0→4, 이후 두 배 용량을 계산하되 SIZE_MAX 오버플로를 먼저 거부하고 reserve_students를 호출하세요. reserve 실패 시 모든 상태를 보존하고, 성공 뒤에만 새 레코드와 length를 공개합니다. reserve_students와 main은 작성하지 않습니다.',starter:'#include <stddef.h>\n#include <stdint.h>\n\nstruct Student {\n    int id;\n    int score;\n};\n\nint reserve_students(struct Student **students, size_t length,\n                     size_t *capacity, size_t new_capacity);\n\nint push_student(struct Student **students, size_t *length,\n                 size_t *capacity, struct Student value) {\n    // TODO: 상태 검증 → 필요하면 0→4/두 배 성장 → reserve 재사용 → 레코드와 길이 공개\n    (void)students;\n    (void)length;\n    (void)capacity;\n    (void)value;\n    return 0;\n}',input:'push_student(&students, &length, &capacity, (struct Student){309, 95})',expected:'1 · 길이 3 · 용량 4 · 새 학생 309:95'}
  },
  {
    id:'rust-mut',track:'rust',level:'시작하기',title:'변수 바인딩과 가변성',minutes:20,source:'기초 Rust 개념 독자 작성 초안 (Rust 교재 미제공)',
    summary:'C의 변수와 비교하여 Rust에서 let과 mut가 어떻게 다른지 배웁니다.',figure:'variables',
    sections:[
      {heading:'Rust 변수는 기본적으로 재대입이 허용되지 않는다',text:'Rust에서 let으로 선언한 변수는 기본적으로 재대입할 수 없습니다. 값을 변경할 계획이라면 mut를 명시합니다. 컴파일러는 프로그램 실행 전 변경 규칙을 검사해 일부 실수를 조기에 발견하도록 돕습니다.',code:'let x = 3;\nlet mut count = 1;\ncount += 1;'},
      {heading:'C의 변수와 비교해 보기',text:'C에서는 일반 변수에 새 값을 대입할 수 있지만, Rust는 불변을 기본으로 사용합니다. 이런 차이를 문법 암기가 아니라 프로그램이 의도치 않게 상태를 바꾸는 것을 막는다는 관점에서 이해해 보세요.'}
    ],
    quiz:{question:'Rust에서 값을 재대입할 수 있는 변수를 선언하는 키워드는?',options:['let mut','var','dynamic','constant'],answer:0,explanation:'let mut count = 0; 처럼 선언합니다.'},
    challenge:{id:'rust-mut',title:'가변 변수 연습',description:'가변 변수 n을 사용해 3에서 4로 바꾸어 출력하는 코드를 작성해 보세요. Rust 자동 채점 연결은 다음 단계에 구현합니다.',starter:'fn main() {\n    let mut n = 3;\n    // TODO\n    println!("{}", n);\n}',input:'입력 없음',expected:'4'}
  },
  {
    id:'ds-stack',track:'ds',level:'기초',title:'스택: 나중에 넣은 것이 먼저 나온다',minutes:23,source:'자료구조 교육 콘텐츠 독자 작성 초안 (전용 교재 미제공)',
    summary:'스택의 push·pop을 이해하고 호출 스택과의 관계를 살펴봅니다.',figure:'stack',
    sections:[
      {heading:'LIFO(후입선출) 규칙',text:'스택은 마지막에 넣은 원소를 가장 먼저 꺼내는 자료구조입니다. push는 맨 위에 추가하고 pop은 맨 위에서 제거합니다. 호출 스택이나 실행 취소 기능을 이해할 때 유용한 추상화입니다.'},
      {heading:'배열로 스택을 구현할 수 있다',text:'고정 크기 배열과 맨 위 원소의 위치를 기록하는 top 변수를 사용하면 기본적인 스택을 만들 수 있습니다. 비어 있는 스택에서 pop하거나 가득 찬 스택에서 push하지 않도록 검사해야 합니다.'}
    ],
    quiz:{question:'빈 스택에 push(2), push(5), push(7)을 수행하면 첫 pop의 결과는?',options:['2','5','7','알 수 없다'],answer:2,explanation:'마지막으로 추가한 7이 가장 먼저 제거됩니다.'},
    challenge:{id:'ds-stack',title:'스택 직접 구현 계획',description:'push와 pop의 동작을 C 함수로 설계하고 코드를 저장하세요. 자동 채점 과제는 후속 단계에서 추가합니다.',starter:'// TODO: 배열과 top 변수로 스택을 설계하세요.\n',input:'—',expected:'—'}
  },
  {
    id:'algo-binary',track:'algo',level:'기초',title:'이진 탐색과 정렬 전제',minutes:26,source:'알고리즘 교육 콘텐츠 독자 작성 초안 (전용 교재 미제공)',
    summary:'정렬된 배열에서 탐색 범위를 절반으로 줄이는 이유를 설명합니다.',figure:'array',
    sections:[
      {heading:'이진 탐색은 정렬된 자료가 필요하다',text:'탐색 범위의 가운데 원소를 목표값과 비교해 남겨둘 절반을 결정합니다. 값이 정렬되어 있지 않다면 한쪽 절반을 안전하게 버릴 수 없으므로 이 알고리즘의 전제가 무너집니다.'},
      {heading:'비교할 때마다 후보 범위가 줄어든다',text:'범위가 절반씩 줄어들기 때문에 비교 횟수는 입력 크기의 로그에 비례합니다. 시간복잡도는 O(log n)이며, 선형 탐색 O(n)과 비교하면 정렬된 큰 배열에서 이점이 있습니다.'}
    ],
    quiz:{question:'기본 이진 탐색을 적용하기 위한 가장 중요한 배열 조건은?',options:['길이가 짝수여야 한다','중복 값이 없어야 한다','정렬되어 있어야 한다','양수만 있어야 한다'],answer:2,explanation:'정렬되어 있어야 중간값과 비교해 탐색 범위의 절반을 제외할 수 있습니다.'},
    challenge:{id:'algo-binary',title:'이진 탐색 함수 설계',description:'정렬된 배열을 대상으로 이진 탐색 함수를 직접 구현해 보세요. 자동 채점 과제는 후속 단계에서 추가합니다.',starter:'// TODO: 이진 탐색 함수 설계\n',input:'—',expected:'—'}
  }
];
