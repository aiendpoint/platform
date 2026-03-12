# 데모 서버 3개 — 레퍼런스 구현체

> 목적: "이렇게 쓰면 됩니다"를 코드로 보여주는 레퍼런스.
> 각각 다른 언어/프레임워크로 구현해서 "어떤 스택이든 된다"를 증명한다.

---

## 데모 서버 선택 기준

세 가지 기준으로 골랐다:
1. **카테고리 다양성** — 검색, 날씨, 뉴스처럼 실제로 AI가 자주 쓸 법한 것
2. **스택 다양성** — Node.js, Python, 정적 JSON 각각 하나씩
3. **복잡도 단계** — 간단 → 중간 → 실제 외부 API 연동

---

## 데모 1: 뉴스 검색 서비스 (Node.js + Express)

**왜 뉴스인가**: AI 에이전트가 가장 자주 묻는 게 "최근 뉴스"다. 실제 데이터 없이 더미로 구현해도 충분히 설득력 있다.

### 파일 구조
```
demo-news/
├── index.js
├── data/articles.json
└── package.json
```

### `package.json`
```json
{
  "name": "aiendpoint-demo-news",
  "version": "1.0.0",
  "description": "AIEndpoint /ai demo — News Search Service",
  "main": "index.js",
  "scripts": { "start": "node index.js" },
  "dependencies": { "express": "^4.18.0", "cors": "^2.8.5" }
}
```

### `data/articles.json`
```json
[
  {
    "id": "1",
    "title": "AI Agents Are Replacing API Integrations",
    "summary": "New research shows AI agents can autonomously integrate with services using standardized endpoints.",
    "category": "technology",
    "published_at": "2026-03-10T09:00:00Z",
    "source": "TechCrunch",
    "url": "https://example.com/article/1"
  },
  {
    "id": "2",
    "title": "Google Workspace CLI: Built for AI Agents First",
    "summary": "Google releases open-source CLI with agent-first design, ships 100+ SKILL.md files.",
    "category": "technology",
    "published_at": "2026-03-08T14:30:00Z",
    "source": "VentureBeat",
    "url": "https://example.com/article/2"
  },
  {
    "id": "3",
    "title": "The Token Economy: Why Efficient APIs Matter",
    "summary": "As LLM costs scale with token usage, API design that minimizes token consumption becomes a competitive advantage.",
    "category": "business",
    "published_at": "2026-03-07T11:00:00Z",
    "source": "Forbes",
    "url": "https://example.com/article/3"
  },
  {
    "id": "4",
    "title": "MCP Adoption Reaches 50,000 Servers",
    "summary": "Anthropic's Model Context Protocol sees explosive growth as developers standardize agent tool interfaces.",
    "category": "technology",
    "published_at": "2026-03-05T08:00:00Z",
    "source": "Wired",
    "url": "https://example.com/article/4"
  },
  {
    "id": "5",
    "title": "Korean Startup Ecosystem Embraces Agentic AI",
    "summary": "Major Korean platforms including Kakao and Naver begin shipping agent-compatible API layers.",
    "category": "technology",
    "published_at": "2026-03-03T10:00:00Z",
    "source": "Korea Herald",
    "url": "https://example.com/article/5"
  }
]
```

### `index.js`
```javascript
const express = require('express');
const cors = require('cors');
const articles = require('./data/articles.json');

const app = express();
app.use(cors());
app.use(express.json());

// ─── /ai 엔드포인트 ───────────────────────────────────────────
app.get('/ai', (req, res) => {
  res.json({
    aiendpoint: '1.0',
    service: {
      name: 'DemoNews',
      description: 'Search and retrieve recent news articles by keyword or category.',
      category: ['news', 'search']
    },
    capabilities: [
      {
        id: 'search_articles',
        description: 'Search news articles by keyword',
        endpoint: '/api/articles/search',
        method: 'GET',
        params: {
          q: 'string, required — search keyword',
          category: 'string, optional — filter by category (technology|business|politics|health)',
          limit: 'integer, optional, default 5, max 20'
        },
        returns: 'articles[] { id, title, summary, category, published_at, source, url }'
      },
      {
        id: 'get_latest',
        description: 'Get the latest news articles',
        endpoint: '/api/articles/latest',
        method: 'GET',
        params: {
          limit: 'integer, optional, default 5, max 20',
          category: 'string, optional — filter by category'
        },
        returns: 'articles[] { id, title, summary, category, published_at, source, url }'
      },
      {
        id: 'get_article',
        description: 'Get full content of a specific article by ID',
        endpoint: '/api/articles/:id',
        method: 'GET',
        params: {
          id: 'string, required — article ID from search results'
        },
        returns: 'article { id, title, summary, category, published_at, source, url }'
      }
    ],
    auth: { type: 'none' },
    token_hints: {
      compact_mode: true,
      field_filtering: true,
      delta_support: false
    },
    meta: {
      last_updated: '2026-03-10',
      status: 'https://demo-news.aiendpoint.dev/status'
    }
  });
});

// ─── 실제 API 엔드포인트들 ────────────────────────────────────
app.get('/api/articles/search', (req, res) => {
  const { q, category, limit = 5, fields, compact } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'q parameter is required' });
  }

  let results = articles.filter(a =>
    a.title.toLowerCase().includes(q.toLowerCase()) ||
    a.summary.toLowerCase().includes(q.toLowerCase())
  );

  if (category) {
    results = results.filter(a => a.category === category);
  }

  results = results.slice(0, Math.min(parseInt(limit), 20));

  // compact 모드: summary 제거
  if (compact === 'true') {
    results = results.map(({ id, title, category, published_at, source }) =>
      ({ id, title, category, published_at, source })
    );
  }

  // field filtering
  if (fields) {
    const fieldList = fields.split(',');
    results = results.map(a =>
      Object.fromEntries(fieldList.map(f => [f, a[f]]).filter(([, v]) => v !== undefined))
    );
  }

  res.json({ count: results.length, articles: results });
});

app.get('/api/articles/latest', (req, res) => {
  const { limit = 5, category, compact } = req.query;

  let results = [...articles].sort(
    (a, b) => new Date(b.published_at) - new Date(a.published_at)
  );

  if (category) results = results.filter(a => a.category === category);
  results = results.slice(0, Math.min(parseInt(limit), 20));

  if (compact === 'true') {
    results = results.map(({ id, title, category, published_at, source }) =>
      ({ id, title, category, published_at, source })
    );
  }

  res.json({ count: results.length, articles: results });
});

app.get('/api/articles/:id', (req, res) => {
  const article = articles.find(a => a.id === req.params.id);
  if (!article) return res.status(404).json({ error: 'Article not found' });
  res.json(article);
});

app.get('/status', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Demo News running on port ${PORT}`));
```

### 실행 및 테스트
```bash
npm install
npm start

# /ai 엔드포인트 확인
curl http://localhost:3001/ai

# 검색 테스트
curl "http://localhost:3001/api/articles/search?q=agent&limit=3"

# compact 모드 (토큰 절약)
curl "http://localhost:3001/api/articles/latest?compact=true&limit=5"

# field filtering
curl "http://localhost:3001/api/articles/search?q=AI&fields=id,title,published_at"
```

---

## 데모 2: 날씨 서비스 (Python + FastAPI)

**왜 날씨인가**: 간단하고 직관적이며, 지역 기반 쿼리를 보여줄 수 있다. Python 스택 레퍼런스.

### 파일 구조
```
demo-weather/
├── main.py
└── requirements.txt
```

### `requirements.txt`
```
fastapi==0.110.0
uvicorn==0.27.0
```

### `main.py`
```python
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import random
from datetime import datetime, timedelta

app = FastAPI(title="AIEndpoint Demo — Weather Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 더미 데이터 생성기
CITIES = {
    "seoul": {"lat": 37.5665, "lon": 126.9780, "name": "Seoul", "country": "KR"},
    "tokyo": {"lat": 35.6762, "lon": 139.6503, "name": "Tokyo", "country": "JP"},
    "new york": {"lat": 40.7128, "lon": -74.0060, "name": "New York", "country": "US"},
    "london": {"lat": 51.5074, "lon": -0.1278, "name": "London", "country": "GB"},
    "paris": {"lat": 48.8566, "lon": 2.3522, "name": "Paris", "country": "FR"},
    "busan": {"lat": 35.1796, "lon": 129.0756, "name": "Busan", "country": "KR"},
}

CONDITIONS = ["sunny", "cloudy", "rainy", "partly_cloudy", "snowy", "windy"]

def generate_weather(city_key: str, days: int = 1):
    city = CITIES.get(city_key.lower())
    if not city:
        return None

    seed = sum(ord(c) for c in city_key)
    random.seed(seed + datetime.now().day)

    forecast = []
    for i in range(days):
        date = (datetime.now() + timedelta(days=i)).strftime("%Y-%m-%d")
        temp_base = 15 if city["country"] == "KR" else 18
        forecast.append({
            "date": date,
            "condition": random.choice(CONDITIONS),
            "temp_high_c": temp_base + random.randint(-5, 15),
            "temp_low_c": temp_base + random.randint(-10, 5),
            "humidity_pct": random.randint(30, 90),
            "precipitation_mm": round(random.uniform(0, 20), 1),
            "wind_kph": random.randint(5, 40),
        })
    return {"city": city, "forecast": forecast}


# ─── /ai 엔드포인트 ───────────────────────────────────────────
@app.get("/ai")
def ai_endpoint():
    return {
        "aiendpoint": "1.0",
        "service": {
            "name": "DemoWeather",
            "description": "Get current weather and forecasts for cities worldwide.",
            "category": ["weather", "data"]
        },
        "capabilities": [
            {
                "id": "current_weather",
                "description": "Get current weather for a city",
                "endpoint": "/api/weather/current",
                "method": "GET",
                "params": {
                    "city": "string, required — city name (e.g. Seoul, Tokyo, London)",
                    "units": "string, optional — celsius|fahrenheit, default celsius"
                },
                "returns": "city{name,country}, condition, temp_c, humidity_pct, wind_kph"
            },
            {
                "id": "forecast",
                "description": "Get multi-day weather forecast for a city",
                "endpoint": "/api/weather/forecast",
                "method": "GET",
                "params": {
                    "city": "string, required — city name",
                    "days": "integer, optional, default 3, max 7",
                    "units": "string, optional — celsius|fahrenheit, default celsius"
                },
                "returns": "city{}, forecast[] {date, condition, temp_high, temp_low, humidity_pct, wind_kph}"
            },
            {
                "id": "supported_cities",
                "description": "List all supported cities",
                "endpoint": "/api/weather/cities",
                "method": "GET",
                "params": {},
                "returns": "cities[] {key, name, country, lat, lon}"
            }
        ],
        "auth": {"type": "none"},
        "token_hints": {
            "compact_mode": True,
            "field_filtering": False,
            "delta_support": False
        },
        "meta": {"last_updated": "2026-03-10"}
    }


# ─── 실제 API 엔드포인트들 ────────────────────────────────────
@app.get("/api/weather/current")
def current_weather(
    city: str = Query(..., description="City name"),
    units: str = Query("celsius", description="celsius or fahrenheit"),
    compact: bool = Query(False)
):
    data = generate_weather(city, days=1)
    if not data:
        raise HTTPException(404, f"City '{city}' not supported. Use /api/weather/cities for list.")

    today = data["forecast"][0]
    result = {
        "city": data["city"]["name"],
        "country": data["city"]["country"],
        "condition": today["condition"],
        "temp_c": today["temp_high_c"],
        "humidity_pct": today["humidity_pct"],
        "wind_kph": today["wind_kph"],
        "observed_at": datetime.now().isoformat()
    }

    if units == "fahrenheit":
        result["temp_f"] = round(result["temp_c"] * 9/5 + 32, 1)

    if compact:
        return {k: result[k] for k in ["city", "condition", "temp_c", "humidity_pct"]}

    return result


@app.get("/api/weather/forecast")
def forecast(
    city: str = Query(...),
    days: int = Query(3, ge=1, le=7),
    units: str = Query("celsius")
):
    data = generate_weather(city, days=days)
    if not data:
        raise HTTPException(404, f"City '{city}' not supported.")

    if units == "fahrenheit":
        for day in data["forecast"]:
            day["temp_high_f"] = round(day["temp_high_c"] * 9/5 + 32, 1)
            day["temp_low_f"] = round(day["temp_low_c"] * 9/5 + 32, 1)

    return {
        "city": data["city"]["name"],
        "country": data["city"]["country"],
        "days": days,
        "forecast": data["forecast"]
    }


@app.get("/api/weather/cities")
def supported_cities():
    return {
        "count": len(CITIES),
        "cities": [
            {"key": k, "name": v["name"], "country": v["country"],
             "lat": v["lat"], "lon": v["lon"]}
            for k, v in CITIES.items()
        ]
    }


@app.get("/status")
def status():
    return {"status": "ok"}
```

### 실행 및 테스트
```bash
pip install -r requirements.txt
uvicorn main:app --port 3002

# /ai 확인
curl http://localhost:3002/ai

# 현재 날씨
curl "http://localhost:3002/api/weather/current?city=Seoul"

# 5일 예보
curl "http://localhost:3002/api/weather/forecast?city=Tokyo&days=5"

# compact 모드
curl "http://localhost:3002/api/weather/current?city=London&compact=true"
```

---

## 데모 3: 환율 서비스 (정적 JSON + Cloudflare Workers)

**왜 환율인가**: 정적 JSON만으로도 `/ai` 구현이 가능하다는 걸 보여준다. 서버 없이 Cloudflare Workers(무료)로 런칭 가능.

**핵심 메시지**: "백엔드 서버가 없어도 됩니다."

### Cloudflare Worker 코드 (`worker.js`)
```javascript
// Cloudflare Workers — 무료 티어로 배포 가능
// wrangler deploy worker.js

const AI_SPEC = {
  aiendpoint: '1.0',
  service: {
    name: 'DemoFX',
    description: 'Get currency exchange rates. Supports 10 major currencies.',
    category: ['finance', 'data']
  },
  capabilities: [
    {
      id: 'get_rate',
      description: 'Get exchange rate between two currencies',
      endpoint: '/api/rate',
      method: 'GET',
      params: {
        from: 'string, required — source currency code (USD, KRW, EUR, JPY, GBP, CNY, AUD, CAD, CHF, HKD)',
        to: 'string, required — target currency code (same options)',
        amount: 'number, optional, default 1 — amount to convert'
      },
      returns: 'from, to, rate, converted_amount, last_updated'
    },
    {
      id: 'list_currencies',
      description: 'List all supported currency codes and names',
      endpoint: '/api/currencies',
      method: 'GET',
      params: {},
      returns: 'currencies[] {code, name, symbol}'
    },
    {
      id: 'get_all_rates',
      description: 'Get all rates relative to a base currency',
      endpoint: '/api/rates',
      method: 'GET',
      params: {
        base: 'string, required — base currency code'
      },
      returns: 'base, rates{currency_code: rate}, last_updated'
    }
  ],
  auth: { type: 'none' },
  token_hints: {
    compact_mode: false,
    field_filtering: false,
    delta_support: false
  },
  meta: { last_updated: '2026-03-10' }
};

// 더미 환율 데이터 (실제 서비스라면 외부 API 연동)
const BASE_RATES_USD = {
  USD: 1,
  KRW: 1342.50,
  EUR: 0.9215,
  JPY: 148.72,
  GBP: 0.7891,
  CNY: 7.2341,
  AUD: 1.5423,
  CAD: 1.3621,
  CHF: 0.8934,
  HKD: 7.8241
};

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'KRW', name: 'Korean Won', symbol: '₩' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' }
];

function getRate(from, to) {
  const fromRate = BASE_RATES_USD[from];
  const toRate = BASE_RATES_USD[to];
  if (!fromRate || !toRate) return null;
  return toRate / fromRate;
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    const params = url.searchParams;

    // /ai
    if (path === '/ai') {
      return new Response(JSON.stringify(AI_SPEC, null, 2), {
        headers: corsHeaders()
      });
    }

    // /api/currencies
    if (path === '/api/currencies') {
      return new Response(JSON.stringify({
        count: CURRENCIES.length,
        currencies: CURRENCIES
      }), { headers: corsHeaders() });
    }

    // /api/rate
    if (path === '/api/rate') {
      const from = params.get('from')?.toUpperCase();
      const to = params.get('to')?.toUpperCase();
      const amount = parseFloat(params.get('amount') || '1');

      if (!from || !to) {
        return new Response(JSON.stringify({ error: 'from and to are required' }),
          { status: 400, headers: corsHeaders() });
      }

      const rate = getRate(from, to);
      if (!rate) {
        return new Response(JSON.stringify({ error: `Unsupported currency. Use /api/currencies for list.` }),
          { status: 404, headers: corsHeaders() });
      }

      return new Response(JSON.stringify({
        from, to,
        rate: Math.round(rate * 10000) / 10000,
        amount,
        converted_amount: Math.round(rate * amount * 100) / 100,
        last_updated: '2026-03-10T00:00:00Z'
      }), { headers: corsHeaders() });
    }

    // /api/rates
    if (path === '/api/rates') {
      const base = params.get('base')?.toUpperCase();
      if (!base || !BASE_RATES_USD[base]) {
        return new Response(JSON.stringify({ error: 'Valid base currency required' }),
          { status: 400, headers: corsHeaders() });
      }

      const rates = {};
      for (const [code] of Object.entries(BASE_RATES_USD)) {
        if (code !== base) {
          rates[code] = Math.round(getRate(base, code) * 10000) / 10000;
        }
      }

      return new Response(JSON.stringify({
        base, rates,
        last_updated: '2026-03-10T00:00:00Z'
      }), { headers: corsHeaders() });
    }

    // /status
    if (path === '/status') {
      return new Response(JSON.stringify({ status: 'ok' }), {
        headers: corsHeaders()
      });
    }

    return new Response(JSON.stringify({ error: 'Not found', hint: 'Try GET /ai' }),
      { status: 404, headers: corsHeaders() });
  }
};
```

### 배포 (무료)
```bash
# Cloudflare Workers 배포
npm install -g wrangler
wrangler login
wrangler deploy worker.js --name demo-fx

# 또는 로컬 테스트
wrangler dev worker.js --port 3003

# 테스트
curl https://demo-fx.your-worker.workers.dev/ai
curl "https://demo-fx.your-worker.workers.dev/api/rate?from=USD&to=KRW&amount=100"
curl "https://demo-fx.your-worker.workers.dev/api/rates?base=KRW"
```

---

## 세 데모 한눈에 비교

| 항목 | 데모 1 (뉴스) | 데모 2 (날씨) | 데모 3 (환율) |
|------|------------|------------|------------|
| 언어 | Node.js | Python | JavaScript |
| 프레임워크 | Express | FastAPI | Cloudflare Workers |
| 서버 필요 | O | O | X (엣지) |
| 데이터 | 더미 JSON | 생성 더미 | 하드코딩 |
| 배포 비용 | $0 (Railway 무료) | $0 (Railway 무료) | $0 (Workers 무료) |
| compact 지원 | O | O | X |
| field filtering | O | X | X |

---

## 데모 서버 배포 체크리스트

```
각 데모 배포 전 확인사항:

□ curl {URL}/ai 응답이 유효한 JSON인가
□ aiendpoint 버전 필드가 있는가
□ 모든 capabilities의 endpoint가 실제로 작동하는가
□ 404, 400 에러가 JSON으로 리턴되는가
□ CORS 헤더가 설정되어 있는가 (브라우저에서 호출 가능)
□ /status 엔드포인트가 있는가

aiendpoint.dev 등록 전 추가 확인:

□ HTTPS로 접근 가능한가
□ 응답 시간이 2초 이내인가
□ 스펙 validator 통과했는가
   curl https://aiendpoint.dev/api/validate?url={YOUR_URL}
```

---

## 레퍼런스 구현체로 달성하는 목표

1. **"어떤 언어든 된다"** — Node, Python, 서버리스 전부 보여줌
2. **"30분이면 충분하다"** — 코드 복잡도를 최소로 유지
3. **"실제로 작동한다"** — 더미 데이터지만 curl로 테스트 가능
4. **"토큰 절약이 실제로 된다"** — compact, field filtering 직접 체험 가능

이 세 개가 GitHub에 올라가는 순간, README가 설득하는 게 아니라 **코드가 설득한다**.
