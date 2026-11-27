# Decisiones y plan de implementación

## ADR-009 · Precio configurable y tipografía independiente por campo · Desplegada

**Fecha:** 26 de noviembre de 2026. **Solicitud:** permitir que cada campo del configurador sea obligatorio u opcional y gratuito o de pago; ejemplo: pulsera a RD$1,290, grabado frontal incluido y grabado trasero opcional con recargo de RD$200. Cada cara conserva su selección tipográfica; el selector trasero aparece solo cuando se introduce texto trasero. **Estado:** aprobada por el usuario, implementada y desplegada a producción; código activo `4282cc7`.

### Auditoría actual

- El producto guarda `customizationFields` dentro del JSON `payload` de MySQL. Cada campo tiene `key`, `label`, `placeholder`, `required` y `maxLength`; no existe precio por campo.
- El alta/edición administrativa construye y persiste esos campos, y la ficha cliente renderiza uno por campo. `readEngraving()` valida presencia, longitud y tipografía, pero no suma recargos.
- El servidor asigna `unitPrice` desde la variante o precio base al agregar al carrito; `lineTotal`, checkout y pedido usan ese valor. El navegador no es autoridad del precio, pero el recargo tampoco está modelado.
- La galería de la ficha ya acepta imágenes de `product.gallery`. El archivo de reverso liso está en `public/images/muestras-carrito/brazaletes-7-reverso-liso.png`, pero aún no está asociado al producto borrador. Esta copia no tiene instalado `mysql2`, por lo que la lectura/escritura del catálogo local no pudo verificarse en este entorno.
- El usuario aprobó la arquitectura antes de realizar el cambio estructural. La suite automatizada y la comprobación visual local están ejecutadas; ver evidencia `CUS-01-PRICE-FONTS` en `TEST_MATRIX.md`. La cobertura integral del configurador y el despliegue siguen pendientes.

### Diseño aprobado e implementación

Extender cada elemento de `customizationFields` con `priceDeltaMinor` (entero en centavos DOP, no un precio enviado por el navegador). El formulario de administración expondrá obligatoriedad, importe adicional y una indicación clara de incluido/recargo. El campo opcional vacío no suma; con texto suma su recargo. El frente del ejemplo se configura como obligatorio e incluido y el reverso como opcional con 20,000 centavos.

Un servicio de dominio compartido validará los campos permitidos y calculará el precio unitario desde precio de variante/base más los recargos de campos con valor. La misma cotización del servidor alimentará la ficha, carrito, subtotal, checkout, snapshot del pedido y mensaje de confirmación. Guardará el desglose de precio junto a cada campo para que el pedido conserve lo cotizado. Si producto/configuración cambian después de agregar al carrito, el servidor deberá avisar y requerir aceptación del nuevo total antes de completar el checkout.

El payload JSON conserva la configuración sin migración SQL. La implementación local incluye configuración por campo en administración, cotización autoritativa en servidor, actualización de carrito/checkout y snapshot de pedido, además de controles ante cambio de cotización. La selección de tipografía se valida y guarda por cada campo completado. El producto de prueba es un borrador en la base local aislada.

### Riesgos y aceptación propuesta

- Un error de recálculo puede cobrar un precio distinto al visible; validar exclusivamente en servidor, en centavos, y comprobar el mismo desglose en pedido.
- Productos legacy sin `priceDeltaMinor` deben interpretarse como cero, sin alterar sus precios ni personalizaciones históricas.
- El campo opcional vacío debe ser RD$1,290; al completar el reverso debe ser RD$1,490; eliminar el texto debe retirar los RD$200.
- Un cliente no puede manipular `priceDeltaMinor`, recargo, variante, cantidad ni totales mediante el formulario.
- El archivo de reverso debe añadirse a la galería del borrador local, con texto alternativo “Reverso de la placa”, conservando el frente como imagen principal.

### Plan de verificación y pendientes

1. Recuperar dependencias reproducibles (`npm ci`) y confirmar MySQL local; respaldo verificable del catálogo local antes de editar el borrador.
2. Asociar el reverso a la galería del borrador mediante la interfaz o una actualización acotada y reversible, sin modificar productos productivos.
3. Implementar la configuración por campo en altas/ediciones y el cálculo compartido servidor/UI, snapshots de carrito/pedido y protección ante cotización obsoleta.
4. Ejecutar pruebas de formulario/admin, campo vacío, recargo, eliminación, tampering, variantes, cantidades, persistencia y recorrido hasta pedido de laboratorio; actualizar `TEST_MATRIX.md` con evidencia real.
5. Revisar diff y riesgos antes de proponer despliegue aparte. La producción requiere autorización específica y backup/cotejo previos.

**Puerta:** la aprobación del usuario fue recibida para implementar en laboratorio. No se desplegó ni se alteró producción; el siguiente despliegue requiere solicitud explícita y preflight/backup conforme a `git-auto-deploy`.

## ADR-008 · Vista previa tipográfica por cara · Laboratorio

**Fecha:** 26 de noviembre de 2026 · **Autorización:** el propietario pidió implementar la propuesta de vista previa en vivo y campos para piezas de varias caras. **Entorno:** worktree aislado `codex/live-engraving-preview`; no autoriza producción ni despliegue.

### Decisión

Reutilizar `customizationFields` como un campo por cara/zona y `fontOptions` como selector común del producto. Cada campo renderiza su propia muestra; al escribir cambia solo su texto y al elegir tipografía se actualizan todas las muestras. Las etiquetas configurables existentes identifican “Frente”, “Reverso” u otra zona. El texto y fuente siguen usando el payload actual del carrito/pedido; no se requiere migración.

La muestra es una ayuda tipográfica aislada bajo cada campo. No se superpone a la foto del producto ni promete posición, tamaño físico, relieve o fidelidad de fabricación. Las caras comparten tipografía en esta primera iteración; elecciones independientes por cara, plantillas de diseño y composición gráfica quedan en CUS-02/CUS-03.

### Riesgos y criterios pendientes

- Revisar visualmente desktop/móvil y dos campos configurados; verificar caracteres, selector de fuente y conservación de los textos en carrito/pedido antes de marcar VERIFIED.
- Las fuentes personalizadas cuyo administrador solo adjunta una imagen de muestra no necesariamente tienen un archivo tipográfico instalable; la vista dinámica usa el estilo CSS asociado, que puede ser sustituto.
- No se ejecutaron pruebas ni se accedió a producción en esta tarea. Implementación en laboratorio, estado no verificado.

## ADR-004 · Shell compartido del administrador · Implementado en laboratorio

**Fecha:** 25 de noviembre de 2026. **Autorización:** solicitud explícita del propietario para rediseñar el panel y preparar nuevos módulos. Se conserva Node/Express/EJS y modelos MySQL. Un partial EJS compartido sostiene la navegación y el shell; CSS/JS propios implementan identidad visual, colapso persistente y drawer móvil. Tailwind se compila en local. El sidebar enlaza solo pantallas existentes. No se modifica el escaparate. El rediseño no significa que todas las páginas comerciales del brief estén implementadas.

## ADR-005 · Pagos confirmados e importación de inventario · Laboratorio

**Fecha:** 25 de noviembre de 2026. Se añaden tablas aditivas `order_payments` e `inventory_movements`; el runner aplica únicamente migraciones versionadas pendientes, sin reiniciar ni sembrar. Ventas suma el ledger de pagos manuales por fecha de confirmación; abonos cuentan como cobros pero no como pedido totalmente pagado. Pedidos antiguos no se convierten en pagos. No hay costo histórico para calcular margen/ganancia, pasarela, reversos o permisos financieros específicos.

Importación admite CSV, XLSX y PDF del formato estructurado exportado por GATÓN DO. Requiere ID de producto e índice/firma de variante; valida filas duplicadas, presenta preview, vuelve a comprobar el estado bajo transacción y audita cada diferencia. CSV neutraliza celdas de fórmula. PDF ajeno al formato se rechaza, sin inferir su artículo.

**Límite:** el brief pide análisis por cliente/categoría, margen, reembolsos, descuentos/cargos, heatmap, conversión, controles por rol y comparativas completas. Se mantienen pendientes porque el esquema y las reglas actuales no suministran esa evidencia; no se inventan datos. La pantalla es una primera entrega parcial, no el módulo integral.

## ADR-001 · Propuesta de evolución modular · Pendiente del propietario

Conservar Node/Express/EJS/Mongo y las URLs públicas. El recorrido de compra y el acceso administrativo funcionan sobre una réplica local. Reescribir todo repetiría catálogo, vistas y panel sin resolver por sí mismo pagos ni grabado. Eliminar la selección por índice y el checkout actual requiere una sustitución interna acotada. Mantener un único camino de compra activo en cada entorno.

Flujo propuesto: vista SSR → controlador y esquema de validación → servicios de catálogo, diseño, precios, carrito, checkout e inventario → repositorios Mongo. El cliente envía SKU, cantidad, draft y versiones. El servidor resuelve precio en centavos DOP, demanda agregada y política. Crear pedido, reserva y outbox en una transacción. Un worker procesa eventos posteriores mediante adaptadores con claves de idempotencia. Pagos externos se concilian por importe y referencia. El taller recibe una revisión exacta con acceso autorizado una vez cumplidos los gates de pago, stock y aprobación. Ver contratos completos en MASTER_PROMPT §§3.1, 7.1 y 14.

Comparación tras el smoke: se mantiene la banda preliminar **428–744 h** para evolución y **512–880 h** para reconstrucción, con puntos medios de 586 y 696 h. El ahorro central estimado es 110 h. El flujo probado favorece reutilizar vistas; los campos de personalización fuera del esquema y las fuentes pendientes desaconsejan estrechar los rangos. Estimación de planificación para una tienda, diseño 2D, una pasarela y logística nacional; excluye esperas de terceros y catálogo real. Recalcular después de cotejar HEAD, PDFs, licencias y una plantilla física. Una reescritura requeriría nueva evidencia de incompatibilidad, coste comparativo y aprobación.

## ADR-002 · Propuesta de identidad y medios · Pendiente de taller y propietario

Conservar IDs y slugs históricos. Asignar SKU estable a cada combinación demostrable, conservar choiceGroups y datos desconocidos, documentar ambigüedades. Diseños en almacenamiento privado por dueño. El cliente confirma la revisión exacta y el total vigente. El prototipo [de dos caras](fase0/plantilla-2d.html) ensaya texto y fuente independientes con SVG y alternativa de formulario. Cinco anchos comprobados. Validar zona física, fuentes licenciadas, caracteres, archivos por cara, precio y plazos antes de comprometer la tecnología final.

## Secuencia de commits propuestos

| Lote | Dependencia y evidencia de salida |
|---|---|
| F0 – procedencia, matriz, smoke, ADR | Cotejar PDFs, HEAD y referencia, aceptación de alcance y diseño. |
| F1a – instalación, readiness, sesiones y permisos | Lock reproducible, readiness tras DB, seed separado, auth por recurso y pruebas de acceso. |
| F1b – almacenamiento privado y outbox | Activos aislados, migración expand ensayada, worker con reintentos verificados. |
| F2 – catálogo, CMS y admin | Correcciones PDF, SKU/géneros, copy y enlaces versionados, UAT de edición. |
| F3 – plantilla, draft y carrito por diseño | Reproducir snapshot y dos diseños independientes, aprobación de taller. |
| F4 – cotización, reserva, ledger y pedido | Concurrencia, expiración, dirección y tarifas; pedido idempotente sin sobreventa. |
| F5 – pagos, transporte, WhatsApp y Google | Contratos, pruebas sandbox y validación autorizada de cada proveedor. |
| F6 – reseñas, SEO y analítica | Compra verificada, servicio separado, neutralidad y consentimiento. |
| F7 – ensayo de migración, restauración y UAT | Reconciliación, seguridad, carga, manual real, firmas y ventana aprobada. |

## Decisiones comerciales

## ADR-007 · Checkout transaccional, idempotencia y fotos privadas

**Fecha:** 26 de noviembre de 2026 · **Alcance:** endurecimiento aditivo antes de avanzar el configurador y desplegar el lote autorizado.

El pedido invitado continúa con COD y stock físico, pero la inserción del pedido, la disminución de existencias y el registro de `inventory_movements` ocurren en una transacción InnoDB. Los productos se bloquean por ID ordenado para evitar deadlocks previsibles. Si el stock o la variante cambió, se cancela la transacción; nunca se fuerza el saldo a cero. El formulario lleva token aleatorio vinculado a la sesión y la migración `004_checkout_idempotency` agrega una clave nullable única para que dos POST simultáneos del mismo intento reutilicen el pedido.

La confirmación deja de aceptar solo el ObjectId: se limita a pedidos creados en la sesión actual. Fotos nuevas se escriben en el volumen persistente privado `storage/customizations`; los antiguos `/uploads/customizations/...` también pasan por control de acceso en lugar de escapar por `express.static`. El dueño requiere la sesión que tiene el archivo en el carrito o el pedido reciente; un administrador necesita cuenta activa y `orders.view`. No se agregan links públicos ni se almacena la clave de checkout en logs.

**Prueba y límites:** dos checkouts simultáneos independientes con una unidad producen un pedido; doble envío con una clave produce el mismo ID y un solo descuento; consulta anónima a pedido/foto da 404. No prueba carga de 20 peticiones, ownership entre dos sesiones autenticadas, magic bytes/EXIF/antivirus ni una restauración real. Stock se consume en la creación de pedido COD; reserva temporal, expiración, cancelación/reposición, recuperación OTP y aprobación del taller quedan pendientes. Los cambios corrigen esos fallos acotados y no constituyen cierre de INV-02/ORD-02/SEC-08.

## ADR-006 · Menú administrativo de usuarios, roles y permisos

**Fecha:** 26 de noviembre de 2026 · **Autorización:** instrucción explícita del propietario para crear el menú y subirlo al servidor · **Alcance:** Gatón DO, rama de producción `main`, despliegue automático Linux Docker.

### Decisión

Agregar gestión de cuentas, roles y permisos por recurso. El control se ejecuta en middleware del servidor y los enlaces se ocultan según el permiso efectivo. Mantener las cuentas actuales: migración SQL aditiva e idempotente `003_admin_rbac` crea roles/permisos/auditoría y asigna a cada cuenta existente un rol `Superadministrador` de continuidad sin cambiar IDs, hashes ni estados. Los roles delegados no pueden conceder permisos globales o de administración de roles/usuarios. El último superadministrador no se puede desactivar o remover. La persona con contraseña temporal debe cambiarla al iniciar sesión; la clave propia exige la actual, mínimo 12 caracteres y revoca las demás sesiones. Las mutaciones se registran en `admin_audit_logs`; no se guardan claves en la bitácora.

Se añadió validación CSRF en formularios admin y regeneración de sesión en login/cambio de clave. Los administradores actuales recibirán permisos completos para conservar continuidad operativa; el propietario podrá crear roles limitados después del despliegue.

### Riesgos y límites

- La migración y controles se verificaron localmente; falta ejecutar el Auto-Deploy y recorrer en producción cada pantalla. No afirmar comportamiento completo hasta cerrar ADM-RBAC-02/03.
- Todavía no hay MFA, recuperación por correo, expiración de claves ni gestión de sesiones activas en UI; no deben anunciarse como capacidades.
- Una contraseña temporal elegida por administrador debe entregarse por un canal controlado fuera del sistema; no se envía por correo automáticamente.
- Antes de migrar en producción, Auto-Deploy debe generar un respaldo SQL legible/no vacío; después comparar los 2 usuarios, 16 productos, 6 categorías, 0 reseñas y 0 pedidos de la línea base.

### Criterios de cierre

Ejecutar backup previo con verificación, push no forzado a `main`, esperar `deployed` con SHA exacto y health 200. En navegador autenticado comprobar Usuarios, Roles/permisos y Mi contraseña, comparar los IDs de ambas cuentas y conteos de negocio, y mantener fallos o rutas no ejercitadas como `PENDING` en `TEST_MATRIX.md`.

Responsables propuestos en espera de designación nominal: propietario para identidad visual, URLs/contactos, ubicación/retiro, políticas, COD, pasarela y costes; taller para máquinas, zonas y revisión de diseños; logística para cobertura, tarifas y restricciones de fragancias; contabilidad para impuestos y comprobantes; responsable técnico para capacidad, SLA, backup y retención con asesoría legal. Pendientes las titularidades de dominio, Google y Meta y el alcance de roles. El listado completo y los defaults de desarrollo se mantienen en MASTER_PROMPT §18. Cada aprobación debe registrar fecha, responsable, evidencia y requisitos afectados.

## ADR-003 · MySQL en laboratorio y MongoDB de consulta · APROBADO localmente

**Fecha:** 24 de noviembre de 2026 · **Autorización:** instrucción explícita del propietario en esta conversación · **Alcance:** copia aislada `C:\xampp\php\www\EcommersGaton` únicamente. No autoriza VPS, producción, publicación ni `git push`.

### Contexto y decisión

El baseline local tenía Node/Express/EJS con seis modelos Mongoose, consultas Mongoose en tienda y administración, y sesiones en `connect-mongo`. El propietario pidió migrar el proyecto a MySQL y conservar MongoDB para consulta.

Se conserva Node/Express/EJS y se sustituye el acceso de ejecución por `mysql2/promise`, un repositorio SQL compatible con la forma de datos que consumen las rutas y sesiones `express-session` en `app_sessions`. Los campos principales se guardan en columnas MySQL tipadas e indexadas; los documentos incluyen un `payload JSON` para preservar las estructuras anidadas existentes (variantes, galería, personalización, artículos de pedidos y grupos CMS) sin descartarlas. IDs de 24 caracteres se conservan. La carga inicial se hace en una transacción y nunca vacía ni sobrescribe una tabla de destino existente.

La aplicación web ya no inicia ni consulta MongoDB. Mongoose y el servidor Mongo local quedan como herramientas de desarrollo/importación/consulta, fuera de las dependencias de ejecución. Se conservó intacta la base fuente `gatondo_local`. Las siete sesiones de Mongo no se migraron; tendrán que iniciar sesión de nuevo en MySQL.

### Evidencia, riesgos y alcance pendiente

La importación inicial conservó IDs y contenido de 23 registros de negocio: 1 usuario, 6 categorías, 15 productos y 1 configuración; órdenes y reseñas de origen estaban vacías. Tras cotejar contenido, el smoke creó un pedido sintético y lo dejó cancelado en MySQL, por eso ahora MySQL tiene 1 orden local extra; el inventario del producto de prueba fue restaurado. Mongo mantuvo sus conteos y stock originales.

El `payload JSON` conserva compatibilidad, pero limita reportes relacionales finos sobre campos anidados; normalizar esos agregados requiere ADR posterior y pruebas de paridad. No se ensayó concurrencia de inventario, respaldo/restauración, Docker, producción ni Auto-Deploy. El fallback actual de envíos a costo cero y la ruta `/admin` raíz con 404 son asuntos existentes y separados de esta migración.

### Plan de salida

1. Terminar pruebas locales de rutas y dependencias; mantener riesgos y evidencia en TEST_MATRIX.
2. Preparar Docker/compose y la integración bs-autodeploy como trabajo separado, siguiendo la skill de infraestructura antes de tocar el VPS.
3. Antes de despliegue real: backup comprobado, conteos de datos, credenciales separadas, migración revisada, restauración ensayada, smoke y aprobación del propietario.
4. No publicar esta rama ni activar un despliegue hasta que el propietario lo pida.

## ADR-010 · MySQL/MariaDB como motor vigente y reconciliación de requisitos

**Fecha:** 26 de noviembre de 2026. **Estado:** aprobada por las instrucciones explícitas posteriores del propietario y aplicada al runtime/despliegue. Este addendum supersede el límite local-only original de ADR-003; no reescribe su historial.

### Decisión

La web local y productiva usa `mysql2` con MariaDB/MySQL para catálogo, sesiones, pedidos y administración. MongoDB permanece como fuente histórica de consulta/importación fuera del runtime. Producción ya opera en el VPS Linux `147.93.5.21` con Docker, MariaDB privada, Cloudflare y proxy Nginx; la recomendación original de Atlas/VPS dedicado queda histórica y R2 no está activado. Los requisitos ARC-02, ARC-04, ARC-05 y ARC-06 deben describir la topología vigente, no la alternativa de Atlas; no se vuelve a Mongo por divergencias del Master Prompt original. Los requisitos funcionales y gates de seguridad/aceptación no se reducen.

### Alcance actual y riesgo abierto

El runtime MySQL, esquema versionado y los casos DB01–DB10 tienen evidencia local. DB11 (CRUD y concurrencia de inventario) y DB12 (restauración verificada de DB/storage y Docker) siguen pendientes. El registro de Auto-Deploy confirma la creación de un backup, pero bsdeploy no puede leer `/root`; no se certifica su integridad/restauración. No hacer nuevos cortes de datos ni pruebas destructivas en producción hasta cerrar esa brecha.

## ADR-011 · Propuesta de configurador versionado por lados · PENDIENTE DE APROBACIÓN

**Fecha:** 26 de noviembre de 2026. **Estado:** propuesta de arquitectura; no autoriza cambios estructurales, migraciones, publicación ni despliegue.

### Auditoría actual

El configurador existente usa los campos de personalización guardados en el JSON de producto. El caso de la pulsera permite campo delantero obligatorio incluido, reverso opcional con recargo, fuentes independientes, actualización de precio y snapshot de pedido. En el worktree aislado se añadió además una superposición de texto en tarjetas ilustrativas por lado usando la foto principal y la imagen del reverso; el navegador verificó carga, ajuste tipográfico móvil y sombra nula. La posición es genérica, no calibrada por pieza, y no constituye un contrato de plantilla con zonas editables. CUS-02/03, revisión del taller, gates de fabricación y reproducción de versiones siguen pendientes.

### Arquitectura propuesta

1. Añadir al JSON del producto un `customizationTemplate` aditivo con `schemaVersion`, `templateVersion`, lados con `key`, etiqueta e imagen de fondo, y zonas normalizadas (coordenadas 0–1). Mantener un adaptador de lectura para los productos que aún usan `customizationFields`/`engravingConfig`; no migrar en masa ni reinterpretar pedidos existentes.
2. Definir `fields[]` con clave estable, tipo, lado/zona, obligatoriedad, límites, opciones/fuentes permitidas, reglas de visibilidad declarativas sin código ejecutable y `priceDeltaMinor`. El precio vigente lo valida/recalcula el servidor desde el producto y las opciones configuradas.
3. Renderizar la vista previa por lado mediante SVG accesible generado con nodos/atributos escapados (sin inyectar SVG/HTML del cliente). Mostrar el fondo real y la muestra del texto con fuente permitida; conservar controles de formulario equivalentes para móvil y accesibilidad. El preview es ilustrativo y no es arte listo para láser.
4. Al agregar al carrito, guardar en cada línea un snapshot inmutable con versión de plantilla, valores tipados, tipografías por campo, lados, referencias de assets, recargos y resumen. Cambios de producto posteriores no reescriben pedidos. Checkout recalcula precio y rechaza claves, fuentes, campos visibles o precios manipulados.
5. Extender el administrador para editar número/orden de lados, foto, zona, campos, fuente, obligatoriedad y recargo por campo. Sin publicar silenciosamente: guardar borrador, validar compatibilidad y publicar una nueva versión explícita.

### Riesgos y decisiones pendientes

- Se requieren fotografías frontales/traseras aprobadas y zonas/tamaños por SKU; sin ellas solo puede mostrarse una vista ilustrativa genérica.
- Confirmar las tipografías autorizadas/comerciales, caracteres grabables, máximo por lado y política de texto de dos caras.
- Confirmar si una imagen cargada se asigna a un lado/campo específico, máximos y formatos; la carga debe mantener custodia privada y validar contenido real.
- La posición tipográfica en una foto no garantiza tamaño físico ni resultado de máquina; validar con taller antes de prometer fidelidad.
- Versionar datos anidados en JSON no da integridad relacional automática; aplicar validación estricta, claves estables y límites de tamaño.
- Preservar compatibilidad con líneas antiguas, carrito persistido y fotos ya autorizadas; nunca cambiar su precio/snapshot retroactivamente.

### Plan propuesto

1. Aprobar reglas de lados, fuentes, imágenes, zonas, preview ilustrativo y decisión de versionado.
2. Definir contrato con fixtures y validaciones servidoras; cubrir textos por lado, cargos, versiones antiguas, campos ocultos y manipulación de precio.
3. Implementar adaptador legacy y escritura de nueva plantilla en modo borrador del panel; probar sin modificar productos reales.
4. Implementar preview multi-lado y accesible en una ficha sintética aislada; añadir controles de foto en los casos permitidos.
5. Congelar snapshot al carrito/pedido y probar edición de plantilla después del pedido, dos diseños del mismo SKU, acceso cruzado a assets y móvil.
6. Probar con una ficha de laboratorio de pulsera con fotos/zona aprobadas, revisar con taller y registrar aceptación. Despliegue requiere autorización posterior y backup restaurable comprobado.

**Aprobación solicitada:** aprobar o corregir esta arquitectura y las decisiones de producto/taller antes de comenzar el cambio estructural del configurador.

## ADR-012 · Identidad SKU y ciclo de inventario · ESQUEMA ADITIVO IMPLEMENTADO, OPERACIÓN PENDIENTE

**Fecha:** 27 de noviembre de 2026 · **Alcance:** diseño local para cumplir ADM-02/03, INV-01–05, CART-02 y MIG-02 del Master Prompt. No autoriza migración, datos nuevos de catálogo, despliegue ni escritura en producción.

**Autorización posterior:** 27 de noviembre de 2026 · el propietario autorizó los cambios necesarios y subirlos al servidor. Se limita esta entrega a la migración aditiva sin backfill de productos ni SKU inventados. La migración se ejecutó primero en el esquema limpio local y el despliegue a producción queda sujeto a su respaldo automático, verificación de estado y health check.

### Hallazgos comprobados

- El catálogo MySQL de laboratorio tiene 16 productos activos, 0 variantes y 16 productos sin SKU. El número no implica que deban inventarse SKU comerciales: no existe convención acordada ni identidad física verificada.
- Dry-run de clasificación de solo lectura del 27 nov (`INV-01-SKU-DRYRUN-2026-11-27`): 15 filas son muestras (`Muestra`/`muestra-carrito-*`) y una está marcada `BORRADOR LOCAL`; 0 de 16 son fuente comercial apta para backfill. No se propusieron ni persistieron SKU. Véase `docs/INV_SKU_DRY_RUN_20261127.md`.
- `products.stock` es la columna de saldo simple. Las variantes viven como JSON bajo `payload` y sus saldos/SKU no tienen filas ni restricciones únicas relacionales. `Product.js` no declara campos SKU.
- `inventory_movements` registra importaciones por `product_id`, `variant_index` y `variant_signature`, no por SKU. La importación CSV/XLSX/PDF funciona y fue probada bajo transacción, pero `sku` exportado es informativo y no la llave de actualización.
- El checkout actual bloquea productos, crea pedido y movimiento, descuenta existencias en una transacción e impide sobreventa en la prueba de concurrencia. No existe `reserved`, reserva temporal, liberación por expiración ni reposición idempotente al cancelar.
- La suite local de importación comprueba CSV, XLSX, PDF oficial, preview sin mutación, aplicación/compensación, permisos, firma de variante obsoleta y rollback del lote. No demuestra una identidad SKU estable ni el ciclo integral de reservas/devoluciones.

### Defaults ya especificados por el Master Prompt

Estos requisitos no son decisiones abiertas y se consideran base de la propuesta:

- Inventario físico finito por SKU; `onHand`, `reserved` y `available=onHand-reserved`, con `onHand >= reserved >= 0`. No vender ilimitado ni duplicar existencias de piezas base personalizadas.
- El carrito no reserva ni descuenta. Checkout agrupa demanda incluso para diseños distintos de un SKU y crea pedido/reserva atómicamente con idempotencia. Pago online: reserva propuesta de 30 minutos.
- Transferencia/manual: 24 horas es una propuesta del Master Prompt que aún requiere confirmación comercial; hasta aprobar medios/plazos, esos medios permanecen deshabilitados para venta real.
- COD permanece deshabilitado hasta aprobación; si se habilita, consume inventario al confirmar el pedido autorizado. Para personalizado rige pago total; depósito sigue deshabilitado hasta aprobación.
- Expiración solo libera reservas activas. Cancelación previa al consumo libera; tras consumo, reposición solo por movimiento autorizado si la pieza estándar es físicamente vendible. Personalizados/devoluciones van a cuarentena. Reembolso no repone stock automáticamente.
- Todo ajuste manual requiere actor, motivo y permiso. Auditoría/reconciliación no corrige saldos reescribiendo historial.

### Arquitectura propuesta

1. Modelar cada unidad vendible como un `product_variant` con `variant_id` estable, SKU obligatorio único (normalización sin distinguir mayúsculas/minúsculas), firma de atributos única por producto, importe en centavos DOP y referencia de medios. Un producto simple tendrá una variante base, sin duplicar la existencia histórica.
2. Normalizar variantes y saldos con tablas `product_variants`, `inventory_balances` (una ubicación inicial) y `inventory_movements`; conservar productos, slugs, payload heredado y snapshots de pedidos. `on_hand`, `reserved` y `available=on_hand-reserved` deberán mantener `on_hand >= reserved >= 0` bajo transacción. Las vistas/repositorios adaptarán el formato legacy durante la migración expand/contract.
3. El importador utilizará SKU como identificador principal y reportará SKU ausente, duplicado o ambiguo antes de permitir aplicar. Mientras dure la transición, IDs/signaturas solo se aceptan para productos legacy si la fila incluye la identidad completa cotejada; nunca se buscará por nombre o “primera coincidencia”. CSV/XLSX/PDF seguirán compartiendo el parser/validador, preview inmutable, revalidación transaccional y movimiento auditable.
4. Ajustes administrativos requerirán permiso `inventory.adjust`, motivo, actor y movimiento; una importación masiva tendrá lote/actor/motivo y exportación protegida contra fórmulas. Ninguna UI escribirá saldo directo.
5. El carrito no reserva ni descuenta. Checkout agrupa demanda por SKU; la transacción crea pedido/reserva y usa idempotencia. Los trabajos de expiración solo liberan reservas activas. La aceptación COD y las ventas de pago online deben consumir/liberar según estados explícitos; cancelar después del consumo requiere movimiento de reposición autorizado y estado físico vendible, mientras piezas personalizadas o devueltas quedan en cuarentena.
6. Backfill en dry-run con reporte por producto/variante: ID legacy, atributos, saldo, SKU existente, propuesta sin persistir, duplicados, referencias huérfanas y diferencia de conteos. No generar ni aplicar SKU hasta aprobar convención y cotejar identidad física. No retroescribir pedidos, precios ni historial de movimientos.

### Riesgos y decisiones pendientes

- Convención de SKU, casos con varias combinaciones y si se conserva un SKU ya usado fuera del sistema; el nombre comercial no identifica una unidad vendible.
- Atributos reales por categoría (metal, color, talla, modelo, volumen), fotografías por variante, y cuáles productos son simples frente a productos con variantes.
- Confirmación comercial del plazo de transferencia/manual (24 h propuesto), habilitación de COD y comportamiento de cobros tardíos tras expirar una reserva. Los defaults no autorizan activar esos medios.
- Manejo de cancelación/devolución y criterio de pieza físicamente reutilizable, permisos y actor de ajustes, alertas/límites de stock bajo, ubicaciones y auditoría física de saldo inicial.
- SKU y atributos para las 16 filas no están definidos: el dry-run encontró 15 muestras y un borrador, 0 productos comerciales aptos. No aplicar backfill hasta recibir catálogo/identidades físicas aprobadas.
- La restauración real de base/storage todavía no está probada. El propietario indica que la base de datos está vacía y que por ahora no hace falta respaldo; esto se registra como declaración, no como verificación remota. Para el laboratorio ya existe un esquema MySQL limpio y aislado; no se consultó ni modificó producción.

### Implementación de esta entrega

- `005_inventory_variants_reservations` agrega ubicación principal, variantes con SKU normalizado opcional y único cuando se asigne, balances con `on_hand`, `reserved`, `available` calculado e invariante, reservas/líneas con idempotencia y un `inventory_ledger` relacional. Conserva sin alterar `inventory_movements` como ledger legacy.
- Es expand-only: no renombra ni elimina columnas, no convierte stock legacy, no altera pedidos ni catálogo y no genera SKU. La ubicación principal es una fila técnica necesaria para el modelo, no representa una sede comercial confirmada.
- Ensayo local final en `test_gaton_f0_adr12_20261127`: migraciones 001–005 desde cero y repetición idempotente; prueba de restricciones de SKU/disponible/reserva aprobada. No introduce cuentas ni catálogo demo.
- **Límite explícito:** todavía no se ha migrado el checkout/importador/panel al nuevo ledger ni se habilitaron jobs de expiración, consumo, reposición, ajustes manuales o UI de SKU. Se mantienen los flujos legacy actuales. INV-01–05 continúan `PARTIAL/PENDING` según cada criterio; esta migración no equivale a cerrar el módulo.

### Próximos pasos de implementación

1. Aprobar convención SKU, atributos vendibles, políticas de reserva por medio de pago y roles autorizados.
2. Diseñar migraciones aditivas, índices únicos normalizados, adaptadores legacy, dry-run/diff y rollback compatible; verificar conteos e invariantes sin escribir.
3. Probar parser/import/export de los tres formatos con SKU simple y variantes múltiples, duplicados/case collisions, fórmulas, cantidad negativa, agotado, cambio concurrente, idempotencia y lote obsoleto.
4. Probar localmente reservas concurrentes de varios diseños del mismo SKU, vencimiento/liberación, consumo, cancelación antes/después, devolución en cuarentena y reconciliación ledger/saldo.
5. Solo tras revisión de diff y backup restaurable, habilitar en la copia aislada con datos sintéticos; producción requerirá otra autorización y preflight independiente.

**Pendiente del propietario:** facilitar convención SKU y atributos físicos antes del mapeo comercial; confirmar COD, 24 h para transferencia/manual y política de cancelación/devolución. El propietario autorizó el despliegue de esta base estructural, no la activación de medios de pago ni un backfill de productos.

### Progreso implementado y verificado localmente · 27 de noviembre de 2026

- Migración `006_inventory_adjust_permission` registra el permiso de ajuste y lo concede al rol superadministrador sin cambiar cuentas ni el catálogo.
- El formulario de inventario registra ajustes manuales con motivo, actor e idempotencia; crea el mapeo relacional legacy al momento de operar y solo guarda un SKU que proporcione un administrador. Normaliza el SKU y aplica unicidad de base de datos; no deduce SKU desde nombres.
- CSV/XLSX aceptan SKU normalizado como identidad primaria cuando no traen identidad legacy; el PDF V2 incluye SKU y conserva lectura del V1. La importación de variantes mapeadas y el checkout mantienen el ledger/saldo relacional consistente con el stock legacy. Los elementos sin mapeo siguen el flujo legacy sin crear SKU automáticamente.
- Evidencia: `node --test --test-concurrency=1` con `RUN_DB_MUTATION_TESTS=1` en el laboratorio: 44 aprobadas, 0 fallidas, 1 omitida (prueba de esquema ejecutada aparte, 1/1); `npm audit --omit=dev`: 0 vulnerabilidades; build CSS y `git diff --check` correctos.
- Esta implementación cubre solo ajustes/importaciones/consumo de checkout para artículos mapeados. Reservas en checkout, vencimiento, pagos verificados, cancelación/reposición y devoluciones en cuarentena siguen pendientes; por ello ADR-012 e INV-01–05 no se consideran cerrados. No se hizo backfill ni se añadieron datos demo.
- La entrega queda autorizada para publicar en Gatón por instrucción del propietario del 27 de noviembre; el resultado productivo se registrará tras completar Auto-Deploy y el smoke HTTP.
