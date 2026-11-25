# Historial

## 2026-11-24 · F0

Identificada y reconciliada la entrega de septiembre. Registrados los 94 requisitos, 27 escenarios de aceptación, rutas, export y dependencias. Instalación y smoke local sobre MongoDB replica set, pruebas básicas de ancho y estudio sintético de personalización. ADRs en propuesta. Archivos de control creados en el repositorio local; el código del cliente se conserva en su ubicación original. Fase 1 pendiente de autorización.

## 2026-11-24 · Migración local MongoDB → MySQL

- Web y sesiones pasan a MariaDB/MySQL; Mongoose queda en dev para migración y consulta.
- Se importaron y cotejaron 23 registros de negocio con IDs/campos conservados; Mongo local no se modificó.
- Se añadió esquema versionado, importación transaccional con dry-run, health readiness, repositorio SQL y pruebas de integración.
- Se añadió pedido sintético cancelado para smoke de checkout; no se envió ningún mensaje ni pago.
- Dependencias runtime actualizadas dentro del rango compatible; auditoría runtime sin vulnerabilidades. Dos moderadas dev quedan documentadas.
- La rama local apunta al remoto GitHub vacío; sin push ni despliegue.