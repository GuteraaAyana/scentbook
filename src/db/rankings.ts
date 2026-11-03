// Reads for a user's rankings. Per user and changing with every ranking, so
// never cached. Scores are worked out here from positions (src/lib/ranking.ts).
import { and, asc, count, desc, eq, gt, ne } from "drizzle-orm";
import { scoreFor, type Sentiment } from "@/lib/ranking";
import { db } from ".";
import { cardColumns, withTopAccords } from "./fragrances";
import { brands, fragrances, rankings } from "./schema";

// One bucket of this user's rankings, best first, as fragrance cards with
// their sort keys. `excluding` leaves out the fragrance being (re)placed.
export async function getBucket(userId: string, sentiment: Sentiment, excluding?: number) {
  const rows = await db
    .select({ ...cardColumns, sortKey: rankings.sortKey })
    .from(rankings)
    .innerJoin(fragrances, eq(fragrances.id, rankings.fragranceId))
    .innerJoin(brands, eq(brands.id, fragrances.brandId))
    .where(
      and(
        eq(rankings.userId, userId),
        eq(rankings.sentiment, sentiment),
        excluding === undefined ? undefined : ne(rankings.fragranceId, excluding),
      ),
    )
    .orderBy(desc(rankings.sortKey));
  return withTopAccords(rows);
}

// Where this user ranked one fragrance, with its score, or null.
export async function getUserRanking(userId: string, fragranceId: number) {
  const [mine] = await db
    .select({ sentiment: rankings.sentiment, sortKey: rankings.sortKey })
    .from(rankings)
    .where(and(eq(rankings.userId, userId), eq(rankings.fragranceId, fragranceId)));
  if (!mine) return null;

  const inBucket = and(eq(rankings.userId, userId), eq(rankings.sentiment, mine.sentiment));
  const [[{ total }], [{ better }]] = await Promise.all([
    db.select({ total: count() }).from(rankings).where(inBucket),
    db.select({ better: count() }).from(rankings).where(and(inBucket, gt(rankings.sortKey, mine.sortKey))),
  ]);

  return {
    sentiment: mine.sentiment,
    position: better + 1, // 1 = best in the bucket
    bucketSize: total,
    score: scoreFor(mine.sentiment, better, total),
  };
}

// Everything this user has ranked, best first: all loved, then fine, then
// disliked, each with its score and overall place.
export async function listRankings(userId: string) {
  const rows = await db
    .select({ ...cardColumns, sentiment: rankings.sentiment })
    .from(rankings)
    .innerJoin(fragrances, eq(fragrances.id, rankings.fragranceId))
    .innerJoin(brands, eq(brands.id, fragrances.brandId))
    .where(eq(rankings.userId, userId))
    // The sentiment enum is declared loved, fine, disliked, so ascending
    // enum order is best bucket first.
    .orderBy(asc(rankings.sentiment), desc(rankings.sortKey));

  const cards = await withTopAccords(rows);
  const bucketSizes = { loved: 0, fine: 0, disliked: 0 };
  for (const card of cards) bucketSizes[card.sentiment]++;

  const seen = { loved: 0, fine: 0, disliked: 0 };
  return cards.map((card, i) => ({
    ...card,
    place: i + 1,
    score: scoreFor(card.sentiment, seen[card.sentiment]++, bucketSizes[card.sentiment]),
  }));
}
