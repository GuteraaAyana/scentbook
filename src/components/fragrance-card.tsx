import Link from "next/link";
import type { FragranceCardData } from "@/db/fragrances";
import { concentrationLabels } from "@/lib/labels";

// A card linking to a fragrance: brand, name, year and concentration, and a
// color strip of its three strongest accords. Used by browse and collections.
export function FragranceCard({ fragrance }: { fragrance: FragranceCardData }) {
  return (
    <Link
      href={`/fragrances/${fragrance.slug}`}
      className="group flex h-full flex-col rounded-xl border border-neutral-200 p-5 transition-colors hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600"
    >
      <span className="text-xs font-medium uppercase tracking-widest text-muted">{fragrance.brand}</span>
      <span className="mt-1 text-xl font-semibold tracking-tight group-hover:underline group-hover:underline-offset-4">
        {fragrance.name}
      </span>
      <span className="mt-1 text-sm text-muted">
        {[fragrance.releaseYear, concentrationLabels[fragrance.concentration]].filter(Boolean).join(" · ")}
      </span>

      {/* The three strongest accords, sized by strength. */}
      <span className="mt-auto pt-5">
        <span className="flex h-2 overflow-hidden rounded-full" aria-hidden="true">
          {fragrance.accords.map((accord) => (
            <span key={accord.name} style={{ flexGrow: accord.strength, backgroundColor: accord.color }} />
          ))}
        </span>
        <span className="mt-2 block text-xs text-muted">{fragrance.accords.map((a) => a.name).join(", ")}</span>
      </span>
    </Link>
  );
}

export function FragranceGrid({ fragrances }: { fragrances: FragranceCardData[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {fragrances.map((fragrance) => (
        <li key={fragrance.slug}>
          <FragranceCard fragrance={fragrance} />
        </li>
      ))}
    </ul>
  );
}
