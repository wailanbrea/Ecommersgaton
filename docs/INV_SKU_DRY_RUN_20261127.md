# Dry-run de identidad SKU · 27 de noviembre de 2026

## Alcance y método

Consulta de solo lectura en `gatondo_local_mysql` sobre `127.0.0.1`, usando únicamente productos activos y campos del catálogo necesarios para clasificar identidad: ID, nombre, slug, categoría, variantes, SKU y stock. No se escribió ni actualizó ningún registro y no se generaron SKU candidatos.

## Resultado observado

- 16 productos activos.
- 0 productos con variantes.
- 0 SKU en productos simples y 0 SKU de variante.
- 15 productos están identificados como muestras en nombre/slug (`Muestra` / `muestra-carrito-*`); el restante se llama `BORRADOR LOCAL`.
- Por tanto, 0 de 16 filas son una fuente comercial validada para backfill de identidad SKU. Los saldos observados son fixtures del laboratorio, no un inventario físico conciliado.

## Decisión del dry-run

No proponer ni aplicar SKU automáticos sobre este catálogo. Aunque el ID técnico del producto podría producir un valor único, no acredita que la etiqueta corresponda a una pieza vendible ni a un SKU ya usado fuera del sistema. Las muestras y el borrador no deben contaminar el inventario real.

Para continuar el backfill se necesita el catálogo real validado, identificar productos simples frente a variantes y aprobar una convención que permita cotejar el SKU físico existente. La eventual importación será otra operación, con preview, conteos y autorización propios.

## Estado

`VERIFIED · dry-run de clasificación local, solo lectura`. No acredita ni altera datos de producción y no autoriza migraciones.
