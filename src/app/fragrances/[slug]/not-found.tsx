import Link from "next/link";
import { pageContainer, secondaryButton } from "@/lib/ui";

export default function FragranceNotFound() {
  return (
    <main className={`${pageContainer} flex-1 py-20`}>
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
        We don&rsquo;t have that fragrance yet
      </h1>
      <p className="mt-4 max-w-md text-muted">
        The link may be mistyped, or it isn&rsquo;t in the catalog yet.
      </p>
      <Link
        href="/fragrances"
        className={`${secondaryButton} mt-8`}
      >
        Browse all fragrances
      </Link>
    </main>
  );
}
