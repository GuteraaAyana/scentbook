"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { logWear, type WearFormState } from "@/lib/actions/wear";
import { NOTE_MAX, OCCASIONS, WEATHER } from "@/lib/wear";
import { primaryButton, secondaryButton, textField } from "@/lib/ui";
import { ChipChoice } from "./chip-choice";
import { CountedTextarea } from "./counted-textarea";

const fieldError = "mt-1.5 block text-sm text-danger";
const legend = "text-sm font-bold";

// Today in the person's own time zone, as YYYY-MM-DD.
function localToday() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export function LogWearFlow({ fragranceId, fragranceName }: { fragranceId: number; fragranceName: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, save, pending] = useActionState(logWear.bind(null, fragranceId), {
    errors: {},
    message: null,
    saved: 0,
    values: null,
    attempt: 0,
  } satisfies WearFormState);
  // Set when the dialog opens, so the date is the person's today, not the server's.
  const [today, setToday] = useState("");
  const [formKey, setFormKey] = useState(0);
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

  // The attempt the dialog was opened at: anything returned since belongs to
  // this opening; anything older (an error from last time) doesn't.
  const [openedAt, setOpenedAt] = useState(0);
  const current = state.attempt > openedAt;
  const errors = current ? state.errors : {};
  const message = current ? state.message : null;
  // After an error, rebuild the form from what was sent (React resets forms
  // after an action); otherwise start empty.
  const values = current ? state.values : null;

  function open() {
    setToday(localToday());
    setFormKey((k) => k + 1); // a fresh, empty form each time
    setOpenedAt(state.attempt);
    setJustSaved(false);
    dialog.current?.showModal();
  }

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
              defaultValue={values?.wornOn ?? today}
              max={today}
              required
              aria-invalid={Boolean(errors.wornOn)}
              className={`${textField} [color-scheme:dark]`}
            />
            {errors.wornOn && <span className={fieldError}>{errors.wornOn}</span>}
          </label>

          <ChipChoice name="occasion" options={OCCASIONS.map((value) => ({ value }))} label="Occasion" defaultValue={values?.occasion} />
          {errors.occasion && <span className={fieldError}>{errors.occasion}</span>}

          <div className="grid gap-3 sm:grid-cols-[1fr_7rem] sm:items-end">
            <ChipChoice name="weather" options={WEATHER.map((value) => ({ value }))} label="Weather" defaultValue={values?.weather} />
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
                  defaultValue={values?.temperatureC}
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
