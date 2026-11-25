# Matriz de pruebas · F0

## Verificación acotada · Menú móvil · 25 de noviembre de 2026

`WEB-07` / escenario `T04` — Chromium local en viewport 390 × 844. Se abrió el menú y se comprobó que el panel quedara visible con `aria-expanded=true` y exactamente estos siete enlaces, en este orden: Inicio, Fragancias, Colección, Personalizados, Historia, Clientes y Contacto. No aparecen Catálogo completo, categorías adicionales ni Carrito dentro del panel; los iconos de búsqueda y carrito de la barra permanecen separados. Destinos observados: `/`, `/#fragancias`, `/#coleccion`, `/shop?category=personalizados`, `/#historia`, `/#clientes`, `/#contacto`.

`npm test`: 4 pasaron, 0 fallaron. Compilación EJS de `views/partials/header.ejs`: correcta. Esta verificación cubre solo el menú en 390 × 844; `T04` permanece `PENDING` para el resto de anchos, zoom, accesibilidad y flujo de compra móvil.

## Ejecutado el 24 de noviembre de 2026

Windows, Node 24.4.0, npm 11.4.2, MongoDB 7.0.24/WiredTiger real en replica set de un miembro, loopback y datos sintéticos. Comandos en [DEPLOYMENT](DEPLOYMENT.md), registro de salida en [baseline.txt](fase0/baseline.txt). Cada aserción detiene la prueba ante fallo.

| Prueba de caracterización | Resultado |
|---|---|
| B01 · Identidad del paquete | SHA y tamaño del ZIP coincidentes; 80/80 archivos idénticos a E:. |
| B02 · Instalación | Lock original falló con ENOTFOUND; sustituir solo el host devolvió 404 por la ruta interna. Normalizar el prefijo completo en el laboratorio permitió npm ci con 160 paquetes. |
| B03 · Análisis | node --check sobre 19 JS y compilación EJS de 22 plantillas correctos. npm audit --omit=dev devolvió hallazgos, ver SECURITY. |
| B04 · Smoke tienda | Inicio, catálogo, ficha y carrito 200; checkout vacío redirige a carrito. |
| B05 · Pedido simple | Dos unidades a 150 + envío 30; total 330, una orden pending/COD; stock pasó de 4 a 2. |
| B06 · Panel | Acceso anónimo redirigido; login sintético y seis pantallas de lectura 200. |
| B08 · Operaciones | Alta de categoría y producto sintéticos, consulta filtrada, reseña de una estrella pendiente y publicación tras aprobación. |
| B09 · Reglas de envío | Sin opciones configuradas reaparece Delivery Santo Domingo en checkout. Incumple el bloqueo de modalidad requerido; el precio cero figura en el fallback de store.js. |
| B07 · Visual | 360/390/768/1024/1440 px sin desbordamiento de página en cuatro vistas sin CDN. Estudio de dos caras preserva María e Íñigo independientemente en cada ancho. |

## Aceptación transversal

Todos los escenarios completos quedan pendientes. Las observaciones parciales orientan las próximas pruebas.

| ID | Escenario | Resultado exigido | Evidencia parcial / estado |
|---|---|---|---|
| T01 | Inicio y copy CMS, links y anclas, logo aprobado | coincide PDF/decisiones aprobadas, sin sobrescribir settings posteriores | PENDING · B04 solo render |
| T02 | Categorías creadas admin, géneros separados, oferta tarjeta | navegación dinámica, filtros combinados correctos y precio original/actual | PENDING · B08 alta y filtro; oferta y géneros pendientes |
| T03 | Variantes color/talla y SKU archivado | combinación exacta, stock correcto, sin sustitución automática | PENDING · Sin ejecución del escenario |
| T04 | 360/390/768/1024/1440 px y zoom 200% | sin overflow, drawer accesible, compra completa móvil | PENDING · B07 solo ancho |
| T05 | Configurador múltiples tipos, fuentes, caras, imágenes | preview válida y snapshot reproducible; error explícito ante opción inválida | PENDING · B07 prototipo aislado |
| T06 | Dos diseños de un SKU, cantidad agregada > stock | no se vende por encima de total disponible; líneas independientes | PENDING · Sin ejecución del escenario |
| T07 | Upload inválido, asset de otro cliente, acceso a foto directa | rechazo, autorización y almacenamiento privado | PENDING · Sin ejecución del escenario |
| T08 | Cambio de precio/plantilla/cupón/envío entre carrito y pago | diff y reconfirmación; total autorizado idéntico al cobrado | PENDING · Sin ejecución del escenario |
| T09 | 20 checkouts simultáneos, una unidad; doble submit | una reserva asignada, idempotencia, sin stock negativo | PENDING · Sin ejecución del escenario |
| T10 | Reserva expira y pago tardío | reasignación segura o excepción/reembolso; no sobreventa | PENDING · Sin ejecución del escenario |
| T11 | Pago fallido/timeout/repetido/falso, importe incorrecto | sin confirmación falsa, unknown reconciliado, ledger único | PENDING · Sin ejecución del escenario |
| T12 | Cancelación, devolución parcial y pieza fabricada | reembolso limitado; reposición solo si apta y auditada | PENDING · Sin ejecución del escenario |
| T13 | Boceto v1 rechazado, v2 aprobado, click v1 | solo v2 autoriza producción con pago/gates correctos | PENDING · Sin ejecución del escenario |
| T14 | Pedido mixto, dos artículos con tiempos diferentes | despacho según política, no completar al entregar solo parte | PENDING · Sin ejecución del escenario |
| T15 | DN, provincia interior, retiro y sin tarifa | cotización válida, sin fallback 0, dirección validada | PENDING · B05 y B09; fallback incompatible |
| T16 | API carrier falla o duplica evento/guía | fallback autorizado, sin doble costo ni estado incorrecto | PENDING · Sin ejecución del escenario |
| T17 | WA firma inválida, duplicado, opt-out, ventana cerrada | no acciones no autorizadas; uso correcto de plantillas y dedup | PENDING · Sin ejecución del escenario |
| T18 | WA caído después de pago | pedido íntegro, outbox/fallback y alerta; no rollback comercial | PENDING · Sin ejecución del escenario |
| T19 | Reseña 1 estrella legítima, 5 estrellas y edición | moderación neutral, promedio e histograma exactos | PENDING · B08 publicación de una estrella; histograma y edición pendientes |
| T20 | Reseña no comprador, doble invitación, servicio NA | verificación real, sin duplicados ni agregados mezclados | PENDING · Sin ejecución del escenario |
| T21 | Google acceso revocado, cuota, perfil sin verificar | enlace oficial disponible, datos reales o estado no disponible | PENDING · Sin ejecución del escenario |
| T22 | Acceso cruzado order/token/admin/asset; CSRF y XSS | rechazo, sin fuga ni mutación, sesión segura | PENDING · B06 solo guard anónimo |
| T23 | GA4/Pixel evento purchase repetido, rechazo cookies | no duplicar compra, sin PII, respetar consentimiento | PENDING · Sin ejecución del escenario |
| T24 | Restauración DB/storage, reinicio worker | datos/refs recuperados, sin reenviar mensajes ni recobrar | PENDING · Sin ejecución del escenario |
| T25 | Migración dry-run, settings divergentes y datos legacy | conteos, importes/archivos reconciliados, sin inferir pagos | PENDING · B01 solo directorio |
| T26 | Cliente administra producto, plantilla, precio, stock y orden sin dev | tareas UAT completas y manual concordante | PENDING · B06 solo lectura |
| T27 | Dependencias/carga y fallo DB | readiness correcta, errores controlados, métricas y rollback | PENDING · B02/B03 instalación y audit |

## Migración local MySQL · ejecutado 24 nov 2026

Windows, Node 24.4.0, npm 11.4.2, MongoDB 7.0.24 y MariaDB 11.4.12 en loopback. Cuentas y URI permanecen en `.env.local` y no se imprimen.

| ID | Prueba / criterio | Resultado observado | Estado |
|---|---|---|---|
| DB01 | Esquema versionado instalable e idempotente | `npm run db:migrate` dos veces; 001_initial registrada, tablas disponibles | VERIFIED |
| DB02 | Migración sin pérdida de IDs/campos del origen local | Dry-run no escribió; importación transaccional; 1 admin, 6 categorías, 15 productos, 1 configuración; cotejo de IDs y contenido anidado completo pasó | VERIFIED |
| DB03 | Web sin Mongo en ejecución | `npm ls --omit=dev --depth=0`, lectura de arranque y `/health/ready`; ninguna dependencia Mongo en runtime | VERIFIED |
| DB04 | Sesiones se guardan en MySQL | 1 sesión de carrito guardada, reinicio del servidor, carrito persistió con miniatura y subtotal/total | VERIFIED |
| DB05 | Navegación y búsqueda de tienda | `/`, `/shop`, búsqueda `q=collar`, categoría y ficha respondieron y renderizaron resultados | VERIFIED |
| DB06 | Login y lectura de administración | Login sintético 302; productos/categorías/pedidos/reseñas/configuración 200 | VERIFIED |
| DB07 | Pedido de punta a punta en entorno local | Pedido creado y pantalla de éxito; subtotal=total RD$900; después se marcó cancelado y se restauró stock 12; queda 1 pedido claramente sintético en MySQL | VERIFIED |
| DB08 | Seed local no destructivo | `npm run seed:local` conservó catálogo y pedido; sin duplicar la configuración | VERIFIED |
| DB09 | Pruebas automatizadas de integración MySQL | `npm test`: 4 pasaron, 0 fallaron | VERIFIED |
| DB10 | Instalación limpia | `npm ci` instaló desde lockfile; smoke posterior en navegador sin errores de aplicación | VERIFIED |
| DB11 | Flujo de escritura de cada pantalla admin, variantes y carreras de inventario | No se cubrió en este lote | PENDING |
| DB12 | Restauración de backup DB/storage, Docker y Auto-Deploy | No se ejecutó | PENDING |

### Límites del resultado

Mongo conservó stock 12 y los conteos de origen; luego del smoke MySQL mantiene esos mismos 23 documentos más un pedido de prueba cancelado. El pedido no envió WhatsApp ni pago. El checkout mostró alternativas de envío a RD$0.00 por fallback preexistente. La consola del navegador mostró el aviso de Tailwind CDN y en la portada un 404 de `/favicon.ico`; no son fallos de conexión a MySQL. `/admin` raíz devuelve 404, mientras sus cinco páginas implementadas verificadas responden 200. No declarar aceptación integral del producto.
