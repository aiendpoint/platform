# 첫 10개 서비스 등록 전략

> 빈 레지스트리는 아무도 안 쓴다.
> 닭이 먼저냐 달걀이 먼저냐의 문제를 직접 해결하는 방법.

---

## 원칙: 기다리지 말고 직접 만든다

두 가지 방법이 있다:

**A. 직접 구현** — 해당 서비스의 `/ai`를 우리가 직접 만들어서 GitHub에 올리고 PR을 날린다.  
**B. 프록시 등록** — 서비스가 `/ai`를 구현 안 해도, 우리 변환 레이어로 래핑해서 먼저 등록한다.

초기엔 B가 빠르다. 나중에 서비스 측이 공식 구현하면 교체.

---

## 첫 10개 선정 기준

```
1. AI 에이전트가 자주 쓸 법한 서비스 (실용성)
2. API가 공개되어 있거나 웹에서 파싱 가능한 서비스 (구현 가능성)
3. 개발자들이 알아볼 만한 서비스 (홍보 효과)
4. 한국 서비스 최소 3개 포함 (한국 시장 선점)
```

---

## 첫 10개 리스트

### #1. GitHub (글로벌 — 개발자 트래픽 확보용)
**왜**: 레지스트리를 처음 보는 개발자가 GitHub이 있으면 신뢰한다.

```json
{
  "service": {
    "name": "GitHub",
    "description": "Search repositories, issues, and users on GitHub.",
    "category": ["developer", "search", "data"]
  },
  "capabilities": [
    {
      "id": "search_repos",
      "description": "Search GitHub repositories",
      "endpoint": "https://api.github.com/search/repositories",
      "method": "GET",
      "params": {
        "q": "string, required — search query (e.g. 'aiendpoint language:javascript')",
        "sort": "string, optional — stars|forks|updated",
        "per_page": "integer, optional, default 10, max 30"
      },
      "returns": "items[] {id, full_name, description, stargazers_count, language, html_url}"
    },
    {
      "id": "search_issues",
      "description": "Search GitHub issues and pull requests",
      "endpoint": "https://api.github.com/search/issues",
      "method": "GET",
      "params": {
        "q": "string, required",
        "per_page": "integer, optional, default 10"
      },
      "returns": "items[] {id, title, state, created_at, html_url, repository_url}"
    }
  ],
  "auth": {
    "type": "bearer",
    "header": "Authorization: Bearer {GITHUB_TOKEN}",
    "docs": "https://docs.github.com/en/authentication"
  }
}
```
**등록 방법**: GitHub 공개 API 사용 — 인증 없이도 기본 검색 가능. 우리 프록시로 래핑.

---

### #2. 공공데이터포털 — 날씨 (한국 #1)
**왜**: 기상청 API는 한국 AI 서비스에서 가장 많이 쓰는 공공 API.

```json
{
  "service": {
    "name": "기상청 단기예보",
    "description": "대한민국 기상청 단기예보 API. 전국 지역의 기온, 강수, 바람 예보 제공.",
    "category": ["weather", "government", "data"],
    "language": ["ko"]
  },
  "capabilities": [
    {
      "id": "get_forecast",
      "description": "특정 지점의 단기예보 조회 (3일)",
      "endpoint": "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst",
      "method": "GET",
      "params": {
        "serviceKey": "string, required — 공공데이터포털 API 키",
        "nx": "integer, required — 예보지점 X좌표 (서울: 60)",
        "ny": "integer, required — 예보지점 Y좌표 (서울: 127)",
        "base_date": "string, required — 발표일자 YYYYMMDD",
        "base_time": "string, required — 발표시각 (0200|0500|0800|1100|1400|1700|2000|2300)",
        "numOfRows": "integer, optional, default 100"
      },
      "returns": "items[] {category, fcstDate, fcstTime, fcstValue} — TMP(기온), POP(강수확률), WSD(풍속)"
    }
  ],
  "auth": {
    "type": "apikey",
    "docs": "https://www.data.go.kr/data/15084084/openapi.do"
  }
}
```
**등록 방법**: 공공데이터포털 API 직접 래핑. 우리 프록시로 좌표 변환 레이어 추가.

---

### #3. 한국수출입은행 환율 (한국 #2)
**왜**: 환율 정보는 AI 에이전트가 금융/쇼핑 관련 작업에서 항상 필요로 함.

```json
{
  "service": {
    "name": "한국수출입은행 환율",
    "description": "한국수출입은행 고시 환율. 원화 기준 주요 통화 환율 제공.",
    "category": ["finance", "data", "government"],
    "language": ["ko"]
  },
  "capabilities": [
    {
      "id": "get_exchange_rate",
      "description": "특정 날짜의 환율 조회",
      "endpoint": "https://oapi.kipris.or.kr/... (또는 우리 프록시)",
      "method": "GET",
      "params": {
        "searchdate": "string, required — 조회날짜 YYYY-MM-DD",
        "data": "string, optional — AP01(합계)|AP02(현찰)|AP03(전신환)"
      },
      "returns": "result[] {cur_unit, cur_nm, deal_bas_r, bkpr} — 통화코드, 통화명, 매매기준율, 장부가격"
    }
  ],
  "auth": { "type": "apikey", "docs": "https://www.koreaexim.go.kr/site/program/openAPI/openAPIView" }
}
```

---

### #4. 네이버 검색 (한국 #3)
**왜**: 한국 검색의 70%는 네이버다. AI 에이전트의 한국어 검색 = 네이버.

```json
{
  "service": {
    "name": "Naver Search",
    "description": "Search Korean web content, news, blogs, and shopping via Naver.",
    "category": ["search", "news", "ecommerce"],
    "language": ["ko"]
  },
  "capabilities": [
    {
      "id": "search_news",
      "description": "Search Korean news articles",
      "endpoint": "https://openapi.naver.com/v1/search/news.json",
      "method": "GET",
      "params": {
        "query": "string, required",
        "display": "integer, optional, default 10, max 100",
        "sort": "string, optional — sim(유사도)|date(날짜)"
      },
      "returns": "items[] {title, originallink, description, pubDate}"
    },
    {
      "id": "search_shopping",
      "description": "Search Korean shopping products",
      "endpoint": "https://openapi.naver.com/v1/search/shop.json",
      "method": "GET",
      "params": {
        "query": "string, required",
        "display": "integer, optional, default 10",
        "sort": "string, optional — sim|date|asc(가격낮은)|dsc(가격높은)"
      },
      "returns": "items[] {title, link, image, lprice, mallName, brand}"
    }
  ],
  "auth": {
    "type": "apikey",
    "header": "X-Naver-Client-Id + X-Naver-Client-Secret",
    "docs": "https://developers.naver.com/docs/serviceapi/search/news/news.md"
  }
}
```

---

### #5. Wikipedia (글로벌 — 지식 베이스)
**왜**: AI 에이전트의 fact-checking, 배경 지식 검색에 필수.

```json
{
  "service": {
    "name": "Wikipedia",
    "description": "Search and retrieve Wikipedia article summaries and content.",
    "category": ["search", "data", "education"]
  },
  "capabilities": [
    {
      "id": "search",
      "description": "Search Wikipedia articles",
      "endpoint": "https://en.wikipedia.org/w/api.php",
      "method": "GET",
      "params": {
        "action": "string, fixed — query",
        "list": "string, fixed — search",
        "srsearch": "string, required — search query",
        "srlimit": "integer, optional, default 5"
      },
      "returns": "query.search[] {title, snippet, pageid}"
    },
    {
      "id": "get_summary",
      "description": "Get article summary by title (token-efficient)",
      "endpoint": "https://en.wikipedia.org/api/rest_v1/page/summary/{title}",
      "method": "GET",
      "params": {
        "title": "string, required — article title from search results"
      },
      "returns": "title, extract (plain text summary, ~200 words), thumbnail"
    }
  ],
  "auth": { "type": "none" },
  "token_hints": { "compact_mode": false, "field_filtering": false }
}
```

---

### #6. Open Library (글로벌 — 도서 검색)
**왜**: 책 관련 쿼리는 AI 에이전트에서 빈번. 인증 불필요.

```json
{
  "service": {
    "name": "Open Library",
    "description": "Search books, authors, and ISBN data from the Open Library.",
    "category": ["education", "data", "search"]
  },
  "capabilities": [
    {
      "id": "search_books",
      "description": "Search books by title, author, or subject",
      "endpoint": "https://openlibrary.org/search.json",
      "method": "GET",
      "params": {
        "q": "string, required — general search",
        "title": "string, optional — search by title",
        "author": "string, optional — search by author",
        "limit": "integer, optional, default 10"
      },
      "returns": "docs[] {key, title, author_name[], first_publish_year, isbn[]}"
    },
    {
      "id": "get_book",
      "description": "Get book details by ISBN",
      "endpoint": "https://openlibrary.org/isbn/{isbn}.json",
      "method": "GET",
      "params": {
        "isbn": "string, required — 10 or 13 digit ISBN"
      },
      "returns": "title, authors[], publishers[], publish_date, number_of_pages"
    }
  ],
  "auth": { "type": "none" }
}
```

---

### #7. CoinGecko (글로벌 — 암호화폐)
**왜**: 코인 가격은 AI 에이전트 금융 쿼리의 큰 부분. 무료 API 제공.

```json
{
  "service": {
    "name": "CoinGecko",
    "description": "Get cryptocurrency prices, market data, and historical rates.",
    "category": ["finance", "data"]
  },
  "capabilities": [
    {
      "id": "get_price",
      "description": "Get current price of cryptocurrencies",
      "endpoint": "https://api.coingecko.com/api/v3/simple/price",
      "method": "GET",
      "params": {
        "ids": "string, required — coin IDs comma-separated (bitcoin,ethereum,solana)",
        "vs_currencies": "string, required — target currencies (usd,krw,eur)",
        "include_24hr_change": "boolean, optional"
      },
      "returns": "{coin_id: {currency: price, currency_24h_change: percent}}"
    },
    {
      "id": "search_coins",
      "description": "Search for coins by name or symbol",
      "endpoint": "https://api.coingecko.com/api/v3/search",
      "method": "GET",
      "params": {
        "query": "string, required"
      },
      "returns": "coins[] {id, name, symbol, market_cap_rank}"
    }
  ],
  "auth": { "type": "none" },
  "token_hints": { "compact_mode": false, "field_filtering": true }
}
```

---

### #8. JSONPlaceholder → 우리 데모 뉴스 (레퍼런스 완성도용)
개발자들이 아는 테스트 API. 우리 데모 서버 #1(뉴스)을 여기에 등록.

```json
{
  "service": {
    "name": "AIEndpoint Demo — News",
    "description": "Reference implementation of the /ai standard. News search demo.",
    "category": ["news", "demo"],
    "tags": ["reference", "example"]
  }
}
```

---

### #9. Hacker News (글로벌 — 개발자 커뮤니티)
**왜**: 우리 첫 타겟 사용자층이 HN을 본다.

```json
{
  "service": {
    "name": "Hacker News",
    "description": "Search and retrieve Hacker News stories, comments, and user data.",
    "category": ["news", "developer", "search"]
  },
  "capabilities": [
    {
      "id": "search",
      "description": "Search HN stories and comments",
      "endpoint": "https://hn.algolia.com/api/v1/search",
      "method": "GET",
      "params": {
        "query": "string, required",
        "tags": "string, optional — story|comment|ask_hn|show_hn",
        "hitsPerPage": "integer, optional, default 10"
      },
      "returns": "hits[] {objectID, title, url, points, author, created_at, num_comments}"
    },
    {
      "id": "get_top_stories",
      "description": "Get current top stories",
      "endpoint": "https://hacker-news.firebaseio.com/v0/topstories.json",
      "method": "GET",
      "params": {},
      "returns": "integer[] — list of story IDs (use /v0/item/{id}.json to fetch each)"
    }
  ],
  "auth": { "type": "none" }
}
```

---

### #10. 공공데이터포털 — 공휴일 (한국 #4)
**왜**: 한국 캘린더/일정 관련 AI 쿼리에서 공휴일 정보는 필수.

```json
{
  "service": {
    "name": "대한민국 공휴일",
    "description": "행정안전부 제공 대한민국 법정공휴일 정보.",
    "category": ["calendar", "government", "data"],
    "language": ["ko"]
  },
  "capabilities": [
    {
      "id": "get_holidays",
      "description": "특정 연도/월의 공휴일 조회",
      "endpoint": "https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo",
      "method": "GET",
      "params": {
        "serviceKey": "string, required — 공공데이터포털 API 키",
        "solYear": "integer, required — 연도 (예: 2026)",
        "solMonth": "string, optional — 월 01~12 (없으면 연간 전체)"
      },
      "returns": "items[] {dateKind, dateName, isHoliday, locdate} — 공휴일명, 날짜"
    }
  ],
  "auth": { "type": "apikey", "docs": "https://www.data.go.kr" }
}
```

---

## 10개 등록 실행 계획

### Week 1 — 직접 구현 가능한 것 먼저 (인증 불필요)
```
Day 1-2: Wikipedia + Open Library + Hacker News
  → 인증 없음, 공개 API, 30분이면 프록시 래핑 완료

Day 3-4: CoinGecko + GitHub (공개 엔드포인트)
  → 무료 API 키 발급, 즉시 연동 가능

Day 5: 우리 데모 서버 3개 등록
  → 이미 만든 것들
```

### Week 2 — 한국 서비스
```
Day 1-2: 공공데이터포털 API 키 발급 → 날씨 + 공휴일
  → data.go.kr 계정 생성, 승인 1~2일 소요

Day 3-4: 네이버 개발자 센터 앱 등록
  → developers.naver.com, 앱 생성 즉시 발급

Day 5: 한국수출입은행 환율 API
  → koreaexim.go.kr 신청
```

### 등록 시 각 서비스에 대해 준비할 것
```
□ /ai 스펙 JSON 파일 (위 정의 기반)
□ 실제로 curl로 테스트한 결과 스크린샷
□ 우리 프록시 URL (서비스 측 /ai가 없는 경우)
□ 해당 서비스 공식 API 문서 링크
□ 카테고리, 태그 결정
```

---

## 10개 이후 확장 전략

### 50개까지: 커뮤니티 기여 유도
```
GitHub 레포에 "Add a Service" 이슈 템플릿 만들기
→ 누군가 "Spotify 추가해주세요" 이슈 올리면
→ PR 가이드 제공 → 머지하면 기여자 크레딧
```

### 100개까지: 자동 등록 파이프라인
```
누군가 URL 제출 →
우리 크롤러가 /ai 엔드포인트 탐색 →
없으면 OpenAPI 스펙 찾기 →
없으면 Claude API로 페이지 분석 →
/ai 스펙 자동 생성 후 검토 큐에 추가
```

### 1,000개까지: 파트너 프로그램
```
서비스 측에 직접 연락:
"당신 서비스를 AI가 더 잘 쓸 수 있게 도와드립니다.
/ai 구현하면 AI-Ready 배지 + 레지스트리 우선 노출."
```

---

## 핵심 메시지

첫 10개의 목표는 **완성도**가 아니라 **다양성**과 **신뢰**다.

- 개발자가 레지스트리에 왔을 때 자기가 아는 서비스가 하나라도 있으면 → 신뢰
- 한국 서비스가 있으면 → 한국 개발자 커뮤니티 공략 가능
- 데모 서버가 있으면 → "나도 이렇게 만들면 되겠구나" 이해

**빈 레지스트리는 아무도 안 쓴다. 10개면 충분히 시작할 수 있다.**
