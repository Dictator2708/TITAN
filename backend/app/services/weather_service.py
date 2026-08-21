import httpx
from typing import Any, Dict, List, Optional
from app.core.config import settings
from app.core.exceptions import TitanException
from app.schemas.integrations import WeatherCurrentOut, WeatherDayForecast, WeatherForecastOut

# WMO Weather interpretation codes (WW)
WMO_WEATHER_CODES = {
    0: ("Clear sky", "01d"),
    1: ("Mainly clear", "02d"),
    2: ("Partly cloudy", "03d"),
    3: ("Overcast", "04d"),
    45: ("Foggy", "50d"),
    48: ("Depositing rime fog", "50d"),
    51: ("Light drizzle", "09d"),
    53: ("Moderate drizzle", "09d"),
    55: ("Dense drizzle", "09d"),
    61: ("Slight rain", "10d"),
    63: ("Moderate rain", "10d"),
    65: ("Heavy rain", "10d"),
    71: ("Slight snow fall", "13d"),
    73: ("Moderate snow fall", "13d"),
    75: ("Heavy snow fall", "13d"),
    77: ("Snow grains", "13d"),
    80: ("Slight rain showers", "09d"),
    81: ("Moderate rain showers", "09d"),
    82: ("Violent rain showers", "09d"),
    85: ("Slight snow showers", "13d"),
    86: ("Heavy snow showers", "13d"),
    95: ("Thunderstorm", "11d"),
    96: ("Thunderstorm with slight hail", "11d"),
    99: ("Thunderstorm with heavy hail", "11d"),
}


def get_wmo_description(code: int) -> tuple[str, str]:
    return WMO_WEATHER_CODES.get(code, ("Unknown", "01d"))


async def get_weather_forecast(location: str, days: int = 3) -> WeatherForecastOut:
    if not location or not location.strip():
        location = "London"

    # If WeatherAPI key is provided, use WeatherAPI
    if settings.WEATHER_API_KEY and settings.WEATHER_API_KEY.strip():
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                url = "https://api.weatherapi.com/v1/forecast.json"
                params = {
                    "key": settings.WEATHER_API_KEY,
                    "q": location.strip(),
                    "days": max(1, min(days, 7)),
                    "aqi": "no",
                }
                resp = await client.get(url, params=params)
                if resp.status_code == 200:
                    data = resp.json()
                    loc = data["location"]
                    curr = data["current"]
                    
                    current_out = WeatherCurrentOut(
                        location_name=f"{loc['name']}, {loc['country']}",
                        country=loc.get("country"),
                        region=loc.get("region"),
                        latitude=loc["lat"],
                        longitude=loc["lon"],
                        temperature_c=curr["temp_c"],
                        temperature_f=curr["temp_f"],
                        condition_text=curr["condition"]["text"],
                        condition_icon=curr["condition"]["icon"],
                        humidity=curr["humidity"],
                        wind_kph=curr["wind_kph"],
                        feels_like_c=curr["feelslike_c"],
                        uv_index=curr.get("uv"),
                        is_day=bool(curr.get("is_day", 1)),
                        provider="WeatherAPI",
                    )
                    
                    forecast_list = []
                    for fday in data.get("forecast", {}).get("forecastday", []):
                        d = fday["day"]
                        forecast_list.append(
                            WeatherDayForecast(
                                date=fday["date"],
                                max_temp_c=d["maxtemp_c"],
                                min_temp_c=d["mintemp_c"],
                                condition_text=d["condition"]["text"],
                                precipitation_prob=d.get("daily_chance_of_rain"),
                                uv_index=d.get("uv"),
                            )
                        )
                    return WeatherForecastOut(current=current_out, forecast=forecast_list)
        except Exception:
            pass  # Fallback to Open-Meteo

    # Open-Meteo Geocoding + Weather (Zero API Key required, real-time live data)
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            geo_url = "https://geocoding-api.open-meteo.com/v1/search"
            geo_resp = await client.get(geo_url, params={"name": location.strip(), "count": 1, "language": "en", "format": "json"})
            if geo_resp.status_code != 200:
                raise TitanException(status_code=502, detail="Weather geocoding service unavailable")
            
            geo_data = geo_resp.json()
            results = geo_data.get("results")
            if not results:
                raise TitanException(status_code=404, detail=f"Location '{location}' not found")
            
            place = results[0]
            lat = place["latitude"]
            lon = place["longitude"]
            place_name = place.get("name", location)
            country = place.get("country", "")
            admin1 = place.get("admin1", "")
            full_loc_name = f"{place_name}, {country}" if country else place_name

            weather_url = "https://api.open-meteo.com/v1/forecast"
            w_params = {
                "latitude": lat,
                "longitude": lon,
                "current": "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m",
                "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max",
                "timezone": "auto",
                "forecast_days": max(1, min(days, 7)),
            }
            w_resp = await client.get(weather_url, params=w_params)
            if w_resp.status_code != 200:
                raise TitanException(status_code=502, detail="Weather data provider temporarily unavailable")
            
            w_data = w_resp.json()
            curr = w_data.get("current", {})
            daily = w_data.get("daily", {})

            wmo_code = curr.get("weather_code", 0)
            condition_text, icon_code = get_wmo_description(wmo_code)
            temp_c = curr.get("temperature_2m", 20.0)
            temp_f = round(temp_c * 9 / 5 + 32, 1)

            current_out = WeatherCurrentOut(
                location_name=full_loc_name,
                country=country,
                region=admin1,
                latitude=lat,
                longitude=lon,
                temperature_c=temp_c,
                temperature_f=temp_f,
                condition_text=condition_text,
                condition_icon=f"https://openweathermap.org/img/wn/{icon_code}.png",
                humidity=int(curr.get("relative_humidity_2m", 50)),
                wind_kph=float(curr.get("wind_speed_10m", 0.0)),
                feels_like_c=float(curr.get("apparent_temperature", temp_c)),
                is_day=bool(curr.get("is_day", 1)),
                provider="Open-Meteo",
            )

            forecast_list = []
            dates = daily.get("time", [])
            max_temps = daily.get("temperature_2m_max", [])
            min_temps = daily.get("temperature_2m_min", [])
            codes = daily.get("weather_code", [])
            precip_probs = daily.get("precipitation_probability_max", [])
            uvs = daily.get("uv_index_max", [])

            for i in range(len(dates)):
                d_code = codes[i] if i < len(codes) else 0
                d_desc, _ = get_wmo_description(d_code)
                forecast_list.append(
                    WeatherDayForecast(
                        date=dates[i],
                        max_temp_c=max_temps[i] if i < len(max_temps) else temp_c,
                        min_temp_c=min_temps[i] if i < len(min_temps) else temp_c,
                        condition_text=d_desc,
                        precipitation_prob=precip_probs[i] if i < len(precip_probs) else None,
                        uv_index=uvs[i] if i < len(uvs) else None,
                    )
                )

            return WeatherForecastOut(current=current_out, forecast=forecast_list)
    except TitanException:
        raise
    except Exception as e:
        raise TitanException(status_code=502, detail=f"Failed to fetch live weather data: {str(e)}")
