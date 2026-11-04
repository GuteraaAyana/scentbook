import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FragranceGrid, FragranceGridSkeleton } from "@/components/fragrance-card";
import { listFragrances, PAGE_SIZE } from "@/db/fragrances";
import { pageContainer, secondaryButton } from "@/lib/ui";

export const metadata: Metadata = {
  title: "All fragrances · Scentbook",
  description: "Browse the Scentbook catalog: notes, accords and perfumers for every fragrance.",
};

// The heading is prerendered; the cards depend on ?page=, so they're read
// inside <Suspense> and stream in. Each page's data is cached.
export default function FragrancesPage(props: PageProps<"/fragrances">) {
  return (
    <main className={`${pageContainer} flex-1 py-8 sm:py-10`}>
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">All fragrances</h1>
      <Suspense
        fallback={
          <div className="mt-10">
            <FragranceGridSkeleton />
          </div>
        }
      >
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
      <p className="mt-6 text-muted">
        The catalog is empty. Run <code>npm run db:seed</code> to add fragrances.
      </p>
    );
  }

  const first = (page - 1) * PAGE_SIZE + 1;
  const last = first + fragrances.length - 1;

  return (
    <>
      <p className="mt-3 text-muted">
        {pageCount > 1 ? `Showing ${first} to ${last} of ${total}` : `${total} fragrances`}, sorted by brand
      </p>

      <div className="mt-10">
        <FragranceGrid fragrances={fragrances} aboveFold={6} />
      </div>

      {pageCount > 1 && (
        <nav aria-label="Pages" className="mt-14 flex items-center justify-between gap-4 border-t border-line pt-8">
          {page > 1 ? (
            <Link href={page === 2 ? "/fragrances" : `/fragrances?page=${page - 1}`} className={secondaryButton}>
              Previous page
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-muted">
            Page {page} of {pageCount}
          </span>
          {page < pageCount ? (
            <Link href={`/fragrances?page=${page + 1}`} className={secondaryButton}>
              Next page
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </>
  );
}
