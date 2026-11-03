// Writes catalog data (brands, notes, accords, perfumers, fragrances and their
// links) into the database. Shared by the hand-curated seed and the Fragella
// import, so a fragrance enters the catalog the same way from either source.
//
// Rows are matched by slug, so running it again updates instead of
// duplicating. The two sources differ in who wins a conflict:
//   - curated: overwrites, because data.ts is the source of truth.
//   - fragella: never touches anything that already exists from curation, and
//     only adds lookup rows (notes, accords...) that are missing.

import { and, eq, inArray, sql, type AnyColumn } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../schema";
import type { SeedFragrance } from "./data";

type Db = NodePgDatabase<typeof schema>;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

export type CatalogFragrance = Omit<SeedFragrance, "releaseYear"> & {
  releaseYear: number | null; // imports don't always know it
  externalId?: string;
};

export type CatalogInput = {
  source: (typeof schema.catalogSourceEnum.enumValues)[number];
  brands: { name: string; country: string | null }[];
  notes: { name: string; family: string | null }[];
  accords: { name: string; color: string }[];
  fragrances: CatalogFragrance[];
};

// "Baccarat Rouge 540" → "baccarat-rouge-540", "Acqua di Giò" → "acqua-di-gio"
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .toLowerCase()
    .replace(/&/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function fragranceSlug(f: { brand: string; name: string }) {
  return slugify(`${f.brand} ${f.name}`);
}

// In an upsert, `excluded.<column>` is the value we tried to insert.
function excluded(column: AnyColumn) {
  return sql.raw(`excluded."${column.name}"`);
}

// slug → id for the given slugs, whether we just inserted them or they existed.
async function idsBySlug(
  tx: Tx,
  table: typeof schema.brands | typeof schema.notes | typeof schema.accords | typeof schema.perfumers,
  slugs: string[],
) {
  if (slugs.length === 0) return new Map<string, number>();
  const rows = await tx
    .select({ id: table.id, slug: table.slug })
    .from(table)
    .where(inArray(table.slug, slugs));
  return new Map(rows.map((r) => [r.slug, r.id]));
}

export async function upsertCatalog(db: Db, input: CatalogInput) {
  const curated = input.source === "curated";

  return db.transaction(async (tx) => {
    // 1. Lookup tables.
    const brandValues = input.brands.map((b) => ({ ...b, slug: slugify(b.name) }));
    const noteValues = input.notes.map((n) => ({ ...n, slug: slugify(n.name) }));
    const accordValues = input.accords.map((a) => ({ ...a, slug: slugify(a.name) }));
    const perfumerNames = [...new Set(input.fragrances.flatMap((f) => f.perfumers))];
    const perfumerValues = perfumerNames.map((name) => ({ name, slug: slugify(name) }));

    if (brandValues.length > 0) {
      const insert = tx.insert(schema.brands).values(brandValues);
      await (curated
        ? insert.onConflictDoUpdate({
            target: schema.brands.slug,
            set: { name: excluded(schema.brands.name), country: excluded(schema.brands.country) },
          })
        : insert.onConflictDoNothing());
    }
    if (noteValues.length > 0) {
      const insert = tx.insert(schema.notes).values(noteValues);
      await (curated
        ? insert.onConflictDoUpdate({
            target: schema.notes.slug,
            set: { name: excluded(schema.notes.name), family: excluded(schema.notes.family) },
          })
        : insert.onConflictDoNothing());
    }
    if (accordValues.length > 0) {
      const insert = tx.insert(schema.accords).values(accordValues);
      await (curated
        ? insert.onConflictDoUpdate({
            target: schema.accords.slug,
            set: { name: excluded(schema.accords.name), color: excluded(schema.accords.color) },
          })
        : insert.onConflictDoNothing());
    }
    if (perfumerValues.length > 0) {
      const insert = tx.insert(schema.perfumers).values(perfumerValues);
      await (curated
        ? insert.onConflictDoUpdate({
            target: schema.perfumers.slug,
            set: { name: excluded(schema.perfumers.name) },
          })
        : insert.onConflictDoNothing());
    }

    const brandIds = await idsBySlug(tx, schema.brands, brandValues.map((b) => b.slug));
    const noteIds = await idsBySlug(tx, schema.notes, noteValues.map((n) => n.slug));
    const accordIds = await idsBySlug(tx, schema.accords, accordValues.map((a) => a.slug));
    const perfumerIds = await idsBySlug(tx, schema.perfumers, perfumerValues.map((p) => p.slug));

    // 2. Fragrances, slugged as "<brand>-<name>", e.g. "le-labo-santal-33".
    const fragranceValues = input.fragrances.map((f) => ({
      brandId: brandIds.get(slugify(f.brand))!,
      name: f.name,
      slug: fragranceSlug(f),
      releaseYear: f.releaseYear,
      concentration: f.concentration,
      gender: f.gender,
      source: input.source,
      externalId: f.externalId ?? null,
    }));
    if (fragranceValues.length > 0) {
      await tx
        .insert(schema.fragrances)
        .values(fragranceValues)
        .onConflictDoUpdate({
          target: schema.fragrances.slug,
          set: {
            brandId: excluded(schema.fragrances.brandId),
            name: excluded(schema.fragrances.name),
            releaseYear: excluded(schema.fragrances.releaseYear),
            concentration: excluded(schema.fragrances.concentration),
            gender: excluded(schema.fragrances.gender),
            source: excluded(schema.fragrances.source),
            externalId: excluded(schema.fragrances.externalId),
          },
          // An import may refresh its own rows but never overwrite curated ones.
          setWhere: curated ? undefined : eq(schema.fragrances.source, "fragella"),
        });
    }

    // Only rebuild links for fragrances this source owns.
    const owned = fragranceValues.length
      ? await tx
          .select({ id: schema.fragrances.id, slug: schema.fragrances.slug })
          .from(schema.fragrances)
          .where(
            and(
              inArray(schema.fragrances.slug, fragranceValues.map((f) => f.slug)),
              eq(schema.fragrances.source, input.source),
            ),
          )
      : [];
    const fragranceIds = new Map(owned.map((r) => [r.slug, r.id]));
    const skipped = fragranceValues.length - owned.length;

    // 3. Join rows. Simplest way to make them match the input exactly: delete
    // this batch's existing rows and insert them fresh.
    const ids = [...fragranceIds.values()];
    if (ids.length > 0) {
      await tx.delete(schema.fragrancePerfumers).where(inArray(schema.fragrancePerfumers.fragranceId, ids));
      await tx.delete(schema.fragranceNotes).where(inArray(schema.fragranceNotes.fragranceId, ids));
      await tx.delete(schema.fragranceAccords).where(inArray(schema.fragranceAccords.fragranceId, ids));
    }

    const perfumerLinks = [];
    const noteLinks = [];
    const accordLinks = [];
    for (const f of input.fragrances) {
      const fragranceId = fragranceIds.get(fragranceSlug(f));
      if (fragranceId === undefined) continue;
      for (const name of f.perfumers) {
        perfumerLinks.push({ fragranceId, perfumerId: perfumerIds.get(slugify(name))! });
      }
      for (const layer of ["top", "heart", "base"] as const) {
        for (const name of new Set(f.notes[layer])) {
          noteLinks.push({ fragranceId, noteId: noteIds.get(slugify(name))!, layer });
        }
      }
      for (const [name, strength] of Object.entries(f.accords)) {
        accordLinks.push({ fragranceId, accordId: accordIds.get(slugify(name))!, strength });
      }
    }
    if (perfumerLinks.length > 0) {
      await tx.insert(schema.fragrancePerfumers).values(perfumerLinks).onConflictDoNothing();
    }
    if (noteLinks.length > 0) await tx.insert(schema.fragranceNotes).values(noteLinks).onConflictDoNothing();
    if (accordLinks.length > 0) await tx.insert(schema.fragranceAccords).values(accordLinks).onConflictDoNothing();

    return {
      fragrances: owned.length,
      skipped,
      brands: brandIds.size,
      notes: noteIds.size,
      accords: accordIds.size,
      perfumers: perfumerIds.size,
      noteLinks: noteLinks.length,
      accordLinks: accordLinks.length,
    };
  });
}
