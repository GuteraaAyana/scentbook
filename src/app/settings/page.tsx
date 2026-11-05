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

export default function SettingsPage() {
  return (
    <main className={`${pageContainer} flex-1 py-8 sm:py-10`}>
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Your profile</h1>
      <Suspense fallback={<p className="mt-3 text-muted">Loading…</p>}>
        <Settings />
      </Suspense>
    </main>
  );
}

async function Settings() {
  await connection();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in?next=/settings");

  const profile = await getOwnProfile(session.user.id);
  if (!profile) redirect("/sign-in?next=/settings");

  const locked = usernameLockedUntil({ username: profile.username, changedAt: profile.usernameChangedAt }, new Date());
  const lockedUntil = locked?.toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric" }) ?? null;

  return (
    <>
      <p className="mt-3 max-w-lg text-muted">
        {profile.username
          ? "This is what people see on your public profile, along with what you own and your top-ranked fragrances."
          : "Pick a username to get a public profile people can visit, showing what you own and your top-ranked fragrances."}
      </p>
      <ProfileForm
        initial={{ username: profile.username ?? "", bio: profile.bio ?? "", city: profile.city ?? "" }}
        usernameLockedUntil={lockedUntil}
      />
    </>
  );
}
