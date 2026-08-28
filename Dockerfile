FROM node:22-alpine AS base

RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

RUN npm run build:server
RUN npm run build:client

FROM node:22-alpine AS runner

RUN apk add --no-cache libc6-compat curl

WORKDIR /app

ENV NODE_ENV=production
ENV SERVER_HOST=0.0.0.0

COPY --from=base /app/dist ./dist
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./package.json

RUN mkdir -p logs

EXPOSE 3000

CMD sh -c "SERVER_PORT=${PORT:-3000} node dist/server/main.js"
