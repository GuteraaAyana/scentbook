// Login, sign-up and sessions (Better Auth). Server only: this holds secrets.
// The browser talks to it through /api/auth/* (src/app/api/auth/[...all]).
import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import { accounts, sessions, users, verifications } from "@/db/schema";

const github =
  process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
    ? { clientId: process.env.GITHUB_CLIENT_ID, clientSecret: process.env.GITHUB_CLIENT_SECRET }
    : undefined;
const google =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET }
    : undefined;

// Which "Continue with ..." buttons to show. A provider is only on when its
// keys are in .env.local.
export const socialProviders = {
  github: Boolean(github),
  google: Boolean(google),
};

export const auth = betterAuth({
  // BETTER_AUTH_SECRET and BETTER_AUTH_URL are read from the environment.
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { users, sessions, accounts, verifications },
  }),
  // Our tables are plural; tell Better Auth their names.
  user: {
    modelName: "users",
    additionalFields: {
      // Set later from the profile page, not at sign-up.
      username: { type: "string", required: false, input: false },
      bio: { type: "string", required: false, input: false },
      city: { type: "string", required: false, input: false },
    },
  },
  session: { modelName: "sessions" },
  account: { modelName: "accounts" },
  verification: { modelName: "verifications" },

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  socialProviders: {
    ...(github && { github }),
    ...(google && { google }),
  },
  // Lets server actions set the session cookie. Must be the last plugin.
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
