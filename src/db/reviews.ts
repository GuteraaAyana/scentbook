// Reads for reviews. The list on a fragrance page is the same for everyone,
// so it's cached; tags "reviews:<fragrance id>" (that fragrance's reviews
// changed), "reviews" (any author renamed) and "rankings" (the scores shown
// next to each review) clear it.
import { and, avg, count, desc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from ".";
import { getScoresByUser } from "./community";
import { cardColumns, toCards } from "./fragrances";
import { brands, fragrances, reviews, users } from "./schema";

const reviewColumns = {
  id: reviews.id,
  body: reviews.body,
  longevity: reviews.longevity,
  sillage: reviews.sillage,
  createdAt: reviews.createdAt,
  updatedAt: reviews.updatedAt,
};

export async function getFragranceReviews(fragranceId: number) {
  "use cache";
  cacheLife("days");
  cacheTag("reviews", `reviews:${fragranceId}`, "rankings");

  const [rows, [averages], scores] = await Promise.all([
    db
      .select({ ...reviewColumns, userId: users.id, name: users.name, username: users.username })
      .from(reviews)
      .innerJoin(users, eq(users.id, reviews.userId))
      .where(eq(reviews.fragranceId, fragranceId))
      .orderBy(desc(reviews.createdAt))
      .limit(50),
    db
      .select({
        count: count(),
        // avg() ignores reviews that skipped the rating.
        longevity: avg(reviews.longevity).mapWith(Number),
        sillage: avg(reviews.sillage).mapWith(Number),
      })
      .from(reviews)
      .where(eq(reviews.fragranceId, fragranceId)),
    getScoresByUser(fragranceId),
  ]);

  return {
    total: averages.count,
    longevity: averages.longevity || null,
    sillage: averages.sillage || null,
    // The author's id stays here; pages only get name, username and score.
    reviews: rows.map(({ userId, ...review }) => ({ ...review, score: scores.get(userId) ?? null })),
  };
}

// The signed-in user's own review of a fragrance, to edit it.
export async function getOwnReview(userId: string, fragranceId: number) {
  const [row] = await db
    .select(reviewColumns)
    .from(reviews)
    .where(and(eq(reviews.userId, userId), eq(reviews.fragranceId, fragranceId)));
  return row ?? null;
}

// A user's latest reviews with the fragrances they're about, for profiles.
export async function listUserReviews(userId: string, limit = 5) {
  const rows = await db
    .select({ ...cardColumns, review: reviewColumns })
    .from(reviews)
    .innerJoin(fragrances, eq(fragrances.id, reviews.fragranceId))
    .innerJoin(brands, eq(brands.id, fragrances.brandId))
    .where(eq(reviews.userId, userId))
    .orderBy(desc(reviews.createdAt))
    .limit(limit);
  return toCards(rows);
}
