"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SearchIndexEntry } from "@/db/fragrances";
import { type PreparedFragrance, prepareFragrances, searchFragrances } from "@/lib/search";
import { FragranceGrid } from "./fragrance-card";
import { SearchField } from "./search-field";

type Prepared = PreparedFragrance<SearchIndexEntry>;

// Shared across every search box on the page and kept for the visit.
let indexPromise: Promise<Prepared[]> | null = null;
function loadIndex() {
  indexPromise ??= fetch("/api/search/fragrances")
    .then((r) => {
      if (!r.ok) throw new Error(String(r.status));
      return r.json() as Promise<SearchIndexEntry[]>;
    })
    .then(prepareFragrances)
    .catch((error) => {
      indexPromise = null; // let the next keystroke try again
      throw error;
    });
  return indexPromise;
}

const SHOW_FIRST = 48;

// Search the whole catalog as you type. Until there's a query it shows the
// page's own content (`children`); then matching fragrances replace it, and
// non-matches drop away with each letter. The query is kept in the address
// (?q=), so refreshing or going back keeps the search.
export function FragranceSearch({
  initialQuery = "",
  syncUrl = true,
  children,
}: {
  initialQuery?: string;
  // Off on prerendered pages that can't read ?q= back on arrival.
  syncUrl?: boolean;
  children: React.ReactNode;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [index, setIndex] = useState<Prepared[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const started = useRef(false);

  function start() {
    if (started.current) return;
    started.current = true;
    loadIndex().then(setIndex, () => {
      started.current = false;
      setFailed(true);
    });
  }

  // A search already in the address (a shared link, a refresh) loads at once.
  useEffect(() => {
    if (initialQuery) start();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on arrival
  }, []);

  function change(value: string) {
    setQuery(value);
    setShowAll(false);
    if (value.trim()) start();
    if (!syncUrl) return;
    const url = new URL(window.location.href);
    if (value.trim()) {
      url.searchParams.set("q", value);
      url.searchParams.delete("page");
    } else {
      url.searchParams.delete("q");
    }
    window.history.replaceState(window.history.state, "", url);
  }

  const results = useMemo(() => (index && query.trim() ? searchFragrances(index, query) : []), [index, query]);
  const searching = query.trim().length > 0;

  return (
    <>
      <SearchField
        value={query}
        onChange={change}
        onFocus={start}
        label="Search fragrances"
        placeholder="Search by name, house or note"
      />
      {!searching ? (
        children
      ) : failed && !index ? (
        <p className="mt-8 text-muted">Search isn&rsquo;t loading right now. Check your connection and type again.</p>
      ) : !index ? (
        <p className="mt-8 text-muted" role="status">
          Loading the catalog…
        </p>
      ) : (
        <section aria-label="Search results" className="mt-6">
          <p className="text-sm text-muted" role="status">
            {results.length === 0
              ? null
              : `${results.length} ${results.length === 1 ? "fragrance matches" : "fragrances match"}`}
          </p>
          {results.length === 0 ? (
            <p className="mt-2 max-w-md text-muted">
              Nothing matches &ldquo;{query.trim()}&rdquo;. Try a house, a note like vanilla, or fewer words.
            </p>
          ) : (
            <div className="mt-6">
              <FragranceGrid fragrances={showAll ? results : results.slice(0, SHOW_FIRST)} aboveFold={6} />
              {!showAll && results.length > SHOW_FIRST && (
                <button
                  type="button"
                  onClick={() => setShowAll(true)}
                  className="mt-8 text-sm font-bold text-gold underline underline-offset-4"
                >
                  Show all {results.length}
                </button>
              )}
            </div>
          )}
        </section>
      )}
    </>
  );
}
