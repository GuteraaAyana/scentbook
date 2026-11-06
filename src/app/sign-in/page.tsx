import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthFormWithProviders } from "@/components/auth-form-with-providers";

export const metadata: Metadata = { title: "Sign in · Scentbook" };

export default function SignInPage() {
  return (
    <main className="flex-1 px-4 py-16 sm:py-24">
      <div className="mx-auto w-full max-w-sm">
      <h1 className="text-3xl font-extrabold tracking-tight">Sign in</h1>
      {/* Per request (which sign-in providers are on) and reads ?next=, so inside Suspense. */}
      <Suspense>
        <AuthFormWithProviders mode="sign-in" />
      </Suspense>
      </div>
    </main>
  );
}
