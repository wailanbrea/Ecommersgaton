# Matriz de pruebas · F0

## Grabado sin vista previa

| ID | Prueba ejecutada | Resultado |
|---|---|---|
| CUS-01-FORM | Pulsera de texto, ficha sintética de fotograbado y producto normal en Chromium a 390 y 1280 px | En los seis casos la galería se amplió sin desbordamiento. La pulsera mostró tres fuentes y el contador llegó a 9/20 al escribir «Valentina». La imagen quedó sin texto superpuesto. Solo la ficha de fotograbado ofreció el adjunto. |
| CUS-05-FORM | Campo vacío, límite excedido, valor duplicado, tipografía inválida y configuración sin fuentes | La validación de servidor rechazó las entradas inválidas. Una ficha de texto sin fuentes muestra el aviso y deshabilita la compra. |
| CUS-06-FORM / CUS-04 | Pedido de laboratorio con dos textos distintos para la misma pieza y un fotograbado | Ana y Eva quedaron en líneas distintas con sus fuentes en carrito, confirmación y panel de pedidos. La foto se abrió desde la sesión compradora y el panel autorizado. Otra sesión recibió HTTP 404. |

La evidencia se limita al formulario de grabado y a la custodia del adjunto en el flujo existente. CUS-01-PREVIEW, abajo, queda como prueba histórica del diseño anterior.

## Tipografías del personalizador de referencia · 26 de noviembre de 2026

| ID | Criterio | Evidencia | Estado |
|---|---|---|---|
| CUS-01-FONTS | Selección validada y muestra visual de las diez fuentes de la página de referencia | `npm test`: 14 aprobadas, 0 fallidas y 2 pruebas opt-in de DB omitidas. Producción en `9234b7c`: tienda y formulario admin muestran los diez nombres; Google Font faces se cargaron; “Dancing Script” quedó seleccionado, activó Agregar al carrito y apareció en WhatsApp. Sin enviar pedido. A 375 px y 1265 px no hubo desbordamiento horizontal. | VERIFIED (criterio de este selector) |

La fuente Black Jack se muestra con un sustituto visual Satisfy; Baskerville, Impact y Rockwell usan Libre Baskerville, Anton y Roboto Slab cuando la fuente del sistema no existe. Las etiquetas conservan los nombres exactos de las opciones de referencia. No se copian las imágenes/archivos de fuentes del sitio externo. En laboratorio, `/shop` responde 200, pero la ficha local `borrador-local-pulsera-placa-grabable` responde 500; no se pudo atribuir ese error a este cambio. Se verificó la ficha productiva equivalente.

## Checkout protegido · laboratorio MySQL · 26 de noviembre de 2026

| ID | Criterio ejecutado | Resultado observado | Estado |
|---|---|---|---|
| ORD-02/SEC-01 | Dos checkouts simultáneos distintos con una sola unidad | Una transacción crea pedido y movimiento; la segunda rechaza por falta de stock; stock final 0 sin negativo | VERIFIED (escenario aislado) |
| ORD-02/T09 | Doble envío simultáneo con la misma clave de checkout | Restricción única devuelve el mismo ID de pedido en ambas respuestas; una sola unidad descontada y un solo pedido | VERIFIED (escenario aislado) |
| SEC-04/T07 | GET anónimo a confirmación de pedido y foto de personalización privada | Ambos responden 404; sin datos del pedido ni bytes de la foto | VERIFIED (negativo anónimo) |
| GC-08 | Ubicación del bloque Contacto | La plantilla usa `locationText` y fallback completo: “Av. Independencia, Km. 11, Distrito Nacional, Santo Domingo, Rep. Dom.” | VERIFIED (código local; falta producción) |
| DB-04 | Migración de clave idempotente | Respaldo local de 15 tablas serializado y verificado; `004_checkout_idempotency` aplicada en `gatondo_local_mysql` | VERIFIED (esquema local) |
| DB-05 | Restauración aislada del snapshot local | Las 15 tablas y 101 filas se insertaron y cotejaron en tablas temporales del laboratorio; al cerrar la conexión desaparecieron | VERIFIED (round-trip temporal, no restauración completa del VPS) |

Pruebas ejecutadas: `RUN_DB_MUTATION_TESTS=1 node --test test/checkout-transaction.test.js` (1/1); `npm test` (12 aprobadas, 0 fallidas; 1 prueba de mutación se omite por seguridad salvo habilitación explícita); `node --check` para servidor/rutas; segunda ejecución de `npm run db:migrate` terminó sin operaciones pendientes. Los fixtures de concurrencia se limpian por IDs sintéticos concretos. El primer intento dejó un fixture porque falló su limpieza al cerrar el pool; se identificó y retiró de forma puntual en `gatondo_local_mysql`; la repetición pasó y dejó cero fixtures incompletos.

Límites: son dos solicitudes simultáneas, no la carga de 20 solicitudes de T09. El archivo privado se comprobó contra acceso anónimo, no contra toda la matriz de pertenencia, revocación o roles de T07. El pedido de invitado queda ligado a la sesión del navegador; aún no existe enlace seguro de recuperación o aprobación por correo/OTP. Stock se consume al crear el pedido COD; reservas, vencimiento, cancelación/reposición, gates de fabricación y outbox no están implementados.

## Producción · verificación de `8257182` · 26 de noviembre de 2026

| ID | Criterio | Resultado posterior al despliegue | Estado |
|---|---|---|---|
| PROD-07 | Auto-Deploy y migración | Estado `deployed`, `active_sha=8257182`; log confirma `004_checkout_idempotency`, `/health/ready` 200 (`database=mysql`) y `/` 200 | VERIFIED |
| PROD-08 | Contacto y acceso anónimo a datos/fotos | Contacto muestra la dirección completa; un ID de pedido inexistente y una ruta de foto inexistente responden 404 genérico | VERIFIED (comprobación negativa, sin pedido real) |
| PROD-09 | Panel admin y continuidad de datos | Dashboard, ventas, productos, inventario, categorías, pedidos, reseñas, configuración, usuarios y roles cargaron; conteos 16/6/0/0/2 y los dos IDs de usuario permanecen iguales | VERIFIED (lectura/renderizado) |

El backup automático previo quedó registrado como `pre-8257182-20261126-071303.sql.gz` (4.0K). No se tuvo acceso para validar su contenido ni restaurarlo; solo el snapshot local se rehidrató en tablas temporales. No se mutaron datos productivos, no se hizo checkout, pago, upload ni importación en producción.

## Panel e inventario · laboratorio local · 25 de noviembre de 2026

| ID | Prueba / criterio | Resultado observado | Estado |
|---|---|---|---|
| ADM-01 | Compilación de templates administrativos | EJS compiló 30 plantillas; `node --check` de rutas y runner correcto | VERIFIED (compilación) |
| ADM-02 | Rutas con sesión administrativa | 9 rutas: dashboard, productos, categorías, pedidos, reseñas, configuración, inventario, movimientos y ventas respondieron HTTP 200 | VERIFIED (HTTP/render) |
| ADM-03 | Responsive sin overflow | Las 9 rutas a 320, 390, 768, 1024 y 1440 px: 45 mediciones, 0 desbordamientos horizontales | VERIFIED (ancho medido) |
| INV-01 | Exportar inventario CSV/XLSX/PDF | HTTP 200 y tipos/bytes válidos para los 3 formatos | VERIFIED (descarga) |
| INV-02 | Vista previa CSV/XLSX/PDF | Los 3 formatos generaron preview de 15 líneas; ningún stock cambió antes de confirmar | VERIFIED (preview) |
| INV-03 | Aplicar/revertir importación | Stock local 12→13→12; dos movimientos guardados y no se alteraron otros registros | VERIFIED (laboratorio) |
| INV-04 | Variante obsoleta, filas repetidas, fórmulas CSV y PDF no oficial | Validación implementada; esos rechazos no se ejecutaron individualmente | PENDING |
| SAL-01 | Abono, límite de saldo, pago completo | Orden local sintético: RD$40 aceptados, exceso RD$61 rechazado, RD$60 aceptados; dashboard y CSV reconciliaron RD$100. Orden/pagos de prueba eliminados por ID específico al finalizar | VERIFIED (laboratorio) |
| SAL-02 | Exportar ventas y comparar períodos/calendario | Export endpoints respondieron 200; range/presets implementados. Comparación gráfica, reconciliación de todos los intervalos y calendario extremo no se probaron | PARTIAL |
| SAL-03 | Pedido no cobrado y costos desconocidos | El pedido existente sin pagos mostró RD$0; la vista explica que no infiere cobros y no calcula ganancia sin costo histórico | VERIFIED (observación local) |
| SAL-04 | Acceso anónimo, CSRF, doble envío y permisos por rol | No probado integralmente; la app solo tiene el rol general de administrador | PENDING |
| ADM-04 | Tailwind CDN del administrador | Reemplazado por CSS local compilado. El 404 de `/favicon.ico` local existente permanece | VERIFIED (código/render) |

Comandos ejecutados: `npm test` (6/6); `npm run db:migrate` dos veces (segunda sin operaciones); `npm run build:admin-css`; `npm audit --omit=dev` (0 vulnerabilidades); compilación de 30 templates. No se han ejecutado pruebas de concurrencia, backup/restauración, carga o autorización por empleado. La evidencia acredita solo el entorno local.

## Verificación post-despliegue · VPS Linux · 25 de noviembre de 2026

| ID | Criterio | Resultado observado | Estado |
|---|---|---|---|
| PROD-01 | Auto-Deploy publicó el commit objetivo y quedó sano | `/var/log/bs-autodeploy/gaton.status.json`: `deployed`, `active_sha=9196bad`; imagen `gaton-app:9196bad` | VERIFIED |
| PROD-02 | Readiness de la app desplegada | `https://gaton.bsolutions.dev/health/ready`: HTTP 200, `database=mysql`; dashboard administrativo cargó en sesión real | VERIFIED |
| PROD-03 | Conteos e IDs de producto/categoría comparados antes/después | 15 productos, 6 categorías, 0 reseñas, 0 pedidos y 2 administradores; 15 IDs de producto y 6 IDs de categoría iguales a la línea base guardada en STATUS | VERIFIED |
| PROD-04 | Panel y módulo de ventas en producción | Sidebar nuevo y ruta de ventas visibles; cero pagos/pedidos en el rango actual; CSV/Excel/PDF descargados con éxito | VERIFIED (render/descarga) |
| PROD-05 | Inventario y auditoría | 15 líneas, stock 12; CSV/Excel/PDF descargados; ruta del historial respondió y mostró cero movimientos | VERIFIED (render/descarga) |
| PROD-06 | Importación con datos productivos | Se dejó sin ejecutar para no mutar inventario de producción. Preview y aplicación completos sí se ejercitaron en MySQL local con reversión de cantidad | NOT RUN (protección de datos) |

La prueba de ventas pagadas y los imports son evidencia de laboratorio, no pagos comerciales ni una importación de producción. Backup y rollback no se ensayaron mediante restauración; el motor desplegó con su flujo automático y el estado final reportó `deployed`.

## Verificación acotada · Menú móvil · 25 de noviembre de 2026

`WEB-07` / escenario `T04` — Chromium local en viewport 390 × 844. Se abrió el menú y se comprobó que el panel quedara visible con `aria-expanded=true` y exactamente estos siete enlaces, en este orden: Inicio, Fragancias, Colección, Personalizados, Historia, Clientes y Contacto. No aparecen Catálogo completo, categorías adicionales ni Carrito dentro del panel; los iconos de búsqueda y carrito de la barra permanecen separados. Destinos observados: `/`, `/#fragancias`, `/#coleccion`, `/shop?category=personalizados`, `/#historia`, `/#clientes`, `/#contacto`.

`npm test`: 4 pasaron, 0 fallaron. Compilación EJS de `views/partials/header.ejs`: correcta. Esta verificación cubre solo el menú en 390 × 844; `T04` permanece `PENDING` para el resto de anchos, zoom, accesibilidad y flujo de compra móvil.

Después de publicar `f458b29`, Auto-Deploy informó `deployed` con imagen `gaton-app:f458b29`. En el sitio público, `/` y `/shop` respondieron 200; Playwright volvió a abrir el menú en 390 × 844 y encontró exactamente los mismos siete enlaces y destinos, con el panel visible y `aria-expanded=true`. La consola registró un 404 de `/favicon.ico`, hallazgo previo y ajeno a este cambio.

## Auditoría PDF · navegación Fragancias y filtros del catálogo · 26 de noviembre de 2026

Cambio local en `views/store/shop.ejs`: se quitaron del catálogo el filtro selector, las chips y la etiqueta de género en las tarjetas, manteniendo intactos los datos de género y su captura administrativa. Se verificó el enlace de menú `Fragancias` a `/#fragancias`; la CTA `Explorar Fragancias` continúa abriendo el catálogo.

Verificación local: `npm test` 6/6; compilación EJS 3/3; Chromium 127.0.0.1:8081, inicio 200 y catálogo 200. Al pulsar el enlace principal Fragancias, URL `/#fragancias`, `scrollY=3897`, sección destino `top=91.6px`. En catálogo: búsqueda y categoría presentes, controles/valores de género ausentes, 15 tarjetas renderizadas.

Despliegue final `755cff6`: Auto-Deploy informó `deployed`, imagen y SHA activos `gaton-app:755cff6`. `https://gaton.bsolutions.dev/health/ready`, `/` y `/shop` respondieron 200. La portada sirve el enlace del menú `/#fragancias`, mantiene la CTA separada hacia `/shop?category=fragancias` y contiene `id=fragancias`; el catálogo no renderiza controles ni opciones de género, conserva búsqueda/categoría y muestra 15 tarjetas. Verificación de lectura, sin cambios de datos comerciales.

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
| T05 | Configurador múltiples tipos, fuentes, caras, imágenes | preview válida y snapshot reproducible; error explícito ante opción inválida | PENDING · vista tipográfica por campo implementada en worktree aislado; falta probar fuente, dos caras y conservación en carrito/pedido |
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

## Acceso administrativo · usuarios, roles y contraseña · 26 de noviembre de 2026

| ID | Criterio ejecutado | Resultado observado | Estado |
|---|---|---|---|
| ADM-RBAC-01 | Tabla de permisos por método/ruta, política de contraseñas, CSRF, protección frente a auto concesión de privilegios, asignación de superadmin de continuidad, migración repetida | `npm test`: 12/12; cubre permisos GET/POST, mínimo 12 caracteres, rechazo sin CSRF, soporte multipart y bloqueo de concesión de `users.manage`, `roles.manage`, `admin.access` por roles delegados. `npm run db:migrate` repetida aplicó/leyó `001`, `002`, `003` sin error. Compilación de 37 vistas EJS y `node --check` JS correctas en la revisión local previa. | VERIFIED · laboratorio |
| ADM-RBAC-02 | Alta/edición de roles, asignación de cuenta, cambio temporal, cambio propio, invalidación de sesión y auditoría desde navegador | Formularios GET de alta de usuario, alta de rol, cambio temporal de otra cuenta y cambio propio renderizaron; no se guardó ningún cambio en producción. Las mutaciones, invalidación de sesión y auditoría quedan sin prueba end-to-end. | PARTIAL · producción |
| ADM-RBAC-03 | Migración y navegación productiva, cuentas existentes y autorización en panel desplegado | Auto-Deploy `deployed` en `e010f2d`; migración 003 aplicada; health 200. En navegador abrieron usuarios/roles y formularios. Los 2 IDs preexistentes se conservan y ambos tienen Superadministrador; dashboard mantiene 16 productos, 6 categorías, 0 reseñas, 0 pedidos y 2 admins. Sin entidad tienda separada. | VERIFIED · criterios medidos |

## Preview de pulsera grabable · laboratorio local · 25 de noviembre de 2026

| ID | Criterio ejecutado | Resultado observado | Estado |
|---|---|---|---|
| CUS-01-PREVIEW | Editar texto, reflejarlo en la placa y en la imagen ampliada; cambiar tipografía; ajustar texto al ancho en móvil | Ficha local respondió 200. En Chromium a 390×844, “Valentina” se reflejó en la placa principal y en el modal; Clásica/Elegante cambiaron el estilo. Un texto de 20 caracteres quedó dentro de la zona, sin desbordamiento. La imagen cargó y la consola no mostró errores de aplicación (aviso existente de Tailwind CDN). Con costo de prueba RD$500, precio RD$1,000 y stock 10, se agregó al carrito y se comprobó miniatura, personalización, subtotal RD$1,000 y disponibilidad 10; no se hizo checkout. | VERIFIED · caso acotado |

| CUS-01-PRICE-FONTS | Grabado frontal incluido y trasero opcional +RD$200; fuentes independientes por cara; precio y selector trasero condicionales; validación servidor y snapshot pedido | `npm test` con MySQL local opt-in: 18 aprobadas, 0 fallidas, 0 omitidas. Integración cubrió precio RD$1,290 sin reverso, RD$1,490 al completar reverso, manipulación de recargo ignorada y fuentes separadas conservadas en pedido. En navegador local: selector frontal visible; selector trasero aparece al escribir y permite otra fuente; al borrar texto desaparece selector y el precio vuelve a RD$1,290. | VERIFIED · criterios de este caso en laboratorio |

| CUS-01-PROD | Despliegue de campos/lados con recargo configurable e imagen opcional por producto; preservar catálogo y cuentas | Auto-Deploy `deployed`, `active_sha=5e2635c`. `/`, `/health/ready`, ficha de pulsera y ambas imágenes de muestra responden 200. En el editor de un producto real se agregó un segundo campo y se activó temporalmente la casilla de imagen; no se guardó. Tras recargar: catálogo conserva 15 productos; usuarios activos sin cambios: `b06451eccb2b8414763919d6` (`admin@gatondo.com`) y `3d882d33bbd842f0b7879f47` (`wailandkey@gmail.com`), ambos Superadministrador. La pulsera `87920f57494b0eb89f5104eb` conserva precio RD$1,000, stock 10, un campo, y grabado de imagen desactivado. | VERIFIED · despliegue y controles; configuración comercial sin alterar |

Auto-Deploy registró backup SQL previo para `5e2635c` en `/root/gaton-backups/pre-5e2635c-20261127-003827.sql.gz` (4.0K). La cuenta de despliegue no tiene acceso de lectura a `/root`, así que el archivo fue confirmado por el registro del motor y no se validó su contenido por separado. No se ejecutó migración de esquema ni se subieron imágenes de clientes.

El caso no verifica el configurador integral CUS-01 ni el editor Canvas/SVG CUS-02. Los valores costo/venta/stock son exclusivamente locales y no se cargaron a producción; no hubo pedido ni comunicación externa.

### Límites del resultado

Mongo conservó stock 12 y los conteos de origen; luego del smoke MySQL mantiene esos mismos 23 documentos más un pedido de prueba cancelado. El pedido no envió WhatsApp ni pago. El checkout mostró alternativas de envío a RD$0.00 por fallback preexistente. La consola del navegador mostró el aviso de Tailwind CDN y en la portada un 404 de `/favicon.ico`; no son fallos de conexión a MySQL. `/admin` raíz devuelve 404, mientras sus cinco páginas implementadas verificadas responden 200. No declarar aceptación integral del producto.
