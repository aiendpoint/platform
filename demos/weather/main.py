from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from datetime import datetime, timezone
import threading
import httpx

app = FastAPI(title="AIEndpoint Demo — Weather Service", docs_url=None, redoc_url=None)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

STATIC_DIR = Path(__file__).parent / "static"

CITIES = {
    "seoul":    {"lat": 37.5665, "lon": 126.9780, "name": "Seoul",    "country": "KR"},
    "busan":    {"lat": 35.1796, "lon": 129.0756, "name": "Busan",    "country": "KR"},
    "tokyo":    {"lat": 35.6762, "lon": 139.6503, "name": "Tokyo",    "country": "JP"},
    "new york": {"lat": 40.7128, "lon": -74.0060, "name": "New York", "country": "US"},
    "london":   {"lat": 51.5074, "lon": -0.1278,  "name": "London",   "country": "GB"},
    "paris":    {"lat": 48.8566, "lon": 2.3522,   "name": "Paris",    "country": "FR"},
    "sydney":   {"lat": -33.8688, "lon": 151.2093, "name": "Sydney",  "country": "AU"},
    "berlin":   {"lat": 52.5200, "lon": 13.4050,  "name": "Berlin",   "country": "DE"},
}

# WMO weather interpretation codes → the compact vocabulary this demo has
# always exposed (agents may already rely on these values).
WMO_CONDITIONS = {
    0: "sunny",
    1: "partly_cloudy", 2: "partly_cloudy",
    3: "cloudy",
    45: "foggy", 48: "foggy",
    51: "rainy", 53: "rainy", 55: "rainy", 56: "rainy", 57: "rainy",
    61: "rainy", 63: "rainy", 65: "rainy", 66: "rainy", 67: "rainy",
    71: "snowy", 73: "snowy", 75: "snowy", 77: "snowy",
    80: "rainy", 81: "rainy", 82: "rainy",
    85: "snowy", 86: "snowy",
    95: "stormy", 96: "stormy", 99: "stormy",
}

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
FETCH_TIMEOUT_S = 3.0
CACHE_TTL_S = 600  # serve cached weather up to 10 minutes

# city_key → {"data": <normalized>, "fetched_at": datetime}
_cache: dict = {}
_cache_lock = threading.Lock()


def _condition(code) -> str:
    try:
        return WMO_CONDITIONS.get(int(code), "cloudy")
    except (TypeError, ValueError):
        return "cloudy"


def _ri(value):
    """Open-Meteo arrays legitimately contain nulls; keep them as null."""
    return round(value) if value is not None else None


def _fetch_open_meteo(city_key: str) -> dict:
    """Fetch and normalize live weather. Raises on any upstream problem."""
    city = CITIES[city_key]
    resp = httpx.get(
        OPEN_METEO_URL,
        params={
            "latitude": city["lat"],
            "longitude": city["lon"],
            "current": "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m",
            "daily": "weather_code,temperature_2m_max,temperature_2m_min,"
                     "precipitation_sum,wind_speed_10m_max,relative_humidity_2m_mean",
            "timezone": "auto",
            "forecast_days": 7,
        },
        timeout=FETCH_TIMEOUT_S,
    )
    resp.raise_for_status()
    raw = resp.json()

    current = raw["current"]
    daily = raw["daily"]
    forecast = []
    for i, date in enumerate(daily["time"]):
        forecast.append({
            "date": date,
            "condition": _condition(daily["weather_code"][i]),
            "temp_high_c": daily["temperature_2m_max"][i],
            "temp_low_c": daily["temperature_2m_min"][i],
            "humidity_pct": _ri(daily["relative_humidity_2m_mean"][i]),
            "precipitation_mm": daily["precipitation_sum"][i],
            "wind_kph": _ri(daily["wind_speed_10m_max"][i]),
        })

    return {
        "city": city,
        "current": {
            "condition": _condition(current["weather_code"]),
            "temp_c": current["temperature_2m"],
            "humidity_pct": _ri(current["relative_humidity_2m"]),
            "wind_kph": _ri(current["wind_speed_10m"]),
            "observed_at": current["time"],
        },
        "forecast": forecast,
    }


def _get_weather(city_key: str):
    """Live data with fallback: Open-Meteo → recent cache (stale) → explicit error."""
    key = city_key.lower()
    if key not in CITIES:
        return None

    with _cache_lock:
        entry = _cache.get(key)
    age = (datetime.now(timezone.utc) - entry["fetched_at"]).total_seconds() if entry else None

    if entry and age < CACHE_TTL_S:
        return {**entry["data"], "source": "open-meteo", "stale": False}

    try:
        data = _fetch_open_meteo(key)
        with _cache_lock:
            _cache[key] = {"data": data, "fetched_at": datetime.now(timezone.utc)}
        return {**data, "source": "open-meteo", "stale": False}
    except Exception:
        if entry:
            # Upstream down — serve the last good response, clearly marked stale
            return {**entry["data"], "source": "open-meteo (cached)", "stale": True}
        raise HTTPException(
            status_code=503,
            detail={
                "error": "Live weather source (open-meteo.com) is unavailable and no cached data exists.",
                "code": "UPSTREAM_UNAVAILABLE",
            },
        )


def _to_f(c: float) -> float:
    return round(c * 9 / 5 + 32, 1)


# ─── Discovery document ────────────────────────────────────────────────────
AI_DOCUMENT = {
    "aiendpoint": "1.0",
    "service": {
        "name": "DemoWeather",
        "description": "Get current weather and forecasts for cities worldwide. Live data from Open-Meteo.",
        "category": ["weather", "data"],
        "language": ["en"]
    },
    "capabilities": [
        {
            "id": "current_weather",
            "description": "Get current weather for a city",
            "endpoint": "/api/weather/current",
            "method": "GET",
            "params": {
                "city": "string, required -- city name (e.g. Seoul, Tokyo, London)",
                "units": "string, optional -- celsius|fahrenheit, default celsius",
                "compact": "boolean, optional -- return minimal fields only"
            },
            "returns": "city, country, condition, temp_c, humidity_pct, wind_kph, observed_at, source, stale"
        },
        {
            "id": "forecast",
            "description": "Get multi-day weather forecast for a city",
            "endpoint": "/api/weather/forecast",
            "method": "GET",
            "params": {
                "city": "string, required -- city name",
                "days": "integer, optional, default 3, max 7",
                "units": "string, optional -- celsius|fahrenheit, default celsius"
            },
            "returns": "city, country, days, source, stale, forecast[] {date, condition, temp_high_c, temp_low_c, humidity_pct, wind_kph}"
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
    "meta": {"last_updated": "2026-09-01", "webmcp": "true"}
}


# /.well-known/ai is the authoritative location (draft-aiendpoint-ai-discovery-01);
# /ai stays as a backward-compatible alias serving identical content.
@app.get("/.well-known/ai")
def well_known_ai_endpoint():
    return AI_DOCUMENT


@app.get("/ai")
def ai_endpoint():
    return AI_DOCUMENT


# ─── Demo page ─────────────────────────────────────────────────────────────
@app.get("/")
def index():
    return FileResponse(STATIC_DIR / "index.html")


app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


# ─── API endpoints ─────────────────────────────────────────────────────────
@app.get("/api/weather/current")
def current_weather(
    city: str = Query(..., description="City name"),
    units: str = Query("celsius", description="celsius or fahrenheit"),
    compact: bool = Query(False)
):
    data = _get_weather(city)
    if not data:
        raise HTTPException(
            status_code=404,
            detail={"error": f"City '{city}' not supported. Use /api/weather/cities for the list.", "code": "NOT_FOUND"}
        )

    current = data["current"]
    result = {
        "city": data["city"]["name"],
        "country": data["city"]["country"],
        "condition": current["condition"],
        "temp_c": current["temp_c"],
        "humidity_pct": current["humidity_pct"],
        "wind_kph": current["wind_kph"],
        "observed_at": current["observed_at"],
        "source": data["source"],
        "stale": data["stale"],
    }

    if units == "fahrenheit":
        result["temp_f"] = _to_f(result["temp_c"])

    if compact:
        return {k: result[k] for k in ["city", "condition", "temp_c", "humidity_pct"]}

    return result


@app.get("/api/weather/forecast")
def forecast(
    city: str = Query(...),
    days: int = Query(3, ge=1, le=7),
    units: str = Query("celsius")
):
    data = _get_weather(city)
    if not data:
        raise HTTPException(
            status_code=404,
            detail={"error": f"City '{city}' not supported. Use /api/weather/cities for the list.", "code": "NOT_FOUND"}
        )

    result_forecast = [dict(day) for day in data["forecast"][:days]]
    if units == "fahrenheit":
        for day in result_forecast:
            day["temp_high_f"] = _to_f(day["temp_high_c"])
            day["temp_low_f"] = _to_f(day["temp_low_c"])

    return {
        "city": data["city"]["name"],
        "country": data["city"]["country"],
        "days": days,
        "source": data["source"],
        "stale": data["stale"],
        "forecast": result_forecast
    }


@app.get("/api/weather/cities")
def supported_cities():
    return {
        "count": len(CITIES),
        "cities": [
            {"key": k, "name": v["name"], "country": v["country"], "lat": v["lat"], "lon": v["lon"]}
            for k, v in CITIES.items()
        ]
    }


@app.get("/status")
def status():
    return {"status": "ok", "service": "demo-weather"}


@app.get("/{path:path}")
def not_found(path: str):
    raise HTTPException(status_code=404, detail={"error": "Not found", "hint": "Try GET /.well-known/ai"})


if __name__ == "__main__":
    import uvicorn
    port = int(__import__("os").environ.get("PORT", 3002))
    print(f"Demo Weather running on http://localhost:{port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
