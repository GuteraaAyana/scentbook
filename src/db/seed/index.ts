// Loads the catalog in ./data.ts into the database: `npm run db:seed`.
//
// Safe to run any number of times. Rows are matched by slug: new ones are
// inserted and existing ones updated, so editing data.ts and re-running fixes
// the database instead of duplicating it. Everything runs in one transaction,
// so a failed run leaves the database as it was.
//
// This script opens its own connection instead of importing `@/db`, because
// that module is marked `server-only` and refuses to load outside Next.js.

import { config } from "dotenv";
import { inArray, sql, type AnyColumn } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../schema";
import { accords, brands, fragrances, notes } from "./data";

config({ path: ".env.local" });

// "Baccarat Rouge 540" → "baccarat-rouge-540", "Acqua di Giò" → "acqua-di-gio"
function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .toLowerCase()
    .replace(/&/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// In an upsert, `excluded.<column>` is the value we tried to insert.
function excluded(column: AnyColumn) {
  return sql.raw(`excluded."${column.name}"`);
}

// Catch typos (a note or accord that isn't in the catalog) before touching the DB.
function validate() {
  const errors: string[] = [];
  const brandNames = new Set(brands.map((b) => b.name));
  for (const f of fragrances) {
    const label = `${f.brand} ${f.name}`;
    if (!brandNames.has(f.brand)) errors.push(`${label}: unknown brand "${f.brand}"`);
    for (const note of [...f.notes.top, ...f.notes.heart, ...f.notes.base]) {
      if (!(note in notes)) errors.push(`${label}: unknown note "${note}"`);
    }
    for (const [accord, strength] of Object.entries(f.accords)) {
      if (!(accord in accords)) errors.push(`${label}: unknown accord "${accord}"`);
      if (strength < 1 || strength > 100) errors.push(`${label}: ${accord} strength ${strength} not in 1–100`);
    }
  }
  if (errors.length > 0) throw new Error(`Seed data has errors:\n  ${errors.join("\n  ")}`);
}

async function main() {
  validate();

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  await db.transaction(async (tx) => {
    // 1. Lookup tables. Each returns slug → id so the join rows can reference them.
    const brandRows = await tx
      .insert(schema.brands)
      .values(brands.map((b) => ({ ...b, slug: slugify(b.name) })))
      .onConflictDoUpdate({
        target: schema.brands.slug,
        set: { name: excluded(schema.brands.name), country: excluded(schema.brands.country) },
      })
      .returning({ id: schema.brands.id, slug: schema.brands.slug });
    const brandIds = new Map(brandRows.map((r) => [r.slug, r.id]));

    const noteRows = await tx
      .insert(schema.notes)
      .values(Object.entries(notes).map(([name, family]) => ({ name, slug: slugify(name), family })))
      .onConflictDoUpdate({
        target: schema.notes.slug,
        set: { name: excluded(schema.notes.name), family: excluded(schema.notes.family) },
      })
      .returning({ id: schema.notes.id, slug: schema.notes.slug });
    const noteIds = new Map(noteRows.map((r) => [r.slug, r.id]));

    const accordRows = await tx
      .insert(schema.accords)
      .values(Object.entries(accords).map(([name, color]) => ({ name, slug: slugify(name), color })))
      .onConflictDoUpdate({
        target: schema.accords.slug,
        set: { name: excluded(schema.accords.name), color: excluded(schema.accords.color) },
      })
      .returning({ id: schema.accords.id, slug: schema.accords.slug });
    const accordIds = new Map(accordRows.map((r) => [r.slug, r.id]));

    const perfumerNames = [...new Set(fragrances.flatMap((f) => f.perfumers))];
    const perfumerRows = await tx
      .insert(schema.perfumers)
      .values(perfumerNames.map((name) => ({ name, slug: slugify(name) })))
      .onConflictDoUpdate({
        target: schema.perfumers.slug,
        set: { name: excluded(schema.perfumers.name) },
      })
      .returning({ id: schema.perfumers.id, slug: schema.perfumers.slug });
    const perfumerIds = new Map(perfumerRows.map((r) => [r.slug, r.id]));

    // 2. Fragrances, slugged as "<brand>-<name>", e.g. "le-labo-santal-33".
    const fragranceRows = await tx
      .insert(schema.fragrances)
      .values(
        fragrances.map((f) => ({
          brandId: brandIds.get(slugify(f.brand))!,
          name: f.name,
          slug: slugify(`${f.brand} ${f.name}`),
          releaseYear: f.releaseYear,
          concentration: f.concentration,
          gender: f.gender,
        })),
      )
      .onConflictDoUpdate({
        target: schema.fragrances.slug,
        set: {
          brandId: excluded(schema.fragrances.brandId),
          name: excluded(schema.fragrances.name),
          releaseYear: excluded(schema.fragrances.releaseYear),
          concentration: excluded(schema.fragrances.concentration),
          gender: excluded(schema.fragrances.gender),
        },
      })
      .returning({ id: schema.fragrances.id, slug: schema.fragrances.slug });
    const fragranceIds = new Map(fragranceRows.map((r) => [r.slug, r.id]));

    // 3. Join rows. Simplest way to make them match data.ts exactly: delete this
    // batch's existing rows and insert them fresh.
    const ids = [...fragranceIds.values()];
    await tx.delete(schema.fragrancePerfumers).where(inArray(schema.fragrancePerfumers.fragranceId, ids));
    await tx.delete(schema.fragranceNotes).where(inArray(schema.fragranceNotes.fragranceId, ids));
    await tx.delete(schema.fragranceAccords).where(inArray(schema.fragranceAccords.fragranceId, ids));

    const perfumerLinks = [];
    const noteLinks = [];
    const accordLinks = [];
    for (const f of fragrances) {
      const fragranceId = fragranceIds.get(slugify(`${f.brand} ${f.name}`))!;
      for (const name of f.perfumers) {
        perfumerLinks.push({ fragranceId, perfumerId: perfumerIds.get(slugify(name))! });
      }
      for (const layer of ["top", "heart", "base"] as const) {
        for (const name of f.notes[layer]) {
          noteLinks.push({ fragranceId, noteId: noteIds.get(slugify(name))!, layer });
        }
      }
      for (const [name, strength] of Object.entries(f.accords)) {
        accordLinks.push({ fragranceId, accordId: accordIds.get(slugify(name))!, strength });
      }
    }
    if (perfumerLinks.length > 0) await tx.insert(schema.fragrancePerfumers).values(perfumerLinks);
    await tx.insert(schema.fragranceNotes).values(noteLinks);
    await tx.insert(schema.fragranceAccords).values(accordLinks);

    console.log(
      `Seeded ${fragranceRows.length} fragrances, ${brandRows.length} brands, ` +
        `${noteRows.length} notes, ${accordRows.length} accords, ${perfumerRows.length} perfumers ` +
        `(${noteLinks.length} note links, ${accordLinks.length} accord links).`,
    );
  });

  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
