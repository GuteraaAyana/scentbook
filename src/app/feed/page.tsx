import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { FeedEntry } from "@/components/people";
import { getFeed } from "@/db/follows";
import { auth } from "@/lib/auth";
import { pageContainer, primaryButton } from "@/lib/ui";

export const metadata: Metadata = { title: "Feed · Scentbook" };

export default function FeedPage() {
  return (
    <main className={`${pageContainer} flex-1 py-8 sm:py-10`}>
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Feed</h1>
      <Suspense fallback={<p className="mt-3 text-muted">Loading…</p>}>
        <Feed />
      </Suspense>
    </main>
  );
}

async function Feed() {
  await connection();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in?next=/feed");

  const { followsAnyone, items } = await getFeed(session.user.id, 60);

  if (!followsAnyone || items.length === 0) {
    return (
      <div className="mt-6 max-w-md">
        <p className="text-muted">
          {followsAnyone
            ? "The people you follow haven't done anything yet. Their rankings, wears and reviews will show up here."
            : "Follow people to see what they rank, wear and review."}
        </p>
        <Link href="/people" className={`${primaryButton} mt-6`}>
          Find people
        </Link>
      </div>
    );
  }

  return (
    <>
      <p className="mt-2 text-muted">What the people you follow have been ranking, wearing and reviewing.</p>
      <ol className="mt-4 max-w-2xl divide-y divide-line">
        {items.map((item) => (
          <FeedEntry key={item.key} item={item} />
        ))}
      </ol>
    </>
  );
}
