"use server";
// Server Actions for the wear diary. Public endpoints like every Server
// Action, so each checks the session and validates its input itself.
import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { headers } from "next/headers";
import { db } from "@/db";
import { fragrances, users, wears } from "@/db/schema";
import { auth } from "@/lib/auth";
import { consumeLimit, limitMessage } from "@/lib/rate-limit";
import { type WearErrors, type WearInput, validateWear } from "@/lib/wear";

// `values` and `attempt` come back with errors: React resets a form after its
// action runs, so the form is rebuilt (keyed on `attempt`) from what was sent
// instead of losing what the person typed.
export type WearFormState = {
  errors: WearErrors;
  message: string | null;
  saved: number;
  values: WearInput | null;
  attempt: number;
};

async function currentUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

// Log one wear of `fragranceId`. `saved` counts successful saves so the form
// can tell a fresh save from an old one.
export async function logWear(fragranceId: number, previous: WearFormState, form: FormData): Promise<WearFormState> {
  const userId = await currentUserId();
  const input: WearInput = {
    wornOn: String(form.get("wornOn") ?? ""),
    occasion: String(form.get("occasion") ?? ""),
    weather: String(form.get("weather") ?? ""),
    temperature: String(form.get("temperature") ?? ""),
    unit: String(form.get("unit") ?? "c"),
    place: String(form.get("place") ?? ""),
    placeLatitude: String(form.get("placeLatitude") ?? ""),
    placeLongitude: String(form.get("placeLongitude") ?? ""),
    compliments: String(form.get("compliments") ?? ""),
    note: String(form.get("note") ?? ""),
  };
  const failed = (changes: Partial<WearFormState>) => ({
    ...previous,
    errors: {},
    message: null,
    ...changes,
    values: input,
    attempt: previous.attempt + 1,
  });
  if (!userId) return failed({ message: "Your session ended. Sign in again to save." });
  if (!Number.isInteger(fragranceId)) return failed({ message: "Unknown fragrance." });

  const today = new Date().toISOString().slice(0, 10);
  const result = validateWear(input, today);
  if (!result.ok) return failed({ errors: result.errors });

  const [exists] = await db.select({ id: fragrances.id }).from(fragrances).where(eq(fragrances.id, fragranceId));
  if (!exists) return failed({ message: "Unknown fragrance." });

  const limit = await consumeLimit("wear", userId);
  if (!limit.allowed) return failed({ message: limitMessage(limit.retryAfterSeconds) });

  const { unit, ...entry } = result.value;
  await db.insert(wears).values({ userId, fragranceId, ...entry });
  // Remember the unit they typed in, for next time and everywhere else.
  await db.update(users).set({ temperatureUnit: unit }).where(eq(users.id, userId));
  refresh();
  return { errors: {}, message: null, saved: previous.saved + 1, values: null, attempt: previous.attempt + 1 };
}

export async function deleteWear(wearId: number) {
  const userId = await currentUserId();
  if (!userId) return { error: "Sign in to change your diary." };
  if (!Number.isInteger(wearId)) return { error: "Unknown entry." };

  // Only ever your own entries, whatever id is sent.
  await db.delete(wears).where(and(eq(wears.id, wearId), eq(wears.userId, userId)));
  refresh();
  return { error: null };
}
