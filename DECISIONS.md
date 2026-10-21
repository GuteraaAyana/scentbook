# Decisions

A running log of why Scentbook is built the way it is. Each entry covers what we picked, what else we considered, and why. This doubles as interview prep: you should be able to explain every entry in your own words.

---

## 001. Next.js (App Router) + TypeScript
**Date:** 2026-10-21

- **Picked:** Next.js 16, TypeScript, Tailwind CSS.
- **Considered:** a separate React (Vite) frontend plus an Express backend.
- **Why:** One project holds both the pages and the backend code, so there's less to deploy and wire together. Pages are rendered on the server, so fragrance pages load fast and can be found by Google. TypeScript catches mistakes (a wrong field name, for example) before the code runs.

## 002. PostgreSQL as the database
**Date:** 2026-10-21

- **Picked:** PostgreSQL. It runs locally through Postgres.app, and on AWS RDS in production.
- **Considered:** MongoDB (a document database) and DynamoDB (AWS's NoSQL database).
- **Why:** Our data is full of relationships: a fragrance has a brand, many notes, and many accords, and users rank, review, and wear fragrances. A relational database answers questions like "fragrances with vanilla in the base, ranked highly by people I follow" in a single query. Postgres also has **pgvector**, which we'll use for "smells like" search, so we don't need a second database for that.

## 003. Drizzle ORM
**Date:** 2026-10-21

- **Picked:** Drizzle.
- **Considered:** Prisma, and writing raw SQL strings.
- **Why:** Drizzle's code reads almost like SQL (`select().from(fragrances).where(...)`), so we learn SQL while using it, but we still get TypeScript checking. Migrations are plain `.sql` files we can read (see `drizzle/`). It also supports pgvector columns natively.

## 004. Schema: join tables for notes and accords
**Date:** 2026-10-21

- **Picked:** separate `notes` and `accords` tables, connected to fragrances by the `fragrance_notes` and `fragrance_accords` join tables.
- **Considered:** storing the notes as a text list on each fragrance (`notes: "bergamot, vanilla"`).
- **Why:** With a join table, "vanilla" exists exactly once, so search and filtering by note is a fast, indexed lookup rather than a text search. Notes also can't be misspelled differently across fragrances. The join table carries extra facts about each pairing: the pyramid `layer` for notes and the `strength` for accords.

## 005. Beli-style ranking stored with fractional sort keys
**Date:** 2026-10-21

- **Picked:** a `rankings` table where each row has a `sentiment` bucket (loved / fine / disliked) and a decimal `sort_key`.
- **Considered:** storing integer positions 1, 2, 3, ...
- **Why:** To insert a fragrance at position 3 with integer positions, every row below it has to be renumbered. With decimal keys, a fragrance placed between keys 2.0 and 3.0 simply gets 2.5, and only one row is written. The user picks the spot through binary-search comparisons ("did you like this more or less than X?"), which takes about log₂(n) questions: about 7 for 100 fragrances. The 1–10 score is computed when we read the data, so it never goes stale.

## 006. Hand-curated seed data, no scraping
**Date:** 2026-10-21

- **Picked:** about 150 popular fragrances, entered by hand from brands' official note listings.
- **Considered:** scraping Fragrantica.
- **Why:** Scraping breaks Fragrantica's terms of service. A clean, legitimate dataset is worth more in a portfolio project than a large one.
