#!/bin/bash
# Runs ON the server (sent by scripts/deploy.sh through Systems Manager).
# Usage: server-deploy.sh <image> | --rollback
#
# Reads settings from Parameter Store, starts the new app container, waits for
# /api/health, and puts the previous image back if the new one isn't healthy.
set -euo pipefail
REGION=us-east-1
DIR=/opt/scentbook
REGISTRY=438424052352.dkr.ecr.$REGION.amazonaws.com
cd "$DIR"

if [[ "${1:-}" == "--rollback" ]]; then
  [[ -s previous-image ]] || { echo "No previous image recorded."; exit 1; }
  IMAGE=$(cat previous-image)
else
  IMAGE="$1"
fi

# Settings -> app.env, readable by root only.
umask 077
aws ssm get-parameters-by-path --region "$REGION" --path /scentbook/ --with-decryption \
  --query 'Parameters[].[Name,Value]' --output text \
  | awk -F'\t' '{ sub("^/scentbook/", "", $1); print $1 "=" $2 }' > app.env.new
grep -q '^DATABASE_URL=' app.env.new || { echo "Settings missing from Parameter Store (run scripts/push-settings.sh)."; exit 1; }
mv app.env.new app.env

aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$REGISTRY" >/dev/null
docker pull -q "$IMAGE"

start() {
  docker rm -f app >/dev/null 2>&1 || true
  docker run -d --name app --restart unless-stopped --network scentbook \
    --env-file "$DIR/app.env" --memory 700m \
    --log-opt max-size=10m --log-opt max-file=5 "$1" >/dev/null
}

healthy() {
  for _ in $(seq 1 30); do
    if docker exec app wget -q -T 3 -O /dev/null http://127.0.0.1:3000/api/health 2>/dev/null; then
      return 0
    fi
    sleep 2
  done
  return 1
}

CURRENT=$(docker inspect --format '{{.Config.Image}}' app 2>/dev/null || true)
start "$IMAGE"
if healthy; then
  if [[ -n "$CURRENT" && "$CURRENT" != "$IMAGE" ]]; then echo "$CURRENT" > previous-image; fi
  echo "$IMAGE" > current-image
  docker image prune -af --filter "until=168h" >/dev/null || true
  echo "LIVE: $IMAGE"
else
  echo "New version failed its health check. Last log lines:"
  docker logs --tail 30 app 2>&1 || true
  if [[ -n "$CURRENT" ]]; then
    start "$CURRENT"
    echo "Put back $CURRENT."
  fi
  exit 1
fi
