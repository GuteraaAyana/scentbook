"use client";

import { useState, useTransition } from "react";
import { moderateReview } from "@/lib/actions/moderation";
import { primaryButton, secondaryButton } from "@/lib/ui";

type Decision = "hide" | "restore" | "dismiss";

const LABELS: Record<Decision, { idle: string; busy: string }> = {
  hide: { idle: "Hide review", busy: "Hiding…" },
  dismiss: { idle: "Keep it up", busy: "Dismissing…" },
  restore: { idle: "Restore", busy: "Restoring…" },
};

// The moderator's choices for one review. The server checks the admin role
// again on every click.
export function ModerateButtons({ reviewId, decisions }: { reviewId: number; decisions: Decision[] }) {
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<Decision | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {decisions.map((decision, i) => (
        <button
          key={decision}
          type="button"
          disabled={pending}
          onClick={() => {
            setBusy(decision);
            setError(null);
            startTransition(async () => {
              const result = await moderateReview(reviewId, decision);
              if (result.error) setError(result.error);
            });
          }}
          className={i === 0 ? primaryButton : secondaryButton}
        >
          {pending && busy === decision ? LABELS[decision].busy : LABELS[decision].idle}
        </button>
      ))}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
