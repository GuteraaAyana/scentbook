import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getFragranceBySlug, getFragranceSlugs } from "@/db/fragrances";
import { concentrationLabels, genderLabels } from "@/lib/labels";

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

const layers = [
  { key: "top", label: "Top", hint: "First impression, fades within the hour" },
  { key: "heart", label: "Heart", hint: "The main character, for a few hours" },
  { key: "base", label: "Base", hint: "What lingers on skin at the end" },
] as const;

// The page shell renders immediately; the fragrance itself streams in inside
// <Suspense>, which is where `params` is read (see the ISR with Cache
// Components guide in the Next.js docs).
export default function FragrancePage(props: PageProps<"/fragrances/[slug]">) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
      <Link
        href="/fragrances"
        className="text-sm text-neutral-500 hover:text-foreground"
      >
        &larr; All fragrances
      </Link>
      <Suspense fallback={<FragranceSkeleton />}>
        <FragranceDetails params={props.params} />
      </Suspense>
    </main>
  );
}

async function FragranceDetails({
  params,
}: Pick<PageProps<"/fragrances/[slug]">, "params">) {
  const { slug } = await params;
  const fragrance = await getFragranceBySlug(slug);
  if (!fragrance) notFound();

  const details = [
    fragrance.releaseYear,
    concentrationLabels[fragrance.concentration],
    genderLabels[fragrance.gender],
  ].filter(Boolean);

  return (
    <article className="mt-6">
      <header>
        <p className="text-sm font-medium uppercase tracking-widest text-neutral-500">
          {fragrance.brand.name}
        </p>
        <h1 className="mt-1 text-4xl font-semibold tracking-tight sm:text-5xl">
          {fragrance.name}
        </h1>
        <p className="mt-3 text-neutral-600 dark:text-neutral-400">
          {details.join(" · ")}
        </p>
        {fragrance.perfumers.length > 0 && (
          <p className="mt-1 text-sm text-neutral-500">
            By {fragrance.perfumers.map((p) => p.name).join(", ")}
          </p>
        )}
        {fragrance.description && (
          <p className="mt-6 leading-relaxed">{fragrance.description}</p>
        )}
      </header>

      <section className="mt-12" aria-labelledby="accords-heading">
        <h2 id="accords-heading" className="text-lg font-semibold">
          Main accords
        </h2>
        <ul className="mt-4 space-y-2">
          {fragrance.accords.map((accord) => (
            <li
              key={accord.name}
              className="grid grid-cols-[7.5rem_1fr] items-center gap-3 text-sm sm:grid-cols-[9rem_1fr]"
            >
              <span>{accord.name}</span>
              <span
                className="h-3 rounded-full bg-neutral-100 dark:bg-neutral-800"
                role="meter"
                aria-label={`${accord.name} strength`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={accord.strength}
              >
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${accord.strength}%`,
                    backgroundColor: accord.color,
                  }}
                />
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12" aria-labelledby="notes-heading">
        <h2 id="notes-heading" className="text-lg font-semibold">
          Notes
        </h2>
        <dl className="mt-4 divide-y divide-neutral-200 border-y border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {layers.map((layer) => (
            <div
              key={layer.key}
              className="grid gap-2 py-4 sm:grid-cols-[9rem_1fr] sm:gap-3"
            >
              <dt>
                <span className="font-medium">{layer.label}</span>
                <span className="block text-xs text-neutral-500">
                  {layer.hint}
                </span>
              </dt>
              <dd className="flex flex-wrap gap-2">
                {fragrance.notes[layer.key].length > 0 ? (
                  fragrance.notes[layer.key].map((note) => (
                    <span
                      key={note.slug}
                      className="rounded-full border border-neutral-300 px-3 py-1 text-sm dark:border-neutral-700"
                    >
                      {note.name}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-neutral-500">None listed</span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </article>
  );
}

function FragranceSkeleton() {
  return (
    <div className="mt-6 animate-pulse" aria-busy="true" aria-label="Loading fragrance">
      <div className="h-4 w-32 rounded bg-neutral-200 dark:bg-neutral-800" />
      <div className="mt-3 h-10 w-2/3 rounded bg-neutral-200 dark:bg-neutral-800" />
      <div className="mt-4 h-4 w-48 rounded bg-neutral-200 dark:bg-neutral-800" />
      <div className="mt-12 space-y-3">
        {[90, 70, 55, 40, 30].map((w) => (
          <div
            key={w}
            className="h-3 rounded-full bg-neutral-200 dark:bg-neutral-800"
            style={{ width: `${w}%` }}
          />
        ))}
      </div>
    </div>
  );
}
