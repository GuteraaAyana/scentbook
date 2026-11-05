import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ProfileForm } from "@/components/profile-form";
import { getOwnProfile } from "@/db/profiles";
import { auth } from "@/lib/auth";
import { usernameLockedUntil } from "@/lib/profile";
import { pageContainer } from "@/lib/ui";

export const metadata: Metadata = { title: "Profile settings · Scentbook" };

// A page on this site to continue to, or home ("//evil.com" isn't one).
function safeNext(next: unknown) {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\")
    ? next
    : "/";
}

// Also the first stop after signing up (?welcome=1): add a bio and a city.
export default function SettingsPage(props: PageProps<"/settings">) {
  return (
    <main className={`${pageContainer} flex-1 py-8 sm:py-10`}>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Settings searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}

async function Settings({ searchParams }: Pick<PageProps<"/settings">, "searchParams">) {
  await connection();
  const params = await searchParams;
  const welcome = params.welcome === "1";
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in?next=/settings");

  const profile = await getOwnProfile(session.user.id);
  if (!profile) redirect("/sign-in?next=/settings");

  const locked = usernameLockedUntil({ username: profile.username, changedAt: profile.usernameChangedAt }, new Date());
  const lockedUntil = locked?.toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric" }) ?? null;
  const chosen =
    profile.cityPlaceId && profile.city && profile.cityLatitude != null && profile.cityLongitude != null
      ? {
          id: profile.cityPlaceId,
          name: profile.city,
          region: null,
          country: null,
          countryCode: null,
          latitude: profile.cityLatitude,
          longitude: profile.cityLongitude,
          timezone: null,
        }
      : null;

  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
        {welcome ? (profile.username ? `Welcome, @${profile.username}` : "Welcome to Scentbook") : "Your profile"}
      </h1>
      <p className="mt-3 max-w-lg text-muted">
        {welcome
          ? "Two things make Scentbook yours: a line about what you wear, and your city, which fills in the weather for every wear you log."
          : profile.username
            ? "This is what people see on your public profile, along with what you own and your top-ranked fragrances."
            : "Pick a username to get a public profile people can visit, showing what you own and your top-ranked fragrances."}
      </p>
      <ProfileForm
        initial={{
          username: profile.username ?? "",
          bio: profile.bio ?? "",
          city: profile.city ?? "",
          placeId: chosen ? String(chosen.id) : "",
          temperatureUnit: profile.temperatureUnit,
        }}
        initialPlace={chosen}
        legacyCity={!chosen && profile.city ? profile.city : null}
        usernameLockedUntil={lockedUntil}
        welcomeNext={welcome ? safeNext(params.next) : null}
      />
    </>
  );
}
