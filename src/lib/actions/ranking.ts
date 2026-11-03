"use server";
// Server Actions for ranking. Like every Server Action they're public POST
// endpoints, so each checks the session and validates its input itself.
import { and, eq, inArray, TransactionRollbackError } from "drizzle-orm";
import { refresh, updateTag } from "next/cache";
import { headers } from "next/headers";
import { db } from "@/db";
import { getBucket, getUserRanking } from "@/db/rankings";
import { fragrances, rankings, sentimentEnum } from "@/db/schema";
import { auth } from "@/lib/auth";
import { keyBetween, renumberedKeys, type Sentiment } from "@/lib/ranking";

async function currentUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

const isSentiment = (value: unknown): value is Sentiment =>
  sentimentEnum.enumValues.includes(value as Sentiment);

// The other fragrances in a bucket, best first, for the "which do you
// prefer?" questions. The comparisons themselves happen in the browser.
export async function loadBucket(fragranceId: number, sentiment: Sentiment) {
  const userId = await currentUserId();
  if (!userId) return { error: "Sign in to rank fragrances.", bucket: [] };
  if (!Number.isInteger(fragranceId) || !isSentiment(sentiment)) return { error: "Unknown fragrance.", bucket: [] };

  const bucket = await getBucket(userId, sentiment, fragranceId);
  // Only what the comparison screen shows; sort keys stay on the server.
  return {
    error: null,
    bucket: bucket.map(({ id, name, brand, imageUrl, accords }) => ({ id, name, brand, imageUrl, accords })),
  };
}

// Save a fragrance's place: in `sentiment`, just below `aboveId` and just
// above `belowId` (either null at the ends of the list). Re-ranking an
// already ranked fragrance moves it.
export async function saveRanking(input: {
  fragranceId: number;
  sentiment: Sentiment;
  aboveId: number | null;
  belowId: number | null;
}) {
  const userId = await currentUserId();
  if (!userId) return { error: "Sign in to rank fragrances." };
  const { fragranceId, sentiment, aboveId, belowId } = input;
  const ids = [fragranceId, aboveId, belowId].filter((id) => id !== null);
  if (!isSentiment(sentiment) || !ids.every(Number.isInteger) || ids.length !== new Set(ids).size) {
    return { error: "Couldn't save that ranking." };
  }

  const [exists] = await db.select({ id: fragrances.id }).from(fragrances).where(eq(fragrances.id, fragranceId));
  if (!exists) return { error: "Unknown fragrance." };

  const result = await db.transaction(async (tx) => {
    const neighbours = [aboveId, belowId].filter((id) => id !== null);
    const keyOf = async () => {
      const rows = neighbours.length
        ? await tx
            .select({ id: rankings.fragranceId, sortKey: rankings.sortKey })
            .from(rankings)
            .where(
              and(
                eq(rankings.userId, userId),
                eq(rankings.sentiment, sentiment),
                inArray(rankings.fragranceId, neighbours),
              ),
            )
        : [];
      const keys = new Map(rows.map((r) => [r.id, r.sortKey]));
      if (keys.size !== neighbours.length) return "stale" as const; // list changed meanwhile
      const above = aboveId === null ? null : keys.get(aboveId)!;
      const below = belowId === null ? null : keys.get(belowId)!;
      if (above !== null && below !== null && above <= below) return "stale" as const;
      return keyBetween(above, below);
    };

    // Moving it: take it out of wherever it was first.
    await tx.delete(rankings).where(and(eq(rankings.userId, userId), eq(rankings.fragranceId, fragranceId)));

    let key = await keyOf();
    if (key === null) {
      // No room left between the neighbours' keys: space the bucket out again.
      const bucket = await tx
        .select({ id: rankings.fragranceId })
        .from(rankings)
        .where(and(eq(rankings.userId, userId), eq(rankings.sentiment, sentiment)))
        .orderBy(rankings.sortKey);
      const fresh = renumberedKeys(bucket.length).reverse(); // ascending, to match the order above
      for (const [i, row] of bucket.entries()) {
        await tx
          .update(rankings)
          .set({ sortKey: fresh[i] })
          .where(and(eq(rankings.userId, userId), eq(rankings.fragranceId, row.id)));
      }
      key = await keyOf();
    }
    if (key === "stale" || key === null) {
      tx.rollback(); // leaves the old ranking in place
    }

    await tx.insert(rankings).values({ userId, fragranceId, sentiment, sortKey: key as number });
    return "saved" as const;
  }).catch((error) => {
    // Our own rollback above; anything else is a real failure.
    if (error instanceof TransactionRollbackError) return "stale" as const;
    throw error;
  });

  if (result === "stale") return { error: "Your list changed while you were ranking. Please rank it again." };

  updateTag("rankings"); // community scores on cached pages include this ranking now
  refresh();
  return { error: null, ranking: await getUserRanking(userId, fragranceId) };
}

export async function removeRanking(fragranceId: number) {
  const userId = await currentUserId();
  if (!userId) return { error: "Sign in to rank fragrances." };
  if (!Number.isInteger(fragranceId)) return { error: "Unknown fragrance." };

  await db.delete(rankings).where(and(eq(rankings.userId, userId), eq(rankings.fragranceId, fragranceId)));
  updateTag("rankings");
  refresh();
  return { error: null };
}
