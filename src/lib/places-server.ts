// Finding places with Open-Meteo's geocoding service (free, no key). Only the
// typed search text is sent. Results are cached: place lists don't change.
import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { type Place, toPlace } from "./places";

const GEOCODING = "https://geocoding-api.open-meteo.com/v1";

async function getJson(url: string) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

// Cities matching what's been typed so far, most populous first.
export async function searchPlaces(query: string): Promise<Place[] | null> {
  "use cache";
  cacheLife("weeks");
  cacheTag("places");

  const data = await getJson(`${GEOCODING}/search?count=8&language=en&format=json&name=${encodeURIComponent(query)}`);
  if (!data) return null; // the service didn't answer; not the same as no matches
  return ((data.results ?? []) as unknown[]).map(toPlace).filter((p): p is Place => p !== null);
}

// One place by its id: how a chosen city is checked before it's saved.
export async function getPlace(id: number): Promise<Place | null> {
  "use cache";
  cacheLife("weeks");
  cacheTag("places");

  return toPlace(await getJson(`${GEOCODING}/get?id=${id}`));
}
