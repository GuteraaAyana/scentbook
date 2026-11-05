"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { type ProfileFormState, type ProfileFormValues, updateProfile } from "@/lib/actions/profile";
import { type Place, likelyUnit } from "@/lib/places";
import { BIO_MAX } from "@/lib/profile";
import type { TemperatureUnit } from "@/lib/temperature";
import { primaryButton, secondaryButton, textField } from "@/lib/ui";
import { CityPicker } from "./city-picker";

const fieldError = "mt-1.5 block text-sm text-danger";
const fieldHint = "mt-1.5 block text-sm font-normal text-muted";

export function ProfileForm({
  initial,
  initialPlace,
  legacyCity,
  usernameLockedUntil,
  welcomeNext,
}: {
  initial: ProfileFormValues;
  // The saved home city, if it was chosen from the place list.
  initialPlace: Place | null;
  // A city typed before cities came from the list, to be re-chosen.
  legacyCity: string | null;
  // Set when the username was changed in the last 7 days.
  usernameLockedUntil: string | null;
  // Just signed up: where to go after saving (or skipping) the setup.
  welcomeNext: string | null;
}) {
  const router = useRouter();
  const [state, save, pending] = useActionState<ProfileFormState, FormData>(updateProfile, {
    values: initial,
    errors: {},
    saved: false,
    message: null,
  });
  const [bioLength, setBioLength] = useState(initial.bio.length);
  const [place, setPlace] = useState<Place | null>(initialPlace);
  const [placeTouched, setPlaceTouched] = useState(false);
  const [unit, setUnit] = useState<TemperatureUnit>(initial.temperatureUnit);
  const [unitTouched, setUnitTouched] = useState(false);
  const { values, errors } = state;

  // Setting up a new account: once saved, carry on to where they were going.
  useEffect(() => {
    if (welcomeNext && state.saved) router.push(welcomeNext);
  }, [welcomeNext, state.saved, router]);

  function choosePlace(next: Place | null) {
    setPlace(next);
    setPlaceTouched(true);
    // A first guess at their unit from the country, until they pick one.
    if (next && !unitTouched) setUnit(likelyUnit(next.countryCode));
  }

  // "keep": an old typed city nobody has touched stays as it is.
  const placeId = place ? String(place.id) : legacyCity && !placeTouched ? "keep" : "";

  return (
    <form action={save} className="mt-10 grid max-w-lg gap-6" noValidate>
      <label className="block text-sm font-medium">
        Username
        <span className="relative mt-1.5 block">
          <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted">
            @
          </span>
          <input
            name="username"
            defaultValue={values.username}
            key={`u-${values.username}`}
            required
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            aria-invalid={Boolean(errors.username)}
            aria-describedby="username-help"
            className={`${textField.replace("mt-1.5 ", "")} pl-7`}
          />
        </span>
        <span id="username-help" className={errors.username ? fieldError : fieldHint}>
          {errors.username ??
            (usernameLockedUntil
              ? `You can change it once a week; next on ${usernameLockedUntil}.`
              : "Your profile lives at /u/your-username. Letters, numbers and underscores. You can change it once a week.")}
        </span>
      </label>

      <label className="block text-sm font-medium">
        Bio
        <textarea
          name="bio"
          defaultValue={values.bio}
          key={`b-${values.bio}`}
          rows={3}
          autoFocus={Boolean(welcomeNext)}
          onChange={(e) => setBioLength(e.target.value.length)}
          aria-invalid={Boolean(errors.bio)}
          aria-describedby="bio-help"
          className={`${textField} resize-y`}
        />
        <span id="bio-help" className={errors.bio ? fieldError : fieldHint}>
          {errors.bio ?? `What do you reach for? ${bioLength} of ${BIO_MAX} characters.`}
        </span>
      </label>

      <div>
        <CityPicker
          label="Home city"
          value={place}
          onChange={choosePlace}
          initialText={legacyCity ?? ""}
          hint={
            legacyCity && !place
              ? `Choose “${legacyCity}” from the list to keep the weather working.`
              : "Private: never shown on your profile. Fills in the weather when you log a wear, and picks what to wear today."
          }
        />
        <input type="hidden" name="placeId" value={placeId} />
        <input type="hidden" name="city" value={place ? place.name : (legacyCity ?? "")} />
        {errors.city && <span className={fieldError}>{errors.city}</span>}
      </div>

      <fieldset>
        <legend className="text-sm font-medium">Temperatures in</legend>
        <div className="mt-2 inline-flex rounded-md bg-raised p-1">
          {(["c", "f"] as const).map((u) => (
            <label key={u} className="cursor-pointer">
              <input
                type="radio"
                name="temperatureUnit"
                value={u}
                checked={unit === u}
                onChange={() => {
                  setUnit(u);
                  setUnitTouched(true);
                }}
                className="peer sr-only"
              />
              <span className="block rounded px-4 py-1.5 text-sm font-bold text-muted peer-checked:bg-gold peer-checked:text-gold-ink peer-focus-visible:outline-2 peer-focus-visible:outline-gold">
                {u === "c" ? "°C" : "°F"}
              </span>
            </label>
          ))}
        </div>
        {errors.temperatureUnit && <span className={fieldError}>{errors.temperatureUnit}</span>}
      </fieldset>

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className={primaryButton}>
          {pending ? "Saving…" : welcomeNext ? "Save and continue" : "Save profile"}
        </button>
        {welcomeNext && (
          <Link href={welcomeNext} className={secondaryButton}>
            Skip for now
          </Link>
        )}
        <p role="status" aria-live="polite" className="text-sm">
          {state.message ? (
            <span className="text-danger">{state.message}</span>
          ) : state.saved && !pending && !welcomeNext ? (
            <>
              <span className="text-muted">Saved. </span>
              <Link href={`/u/${values.username}`} className="text-gold underline underline-offset-4">
                View your profile
              </Link>
            </>
          ) : null}
        </p>
      </div>
    </form>
  );
}
