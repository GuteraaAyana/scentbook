"use client";

import { useOptimistic, useState, useTransition } from "react";
import { setFollowing } from "@/lib/actions/follow";
import { primaryButton, secondaryButton } from "@/lib/ui";

// Follow / Following on a profile. Flips immediately (optimistic) and goes
// back if the server says no.
export function FollowButton({ username, initiallyFollowing }: { username: string; initiallyFollowing: boolean }) {
  const [following, setFollowingState] = useState(initiallyFollowing);
  const [shown, setShown] = useOptimistic(following);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    const next = !shown;
    setError(null);
    startTransition(async () => {
      setShown(next);
      const result = await setFollowing(username, next);
      if (result.error) setError(result.error);
      else setFollowingState(next);
    });
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={shown}
        className={shown ? secondaryButton : primaryButton}
      >
        {shown ? "Following" : "Follow"}
      </button>
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
    </span>
  );
}
