import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ScentCase } from "@/components/scent-case";
import { listRankings } from "@/db/rankings";
import { auth } from "@/lib/auth";
import { pageContainer, primaryButton } from "@/lib/ui";

export const metadata: Metadata = { title: "My rankings · Scentbook" };

const buckets = [
  { key: "loved", title: "Loved" },
  { key: "fine", title: "Fine" },
  { key: "disliked", title: "Didn't like" },
] as const;

export default function RankingsPage() {
  return (
    <main className={`${pageContainer} flex-1 py-12 sm:py-16`}>
      <h1 className="font-display text-4xl sm:text-5xl">My rankings</h1>
      <Suspense fallback={<p className="mt-3 text-muted">Loading your rankings…</p>}>
        <Rankings />
      </Suspense>
    </main>
  );
}

async function Rankings() {
  await connection();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in?next=/rankings");

  const ranked = await listRankings(session.user.id);

  if (ranked.length === 0) {
    return (
      <div className="mt-6 max-w-md">
        <p className="text-muted">
          You haven&rsquo;t ranked anything yet. Open a fragrance you&rsquo;ve tried and choose Rank it. After a
          few, you&rsquo;ll have your own list, best to worst, with a score out of 10 for each.
        </p>
        <Link href="/fragrances" className={`${primaryButton} mt-8`}>
          Browse fragrances
        </Link>
      </div>
    );
  }

  return (
    <>
      <p className="mt-3 text-muted">
        {ranked.length} ranked, best first. Scores come from where each one sits in your list.
      </p>
      {buckets.map((bucket) => {
        const items = ranked.filter((r) => r.sentiment === bucket.key);
        if (items.length === 0) return null;
        return (
          <section key={bucket.key} className="mt-12" aria-labelledby={`${bucket.key}-heading`}>
            <h2 id={`${bucket.key}-heading`} className="font-display border-b border-line pb-3 text-3xl">
              {bucket.title}
            </h2>
            {/* A real ranking, so a numbered list; numbers continue across buckets. */}
            <ol start={items[0].place} className="divide-y divide-line">
              {items.map((item) => (
                <li key={item.slug}>
                  <Link
                    href={`/fragrances/${item.slug}`}
                    className="group grid grid-cols-[2rem_4rem_1fr_auto] items-center gap-4 py-4 sm:grid-cols-[3rem_5rem_1fr_auto]"
                  >
                    <span className="font-display text-2xl text-muted">{item.place}</span>
                    <ScentCase
                      name={item.name}
                      imageUrl={item.imageUrl}
                      accords={item.accords}
                      sizes="5rem"
                      className="aspect-square"
                    />
                    <span className="min-w-0">
                      <span className="font-display block truncate text-xl group-hover:underline group-hover:underline-offset-4">
                        {item.name}
                      </span>
                      <span className="block truncate text-sm text-muted">{item.brand}</span>
                    </span>
                    <span className="font-display text-3xl" aria-label={`Score ${item.score} out of 10`}>
                      {item.score}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </>
  );
}
