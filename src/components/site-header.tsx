import { headers } from "next/headers";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { pageContainer } from "@/lib/ui";
import { SignOutButton } from "./sign-out-button";

const navLink = "text-muted transition-colors hover:text-foreground";

// The header itself is static; only the signed-in part reads the request's
// cookies, so it sits inside <Suspense> and every page keeps a prerendered shell.
export function SiteHeader() {
  return (
    <header className="border-b border-line">
      <nav className={`${pageContainer} flex h-16 items-center gap-4 whitespace-nowrap max-[399px]:gap-3 sm:gap-8`}>
        <Link href="/" className="font-display text-2xl leading-none max-[399px]:text-xl">
          Scentbook
        </Link>
        <Link href="/fragrances" className={`${navLink} text-sm`}>
          Fragrances
        </Link>
        <div className="ml-auto flex items-center gap-4 text-sm max-[399px]:gap-3 sm:gap-6">
          <Suspense fallback={<span className="h-4 w-20" />}>
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
        {/* On the narrowest phones there's only room for Join; its page links to sign-in. */}
        <Link href="/sign-in" className={`${navLink} max-[399px]:hidden`}>
          Sign in
        </Link>
        <Link
          href="/sign-up"
          className="rounded-full bg-brass px-4 py-2 font-medium text-brass-ink transition-opacity hover:opacity-90"
        >
          Join
        </Link>
      </>
    );
  }

  return (
    <>
      <Link href="/collection" className={navLink}>
        <span className="sm:hidden">Collection</span>
        <span className="hidden sm:inline">My collection</span>
      </Link>
      {/* No room on phones; the collection page links here too. */}
      <Link href="/rankings" className={`${navLink} hidden sm:inline`}>
        My rankings
      </Link>
      <span className="hidden text-foreground md:inline">{session.user.name}</span>
      {/* Too narrow for it here below 400px; the collection page has it too. */}
      <SignOutButton className="text-muted transition-colors hover:text-foreground max-[399px]:hidden" />
    </>
  );
}
