FROM node:18-alpine AS builder
RUN npm install -g pnpm
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/ ./apps/
COPY packages/ ./packages/

RUN pnpm install --frozen-lockfile
RUN pnpm --filter api prisma generate

RUN pnpm --filter api build

FROM node:18-alpine
RUN npm install -g pnpm
WORKDIR /app

COPY --from=builder /app ./

EXPOSE 3000

CMD ["pnpm", "--filter", "api", "start"]