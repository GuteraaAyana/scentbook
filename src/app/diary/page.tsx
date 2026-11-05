import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { WearEntry } from "@/components/wear-entry";
import { isUnit } from "@/lib/temperature";
import { listWears } from "@/db/wears";
import { auth } from "@/lib/auth";
import { pageContainer, primaryButton } from "@/lib/ui";
import { groupByMonth } from "@/lib/wear";

export const metadata: Metadata = { title: "My diary · Scentbook" };

export default function DiaryPage() {
  return (
    <main className={`${pageContainer} flex-1 py-8 sm:py-10`}>
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">My diary</h1>
      <Suspense fallback={<p className="mt-3 text-muted">Loading your diary…</p>}>
        <Diary />
      </Suspense>
    </main>
  );
}

async function Diary() {
  await connection();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in?next=/diary");

  const entries = await listWears(session.user.id);
  const unit = isUnit(session.user.temperatureUnit) ? session.user.temperatureUnit : "c";

  if (entries.length === 0) {
    return (
      <div className="mt-6 max-w-md">
        <p className="text-muted">
          Nothing logged yet. Open the fragrance you&rsquo;re wearing and choose Log a wear: the date, the
          occasion, the weather, and whether anyone noticed.
        </p>
        <Link href="/fragrances" className={`${primaryButton} mt-6`}>
          Browse fragrances
        </Link>
      </div>
    );
  }

  const fragrancesWorn = new Set(entries.map((e) => e.slug)).size;
  const compliments = entries.reduce((sum, e) => sum + e.compliments, 0);

  return (
    <>
      <dl className="mt-6 grid max-w-md grid-cols-3 gap-4 rounded-lg bg-surface p-4">
        {[
          { label: "Wears", value: entries.length },
          { label: "Fragrances", value: fragrancesWorn },
          { label: "Compliments", value: compliments },
        ].map((stat) => (
          <div key={stat.label}>
            <dt className="text-sm text-muted">{stat.label}</dt>
            <dd className="text-2xl font-extrabold">{stat.value}</dd>
          </div>
        ))}
      </dl>

      {groupByMonth(entries).map((month) => (
        <section key={month.label} className="mt-10" aria-label={month.label}>
          <h2 className="border-b border-line pb-2 text-base font-bold">{month.label}</h2>
          <ol className="divide-y divide-line">
            {month.items.map((entry) => (
              <WearEntry key={entry.wearId} entry={entry} unit={unit} editable />
            ))}
          </ol>
        </section>
      ))}
    </>
  );
}
