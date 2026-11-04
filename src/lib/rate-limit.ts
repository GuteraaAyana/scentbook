// Per-person limits on posting, so one account can't flood the site. Counts
// live in Postgres (action_limits), so they hold across restarts and servers.
// The window logic is the tested nextLimitWindow; here it runs under a row
// lock, so two requests at once can't both slip under the limit.
import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { actionLimits } from "@/db/schema";
import { nextLimitWindow } from "./moderation";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

// Generous for real use; tight enough to stop scripts.
export const LIMITS = {
  review: { max: 10, windowMs: HOUR },
  report: { max: 20, windowMs: 24 * HOUR },
  wear: { max: 30, windowMs: HOUR },
  follow: { max: 60, windowMs: HOUR },
} as const;

export async function consumeLimit(action: keyof typeof LIMITS, userId: string) {
  const key = `${action}:${userId}`;
  return db.transaction(async (tx) => {
    // Make sure the row exists (an old window), then lock it.
    await tx.insert(actionLimits).values({ key, count: 0, windowStart: new Date(0) }).onConflictDoNothing();
    const [row] = await tx.select().from(actionLimits).where(eq(actionLimits.key, key)).for("update");

    const next = nextLimitWindow(row, new Date(), LIMITS[action]);
    if (next.allowed) {
      await tx
        .update(actionLimits)
        .set({ count: next.count, windowStart: next.windowStart })
        .where(eq(actionLimits.key, key));
    }
    return { allowed: next.allowed, retryAfterSeconds: next.retryAfterSeconds ?? 0 };
  });
}

// "Try again in 12 minutes."
export function limitMessage(retryAfterSeconds: number) {
  const minutes = Math.ceil(retryAfterSeconds / 60);
  const when =
    retryAfterSeconds < 60
      ? "in a moment"
      : minutes < 60
        ? `in ${minutes} ${minutes === 1 ? "minute" : "minutes"}`
        : `in ${Math.ceil(minutes / 60)} hours`;
  return `You're doing that a lot. Try again ${when}.`;
}
