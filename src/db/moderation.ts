// Reads for the moderator's reports page. Never cached: only admins see it
// and it has to be current.
import "server-only";
import { and, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { db } from ".";
import { fragrances, reviewReports, reviews, users } from "./schema";

export async function isAdmin(userId: string) {
  const [user] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId));
  return user?.role === "admin";
}

const reviewSummary = {
  id: reviews.id,
  body: reviews.body,
  createdAt: reviews.createdAt,
  hiddenAt: reviews.hiddenAt,
  hiddenReason: reviews.hiddenReason,
  authorName: users.name,
  authorUsername: users.username,
  fragranceName: fragrances.name,
  fragranceSlug: fragrances.slug,
};

// Reviews with reports nobody has dealt with yet, each with its reports,
// most reported first.
export async function listReportedReviews() {
  const reports = await db
    .select({
      reviewId: reviewReports.reviewId,
      reason: reviewReports.reason,
      details: reviewReports.details,
      createdAt: reviewReports.createdAt,
    })
    .from(reviewReports)
    .where(isNull(reviewReports.resolvedAt))
    .orderBy(desc(reviewReports.createdAt));
  if (reports.length === 0) return [];

  const ids = [...new Set(reports.map((r) => r.reviewId))];
  const rows = await db
    .select(reviewSummary)
    .from(reviews)
    .innerJoin(users, eq(users.id, reviews.userId))
    .innerJoin(fragrances, eq(fragrances.id, reviews.fragranceId))
    .where(inArray(reviews.id, ids));

  return rows
    .map((review) => ({ ...review, reports: reports.filter((r) => r.reviewId === review.id) }))
    .sort((a, b) => b.reports.length - a.reports.length);
}

// Reviews a moderator took down (reports closed), so they can be restored.
export async function listHiddenReviews(limit = 50) {
  return db
    .select(reviewSummary)
    .from(reviews)
    .innerJoin(users, eq(users.id, reviews.userId))
    .innerJoin(fragrances, eq(fragrances.id, reviews.fragranceId))
    .where(and(isNotNull(reviews.hiddenAt), eq(reviews.hiddenReason, "moderator")))
    .orderBy(desc(reviews.hiddenAt))
    .limit(limit);
}
