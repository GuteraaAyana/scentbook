// Login, sign-up and sessions (Better Auth). Server only: this holds secrets.
// The browser talks to it through /api/auth/* (src/app/api/auth/[...all]).
import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import { accounts, rateLimits, sessions, users, verifications } from "@/db/schema";

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
    schema: { users, sessions, accounts, verifications, rateLimits },
  }),
  // Our tables are plural; tell Better Auth their names.
  user: {
    modelName: "users",
    additionalFields: {
      // Set later from the profile page, not at sign-up.
      username: { type: "string", required: false, input: false },
      bio: { type: "string", required: false, input: false },
      city: { type: "string", required: false, input: false },
      // "member" or "admin". Only for showing the Reports link; the moderator
      // actions read it fresh from the database.
      role: { type: "string", required: false, input: false },
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

  // In production the app sits behind a load balancer, which adds the
  // client's address to x-forwarded-for. Hops in these private ranges are
  // that infrastructure, so the limiter takes the address just before them,
  // the real client, and ignores anything a client wrote into the header.
  advanced: {
    ipAddress: { trustedProxies: ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"] },
  },

  // Per IP address, on the /api/auth/* routes. Counts are kept in Postgres
  // (rate_limits) so they survive restarts and hold across servers. On in
  // development too, so it can be tried out. Other paths: 100 a minute.
  rateLimit: {
    enabled: true,
    storage: "database",
    modelName: "rateLimits",
    window: 60,
    max: 100,
    customRules: {
      "/sign-up/email": { window: 60 * 60, max: 10 }, // new accounts: 10 an hour
      "/sign-in/email": { window: 5 * 60, max: 10 }, // password guesses: 10 per 5 minutes
      "/get-session": false, // read on every page; not worth limiting
    },
  },
  // Lets server actions set the session cookie. Must be the last plugin.
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
