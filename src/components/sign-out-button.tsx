"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function SignOutButton({
  className = "text-muted transition-colors hover:text-foreground",
}: {
  className?: string;
}) {
  const router = useRouter();

  async function signOut() {
    await authClient.signOut();
    router.refresh(); // re-render the header without the session
  }

  return (
    <button type="button" onClick={signOut} className={className}>
      Sign out
    </button>
  );
}
