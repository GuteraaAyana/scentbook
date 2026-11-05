// The browser side of Better Auth: signIn, signUp and signOut call
// /api/auth/* on our own server. inferAdditionalFields teaches it our extra
// user fields (username...), from the server config's types only.
import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import type { auth } from "./auth";

export const authClient = createAuthClient({ plugins: [inferAdditionalFields<typeof auth>()] });
