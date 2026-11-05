// Rules for a moderator adding a fragrance (/admin/fragrances/new): reading
// pasted lists, matching names to what's already in the catalog, and
// validating the result. Pure, so the form can show matches as you type and
// the server can check them again (tests: catalog-entry.test.ts).
import { concentrationLabels, genderLabels } from "./labels";
import { slugify } from "./slug";

export const CONCENTRATIONS = Object.keys(concentrationLabels) as (keyof typeof concentrationLabels)[];
export const GENDERS = Object.keys(genderLabels) as (keyof typeof genderLabels)[];
export type Concentration = (typeof CONCENTRATIONS)[number];
export type Gender = (typeof GENDERS)[number];

export const LIMITS = {
  name: 100,
  brand: 80,
  perfumer: 80,
  description: 500,
  imageUrl: 500,
  notesPerLayer: 30,
  accords: 15,
  perfumers: 6,
};

// --- Reading lists ------------------------------------------------------------

// "Pink Pepper, Pineapple and Lavender" / one per line / "a; b • c".
export function splitList(text: string): string[] {
  const seen = new Set<string>();
  const items: string[] = [];
  for (const part of text.split(/[,;\n•·|]+|\s+and\s+|\s+&\s+/i)) {
    const item = part.replace(/\s+/g, " ").replace(/^[\s\-*.]+|[\s.]+$/g, "");
    const key = slugify(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    items.push(item);
  }
  return items;
}

// Fragrance sites describe the pyramid in a sentence: "Top notes are Pink
// Pepper, Pineapple and Lavender; middle notes are Toffee, Cinnamon and Sage;
// base notes are Vanilla, Amber and Musk." Returns null for anything else.
export function parsePyramidSentence(text: string): { top: string[]; heart: string[]; base: string[] } | null {
  const grab = (label: string) => {
    const match = text.match(new RegExp(`${label}\\s+notes?\\s+(?:are|is|:)\\s*([^;.]+)`, "i"));
    return match ? splitList(match[1]) : [];
  };
  const top = grab("top");
  const heart = [...grab("middle"), ...grab("heart")];
  const base = grab("base");
  return top.length + heart.length + base.length > 0 ? { top, heart, base } : null;
}

// "Amber 100", "warm spicy: 80", "Vanilla (65%)", or names alone in order of
// strength (as fragrance sites list them): 100, 90, 80... down to 30.
export function parseAccords(text: string): { name: string; strength: number }[] {
  return splitList(text).map((item, i) => {
    const match = item.match(/^(.*?)[\s:]*\(?(\d{1,3})\s*%?\)?$/);
    const name = (match ? match[1] : item).trim();
    const strength = match ? Number(match[2]) : Math.max(30, 100 - i * 10);
    return { name, strength };
  });
}

// --- Matching names to the catalog ----------------------------------------------

// What two spellings of the same thing have in common: no case, accents,
// punctuation, or trailing plural "s" ("Pink Peppers" = "pink pepper").
export function nameKey(name: string): string {
  const slug = slugify(name);
  return slug.length > 3 && slug.endsWith("s") && !slug.endsWith("ss") ? slug.slice(0, -1) : slug;
}

function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const current = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = current;
    }
  }
  return row[b.length];
}

// "pink pepper" → "Pink Pepper"; anything already mixed-case is kept as typed
// ("YSL", "McQueen").
export function tidyName(raw: string): string {
  const name = raw.replace(/\s+/g, " ").trim();
  const mixed = name !== name.toLowerCase() && name !== name.toUpperCase();
  return mixed ? name : name.toLowerCase().replace(/(^|[\s\-'(])(\p{L})/gu, (_, sep, ch) => sep + ch.toUpperCase());
}

export type NameMatch =
  | { kind: "existing"; input: string; name: string }
  | { kind: "new"; input: string; name: string; suggestion: string | null };

export type Catalog = { index: Map<string, string>; names: string[] };

export function catalogIndex(names: string[]): Catalog {
  return { index: new Map(names.map((n) => [nameKey(n), n])), names };
}

// The catalog's own spelling if it already has this name; otherwise the tidied
// new name, plus the closest existing one when it's probably a typo.
export function matchName(raw: string, catalog: Catalog): NameMatch {
  const input = raw.trim();
  const key = nameKey(input);
  const existing = catalog.index.get(key);
  if (existing) return { kind: "existing", input, name: existing };

  // A likely typo: a few letters off ("Bergamont" → "Bergamot").
  let best: { name: string; distance: number } | null = null;
  for (const name of catalog.names) {
    const distance = editDistance(key, nameKey(name));
    if (!best || distance < best.distance) best = { name, distance };
  }
  const allowed = key.length <= 4 ? 1 : key.length <= 8 ? 2 : 3;
  let suggestion = best && best.distance <= allowed ? best.name : null;

  // Or a shortened name: whole words of a longer one ("Armani" → "Giorgio
  // Armani", "Kurkdjian" → "Maison Francis Kurkdjian").
  if (!suggestion && key.length >= 4) {
    const within = catalog.names.filter((name) => `-${slugify(name)}-`.includes(`-${slugify(input)}-`));
    if (within.length === 1) suggestion = within[0];
  }

  return { kind: "new", input, name: tidyName(input), suggestion };
}

// --- Validating the whole form --------------------------------------------------

export type FragranceDraft = {
  brand: string;
  brandCountry: string;
  name: string;
  releaseYear: string;
  concentration: string;
  gender: string;
  perfumers: string;
  top: string;
  heart: string;
  base: string;
  accords: string;
  description: string;
  imageUrl: string;
};

export type FragranceEntry = {
  brand: string;
  brandCountry: string | null;
  name: string;
  releaseYear: number | null;
  concentration: Concentration;
  gender: Gender;
  perfumers: string[];
  notes: { top: string[]; heart: string[]; base: string[] };
  accords: { name: string; strength: number }[];
  description: string | null;
  imageUrl: string | null;
};

export type DraftErrors = Partial<Record<keyof FragranceDraft | "notes", string>>;

export function validateDraft(
  draft: FragranceDraft,
  thisYear: number,
): { ok: true; value: FragranceEntry } | { ok: false; errors: DraftErrors } {
  const errors: DraftErrors = {};
  const brand = tidyName(draft.brand);
  const name = tidyName(draft.name);
  const description = draft.description.trim();
  const imageUrl = draft.imageUrl.trim();
  const perfumers = splitList(draft.perfumers).map(tidyName);
  const notes = {
    top: splitList(draft.top).map(tidyName),
    heart: splitList(draft.heart).map(tidyName),
    base: splitList(draft.base).map(tidyName),
  };
  const accords = parseAccords(draft.accords).map((a) => ({ ...a, name: tidyName(a.name) }));

  if (!brand) errors.brand = "Which house makes it?";
  else if (brand.length > LIMITS.brand) errors.brand = `Keep it to ${LIMITS.brand} characters.`;
  if (!name) errors.name = "Give it a name.";
  else if (name.length > LIMITS.name) errors.name = `Keep it to ${LIMITS.name} characters.`;

  let releaseYear: number | null = null;
  if (draft.releaseYear.trim()) {
    releaseYear = Number(draft.releaseYear.trim());
    if (!Number.isInteger(releaseYear) || releaseYear < 1700 || releaseYear > thisYear + 1) {
      errors.releaseYear = `A year from 1700 to ${thisYear + 1}, or leave it empty.`;
    }
  }
  if (!CONCENTRATIONS.includes(draft.concentration as Concentration)) errors.concentration = "Choose one.";
  if (!GENDERS.includes(draft.gender as Gender)) errors.gender = "Choose one.";

  if (perfumers.length > LIMITS.perfumers) errors.perfumers = `At most ${LIMITS.perfumers} perfumers.`;
  else if (perfumers.some((p) => p.length > LIMITS.perfumer)) errors.perfumers = "One of those names is too long.";

  if (notes.top.length + notes.heart.length + notes.base.length === 0) {
    errors.notes = "Add at least one note.";
  }
  for (const layer of ["top", "heart", "base"] as const) {
    if (notes[layer].length > LIMITS.notesPerLayer) errors[layer] = `At most ${LIMITS.notesPerLayer} notes here.`;
  }
  if (accords.length > LIMITS.accords) errors.accords = `At most ${LIMITS.accords} accords.`;
  else if (accords.some((a) => a.strength < 1 || a.strength > 100)) errors.accords = "Strengths go from 1 to 100.";

  if (description.length > LIMITS.description) errors.description = `Keep it to ${LIMITS.description} characters.`;
  if (imageUrl) {
    let ok = false;
    try {
      ok = new URL(imageUrl).protocol === "https:" && imageUrl.length <= LIMITS.imageUrl;
    } catch {}
    if (!ok) errors.imageUrl = "An https:// link to the bottle photo, or leave it empty.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      brand,
      brandCountry: draft.brandCountry.trim() || null,
      name,
      releaseYear,
      concentration: draft.concentration as Concentration,
      gender: draft.gender as Gender,
      perfumers,
      notes,
      accords,
      description: description || null,
      imageUrl: imageUrl || null,
    },
  };
}
