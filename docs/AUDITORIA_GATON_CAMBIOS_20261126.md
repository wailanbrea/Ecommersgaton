# Auditoría de cambios sugeridos · GATÓN DO

**Fuente:** `E:\Gaton Ecommer\GATON CAMBIOS .pdf` (2 páginas)
**SHA-256:** `04e88534155b2d45e04df5694250f3fe85d16d7ecbec8704150797920ea26296`
**Revisión:** 26 de noviembre de 2026 · código `main` en `40d0e61` · producción `40d0e61`
**Alcance:** cotejo inicial de los 9 puntos contra el código y producción, seguido de la implementación local de GC-01/GC-02 y su verificación en laboratorio. No se cambiaron datos comerciales.

## Estados

- **VERIFIED**: el criterio descrito se observó en la versión desplegada o tiene una prueba previa documentada para ese comportamiento.
- **PARTIAL**: parte del criterio está implementada; queda un detalle o una ambigüedad que impide marcar el punto completo.
- **PENDING**: no hay implementación suficiente ni evidencia.

## Lista para tachar

| ID | Estado | Punto del PDF y evidencia | Pendiente / límite |
|---|---|---|---|
| GC-01 | [x] **VERIFIED** | En Chromium local, el enlace `Fragancias` llevó a `/#fragancias` y desplazó la sección al viewport (`scrollY=3897`, sección a `top=91.6px`). La comprobación pública confirmó el mismo enlace y el objetivo `id=fragancias`. La CTA separada `Explorar Fragancias` conserva su función de abrir el catálogo, como requiere el Master Prompt. | Verificado en laboratorio y en producción. |
| GC-02 | [x] **VERIFIED** | En Chromium local y producción, el catálogo conserva búsqueda y categoría, no renderiza selector/chips/opciones de género y muestra 15 productos. Los datos y campos de género se conservaron para administración y compatibilidad. | Verificado en laboratorio y en producción. |
| GC-03 | [x] **VERIFIED** | Los dos textos están asignados en el orden descrito por el Master Prompt: la franja superior muestra “PERSONALIZAMOS LO QUE MÁS IMPORTA…”, y la banda de portada muestra “NOMBRES · INICIALES · FECHAS · FOTOS · FRASES · LOGOS · DISEÑOS…”. Ambos se observaron en la portada desplegada. | Ninguno observado. |
| GC-04 | [ ] **PARTIAL** | Hay variantes de logo por ubicación: encabezado, logo móvil, hero, historia y footer. El encabezado móvil usa `/images/logo-gatondo-header.png`; las vistas desplegadas muestran marca GATÓN. | El PDF dice que las versiones correctas se enviaron por WhatsApp y especifica su ubicación. Esos originales y el mapa de asignación no están en el repositorio disponible; no puedo confirmar que cada archivo actual corresponda al entregado. `docs/STATUS.md` también registra esta dependencia. |
| GC-05 | [x] **VERIFIED** | En la portada desplegada, el orden relativo es Colección → Fragancias → Historia → Clientes → Contacto. El bloque “Tu pedido en 3 pasos” está entre Historia y Clientes, sin invertir los apartados solicitados. | Ninguno para el orden relativo solicitado. |
| GC-06 | [x] **VERIFIED** | La página desplegada muestra `+1 (849) 330-6269`; el enlace de WhatsApp usa `wa.me/18493306269`. | Ninguno observado. |
| GC-07 | [x] **VERIFIED** | En producción, al abrir el carrito, aparece el panel lateral con “Tu carrito”, botón de cierre, logo y estado vacío, como en la referencia del PDF. La prueba local `DB04` de `docs/TEST_MATRIX.md` ya verificó miniatura, subtotal, total y persistencia de sesión con un carrito con artículos. | No agregué un artículo a la sesión productiva para esta auditoría; la comprobación con artículos corresponde al laboratorio local. |
| GC-08 | [ ] **PARTIAL** | El footer desplegado muestra `Av. Independencia, Km. 11, Distrito Nacional, Santo Domingo, Rep. Dom.` | El bloque de ubicación de la sección Contacto todavía muestra solo `Santo Domingo, RD`. Hay que actualizar también ese bloque para completar el punto en toda la portada. |
| GC-09 | [x] **VERIFIED** | Las tarjetas de productos muestran el precio vigente y, cuando hay oferta, el precio anterior tachado fuera de la ficha. En producción, la tarjeta de Ámbar muestra RD$900 y RD$1,200 en `/shop?category=fragancias`; también se ve en la portada. | Ninguno observado para las tarjetas. |

## Resultado

**7 puntos verificados y 2 parciales.** GC-01 ya estaba implementado en el enlace del menú y quedó verificado; la CTA separada `Explorar Fragancias` conserva su destino al catálogo. GC-02 se desplegó como `0364187` y se comprobó en producción. GC-04 depende de los logos originales y su mapa; GC-08 requiere aplicar la dirección precisa al bloque Contacto además del footer.

Las verificaciones de producción fueron de lectura: portada, catálogo de Fragancias, menú, tarjetas de precios, apertura del carrito vacío y verificación posterior de `0364187`. No se crearon pedidos, no se agregaron productos a una sesión productiva y no se alteró inventario ni configuración productiva.
