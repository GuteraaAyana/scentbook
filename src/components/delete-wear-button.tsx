"use client";

import { useState, useTransition } from "react";
import { deleteWear } from "@/lib/actions/wear";

// Deleting is permanent, so it takes two clicks: Delete, then Yes, delete.
export function DeleteWearButton({ wearId }: { wearId: number }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="text-xs font-bold text-muted hover:text-foreground">
        Delete
      </button>
    );
  }

  return (
    <span className="flex items-center gap-3 text-xs font-bold">
      <span className="text-muted">Delete this entry?</span>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await deleteWear(wearId);
            if (result.error) setError(result.error);
          })
        }
        className="text-danger hover:underline"
      >
        {pending ? "Deleting…" : "Yes, delete"}
      </button>
      <button type="button" onClick={() => setConfirming(false)} className="text-muted hover:text-foreground">
        Keep it
      </button>
      {error && <span className="text-danger">{error}</span>}
    </span>
  );
}
