import { headers } from "next/headers";
import { connection } from "next/server";
import { getCollectionStatus } from "@/db/collections";
import { auth } from "@/lib/auth";
import { CollectionButtons } from "./collection-buttons";

// The have / want / had buttons on a fragrance page. They depend on who's
// signed in, so the page renders this per request inside <Suspense>, while
// the rest of the page stays cached.
export async function CollectionControl({ fragranceId }: { fragranceId: number }) {
  await connection();
  const session = await auth.api.getSession({ headers: await headers() });

  // Signed out: the ranking control beside this already asks you to sign in.
  if (!session) return null;

  const status = await getCollectionStatus(session.user.id, fragranceId);
  return <CollectionButtons fragranceId={fragranceId} initialStatus={status} />;
}

// Nothing while loading: the ranking placeholder beside it holds the row's
// height, and extra placeholders would wrap on phones and then collapse.
export function CollectionControlSkeleton() {
  return null;
}
