const crypto = require("node:crypto");
const { pool } = require("../config/db");
const { writeAudit } = require("./adminAccess");

const MAIN_LOCATION_ID = "000000000000000000000101";
const id = () => crypto.randomBytes(12).toString("hex");

function variantSignature(variant = {}) {
  return [variant.optionName || "", variant.optionValue || "", variant.label || ""]
    .map((part) => String(part).trim())
    .join("|");
}

function legacyVariantKey(variantIndex, signature = "") {
  if (variantIndex === null || variantIndex === undefined || variantIndex === "") return "base";
  return `variant:${crypto.createHash("sha256").update(String(signature)).digest("hex")}`;
}

function parsePayload(value) {
  return typeof value === "string" ? JSON.parse(value || "{}") : (value || {});
}

function normalizeSku(value) {
  const sku = String(value || "").normalize("NFKC").trim().replace(/\s+/g, "-").toUpperCase();
  if (!sku) return null;
  if (!/^[A-Z0-9][A-Z0-9._/-]{1,99}$/.test(sku)) throw new Error("El SKU solo puede incluir letras, números, punto, guion, guion bajo o barra.");
  return sku;
}

async function adjustLegacyInventory({ productId, variantIndex = null, signature = "", newOnHand, reason, sku: requestedSku = "", actorId, requestKey }) {
  const next = Number(newOnHand);
  const cleanReason = String(reason || "").trim().slice(0, 500);
  const cleanRequestKey = String(requestKey || "");
  if (!Number.isSafeInteger(next) || next < 0 || next > 1_000_000_000) throw new Error("La existencia debe ser un entero entre 0 y 1,000,000,000.");
  if (cleanReason.length < 3) throw new Error("Indica un motivo de al menos 3 caracteres.");
  if (!/^[a-f0-9]{32}$/.test(cleanRequestKey)) throw new Error("La solicitud de ajuste venció. Recarga el inventario e inténtalo otra vez.");

  const connection = await pool.getConnection();
  const requestId = `admin-adjust:${String(actorId)}:${cleanRequestKey}`;
  const batchId = id();
  try {
    await connection.beginTransaction();
    const [prior] = await connection.execute("SELECT id FROM inventory_ledger WHERE idempotency_key=? LIMIT 1", [requestId]);
    if (prior.length) {
      await connection.commit();
      return { duplicate: true };
    }

    const [productRows] = await connection.execute(
      "SELECT id,name,stock,out_of_stock,payload FROM products WHERE id=? AND active=1 FOR UPDATE",
      [String(productId)]
    );
    if (!productRows.length) throw new Error("El producto ya no existe o está inactivo.");
    const product = productRows[0];
    const payload = parsePayload(product.payload);
    const variants = Array.isArray(payload.variants) ? payload.variants : [];
    let variant = null;
    let resolvedIndex = null;
    let rowSignature = "";
    let legacyStock;

    if (variantIndex === null || variantIndex === undefined || variantIndex === "") {
      if (variants.length) throw new Error("Selecciona una variante; este producto no tiene una línea base independiente.");
      legacyStock = Number(product.stock || 0);
    } else {
      resolvedIndex = Number(variantIndex);
      if (!Number.isInteger(resolvedIndex) || resolvedIndex < 0 || resolvedIndex >= variants.length) throw new Error("La variante seleccionada ya no existe.");
      variant = variants[resolvedIndex];
      rowSignature = variantSignature(variant);
      if (rowSignature !== String(signature)) throw new Error("La identidad de la variante cambió. Recarga el inventario antes de ajustar.");
      legacyStock = Number(variant.stock || 0);
    }
    if (!Number.isSafeInteger(legacyStock) || legacyStock < 0) throw new Error("El saldo existente no es válido; requiere conciliación manual.");

    const legacyKey = legacyVariantKey(resolvedIndex, rowSignature);
    const [variantRows] = await connection.execute(
      "SELECT id,sku,sku_normalized FROM product_variants WHERE product_id=? AND legacy_key=? FOR UPDATE",
      [String(productId), legacyKey]
    );
    let variantId = variantRows[0]?.id;
    const previousSku = variantRows[0]?.sku || null;
    const normalizedSku = normalizeSku(requestedSku);
    const skuToStore = normalizedSku || previousSku;
    const now = new Date();
    if (!variantId) {
      variantId = id();
      const label = variant ? String(variant.label || rowSignature).slice(0, 191) : "Producto base";
      const priceMinor = Math.max(0, Math.round(Number(variant?.price ?? payload.basePrice ?? product.base_price ?? 0) * 100));
      const compareMinor = Math.max(0, Math.round(Number(variant?.compareAtPrice ?? payload.compareAtPrice ?? product.compare_at_price ?? 0) * 100));
      await connection.execute(
        "INSERT INTO product_variants (id,product_id,legacy_key,sku,sku_normalized,label,attributes,price_minor,compare_at_minor,image_url,active,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
        [variantId, String(productId), legacyKey, skuToStore, skuToStore, label, JSON.stringify(variant ? { optionName: variant.optionName || "", optionValue: variant.optionValue || "" } : {}), priceMinor, compareMinor, String(variant?.imageUrl || payload.mainImageUrl || product.main_image_url || ""), 1, now, now]
      );
    }
    if (skuToStore && skuToStore !== previousSku) {
      await connection.execute("UPDATE product_variants SET sku=?,sku_normalized=?,updated_at=? WHERE id=?", [skuToStore, skuToStore, now, variantId]);
      await writeAudit(String(actorId), "inventory.sku.assigned", "product_variant", variantId, { productId: String(productId), legacyKey, previousSku, sku: skuToStore, reason: cleanReason }, connection);
    }

    const [balanceRows] = await connection.execute(
      "SELECT on_hand,reserved FROM inventory_balances WHERE variant_id=? AND location_id=? FOR UPDATE",
      [variantId, MAIN_LOCATION_ID]
    );
    let currentBalance = legacyStock;
    let reserved = 0;
    if (balanceRows.length) {
      currentBalance = Number(balanceRows[0].on_hand);
      reserved = Number(balanceRows[0].reserved);
    } else {
      await connection.execute(
        "INSERT INTO inventory_balances (variant_id,location_id,on_hand,reserved,updated_at) VALUES (?,?,?,0,?)",
        [variantId, MAIN_LOCATION_ID, legacyStock, now]
      );
    }
    if (next < reserved) throw new Error(`No puedes dejar ${next} unidades: hay ${reserved} reservadas.`);

    if (currentBalance !== legacyStock) {
      await connection.execute(
        "INSERT INTO inventory_ledger (id,batch_id,variant_id,location_id,action,quantity_before,quantity_after,quantity_delta,reason,actor_id,idempotency_key,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
        [id(), batchId, variantId, MAIN_LOCATION_ID, "legacy_sync", currentBalance, legacyStock, legacyStock - currentBalance, "Sincronización del saldo legacy al iniciar el ajuste administrativo.", String(actorId), `${requestId}:sync`, now]
      );
    }

    if (variant) {
      variant.stock = next;
      variant.outOfStock = next <= 0;
      payload.variants = variants;
      payload.stock = variants.reduce((sum, row) => sum + Math.max(0, Number(row.stock || 0)), 0);
      payload.outOfStock = payload.stock <= 0;
    } else {
      payload.stock = next;
      payload.outOfStock = next <= 0;
    }
    await connection.execute(
      "UPDATE products SET stock=?,out_of_stock=?,payload=?,updated_at=? WHERE id=?",
      [Number(payload.stock || 0), payload.outOfStock ? 1 : 0, JSON.stringify(payload), now, String(productId)]
    );
    if (balanceRows.length) {
      await connection.execute("UPDATE inventory_balances SET on_hand=?,updated_at=? WHERE variant_id=? AND location_id=?", [next, now, variantId, MAIN_LOCATION_ID]);
    } else {
      await connection.execute("UPDATE inventory_balances SET on_hand=?,updated_at=? WHERE variant_id=? AND location_id=?", [next, now, variantId, MAIN_LOCATION_ID]);
    }
    await connection.execute(
      "INSERT INTO inventory_movements (id,batch_id,product_id,variant_index,variant_signature,product_name,quantity_before,quantity_after,quantity_delta,action,actor_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
      [id(), batchId, String(productId), resolvedIndex, rowSignature, String(payload.name || product.name), legacyStock, next, next - legacyStock, "adjust", String(actorId), now]
    );
    await connection.execute(
      "INSERT INTO inventory_ledger (id,batch_id,variant_id,location_id,action,quantity_before,quantity_after,quantity_delta,reason,actor_id,idempotency_key,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
      [id(), batchId, variantId, MAIN_LOCATION_ID, "adjust", legacyStock, next, next - legacyStock, cleanReason, String(actorId), requestId, now]
    );
    await connection.commit();
    return { duplicate: false, previous: legacyStock, current: next };
  } catch (error) {
    await connection.rollback().catch(() => {});
    if (error.code === "ER_DUP_ENTRY") {
      const [replayed] = await connection.execute("SELECT id FROM inventory_ledger WHERE idempotency_key=? LIMIT 1", [requestId]);
      if (replayed.length) return { duplicate: true };
    }
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { adjustLegacyInventory, legacyVariantKey, normalizeSku, variantSignature };
