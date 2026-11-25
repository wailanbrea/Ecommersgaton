require("express-async-errors");
require("dotenv").config();
const path = require("path");
const express = require("express");

const { connectDB, pool } = require("./src/config/db");
const sessionMiddleware = require("./src/config/session");
const globalsMiddleware = require("./src/middlewares/globals");
const storeRoutes = require("./src/routes/store");
const adminRoutes = require("./src/routes/admin");

const app = express();
if (process.env.NODE_ENV === "production") app.set("trust proxy", Number(process.env.TRUST_PROXY || 1));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(sessionMiddleware);
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