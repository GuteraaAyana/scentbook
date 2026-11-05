// Search-as-you-type for fragrances and people. Pure, so it runs in the
// browser on every keystroke and is tested (search.test.ts).

// Lowercase, no accents, punctuation as spaces: "Acqua di Giò" → "acqua di gio".
export function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function queryWords(query: string): string[] {
  return fold(query).split(" ").filter(Boolean);
}

// How well one query word fits a field: 3 = starts the field, 2 = starts one
// of its words ("char" in "Tobacco Charm"), 1 = anywhere inside, 0 = not there.
function wordScore(word: string, field: string): number {
  if (!field) return 0;
  if (field.startsWith(word)) return 3;
  if (field.includes(` ${word}`)) return 2;
  return field.includes(word) ? 1 : 0;
}

export type Searchable = { fields: { text: string; weight: number }[] };

// Every query word has to match somewhere; the best field for each word adds
// up to the item's score. Returns the matching indexes, best first (ties keep
// their original order).
export function rank<T>(items: T[], query: string, fieldsOf: (item: T) => Searchable["fields"]): T[] {
  const words = queryWords(query);
  if (words.length === 0) return items;
  const scored: { item: T; score: number; i: number }[] = [];
  items.forEach((item, i) => {
    const fields = fieldsOf(item);
    let total = 0;
    for (const word of words) {
      let best = 0;
      for (const f of fields) best = Math.max(best, wordScore(word, f.text) * f.weight);
      if (best === 0) return; // this word matches nothing: the item drops out
      total += best;
    }
    scored.push({ item, score: total, i });
  });
  return scored.sort((a, b) => b.score - a.score || a.i - b.i).map((s) => s.item);
}

// --- Fragrances ---------------------------------------------------------------

export type FragranceSearchEntry = {
  slug: string;
  name: string;
  brand: string;
  notes: string[];
  accordNames: string[];
};

// Folded once when the index arrives, not on every keystroke.
export type PreparedFragrance<T> = T & { search: Searchable["fields"] };

export function prepareFragrances<T extends FragranceSearchEntry>(entries: T[]): PreparedFragrance<T>[] {
  return entries.map((e) => ({
    ...e,
    search: [
      { text: fold(e.name), weight: 4 },
      { text: fold(e.brand), weight: 3 },
      { text: fold(`${e.brand} ${e.name}`), weight: 2 },
      { text: fold(e.accordNames.join(" ")), weight: 1.5 },
      { text: fold(e.notes.join(" ")), weight: 1 },
    ],
  }));
}

export function searchFragrances<T>(prepared: PreparedFragrance<T>[], query: string): PreparedFragrance<T>[] {
  return rank(prepared, query, (f) => f.search);
}

// --- People -------------------------------------------------------------------

export function searchPeople<T extends { name: string; username: string | null; bio: string | null }>(
  people: T[],
  query: string,
): T[] {
  return rank(people, query, (p) => [
    { text: fold(p.username ?? ""), weight: 3 },
    { text: fold(p.name), weight: 3 },
    { text: fold(p.bio ?? ""), weight: 1 },
  ]);
}
