FROM node:22-slim

WORKDIR /usr/src/app

# pnpm via corepack, pinned by the packageManager field in package.json
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

# Workspace manifests first so dependency layers cache across source changes
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages ./packages
COPY apps/ui/package.json ./apps/ui/package.json
RUN pnpm install --frozen-lockfile --filter "@banalize/ui..."

# Build the SPA
COPY apps/ui ./apps/ui
RUN pnpm --filter @banalize/ui build

# Serve the built app with vite preview; it proxies /api to the core
# (see preview config in vite.config.ts, BANALIZE_UI_API_URL to override)
WORKDIR /usr/src/app/apps/ui
EXPOSE 5050

CMD ["pnpm", "preview"]
