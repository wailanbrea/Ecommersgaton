# Gatón DO · reglas de continuidad

- Trabajar en español, moneda DOP y zona `America/Santo_Domingo`.
- Leer este archivo, `docs/MASTER_PROMPT.md`, `docs/STATUS.md`, `docs/DECISIONS.md`, `docs/TEST_MATRIX.md` y el estado de Git antes de cada sesión.
- Usar la especificación y fuentes originales del proyecto como evidencia; conservar el ZIP de cliente y las bases de consulta sin modificaciones.
- No tocar producción, VPS, publicar ni activar Auto-Deploy sin alcance y autorización explícitos. Antes de operar el VPS, leer las instrucciones de infraestructura BSolutions.
- No sembrar ni purgar producción. Seeds de demo solo en laboratorio; migraciones deben preservar registros y tener reconciliación y rollback.
- Cambios estructurales requieren auditoría, decisión ADR, riesgos, plan y aprobación del propietario. No reconstruir ni eliminar funciones sin autorización.
- Registrar por ID dependencia, implementación, prueba, evidencia, riesgo, responsable y estado. `VERIFIED` exige criterio completo y prueba ejecutada; `ACCEPTED` requiere validación del propietario.
- Separar `.env`, secretos, sesiones, datos locales y medios de prueba del repositorio. Nunca imprimir credenciales.
- No borrar información existente como forma de limpieza; respaldar y verificar antes de intervenir.