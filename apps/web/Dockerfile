FROM node:22

WORKDIR /usr/src/app

COPY . .

RUN npm install -g pnpm

RUN pnpm i && pnpm build:web

CMD ["/bin/sh", "-c", "./apps/web/bin/entrypoint.sh"]
