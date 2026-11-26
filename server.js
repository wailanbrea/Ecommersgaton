require("express-async-errors");
require("dotenv").config();
const path = require("path");
const express = require("express");

const { connectDB, pool } = require("./src/config/db");
const sessionMiddleware = require("./src/config/session");
const globalsMiddleware = require("./src/middlewares/globals");
const AdminUser = require("./src/models/AdminUser");
const Order = require("./src/models/Order");
const { loadPermissionCodes } = require("./src/services/adminAccess");
const storeRoutes = require("./src/routes/store");
const adminRoutes = require("./src/routes/admin");

const app = express();
if (process.env.NODE_ENV === "production") app.set("trust proxy", Number(process.env.TRUST_PROXY || 1));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
const publicStatic = express.static(path.join(__dirname, "public"));
app.use((req, res, next) => {
  if (req.path.startsWith("/customization-assets/") || req.path.startsWith("/uploads/customizations/")) return next();
  return publicStatic(req, res, next);
});
app.use(sessionMiddleware);
app.get(["/customization-assets/:filename", "/uploads/customizations/:filename"], async (req, res) => {
  const filename = String(req.params.filename || "");
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,180}$/.test(filename) || filename.includes("..")) {
    return res.status(404).send("Archivo no encontrado");
  }
  const assetUrl = req.path.startsWith("/uploads/") ? `/uploads/customizations/${filename}` : `/customization-assets/${filename}`;
  let allowed = (req.session.cart || []).some((item) => item.customizationPhotoUrl === assetUrl);
  if (!allowed && Array.isArray(req.session.recentOrderIds)) {
    for (const orderId of req.session.recentOrderIds.slice(-10)) {
      const order = await Order.findById(orderId).lean();
      if ((order?.items || []).some((item) => item.customizationPhotoUrl === assetUrl)) { allowed = true; break; }
    }
  }
  if (!allowed && req.session.adminId) {
    const admin = await AdminUser.findById(req.session.adminId);
    if (admin?.active && !admin.mustChangePassword) {
      const permissions = await loadPermissionCodes(admin._id);
      allowed = permissions.has("orders.view");
    }
  }
  if (!allowed) return res.status(404).send("Archivo no encontrado");

  const privateRoot = path.join(__dirname, "storage", "customizations");
  const filePath = req.path.startsWith("/uploads/")
    ? path.join(__dirname, "public", "uploads", "customizations", filename)
    : path.join(privateRoot, filename);
  res.set({ "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Disposition": "inline" });
  return res.sendFile(filePath, (error) => { if (error && !res.headersSent) res.status(error.statusCode === 404 ? 404 : 500).end(); });
});
app.use(globalsMiddleware);
app.get("/health/ready", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.status(200).json({ status: "ready", database: "mysql" });
  } catch {
    res.status(503).json({ status: "unavailable", database: "mysql" });
  }
});
app.use("/", storeRoutes);
app.use("/admin", adminRoutes);
app.use((req, res) => res.status(404).send("404 - Página no encontrada"));
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  console.error("Error en solicitud:", error.message);
  res.status(500).send("Error interno del servidor.");
});

async function start() {
  await connectDB();
  const port = Number(process.env.PORT || 8080);
  const host = process.env.HOST || "127.0.0.1";
  const server = app.listen(port, host, () => {
    console.log(`Servidor Gatón DO listo en http://${host}:${server.address().port} (MySQL)`);
  });
  return server;
}

if (require.main === module) {
  start().catch(async (error) => {
    console.error("No se pudo iniciar Gatón DO:", error.message);
    await pool.end().catch(() => {});
    process.exitCode = 1;
  });
}
module.exports = { app, start };
