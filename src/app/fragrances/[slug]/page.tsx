import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CollectionControl, CollectionControlSkeleton } from "@/components/collection-control";
import { AccordBars, NoteTimeline } from "@/components/fragrance-profile";
import { RankingControl, RankingControlSkeleton } from "@/components/ranking-control";
import { ScentCase } from "@/components/scent-case";
import { getFragranceBySlug, getFragranceSlugs } from "@/db/fragrances";
import { concentrationLabels, genderLabels } from "@/lib/labels";
import { pageContainer } from "@/lib/ui";

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
    <main className={`${pageContainer} flex-1 py-8 sm:py-12`}>
      <Link href="/fragrances" className="text-sm text-muted transition-colors hover:text-foreground">
        All fragrances
      </Link>
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

  const facts = [
    { label: "Released", value: fragrance.releaseYear },
    { label: "Concentration", value: concentrationLabels[fragrance.concentration] },
    { label: "Marketed as", value: genderLabels[fragrance.gender] },
    {
      label: fragrance.perfumers.length > 1 ? "Perfumers" : "Perfumer",
      value: fragrance.perfumers.map((p) => p.name).join(", "),
    },
  ].filter((fact) => fact.value);

  return (
    <article className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
      <div className="lg:sticky lg:top-8 lg:self-start">
        <ScentCase
          name={fragrance.name}
          imageUrl={fragrance.imageUrl}
          accords={fragrance.accords}
          priority
          sizes="(min-width: 1024px) 40vw, 100vw"
          className="aspect-square lg:aspect-[4/5]"
        />
      </div>

      <div>
        <p className="text-muted">{fragrance.brand.name}</p>
        <h1 className="font-display mt-2 text-5xl leading-[1.05] sm:text-6xl">{fragrance.name}</h1>
        {fragrance.description && <p className="mt-6 max-w-prose leading-relaxed">{fragrance.description}</p>}

        {facts.length > 0 && (
          <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 border-y border-line py-6 sm:grid-cols-4">
            {facts.map((fact) => (
              <div key={fact.label} className={fact.label.startsWith("Perfumer") ? "col-span-2 sm:col-span-1" : ""}>
                <dt className="text-sm text-muted">{fact.label}</dt>
                <dd className="mt-1">{fact.value}</dd>
              </div>
            ))}
          </dl>
        )}

        <div className="mt-8">
          <Suspense fallback={<CollectionControlSkeleton />}>
            <CollectionControl fragranceId={fragrance.id} slug={fragrance.slug} />
          </Suspense>
        </div>

        <section className="mt-6 border-t border-line pt-6" aria-label="Your ranking">
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
        </section>

        <section className="mt-14" aria-labelledby="accords-heading">
          <h2 id="accords-heading" className="font-display text-3xl">
            Accords
          </h2>
          <p className="mt-1 mb-6 text-sm text-muted">The overall character, strongest first.</p>
          <AccordBars accords={fragrance.accords} />
        </section>

        <section className="mt-14" aria-labelledby="notes-heading">
          <h2 id="notes-heading" className="font-display text-3xl">
            Notes
          </h2>
          <p className="mt-1 mb-8 text-sm text-muted">How it changes on skin, from the first spray to the dry-down.</p>
          <NoteTimeline notes={fragrance.notes} />
        </section>
      </div>
    </article>
  );
}

function FragranceSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading fragrance" className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
      <div className="aspect-square animate-pulse rounded-md bg-surface lg:aspect-[4/5]" />
      <div>
        <div className="h-5 w-32 animate-pulse rounded bg-surface" />
        <div className="mt-4 h-14 w-3/4 animate-pulse rounded bg-surface" />
        <div className="mt-8 h-20 animate-pulse rounded bg-surface" />
      </div>
    </div>
  );
}
