#!/usr/bin/env bash
# Build Scentbook's Docker image, push it to ECR, and roll it out on the EC2
# server through Systems Manager (no SSH). See DEPLOY.md.
#
#   scripts/deploy.sh             build, push, deploy the current commit
#   scripts/deploy.sh --rollback  put the previous image back
#
# The server only switches to the new version once /api/health passes;
# otherwise it keeps (or restores) the old one.
set -euo pipefail
cd "$(dirname "$0")/.."

REGION="${AWS_REGION:-us-east-1}"
REGISTRY=438424052352.dkr.ecr.$REGION.amazonaws.com
REPO=$REGISTRY/scentbook
INSTANCE=$(aws ec2 describe-instances --region "$REGION" \
  --filters Name=tag:Name,Values=scentbook Name=instance-state-name,Values=running \
  --query 'Reservations[0].Instances[0].InstanceId' --output text)
[[ "$INSTANCE" == i-* ]] || { echo "No running server tagged Name=scentbook."; exit 1; }

# Run scripts/server-deploy.sh on the server with the given argument.
run_on_server() {
  local params
  params=$(node -e '
    const fs = require("fs");
    const script = fs.readFileSync("scripts/server-deploy.sh", "utf8");
    const b64 = Buffer.from(script).toString("base64");
    console.log(JSON.stringify({ commands: [
      `mkdir -p /opt/scentbook && echo ${b64} | base64 -d > /opt/scentbook/server-deploy.sh`,
      `bash /opt/scentbook/server-deploy.sh ${process.argv[1]}`,
    ], executionTimeout: ["600"] }));' "$1")
  local cmd
  cmd=$(aws ssm send-command --region "$REGION" --instance-ids "$INSTANCE" \
    --document-name AWS-RunShellScript --comment "scentbook deploy" \
    --parameters "$params" --query Command.CommandId --output text)
  aws ssm wait command-executed --region "$REGION" --command-id "$cmd" --instance-id "$INSTANCE" 2>/dev/null || true
  aws ssm get-command-invocation --region "$REGION" --command-id "$cmd" --instance-id "$INSTANCE" \
    --query '[Status,StandardOutputContent,StandardErrorContent]' --output text
  [[ "$(aws ssm get-command-invocation --region "$REGION" --command-id "$cmd" --instance-id "$INSTANCE" \
    --query Status --output text)" == "Success" ]]
}

if [[ "${1:-}" == "--rollback" ]]; then
  run_on_server --rollback
  exit
fi

[[ -f .env.production ]] || { echo "Missing .env.production (see DEPLOY.md)."; exit 1; }
set -a; . ./.env.production; set +a

# What's live is always a commit you can name.
if [[ -n "$(git status --porcelain)" ]]; then echo "Commit your changes first."; exit 1; fi
REV=$(git rev-parse --short HEAD)

echo "Running tests…"; npm test --silent >/dev/null

# The server is ARM (t4g), like Apple-silicon Macs, so this builds natively.
# The build reads the production database to prerender pages.
echo "Building ${REV}…"
docker buildx build --platform linux/arm64 --load -t "$REPO:$REV" \
  --secret id=database_url,env=DATABASE_URL \
  --secret id=better_auth_secret,env=BETTER_AUTH_SECRET .

echo "Pushing…"
aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$REGISTRY" >/dev/null
docker push -q "$REPO:$REV"

echo "Deploying on ${INSTANCE}…"
run_on_server "$REPO:$REV"
echo "Live at $BETTER_AUTH_URL"
