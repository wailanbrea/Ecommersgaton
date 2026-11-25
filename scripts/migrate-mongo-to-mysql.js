require("dotenv").config({ path: process.env.ENV_FILE || ".env.local" });
const mongoose = require("mongoose");
const { pool, closeDB } = require("../src/config/db");
const AdminUser = require("../src/models/AdminUser");
const Category = require("../src/models/Category");
const Product = require("../src/models/Product");
const Order = require("../src/models/Order");
const Review = require("../src/models/Review");
const SiteSettings = require("../src/models/SiteSettings");

const collections = [
  ["adminusers", AdminUser], ["categories", Category], ["products", Product],
  ["orders", Order], ["reviews", Review], ["sitesettings", SiteSettings]
];
const apply = process.argv.includes("--apply");
const verifyOnly = process.argv.includes("--verify");

function convert(value) {
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.map(convert);
  if (value && typeof value === "object") {
    if (value._bsontype === "ObjectId") return value.toHexString();
    if (value._bsontype === "Decimal128") return Number(value.toString());
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, convert(item)]));
  }
  return value;
}

function canonical(value) {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
}

function diffPaths(left, right, prefix = "") {
  if (left instanceof Date || right instanceof Date) {
    return new Date(left).getTime() === new Date(right).getTime() ? [] : [prefix || "date"];
  }
  if (left && right && typeof left === "object" && typeof right === "object") {
    const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
    return [...keys].flatMap((key) => diffPaths(left[key], right[key], prefix ? `${prefix}.${key}` : key));
  }
  return Object.is(left, right) ? [] : [prefix || "value"];
}

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Importación bloqueada en NODE_ENV=production.");
  if (!process.env.MYSQL_DATABASE || !/local|lab/i.test(process.env.MYSQL_DATABASE)) {
    throw new Error("El destino debe ser una base explícitamente local o de laboratorio.");
  }
  const sourceUri = process.env.MONGO_SOURCE_URI;
  if (!sourceUri) throw new Error("Define MONGO_SOURCE_URI para la base local que se consultará.");
  const parsed = new URL(sourceUri);
  if (!/^(localhost|127\.0\.0\.1|::1)$/.test(parsed.hostname) || !/gatondo_local/.test(parsed.pathname)) {
    throw new Error("Solo se permite leer la base MongoDB gatondo_local en loopback.");
  }
  await mongoose.connect(sourceUri, { serverSelectionTimeoutMS: 5000 });
  const source = mongoose.connection.db;
  const records = new Map();
  for (const [collection] of collections) records.set(collection, await source.collection(collection).find({}).toArray());
  const sourceCounts = Object.fromEntries([...records].map(([name, rows]) => [name, rows.length]));
  const targetCounts = {};
  for (const [collection, Model] of collections) {
    const [rows] = await pool.execute(`SELECT COUNT(*) AS count FROM \`${Model.modelName}\``);
    targetCounts[collection] = Number(rows[0].count);
  }

  if (verifyOnly) {
    let mismatches = 0;
    for (const [collection, Model] of collections) {
      const sourceRows = records.get(collection).map(convert);
      for (const sourceRow of sourceRows) {
        const targetRow = await Model.findById(String(sourceRow._id)).lean();
        if (!targetRow) { mismatches += 1; console.log(`${collection}: faltó un registro en MySQL`); continue; }
        const diffs = diffPaths(canonical(sourceRow), canonical(targetRow));
        if (diffs.length) { mismatches += 1; console.log(`${collection}: campos distintos=${[...new Set(diffs)].join(",")}`); }
      }
      console.log(`${collection}: Mongo=${sourceCounts[collection]} MySQL=${targetCounts[collection]}`);
    }
    if (mismatches) throw new Error(`Verificación de contenido: ${mismatches} registro(s) no coinciden.`);
    console.log("Verificación completa: IDs y contenido coinciden. Las sesiones no se migran.");
    return;
  }

  console.log("Origen local; destino local. Conteos antes de importar:");
  for (const [collection] of collections) console.log(`${collection}: origen=${sourceCounts[collection]}, destino=${targetCounts[collection]}`);
  if (!apply) {
    console.log("Simulación terminada. No se escribió ningún dato. Usa --apply para importar.");
    return;
  }
  if (Object.values(targetCounts).some((count) => count !== 0)) {
    throw new Error("Las tablas destino deben estar vacías; no se sobrescribirán ni combinarán registros existentes.");
  }
  const [migrationRows] = await pool.execute("SELECT version FROM schema_migrations WHERE version = '001_initial'");
  if (!migrationRows.length) throw new Error("Ejecuta npm run db:migrate antes de importar.");

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    for (const [collection, Model] of collections) {
      const rows = records.get(collection).map(convert);
      await Model.importMany(rows, connection);
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  console.log("Importación transaccional terminada. Las sesiones Mongo no se trasladaron.");
}

main().catch((error) => {
  console.error("Importación MongoDB → MySQL falló:", error.message);
  process.exitCode = 1;
}).finally(async () => {
  await mongoose.disconnect().catch(() => {});
  await closeDB().catch(() => {});
});