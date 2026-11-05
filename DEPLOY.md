# Deploying Scentbook

Production runs on AWS: the app in a **Lightsail container service** (one container, `next start`, free HTTPS address), the database on **Amazon RDS for PostgreSQL**. Why this setup: DECISIONS 018.

```
browser ──HTTPS──▶ Lightsail load balancer ──▶ container (Next.js, port 3000) ──TLS──▶ RDS PostgreSQL
                    *.cs.amazonlightsail.com     /api/health checked every 30 s
```

## What it costs

| Piece | Size | Roughly |
|---|---|---|
| Lightsail container service | Micro (1 GB RAM, 0.25 vCPU), 1 node | $10 a month |
| RDS PostgreSQL | db.t4g.micro, 20 GB gp3, single zone | free for 12 months on a new account's free tier, then about $15 a month |

Your AWS Budgets alert from Day 1 covers both.

## Tools (once)

```bash
brew install awscli colima docker docker-buildx
colima start
aws configure   # your own access keys, typed by you (or `aws sso login` if you use SSO)
```

## First-time setup

Done once. Steps 1 and 2 create things that cost money.

1. **Database.** Create the RDS instance (PostgreSQL 17, db.t4g.micro, 20 GB, encrypted, 7-day automated backups, deletion protection on). Connections must use TLS (`rds.force_ssl`, on by default), with a long random password. Lightsail containers have no fixed outbound address, so the database is reachable from the internet on port 5432 but only over verified TLS with that password; your IP is the only other thing that needs it, for migrations (DECISIONS 018). Create the `scentbook` database.
2. **App service.** `aws lightsail create-container-service --service-name scentbook --power micro --scale 1`. Its URL (`https://scentbook.<id>.<region>.cs.amazonlightsail.com`) is the site's address.
3. **Settings.** Create `.env.production` (git ignores it) with:
   ```bash
   DATABASE_URL=postgresql://scentbook:<password>@<rds-endpoint>:5432/scentbook?sslmode=verify-full
   BETTER_AUTH_SECRET=<openssl rand -base64 32: a new one, not the local one>
   BETTER_AUTH_URL=https://scentbook.<id>.<region>.cs.amazonlightsail.com
   REVALIDATE_SECRET=<openssl rand -hex 24>
   # Optional, once the OAuth apps have production callback URLs:
   GITHUB_CLIENT_ID= / GITHUB_CLIENT_SECRET= / GOOGLE_CLIENT_ID= / GOOGLE_CLIENT_SECRET=
   ```
4. **Database certificate, for running scripts from your Mac:**
   ```bash
   curl -o rds-ca.pem https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem
   ```
5. **Tables and catalog:**
   ```bash
   ENV_FILE=.env.production NODE_EXTRA_CA_CERTS=rds-ca.pem npm run db:migrate
   ENV_FILE=.env.production NODE_EXTRA_CA_CERTS=rds-ca.pem npm run db:seed
   ENV_FILE=.env.production NODE_EXTRA_CA_CERTS=rds-ca.pem npm run fragella -- load
   ```
6. **Deploy:** `scripts/deploy.sh` (below).
7. **Moderator:** sign up on the live site, pick a username, then
   `ENV_FILE=.env.production NODE_EXTRA_CA_CERTS=rds-ca.pem npm run make-admin -- <username>`.
8. **OAuth (optional):** add `https://<site>/api/auth/callback/github` and `…/google` to the GitHub and Google OAuth apps, put their keys in `.env.production`, and deploy again.

## Every deploy

```bash
scripts/deploy.sh
```

It refuses to run with uncommitted changes, runs the tests, builds the image for linux/amd64 (the build reads the production database to prerender pages), pushes it, and starts a new deployment. Lightsail only switches traffic once `/api/health` passes, so a version that can't start never replaces the running one.

**Schema changes:** run `db:migrate` against production *before* deploying the code that needs it, and write migrations so the old code still works with the new schema (add columns, don't rename or drop in the same release).

## Rollback

| What happened | Do this | Time |
|---|---|---|
| New version is broken | `scripts/deploy.sh --rollback` (redeploys the previous image and settings) | ~5 min |
| A specific commit is the problem | `git revert <commit>`, then `scripts/deploy.sh` | ~10 min |
| Bad data or a bad migration | Restore RDS to a point in time (automated backups, 7 days) as a new instance, check it, then point `DATABASE_URL` at it and deploy | ~30 min |

Roll back when the site returns errors, `/api/health` fails, or sign-in/posting breaks for real users. Roll back first, investigate second.

## Watching it

- **Health:** `curl https://<site>/api/health` returns `{"status":"ok"}`, or 503 if the database is unreachable. Lightsail checks it every 30 s and replaces a container that keeps failing.
- **Logs:** `aws lightsail get-container-log --service-name scentbook --container-name app`, or the Lightsail console's Logs tab. Errors show a digest; the error page shows the same "Reference" to match a user's report to a log line.
- **Metrics and alarms:** the Lightsail console's Metrics tab (CPU, memory, requests, 4xx/5xx). Set an alarm on 5xx responses and on memory above 80%.
- **Database:** RDS console → CloudWatch metrics (CPU, connections, free storage).

## Limits of this setup

- **One container.** Cached pages live in the container's memory. A second container wouldn't hear about the first one's cache refreshes (a new review, a hidden review). Scaling out needs a shared cache handler first.
- **Deploys restart the container**, so caches start cold; the first visits after a deploy are a little slower.
