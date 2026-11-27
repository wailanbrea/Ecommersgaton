require("dotenv").config({ path: process.env.ENV_FILE || ".env.local" });
const assert = require("node:assert/strict");
const { createHmac, randomBytes } = require("node:crypto");
const bcrypt = require("bcryptjs");
const { test } = require("node:test");
const AdminUser = require("../src/models/AdminUser");

test("el login rota la sesión y logout revoca el SID autenticado", {
  skip: process.env.RUN_DB_MUTATION_TESTS !== "1"
}, async (t) => {
  assert.notEqual(process.env.NODE_ENV, "production", "la prueba de sesión está prohibida en producción");
  assert.equal(process.env.MYSQL_HOST, "127.0.0.1");
  const { pool, closeDB } = require("../src/config/db");
  const [[database]] = await pool.query("SELECT DATABASE() AS name");
  assert.equal(database.name, "gatondo_local_mysql");

  const id = randomBytes(12).toString("hex");
  const email = `${id}@qa.invalid`;
  const roleId = randomBytes(12).toString("hex");
  const roleSlug = `qa-session-${roleId}`;
  const oldSid = randomBytes(24).toString("hex");
  const csrf = randomBytes(32).toString("hex");
  const expires = Date.now() + 600_000;
  let server;

  t.after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    await pool.execute("DELETE FROM app_sessions WHERE sid=?", [oldSid]);
    await pool.execute("DELETE FROM admin_user_roles WHERE user_id=? AND role_id=?", [id, roleId]);
    await pool.execute("DELETE FROM admin_role_permissions WHERE role_id=?", [roleId]);
    const [generatedSessions] = await pool.execute(
      "SELECT sid FROM app_sessions WHERE JSON_UNQUOTE(JSON_EXTRACT(data,'$.adminId'))=?", [id]
    );
    for (const session of generatedSessions) await pool.execute("DELETE FROM app_sessions WHERE sid=?", [session.sid]);
    await pool.execute("DELETE FROM admin_users WHERE id=? AND email=?", [id, email]);
    await pool.execute("DELETE FROM admin_roles WHERE id=? AND slug=?", [roleId, roleSlug]);
    await closeDB();
  });

  await AdminUser.create({
    _id: id, name: "QA sesión", email, passwordHash: await bcrypt.hash("Solo-Laboratorio-2026!", 4),
    active: true, mustChangePassword: false
  });
  const now = new Date();
  await pool.execute(
    "INSERT INTO admin_roles (id,slug,name,description,is_system,created_at,updated_at) VALUES (?,?,?,?,0,?,?)",
    [roleId, roleSlug, "QA sesión Dashboard", "Fixture temporal para probar logout", now, now]
  );
  await pool.execute("INSERT INTO admin_user_roles (user_id,role_id,created_at) VALUES (?,?,?)", [id, roleId, now]);
  const [[dashboardPermission]] = await pool.execute("SELECT id FROM admin_permissions WHERE code='dashboard.view'");
  assert.ok(dashboardPermission);
  await pool.execute("INSERT INTO admin_role_permissions (role_id,permission_id) VALUES (?,?)", [roleId, dashboardPermission.id]);
  await pool.execute("INSERT INTO app_sessions (sid,expires,data) VALUES (?,?,?)", [oldSid, expires, JSON.stringify({
    cookie: { expires: new Date(expires), originalMaxAge: 600_000 }, adminCsrfToken: csrf
  })]);

  const signature = createHmac("sha256", process.env.SESSION_SECRET).update(oldSid).digest("base64").replace(/=+$/, "");
  const cookie = `gatondo.sid=${encodeURIComponent(`s:${oldSid}.${signature}`)}`;
  const { app } = require("../server");
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });

  const response = await fetch(`http://127.0.0.1:${server.address().port}/admin/login`, {
    method: "POST",
    headers: { cookie, "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ email, password: "Solo-Laboratorio-2026!", _csrf: csrf }),
    redirect: "manual"
  });
  assert.equal(response.status, 302);
  assert.equal(response.headers.get("location"), "/admin/dashboard");

  const setCookies = response.headers.getSetCookie();
  const setCookie = setCookies.find((value) => value.startsWith("gatondo.sid=")) || "";
  assert.ok(setCookie, `el login debe enviar una cookie de sesión regenerada (cookies recibidas: ${setCookies.map((value) => value.split("=")[0]).join(", ") || "ninguna"})`);
  assert.match(setCookie, /; HttpOnly/i, "la cookie de sesión no debe poder leerse desde JavaScript del cliente");
  assert.match(setCookie, /; SameSite=Lax/i, "la cookie debe restringir el envío cross-site");
  const encodedSessionCookie = setCookie.split(";")[0].slice("gatondo.sid=".length);
  const sessionValue = decodeURIComponent(encodedSessionCookie);
  const newSessionId = sessionValue.match(/^s:([a-z0-9_-]{20,})\./i)?.[1] || "";
  assert.ok(newSessionId, "la respuesta de login debe establecer una cookie de sesión nueva");
  assert.notEqual(newSessionId, oldSid, "la autenticación no debe conservar el ID pre-login");

  const [oldRows] = await pool.execute("SELECT sid FROM app_sessions WHERE sid=?", [oldSid]);
  const [newRows] = await pool.execute("SELECT sid,data FROM app_sessions WHERE sid=?", [newSessionId]);
  assert.equal(oldRows.length, 0, "la sesión anónima anterior debe eliminarse al regenerar");
  assert.equal(newRows.length, 1);
  const sessionData = typeof newRows[0].data === "string" ? JSON.parse(newRows[0].data) : newRows[0].data;
  assert.equal(String(sessionData.adminId), id);

  const authenticatedCookie = setCookie.split(";")[0];
  const dashboard = await fetch(`http://127.0.0.1:${server.address().port}/admin/dashboard`, { headers: { cookie: authenticatedCookie }, redirect: "manual" });
  assert.equal(dashboard.status, 200);
  const [[sessionWithCsrf]] = await pool.execute("SELECT data FROM app_sessions WHERE sid=?", [newSessionId]);
  const authenticatedData = typeof sessionWithCsrf.data === "string" ? JSON.parse(sessionWithCsrf.data) : sessionWithCsrf.data;
  assert.match(authenticatedData.adminCsrfToken || "", /^[a-f0-9]{64}$/i);

  const logoutWithoutCsrf = await fetch(`http://127.0.0.1:${server.address().port}/admin/logout`, {
    method: "POST", headers: { cookie: authenticatedCookie, "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(), redirect: "manual"
  });
  assert.equal(logoutWithoutCsrf.status, 403, "logout requiere CSRF para impedir cierres cross-site");
  const [stillAuthenticated] = await pool.execute("SELECT sid FROM app_sessions WHERE sid=?", [newSessionId]);
  assert.equal(stillAuthenticated.length, 1, "un POST sin CSRF no debe destruir la sesión activa");

  const logout = await fetch(`http://127.0.0.1:${server.address().port}/admin/logout`, {
    method: "POST",
    headers: { cookie: authenticatedCookie, "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ _csrf: authenticatedData.adminCsrfToken }),
    redirect: "manual"
  });
  assert.equal(logout.status, 302);
  assert.equal(logout.headers.get("location"), "/admin/login");
  const [revokedRows] = await pool.execute("SELECT sid FROM app_sessions WHERE sid=?", [newSessionId]);
  assert.equal(revokedRows.length, 0, "logout debe borrar el SID autenticado del almacén de sesiones");
  const reused = await fetch(`http://127.0.0.1:${server.address().port}/admin/dashboard`, {
    headers: { cookie: authenticatedCookie }, redirect: "manual"
  });
  assert.equal(reused.status, 302);
  assert.equal(reused.headers.get("location"), "/admin/login");
});
