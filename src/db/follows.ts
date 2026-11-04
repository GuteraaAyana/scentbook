// Reads for following: counts, lists of people, and the activity feed. All
// per user and changing often, so never cached.
import { and, count, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { mergeFeed } from "@/lib/feed";
import { db } from ".";
import { getScoresForPairs } from "./community";
import { cardColumns, toCards } from "./fragrances";
import { brands, collectionItems, follows, fragrances, rankings, reviews, users, wears } from "./schema";

// Counts only people with a public profile (a username), to match the
// follower / following lists: someone without one isn't listed or counted.
export async function getFollowCounts(userId: string) {
  const [[{ followers }], [{ following }]] = await Promise.all([
    db
      .select({ followers: count() })
      .from(follows)
      .innerJoin(users, eq(users.id, follows.followerId))
      .where(and(eq(follows.followingId, userId), isNotNull(users.username))),
    db
      .select({ following: count() })
      .from(follows)
      .innerJoin(users, eq(users.id, follows.followingId))
      .where(and(eq(follows.followerId, userId), isNotNull(users.username))),
  ]);
  return { followers, following };
}

export async function isFollowing(followerId: string, followingId: string) {
  const [row] = await db
    .select({ one: follows.followerId })
    .from(follows)
    .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)));
  return Boolean(row);
}

const personColumns = { name: users.name, username: users.username, bio: users.bio };

// Who follows this user, or who they follow, most recent first.
export async function listFollowPeople(userId: string, direction: "followers" | "following") {
  const [match, other] =
    direction === "followers" ? [follows.followingId, follows.followerId] : [follows.followerId, follows.followingId];
  return db
    .select(personColumns)
    .from(follows)
    .innerJoin(users, eq(users.id, other))
    .where(and(eq(match, userId), isNotNull(users.username)))
    .orderBy(desc(follows.createdAt));
}

// Everyone with a public profile (a username), newest members first.
export async function listPeople(limit = 100) {
  return db
    .select(personColumns)
    .from(users)
    .where(isNotNull(users.username))
    .orderBy(desc(users.createdAt))
    .limit(limit);
}

type FeedSource = {
  at: Date;
  userId: string;
  personName: string;
  username: string | null;
  fragranceId: number;
};

// What the people this user follows have been doing, newest first: rankings,
// wears, reviews and collection changes. Diary notes are never included.
export async function getFeed(viewerId: string, limit = 40) {
  const followed = await db
    .select({ id: follows.followingId })
    .from(follows)
    .where(eq(follows.followerId, viewerId));
  const ids = followed.map((f) => f.id);
  if (ids.length === 0) return { followsAnyone: false, items: [] };

  // The person; the fragrance card is fetched once for all items below.
  const who = { userId: users.id, personName: users.name, username: users.username };

  const [ranked, wore, reviewed, collected] = await Promise.all([
    db
      .select({ ...who, fragranceId: rankings.fragranceId, at: rankings.rankedAt })
      .from(rankings)
      .innerJoin(users, eq(users.id, rankings.userId))
      .where(inArray(rankings.userId, ids))
      .orderBy(desc(rankings.rankedAt))
      .limit(limit),
    db
      .select({ ...who, fragranceId: wears.fragranceId, at: wears.createdAt, wearId: wears.id, occasion: wears.occasion })
      .from(wears)
      .innerJoin(users, eq(users.id, wears.userId))
      .where(inArray(wears.userId, ids))
      .orderBy(desc(wears.createdAt))
      .limit(limit),
    db
      .select({ ...who, fragranceId: reviews.fragranceId, at: reviews.createdAt, body: reviews.body })
      .from(reviews)
      .innerJoin(users, eq(users.id, reviews.userId))
      .where(and(inArray(reviews.userId, ids), isNull(reviews.hiddenAt)))
      .orderBy(desc(reviews.createdAt))
      .limit(limit),
    db
      .select({ ...who, fragranceId: collectionItems.fragranceId, at: collectionItems.addedAt, status: collectionItems.status })
      .from(collectionItems)
      .innerJoin(users, eq(users.id, collectionItems.userId))
      .where(inArray(collectionItems.userId, ids))
      .orderBy(desc(collectionItems.addedAt))
      .limit(limit),
  ]);

  type Item = FeedSource & {
    kind: "ranked" | "wore" | "reviewed" | "collected";
    key: string;
    occasion: string | null;
    excerpt: string | null;
    status: (typeof collectionItems.$inferSelect)["status"] | null;
  };
  const none = { occasion: null, excerpt: null, status: null };
  const merged = mergeFeed<Item>(
    [
      ranked.map((r) => ({ ...r, ...none, kind: "ranked", key: `r-${r.userId}-${r.fragranceId}` })),
      wore.map((r) => ({ ...r, ...none, occasion: r.occasion, kind: "wore", key: `w-${r.wearId}` })),
      reviewed.map((r) => ({ ...r, ...none, excerpt: r.body.slice(0, 220), kind: "reviewed", key: `v-${r.userId}-${r.fragranceId}` })),
      collected.map((r) => ({ ...r, ...none, status: r.status, kind: "collected", key: `c-${r.userId}-${r.fragranceId}` })),
    ],
    limit,
  );

  // Fragrance cards (poster colours) and, for rankings, the score they gave.
  const fragranceIds = [...new Set(merged.map((m) => m.fragranceId))];
  const [cardRows, scores] = await Promise.all([
    fragranceIds.length
      ? db
          .select(cardColumns)
          .from(fragrances)
          .innerJoin(brands, eq(brands.id, fragrances.brandId))
          .where(inArray(fragrances.id, fragranceIds))
          .then(toCards)
      : Promise.resolve([]),
    getScoresForPairs(merged.filter((m) => m.kind === "ranked").map((m) => ({ userId: m.userId, fragranceId: m.fragranceId }))),
  ]);
  const cards = new Map(cardRows.map((c) => [c.id, c]));

  return {
    followsAnyone: true,
    items: merged
      .filter((m) => cards.has(m.fragranceId))
      .map(({ userId, personName, username, fragranceId, ...item }) => ({
        ...item,
        person: { name: personName, username },
        fragrance: cards.get(fragranceId)!,
        score: item.kind === "ranked" ? (scores.get(`${userId}:${fragranceId}`) ?? null) : null,
      })),
  };
}
