# Entorno aislado y reproducción de F0

Fecha de evidencia: 2026-11-24. Windows, Node v24.4.0, npm 11.4.2. Origen de solo lectura en E:/Gaton Ecommer/gatondo-entrega-cliente-2026-09-15-163941. Laboratorio inicial en %LOCALAPPDATA%/GatonDO-F0-20261124. Docker Desktop tenía el motor local detenido. Se utilizó MongoDB Community 7.0.24 real mediante mongodb-memory-server-core 10.4.3 con WiredTiger y replica set primario de un miembro. Playwright Core 1.55.0 utiliza Chromium headless local para el estudio de anchos.

## Repetir desde la raíz del repositorio en PowerShell

```powershell
.\docs\fase0\reproducir.ps1 -Entrega 'E:\Gaton Ecommer\gatondo-entrega-cliente-2026-09-15-163941' -Chromium 'C:\Users\waila\AppData\Local\ms-playwright\chromium_headless_shell-1234\chrome-headless-shell-win64\chrome-headless-shell.exe'
```

El script crea un directorio de ensayo nuevo, comprueba el manifiesto, copia código y recursos de marca, normaliza únicamente 19 URLs de descarga del lock **en la copia** y ejecuta npm ci con integridad del lock y scripts de paquetes desactivados. Instala herramientas en el directorio padre con su propio lock. La primera ejecución requiere red para npm y el binario MongoDB (descarga de aproximadamente 600 MB). Se puede apuntar MONGOMS_SYSTEM_BINARY al binario local ya descargado de la misma versión. Omitir -Chromium ejecuta solo el smoke de servidor. El runner liga HTTP y DB a loopback, asigna un puerto efímero, genera credenciales sintéticas en memoria y usa un directorio DB nuevo. El mensaje de la aplicación menciona 8080 por el valor por defecto, pero el harness fuerza loopback y puerto efímero. No importa el export, fotos, pedidos ni sesiones del cliente. Conserva el directorio de datos tras cerrar el proceso. Repetir con un laboratorio nuevo.

## Dependencias directas del lock original

Express 4.22.1, Mongoose 8.23.0, EJS 3.1.10, bcryptjs 2.4.3, express-session 1.19.0, connect-mongo 5.1.0, dotenv 16.6.1 y multer 1.4.5-lts.2. Nodemon se usa en desarrollo. Solo se declaran dev y start. El README omite ADMIN_EMAIL, ADMIN_PASSWORD y ADMIN_NAME que necesita la creación inicial del admin. No usar el instalador histórico ni server.js con un URI real para reproducir F0.

## Operación posterior propuesta

F1 debe separar arranque, readiness, seed y migraciones y fijar un lock portable aprobado. Staging necesitará red, DB, volúmenes, bucket privado y credenciales independientes, noindex y acceso restringido. Para F7 ensayar backup/restauración, verificar conteos, IDs y medios, registrar checksums, reconciliar cobros/stock y acordar ventana y responsable de reversión. En caso de divergencia detener el corte, preservar evidencia y conciliar operaciones nuevas antes de restaurar. En F0 el rollback operativo consiste en detener los procesos del laboratorio; no hay despliegue que revertir.

## Laboratorio local tras migración MySQL (24 nov 2026)

La copia de prueba usa XAMPP MariaDB local `127.0.0.1:3306`, base `gatondo_local_mysql` y cuenta local limitada. Su configuración privada está en `.env.local`, ignorada por Git. La web escucha en `http://127.0.0.1:8081` con `npm run start:local`.

Instalación reproducible: `npm ci` → `npm run db:migrate` → `npm run start:local`. Seed mínimo local opcional: `npm run seed:local` (protegido por `NODE_ENV=production`, idempotente y no elimina pedidos/productos). La importación inicial se hizo una sola vez en tablas vacías. Para simular sin escribir: `npm run db:import-mongo`; para importar solo en una base vacía de laboratorio: `npm run db:import-mongo -- --apply`. Para cotejar después: `npm run db:verify-import`. El importador valida que la fuente sea loopback `gatondo_local`; omite sesiones.

MongoDB 7 local queda fuera del proceso web. El URI está en `MONGO_SOURCE_URI` solo para consultar/importar; las solicitudes del e-commerce no lo usan. No desinstalar ni borrar `data/mongo` o `data/mongo-bin` como parte del despliegue.

**No preparado aún:** Dockerfile, compose para MySQL, secrets de servidor, backup de producción, migración del VPS y registro en `/etc/bs-autodeploy`. Prepararlos en una tarea separada con la skill `git-auto-deploy` y las reglas de `bsolutions-infra`; antes de intervenir el VPS verificar backup y conteos. No ejecutar seed en producción ni publicar esta rama durante las pruebas.

## Despliegue aislado en VPS Linux Docker (`vmi3761714` · `gaton.bsolutions.dev`)

Archivos de despliegue en `deploy/linux/`:
- `Dockerfile`: Node 22 Bookworm Slim, `npm ci --omit=dev`, wrapper `/usr/local/bin/php` compatible con `bs-git-autodeploy.sh` (`php artisan migrate --force` → `node scripts/migrate-schema.js`) y semilla de medios públicos en `/app/public/uploads-seed`.
- `docker-compose.yml`: Stack aislado (`COMPOSE_PROJECT=gaton`) con `gaton-db-1` (MariaDB 11.4, healthcheck nativo, volumen `gaton_db_data`) y `gaton-app-1` (`127.0.0.1:18081:80`, volúmenes `gaton_uploads` y `gaton_storage`).
- `install-gaton-vps.sh`: Script de alta única para ejecutar como `root` en `vmi3761714` (`/home/bsdeploy/install-gaton-vps.sh`). Genera `/root/gaton-produccion.env` con secretos aleatorios, construye la imagen con el SHA activo, levanta el stack, migra e importa el catálogo base idempotente (`scripts/bootstrap-catalog.js`), conecta el contenedor de Nginx reverse proxy a `gaton_default` para `gaton.bsolutions.dev` y registra `/etc/bs-autodeploy/gaton.conf`.