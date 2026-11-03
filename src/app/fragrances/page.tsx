import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FragranceGrid } from "@/components/fragrance-card";
import { listFragrances, PAGE_SIZE } from "@/db/fragrances";

export const metadata: Metadata = {
  title: "All fragrances · Scentbook",
  description: "Browse the Scentbook catalog: notes, accords and perfumers for every fragrance.",
};

// The heading is prerendered; the cards depend on ?page=, so they're read
// inside <Suspense> and stream in. Each page's data is cached.
export default function FragrancesPage(props: PageProps<"/fragrances">) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
      <h1 className="text-4xl font-semibold tracking-tight">All fragrances</h1>
      <Suspense fallback={<GridSkeleton />}>
        <CatalogPage searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}

async function CatalogPage({ searchParams }: Pick<PageProps<"/fragrances">, "searchParams">) {
  const raw = (await searchParams).page;
  const page = Number(typeof raw === "string" ? raw : "1");
  if (!Number.isInteger(page) || page < 1) notFound();

  const { fragrances, total, pageCount } = await listFragrances(page);
  if (page > pageCount) notFound();

  if (total === 0) {
    return (
      <p className="mt-10 text-muted">
        The catalog is empty. Run <code className="font-mono">npm run db:seed</code> to add fragrances.
      </p>
    );
  }

  const first = (page - 1) * PAGE_SIZE + 1;
  const last = first + fragrances.length - 1;

  return (
    <>
      <p className="mt-2 text-muted">
        {pageCount > 1 ? `${first}–${last} of ${total} fragrances` : `${total} fragrances`}
      </p>

      <div className="mt-10">
        <FragranceGrid fragrances={fragrances} />
      </div>

      {pageCount > 1 && (
        <nav aria-label="Pages" className="mt-10 flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link href={page === 2 ? "/fragrances" : `/fragrances?page=${page - 1}`} className={pagerLink}>
              &larr; Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-muted">
            Page {page} of {pageCount}
          </span>
          {page < pageCount ? (
            <Link href={`/fragrances?page=${page + 1}`} className={pagerLink}>
              Next &rarr;
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </>
  );
}

const pagerLink =
  "rounded-full border border-neutral-300 px-4 py-2 transition-colors hover:border-foreground dark:border-neutral-700";

function GridSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading fragrances">
      <div className="mt-3 h-4 w-40 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-36 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-900" />
        ))}
      </div>
    </div>
  );
}
