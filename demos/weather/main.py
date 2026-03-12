from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import random
from datetime import datetime, timedelta

app = FastAPI(title="AIEndpoint Demo — Weather Service", docs_url=None, redoc_url=None)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

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

CONDITIONS = ["sunny", "cloudy", "rainy", "partly_cloudy", "snowy", "windy", "foggy"]


def _generate_weather(city_key: str, days: int = 1):
    city = CITIES.get(city_key.lower())
    if not city:
        return None

    seed = sum(ord(c) for c in city_key)
    random.seed(seed + datetime.now().toordinal())

    forecast = []
    for i in range(days):
        date = (datetime.now() + timedelta(days=i)).strftime("%Y-%m-%d")
        temp_base = 10 if city["country"] in ("KR", "JP", "GB", "DE") else 18
        forecast.append({
            "date": date,
            "condition": random.choice(CONDITIONS),
            "temp_high_c": temp_base + random.randint(0, 15),
            "temp_low_c": temp_base + random.randint(-10, 0),
            "humidity_pct": random.randint(30, 90),
            "precipitation_mm": round(random.uniform(0, 20), 1),
            "wind_kph": random.randint(5, 40),
        })
    return {"city": city, "forecast": forecast}


def _to_f(c: float) -> float:
    return round(c * 9 / 5 + 32, 1)


# ─── /ai endpoint ──────────────────────────────────────────────────────────
@app.get("/ai")
def ai_endpoint():
    return {
        "aiendpoint": "1.0",
        "service": {
            "name": "DemoWeather",
            "description": "Get current weather and forecasts for cities worldwide.",
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
                    "city": "string, required — city name (e.g. Seoul, Tokyo, London)",
                    "units": "string, optional — celsius|fahrenheit, default celsius",
                    "compact": "boolean, optional — return minimal fields only"
                },
                "returns": "city, country, condition, temp_c, humidity_pct, wind_kph, observed_at"
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
                "returns": "city, country, days, forecast[] {date, condition, temp_high_c, temp_low_c, humidity_pct, wind_kph}"
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


# ─── API endpoints ─────────────────────────────────────────────────────────
@app.get("/api/weather/current")
def current_weather(
    city: str = Query(..., description="City name"),
    units: str = Query("celsius", description="celsius or fahrenheit"),
    compact: bool = Query(False)
):
    data = _generate_weather(city, days=1)
    if not data:
        raise HTTPException(
            status_code=404,
            detail={"error": f"City '{city}' not supported. Use /api/weather/cities for the list.", "code": "NOT_FOUND"}
        )

    today = data["forecast"][0]
    result = {
        "city": data["city"]["name"],
        "country": data["city"]["country"],
        "condition": today["condition"],
        "temp_c": today["temp_high_c"],
        "humidity_pct": today["humidity_pct"],
        "wind_kph": today["wind_kph"],
        "observed_at": datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ")
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
    data = _generate_weather(city, days=days)
    if not data:
        raise HTTPException(
            status_code=404,
            detail={"error": f"City '{city}' not supported. Use /api/weather/cities for the list.", "code": "NOT_FOUND"}
        )

    result_forecast = data["forecast"]
    if units == "fahrenheit":
        for day in result_forecast:
            day["temp_high_f"] = _to_f(day["temp_high_c"])
            day["temp_low_f"] = _to_f(day["temp_low_c"])

    return {
        "city": data["city"]["name"],
        "country": data["city"]["country"],
        "days": days,
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
    return {"error": "Not found", "hint": "Try GET /ai"}, 404


if __name__ == "__main__":
    import uvicorn
    port = int(__import__("os").environ.get("PORT", 3002))
    print(f"Demo Weather running on http://localhost:{port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
