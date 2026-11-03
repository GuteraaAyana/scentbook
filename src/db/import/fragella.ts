// Imports fragrances from the Fragella API (https://api.fragella.com) into the
// catalog. See DECISIONS.md 007 for why, and the terms-of-use risk.
//
//   npm run fragella -- usage                  how many requests are left (free)
//   npm run fragella -- fetch "Tom Ford" Chanel  download brands (1 request each)
//   npm run fragella -- load                   write downloaded brands to the DB
//   npm run fragella -- remove                 delete every imported fragrance
//
// The free plan allows 20 requests a month, so `fetch` and `load` are separate:
// `fetch` saves Fragella's raw responses to .fragella/ (git-ignored, so their
// data never ends up in the public repo), and `load` can be re-run from those
// files as often as needed without spending requests. A brand that's already
// downloaded isn't fetched again unless you pass --force.

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../schema";
import { accords as curatedAccords } from "../seed/data";
import { type CatalogFragrance, slugify, upsertCatalog, fragranceSlug } from "../seed/upsert";

config({ path: ".env.local" });

const API = "https://api.fragella.com/api/v1";
const CACHE_DIR = process.env.FRAGELLA_CACHE_DIR ?? ".fragella";

// Fragella brand name → our brand name, where they differ, so imports land
// under the same brand as curated fragrances.
const BRAND_ALIASES: Record<string, string> = {
  "Christian Dior": "Dior",
};

// Fragella gives accord strength as a word, not a number.
const STRENGTHS: Record<string, number> = {
  dominant: 100,
  prominent: 75,
  moderate: 50,
  subtle: 25,
};

// Colors for common accords our curated list doesn't have yet. Anything not
// here or in data.ts gets FALLBACK_COLOR and is listed after `load`, so you
// can add a proper color to data.ts.
const EXTRA_ACCORD_COLORS: Record<string, string> = {
  Aldehydic: "#dfe6ea",
  Animalic: "#6e5a4a",
  Balsamic: "#a0603a",
  Cherry: "#a3243b",
  Cinnamon: "#a5552a",
  Earthy: "#7a6a4f",
  Floral: "#e6a3c0",
  Fresh: "#a9d6e5",
  Green: "#6aa84f",
  Herbal: "#7f9c6b",
  Honey: "#d9a440",
  Lavender: "#9a8bc4",
  Oud: "#4a3426",
  Ozonic: "#b6d7e8",
  "Soft Spicy": "#c98a5a",
  Tropical: "#f2a541",
  Tuberose: "#f1e3d3",
  Violet: "#8f6bb3",
  Whiskey: "#a4642c",
  "Yellow Floral": "#f0d264",
};
const FALLBACK_COLOR = "#9ca3af";

// ---------------------------------------------------------------------------
// Fragella's response shape (only the fields we use; see their docs).

type FragellaNote = { name?: string };
type FragellaFragrance = {
  _id?: string;
  Name?: string;
  Brand?: string;
  Year?: string;
  OilType?: string;
  Gender?: string;
  perfumers?: string;
  Notes?: { Top?: FragellaNote[]; Middle?: FragellaNote[]; Base?: FragellaNote[] };
  "Main Accords"?: string[];
  "Main Accords Percentage"?: Record<string, string>;
};

// ---------------------------------------------------------------------------
// HTTP

function apiKey() {
  const key = process.env.FRAGELLA_API_KEY;
  if (!key) {
    throw new Error("FRAGELLA_API_KEY is not set. Add it to .env.local (see .env.example).");
  }
  return key;
}

async function get(pathname: string) {
  const res = await fetch(`${API}${pathname}`, { headers: { "x-api-key": apiKey() } });
  if (!res.ok) {
    const hint =
      res.status === 401 || res.status === 403
        ? " (check FRAGELLA_API_KEY)"
        : res.status === 429
          ? " (monthly request limit reached)"
          : res.status === 404
            ? " (no fragrances found; check the brand's exact name)"
            : "";
    throw new Error(`Fragella ${pathname} returned ${res.status}${hint}`);
  }
  return res.json();
}

async function remainingRequests(): Promise<number> {
  // /usage doesn't count against the limit.
  const usage = await get("/usage");
  return usage?.usage?.requests_remaining ?? 0;
}

// ---------------------------------------------------------------------------
// Commands

async function usage() {
  const data = await get("/usage");
  console.log(
    `Plan: ${data.plan}. Used ${data.usage.requests_made}, ` +
      `${data.usage.requests_remaining} remaining this period (ends ${data.billing_period?.end}).`,
  );
}

function cacheFile(brand: string) {
  return path.join(CACHE_DIR, `${slugify(brand)}.json`);
}

async function fetchBrands(brands: string[], force: boolean) {
  if (brands.length === 0) throw new Error('Name at least one brand, e.g. fetch "Tom Ford"');
  await mkdir(CACHE_DIR, { recursive: true });

  const existing = new Set(await readdir(CACHE_DIR));
  const todo = brands.filter((b) => force || !existing.has(path.basename(cacheFile(b))));
  for (const b of brands) if (!todo.includes(b)) console.log(`${b}: already downloaded, skipping (use --force to refetch)`);
  if (todo.length === 0) return;

  const remaining = await remainingRequests();
  if (remaining < todo.length) {
    throw new Error(`Need ${todo.length} requests but only ${remaining} remain this month. Nothing was fetched.`);
  }

  for (const brand of todo) {
    const data = await get(`/brands/${encodeURIComponent(brand)}?limit=20`);
    const list = toList(data);
    await writeFile(cacheFile(brand), JSON.stringify({ brand, fetchedAt: new Date().toISOString(), data }, null, 2));
    console.log(`${brand}: saved ${list.length} fragrances`);
  }
  console.log(`${remaining - todo.length} requests left this month.`);
}

// The brand endpoint's wrapper isn't documented; accept a bare array or {data: [...]}.
function toList(data: unknown): FragellaFragrance[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    for (const key of ["data", "fragrances", "results"]) {
      const value = (data as Record<string, unknown>)[key];
      if (Array.isArray(value)) return value;
    }
  }
  return [];
}

function titleCase(text: string) {
  return text
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function concentration(oilType = ""): CatalogFragrance["concentration"] {
  const t = oilType.toLowerCase();
  if (t.includes("extrait")) return "extrait";
  if (t.includes("eau de parfum")) return "edp";
  if (t.includes("eau de toilette")) return "edt";
  if (t.includes("cologne")) return "edc";
  if (t.includes("parfum")) return "parfum";
  return "other";
}

function gender(value = ""): CatalogFragrance["gender"] {
  const g = value.toLowerCase();
  if (g === "men") return "masculine";
  if (g === "women") return "feminine";
  return "unisex";
}

function noteNames(list: FragellaNote[] = []) {
  return list.map((n) => (n.name ?? "").trim().replace(/\s+/g, " ")).filter(Boolean);
}

// Turn one Fragella entry into our catalog shape, or a reason it was skipped.
function toCatalog(f: FragellaFragrance, requestedBrand: string): CatalogFragrance | string {
  const name = f.Name?.trim();
  if (!name) return "missing name";

  const brandName = BRAND_ALIASES[f.Brand ?? ""] ?? BRAND_ALIASES[requestedBrand] ?? f.Brand?.trim() ?? requestedBrand;
  const year = Number.parseInt(f.Year ?? "", 10);

  const accordEntries = (f["Main Accords"] ?? []).map((raw, i) => {
    const word = f["Main Accords Percentage"]?.[raw]?.toLowerCase() ?? "";
    // Unknown word: fall back on position, since the list is ordered by prominence.
    const strength = STRENGTHS[word] ?? Math.max(10, 90 - i * 10);
    return [titleCase(raw), strength] as const;
  });

  return {
    brand: brandName,
    name,
    releaseYear: Number.isFinite(year) ? year : null,
    concentration: concentration(f.OilType),
    gender: gender(f.Gender),
    perfumers: (f.perfumers ?? "").split(";").map((p) => p.trim()).filter(Boolean),
    notes: {
      top: noteNames(f.Notes?.Top),
      heart: noteNames(f.Notes?.Middle),
      base: noteNames(f.Notes?.Base),
    },
    accords: Object.fromEntries(accordEntries),
    externalId: f._id,
  };
}

async function load() {
  const files = (await readdir(CACHE_DIR).catch(() => [])).filter((f) => f.endsWith(".json"));
  if (files.length === 0) throw new Error(`Nothing downloaded yet. Run: npm run fragella -- fetch "<Brand>"`);

  const fragrances = new Map<string, CatalogFragrance>();
  const skipped: string[] = [];
  for (const file of files) {
    const { brand, data } = JSON.parse(await readFile(path.join(CACHE_DIR, file), "utf8"));
    for (const entry of toList(data)) {
      const result = toCatalog(entry, brand);
      if (typeof result === "string") {
        skipped.push(`${brand} ${entry.Name ?? "?"}: ${result}`);
        continue;
      }
      // The same fragrance can appear twice (e.g. in two brand files).
      fragrances.set(fragranceSlug(result), result);
    }
  }

  const list = [...fragrances.values()];
  const brandNames = [...new Set(list.map((f) => f.brand))];
  const noteNamesAll = [...new Set(list.flatMap((f) => [...f.notes.top, ...f.notes.heart, ...f.notes.base]))];
  const accordNames = [...new Set(list.flatMap((f) => Object.keys(f.accords)))];
  const uncolored = accordNames.filter((a) => !(a in curatedAccords) && !(a in EXTRA_ACCORD_COLORS));

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });
  const result = await upsertCatalog(db, {
    source: "fragella",
    brands: brandNames.map((name) => ({ name, country: null })),
    notes: noteNamesAll.map((name) => ({ name, family: null })),
    accords: accordNames.map((name) => ({
      name,
      color: curatedAccords[name] ?? EXTRA_ACCORD_COLORS[name] ?? FALLBACK_COLOR,
    })),
    fragrances: list,
  });
  await pool.end();

  console.log(`Imported ${result.fragrances} fragrances from ${files.length} brand file(s).`);
  if (result.skipped > 0) {
    console.log(`Kept ${result.skipped} curated fragrance(s) as they are (curated data wins).`);
  }
  const noNotes = list.filter((f) => f.notes.top.length + f.notes.heart.length + f.notes.base.length === 0);
  if (noNotes.length > 0) console.log(`${noNotes.length} fragrance(s) had no top/heart/base notes.`);
  if (skipped.length > 0) console.log(`Skipped:\n  ${skipped.join("\n  ")}`);
  if (uncolored.length > 0) {
    console.log(`Accords without a color yet (shown grey; add them to accords in data.ts): ${uncolored.join(", ")}`);
  }
}

async function remove() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });
  // Notes, accords and perfumer links are deleted with them (ON DELETE CASCADE).
  const deleted = await db
    .delete(schema.fragrances)
    .where(eq(schema.fragrances.source, "fragella"))
    .returning({ id: schema.fragrances.id });
  await pool.end();
  console.log(`Removed ${deleted.length} imported fragrances. Curated ones are untouched.`);
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  const force = args.includes("--force");
  const names = args.filter((a) => a !== "--force");

  if (command === "usage") return usage();
  if (command === "fetch") return fetchBrands(names, force);
  if (command === "load") return load();
  if (command === "remove") return remove();
  console.log('Usage: npm run fragella -- usage | fetch "<Brand>" [...] [--force] | load | remove');
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
