import Link from "next/link";
import { Suspense } from "react";
import { FragranceRow } from "@/components/fragrance-card";
import { FragranceSearch } from "@/components/fragrance-search";
import { HomeFeed } from "@/components/home-feed";
import { TodayPick } from "@/components/today-pick";
import type { FragranceCardData } from "@/db/fragrances";
import { listCommunityHighlights, listFeaturedFragrances, listFragrances } from "@/db/fragrances";
import { pageContainer, primaryButton, rowHeading, secondaryButton } from "@/lib/ui";

const MIN_ROW = 4;

// Prerendered from cached data; refreshed when the catalog or rankings change.
export default async function Home() {
  const [featured, { topRated, mostRanked }, { total }] = await Promise.all([
    listFeaturedFragrances(8),
    listCommunityHighlights(8),
    listFragrances(1),
  ]);

  return (
    <main className={`${pageContainer} flex-1 py-8 sm:py-10`}>
      <section className="rounded-lg bg-surface p-5 sm:p-6">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Track every scent you&rsquo;ve worn.</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Browse {total} fragrances by their notes and accords, keep a collection, and rank what you&rsquo;ve tried to
          get your own score out of 10 for each.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/fragrances" className={primaryButton}>
            Browse fragrances
          </Link>
          <Link href="/rankings" className={secondaryButton}>
            Start ranking
          </Link>
        </div>
      </section>

      <FragranceSearch syncUrl={false}>
        <Suspense>
          <TodayPick />
        </Suspense>

        <Suspense>
          <HomeFeed />
        </Suspense>

        {/* Community rows wait until enough has been ranked to fill a row. */}
        {topRated.length >= MIN_ROW && <Row title="Highest rated" fragrances={topRated} />}
        <Row title="Featured" fragrances={featured} />
        {mostRanked.length >= MIN_ROW && <Row title="Most ranked" fragrances={mostRanked} />}
      </FragranceSearch>
    </main>
  );
}

function Row({ title, fragrances }: { title: string; fragrances: FragranceCardData[] }) {
  if (fragrances.length === 0) return null;
  const id = title.toLowerCase().replace(/\s+/g, "-");
  return (
    <section className="mt-10" aria-labelledby={id}>
      <div className={rowHeading}>
        <h2 id={id} className="text-base text-foreground">
          {title}
        </h2>
        <Link href="/fragrances" className="hover:text-foreground">
          All fragrances
        </Link>
      </div>
      <div className="mt-4">
        <FragranceRow fragrances={fragrances} />
      </div>
    </section>
  );
}
