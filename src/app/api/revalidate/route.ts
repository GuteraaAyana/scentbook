// Clears the cached catalog pages. The seed and Fragella scripts run outside
// Next.js, so they call this when they finish (src/db/seed/refresh.ts) to make
// a running server show the new data. Protected by REVALIDATE_SECRET.
import { revalidateTag } from "next/cache";
import { timingSafeEqual } from "node:crypto";

function secretMatches(given: string | null) {
  const expected = process.env.REVALIDATE_SECRET;
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!secretMatches(request.headers.get("x-revalidate-secret"))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  // expire: 0 = the next visit gets fresh data instead of the stale copy.
  revalidateTag("fragrances", { expire: 0 });
  return Response.json({ revalidated: "fragrances" });
}
