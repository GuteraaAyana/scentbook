import { headers } from "next/headers";
import Link from "next/link";
import { connection } from "next/server";
import { getFeed } from "@/db/follows";
import { auth } from "@/lib/auth";
import { rowHeading } from "@/lib/ui";
import { FeedEntry } from "./people";

// "From people you follow" on the home page: the latest few feed items. Per
// visitor, so the home page renders it per request inside <Suspense> while
// the rest stays prerendered. Shows nothing until you follow someone active.
export async function HomeFeed() {
  await connection();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const { items } = await getFeed(session.user.id, 4);
  if (items.length === 0) return null;

  return (
    <section className="mt-10" aria-labelledby="following-heading">
      <div className={rowHeading}>
        <h2 id="following-heading" className="text-base text-foreground">
          From people you follow
        </h2>
        <Link href="/feed" className="hover:text-foreground">
          Full feed
        </Link>
      </div>
      <ol className="divide-y divide-line sm:grid sm:grid-cols-2 sm:gap-x-8 sm:divide-y-0">
        {items.map((item) => (
          <FeedEntry key={item.key} item={item} />
        ))}
      </ol>
    </section>
  );
}
