// Rules for the profile fields, shared by the form and the server action and
// kept pure so they can be tested (profile.test.ts).

export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;
export const USERNAME_CHANGE_DAYS = 7;
const DAY = 24 * 60 * 60 * 1000;

// Names that would look official, so nobody can pose as the site.
const RESERVED = new Set(["admin", "administrator", "moderator", "mod", "scentbook", "support", "staff", "system"]);

// Usernames are case-insensitive: stored lowercase, so @Santal and @santal
// can't belong to two people.
export function validateUsername(raw: string): { ok: true; value: string } | { ok: false; error: string } {
  const username = raw.trim().toLowerCase().replace(/^@/, "");
  if (!USERNAME_PATTERN.test(username)) return { ok: false, error: "Use 3 to 20 letters, numbers or underscores." };
  if (RESERVED.has(username)) return { ok: false, error: "That username is reserved. Try another." };
  return { ok: true, value: username };
}

// A username can change once every 7 days, so profile links and @mentions
// stay put and nobody can hop between names. Setting it for the first time
// (an account made with GitHub or Google has none) is always allowed.
type UsernameState = { username: string | null; changedAt: Date | null };

// When the username may next change, or null if it may change now.
export function usernameLockedUntil(current: UsernameState, now: Date): Date | null {
  if (!current.username || !current.changedAt) return null;
  const availableAt = new Date(current.changedAt.getTime() + USERNAME_CHANGE_DAYS * DAY);
  return now >= availableAt ? null : availableAt;
}

export function usernameChange(
  current: UsernameState,
  next: string,
  now: Date,
): { allowed: true; changed: boolean } | { allowed: false; availableAt: Date } {
  if (current.username === next) return { allowed: true, changed: false };
  const availableAt = usernameLockedUntil(current, now);
  return availableAt ? { allowed: false, availableAt } : { allowed: true, changed: true };
}
export const BIO_MAX = 160;

// The home city isn't typed: it's chosen from the weather service's place
// list and checked by looking it up (src/lib/actions/profile.ts).
export type ProfileInput = { username: string; bio: string };
export type ProfileValues = { username: string; bio: string | null };
export type ProfileErrors = Partial<Record<keyof ProfileInput | "city" | "temperatureUnit", string>>;

export function validateProfile(
  input: ProfileInput,
): { ok: true; value: ProfileValues } | { ok: false; errors: ProfileErrors } {
  const checked = validateUsername(input.username);
  const username = checked.ok ? checked.value : "";
  const bio = input.bio.trim();
  const errors: ProfileErrors = {};

  if (!checked.ok) errors.username = checked.error;
  if (bio.length > BIO_MAX) errors.bio = `Keep it to ${BIO_MAX} characters (it's ${bio.length}).`;

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { username, bio: bio || null } };
}
