// Turns a fragrance's note pyramid into a sentence for its page ("How it
// unfolds"), so every fragrance reads like a short review even without a
// hand-written description. Tested in writing.test.ts.

// Words in note names that name a place or person, so they stay capitalised
// mid-sentence ("Turkish rose", not "turkish rose").
const PROPER = new Set([
  "Bourbon", "Bulgarian", "Calabrian", "Ceylon", "Damask", "Egyptian", "Florentine", "Grasse", "Haitian",
  "Indian", "Indonesian", "Italian", "Jamaican", "Java", "Madagascar", "Mexican", "Moroccan", "Mysore",
  "Peru", "Provence", "Sichuan", "Sicilian", "Tahitian", "Tolu", "Turkish", "Virginia", "Virginian",
]);

export function noteInSentence(note: string) {
  return note
    .split(" ")
    .map((word) => (PROPER.has(word) ? word : word.toLowerCase()))
    .join(" ");
}

// "a", "a and b", "a, b and c"
export function joinList(items: string[]) {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

const MAX_PER_STAGE = 5;

export function describeUnfolding(notes: { top: string[]; heart: string[]; base: string[] }): string | null {
  const list = (names: string[]) => joinList(names.slice(0, MAX_PER_STAGE).map(noteInSentence));
  const { top, heart, base } = notes;
  if (top.length + heart.length + base.length === 0) return null;

  const parts: string[] = [];
  if (top.length) parts.push(`It opens with ${list(top)}.`);
  if (heart.length) parts.push(top.length ? `Over the next few hours it turns to ${list(heart)}` : `At its heart it's ${list(heart)}`);
  if (base.length) {
    const ending = `by evening what's left is ${list(base)}.`;
    if (heart.length) parts[parts.length - 1] += `, and ${ending}`;
    else if (top.length) parts[parts.length - 1] = parts[parts.length - 1].replace(/\.$/, `, and ${ending}`);
    else parts.push(`By evening what's left is ${list(base)}.`);
  } else if (heart.length) {
    parts[parts.length - 1] += ".";
  }
  return parts.join(" ");
}
