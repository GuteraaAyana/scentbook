"use client";

import { useEffect } from "react";
import { pageContainer, primaryButton } from "@/lib/ui";

// Shown when a page fails to render (say, the database is briefly
// unreachable). The details stay in the server logs; people see a way back.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className={`${pageContainer} flex-1 py-20`}>
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Something went wrong</h1>
      <p className="mt-4 max-w-md text-muted">
        This page didn&rsquo;t load. It&rsquo;s probably temporary, so try again in a moment.
        {error.digest && <span className="mt-2 block text-sm">Reference: {error.digest}</span>}
      </p>
      <button type="button" onClick={reset} className={`${primaryButton} mt-8`}>
        Try again
      </button>
    </main>
  );
}
