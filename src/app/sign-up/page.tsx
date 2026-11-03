import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { socialProviders } from "@/lib/auth";

export const metadata: Metadata = { title: "Create an account · Scentbook" };

export default function SignUpPage() {
  return (
    <main className="flex-1 px-4 py-16 sm:py-24">
      <div className="mx-auto w-full max-w-sm">
      <h1 className="text-3xl font-extrabold tracking-tight">Create an account</h1>
      <p className="mt-2 text-muted">Log your collection, keep a wear diary, and rank what you&rsquo;ve tried.</p>
      {/* AuthForm reads ?next=, so it renders in the browser inside Suspense. */}
      <Suspense>
        <AuthForm mode="sign-up" providers={socialProviders} />
      </Suspense>
      </div>
    </main>
  );
}
