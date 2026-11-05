"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { logWear, type WearFormState } from "@/lib/actions/wear";
import { type Place, placeLabel } from "@/lib/places";
import { type TemperatureUnit, UNIT_SYMBOL, toCelsius, toUnit } from "@/lib/temperature";
import { NOTE_MAX, OCCASIONS, WEATHER } from "@/lib/wear";
import { primaryButton, secondaryButton, textField } from "@/lib/ui";
import { ChipChoice } from "./chip-choice";
import { CityPicker } from "./city-picker";
import { CountedTextarea } from "./counted-textarea";

const fieldError = "mt-1.5 block text-sm text-danger";
const legend = "text-sm font-bold";

type Spot = { label: string; latitude: number; longitude: number };
type Filled = { temperatureC: number; weather: string };

// Today in the person's own time zone, as YYYY-MM-DD.
function localToday() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export function LogWearFlow({
  fragranceId,
  fragranceName,
  home,
  unit: savedUnit,
}: {
  fragranceId: number;
  fragranceName: string;
  home: Spot | null; // the home city from settings, if set
  unit: TemperatureUnit;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, save, pending] = useActionState(logWear.bind(null, fragranceId), {
    errors: {},
    message: null,
    saved: 0,
    values: null,
    attempt: 0,
  } satisfies WearFormState);
  const [formKey, setFormKey] = useState(0);
  const [justSaved, setJustSaved] = useState(false);

  // The fields the weather fills in, so they're kept in state.
  const [today, setToday] = useState("");
  const [date, setDate] = useState("");
  const [where, setWhere] = useState<"home" | "elsewhere">(home ? "home" : "elsewhere");
  const [elsewhere, setElsewhere] = useState<Place | null>(null);
  const [unit, setUnit] = useState<TemperatureUnit>(savedUnit);
  const [weather, setWeather] = useState("");
  const [temperature, setTemperature] = useState("");
  const [edited, setEdited] = useState({ weather: false, temperature: false });
  const [filled, setFilled] = useState<Filled | null>(null);
  const [lookup, setLookup] = useState<"idle" | "loading" | "none">("idle");

  const spot: Spot | null =
    where === "home" ? home : elsewhere ? { label: placeLabel(elsewhere), latitude: elsewhere.latitude, longitude: elsewhere.longitude } : null;


  // Close after a successful save.
  const seenSaves = useRef(0);
  useEffect(() => {
    if (state.saved > seenSaves.current) {
      seenSaves.current = state.saved;
      dialog.current?.close();
      setJustSaved(true);
    }
  }, [state.saved]);

  // Look up the weather for a day and place. Called when either changes;
  // only the latest lookup's answer is used.
  const lookupId = useRef(0);
  function lookUp(day: string, at: Spot | null) {
    const mine = ++lookupId.current;
    setFilled(null);
    if (!at || !day) {
      setLookup("idle");
      return;
    }
    setLookup("loading");
    const params = new URLSearchParams({ lat: String(at.latitude), lon: String(at.longitude), date: day });
    fetch(`/api/weather/day?${params}`)
      .then(async (res) => (res.ok ? ((await res.json()) as Filled) : null))
      .catch(() => null)
      .then((found) => {
        if (mine !== lookupId.current) return;
        setFilled(found);
        setLookup(found ? "idle" : "none");
      });
  }
  const spotOf = (w: "home" | "elsewhere", place: Place | null): Spot | null =>
    w === "home" ? home : place ? { label: placeLabel(place), latitude: place.latitude, longitude: place.longitude } : null;

  // What the weather filled in, unless the person has picked or typed their own.
  const weatherValue = edited.weather ? weather : (filled?.weather ?? "");
  const temperatureValue = edited.temperature ? temperature : filled ? String(toUnit(filled.temperatureC, unit)) : "";

  function switchUnit(next: TemperatureUnit) {
    if (next === unit) return;
    // Convert what they typed so the temperature stays the same.
    const typed = Number(temperature);
    if (edited.temperature && temperature.trim() && Number.isFinite(typed)) {
      setTemperature(String(toUnit(toCelsius(typed, unit), next)));
    }
    setUnit(next);
  }

  // The attempt the dialog was opened at: anything returned since belongs to
  // this opening; anything older (an error from last time) doesn't.
  const [openedAt, setOpenedAt] = useState(0);
  const current = state.attempt > openedAt;
  const errors = current ? state.errors : {};
  const message = current ? state.message : null;
  const values = current ? state.values : null;

  function open() {
    const day = localToday();
    setToday(day);
    setDate(day);
    setWhere(home ? "home" : "elsewhere");
    setElsewhere(null);
    setUnit(savedUnit);
    setWeather("");
    setTemperature("");
    setEdited({ weather: false, temperature: false });
    lookUp(day, home);
    setFormKey((k) => k + 1); // a fresh form each time
    setOpenedAt(state.attempt);
    setJustSaved(false);
    dialog.current?.showModal();
  }

  const fromWeather =
    filled && !edited.weather && !edited.temperature && spot
      ? `Filled in from the weather in ${spot.label.split(",")[0]} that day (its high).`
      : null;

  return (
    <>
      <button type="button" onClick={open} className={secondaryButton}>
        Log a wear
      </button>
      <span role="status" aria-live="polite" className="text-sm text-muted">
        {justSaved ? "Added to your diary." : ""}
      </span>

      <dialog
        ref={dialog}
        aria-labelledby="wear-title"
        className="m-auto max-h-[calc(100dvh-2rem)] w-[min(32rem,calc(100vw-2rem))] overflow-y-auto rounded-lg bg-surface p-6 text-foreground backdrop:bg-black/75 sm:p-8"
      >
        <h2 id="wear-title" className="text-2xl font-extrabold tracking-tight">
          Log a wear of {fragranceName}
        </h2>

        <form key={`${formKey}-${state.attempt}`} action={save} className="mt-6 grid gap-5" noValidate>
          <label className="block">
            <span className={legend}>Date</span>
            <input
              type="date"
              name="wornOn"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                lookUp(e.target.value, spot);
              }}
              max={today}
              required
              aria-invalid={Boolean(errors.wornOn)}
              className={`${textField} [color-scheme:dark]`}
            />
            {errors.wornOn && <span className={fieldError}>{errors.wornOn}</span>}
          </label>

          <fieldset>
            <legend className={legend}>Where</legend>
            {home && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(["home", "elsewhere"] as const).map((w) => (
                  <label key={w} className="cursor-pointer">
                    <input
                      type="radio"
                      name="where"
                      checked={where === w}
                      onChange={() => {
                        setWhere(w);
                        lookUp(date, spotOf(w, elsewhere));
                      }}
                      className="peer sr-only"
                    />
                    <span className="inline-block rounded-md bg-raised px-3 py-1.5 text-sm font-semibold peer-checked:bg-gold peer-checked:text-gold-ink peer-focus-visible:outline-2 peer-focus-visible:outline-gold">
                      {w === "home" ? `Home · ${home.label.split(",")[0]}` : "Somewhere else"}
                    </span>
                  </label>
                ))}
              </div>
            )}
            {where === "elsewhere" && (
              <div className="mt-3">
                <CityPicker
                  label="City"
                  value={elsewhere}
                  onChange={(place) => {
                    setElsewhere(place);
                    lookUp(date, spotOf("elsewhere", place));
                  }}
                />
              </div>
            )}
            {!home && (
              <p className="mt-1.5 text-sm text-muted">
                <Link href="/settings" className="text-gold underline underline-offset-4">
                  Add your home city
                </Link>{" "}
                and it&rsquo;s chosen for you here.
              </p>
            )}
            <input type="hidden" name="place" value={spot?.label ?? ""} />
            <input type="hidden" name="placeLatitude" value={spot ? String(spot.latitude) : ""} />
            <input type="hidden" name="placeLongitude" value={spot ? String(spot.longitude) : ""} />
            {errors.place && <span className={fieldError}>{errors.place}</span>}
          </fieldset>

          <ChipChoice name="occasion" options={OCCASIONS.map((value) => ({ value }))} label="Occasion" defaultValue={values?.occasion} />
          {errors.occasion && <span className={fieldError}>{errors.occasion}</span>}

          <div className="grid gap-3 sm:grid-cols-[1fr_9rem] sm:items-end">
            <ChipChoice
              name="weather"
              options={WEATHER.map((value) => ({ value }))}
              label="Weather"
              value={weatherValue}
              onChange={(v) => {
                setWeather(v);
                setEdited((e) => ({ ...e, weather: true }));
              }}
            />
            <div>
              <label htmlFor="wear-temperature" className={legend}>
                Temperature
              </label>
              <div className="mt-1.5 flex gap-1">
                <input
                  id="wear-temperature"
                  type="number"
                  name="temperature"
                  inputMode="numeric"
                  step={1}
                  value={temperatureValue}
                  onChange={(e) => {
                    setTemperature(e.target.value);
                    setEdited((x) => ({ ...x, temperature: true }));
                  }}
                  aria-invalid={Boolean(errors.temperature)}
                  className={`${textField.replace("mt-1.5 ", "")} min-w-0`}
                />
                <div role="group" aria-label="Unit" className="flex rounded-md bg-raised p-0.5">
                  {(["c", "f"] as const).map((u) => (
                    <button
                      key={u}
                      type="button"
                      aria-pressed={unit === u}
                      onClick={() => switchUnit(u)}
                      className={`rounded px-2 text-sm font-bold ${unit === u ? "bg-gold text-gold-ink" : "text-muted hover:text-foreground"}`}
                    >
                      {UNIT_SYMBOL[u]}
                    </button>
                  ))}
                </div>
              </div>
              <input type="hidden" name="unit" value={unit} />
            </div>
          </div>
          <p className="-mt-2 min-h-5 text-sm text-muted" aria-live="polite">
            {lookup === "loading"
              ? "Looking up the weather…"
              : lookup === "none" && spot
                ? "No weather on record for that day there; add it yourself if you like."
                : fromWeather}
          </p>
          {errors.weather && <span className={fieldError}>{errors.weather}</span>}
          {errors.temperature && <span className={fieldError}>{errors.temperature}</span>}

          <label className="block">
            <span className={legend}>Compliments</span>
            <input
              type="number"
              name="compliments"
              inputMode="numeric"
              min={0}
              max={99}
              step={1}
              defaultValue={values?.compliments || 0}
              aria-invalid={Boolean(errors.compliments)}
              className={`${textField} w-24`}
            />
            {errors.compliments && <span className={fieldError}>{errors.compliments}</span>}
          </label>

          <label className="block">
            <span className={legend}>Note</span>
            <CountedTextarea
              id="wear-note"
              name="note"
              max={NOTE_MAX}
              defaultValue={values?.note}
              error={errors.note}
              placeholder="How did it wear? How long did it last?"
            />
          </label>

          {message && (
            <p role="alert" className="text-sm text-danger">
              {message}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={pending} className={primaryButton}>
              {pending ? "Saving…" : "Add to diary"}
            </button>
            <button type="button" onClick={() => dialog.current?.close()} className={secondaryButton}>
              Cancel
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
