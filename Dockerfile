FROM node:22

WORKDIR /usr/src/app

RUN npm install -g pnpm

COPY . .

RUN pnpm install && pnpm build

CMD ["pnpm", "start:prod"]
