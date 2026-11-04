import { headers } from "next/headers";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { pageContainer } from "@/lib/ui";
import { SignOutButton } from "./sign-out-button";

const navLink = "font-bold text-muted transition-colors hover:text-foreground";

// The header itself is static; only the signed-in part reads the request's
// cookies, so it sits inside <Suspense> and every page keeps a prerendered shell.
export function SiteHeader() {
  return (
    <header className="bg-chrome">
      <nav className={`${pageContainer} flex h-14 items-center gap-5 text-sm whitespace-nowrap sm:gap-7`}>
        <Link href="/" className="text-xl font-extrabold tracking-tight">
          scentbook
        </Link>
        <Link href="/fragrances" className={navLink}>
          Fragrances
        </Link>
        <div className="ml-auto flex items-center gap-4 sm:gap-6">
          <Suspense fallback={<span className="h-8 w-20" />}>
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
        {/* On the narrowest phones there's only room for one; its page links to the other. */}
        <Link href="/sign-in" className={`${navLink} max-[399px]:hidden`}>
          Sign in
        </Link>
        <Link
          href="/sign-up"
          className="inline-flex h-8 items-center rounded-md bg-gold px-3 font-bold text-gold-ink transition-opacity hover:opacity-90"
        >
          Create account
        </Link>
      </>
    );
  }

  const { name, username } = session.user;
  return (
    <>
      <Link href="/collection" className={`${navLink} hidden sm:inline`}>
        Collection
      </Link>
      <Link href="/diary" className={navLink}>
        Diary
      </Link>
      <Link href="/rankings" className={`${navLink} hidden sm:inline`}>
        Rankings
      </Link>
      <SignOutButton className={`${navLink} hidden md:inline`} />
      {/* Your profile, or settings until you've picked a username. */}
      <Link
        href={username ? `/u/${username}` : "/settings"}
        aria-label={`${name}: your profile`}
        className="grid size-8 place-items-center rounded-full bg-gold font-extrabold text-gold-ink"
      >
        {name.trim().charAt(0).toUpperCase()}
      </Link>
    </>
  );
}
