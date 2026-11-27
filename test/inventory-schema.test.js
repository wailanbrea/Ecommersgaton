require("dotenv").config({ path: process.env.ENV_FILE || ".env.local" });
const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const { test } = require("node:test");

test("el esquema normalizado protege SKU, disponibilidad y reservas", {
  skip: process.env.RUN_INVENTORY_SCHEMA_TESTS !== "1"
}, async (t) => {
  assert.notEqual(process.env.NODE_ENV, "production", "la prueba mutante está prohibida en producción");
  const { pool, closeDB } = require("../src/config/db");
  const [[database]] = await pool.query("SELECT DATABASE() AS name");
  assert.match(database.name, /^test_gaton_f0_/);

  const productId = randomBytes(12).toString("hex");
  const orderId = randomBytes(12).toString("hex");
  const variantId = randomBytes(12).toString("hex");
  const duplicateVariantId = randomBytes(12).toString("hex");
  const reservationId = randomBytes(12).toString("hex");
  const duplicateReservationId = randomBytes(12).toString("hex");
  const suffix = randomBytes(5).toString("hex");
  let productCreated = false;

  t.after(async () => {
    try {
      await pool.execute("DELETE FROM inventory_reservation_lines WHERE reservation_id IN (?,?)", [reservationId, duplicateReservationId]);
      await pool.execute("DELETE FROM inventory_reservations WHERE id IN (?,?)", [reservationId, duplicateReservationId]);
      await pool.execute("DELETE FROM inventory_balances WHERE variant_id IN (?,?)", [variantId, duplicateVariantId]);
      await pool.execute("DELETE FROM product_variants WHERE id IN (?,?)", [variantId, duplicateVariantId]);
      if (productCreated) await pool.execute("DELETE FROM orders WHERE id=?", [orderId]);
      await pool.execute("DELETE FROM products WHERE id=?", [productId]);
    } finally {
      await closeDB();
    }
  });

  await pool.execute(
    "INSERT INTO products (id,name,slug,short_description,description,category_id,gender,base_price,compare_at_price,main_image_url,video_url,stock,out_of_stock,featured,active,created_at,updated_at,payload) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    [productId, "Fixture SKU", `fixture-sku-${suffix}`, "", "", "", "", 10, 0, "", "", 10, 0, 0, 1, new Date(), new Date(), JSON.stringify({})]
  );
  await pool.execute(
    "INSERT INTO orders (id,customer_name,phone,email,notes,shipping_method,shipping_description,shipping_cost,subtotal,total,payment_method,status,created_at,updated_at,payload) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    [orderId, "Fixture local", "", "", "", "QA", "", 0, 10, 10, "disabled", "pending", new Date(), new Date(), JSON.stringify({})]
  );
  productCreated = true;

  const now = new Date();
  await pool.execute(
    "INSERT INTO product_variants (id,product_id,legacy_key,sku,sku_normalized,label,attributes,price_minor,compare_at_minor,image_url,active,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
    [variantId, productId, "base", `QA-${suffix}`, `QA-${suffix}`.toUpperCase(), "Base", JSON.stringify({}), 1000, 0, "", 1, now, now]
  );
  await pool.execute(
    "INSERT INTO inventory_balances (variant_id,location_id,on_hand,reserved,updated_at) VALUES (?,?,?,?,?)",
    [variantId, "000000000000000000000101", 10, 4, now]
  );
  const [[balance]] = await pool.execute("SELECT on_hand,reserved,available FROM inventory_balances WHERE variant_id=?", [variantId]);
  assert.deepEqual({ onHand: Number(balance.on_hand), reserved: Number(balance.reserved), available: Number(balance.available) }, { onHand: 10, reserved: 4, available: 6 });

  await assert.rejects(
    pool.execute("UPDATE inventory_balances SET reserved=11 WHERE variant_id=?", [variantId])
  );
  await assert.rejects(
    pool.execute(
      "INSERT INTO product_variants (id,product_id,legacy_key,sku,sku_normalized,label,attributes,price_minor,compare_at_minor,image_url,active,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
      [duplicateVariantId, productId, "other", `qa-${suffix}`, `QA-${suffix}`.toUpperCase(), "Duplicado", JSON.stringify({}), 1000, 0, "", 1, now, now]
    ),
    (error) => error.code === "ER_DUP_ENTRY"
  );

  const idem = randomBytes(32).toString("hex");
  const reservationValues = [reservationId, orderId, idem, "active", new Date(Date.now() + 30 * 60 * 1000), now, now];
  await pool.execute(
    "INSERT INTO inventory_reservations (id,order_id,idempotency_key,status,expires_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?)",
    reservationValues
  );
  await assert.rejects(
    pool.execute(
      "INSERT INTO inventory_reservations (id,order_id,idempotency_key,status,expires_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?)",
      [duplicateReservationId, orderId, idem, "active", new Date(Date.now() + 30 * 60 * 1000), now, now]
    ),
    (error) => error.code === "ER_DUP_ENTRY"
  );
  await pool.execute(
    "INSERT INTO inventory_reservation_lines (id,reservation_id,variant_id,location_id,quantity,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)",
    [randomBytes(12).toString("hex"), reservationId, variantId, "000000000000000000000101", 2, "active", now, now]
  );
  assert.ok(true);
});
