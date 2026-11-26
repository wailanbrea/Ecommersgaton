# Gatón DO · Auditoría F0 del 24 de noviembre de 2026

## Fuentes de personalización · 26 de noviembre de 2026

La ficha de la pulsera configurada con el trío genérico Elegante/Clásica/Moderna ahora usa las diez opciones nombradas en el selector de la referencia: Black Jack, Dancing Script, Great Vibes, Baskerville, Alex Brush, Lobster, Life Savers, Courier New, Impact y Rockwell. El backend valida los nombres de la misma lista que muestra el formulario; las muestras se renderizan como texto y los nombres configurados por producto que no sean el trío genérico se conservan. La pantalla administrativa comparte la normalización para que sus opciones coincidan con la tienda. Producción y evidencia en `TEST_MATRIX.md` bajo CUS-01-FONTS.

## Tipografías publicadas en producción · 26 de noviembre de 2026

`9234b7c1fcdad4084cb30018fda012fc0ac284e6` quedó `deployed` como `gaton-app:9234b7c`. El auto-deploy registró el respaldo previo `/root/gaton-backups/pre-9234b7c-20261126-172909.sql.gz` (4.0K); `/health/ready`, `/` y la ficha de la pulsera respondieron 200. En la ficha productiva y en Editar producto aparecen las diez tipografías. La selección Dancing Script habilitó el carrito y actualizó WhatsApp; no se creó ningún pedido. El dashboard antes/después mostró 16 productos, 6 categorías, 0 reseñas, 0 pedidos y 2 administradores. Se conservaron los mismos IDs de administradores: `b06451eccb2b8414763919d6` y `3d882d33bbd842f0b7879f47`. No se ejecutaron migraciones ni se modificaron registros de catálogo, stock, usuarios o pedidos. El laboratorio local sigue devolviendo 500 para la ficha `borrador-local-pulsera-placa-grabable`; el flujo se comprobó en producción y no se atribuye ese 500 a este cambio.

## Avance técnico autorizado · 26 de noviembre de 2026

Estado del checkout y custodia de fotos tras la auditoría del Master Prompt:

- La creación del pedido, el decremento de stock y la bitácora de movimientos ahora comparten una transacción InnoDB con filas bloqueadas. Un checkout duplicado concurrente con la misma clave idempotente retorna el pedido existente. Se añadió `004_checkout_idempotency.sql` (columna nullable + índice único, sin alterar pedidos previos).
- La confirmación del comprador requiere el ID guardado en su sesión; no revelar pedidos mediante un ID público. Fotos nuevas de grabado van a `/app/storage/customizations`, en el volumen persistente ya existente; tanto las nuevas como las URLs legacy se sirven solo al dueño de la sesión o a administradores activos con `orders.view`.
- Se corrigió el bloque Contacto para leer `SiteSettings.locationText`, cuyo valor de laboratorio coincide con la dirección completa usada en el footer.
- Verificación de laboratorio: `npm test` 12 aprobadas/0 fallidas (la prueba de mutación opt-in queda omitida en suite estándar); checkout simultáneo de stock 1 e idempotencia: 1/1; confirmación y foto anónimas: HTTP 404; migración 004 aplicada. Backup JSON de la base `gatondo_local_mysql` de 15 tablas verificado fuera del repositorio antes de migrar.
- No se modificó producción todavía en este avance. Auto-Deploy respalda y aplica migraciones, pero la restauración de un backup no se ensayó. Falta validar el despliegue y preservar los IDs/conteos de producción antes y después.

**Estado funcional real:** ORD-02, INV-02, SEC-01/02/04 y CUS-04 siguen `PARTIAL`; solo los subcriterios indicados tienen evidencia. No se completaron reservas/expiración, recuperación segura del pedido, escaneo/normalización de fotos, rotación/MFA, rate limit ni aprobación del taller. GC-08 quedó corregido en código local y espera verificación en producción; GC-04 sigue bloqueado hasta recibir los logos originales y su asignación.

## Cierre de despliegue autorizado · 26 de noviembre de 2026

Se publicó `8257182eb94b2f3ad6bb7043fc236f9216f70d95` en `main`; `bs-autodeploy` quedó `deployed`, imagen `gaton-app:8257182`. La secuencia del servidor registró backup previo `pre-8257182-20261126-071303.sql.gz` (4.0K), recreación del contenedor y `004_checkout_idempotency`; readiness `/health/ready` y portada respondieron 200. La línea del log no acredita restaurabilidad de ese backup; `bsdeploy` no tiene permisos para leer `/root/gaton-backups` y no se usó Cockpit/root.

En el navegador autenticado cargaron Dashboard, Ventas, Productos, Inventario, Categorías, Pedidos, Reseñas, Configuración, Usuarios y Roles. Dashboard posterior: 16 productos, 6 categorías, 0 reseñas, 0 pedidos y 2 administradores. Los usuarios siguen siendo `admin@gatondo.com` (`b06451eccb2b8414763919d6`) y `wailandkey@gmail.com` (`3d882d33bbd842f0b7879f47`). No hay entidad de tienda independiente. La portada pública muestra el contacto `+1 (849) 330-6269` y la ubicación completa en la sección Contacto y en el pie. Sin sesión, ruta de pedido no existente y foto no existente respondieron 404 genérico.

No se hizo checkout/pago/upload/importación en producción y no se tocaron productos, usuarios ni pedidos. El snapshot de laboratorio se restauró temporalmente en 15 tablas/101 filas y se cotejó, pero esto no sustituye un ensayo de restauración del backup de VPS. `tmp/` preexistente sigue sin seguimiento e intacto. `ACCEPTED` permanece pendiente del propietario; GC-04 continúa parcial por falta de los logos originales y el mapa de asignación. La matriz registra exactamente los checks ejecutados.

## Administración de usuarios y permisos · 26 de noviembre de 2026

Se añadió localmente el menú Usuarios y Roles y permisos al panel. Incluye alta de cuentas, asignación de roles, activación/desactivación protegida contra bloquear al último superadministrador, contraseña temporal con cambio obligatorio, cambio de contraseña propia, permisos de ruta aplicados en servidor, token CSRF en formularios administrativos y bitácora de cambios. Los permisos elevados (`users.manage`, `roles.manage`, `admin.access`) solo pueden asignarse a roles por un superadministrador. Migración aditiva e idempotente `003_admin_rbac` asigna el rol de continuidad a los administradores existentes sin alterar sus IDs, contraseñas ni sesiones.

**Verificación local:** `npm test` 12/12; `npm run db:migrate` incluyó `003_admin_rbac`; comprobación sintáctica JS y compilación de EJS correctas. Ver `ADM-RBAC-01` y ADR-006. Un superadministrador puede establecer una clave temporal para otra cuenta desde el panel; la migración no altera contraseñas existentes.

**Línea base productiva previa a este cambio:** dashboard autenticado en `https://gaton.bsolutions.dev/admin/dashboard`, 16 productos, 6 categorías, 0 reseñas, 0 pedidos y 2 administradores. El sistema no maneja una entidad de tienda separada. En la consulta administrativa previa se registraron los IDs de cuentas `b06451eccb2b8414763919d6` y `3d882d33bbd842f0b7879f47`; el dashboard visible reconfirma ahora el conteo de dos. El último estado Auto-Deploy leído antes del cambio es `deployed`, SHA `1313953`; health readiness 200. El despliegue debe crear solo las tablas RBAC y registrar los roles, conservando exactamente estas cuentas y el resto de los registros.

**Despliegue y verificación:** push no forzado a `main`; commits `2d99775` (menú RBAC), `df010b1` (arreglo de render de lista) y `e010f2d` (inicialización del formulario nuevo). Auto-Deploy confirmó imagen `gaton-app:e010f2d`, estado `deployed`; la salida registró backup SQL previo a migración y `003_admin_rbac` aplicada; readiness y portada HTTP 200. En navegador autenticado cargaron Usuarios, alta de usuario, Roles/permisos, creación de rol, cambio temporal de la cuenta `admin@gatondo.com` y Mi contraseña. Usuarios conserva IDs `b06451eccb2b8414763919d6` y `3d882d33bbd842f0b7879f47`, ambas activas con Superadministrador. Dashboard conserva 16 productos, 6 categorías, 0 reseñas, 0 pedidos y 2 administradores. No se creó ninguna cuenta, no se cambió contraseña ni se alteró el catálogo durante esta verificación.

**Estado:** implementación productiva `VERIFIED` para las rutas de lectura/formularios y continuidad de cuentas/conteos; creación/modificación de cuentas, asignación de permisos, CSRF negativo en HTTP y restauración del backup siguen `PENDING` (no se ejecutaron mutaciones en producción). `ACCEPTED` pendiente de revisión del propietario. La contraseña que el usuario quiera establecer se ingresa desde el formulario; mínimo 12 caracteres.

## Actualización · Panel, pagos, analítica e inventario · 25 de noviembre de 2026

Trabajo realizado en `C:\xampp\php\www\EcommersGaton`. El servidor no se ha modificado durante la implementación local.

- **Panel:** shell EJS compartido en las vistas administrativas, paleta solicitada, sidebar contraíble, búsqueda entre rutas existentes y estilos responsive; Tailwind administrativo compilado localmente, sin CDN. El sidebar enlaza solo pantallas existentes: dashboard, ventas/analítica, productos, inventario, categorías, pedidos, reseñas y configuración.
- **Inventario:** exportación CSV/XLSX/PDF; importación CSV/XLSX y PDF estructurado GATÓN DO; validación por ID y variante, vista previa, token CSRF, revalidación transaccional y bitácora. Smoke local cambió stock 12→13→12 y dejó ambos movimientos en el historial de laboratorio.
- **Ventas:** ledger de pagos confirmados manualmente; abonos limitados al saldo y fecha de confirmación UTC, con rango comercial Santo Domingo. Los ingresos suman solo pagos reales registrados; pedidos sin pago se excluyen. Smoke local verificó abono, rechazo del exceso, pago restante y reconciliación de RD$100; los registros sintéticos de prueba fueron eliminados por sus IDs específicos al finalizar.
- **Pendiente del brief:** no hay datos de proveedor/pasarela, costo histórico por producto vendido, reembolsos, snapshot histórico de categoría, clientes normalizados ni permisos de rentabilidad por rol. No se presentan márgenes ni análisis de clientes/categorías. SAL-02 es parcial; SAL-03–05 e INV-02 siguen pendientes.
- **Migración:** `002_sales_inventory` crea solo tablas aditivas. El runner recorre migraciones ordenadas no aplicadas; en local 002 se aplicó y se volvió a ejecutar idempotentemente. Falta despliegue, backup y verificación de datos en producción.
- **Dependencias:** ExcelJS, PDFKit, pdf-parse y Multer 2. `npm audit --omit=dev`: cero vulnerabilidades. El árbol completo conserva dos moderadas de desarrollo; override uuid corrige advisory en dependencias de producción.
- **Estados:** ADM-01, INV-01 y SAL-01 `IMPLEMENTED`; criterios de esta actualización en TEST_MATRIX están `VERIFIED` solo en laboratorio. `ACCEPTED` pendiente del propietario.

### Línea base de producción inmediatamente antes del despliegue

Leída en el dashboard autenticado de `https://gaton.bsolutions.dev/admin/dashboard` el 25-11-2026; Auto-Deploy indicaba `deployed`, SHA `3f4e3ff`. Conteos: productos 15, categorías 6, reseñas 0, pedidos 0, administradores 2. El sitio tiene marca GATON DO, sin entidad de tienda separada visible en el sistema. La pantalla disponible no expone IDs individuales de administradores, así que se registró el conteo, no sus IDs.

IDs de productos observados en `/admin/products` (15): `6b063233d965071c9546cdfc`, `6b063233d965071c9546cdff`, `6b063233d965071c9546ce02`, `6b063233d965071c9546ce05`, `6b063233d965071c9546ce08`, `6b063233d965071c9546ce0b`, `6b063233d965071c9546ce0e`, `6b063233d965071c9546ce11`, `6b063233d965071c9546ce14`, `6b063233d965071c9546ce17`, `6b063233d965071c9546ce1a`, `6b063233d965071c9546ce1d`, `6b0632e5d965071c9546cf7f`, `6b0632e5d965071c9546cf89`, `6b0632e5d965071c9546cf93`.

IDs de categorías observados en `/admin/categories` (6): `6b0621098d60e58ee82c9ed8`, `6b0621098d60e58ee82c9ed9`, `6b0621098d60e58ee82c9eda`, `6b0621098d60e58ee82c9edb`, `6b0621098d60e58ee82c9edc`, `6b06315bd965071c9546ccd8`. Tras el despliegue comparar estos mismos conteos e IDs; la migración de este lote solo crea dos tablas nuevas.

### Despliegue y verificación posterior

`main` publicó el commit `9196badbdb8f25f9f7be87b83f9d18d9cd5d8a0e`. El estado de `bs-autodeploy` terminó `deployed`, imagen `gaton-app:9196bad`; `https://gaton.bsolutions.dev/health/ready` devolvió HTTP 200 con MySQL listo. `002_sales_inventory` quedó disponible: páginas de ventas e historial de movimientos respondieron dentro de la sesión autenticada.

Post-despliegue: dashboard conserva 15 productos, 6 categorías, 0 reseñas, 0 pedidos y 2 administradores; los 15 IDs de producto y 6 IDs de categoría registrados arriba compararon exactamente iguales. Inventario mostró los 15 productos con stock 12; historial sin movimientos. Descargas CSV/Excel/PDF de ventas e inventario se iniciaron correctamente en navegador. No se subió un archivo con existencias productivas ni se ejecutó una importación en producción. Ver matriz `PROD-01` a `PROD-05`.

La interfaz disponible no expone los IDs de los dos administradores; se comprobó el conteo, no sus identificadores. El sistema no expone entidades de tienda separadas. Esto no cambia porque la migración crea exclusivamente las dos tablas de pago e inventario.

**Recomendación pendiente de aprobación:** conservar el escaparate SSR, los slugs, los modelos como fuente de migración y los formularios que superen pruebas. Extraer gradualmente los servicios que comprometen dinero, inventario o diseños privados. La compra sencilla funciona en laboratorio. El flujo personalizado requiere garantías nuevas antes de admitir pedidos reales.

## Procedencia

La carpeta local de XAMPP está vacía. El repositorio de OneDrive se recibió en master sin commits ni remoto. La entrega de E: incluye 80 archivos. El ZIP recuperado de las transferencias locales pesa 7.851.282 bytes y su SHA-256 coincide con la especificación: `3f7a93177cba3880bd89054ef6e27672c5a655dc1978f149d55b65f652735c5d`. Se comparó cada ruta y contenido descomprimido con E: mediante SHA-256: 80 coincidencias, cero diferencias, faltantes o extras. Ver [manifiesto](fase0/inventario.sha256). La etiqueta local gaton-f0-baseline-20261124 identifica el manifiesto y las evidencias de esta entrega. El HEAD desplegado sigue sin identificar.

Se inventariaron los seis modelos, dos routers (12 rutas de tienda y 25 de administración), middleware, arranque y seeds, scripts de navegador, 22 vistas, CSS, lockfile, exportación pública, instalador, README, nueve notas históricas, medios y referencia gráfica. Las notas F9/F10 documentan intervenciones anteriores. La especificación principal se conserva íntegra en [MASTER_PROMPT](MASTER_PROMPT.md).

**Fuentes pendientes:** GATONDO.COM.pdf (6 páginas), GATON CAMBIOS .pdf (2), CAMBIOS PAGINA WEB.pdf (2) y el original independiente de la solicitud comercial ampliada. Se buscaron nombres en los espacios locales y adjuntos accesibles. La transcripción de §2.1 permite comparar texto provisionalmente. Queda pendiente cotejar las diez páginas, posiciones de logos, textos invertidos y referencias del drawer. El PNG externo “Personaliza tu collar Valentina” sí se inspeccionó: dos columnas, vista de medalla, tipografía, una/dos caras, foto, notas y total. Sus precios, límites de carga y fuentes son ilustrativos hasta aprobación.

## Hallazgos por funcionalidad

| Área | Evidencia y estado del comportamiento |
|---|---|
| Inicio, catálogo y ficha | Verificados HTTP y contenido mínimo con un producto sintético. El inicio sitúa Historia antes de Fragancias. Con cero reseñas muestra tres testimonios escritos en la vista. Revisar copy persistido, navegación y testimonios antes de publicar. |
| Búsqueda y género | Existen consultas por categoría, género, nombre/descripción/tags. El producto guarda un solo género. Falta paginación. El filtro de géneros históricos compara nombre y slug concatenados con términos individuales y puede dejar categorías de género visibles. |
| Carrito y pedido invitado | Verificados agregar dos unidades, render de carrito/checkout, creación del pedido, importe, pantalla final y descuento de stock. Faltan dirección, cotización versionada, consentimientos, reconfirmación y reserva por SKU. Código y casos ejecutados en TEST_MATRIX. |
| Personalización | Hay formulario de texto, fuentes, resumen y foto por producto. La ficha usa su propio script y no conecta el módulo independiente; la vista específica de administración carece de ruta. Cinco productos exportados tienen dos choiceGroups que el esquema Product no declara. Preservarlos al migrar. |
| Administración | Login y lectura de seis pantallas verificados. Existen rutas de alta/edición de catálogo y ajustes, moderación y cambios de estado; se verificaron el alta de categoría y producto, el filtro por esa categoría y la aprobación/publicación de una reseña de una estrella. Quedan edición avanzada y UAT. El detalle administrativo del pedido redirige a la lista. |
| Stock y precios | Pedido se persiste antes de descontar stock con lecturas/escrituras por línea. Se conserva precio de sesión y se acota cantidad; la variante puede seleccionarse por posición o por defecto. Falta una operación atómica por SKU para varios diseños o compradores. |
| Envío y cobro | Una tarifa sintética de RD$30 se sumó correctamente. En laboratorio, al quitar todas las tarifas del fixture reapareció «Delivery Santo Domingo». Las cuatro tarifas del export están inactivas; el código ofrece tres alternativas a cero en ese caso. El pedido de prueba quedó pendiente y contra entrega. No existe evidencia de un pago procesado. |
| Opiniones y comunicación | Existen reseñas de producto y moderación. La ruta asigna 5 sin selección y no verifica compra. WhatsApp abre un enlace manual; no hay evidencia de Cloud API, Google Business Profile, ledger de pagos ni tracking integrado. |
| Accesibilidad y rendimiento | Cuatro pantallas sin desbordamiento horizontal en cinco anchos con red externa bloqueada. La home carga Tailwind CDN; quedan revisión con estilos completos, foco, zoom, lector, CWV y carga. Tiempos individuales del laboratorio en el registro. |

## Cierre de sesión

F0 en curso. El cotejo de originales y la identificación de la versión operativa impiden aceptar la línea base completa. No hay requisito integral de producto aceptado o verificado. Sí hay comportamientos acotados verificados en [la matriz de pruebas](TEST_MATRIX.md). Cero migraciones, publicaciones, envíos externos o cambios en las fuentes. Los cambios del laboratorio son descartables y las evidencias permanecen en este repositorio. Siguiente revisión: propietario aporta originales y referencia versionada del despliegue, valida alcance del ADR y diseño con taller. Consultar [decisiones y plan](DECISIONS.md).
## Actualización posterior · Cambios solicitados por el cliente

Se localizaron y leyeron las cuatro páginas de CAMBIOS PAGINA WEB.pdf y GATON CAMBIOS .pdf en E:/Gaton Ecommer. Los hallazgos anteriores describen la entrega de septiembre. La copia de trabajo modificada está en C:/xampp/php/www/EcommersGaton. Se aplicaron el orden y las franjas de portada, los destinos de Fragancias, los controles de contenido, el filtro de categorías, los géneros, el contacto y dirección, el carrito lateral y los precios en tarjetas. Se probó navegación local en Chromium, apertura y cierre con Escape, etiquetas de filtros y seis pantallas administrativas. Precios de oferta y subtotal del carrito con artículos se comprobaron renderizando las vistas con datos sintéticos. Manual local de seis páginas con capturas en docs/Manual-panel-Gaton-DO.pdf de la copia de trabajo. Pendientes los originales del logo con asignación por ubicación remitidos por WhatsApp y la validación final del cliente.

## Actualización · Migración local a MySQL (24 de noviembre de 2026)

El propietario autorizó la migración de la copia de laboratorio y confirmó `https://github.com/wailanbrea/Ecommersgaton.git` como remoto futuro. El remoto está vacío; se inicializó localmente la rama `codex/mysql-migration` en la copia de aplicación y se configuró `origin`. No se ha hecho push ni preparado un despliegue.

MySQL/MariaDB ya es la base usada por la web y las sesiones. Se importaron y cotejaron 23 registros de negocio desde Mongo local, conservando IDs y documentos. Mongo no recibe escrituras de la aplicación; se mantiene encendida e intacta para consulta. Se añadieron pruebas de integración y se ejecutaron tras `npm ci`: 4/4 correctas. Smoke en navegador: inicio, catálogo, búsqueda, ficha, carrito con miniatura/subtotal/total, checkout, pedido sintético cancelado, sesión persistente tras reiniciar el servidor, login y 5 páginas administrativas. Evidencias y excepciones en [TEST_MATRIX.md](TEST_MATRIX.md) y [DATA_MIGRATION.md](DATA_MIGRATION.md).

**Estados:** DATA-DB-01, DATA-DB-02 y DATA-DB-03 `VERIFIED` en laboratorio. No `ACCEPTED` hasta validación del propietario. CRUD administrativo completo, pruebas de variantes/inventario concurrente, restauración, Docker y Auto-Deploy siguen `PENDING`. El flujo de envío a cero y el 404 de `/admin` raíz son hallazgos existentes; no se corrigen en esta migración.

**Dependencias/riesgos:** MariaDB debe estar disponible y el esquema debe aplicarse antes del arranque. Los campos anidados se guardan en JSON MySQL por compatibilidad; los agregados de reportes relacionales requerirían normalización y ADR. `npm audit --omit=dev` informó 0 vulnerabilidades; auditoría total reportó 2 moderadas en dependencias de desarrollo (`minimatch`).

**Próximo paso:** revisión del diff y validación del propietario; después, tarea separada para Docker/Auto-Deploy siguiendo instrucciones BSolutions. No conectar al VPS ni hacer push como parte de esta migración.

## Actualización · Infraestructura Docker y Auto-Deploy en VPS Linux (24 de noviembre de 2026)

El propietario configuró el registro DNS `gaton.bsolutions.dev` (`A` → `147.93.5.21`, proxy Cloudflare activo) y autorizó la creación de la infraestructura Docker aislada (`deploy/linux/`), la publicación en `https://github.com/wailanbrea/Ecommersgaton.git` y el script de alta inicial para `root` compatible con `bs-autodeploy` (`vmi3761714`).

- Se crearon `deploy/linux/Dockerfile`, `deploy/linux/docker-compose.yml`, `deploy/linux/entrypoint.sh`, `deploy/linux/Dockerfile.dockerignore`, `deploy/linux/initial-catalog.json` (6 categorías, 15 productos, 1 configuración sin secretos), `scripts/bootstrap-catalog.js` y `deploy/linux/install-gaton-vps.sh`.
- El instalador `install-gaton-vps.sh` fue copiado a `/home/bsdeploy/install-gaton-vps.sh` en `147.93.5.21` listo para ejecutarse como `root`.

## Auditoría de GATON CAMBIOS .pdf · 26 de noviembre de 2026

Se revisaron íntegramente las 2 páginas y se cotejaron los 9 puntos contra producción. GC-01 ya estaba implementado en el enlace del menú y quedó verificado; la CTA separada `Explorar Fragancias` conserva su destino al catálogo. GC-02 se implementó, verificó localmente y se desplegó en `755cff6`; el health check, inicio y catálogo respondieron 200, y el catálogo conservó sus 15 productos sin controles de género. No se tocaron datos comerciales. Detalle por ID en [AUDITORIA_GATON_CAMBIOS_20261126.md](AUDITORIA_GATON_CAMBIOS_20261126.md) y evidencia en [TEST_MATRIX.md](TEST_MATRIX.md). Pendientes: obtener logos originales y su asignación por ubicación, y sustituir la ubicación genérica del bloque Contacto por la dirección precisa.

## Actualización · Borrador local de pulsera grabable · 25 de noviembre de 2026

Se añadió el archivo de cliente `public/images/muestras-carrito/brazaletes-4.jpeg` (SHA-256 `8A31DEA86643ACAE2852ED29B33207DD13A1E05A753678B859AC5F7838126F12`) y una muestra local `BORRADOR LOCAL · Pulsera con placa grabable`, ID `bca3a064fc602b56be2427fb`, categoría Brazaletes. El laboratorio usa costo RD$500, precio RD$1,000 y stock 10, valores sintéticos pedidos para la prueba; la ficha está claramente rotulada como borrador. No se modificó producción con datos de catálogo.

La ficha usa la imagen completa, overlay transparente sobre la placa, preview de texto en vivo con selección de fuente y diálogo ampliado. Prueba acotada `CUS-01-PREVIEW`: navegación en Chromium a 390×844; “Valentina” se reflejó en la foto y el diálogo; se probó ajuste para 20 caracteres sin desbordamiento; la prueba del carrito local mostró RD$1,000 y stock 10; consola sin errores de aplicación. Evidencia completa en [TEST_MATRIX.md](TEST_MATRIX.md). CUS-01 permanece parcial; CUS-02 (editor Canvas/SVG), costo histórico y aceptación del cliente siguen pendientes. Este borrador de pruebas no se insertará en la base de producción. `tmp/` estaba sin seguimiento antes de esta tarea y se dejó intacto.
