import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CollectionControl, CollectionControlSkeleton } from "@/components/collection-control";
import { AccordBars, NoteTags } from "@/components/fragrance-profile";
import { RankingControl, RankingControlSkeleton } from "@/components/ranking-control";
import { Poster } from "@/components/poster";
import { getFragranceBySlug, getFragranceSlugs } from "@/db/fragrances";
import { concentrationLabels, genderLabels } from "@/lib/labels";
import { pageContainer } from "@/lib/ui";
import { accordWash } from "@/lib/wash";
import { describeUnfolding } from "@/lib/writing";

// Prerender every fragrance in the catalog at build time. Slugs added later
// are rendered on their first visit and cached from then on.
export async function generateStaticParams() {
  const slugs = await getFragranceSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata(
  props: PageProps<"/fragrances/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const fragrance = await getFragranceBySlug(slug);
  if (!fragrance) return { title: "Fragrance not found · Scentbook" };
  return {
    title: `${fragrance.name} by ${fragrance.brand.name} · Scentbook`,
    description: `Notes, accords and perfumers for ${fragrance.brand.name} ${fragrance.name}.`,
  };
}

// The page shell renders immediately; the fragrance itself streams in inside
// <Suspense>, which is where `params` is read (see the ISR with Cache
// Components guide in the Next.js docs).
export default function FragrancePage(props: PageProps<"/fragrances/[slug]">) {
  return (
    <main className="flex-1">
      <Suspense fallback={<FragranceSkeleton />}>
        <FragranceDetails params={props.params} />
      </Suspense>
    </main>
  );
}

async function FragranceDetails({ params }: Pick<PageProps<"/fragrances/[slug]">, "params">) {
  const { slug } = await params;
  const fragrance = await getFragranceBySlug(slug);
  if (!fragrance) notFound();

  const perfumers = fragrance.perfumers.map((p) => p.name).join(" and ");
  const byline = [fragrance.brand.name, fragrance.releaseYear].filter(Boolean).join(", ");
  const details = [concentrationLabels[fragrance.concentration], genderLabels[fragrance.gender].toLowerCase()]
    .filter(Boolean)
    .join(", ");
  const unfolding = describeUnfolding({
    top: fragrance.notes.top.map((n) => n.name),
    heart: fragrance.notes.heart.map((n) => n.name),
    base: fragrance.notes.base.map((n) => n.name),
  });
  const community = fragrance.community;

  return (
    <article>
      {/* The hero sits on a faint wash of the fragrance's own accord colours. */}
      <div className="relative">
        <div aria-hidden="true" className="absolute inset-0 opacity-25" style={accordWash(fragrance.accords)} />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
        <div
          className={`${pageContainer} relative grid grid-cols-[7rem_minmax(0,1fr)] gap-x-5 gap-y-6 py-8 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-x-8 sm:py-10 lg:grid-cols-[13rem_minmax(0,1fr)_15rem]`}
        >
          <Poster
            name={fragrance.name}
            imageUrl={fragrance.imageUrl}
            accords={fragrance.accords}
            priority
            sizes="(min-width: 1024px) 13rem, (min-width: 640px) 11rem, 7rem"
            className="self-start sm:row-span-2"
          />

          <div className="min-w-0">
            <Link href="/fragrances" className="text-sm font-bold text-muted hover:text-foreground">
              Fragrances
            </Link>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-5xl">{fragrance.name}</h1>
            <p className="mt-2 text-muted">
              {byline}
              {perfumers && <>, by {perfumers}</>}
            </p>
            {details && <p className="text-sm text-muted">{details}</p>}
            {fragrance.description && <p className="mt-4 max-w-prose text-lg leading-relaxed">{fragrance.description}</p>}
          </div>

          {/* Under the title beside the poster; full width under it on phones. */}
          <div className="col-span-2 flex flex-wrap items-start gap-x-6 gap-y-3 sm:col-span-1 sm:col-start-2">
            <Actions fragrance={fragrance} />
          </div>

          <aside
            aria-label="Community"
            className="col-span-2 rounded-lg bg-surface p-4 text-sm lg:col-span-1 lg:col-start-3 lg:row-span-2 lg:row-start-1 lg:self-start"
          >
            {community ? (
              <>
                <p className="text-muted">Community score</p>
                <p className="text-4xl font-extrabold text-gold">{community.score}</p>
                <p className="text-muted">
                  from {community.rankedBy} {community.rankedBy === 1 ? "ranking" : "rankings"}
                </p>
                <p className="mt-4 text-muted">Loved by {Math.round(community.lovedShare * 100)}%</p>
                <div className="mt-1.5 h-1.5 rounded-full bg-raised">
                  <div className="h-full rounded-full bg-gold" style={{ width: `${community.lovedShare * 100}%` }} />
                </div>
              </>
            ) : (
              <>
                <p className="font-bold">No community score yet</p>
                <p className="mt-1 text-muted">Rank it and yours will be the first.</p>
              </>
            )}
          </aside>
        </div>
      </div>

      <div className={`${pageContainer} grid gap-10 pb-14 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-14`}>
        <section aria-labelledby="unfolds-heading">
          <h2 id="unfolds-heading" className="border-b border-line pb-2 text-sm font-bold text-muted">
            How it unfolds
          </h2>
          {unfolding && <p className="mt-4 max-w-prose text-lg leading-relaxed">{unfolding}</p>}
          <div className="mt-6">
            <NoteTags notes={fragrance.notes} />
          </div>
        </section>

        <section aria-labelledby="accords-heading">
          <h2 id="accords-heading" className="border-b border-line pb-2 text-sm font-bold text-muted">
            Accords, strongest first
          </h2>
          <div className="mt-4">
            <AccordBars accords={fragrance.accords} />
          </div>
        </section>
      </div>
    </article>
  );
}

// Your buttons for this fragrance: rank it, and have / want / had. Both read
// your session, so they render per request inside <Suspense>.
function Actions({ fragrance }: { fragrance: NonNullable<Awaited<ReturnType<typeof getFragranceBySlug>>> }) {
  return (
    <>
      <Suspense fallback={<RankingControlSkeleton />}>
        <RankingControl
          fragrance={{
            id: fragrance.id,
            slug: fragrance.slug,
            name: fragrance.name,
            brand: fragrance.brand.name,
            imageUrl: fragrance.imageUrl,
            accords: fragrance.accords.slice(0, 3),
          }}
        />
      </Suspense>
      <Suspense fallback={<CollectionControlSkeleton />}>
        <CollectionControl fragranceId={fragrance.id} />
      </Suspense>
    </>
  );
}

function FragranceSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading fragrance" className={`${pageContainer} grid grid-cols-[7rem_1fr] gap-5 py-8 sm:grid-cols-[11rem_1fr] sm:gap-8 lg:grid-cols-[13rem_1fr]`}>
      <div className="aspect-[2/3] animate-pulse rounded-md bg-surface" />
      <div>
        <div className="h-4 w-24 animate-pulse rounded bg-surface" />
        <div className="mt-3 h-10 w-3/4 animate-pulse rounded bg-surface" />
        <div className="mt-3 h-4 w-1/2 animate-pulse rounded bg-surface" />
      </div>
    </div>
  );
}
