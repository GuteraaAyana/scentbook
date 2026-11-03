import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { RankedList } from "@/components/ranked-list";
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
    <main className={`${pageContainer} flex-1 py-8 sm:py-10`}>
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">My rankings</h1>
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
            <h2 id={`${bucket.key}-heading`} className="border-b border-line pb-2 text-base font-bold">
              {bucket.title}
            </h2>
            <RankedList items={items} />
          </section>
        );
      })}
    </>
  );
}
