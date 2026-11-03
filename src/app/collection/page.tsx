import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { FragranceGrid, FragranceGridSkeleton } from "@/components/fragrance-card";
import { SignOutButton } from "@/components/sign-out-button";
import { listCollection } from "@/db/collections";
import { auth } from "@/lib/auth";
import { pageContainer, primaryButton } from "@/lib/ui";

export const metadata: Metadata = { title: "My collection · Scentbook" };

// Each status is a shelf of its own.
const shelves = [
  { key: "have", title: "On my shelf", empty: "Fragrances you own will show up here." },
  { key: "want", title: "Wishlist", empty: "Fragrances you want will show up here." },
  { key: "had", title: "Used to own", empty: "Fragrances you've finished or given away will show up here." },
] as const;

export default function CollectionPage() {
  return (
    <main className={`${pageContainer} flex-1 py-12 sm:py-16`}>
      <h1 className="font-display text-4xl sm:text-5xl">My collection</h1>
      <Suspense
        fallback={
          <div className="mt-10">
            <FragranceGridSkeleton count={4} />
          </div>
        }
      >
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
  const counts = shelves.map((s) => collection[s.key].length);
  const account = (
    <p className="mt-3 text-sm text-muted">
      Signed in as {session.user.name}. <SignOutButton className="text-brass underline underline-offset-4" />
    </p>
  );

  if (counts.every((n) => n === 0)) {
    return (
      <div className="mt-6 max-w-md">
        {account}
        <p className="mt-6 text-muted">
          Nothing here yet. Open any fragrance and choose Have it, Want it or Had it to put it on a shelf.
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
        {counts[0]} owned, {counts[1]} wanted, {counts[2]} used to own
      </p>
      {account}
      {shelves.map((shelf) => (
        <section key={shelf.key} className="mt-14" aria-labelledby={`${shelf.key}-heading`}>
          <h2 id={`${shelf.key}-heading`} className="font-display mb-6 border-b border-line pb-3 text-3xl">
            {shelf.title}
          </h2>
          {collection[shelf.key].length > 0 ? (
            <FragranceGrid fragrances={collection[shelf.key]} />
          ) : (
            <p className="text-sm text-muted">{shelf.empty}</p>
          )}
        </section>
      ))}
    </>
  );
}
