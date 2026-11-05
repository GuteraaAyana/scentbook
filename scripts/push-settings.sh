#!/usr/bin/env bash
# Copy production settings from .env.production into AWS Systems Manager
# Parameter Store (/scentbook/*, encrypted). The server reads them each time a
# deploy starts the app. Run after changing .env.production, then deploy.
set -euo pipefail
cd "$(dirname "$0")/.."
REGION="${AWS_REGION:-us-east-1}"
KEYS=(DATABASE_URL BETTER_AUTH_SECRET BETTER_AUTH_URL REVALIDATE_SECRET
      GITHUB_CLIENT_ID GITHUB_CLIENT_SECRET GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET)

set -a; . ./.env.production; set +a
tmp=$(mktemp); trap 'rm -f "$tmp"' EXIT; chmod 600 "$tmp"
for k in "${KEYS[@]}"; do
  v="${!k:-}"
  if [[ -z "$v" ]]; then
    aws ssm delete-parameter --region "$REGION" --name "/scentbook/$k" >/dev/null 2>&1 || true
    continue
  fi
  # The value goes through a private temp file, not the command line.
  K="$k" V="$v" node -e 'require("fs").writeFileSync(process.argv[1], JSON.stringify({
    Name: "/scentbook/" + process.env.K, Value: process.env.V, Type: "SecureString", Overwrite: true }))' "$tmp"
  aws ssm put-parameter --region "$REGION" --cli-input-json "file://$tmp" >/dev/null
  echo "set /scentbook/$k"
done
