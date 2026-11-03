// Catalog reads used by the fragrance pages.
//
// The catalog only changes when we re-seed, so results are cached with
// `"use cache"`: the page is built once and served from the cache, instead of
// querying Postgres on every visit.
import { cacheLife, cacheTag } from "next/cache";
import { asc, desc, eq } from "drizzle-orm";
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
