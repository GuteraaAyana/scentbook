"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { logWear, type WearFormState } from "@/lib/actions/wear";
import { NOTE_MAX, OCCASIONS, WEATHER } from "@/lib/wear";
import { primaryButton, secondaryButton, textField } from "@/lib/ui";

const fieldError = "mt-1.5 block text-sm text-danger";
const legend = "text-sm font-bold";

// Today in the person's own time zone, as YYYY-MM-DD.
function localToday() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

// A set of radio buttons drawn as chips. Real radios, so arrow keys and
// screen readers work as usual. Picking nothing is allowed.
function ChipChoice({ name, options, label }: { name: string; options: string[]; label: string }) {
  return (
    <fieldset>
      <legend className={legend}>{label}</legend>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {options.map((option) => (
          <label key={option} className="cursor-pointer">
            <input type="radio" name={name} value={option} className="peer sr-only" />
            <span className="inline-block rounded-md bg-raised px-3 py-1.5 text-sm font-semibold transition-colors peer-checked:bg-gold peer-checked:text-gold-ink peer-focus-visible:outline-2 peer-focus-visible:outline-gold">
              {option}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function LogWearFlow({ fragranceId, fragranceName }: { fragranceId: number; fragranceName: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, save, pending] = useActionState(logWear.bind(null, fragranceId), {
    errors: {},
    message: null,
    saved: 0,
  } satisfies WearFormState);
  // Set when the dialog opens, so the date is the person's today, not the server's.
  const [today, setToday] = useState("");
  const [formKey, setFormKey] = useState(0);
  const [noteLength, setNoteLength] = useState(0);
  const [justSaved, setJustSaved] = useState(false);

  // Close after a successful save.
  const seenSaves = useRef(0);
  useEffect(() => {
    if (state.saved > seenSaves.current) {
      seenSaves.current = state.saved;
      dialog.current?.close();
      setJustSaved(true);
    }
  }, [state.saved]);

  function open() {
    setToday(localToday());
    setFormKey((k) => k + 1); // a fresh, empty form each time
    setNoteLength(0);
    setJustSaved(false);
    dialog.current?.showModal();
  }

  const { errors } = state;

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

        <form key={formKey} action={save} className="mt-6 grid gap-5" noValidate>
          <label className="block">
            <span className={legend}>Date</span>
            <input
              type="date"
              name="wornOn"
              defaultValue={today}
              max={today}
              required
              aria-invalid={Boolean(errors.wornOn)}
              className={`${textField} [color-scheme:dark]`}
            />
            {errors.wornOn && <span className={fieldError}>{errors.wornOn}</span>}
          </label>

          <ChipChoice name="occasion" options={OCCASIONS} label="Occasion" />
          {errors.occasion && <span className={fieldError}>{errors.occasion}</span>}

          <div className="grid gap-3 sm:grid-cols-[1fr_7rem] sm:items-end">
            <ChipChoice name="weather" options={WEATHER} label="Weather" />
            <label className="block">
              <span className={legend}>Temperature</span>
              <span className="relative block">
                <input
                  type="number"
                  name="temperatureC"
                  inputMode="numeric"
                  min={-50}
                  max={60}
                  step={1}
                  aria-invalid={Boolean(errors.temperatureC)}
                  className={`${textField} pr-9`}
                />
                <span aria-hidden="true" className="pointer-events-none absolute right-3 bottom-2.5 text-muted">
                  °C
                </span>
              </span>
            </label>
          </div>
          {errors.weather && <span className={fieldError}>{errors.weather}</span>}
          {errors.temperatureC && <span className={fieldError}>{errors.temperatureC}</span>}

          <label className="block">
            <span className={legend}>Compliments</span>
            <input
              type="number"
              name="compliments"
              inputMode="numeric"
              min={0}
              max={99}
              step={1}
              defaultValue={0}
              aria-invalid={Boolean(errors.compliments)}
              className={`${textField} w-24`}
            />
            {errors.compliments && <span className={fieldError}>{errors.compliments}</span>}
          </label>

          <label className="block">
            <span className={legend}>Note</span>
            <textarea
              name="note"
              rows={3}
              maxLength={NOTE_MAX}
              onChange={(e) => setNoteLength(e.target.value.length)}
              placeholder="How did it wear? How long did it last?"
              aria-invalid={Boolean(errors.note)}
              className={`${textField} resize-y`}
            />
            <span className={errors.note ? fieldError : "mt-1.5 block text-sm text-muted"}>
              {errors.note ?? `${noteLength} of ${NOTE_MAX}`}
            </span>
          </label>

          {state.message && (
            <p role="alert" className="text-sm text-danger">
              {state.message}
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
