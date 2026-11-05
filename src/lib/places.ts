// Places from Open-Meteo's geocoding service: the shape we keep, and how a
// place is labelled. Pure; the fetching lives in places-server.ts.

export type Place = {
  id: number;
  name: string;
  region: string | null; // state, province...
  country: string | null;
  countryCode: string | null;
  latitude: number;
  longitude: number;
  timezone: string | null;
};

// "Portland, Oregon, United States": the region tells the Portlands apart.
// Left out when it's just the city's own name again ("Lisbon, Portugal"), or
// when asked for the short form.
export function placeLabel(place: Pick<Place, "name" | "region" | "country">, withRegion = true): string {
  const parts = [place.name];
  if (withRegion && place.region && place.region !== place.name) parts.push(place.region);
  if (place.country) parts.push(place.country);
  return parts.join(", ");
}

// Open-Meteo's raw result → Place, or null if it's missing what we need.
export function toPlace(raw: unknown): Place | null {
  const r = raw as Record<string, unknown> | null;
  if (!r || typeof r.id !== "number" || typeof r.name !== "string") return null;
  if (typeof r.latitude !== "number" || typeof r.longitude !== "number") return null;
  const text = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);
  return {
    id: r.id,
    name: r.name,
    region: text(r.admin1),
    country: text(r.country),
    countryCode: text(r.country_code),
    latitude: r.latitude,
    longitude: r.longitude,
    timezone: text(r.timezone),
  };
}

// The United States and a few others read Fahrenheit; a good first guess
// for someone's unit from their home country.
const FAHRENHEIT_COUNTRIES = new Set(["US", "LR", "MM", "BS", "BZ", "KY", "PW", "FM", "MH"]);
export function likelyUnit(countryCode: string | null): "c" | "f" {
  return countryCode && FAHRENHEIT_COUNTRIES.has(countryCode.toUpperCase()) ? "f" : "c";
}
