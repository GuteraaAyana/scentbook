"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    await authClient.signOut();
    router.refresh(); // re-render the header without the session
  }

  return (
    <button type="button" onClick={signOut} className="hover:underline hover:underline-offset-4">
      Sign out
    </button>
  );
}
