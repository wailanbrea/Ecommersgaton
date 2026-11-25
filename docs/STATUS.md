# Gatón DO · Auditoría F0 del 24 de noviembre de 2026

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