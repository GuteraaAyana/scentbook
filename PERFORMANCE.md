# Performance

Measured baselines, so later changes have something to compare against. Re-run these after big changes and add a new entry rather than overwriting old ones.

## Baseline: 2026-11-03

**Setup:** `npm run build && npm start` on localhost, catalog of 11 fragrances. Lighthouse 12.8.2, default mobile settings (simulated slow 4G, 4× CPU slowdown), headless Chrome in dark mode. Each page was run 3 times; the table shows the median run.

### Lighthouse

| Page | Performance | Accessibility | Best practices | SEO | FCP | LCP | TBT | CLS | Page weight |
|---|---|---|---|---|---|---|---|---|---|
| `/` (home) | 98 | 100 | 100 | 100 | 0.8 s | 2.3 s | 7 ms | 0 | 218 KiB |
| `/fragrances` (browse) | 98 | 95 | 100 | 100 | 0.8 s | 2.3 s | 6 ms | 0 | 225 KiB |
| `/fragrances/le-labo-santal-33` (detail) | 98 | 96 | 100 | 100 | 0.8 s | 2.3 s | 8 ms | 0 | 220 KiB |

Targets: LCP ≤ 2.5 s, TBT ≤ 200 ms, CLS ≤ 0.1. All three pages pass.

**What the numbers say**
- Server response time is about 2 ms, because every page is prerendered and served from the cache.
- LCP (2.3 s) is the number closest to its limit. It's a simulated slow-4G estimate based on the CSS, font and JavaScript the page loads first, not a measured delay: in the actual load, the largest text rendered 36 ms after the first byte arrived. Watch this number as the pages gain images.
- Most of the page weight is the Next.js and React runtime. Lighthouse flags about 29 KiB of unused JavaScript and 13 KiB of legacy JavaScript in a framework chunk; these are framework defaults, not our code.
- **Accessibility issue:** grey secondary text (`text-neutral-500`, #737373) on the dark-mode background has a contrast ratio of 4.17:1, below the 4.5:1 minimum. Light mode passes.
  - **Fixed the same day:** secondary text now uses a `text-muted` color token (`--muted` in `globals.css`): #525252 in light mode (7.8:1) and #a3a3a3 in dark mode (8.1:1). After the fix, Lighthouse accessibility scores 100 on the home, browse, detail and not-found pages in both themes.

### Database (`EXPLAIN ANALYZE`)

| Query | Plan | Execution time |
|---|---|---|
| Detail: fragrance + brand by slug | Index scans on `fragrances_slug_unique` and `brands_pkey` | 0.07 ms |
| Detail: notes for one fragrance | Sequential scans + hash join | 0.11 ms |
| Browse: fragrances + brands, sorted, limit 60 | Index scans on `brands_name_unique` and the `(brand_id, name, concentration)` unique index | 0.05 ms |
| "Vanilla in the base" note search | Index-only scan on `fragrance_notes_note_idx` (with sequential scans disabled) | 0.23 ms |

With this few rows, Postgres reasonably prefers sequential scans for small tables, so these plans will change as the catalog grows. Two design choices are confirmed:
- The browse query uses the brand's unique-constraint index, so dropping the separate brand index lost nothing.
- The `(note_id, layer, fragrance_id)` index answers "note X in layer Y" without reading the table.

## After the redesign: 2026-11-04

**Setup:** the same as the baseline (production build, Lighthouse 12.8.2, default mobile settings, median of 3 runs), now with 126 fragrances, the diary-app design (DECISIONS 012) and Fragella bottle photos.

| Page | Performance | Accessibility | LCP | TBT | CLS | Page weight | vs baseline |
|---|---|---|---|---|---|---|---|
| `/` (home) | 99 | 100 | 2.2 s | 1 ms | 0 | 668 KiB | Same; heavier (photos) |
| `/fragrances` (browse) | 93 | 100 | 3.2 s | 10 ms | 0 | 1,135 KiB | **LCP over the 2.5 s target** |
| `/fragrances/le-labo-santal-33` (detail) | 98 | 100 | 2.3 s | 6 ms | 0 | 254 KiB | Same |

**What was wrong at first, and the fixes**
- **Browse scored 83 with a 4.7 s LCP.** Its largest element was a bottle photo marked `loading="lazy"`, so the browser deliberately delayed it, and 45 of the 48 posters' photos (1.8 MB) downloaded at once anyway, because on slow connections Chrome starts "lazy" images long before they scroll into view.
  - The first six posters (two rows on a phone) now load eagerly, the first three at high priority: 92, 3.3 s. Giving all six high priority was slower (88): they competed with each other.
  - Browse pages show 24 fragrances instead of 48: half the weight (2.0 MB → 1.1 MB), 93.
- **The detail page had a layout shift of 0.077** on two of three runs: while signed-out visitors' buttons loaded, three placeholders wrapped onto several lines on a phone and then collapsed into one "Sign in" line, pulling everything below up. The row now keeps a fixed minimum height with a single placeholder; CLS is 0.

**What's left: the bottle photos are full size.** Each arrives as Fragella's original 600–750 px `.webp` (typically 40–100 KB) to fill a poster about 130 px wide. A resized copy would be a few KB, which is what would bring browse under 2.5 s. Resizing means our server downloading and keeping resized copies of Fragella's images, which DECISIONS 009 chose not to do because of their terms, so it's left as an open decision. (Lighthouse's simulated slow 4G is a hard test; on a typical phone connection the photos arrive much faster.)

### How to re-run

```bash
npm run build && npm start
npx lighthouse@12.8.2 http://localhost:3000/fragrances --output json --output-path ./report.json
```
