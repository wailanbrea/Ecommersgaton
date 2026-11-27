require("dotenv").config({ path: process.env.ENV_FILE || ".env.local" });
const assert = require("node:assert/strict");
const { createHmac, randomBytes } = require("node:crypto");
const { test } = require("node:test");

test("ficha, editor y reseñas escapan contenido hostil en contextos HTML/JS", {
  skip: process.env.RUN_DB_MUTATION_TESTS !== "1"
}, async (t) => {
  assert.notEqual(process.env.NODE_ENV, "production");
  assert.equal(process.env.MYSQL_HOST, "127.0.0.1");
  const { pool, closeDB } = require("../src/config/db");
  const [[database]] = await pool.query("SELECT DATABASE() AS name");
  assert.equal(database.name, "gatondo_local_mysql");
  const [[admin]] = await pool.execute(
    "SELECT u.id FROM admin_users u JOIN admin_user_roles ur ON ur.user_id=u.id JOIN admin_roles r ON r.id=ur.role_id JOIN admin_role_permissions rp ON rp.role_id=r.id JOIN admin_permissions p ON p.id=rp.permission_id WHERE u.active=1 AND p.code IN ('products.personalization','reviews.view') GROUP BY u.id HAVING COUNT(DISTINCT p.code)=2 LIMIT 1"
  );
  assert.ok(admin, "se necesita una cuenta local con permiso para editar personalización");

  const Product = require("../src/models/Product");
  const Review = require("../src/models/Review");
  const { app } = require("../server");
  const id = randomBytes(12).toString("hex");
  const reviewId = randomBytes(12).toString("hex");
  const slug = `qa-inline-script-${id}`;
  const payload = `</script><img src=x onerror=alert(1)>&\u2028`;
  const textareaPayload = "</textarea><img src=x onerror=alert(1)>";
  const reviewPayload = "</p><img src=x onerror=alert(1)>";
  const sid = randomBytes(24).toString("hex");
  const noPermissionSid = randomBytes(24).toString("hex");
  const noPermissionAdminId = randomBytes(12).toString("hex");
  const csrf = randomBytes(32).toString("hex");
  const noPermissionCsrf = randomBytes(32).toString("hex");
  const expires = Date.now() + 600_000;
  const AdminUser = require("../src/models/AdminUser");
  let server;
  t.after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    await pool.execute("DELETE FROM app_sessions WHERE sid IN (?,?)", [sid, noPermissionSid]);
    await pool.execute("DELETE FROM reviews WHERE id=? AND product_id=?", [reviewId, id]);
    await pool.execute("DELETE FROM products WHERE id=? AND slug=?", [id, slug]);
    await pool.execute("DELETE FROM admin_users WHERE id=? AND email=?", [noPermissionAdminId, `${noPermissionAdminId}@qa.invalid`]);
    await closeDB();
  });

  await Product.create({
    _id: id, name: payload, slug, active: true, featured: false, stock: 1,
    outOfStock: false, hasVariants: true, basePrice: 100, compareAtPrice: 0,
    variants: [{ optionName: "Modelo", optionValue: payload, label: payload, stock: 1, price: 100 }],
    advancedConfig: { customizationUploadHelp: textareaPayload }
  });
  await Review.create({
    _id: reviewId, productId: id, customerName: "QA reseña", email: `${id}@qa.invalid`,
    rating: 5, comment: reviewPayload, photoUrl: "", approved: true, visible: true
  });
  await pool.execute("INSERT INTO app_sessions (sid,expires,data) VALUES (?,?,?)", [sid, expires, JSON.stringify({
    cookie: { expires: new Date(expires), originalMaxAge: 600_000 },
    adminId: String(admin.id), adminCsrfToken: csrf
  })]);
  await AdminUser.create({
    _id: noPermissionAdminId, name: "QA sin permisos", email: `${noPermissionAdminId}@qa.invalid`,
    passwordHash: "fixture-not-usable-for-login", active: true, mustChangePassword: false
  });
  await pool.execute("INSERT INTO app_sessions (sid,expires,data) VALUES (?,?,?)", [noPermissionSid, expires, JSON.stringify({
    cookie: { expires: new Date(expires), originalMaxAge: 600_000 },
    adminId: noPermissionAdminId, adminCsrfToken: noPermissionCsrf
  })]);
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
  const response = await fetch(`http://127.0.0.1:${server.address().port}/product/${slug}`);
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.doesNotMatch(html, /<\/script><img src=x onerror=alert\(1\)>/i);
  assert.ok(html.includes(String.raw`\u003c/script\u003e\u003cimg src=x onerror=alert(1)\u003e\u0026\u2028`),
    "los datos embebidos en JavaScript deben codificar caracteres de terminación de script");
  assert.doesNotMatch(html, /<\/p><img src=x onerror=alert\(1\)>/i);
  assert.match(html, /&lt;\/p&gt;&lt;img src=x onerror=alert\(1\)&gt;/i, "la reseña pública debe escaparse como texto");

  const cookieSignature = createHmac("sha256", process.env.SESSION_SECRET).update(sid).digest("base64").replace(/=+$/, "");
  const adminCookie = `gatondo.sid=${encodeURIComponent(`s:${sid}.${cookieSignature}`)}`;
  const personalization = await fetch(`http://127.0.0.1:${server.address().port}/admin/products/${id}/personalization`, {
    headers: { cookie: adminCookie }
  });
  const adminHtml = await personalization.text();
  assert.equal(personalization.status, 200, adminHtml.slice(0, 500));
  assert.doesNotMatch(adminHtml, /<\/textarea><img src=x onerror=alert\(1\)>/i);
  assert.ok(adminHtml.includes(String.raw`\u003c/textarea>\u003cimg src=x onerror=alert(1)>`),
    "JSON avanzado debe neutralizar el cierre de textarea en el panel de personalización");

  const adminReviews = await fetch(`http://127.0.0.1:${server.address().port}/admin/reviews`, { headers: { cookie: adminCookie } });
  const reviewsHtml = await adminReviews.text();
  assert.equal(adminReviews.status, 200);
  assert.doesNotMatch(reviewsHtml, /<\/p><img src=x onerror=alert\(1\)>/i);
  assert.match(reviewsHtml, /&lt;\/p&gt;&lt;img src=x onerror=alert\(1\)&gt;/i, "la reseña del panel debe escaparse como texto");

  const anonymousAdmin = await fetch(`http://127.0.0.1:${server.address().port}/admin/products/${id}/personalization`, { redirect: "manual" });
  assert.notEqual(anonymousAdmin.status, 200, "la pantalla administrativa no debe ser pública");
  const csrfMissing = await fetch(`http://127.0.0.1:${server.address().port}/admin/products/${id}/personalization`, {
    method: "POST", headers: { cookie: adminCookie, "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ advancedConfigJson: "{}" }), redirect: "manual"
  });
  assert.equal(csrfMissing.status, 403);
  const noPermissionSignature = createHmac("sha256", process.env.SESSION_SECRET).update(noPermissionSid).digest("base64").replace(/=+$/, "");
  const noPermissionCookie = `gatondo.sid=${encodeURIComponent(`s:${noPermissionSid}.${noPermissionSignature}`)}`;
  const deniedPaths = [
    "/admin/dashboard", "/admin/sales", "/admin/products", "/admin/categories", "/admin/inventory",
    "/admin/orders", "/admin/reviews", "/admin/settings", "/admin/users", "/admin/roles",
    `/admin/products/${id}/personalization`
  ];
  const deniedStatuses = [];
  for (const path of deniedPaths) {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, {
      headers: { cookie: noPermissionCookie }, redirect: "manual"
    });
    deniedStatuses.push(response.status);
  }
  assert.deepEqual(deniedStatuses, deniedPaths.map(() => 403), "una cuenta activa sin permisos no debe leer ninguna sección administrativa");
  const deniedWrite = await fetch(`http://127.0.0.1:${server.address().port}/admin/products/${id}/personalization`, {
    method: "POST", headers: { cookie: noPermissionCookie, "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ _csrf: noPermissionCsrf, advancedConfigJson: JSON.stringify({ customizationUploadHelp: "no-autorizado" }) }),
    redirect: "manual"
  });
  assert.equal(deniedWrite.status, 403, "una cuenta activa sin permiso no debe modificar la configuración");
  const unchanged = await Product.findById(id).lean();
  assert.equal(unchanged.advancedConfig.customizationUploadHelp, textareaPayload,
    "el POST sin CSRF no debe guardar ninguna configuración");
});
