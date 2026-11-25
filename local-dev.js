require("dotenv").config({ path: process.env.ENV_FILE || ".env.local" });
process.env.HOST = process.env.HOST || "127.0.0.1";
if (!process.env.MYSQL_USER || !process.env.MYSQL_DATABASE) {
  throw new Error("Define MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD y MYSQL_DATABASE en .env.local.");
}
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  throw new Error("Define SESSION_SECRET de al menos 32 caracteres en .env.local.");
}
require("./server").start().catch((error) => {
  console.error("No se pudo iniciar Gatón DO:", error.message);
  process.exitCode = 1;
});