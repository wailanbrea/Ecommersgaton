# Decisiones y plan de implementación

## ADR-009 · Precio configurable y tipografía independiente por campo · Aprobada en laboratorio

**Fecha:** 26 de noviembre de 2026. **Solicitud:** permitir que cada campo del configurador sea obligatorio u opcional y gratuito o de pago; ejemplo: pulsera a RD$1,290, grabado frontal incluido y grabado trasero opcional con recargo de RD$200. Cada cara conserva su selección tipográfica; el selector trasero aparece solo cuando se introduce texto trasero. **Estado:** aprobada por el usuario e implementada en el laboratorio local. Sin despliegue a producción.

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
