import Link from "next/link";
import type { FragranceCardData } from "@/db/fragrances";
import { ScentCase } from "./scent-case";

// A fragrance on the shelf: its display case, then name, brand and its
// strongest accords. Used by browse, home and collections.
export function FragranceCard({ fragrance }: { fragrance: FragranceCardData }) {
  return (
    <Link href={`/fragrances/${fragrance.slug}`} className="group block rounded-md">
      <ScentCase
        name={fragrance.name}
        imageUrl={fragrance.imageUrl}
        accords={fragrance.accords}
        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
        className="aspect-[4/5] transition-shadow group-hover:ring-line-strong"
      />
      <h3 className="font-display mt-3 text-lg leading-snug sm:text-xl">{fragrance.name}</h3>
      <p className="mt-0.5 text-sm text-muted">
        {fragrance.brand}
        {fragrance.releaseYear ? `, ${fragrance.releaseYear}` : ""}
      </p>
    </Link>
  );
}

export function FragranceGrid({ fragrances }: { fragrances: FragranceCardData[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4">
      {fragrances.map((fragrance) => (
        <li key={fragrance.slug}>
          <FragranceCard fragrance={fragrance} />
        </li>
      ))}
    </ul>
  );
}

export function FragranceGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading fragrances" className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i}>
          <div className="aspect-[4/5] animate-pulse rounded-md bg-surface" />
          <div className="mt-3 h-5 w-3/4 animate-pulse rounded bg-surface" />
          <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-surface" />
        </div>
      ))}
    </div>
  );
}
