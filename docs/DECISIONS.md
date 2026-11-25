# Decisiones y plan de implementación

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
