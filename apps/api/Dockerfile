FROM node:22

WORKDIR /usr/src/app

RUN npm install -g pnpm

RUN apt update && apt install -y iptables ufw

COPY . .

RUN pnpm i && pnpm api build

CMD ["pnpm", "api", "start"]
