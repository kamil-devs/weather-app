import os
import json
import requests
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("OPENWEATHER_API_KEY")
HISTORY_FILE = "search_history.json"
BASE_URL = "https://api.openweathermap.org/data/2.5"
MAX_HISTORY = 10


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
    else:
        return "☁️"


def auto_detect_location():
    try:
        r = requests.get("https://ipapi.co/json/", timeout=5)
        r.raise_for_status()
        data = r.json()
        return data.get("city"), data.get("country_name")
    except Exception:
        return None, None


def get_current_weather(city):
    r = requests.get(
        f"{BASE_URL}/weather",
        params={"q": city, "appid": API_KEY, "units": "metric"},
        timeout=10,
    )
    r.raise_for_status()
    return r.json()


def get_forecast(city):
    r = requests.get(
        f"{BASE_URL}/forecast",
        params={"q": city, "appid": API_KEY, "units": "metric", "cnt": 40},
        timeout=10,
    )
    r.raise_for_status()
    return r.json()


def display_current_weather(data):
    city = data["name"]
    country = data["sys"]["country"]
    temp = data["main"]["temp"]
    feels_like = data["main"]["feels_like"]
    temp_min = data["main"]["temp_min"]
    temp_max = data["main"]["temp_max"]
    humidity = data["main"]["humidity"]
    wind_speed = data["wind"]["speed"]
    visibility = data.get("visibility", 0) // 1000
    description = data["weather"][0]["description"].title()
    weather_id = data["weather"][0]["id"]
    icon = data["weather"][0]["icon"]
    emoji = weather_emoji(weather_id, icon)
    sunrise = datetime.fromtimestamp(data["sys"]["sunrise"]).strftime("%H:%M")
    sunset = datetime.fromtimestamp(data["sys"]["sunset"]).strftime("%H:%M")
    updated = datetime.fromtimestamp(data["dt"]).strftime("%b %d, %H:%M")

    print(f"\n╔{'═'*48}╗")
    print(f"║  {emoji}  Current Weather — {city}, {country:<20}║")
    print(f"╠{'═'*48}╣")
    print(f"║  🌡️  Temperature   {temp:>5.1f}°C  (feels {feels_like:.1f}°C)   ║")
    print(f"║  🔼  High / Low    {temp_max:>5.1f}°C  /  {temp_min:.1f}°C          ║")
    print(f"║  💧  Humidity      {humidity:>5}%                       ║")
    print(f"║  💨  Wind          {wind_speed:>5.1f} m/s                    ║")
    print(f"║  👁️  Visibility    {visibility:>5} km                     ║")
    print(f"║  📝  Condition     {description:<28}║")
    print(f"║  🌅  Sunrise       {sunrise:<28}║")
    print(f"║  🌇  Sunset        {sunset:<28}║")
    print(f"║  🕐  Updated       {updated:<28}║")
    print(f"╚{'═'*48}╝")


def display_forecast(data):
    # Group 3-hour slots by calendar day
    daily: dict[str, list] = {}
    for item in data["list"]:
        date = datetime.fromtimestamp(item["dt"]).strftime("%Y-%m-%d")
        daily.setdefault(date, []).append(item)

    print(f"\n╔{'═'*48}╗")
    print(f"║  📅  5-Day Forecast{' '*29}║")
    print(f"╠{'═'*48}╣")

    for i, (date, items) in enumerate(daily.items()):
        if i >= 5:
            break
        temps = [item["main"]["temp"] for item in items]
        lo, hi = min(temps), max(temps)
        midday = next(
            (it for it in items if "12:00" in datetime.fromtimestamp(it["dt"]).strftime("%H:%M")),
            items[len(items) // 2],
        )
        wid = midday["weather"][0]["id"]
        icon = midday["weather"][0]["icon"]
        desc = midday["weather"][0]["description"].title()
        emoji = weather_emoji(wid, icon)
        day = datetime.strptime(date, "%Y-%m-%d").strftime("%A")
        rain = sum(it.get("rain", {}).get("3h", 0) for it in items)
        rain_str = f"🌧️ {rain:.1f}mm" if rain > 0 else ""
        print(f"║  {emoji}  {day:<9} {lo:>4.1f}°C – {hi:<4.1f}°C  {desc:<13}  {rain_str:<8}║")

    print(f"╚{'═'*48}╝")


def load_history() -> list:
    if os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def save_to_history(city: str):
    history = load_history()
    history = [h for h in history if h["city"].lower() != city.lower()]
    history.insert(0, {"city": city, "searched_at": datetime.now().isoformat()})
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(history[:MAX_HISTORY], f, indent=2)


def display_history(history: list):
    if not history:
        return
    print(f"\n  📍 Recent searches:")
    for i, h in enumerate(history, 1):
        dt = datetime.fromisoformat(h["searched_at"]).strftime("%b %d, %H:%M")
        print(f"     {i}. {h['city']}  ({dt})")


def main():
    print("\n" + "╔" + "═" * 48 + "╗")
    print("║        🌤️   Terminal Weather App          ║")
    print("╚" + "═" * 48 + "╝")

    if not API_KEY:
        print("\n  ❌  OPENWEATHER_API_KEY not set. Add it to .env")
        return

    print("\n  🔍 Detecting your location…", end="", flush=True)
    detected_city, detected_country = auto_detect_location()
    if detected_city:
        print(f"\r  📍 Detected: {detected_city}, {detected_country}            ")
    else:
        print("\r  ⚠️  Could not auto-detect location.            ")

    history = load_history()
    display_history(history)

    while True:
        print()
        if detected_city:
            print(f"  [Enter]  Use detected city ({detected_city})")
        print("  [name]   Enter a city name")
        if history:
            print(f"  [1-{min(len(history), 9)}]    Pick from recent searches")
        print("  [h]      Show history")
        print("  [q]      Quit")

        user_input = input("\n  > ").strip()

        if user_input.lower() == "q":
            print("\n  👋  Goodbye!\n")
            break

        if user_input.lower() == "h":
            history = load_history()
            display_history(history)
            continue

        if user_input == "" and detected_city:
            city = detected_city
        elif user_input.isdigit() and 1 <= int(user_input) <= len(history):
            city = history[int(user_input) - 1]["city"]
        else:
            city = user_input

        if not city:
            print("  ⚠️  Please enter a city name.")
            continue

        print(f"\n  🔍 Fetching weather for {city}…")

        try:
            current_data = get_current_weather(city)
            forecast_data = get_forecast(city)
        except requests.exceptions.HTTPError as e:
            code = e.response.status_code
            if code == 404:
                print(f"  ❌  City '{city}' not found. Check the spelling.")
            elif code == 401:
                print("  ❌  Invalid API key — check your .env file.")
            else:
                print(f"  ❌  API error {code}: {e}")
            continue
        except requests.exceptions.ConnectionError:
            print("  ❌  No internet connection.")
            continue
        except requests.exceptions.Timeout:
            print("  ❌  Request timed out. Try again.")
            continue

        display_current_weather(current_data)
        display_forecast(forecast_data)
        save_to_history(current_data["name"])
        history = load_history()


if __name__ == "__main__":
    main()
