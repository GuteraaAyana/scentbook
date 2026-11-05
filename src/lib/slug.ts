// URL-friendly names, used for every catalog row's slug. Shared by the seed,
// the Fragella import and the moderator's add-fragrance page, so the same
// name always gets the same slug wherever it comes from.

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

// Fragrances are slugged "<brand>-<name>", e.g. "le-labo-santal-33".
export function fragranceSlug(f: { brand: string; name: string }) {
  return slugify(`${f.brand} ${f.name}`);
}
