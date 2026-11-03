"use server";
// Saves the profile settings form. A Server Action is a public endpoint, so
// it checks the session and validates everything itself.
import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { headers } from "next/headers";
import { db } from "@/db";
import { users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { type ProfileErrors, type ProfileInput, validateProfile } from "@/lib/profile";

export type ProfileFormState = {
  values: ProfileInput;
  errors: ProfileErrors;
  saved: boolean;
  message: string | null;
};

// Postgres reports a unique-constraint clash as error code 23505; Drizzle
// passes the driver's error through as `cause`.
function isUniqueViolation(error: unknown) {
  const e = error as { code?: string; cause?: { code?: string } };
  return e?.code === "23505" || e?.cause?.code === "23505";
}

export async function updateProfile(_previous: ProfileFormState, form: FormData): Promise<ProfileFormState> {
  const values: ProfileInput = {
    username: String(form.get("username") ?? ""),
    bio: String(form.get("bio") ?? ""),
    city: String(form.get("city") ?? ""),
  };

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { values, errors: {}, saved: false, message: "Your session ended. Sign in again to save." };

  const result = validateProfile(values);
  if (!result.ok) return { values, errors: result.errors, saved: false, message: null };

  try {
    await db
      .update(users)
      .set({ ...result.value, updatedAt: new Date() })
      .where(eq(users.id, session.user.id));
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { values, errors: { username: "That username is taken. Try another." }, saved: false, message: null };
    }
    throw error;
  }

  refresh();
  const saved = { username: result.value.username, bio: result.value.bio ?? "", city: result.value.city ?? "" };
  return { values: saved, errors: {}, saved: true, message: null };
}
