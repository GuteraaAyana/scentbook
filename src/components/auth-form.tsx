"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { validateUsername } from "@/lib/profile";
import { primaryButton, secondaryButton, textField } from "@/lib/ui";

type Props = {
  mode: "sign-in" | "sign-up";
  providers: { github: boolean; google: boolean };
};


// Where to go after signing in: ?next=/some/page, if it's a page on this site.
// Anything else (another site, "//evil.com") falls back to the home page, so
// the link can't be used to send people elsewhere.
function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/";
}

export function AuthForm({ mode, providers }: Props) {
  const router = useRouter();
  const nextParam = useSearchParams().get("next");
  const next = safeNext(nextParam);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const signUp = mode === "sign-up";

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));

    let username = "";
    if (signUp) {
      const checked = validateUsername(String(form.get("username") ?? ""));
      if (!checked.ok) {
        setError(checked.error);
        return;
      }
      username = checked.value;
    }

    setPending(true);
    setError(null);
    const { error } = signUp
      ? await authClient.signUp.email({ name: String(form.get("name")), email, password, username })
      : await authClient.signIn.email({ email, password });
    setPending(false);

    if (error) {
      setError(
        error.status === 429
          ? "Too many attempts from here. Wait a few minutes and try again."
          : (error.message ?? "Something went wrong. Please try again."),
      );
      return;
    }
    router.push(next);
    router.refresh(); // re-render server components (the header) with the new session
  }

  async function social(provider: "github" | "google") {
    setError(null);
    // Leaves the site for GitHub/Google, which send the user back to callbackURL.
    const { error } = await authClient.signIn.social({ provider, callbackURL: next });
    if (error) setError(error.message ?? "Couldn't reach the sign-in provider.");
  }

  const anySocial = providers.github || providers.google;

  return (
    <div className="mt-8">
      {anySocial && (
        <>
          <div className="grid gap-3">
            {providers.github && (
              <button type="button" onClick={() => social("github")} className={secondaryButton}>
                Continue with GitHub
              </button>
            )}
            {providers.google && (
              <button type="button" onClick={() => social("google")} className={secondaryButton}>
                Continue with Google
              </button>
            )}
          </div>
          <p className="my-6 flex items-center gap-3 text-sm text-muted before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">
            or
          </p>
        </>
      )}

      <form onSubmit={onSubmit} className="grid gap-4">
        {signUp && (
          <label className="block text-sm font-medium">
            Name
            <input name="name" required autoComplete="name" className={textField} />
          </label>
        )}
        {signUp && (
          <label className="block text-sm font-medium">
            Username
            <span className="relative mt-1.5 block">
              <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted">
                @
              </span>
              <input
                name="username"
                required
                minLength={3}
                maxLength={20}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                aria-describedby="signup-username-help"
                className={`${textField.replace("mt-1.5 ", "")} pl-7`}
              />
            </span>
            <span id="signup-username-help" className="mt-1.5 block text-sm font-normal text-muted">
              Your profile&rsquo;s address: letters, numbers and underscores. You can change it once a week.
            </span>
          </label>
        )}
        <label className="block text-sm font-medium">
          Email
          <input name="email" type="email" required autoComplete="email" className={textField} />
        </label>
        <label className="block text-sm font-medium">
          Password
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={signUp ? "new-password" : "current-password"}
            className={textField}
          />
          {signUp && <span className="mt-1.5 block text-sm font-normal text-muted">At least 8 characters</span>}
        </label>

        <p role="alert" aria-live="polite" className="min-h-5 text-sm text-danger">
          {error}
        </p>

        <button
          type="submit"
          disabled={pending}
          className={primaryButton}
        >
          {pending ? "Please wait…" : signUp ? "Create account" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-sm text-muted">
        {signUp ? "Already have an account? " : "New to Scentbook? "}
        <Link
          href={`${signUp ? "/sign-in" : "/sign-up"}${nextParam ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="text-gold underline underline-offset-4">
          {signUp ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </div>
  );
}
