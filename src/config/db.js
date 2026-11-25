const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || "127.0.0.1",
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD || "",
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: Number(process.env.MYSQL_POOL_SIZE || 10),
  queueLimit: 0,
  timezone: "Z",
  decimalNumbers: true,
  charset: "utf8mb4"
});

async function connectDB() {
  if (!process.env.MYSQL_USER || !process.env.MYSQL_DATABASE) {
    throw new Error("Faltan MYSQL_USER o MYSQL_DATABASE en la configuración.");
  }
  await pool.query("SELECT 1 AS ready");
  try {
    await pool.query("SELECT version FROM schema_migrations LIMIT 1");
  } catch (error) {
    if (error.code === "ER_NO_SUCH_TABLE") throw new Error("El esquema MySQL aún no está instalado. Ejecuta npm run db:migrate.");
    throw error;
  }
}

async function closeDB() { await pool.end(); }
module.exports = { pool, connectDB, closeDB };