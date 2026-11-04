// Today's weather for a city, from Open-Meteo (free, no API key). Only the
// city name and coordinates are sent: nothing about the person. Results are
// cached, so each city is looked up about once an hour however many people
// live there. Any failure returns null and the page shows no pick instead
// of waiting.
import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { CurrentWeather } from "./wear-today";

const TIMEOUT_MS = 4000;

async function getJson(url: string) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

// City name → place. Cities don't move, so this is cached for days.
export async function findCity(city: string) {
  "use cache";
  cacheLife("days");
  cacheTag("weather");

  const url = `https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&format=json&name=${encodeURIComponent(city)}`;
  const place = (await getJson(url))?.results?.[0];
  if (!place) return null;
  return {
    name: String(place.name),
    country: place.country ? String(place.country) : null,
    latitude: Number(place.latitude),
    longitude: Number(place.longitude),
  };
}

// Current conditions at a place, refreshed about hourly. Coordinates are
// rounded (about 1 km) so nearby lookups share one cache entry.
export async function currentWeather(latitude: number, longitude: number): Promise<CurrentWeather | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("weather");

  const lat = latitude.toFixed(2);
  const lon = longitude.toFixed(2);
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`;
  const current = (await getJson(url))?.current;
  if (!current || typeof current.temperature_2m !== "number") return null;
  return {
    temperatureC: Math.round(current.temperature_2m),
    humidity: Number(current.relative_humidity_2m ?? 0),
    code: Number(current.weather_code ?? 0),
    windKph: Number(current.wind_speed_10m ?? 0),
  };
}
