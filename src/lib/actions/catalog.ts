"use server";
// A moderator adds a fragrance to the catalog. Every name is matched to the
// catalog's own spelling where one exists, and anything new is created, all
// through the same upsertCatalog the seed and the Fragella import use.
import { updateTag } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { findFragranceBySlug, getCatalogNames } from "@/db/catalog-admin";
import { isAdmin } from "@/db/moderation";
import { upsertCatalog } from "@/db/seed/upsert";
import { auth } from "@/lib/auth";
import {
  type DraftErrors,
  type FragranceDraft,
  catalogIndex,
  matchName,
  nameKey,
  validateDraft,
} from "@/lib/catalog-entry";
import { fragranceSlug } from "@/lib/slug";

export type AddFragranceState = {
  errors: DraftErrors;
  message: string | null;
  attempt: number;
};

const FIELDS: (keyof FragranceDraft)[] = [
  "brand", "brandCountry", "name", "releaseYear", "concentration", "gender",
  "perfumers", "top", "heart", "base", "accords", "description", "imageUrl",
];
const NEW_ACCORD_COLOR = "#9ca3af"; // grey, as the Fragella import uses
const HEX = /^#[0-9a-f]{6}$/i;

export async function addFragrance(previous: AddFragranceState, form: FormData): Promise<AddFragranceState> {
  const failed = (changes: Partial<AddFragranceState>) => ({
    errors: {},
    message: null,
    ...changes,
    attempt: previous.attempt + 1,
  });

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || !(await isAdmin(session.user.id))) return failed({ message: "Only moderators can add fragrances." });

  const draft = Object.fromEntries(FIELDS.map((k) => [k, String(form.get(k) ?? "")])) as FragranceDraft;
  const result = validateDraft(draft, new Date().getFullYear());
  if (!result.ok) return failed({ errors: result.errors });
  const entry = result.value;

  // Match every name to the catalog's spelling where it already exists.
  const catalog = await getCatalogNames();
  const brandMatch = matchName(entry.brand, catalogIndex(catalog.brands.map((b) => b.name)));
  const brand = brandMatch.name;
  const resolve = (names: string[], known: string[]) => {
    const index = catalogIndex(known);
    return [...new Set(names.map((n) => matchName(n, index).name))];
  };
  const notes = {
    top: resolve(entry.notes.top, catalog.notes),
    heart: resolve(entry.notes.heart, catalog.notes),
    base: resolve(entry.notes.base, catalog.notes),
  };
  const perfumers = resolve(entry.perfumers, catalog.perfumers);
  const accordIndex = catalogIndex(catalog.accords.map((a) => a.name));
  const accordColors = new Map(catalog.accords.map((a) => [a.name, a.color]));
  const accords = new Map<string, { strength: number; color: string }>();
  for (const a of entry.accords) {
    const name = matchName(a.name, accordIndex).name;
    if (accords.has(name)) continue;
    const picked = String(form.get(`color:${nameKey(name)}`) ?? "");
    accords.set(name, {
      strength: a.strength,
      color: accordColors.get(name) ?? (HEX.test(picked) ? picked.toLowerCase() : NEW_ACCORD_COLOR),
    });
  }

  const slug = fragranceSlug({ brand, name: entry.name });
  const existing = await findFragranceBySlug(slug);
  if (existing) {
    return failed({
      errors: {
        name: `${brand} ${existing.name} is already in the catalog. A different version? Put it in the name, like "… Parfum".`,
      },
    });
  }

  const allNotes = [...new Set([...notes.top, ...notes.heart, ...notes.base])];
  await upsertCatalog(db, {
    source: "moderator",
    brands: [{ name: brand, country: entry.brandCountry }],
    notes: allNotes.map((name) => ({ name, family: null })),
    accords: [...accords].map(([name, a]) => ({ name, color: a.color })),
    fragrances: [
      {
        brand,
        name: entry.name,
        releaseYear: entry.releaseYear,
        concentration: entry.concentration,
        gender: entry.gender,
        perfumers,
        description: entry.description ?? undefined,
        notes,
        accords: Object.fromEntries([...accords].map(([name, a]) => [name, a.strength])),
        imageUrl: entry.imageUrl,
        addedBy: session.user.id,
      },
    ],
  });

  updateTag("fragrances"); // browse, home and search show it now
  redirect(`/fragrances/${slug}`);
}
