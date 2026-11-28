const fs = require("fs");
const path = require("path");
const crypto = require("node:crypto");
const {
  engravingOptions,
  readEngraving,
  priceCustomizationSnapshot,
  quoteUnitPrice,
  toMinorUnits,
  fromMinorUnits
} = require("../services/engraving");
const { pool } = require("../config/db");
const express = require("express");
const multer = require("multer");
const Category = require("../models/Category");
const Product = require("../models/Product");
const Review = require("../models/Review");
const SiteSettings = require("../models/SiteSettings");
const Order = require("../models/Order");
const { normalizeCustomizationImage } = require("../services/customizationImage");
const { legacyVariantKey } = require("../services/legacyInventory");
const { resolveEffectivePricing } = require("../utils/pricing");

const router = express.Router();


const REVIEW_UPLOAD_ROOT = path.join(__dirname, "../../public/uploads/reviews");
const REVIEW_UPLOAD_MAX_SIZE_MB = 10;
const REVIEW_ALLOWED_UPLOAD_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp"
]);

const CUSTOMIZATION_UPLOAD_ROOT = path.join(__dirname, "../../storage/customizations");
const CUSTOMIZATION_UPLOAD_MAX_SIZE_MB = 15;
const CUSTOMIZATION_ALLOWED_UPLOAD_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp"
]);

function ensureReviewUploadDir() {
  fs.mkdirSync(REVIEW_UPLOAD_ROOT, { recursive: true });
  fs.mkdirSync(CUSTOMIZATION_UPLOAD_ROOT, { recursive: true });
}

function safeReviewFilename(originalName = "resena") {
  const parsed = path.parse(originalName);
  const base = String(parsed.name || "resena")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "resena";

  return base;
}

function extensionFromReviewMime(mimeType = "") {
  const map = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp"
  };

  return map[mimeType] || "";
}

ensureReviewUploadDir();

const reviewUploadStorage = multer.diskStorage({
  destination(req, file, cb) {
    fs.mkdirSync(REVIEW_UPLOAD_ROOT, { recursive: true });
    cb(null, REVIEW_UPLOAD_ROOT);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname || "") || extensionFromReviewMime(file.mimetype);
    const name = safeReviewFilename(file.originalname);
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${name}-${unique}${ext}`);
  }
});

const reviewUpload = multer({
  storage: reviewUploadStorage,
  limits: {
    fileSize: REVIEW_UPLOAD_MAX_SIZE_MB * 1024 * 1024,
    files: 1
  },
  fileFilter(req, file, cb) {
    if (!REVIEW_ALLOWED_UPLOAD_TYPES.has(file.mimetype)) {
      return cb(new Error("Tipo de archivo no permitido. Usa JPG, PNG o WEBP."));
    }

    return cb(null, true);
  }
});

function uploadedReviewPhotoUrl(file) {
  if (!file || !file.filename) return "";
  return `/uploads/reviews/${file.filename}`;
}

const customizationUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: CUSTOMIZATION_UPLOAD_MAX_SIZE_MB * 1024 * 1024,
    files: 6,
    fields: 100,
    fieldSize: 8192
  },
  fileFilter(req, file, cb) {
    if (!CUSTOMIZATION_ALLOWED_UPLOAD_TYPES.has(file.mimetype)) {
      return cb(new Error("Tipo de archivo no permitido. Usa JPG, PNG o WEBP."));
    }
    return cb(null, true);
  }
});

const parseCustomization = customizationUpload.array("customizationPhoto", 6);

function findVariantIndex(product, item) {
  if (!product.hasVariants || !Array.isArray(product.variants)) return -1;
  return product.variants.findIndex((variant) => {
    const displayLabel = getVariantLabel(variant);
    const sameOptions = (variant.optionName || "") === (item.variantOptionName || "") &&
      (variant.optionValue || "") === (item.variantOptionValue || "");
    return sameOptions && ((variant.label || "") === (item.variantLabel || "") || displayLabel === (item.variantLabel || ""));
  });
}

async function createOrderAndDecrementStock(orderData, cart, checkoutKey = null) {
  const connection = await pool.getConnection();
  const orderId = crypto.randomBytes(12).toString("hex");
  const batchId = crypto.randomBytes(12).toString("hex");
  const now = new Date();
  try {
    await connection.beginTransaction();
    const productIds = [...new Set(cart.map((item) => String(item.productId)))].sort();
    const products = new Map();
    for (const productId of productIds) {
      const [rows] = await connection.execute("SELECT id, name, stock, out_of_stock, payload FROM products WHERE id=? AND active=1 FOR UPDATE", [productId]);
      if (!rows.length) throw new Error("Un producto del carrito ya no está disponible.");
      let data = rows[0].payload;
      if (typeof data === "string") data = JSON.parse(data || "{}");
      products.set(productId, { row: rows[0], data: { ...data, stock: Number(rows[0].stock), outOfStock: Boolean(rows[0].out_of_stock) } });
    }

    const movementRows = [];
    let expectedSubtotalMinor = 0;
    for (const item of cart) {
      const record = products.get(String(item.productId));
      const product = record?.data;
      const quantity = Number(item.quantity || 0);
      if (!product || !Number.isInteger(quantity) || quantity < 1) throw new Error("Cantidad de pedido inválida.");
      const quote = quoteCartItem(product, item);
      if (!quote) throw new Error("La personalización cambió o ya no es válida. Revisa el carrito.");
      const expectedLineTotalMinor = quote.unitPriceMinor * quantity;
      if (toMinorUnits(item.unitPrice) !== quote.unitPriceMinor || toMinorUnits(item.lineTotal) !== expectedLineTotalMinor) {
        const error = new Error("El precio de una personalización cambió. Revisa el total antes de confirmar.");
        error.code = "PRICE_CHANGED";
        throw error;
      }
      expectedSubtotalMinor += expectedLineTotalMinor;
      if (product.hasVariants && Array.isArray(product.variants) && product.variants.length) {
        const variantIndex = findVariantIndex(product, item);
        if (variantIndex < 0) throw new Error("Una variante del carrito ya no existe.");
        const variant = product.variants[variantIndex];
        const before = Math.max(0, Number(variant.stock || 0));
        if (variant.outOfStock || before < quantity) throw new Error("El inventario cambió. Revisa las cantidades en el carrito.");
        variant.stock = before - quantity;
        variant.outOfStock = variant.stock <= 0;
        const variantSignature = [variant.optionName || "", variant.optionValue || "", variant.label || ""].map((part) => String(part).trim()).join("|");
        movementRows.push({ productId: String(item.productId), productName: product.name, variantIndex, variantSignature, before, after: variant.stock, delta: -quantity });
      } else {
        const before = Math.max(0, Number(product.stock || 0));
        if (product.outOfStock || before < quantity) throw new Error("El inventario cambió. Revisa las cantidades en el carrito.");
        product.stock = before - quantity;
        product.outOfStock = product.stock <= 0;
        movementRows.push({ productId: String(item.productId), productName: product.name, variantIndex: null, variantSignature: "", before, after: product.stock, delta: -quantity });
      }
    }

    const shippingMinor = toMinorUnits(orderData.shippingCost);
    if (toMinorUnits(orderData.subtotal) !== expectedSubtotalMinor || shippingMinor === null || toMinorUnits(orderData.total) !== expectedSubtotalMinor + shippingMinor) {
      throw new Error("El total del pedido no coincide con la cotización vigente.");
    }

    for (const productId of productIds) {
      const record = products.get(productId);
      const product = record.data;
      await connection.execute("UPDATE products SET stock=?, out_of_stock=?, payload=?, updated_at=? WHERE id=?", [
        Number(product.stock || 0), product.outOfStock ? 1 : 0, JSON.stringify(product), now, productId
      ]);
    }

    const order = { _id: orderId, ...orderData, createdAt: now, updatedAt: now };
    await connection.execute(
      "INSERT INTO orders (id,checkout_key,customer_name,phone,email,notes,shipping_method,shipping_description,shipping_cost,subtotal,total,payment_method,status,created_at,updated_at,payload) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      [orderId, checkoutKey, order.customerName, order.phone, order.email, order.notes, order.shippingMethod, order.shippingDescription, order.shippingCost, order.subtotal, order.total, order.paymentMethod, order.status, now, now, JSON.stringify(order)]
    );
    for (let movementIndex = 0; movementIndex < movementRows.length; movementIndex++) {
      const movement = movementRows[movementIndex];
      await connection.execute(
        "INSERT INTO inventory_movements (id,batch_id,product_id,variant_index,variant_signature,product_name,quantity_before,quantity_after,quantity_delta,action,actor_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
        [crypto.randomBytes(12).toString("hex"), batchId, movement.productId, movement.variantIndex, movement.variantSignature, movement.productName, movement.before, movement.after, movement.delta, "checkout", "000000000000000000000000", now]
      );
      const key = legacyVariantKey(movement.variantIndex, movement.variantSignature);
      const [mapped] = await connection.execute("SELECT id FROM product_variants WHERE product_id=? AND legacy_key=? FOR UPDATE", [movement.productId, key]);
      if (!mapped.length) continue;
      const variantId = mapped[0].id;
      const [balances] = await connection.execute("SELECT on_hand,reserved FROM inventory_balances WHERE variant_id=? AND location_id=? FOR UPDATE", [variantId, "000000000000000000000101"]);
      if (!balances.length) {
        await connection.execute("INSERT INTO inventory_balances (variant_id,location_id,on_hand,reserved,updated_at) VALUES (?,?,?,0,?)", [variantId, "000000000000000000000101", movement.before, now]);
      } else if (Number(balances[0].on_hand) !== movement.before) {
        throw new Error("El saldo del ledger no coincide con el stock vigente. Ajusta o reconcilia el inventario antes del checkout.");
      }
      const reserved = Number(balances[0]?.reserved || 0);
      if (movement.after < reserved) throw new Error("El checkout no puede consumir unidades reservadas para otro pedido.");
      await connection.execute("UPDATE inventory_balances SET on_hand=?,updated_at=? WHERE variant_id=? AND location_id=?", [movement.after, now, variantId, "000000000000000000000101"]);
      await connection.execute(
        "INSERT INTO inventory_ledger (id,batch_id,variant_id,location_id,action,quantity_before,quantity_after,quantity_delta,reason,actor_id,idempotency_key,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
        [crypto.randomBytes(12).toString("hex"), batchId, variantId, "000000000000000000000101", "checkout", movement.before, movement.after, movement.delta, `Consumo al crear el pedido ${orderId}`, null, `checkout:${orderId}:${movementIndex}`, now]
      );
    }
    await connection.commit();
    return orderId;
  } catch (error) {
    await connection.rollback().catch(() => {});
    if (checkoutKey && error.code === "ER_DUP_ENTRY") {
      const [rows] = await pool.execute("SELECT id FROM orders WHERE checkout_key=? LIMIT 1", [checkoutKey]);
      if (rows[0]?.id) return String(rows[0].id);
    }
    throw error;
  } finally {
    connection.release();
  }
}

const GENDER_OPTIONS = [
  { value: "hombre", label: "Hombres" },
  { value: "mujer", label: "Mujeres" },
  { value: "ninos", label: "Niñ@s" },
  { value: "animales", label: "Animales" }
];

const DEFAULT_SHIPPING_OPTIONS = [
  { name: "Retiro en tienda", description: "Coordinamos el retiro por WhatsApp.", price: 0, active: true },
  { name: "Delivery Santo Domingo", description: "Entrega local dentro de Santo Domingo.", price: 0, active: true },
  { name: "Envío al interior", description: "Envío a otras provincias de República Dominicana.", price: 0, active: true }
];

function activeShippingOptions(settings = {}) {
  const options = Array.isArray(settings?.shippingOptions) ? settings.shippingOptions : [];
  const active = options.filter((option) => option && option.active !== false && option.name);
  return active.length ? active : DEFAULT_SHIPPING_OPTIONS;
}

const isGenderCategory = require("../utils/hiddenCategory");

function formatCurrency(value = 0) {
  const number = Number(value || 0);
  return `RD$ ${number.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function buildOrderWhatsAppMessage(order = {}) {
  const items = (order.items || []).map((item) => {
    let line = `• ${item.quantity || 1} x ${item.productName || "Producto"}`;
    if (item.variantLabel || item.variantOptionValue) line += ` (${item.variantLabel || item.variantOptionValue})`;
    if (item.customizationSummary) line += ` - Personalización: ${item.customizationSummary}`;
    if (item.customizationPhotoUrl) line += ` - Foto cargada para fotograbado: revisar en el panel del pedido`;
    line += ` - ${formatCurrency(item.lineTotal || 0)}`;
    return line;
  }).join("\n");

  return [
    `Hola, quiero confirmar mi pedido GATON DO.`,
    `Pedido: ${order._id || ""}`,
    `Cliente: ${order.customerName || ""}`,
    `Teléfono: ${order.phone || ""}`,
    order.shippingMethod ? `Forma de envío: ${order.shippingMethod}` : "",
    order.shippingDescription ? `Detalle envío: ${order.shippingDescription}` : "",
    items ? `Productos:\n${items}` : "",
    order.notes ? `Notas: ${order.notes}` : "",
    `Subtotal: ${formatCurrency(order.subtotal || 0)}`,
    `Envío: ${formatCurrency(order.shippingCost || 0)}`,
    `Total: ${formatCurrency(order.total || 0)}`
  ].filter(Boolean).join("\n");
}
function getSessionCart(req) {
  if (!req.session.cart) {
    req.session.cart = [];
  }
  return req.session.cart;
}

function normalizeGender(value = "") {
  return String(value || "").trim().toLowerCase();
}

function toPositiveInteger(value, fallback = 1) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.floor(parsed));
}

function buildWhatsAppMessage(productName, variantLabel, customizationText) {
  let message = `Hola, me interesa el producto: ${productName}`;
  if (variantLabel) message += ` | Variante: ${variantLabel}`;
  if (customizationText) message += ` | Personalización: ${customizationText}`;
  return encodeURIComponent(message);
}

function calculateCartSubtotal(cart) {
  const subtotalMinor = cart.reduce((acc, item) => acc + (toMinorUnits(item.lineTotal) || 0), 0);
  return fromMinorUnits(subtotalMinor);
}

function getVariantLabel(variant = {}) {
  return variant.label || variant.optionValue || "";
}

function getVariantStock(variant = {}) {
  return Math.max(0, Number(variant.stock || 0));
}

function getProductStock(product = {}) {
  return Math.max(0, Number(product.stock || 0));
}

function isVariantUnavailable(variant = {}) {
  return Boolean(variant.outOfStock) || getVariantStock(variant) <= 0;
}

function isProductUnavailable(product = {}) {
  if (product.hasVariants && Array.isArray(product.variants) && product.variants.length) {
    return product.variants.every(isVariantUnavailable);
  }

  return Boolean(product.outOfStock) || getProductStock(product) <= 0;
}

function getAvailableStock(product = {}, variant = null) {
  if (variant) return getVariantStock(variant);
  return getProductStock(product);
}

function findCartVariant(product = {}, item = {}) {
  if (!product.hasVariants || !Array.isArray(product.variants) || !product.variants.length) {
    return null;
  }

  return product.variants.find((variant) => {
    const displayLabel = getVariantLabel(variant);
    const rawLabel = variant.label || "";
    const optionName = variant.optionName || "";
    const optionValue = variant.optionValue || "";

    return (
      (rawLabel === (item.variantLabel || "") || displayLabel === (item.variantLabel || "")) &&
      optionName === (item.variantOptionName || "") &&
      optionValue === (item.variantOptionValue || "")
    );
  }) || null;
}

function quoteCartItem(product = {}, item = {}) {
  const variant = findCartVariant(product, item);
  if (product.hasVariants && Array.isArray(product.variants) && product.variants.length && !variant) return null;
  const options = engravingOptions(product);
  const engraving = priceCustomizationSnapshot(options, item.engravingFields, item.fontSelections || item.fontName);
  if (!engraving) return null;
  const basePrice = variant?.price ?? product.basePrice ?? 0;
  const price = quoteUnitPrice(basePrice, engraving);
  if (!price) return null;
  return {
    ...price,
    variant,
    engraving,
    fieldPriceBreakdown: engraving.fields
      .filter((field) => field.priceDeltaMinor > 0)
      .map((field) => ({ key: field.key, label: field.label, priceDeltaMinor: field.priceDeltaMinor }))
  };
}

function stripCartEnrichment(cart) {
  return cart.map(({ availableStock, stockUnavailable, stockMessage, priceChanged, customizationUnavailable, ...item }) => item);
}

function getFirstAvailableVariant(product = {}) {
  if (!product.hasVariants || !Array.isArray(product.variants) || !product.variants.length) {
    return null;
  }

  return product.variants.find((variant) => !isVariantUnavailable(variant)) || product.variants[0];
}

async function enrichCartWithStock(cart) {
  const productIds = [...new Set(cart.map((item) => item.productId).filter(Boolean))];
  const products = await Product.find({ _id: { $in: productIds }, active: true }).lean();
  const productMap = Object.fromEntries(products.map((product) => [String(product._id), product]));

  return cart.map((item) => {
    const product = productMap[item.productId];

    if (!product) {
      return {
        ...item,
        availableStock: 0,
        stockUnavailable: true,
        customizationUnavailable: false,
        stockMessage: "Producto no disponible."
      };
    }

    const variant = findCartVariant(product, item);
    const unavailable = variant ? isVariantUnavailable(variant) : isProductUnavailable(product);
    const availableStock = unavailable ? 0 : getAvailableStock(product, variant);
    const safeQuantity = Math.min(Math.max(1, Number(item.quantity || 1)), Math.max(availableStock, 1));
    const quote = quoteCartItem(product, item);
    const customizationUnavailable = !quote;
    const priceChanged = Boolean(quote && toMinorUnits(item.unitPrice) !== quote.unitPriceMinor);
    const unitPrice = quote?.unitPrice ?? Number(item.unitPrice || 0);
    const quantity = unavailable ? Number(item.quantity || 1) : safeQuantity;
    const lineTotal = fromMinorUnits((toMinorUnits(unitPrice) || 0) * quantity);

    return {
      ...item,
      quantity,
      baseUnitPrice: quote?.baseUnitPrice ?? Number(item.baseUnitPrice ?? item.unitPrice ?? 0),
      customizationSurcharge: quote?.customizationSurcharge ?? Number(item.customizationSurcharge || 0),
      fieldPriceBreakdown: quote?.fieldPriceBreakdown ?? item.fieldPriceBreakdown ?? [],
      unitPrice,
      lineTotal: unavailable ? Number(item.lineTotal || 0) : lineTotal,
      engravingFields: quote?.engraving.fields ?? item.engravingFields ?? [],
      customizationSummary: quote?.engraving.summary ?? item.customizationSummary ?? "",
      fontName: quote?.engraving.fontName ?? item.fontName ?? "",
      fontSelections: quote?.engraving.fontSelections ?? item.fontSelections ?? [],
      customizationUnavailable,
      priceChanged,
      availableStock,
      stockUnavailable: unavailable,
      stockMessage: unavailable
        ? "Agotado o no disponible."
        : `Disponible: ${availableStock}`
    };
  });
}

router.get("/", async (req, res) => {
  const [categories, allActiveProducts, reviews] = await Promise.all([
    Category.find({ active: true }).sort({ sortOrder: 1, name: 1 }).lean(),
    Product.find({ active: true }).sort({ createdAt: -1 }).lean(),
    Review.find({ approved: true, visible: true }).sort({ createdAt: -1 }).limit(6).lean()
  ]);

  const categoryMap = Object.fromEntries(categories.map((c) => [String(c._id), c]));
  const normText = (v = "") =>
    String(v || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const fragranceRootIds = new Set(
    categories
      .filter((c) => /fragancia|perfume|feromona/.test(normText(`${c.slug || ""} ${c.name || ""}`)))
      .map((c) => String(c._id))
  );
  categories.forEach((c) => {
    if (c.parentId && fragranceRootIds.has(String(c.parentId))) {
      fragranceRootIds.add(String(c._id));
    }
  });

  function isFragranceProduct(product) {
    const ids = Array.isArray(product.categoryIds) && product.categoryIds.length
      ? product.categoryIds.map(String)
      : (product.categoryId ? [String(product.categoryId)] : []);
    if (ids.some((id) => fragranceRootIds.has(id))) return true;
    return /fragancia|perfume|feromona/.test(normText(product.name || ""));
  }

  const fragranceProducts = allActiveProducts.filter(isFragranceProduct).slice(0, 4);
  const nonFragranceProducts = allActiveProducts.filter((p) => !isFragranceProduct(p));
  const featuredJewelry = nonFragranceProducts.filter((p) => p.featured).slice(0, 8);
  const jewelryProducts = (featuredJewelry.length ? featuredJewelry : nonFragranceProducts).slice(0, 8);
  const featuredProducts = featuredJewelry;
  const latestProducts = nonFragranceProducts.slice(0, 8);

  const publicCategories = categories.filter((category) => !isGenderCategory(category));
  const featuredCollectionCategories = publicCategories
    .filter((category) => category.collectionFeatured && !category.parentId)
    .slice(0, 4);
  const preferredSlugs = ["collares", "brazaletes", "anillos", "fragancias", "personalizados"];
  const fallbackCollectionCategories = preferredSlugs
    .map((slug) => publicCategories.find((category) => String(category.slug || "").toLowerCase() === slug))
    .filter(Boolean)
    .concat(publicCategories.filter((category) => !category.parentId))
    .filter((category, index, arr) => arr.findIndex((item) => String(item._id) === String(category._id)) === index)
    .slice(0, 4);
  const homeCategories = featuredCollectionCategories.length ? featuredCollectionCategories : fallbackCollectionCategories;

  const reviewProductIds = [...new Set(
    reviews
      .map((review) => String(review.productId || ""))
      .filter(Boolean)
  )];

  const reviewProducts = reviewProductIds.length
    ? await Product.find({ _id: { $in: reviewProductIds } }).select("name slug").lean()
    : [];

  const reviewProductMap = Object.fromEntries(
    reviewProducts.map((product) => [String(product._id), product])
  );

  res.render("store/home", {
    categories: publicCategories,
    categoryMap,
    homeCategories,
    featuredProducts,
    latestProducts,
    jewelryProducts,
    fragranceProducts,
    reviews,
    reviewProductMap
  });
});

router.get("/shop", async (req, res) => {
  const { category = "", q = "", gender = "" } = req.query;

  const filter = { active: true };
  const currentGender = normalizeGender(gender);

  if (q && String(q).trim()) {
    filter.$or = [
      { name: { $regex: String(q).trim(), $options: "i" } },
      { description: { $regex: String(q).trim(), $options: "i" } },
      { shortDescription: { $regex: String(q).trim(), $options: "i" } },
      { tags: { $in: [new RegExp(String(q).trim(), "i")] } }
    ];
  }

  const [categories, rawProducts] = await Promise.all([
    Category.find({ active: true }).sort({ sortOrder: 1, name: 1 }).lean(),
    Product.find(filter).sort({ createdAt: -1 }).lean()
  ]);

  const normText = (v = "") =>
    String(v || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const fragranceCatIds = new Set(
    categories
      .filter((c) => /fragancia|perfume|feromona/.test(normText(`${c.slug || ""} ${c.name || ""}`)))
      .map((c) => String(c._id))
  );
  categories.forEach((c) => {
    if (c.parentId && fragranceCatIds.has(String(c.parentId))) {
      fragranceCatIds.add(String(c._id));
    }
  });

  function isFragranceProduct(product) {
    const ids = Array.isArray(product.categoryIds) && product.categoryIds.length
      ? product.categoryIds.map(String)
      : (product.categoryId ? [String(product.categoryId)] : []);
    if (ids.some((id) => fragranceCatIds.has(id))) return true;
    return /fragancia|perfume|feromona/.test(normText(product.name || ""));
  }

  const selectedCategory = category
    ? categories.find((c) => String(c.slug || "") === String(category) && !isGenderCategory(c)) || null
    : null;
  const isFragranceSection = Boolean(
    selectedCategory && fragranceCatIds.has(String(selectedCategory._id))
  ) || /fragancia|perfume|feromona/.test(normText(category));

  const isGeneralJewelryCategory = Boolean(
    selectedCategory && normText(selectedCategory.slug || selectedCategory.name) === "joyeria"
  );

  let allowedCategoryIds = null;
  if (selectedCategory && !isGeneralJewelryCategory) {
    const childIds = categories
      .filter((c) => String(c.parentId || "") === String(selectedCategory._id))
      .map((c) => String(c._id));
    allowedCategoryIds = new Set([String(selectedCategory._id), ...childIds]);
  }

  const products = (rawProducts || []).filter((product) => {
    const prodIsFrag = isFragranceProduct(product);
    if (isFragranceSection && !prodIsFrag) return false;
    if (!isFragranceSection && prodIsFrag) return false;

    if (allowedCategoryIds && !isFragranceSection) {
      const pCats = Array.isArray(product.categoryIds) && product.categoryIds.length
        ? product.categoryIds.map(String)
        : (product.categoryId ? [String(product.categoryId)] : []);
      if (!pCats.some((id) => allowedCategoryIds.has(id))) return false;
    } else if (allowedCategoryIds && isFragranceSection && selectedCategory && !fragranceCatIds.has(String(selectedCategory._id))) {
      const pCats = Array.isArray(product.categoryIds) && product.categoryIds.length
        ? product.categoryIds.map(String)
        : (product.categoryId ? [String(product.categoryId)] : []);
      if (!pCats.some((id) => allowedCategoryIds.has(id))) return false;
    }

    if (currentGender) {
      const pGenders = Array.isArray(product.genders) && product.genders.length
        ? product.genders.map((g) => normalizeGender(g)).filter(Boolean)
        : (product.gender ? [normalizeGender(product.gender)].filter(Boolean) : []);
      if (!pGenders.includes(currentGender)) return false;
    }
    return true;
  });

  const publicCategories = categories.filter((c) => !isGenderCategory(c));
  const visibleShopCategories = isFragranceSection
    ? publicCategories.filter((c) => fragranceCatIds.has(String(c._id)))
    : publicCategories.filter((c) => !c.parentId && !fragranceCatIds.has(String(c._id)));
  const categoryMap = Object.fromEntries(categories.map((c) => [String(c._id), c]));

  res.render("store/shop", {
    categories: visibleShopCategories,
    products,
    selectedCategory,
    isFragranceSection,
    currentQuery: String(q || ""),
    currentCategorySlug: String(category || ""),
    currentGender,
    genderOptions: GENDER_OPTIONS,
    categoryMap,
    isProductUnavailable,
    formatCurrency
  });
});

router.get("/product/:slug", async (req, res) => {
  const product = await Product.findOne({
    slug: req.params.slug,
    active: true
  }).lean();

  if (!product) {
    return res.status(404).send("Producto no encontrado");
  }

  const [categories, category, reviews, relatedProducts] = await Promise.all([
    Category.find({ active: true }).sort({ sortOrder: 1, name: 1 }).lean(),
    product.categoryId ? Category.findById(product.categoryId).lean() : null,
    Review.find({
      productId: String(product._id),
      approved: true,
      visible: true
    }).sort({ createdAt: -1 }).lean(),
    Product.find({
      active: true,
      _id: { $ne: product._id },
      categoryId: product.categoryId || null
    }).limit(4).lean()
  ]);

  const defaultVariant = getFirstAvailableVariant(product);
  const defaultVariantIndex = defaultVariant && Array.isArray(product.variants)
    ? product.variants.findIndex((variant) => variant === defaultVariant)
    : null;
  const productUnavailable = isProductUnavailable(product);
  const defaultVariantUnavailable = defaultVariant ? isVariantUnavailable(defaultVariant) : false;
  const defaultStock = productUnavailable ? 0 : getAvailableStock(product, defaultVariant);
  const rawDefaultPrice = defaultVariant?.price ?? product.basePrice ?? 0;
  const rawDefaultCompareAt = Number(defaultVariant?.compareAtPrice || 0) > 0
    ? Number(defaultVariant.compareAtPrice)
    : Number(product.compareAtPrice || 0);
  const resolvedDefaultPricing = resolveEffectivePricing(rawDefaultPrice, rawDefaultCompareAt);
  const defaultPrice = resolvedDefaultPricing.salePrice;
  const defaultCompareAt = resolvedDefaultPricing.regularPrice;
  const defaultImage =
    defaultVariant?.imageUrl ||
    product.mainImageUrl ||
    (product.gallery && product.gallery[0] ? product.gallery[0].url : "");

  const initialWhatsAppUrl = `https://wa.me/18493306269?text=${buildWhatsAppMessage(
    product.name,
    defaultVariant?.label || "",
    ""
  )}`;

  res.render("store/product-detail", {
    categories,
    category,
    product,
    reviews,
    relatedProducts,
    defaultVariant,
    defaultVariantIndex,
    defaultPrice,
    defaultCompareAt,
    defaultImage,
    defaultStock,
    defaultVariantUnavailable,
    productUnavailable,
    engraving: engravingOptions(product),
    engravingInvalid: req.query.engraving === "invalid",
    engravingUploadInvalid: req.query.engraving === "photo",
    initialWhatsAppUrl,
    reviewSubmitted: req.query.review === "submitted",
    reviewInvalid: req.query.review === "invalid",
    reviewError: req.query.review === "error",
    cartAdded: req.query.cart === "added",
    stockLimited: req.query.stock === "limited",
    stockUnavailable: req.query.stock === "unavailable",
    isVariantUnavailable,
    getVariantStock,
    isProductUnavailable
  });
});

router.post("/product/:slug/reviews", reviewUpload.single("reviewPhoto"), async (req, res) => {
  try {
    const product = await Product.findOne({
      slug: req.params.slug,
      active: true
    });

    if (!product) {
      return res.status(404).send("Producto no encontrado");
    }

    const customerName = String(req.body.customerName || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const comment = String(req.body.comment || "").trim();
    const rating = Number(req.body.rating || 5);
    const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!customerName || !emailLooksValid || !comment || rating < 1 || rating > 5) {
      return res.redirect(`/product/${product.slug}?review=invalid`);
    }

    await Review.create({
      productId: String(product._id),
      customerName,
      email,
      comment,
      rating,
      photoUrl: uploadedReviewPhotoUrl(req.file),
      approved: false,
      visible: true
    });

    return res.redirect(`/product/${product.slug}?review=submitted`);
  } catch (error) {
    console.error("❌ Error enviando reseña:", error);
    return res.redirect(`/product/${req.params.slug}?review=error`);
  }
});

router.post("/product/:slug/add-to-cart", (req, res, next) => {
  parseCustomization(req, res, (error) => {
    if (error) {
      return res.redirect(`/product/${encodeURIComponent(req.params.slug)}?engraving=photo`);
    }
    next();
  });
}, async (req, res) => {
  try {
    const product = await Product.findOne({
      slug: req.params.slug,
      active: true
    }).lean();

    if (!product) {
      return res.status(404).send("Producto no encontrado");
    }

    const options = engravingOptions(product);
    const engraving = readEngraving(options, req.body);
    if (options.unavailable || !engraving) {
      return res.redirect(`/product/${product.slug}?engraving=invalid`);
    }
    const uploadedPhotoFiles = Array.isArray(req.files)
      ? req.files
      : (req.file ? [req.file] : []);
    if (uploadedPhotoFiles.length && !options.photo) return res.redirect(`/product/${product.slug}?engraving=invalid`);

    const normalizedPhotos = [];
    for (const photoFile of uploadedPhotoFiles) {
      try {
        normalizedPhotos.push(await normalizeCustomizationImage(photoFile.buffer, photoFile.mimetype));
      } catch {
        return res.redirect(`/product/${product.slug}?engraving=photo`);
      }
    }

    const requestedQuantity = toPositiveInteger(req.body.quantity || 1);
    const variantIndexRaw = req.body.variantIndex;
    const variantIndex =
      variantIndexRaw === undefined || variantIndexRaw === null || variantIndexRaw === ""
        ? null
        : Number(variantIndexRaw);

    let selectedVariant = null;
    if (
      product.hasVariants &&
      Array.isArray(product.variants) &&
      product.variants.length &&
      variantIndex !== null &&
      !Number.isNaN(variantIndex) &&
      product.variants[variantIndex]
    ) {
      selectedVariant = product.variants[variantIndex];
    } else if (product.hasVariants && Array.isArray(product.variants) && product.variants.length) {
      selectedVariant = getFirstAvailableVariant(product);
    }

    const unavailable = selectedVariant ? isVariantUnavailable(selectedVariant) : isProductUnavailable(product);

    if (unavailable) {
      return res.redirect(`/product/${product.slug}?stock=unavailable`);
    }

    const availableStock = getAvailableStock(product, selectedVariant);

    if (availableStock <= 0) {
      return res.redirect(`/product/${product.slug}?stock=unavailable`);
    }

    const rawBaseUnitPrice = Number(selectedVariant?.price ?? product.basePrice ?? 0);
    const rawCompareAtPrice = Number(selectedVariant?.compareAtPrice || 0) > 0
      ? Number(selectedVariant.compareAtPrice)
      : Number(product.compareAtPrice || 0);
    const resolvedUnitPricing = resolveEffectivePricing(rawBaseUnitPrice, rawCompareAtPrice);
    const baseUnitPrice = resolvedUnitPricing.salePrice;
    const priceQuote = quoteUnitPrice(baseUnitPrice, engraving);
    if (!priceQuote) return res.redirect(`/product/${product.slug}?engraving=invalid`);
    const unitPrice = priceQuote.unitPrice;
    const compareAtPrice = resolvedUnitPricing.regularPrice;
    const imageUrl =
      selectedVariant?.imageUrl ||
      product.mainImageUrl ||
      (product.gallery && product.gallery[0] ? product.gallery[0].url : "");

    const customizationSummary = engraving.summary;
    const fontName = engraving.fontName;
    const fontSelections = engraving.fontSelections;
    const photoFilesToWrite = normalizedPhotos.map((photo) => ({
      filename: crypto.randomUUID() + photo.extension,
      buffer: photo.buffer
    }));
    const customizationPhotoUrls = photoFilesToWrite.map((entry) => `/customization-assets/${entry.filename}`);
    const customizationPhotoUrl = customizationPhotoUrls[0] || "";

    const cart = getSessionCart(req);

    const cartKey = [
      String(product._id),
      selectedVariant?.label || selectedVariant?.optionValue || "",
      product.hasCustomization ? crypto.createHash("sha256")
        .update(JSON.stringify([product.variants?.indexOf(selectedVariant), engraving.fields, fontName, customizationPhotoUrls])).digest("hex") : "",
      "",
      ""
    ].join("__");

    const existingIndex = cart.findIndex((item) => item.cartKey === cartKey);
    const existingQuantity = existingIndex >= 0 ? Number(cart[existingIndex].quantity || 0) : 0;
    const finalQuantityToAdd = Math.min(requestedQuantity, Math.max(availableStock - existingQuantity, 0));

    if (finalQuantityToAdd <= 0) {
      return res.redirect(`/product/${product.slug}?stock=limited`);
    }

    for (const entry of photoFilesToWrite) {
      await fs.promises.writeFile(path.join(CUSTOMIZATION_UPLOAD_ROOT, entry.filename), entry.buffer, { flag: "wx", mode: 0o600 });
    }

    if (existingIndex >= 0) {
      cart[existingIndex].quantity = Math.min(existingQuantity + finalQuantityToAdd, availableStock);
      cart[existingIndex].lineTotal = fromMinorUnits((toMinorUnits(cart[existingIndex].unitPrice) || 0) * Number(cart[existingIndex].quantity));
      if (customizationPhotoUrls.length) {
        cart[existingIndex].customizationPhotoUrl = customizationPhotoUrl;
        cart[existingIndex].customizationPhotoUrls = customizationPhotoUrls;
      }
    } else {
      const quantity = Math.min(finalQuantityToAdd, availableStock);
      cart.push({
        cartKey,
        productId: String(product._id),
        productName: product.name,
        productSlug: product.slug,
        imageUrl,
        quantity,
        baseUnitPrice: priceQuote.baseUnitPrice,
        customizationSurcharge: priceQuote.customizationSurcharge,
        fieldPriceBreakdown: engraving.fields
          .filter((field) => field.priceDeltaMinor > 0)
          .map((field) => ({ key: field.key, label: field.label, priceDeltaMinor: field.priceDeltaMinor })),
        unitPrice,
        compareAtPrice,
        lineTotal: fromMinorUnits(priceQuote.unitPriceMinor * quantity),
        variantLabel: selectedVariant?.label || "",
        variantOptionName: selectedVariant?.optionName || "",
        variantOptionValue: selectedVariant?.optionValue || "",
        customizationSummary,
        engravingFields: engraving.fields,
        customizationPhotoUrl,
        customizationPhotoUrls,
        fontName,
        fontSelections
      });
    }

    req.session.cart = cart;

    return res.redirect(`/product/${product.slug}?cart=added`);
  } catch (error) {
    console.error("❌ Error agregando al carrito:", error);
    return res.redirect(`/product/${req.params.slug}`);
  }
});

router.get("/cart", async (req, res) => {
  const cart = await enrichCartWithStock(getSessionCart(req));
  req.session.cart = stripCartEnrichment(cart);
  const subtotal = calculateCartSubtotal(cart.filter((item) => !item.stockUnavailable));

  res.render("store/cart", {
    cart,
    subtotal,
    hasStockIssues: cart.some((item) => item.stockUnavailable || Number(item.quantity || 1) > Number(item.availableStock || 0)),
    hasCustomizationIssues: cart.some((item) => item.customizationUnavailable),
    pricesUpdated: cart.some((item) => item.priceChanged)
  });
});

router.post("/cart/update/:cartKey", async (req, res) => {
  const cart = getSessionCart(req);
  const cartKey = req.params.cartKey;
  const requestedQuantity = toPositiveInteger(req.body.quantity || 1);

  const item = cart.find((entry) => entry.cartKey === cartKey);
  let priceChanged = false;
  let customizationChanged = false;

  if (item) {
    const product = await Product.findOne({ _id: item.productId, active: true }).lean();
    const variant = product ? findCartVariant(product, item) : null;
    const unavailable = !product || (variant ? isVariantUnavailable(variant) : isProductUnavailable(product));
    const availableStock = unavailable ? 0 : getAvailableStock(product, variant);
    const quote = product ? quoteCartItem(product, item) : null;
    priceChanged = Boolean(quote && toMinorUnits(item.unitPrice) !== quote.unitPriceMinor);
    customizationChanged = Boolean(product && !quote);

    if (availableStock <= 0 || !quote) {
      item.quantity = 1;
      item.lineTotal = Number(item.unitPrice || 0);
    } else {
      item.quantity = Math.min(requestedQuantity, availableStock);
      item.baseUnitPrice = quote.baseUnitPrice;
      item.customizationSurcharge = quote.customizationSurcharge;
      item.fieldPriceBreakdown = quote.fieldPriceBreakdown;
      item.unitPrice = quote.unitPrice;
      item.engravingFields = quote.engraving.fields;
      item.customizationSummary = quote.engraving.summary;
      item.fontName = quote.engraving.fontName;
      item.fontSelections = quote.engraving.fontSelections;
      item.lineTotal = fromMinorUnits(quote.unitPriceMinor * item.quantity);
    }
  }

  req.session.cart = cart;
  if (customizationChanged) return res.redirect("/cart?customization=changed");
  if (priceChanged) return res.redirect("/cart?prices=updated");
  return res.redirect("/cart");
});

router.post("/cart/remove/:cartKey", (req, res) => {
  const cart = getSessionCart(req);
  req.session.cart = cart.filter((entry) => entry.cartKey !== req.params.cartKey);
  return res.redirect("/cart");
});

router.post("/cart/clear", (req, res) => {
  req.session.cart = [];
  return res.redirect("/cart");
});

router.get("/checkout", async (req, res) => {
  const cart = await enrichCartWithStock(getSessionCart(req));
  req.session.cart = stripCartEnrichment(cart);
  const siteSettings = await SiteSettings.findOne().lean();

  if (!cart.length) {
    return res.redirect("/cart");
  }

  if (cart.some((item) => item.stockUnavailable || Number(item.quantity || 1) > Number(item.availableStock || 0))) {
    return res.redirect("/cart");
  }

  if (cart.some((item) => item.customizationUnavailable)) return res.redirect("/cart?customization=changed");

  const subtotal = calculateCartSubtotal(cart);

  res.render("store/checkout", {
    cart,
    subtotal,
    shippingOptions: activeShippingOptions(siteSettings),
    checkoutToken: req.session.checkoutToken || (req.session.checkoutToken = crypto.randomBytes(32).toString("hex")),
    pricesUpdated: cart.some((item) => item.priceChanged) || req.query.prices === "updated"
  });
});

router.post("/checkout", async (req, res) => {
  try {
    const submittedToken = String(req.body.checkoutToken || "");
    const expectedToken = String(req.session.checkoutToken || "");
    if (submittedToken.length !== 64 || expectedToken.length !== 64 || !crypto.timingSafeEqual(Buffer.from(submittedToken), Buffer.from(expectedToken))) {
      return res.status(409).send("El checkout venció. Vuelve a revisar tu carrito.");
    }
    const checkoutKey = crypto.createHash("sha256").update(submittedToken).digest("hex");
    const cart = await enrichCartWithStock(getSessionCart(req));
    const siteSettings = await SiteSettings.findOne().lean();

    if (!cart.length) {
      return res.redirect("/cart");
    }

    if (cart.some((item) => item.stockUnavailable || Number(item.quantity || 1) > Number(item.availableStock || 0))) {
      req.session.cart = stripCartEnrichment(cart);
      return res.redirect("/cart");
    }

    if (cart.some((item) => item.customizationUnavailable)) {
      req.session.cart = stripCartEnrichment(cart);
      return res.redirect("/cart?customization=changed");
    }

    if (cart.some((item) => item.priceChanged)) {
      req.session.cart = stripCartEnrichment(cart);
      return res.redirect("/checkout?prices=updated");
    }

    const customerName = String(req.body.customerName || "").trim();
    const phone = String(req.body.phone || "").trim();
    const email = String(req.body.email || "").trim();
    const notes = String(req.body.notes || "").trim();
    const shippingMethod = String(req.body.shippingMethod || "").trim();

    if (!customerName || !phone || !shippingMethod) {
      return res.redirect("/checkout");
    }

    const shippingOptions = activeShippingOptions(siteSettings);
    const selectedShipping = shippingOptions.find(
      (option) => option.name === shippingMethod && option.active !== false
    );

    if (!selectedShipping) {
      return res.redirect("/checkout");
    }

    const subtotal = calculateCartSubtotal(cart);
    const shippingCost = Number(selectedShipping.price || 0);
    const total = subtotal + shippingCost;

    const orderItems = cart.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      productSlug: item.productSlug,
      imageUrl: item.imageUrl,
      quantity: Number(item.quantity || 1),
      baseUnitPrice: Number(item.baseUnitPrice ?? item.unitPrice ?? 0),
      customizationSurcharge: Number(item.customizationSurcharge || 0),
      fieldPriceBreakdown: item.fieldPriceBreakdown || [],
      unitPrice: Number(item.unitPrice || 0),
      compareAtPrice: Number(item.compareAtPrice || 0),
      lineTotal: Number(item.lineTotal || 0),
      variantLabel: item.variantLabel || "",
      variantOptionName: item.variantOptionName || "",
      variantOptionValue: item.variantOptionValue || "",
      customizationSummary: item.customizationSummary || "",
      engravingFields: item.engravingFields || [],
      fontSelections: item.fontSelections || [],
      customizationPhotoUrl: item.customizationPhotoUrl || "",
      customizationPhotoUrls: Array.isArray(item.customizationPhotoUrls) && item.customizationPhotoUrls.length
        ? item.customizationPhotoUrls
        : (item.customizationPhotoUrl ? [item.customizationPhotoUrl] : []),
      fontName: item.fontName || ""
    }));
    const createdOrderId = await createOrderAndDecrementStock({
      customerName,
      phone,
      email,
      notes,
      items: orderItems,
      shippingMethod: selectedShipping.name,
      shippingDescription: selectedShipping.description || "",
      shippingCost,
      subtotal,
      total,
      paymentMethod: "cash_on_delivery",
      status: "pending"
    }, cart, checkoutKey);

    req.session.cart = [];
    req.session.checkoutToken = crypto.randomBytes(32).toString("hex");
    req.session.recentOrderIds = [...new Set([...(req.session.recentOrderIds || []), createdOrderId])].slice(-10);

    return res.redirect(`/order-success/${createdOrderId}`);
  } catch (error) {
    console.error("❌ Error creando pedido:", error);
    if (error.code === "PRICE_CHANGED") return res.redirect("/checkout?prices=updated");
    return res.redirect("/checkout");
  }
});

router.get("/order-success/:id", async (req, res) => {
  if (!(req.session.recentOrderIds || []).includes(String(req.params.id))) {
    return res.status(404).send("Pedido no encontrado");
  }
  const [order, siteSettings] = await Promise.all([
    Order.findById(req.params.id).lean(),
    SiteSettings.findOne().lean()
  ]);

  if (!order) {
    return res.status(404).send("Pedido no encontrado");
  }

  const whatsappDigits = String(siteSettings?.whatsapp || siteSettings?.phone || "18493306269").replace(/[^0-9]/g, "");
  const whatsappMessage = buildOrderWhatsAppMessage(order);
  const whatsappOrderUrl = whatsappDigits ? `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(whatsappMessage)}` : "";

  res.render("store/order-success", {
    order,
    whatsappOrderUrl,
    formatCurrency
  });
});

router.createOrderAndDecrementStock = createOrderAndDecrementStock;
module.exports = router;
