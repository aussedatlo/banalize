FROM node:22

WORKDIR /usr/src/app

COPY . .

RUN npm install -g pnpm

RUN cp .env.docker apps/web/.env && pnpm i && pnpm build:web

CMD ["/bin/sh", "-c", "./apps/web/bin/entrypoint.sh"]
