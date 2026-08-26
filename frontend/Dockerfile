FROM node:18-slim AS builder
WORKDIR /app

# Install pnpm globally (avoid corepack issues inside container)
RUN npm install -g pnpm@7

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile || pnpm install

COPY . .
RUN pnpm build

FROM node:18-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/.next .next
COPY --from=builder /app/public public
COPY --from=builder /app/node_modules node_modules
COPY --from=builder /app/package.json package.json

EXPOSE 3000
CMD ["pnpm", "start"]
