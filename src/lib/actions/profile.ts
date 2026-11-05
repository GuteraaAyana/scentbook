"use server";
// Saves the profile settings form. A Server Action is a public endpoint, so
// it checks the session and validates everything itself.
import { eq } from "drizzle-orm";
import { refresh, updateTag } from "next/cache";
import { headers } from "next/headers";
import { db } from "@/db";
import { users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { placeLabel } from "@/lib/places";
import { getPlace } from "@/lib/places-server";
import { type ProfileErrors, usernameChange, validateProfile } from "@/lib/profile";
import { type TemperatureUnit, isUnit } from "@/lib/temperature";

// What the form shows; sent back after a save so it can rebuild from it.
export type ProfileFormValues = {
  username: string;
  bio: string;
  city: string; // the chosen place's label
  placeId: string; // its id, "" for none, "keep" to leave an old typed city
  temperatureUnit: TemperatureUnit;
};

export type ProfileFormState = {
  values: ProfileFormValues;
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
  const unit = form.get("temperatureUnit");
  const values: ProfileFormValues = {
    username: String(form.get("username") ?? ""),
    bio: String(form.get("bio") ?? ""),
    city: String(form.get("city") ?? ""),
    placeId: String(form.get("placeId") ?? ""),
    temperatureUnit: isUnit(unit) ? unit : "c",
  };
  const failed = (errors: ProfileErrors, message: string | null = null) => ({ values, errors, saved: false, message });

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return failed({}, "Your session ended. Sign in again to save.");

  const result = validateProfile(values);
  const errors: ProfileErrors = result.ok ? {} : { ...result.errors };
  if (!isUnit(unit)) errors.temperatureUnit = "Choose °C or °F.";

  const [current] = await db
    .select({ username: users.username, changedAt: users.usernameChangedAt, cityPlaceId: users.cityPlaceId })
    .from(users)
    .where(eq(users.id, session.user.id));

  // The city: unchanged, cleared, or a new place looked up by its id, so only
  // real places from the weather service are ever saved.
  let place: Partial<typeof users.$inferInsert> = {};
  if (values.placeId === "keep") {
    // A city typed before cities came from the list, left as it was.
  } else if (!values.placeId) {
    place = { city: null, cityPlaceId: null, cityLatitude: null, cityLongitude: null, cityTimezone: null };
  } else if (Number(values.placeId) !== current?.cityPlaceId) {
    const id = Number(values.placeId);
    const found = Number.isInteger(id) && id > 0 ? await getPlace(id) : null;
    if (!found) {
      errors.city = "Couldn't check that city just now. Try choosing it again.";
    } else {
      values.city = placeLabel(found);
      place = {
        city: values.city,
        cityPlaceId: found.id,
        cityLatitude: found.latitude,
        cityLongitude: found.longitude,
        cityTimezone: found.timezone,
      };
    }
  }

  if (!result.ok || Object.keys(errors).length > 0) return failed(errors);

  const now = new Date();
  const change = usernameChange(current ?? { username: null, changedAt: null }, result.value.username, now);
  if (!change.allowed) {
    const when = change.availableAt.toLocaleDateString("en", { month: "long", day: "numeric" });
    return failed({ username: `You can change your username once a week. Next change: ${when}.` });
  }

  try {
    await db
      .update(users)
      .set({
        ...result.value,
        ...place,
        temperatureUnit: values.temperatureUnit,
        ...(change.changed && { usernameChangedAt: now }),
        updatedAt: now,
      })
      .where(eq(users.id, session.user.id));
  } catch (error) {
    if (isUniqueViolation(error)) return failed({ username: "That username is taken. Try another." });
    throw error;
  }

  updateTag("reviews"); // cached reviews show the author's name and username
  refresh();
  return {
    values: { ...values, username: result.value.username, bio: result.value.bio ?? "" },
    errors: {},
    saved: true,
    message: null,
  };
}
