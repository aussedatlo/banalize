FROM node:22-slim AS build

WORKDIR /usr/src/app

# pnpm via corepack, pinned by the packageManager field in package.json
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

# Workspace manifests first so dependency layers cache across source changes
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages ./packages
COPY apps/ui/package.json ./apps/ui/package.json
RUN pnpm install --frozen-lockfile --filter "@banalize/ui..."

# Build the SPA to apps/ui/dist
COPY apps/ui ./apps/ui
RUN pnpm --filter @banalize/ui build

# Serve the static build with Caddy; no Node in the runtime image.
# Caddy serves /srv with a SPA fallback and proxies /api to the core
# (see Caddyfile; BANALIZE_UI_PORT sets the listen port,
# BANALIZE_UI_API_URL the core target).
FROM caddy:2-alpine

COPY apps/ui/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /usr/src/app/apps/ui/dist /srv

EXPOSE 6041
