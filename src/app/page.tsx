import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-24 sm:px-6">
      <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">Scentbook</h1>
      <p className="mt-4 max-w-md text-lg text-muted">
        Letterboxd for fragrance. Log your collection, keep a wear diary, and
        rank what you&rsquo;ve tried.
      </p>
      <Link
        href="/fragrances"
        className="mt-8 inline-flex h-12 w-fit items-center rounded-full bg-foreground px-6 font-medium text-background transition-opacity hover:opacity-85"
      >
        Browse fragrances
      </Link>
    </main>
  );
}
