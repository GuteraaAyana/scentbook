"use client";

import { useActionState, useRef, useState } from "react";
import { reportReview, type ReportFormState } from "@/lib/actions/moderation";
import { authClient } from "@/lib/auth-client";
import { REPORT_REASONS } from "@/lib/moderation";
import { primaryButton, secondaryButton } from "@/lib/ui";
import { CountedTextarea } from "./counted-textarea";

// "Report" under a review. The review list is cached and the same for every
// visitor, so whether to show this is decided here in the browser: only for
// signed-in people, never on your own review. The server checks both again.
export function ReportReview({ reviewId, authorUsername }: { reviewId: number; authorUsername: string | null }) {
  const { data: session } = authClient.useSession();
  const dialog = useRef<HTMLDialogElement>(null);
  const [formKey, setFormKey] = useState(0);
  const [state, report, pending] = useActionState(reportReview.bind(null, reviewId), {
    errors: {},
    message: null,
    done: false,
  } satisfies ReportFormState);

  if (!session) return null;
  const viewerUsername = (session.user as { username?: string | null }).username;
  if (authorUsername && viewerUsername === authorUsername) return null;

  if (state.done) {
    return (
      <p role="status" className="text-xs text-muted">
        {state.message ?? "Reported. Thanks, a moderator will take a look."}
      </p>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setFormKey((k) => k + 1);
          dialog.current?.showModal();
        }}
        className="text-xs font-bold text-muted hover:text-foreground"
      >
        Report
      </button>

      <dialog
        ref={dialog}
        aria-labelledby={`report-title-${reviewId}`}
        className="m-auto max-h-[calc(100dvh-2rem)] w-[min(28rem,calc(100vw-2rem))] overflow-y-auto rounded-lg bg-surface p-6 text-foreground backdrop:bg-black/75"
      >
        <h2 id={`report-title-${reviewId}`} className="text-xl font-extrabold tracking-tight">
          Report this review
        </h2>
        <p className="mt-1 text-sm text-muted">
          Moderators will look at it. Reviews reported by several people are hidden until then.
        </p>
        <form key={formKey} action={report} className="mt-5 grid gap-4" noValidate>
          <fieldset>
            <legend className="text-sm font-bold">What&rsquo;s wrong with it?</legend>
            <div className="mt-2 grid gap-1.5">
              {REPORT_REASONS.map((r) => (
                <label key={r.value} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="radio" name="reason" value={r.value} className="accent-[var(--gold)]" />
                  {r.label}
                </label>
              ))}
            </div>
            {state.errors.reason && <p className="mt-1.5 text-sm text-danger">{state.errors.reason}</p>}
          </fieldset>
          <label className="block">
            <span className="text-sm font-bold">Details (optional)</span>
            <CountedTextarea id={`report-details-${reviewId}`} name="details" max={500} rows={3} error={state.errors.details} />
          </label>
          {state.message && (
            <p role="alert" className="text-sm text-danger">
              {state.message}
            </p>
          )}
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className={primaryButton}>
              {pending ? "Sending…" : "Send report"}
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
