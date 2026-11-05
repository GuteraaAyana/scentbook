// Rules for a wear diary entry, shared by the form and the server action and
// kept pure so they can be tested (wear.test.ts).

import { type TemperatureUnit, isUnit, toCelsius, toUnit } from "./temperature";

export const OCCASIONS = ["Everyday", "Work", "Date night", "Going out", "Special occasion", "Travel", "At home"];
export const WEATHER = ["Sunny", "Cloudy", "Rainy", "Snowy", "Windy", "Humid"];
export const NOTE_MAX = 280;
const OCCASION_MAX = 40;

export type WearInput = {
  wornOn: string;
  occasion: string;
  weather: string;
  temperature: string; // in `unit`
  unit: string; // "c" or "f"
  place: string; // "Lisbon, Portugal", or "" for none
  placeLatitude: string;
  placeLongitude: string;
  compliments: string;
  note: string;
};
export type WearValues = {
  wornOn: string; // YYYY-MM-DD
  occasion: string | null;
  weather: string | null;
  temperatureC: number | null; // always stored in °C
  unit: TemperatureUnit;
  place: string | null;
  placeLatitude: number | null;
  placeLongitude: number | null;
  compliments: number;
  note: string | null;
};
const PLACE_MAX = 120;
export type WearErrors = Partial<Record<keyof WearInput, string>>;

// A real calendar date in YYYY-MM-DD form ("2026-02-30" isn't).
function isCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function addDays(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function wholeNumber(value: string) {
  return /^-?\d+$/.test(value.trim()) ? Number(value) : NaN;
}

// `today` is the server's date (YYYY-MM-DD). The person's own "today" can be a
// day ahead in another time zone, so one day of slack is allowed.
export function validateWear(input: WearInput, today: string): { ok: true; value: WearValues } | { ok: false; errors: WearErrors } {
  const errors: WearErrors = {};
  const wornOn = input.wornOn.trim();
  const occasion = input.occasion.trim();
  const weather = input.weather.trim();
  const note = input.note.trim();

  if (!isCalendarDate(wornOn)) errors.wornOn = "Choose the date you wore it.";
  else if (wornOn > addDays(today, 1)) errors.wornOn = "That date is in the future.";
  else if (wornOn < "1900-01-01") errors.wornOn = "That date is too far back.";

  if (occasion.length > OCCASION_MAX) errors.occasion = `Keep it to ${OCCASION_MAX} characters.`;
  if (weather && !WEATHER.includes(weather)) errors.weather = "Pick one of the weather options.";

  const unit: TemperatureUnit = isUnit(input.unit) ? input.unit : "c";
  let temperatureC: number | null = null;
  if (input.temperature.trim()) {
    const typed = wholeNumber(input.temperature);
    temperatureC = Number.isInteger(typed) ? toCelsius(typed, unit) : NaN;
    if (!Number.isInteger(temperatureC) || temperatureC < -50 || temperatureC > 60) {
      errors.temperature = `Use a whole number of degrees between ${toUnit(-50, unit)} and ${toUnit(60, unit)}.`;
    }
  }

  // Where it was worn: a place picked from the weather service's list, so its
  // label comes with coordinates. None at all is fine too.
  const place = input.place.trim();
  let placeLatitude: number | null = null;
  let placeLongitude: number | null = null;
  if (place) {
    placeLatitude = Number(input.placeLatitude);
    placeLongitude = Number(input.placeLongitude);
    if (
      place.length > PLACE_MAX ||
      !input.placeLatitude.trim() || !input.placeLongitude.trim() ||
      !Number.isFinite(placeLatitude) || Math.abs(placeLatitude) > 90 ||
      !Number.isFinite(placeLongitude) || Math.abs(placeLongitude) > 180
    ) {
      errors.place = "Choose the city from the list.";
    }
  }

  let compliments = 0;
  if (input.compliments.trim()) {
    compliments = wholeNumber(input.compliments);
    if (!Number.isInteger(compliments) || compliments < 0 || compliments > 99) {
      errors.compliments = "Use a whole number from 0 to 99.";
    }
  }

  if (note.length > NOTE_MAX) errors.note = `Keep it to ${NOTE_MAX} characters (it's ${note.length}).`;

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      wornOn,
      occasion: occasion || null,
      weather: weather || null,
      temperatureC,
      unit,
      place: place || null,
      placeLatitude,
      placeLongitude,
      compliments,
      note: note || null,
    },
  };
}

const monthLabel = new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" });

// Diary entries (already newest first) grouped under "November 2026" etc.
export function groupByMonth<T extends { wornOn: string }>(entries: T[]) {
  const groups: { label: string; items: T[] }[] = [];
  for (const entry of entries) {
    const label = monthLabel.format(new Date(`${entry.wornOn}T00:00:00Z`));
    const last = groups.at(-1);
    if (last?.label === label) last.items.push(entry);
    else groups.push({ label, items: [entry] });
  }
  return groups;
}

// Open-Meteo's weather code (WMO) for a day → one of the WEATHER options.
// Strong wind wins over clear or cloudy skies, since it's what you'd notice.
export function weatherFromCode(code: number, maxWindKph: number | null = null): (typeof WEATHER)[number] {
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "Snowy";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95) return "Rainy";
  if (maxWindKph !== null && maxWindKph >= 40) return "Windy";
  return code <= 1 ? "Sunny" : "Cloudy";
}
