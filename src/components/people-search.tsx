"use client";

import { useMemo, useState } from "react";
import { searchPeople } from "@/lib/search";
import { PersonList } from "./people";
import { SearchField } from "./search-field";

type Person = { name: string; username: string | null; bio: string | null };

// Filters the people list as you type: by name, @username or bio.
export function PeopleSearch({ people }: { people: Person[] }) {
  const [query, setQuery] = useState("");
  const shown = useMemo(() => searchPeople(people, query), [people, query]);
  const searching = query.trim().length > 0;

  return (
    <>
      <SearchField value={query} onChange={setQuery} label="Search people" placeholder="Search by name or @username" />
      {searching && (
        <p className="mt-4 text-sm text-muted" role="status">
          {shown.length === 0 ? null : `${shown.length} ${shown.length === 1 ? "person" : "people"}`}
        </p>
      )}
      <div className="mt-2 max-w-2xl">
        <PersonList
          people={shown}
          empty={searching ? `Nobody matches “${query.trim()}”.` : "Nobody has a public profile yet."}
        />
      </div>
    </>
  );
}
