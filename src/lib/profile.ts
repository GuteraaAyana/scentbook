// Rules for the profile fields, shared by the form and the server action and
// kept pure so they can be tested (profile.test.ts).

export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;
export const BIO_MAX = 160;
export const CITY_MAX = 60;

export type ProfileInput = { username: string; bio: string; city: string };
export type ProfileValues = { username: string; bio: string | null; city: string | null };
export type ProfileErrors = Partial<Record<keyof ProfileInput, string>>;

export function validateProfile(
  input: ProfileInput,
): { ok: true; value: ProfileValues } | { ok: false; errors: ProfileErrors } {
  // Usernames are case-insensitive: stored lowercase, so @Santal and @santal
  // can't belong to two people.
  const username = input.username.trim().toLowerCase();
  const bio = input.bio.trim();
  const city = input.city.trim();
  const errors: ProfileErrors = {};

  if (!USERNAME_PATTERN.test(username)) {
    errors.username = "Use 3 to 20 letters, numbers or underscores.";
  }
  if (bio.length > BIO_MAX) errors.bio = `Keep it to ${BIO_MAX} characters (it's ${bio.length}).`;
  if (city.length > CITY_MAX) errors.city = `Keep it to ${CITY_MAX} characters.`;

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { username, bio: bio || null, city: city || null } };
}
