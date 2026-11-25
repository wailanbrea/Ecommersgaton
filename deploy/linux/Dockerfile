FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY . .

# Wrapper de compatibilidad para bs-git-autodeploy.sh:
# El motor ejecuta:
# 1) docker exec -e DB_USERNAME=root -e DB_PASSWORD=... <container> php artisan migrate --force
# 2) docker exec <container> php artisan optimize:clear
RUN printf '#!/bin/sh\nset -eu\nif [ "${1:-}" = "artisan" ] && [ "${2:-}" = "migrate" ]; then\n  export MYSQL_USER="${DB_USERNAME:-${MYSQL_USER:-}}"\n  export MYSQL_PASSWORD="${DB_PASSWORD:-${MYSQL_PASSWORD:-}}"\n  cd /app\n  exec node scripts/migrate-schema.js\nelif [ "${1:-}" = "artisan" ] && [ "${2:-}" = "optimize:clear" ]; then\n  echo "Node.js cache clear OK"\n  exit 0\nfi\nexit 0\n' > /usr/local/bin/php \
    && chmod 755 /usr/local/bin/php

COPY deploy/linux/entrypoint.sh /usr/local/bin/gaton-entrypoint
RUN sed -i 's/\r$//' /usr/local/bin/gaton-entrypoint /usr/local/bin/php \
    && chmod 755 /usr/local/bin/gaton-entrypoint \
    && mkdir -p /app/public/uploads-seed /app/public/uploads/images /app/public/uploads/videos /app/public/uploads/reviews /app/public/uploads/customizations /app/storage \
    && cp -a /app/public/uploads/. /app/public/uploads-seed/ \
    && chown -R node:node /app/public/uploads /app/public/uploads-seed /app/storage

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=80
ENV TRUST_PROXY=1

EXPOSE 80

ENTRYPOINT ["gaton-entrypoint"]
CMD ["node", "server.js"]
