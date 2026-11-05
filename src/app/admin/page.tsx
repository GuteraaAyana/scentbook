import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { isAdmin } from "@/db/moderation";
import { auth } from "@/lib/auth";
import { pageContainer } from "@/lib/ui";

export const metadata: Metadata = { title: "Admin · Scentbook", robots: { index: false } };

const tools = [
  { href: "/admin/reports", title: "Reports", text: "Reviews members have reported: hide them or keep them up." },
  { href: "/admin/fragrances/new", title: "Add a fragrance", text: "Put a missing fragrance in the catalog." },
];

export default function AdminPage() {
  return (
    <main className={`${pageContainer} flex-1 py-8 sm:py-10`}>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Admin />
      </Suspense>
    </main>
  );
}

async function Admin() {
  await connection();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || !(await isAdmin(session.user.id))) notFound();

  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Admin</h1>
      <ul className="mt-8 grid max-w-3xl gap-4 sm:grid-cols-2">
        {tools.map((t) => (
          <li key={t.href}>
            <Link href={t.href} className="block h-full rounded-lg bg-surface p-5 transition-colors hover:bg-raised">
              <span className="text-lg font-extrabold">{t.title}</span>
              <span className="mt-1 block text-sm text-muted">{t.text}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
