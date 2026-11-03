// Loads the hand-curated catalog in ./data.ts into the database: `npm run db:seed`.
//
// Safe to run any number of times: rows are matched by slug, so editing
// data.ts and re-running fixes the database instead of duplicating it.
// Everything runs in one transaction, so a failed run changes nothing.
//
// This script opens its own connection instead of importing `@/db`, because
// that module is marked `server-only` and refuses to load outside Next.js.

import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../schema";
import { accords, brands, fragrances, notes } from "./data";
import { refreshRunningServer } from "./refresh";
import { upsertCatalog } from "./upsert";

config({ path: ".env.local" });

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

  const result = await upsertCatalog(db, {
    source: "curated",
    brands,
    notes: Object.entries(notes).map(([name, family]) => ({ name, family })),
    accords: Object.entries(accords).map(([name, color]) => ({ name, color })),
    fragrances,
  });

  console.log(
    `Seeded ${result.fragrances} fragrances, ${result.brands} brands, ` +
      `${result.notes} notes, ${result.accords} accords, ${result.perfumers} perfumers ` +
      `(${result.noteLinks} note links, ${result.accordLinks} accord links).`,
  );

  await pool.end();
  await refreshRunningServer();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
