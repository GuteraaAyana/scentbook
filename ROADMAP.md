# Roadmap

What's done, what's next, and what's planned for later. The reasoning behind each choice goes in [DECISIONS.md](DECISIONS.md).

## Done
- [x] Next.js app, PostgreSQL schema, Drizzle migrations (Day 1)
- [x] Seed script and first 11 fragrances (`npm run db:seed`)
- [x] Fragrance detail page at `/fragrances/[slug]`: brand, notes by layer, accord bars, not-found page for unknown slugs
- [x] Browse page at `/fragrances`, linked from the home page
- [x] First Lighthouse baseline and `EXPLAIN ANALYZE` on the page queries ([PERFORMANCE.md](PERFORMANCE.md))
- [x] Fix dark-mode contrast of grey secondary text (found in the Lighthouse baseline)
- [x] Fragella import (`npm run fragella`); see DECISIONS 007. First run: 8 brands, 115 fragrances (126 with curated)
- [x] Browse page pagination (48 per page)
- [x] Login with Better Auth: email + password, GitHub, Google (Day 5, done early)
- [x] Collections: have / want / had buttons on fragrance pages, and a My collection page (Day 3)
- [x] UI rework: dark boutique look, lit display cases, bottle photos, notes timeline (DECISIONS 009)
- [x] Ranking: loved / fine / disliked, "which do you prefer?" comparisons, scores out of 10, My rankings page (Day 4, DECISIONS 010)
- [x] Profiles: public /u/[username] with top ranked and shelf; /settings for username, bio, private city (DECISIONS 011)
- [x] Redesign: diary-app look with accord-coloured posters, community scores and 'How it unfolds' writing (DECISIONS 012)
- [x] Wear diary: Log a wear, /diary by month, worn counts, Most worn and Recent wears on profiles (DECISIONS 013)
- [x] Reviews: write/edit/delete with longevity and sillage, averages and reviewer scores on fragrance pages, latest on profiles (DECISIONS 014)
- [x] Following: follow/unfollow, follower lists, /feed of rankings, wears, reviews and collection changes, /people (DECISIONS 015)
- [x] What to wear today: a weather-based pick from your shelf on the home page (DECISIONS 016)
- [x] Lighthouse after the redesign: fixed browse image loading and a layout shift on fragrance pages (PERFORMANCE.md); kept bottle photos unresized (DECISIONS 009)
- [x] Moderation: report reviews, auto-hide at 3 reports, /admin/reports, `npm run make-admin`; rate limits on posting, sign-up and sign-in (DECISIONS 017)
- [x] Live at https://scentbook.online: AWS EC2 + RDS, HTTPS by Caddy, deploy and rollback scripts, pre-launch security fixes ([DEPLOY.md](DEPLOY.md), DECISIONS 018)

## Now
- [ ] Sign up on the live site and make yourself a moderator (`make-admin`, see DEPLOY.md)
- [ ] GitHub and Google sign-in: OAuth apps with `https://scentbook.online/api/auth/callback/...`, keys in `.env.production`, then `scripts/push-settings.sh` and deploy

## Next

## Later
- [ ] Learn from your diary which fragrances you wear in which weather; prefill the weather when logging a wear
- [ ] Notifications (new followers) and paging through older feed items
- [ ] Edit a diary entry (for now: delete and log it again)
- [ ] **User fragrance submissions with admin review.** Signed-in users submit a missing fragrance; it waits in a queue until an admin approves it, so nothing unverified reaches the catalog.
  - Depends on login, plus the admin role on `users` (added with moderation).
  - A `fragrance_submissions` table: the proposed fragrance as JSON, `status` (pending / approved / rejected), submitter, reviewer, reason for rejecting.
  - The submission form picks brands, notes and accords from the existing catalog (with "suggest a new one" as a fallback), so near-duplicates like "Bourbon Vanilla" vs "Vanilla" don't creep in.
  - Approving reuses the seed script's insert logic, so a fragrance enters the catalog the same way whether it came from `data.ts` or a user.
  - Later still: suggested corrections to existing fragrances, through the same queue.
