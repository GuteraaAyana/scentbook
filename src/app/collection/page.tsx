import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { FragranceGrid } from "@/components/fragrance-card";
import { listCollection } from "@/db/collections";
import { auth } from "@/lib/auth";

export const metadata: Metadata = { title: "My collection · Scentbook" };

const sections = [
  { key: "have", title: "Have", empty: "Fragrances you own will show up here." },
  { key: "want", title: "Want", empty: "Your wishlist is empty." },
  { key: "had", title: "Had", empty: "Fragrances you used to own will show up here." },
] as const;

export default function CollectionPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
      <h1 className="text-4xl font-semibold tracking-tight">My collection</h1>
      <Suspense fallback={<p className="mt-2 text-muted">Loading…</p>}>
        <Collection />
      </Suspense>
    </main>
  );
}

async function Collection() {
  await connection();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in?next=/collection");

  const collection = await listCollection(session.user.id);
  const total = collection.have.length + collection.want.length + collection.had.length;

  if (total === 0) {
    return (
      <div className="mt-6">
        <p className="text-muted">
          Nothing here yet. Open any fragrance and choose Have it, Want it or Had it.
        </p>
        <Link
          href="/fragrances"
          className="mt-6 inline-flex h-11 items-center rounded-full bg-foreground px-5 font-medium text-background transition-opacity hover:opacity-85"
        >
          Browse fragrances
        </Link>
      </div>
    );
  }

  return (
    <>
      <p className="mt-2 text-muted">
        {collection.have.length} owned · {collection.want.length} wanted · {collection.had.length} used to own
      </p>
      {sections.map((section) => (
        <section key={section.key} className="mt-12" aria-labelledby={`${section.key}-heading`}>
          <h2 id={`${section.key}-heading`} className="mb-4 text-xl font-semibold">
            {section.title} <span className="font-normal text-muted">({collection[section.key].length})</span>
          </h2>
          {collection[section.key].length > 0 ? (
            <FragranceGrid fragrances={collection[section.key]} />
          ) : (
            <p className="text-sm text-muted">{section.empty}</p>
          )}
        </section>
      ))}
    </>
  );
}
