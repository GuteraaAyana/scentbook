import type { CSSProperties } from "react";

type Accord = { color: string; strength: number };

// A poster's background: its strongest accords blended top to bottom, so a
// cherry gourmand reads red and almond, a woody amber brown and gold. It's
// what makes every poster recognisable, with or without a bottle photo.
export function accordWash(accords: Accord[]): CSSProperties {
  const colors = accords.slice(0, 3).map((a) => a.color);
  if (colors.length === 0) return { backgroundColor: "var(--surface)" };
  if (colors.length === 1) colors.push(colors[0]);
  const stops = colors.map((c, i) => `${c} ${Math.round((i / (colors.length - 1)) * 100)}%`);
  return { backgroundImage: `linear-gradient(160deg, ${stops.join(", ")})` };
}
