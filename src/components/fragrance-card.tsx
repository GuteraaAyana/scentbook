import Link from "next/link";
import type { FragranceCardData } from "@/db/fragrances";
import { Poster } from "./poster";

const posterSizes = "(min-width: 1024px) 12vw, (min-width: 640px) 20vw, 33vw";

// A fragrance in a row or grid: its poster (with the community score, once
// anyone has ranked it), then name and brand.
export function FragranceCard({ fragrance }: { fragrance: FragranceCardData }) {
  return (
    <Link href={`/fragrances/${fragrance.slug}`} className="group block rounded-md">
      <Poster
        name={fragrance.name}
        imageUrl={fragrance.imageUrl}
        accords={fragrance.accords}
        score={fragrance.community?.score}
        sizes={posterSizes}
        className="transition-shadow group-hover:shadow-[inset_0_0_0_2px_var(--gold)]"
      />
      <p className="mt-2 truncate text-sm font-bold">{fragrance.name}</p>
      <p className="truncate text-xs text-muted">{fragrance.brand}</p>
    </Link>
  );
}

const gridColumns = "grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8";

export function FragranceGrid({ fragrances }: { fragrances: FragranceCardData[] }) {
  return (
    <ul className={gridColumns}>
      {fragrances.map((fragrance) => (
        <li key={fragrance.slug} className="min-w-0">
          <FragranceCard fragrance={fragrance} />
        </li>
      ))}
    </ul>
  );
}

// One line of posters, like a shelf: scrolls sideways on phones, fills a row of
// eight on wide screens.
export function FragranceRow({ fragrances }: { fragrances: FragranceCardData[] }) {
  return (
    <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0 lg:grid-cols-8">
      {fragrances.map((fragrance) => (
        <li key={fragrance.slug} className="w-[30vw] shrink-0 snap-start sm:w-auto sm:min-w-0">
          <FragranceCard fragrance={fragrance} />
        </li>
      ))}
    </ul>
  );
}

export function FragranceGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading fragrances" className={gridColumns}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i}>
          <div className="aspect-[2/3] animate-pulse rounded-md bg-surface" />
          <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-surface" />
          <div className="mt-1 h-3 w-1/2 animate-pulse rounded bg-surface" />
        </div>
      ))}
    </div>
  );
}
