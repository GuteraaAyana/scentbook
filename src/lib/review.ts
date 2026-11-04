// Rules for a review, shared by the form and the server action and kept pure
// so they can be tested (review.test.ts).

export const BODY_MIN = 10;
export const BODY_MAX = 2000;

// What each 1-5 rating means, in plain words. Index 0 is rating 1.
export const LONGEVITY = ["Under an hour", "A couple of hours", "Half a day", "Long lasting", "All day and beyond"];
export const SILLAGE = ["Close to the skin", "Soft", "Noticeable", "Strong", "Fills the room"];

export type ReviewInput = { body: string; longevity: string; sillage: string };
export type ReviewValues = { body: string; longevity: number | null; sillage: number | null };
export type ReviewErrors = Partial<Record<keyof ReviewInput, string>>;

function rating(value: string) {
  if (!value.trim()) return { value: null, ok: true };
  const n = /^\d+$/.test(value.trim()) ? Number(value) : NaN;
  return { value: n, ok: Number.isInteger(n) && n >= 1 && n <= 5 };
}

export function validateReview(input: ReviewInput): { ok: true; value: ReviewValues } | { ok: false; errors: ReviewErrors } {
  // Keep paragraph breaks, but no more than one blank line in a row.
  const body = input.body.trim().replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n");
  const longevity = rating(input.longevity);
  const sillage = rating(input.sillage);
  const errors: ReviewErrors = {};

  if (body.length < BODY_MIN) errors.body = `Write at least ${BODY_MIN} characters.`;
  else if (body.length > BODY_MAX) errors.body = `Keep it to ${BODY_MAX} characters (it's ${body.length}).`;
  if (!longevity.ok) errors.longevity = "Choose one of the five options.";
  if (!sillage.ok) errors.sillage = "Choose one of the five options.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { body, longevity: longevity.value, sillage: sillage.value } };
}

// "Long lasting" for an average of 4.4: the nearest named step.
export function averageLabel(labels: string[], average: number) {
  return labels[Math.min(labels.length, Math.max(1, Math.round(average))) - 1];
}
