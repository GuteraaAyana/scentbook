// Scentbook database schema.
//
// Each `pgTable(...)` below becomes one table in Postgres. Drizzle reads this
// file and generates the SQL (`CREATE TABLE ...`) for us — run
// `npm run db:generate` and look in /drizzle to see the exact SQL.
//
// The schema has three groups of tables:
//   1. Catalog   — the fragrance "database" (brands, fragrances, notes, accords)
//   2. Users     — people and who follows whom
//   3. Activity  — what users do (collection, rankings, reviews, wear diary)

import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  smallint,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Enums: columns that may only hold one of a fixed list of values.
// ---------------------------------------------------------------------------

export const concentrationEnum = pgEnum("concentration", [
  "extrait",
  "parfum",
  "edp", // eau de parfum
  "edt", // eau de toilette
  "edc", // eau de cologne
  "other",
]);

export const genderEnum = pgEnum("gender", ["feminine", "masculine", "unisex"]);

// Where a note sits in the pyramid: top notes fade first, base notes last.
export const noteLayerEnum = pgEnum("note_layer", ["top", "heart", "base"]);

export const collectionStatusEnum = pgEnum("collection_status", [
  "have",
  "want",
  "had",
]);

// Beli-style ranking: you first say how you felt, then compare within that bucket.
export const sentimentEnum = pgEnum("sentiment", ["loved", "fine", "disliked"]);

// Admins can see and act on reported reviews (/admin/reports). Granted with
// `npm run make-admin -- <username>`, never through the app.
export const userRoleEnum = pgEnum("user_role", ["member", "admin"]);

export const reportReasonEnum = pgEnum("report_reason", ["spam", "offensive", "off_topic", "other"]);

// Where a catalog fragrance came from: hand-curated in src/db/seed/data.ts,
// or imported from the Fragella API (see DECISIONS.md 007).
export const catalogSourceEnum = pgEnum("catalog_source", ["curated", "fragella"]);

// ---------------------------------------------------------------------------
// 1. Catalog
// ---------------------------------------------------------------------------

export const brands = pgTable("brands", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(), // URL-friendly name, e.g. "le-labo"
  country: text("country"),
});

export const perfumers = pgTable("perfumers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
});

export const fragrances = pgTable(
  "fragrances",
  {
    id: serial("id").primaryKey(),
    // Foreign key: every fragrance belongs to exactly one brand.
    brandId: integer("brand_id")
      .notNull()
      .references(() => brands.id),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(), // e.g. "le-labo-santal-33"
    releaseYear: smallint("release_year"),
    concentration: concentrationEnum("concentration").notNull(),
    gender: genderEnum("gender").notNull().default("unisex"),
    description: text("description"),
    imageUrl: text("image_url"),
    // Curated rows always win over imported ones, and every imported row can
    // be found (or removed) by filtering on source.
    source: catalogSourceEnum("source").notNull().default("curated"),
    externalId: text("external_id"), // Fragella's `_id`, for imported rows
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // A brand can't have two fragrances with the same name and concentration.
    // Postgres backs this rule with an index starting with brand_id, so it
    // also makes "all fragrances by brand X" fast; no separate index needed.
    unique().on(t.brandId, t.name, t.concentration),
  ],
);

// Many-to-many: a fragrance can have several perfumers, and a perfumer makes
// many fragrances. A "join table" holds one row per pairing.
export const fragrancePerfumers = pgTable(
  "fragrance_perfumers",
  {
    fragranceId: integer("fragrance_id")
      .notNull()
      .references(() => fragrances.id, { onDelete: "cascade" }),
    perfumerId: integer("perfumer_id")
      .notNull()
      .references(() => perfumers.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.fragranceId, t.perfumerId] }),
    // Makes "every fragrance by this perfumer" fast.
    index("fragrance_perfumers_perfumer_idx").on(t.perfumerId),
  ],
);

// Individual ingredients you can smell: bergamot, vanilla, oud...
export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  family: text("family"), // citrus, floral, woody, gourmand...
});

export const fragranceNotes = pgTable(
  "fragrance_notes",
  {
    fragranceId: integer("fragrance_id")
      .notNull()
      .references(() => fragrances.id, { onDelete: "cascade" }),
    noteId: integer("note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    layer: noteLayerEnum("layer").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.fragranceId, t.noteId, t.layer] }),
    // Makes "every fragrance containing vanilla" fast (search by note), and
    // "vanilla in the base" too: with the layer in the index, Postgres can
    // answer it from the index alone without reading the table rows.
    index("fragrance_notes_note_idx").on(t.noteId, t.layer, t.fragranceId),
  ],
);

// The overall character of a scent: "warm spicy", "fresh", "sweet"...
// `color` drives the app's accord color system (bars, pyramid, profile stats).
export const accords = pgTable("accords", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  color: text("color").notNull(), // hex, e.g. "#c8873a"
});

export const fragranceAccords = pgTable(
  "fragrance_accords",
  {
    fragranceId: integer("fragrance_id")
      .notNull()
      .references(() => fragrances.id, { onDelete: "cascade" }),
    accordId: integer("accord_id")
      .notNull()
      .references(() => accords.id, { onDelete: "cascade" }),
    strength: smallint("strength").notNull(), // 1–100, the length of the bar
  },
  (t) => [
    primaryKey({ columns: [t.fragranceId, t.accordId] }),
    index("fragrance_accords_accord_idx").on(t.accordId),
    check("strength_range", sql`${t.strength} BETWEEN 1 AND 100`),
  ],
);

// ---------------------------------------------------------------------------
// 2. Users
// ---------------------------------------------------------------------------

// Login is handled by Better Auth (see DECISIONS.md 008 and src/lib/auth.ts).
// It reads and writes `users`, `sessions`, `accounts` and `verifications`, so
// their columns follow its required shape; the property names (emailVerified,
// expiresAt...) are the ones Better Auth looks up.
export const users = pgTable("users", {
  id: text("id").primaryKey(), // generated by Better Auth
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  // Scentbook's own profile fields, declared to Better Auth as additionalFields.
  username: text("username").unique(),
  bio: text("bio"),
  city: text("city"), // used for the weather-based "wear today" pick
  role: userRoleEnum("role").notNull().default("member"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// One row per signed-in browser. The cookie holds `token`.
export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

// How a user signs in: one row per method. `providerId` is "credential"
// (email + password, with the hashed password in `password`), "github" or
// "google". A person who uses two methods has two rows and one user.
export const accounts = pgTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    providerId: text("provider_id").notNull(),
    accountId: text("account_id").notNull(), // the user's id at that provider
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"), // hashed, never plain text
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("accounts_user_idx").on(t.userId)],
);

// Short-lived codes, e.g. for email verification and password reset links.
export const verifications = pgTable(
  "verifications",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("verifications_identifier_idx").on(t.identifier)],
);

export const follows = pgTable(
  "follows",
  {
    followerId: text("follower_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followingId: text("following_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.followerId, t.followingId] }),
    index("follows_following_idx").on(t.followingId),
    check("no_self_follow", sql`${t.followerId} <> ${t.followingId}`),
  ],
);

// ---------------------------------------------------------------------------
// 3. Activity
// ---------------------------------------------------------------------------

export const collectionItems = pgTable(
  "collection_items",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    fragranceId: integer("fragrance_id")
      .notNull()
      .references(() => fragrances.id, { onDelete: "cascade" }),
    status: collectionStatusEnum("status").notNull(),
    addedAt: timestamp("added_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.fragranceId] }),
    // The primary key starts with user_id, so it serves "my collection" but
    // not "how many people own / want this fragrance". This index does.
    index("collection_items_fragrance_idx").on(t.fragranceId, t.status),
  ],
);

// Beli-style personal ranking. Instead of storing position 1, 2, 3... (which
// means renumbering every row below an insert), each row stores `sortKey`, a
// decimal number. To insert between two fragrances we use the midpoint of
// their keys, so exactly one row is written. The 1–10 score is computed from
// the fragrance's position within its sentiment bucket when we read it.
export const rankings = pgTable(
  "rankings",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    fragranceId: integer("fragrance_id")
      .notNull()
      .references(() => fragrances.id, { onDelete: "cascade" }),
    sentiment: sentimentEnum("sentiment").notNull(),
    sortKey: doublePrecision("sort_key").notNull(),
    rankedAt: timestamp("ranked_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.fragranceId] }),
    index("rankings_user_order_idx").on(t.userId, t.sentiment, t.sortKey),
    // Makes community views of one fragrance fast ("70% of people loved it").
    index("rankings_fragrance_idx").on(t.fragranceId, t.sentiment),
  ],
);

export const reviews = pgTable(
  "reviews",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    fragranceId: integer("fragrance_id")
      .notNull()
      .references(() => fragrances.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    longevity: smallint("longevity"), // 1–5: how long it lasts
    sillage: smallint("sillage"), // 1–5: how far it projects
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }), // set when edited
    // Set when hidden, by a moderator or automatically after enough reports.
    // Hidden reviews are left out of every public list and average.
    hiddenAt: timestamp("hidden_at", { withTimezone: true }),
    hiddenReason: text("hidden_reason"), // "reports" (automatic) or "moderator"
  },
  (t) => [
    unique().on(t.userId, t.fragranceId), // one review per person per fragrance
    index("reviews_fragrance_idx").on(t.fragranceId),
    check("longevity_range", sql`${t.longevity} BETWEEN 1 AND 5`),
    check("sillage_range", sql`${t.sillage} BETWEEN 1 AND 5`),
  ],
);

// The wear diary: one row each time someone wears a fragrance.
export const wears = pgTable(
  "wears",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    fragranceId: integer("fragrance_id")
      .notNull()
      .references(() => fragrances.id, { onDelete: "cascade" }),
    wornOn: date("worn_on").notNull(),
    occasion: text("occasion"), // work, date night, gym...
    temperatureC: smallint("temperature_c"),
    weather: text("weather"), // sunny, rainy...
    compliments: smallint("compliments").notNull().default(0),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // Makes "my diary, newest first" fast.
    index("wears_user_date_idx").on(t.userId, t.wornOn),
    // Makes "recent wears of this fragrance" fast.
    index("wears_fragrance_date_idx").on(t.fragranceId, t.wornOn),
    check("compliments_nonnegative", sql`${t.compliments} >= 0`),
  ],
);

// ---------------------------------------------------------------------------
// 4. Moderation and abuse limits
// ---------------------------------------------------------------------------

// One report per person per review. A report stays open until a moderator
// resolves it ("hidden" or "dismissed").
export const reviewReports = pgTable(
  "review_reports",
  {
    id: serial("id").primaryKey(),
    reviewId: integer("review_id")
      .notNull()
      .references(() => reviews.id, { onDelete: "cascade" }),
    reporterId: text("reporter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reason: reportReasonEnum("reason").notNull(),
    details: text("details"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedBy: text("resolved_by").references(() => users.id, { onDelete: "set null" }),
    resolution: text("resolution"), // "hidden" or "dismissed"
  },
  (t) => [unique().on(t.reviewId, t.reporterId), index("review_reports_review_idx").on(t.reviewId)],
)

// Better Auth's rate-limit counters (sign-up, sign-in...), kept in Postgres
// so limits hold across server restarts and several servers.
export const rateLimits = pgTable("rate_limits", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

// Scentbook's own per-person limits on posting (src/lib/rate-limit.ts): one
// row per person and action, counting within a time window.
export const actionLimits = pgTable("action_limits", {
  key: text("key").primaryKey(), // e.g. "review:<user id>"
  count: integer("count").notNull(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
});
