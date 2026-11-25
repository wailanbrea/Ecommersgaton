require("dotenv").config({ path: process.env.ENV_FILE || ".env.local" });
const fs = require("node:fs/promises");
const path = require("node:path");
const { pool, closeDB } = require("../src/config/db");

const VERSION = "001_initial";

async function migrate() {
  const schemaPath = path.join(__dirname, "..", "src", "db", "migrations", `${VERSION}.sql`);
  const statements = (await fs.readFile(schemaPath, "utf8"))
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);
  for (const statement of statements) await pool.query(statement);
  await pool.execute("INSERT IGNORE INTO schema_migrations (version, applied_at) VALUES (?, UTC_TIMESTAMP(3))", [VERSION]);
  const [rows] = await pool.execute("SELECT version FROM schema_migrations WHERE version = ?", [VERSION]);
  if (!rows.length) throw new Error(`La migración ${VERSION} no quedó registrada.`);
  console.log(`Esquema MySQL listo: ${VERSION}`);
}

migrate().catch((error) => {
  console.error("Falló la migración del esquema MySQL:", error.message);
  process.exitCode = 1;
}).finally(closeDB);