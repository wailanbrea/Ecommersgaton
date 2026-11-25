# Datos · Mapa de partida

El ZIP archivado y el directorio de E: tienen idéntico contenido. El export público contiene 13 categorías, 6 productos, 1 configuración y 0 reseñas. Los seis productos tienen categoría referenciada en el export, stock 10 cada uno, género vacío y array de variantes vacío. Cinco tienen dos grupos legacy de elección. No interpretar esos grupos como SKU con saldo propio. La configuración incluye cuatro tarifas inactivas. Las tres referencias locales distintas con prefijo /images, /uploads, /fonts o /storage detectadas en el JSON resolvieron a un archivo. URLs externas y derechos requieren revisión separada.

| Origen | Destino y preservación |
|---|---|
| Category, Product y variantes embebidas | Conservar ID y slug; separar género, SKU y atributos. Conservar íntegros choiceGroups, engravingPreviewEnabled y customizationUpload* hasta conocer semántica. Escalar mapeos ambiguos al propietario. |
| Number en precios y stock | Validar precisión y valores, convertir moneda exactamente a centavos y reconciliar saldo físico por SKU. |
| SiteSettings y defaults en vista | Comparar por campo y versión, mostrar preview al cliente; las ediciones reales posteriores prevalecen. |
| Order, Review, sesiones y diseños | Sin pedidos ni sesiones reales en export. Conservar snapshots originales; registrar legacy para hechos no demostrables. No inferir pago ni compra verificada. |
| public/uploads y storage/designs | Inventario por hash, finalidad y permisos; distinguir fotos de producto de originales privados. Reubicar solo tras respaldar y verificar referencias. |

Próximo ensayo autorizado: backup aislado, manifiestos y conteos/IDs antes y después; dry-run idempotente con errores por registro; restauración en destino separado y comparación completa. Para corte real harían falta autorización, delta final, conciliación y rollback compatible con operaciones nuevas. Ninguna migración ejecutada en F0.

## Ejecución local · migración MongoDB → MySQL (24 nov 2026)

**Entorno:** copia de laboratorio en `C:\xampp\php\www\EcommersGaton`; Node 24.4.0, npm 11.4.2, MongoDB 7.0.24 local, MariaDB 11.4.12 local. La base fuente fue `gatondo_local` en loopback. El destino aislado fue `gatondo_local_mysql` con cuenta local de alcance restringido. Ninguna base remota o de producción fue usada.

**Respaldo previo de código:** `C:\xampp\php\www\EcommersGaton-mongo-backup-20261124`. Contiene los 16 archivos originales de `src` y 5 archivos de arranque/paquetes; verificados por conteo y manifiesto SHA-256. El respaldo excluye `.env.local`, bases, `node_modules`, almacenamiento y medios; esos datos no fueron modificados. MongoDB quedó intacta.

### Conteo fuente previo a importar

| Colección Mongo | Documentos | Tabla MySQL | Estado de contenido |
|---|---:|---|---|
| adminusers | 1 | admin_users | IDs y contenido verificados |
| categories | 6 | categories | IDs y contenido verificados |
| products | 15 | products | IDs y contenido verificados |
| sitesettings | 1 | site_settings | IDs y contenido verificados |
| orders | 0 | orders | Sin registros de origen |
| reviews | 0 | reviews | Sin registros de origen |
| sessions | 7 | app_sessions | No migradas; sesiones se reinician |

`npm run db:import-mongo` solo simula. `npm run db:import-mongo -- --apply` exige destino de nombre local/lab, origen loopback `gatondo_local`, esquema instalado y tablas vacías. Inserta los seis grupos de negocio en una transacción y omite sesiones. La importación se ejecutó una sola vez. `npm run db:verify-import` comparó IDs y documentos completos y pasó con 23 registros de negocio, incluidos sus datos anidados.

Después de validar el checkout en navegador quedó un pedido sintético cancelado en MySQL (un registro adicional que no existía en Mongo). Su subtotal y total se comprobaron; el stock del producto usado se restauró a 12. No se envió comunicación externa ni se tocó Mongo. Una verificación posterior confirmó que los 23 registros de origen siguen presentes e idénticos; el destino muestra 1 orden local adicional.

### Arranque local

```powershell
npm ci
npm run db:migrate
npm run start:local
```

La aplicación escucha en `http://127.0.0.1:8081`. `npm run seed:local` es idempotente y no sustituye productos ni pedidos. El importador Mongo queda fuera de la web y solo debe repetirse en un destino vacío de laboratorio. `.env.local` contiene las credenciales locales y está excluido de Git; no copiar secretos de desarrollo al VPS.

### Reversión y límites

Para volver al código previo puede consultarse el respaldo indicado arriba; no hace falta revertir ni borrar bases. El esquema y datos de `gatondo_local_mysql` se conservan para inspección. No hay tarea de retirada de Mongo: su proceso y archivos permanecen como referencia local de solo consulta. La migración no incluye Docker, backup de producción, proveedor de pagos ni despliegue.