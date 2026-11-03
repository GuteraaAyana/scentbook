// Catalog reads used by the fragrance pages.
//
// The catalog only changes when we re-seed, so results are cached with
// `"use cache"`: the page is built once and served from the cache, instead of
// querying Postgres on every visit.
import { cacheLife, cacheTag } from "next/cache";
import { asc, count, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from ".";
import {
  accords,
  brands,
  fragranceAccords,
  fragranceNotes,
  fragrancePerfumers,
  fragrances,
  notes,
  perfumers,
} from "./schema";

export async function getFragranceSlugs() {
  "use cache";
  cacheLife("days");
  cacheTag("fragrances");

  const rows = await db.select({ slug: fragrances.slug }).from(fragrances);
  return rows.map((r) => r.slug);
}

// Fragrances per browse page (divisible by the 2- and 3-column grids).
export const PAGE_SIZE = 48;

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

// Adds each card's three strongest accords (for its color strip), using one
// query for all the cards instead of one per card.
export async function withTopAccords<T extends { id: number }>(rows: T[]) {
  const accordRows = rows.length
    ? await db
        .select({
          fragranceId: fragranceAccords.fragranceId,
          name: accords.name,
          color: accords.color,
          strength: fragranceAccords.strength,
        })
        .from(fragranceAccords)
        .innerJoin(accords, eq(accords.id, fragranceAccords.accordId))
        .where(inArray(fragranceAccords.fragranceId, rows.map((r) => r.id)))
        .orderBy(desc(fragranceAccords.strength))
    : [];

  return rows.map((row) => ({
    ...row,
    accords: accordRows
      .filter((a) => a.fragranceId === row.id)
      .slice(0, 3)
      .map(({ name, color, strength }) => ({ name, color, strength })),
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
};

// One page of fragrance cards for the browse page, by brand then name.
// `page` starts at 1.
export async function listFragrances(page: number) {
  "use cache";
  cacheLife("days");
  cacheTag("fragrances");

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

  return { fragrances: await withTopAccords(rows), total, pageCount };
}

// Everything the detail page shows, or null if no fragrance has this slug.
export async function getFragranceBySlug(slug: string) {
  "use cache";
  cacheLife("days");
  cacheTag("fragrances", `fragrance:${slug}`);

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
  const [noteRows, accordRows, perfumerRows] = await Promise.all([
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
  };
}

// A few bottles for the home page's display shelf: hand-curated fragrances
// that have a bottle image first, then imported ones.
export async function listFeaturedFragrances(limit = 5) {
  "use cache";
  cacheLife("days");
  cacheTag("fragrances");

  const rows = await db
    .select(cardColumns)
    .from(fragrances)
    .innerJoin(brands, eq(brands.id, fragrances.brandId))
    .where(isNotNull(fragrances.imageUrl))
    .orderBy(asc(fragrances.source), asc(fragrances.id))
    .limit(limit);
  return withTopAccords(rows);
}
