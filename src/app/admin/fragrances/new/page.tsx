import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { AddFragranceForm } from "@/components/add-fragrance-form";
import { getCatalogNames } from "@/db/catalog-admin";
import { isAdmin } from "@/db/moderation";
import { auth } from "@/lib/auth";
import { pageContainer } from "@/lib/ui";

export const metadata: Metadata = { title: "Add a fragrance · Scentbook", robots: { index: false } };

export default function AddFragrancePage() {
  return (
    <main className={`${pageContainer} flex-1 py-8 sm:py-10`}>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <AddFragrance />
      </Suspense>
    </main>
  );
}

async function AddFragrance() {
  await connection();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || !(await isAdmin(session.user.id))) notFound();
  const names = await getCatalogNames();

  return (
    <>
      <p className="text-sm text-muted">
        <Link href="/admin" className="hover:text-foreground">
          Admin
        </Link>{" "}
        / Add a fragrance
      </p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Add a fragrance</h1>
      <p className="mt-3 max-w-xl text-muted">
        Houses, perfumers, notes and accords are matched to the {names.notes.length} notes and{" "}
        {names.brands.length} houses already here, so the same thing is never added twice. Anything new is created
        when you save.
      </p>
      <AddFragranceForm names={names} />
    </>
  );
}
