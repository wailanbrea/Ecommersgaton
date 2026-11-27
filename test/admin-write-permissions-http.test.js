require("dotenv").config({ path: process.env.ENV_FILE || ".env.local" });
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createHmac, randomBytes } = require("node:crypto");
const bcrypt = require("bcryptjs");
const { test } = require("node:test");
const AdminUser = require("../src/models/AdminUser");
const { permissionForRequest } = require("../src/services/adminAccess");

test("el rol de solo lectura no alcanza rutas de escritura administrativas", {
  skip: process.env.RUN_DB_MUTATION_TESTS !== "1"
}, async (t) => {
  assert.notEqual(process.env.NODE_ENV, "production");
  assert.equal(process.env.MYSQL_HOST, "127.0.0.1");
  const { pool, closeDB } = require("../src/config/db");
  const [[database]] = await pool.query("SELECT DATABASE() AS name");
  assert.equal(database.name, "gatondo_local_mysql");

  const userId = randomBytes(12).toString("hex");
  const roleId = randomBytes(12).toString("hex");
  const sid = randomBytes(24).toString("hex");
  const csrf = randomBytes(32).toString("hex");
  const email = `${userId}@qa.invalid`;
  const roleSlug = `qa-readonly-${roleId}`;
  const expires = Date.now() + 600_000;
  let server;
  t.after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    await pool.execute("DELETE FROM app_sessions WHERE sid=?", [sid]);
    await pool.execute("DELETE FROM admin_user_roles WHERE user_id=? AND role_id=?", [userId, roleId]);
    await pool.execute("DELETE FROM admin_role_permissions WHERE role_id=?", [roleId]);
    await pool.execute("DELETE FROM admin_users WHERE id=? AND email=?", [userId, email]);
    await pool.execute("DELETE FROM admin_roles WHERE id=? AND slug=?", [roleId, roleSlug]);
    await closeDB();
  });

  await AdminUser.create({
    _id: userId, name: "QA solo lectura", email,
    passwordHash: await bcrypt.hash("Solo-Laboratorio-2026!", 4), active: true, mustChangePassword: false
  });
  const now = new Date();
  await pool.execute(
    "INSERT INTO admin_roles (id,slug,name,description,is_system,created_at,updated_at) VALUES (?,?,?,?,0,?,?)",
    [roleId, roleSlug, "QA solo lectura", "Fixture temporal para autorización HTTP", now, now]
  );
  await pool.execute("INSERT INTO admin_user_roles (user_id,role_id,created_at) VALUES (?,?,?)", [userId, roleId, now]);
  const [[permission]] = await pool.execute("SELECT id FROM admin_permissions WHERE code='dashboard.view'");
  assert.ok(permission);
  await pool.execute("INSERT INTO admin_role_permissions (role_id,permission_id) VALUES (?,?)", [roleId, permission.id]);
  await pool.execute("INSERT INTO app_sessions (sid,expires,data) VALUES (?,?,?)", [sid, expires, JSON.stringify({
    cookie: { expires: new Date(expires), originalMaxAge: 600_000 }, adminId: userId, adminCsrfToken: csrf
  })]);

  const signature = createHmac("sha256", process.env.SESSION_SECRET).update(sid).digest("base64").replace(/=+$/, "");
  const cookie = `gatondo.sid=${encodeURIComponent(`s:${sid}.${signature}`)}`;
  const { app } = require("../server");
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const getPaths = [];
  const postPaths = [];
  for (const file of ["admin.js", "admin-tools.js", "admin-access.js"]) {
    const source = fs.readFileSync(path.join(__dirname, "../src/routes", file), "utf8");
    for (const method of ["get", "post"]) {
      for (const match of source.matchAll(new RegExp(`router\\.${method}\\(\\s*["']([^"']+)["']`, "g"))) {
        if (match[1] === "/login" || match[1] === "/logout") continue;
        const routePath = match[1].replace(/:[^/]+/g, "qa-id");
        if (method === "get") getPaths.push(routePath);
        else postPaths.push(routePath);
      }
    }
  }
  assert.ok(getPaths.length >= 20, "la prueba debe cubrir las rutas GET declaradas");
  assert.ok(postPaths.length >= 20, "la prueba debe cubrir el conjunto de rutas POST declaradas");

  const readResults = [];
  for (const routePath of getPaths) {
    const response = await fetch(`${origin}/admin${routePath}`, { headers: { cookie }, redirect: "manual" });
    const required = permissionForRequest("GET", routePath);
    readResults.push({ routePath, status: response.status, expected: required === "dashboard.view" ? 200 : 403 });
  }
  assert.deepEqual(readResults.filter((result) => result.status !== result.expected), [], JSON.stringify(readResults.filter((result) => result.status !== result.expected)));

  const results = [];
  for (const routePath of postPaths) {
    const response = await fetch(`${origin}/admin${routePath}`, {
      method: "POST",
      headers: { cookie, "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ _csrf: csrf, status: "qa-probe", name: "qa-probe" }),
      redirect: "manual"
    });
    results.push({ routePath, status: response.status });
  }
  assert.deepEqual(results.filter((result) => result.status !== 403), [], JSON.stringify(results.filter((result) => result.status !== 403)));
});
