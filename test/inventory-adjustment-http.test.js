require("dotenv").config({ path: process.env.ENV_FILE || ".env.local" });
const assert = require("node:assert/strict");
const { createHmac, randomBytes } = require("node:crypto");
const { test } = require("node:test");
const Product = require("../src/models/Product");

test("el panel ajusta stock con motivo, permiso, saldo disponible y clave idempotente", {
  skip: process.env.RUN_DB_MUTATION_TESTS !== "1"
}, async (t) => {
  assert.notEqual(process.env.NODE_ENV, "production", "la prueba está prohibida en producción");
  const { pool, closeDB } = require("../src/config/db");
  const [[database]] = await pool.query("SELECT DATABASE() AS name");
  assert.equal(database.name, "gatondo_local_mysql");
  const [[admin]] = await pool.execute(
    "SELECT u.id FROM admin_users u JOIN admin_user_roles ur ON ur.user_id=u.id JOIN admin_role_permissions rp ON rp.role_id=ur.role_id JOIN admin_permissions p ON p.id=rp.permission_id WHERE u.active=1 AND p.code IN ('inventory.adjust','inventory.import') GROUP BY u.id HAVING COUNT(DISTINCT p.code)=2 LIMIT 1"
  );
  assert.ok(admin, "se requiere un administrador local con permiso inventory.adjust");

  const productId = randomBytes(12).toString("hex");
  const slug = `qa-inventory-adjust-${productId}`;
  const sid = randomBytes(24).toString("hex");
  const csrf = randomBytes(32).toString("hex");
  const requestKey = randomBytes(16).toString("hex");
  const expires = Date.now() + 600_000;
  let server;
  t.after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    const [variants] = await pool.execute("SELECT id FROM product_variants WHERE product_id=?", [productId]);
    if (variants.length) {
      const ids = variants.map((row) => row.id);
      await pool.execute(`DELETE FROM admin_audit_logs WHERE target_type='product_variant' AND target_id IN (${ids.map(() => "?").join(",")})`, ids);
      await pool.execute(`DELETE FROM inventory_ledger WHERE variant_id IN (${ids.map(() => "?").join(",")})`, ids);
      await pool.execute(`DELETE FROM inventory_balances WHERE variant_id IN (${ids.map(() => "?").join(",")})`, ids);
      await pool.execute(`DELETE FROM product_variants WHERE id IN (${ids.map(() => "?").join(",")})`, ids);
    }
    await pool.execute("DELETE FROM inventory_movements WHERE product_id=?", [productId]);
    await pool.execute("DELETE FROM products WHERE id=? AND slug=?", [productId, slug]);
    await pool.execute("DELETE FROM app_sessions WHERE sid=?", [sid]);
    await closeDB();
  });

  const product = await Product.create({
    _id: productId, name: "QA ajuste de inventario", slug, active: true,
    stock: 5, outOfStock: false, featured: false, hasVariants: false,
    basePrice: 125, compareAtPrice: 0, variants: []
  });
  await pool.execute("INSERT INTO app_sessions (sid,expires,data) VALUES (?,?,?)", [sid, expires, JSON.stringify({
    cookie: { expires: new Date(expires), originalMaxAge: 600_000 }, adminId: String(admin.id), adminCsrfToken: csrf
  })]);
  const signature = createHmac("sha256", process.env.SESSION_SECRET).update(sid).digest("base64").replace(/=+$/, "");
  const cookie = `gatondo.sid=${encodeURIComponent(`s:${sid}.${signature}`)}`;
  const { app } = require("../server");
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
  const origin = `http://127.0.0.1:${server.address().port}`;

  const page = await fetch(`${origin}/admin/inventory`, { headers: { cookie } });
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Guardar ajuste/);

  const form = new URLSearchParams({
    _csrf: csrf, productId, variantIndex: "", variantSignature: "", sku: `qa-inv-${productId.slice(0, 8)}`, newOnHand: "9",
    reason: "Conteo físico de QA", requestKey
  });
  const applied = await fetch(`${origin}/admin/inventory/adjust`, {
    method: "POST", headers: { cookie, "content-type": "application/x-www-form-urlencoded" }, body: form, redirect: "manual"
  });
  assert.equal(applied.status, 302);
  assert.match(applied.headers.get("location"), /adjusted=1/);

  const [[updated]] = await pool.execute("SELECT stock,payload FROM products WHERE id=?", [productId]);
  assert.equal(Number(updated.stock), 9);
  const updatedPayload = typeof updated.payload === "string" ? JSON.parse(updated.payload) : updated.payload;
  assert.equal(Number(updatedPayload.stock), 9);
  const [[balance]] = await pool.execute("SELECT on_hand,reserved,available FROM inventory_balances WHERE variant_id=(SELECT id FROM product_variants WHERE product_id=? LIMIT 1)", [productId]);
  assert.deepEqual({ onHand: Number(balance.on_hand), reserved: Number(balance.reserved), available: Number(balance.available) }, { onHand: 9, reserved: 0, available: 9 });
  const [[sku]] = await pool.execute("SELECT sku,sku_normalized FROM product_variants WHERE product_id=?", [productId]);
  assert.equal(sku.sku, `QA-INV-${productId.slice(0, 8).toUpperCase()}`);
  assert.equal(sku.sku_normalized, sku.sku);
  const [[audit]] = await pool.execute("SELECT action,quantity_before,quantity_after,quantity_delta,reason,actor_id FROM inventory_ledger WHERE variant_id=(SELECT id FROM product_variants WHERE product_id=? LIMIT 1)", [productId]);
  assert.deepEqual({ action: audit.action, before: Number(audit.quantity_before), after: Number(audit.quantity_after), delta: Number(audit.quantity_delta), reason: audit.reason, actor: audit.actor_id }, {
    action: "adjust", before: 5, after: 9, delta: 4, reason: "Conteo físico de QA", actor: String(admin.id)
  });

  const replay = await fetch(`${origin}/admin/inventory/adjust`, {
    method: "POST", headers: { cookie, "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ ...Object.fromEntries(form), newOnHand: "12" }), redirect: "manual"
  });
  assert.equal(replay.status, 302);
  assert.match(replay.headers.get("location"), /adjusted=duplicate/);
  const [[afterReplay]] = await pool.execute("SELECT stock FROM products WHERE id=?", [productId]);
  assert.equal(Number(afterReplay.stock), 9);

  const exportCsv = await fetch(`${origin}/admin/inventory/export.csv`, { headers: { cookie } });
  assert.equal(exportCsv.status, 200);
  assert.match(await exportCsv.text(), new RegExp(sku.sku));
  const upload = new FormData();
  upload.append("_csrf", csrf);
  upload.append("inventoryFile", new Blob([`sku,stock\n${sku.sku},11`], { type: "text/csv" }), "inventario.csv");
  const preview = await fetch(`${origin}/admin/inventory/import/preview`, { method: "POST", headers: { cookie }, body: upload });
  const previewHtml = await preview.text();
  assert.equal(preview.status, 200, previewHtml.slice(0, 500));
  const previewToken = previewHtml.match(/name="token" value="([a-f0-9]+)"/i)?.[1];
  assert.ok(previewToken, "el importador por SKU debe mostrar un token de vista previa");
  const appliedImport = await fetch(`${origin}/admin/inventory/import/apply`, {
    method: "POST", headers: { cookie, "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ _csrf: csrf, token: previewToken }), redirect: "manual"
  });
  assert.equal(appliedImport.status, 302);
  const [[afterImport]] = await pool.execute("SELECT stock FROM products WHERE id=?", [productId]);
  assert.equal(Number(afterImport.stock), 11);
  const [[afterImportBalance]] = await pool.execute("SELECT on_hand,available FROM inventory_balances WHERE variant_id=(SELECT id FROM product_variants WHERE product_id=? LIMIT 1)", [productId]);
  assert.deepEqual([Number(afterImportBalance.on_hand), Number(afterImportBalance.available)], [11, 11]);

  await pool.execute("UPDATE inventory_balances SET reserved=8 WHERE variant_id=(SELECT id FROM product_variants WHERE product_id=? LIMIT 1)", [productId]);
  const blocked = await fetch(`${origin}/admin/inventory/adjust`, {
    method: "POST", headers: { cookie, "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ _csrf: csrf, productId, variantIndex: "", variantSignature: "", newOnHand: "7", reason: "No puede quedar debajo de reservas", requestKey: randomBytes(16).toString("hex") }),
    redirect: "manual"
  });
  assert.equal(blocked.status, 400);
  assert.match(await blocked.text(), /reservadas/);
  const [[unchanged]] = await pool.execute("SELECT on_hand,reserved,available FROM inventory_balances WHERE variant_id=(SELECT id FROM product_variants WHERE product_id=? LIMIT 1)", [productId]);
  assert.deepEqual({ onHand: Number(unchanged.on_hand), reserved: Number(unchanged.reserved), available: Number(unchanged.available) }, { onHand: 11, reserved: 8, available: 3 });
});
