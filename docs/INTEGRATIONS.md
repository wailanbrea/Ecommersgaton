# Integraciones · Inventario y dependencias

| Servicio | Base encontrada | Responsable y puerta de entrada |
|---|---|---|
| WhatsApp | wa.me manual en ficha y éxito; sin evidencia de WABA, inbox ni webhooks | Titular de Meta confirma número, coexistencia, permisos, plantillas y opt-in. Probar sandbox T17/T18. |
| Google Business Profile | Sin OAuth ni sincronización en el código | Titular verifica perfil, enlace y ubicación. T21 y aceptación real autorizada por separado. |
| Pagos | cash_on_delivery fijado al crear pedido. Sin pasarela ni conciliación | Finanzas elige proveedor y certificación. Adaptador de cobro alojado, consulta e idempotencia T11/T12. |
| Transporte | Opciones de configuración con tarifa plana y fallback a cero | Operaciones aprueba zonas, retiro, restricciones y reglas. T15/T16. |
| Medios y correo | Disco local público para uploads. No se identificó servicio de correo transaccional | Responsable de privacidad autoriza retención, bucket y canal; T07/T24. |
| Analítica | Sin contrato de eventos o consentimiento acreditado | Propietario define tags y finalidad, verificar T23. |

Las credenciales y activaciones externas están pendientes. Diseñar capacidades y fallbacks según §3 y contratos §14. Ningún proveedor fue contactado para activar un servicio.
