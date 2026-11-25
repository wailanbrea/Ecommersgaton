GATON DO - E-commerce
Entrega de versión actual para continuidad de desarrollo

Contenido incluido:
- Código fuente Node.js / Express / MongoDB / EJS
- Vistas públicas y panel administrativo
- Archivos CSS e imágenes públicas
- Uploads públicos necesarios, incluyendo video/banner si existe
- Configuración visual actual dentro del código

Contenido NO incluido por seguridad:
- Archivo .env
- Contraseñas
- Credenciales de base de datos
- node_modules
- Backups internos del servidor
- Logs
- Sesiones
- Datos sensibles de clientes/pedidos

Notas para el próximo desarrollador:
1. Instalar dependencias con:
   npm install

2. Crear un archivo .env propio con las variables necesarias:
   MONGODB_URI=
   SESSION_SECRET=
   PORT=8080

3. Iniciar en desarrollo:
   npm run dev

4. Iniciar en producción con PM2:
   pm2 start server.js --name gatondo-ecommerce

5. El proyecto usa:
   - Node.js
   - Express
   - MongoDB / Mongoose
   - EJS
   - CSS propio
   - Panel administrativo en /admin

6. La versión entregada conserva:
   - Banner con video de fondo
   - Textos de anuncios restaurados
   - Catálogo
   - Productos personalizados
   - Carrito
   - Checkout
   - Pedidos por WhatsApp
   - Función de carga de foto para fotograbado si está activa en producto
