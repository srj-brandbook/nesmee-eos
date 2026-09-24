FROM node:22-bookworm-slim AS builder

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./frontend/
COPY shared ./shared

WORKDIR /app/frontend
RUN npm ci

COPY frontend/ ./

ARG API_INTERNAL_URL=http://backend:5000
ARG NEXT_PUBLIC_APP_NAME=Nesmee EOS
ARG NEXT_PUBLIC_APP_TAGLINE=Export operating system
ARG NEXT_PUBLIC_APP_SHORT_TAGLINE=Export OS
ARG NEXT_PUBLIC_API_URL=

ENV API_INTERNAL_URL=$API_INTERNAL_URL
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME
ENV NEXT_PUBLIC_APP_TAGLINE=$NEXT_PUBLIC_APP_TAGLINE
ENV NEXT_PUBLIC_APP_SHORT_TAGLINE=$NEXT_PUBLIC_APP_SHORT_TAGLINE
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/frontend/package.json ./
COPY --from=builder /app/frontend/node_modules ./node_modules
COPY --from=builder /app/frontend/.next ./.next
COPY --from=builder /app/frontend/next.config.js ./
COPY --from=builder /app/frontend/public ./public

EXPOSE 3000
CMD ["node", "node_modules/next/dist/bin/next", "start", "-H", "0.0.0.0", "-p", "3000"]
