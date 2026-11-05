// Reads for the moderator's add-fragrance page. Not cached: only moderators
// see it, and it must reflect what was added a moment ago.
import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from ".";
import { accords, brands, fragrances, notes, perfumers } from "./schema";

// Every name a new fragrance can be matched against.
export async function getCatalogNames() {
  const [brandRows, noteRows, accordRows, perfumerRows] = await Promise.all([
    db.select({ name: brands.name, country: brands.country }).from(brands).orderBy(asc(brands.name)),
    db.select({ name: notes.name }).from(notes).orderBy(asc(notes.name)),
    db.select({ name: accords.name, color: accords.color }).from(accords).orderBy(asc(accords.name)),
    db.select({ name: perfumers.name }).from(perfumers).orderBy(asc(perfumers.name)),
  ]);
  return {
    brands: brandRows,
    notes: noteRows.map((r) => r.name),
    accords: accordRows,
    perfumers: perfumerRows.map((r) => r.name),
  };
}

export type CatalogNames = Awaited<ReturnType<typeof getCatalogNames>>;

export async function findFragranceBySlug(slug: string) {
  const [row] = await db.select({ name: fragrances.name }).from(fragrances).where(eq(fragrances.slug, slug));
  return row ?? null;
}
