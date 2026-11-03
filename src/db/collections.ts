// Reads for a user's collection (have / want / had). Unlike the catalog these
// are per user and change whenever they click, so they're never cached.
import { and, desc, eq } from "drizzle-orm";
import { db } from ".";
import { cardColumns, toCards } from "./fragrances";
import { brands, collectionItems, collectionStatusEnum, fragrances } from "./schema";

export type CollectionStatus = (typeof collectionStatusEnum.enumValues)[number];
export const COLLECTION_STATUSES = collectionStatusEnum.enumValues;

// This user's status for one fragrance, or null if it's not in their collection.
export async function getCollectionStatus(userId: string, fragranceId: number) {
  const [row] = await db
    .select({ status: collectionItems.status })
    .from(collectionItems)
    .where(and(eq(collectionItems.userId, userId), eq(collectionItems.fragranceId, fragranceId)));
  return row?.status ?? null;
}

// Everything in this user's collection as fragrance cards, newest first,
// grouped by status.
export async function listCollection(userId: string) {
  const rows = await db
    .select({ ...cardColumns, status: collectionItems.status })
    .from(collectionItems)
    .innerJoin(fragrances, eq(fragrances.id, collectionItems.fragranceId))
    .innerJoin(brands, eq(brands.id, fragrances.brandId))
    .where(eq(collectionItems.userId, userId))
    .orderBy(desc(collectionItems.addedAt));

  const cards = await toCards(rows);
  return {
    have: cards.filter((c) => c.status === "have"),
    want: cards.filter((c) => c.status === "want"),
    had: cards.filter((c) => c.status === "had"),
  };
}
