// The browser side of Better Auth: signIn, signUp and signOut call
// /api/auth/* on our own server.
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();
