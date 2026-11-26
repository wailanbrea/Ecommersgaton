# Seguridad · Registro F0

| Prioridad | Evidencia estática | Control y prueba de salida |
|---|---|---|
| Alta | Hallazgo original: consulta de pedido por ID y foto de grabado pública. Avance local: pedido ligado a sesión; fotos privadas/legacy autorizadas por sesión o permiso `orders.view`. | T07/T22 completo aún pendiente: probar sesiones cruzadas, expiración/revocación de enlaces y ciclo de retención. |
| Alta | Sesión 24 h; admin autenticado y RBAC por ruta; formularios admin llevan CSRF, checkout lleva token ligado a sesión; sameSite=lax y Secure en producción. | Falta MFA, rate limit, pruebas de fixation/logout por HTTP, Helmet/CSP y CSRF para mutaciones públicas restantes. |
| Alta | Hallazgo original: pedido y descuento separados; ahora ambos y `inventory_movements` usan transacción InnoDB y `checkout_key` única. | Pruebas de 2 solicitudes pasaron; falta carga T09 de 20, reservas/expiración, transición con guards y T10/T12. |
| Alta | Seed dentro de listen, consulta de arranque sin await; README omite variables de admin. | Readiness comprobable y seed explícito en entorno controlado. |
| Alta | El registro del 2026-11-24 refleja el estado anterior de dependencias. El 2026-11-26 `npm audit --omit=dev` reportó cero vulnerabilidades; Multer declarado es 2.x. | Repetir auditoría en CI y escanear imagen Docker; el resultado npm no equivale a una auditoría de seguridad completa. |
| Media | Regex construida desde búsqueda; formularios de upload dependen de metadatos; CDN externo y links CMS | Limitar/buscar con índices, decodificar medios, auditar destinos, compilar CSS, definir CSP. |

El laboratorio usa DB de un solo nodo en loopback, credenciales efímeras, datos sintéticos y navegador sin acceso a terceros. Se requiere auditoría sobre la versión real y restauración verificada antes del lanzamiento. Responsables pendientes de designación para seguridad y tratamiento de fotos.

## Migración SQL local · seguridad y dependencias

El usuario SQL de laboratorio tiene privilegios solo sobre `gatondo_local_mysql`; su contraseña está en `.env.local` excluida de Git. No hay secretos ni URI fuente en `.env.example` más allá del host local de consulta. El runtime instala `mysql2` y no instala `mongoose` ni `connect-mongo`; Mongoose y mongodb-memory-server son herramientas de desarrollo para migración/consulta local. Sesiones web usan `httpOnly`, `sameSite=lax`, `secure` cuando NODE_ENV=production, y la app confía un proxy cuando está en producción.

Tras `npm audit fix` sin `--force`, `npm audit --omit=dev` dio 0 vulnerabilidades. La auditoría completa reportó 2 moderadas en dependencias de desarrollo (minimatch); no se fuerza una actualización mayor. `multer@1.4.5-lts.2` emite aviso de deprecación en `npm ci`; revisar la actualización separada a Multer 2 con pruebas de uploads.

Este resultado cubre el entorno local, no es una revisión de seguridad completa. El checkout/concurrencia y acceso anónimo a pedido/foto se ejercitaron en laboratorio; todavía faltan matriz completa de roles por CRUD, CSRF/XSS, análisis de uploads, restauración real, Docker/proxy y validación post-despliegue.
