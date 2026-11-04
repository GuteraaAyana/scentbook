"use server";
// Server Actions for reviews. Public endpoints like every Server Action, so
// each checks the session and validates its input itself.
import { and, eq } from "drizzle-orm";
import { refresh, updateTag } from "next/cache";
import { headers } from "next/headers";
import { db } from "@/db";
import { fragrances, reviews } from "@/db/schema";
import { auth } from "@/lib/auth";
import { type ReviewErrors, type ReviewInput, validateReview } from "@/lib/review";

// `values` and `attempt` come back with errors: React resets a form after its
// action runs, so the form is rebuilt (keyed on `attempt`) from what was sent
// instead of losing what the person typed.
export type ReviewFormState = {
  errors: ReviewErrors;
  message: string | null;
  saved: number;
  values: ReviewInput | null;
  attempt: number;
};

async function currentUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

// Write or edit the signed-in user's review of `fragranceId` (one each).
export async function saveReview(fragranceId: number, previous: ReviewFormState, form: FormData): Promise<ReviewFormState> {
  const userId = await currentUserId();
  const values: ReviewInput = {
    body: String(form.get("body") ?? ""),
    longevity: String(form.get("longevity") ?? ""),
    sillage: String(form.get("sillage") ?? ""),
  };
  const failed = (changes: Partial<ReviewFormState>) => ({
    ...previous,
    errors: {},
    message: null,
    ...changes,
    values,
    attempt: previous.attempt + 1,
  });

  if (!userId) return failed({ message: "Your session ended. Sign in again to save." });
  if (!Number.isInteger(fragranceId)) return failed({ message: "Unknown fragrance." });

  const result = validateReview(values);
  if (!result.ok) return failed({ errors: result.errors });

  const [exists] = await db.select({ id: fragrances.id }).from(fragrances).where(eq(fragrances.id, fragranceId));
  if (!exists) return failed({ message: "Unknown fragrance." });

  await db
    .insert(reviews)
    .values({ userId, fragranceId, ...result.value })
    .onConflictDoUpdate({
      target: [reviews.userId, reviews.fragranceId],
      set: { ...result.value, updatedAt: new Date() },
    });

  updateTag(`reviews:${fragranceId}`); // the cached review list shows it now
  refresh();
  return { errors: {}, message: null, saved: previous.saved + 1, values: null, attempt: previous.attempt + 1 };
}

export async function deleteReview(fragranceId: number) {
  const userId = await currentUserId();
  if (!userId) return { error: "Sign in to change your review." };
  if (!Number.isInteger(fragranceId)) return { error: "Unknown fragrance." };

  await db.delete(reviews).where(and(eq(reviews.userId, userId), eq(reviews.fragranceId, fragranceId)));
  updateTag(`reviews:${fragranceId}`);
  refresh();
  return { error: null };
}
