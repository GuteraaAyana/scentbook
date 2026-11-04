// Community scores: each person's ranking score for a fragrance (worked out
// from where it sits in their own list, src/lib/ranking.ts), averaged over
// everyone who ranked it. Shown on posters and fragrance pages.
import { inArray, sql } from "drizzle-orm";
import { scoreFor, type Sentiment } from "@/lib/ranking";
import { db } from ".";
import { rankings } from "./schema";

export type CommunityScore = { score: number; rankedBy: number; lovedShare: number };

// Every ranking of these fragrances with its place in that user's bucket. A
// score depends on the fragrance's place among everything else that user
// ranked in the same bucket, so positions are worked out over each whole
// bucket first, then narrowed to the fragrances asked about.
async function positionedRankings(fragranceIds: number[]) {
  const positioned = db.$with("positioned").as(
    db
      .select({
        userId: rankings.userId,
        fragranceId: rankings.fragranceId,
        sentiment: rankings.sentiment,
        index: sql<number>`(row_number() over (partition by ${rankings.userId}, ${rankings.sentiment} order by ${rankings.sortKey} desc) - 1)::int`.as("index"),
        size: sql<number>`(count(*) over (partition by ${rankings.userId}, ${rankings.sentiment}))::int`.as("size"),
      })
      .from(rankings),
  );
  return db.with(positioned).select().from(positioned).where(inArray(positioned.fragranceId, fragranceIds));
}

// Each person's own score for one fragrance (user id → score), for showing
// next to their review.
export async function getScoresByUser(fragranceId: number): Promise<Map<string, number>> {
  const rows = await positionedRankings([fragranceId]);
  return new Map(rows.map((r) => [r.userId, scoreFor(r.sentiment as Sentiment, r.index, r.size)]));
}

export async function getCommunityScores(fragranceIds: number[]): Promise<Map<number, CommunityScore>> {
  const result = new Map<number, CommunityScore>();
  if (fragranceIds.length === 0) return result;

  const rows = await positionedRankings(fragranceIds);

  const totals = new Map<number, { sum: number; count: number; loved: number }>();
  for (const row of rows) {
    const t = totals.get(row.fragranceId) ?? { sum: 0, count: 0, loved: 0 };
    t.sum += scoreFor(row.sentiment as Sentiment, row.index, row.size);
    t.count += 1;
    if (row.sentiment === "loved") t.loved += 1;
    totals.set(row.fragranceId, t);
  }
  for (const [id, t] of totals) {
    result.set(id, {
      score: Math.round((t.sum / t.count) * 10) / 10,
      rankedBy: t.count,
      lovedShare: t.loved / t.count,
    });
  }
  return result;
}
