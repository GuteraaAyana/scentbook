import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { socialProviders } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign in · Scentbook" };

export default function SignInPage() {
  return (
    <main className="mx-auto w-full max-w-sm px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
      <AuthForm mode="sign-in" providers={socialProviders} />
    </main>
  );
}
