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

## 007. Import most of the catalog from the Fragella API
**Date:** 2026-11-03

- **Picked:** import fragrances from the [Fragella API](https://api.fragella.com) with `npm run fragella`, alongside the hand-curated entries in `src/db/seed/data.ts`. This updates 006: curation stays for the fragrances we care most about, and the import fills out the rest of the catalog.
- **Considered:** curating all ~150 by hand (slow), using Fragella only as a drafting aid that we verify before entering into `data.ts`, and emailing Fragella to ask permission first.
- **Why:** it's the fastest way to a full catalog. The free plan gives 20 requests a month. We fetch each brand's 20 most popular fragrances (2 requests of 10, from the popularity-sorted `/fragrances?brand=` endpoint): the `/brands/:name` endpoint returns 20 in one request, but in no useful order, with hair mists and obscure flankers instead of the brand's best-known fragrances.
- **Cleaning the data:** Fragella's names include brands, concentrations and genders ("Tom Ford Lost Cherry", "Black Opium Edp", "... for women"), and its brand listings include sizes, testers, body creams and duplicates. The import strips those words, skips non-perfumes and retail listings, merges spellings of the same fragrance, and takes the curated spelling when a name matches a curated fragrance. The first import (8 brands, 16 requests) gave 115 fragrances.
- **Known risks, accepted:**
  - Fragella's terms (§3.3) forbid caching or storing "large portions of the API data" unless your plan explicitly permits it, and the free plan doesn't say it does. Storing a catalog in our database likely falls under that.
  - Fragella's notes and accords are AI-predicted, which they estimate at about 80% confidence.
- **How we contain the risks:**
  - Every imported row has `source = 'fragella'`, and `npm run fragella -- remove` deletes them all in one step if Fragella objects or we replace them.
  - Fragella's raw responses live in `.fragella/`, which is git-ignored, so their data is never published in our repo.
  - Curated data always wins: the import never overwrites a fragrance, note, accord or brand that already exists.
  - Images aren't imported; we'd be hotlinking Fragella's CDN, which the terms don't address.

## 008. Better Auth for login
**Date:** 2026-11-03

- **Picked:** [Better Auth](https://www.better-auth.com), with email + password, GitHub and Google sign-in. Sessions are stored in Postgres (`sessions` table) and identified by a cookie.
- **Considered:** Auth.js (NextAuth), which the original schema was shaped for.
- **Why:** since September 2025 Auth.js has been maintained by the Better Auth team, and new projects are pointed to Better Auth. It's actively developed, has a Drizzle adapter, and keeps users in our own database rather than a hosted service. Switching cost one migration, because there were no users yet.
- **How it fits:** Better Auth owns `users`, `sessions`, `accounts` and `verifications`; Scentbook's own profile fields (`username`, `bio`, `city`) are declared to it as additional fields. One user can have several `accounts` rows, one per sign-in method. Passwords are stored only as hashes.
- **Not yet:** email verification and password reset need an email service, so they're left for later.

## 009. The look: a dark perfume boutique, with bottle photos from Fragella
**Date:** 2026-11-03

- **Picked:** a dark-only design, like a dimly lit perfume shop. Each fragrance sits in a "display case" lit from behind by soft pools of its own accord colors (`src/lib/glow.ts`), with its bottle photo in front. Bodoni Moda for names and headings (the high-contrast style of perfume labels), Instrument Sans for everything else, and brass (`#D8B98A`) for primary actions and keyboard focus. Notes are shown as a timeline (top → heart → base) because that's how they actually unfold on skin.
- **Considered:** "blotter strips" (each fragrance as a paper testing strip dipped in its accord colors, no photos) and a text-led "perfume label" editorial layout.
- **Why:** the accord colors give every fragrance a recognisable look even without a photo, and the dark room makes both the colors and the cut-out bottle photos stand out. Colors are tokens in `globals.css`, each checked for contrast (all text is 6:1 or better).
- **Bottle images:** the transparent `.webp` links from the Fragella import are stored in `fragrances.image_url`. They're linked directly from Fragella's CDN (`unoptimized`), not downloaded, copied or resized by our server, to stay as close as we can to their terms (see 007); the footer credits Fragella. Curated fragrances borrow the image of their imported match. About 2% of the links are dead (403), so a broken image removes itself and the case shows its glow alone.

## 010. How ranking works in practice
**Date:** 2026-11-03

This builds on 005 (buckets plus fractional sort keys).

- **The comparisons run in the browser.** When you choose loved / fine / disliked, the page loads the other fragrances in that bucket once, then each "Which do you prefer?" answer narrows the search locally, with no server call. Only the final spot is sent, as "just below fragrance A, just above fragrance B". The server looks up A's and B's current keys, so if your list changed in another tab, it notices and asks you to rank again instead of saving a wrong order.
- **"I can't choose"** puts it right after the fragrance it was compared with.
- **Running out of room:** after enough inserts into one gap, two keys get too close for a number to fit between them. When that happens, the server spaces that bucket out again (n, n−1 … 1, same order), then inserts. It's rare and only rewrites that one user's bucket.
- **Scores:** each bucket owns a band of the 0–10 scale: loved 6.7–10, fine 3.4–6.6, didn't like 0–3.3. Within a band, the best gets the top and the rest step down evenly by position. So a loved fragrance always outscores a fine one, and adding a new favourite nudges the others' scores down, the way it would in your head.
- **Tested:** the search, keys and scores are pure functions in `src/lib/ranking.ts` with unit tests (`npm test`): every position is reachable for buckets of 1 to 40, 100 fragrances take at most 7 questions, and the bands never overlap.
