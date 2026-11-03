import { headers } from "next/headers";
import Link from "next/link";
import { connection } from "next/server";
import { getCollectionStatus } from "@/db/collections";
import { auth } from "@/lib/auth";
import { CollectionButtons } from "./collection-buttons";

// The have / want / had buttons on a fragrance page. They depend on who's
// signed in, so the page renders this per request inside <Suspense>, while
// the rest of the page stays cached.
export async function CollectionControl({ fragranceId, slug }: { fragranceId: number; slug: string }) {
  await connection();
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return (
      <p className="text-sm text-muted">
        <Link href={`/sign-in?next=/fragrances/${slug}`} className="text-brass underline underline-offset-4">
          Sign in
        </Link>{" "}
        to add this to your collection.
      </p>
    );
  }

  const status = await getCollectionStatus(session.user.id, fragranceId);
  return <CollectionButtons fragranceId={fragranceId} initialStatus={status} />;
}

export function CollectionControlSkeleton() {
  return <div className="h-10 w-72 animate-pulse rounded-full bg-surface" />;
}
