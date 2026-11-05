# Scentbook's production image: `next start` in a small Node container.
# Built and pushed by scripts/deploy.sh; see DEPLOY.md.

FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Amazon RDS's certificate authorities, so connections to the database are
# encrypted *and* verified (Node doesn't trust them by default).
ADD https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem /app/rds-ca.pem
ENV NODE_EXTRA_CA_CERTS=/app/rds-ca.pem NEXT_TELEMETRY_DISABLED=1
# The build prerenders fragrance pages, so it reads the database. Secrets are
# mounted for this step only and never stored in the image's layers.
RUN --mount=type=secret,id=database_url \
    --mount=type=secret,id=better_auth_secret \
    DATABASE_URL="$(cat /run/secrets/database_url)" \
    BETTER_AUTH_SECRET="$(cat /run/secrets/better_auth_secret)" \
    npm run build

FROM node:24-alpine AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 \
    NODE_EXTRA_CA_CERTS=/app/rds-ca.pem
# Readable by the unprivileged user the app runs as.
COPY --from=build --chmod=644 /app/rds-ca.pem ./rds-ca.pem
COPY --from=build /app/public ./public
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
CMD ["node", "server.js"]
