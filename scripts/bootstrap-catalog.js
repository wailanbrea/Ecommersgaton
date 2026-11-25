require("dotenv").config({ path: process.env.ENV_FILE || ".env.local" });
const fs = require("node:fs");
const path = require("node:path");
const bcrypt = require("bcryptjs");
const { pool, closeDB } = require("../src/config/db");
const Category = require("../src/models/Category");
const Product = require("../src/models/Product");
const SiteSettings = require("../src/models/SiteSettings");
const AdminUser = require("../src/models/AdminUser");

const DATA_FILE = path.join(__dirname, "..", "deploy", "linux", "initial-catalog.json");

function parsePayload(row) {
  return typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload;
}

async function exportCatalog() {
  const tables = ["categories", "products", "site_settings"];
  const data = {};
  for (const table of tables) {
    const [rows] = await pool.query(`SELECT payload FROM \`${table}\``);
    data[table] = rows.map(parsePayload);
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
  console.log("Catálogo inicial exportado:", {
    categories: data.categories.length,
    products: data.products.length,
    site_settings: data.site_settings.length
  });
}

async function importCatalog() {
  if (!fs.existsSync(DATA_FILE)) {
    throw new Error(`No existe ${DATA_FILE}`);
  }
  const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  const [[catCount]] = await pool.query("SELECT COUNT(*) AS c FROM categories");
  const [[prodCount]] = await pool.query("SELECT COUNT(*) AS c FROM products");
  const [[setCount]] = await pool.query("SELECT COUNT(*) AS c FROM site_settings");

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    if (Number(catCount.c) === 0 && Array.isArray(data.categories) && data.categories.length) {
      await Category.importMany(data.categories, connection);
    }
    if (Number(prodCount.c) === 0 && Array.isArray(data.products) && data.products.length) {
      await Product.importMany(data.products, connection);
    }
    if (Number(setCount.c) === 0 && Array.isArray(data.site_settings) && data.site_settings.length) {
      await SiteSettings.importMany(data.site_settings, connection);
    }
    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }

  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    const email = process.env.ADMIN_EMAIL.trim().toLowerCase();
    if (!(await AdminUser.exists({ email }))) {
      await AdminUser.create({
        name: (process.env.ADMIN_NAME || "Administrador Gatón DO").trim(),
        email,
        passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD, 12),
        roles: ["admin"],
        active: true
      });
      console.log(`Usuario administrador inicial creado (${email}).`);
    }
  }
  console.log("Bootstrap de catálogo y ajustes iniciales completado.");
}

const mode = process.argv[2] || "--import";
(mode === "--export" ? exportCatalog() : importCatalog())
  .catch((error) => {
    console.error("Error en bootstrap-catalog:", error.message);
    process.exitCode = 1;
  })
  .finally(closeDB);
