FROM oven/bun:1.1-alpine AS builder

WORKDIR /app

COPY package.json bun.lockb* ./

RUN bun install --frozen-lockfile

COPY . .

RUN bun run build


FROM oven/bun:1.1-alpine AS production

WORKDIR /app

COPY package.json bun.lockb* ./

RUN bun install --frozen-lockfile --production

COPY --from=builder /app/dist ./dist

RUN mkdir -p /app/logs

RUN chown -R bun:bun /app

USER bun

CMD ["bun", "run", "dist/main.js"]
