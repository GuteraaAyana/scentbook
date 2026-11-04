import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { FollowButton } from "@/components/follow-button";
import { FragranceGrid, FragranceRow } from "@/components/fragrance-card";
import { Poster } from "@/components/poster";
import { WearEntry } from "@/components/wear-entry";
import { RankedList } from "@/components/ranked-list";
import { getPublicProfile } from "@/db/profiles";
import { auth } from "@/lib/auth";
import { pageContainer, primaryButton, secondaryButton } from "@/lib/ui";

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
  const session = await auth.api.getSession({ headers: await headers() });
  const profile = await getPublicProfile(username, session?.user.id);
  if (!profile) notFound();

  const { user, counts, follow, topRanked, shelf, mostWorn, recentWears, reviews } = profile;
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
          <p className="mt-2 flex gap-4 text-sm">
            <Link href={`/u/${user.username}/followers`} className="hover:underline hover:underline-offset-4">
              <b>{follow.followers}</b> <span className="text-muted">{follow.followers === 1 ? "follower" : "followers"}</span>
            </Link>
            <Link href={`/u/${user.username}/following`} className="hover:underline hover:underline-offset-4">
              <b>{follow.following}</b> <span className="text-muted">following</span>
            </Link>
          </p>
          {user.bio && <p className="mt-6 text-lg leading-relaxed">{user.bio}</p>}
        </div>
        {isOwner ? (
          <Link href="/settings" className={secondaryButton}>
            Edit profile
          </Link>
        ) : session ? (
          <FollowButton username={user.username!} initiallyFollowing={follow.viewerFollows} />
        ) : (
          <Link href={`/sign-in?next=/u/${user.username}`} className={primaryButton}>
            Follow
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

      {reviews.length > 0 && (
        <section className="mt-14" aria-labelledby="reviews-heading">
          <h2 id="reviews-heading" className="border-b border-line pb-2 text-base font-bold">
            Latest reviews
          </h2>
          <ul className="divide-y divide-line">
            {reviews.map((item) => (
              <li key={item.slug}>
                <Link
                  href={`/fragrances/${item.slug}#reviews-heading`}
                  className="group grid grid-cols-[2.75rem_minmax(0,1fr)] gap-3 py-4 sm:grid-cols-[3rem_minmax(0,1fr)] sm:gap-4"
                >
                  <Poster name={item.name} imageUrl={item.imageUrl} accords={item.accords} sizes="3rem" />
                  <span className="min-w-0">
                    <span className="font-bold group-hover:underline group-hover:underline-offset-4">{item.name}</span>
                    <span className="text-sm text-muted"> {item.brand}</span>
                    <span className="mt-1 line-clamp-3 block max-w-prose text-sm leading-relaxed text-muted">
                      {item.review.body}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {mostWorn.length > 0 && (
        <section className="mt-14" aria-labelledby="worn-heading">
          <h2 id="worn-heading" className="mb-4 border-b border-line pb-2 text-base font-bold">
            Most worn
          </h2>
          <FragranceRow fragrances={mostWorn} />
        </section>
      )}

      {recentWears.length > 0 && (
        <section className="mt-14" aria-labelledby="recent-heading">
          <h2 id="recent-heading" className="border-b border-line pb-2 text-base font-bold">
            Recent wears
          </h2>
          <ol className="divide-y divide-line">
            {recentWears.map((entry) => (
              <WearEntry key={entry.wearId} entry={entry} showMonth />
            ))}
          </ol>
        </section>
      )}

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
