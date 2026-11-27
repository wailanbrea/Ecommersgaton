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
  const multiDesignProductId = crypto.randomBytes(12).toString("hex");
  const multiDesignProduct = await Product.create({
    _id: multiDesignProductId, name: "Fixture de dos grabados", slug: `prueba-dos-grabados-${multiDesignProductId}`,
    sku: `QA-${multiDesignProductId}`, active: true, stock: 1, outOfStock: false, featured: false,
    hasVariants: false, hasCustomization: true, customizationFields: [
      { key: "name", label: "Nombre", required: true, maxLength: 20, priceDeltaMinor: 0 }
    ], fontOptions: [{ name: "Clásica" }], basePrice: 10, compareAtPrice: 0
  });
  const mappedProductId = crypto.randomBytes(12).toString("hex");
  const mappedProduct = await Product.create({
    _id: mappedProductId, name: "Fixture con ledger relacional", slug: `prueba-ledger-${mappedProductId}`,
    active: true, stock: 3, outOfStock: false, featured: false, hasVariants: false,
    basePrice: 10, compareAtPrice: 0, variants: []
  });
  const mappedVariantId = crypto.randomBytes(12).toString("hex");
  const mappedNow = new Date();
  await pool.execute(
    "INSERT INTO product_variants (id,product_id,legacy_key,sku,sku_normalized,label,attributes,price_minor,compare_at_minor,image_url,active,created_at,updated_at) VALUES (?,?,?,NULL,NULL,?,?,?,?,?,1,?,?)",
    [mappedVariantId, mappedProductId, "base", "Producto base", JSON.stringify({}), 1000, 0, "", mappedNow, mappedNow]
  );
  await pool.execute(
    "INSERT INTO inventory_balances (variant_id,location_id,on_hand,reserved,updated_at) VALUES (?,?,3,0,?)",
    [mappedVariantId, "000000000000000000000101", mappedNow]
  );
  const orderIds = [];
  const outsiderSid = crypto.randomBytes(24).toString("hex");
  const tokenOwnerSid = crypto.randomBytes(24).toString("hex");
  const attackerCheckoutToken = crypto.randomBytes(32).toString("hex");
  const ownerCheckoutToken = crypto.randomBytes(32).toString("hex");
  let httpServer;
  t.after(async () => {
    try {
      if (httpServer) await new Promise((resolve) => httpServer.close(resolve));
      await fs.rm(privateFile, { force: true });
      await pool.execute("DELETE FROM app_sessions WHERE sid IN (?,?)", [outsiderSid, tokenOwnerSid]);
      if (orderIds.length) await pool.execute(`DELETE FROM orders WHERE id IN (${orderIds.map(() => "?").join(",")})`, orderIds);
      await pool.execute("DELETE FROM inventory_ledger WHERE variant_id=?", [mappedVariantId]);
      await pool.execute("DELETE FROM inventory_balances WHERE variant_id=?", [mappedVariantId]);
      await pool.execute("DELETE FROM product_variants WHERE id=?", [mappedVariantId]);
      await pool.execute("DELETE FROM inventory_movements WHERE product_id IN (?,?,?,?)", [productId, idempotentProductId, multiDesignProductId, mappedProductId]);
      await pool.execute("DELETE FROM products WHERE id=?", [productId]);
      await pool.execute("DELETE FROM products WHERE id=?", [idempotentProductId]);
      await pool.execute("DELETE FROM products WHERE id=?", [multiDesignProductId]);
      await pool.execute("DELETE FROM products WHERE id=?", [mappedProductId]);
    } finally { await closeDB(); }
  });

  const cartItem = { productId, productName: product.name, productSlug: slug, quantity: 1, unitPrice: 10, lineTotal: 10 };
  const orderData = (item = cartItem) => {
    const items = Array.isArray(item) ? item : [item];
    const subtotal = items.reduce((sum, entry) => sum + entry.lineTotal, 0);
    return { customerName: "Prueba aislada", phone: "0000000000", email: "", notes: "", items, shippingMethod: "Prueba", shippingDescription: "", shippingCost: 0, subtotal, total: subtotal, paymentMethod: "cash_on_delivery", status: "pending" };
  };
  const results = await Promise.allSettled(Array.from({ length: 20 }, () =>
    storeRoutes.createOrderAndDecrementStock(orderData(), [cartItem])
  ));
  const successful = results.filter((result) => result.status === "fulfilled");
  const rejected = results.filter((result) => result.status === "rejected");
  orderIds.push(...successful.map((result) => result.value));
  assert.equal(successful.length, 1);
  assert.equal(rejected.length, 19);
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

  const twoDistinctDesigns = ["ANA", "EVA"].map((value, index) => ({
    productId: multiDesignProductId, productName: multiDesignProduct.name, productSlug: multiDesignProduct.slug,
    quantity: 1, unitPrice: 10, lineTotal: 10, cartKey: `${multiDesignProductId}__design-${index}`,
    engravingFields: [{ key: "name", label: "Nombre", value, priceDeltaMinor: 0, fontName: "Clásica" }],
    fontSelections: [{ key: "name", label: "Nombre", fontName: "Clásica" }], fontName: "Clásica"
  }));
  await assert.rejects(
    storeRoutes.createOrderAndDecrementStock(orderData(twoDistinctDesigns), twoDistinctDesigns),
    /inventario cambió/i,
    "dos diseños distintos del mismo SKU no deben superar una unidad disponible"
  );
  assert.equal((await Product.findById(multiDesignProductId).lean()).stock, 1, "el rollback conserva el stock inicial");
  const [[multiDesignMovementCount]] = await pool.execute("SELECT COUNT(*) AS count FROM inventory_movements WHERE product_id=? AND action='checkout'", [multiDesignProductId]);
  assert.equal(Number(multiDesignMovementCount.count), 0, "el rechazo no deja movimientos parciales");

  const mappedItem = { ...cartItem, productId: mappedProductId, productName: mappedProduct.name, productSlug: mappedProduct.slug };
  const mappedOrderId = await storeRoutes.createOrderAndDecrementStock(orderData(mappedItem), [mappedItem]);
  orderIds.push(mappedOrderId);
  assert.equal((await Product.findById(mappedProductId).lean()).stock, 2);
  const [[mappedBalance]] = await pool.execute("SELECT on_hand,reserved,available FROM inventory_balances WHERE variant_id=?", [mappedVariantId]);
  assert.deepEqual({ onHand: Number(mappedBalance.on_hand), reserved: Number(mappedBalance.reserved), available: Number(mappedBalance.available) }, { onHand: 2, reserved: 0, available: 2 });
  const [[mappedLedger]] = await pool.execute("SELECT action,quantity_before,quantity_after FROM inventory_ledger WHERE variant_id=?", [mappedVariantId]);
  assert.deepEqual([mappedLedger.action, Number(mappedLedger.quantity_before), Number(mappedLedger.quantity_after)], ["checkout", 3, 2]);

  const { app } = require("../server");
  httpServer = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => { httpServer.once("listening", resolve); httpServer.once("error", reject); });
  const origin = `http://127.0.0.1:${httpServer.address().port}`;
  const outsiderExpires = Date.now() + 600_000;
  await pool.execute("INSERT INTO app_sessions (sid,expires,data) VALUES (?,?,?)", [outsiderSid, outsiderExpires, JSON.stringify({
    cookie: { expires: new Date(outsiderExpires), originalMaxAge: 600_000 }, recentOrderIds: [], checkoutToken: attackerCheckoutToken
  })]);
  await pool.execute("INSERT INTO app_sessions (sid,expires,data) VALUES (?,?,?)", [tokenOwnerSid, outsiderExpires, JSON.stringify({
    cookie: { expires: new Date(outsiderExpires), originalMaxAge: 600_000 }, cart: [], checkoutToken: ownerCheckoutToken
  })]);
  const outsiderSignature = crypto.createHmac("sha256", process.env.SESSION_SECRET).update(outsiderSid).digest("base64").replace(/=+$/, "");
  const outsiderCookie = `gatondo.sid=${encodeURIComponent(`s:${outsiderSid}.${outsiderSignature}`)}`;
  const ownerSignature = crypto.createHmac("sha256", process.env.SESSION_SECRET).update(tokenOwnerSid).digest("base64").replace(/=+$/, "");
  const ownerCookie = `gatondo.sid=${encodeURIComponent(`s:${tokenOwnerSid}.${ownerSignature}`)}`;
  const anonymousOrder = await fetch(`${origin}/order-success/${orderIds[0]}`);
  const crossSessionOrder = await fetch(`${origin}/order-success/${orderIds[0]}`, { headers: { cookie: outsiderCookie } });
  const anonymousAsset = await fetch(`${origin}/customization-assets/${privateFilename}`);
  const crossSessionAsset = await fetch(`${origin}/customization-assets/${privateFilename}`, { headers: { cookie: outsiderCookie } });
  assert.equal(anonymousOrder.status, 404);
  assert.equal(crossSessionOrder.status, 404);
  assert.equal(anonymousAsset.status, 404);
  assert.equal(crossSessionAsset.status, 404);

  const crossSessionCheckoutToken = await fetch(`${origin}/checkout`, {
    method: "POST",
    headers: { cookie: outsiderCookie, "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ checkoutToken: ownerCheckoutToken, customerName: "Prueba cruzada", phone: "0000000000", shippingMethod: "Prueba" }),
    redirect: "manual"
  });
  assert.equal(crossSessionCheckoutToken.status, 409);
  const [[unchangedOrderCount]] = await pool.execute("SELECT COUNT(*) AS count FROM orders WHERE checkout_key=?", [checkoutKey]);
  assert.equal(Number(unchangedOrderCount.count), 1, "el token ajeno no debe crear otro pedido");
  assert.equal((await Product.findById(idempotentProductId).lean()).stock, 1, "el token ajeno no debe descontar inventario");
});
