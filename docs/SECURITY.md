# Seguridad · Registro F0

| Prioridad | Evidencia estática | Control y prueba de salida |
|---|---|---|
| Alta | store.js, consulta de pedido por ID sin comprobar dueño; fotos de grabado bajo public/uploads/customizations | Aislar storage, validar actor/propósito, revocar enlaces y ejecutar T07/T22. |
| Alta | Sesión de 24 h httpOnly sin SameSite/Secure explícitos; admin se controla por adminId. Rutas mutables sin control CSRF identificado | Endurecer sesión y proxy, regenerar ID, RBAC/MFA, CSRF y auditoría. |
| Alta | Orden y descuento en operaciones separadas, estados administrativos globales | Reserva y transiciones con guardas, T06/T09/T10/T12. |
| Alta | Seed dentro de listen, consulta de arranque sin await; README omite variables de admin. | Readiness comprobable y seed explícito en entorno controlado. |
| Alta | npm audit --omit=dev el 2026-11-24 reportó 2 críticos (mongoose, proxy-addr), 2 altos (body-parser, brace-expansion) y 1 moderado (qs). Multer 1.x emitió aviso de deprecación al instalar. | Revisar reporte y transitivas, actualizar en rama separada y repetir pruebas. Las severidades son las reportadas por npm; no se ensayó explotación. |
| Media | Regex construida desde búsqueda; formularios de upload dependen de metadatos; CDN externo y links CMS | Limitar/buscar con índices, decodificar medios, auditar destinos, compilar CSS, definir CSP. |

El laboratorio usa DB de un solo nodo en loopback, credenciales efímeras, datos sintéticos y navegador sin acceso a terceros. Se requiere auditoría sobre la versión real y restauración verificada antes del lanzamiento. Responsables pendientes de designación para seguridad y tratamiento de fotos.

## Migración SQL local · seguridad y dependencias

El usuario SQL de laboratorio tiene privilegios solo sobre `gatondo_local_mysql`; su contraseña está en `.env.local` excluida de Git. No hay secretos ni URI fuente en `.env.example` más allá del host local de consulta. El runtime instala `mysql2` y no instala `mongoose` ni `connect-mongo`; Mongoose y mongodb-memory-server son herramientas de desarrollo para migración/consulta local. Sesiones web usan `httpOnly`, `sameSite=lax`, `secure` cuando NODE_ENV=production, y la app confía un proxy cuando está en producción.

Tras `npm audit fix` sin `--force`, `npm audit --omit=dev` dio 0 vulnerabilidades. La auditoría completa reportó 2 moderadas en dependencias de desarrollo (minimatch); no se fuerza una actualización mayor. `multer@1.4.5-lts.2` emite aviso de deprecación en `npm ci`; revisar la actualización separada a Multer 2 con pruebas de uploads.

Este resultado cubre el entorno local, no es una revisión de seguridad completa. Faltan permisos de cada operación CRUD, CSRF/XSS, uploads, restauración, Docker, proxy/Nginx y validación de producción.