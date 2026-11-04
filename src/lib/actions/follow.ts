"use server";
// Follow / unfollow. Public endpoints like every Server Action, so each
// checks the session and looks the person up itself.
import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { headers } from "next/headers";
import { db } from "@/db";
import { follows, users } from "@/db/schema";
import { auth } from "@/lib/auth";

async function resolve(username: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { error: "Sign in to follow people." } as const;
  if (typeof username !== "string") return { error: "Unknown person." } as const;

  const [target] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username.toLowerCase()));
  if (!target) return { error: "Unknown person." } as const;
  if (target.id === session.user.id) return { error: "You can't follow yourself." } as const;
  return { followerId: session.user.id, followingId: target.id } as const;
}

export async function setFollowing(username: string, follow: boolean) {
  const who = await resolve(username);
  if ("error" in who) return { error: who.error };

  if (follow) {
    await db.insert(follows).values(who).onConflictDoNothing();
  } else {
    await db
      .delete(follows)
      .where(and(eq(follows.followerId, who.followerId), eq(follows.followingId, who.followingId)));
  }
  refresh();
  return { error: null };
}
