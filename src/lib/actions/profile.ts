"use server";
// Saves the profile settings form. A Server Action is a public endpoint, so
// it checks the session and validates everything itself.
import { eq } from "drizzle-orm";
import { refresh, updateTag } from "next/cache";
import { headers } from "next/headers";
import { db } from "@/db";
import { users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { type ProfileErrors, type ProfileInput, usernameChange, validateProfile } from "@/lib/profile";

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

  const [current] = await db
    .select({ username: users.username, changedAt: users.usernameChangedAt })
    .from(users)
    .where(eq(users.id, session.user.id));
  const now = new Date();
  const change = usernameChange(current ?? { username: null, changedAt: null }, result.value.username, now);
  if (!change.allowed) {
    const when = change.availableAt.toLocaleDateString("en", { month: "long", day: "numeric" });
    return {
      values,
      errors: { username: `You can change your username once a week. Next change: ${when}.` },
      saved: false,
      message: null,
    };
  }

  try {
    await db
      .update(users)
      .set({ ...result.value, ...(change.changed && { usernameChangedAt: now }), updatedAt: now })
      .where(eq(users.id, session.user.id));
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { values, errors: { username: "That username is taken. Try another." }, saved: false, message: null };
    }
    throw error;
  }

  updateTag("reviews"); // cached reviews show the author's name and username
  refresh();
  const saved = { username: result.value.username, bio: result.value.bio ?? "", city: result.value.city ?? "" };
  return { values: saved, errors: {}, saved: true, message: null };
}
