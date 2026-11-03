import Link from "next/link";
import { pageContainer, secondaryButton } from "@/lib/ui";

// Any page that doesn't exist, including unknown profiles (/u/...).
export default function NotFound() {
  return (
    <main className={`${pageContainer} flex-1 py-20`}>
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Nothing here</h1>
      <p className="mt-4 max-w-md text-muted">
        That page doesn&rsquo;t exist. The link may be mistyped, or the profile may have changed its username.
      </p>
      <Link href="/fragrances" className={`${secondaryButton} mt-8`}>
        Browse fragrances
      </Link>
    </main>
  );
}
