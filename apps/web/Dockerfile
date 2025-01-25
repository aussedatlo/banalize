FROM node:22 AS build

WORKDIR /usr/src/app

COPY . .

RUN npm install -g pnpm

RUN cp .env.docker apps/web/.env && pnpm i && pnpm build:web

FROM node:22 AS production

WORKDIR /usr/src/app

COPY --from=build /usr/src/app/apps/web/.next/standalone ./
COPY --from=build /usr/src/app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /usr/src/app/apps/web/public ./apps/web/public
COPY --from=build /usr/src/app/.env.docker ./.env
COPY --from=build /usr/src/app/apps/web/bin/entrypoint.sh ./apps/web/bin/entrypoint.sh

CMD ["/bin/sh", "-c", "./apps/web/bin/entrypoint.sh"]
