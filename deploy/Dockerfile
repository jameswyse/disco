# syntax=docker/dockerfile:1

FROM ghcr.io/pnpm/pnpm:12 AS base

ENV NEXT_TELEMETRY_DISABLED=1
ENV TURBO_TELEMETRY_DISABLED=1

WORKDIR /workspace

FROM base AS dependencies

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm fetch

COPY apps/web/package.json apps/web/package.json
COPY scripts/installHooks.mjs scripts/installHooks.mjs

RUN pnpm install --offline --frozen-lockfile --loglevel=warn \
    && cp "$(readlink -f node_modules/.bin/node)" /usr/local/bin/node-runtime

FROM dependencies AS builder

ENV CI=true

COPY . .

RUN --mount=type=cache,id=disco-next-cache,target=/workspace/apps/web/.next/cache,sharing=locked \
    pnpm exec turbo run build --filter=@disco/web --output-logs=full --log-order=grouped

FROM debian:stable-slim AS runner

ARG APPLICATION_VERSION=development
ARG APPLICATION_REVISION=unknown

ENV DISCO_DATA_DIR=/data
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV PORT=3000

LABEL org.opencontainers.image.title=disco
LABEL org.opencontainers.image.version=${APPLICATION_VERSION}
LABEL org.opencontainers.image.revision=${APPLICATION_REVISION}
LABEL org.opencontainers.image.source=https://github.com/jameswyse/disco
LABEL org.opencontainers.image.licenses=MIT

WORKDIR /app/apps/web

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates libatomic1 \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --uid 1000 --create-home --user-group node \
    && mkdir /data \
    && chown node:node /data

COPY --from=dependencies /usr/local/bin/node-runtime /usr/local/bin/node
COPY --from=builder --chown=node:node /workspace/apps/web/.next/standalone /app
COPY --from=builder --chown=node:node /workspace/apps/web/.next/static /app/apps/web/.next/static
COPY --from=builder --chown=node:node /workspace/apps/web/public /app/apps/web/public
COPY --chown=node:node deploy/healthcheck.mjs /app/healthcheck.mjs

USER node

VOLUME ["/data"]

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD ["node", "/app/healthcheck.mjs"]

CMD ["node", "server.js"]
