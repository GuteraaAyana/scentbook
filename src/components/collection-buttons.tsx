"use client";

import { useOptimistic, useState, useTransition } from "react";
import type { CollectionStatus } from "@/db/collections";
import { setCollectionStatus } from "@/lib/actions/collection";

const options: { status: CollectionStatus; label: string }[] = [
  { status: "have", label: "Have it" },
  { status: "want", label: "Want it" },
  { status: "had", label: "Had it" },
];

// Clicking a button sets that status; clicking the active one again removes
// the fragrance from the collection. The button lights up immediately
// (optimistic), and goes back if the server says no.
export function CollectionButtons({
  fragranceId,
  initialStatus,
}: {
  fragranceId: number;
  initialStatus: CollectionStatus | null;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(status);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function choose(next: CollectionStatus) {
    const target = optimisticStatus === next ? null : next;
    setError(null);
    startTransition(async () => {
      setOptimisticStatus(target);
      const result = await setCollectionStatus(fragranceId, target);
      if (result.error) setError(result.error);
      else setStatus(target);
    });
  }

  return (
    <div>
      <div role="group" aria-label="Your collection" className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = optimisticStatus === option.status;
          return (
            <button
              key={option.status}
              type="button"
              aria-pressed={active}
              onClick={() => choose(option.status)}
              className={
                active
                  ? "h-10 rounded-md bg-gold/15 px-3.5 text-sm font-bold text-gold shadow-[inset_0_0_0_1px_var(--gold)]"
                  : "h-10 rounded-md bg-surface px-3.5 text-sm font-bold transition-colors hover:bg-raised"
              }
            >
              {active && <span aria-hidden="true">✓ </span>}
              {option.label}
            </button>
          );
        })}
      </div>
      <p role="status" aria-live="polite" className="mt-1 min-h-5 text-xs">
        {error ? (
          <span className="text-danger">{error}</span>
        ) : pending ? (
          <span className="text-muted">Saving…</span>
        ) : null}
      </p>
    </div>
  );
}
