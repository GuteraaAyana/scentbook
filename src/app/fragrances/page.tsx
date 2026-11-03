import type { Metadata } from "next";
import Link from "next/link";
import { listFragrances } from "@/db/fragrances";
import { concentrationLabels } from "@/lib/labels";

export const metadata: Metadata = {
  title: "All fragrances · Scentbook",
  description: "Browse the Scentbook catalog: notes, accords and perfumers for every fragrance.",
};

// No params or cookies, and the data is cached, so this whole page is
// prerendered at build time.
export default async function FragrancesPage() {
  const fragrances = await listFragrances();

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
      <Link href="/" className="text-sm text-muted hover:text-foreground">
        &larr; Scentbook
      </Link>
      <h1 className="mt-6 text-4xl font-semibold tracking-tight">All fragrances</h1>
      <p className="mt-2 text-muted">
        {fragrances.length} fragrances
      </p>

      {fragrances.length === 0 ? (
        <p className="mt-10 text-muted">
          The catalog is empty. Run <code className="font-mono">npm run db:seed</code> to add fragrances.
        </p>
      ) : (
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {fragrances.map((fragrance) => (
            <li key={fragrance.slug}>
              <Link
                href={`/fragrances/${fragrance.slug}`}
                className="group flex h-full flex-col rounded-xl border border-neutral-200 p-5 transition-colors hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600"
              >
                <span className="text-xs font-medium uppercase tracking-widest text-muted">
                  {fragrance.brand}
                </span>
                <span className="mt-1 text-xl font-semibold tracking-tight group-hover:underline group-hover:underline-offset-4">
                  {fragrance.name}
                </span>
                <span className="mt-1 text-sm text-muted">
                  {[fragrance.releaseYear, concentrationLabels[fragrance.concentration]]
                    .filter(Boolean)
                    .join(" · ")}
                </span>

                {/* The three strongest accords, sized by strength. */}
                <span className="mt-auto pt-5">
                  <span className="flex h-2 overflow-hidden rounded-full" aria-hidden="true">
                    {fragrance.accords.map((accord) => (
                      <span
                        key={accord.name}
                        style={{ flexGrow: accord.strength, backgroundColor: accord.color }}
                      />
                    ))}
                  </span>
                  <span className="mt-2 block text-xs text-muted">
                    {fragrance.accords.map((a) => a.name).join(", ")}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
