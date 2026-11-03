// The rules of Beli-style ranking (DECISIONS.md 005), kept free of the
// database and the UI so they can be tested on their own (ranking.test.ts).
//
// You first say how you felt (loved / fine / disliked), then place the
// fragrance among the others in that bucket by answering "which do you
// prefer?" a few times. Within a bucket, a higher sort key means better.

export type Sentiment = "loved" | "fine" | "disliked";

// ---------------------------------------------------------------------------
// Placing: a binary search where you are the comparison function.
//
// The bucket is ordered best first. `lo..hi` is the range of positions the new
// fragrance could still go in (0 = above everything, n = below everything).
// Each answer halves it, so n fragrances take about log2(n + 1) questions.

export type Placement = { lo: number; hi: number };

export function startPlacement(bucketSize: number): Placement {
  return { lo: 0, hi: bucketSize };
}

// The index of the fragrance to compare against next, or null when the
// position is decided (it's then `lo`).
export function comparison(state: Placement): number | null {
  return state.lo < state.hi ? Math.floor((state.lo + state.hi) / 2) : null;
}

// "better": the new one beats the fragrance it was shown against.
// "same": can't choose, so it goes right after that fragrance.
export function placeAfterAnswer(state: Placement, answer: "better" | "worse" | "same"): Placement {
  const pivot = comparison(state);
  if (pivot === null) return state;
  if (answer === "better") return { lo: state.lo, hi: pivot };
  if (answer === "worse") return { lo: pivot + 1, hi: state.hi };
  return { lo: pivot + 1, hi: pivot + 1 };
}

// ---------------------------------------------------------------------------
// Sort keys: the new fragrance gets a key between its neighbours', so only its
// own row is written.

// `above` is the key of the fragrance just better than it, `below` the one
// just worse; null at either end. Returns null if the two keys are so close
// that no number fits between them, and the bucket needs renumbering first.
export function keyBetween(above: number | null, below: number | null): number | null {
  if (above === null && below === null) return 0;
  if (above === null) return below! + 1;
  if (below === null) return above - 1;
  const middle = (above + below) / 2;
  return middle === above || middle === below ? null : middle;
}

// Fresh evenly spaced keys for a whole bucket, best first: n, n-1, ... 1.
// Only needed after dozens of inserts into the same gap.
export function renumberedKeys(count: number): number[] {
  return Array.from({ length: count }, (_, i) => count - i);
}

// ---------------------------------------------------------------------------
// Scores: worked out from the position whenever they're shown, never stored,
// so they stay right as the list changes. Each bucket owns a band of the
// 0-10 scale, and the bands never overlap.

const BANDS: Record<Sentiment, { top: number; bottom: number }> = {
  loved: { top: 10, bottom: 6.7 },
  fine: { top: 6.6, bottom: 3.4 },
  disliked: { top: 3.3, bottom: 0 },
};

// Score for the fragrance at `index` (0 = best) in a bucket of `count`. The
// best gets the top of the band; the worst stays just above the bottom.
export function scoreFor(sentiment: Sentiment, index: number, count: number): number {
  const { top, bottom } = BANDS[sentiment];
  const score = top - ((top - bottom) * index) / Math.max(count, 1);
  return Math.round(score * 10) / 10;
}
