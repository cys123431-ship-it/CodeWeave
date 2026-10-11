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
