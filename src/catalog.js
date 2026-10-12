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
    id:'c-hello',track:'c',level:'기초',title:'첫 C 프로그램의 구조',minutes:18,source:'쉽게 풀어쓴 C언어 Express 2~3장, The C Programming Language 1.1 (주제 참조)',
    summary:'C 코드가 어디에서 시작하고 무엇을 출력하는지 읽을 수 있게 됩니다.',figure:'pipeline',
    sections:[
      {heading:'프로그램은 명령을 정확한 순서로 실행한다',text:'C 프로그램은 정해진 문법으로 작성한 소스 코드를 컴파일하여 실행하는 방식으로 사용합니다. 컴파일러는 소스 코드의 형식과 자료형 등을 검사하고 기계가 실행할 프로그램을 만드는 과정에 참여합니다. 빌드 과정은 도구에 따라 컴파일과 링크 단계로 나뉩니다.'},
      {heading:'헤더, main, 명령문',text:'#include <stdio.h>는 표준 입출력 함수의 선언을 사용하기 위한 전처리 지시문입니다. int main(void)는 프로그램의 진입 함수이며, 중괄호 안에 명령문을 배치합니다. printf는 문자열을 출력하고 return 0;은 프로그램이 정상적으로 마쳤음을 나타냅니다.',code:'#include <stdio.h>\n\nint main(void) {\n    printf("Hello, CodeWeave!\\n");\n    return 0;\n}'},
      {heading:'작은 실수도 컴파일에 영향을 준다',text:'세미콜론(;), 중괄호({ }), 큰따옴표(")는 서로 역할이 다릅니다. 오류가 생기면 먼저 컴파일러 메시지가 가리키는 위치와 그 바로 앞 문장을 확인해 보세요. 컴파일 오류와 실행 결과가 기대와 다른 논리 오류는 구분해서 해결해야 합니다.'}
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
      {heading:'입력을 받으면 변환된 값을 저장한다',text:'scanf("%d", &a)는 입력된 정수를 a에 저장하도록 요청합니다. 이때 &a는 a의 주소를 나타냅니다. 실제 프로그램에서는 scanf의 반환값을 검사하여 올바르게 입력받았는지 확인하는 습관이 중요합니다.'}
    ],
    quiz:{question:'C에서 int a = 7, b = 2; 일 때 a / b의 값은?',options:['3.5','3','4','컴파일 오류'],answer:1,explanation:'정수끼리 / 연산을 하면 정수 나눗셈 결과가 만들어집니다.'},
    challenge:{id:'c-types',title:'두 정수의 합',description:'표준 입력에서 정수 두 개를 받아 그 합을 숫자 하나로 출력하세요. 예: 4 7 → 11. 여러 입력을 검사합니다.',starter:'#include <stdio.h>\n\nint main(void) {\n    int a, b;\n    // TODO: 정수 두 개를 읽고 합을 출력하세요.\n    return 0;\n}',input:'4 7',expected:'11'}
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
      {heading:'함수에서 호출자의 값을 바꿀 수 있다',text:'함수 인수로 주소를 전달하면 함수 안에서 호출자 객체의 값을 수정할 수 있습니다. 다만 잘못된 주소, 초기화하지 않은 포인터, 수명이 끝난 객체에 접근하는 것은 위험합니다.',code:'void add_one(int *value) {\n    ++(*value);\n}' }
    ],
    quiz:{question:'int x = 7; int *p = &x; *p = 8; 이후 x의 값은?',options:['7','8','주소값','정의되지 않음'],answer:1,explanation:'p는 x를 가리키고, *p = 8은 x에 8을 대입합니다.'},
    challenge:{id:'c-pointer',title:'포인터로 값 증가시키기',description:'정수 n을 입력받아 함수를 통해 포인터로 그 값을 1 증가시킨 뒤 출력하세요.',starter:'#include <stdio.h>\n\nvoid add_one(int *value) {\n    // TODO: 포인터로 가리키는 값을 1 증가시키세요.\n}\n\nint main(void) {\n    int n;\n    if (scanf("%d", &n) != 1) return 1;\n    add_one(&n);\n    printf("%d\\n", n);\n    return 0;\n}',input:'7',expected:'8'}
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
