#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Gatón DO · Instalador inicial aislado en VPS Linux Docker (vmi3761714)
# Dominio: https://gaton.bsolutions.dev
# Motor:   bs-autodeploy (Perfil A)
# ==============================================================================

test "$(id -u)" -eq 0 || { echo "ERROR: Ejecuta este script como root (sudo -i o en Cockpit)."; exit 1; }
test "$(hostname)" = "vmi3761714" || { echo "ERROR: Servidor inesperado: $(hostname)"; exit 1; }

PROJECT_NAME="gaton"
REPO_URL="https://github.com/wailanbrea/Ecommersgaton.git"
BRANCH="main"
COMPOSE_PROJECT="gaton"
CONTAINER_NAME="gaton-app-1"
DB_CONTAINER_NAME="gaton-db-1"
IMAGE_REPO="gaton-app"
ENV_FILE="/root/gaton-produccion.env"
CODE_PREFIX="/root/gaton-codigo"
STACK_DIR="/root/gaton-stack"
BACKUP_DIR="/root/gaton-backups"
TLS_DIR="/root/gaton-tls"
HOST_PORT="18081"
DOMAIN="gaton.bsolutions.dev"

echo "=== [1/7] Obteniendo último commit de ${REPO_URL} (${BRANCH}) ==="
REMOTE_LINE=$(GIT_TERMINAL_PROMPT=0 git ls-remote --heads "$REPO_URL" "refs/heads/${BRANCH}" | head -n1 || true)
NEW_COMMIT=$(printf '%s' "$REMOTE_LINE" | awk '{print $1}')
if [ -z "$NEW_COMMIT" ] || [ "${#NEW_COMMIT}" -ne 40 ]; then
  echo "ERROR: No se pudo resolver el commit remoto de ${BRANCH} en ${REPO_URL}."
  exit 1
fi
NEW_SHA="${NEW_COMMIT:0:7}"
NEW_IMAGE="${IMAGE_REPO}:${NEW_SHA}"
DESTINO="${CODE_PREFIX}-${NEW_SHA}"
echo "Commit detectado: ${NEW_COMMIT} (SHA=${NEW_SHA})"

echo "=== [2/7] Preparando secretos aislados en ${ENV_FILE} ==="
if [ ! -f "$ENV_FILE" ]; then
  DB_ROOT_PW=$(openssl rand -hex 24)
  DB_APP_PW=$(openssl rand -hex 24)
  SESS_SECRET=$(openssl rand -hex 32)
  ADM_PASS=$(openssl rand -base64 18 | tr -dc 'A-Za-z0-9' | head -c 16)
  umask 077
  cat <<EOF > "$ENV_FILE"
NODE_ENV=production
HOST=0.0.0.0
PORT=80
TRUST_PROXY=1
GATON_HOST_PORT=${HOST_PORT}
MYSQL_ROOT_PASSWORD=${DB_ROOT_PW}
MYSQL_DATABASE=gatondo_prod
MYSQL_USER=gatondo_app
MYSQL_PASSWORD=${DB_APP_PW}
MYSQL_POOL_SIZE=10
SESSION_SECRET=${SESS_SECRET}
SITE_BRAND_NAME="GATON DO"
SITE_SLOGAN="Joyas que cuentan tu historia"
ADMIN_NAME="Administrador Gatón DO"
ADMIN_EMAIL="admin@gatondo.com"
ADMIN_PASSWORD="${ADM_PASS}"
EOF
  chmod 600 "$ENV_FILE"
  echo "Archivo ${ENV_FILE} creado con permisos 600."
else
  echo "Archivo ${ENV_FILE} ya existe; se conserva intacto."
fi

echo "=== [3/7] Clonando código en ${DESTINO} y construyendo imagen ${NEW_IMAGE} ==="
if [ ! -d "$DESTINO" ]; then
  GIT_TERMINAL_PROMPT=0 git clone --no-checkout --single-branch --branch "$BRANCH" "$REPO_URL" "$DESTINO"
  git -C "$DESTINO" checkout --detach "$NEW_COMMIT"
fi

nice -n 15 ionice -c 3 docker build --pull=false -f "${DESTINO}/deploy/linux/Dockerfile" -t "$NEW_IMAGE" "$DESTINO"
docker tag "$NEW_IMAGE" "${IMAGE_REPO}:latest"

echo "=== [4/7] Levantando stack Docker aislado (${COMPOSE_PROJECT}) en ${STACK_DIR} ==="
install -d -m 755 "$STACK_DIR" "$BACKUP_DIR"
install -m 644 "${DESTINO}/deploy/linux/docker-compose.yml" "${STACK_DIR}/docker-compose.yml"

cat <<EOF > "${STACK_DIR}/compose.imagen-${NEW_SHA}.yaml"
services:
  app:
    image: ${NEW_IMAGE}
  worker:
    image: ${NEW_IMAGE}
  scheduler:
    image: ${NEW_IMAGE}
  media:
    image: ${NEW_IMAGE}
EOF

docker compose --project-name "$COMPOSE_PROJECT" --project-directory "$STACK_DIR" --env-file "$ENV_FILE" \
  -f "${STACK_DIR}/docker-compose.yml" \
  -f "${STACK_DIR}/compose.imagen-${NEW_SHA}.yaml" \
  up -d db app

echo "Esperando a que MariaDB (${DB_CONTAINER_NAME}) esté saludable..."
for _ in $(seq 1 30); do
  if docker inspect --format '{{.State.Health.Status}}' "$DB_CONTAINER_NAME" 2>/dev/null | grep -q "healthy"; then
    break
  fi
  sleep 2
done

echo "=== [5/7] Ejecutando migración de esquema y carga inicial idempotente ==="
# shellcheck disable=SC1090
source "$ENV_FILE"
for _ in $(seq 1 15); do
  if [ "$(docker inspect --format '{{.State.Running}}' "$CONTAINER_NAME" 2>/dev/null || echo false)" = "true" ] && \
     [ "$(docker inspect --format '{{.State.Restarting}}' "$CONTAINER_NAME" 2>/dev/null || echo false)" = "false" ]; then
    break
  fi
  sleep 2
done
docker exec -e DB_USERNAME=root -e DB_PASSWORD="$MYSQL_ROOT_PASSWORD" "$CONTAINER_NAME" php artisan migrate --force
docker exec -e ENV_FILE=/dev/null -e ADMIN_NAME="$ADMIN_NAME" -e ADMIN_EMAIL="$ADMIN_EMAIL" -e ADMIN_PASSWORD="$ADMIN_PASSWORD" "$CONTAINER_NAME" node scripts/bootstrap-catalog.js --import

echo "Verificando salud interna del contenedor (${CONTAINER_NAME})..."
for _ in 1 2 3 4 5; do
  CODE=$(docker exec "$CONTAINER_NAME" curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1/health/ready" || echo "000")
  [ "$CODE" = "200" ] && break
  sleep 2
done
echo "Health /health/ready: HTTP ${CODE}"
test "$CODE" = "200" || { echo "ERROR: El contenedor no respondió 200 en /health/ready"; exit 1; }

echo "=== [6/7] Configurando Reverse Proxy Nginx para ${DOMAIN} ==="
PROXY_CONTAINER=$(docker ps --format '{{.Names}}' | grep -iE 'nginx|proxy' | head -n1 || true)

install -d -m 755 "$TLS_DIR"
if [ ! -f "${TLS_DIR}/gaton.crt" ] || [ ! -f "${TLS_DIR}/gaton.key" ]; then
  openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
    -keyout "${TLS_DIR}/gaton.key" \
    -out "${TLS_DIR}/gaton.crt" \
    -subj "/CN=${DOMAIN}" >/dev/null 2>&1
  chmod 600 "${TLS_DIR}/gaton.key"
fi

if [ -n "$PROXY_CONTAINER" ]; then
  echo "Reverse proxy en contenedor detectado: ${PROXY_CONTAINER}"
  # Conectar el proxy a la red de gaton para resolver gaton-app-1:80 directamente
  docker network connect "${COMPOSE_PROJECT}_default" "$PROXY_CONTAINER" 2>/dev/null || true
  docker exec "$PROXY_CONTAINER" mkdir -p /etc/nginx/ssl
  docker cp "${TLS_DIR}/gaton.crt" "${PROXY_CONTAINER}:/etc/nginx/ssl/gaton.crt"
  docker cp "${TLS_DIR}/gaton.key" "${PROXY_CONTAINER}:/etc/nginx/ssl/gaton.key"

  cat <<'EOF_NGINX' > /tmp/gaton.bsolutions.dev.conf
server {
    listen 80;
    server_name gaton.bsolutions.dev;
    client_max_body_size 30M;

    location / {
        proxy_pass http://gaton-app-1:80;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 443 ssl;
    server_name gaton.bsolutions.dev;
    client_max_body_size 30M;

    ssl_certificate /etc/nginx/ssl/gaton.crt;
    ssl_certificate_key /etc/nginx/ssl/gaton.key;

    location / {
        proxy_pass http://gaton-app-1:80;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
EOF_NGINX

  docker cp /tmp/gaton.bsolutions.dev.conf "${PROXY_CONTAINER}:/etc/nginx/conf.d/gaton.bsolutions.dev.conf"
  rm -f /tmp/gaton.bsolutions.dev.conf
  docker exec "$PROXY_CONTAINER" nginx -t
  docker exec "$PROXY_CONTAINER" nginx -s reload
  echo "Nginx recargado con éxito para ${DOMAIN}."
fi

echo "=== [7/7] Registrando /etc/bs-autodeploy/gaton.conf ==="
cat <<EOF > /etc/bs-autodeploy/gaton.conf
PROJECT_NAME="${PROJECT_NAME}"
ENABLED="true"
REPO_URL="${REPO_URL}"
BRANCH="${BRANCH}"
CONTAINER_NAME="${CONTAINER_NAME}"
COMPOSE_PROJECT="${COMPOSE_PROJECT}"
IMAGE_REPO="${IMAGE_REPO}"
ENV_FILE="${ENV_FILE}"
CODE_PREFIX="${CODE_PREFIX}"
DOCKERFILE_TEMPLATE_SUBDIR="deploy/linux"
DB_CONTAINER_REGEX="gaton.*db"
DB_NAME="gatondo_prod"
BACKUP_DIR="${BACKUP_DIR}"
HEALTH_PATHS="/health/ready /"
KEEP_RELEASES="3"
POST_DEPLOY_HOOK=""
EOF
chmod 644 /etc/bs-autodeploy/gaton.conf

/usr/local/sbin/bs-git-autodeploy.sh || true
cat /var/log/bs-autodeploy/gaton.status.json || true

echo ""
echo "=================================================================="
echo " GATÓN DO DESPLEGADO Y AISLADO CON ÉXITO"
echo " URL pública:  https://${DOMAIN}"
echo " Healthcheck:  https://${DOMAIN}/health/ready"
echo " Panel Admin:  https://${DOMAIN}/admin/login"
echo " Credenciales: Guardadas en ${ENV_FILE} (ADMIN_EMAIL / ADMIN_PASSWORD)"
echo "=================================================================="
