require("dotenv").config({ path: process.env.ENV_FILE || ".env.local" });
const fs = require("node:fs/promises");
const path = require("node:path");
const { pool, closeDB } = require("../src/config/db");

const MIGRATIONS_DIR = path.join(__dirname, "..", "src", "db", "migrations");

async function migrate() {
  const names = (await fs.readdir(MIGRATIONS_DIR)).filter((name) => /^\d+_[a-z0-9_-]+\.sql$/i.test(name)).sort();
  for (const name of names) {
    const version = name.replace(/\.sql$/i, "");
    const [applied] = await pool.execute("SELECT version FROM schema_migrations WHERE version = ?", [version]).catch((error) => {
      if (error.code === "ER_NO_SUCH_TABLE") return [[], []];
      throw error;
    });
    if (applied.length) continue;
    const statements = (await fs.readFile(path.join(MIGRATIONS_DIR, name), "utf8")).split(";").map((sql) => sql.trim()).filter(Boolean);
    for (const statement of statements) await pool.query(statement);
    await pool.execute("INSERT IGNORE INTO schema_migrations (version, applied_at) VALUES (?, UTC_TIMESTAMP(3))", [version]);
    console.log(`Esquema MySQL aplicado: ${version}`);
  }
  const [rows] = await pool.execute("SELECT version FROM schema_migrations ORDER BY version");
  console.log(`Esquema MySQL listo: ${rows.map((row) => row.version).join(", ")}`);
}

migrate().catch((error) => {
  console.error("Falló la migración del esquema MySQL:", error.message);
  process.exitCode = 1;
}).finally(closeDB);
