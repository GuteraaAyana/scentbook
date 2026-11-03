import Link from "next/link";

export default function FragranceNotFound() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">
        We don&rsquo;t have that fragrance yet
      </h1>
      <p className="mt-3 text-neutral-600 dark:text-neutral-400">
        The link may be mistyped, or it isn&rsquo;t in the catalog yet.
      </p>
      <Link
        href="/fragrances"
        className="mt-6 inline-block underline underline-offset-4"
      >
        Browse all fragrances
      </Link>
    </main>
  );
}
