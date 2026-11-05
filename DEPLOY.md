# Deploying Scentbook

Production is **https://scentbook.online**, on AWS in `us-east-1`. Why this setup: DECISIONS 018.

```
browser ──HTTPS──▶ EC2 t4g.micro (Elastic IP 184.198.24.101)
                   ├─ Caddy: HTTPS certificates (Let's Encrypt), www → bare domain
                   └─ app container (Next.js, port 3000, private)
                          │  TLS, verified
                          ▼
                   RDS PostgreSQL (db.t4g.micro): private, reachable only
                   from the server and from your Mac's IP
```

DNS is at Cloudflare: `A scentbook.online → 184.198.24.101` and `CNAME www → scentbook.online`, both **DNS only** (grey cloud). Proxying them through Cloudflare would hide visitors' addresses from the sign-in limits.

## What's where

| Thing | Name | Notes |
|---|---|---|
| Server | EC2 `scentbook` (`i-05de9c6a1565eee3a`) | Amazon Linux 2023, arm64, 1 GB plus 1 GB swap. No SSH: managed through Systems Manager. First-boot setup: `infra/user-data.sh` |
| Database | RDS `scentbook-db` | PostgreSQL 17, 20 GB encrypted, deletion protection on, 1 day of backups (the Free plan's limit) |
| Images | ECR `scentbook` | Scanned on push; keeps the last 10 |
| Settings | Parameter Store `/scentbook/*` | Encrypted; the server reads them at each deploy |
| Firewalls | `scentbook-app` (80, 443 open), `scentbook-db` (5432 from the server and your IP) | |
| Server permissions | IAM role `scentbook-app` | Pull images, read `/scentbook/*`, Systems Manager |

## What it costs

About $26 a month: the server about $6, its public IPv4 address about $3.65, its disk about $1.60, and the database about $15. That's paid from the Free plan's credits until 21 April 2027. Your budget alert is $29.

## Your Mac

```bash
brew install awscli colima docker docker-buildx
colima start --vm-type vz --vz-rosetta
aws login --region us-east-1
curl -o rds-ca.pem https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem
```

`.env.production` (git ignores it) holds the production settings: `DATABASE_URL` (ending `?sslmode=verify-full`), `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL=https://scentbook.online`, `REVALIDATE_SECRET`, and optionally the OAuth keys. After changing it, run `scripts/push-settings.sh`, then deploy.

**Running scripts against production** (migrations, seed, `make-admin`):

```bash
ENV_FILE=.env.production NODE_EXTRA_CA_CERTS=rds-ca.pem npm run db:migrate
```

The database only accepts your Mac's IP. If yours changed (a new network), allow the new one:

```bash
aws ec2 authorize-security-group-ingress --group-id sg-086c8c2f22ccc1689 --protocol tcp --port 5432 --cidr "$(curl -s https://checkip.amazonaws.com)/32"
```

## Every deploy

```bash
scripts/deploy.sh
```

It refuses to run with uncommitted changes, runs the tests, builds the image (natively, since the server is ARM like your Mac; the build reads the production database to prerender pages), pushes it to ECR, and tells the server to switch. The server starts the new container and waits for `/api/health`. If that fails, it puts the old container back and prints the new one's logs. Visitors see a few seconds of errors during the switch.

**Schema changes:** run `db:migrate` against production *before* deploying the code that needs it. Write migrations so the old code still works with the new schema (add columns; don't rename or drop in the same release).

## Rollback

| What happened | Do this | Time |
|---|---|---|
| New version is broken | `scripts/deploy.sh --rollback` (previous image) | ~1 min |
| A specific commit is the problem | `git revert <commit>`, then `scripts/deploy.sh` | ~5 min |
| Bad data or a bad migration | RDS console → `scentbook-db` → Restore to point in time (last 24 h) as a new instance, check it, point `DATABASE_URL` at it, `scripts/push-settings.sh`, deploy | ~30 min |
| Server broken beyond repair | Launch a new one from `infra/user-data.sh` with the same role, firewall and tag, move the Elastic IP to it, deploy | ~15 min |

Roll back when the site returns errors, `/api/health` fails, or sign-in/posting breaks. Roll back first, investigate second.

## Watching it

- **Health:** `curl https://scentbook.online/api/health` returns `{"status":"ok"}`, or 503 if the database is unreachable. Caddy also checks it every 30 s.
- **Logs:** Systems Manager → Session Manager → connect to `scentbook`, then `sudo docker logs --tail 100 app` (or `caddy`). The error page shows a "Reference" that matches a line in these logs.
- **Server:** EC2 console → Monitoring (CPU, status checks). AWS recovers the instance automatically if its hardware fails.
- **Database:** RDS console → Monitoring (CPU, connections, free storage).

## Limits of this setup

- **One server.** Cached pages live in the app's memory. Two servers wouldn't share cache refreshes (a new or hidden review), so scaling out needs a shared cache handler first.
- **Deploys restart the app**, so caches start cold and there are a few seconds of errors during the switch.
- **1 GB of memory** is fine for portfolio traffic. If `docker stats` shows the app near its 700 MB limit, move to t4g.small.
