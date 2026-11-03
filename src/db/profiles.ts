// Reads for profiles. Public profiles show what someone owns and ranks; the
// city is private (only used for weather-based picks) and never returned here.
import { eq } from "drizzle-orm";
import { db } from ".";
import { listCollection } from "./collections";
import { listRankings } from "./rankings";
import { users } from "./schema";

// The signed-in user's own editable fields, for the settings form.
export async function getOwnProfile(userId: string) {
  const [row] = await db
    .select({ name: users.name, username: users.username, bio: users.bio, city: users.city })
    .from(users)
    .where(eq(users.id, userId));
  return row ?? null;
}

// Everything on /u/[username], or null if nobody has that username.
export async function getPublicProfile(username: string) {
  const [user] = await db
    .select({ id: users.id, name: users.name, username: users.username, bio: users.bio, joined: users.createdAt })
    .from(users)
    .where(eq(users.username, username.toLowerCase()));
  if (!user) return null;

  const [collection, ranked] = await Promise.all([listCollection(user.id), listRankings(user.id)]);
  return {
    user: { name: user.name, username: user.username, bio: user.bio, joined: user.joined },
    counts: { owned: collection.have.length, wanted: collection.want.length, ranked: ranked.length },
    topRanked: ranked.slice(0, 5),
    shelf: collection.have,
  };
}
