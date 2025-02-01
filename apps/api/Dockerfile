FROM node:22

WORKDIR /usr/src/app

RUN npm install -g pnpm

RUN apt update && apt install -y iptables

COPY . .

RUN pnpm i && pnpm build:api

CMD ["./apps/api/bin/entrypoint.sh"]

