require("dotenv").config({ path: process.env.ENV_FILE || ".env.local" });
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const { test } = require("node:test");
const { pool, closeDB } = require("../src/config/db");
const Product = require("../src/models/Product");
const storeRoutes = require("../src/routes/store");

test("checkout serializa compras simultáneas y no vende sobre inventario", {
  skip: process.env.RUN_DB_MUTATION_TESTS !== "1"
}, async (t) => {
  assert.notEqual(process.env.NODE_ENV, "production", "la prueba de mutación está prohibida en producción");
  const [[database]] = await pool.query("SELECT DATABASE() AS name");
  assert.ok(database.name && !/prod(uction)?/i.test(database.name), "la prueba requiere una base de laboratorio no productiva");

  const productId = crypto.randomBytes(12).toString("hex");
  const slug = `prueba-concurrencia-${productId}`;
  const privateFilename = `test-${productId}.png`;
  const privateFile = path.join(__dirname, "../storage/customizations", privateFilename);
  await fs.mkdir(path.dirname(privateFile), { recursive: true });
  await fs.writeFile(privateFile, Buffer.from("fixture privado"));
  const product = await Product.create({ _id: productId, name: "Fixture de concurrencia", slug, active: true, stock: 1, outOfStock: false, featured: false, hasVariants: false, basePrice: 10, compareAtPrice: 0 });
  const idempotentProductId = crypto.randomBytes(12).toString("hex");
  const idempotentProduct = await Product.create({ _id: idempotentProductId, name: "Fixture de idempotencia", slug: `prueba-idempotencia-${idempotentProductId}`, active: true, stock: 2, outOfStock: false, featured: false, hasVariants: false, basePrice: 10, compareAtPrice: 0 });
  const orderIds = [];
  let httpServer;
  t.after(async () => {
    try {
      if (httpServer) await new Promise((resolve) => httpServer.close(resolve));
      await fs.rm(privateFile, { force: true });
      if (orderIds.length) await pool.execute(`DELETE FROM orders WHERE id IN (${orderIds.map(() => "?").join(",")})`, orderIds);
      await pool.execute("DELETE FROM inventory_movements WHERE product_id IN (?,?)", [productId, idempotentProductId]);
      await pool.execute("DELETE FROM products WHERE id=?", [productId]);
      await pool.execute("DELETE FROM products WHERE id=?", [idempotentProductId]);
    } finally { await closeDB(); }
  });

  const cartItem = { productId, productName: product.name, productSlug: slug, quantity: 1, unitPrice: 10, lineTotal: 10 };
  const orderData = (item = cartItem) => ({ customerName: "Prueba aislada", phone: "0000000000", email: "", notes: "", items: [item], shippingMethod: "Prueba", shippingDescription: "", shippingCost: 0, subtotal: 10, total: 10, paymentMethod: "cash_on_delivery", status: "pending" });
  const results = await Promise.allSettled([
    storeRoutes.createOrderAndDecrementStock(orderData(), [cartItem]),
    storeRoutes.createOrderAndDecrementStock(orderData(), [cartItem])
  ]);
  const successful = results.filter((result) => result.status === "fulfilled");
  const rejected = results.filter((result) => result.status === "rejected");
  orderIds.push(...successful.map((result) => result.value));
  assert.equal(successful.length, 1);
  assert.equal(rejected.length, 1);
  const updated = await Product.findById(productId).lean();
  assert.equal(updated.stock, 0);
  assert.equal(updated.outOfStock, true);
  const [[movementCount]] = await pool.execute("SELECT COUNT(*) AS count FROM inventory_movements WHERE product_id=? AND action='checkout'", [productId]);
  assert.equal(Number(movementCount.count), 1);

  const idempotentItem = { ...cartItem, productId: idempotentProductId, productName: idempotentProduct.name, productSlug: idempotentProduct.slug };
  const checkoutKey = crypto.createHash("sha256").update(crypto.randomBytes(32)).digest("hex");
  const repeated = await Promise.all([
    storeRoutes.createOrderAndDecrementStock(orderData(idempotentItem), [idempotentItem], checkoutKey),
    storeRoutes.createOrderAndDecrementStock(orderData(idempotentItem), [idempotentItem], checkoutKey)
  ]);
  orderIds.push(...repeated);
  assert.equal(repeated[0], repeated[1]);
  assert.equal((await Product.findById(idempotentProductId).lean()).stock, 1);
  const [[idempotentOrderCount]] = await pool.execute("SELECT COUNT(*) AS count FROM orders WHERE checkout_key=?", [checkoutKey]);
  assert.equal(Number(idempotentOrderCount.count), 1);

  const { app } = require("../server");
  httpServer = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => { httpServer.once("listening", resolve); httpServer.once("error", reject); });
  const origin = `http://127.0.0.1:${httpServer.address().port}`;
  const anonymousOrder = await fetch(`${origin}/order-success/${orderIds[0]}`);
  const anonymousAsset = await fetch(`${origin}/customization-assets/${privateFilename}`);
  assert.equal(anonymousOrder.status, 404);
  assert.equal(anonymousAsset.status, 404);
});
