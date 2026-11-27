require("dotenv").config({ path: process.env.ENV_FILE || ".env.local" });
const assert = require("node:assert/strict");
const { createHmac, randomBytes } = require("node:crypto");
const bcrypt = require("bcryptjs");
const { test } = require("node:test");
const AdminUser = require("../src/models/AdminUser");

test("un rol administrativo parcial permite solo las áreas asignadas", {
  skip: process.env.RUN_DB_MUTATION_TESTS !== "1"
}, async (t) => {
  assert.notEqual(process.env.NODE_ENV, "production", "la prueba de permisos está prohibida en producción");
  assert.equal(process.env.MYSQL_HOST, "127.0.0.1");
  const { pool, closeDB } = require("../src/config/db");
  const [[database]] = await pool.query("SELECT DATABASE() AS name");
  assert.equal(database.name, "gatondo_local_mysql");

  const userId = randomBytes(12).toString("hex");
  const roleId = randomBytes(12).toString("hex");
  const productId = randomBytes(12).toString("hex");
  const productSlug = `qa-role-inventory-${productId}`;
  const sid = randomBytes(24).toString("hex");
  const csrf = randomBytes(32).toString("hex");
  const email = `${userId}@qa.invalid`;
  const expires = Date.now() + 600_000;
  let server;

  t.after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    await pool.execute("DELETE FROM inventory_movements WHERE product_id=?", [productId]);
    await pool.execute("DELETE FROM app_sessions WHERE sid=?", [sid]);
    await pool.execute("DELETE FROM products WHERE id=? AND slug=?", [productId, productSlug]);
    await pool.execute("DELETE FROM admin_users WHERE id=? AND email=?", [userId, email]);
    await pool.execute("DELETE FROM admin_roles WHERE id=? AND slug=?", [roleId, `qa-${roleId}`]);
    await closeDB();
  });

  await AdminUser.create({
    _id: userId, name: "QA rol parcial", email,
    passwordHash: await bcrypt.hash("Solo-Laboratorio-2026!", 4), active: true, mustChangePassword: false
  });
  const now = new Date();
  await pool.execute(
    "INSERT INTO admin_roles (id,slug,name,description,is_system,created_at,updated_at) VALUES (?,?,?,?,0,?,?)",
    [roleId, `qa-${roleId}`, "QA lectura limitada", "Fixture temporal de prueba", now, now]
  );
  await pool.execute("INSERT INTO admin_user_roles (user_id,role_id,created_at) VALUES (?,?,?)", [userId, roleId, now]);
  const Product = require("../src/models/Product");
  await Product.create({
    _id: productId, name: "QA inventario con rol parcial", slug: productSlug,
    active: true, stock: 4, outOfStock: false, featured: false, basePrice: 100, compareAtPrice: 0
  });
  const [permissionRows] = await pool.execute(
    "SELECT id FROM admin_permissions WHERE code IN ('dashboard.view','inventory.view','inventory.import')"
  );
  assert.equal(permissionRows.length, 3);
  for (const permission of permissionRows) {
    await pool.execute("INSERT INTO admin_role_permissions (role_id,permission_id) VALUES (?,?)", [roleId, permission.id]);
  }
  await pool.execute("INSERT INTO app_sessions (sid,expires,data) VALUES (?,?,?)", [sid, expires, JSON.stringify({
    cookie: { expires: new Date(expires), originalMaxAge: 600_000 }, adminId: userId, adminCsrfToken: csrf
  })]);

  const signature = createHmac("sha256", process.env.SESSION_SECRET).update(sid).digest("base64").replace(/=+$/, "");
  const cookie = `gatondo.sid=${encodeURIComponent(`s:${sid}.${signature}`)}`;
  const { app } = require("../server");
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const statusByPath = {};
  for (const path of ["/admin/dashboard", "/admin/inventory", "/admin/products", "/admin/sales", "/admin/inventory/export.pdf"]) {
    const response = await fetch(`${origin}${path}`, { headers: { cookie }, redirect: "manual" });
    statusByPath[path] = response.status;
  }
  assert.deepEqual(statusByPath, {
    "/admin/dashboard": 200,
    "/admin/inventory": 200,
    "/admin/products": 403,
    "/admin/sales": 403,
    "/admin/inventory/export.pdf": 403
  });

  const csv = ["productId,productName,sku,variantIndex,variantSignature,stock", `${productId},QA inventario,QA-1,,,9`].join("\n");
  const form = new FormData();
  form.append("_csrf", csrf);
  form.append("inventoryFile", new Blob([csv], { type: "text/csv" }), "inventory.csv");
  const allowedPreview = await fetch(`${origin}/admin/inventory/import/preview`, {
    method: "POST", headers: { cookie }, body: form, redirect: "manual"
  });
  assert.equal(allowedPreview.status, 200, "inventory.import debe permitir solo la vista previa requerida");
  const previewHtml = await allowedPreview.text();
  assert.match(previewHtml, /QA inventario con rol parcial/);
  const previewToken = previewHtml.match(/name="token" value="([a-f0-9]+)"/i)?.[1];
  assert.ok(previewToken, "la vista previa debe emitir un token de confirmación");
  const [[unchangedProduct]] = await pool.execute("SELECT stock FROM products WHERE id=?", [productId]);
  assert.equal(Number(unchangedProduct.stock), 4, "una vista previa permitida nunca debe cambiar existencias");

  const applyImport = async (token) => fetch(`${origin}/admin/inventory/import/apply`, {
    method: "POST", headers: { cookie, "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ _csrf: csrf, token }), redirect: "manual"
  });
  const applied = await applyImport(previewToken);
  assert.equal(applied.status, 302, "inventory.import debe autorizar la aplicación tras revisar el preview");
  const [[updatedProduct]] = await pool.execute("SELECT stock FROM products WHERE id=?", [productId]);
  assert.equal(Number(updatedProduct.stock), 9);

  const restoreForm = new FormData();
  restoreForm.append("_csrf", csrf);
  restoreForm.append("inventoryFile", new Blob([csv.replace(",9", ",4")], { type: "text/csv" }), "inventory-restore.csv");
  const restorePreview = await fetch(`${origin}/admin/inventory/import/preview`, {
    method: "POST", headers: { cookie }, body: restoreForm, redirect: "manual"
  });
  const restoreHtml = await restorePreview.text();
  assert.equal(restorePreview.status, 200, restoreHtml.slice(0, 300));
  const restoreToken = restoreHtml.match(/name="token" value="([a-f0-9]+)"/i)?.[1];
  assert.ok(restoreToken);
  assert.equal((await applyImport(restoreToken)).status, 302);
  const [[restoredProduct]] = await pool.execute("SELECT stock FROM products WHERE id=?", [productId]);
  assert.equal(Number(restoredProduct.stock), 4, "la carga compensatoria restaura el saldo inicial");
  const [movements] = await pool.execute(
    "SELECT quantity_before,quantity_after,quantity_delta FROM inventory_movements WHERE product_id=? ORDER BY created_at,id", [productId]
  );
  assert.deepEqual(movements.map((row) => [Number(row.quantity_before), Number(row.quantity_after), Number(row.quantity_delta)]), [[4, 9, 5], [9, 4, -5]]);

  const deniedPreview = await fetch(`${origin}/admin/inventory/import/preview`, {
    method: "POST", headers: { cookie }, body: (() => { const f = new FormData(); f.append("inventoryFile", new Blob([csv], { type: "text/csv" }), "inventory.csv"); return f; })(), redirect: "manual"
  });
  assert.equal(deniedPreview.status, 403, "el permiso de importación no omite CSRF");
});
