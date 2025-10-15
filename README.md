# Stock Rater - 주식 평가 계산기

Electron 기반 데스크톱 애플리케이션으로, 주식 및 ETF의 다양한 재무 지표를 평가하고 AI 분석을 제공합니다.

## 주요 기능

- 기본 재무 정보 입력 (시가총액, 배당수익률, AUM, NAV, 괴리율, 운용보수)
- 밸류에이션 지표 평가 (PBR, PER, ROE, PSR)
- 지표별 설명 팝업 제공
- 로컬 스코어 계산 알고리즘
- AI 기반 투자 분석 (OpenAI, Anthropic Claude, Google Gemini 지원)
- 평가 결과 팝업 표시

## 기술 스택

- Electron
- JavaScript (ES6+)
- HTML5 / CSS3
- AI APIs (OpenAI, Anthropic, Google Gemini)

## 설치 방법

### 1. 저장소 클론

```bash
git clone https://github.com/ChoiHyunKong/stock_rate.git
cd stock_rate
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 환경변수 설정

`.env.example` 파일을 `.env`로 복사하고 API 키를 입력합니다:

```bash
cp .env.example .env
```

`.env` 파일을 열어서 사용할 AI 제공업체의 API 키를 설정합니다:

```env
# OpenAI API Key
OPENAI_API_KEY=your-openai-api-key-here

# Anthropic (Claude) API Key
ANTHROPIC_API_KEY=your-anthropic-api-key-here

# Google Gemini API Key
GEMINI_API_KEY=your-gemini-api-key-here

# 기본 사용할 AI 제공업체 (openai, anthropic, gemini 중 선택)
DEFAULT_AI_PROVIDER=openai
```

### API 키 발급 방법

- **OpenAI**: https://platform.openai.com/api-keys
- **Anthropic (Claude)**: https://console.anthropic.com/
- **Google Gemini**: https://makersuite.google.com/app/apikey

## 실행 방법

### 개발 모드

```bash
npm start
```

### 프로덕션 빌드

```bash
npm run build
```

## 사용 방법

1. 애플리케이션을 실행합니다
2. 기본 정보 탭에서 시가총액, 배당수익률 등의 정보를 입력합니다
3. 밸류에이션 탭에서 PBR, PER, ROE, PSR 값을 입력합니다
   - 각 지표 옆의 ? 아이콘을 클릭하면 설명을 볼 수 있습니다
4. 평가하기 버튼을 클릭합니다
5. 로컬 스코어와 AI 분석 결과가 팝업으로 표시됩니다

## 프로젝트 구조

```
stock-rater/
├── src/
│   ├── main/
│   │   ├── index.js       # Electron 메인 프로세스
│   │   └── preload.js     # Preload 스크립트
│   ├── renderer/
│   │   ├── index.html     # UI 레이아웃
│   │   └── renderer.js    # 렌더러 프로세스 로직
│   └── shared/
│       └── evaluator.js   # 평가 로직
├── .env.example           # 환경변수 템플릿
├── .gitignore
├── package.json
└── README.md
```

## 평가 알고리즘

로컬 스코어는 다음 지표를 종합하여 계산됩니다:

- 시가총액
- 배당수익률
- 운용자산 (AUM)
- 괴리율
- 운용보수
- PBR (주가순자산비율)
- PER (주가수익비율)
- ROE (자기자본이익률)
- PSR (주가매출비율)

AI 분석은 로컬 스코어와 입력된 지표를 기반으로:
- 투자 판단 (Good/Meh/Bad)
- 신뢰도 (0-100%)
- 분석 이유
- 리스크 요소
- 개선/체크포인트

를 제공합니다.

## 라이선스

MIT License

## 개발자

ChoiHyunKong

## 기여

이슈와 풀 리퀘스트는 언제나 환영합니다.
