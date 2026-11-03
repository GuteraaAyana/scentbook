import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { FragranceGrid } from "@/components/fragrance-card";
import { RankedList } from "@/components/ranked-list";
import { getPublicProfile } from "@/db/profiles";
import { auth } from "@/lib/auth";
import { pageContainer, secondaryButton } from "@/lib/ui";

export async function generateMetadata(props: PageProps<"/u/[username]">): Promise<Metadata> {
  const { username } = await props.params;
  return { title: `@${username.toLowerCase()} · Scentbook` };
}

// Public: anyone can view a profile. It changes whenever its owner ranks or
// collects something, so it's rendered per request inside <Suspense>.
export default function ProfilePage(props: PageProps<"/u/[username]">) {
  return (
    <main className={`${pageContainer} flex-1 py-8 sm:py-10`}>
      <Suspense fallback={<div className="h-24 w-2/3 animate-pulse rounded bg-surface" aria-label="Loading profile" />}>
        <Profile params={props.params} />
      </Suspense>
    </main>
  );
}

const joinedFormat = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" });

async function Profile({ params }: Pick<PageProps<"/u/[username]">, "params">) {
  await connection();
  const { username } = await params;
  const [profile, session] = await Promise.all([
    getPublicProfile(username),
    auth.api.getSession({ headers: await headers() }),
  ]);
  if (!profile) notFound();

  const { user, counts, topRanked, shelf } = profile;
  const isOwner = session?.user.username === user.username;
  const firstName = user.name.split(" ")[0];

  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">{user.name}</h1>
          <p className="mt-2 text-muted">
            @{user.username}, joined {joinedFormat.format(user.joined)}
          </p>
          {user.bio && <p className="mt-6 text-lg leading-relaxed">{user.bio}</p>}
        </div>
        {isOwner && (
          <Link href="/settings" className={secondaryButton}>
            Edit profile
          </Link>
        )}
      </header>

      <dl className="mt-10 grid max-w-md grid-cols-3 gap-6 border-y border-line py-6">
        {[
          { label: "Owned", value: counts.owned },
          { label: "Wanted", value: counts.wanted },
          { label: "Ranked", value: counts.ranked },
        ].map((stat) => (
          <div key={stat.label}>
            <dt className="text-sm text-muted">{stat.label}</dt>
            <dd className="mt-1 text-4xl font-extrabold">{stat.value}</dd>
          </div>
        ))}
      </dl>

      <section className="mt-14" aria-labelledby="top-heading">
        <h2 id="top-heading" className="border-b border-line pb-2 text-base font-bold">
          Top ranked
        </h2>
        {topRanked.length > 0 ? (
          <RankedList items={topRanked} />
        ) : (
          <p className="mt-4 text-sm text-muted">
            {isOwner ? "Rank a few fragrances and your favourites will show here." : `${firstName} hasn't ranked anything yet.`}
          </p>
        )}
      </section>

      <section className="mt-14" aria-labelledby="shelf-heading">
        <h2 id="shelf-heading" className="mb-4 border-b border-line pb-2 text-base font-bold">
          On {isOwner ? "your" : "their"} shelf
        </h2>
        {shelf.length > 0 ? (
          <FragranceGrid fragrances={shelf} />
        ) : (
          <p className="text-sm text-muted">
            {isOwner ? "Mark fragrances as Have it and they'll show here." : `${firstName} hasn't added any yet.`}
          </p>
        )}
      </section>
    </>
  );
}
