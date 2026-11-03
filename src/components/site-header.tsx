import { headers } from "next/headers";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { SignOutButton } from "./sign-out-button";

// The header itself is static; only the signed-in part reads the request's
// cookies, so it sits inside <Suspense> and every page keeps a prerendered shell.
export function SiteHeader() {
  return (
    <header className="border-b border-neutral-200 dark:border-neutral-800">
      <nav className="mx-auto flex h-14 w-full max-w-5xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="font-semibold tracking-tight">
          Scentbook
        </Link>
        <Link href="/fragrances" className="text-sm text-muted hover:text-foreground">
          Fragrances
        </Link>
        <div className="ml-auto flex items-center gap-4 text-sm">
          <Suspense fallback={<span className="h-4 w-16" />}>
            <UserMenu />
          </Suspense>
        </div>
      </nav>
    </header>
  );
}

async function UserMenu() {
  // Always per request: Better Auth checks the session's expiry against the
  // current time, which must never be baked into a prerender or prefetch.
  await connection();
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return (
      <>
        <Link href="/sign-in" className="text-muted hover:text-foreground">
          Sign in
        </Link>
        <Link
          href="/sign-up"
          className="rounded-full bg-foreground px-4 py-1.5 font-medium text-background transition-opacity hover:opacity-85"
        >
          Sign up
        </Link>
      </>
    );
  }

  return (
    <>
      <span className="text-muted">{session.user.name}</span>
      <SignOutButton />
    </>
  );
}
