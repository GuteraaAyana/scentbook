"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { deleteReview, type ReviewFormState, saveReview } from "@/lib/actions/review";
import { BODY_MAX, LONGEVITY, SILLAGE } from "@/lib/review";
import { primaryButton, secondaryButton } from "@/lib/ui";
import { ChipChoice } from "./chip-choice";
import { CountedTextarea } from "./counted-textarea";

type Existing = { body: string; longevity: number | null; sillage: number | null } | null;

const fieldError = "mt-1.5 block text-sm text-danger";
const ratingOptions = (labels: string[]) => labels.map((label, i) => ({ value: String(i + 1), label }));

// "Write a review" / "Edit your review" on a fragrance page. One review per
// person per fragrance, so saving again edits it.
export function ReviewFlow({ fragranceId, fragranceName, existing }: { fragranceId: number; fragranceName: string; existing: Existing }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, save, pending] = useActionState(saveReview.bind(null, fragranceId), {
    errors: {},
    message: null,
    saved: 0,
    values: null,
    attempt: 0,
  } satisfies ReviewFormState);
  // The attempt the dialog was opened at: anything returned since belongs to
  // this opening; anything older (an error from last time) doesn't.
  const [openedAt, setOpenedAt] = useState(0);
  // Bumped on every opening so the form is rebuilt from the latest defaults
  // (say, empty again after deleting the review).
  const [formKey, setFormKey] = useState(0);
  const current = state.attempt > openedAt;
  const errors = current ? state.errors : {};
  const message = current ? state.message : null;
  // What the form starts with: what was just sent back with an error (React
  // resets forms after an action), else your saved review.
  const defaults = (current ? state.values : null) ?? {
    body: existing?.body ?? "",
    longevity: existing?.longevity ? String(existing.longevity) : "",
    sillage: existing?.sillage ? String(existing.sillage) : "",
  };
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, startDelete] = useTransition();

  // Close after a successful save.
  const seenSaves = useRef(0);
  useEffect(() => {
    if (state.saved > seenSaves.current) {
      seenSaves.current = state.saved;
      dialog.current?.close();
    }
  }, [state.saved]);

  function open() {
    setOpenedAt(state.attempt);
    setFormKey((k) => k + 1);
    setConfirmingDelete(false);
    dialog.current?.showModal();
  }

  function remove() {
    startDelete(async () => {
      await deleteReview(fragranceId);
      dialog.current?.close();
    });
  }


  return (
    <>
      <button type="button" onClick={open} className={existing ? secondaryButton : primaryButton}>
        {existing ? "Edit your review" : "Write a review"}
      </button>

      <dialog
        ref={dialog}
        aria-labelledby="review-title"
        className="m-auto max-h-[calc(100dvh-2rem)] w-[min(36rem,calc(100vw-2rem))] overflow-y-auto rounded-lg bg-surface p-6 text-foreground backdrop:bg-black/75 sm:p-8"
      >
        <h2 id="review-title" className="text-2xl font-extrabold tracking-tight">
          {existing ? "Edit your review" : "Review"} of {fragranceName}
        </h2>

        <form key={`${formKey}-${state.attempt}`} action={save} className="mt-6 grid gap-5" noValidate>
          <label className="block">
            <span className="text-sm font-bold">Your review</span>
            <CountedTextarea
              id="review-body"
              name="body"
              rows={6}
              max={BODY_MAX}
              defaultValue={defaults.body}
              error={errors.body}
              placeholder="What does it smell like to you? When would you wear it?"
            />
          </label>

          <ChipChoice
            name="longevity"
            label="How long it lasts on you"
            options={ratingOptions(LONGEVITY)}
            defaultValue={defaults.longevity}
          />
          {errors.longevity && <span className={fieldError}>{errors.longevity}</span>}

          <ChipChoice
            name="sillage"
            label="How far it projects"
            options={ratingOptions(SILLAGE)}
            defaultValue={defaults.sillage}
          />
          {errors.sillage && <span className={fieldError}>{errors.sillage}</span>}

          {message && (
            <p role="alert" className="text-sm text-danger">
              {message}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button type="submit" disabled={pending} className={primaryButton}>
              {pending ? "Saving…" : existing ? "Save changes" : "Post review"}
            </button>
            <button type="button" onClick={() => dialog.current?.close()} className={secondaryButton}>
              Cancel
            </button>
            {existing &&
              (confirmingDelete ? (
                <span className="ml-auto flex items-center gap-3 text-sm font-bold">
                  <span className="text-muted">Delete your review?</span>
                  <button type="button" onClick={remove} disabled={deleting} className="text-danger hover:underline">
                    {deleting ? "Deleting…" : "Yes, delete"}
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  className="ml-auto text-sm font-bold text-muted hover:text-foreground"
                >
                  Delete review
                </button>
              ))}
          </div>
        </form>
      </dialog>
    </>
  );
}
