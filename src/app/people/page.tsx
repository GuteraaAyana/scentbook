import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { PersonList } from "@/components/people";
import { listPeople } from "@/db/follows";
import { pageContainer } from "@/lib/ui";

export const metadata: Metadata = { title: "People · Scentbook" };

// Everyone with a public profile. Changes as people join, so per request.
export default function PeoplePage() {
  return (
    <main className={`${pageContainer} flex-1 py-8 sm:py-10`}>
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">People</h1>
      <p className="mt-2 text-muted">Everyone with a public profile, newest first. Follow people to see their activity.</p>
      <Suspense fallback={<p className="mt-3 text-muted">Loading…</p>}>
        <People />
      </Suspense>
    </main>
  );
}

async function People() {
  await connection();
  const people = await listPeople();
  return (
    <div className="mt-4 max-w-2xl">
      <PersonList people={people} empty="Nobody has a public profile yet." />
    </div>
  );
}
