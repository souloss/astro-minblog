# Build stage
FROM node:lts AS base
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ packages/
COPY apps/blog/package.json apps/blog/
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

# Runtime stage
FROM nginx:mainline-alpine-slim AS runtime
COPY --from=base /app/apps/blog/dist /usr/share/nginx/html
EXPOSE 80
