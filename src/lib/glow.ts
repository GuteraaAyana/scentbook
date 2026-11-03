import type { CSSProperties } from "react";

type Accord = { color: string; strength: number };

// The light inside a fragrance's display case: soft pools of its strongest
// accord colors, so a woody amber glows brown and gold and a cherry gourmand
// glows red and pink. It's what makes every case recognisable, with or
// without a bottle photo.
export function scentGlow(accords: Accord[]): CSSProperties {
  const [a, b, c] = accords;
  const pool = (color: string, strength: number, at: string, size: string) =>
    `radial-gradient(${size} at ${at}, color-mix(in oklab, ${color} ${Math.round(30 + strength * 0.4)}%, transparent), transparent 70%)`;

  const layers = [
    a && pool(a.color, a.strength, "50% 62%", "70% 60%"),
    b && pool(b.color, b.strength, "22% 82%", "60% 50%"),
    c && pool(c.color, c.strength, "80% 78%", "55% 45%"),
  ].filter(Boolean);

  return {
    backgroundColor: "var(--surface)",
    backgroundImage: layers.length ? layers.join(", ") : undefined,
  };
}
