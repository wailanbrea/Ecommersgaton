#!/bin/sh
set -eu

mkdir -p \
  /app/public/uploads/images \
  /app/public/uploads/videos \
  /app/public/uploads/reviews \
  /app/public/uploads/customizations \
  /app/storage

if [ -d /app/public/uploads-seed ]; then
  cp -rn /app/public/uploads-seed/. /app/public/uploads/ 2>/dev/null || true
fi

if [ "$(id -u)" = "0" ]; then
  chown -R node:node /app/public/uploads /app/storage
fi

if [ -n "${MYSQL_USER:-}" ] && [ -n "${MYSQL_DATABASE:-}" ]; then
  node /app/scripts/migrate-schema.js
fi

exec "$@"
