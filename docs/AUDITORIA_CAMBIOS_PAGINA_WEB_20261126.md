# Auditoría de cambios sugeridos · CAMBIOS PAGINA WEB

**Fuente original:** `E:\Gaton Ecommer\CAMBIOS PAGINA WEB.pdf` · 2 páginas · 319,324 bytes · SHA-256 `6BA46377A44158D76A71D4D07B1CCC9838FF8488389A8D18BBF7E030C9D9C534`.

**Verificación de la fuente:** texto extraído de las dos páginas y revisión visual de las cuatro páginas renderizadas de los dos PDF de cambios el 26 de noviembre de 2026. Los originales no se modificaron. La lectura y las imágenes concuerdan; no se observó contenido ilegible.

## Estados

- **EXISTING:** existe código que parece cubrir el requisito, pero aún no hay prueba ejecutada de todo el criterio.
- **PARTIAL:** hay cobertura parcial o el entregable disponible es incompleto/obsoleto.
- **PENDING:** no hay implementación suficiente.
- **VERIFIED:** el criterio completo se probó; citar la prueba.

No se marca **VERIFIED** por inspección de código, presencia de formularios o contenido de un manual.

## Puntos del PDF

| ID | Estado | Requerimiento original | Evidencia en esta auditoría | Pendiente / prueba necesaria |
|---|---|---|---|---|
| CMW-01 | EXISTING · no verificado | Poder cambiar textos, textos de botones y destinos desde el panel administrativo. | El formulario `views/admin/settings/edit.ejs` expone, entre otros, texto/URL de portada, texto/URL secundaria, historia, fragancias, enlaces de tarjetas, y categorías guardan su título/destino; `src/routes/admin.js` prepara, valida y persiste esos valores. El manual local de 6 páginas describe una parte. | Ejecutar guardar→recargar configuración→comprobar sección pública, destinos internos/externos y fallback. No se hizo escritura en producción. |
| CMW-02 | EXISTING · no verificado | Editar desde el panel los textos y enlaces mostrados en las imágenes/secciones del PDF, sin depender de desarrollo. | Hay campos CMS para portada, colección, fragancias, historia, franjas, enlaces de tarjeta y contacto en `views/admin/settings/edit.ejs`; las tarjetas por categoría usan destinos guardados en categorías. | No se comprobó en navegador cada campo ni que todos los textos visibles estén administrables. El Master Prompt conserva los criterios de contenido no cubiertos. |
| CMW-03 | EXISTING · no verificado | Mostrar categorías de joyas/productos (Brazaletes, Collares, Anillos, Fragancias, Personalizados) y hacer aparecer categorías nuevas al crearlas en el panel. | `src/routes/store.js` filtra categorías de género y construye categorías públicas/raíces desde registros activos; `src/routes/admin.js` tiene gestión de categorías. El catálogo renderiza la lista recibida. | Probar alta de una categoría sintética en laboratorio, su aparición en portada/catálogo y la exclusión de inactivas/subcategorías. No se creó categoría durante esta auditoría. Confirmar qué hacer con categorías adicionales fuera de esos ejemplos. |
| CMW-04 | EXISTING · no verificado | Limitar los géneros administrables a Hombres, Mujeres, Niñ@s y Animales. | `GENDER_OPTIONS` en `src/routes/admin.js` y `src/routes/store.js` contiene esos cuatro valores. El filtro de género ya no se muestra al comprador según GC-02. | Falta una prueba de formulario para confirmar exactamente esos cuatro valores y que entradas manipuladas se rechacen sin reescribir géneros legacy. |
| CMW-05 | PARTIAL | Entregar un manual PDF completo del panel, listo con el sitio, para que el cliente pueda operar sin pedir cambios de código. | Existe `docs/Manual-panel-Gaton-DO.pdf`, 6 páginas, titulado “Manual del panel local”, fechado 24-11-2026. La revisión visual muestra capturas locales con datos de ejemplo/placeholder y el texto de página 1 instruye abrir `127.0.0.1:8081`. Describe categorías, productos/ofertas, pedidos, reseñas y configuración. | No es una guía de la versión productiva ni cubre todas las pantallas presentes: ventas/analítica, importación/exportación CSV/XLSX/PDF, roles/permisos, opciones de personalización por lado/precio/foto, recuperación de errores y procedimientos operativos. Requiere actualización con capturas actuales sin PII y prueba de los pasos contra el sistema que se entregue. |

## Resultado y límites

Los puntos CMW-01–04 tienen implementación visible en el código, pero esta revisión estática no acredita el recorrido completo de guardado ni su aceptación; quedan `EXISTING`, no `VERIFIED`. CMW-05 está `PARTIAL` por alcance, URL y capturas locales desactualizadas. No se cambió código de tienda, catálogo, usuarios ni producción como resultado de esta auditoría.

La auditoría separada de `GATON CAMBIOS .pdf` está en [AUDITORIA_GATON_CAMBIOS_20261126.md](AUDITORIA_GATON_CAMBIOS_20261126.md); GC-04 permanece parcial por falta de los logos originales y su mapa de asignación.
