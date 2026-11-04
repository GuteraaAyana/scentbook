// Catalog reads used by the fragrance pages.
//
// Results are cached with `"use cache"`, so pages are served from the cache
// instead of querying Postgres on every visit. Two tags clear them: "fragrances"
// when the catalog is re-seeded or imported, and "rankings" whenever anyone
// ranks something, since cards and pages show community scores.
import { cacheLife, cacheTag } from "next/cache";
import { asc, count, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from ".";
import { type CommunityScore, getCommunityScores } from "./community";
import {
  accords,
  brands,
  fragranceAccords,
  fragranceNotes,
  fragrancePerfumers,
  fragrances,
  notes,
  perfumers,
  rankings,
} from "./schema";

export async function getFragranceSlugs() {
  "use cache";
  cacheLife("days");
  cacheTag("fragrances", "rankings");

  const rows = await db.select({ slug: fragrances.slug }).from(fragrances);
  return rows.map((r) => r.slug);
}

// Fragrances per browse page: divisible by every grid width (3, 4, 6, 8
// columns). 24, not 48: bottle photos come full size from Fragella, and on a
// phone's connection 48 of them crowd out the ones on screen (PERFORMANCE.md).
export const PAGE_SIZE = 24;

// The columns a fragrance card shows. Select these and join `brands`.
export const cardColumns = {
  id: fragrances.id,
  name: fragrances.name,
  slug: fragrances.slug,
  releaseYear: fragrances.releaseYear,
  concentration: fragrances.concentration,
  imageUrl: fragrances.imageUrl,
  brand: brands.name,
};

// Adds what each card shows beyond its own row: its three strongest accords
// (the poster's colours) and its community score. One query each for all the
// cards, instead of one per card.
export async function toCards<T extends { id: number }>(rows: T[]) {
  const ids = rows.map((r) => r.id);
  const [accordRows, community] = await Promise.all([
    rows.length
      ? db
        .select({
          fragranceId: fragranceAccords.fragranceId,
          name: accords.name,
          color: accords.color,
          strength: fragranceAccords.strength,
        })
        .from(fragranceAccords)
        .innerJoin(accords, eq(accords.id, fragranceAccords.accordId))
        .where(inArray(fragranceAccords.fragranceId, ids))
        .orderBy(desc(fragranceAccords.strength))
      : Promise.resolve([]),
    getCommunityScores(ids),
  ]);

  return rows.map((row) => ({
    ...row,
    accords: accordRows
      .filter((a) => a.fragranceId === row.id)
      .slice(0, 3)
      .map(({ name, color, strength }) => ({ name, color, strength })),
    community: community.get(row.id) ?? null,
  }));
}

// What a fragrance card needs (see src/components/fragrance-card.tsx).
export type FragranceCardData = {
  name: string;
  slug: string;
  releaseYear: number | null;
  concentration: (typeof fragrances.$inferSelect)["concentration"];
  imageUrl: string | null;
  brand: string;
  accords: { name: string; color: string; strength: number }[];
  community: CommunityScore | null;
};

// One page of fragrance cards for the browse page, by brand then name.
// `page` starts at 1.
export async function listFragrances(page: number) {
  "use cache";
  cacheLife("days");
  cacheTag("fragrances", "rankings");

  const [rows, [{ total }]] = await Promise.all([
    db
      .select(cardColumns)
      .from(fragrances)
      .innerJoin(brands, eq(brands.id, fragrances.brandId))
      .orderBy(asc(brands.name), asc(fragrances.name), asc(fragrances.id))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(fragrances),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return { fragrances: await toCards(rows), total, pageCount };
}

// Everything the detail page shows, or null if no fragrance has this slug.
export async function getFragranceBySlug(slug: string) {
  "use cache";
  cacheLife("days");
  cacheTag("fragrances", "rankings", `fragrance:${slug}`);

  const [fragrance] = await db
    .select({
      id: fragrances.id,
      name: fragrances.name,
      slug: fragrances.slug,
      releaseYear: fragrances.releaseYear,
      concentration: fragrances.concentration,
      gender: fragrances.gender,
      description: fragrances.description,
      imageUrl: fragrances.imageUrl,
      brand: { name: brands.name, slug: brands.slug },
    })
    .from(fragrances)
    .innerJoin(brands, eq(brands.id, fragrances.brandId))
    .where(eq(fragrances.slug, slug));

  if (!fragrance) return null;

  // These three don't depend on each other, so run them at the same time.
  const [noteRows, accordRows, perfumerRows, community] = await Promise.all([
    db
      .select({ name: notes.name, slug: notes.slug, layer: fragranceNotes.layer })
      .from(fragranceNotes)
      .innerJoin(notes, eq(notes.id, fragranceNotes.noteId))
      .where(eq(fragranceNotes.fragranceId, fragrance.id))
      .orderBy(asc(notes.name)),
    db
      .select({
        name: accords.name,
        color: accords.color,
        strength: fragranceAccords.strength,
      })
      .from(fragranceAccords)
      .innerJoin(accords, eq(accords.id, fragranceAccords.accordId))
      .where(eq(fragranceAccords.fragranceId, fragrance.id))
      .orderBy(desc(fragranceAccords.strength)),
    db
      .select({ name: perfumers.name, slug: perfumers.slug })
      .from(fragrancePerfumers)
      .innerJoin(perfumers, eq(perfumers.id, fragrancePerfumers.perfumerId))
      .where(eq(fragrancePerfumers.fragranceId, fragrance.id))
      .orderBy(asc(perfumers.name)),
    getCommunityScores([fragrance.id]),
  ]);

  return {
    ...fragrance,
    notes: {
      top: noteRows.filter((n) => n.layer === "top"),
      heart: noteRows.filter((n) => n.layer === "heart"),
      base: noteRows.filter((n) => n.layer === "base"),
    },
    accords: accordRows,
    perfumers: perfumerRows,
    community: community.get(fragrance.id) ?? null,
  };
}

// Bottles for the home page's Featured row: hand-curated fragrances that have
// a bottle image first, then imported ones.
export async function listFeaturedFragrances(limit = 8) {
  "use cache";
  cacheLife("days");
  cacheTag("fragrances", "rankings");

  const rows = await db
    .select(cardColumns)
    .from(fragrances)
    .innerJoin(brands, eq(brands.id, fragrances.brandId))
    .where(isNotNull(fragrances.imageUrl))
    .orderBy(asc(fragrances.source), asc(fragrances.id))
    .limit(limit);
  return toCards(rows);
}

// The home page's community rows: the highest-scoring and the most-ranked
// fragrances. Empty until people start ranking.
export async function listCommunityHighlights(limit = 8) {
  "use cache";
  cacheLife("days");
  cacheTag("fragrances", "rankings");

  const ranked = await db.selectDistinct({ id: rankings.fragranceId }).from(rankings);
  const scores = await getCommunityScores(ranked.map((r) => r.id));
  const byScore = [...scores].sort((a, b) => b[1].score - a[1].score || b[1].rankedBy - a[1].rankedBy);
  const byCount = [...scores].sort((a, b) => b[1].rankedBy - a[1].rankedBy || b[1].score - a[1].score);
  const pick = async (entries: typeof byScore) => {
    const ids = entries.slice(0, limit).map(([id]) => id);
    if (ids.length === 0) return [];
    const rows = await db
      .select(cardColumns)
      .from(fragrances)
      .innerJoin(brands, eq(brands.id, fragrances.brandId))
      .where(inArray(fragrances.id, ids));
    const cards = await toCards(rows);
    return ids.map((id) => cards.find((c) => c.id === id)!).filter(Boolean);
  };
  const [topRated, mostRanked] = await Promise.all([pick(byScore), pick(byCount)]);
  return { topRated, mostRanked };
}
