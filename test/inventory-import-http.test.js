require("dotenv").config({ path: process.env.ENV_FILE || ".env.local" });
const assert = require("node:assert/strict");
const { createHmac, randomBytes } = require("node:crypto");
const { test } = require("node:test");

test("preview de inventario no modifica stock y rechaza variantes obsoletas o CSRF", {
  skip: process.env.RUN_DB_MUTATION_TESTS !== "1"
}, async (t) => {
  assert.notEqual(process.env.NODE_ENV, "production");
  assert.equal(process.env.MYSQL_HOST, "127.0.0.1");
  const { pool, closeDB } = require("../src/config/db");
  const [[database]] = await pool.query("SELECT DATABASE() AS name");
  assert.equal(database.name, "gatondo_local_mysql");

  const [[admins]] = await pool.execute(
    "SELECT u.id FROM admin_users u JOIN admin_user_roles ur ON ur.user_id=u.id JOIN admin_roles r ON r.id=ur.role_id JOIN admin_role_permissions rp ON rp.role_id=r.id JOIN admin_permissions p ON p.id=rp.permission_id WHERE u.active=1 AND p.code IN ('inventory.import','inventory.export') GROUP BY u.id HAVING COUNT(DISTINCT p.code)=2 LIMIT 1"
  );
  assert.ok(admins, "se necesita una cuenta local con permiso inventory.import");

  const Product = require("../src/models/Product");
  const { app } = require("../server");
  const productId = randomBytes(12).toString("hex");
  const slug = `qa-inventory-preview-${productId}`;
  const sid = randomBytes(24).toString("hex");
  const csrf = randomBytes(32).toString("hex");
  const expires = Date.now() + 600_000;
  const csvHeader = "productId,productName,sku,variantIndex,variantSignature,stock";
  let server;
  t.after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    await pool.execute("DELETE FROM inventory_movements WHERE product_id=?", [productId]);
    await pool.execute("DELETE FROM products WHERE id=? AND slug=?", [productId, slug]);
    await pool.execute("DELETE FROM app_sessions WHERE sid=?", [sid]);
    await closeDB();
  });

  await Product.create({
    _id: productId, name: "Fixture inventario", slug, active: true, stock: 4,
    outOfStock: false, featured: false, hasVariants: true, basePrice: 100,
    compareAtPrice: 0, variants: [{ optionName: "Talla", optionValue: "M", label: "M", stock: 4 }]
  });
  await pool.execute("INSERT INTO app_sessions (sid,expires,data) VALUES (?,?,?)", [sid, expires, JSON.stringify({
    cookie: { expires: new Date(expires), originalMaxAge: 600_000 },
    adminId: String(admins.id), adminCsrfToken: csrf
  })]);
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });

  const signature = createHmac("sha256", process.env.SESSION_SECRET).update(sid).digest("base64").replace(/=+$/, "");
  const cookie = `gatondo.sid=${encodeURIComponent(`s:${sid}.${signature}`)}`;
  const postFile = async (filename, buffer, token = csrf) => {
    const body = new FormData();
    body.append("_csrf", token);
    const mime = filename.endsWith(".pdf") ? "application/pdf" : "text/csv";
    body.append("inventoryFile", new Blob([buffer], { type: mime }), filename);
    return fetch(`http://127.0.0.1:${server.address().port}/admin/inventory/import/preview`, {
      method: "POST", headers: { cookie }, body, redirect: "manual"
    });
  };
  const postPreview = (variantSignature, token = csrf) => postFile(
    "inventory.csv",
    `${csvHeader}\n${productId},Fixture,SKU-1,0,${variantSignature},8`,
    token
  );

  const preview = await postPreview("Talla|M|M");
  assert.equal(preview.status, 200);
  assert.match(await preview.text(), /Fixture inventario/);
  const unchanged = await Product.findById(productId).lean();
  assert.equal(unchanged.stock, 4, "la vista previa no debe alterar el stock");

  const exportedPdf = await fetch(`http://127.0.0.1:${server.address().port}/admin/inventory/export.pdf`, { headers: { cookie } });
  assert.equal(exportedPdf.status, 200);
  assert.match(exportedPdf.headers.get("content-type"), /application\/pdf/i);
  const pdfPreview = await postFile("inventory.pdf", Buffer.from(await exportedPdf.arrayBuffer()));
  assert.equal(pdfPreview.status, 200);
  assert.match(await pdfPreview.text(), /Vista previa del inventario/);
  assert.equal((await Product.findById(productId).lean()).stock, 4, "la preview PDF tampoco debe modificar stock");

  const stale = await postPreview("Talla|S|S");
  assert.equal(stale.status, 400);
  assert.match(await stale.text(), /identidad de variante cambió/i);

  const csrfRejected = await postPreview("Talla|M|M", "" );
  assert.equal(csrfRejected.status, 403);
  assert.equal((await Product.findById(productId).lean()).stock, 4);
});
