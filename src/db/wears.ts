// Reads for the wear diary. Per user and changing with every entry, so never
// cached.
import { and, count, desc, eq, max } from "drizzle-orm";
import { db } from ".";
import { cardColumns, toCards } from "./fragrances";
import { brands, fragrances, wears } from "./schema";

const entryColumns = {
  wearId: wears.id,
  wornOn: wears.wornOn,
  occasion: wears.occasion,
  weather: wears.weather,
  temperatureC: wears.temperatureC,
  place: wears.place, // private: only the diary shows it
  compliments: wears.compliments,
  note: wears.note,
};

// Diary entries with their fragrance cards, newest first. `limit` for the
// "recent wears" lists; the diary page shows everything.
export async function listWears(userId: string, limit?: number) {
  const query = db
    .select({ ...cardColumns, ...entryColumns })
    .from(wears)
    .innerJoin(fragrances, eq(fragrances.id, wears.fragranceId))
    .innerJoin(brands, eq(brands.id, fragrances.brandId))
    .where(eq(wears.userId, userId))
    .orderBy(desc(wears.wornOn), desc(wears.createdAt));
  return toCards(await (limit ? query.limit(limit) : query));
}

// How often this user has worn one fragrance, and when they last did.
export async function getWearSummary(userId: string, fragranceId: number) {
  const [row] = await db
    .select({ times: count(), last: max(wears.wornOn) })
    .from(wears)
    .where(and(eq(wears.userId, userId), eq(wears.fragranceId, fragranceId)));
  return { times: row?.times ?? 0, last: row?.last ?? null };
}

// The fragrances this user reaches for most, with how many times each.
export async function listMostWorn(userId: string, limit = 5) {
  const times = count().as("times");
  const rows = await db
    .select({ ...cardColumns, times })
    .from(wears)
    .innerJoin(fragrances, eq(fragrances.id, wears.fragranceId))
    .innerJoin(brands, eq(brands.id, fragrances.brandId))
    .where(eq(wears.userId, userId))
    .groupBy(fragrances.id, brands.name)
    .orderBy(desc(times), desc(max(wears.wornOn)))
    .limit(limit);
  return toCards(rows);
}
