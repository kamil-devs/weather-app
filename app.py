from flask import Flask, render_template, jsonify, request
import re
import requests
import os
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
API_KEY = os.getenv("OPENWEATHER_API_KEY")
BASE_URL = "https://api.openweathermap.org/data/2.5"


def weather_emoji(weather_id, icon=""):
    if 200 <= weather_id < 300:
        return "⛈️"
    elif 300 <= weather_id < 400:
        return "🌦️"
    elif 500 <= weather_id < 600:
        return "🌧️"
    elif 600 <= weather_id < 700:
        return "❄️"
    elif 700 <= weather_id < 800:
        return "🌫️"
    elif weather_id == 800:
        return "🌙" if icon.endswith("n") else "☀️"
    elif weather_id in (801, 802):
        return "⛅"
    return "☁️"


def generate_alerts(current, forecast):
    alerts = []
    temp = current["main"]["temp"]
    wind_speed = current["wind"]["speed"]
    humidity = current["main"]["humidity"]
    visibility = current.get("visibility", 10000)
    weather_id = current["weather"][0]["id"]

    if temp >= 38:
        alerts.append({"level": "danger", "icon": "🔥", "title": "Extreme Heat",
                        "message": f"Temperature is {temp:.1f}°C. Stay indoors and hydrate frequently."})
    elif temp >= 32:
        alerts.append({"level": "warning", "icon": "☀️", "title": "High Temperature",
                        "message": f"Temperature is {temp:.1f}°C. Stay cool and drink plenty of water."})
    elif temp <= -15:
        alerts.append({"level": "danger", "icon": "🥶", "title": "Extreme Cold",
                        "message": f"Temperature is {temp:.1f}°C. Risk of frostbite — dress in layers."})
    elif temp <= 0:
        alerts.append({"level": "warning", "icon": "❄️", "title": "Freezing Temperatures",
                        "message": f"Temperature is {temp:.1f}°C. Watch for icy surfaces."})

    if wind_speed >= 20:
        alerts.append({"level": "danger", "icon": "🌪️", "title": "Severe Wind",
                        "message": f"Wind speed is {wind_speed:.1f} m/s. Dangerous — avoid outdoor activities."})
    elif wind_speed >= 10:
        alerts.append({"level": "warning", "icon": "💨", "title": "Strong Wind",
                        "message": f"Wind speed is {wind_speed:.1f} m/s. Exercise caution outdoors."})

    if 200 <= weather_id < 300:
        alerts.append({"level": "danger", "icon": "⚡", "title": "Thunderstorm",
                        "message": "Active thunderstorm in the area. Seek shelter indoors immediately."})

    if weather_id in (502, 503, 504, 522):
        alerts.append({"level": "danger", "icon": "🌊", "title": "Heavy Rain",
                        "message": "Heavy rainfall. Risk of local flooding — avoid low-lying areas."})
    elif weather_id in (500, 501, 520, 521):
        alerts.append({"level": "info", "icon": "🌧️", "title": "Rain",
                        "message": "Rain in the area. Bring an umbrella."})

    if 600 <= weather_id < 700:
        alerts.append({"level": "warning", "icon": "🌨️", "title": "Snow",
                        "message": "Snowfall expected. Roads may be slippery — drive carefully."})

    if visibility < 500:
        alerts.append({"level": "danger", "icon": "🌫️", "title": "Very Low Visibility",
                        "message": f"Visibility is only {visibility}m. Extremely hazardous conditions."})
    elif visibility < 1000:
        alerts.append({"level": "warning", "icon": "🌫️", "title": "Low Visibility",
                        "message": f"Visibility is {visibility}m. Drive with caution."})

    if humidity >= 85 and temp >= 25:
        alerts.append({"level": "info", "icon": "💧", "title": "High Humidity",
                        "message": f"Humidity is {humidity}%. Conditions feel muggy — take it easy."})

    return alerts


@app.route("/")
def index():
    return render_template("index.html")


def _looks_like_postcode(q):
    return bool(re.match(r'^\d{2,}(?:[-\s]\d{2,})?$', q.strip()))


@app.route("/api/geocode")
def geocode():
    q = request.args.get("q", "").strip()
    if len(q) < 2:
        return jsonify([])
    if not API_KEY:
        return jsonify([])

    results = []

    # Standard city/name search
    try:
        resp = requests.get(
            "http://api.openweathermap.org/geo/1.0/direct",
            params={"q": q, "limit": 5, "appid": API_KEY},
            timeout=5,
        )
        resp.raise_for_status()
        for item in resp.json():
            results.append({
                "name": item["name"],
                "state": item.get("state", ""),
                "country": item.get("country", ""),
                "lat": item["lat"],
                "lon": item["lon"],
            })
    except Exception:
        pass

    # Postcode/zip search — supports "20-001" (tries PL) or "20-001,PL" explicitly
    zip_query = None
    if ',' in q:
        zip_query = q.replace(' ', '')
    elif _looks_like_postcode(q):
        zip_query = f"{q},PL"

    if zip_query:
        try:
            resp = requests.get(
                "http://api.openweathermap.org/geo/1.0/zip",
                params={"zip": zip_query, "appid": API_KEY},
                timeout=5,
            )
            if resp.status_code == 200:
                item = resp.json()
                if "lat" in item:
                    postcode_part = q.split(',')[0].strip()
                    is_dup = any(
                        abs(r["lat"] - item["lat"]) < 0.05 and abs(r["lon"] - item["lon"]) < 0.05
                        for r in results
                    )
                    if not is_dup:
                        results.insert(0, {
                            "name": item["name"],
                            "state": "",
                            "country": item.get("country", ""),
                            "lat": item["lat"],
                            "lon": item["lon"],
                            "postcode": postcode_part,
                        })
        except Exception:
            pass

    return jsonify(results[:5])


@app.route("/api/weather")
def get_weather():
    city = request.args.get("city", "").strip()
    lat = request.args.get("lat", "").strip()
    lon = request.args.get("lon", "").strip()

    if not API_KEY:
        return jsonify({"error": "API key not configured. Set OPENWEATHER_API_KEY in .env"}), 500

    if lat and lon:
        params = {"lat": lat, "lon": lon, "appid": API_KEY, "units": "metric"}
    elif city:
        params = {"q": city, "appid": API_KEY, "units": "metric"}
    else:
        return jsonify({"error": "City name or coordinates required"}), 400

    try:
        current_resp = requests.get(f"{BASE_URL}/weather", params=params, timeout=10)
        if current_resp.status_code == 404:
            return jsonify({"error": f"City '{city}' not found"}), 404
        if current_resp.status_code == 401:
            return jsonify({"error": "Invalid API key"}), 401
        current_resp.raise_for_status()
        current = current_resp.json()

        forecast_resp = requests.get(f"{BASE_URL}/forecast", params={**params, "cnt": 40}, timeout=10)
        forecast_resp.raise_for_status()
        forecast = forecast_resp.json()
    except requests.exceptions.ConnectionError:
        return jsonify({"error": "Network error — check your connection"}), 503
    except requests.exceptions.Timeout:
        return jsonify({"error": "Request timed out"}), 504

    # Group forecast into daily buckets, skip today
    daily = {}
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    for item in forecast["list"]:
        dt = datetime.fromtimestamp(item["dt"], tz=timezone.utc)
        day_key = dt.strftime("%Y-%m-%d")
        if day_key == today:
            continue
        if day_key not in daily:
            daily[day_key] = {
                "day": dt.strftime("%a"),
                "date": dt.strftime("%b %d"),
                "temps": [],
                "ids": [],
                "descs": [],
                "rain": 0,
            }
        daily[day_key]["temps"].append(item["main"]["temp"])
        daily[day_key]["ids"].append(item["weather"][0]["id"])
        daily[day_key]["descs"].append(item["weather"][0]["description"].title())
        daily[day_key]["rain"] += item.get("rain", {}).get("3h", 0)

    forecast_days = []
    for day_key in sorted(daily)[:5]:
        d = daily[day_key]
        top_id = max(set(d["ids"]), key=d["ids"].count)
        forecast_days.append({
            "day": d["day"],
            "date": d["date"],
            "high": round(max(d["temps"]), 1),
            "low": round(min(d["temps"]), 1),
            "emoji": weather_emoji(top_id),
            "description": max(set(d["descs"]), key=d["descs"].count),
            "rain": round(d["rain"], 1),
        })

    icon = current["weather"][0]["icon"]
    weather_id = current["weather"][0]["id"]

    return jsonify({
        "city": current["name"],
        "country": current["sys"]["country"],
        "lat": current["coord"]["lat"],
        "lon": current["coord"]["lon"],
        "temp": round(current["main"]["temp"], 1),
        "feels_like": round(current["main"]["feels_like"], 1),
        "temp_min": round(current["main"]["temp_min"], 1),
        "temp_max": round(current["main"]["temp_max"], 1),
        "humidity": current["main"]["humidity"],
        "wind_speed": round(current["wind"]["speed"], 1),
        "visibility": current.get("visibility", 10000),
        "description": current["weather"][0]["description"].title(),
        "emoji": weather_emoji(weather_id, icon),
        "sunrise": datetime.fromtimestamp(current["sys"]["sunrise"], tz=timezone.utc).strftime("%H:%M"),
        "sunset": datetime.fromtimestamp(current["sys"]["sunset"], tz=timezone.utc).strftime("%H:%M"),
        "forecast": forecast_days,
        "alerts": generate_alerts(current, forecast),
    })



if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
