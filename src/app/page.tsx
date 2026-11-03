import Link from "next/link";
import { FragranceCard } from "@/components/fragrance-card";
import { listFeaturedFragrances, listFragrances } from "@/db/fragrances";
import { pageContainer, primaryButton, secondaryButton } from "@/lib/ui";

// Fully prerendered: the catalog data is cached, and nothing here depends on
// who's visiting.
export default async function Home() {
  const [featured, { total }] = await Promise.all([listFeaturedFragrances(5), listFragrances(1)]);

  return (
    <main className="flex-1">
      <section className={`${pageContainer} pt-16 pb-12 sm:pt-24`}>
        <h1 className="font-display max-w-3xl text-5xl leading-[1.05] sm:text-7xl">
          Every scent you&rsquo;ve worn, in one place.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
          Browse {total} fragrances by their notes and accords, keep track of what you own and what
          you want, and rank what you&rsquo;ve tried.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/fragrances" className={primaryButton}>
            Browse fragrances
          </Link>
          <Link href="/collection" className={secondaryButton}>
            Start your collection
          </Link>
        </div>
      </section>

      {/* The shelf: a row of lit display cases. Scrolls sideways on phones. */}
      {featured.length > 0 && (
        <section aria-labelledby="shelf-heading" className="pb-20">
          <div className={pageContainer}>
            <h2 id="shelf-heading" className="sr-only">
              Featured fragrances
            </h2>
          </div>
          <ul
            className={`${pageContainer} flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 sm:grid sm:grid-cols-5 sm:gap-6 sm:overflow-visible`}
          >
            {featured.map((fragrance) => (
              <li key={fragrance.slug} className="w-[42vw] shrink-0 snap-start sm:w-auto">
                <FragranceCard fragrance={fragrance} />
              </li>
            ))}
          </ul>
          <div className={pageContainer}>
            <div className="h-px bg-gradient-to-r from-transparent via-line-strong to-transparent" aria-hidden="true" />
          </div>
        </section>
      )}
    </main>
  );
}
