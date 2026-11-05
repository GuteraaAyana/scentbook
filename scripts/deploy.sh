#!/usr/bin/env bash
# Build Scentbook's Docker image and roll it out to the Lightsail container
# service. Usage: scripts/deploy.sh   (see DEPLOY.md for first-time setup)
#
# Reads production settings from .env.production (never committed). Lightsail
# keeps the previous deployment, so a failed health check leaves the old
# version serving; rollback is `scripts/deploy.sh --rollback`.
set -euo pipefail
cd "$(dirname "$0")/.."

SERVICE="${SCENTBOOK_SERVICE:-scentbook}"
REGION="${AWS_REGION:-us-east-1}"
ENV_FILE=".env.production"

if [[ "${1:-}" == "--rollback" ]]; then
  # Re-deploy the previous active deployment's exact image and settings.
  prev=$(aws lightsail get-container-service-deployments --region "$REGION" --service-name "$SERVICE" \
    --query 'deployments[?state==`INACTIVE`]|[0]' --output json)
  [[ "$prev" == "null" ]] && { echo "No previous deployment to roll back to."; exit 1; }
  echo "$prev" | node -e '
    const d = JSON.parse(require("fs").readFileSync(0, "utf8"));
    const strip = ({ containers, publicEndpoint: p }) => ({
      containers,
      publicEndpoint: { containerName: p.containerName, containerPort: p.containerPort, healthCheck: p.healthCheck },
    });
    require("fs").writeFileSync("/tmp/scentbook-rollback.json", JSON.stringify(strip(d)));'
  aws lightsail create-container-service-deployment --region "$REGION" --service-name "$SERVICE" \
    --cli-input-json file:///tmp/scentbook-rollback.json >/dev/null
  rm -f /tmp/scentbook-rollback.json
  echo "Rolling back to deployment version $(echo "$prev" | node -pe 'JSON.parse(require("fs").readFileSync(0)).version'). Watch: aws lightsail get-container-services --service-name $SERVICE"
  exit 0
fi

[[ -f "$ENV_FILE" ]] || { echo "Missing $ENV_FILE (see DEPLOY.md)."; exit 1; }
set -a; . "./$ENV_FILE"; set +a
for v in DATABASE_URL BETTER_AUTH_SECRET BETTER_AUTH_URL REVALIDATE_SECRET; do
  [[ -n "${!v:-}" ]] || { echo "$v is empty in $ENV_FILE."; exit 1; }
done

# Nothing uncommitted goes out: what's live is always a commit you can name.
if [[ -n "$(git status --porcelain)" ]]; then echo "Commit your changes first."; exit 1; fi
REV=$(git rev-parse --short HEAD)

echo "Running tests…"; npm test --silent >/dev/null

echo "Building image for $REV (linux/amd64)…"
docker buildx build --platform linux/amd64 --load -t "scentbook:$REV" \
  --secret id=database_url,env=DATABASE_URL \
  --secret id=better_auth_secret,env=BETTER_AUTH_SECRET .

echo "Pushing…"
IMAGE=$(aws lightsail push-container-image --region "$REGION" --service-name "$SERVICE" \
  --label app --image "scentbook:$REV" | grep -o ':'"$SERVICE"'\.app\.[0-9]*' | tail -1)
[[ -n "$IMAGE" ]] || { echo "Push failed."; exit 1; }

# Runtime settings. Only one container: the page cache lives in its memory,
# so a second one would serve pages the first had already refreshed.
node -e '
  const env = {};
  for (const k of ["DATABASE_URL","BETTER_AUTH_SECRET","BETTER_AUTH_URL","REVALIDATE_SECRET",
                   "GITHUB_CLIENT_ID","GITHUB_CLIENT_SECRET","GOOGLE_CLIENT_ID","GOOGLE_CLIENT_SECRET"])
    if (process.env[k]) env[k] = process.env[k];
  env.SCENTBOOK_REVISION = process.argv[1];
  const deployment = {
    containers: { app: { image: process.argv[2], environment: env, ports: { "3000": "HTTP" } } },
    publicEndpoint: {
      containerName: "app", containerPort: 3000,
      healthCheck: { path: "/api/health", intervalSeconds: 30, timeoutSeconds: 5,
                     healthyThreshold: 2, unhealthyThreshold: 3, successCodes: "200" },
    },
  };
  require("fs").writeFileSync("/tmp/scentbook-deploy.json", JSON.stringify(deployment), { mode: 0o600 });
' "$REV" "$IMAGE"
aws lightsail create-container-service-deployment --region "$REGION" --service-name "$SERVICE" \
  --cli-input-json file:///tmp/scentbook-deploy.json >/dev/null
rm -f /tmp/scentbook-deploy.json

echo "Deploying $REV as $IMAGE. Lightsail switches over once /api/health passes (a few minutes)."
echo "Watch: aws lightsail get-container-services --region $REGION --service-name $SERVICE --query 'containerServices[0].[state,currentDeployment.state,url]'"
