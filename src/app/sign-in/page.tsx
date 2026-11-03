import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { socialProviders } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign in · Scentbook" };

export default function SignInPage() {
  return (
    <main className="flex-1 px-4 py-16 sm:py-24">
      <div className="mx-auto w-full max-w-sm">
      <h1 className="font-display text-4xl">Sign in</h1>
      {/* AuthForm reads ?next=, so it renders in the browser inside Suspense. */}
      <Suspense>
        <AuthForm mode="sign-in" providers={socialProviders} />
      </Suspense>
      </div>
    </main>
  );
}
