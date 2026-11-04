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
- **Bottle images:** the transparent `.webp` links from the Fragella import are stored in `fragrances.image_url`.
  - **Revisited 2026-11-04, kept:** after the redesign, browse pages' LCP is 3.2 s on Lighthouse's simulated slow 4G (PERFORMANCE.md), mostly because these photos arrive full size. Resizing them with Next's image optimizer would fix that but means keeping resized copies of Fragella's images on our server. We kept linking them directly: 93 is acceptable for now, and the terms question outweighs the speed-up. Revisit if Fragella confirms copies are allowed or if we host our own photos. They're linked directly from Fragella's CDN (`unoptimized`), not downloaded, copied or resized by our server, to stay as close as we can to their terms (see 007); the footer credits Fragella. Curated fragrances borrow the image of their imported match. About 2% of the links are dead (403), so a broken image removes itself and the case shows its glow alone.

## 010. How ranking works in practice
**Date:** 2026-11-03

This builds on 005 (buckets plus fractional sort keys).

- **The comparisons run in the browser.** When you choose loved / fine / disliked, the page loads the other fragrances in that bucket once, then each "Which do you prefer?" answer narrows the search locally, with no server call. Only the final spot is sent, as "just below fragrance A, just above fragrance B". The server looks up A's and B's current keys, so if your list changed in another tab, it notices and asks you to rank again instead of saving a wrong order.
- **"I can't choose"** puts it right after the fragrance it was compared with.
- **Running out of room:** after enough inserts into one gap, two keys get too close for a number to fit between them. When that happens, the server spaces that bucket out again (n, n−1 … 1, same order), then inserts. It's rare and only rewrites that one user's bucket.
- **Scores:** each bucket owns a band of the 0–10 scale: loved 6.7–10, fine 3.4–6.6, didn't like 0–3.3. Within a band, the best gets the top and the rest step down evenly by position. So a loved fragrance always outscores a fine one, and adding a new favourite nudges the others' scores down, the way it would in your head.
- **Tested:** the search, keys and scores are pure functions in `src/lib/ranking.ts` with unit tests (`npm test`): every position is reachable for buckets of 1 to 40, 100 fragrances take at most 7 questions, and the bands never overlap.

## 011. Profiles: public by username, city kept private
**Date:** 2026-11-03

- **Picked:** public profiles at `/u/[username]` showing name, bio, join date, counts (owned / wanted / ranked), your top 5 ranked fragrances and what's on your shelf. You edit them at `/settings`.
- **Usernames** are 3–20 letters, numbers or underscores, stored lowercase so `@Santal` and `@santal` can't be two people. The database's unique constraint is the final word: if two people grab the same name at once, the second gets "That username is taken." The rules live in `src/lib/profile.ts` with unit tests.
- **The city is private.** It's only for the planned weather-based "what to wear today" pick, so it's never sent to a profile page (the query doesn't select it), and the settings form says so.
- **Considered:** private-by-default profiles. Rejected for now because sharing your rankings is the point of a "Letterboxd for fragrance"; a privacy toggle can come later.

## 012. Redesign: a dense "diary app" look, with editorial writing
**Date:** 2026-11-03

This replaces the look in 009 (the dark boutique). The Fragella bottle images and how they're linked are unchanged.

- **Picked:** direction B from four rendered mockups (Gallery, Diary app, Color field, Editorial), plus the Editorial direction's writing.
  - Dark slate (`#12161b`) with gold (`#f2b33d`) only for scores and the main action, and one typeface, Manrope.
  - Fragrances appear as tall **posters**, washed top to bottom in their three strongest accord colours (`src/lib/wash.ts`) with the bottle in front and the community score in the corner.
  - Home is rows of posters (Highest rated, Featured, Most ranked). Fragrance pages have a hero tinted with the fragrance's colours, a community panel (average score, how many ranked it, % who loved it), and below it "How it unfolds" and the accords.
- **Community scores are real, not decoration:** each person's score for a fragrance (from where it sits in their own ranked list) averaged over everyone who ranked it (`src/db/community.ts`). Cached catalog pages are tagged "rankings", and saving or removing a ranking calls `updateTag("rankings")`, so the new average shows immediately. The Highest rated / Most ranked rows only appear once at least four fragrances have been ranked.
- **Writing from the Editorial direction:**
  - The "How it unfolds" paragraph is generated from each fragrance's note pyramid (`src/lib/writing.ts`, with tests); place names in notes stay capitalised ("Turkish rose").
  - Curated fragrances can have a one-line `description` in `data.ts`; the first 11 were written for this change and are worth a read-through.
- **Considered:** keeping the boutique look; the Gallery (light, retail), Color field (bold, playful) and Editorial (magazine) directions. The Diary app suits what Scentbook is for: coming back often to log, rank and compare.
- **Not yet:** the mockup's friends' activity feed waits until following exists; no fake social data was added.

## 013. The wear diary
**Date:** 2026-11-04

- **Picked:** "Log a wear" on every fragrance page records the date (defaulting to your own local today), and optionally an occasion, the weather and temperature, compliments and a note. Your diary (`/diary`) lists entries newest first, grouped by month, with totals; fragrance pages show "Worn N times, last on …"; profiles show Most worn and Recent wears.
- **Occasion and weather are fixed lists** (shown as chips) rather than free text, so later features can count them, such as "what you reach for when it's rainy". The temperature is stored in °C as a whole number.
- **Dates:** the date is plain `YYYY-MM-DD` from the browser, so it's your calendar day, not the server's. The server allows one day ahead of its own date to cover time zones, and rejects anything later, impossible dates (Feb 30) and anything before 1900. The rules live in `src/lib/wear.ts` with tests.
- **Notes are private.** Wears appear on your public profile, but notes are stripped before profile data leaves the database layer, so they never reach the page or its hidden data. Only you see them, in your diary.
- **Deleting** an entry takes two clicks (Delete, then Yes, delete), and the server only ever deletes entries belonging to the signed-in user, whatever id is sent.
- **Not yet:** editing an entry (delete and log it again for now).

## 014. Reviews
**Date:** 2026-11-04

- **Picked:** one written review per person per fragrance, with optional longevity and sillage ratings. Writing again edits it (marked "edited"; migration 0003 adds `reviews.updated_at`), and it can be deleted. Fragrance pages show the averages and everyone's reviews, newest first, each with that reviewer's own ranking score when they've ranked it; profiles show your latest three.
- **Ratings in words, not numbers:** longevity and sillage are stored as 1–5 but chosen and shown as plain descriptions ("Half a day", "Fills the room"). Averages are shown as the nearest description plus a bar. The text is 10–2,000 characters, keeping paragraph breaks. The rules live in `src/lib/review.ts` with tests.
- **Caching:** a fragrance's review list is the same for everyone, so it's cached and tagged `reviews:<id>`. Saving or deleting a review expires that tag, editing your profile expires "reviews" (reviews show your name), and ranking expires "rankings" (reviews show your score). Your own Write/Edit button is per request.
- **Forms keep what you typed:** React 19 resets a form after its action runs, which would wipe a review (or diary entry) whenever validation failed. The actions return what was sent and the form is rebuilt from it; errors from a previous opening of a dialog aren't shown again.
- **Not yet:** reporting or hiding abusive reviews, and rate limiting. Needed before Scentbook is public.

## 015. Following and the activity feed
**Date:** 2026-11-04

- **Picked:** follow anyone with a public profile (a username). Profiles show follower and following counts, each opening a list, and a Follow / Following button. `/feed` shows what the people you follow have ranked (with their score), worn (with the occasion), reviewed (with an excerpt) and added to their collection, newest first; the home page shows the latest four once you follow someone active. `/people` lists everyone with a public profile, so there's somewhere to find people.
- **Building the feed:** each kind of activity is read separately (latest N each, from the people you follow), then merged by time (`mergeFeed` in `src/lib/feed.ts`, tested). That's simpler and easier to index than one big UNION query, and fine at this size. Ranking scores in the feed come from the same position-based calculation as everywhere else.
- **Privacy:** diary notes never appear in the feed (the query doesn't select them). People without a username have no public profile, so they're neither listed nor counted as followers, which keeps counts and lists consistent. Following yourself is blocked both in the action and by a database check.
- **Not yet:** notifications ("Maya followed you"), and paging through older feed items (the feed shows the latest 60).

## 016. "What to wear today"
**Date:** 2026-11-04

- **Picked:** a home-page pick from the fragrances you own (marked Have it), based on your city's current weather, with a one-line reason and two alternatives. It needs a city (set in settings) and at least one owned fragrance; otherwise it explains what to add.
- **Weather from Open-Meteo:** free, no API key, no account. Only the city name (to find coordinates) and rounded coordinates (for the weather) are sent, nothing about the person, and the city itself stays private on Scentbook (DECISIONS 011). City lookups are cached for days and the weather for about an hour, shared across everyone in the same place. A failed or slow request (4 s timeout) shows "Couldn't get the weather" rather than holding up the page.
- **How it picks** (`src/lib/wear-today.ts`, 10 tests): each accord has a weather preference by temperature band (cold < 10 °C, mild < 18, warm < 25, hot), adjusted for rain, snow and humidity: fresh and citrus for heat, amber, vanilla and tobacco for cold, woods and moss in the rain. A fragrance's fit is the strength-weighted average of its accords' preferences. Your own ranking score adds to it, and anything worn in the last few days is nudged down so the pick rotates. The weights are hand-tuned and simple on purpose; the reason text names the accords that made the difference.
- **Considered:** an AI model choosing for you. Rejected for now: a rule anyone can read is easier to trust and to tune, and costs nothing per visit.
- **Not yet:** learning from your diary (what you actually wear in which weather), and filling the weather into Log a wear automatically.

## 017. Moderation and rate limits
**Date:** 2026-11-04

- **Picked:** any signed-in member can report someone else's review: spam, abusive, not about the fragrance, or something else (which needs a few words). One report per person per review. When **3 different people** have open reports on a review, it's hidden automatically until a moderator looks. That's enough that one person can't hide a review they simply disagree with. Migration 0004 adds `review_reports`, `reviews.hidden_at`/`hidden_reason` and `users.role`.
- **Hidden means hidden everywhere public:** the fragrance page's list and averages, profiles and the feed. The author still sees it in their own Edit dialog, marked "Hidden by moderation". Editing doesn't bring it back; a moderator decides.
- **Moderators:** `users.role` is "member" or "admin", set with `npm run make-admin -- <username>` (`--remove` to undo); there's no way to become one from the site. `/admin/reports` lists reviews waiting for a decision with their reports. Hiding takes it down and closes the reports. Keeping it up dismisses them and undoes an automatic hide. Reviews a moderator hid can be restored. Other people get the not-found page there, and every moderator action checks the role in the database again.
- **Posting limits, per account** (`src/lib/rate-limit.ts`, window logic tested in `src/lib/moderation.ts`): 10 reviews an hour, 30 diary entries an hour, 60 follows an hour, 20 reports a day. Counted in Postgres (`action_limits`) under a row lock, so they survive restarts and two requests at once can't both slip through. A refused attempt isn't counted. Unfollowing and deleting are never limited.
- **Sign-up and sign-in limits, per IP address:** Better Auth's built-in limiter, stored in Postgres (`rate_limits`): 10 accounts an hour, 10 password attempts per 5 minutes, 100 requests a minute for other auth routes. The session check that runs on every page isn't limited. **For deploy:** the limiter reads the client IP from `x-forwarded-for`, so the host must set that header (and it must not be spoofable). Otherwise everyone shares one bucket.
- **The review list streams per request now.** It used to be part of the fragrance page's prerendered shell. In testing, the first visit after a review was restored got the build-time copy of the page; hiding happened to be fine, but the same thing could show a hidden review once. The list's data is still cached and tagged, so it costs one fast cache read per visit and is always current.
- **Considered:** hiding on the first report (too easy to abuse); a word filter (easy to get around, and blocks innocent words); per-IP limits on posting (shared Wi-Fi would punish everyone on it).
- **Not yet:** telling the author when their review is hidden or restored, reporting profiles, and an audit log of moderator actions beyond the resolved reports.
