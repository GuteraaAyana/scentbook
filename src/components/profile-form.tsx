"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { type ProfileFormState, updateProfile } from "@/lib/actions/profile";
import { BIO_MAX, CITY_MAX } from "@/lib/profile";
import { primaryButton, textField } from "@/lib/ui";

const fieldError = "mt-1.5 block text-sm text-danger";
const fieldHint = "mt-1.5 block text-sm font-normal text-muted";

export function ProfileForm({
  initial,
  usernameLockedUntil,
}: {
  initial: ProfileFormState["values"];
  // Set when the username was changed in the last 7 days.
  usernameLockedUntil: string | null;
}) {
  const [state, save, pending] = useActionState(updateProfile, {
    values: initial,
    errors: {},
    saved: false,
    message: null,
  });
  const [bioLength, setBioLength] = useState(initial.bio.length);
  const { values, errors } = state;

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
          onChange={(e) => setBioLength(e.target.value.length)}
          aria-invalid={Boolean(errors.bio)}
          aria-describedby="bio-help"
          className={`${textField} resize-y`}
        />
        <span id="bio-help" className={errors.bio ? fieldError : fieldHint}>
          {errors.bio ?? `What do you reach for? ${bioLength} of ${BIO_MAX} characters.`}
        </span>
      </label>

      <label className="block text-sm font-medium">
        City
        <input
          name="city"
          defaultValue={values.city}
          key={`c-${values.city}`}
          maxLength={CITY_MAX}
          autoComplete="address-level2"
          aria-invalid={Boolean(errors.city)}
          aria-describedby="city-help"
          className={textField}
        />
        <span id="city-help" className={errors.city ? fieldError : fieldHint}>
          {errors.city ?? "Private. Never shown on your profile; only used to suggest what to wear for the weather."}
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className={primaryButton}>
          {pending ? "Saving…" : "Save profile"}
        </button>
        <p role="status" aria-live="polite" className="text-sm">
          {state.message ? (
            <span className="text-danger">{state.message}</span>
          ) : state.saved && !pending ? (
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
