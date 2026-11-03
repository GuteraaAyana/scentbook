// Imports fragrances from the Fragella API (https://api.fragella.com) into the
// catalog. See DECISIONS.md 007 for why, and the terms-of-use risk.
//
//   npm run fragella -- usage                  how many requests are left (free)
//   npm run fragella -- fetch "Tom Ford" Chanel  download each brand's 20 most popular (2 requests each)
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
import { accords as curatedAccords, fragrances as curatedFragrances } from "../seed/data";
import { refreshRunningServer } from "../seed/refresh";
import { type CatalogFragrance, slugify, upsertCatalog } from "../seed/upsert";

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
  Almond: "#d8b98a",
  Animalic: "#6e5a4a",
  Aquatic: "#5fa8d3",
  Balsamic: "#a0603a",
  Cacao: "#6b4423",
  Cherry: "#a3243b",
  Chocolate: "#5c3a21",
  Cinnamon: "#a5552a",
  Coconut: "#efe6d2",
  Earthy: "#7a6a4f",
  Gourmand: "#c99a6b",
  Iris: "#9d8fc2",
  Lactonic: "#f1ead8",
  Metallic: "#a7adb4",
  Nutty: "#a57c52",
  Rum: "#8a4b2a",
  Salty: "#b9d3dc",
  Soapy: "#dbe9ef",
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
  Notes?: {
    Top?: (FragellaNote | string)[];
    Middle?: (FragellaNote | string)[];
    Base?: (FragellaNote | string)[];
  };
  "Main Accords"?: string[];
  "Main Accords Percentage"?: Record<string, string>;
  "Image URL"?: string;
  "Image URL Transparent"?: string; // bottle cut out, .webp
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

  // The brand filter on /fragrances sorts by popularity, so two pages of 10
  // give a brand's 20 best-known fragrances. (/brands/:name returns 20 in one
  // request, but in no useful order: hair mists and obscure flankers included.)
  const needed = todo.length * PAGES_PER_BRAND;
  let remaining = await remainingRequests();
  if (remaining < needed) {
    throw new Error(`Need up to ${needed} requests but only ${remaining} remain this month. Nothing was fetched.`);
  }

  for (const brand of todo) {
    const data: FragellaFragrance[] = [];
    for (let page = 1; page <= PAGES_PER_BRAND; page++) {
      const res = await get(`/fragrances?brand=${encodeURIComponent(brand)}&limit=10&page=${page}`);
      remaining--;
      data.push(...toList(res));
      if (!res?.pagination?.has_more) break;
    }
    await writeFile(cacheFile(brand), JSON.stringify({ brand, fetchedAt: new Date().toISOString(), data }, null, 2));
    console.log(`${brand}: saved ${data.length} fragrances`);
  }
  console.log(`${remaining} requests left this month.`);
}

const PAGES_PER_BRAND = 2; // Fragella allows at most 2 pages of 10

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

// The docs show notes as {name}, but the API actually returns plain strings.
function noteNames(list: (FragellaNote | string)[] = []) {
  return list
    .map((n) => (typeof n === "string" ? n : (n.name ?? "")).trim().replace(/\s+/g, " "))
    .filter(Boolean);
}

// Products in a brand's listing that aren't a perfume, or are a retail
// listing of one (sizes, testers, travel sets) rather than the fragrance.
const NOT_A_PERFUME =
  /\b(hair mist|body mist|hair perfume|deodorant|shower gel|body lotion|body cream|hand cream|soap|after ?shave|lotion|balm)\b/i;
const RETAIL_LISTING = /\b(\d+\s?ml|tester|travel (case|spray)|gift set|coffret|refill|miniature)\b/i;

// Brand words Fragella adds after the name ("Libre Yves Saint Laurent",
// "Mon Paris Ysl"). Only listed brands: for others a trailing brand is part of
// the real name ("Bleu de Chanel", "Miss Dior").
const BRAND_SUFFIXES: Record<string, string[]> = {
  "Yves Saint Laurent": ["Yves Saint Laurent", "YSL"],
};

// Real names that start with the brand, so the brand prefix stays.
const BRAND_IN_NAME = /^(dior homme|dior addict|chanel #?\s?n?°?\s?\d+)\b/i;

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Lowercase, no accents or punctuation: "Althaïr" and "Althair", "L'Homme"
// and "Lhomme" are the same name.
const looseName = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

// Fragella names carry extra words: "Tom Ford Lost Cherry" → "Lost Cherry",
// "Chance Eau Tendre Eau de Parfum for women" → "Chance Eau Tendre",
// "Black Opium Edp" → "Black Opium". Concentration and gender have their own
// fields, and the brand is shown separately. A name that matches one of our
// curated fragrances takes the curated spelling, so curated data wins.
function cleanName(raw: string, brands: string[], curatedNames: string[]) {
  let name = raw.trim().replace(/\s+/g, " ");
  const suffixes = brands.flatMap((b) => BRAND_SUFFIXES[b] ?? []).map(escape).join("|");
  for (let i = 0; i < 3; i++) {
    // Several suffixes can stack: "Libre Le Parfum Yves Saint Laurent for women".
    name = name
      .replace(/\s+(for women and men|for men and women|for women|for men|unisex)$/i, "")
      .replace(/\s+(extrait de parfum|eau de parfum|eau de toilette|eau de cologne|edp|edt|edc)$/i, "");
    if (suffixes) name = name.replace(new RegExp(`\\s+(${suffixes})$`, "i"), "");
  }
  if (!BRAND_IN_NAME.test(name)) {
    const prefixes = brands.flatMap((b) => [b, ...(BRAND_SUFFIXES[b] ?? [])]);
    for (const prefix of prefixes) {
      name = name.replace(new RegExp(`^${escape(prefix)}\\s+`, "i"), "");
    }
  }
  return curatedNames.find((c) => looseName(c) === looseName(name)) ?? name;
}

// For spotting the same fragrance under two spellings within one brand.
const sameNameKey = (brand: string, name: string) => `${slugify(brand)}:${looseName(name)}`;

// Turn one Fragella entry into our catalog shape, or a reason it was skipped.
function toCatalog(f: FragellaFragrance, requestedBrand: string): CatalogFragrance | string {
  if (!f.Name?.trim()) return "missing name";
  if (NOT_A_PERFUME.test(f.Name)) return "not a perfume";
  if (RETAIL_LISTING.test(f.Name)) return "retail listing (size, tester or set)";

  const fragellaBrand = f.Brand?.trim() || requestedBrand;
  const brandName = BRAND_ALIASES[fragellaBrand] ?? BRAND_ALIASES[requestedBrand] ?? fragellaBrand;
  const brandForms = [...new Set([fragellaBrand, requestedBrand, brandName])];
  const curatedNames = curatedFragrances.filter((c) => c.brand === brandName).map((c) => c.name);
  const name = cleanName(f.Name, brandForms, curatedNames);
  if (!name) return "missing name";
  if (brandForms.some((b) => b.toLowerCase() === name.toLowerCase())) return "named only after the brand";
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
    imageUrl: f["Image URL Transparent"] || f["Image URL"] || null,
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
      // The same fragrance can appear twice under different spellings, or as
      // two concentrations with one name. Results come most popular first,
      // so keep the first and skip the rest.
      const key = sameNameKey(result.brand, result.name);
      const kept = fragrances.get(key);
      if (kept) {
        // Keep the more popular entry's data, but the fuller spelling of its
        // name ("L'Homme" over "Lhomme"), unless it's a curated name.
        if (result.name.length > kept.name.length && !curatedFragrances.some((c) => c.name === kept.name)) {
          kept.name = result.name;
        }
        skipped.push(`${brand} ${entry.Name}: same as "${kept.name}"`);
        continue;
      }
      fragrances.set(key, result);
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
  // Then the notes, accords, perfumers and brands no remaining fragrance uses.
  // Everything curated is still linked from data.ts, so only imported ones go.
  const orphans = await pool.query(`
    with n as (delete from notes x where not exists (select 1 from fragrance_notes l where l.note_id = x.id) returning 1),
         a as (delete from accords x where not exists (select 1 from fragrance_accords l where l.accord_id = x.id) returning 1),
         p as (delete from perfumers x where not exists (select 1 from fragrance_perfumers l where l.perfumer_id = x.id) returning 1),
         b as (delete from brands x where not exists (select 1 from fragrances f where f.brand_id = x.id) returning 1)
    select (select count(*) from n) + (select count(*) from a) + (select count(*) from p) + (select count(*) from b) as count`);
  await pool.end();
  console.log(
    `Removed ${deleted.length} imported fragrances and ${orphans.rows[0].count} notes/accords/perfumers/brands ` +
      `only they used. Curated ones are untouched.`,
  );
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  const force = args.includes("--force");
  const names = args.filter((a) => a !== "--force");

  if (command === "usage") return usage();
  if (command === "fetch") return fetchBrands(names, force);
  if (command === "load") return load().then(refreshRunningServer);
  if (command === "remove") return remove().then(refreshRunningServer);
  console.log('Usage: npm run fragella -- usage | fetch "<Brand>" [...] [--force] | load | remove');
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
