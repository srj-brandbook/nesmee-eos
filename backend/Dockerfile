FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    chromium \
    fonts-liberation \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend

COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

COPY backend/src ./src
COPY shared /app/shared

ENV NODE_ENV=production
ENV CHROME_PATH=/usr/bin/chromium
ENV PORT=5000

EXPOSE 5000
CMD ["node", "src/server.js"]
