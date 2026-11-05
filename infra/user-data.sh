#!/bin/bash
# First boot of the Scentbook server (Amazon Linux 2023, arm64).
# Installs Docker, adds swap, and starts Caddy, which serves HTTPS for
# scentbook.online with certificates from Let's Encrypt and passes requests
# to the app container. The app container itself is started by deploys
# (scripts/deploy.sh -> scripts/server-deploy.sh, through Systems Manager).
set -euxo pipefail

dnf install -y docker
systemctl enable --now docker

# 1 GB of swap: a safety net for a 1 GB server.
if [ ! -f /swapfile ]; then
  dd if=/dev/zero of=/swapfile bs=1M count=1024
  chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap defaults 0 0' >> /etc/fstab
fi

mkdir -p /opt/scentbook
cat > /opt/scentbook/Caddyfile <<'CADDY'
{
	email admin@scentbook.online
}

scentbook.online {
	encode zstd gzip
	reverse_proxy app:3000 {
		health_uri /api/health
		health_interval 30s
	}
	log {
		output stdout
		format console
	}
}

www.scentbook.online {
	redir https://scentbook.online{uri} permanent
}
CADDY

docker network create scentbook || true
docker volume create caddy-data
docker run -d --name caddy --restart unless-stopped --network scentbook \
  -p 80:80 -p 443:443 -p 443:443/udp \
  -v /opt/scentbook/Caddyfile:/etc/caddy/Caddyfile:ro -v caddy-data:/data \
  --log-opt max-size=10m --log-opt max-file=3 \
  caddy:2
