require("dotenv").config({ path: process.env.ENV_FILE || ".env.local" });
const assert = require("node:assert/strict");
const { test } = require("node:test");

test("/health/ready refleja MySQL disponible y devuelve 503 ante fallo", {
  skip: process.env.RUN_DB_MUTATION_TESTS !== "1"
}, async (t) => {
  assert.notEqual(process.env.NODE_ENV, "production");
  assert.equal(process.env.MYSQL_HOST, "127.0.0.1");
  const { pool, closeDB } = require("../src/config/db");
  const [[database]] = await pool.query("SELECT DATABASE() AS name");
  assert.equal(database.name, "gatondo_local_mysql");

  const originalQuery = pool.query;
  const { app } = require("../server");
  const server = app.listen(0, "127.0.0.1");
  t.after(async () => {
    pool.query = originalQuery;
    await new Promise((resolve) => server.close(resolve));
    await closeDB();
  });
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  const endpoint = `http://127.0.0.1:${server.address().port}/health/ready`;

  const healthy = await fetch(endpoint);
  assert.equal(healthy.status, 200);
  assert.deepEqual(await healthy.json(), { status: "ready", database: "mysql" });

  pool.query = async (sql, ...args) => {
    if (String(sql).trim() === "SELECT 1") {
      const unavailable = new Error("synthetic database outage");
      unavailable.code = "ECONNREFUSED";
      throw unavailable;
    }
    return originalQuery.call(pool, sql, ...args);
  };
  const unavailable = await fetch(endpoint);
  assert.equal(unavailable.status, 503);
  assert.deepEqual(await unavailable.json(), { status: "unavailable", database: "mysql" });
});
