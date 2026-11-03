// Every Better Auth endpoint (sign-in, sign-up, sign-out, OAuth callbacks...)
// lives under /api/auth/*, handled here.
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

export const { GET, POST } = toNextJsHandler(auth);
