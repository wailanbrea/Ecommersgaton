# Matriz de requisitos

## Requisitos del panel/analítica/inventario · 25 de noviembre de 2026

| ID | Requisito | Estado local |
|---|---|---|
| ADM-01 | Layout EJS compartido, paleta premium, sidebar expandible y navegación responsive en las pantallas existentes | IMPLEMENTED; renderizado en pruebas |
| ADM-02 | Mostrar solo navegación administrativa con rutas implementadas | PARTIAL; Dashboard, Ventas, Productos, Inventario, Categorías, Pedidos, Reseñas y Configuración |
| INV-01 | Exportar existencias CSV, XLSX y PDF; importar esos formatos con vista previa, validación por ID/variante, transacción y bitácora | IMPLEMENTED; flujos probados en laboratorio |
| INV-02 | Conciliar inventario con transacciones de venta, proteger sobreventa concurrente y gestionar devoluciones | PENDING; fuera del importador aislado |
| SAL-01 | Mostrar ingresos por fecha de pago confirmado y distinguirlos de pedidos pendientes | IMPLEMENTED; confirmación manual, sin proveedor de pagos |
| SAL-02 | Períodos/comparación, evolución diaria, pagos, ticket promedio, productos de pedidos pagados y exportar | PARTIAL; ver TEST_MATRIX |
| SAL-03 | Costos históricos, margen/ganancia, reembolsos, categorías históricas, clientes/cohortes, mapa de calor y conversión | PENDING; el modelo fuente no contiene la evidencia necesaria |
| SAL-04 | Permisos financieros separados por tipo de información/reporte | PENDING; la aplicación actual valida sesión de administrador general |
| SAL-05 | Todas las páginas/indicadores del brief comercial y reportes conciliados a escala | PENDING; este lote no declara terminado el módulo integral |

Fuente normativa íntegra en MASTER_PROMPT. Los 94 criterios se reproducen debajo de sus fichas. El estado de cada fila se refiere al requisito completo. «Parcial» indica una pieza local relevante; «pendiente» indica que falta evidencia de implementación del criterio. Los responsables son funciones propuestas. Evidencia de ejecución en TEST_MATRIX y fase0/baseline.txt, auditoría estática en STATUS y fase0/rutas.md.

## WEB-01 · IN_PROGRESS

Inicio premium, accesible, ligero, diseño propio: marca, hero, video opcional optimizado con poster, CTA, colecciones, fragancias, personalizados, filosofía, pasos, testimonios/reseñas reales, contacto, redes y footer. Mobile first, tablet y desktop; evitar CLS, desplazamiento horizontal, video pesado o animaciones que bloqueen compra.

- Cobertura: parcial. Evidencia de partida: Vistas store, parciales y CSS.
- Plan: F2. Depende de diseño y originales pdf. Riesgo: contenido o navegación divergente.
- Responsable propuesto: UX/CMS. Pruebas relacionadas: T01, T02, T04.

## WEB-02 · IN_PROGRESS

Catálogo paginado con búsqueda por nombre/SKU/tags, categorías, subcategorías, género, tipo, rango de precio, disponibilidad, ofertas y novedades; orden por relevancia/precio/fecha. Filtros combinables, URL compartible, limpiar filtros, estado vacío útil. Categorías dinámicas: Brazaletes, Collares, Anillos, Fragancias, Personalizados y demás creadas por admin. Géneros separados: Hombres, Mujeres, Niñ@s, Animales. Un producto puede asociarse a varios géneros sin duplicar inventario. Feromonas femeninas/masculinas no son categorías raíz obligatorias; clasificarlas como tipo/atributo de fragancia si el cliente lo aprueba. Personalizados puede ser colección/categoría visible vinculada a capacidades del producto sin duplicarlo.

- Cobertura: parcial. Evidencia de partida: Vistas store, parciales y CSS.
- Plan: F2. Depende de diseño y originales pdf. Riesgo: contenido o navegación divergente.
- Responsable propuesto: UX/CMS. Pruebas relacionadas: T01, T02, T04.

## WEB-03 · IN_PROGRESS

Ficha: breadcrumb, galería optimizada (zoom y vídeo opcional), SKU, descripción, variantes, disponibilidad, precio regular y oferta, información de entrega y tiempo de fabricación, valoraciones, productos relacionados, configurador integrado si aplica, CTA carrito. No mostrar precio mínimo ambiguo: “desde” si hay diferencias y precio exacto tras selección.

- Cobertura: parcial. Evidencia de partida: Vistas store, parciales y CSS.
- Plan: F2. Depende de diseño y originales pdf. Riesgo: contenido o navegación divergente.
- Responsable propuesto: UX/CMS. Pruebas relacionadas: T01, T02, T04.

## WEB-04 · IN_PROGRESS

Carrito lateral conforme al comportamiento de referencia solicitado (ver PDF); también página completa accesible. Cerrar con Escape y botón, focus trap/restauración, scroll interno, no scroll de fondo, mobile sin recortes; modificar cantidades, editar diseño, eliminar, mostrar subtotal, enviar a checkout. Nunca exponer información de otros carritos.

- Cobertura: parcial. Evidencia de partida: Vistas store, parciales y CSS.
- Plan: F2. Depende de diseño y originales pdf. Riesgo: contenido o navegación divergente.
- Responsable propuesto: UX/CMS. Pruebas relacionadas: T01, T02, T04.

## WEB-05 · IN_PROGRESS

Páginas Nosotros, Contacto, Personalizados, preguntas frecuentes, políticas de compra, envíos, cancelación, devoluciones, privacidad y términos. Enlaces y redes Instagram, Facebook, WhatsApp (TikTok si se confirma). Envíos a todo RD visibles. No inventar horarios, sucursales ni políticas legales.

- Cobertura: parcial. Evidencia de partida: Vistas store, parciales y CSS.
- Plan: F2. Depende de diseño y originales pdf. Riesgo: contenido o navegación divergente.
- Responsable propuesto: UX/CMS. Pruebas relacionadas: T01, T02, T04.

## WEB-06 · IN_PROGRESS

CMS editable por admin: hero, logos por ubicación, videos/imágenes, texto, CTA y destino, anuncios, colección, tarjetas, fragancias, historia, pasos, clientes, contacto, footer, redes, páginas legales, SEO por página. Validar URLs internas/https y anclas, escapar contenido o sanitizar HTML permitido, previsualizar, publicar, versionar y revertir. No permitir scripts arbitrarios. Mantenimiento sin tocar código.

- Cobertura: parcial. Evidencia de partida: Vistas store, parciales y CSS.
- Plan: F2. Depende de diseño y originales pdf. Riesgo: contenido o navegación divergente.
- Responsable propuesto: UX/CMS. Pruebas relacionadas: T01, T02, T04.

## WEB-07 · IN_PROGRESS

SEO y accesibilidad de navegación (ver sección 12), es-DO, DOP, información de envío clara, estados loading/error/success, imágenes alt, foco visible, contraste AA, objetivos táctiles adecuados, navegación con teclado y lector de pantalla.

- Cobertura: parcial. Evidencia de partida: Vistas store, parciales y CSS.
- Plan: F2. Depende de diseño y originales pdf. Riesgo: contenido o navegación divergente.
- Responsable propuesto: UX/CMS. Pruebas relacionadas: T01, T02, T04.

## WEB-08 · BLOCKED

Verificar visualmente capturas de los PDF, assets del ZIP y logotipos suministrados por cliente. Los logos específicos remitidos por WhatsApp y el video definitivo no están confirmados aquí: inventariar assets, solicitar originales/ubicación aprobada, no recrearlos ni sustituirlos arbitrariamente.

- Cobertura: parcial. Evidencia de partida: Vistas store, parciales y CSS.
- Plan: F0/F2. Depende de diseño y originales pdf. Riesgo: contenido o navegación divergente.
- Responsable propuesto: UX/CMS. Pruebas relacionadas: T01, T02, T04.

## ARC-01 · IN_PROGRESS

Monolito modular SSR + endpoints JSON internos versionados (`/api/v1`) para configurador, carrito, cotización, admin e integraciones; no microservicios prematuros. Módulos: auth, catalog, media, personalization, inventory, cart, pricing, checkout, orders, payments, fulfillment, customers, reviews, CMS, integrations, analytics, audit, jobs. Separar rutas/controllers, schemas de validación, services/domain, repositories, adapters, views y workers; negocio no reside en EJS ni en JS del navegador.

- Cobertura: parcial. Evidencia de partida: server.js, config, routers y modelos.
- Plan: F0. Depende de adr y topología. Riesgo: arranque parcial o persistencia inconsistente.
- Responsable propuesto: Arquitectura. Pruebas relacionadas: T09, T24, T27.

## ARC-02 · PENDING

MongoDB replica set/Atlas con soporte de transacciones, índices y migraciones versionadas; transacciones breves con retries acotados, sin llamadas externas dentro de ellas. Local y CI usar replica set real, no mocks de concurrencia. Verificar plan de Atlas elegido soporta operaciones/backup requeridos; si no, usar dedicado o replica set administrado. No exponer puerto DB a Internet.

- Cobertura: pendiente. Evidencia de partida: server.js, config, routers y modelos.
- Plan: F1–F7. Depende de adr y topología. Riesgo: arranque parcial o persistencia inconsistente.
- Responsable propuesto: Arquitectura. Pruebas relacionadas: T09, T24, T27.

## ARC-03 · IN_PROGRESS

Almacenamiento compatible S3/R2 mediante adaptador. Buckets separados público y privado, entorno separado, metadatos en DB, URLs firmadas de vida corta, CDN para catálogo. `LocalStorageAdapter` solo local, almacenamiento privado fuera de `public`. No almacenar fotos base64 en pedidos, sesión o logs.

- Cobertura: parcial. Evidencia de partida: server.js, config, routers y modelos.
- Plan: F1–F7. Depende de adr y topología. Riesgo: arranque parcial o persistencia inconsistente.
- Responsable propuesto: Arquitectura. Pruebas relacionadas: T09, T24, T27.

## ARC-04 · PENDING

Worker durable con outbox en Mongo y leasing atómico, reintentos exponenciales con jitter, límite, dead letter, replay autorizado, reconciliación. No depender de timers de un proceso web. Redis/cola dedicada solo si métricas lo justifican. Jobs independientes de entrega web y sin datos personales innecesarios.

- Cobertura: pendiente. Evidencia de partida: server.js, config, routers y modelos.
- Plan: F1–F7. Depende de adr y topología. Riesgo: arranque parcial o persistencia inconsistente.
- Responsable propuesto: Arquitectura. Pruebas relacionadas: T09, T24, T27.

## ARC-05 · IN_PROGRESS

Entorno reproducible Docker Compose: web, worker, reverse proxy cuando proceda, DB local replica set, almacenamiento local/S3 de pruebas. Dockerfile multistage, usuario no root, versiones pinneadas, lockfile, `npm ci`, CSS compilado, health/readiness. `.env.example` documentado sin secretos. Aplicación inicia tras comprobar configuración/DB; seed explícito y no destructivo, sin cuentas demo en producción.

- Cobertura: parcial. Evidencia de partida: server.js, config, routers y modelos.
- Plan: F1–F7. Depende de adr y topología. Riesgo: arranque parcial o persistencia inconsistente.
- Responsable propuesto: Arquitectura. Pruebas relacionadas: T09, T24, T27.

## ARC-06 · PENDING

Hosting: desarrollo y staging aislados en VPS Linux Contabo existente si se verifica capacidad, con Docker, red/volúmenes/credenciales independientes, límites y subdominio no indexable. Producción preferida: VPS Linux dedicado en costa este de EE. UU. (4 GB RAM/2 vCPU como hipótesis inicial para app + worker con DB separada; medir), Cloudflare DNS/TLS/CDN/WAF según plan, Nginx/Caddy, MongoDB Atlas y R2. Cotizar costos actuales y comparar backup, SLA, regiones, latencia RD y titularidad. No instalar en Windows/XAMPP por defecto. No comprometer recursos compartidos sin medir. Sin PaaS de disco efímero con uploads locales.

- Cobertura: pendiente. Evidencia de partida: server.js, config, routers y modelos.
- Plan: F1–F7. Depende de adr y topología. Riesgo: arranque parcial o persistencia inconsistente.
- Responsable propuesto: Arquitectura. Pruebas relacionadas: T09, T24, T27.

## ARC-07 · PENDING

Contratos de adaptadores `PaymentProvider`, `ShippingProvider`, `StorageProvider`, `MessagingProvider`, `GoogleReviewsProvider`, `EmailProvider`. Interfaz de capacidades declaradas, timeouts, errores normalizados, circuit breaker cuando aplique. Implementar sandbox y fallback controlado, no fingir que todos ofrecen webhooks, cotizaciones, reembolso o etiquetas. Configuración externa por entorno, no tokens en UI. Logs/metrics/tracing con correlation ID.

- Cobertura: pendiente. Evidencia de partida: server.js, config, routers y modelos.
- Plan: F1–F7. Depende de adr y topología. Riesgo: arranque parcial o persistencia inconsistente.
- Responsable propuesto: Arquitectura. Pruebas relacionadas: T09, T24, T27.

## ADM-01 · IN_PROGRESS

Panel responsive con dashboard: ventas confirmadas (no pedidos pendientes), neto/reembolsos, ticket medio definido, pedidos por estado, stock bajo, bocetos pendientes, pagos no conciliados, envíos pendientes, reseñas por moderar, fallos de integración. Filtros fecha/estado; zona RD para reportes. Exportación CSV protegida contra fórmula inyectada; datos personales solo roles autorizados.

- Cobertura: parcial. Evidencia de partida: src/routes/admin.js y views/admin.
- Plan: F2–F5. Depende de roles y modelo de dominio. Riesgo: mutaciones sin trazabilidad.
- Responsable propuesto: Operaciones. Pruebas relacionadas: T02, T13, T26.

## ADM-02 · IN_PROGRESS

CRUD productos, categorías/subcategorías, género, tags/tipos, precios, ofertas, variantes compuestas (metal/color/talla/modelo/volumen), fotos por variante, peso, dimensiones, disponibilidad, destacados/novedades, orden, duplicar como borrador, búsqueda y paginación. Archivo en vez de borrar referencias históricas. Importación CSV opcional (propuesta) con dry-run, validación por fila y deduplicación SKU; no obligatoria hasta aprobar alcance.

- Cobertura: parcial. Evidencia de partida: src/routes/admin.js y views/admin.
- Plan: F2–F5. Depende de roles y modelo de dominio. Riesgo: mutaciones sin trazabilidad.
- Responsable propuesto: Operaciones. Pruebas relacionadas: T02, T13, T26.

## ADM-03 · IN_PROGRESS

Inventario con saldo, reservas, movimientos, ajustes con motivo/actor, alertas y trazabilidad. Impedir ajuste que deje onHand por debajo de reservado, salvo flujo de incidente autorizado que resuelve reservas. No modificar stock directamente desde UI sin movimiento registrado.

- Cobertura: parcial. Evidencia de partida: src/routes/admin.js y views/admin.
- Plan: F2–F5. Depende de roles y modelo de dominio. Riesgo: mutaciones sin trazabilidad.
- Responsable propuesto: Operaciones. Pruebas relacionadas: T02, T13, T26.

## ADM-04 · IN_PROGRESS

Admin de plantilla de personalización y zonas; editor, preview, versionado, clonación, fuentes, costo, campos condicionales, tamaños, configuración por variante. Separar diseñador/taller de administradores de pago.

- Cobertura: parcial. Evidencia de partida: src/routes/admin.js y views/admin.
- Plan: F2–F5. Depende de roles y modelo de dominio. Riesgo: mutaciones sin trazabilidad.
- Responsable propuesto: Operaciones. Pruebas relacionadas: T02, T13, T26.

## ADM-05 · IN_PROGRESS

Pedidos: detalle por línea, datos autorizados, archivos originales y derivados privados, historial, bocetos, pagos, reembolsos, envíos, tracking, resumen/recibo PDF si se incluye y aprueba fiscalidad, comunicación y notas internas. Nunca usar una lista de pedidos como sustituto de workflow ni permitir saltos de estado arbitrarios.

- Cobertura: parcial. Evidencia de partida: src/routes/admin.js y views/admin.
- Plan: F2–F5. Depende de roles y modelo de dominio. Riesgo: mutaciones sin trazabilidad.
- Responsable propuesto: Operaciones. Pruebas relacionadas: T02, T13, T26.

## ADM-06 · IN_PROGRESS

Clientes: historial, búsqueda segura, contacto, direcciones, consentimiento, incidencias, notas, solicitudes de acceso/corrección/borrado con límites legales de retención. Roles propuestos: owner, catálogo/CMS, taller, atención, logística, finanzas, moderación, lectura. Permisos mínimos por acción y recurso (backend, no solo botones). MFA admin, auditoría para ajustes, pagos, reembolsos, cambios de políticas y exportaciones. Confirmar roles efectivos con propietario, un owner inicial autorizado.

- Cobertura: parcial. Evidencia de partida: src/routes/admin.js y views/admin.
- Plan: F2–F5. Depende de roles y modelo de dominio. Riesgo: mutaciones sin trazabilidad.
- Responsable propuesto: Operaciones. Pruebas relacionadas: T02, T13, T26.

## ADM-07 · PENDING

Panel de integraciones: estado conectado/desconectado/sandbox/live, última sincronización, mensajes fallidos, reintentos controlados, pruebas explícitas, alertas, permisos. Nunca mostrar token completo ni permitir que cualquier admin altere endpoint o secretos; no enviar mensajes reales desde botón de prueba sin confirmación.

- Cobertura: pendiente. Evidencia de partida: src/routes/admin.js y views/admin.
- Plan: F2–F5. Depende de roles y modelo de dominio. Riesgo: mutaciones sin trazabilidad.
- Responsable propuesto: Operaciones. Pruebas relacionadas: T02, T13, T26.

## CUS-01 · IN_PROGRESS

Configurador visible dentro de la página del producto, sin salir a otra aplicación. Si no personalizable, no renderizar campos ni aceptar payload. Cada SKU selecciona plantilla publicada compatible. Admin define campos obligatorios/opcionales, límites, orden, dependencia condicional, ayudas, precio por opción y zona. Tipos: texto/nombre/iniciales, fecha, frase, selector, fuente, símbolo permitido, foto, logo/diseño raster, texto multilínea, checkbox. Requerimientos soportados: solo texto, texto+texto, texto+imagen, solo imagen, múltiples zonas y lados cuando la plantilla lo permita. No habilitar archivos vectoriales activos/arbitrarios hasta implementar sanitización segura.

- Cobertura: parcial. La ficha ahora incluye implementación local de una vista previa tipográfica por cada campo existente, y el selector aplica la fuente a todas las caras; la administración aclara cómo nombrar cada cara. Esta implementación no se ha probado en navegador, carrito ni pedido y no está verificada. No cubre plantillas publicadas, precios por opción, zonas con tipografía independiente ni reproducción histórica. Ver T05 en TEST_MATRIX y ADR-008.
- Plan: F3. Depende de plantilla, sku y reglas de taller. Riesgo: diseño irreproducible o privado expuesto.
- Responsable propuesto: Taller/ingeniería. Pruebas relacionadas: T05, T06, T07, T13.

## CUS-02 · PENDING

Editor 2D Canvas/SVG (Konva.js o equivalente tras spike), con foto frontal/posterior por variante, zona delimitada con coordenadas normalizadas, orientación, tamaño físico cuando el taller lo suministre, máscara/recorte, zoom, rotación y alineación dentro de límites; fuentes reales con licencia, precarga, cobertura de caracteres españoles. No confundir imagen ilustrativa con fotograbado exacto. Accesibilidad: alternativa de controles de formulario y descripción textual a arrastrar/soltar; móvil táctil.

- Cobertura: pendiente. Evidencia de partida: Product, ficha, módulos JS de personalización.
- Plan: F3. Depende de plantilla, sku y reglas de taller. Riesgo: diseño irreproducible o privado expuesto.
- Responsable propuesto: Taller/ingeniería. Pruebas relacionadas: T05, T06, T07, T13.

## CUS-03 · PENDING

Contrato de plantilla: `templateVersionId`, `variantIds`, `sides[]` con backgroundAssetId y zonas normalizadas (0–1), `fields[]` con stableKey/type/required/maxLength/allowedValues/allowedFonts/maxFiles/visibilityRules/priceDeltaMinor/zoneId, reglas de composición sin ciclos, previewMode, approvalRequired, productionLeadTime. Validar dimensiones, claves únicas, condiciones, pertenencia de fuentes, posición y combinaciones. No ejecutar código arbitrario en reglas. Publicar versión nueva no cambia pedidos ni drafts históricos; checkout exige versión vigente o confirmación/migración explícita, jamás reinterpretar diseño silenciosamente.

- Cobertura: pendiente. Evidencia de partida: Product, ficha, módulos JS de personalización.
- Plan: F3. Depende de plantilla, sku y reglas de taller. Riesgo: diseño irreproducible o privado expuesto.
- Responsable propuesto: Taller/ingeniería. Pruebas relacionadas: T05, T06, T07, T13.

## CUS-04 · IN_PROGRESS

Carga móvil/desktop con progreso, reemplazo y error recuperable. JPG/PNG/WebP inicialmente; HEIC solo tras prueba de decodificación o conversión local; advertir formato no admitido. Propuesta inicial configurable: 10 MB/archivo, 20 MP máximo, 3 archivos por zona solo si plantilla lo permite. Validar magic bytes/decodificación/dimensiones, límites de request, rechazar polyglots/archivos ejecutables, corregir orientación y eliminar EXIF de derivados, cuarentena y escaneo/normalización. Original privado solo si necesario para taller; no servir directamente por URL pública. Restricción de pertenencia al draft; no aceptar objectKey/URL ajena. Confirmar política de originales con taller. No impedir todo el flujo por fallo de preview: ofrecer reintento o modo asesorado explícito conservando especificaciones.

- Cobertura: parcial. Las cargas nuevas se guardan en `storage/customizations` y se sirven mediante sesión del comprador o permiso `orders.view`; los archivos legacy bajo `public/uploads/customizations` pasan por la misma autorización. No se ha probado validación por magic bytes/decodificación, limpieza EXIF, escaneo, límites de píxeles ni matriz completa de pertenencia.
- Plan: F3. Depende de plantilla, sku y reglas de taller. Riesgo: diseño irreproducible o privado expuesto.
- Responsable propuesto: Taller/ingeniería. Pruebas relacionadas: T05, T06, T07, T13.

## CUS-05 · IN_PROGRESS

Precio en tiempo real como estimación de cliente; servidor calcula precio definitivo desde variante, opciones, promociones y reglas. No confiar en `customizationSummary`, `fontName`, precio o total enviados por navegador. Validar caracteres, longitud por grafemas según máquina, fechas, assets listos, opciones permitidas, composición dentro de zona. No auto-seleccionar SKU inválido ni truncar cantidad silenciosamente. Los campos ocultos por reglas no se cobran ni persisten como activos.

- Cobertura: parcial. Evidencia de partida: Product, ficha, módulos JS de personalización.
- Plan: F3. Depende de plantilla, sku y reglas de taller. Riesgo: diseño irreproducible o privado expuesto.
- Responsable propuesto: Taller/ingeniería. Pruebas relacionadas: T05, T06, T07, T13.

## CUS-06 · IN_PROGRESS

Al agregar al carrito crear snapshot de configuración o referencia inmutable, con valores tipados, templateVersion, fuente/versión, coordenadas, assetIds, hash, preview renderizada/estado de render, precio y resumen legible. Dos nombres diferentes del mismo SKU son dos líneas, pero agregan demanda de stock del mismo SKU. Cantidad >1 significa mismo diseño repetido; otro diseño requiere línea nueva. Editar crea revisión y recotiza. No compartir archivos de otros usuarios. El servidor debe poder reproducir el boceto desde datos y activos versionados; la miniatura cliente no es fuente de verdad.

- Cobertura: parcial. Evidencia de partida: Product, ficha, módulos JS de personalización.
- Plan: F3. Depende de plantilla, sku y reglas de taller. Riesgo: diseño irreproducible o privado expuesto.
- Responsable propuesto: Taller/ingeniería. Pruebas relacionadas: T05, T06, T07, T13.

## CUS-07 · PENDING

Taller: revisar especificaciones, descargar original autorizado, crear boceto de producción (revisión 1, 2...), enviar enlace seguro de aprobación/rechazo con comentario, registrar revisión exacta, actor, fecha y hash. El cliente puede solicitar cambios antes de aprobación. Si altera costo/alcance, emitir propuesta de modificación con aceptación y diferencia de pago/reembolso autorizados; no editar pedido original ni cobrar automáticamente. Después de aprobación, cambios requieren reapertura auditada y nueva aprobación, no fabricar revisión obsoleta. Política de cambios después de fabricación configurable y aprobada.

- Cobertura: pendiente. Evidencia de partida: Product, ficha, módulos JS de personalización.
- Plan: F3. Depende de plantilla, sku y reglas de taller. Riesgo: diseño irreproducible o privado expuesto.
- Responsable propuesto: Taller/ingeniería. Pruebas relacionadas: T05, T06, T07, T13.

## CUS-08 · PENDING

Gate de fabricación por línea: solo con pago suficiente según política aprobada (por defecto pago completo para personalizado), reserva/stock asignado y boceto aprobado si obligatorio. Un artículo estándar no pasa por boceto. Pedido mixto: despacho conjunto por defecto hasta todas las líneas listas; envío parcial solo con reglas/costos y confirmación explícita. Lead time total considera fabricación + tránsito. Separar archivo comercial de arte listo para láser; no prometer exactitud de contraste, resolución o máquina sin validación del taller.

- Cobertura: pendiente. Evidencia de partida: Product, ficha, módulos JS de personalización.
- Plan: F3. Depende de plantilla, sku y reglas de taller. Riesgo: diseño irreproducible o privado expuesto.
- Responsable propuesto: Taller/ingeniería. Pruebas relacionadas: T05, T06, T07, T13.

## CUS-09 · PENDING

Archivos: lifecycle draft abandonado → cleanup tras plazo configurable (propuesta 7 días), con comprobación transaccional de referencias; pedidos y revisiones se conservan según política aprobada, nunca borrar por TTL ciego. No reutilizar foto del cliente para marketing/reseña sin consentimiento específico. Solicitar autorización para usar fotos/logos de terceros; manejo de denuncias y retiro. Evaluar consentimiento y privacidad legal.

- Cobertura: pendiente. Evidencia de partida: Product, ficha, módulos JS de personalización.
- Plan: F3. Depende de plantilla, sku y reglas de taller. Riesgo: diseño irreproducible o privado expuesto.
- Responsable propuesto: Taller/ingeniería. Pruebas relacionadas: T05, T06, T07, T13.

## INV-01 · IN_PROGRESS

Cada SKU físico tiene onHand, reserved, available; `onHand >= reserved >= 0`. Tipo stock (pieza existente) o bajo pedido solo con capacidad/plazos aprobados; por defecto inventario físico, no aceptar ventas ilimitadas. Pieza base de joyería personalizada reserva el SKU correspondiente, no un stock distinto ficticio. Si dos productos comparten materia prima, definir SKU base/BOM únicamente con reglas confirmadas; no duplicar existencias.

- Cobertura: parcial. Evidencia de partida: Product.stock y store.js.
- Plan: F4. Depende de identidad sku y transacciones. Riesgo: sobreventa o doble descuento.
- Responsable propuesto: Inventario. Pruebas relacionadas: T06, T09, T10, T12.

## INV-02 · IN_PROGRESS

Al carrito NO descontar ni reservar por defecto. Checkout suma cantidades por SKU incluso si diseños diferentes. Una transacción verifica y crea order + reservas + cupón reservado + outbox; updates condicionales por disponibilidad. Propuesta reserva inicial 30 min para pago online, plazo específico para transferencia/manual (propuesta 24h, confirmación comercial); job de expiración libera solo reservas activas, nunca una consumida. No usar `Math.max(0, stock-qty)` para ocultar sobreventa. Retener stock mientras pago está en verificación solo mediante regla acotada y reconciliación.

- Cobertura: parcial. El checkout ahora bloquea filas de producto y confirma en una sola transacción pedido, stock y `inventory_movements`; `checkout_key` única evita doble envío simultáneo. T09 reducido a dos solicitudes se ejecutó en laboratorio. No hay reservas temporales, outbox, vencimiento, consumo por confirmación de pago ni 20 solicitudes concurrentes; no satisface el flujo integral solicitado.
- Plan: F4. Depende de identidad sku y transacciones. Riesgo: sobreventa o doble descuento.
- Responsable propuesto: Inventario. Pruebas relacionadas: T06, T09, T10, T12.

## INV-03 · PENDING

Cuando pago se verifica y se acepta pedido, transacción consume reserva (`onHand -= qty`, `reserved -= qty`) y registra movimiento único. Pago contra entrega, si se habilita, consume al confirmar pedido autorizado, no al carrito. Si cobro tardío tras liberar reserva, intentar reasignar atómicamente; si no hay stock, estado de excepción y reembolso/atención con autorización, nunca confirmar venta imposible. Para personalizado con depósito (si se aprueba) definir umbral y saldo; la política por defecto es pago total. No liberar inventario por un webhook fallido posterior a pago confirmado.

- Cobertura: pendiente. Evidencia de partida: Product.stock y store.js.
- Plan: F4. Depende de identidad sku y transacciones. Riesgo: sobreventa o doble descuento.
- Responsable propuesto: Inventario. Pruebas relacionadas: T06, T09, T10, T12.

## INV-04 · PENDING

Cancelación antes de consumo libera reserva; después de consumo solo repone con movimiento autorizado si pieza está físicamente reutilizable. Personalizado fabricado no vuelve a stock vendible automáticamente; devoluciones en cuarentena, inspección y disposición. Reembolso financiero no implica reposición automática. Idempotencia por evento y línea.

- Cobertura: pendiente. Evidencia de partida: Product.stock y store.js.
- Plan: F4. Depende de identidad sku y transacciones. Riesgo: sobreventa o doble descuento.
- Responsable propuesto: Inventario. Pruebas relacionadas: T06, T09, T10, T12.

## INV-05 · PENDING

Auditoría y reconciliación diaria de saldo, reservas, movimientos, pagos y pedidos; alerta ante invariantes rotas. Ajustes manuales requieren actor/motivo y permiso; no corregir diferencias modificando historial. Prueba de 20 solicitudes simultáneas con una unidad y carritos de diseños múltiples: a lo sumo una asignación, sin negativos ni reservas huérfanas.

- Cobertura: pendiente. Evidencia de partida: Product.stock y store.js.
- Plan: F4. Depende de identidad sku y transacciones. Riesgo: sobreventa o doble descuento.
- Responsable propuesto: Inventario. Pruebas relacionadas: T06, T09, T10, T12.

## CART-01 · IN_PROGRESS

Carrito anónimo por token/sesión seguro, persistente por plazo configurable; cliente puede recuperar por sesión autorizada. Registro/cuenta opcional no obligatorio para checkout; si se incorpora, fusionar solo carritos propios con política determinista, verificar stock/precios y no mezclar diseños. Versionado para dos pestañas; no pisar actualizaciones concurrentes.

- Cobertura: parcial. Evidencia de partida: store.js, cart.ejs y drawer.
- Plan: F3/F4. Depende de sesión, sku, cotización. Riesgo: precio obsoleto o diseños mezclados.
- Responsable propuesto: Comercio. Pruebas relacionadas: T03, T06, T08.

## CART-02 · IN_PROGRESS

Precio en centavos: `unit = precio SKU vigente + extras válidos`, `lineGross = unit × qty`, descuentos elegibles según regla y base, subtotal/descuento/impuesto/envío separados, `total = subtotal - descuentos + impuestos no incluidos + envío`, nunca negativo. Si precios incluyen ITBIS no sumar de nuevo; desglosar según política fiscal aprobada por contable. Definir aplicación sobre extras/envío y redondeo con ejemplos; no fijar tasa fiscal sin validación. Costo logístico no es margen de producto.

- Cobertura: parcial. Evidencia de partida: store.js, cart.ejs y drawer.
- Plan: F3/F4. Depende de sesión, sku, cotización. Riesgo: precio obsoleto o diseños mezclados.
- Responsable propuesto: Comercio. Pruebas relacionadas: T03, T06, T08.

## CART-03 · IN_PROGRESS

Ofertas: precio anterior real y superior al actual, vigencia y zona horaria, promoción/cupón con límites, stock, exclusiones, no acumulación por defecto salvo configuración explícita; elegir prioridad determinista. Límite global/cuenta validado en transacción con hold temporal. No permitir autopromociones de valor negativo, fechas inválidas ni precios ficticios. Evitar cupones repetidos con contacto no verificado; definir política de identificación.

- Cobertura: parcial. Evidencia de partida: store.js, cart.ejs y drawer.
- Plan: F3/F4. Depende de sesión, sku, cotización. Riesgo: precio obsoleto o diseños mezclados.
- Responsable propuesto: Comercio. Pruebas relacionadas: T03, T06, T08.

## CART-04 · IN_PROGRESS

Cotización server-side con ID, version, vencimiento y desglose. Recalcular en checkout y comparar; si precio, diseño, disponibilidad o envío cambian, mostrar diff y solicitar reconfirmación, no cobrar importe distinto. No aceptar total cliente. Pago usa snapshot confirmado, no precio mutable. Si falla checkout preservar carrito; limpiarlo solo después de orden durable, permitir reintentar pago de esa orden.

- Cobertura: parcial. Evidencia de partida: store.js, cart.ejs y drawer.
- Plan: F3/F4. Depende de sesión, sku, cotización. Riesgo: precio obsoleto o diseños mezclados.
- Responsable propuesto: Comercio. Pruebas relacionadas: T03, T06, T08.

## ORD-01 · IN_PROGRESS

Compra invitado: nombre, teléfono normalizado, correo recomendado (exigirlo si canal de recuperación elegido lo necesita), dirección según entrega, notas, consentimiento separado para comunicaciones operativas y marketing, políticas/versiones aceptadas. No exigir cédula salvo necesidad fiscal/legal confirmada. Validación servidor y cliente, mensajes en español, resumen final y total antes de pagar.

- Cobertura: parcial. Evidencia de partida: Order y rutas de checkout/admin.
- Plan: F4. Depende de reserva y titular de pedido. Riesgo: orden duplicada o historial inconsistente.
- Responsable propuesto: Comercio. Pruebas relacionadas: T08, T09, T12, T14, T22.

## ORD-02 · PENDING

Confirmación idempotente por token de intento/quote+cartVersion+owner (scope con unique constraint); duplicar click, recarga o retry devuelve mismo pedido. Si misma clave y payload distinto: conflicto. Crear orderNumber no adivinable para acceso; número comercial no es credencial. Enlace de consulta/aprobación con token aleatorio fuerte, hash en DB, propósito/expiración/revocación y autorización por recurso; no mostrar pedido por ObjectId público. Recuperación por OTP/enlace a canal verificado, rate limited, sin enumerar usuarios. Quitar ruta antigua insegura o exigir sesión/token.

- Cobertura: parcial. El checkout usa token aleatorio de sesión y clave idempotente persistida con índice único; confirmación y foto quedan ligadas a `recentOrderIds` de la sesión. Se probaron doble envío concurrente y acceso anónimo denegado en laboratorio. No compara payload distinto para una clave, no tiene orderNumber, recuperación OTP/enlace temporal ni flujo de consentimiento/propiedad completo.
- Plan: F4. Depende de reserva y titular de pedido. Riesgo: orden duplicada o historial inconsistente.
- Responsable propuesto: Comercio. Pruebas relacionadas: T08, T09, T12, T14, T22.

## ORD-03 · IN_PROGRESS

Snapshots completos, `order.total` inmutable para transacción original; ajustes como entidades adicionales auditadas. Separar notas internas de las visibles al cliente. Cliente ve estado real y próxima acción. Enlace de WhatsApp asesoría puede llevar referencia opaca, no datos privados ni imágenes en query string.

- Cobertura: parcial. Evidencia de partida: Order y rutas de checkout/admin.
- Plan: F4. Depende de reserva y titular de pedido. Riesgo: orden duplicada o historial inconsistente.
- Responsable propuesto: Comercio. Pruebas relacionadas: T08, T09, T12, T14, T22.

## ORD-04 · IN_PROGRESS

Modelar estados independientes y transiciones permitidas (tabla siguiente); backend aplica guards por rol, evento, dinero e inventario. Derivar estado comercial visible de subestados; ninguna operación puede saltar gates mediante edición genérica de estado. Registrar actor, motivo, evento y timestamp. Evento y outbox atómicos.

- Cobertura: parcial. Evidencia de partida: Order y rutas de checkout/admin.
- Plan: F4. Depende de reserva y titular de pedido. Riesgo: orden duplicada o historial inconsistente.
- Responsable propuesto: Comercio. Pruebas relacionadas: T08, T09, T12, T14, T22.

## ORD-05 · PENDING

Gestión de cancelaciones, incidencias, devoluciones y reembolsos totales/parciales; no asumir aceptación de devolución personalizada. Política, plazos y garantías por escrito, legalmente revisados. Reembolsar máximo neto capturado, no duplicar. Si cancelación compite con captura, reconciliar antes de decidir; bloquear fabricación. Si hay envío en curso, iniciar incidencia, no marcar cancelado sin resolver logística.

- Cobertura: pendiente. Evidencia de partida: Order y rutas de checkout/admin.
- Plan: F4. Depende de reserva y titular de pedido. Riesgo: orden duplicada o historial inconsistente.
- Responsable propuesto: Comercio. Pruebas relacionadas: T08, T09, T12, T14, T22.

## ORD-06 · IN_PROGRESS

Historial cliente/admin, timeline y número tracking, comprobante comercial y resumen de diseño. Factura fiscal electrónica DGII solo si se confirma obligación y alcance/servicio; no denominar fiscal a un recibo simple. Recibo/documento puede incluir miniatura de diseño únicamente con aprobación y acceso privado. Notificaciones con enlace seguro, no adjuntos sensibles por defecto.

- Cobertura: parcial. Evidencia de partida: Order y rutas de checkout/admin.
- Plan: F4. Depende de reserva y titular de pedido. Riesgo: orden duplicada o historial inconsistente.
- Responsable propuesto: Comercio. Pruebas relacionadas: T08, T09, T12, T14, T22.

## PAY-01 · PENDING

Implementar una pasarela dominicana primero: evaluar AZUL página de pagos alojada frente a CardNET, según afiliación, sandbox, contrato, costos, métodos y certificación. PayPal u otra alternativa internacional solo tras confirmar elegibilidad. No asumir Stripe para empresa dominicana. No manipular PAN/CVV, usar checkout alojado/tokenización del proveedor y verificar alcance PCI. Pago transferencia manual, comprobante privado opcional, conciliación por rol finanzas. COD solo por zona y tipo de producto aprobado; por defecto desactivado en personalizados. Checkout no ofrece métodos sin configurar.

- Cobertura: pendiente. Evidencia de partida: Order.paymentMethod; flujo COD fijo.
- Plan: F4/F5. Depende de afiliación y conciliación. Riesgo: cobro duplicado o importe incorrecto.
- Responsable propuesto: Finanzas. Pruebas relacionadas: T10, T11, T12.

## PAY-02 · PENDING

Adaptador `createPayment`, `verifyReturn`, `queryStatus`, `refund`, `void`, `parseEvent` según capacidades reales. No inventar endpoint/webhook; si AZUL usa retorno firmado y consulta de transacción, implementar según manual/contrato vigentes. Firma/hash, merchant reference, importe, moneda y comercio verificados con documentación real; retorno de navegador no prueba cobro por sí solo. Eventos validados en servidor. Sandbox separado de live, IDs de comercio y certificados en secretos.

- Cobertura: pendiente. Evidencia de partida: Order.paymentMethod; flujo COD fijo.
- Plan: F4/F5. Depende de afiliación y conciliación. Riesgo: cobro duplicado o importe incorrecto.
- Responsable propuesto: Finanzas. Pruebas relacionadas: T10, T11, T12.

## PAY-03 · PENDING

Creación de intento persistente antes de llamada externa; idempotencia y referencia única por orden/intento. Timeouts/caídas dejan `unknown`, consultar antes de repetir cobro. Validar respuesta autentificada y deduplicar transactionId/eventId; procesar eventos fuera de orden. Captura válida + transacción local de inventario y outbox; si falla DB, reintento reconciliable. Si llegan dos capturas independientes por misma orden, incidente y reembolso de excedente autorizado, no ignorar dinero ni duplicar fabricación.

- Cobertura: pendiente. Evidencia de partida: Order.paymentMethod; flujo COD fijo.
- Plan: F4/F5. Depende de afiliación y conciliación. Riesgo: cobro duplicado o importe incorrecto.
- Responsable propuesto: Finanzas. Pruebas relacionadas: T10, T11, T12.

## PAY-04 · PENDING

Reembolso total/parcial con motivo, monto máximo, permiso finanzas y confirmación, provider ref, reconciliación; aprobación de cancelación no presupone reembolso liquidado. Registrar operaciones sin datos de tarjeta, no emitir dos reembolsos por reintento. Manejo de contracargos/disputas y evidencia con acceso restringido.

- Cobertura: pendiente. Evidencia de partida: Order.paymentMethod; flujo COD fijo.
- Plan: F4/F5. Depende de afiliación y conciliación. Riesgo: cobro duplicado o importe incorrecto.
- Responsable propuesto: Finanzas. Pruebas relacionadas: T10, T11, T12.

## PAY-05 · PENDING

Conciliación diaria de transacciones/depósitos, estados pendientes y monto, alertas, exportación protegida; aprobación manual de transferencia solo con prueba bancaria real, no por foto/OCR ni texto WhatsApp. No considerar pedido pagado por screenshot. Si se acepta depósito parcial futuro: propuesta aprobada de %/monto, saldo, vencimiento y gates de fabricación/entrega; desactivado en lanzamiento salvo decisión documentada.

- Cobertura: pendiente. Evidencia de partida: Order.paymentMethod; flujo COD fijo.
- Plan: F4/F5. Depende de afiliación y conciliación. Riesgo: cobro duplicado o importe incorrecto.
- Responsable propuesto: Finanzas. Pruebas relacionadas: T10, T11, T12.

## PAY-06 · PENDING

Sandbox: aprobado, rechazado, cancelado, timeout, callback falsificado, importe/moneda distintos, webhook duplicado/fuera de orden, doble click, captura tardía, devolución parcial, caída DB posterior a pago, reconciliación, proveedor sin API de reembolso (proceso manual auditado). Live solo tras certificación y autorización; no inventar evidencia ni hacer cobro de prueba sin permiso.

- Cobertura: pendiente. Evidencia de partida: Order.paymentMethod; flujo COD fijo.
- Plan: F4/F5. Depende de afiliación y conciliación. Riesgo: cobro duplicado o importe incorrecto.
- Responsable propuesto: Finanzas. Pruebas relacionadas: T10, T11, T12.

## SHP-01 · PENDING

Catálogo territorial oficial/validado de 31 provincias + Distrito Nacional, municipios y zonas aplicables, versionado. Dirección: país RD, provincia/DN, municipio, sector/barrio, calle, número/apto, referencia, teléfono; campos según servicio. Ubicación/coords opcionales con consentimiento; no obligar Google Maps. Retiro solo si negocio confirma local/horario. No confundir provincia Santo Domingo y DN.

- Cobertura: pendiente. Evidencia de partida: SiteSettings.shippingOptions y checkout.
- Plan: F4/F5. Depende de cobertura, dirección y tarifas. Riesgo: flete erróneo o entrega inviable.
- Responsable propuesto: Logística. Pruebas relacionadas: T14, T15, T16.

## SHP-02 · IN_PROGRESS

Tarifas manuales configurables por zona/municipio, modalidad, transportista, peso/volumen, umbrales de envío gratis y COD. Precedencia inequívoca (regla más específica, prioridad explícita, rechazar empate) y vigencia. Cotización server-side con ID, precio, ventana/estimación de entrega, vencimiento. Sin tarifa activa: bloquear esa modalidad, ofrecer asesoría sin confirmar total; no fallback gratis. Gratis solo por regla intencional de 0. Verificar cobertura real para productos frágiles y fragancias (restricciones de líquidos/inflamables según proveedor). No anunciar garantía universal de entrega si una dirección/producto no es aceptado por operador.

- Cobertura: parcial. Evidencia de partida: SiteSettings.shippingOptions y checkout.
- Plan: F4/F5. Depende de cobertura, dirección y tarifas. Riesgo: flete erróneo o entrega inviable.
- Responsable propuesto: Logística. Pruebas relacionadas: T14, T15, T16.

## SHP-03 · PENDING

Adaptador para proveedor contratado (evaluar MBE RD, LogiHub u operadores que cliente use, sin asumir contratos/API). Tarifas manuales funcionales aun sin API. Cotizar, crear guía/etiqueta y tracking solo si capacidad verificada; si no, captura manual auditada. Envío a todo RD es objetivo de cobertura con reglas y pruebas, no tarifa uniforme. Confirmar empresa, cobertura, seguro, pérdida, devoluciones, límites y costos reales. Peso y dimensiones obligatorios para cotizaciones que los requieran.

- Cobertura: pendiente. Evidencia de partida: SiteSettings.shippingOptions y checkout.
- Plan: F4/F5. Depende de cobertura, dirección y tarifas. Riesgo: flete erróneo o entrega inviable.
- Responsable propuesto: Logística. Pruebas relacionadas: T14, T15, T16.

## SHP-04 · PENDING

Crear guía después de gates de pago/producción, idempotente; no duplicar etiquetas ni cobro de flete. Tracking/estado por webhook autenticado o polling con backoff, normalizar eventos y no retroceder. Costo cliente snapshot no se altera por costo real; diferencia administrativa. Dirección cambiada tras cotizar requiere recotización y aceptación, después de despacho incidencia. Envío parcial no se activa sin política de costos y asignación de líneas/cantidades.

- Cobertura: pendiente. Evidencia de partida: SiteSettings.shippingOptions y checkout.
- Plan: F4/F5. Depende de cobertura, dirección y tarifas. Riesgo: flete erróneo o entrega inviable.
- Responsable propuesto: Logística. Pruebas relacionadas: T14, T15, T16.

## SHP-05 · PENDING

Casos: DN, SD Este/Oeste/Norte, interior, retiro, tarifa 0 aprobada, sin regla, provincia/municipio incompatible, cotización expirada, fragancia restringida, carrier caído, guía duplicada, entrega fallida, devolución, envío parcial desactivado. Publicar solo zonas verificadas.

- Cobertura: pendiente. Evidencia de partida: SiteSettings.shippingOptions y checkout.
- Plan: F4/F5. Depende de cobertura, dirección y tarifas. Riesgo: flete erróneo o entrega inviable.
- Responsable propuesto: Logística. Pruebas relacionadas: T14, T15, T16.

## REV-01 · IN_PROGRESS

Estrellas tipo Amazon: 1–5 enteras seleccionadas explícitamente; no preseleccionar 5. Ficha muestra promedio de reseñas publicadas elegibles, total, histograma por estrella, filtros 1–5, orden reciente/útil si se incluye, paginación, comentarios y fotos opcionales. `average = sum/count`; redondeo visual a un decimal, no redondear individualmente. Porcentajes = countStar/count (ajustar presentación si redondeo); sin reseñas mostrar “Sin valoraciones”, no cero estrellas ficticias. Filtrar no altera promedio global. Rating en tarjetas solo si count>0.

- Cobertura: parcial. Evidencia de partida: Review, store.js y admin.js.
- Plan: F6. Depende de entrega, invitación y moderación. Riesgo: puntuación sesgada o duplicada.
- Responsable propuesto: Moderación. Pruebas relacionadas: T19, T20.

## REV-02 · PENDING

Compra verificada: invitación de un uso lógico tras entrega/retiro, token aleatorio con hash, propósito, vencimiento (propuesta 30 días), canal autorizado, rate limit. Una valoración por comprador/pedido/producto elegible (agrupar líneas del mismo producto en ese pedido; cantidad no multiplica opiniones); una de servicio por pedido entregado. Validar comprador y cumplimiento en servidor, nunca aceptar orderId/flag verified del navegador. Edición mediante acceso verificado y nueva moderación; no duplicar contador. Reintento de mismo token devuelve estado de envío, no crea otra reseña. Reseñas legacy sin evidencia identificadas como no verificadas, no convertir artificialmente.

- Cobertura: pendiente. Evidencia de partida: Review, store.js y admin.js.
- Plan: F6. Depende de entrega, invitación y moderación. Riesgo: puntuación sesgada o duplicada.
- Responsable propuesto: Moderación. Pruebas relacionadas: T19, T20.

## REV-03 · PENDING

Valoración de servicio separada de producto: experiencia global 1–5 obligatoria; atención, personalización (si aplica), entrega (si aplica) opcionales 1–5 o no aplicable. No convertir NA en 0; promedios por dimensión con denominador propio, experiencia global solo de su campo explícito. Producto entregado con devolución posterior puede conservar opinión genuina; cancelado sin entrega no da “compra verificada” de producto. Atención a incidencias puede usar encuesta privada no confundida con reseña de compra.

- Cobertura: pendiente. Evidencia de partida: Review, store.js y admin.js.
- Plan: F6. Depende de entrega, invitación y moderación. Riesgo: puntuación sesgada o duplicada.
- Responsable propuesto: Moderación. Pruebas relacionadas: T19, T20.

## REV-04 · IN_PROGRESS

Moderación objetiva: pending/published/rejected/removed; razones por spam, datos personales, contenido ilícito/abusivo, no por puntuación negativa. Política visible, revisión auditable, opción de reportar, respuesta del negocio claramente identificada. No editar estrellas ni texto del comprador; cambios solo por autor o redacción de datos sensibles identificada y auditada según política. No inventar testimonios/ratings. Fotos de reseña se moderan, procesan y publican solo con permiso explícito; no reutilizar archivos de grabado automáticamente.

- Cobertura: parcial. Evidencia de partida: Review, store.js y admin.js.
- Plan: F6. Depende de entrega, invitación y moderación. Riesgo: puntuación sesgada o duplicada.
- Responsable propuesto: Moderación. Pruebas relacionadas: T19, T20.

## REV-05 · IN_PROGRESS

Agregados recalculados tras publicar/retirar/editar; idempotentes, índices y job de reconciliación. Si todas se eliminan volver a estado sin reseñas. JSON-LD Product/aggregateRating solo de datos visibles y válidos de ese producto. No copiar puntuaciones Google a Product ni usar LocalBusiness self-serving markup para prometer estrellas en resultados de Google.

- Cobertura: parcial. Evidencia de partida: Review, store.js y admin.js.
- Plan: F6. Depende de entrega, invitación y moderación. Riesgo: puntuación sesgada o duplicada.
- Responsable propuesto: Moderación. Pruebas relacionadas: T19, T20.

## REV-06 · PENDING

Invitación neutral a todas las compras elegibles, no únicamente satisfechos. Propuesta: 48 h tras entrega, un recordatorio máximo configurable, omitir si ya respondió, no consentimiento, baja o pedido en incidencia cuando se justifique sin filtrar por sentimiento. Link interno y Google independientes, disponibles con igualdad de acceso; no exigir primero un rating alto para mostrar Google. No recompensar reseñas ni exigir retirada/cambio de negativa. El rechazo de marketing no debe impedir compra; clasificación de plantilla según Meta y consentimiento aplicable.

- Cobertura: pendiente. Evidencia de partida: Review, store.js y admin.js.
- Plan: F6. Depende de entrega, invitación y moderación. Riesgo: puntuación sesgada o duplicada.
- Responsable propuesto: Moderación. Pruebas relacionadas: T19, T20.

## REV-07 · PENDING

Pruebas: usuario sin compra, token robado/expirado, doble envío, rating 0/6/decimal/faltante, reseña negativa válida, moderación por motivo, foto privada, promedio/histograma tras editar/retirar, servicio NA, compra múltiple, Google separado y solicitud no discriminatoria.

- Cobertura: pendiente. Evidencia de partida: Review, store.js y admin.js.
- Plan: F6. Depende de entrega, invitación y moderación. Riesgo: puntuación sesgada o duplicada.
- Responsable propuesto: Moderación. Pruebas relacionadas: T19, T20.

## GGL-01 · PENDING

Google Business Profile: propietario reclama/verifica perfil, confirma nombre/dirección/categoría/ubicación y obtiene enlace/QR oficial para emitir reseña. Mostrar CTA “Valorar en Google” que abre el flujo oficial. **La API no permite crear reseñas de compradores en nombre de ellos**. Google Login, Places, Merchant Center o GA4 no sustituyen ese flujo. Google Login no se requiere para comprar ni valorar internamente.

- Cobertura: pendiente. Evidencia de partida: Sin adaptador identificado.
- Plan: F5. Depende de perfil y autorización del titular. Riesgo: mostrar datos ajenos o caducos.
- Responsable propuesto: Titular Google. Pruebas relacionadas: T21.

## GGL-02 · PENDING

Proyecto Google Cloud, solicitar acceso Business Profile API y aprobación, OAuth 2.0 con scope autorizado (business.manage según documentación), state/PKCE cuando corresponda, callback seguro, refresh token cifrado, roles de owner, desconexión y revocación. Verificar locationId/accountId de Gatón DO, nunca otros negocios. API puede listar/consultar reseñas y responderlas como negocio; no borrar reseñas de terceros ni prometer su eliminación. Respuesta manual con preview/aprobación, no IA automática sin autorización.

- Cobertura: pendiente. Evidencia de partida: Sin adaptador identificado.
- Plan: F5. Depende de perfil y autorización del titular. Riesgo: mostrar datos ajenos o caducos.
- Responsable propuesto: Titular Google. Pruebas relacionadas: T21.

## GGL-03 · PENDING

Sincronizar listados paginados, deduplicación por ID, cuotas/backoff y último éxito; mostrar agregado oficial y fuente Google separada de las internas. Revisar términos de almacenamiento, atribución y exhibición vigentes antes de persistir/publicar contenido; conservar solo datos permitidos y borrar al revocar cuando corresponda. Si condiciones impiden caché/publicación, mostrar solo enlace oficial o widget autorizado. No scraping ni claves expuestas. Si acceso denegado, 429, OAuth revocado o perfil no verificado: estado de integración y fallback a enlace oficial; no mostrar datos inventados ni marcar API verificada.

- Cobertura: pendiente. Evidencia de partida: Sin adaptador identificado.
- Plan: F5. Depende de perfil y autorización del titular. Riesgo: mostrar datos ajenos o caducos.
- Responsable propuesto: Titular Google. Pruebas relacionadas: T21.

## GGL-04 · BLOCKED

Criterio real de aceptación: reseña genuina creada por comprador en Google mediante enlace (no crear reseñas de prueba falsas), consulta autorizada y respuesta de negocio aprobada por titular; si no hay acceso, estado BLOCKED/EXTERNAL y prueba sandbox/adapter distinguida. Documentar diferencia de reseñas propias, Google y rich results.

- Cobertura: pendiente. Evidencia de partida: Sin adaptador identificado.
- Plan: F5. Depende de perfil y autorización del titular. Riesgo: mostrar datos ajenos o caducos.
- Responsable propuesto: Titular Google. Pruebas relacionadas: T21.

## WA-01 · PENDING

Usar WhatsApp Business Cloud API oficial o BSP autorizado elegido por cliente, no automatización WhatsApp Web/QR no oficial, scraping o grupos. Titular: Meta Business Portfolio, WABA, número/phone_number_id, permisos, app, access token de system user según configuración, revisión/verificación y plantillas. Verificar número actual `+18493306269` y elegibilidad de coexistencia con WhatsApp Business App o migración; no desvincularlo, transferirlo ni darlo de baja sin plan y aprobación. Si se necesita número dedicado, confirmar titularidad y continuidad. API puede tener tarifas y límites; cotizar con políticas vigentes.

- Cobertura: pendiente. Evidencia de partida: Enlaces wa.me en tienda.
- Plan: F5. Depende de waba, plantillas y opt-in. Riesgo: mensajes duplicados o sin consentimiento.
- Responsable propuesto: Titular Meta. Pruebas relacionadas: T17, T18.

## WA-02 · PENDING

Configurar webhooks HTTPS: challenge GET con verify token, POST verificar `X-Hub-Signature-256` HMAC con raw body y app secret antes de JSON parsing, comparación timing-safe, deduplicación por ID y tipo/estado, validar WABA/phone ID, limitar payload, persistir inbox y responder 2xx rápido; worker procesa luego. Eventos repetidos y fuera de orden no duplican acciones. No registrar secretos o texto sensible completo en logs. Probar firmas inválidas y replays.

- Cobertura: pendiente. Evidencia de partida: Enlaces wa.me en tienda.
- Plan: F5. Depende de waba, plantillas y opt-in. Riesgo: mensajes duplicados o sin consentimiento.
- Responsable propuesto: Titular Meta. Pruebas relacionadas: T17, T18.

## WA-03 · PENDING

Registrar opt-in demostrable con propósito (pedido vs marketing), fecha, fuente y texto/política; no checkbox promocional preactivado. Gestionar baja (“STOP”, “BAJA” y solicitud humana), preferencias y supresión. Fuera de ventana de servicio de 24 h desde último mensaje del cliente, usar plantilla aprobada aplicable; dentro solo mensajes permitidos. Confirmar categoría/idioma/costos de plantillas con Meta, no asumir utility para marketing o reseñas. No usar plantillas rechazadas ni usar contenido libre para saltar restricciones.

- Cobertura: pendiente. Evidencia de partida: Enlaces wa.me en tienda.
- Plan: F5. Depende de waba, plantillas y opt-in. Riesgo: mensajes duplicados o sin consentimiento.
- Responsable propuesto: Titular Meta. Pruebas relacionadas: T17, T18.

## WA-04 · PENDING

Eventos y plantillas propuestas (nombres lógicos, no afirmar aprobación): `order_received`, `payment_pending`, `payment_confirmed`, `payment_failed_action`, `design_ready_for_approval`, `design_changes_received`, `design_approved`, `production_started` opcional, `order_ready`, `shipment_dispatched`, `delivery_issue`, `order_delivered`, `review_invitation`, `refund_update`, `order_cancelled`. Cada evento genera outbox único por pedido/revisión/destinatario/canal; no enviar al cliente el mismo evento por webhook duplicado. Mensajes claros con número de pedido, próxima acción y URL segura. No PAN, dirección completa, fotos originales ni datos innecesarios. El envío automático no es condición para persistir orden.

- Cobertura: pendiente. Evidencia de partida: Enlaces wa.me en tienda.
- Plan: F5. Depende de waba, plantillas y opt-in. Riesgo: mensajes duplicados o sin consentimiento.
- Responsable propuesto: Titular Meta. Pruebas relacionadas: T17, T18.

## WA-05 · PENDING

Panel de atención: conversación 1:1, mensajes entrantes, estado enviado/entregado/leído/fallido si proveedor lo informa, referencia a pedido por identificación autorizada, asignar operador, notas internas, enviar respuesta manual dentro de permisos/ventana/plantilla. No asumir que dos pedidos con mismo teléfono no verificado pertenecen a misma persona. No modificar pagos/pedidos solo por mensaje entrante. Aprobación de boceto por enlace autenticado; si botones de WA se implementan, validar payload/token/revisión vigente e identidad y registrar consentimiento. Enviar notificación de fallo a operador, no mentir que fue entregada.

- Cobertura: pendiente. Evidencia de partida: Enlaces wa.me en tienda.
- Plan: F5. Depende de waba, plantillas y opt-in. Riesgo: mensajes duplicados o sin consentimiento.
- Responsable propuesto: Titular Meta. Pruebas relacionadas: T17, T18.

## WA-06 · PENDING

Outbox: idempotencia local y provider messageId, reintentos 429/5xx transitorios con backoff; ante timeout ambiguo sin idempotencia del proveedor, no reenvío automático ciego: estado unknown, reconciliar si disponible o revisión manual. Dead letter/alerta; fallback a email transaccional si autorizado y disponible, o panel/estado web y contacto manual. No enviar marketing por fallback sin opt-in. Mensaje no enviado no cambia orden/pago/diseño.

- Cobertura: pendiente. Evidencia de partida: Enlaces wa.me en tienda.
- Plan: F5. Depende de waba, plantillas y opt-in. Riesgo: mensajes duplicados o sin consentimiento.
- Responsable propuesto: Titular Meta. Pruebas relacionadas: T17, T18.

## WA-07 · IN_PROGRESS

Correo transaccional opcional necesario para recuperación cuando se usa email: proveedor aprobado, SPF/DKIM/DMARC, plantillas, links y reintentos, consentimientos según finalidad. Notificación WA oficial es requisito; `wa.me` permanece como contacto manual/fallback, no como sustituto de integración real. Instagram/Facebook: enlaces y píxeles/catálogos si se aprueban y son elegibles; inbox multicanal o automatización DM fuera del alcance hasta confirmar permisos y presupuesto.

- Cobertura: parcial. Evidencia de partida: Enlaces wa.me en tienda.
- Plan: F5. Depende de waba, plantillas y opt-in. Riesgo: mensajes duplicados o sin consentimiento.
- Responsable propuesto: Titular Meta. Pruebas relacionadas: T17, T18.

## WA-08 · PENDING

Pruebas: sandbox/test number, firma válida/inválida, challenge, evento duplicado, ventana cerrada, opt-out, plantilla no aprobada, rate limit, timeout ambiguo, estados fuera de orden, cliente incorrecto, pago confirmado aunque API caída, revisión de boceto antigua, link expirado, pedido entregado y solicitud neutral. Live requiere mensajes autorizados a destinatarios de prueba y evidencia de webhook, plantilla, costos y opt-in. No activar difusión ni leer grupos.

- Cobertura: pendiente. Evidencia de partida: Enlaces wa.me en tienda.
- Plan: F5. Depende de waba, plantillas y opt-in. Riesgo: mensajes duplicados o sin consentimiento.
- Responsable propuesto: Titular Meta. Pruebas relacionadas: T17, T18.

## SEO-01 · IN_PROGRESS

SSR, titles/descriptions por producto/categoría, canonical, sitemap dinámico de URLs activas, robots, redirects 301 de slugs antiguos, 404/410 adecuados, evitar duplicados de filtros y paginación según estrategia; staging noindex + acceso restringido, no indexar admin, checkout, pedidos o diseños. OpenGraph, imágenes sociales, datos estructurados Product/Offer/Breadcrumb/Organization según contenido, moneda DOP, disponibilidad coherente, reseñas auténticas. Search Console y verificación de dominio; no prometer posiciones.

- Cobertura: parcial. Evidencia de partida: Vistas SSR, CSS, JS y fuentes.
- Plan: F6. Depende de catálogo publicado y consentimiento. Riesgo: indexación indebida o evento duplicado.
- Responsable propuesto: UX/marketing. Pruebas relacionadas: T04, T23, T27.

## SEO-02 · IN_PROGRESS

Imágenes responsive srcset/sizes, WebP/AVIF derivados donde compatible, dimensiones reservadas, lazy-load bajo pliegue, hero priorizado, video poster y carga condicional, fuentes propias con licencia, CSS/JS compilados y cache hash. Caché CDN solo de assets públicos y contenido público elegible, bypass para sesiones/carrito/admin/pedidos/preview. CSP y consent manager compatibles, sin tailwind CDN de desarrollo.

- Cobertura: parcial. Evidencia de partida: Vistas SSR, CSS, JS y fuentes.
- Plan: F6. Depende de catálogo publicado y consentimiento. Riesgo: indexación indebida o evento duplicado.
- Responsable propuesto: UX/marketing. Pruebas relacionadas: T04, T23, T27.

## SEO-03 · PENDING

GA4, Google Tag Manager si se aprueba, Meta Pixel + CAPI opcional/según alcance, Search Console, Google Business Profile. Eventos estándar: view_item_list, select_item, view_item, add_to_cart, remove_from_cart, begin_checkout, add_shipping_info, add_payment_info, purchase, refund; propios: personalization_start, personalization_complete, upload_error, approval_requested/approved. `purchase` solo cuando existe pago confirmado según definición comercial; COD medir como pedido confirmado y registrar purchase al cobro según estrategia aprobada, no duplicar. Mismo transaction_id/event_id para deduplicación browser/server; test con debug/sandbox, no enviar PII, nombres personalizados, imágenes, emails, teléfonos ni URLs tokenizadas a analítica. Consentimiento por categoría y control de tags previo a consentimiento donde aplique, marketing opt-out respetado. Hash de PII no elimina obligación de privacidad; no implementar advanced matching sin aprobación. UTM/atribución solo según consentimiento.

- Cobertura: pendiente. Evidencia de partida: Vistas SSR, CSS, JS y fuentes.
- Plan: F6. Depende de catálogo publicado y consentimiento. Riesgo: indexación indebida o evento duplicado.
- Responsable propuesto: UX/marketing. Pruebas relacionadas: T04, T23, T27.

## SEO-04 · PENDING

Medición técnica: objetivo provisional p75 LCP ≤2.5 s, INP ≤200 ms, CLS ≤0.1 en datos reales cuando disponibles; staging Lighthouse móvil controlado como proxy, guardar perfil red/dispositivo y baseline. Propuesta API p95 ≤500 ms para catálogo/cotización bajo carga acordada, excluyendo proveedores externos y uploads; objetivos se confirman con prueba y capacidad. No sacrificar seguridad o funciones por puntuación.

- Cobertura: pendiente. Evidencia de partida: Vistas SSR, CSS, JS y fuentes.
- Plan: F6. Depende de catálogo publicado y consentimiento. Riesgo: indexación indebida o evento duplicado.
- Responsable propuesto: UX/marketing. Pruebas relacionadas: T04, T23, T27.

## SEO-05 · IN_PROGRESS

Revisar accesibilidad WCAG 2.2 AA como objetivo: teclado, lector pantalla, errores formularios, estrellas accesibles (radiogroup), configurador alternativo, contraste, responsive 360–1440+, 200% zoom y reduced motion. Prueba Lighthouse/axe más manual; no afirmar certificación solo por herramienta.

- Cobertura: parcial. Evidencia de partida: Vistas SSR, CSS, JS y fuentes.
- Plan: F6. Depende de catálogo publicado y consentimiento. Riesgo: indexación indebida o evento duplicado.
- Responsable propuesto: UX/marketing. Pruebas relacionadas: T04, T23, T27.

## SEC-01 · IN_PROGRESS

Threat model: admin comprometido, IDOR/BOLA, CSRF, XSS, NoSQL injection, SSRF, enumeración, regex DoS, uploads maliciosos, webhooks falsos, doble cobro/overbooking, robo de tokens, fuga de fotos, exposición a terceros y proveedor caído. Aplicar validación de schemas (whitelist), consultas parametrizadas/operadores controlados, escape de regex o búsqueda indexada, paginación/límites, escapar EJS, sanitizar HTML CMS, allowlist de URLs, no fetch arbitrario desde URL usuario.

- Cobertura: parcial. Se corrigieron IDOR de `/order-success/:id`, exposición pública de fotos de personalización y descuento de stock fuera de transacción; se verificaron dos carreras e intentos anónimos en laboratorio. Quedan validaciones de esquema amplias, límites/rate limit, XSS/CMS, scans de carga y revisión integral SEC-08.
- Plan: F1/F7. Depende de política, permisos y operaciones. Riesgo: exposición o pérdida de datos.
- Responsable propuesto: Seguridad. Pruebas relacionadas: T07, T22, T24, T27.

## SEC-02 · IN_PROGRESS

HTTPS extremo a extremo, proxy trust exacto, cookies Secure HttpOnly SameSite apropiado, CSRF en mutaciones de sesión (multipart incluido); webhooks exentos solo con firma válida y rutas aisladas. Regenerar sesión tras login, logout/revocación, expiración inactividad, rate limit por cuenta/IP y anti-bruteforce, hash bcrypt/Argon2 con parámetros actuales, MFA admin, recuperación segura, autorización por recurso, roles y auditoría. CORS cerrado, Helmet/CSP, límites request/timeouts, mensajes de error sin stack, 404/403 consistentes para evitar enumeración. No endpoints de debug en prod.

- Cobertura: parcial. Sesión mantiene `httpOnly`, `sameSite=lax`, `secure` en producción; el admin tiene CSRF y RBAC probados por unidad; token de checkout impredecible evita CSRF y doble envío del formulario. No se probó fixation/logout a nivel HTTP, rate limit, MFA, CSP/Helmet ni CSRF de todas las mutaciones públicas.
- Plan: F1/F7. Depende de política, permisos y operaciones. Riesgo: exposición o pérdida de datos.
- Responsable propuesto: Seguridad. Pruebas relacionadas: T07, T22, T24, T27.

## SEC-03 · IN_PROGRESS

Secrets manager o variables protegidas, `.env.example`, rotación, CI secret scanning, `npm audit` y revisión de dependencias/lock, SBOM si procede, escaneo de imagen Docker; no ignorar vulnerabilidades críticas/altas sin mitigación documentada y aprobación. Principio mínimo privilegio DB/buckets/Meta/Google/pagos. Entornos separados, sin credenciales prod en staging.

- Cobertura: parcial. Evidencia de partida: Middleware, rutas, sesiones y dependencias.
- Plan: F1/F7. Depende de política, permisos y operaciones. Riesgo: exposición o pérdida de datos.
- Responsable propuesto: Seguridad. Pruebas relacionadas: T07, T22, T24, T27.

## SEC-04 · IN_PROGRESS

Privacidad: clasificar público/privado/sensible; minimizar datos, consentimiento, política de finalidad y retención aprobada, acceso/rectificación/supresión y obligaciones fiscales/contractuales aplicables (validar con asesor RD, incluida protección de datos). Proteger imágenes originales, bocetos, comprobantes y exportaciones; cifrado en tránsito/reposo, links expiran y se revocan por autorización; evitar PII en URLs/logs/analytics. Descargar assets mediante autorización por order/role/draft; logs redaccionados. Expiración de cache/backup y borrado coordinado, preservar evidencia legal bajo acceso limitado. No declarar cumplimiento legal sin revisión.

- Cobertura: parcial. Archivos nuevos privados y legacy custodiados por sesión de pedido o permiso de lectura de pedidos; GET anónimo retorna 404. Faltan enlaces expiran/revocación, prueba cruzada entre compradores, análisis de medios, retención aprobada y revisión legal.
- Plan: F1/F7. Depende de política, permisos y operaciones. Riesgo: exposición o pérdida de datos.
- Responsable propuesto: Seguridad. Pruebas relacionadas: T07, T22, T24, T27.

## SEC-05 · PENDING

Backups automáticos cifrados de DB y objetos/configuración según plan real, fuera del host, versionado y pruebas de restauración. Objetivos propuestos mínimos RPO ≤24h y RTO ≤4h; antes de producción con pagos, evaluar PITR/RPO menor y reconciliación de pagos externos para evitar pérdida silenciosa, aprobar SLA/costos. Restaurar en entorno aislado, verificar referencias, ledger, inventario, jobs y evitar reenvío de mensajes/cobros al restaurar. Cron/check de éxito, alertas de fallo, retención aprobada.

- Cobertura: pendiente. Evidencia de partida: Middleware, rutas, sesiones y dependencias.
- Plan: F1/F7. Depende de política, permisos y operaciones. Riesgo: exposición o pérdida de datos.
- Responsable propuesto: Seguridad. Pruebas relacionadas: T07, T22, T24, T27.

## SEC-06 · PENDING

Observabilidad: liveness y readiness separados, métricas latencia/error/DB, CPU/RAM/disco, uso R2, cola, reservas expiradas, pagos unknown, webhooks rechazados, WhatsApp/GGL fallos, backups y SSL. Alarmas a responsable con runbook, no alertas con PII. Health no devuelve secretos. Logging con correlation ID, timestamp UTC, actor y recurso seguro. Establecer rotación y retención de logs.

- Cobertura: pendiente. Evidencia de partida: Middleware, rutas, sesiones y dependencias.
- Plan: F1/F7. Depende de política, permisos y operaciones. Riesgo: exposición o pérdida de datos.
- Responsable propuesto: Seguridad. Pruebas relacionadas: T07, T22, T24, T27.

## SEC-07 · PENDING

Gestión incidentes: parar nuevas ventas por feature flag sin perder pedidos, reconciliar, aislar credenciales, conservar evidencia, restaurar, notificar responsables según obligación, postmortem. Rollback de app compatible con schema expand/contract; no restaurar DB antigua encima de pagos nuevos. Ninguna caída de Google/WhatsApp impide catálogo/checkout; caída de pagos desactiva método, no simular cobro; caída de storage bloquea productos que requieren upload sin perder drafts; error de envío ofrece tarifa manual válida si configurada.

- Cobertura: pendiente. Evidencia de partida: Middleware, rutas, sesiones y dependencias.
- Plan: F1/F7. Depende de política, permisos y operaciones. Riesgo: exposición o pérdida de datos.
- Responsable propuesto: Seguridad. Pruebas relacionadas: T07, T22, T24, T27.

## SEC-08 · PENDING

QA seguridad: probar rutas admin anónimas, cross-user order/draft/asset, CSRF, sesión fixation, XSS en reseña/CMS, inyección, upload MIME falso, rate limits, URLs maliciosas, firmas, token replay, secretos y logs. Gate de salida: cero riesgos críticos/altos no mitigados y aprobación de seguridad; documentar excepciones no críticas.

- Cobertura: pendiente. Evidencia de partida: Middleware, rutas, sesiones y dependencias.
- Plan: F1/F7. Depende de política, permisos y operaciones. Riesgo: exposición o pérdida de datos.
- Responsable propuesto: Seguridad. Pruebas relacionadas: T07, T22, T24, T27.

## MIG-01 · BLOCKED

Inventario de versión real, Git tag de baseline, SHA, backup DB y uploads, entorno de ensayo aislado, mapa de datos (no importar export público sobre DB real). Revisar licencias/assets, ruta histórica PM2 y variables actuales sin imprimir secretos. Identificar discrepancias con ZIP y los PDF. No escribir en producción.

- Cobertura: parcial. Evidencia de partida: Export público, modelos y manifiesto SHA-256.
- Plan: F0. Depende de head y respaldo verificado. Riesgo: pérdida de campos o referencias.
- Responsable propuesto: Datos/propietario. Pruebas relacionadas: T24, T25.

## MIG-02 · PENDING

Migración expand/contract: añadir IDs de variante/SKU estables, campos centavos y plantillas versionadas, direcciones opcionales históricas y ledger nuevo, referencias originales. Mapa legacy index/label/option a variantId; si duplicado o ambiguo, reporte manual, no resolver por primera coincidencia. Precios legacy con precisión no válida y stock negativo/referencias huérfanas se reportan. Productos simples se convierten a SKU base sin duplicar stock. Convertir categorías/géneros y preservar slug/redirect. SiteSettings diff con copy aprobado y no sobreescribir decisiones posteriores.

- Cobertura: pendiente. Evidencia de partida: Export público, modelos y manifiesto SHA-256.
- Plan: F0/F7. Depende de head y respaldo verificado. Riesgo: pérdida de campos o referencias.
- Responsable propuesto: Datos/propietario. Pruebas relacionadas: T24, T25.

## MIG-03 · PENDING

Pedidos históricos: mantener valores, texto/foto originales y estado `legacy` cuando no puede inferirse. No reconstruir pagos, reservas, aprobaciones, direcciones o compras verificadas inexistentes. Reconciliar físicamente stock actual con propietario antes de crear saldo inicial; no volver a descontar pedidos antiguos. No ejecutar notificaciones automáticas sobre importaciones. Reseñas legacy sin evidencia no son verificadas. Migrar media pública/privada con checksum, referencias y validación de acceso, quitar archivos sensibles de docroot y cachés después de verificar. Duplicados se revisan, nunca borrar originales sin backup.

- Cobertura: pendiente. Evidencia de partida: Export público, modelos y manifiesto SHA-256.
- Plan: F0/F7. Depende de head y respaldo verificado. Riesgo: pérdida de campos o referencias.
- Responsable propuesto: Datos/propietario. Pruebas relacionadas: T24, T25.

## MIG-04 · PENDING

Dry run, scripts repetibles, reporte antes/después (counts, totales, SKU, archivos/checksum, refs y errores). Ensayar restauración, comparación y rollback. Ventana de cutover aprobada; detener nuevas compras temporalmente, drenar operaciones, snapshot final, migrar delta, reconciliar proveedores/ledger, smoke tests y activar flags gradualmente. Si falla, detener venta, rollback compatible y conciliar transacciones nuevas antes de restaurar. No rollback destructivo que pierda cobros.

- Cobertura: pendiente. Evidencia de partida: Export público, modelos y manifiesto SHA-256.
- Plan: F0/F7. Depende de head y respaldo verificado. Riesgo: pérdida de campos o referencias.
- Responsable propuesto: Datos/propietario. Pruebas relacionadas: T24, T25.

## MIG-05 · PENDING

Criterio: 100% de registros y archivos incluidos en alcance reconciliados o excepción documentada y aceptada; cero pérdida silenciosa y ninguna credencial/PII publicada. Mantener copia legacy de solo lectura con acceso limitado según retención, plan de retirada.

- Cobertura: pendiente. Evidencia de partida: Export público, modelos y manifiesto SHA-256.
- Plan: F0/F7. Depende de head y respaldo verificado. Riesgo: pérdida de campos o referencias.
- Responsable propuesto: Datos/propietario. Pruebas relacionadas: T24, T25.

## Base de datos en laboratorio

| ID | Criterio | Dependencias | Riesgo | Responsable | Estado / evidencia |
|---|---|---|---|---|---|
| DATA-DB-01 | La copia local conecta por MySQL al iniciar la web y persiste las sesiones en SQL; ningún modelo/ruta web inicia Mongo. | MariaDB, mysql2, esquema 001_initial, app_sessions | Servicio SQL ausente o secretos incorrectos impiden arranque/login | Codex; aceptación del propietario pendiente | VERIFIED en laboratorio · DB03/DB04, server y sesión tras reinicio |
| DATA-DB-02 | Importar documentos de negocio desde Mongo local conservando IDs y contenido; no borrar/escribir en la fuente; detener ante destino ocupado. | Mongo loopback `gatondo_local`, tablas MySQL vacías, respaldo de código | Estructuras anidadas e importes mal mapeados | Codex · Datos | VERIFIED en laboratorio · dry-run, transacción y cotejo completo en DB02 |
| DATA-DB-03 | Mongo permanece disponible como base de referencia y solo herramienta de lectura/importación; no participa en solicitudes de tienda ni administración. | Proceso Mongo local intacto, MONGO_SOURCE_URI protegido | Confundir consola de consulta con escritura o desplegar dependencia al runtime | Codex; aceptación del propietario pendiente | VERIFIED en laboratorio · DB03 y fuente sin cambios |
| DATA-DB-04 | Probar todos los CRUD del panel, variantes, inventario concurrente, backup/restauración y despliegue Docker antes de marcar la migración integral aceptada. | UAT, pruebas concurrentes, backup, Docker/Auto-Deploy | Casos no cubiertos fuera del smoke | Responsable técnico y propietario | PENDING · DB11/DB12 |
