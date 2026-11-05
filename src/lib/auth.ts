// Login, sign-up and sessions (Better Auth). Server only: this holds secrets.
// The browser talks to it through /api/auth/* (src/app/api/auth/[...all]).
import "server-only";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { accounts, rateLimits, sessions, users, verifications } from "@/db/schema";
import { validateUsername } from "@/lib/profile";

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
      // Chosen at sign-up with email and password (checked in databaseHooks
      // below); GitHub/Google accounts pick one in settings. Changing it
      // later goes through the profile settings action and its 7-day rule.
      username: { type: "string", required: false, input: true },
      usernameChangedAt: { type: "date", required: false, input: false },
      bio: { type: "string", required: false, input: false },
      city: { type: "string", required: false, input: false },
      // The home city's place (chosen from the weather service's list) and
      // the reader's temperature unit, so pages can use them from the session.
      cityLatitude: { type: "number", required: false, input: false },
      cityLongitude: { type: "number", required: false, input: false },
      temperatureUnit: { type: "string", required: false, input: false },
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

  databaseHooks: {
    user: {
      create: {
        before: async (user, ctx) => {
          const raw = (user as { username?: unknown }).username;
          if (raw == null || raw === "") {
            if (ctx?.path === "/sign-up/email") throw new APIError("BAD_REQUEST", { message: "Pick a username." });
            return; // GitHub/Google: chosen later in settings
          }
          const checked = validateUsername(String(raw));
          if (!checked.ok) throw new APIError("BAD_REQUEST", { message: checked.error });
          const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.username, checked.value));
          if (taken) throw new APIError("BAD_REQUEST", { message: "That username is taken. Try another." });
          return { data: { ...user, username: checked.value, usernameChangedAt: new Date() } };
        },
      },
      update: {
        // Better Auth's own /update-user endpoint may not change usernames:
        // that would skip the 7-day rule. Settings saves it directly instead.
        before: async (data, ctx) => {
          if (ctx?.path === "/update-user" && "username" in data) {
            throw new APIError("BAD_REQUEST", { message: "Change your username in settings." });
          }
        },
      },
    },
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
