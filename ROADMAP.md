# Roadmap

What's done, what's next, and what's planned for later. The reasoning behind each choice goes in [DECISIONS.md](DECISIONS.md).

## Done
- [x] Next.js app, PostgreSQL schema, Drizzle migrations (Day 1)
- [x] Seed script and first 11 fragrances (`npm run db:seed`)
- [x] Fragrance detail page at `/fragrances/[slug]`: brand, notes by layer, accord bars, not-found page for unknown slugs
- [x] Browse page at `/fragrances`, linked from the home page
- [x] First Lighthouse baseline and `EXPLAIN ANALYZE` on the page queries ([PERFORMANCE.md](PERFORMANCE.md))

- [x] Fix dark-mode contrast of grey secondary text (found in the Lighthouse baseline)

## Now

## Next
- [ ] Grow the catalog toward ~150 fragrances, verified against official listings
- [ ] Login with Auth.js (Day 5)

## Later
- [ ] **User fragrance submissions with admin review.** Signed-in users submit a missing fragrance; it waits in a queue until an admin approves it, so nothing unverified reaches the catalog.
  - Depends on login, plus an admin role on `users`.
  - A `fragrance_submissions` table: the proposed fragrance as JSON, `status` (pending / approved / rejected), submitter, reviewer, reason for rejecting.
  - The submission form picks brands, notes and accords from the existing catalog (with "suggest a new one" as a fallback), so near-duplicates like "Bourbon Vanilla" vs "Vanilla" don't creep in.
  - Approving reuses the seed script's insert logic, so a fragrance enters the catalog the same way whether it came from `data.ts` or a user.
  - Later still: suggested corrections to existing fragrances, through the same queue.
