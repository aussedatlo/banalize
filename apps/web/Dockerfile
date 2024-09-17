FROM node:22

WORKDIR /usr/src/app

RUN npm install -g pnpm

COPY . .

RUN pnpm i && pnpm web build

CMD ["pnpm", "web", "start"]
