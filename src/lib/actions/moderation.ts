"use server";
// Reporting reviews, and the moderator actions on reported ones. Public
// endpoints like every Server Action: each checks the session itself, and the
// moderator actions check the admin role in the database every time.
import { and, count, eq, isNull } from "drizzle-orm";
import { refresh, updateTag } from "next/cache";
import { headers } from "next/headers";
import { db } from "@/db";
import { isAdmin } from "@/db/moderation";
import { reviewReports, reviews } from "@/db/schema";
import { auth } from "@/lib/auth";
import { shouldAutoHide, validateReport } from "@/lib/moderation";
import { consumeLimit, limitMessage } from "@/lib/rate-limit";

export type ReportFormState = { errors: { reason?: string; details?: string }; message: string | null; done: boolean };

async function currentUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

// Hiding or restoring a review changes its fragrance's cached review list and
// any profile showing it.
function expireReviewCaches(fragranceId: number) {
  updateTag(`reviews:${fragranceId}`);
  updateTag("reviews");
}

export async function reportReview(reviewId: number, previous: ReportFormState, form: FormData): Promise<ReportFormState> {
  const userId = await currentUserId();
  if (!userId) return { ...previous, message: "Sign in to report a review." };
  if (!Number.isInteger(reviewId)) return { ...previous, message: "Unknown review." };

  const result = validateReport({ reason: String(form.get("reason") ?? ""), details: String(form.get("details") ?? "") });
  if (!result.ok) return { errors: result.errors, message: null, done: false };

  const [review] = await db
    .select({ authorId: reviews.userId, fragranceId: reviews.fragranceId, hiddenAt: reviews.hiddenAt })
    .from(reviews)
    .where(eq(reviews.id, reviewId));
  if (!review || review.hiddenAt) return { errors: {}, message: "This review is no longer shown.", done: false };
  if (review.authorId === userId) return { errors: {}, message: "You can't report your own review.", done: false };

  const limit = await consumeLimit("report", userId);
  if (!limit.allowed) return { errors: {}, message: limitMessage(limit.retryAfterSeconds), done: false };

  const inserted = await db
    .insert(reviewReports)
    .values({ reviewId, reporterId: userId, ...result.value })
    .onConflictDoNothing()
    .returning({ id: reviewReports.id });
  if (inserted.length === 0) return { errors: {}, message: "You've already reported this review. Thanks.", done: true };

  // Enough separate reports: hide it until a moderator has looked.
  const [{ open }] = await db
    .select({ open: count() })
    .from(reviewReports)
    .where(and(eq(reviewReports.reviewId, reviewId), isNull(reviewReports.resolvedAt)));
  if (shouldAutoHide(open)) {
    await db
      .update(reviews)
      .set({ hiddenAt: new Date(), hiddenReason: "reports" })
      .where(and(eq(reviews.id, reviewId), isNull(reviews.hiddenAt)));
    expireReviewCaches(review.fragranceId);
    refresh();
  }
  return { errors: {}, message: null, done: true };
}

// --- Moderator actions --------------------------------------------------------

async function requireAdmin() {
  const userId = await currentUserId();
  return userId && (await isAdmin(userId)) ? userId : null;
}

async function resolveReports(reviewId: number, adminId: string, resolution: "hidden" | "dismissed") {
  await db
    .update(reviewReports)
    .set({ resolvedAt: new Date(), resolvedBy: adminId, resolution })
    .where(and(eq(reviewReports.reviewId, reviewId), isNull(reviewReports.resolvedAt)));
}

// "hide": take it down and close its reports. "restore": put it back up.
// "dismiss": the reports were wrong; close them, and undo an automatic hide.
export async function moderateReview(reviewId: number, decision: "hide" | "restore" | "dismiss") {
  const adminId = await requireAdmin();
  if (!adminId) return { error: "Only moderators can do that." };
  if (!Number.isInteger(reviewId) || !["hide", "restore", "dismiss"].includes(decision)) return { error: "Unknown action." };

  const [review] = await db
    .select({ fragranceId: reviews.fragranceId, hiddenReason: reviews.hiddenReason })
    .from(reviews)
    .where(eq(reviews.id, reviewId));
  if (!review) return { error: "That review no longer exists." };

  if (decision === "hide") {
    await db.update(reviews).set({ hiddenAt: new Date(), hiddenReason: "moderator" }).where(eq(reviews.id, reviewId));
    await resolveReports(reviewId, adminId, "hidden");
  } else {
    if (decision === "restore" || review.hiddenReason === "reports") {
      await db.update(reviews).set({ hiddenAt: null, hiddenReason: null }).where(eq(reviews.id, reviewId));
    }
    await resolveReports(reviewId, adminId, "dismissed");
  }

  expireReviewCaches(review.fragranceId);
  refresh();
  return { error: null };
}
