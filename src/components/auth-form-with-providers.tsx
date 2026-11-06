import { connection } from "next/server";
import { socialProviders } from "@/lib/auth";
import { AuthForm } from "./auth-form";

// The sign-in/sign-up form, with "Continue with GitHub/Google" for whichever
// providers have keys. Decided per request: the keys only exist on the
// running server, not when pages are prerendered at build time, so a
// prerendered page would never show the buttons.
export async function AuthFormWithProviders({ mode }: { mode: "sign-in" | "sign-up" }) {
  await connection();
  return <AuthForm mode={mode} providers={socialProviders} />;
}
