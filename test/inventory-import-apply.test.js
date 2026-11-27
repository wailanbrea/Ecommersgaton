require("dotenv").config({ path: process.env.ENV_FILE || ".env.local" });
const assert = require("node:assert/strict");
const { createHmac, randomBytes } = require("node:crypto");
const { test } = require("node:test");
const ExcelJS = require("exceljs");

test("la importación se aplica y compensa por otra carga; un lote obsoleto revierte todo", {
  skip: process.env.RUN_DB_MUTATION_TESTS !== "1"
}, async (t) => {
  assert.notEqual(process.env.NODE_ENV, "production");
  assert.equal(process.env.MYSQL_HOST, "127.0.0.1");
  const { pool, closeDB } = require("../src/config/db");
  const [[database]] = await pool.query("SELECT DATABASE() AS name");
  assert.equal(database.name, "gatondo_local_mysql");
  const [[admin]] = await pool.execute(
    "SELECT u.id FROM admin_users u JOIN admin_user_roles ur ON ur.user_id=u.id JOIN admin_roles r ON r.id=ur.role_id JOIN admin_role_permissions rp ON rp.role_id=r.id JOIN admin_permissions p ON p.id=rp.permission_id WHERE u.active=1 AND p.code IN ('inventory.import','inventory.export') GROUP BY u.id HAVING COUNT(DISTINCT p.code)=2 LIMIT 1"
  );
  assert.ok(admin, "se necesita una cuenta local con permisos de importación/exportación");

  const Product = require("../src/models/Product");
  const { inventoryTestHelpers } = require("../src/routes/admin-tools");
  const { app } = require("../server");
  const prefix = `qa-inventory-apply-${randomBytes(6).toString("hex")}`;
  const ids = [randomBytes(12).toString("hex"), randomBytes(12).toString("hex"), randomBytes(12).toString("hex"), randomBytes(12).toString("hex")];
  const slugs = ids.map((id) => `${prefix}-${id}`);
  const mappedVariantId = randomBytes(12).toString("hex");
  const sid = randomBytes(24).toString("hex");
  const otherSid = randomBytes(24).toString("hex");
  const csrf = randomBytes(32).toString("hex");
  const otherCsrf = randomBytes(32).toString("hex");
  const expires = Date.now() + 600_000;
  let server;
  t.after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    await pool.execute(`DELETE FROM inventory_movements WHERE product_id IN (${ids.map(() => "?").join(",")})`, ids);
    await pool.execute("DELETE FROM inventory_ledger WHERE variant_id=?", [mappedVariantId]);
    await pool.execute("DELETE FROM inventory_balances WHERE variant_id=?", [mappedVariantId]);
    await pool.execute("DELETE FROM product_variants WHERE id=?", [mappedVariantId]);
    for (let i = 0; i < ids.length; i++) await pool.execute("DELETE FROM products WHERE id=? AND slug=?", [ids[i], slugs[i]]);
    await pool.execute("DELETE FROM app_sessions WHERE sid IN (?,?)", [sid, otherSid]);
    await closeDB();
  });

  for (let i = 0; i < ids.length; i++) {
    await Product.create({
      _id: ids[i], name: `Fixture importación ${i + 1}`, slug: slugs[i], active: true,
      stock: [4, 5, 7, 3][i], outOfStock: false, featured: false, hasVariants: i === 3,
      basePrice: 100, compareAtPrice: 0,
      variants: i === 3 ? [{ optionName: "Talla", optionValue: "M", label: "M", stock: 3, sku: "QA-M" }] : []
    });
  }
  const mappedAt = new Date();
  await pool.execute(
    "INSERT INTO product_variants (id,product_id,legacy_key,sku,sku_normalized,label,attributes,price_minor,compare_at_minor,image_url,active,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
    [mappedVariantId, ids[0], "base", `QA-${ids[0]}`, `QA-${ids[0]}`.toUpperCase(), "Producto base", JSON.stringify({}), 10000, 0, "", 1, mappedAt, mappedAt]
  );
  await pool.execute("INSERT INTO inventory_balances (variant_id,location_id,on_hand,reserved,updated_at) VALUES (?,?,4,0,?)", [mappedVariantId, "000000000000000000000101", mappedAt]);
  await pool.execute("INSERT INTO app_sessions (sid,expires,data) VALUES (?,?,?)", [sid, expires, JSON.stringify({
    cookie: { expires: new Date(expires), originalMaxAge: 600_000 },
    adminId: String(admin.id), adminCsrfToken: csrf
  })]);
  await pool.execute("INSERT INTO app_sessions (sid,expires,data) VALUES (?,?,?)", [otherSid, expires, JSON.stringify({
    cookie: { expires: new Date(expires), originalMaxAge: 600_000 },
    adminId: String(admin.id), adminCsrfToken: otherCsrf
  })]);
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const signature = createHmac("sha256", process.env.SESSION_SECRET).update(sid).digest("base64").replace(/=+$/, "");
  const cookie = `gatondo.sid=${encodeURIComponent(`s:${sid}.${signature}`)}`;
  const otherSignature = createHmac("sha256", process.env.SESSION_SECRET).update(otherSid).digest("base64").replace(/=+$/, "");
  const otherCookie = `gatondo.sid=${encodeURIComponent(`s:${otherSid}.${otherSignature}`)}`;
  const header = "productId,productName,sku,variantIndex,variantSignature,stock";
  const fileFor = (rows) => [header, ...rows.map(([productId, stock, variantIndex = "", variantSignature = ""]) => [productId, "Fixture", "SKU", variantIndex, variantSignature, stock].join(","))].join("\n");

  async function previewFile(filename, bytes) {
    const body = new FormData();
    body.append("_csrf", csrf);
    const type = filename.endsWith(".pdf") ? "application/pdf" : filename.endsWith(".xlsx") ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "text/csv";
    body.append("inventoryFile", new Blob([bytes], { type }), filename);
    const response = await fetch(`${origin}/admin/inventory/import/preview`, {
      method: "POST", headers: { cookie }, body, redirect: "manual"
    });
    const html = await response.text();
    assert.equal(response.status, 200, html.slice(0, 500));
    const token = html.match(/name="token" value="([a-f0-9]+)"/i)?.[1];
    assert.ok(token, "la respuesta debe ofrecer un token de vista previa");
    return token;
  }

  const previewCsv = (rows) => previewFile("inventory.csv", fileFor(rows));
  async function previewXlsx(productId, stock) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Inventario");
    sheet.columns = ["productId", "productName", "sku", "variantIndex", "variantSignature", "stock"].map((key) => ({ header: key, key }));
    sheet.addRow({ productId, productName: "Fixture", sku: "SKU", variantIndex: "", variantSignature: "", stock });
    return previewFile("inventory.xlsx", await workbook.xlsx.writeBuffer());
  }
  async function previewPdf(productId, stock) {
    const response = { type() { return this; }, set() { return this; }, send(buffer) { this.buffer = buffer; return this; } };
    await inventoryTestHelpers.sendPdf(response, [{ productId, productName: "Fixture", sku: "SKU", variantIndex: "", variantSignature: "", stock }], "Prueba sintética");
    return previewFile("inventory.pdf", response.buffer);
  }

  async function apply(token, sessionCookie = cookie, sessionCsrf = csrf) {
    const body = new URLSearchParams({ _csrf: sessionCsrf, token });
    return fetch(`${origin}/admin/inventory/import/apply`, {
      method: "POST", headers: { cookie: sessionCookie, "content-type": "application/x-www-form-urlencoded" }, body, redirect: "manual"
    });
  }

  let token = await previewCsv([[ids[0], 8]]);
  const crossSessionToken = await apply(token, otherCookie, otherCsrf);
  assert.equal(crossSessionToken.status, 400, "el token de preview no debe ser válido en otra sesión autenticada");
  let [[product]] = await pool.execute("SELECT stock FROM products WHERE id=?", [ids[0]]);
  assert.equal(Number(product.stock), 4, "el intento cruzado no debe tocar stock");
  let applied = await apply(token);
  assert.equal(applied.status, 302);
  [[product]] = await pool.execute("SELECT stock FROM products WHERE id=?", [ids[0]]);
  assert.equal(Number(product.stock), 8, "la importación confirmada debe aplicar el nuevo stock");
  assert.equal((await apply(token)).status, 400, "el token consumido no debe permitir una segunda aplicación");
  [[product]] = await pool.execute("SELECT stock FROM products WHERE id=?", [ids[0]]);
  assert.equal(Number(product.stock), 8, "la repetición del token no debe modificar stock");
  const [[replayedMovementCount]] = await pool.execute("SELECT COUNT(*) AS count FROM inventory_movements WHERE product_id=?", [ids[0]]);
  assert.equal(Number(replayedMovementCount.count), 1, "la repetición no debe generar un movimiento duplicado");

  token = await previewCsv([[ids[0], 4]]);
  applied = await apply(token);
  assert.equal(applied.status, 302);
  [[product]] = await pool.execute("SELECT stock FROM products WHERE id=?", [ids[0]]);
  assert.equal(Number(product.stock), 4, "una importación compensatoria debe restablecer el valor previo");
  const [compensatingMovements] = await pool.execute(
    "SELECT quantity_before,quantity_after,quantity_delta,action FROM inventory_movements WHERE product_id=? ORDER BY created_at,id", [ids[0]]
  );
  assert.deepEqual(compensatingMovements.map((row) => [Number(row.quantity_before), Number(row.quantity_after), Number(row.quantity_delta), row.action]), [
    [4, 8, 4, "import"], [8, 4, -4, "import"]
  ]);

  token = await previewXlsx(ids[0], 6);
  applied = await apply(token);
  assert.equal(applied.status, 302);
  token = await previewPdf(ids[0], 7);
  applied = await apply(token);
  assert.equal(applied.status, 302);
  token = await previewCsv([[ids[0], 4]]);
  applied = await apply(token);
  assert.equal(applied.status, 302);
  [[product]] = await pool.execute("SELECT stock FROM products WHERE id=?", [ids[0]]);
  assert.equal(Number(product.stock), 4, "la cantidad base debe poder restablecerse tras probar los tres formatos");
  const [allMovements] = await pool.execute(
    "SELECT quantity_before,quantity_after,quantity_delta FROM inventory_movements WHERE product_id=? ORDER BY created_at,id", [ids[0]]
  );
  assert.deepEqual(allMovements.map((row) => [Number(row.quantity_before), Number(row.quantity_after), Number(row.quantity_delta)]), [
    [4, 8, 4], [8, 4, -4], [4, 6, 2], [6, 7, 1], [7, 4, -3]
  ]);
  const [[canonicalBalance]] = await pool.execute("SELECT on_hand,reserved,available FROM inventory_balances WHERE variant_id=?", [mappedVariantId]);
  assert.deepEqual([Number(canonicalBalance.on_hand), Number(canonicalBalance.reserved), Number(canonicalBalance.available)], [4, 0, 4]);
  const [[canonicalImportCount]] = await pool.execute("SELECT COUNT(*) AS count FROM inventory_ledger WHERE variant_id=? AND action='import'", [mappedVariantId]);
  assert.equal(Number(canonicalImportCount.count), 5, "cada importación debe actualizar el ledger relacional y el legacy en la misma transacción");

  token = await previewCsv([[ids[1], 9], [ids[2], 10]]);
  await pool.execute("UPDATE products SET stock=8,payload=JSON_SET(payload,'$.stock',8) WHERE id=?", [ids[2]]);
  const rejected = await apply(token);
  assert.equal(rejected.status, 409);
  assert.match(await rejected.text(), /No se aplicó ningún cambio/);
  const [[first]] = await pool.execute("SELECT stock FROM products WHERE id=?", [ids[1]]);
  const [[stale]] = await pool.execute("SELECT stock FROM products WHERE id=?", [ids[2]]);
  assert.equal(Number(first.stock), 5, "un error tardío debe revertir las líneas anteriores del lote");
  assert.equal(Number(stale.stock), 8, "la modificación concurrente simulada debe conservarse");
  const [[movementCount]] = await pool.execute(
    "SELECT COUNT(*) AS count FROM inventory_movements WHERE product_id IN (?,?)", [ids[1], ids[2]]
  );
  assert.equal(Number(movementCount.count), 0, "un lote revertido no debe dejar movimientos parciales");

  token = await previewCsv([[ids[3], 6, 0, "Talla|M|M"]]);
  applied = await apply(token);
  assert.equal(applied.status, 302);
  const [[variantProduct]] = await pool.execute("SELECT stock,payload FROM products WHERE id=?", [ids[3]]);
  const variantPayload = typeof variantProduct.payload === "string" ? JSON.parse(variantProduct.payload) : variantProduct.payload;
  assert.equal(Number(variantProduct.stock), 6);
  assert.equal(Number(variantPayload.variants[0].stock), 6, "la importación por firma debe actualizar la variante");

  token = await previewCsv([[ids[3], 9, 0, "Talla|M|M"]]);
  await pool.execute("UPDATE products SET payload=JSON_SET(payload,'$.variants[0].optionValue','L') WHERE id=?", [ids[3]]);
  const staleVariant = await apply(token);
  assert.equal(staleVariant.status, 409);
  assert.match(await staleVariant.text(), /variante .* cambió/i);
  const [[unchangedVariantProduct]] = await pool.execute("SELECT stock,payload FROM products WHERE id=?", [ids[3]]);
  const unchangedVariantPayload = typeof unchangedVariantProduct.payload === "string" ? JSON.parse(unchangedVariantProduct.payload) : unchangedVariantProduct.payload;
  assert.equal(Number(unchangedVariantProduct.stock), 6);
  assert.equal(Number(unchangedVariantPayload.variants[0].stock), 6, "una variante obsoleta no debe cambiar stock");
});
