# syntax=docker/dockerfile:1

ARG PNPM_BOOTSTRAP_VERSION=12

FROM ghcr.io/pnpm/pnpm:${PNPM_BOOTSTRAP_VERSION} AS base

ENV NEXT_TELEMETRY_DISABLED=1
ENV TURBO_TELEMETRY_DISABLED=1

WORKDIR /workspace

COPY package.json ./

# `/pnpm/bin/node` is a pnpm shim that resolves the pinned runtime per project, so keep a copy of
# the real binary for the dependency-free runner stage.
RUN pnpm runtime set node "$(pnpm --silent pkg get devEngines.runtime.version)" -g \
    && cp "$(node --print process.execPath)" /usr/local/bin/node-runtime

FROM base AS pruner

RUN pnpm add --global turbo@"$(pnpm --silent pkg get devDependencies.turbo)"

COPY . .

RUN turbo prune @disco/web --docker

FROM base AS dependencies

COPY --from=pruner /workspace/out/pnpm-lock.yaml /workspace/out/pnpm-workspace.yaml ./

RUN pnpm fetch

COPY --from=pruner /workspace/out/json/ ./
COPY --from=pruner /workspace/scripts/installHooks.mjs scripts/installHooks.mjs

RUN pnpm install --offline --frozen-lockfile --loglevel=warn

FROM dependencies AS builder

ENV CI=true

COPY --from=pruner /workspace/out/full/ ./
# The Vitest config is part of the type-checked project, so its shared reporter module must exist.
COPY --from=pruner /workspace/tools/vitest tools/vitest
COPY --from=pruner /workspace/tsconfig.base.json tsconfig.base.json

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
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --uid 1000 --create-home --user-group node \
    && mkdir /data \
    && chown node:node /data

COPY --from=base /usr/local/bin/node-runtime /usr/local/bin/node
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
