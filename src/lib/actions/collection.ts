"use server";
// Server Actions for the collection buttons. Anyone can call a Server Action
// with any arguments (it's a public POST endpoint), so each one checks who is
// signed in and validates its input itself.
import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { headers } from "next/headers";
import { db } from "@/db";
import { COLLECTION_STATUSES, type CollectionStatus } from "@/db/collections";
import { collectionItems, fragrances } from "@/db/schema";
import { auth } from "@/lib/auth";

// Put a fragrance in the signed-in user's collection with this status, or
// take it out with `null`.
export async function setCollectionStatus(fragranceId: number, status: CollectionStatus | null) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { error: "Sign in to save fragrances to your collection." };

  if (!Number.isInteger(fragranceId)) return { error: "Unknown fragrance." };
  if (status !== null && !COLLECTION_STATUSES.includes(status)) return { error: "Unknown status." };
  const userId = session.user.id;

  if (status === null) {
    await db
      .delete(collectionItems)
      .where(and(eq(collectionItems.userId, userId), eq(collectionItems.fragranceId, fragranceId)));
  } else {
    const [exists] = await db
      .select({ id: fragrances.id })
      .from(fragrances)
      .where(eq(fragrances.id, fragranceId));
    if (!exists) return { error: "Unknown fragrance." };

    await db
      .insert(collectionItems)
      .values({ userId, fragranceId, status })
      .onConflictDoUpdate({
        target: [collectionItems.userId, collectionItems.fragranceId],
        // Moving between have/want/had counts as a fresh add, for "newest first".
        set: { status, addedAt: new Date() },
      });
  }

  refresh(); // re-render the page so the My collection link and lists are current
  return { error: null };
}
