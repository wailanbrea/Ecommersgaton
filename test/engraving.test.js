require("dotenv").config({ path: process.env.ENV_FILE || ".env.local" });
const assert = require("node:assert/strict");
const { randomBytes, createHmac } = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const { after, test } = require("node:test");
const { MOON_CHARM_FONT_PRESET, engravingOptions, readEngraving } = require("../src/services/engraving");
let closeDatabase;
after(async () => { if (closeDatabase) await closeDatabase(); });

const textConfig = {
  hasCustomization: true,
  customizationFields: [{ key: "text", label: "Texto para grabar", required: true, maxLength: 8 }],
  fontOptions: [{ name: "Clásica" }, { name: "Moderna" }]
};

test("solo se guardan campos configurados y tipografías válidas", () => {
  const options = engravingOptions(textConfig);
  const valid = readEngraving(options, { engraving_0: " Ángela ", engravingFont: "Clásica", customizationSummary: "ignorar" });
  assert.equal(valid.summary, "Texto para grabar: Ángela | Tipografía: Clásica");
  assert.equal(readEngraving(options, { engraving_0: "123456789", engravingFont: "Clásica" }), null);
  assert.equal(readEngraving(options, { engraving_0: "Ana", engravingFont: "Otra" }), null);
  assert.equal(readEngraving(options, { engraving_0: ["Ana", "Eva"], engravingFont: "Clásica" }), null);
  assert.equal(readEngraving(options, { engraving_0: " ", engravingFont: "Clásica" }), null);
  assert.equal(engravingOptions({ ...textConfig, fontOptions: [] }).unavailable, true);
  assert.equal(engravingOptions({ hasCustomization: true, allowPhotoCustomization: true }).unavailable, false);
  assert.equal(engravingOptions({ allowPhotoCustomization: true }).photo, false);
});

test("expande el conjunto genérico existente a las diez tipografías de referencia", () => {
  const legacyFonts = ["Elegante", "Clásica", "Moderna"].map((name) => ({ name }));
  const options = engravingOptions({ ...textConfig, fontOptions: legacyFonts });
  assert.deepEqual(options.fonts.map((font) => font.name), [
    "Black Jack", "Dancing Script", "Great Vibes", "Baskerville", "Alex Brush",
    "Lobster", "Life Savers", "Courier New", "Impact", "Rockwell"
  ]);
  assert.equal(options.fonts.length, MOON_CHARM_FONT_PRESET.length);
  assert.equal(options.fonts.find((font) => font.name === "Great Vibes").sampleStyle, "great-vibes");
  assert.equal(readEngraving(options, { engraving_0: "Ana", engravingFont: "Black Jack" }).fontName, "Black Jack");
  assert.equal(readEngraving(options, { engraving_0: "Ana", engravingFont: "No existe" }), null);
  assert.deepEqual(engravingOptions({ ...textConfig, fontOptions: [{ name: "Mis letras" }] }).fonts.map((font) => font.name), ["Mis letras"]);
});

test("grabados distintos y fotograbado privado llegan al pedido", {
  skip: process.env.RUN_DB_MUTATION_TESTS !== "1"
}, async (t) => {
  const { pool, closeDB } = require("../src/config/db");
  closeDatabase = closeDB;
  assert.notEqual(process.env.NODE_ENV, "production");
  assert.equal(process.env.MYSQL_HOST, "127.0.0.1");
  const [[database]] = await pool.query("SELECT DATABASE() AS name");
  assert.equal(database.name, "gatondo_local_mysql");
  const Product = require("../src/models/Product");
  const Order = require("../src/models/Order");
  const { app } = require("../server");
  const prefix = `qa-grabado-${randomBytes(6).toString("hex")}`;
  const productIds = [];
  const sessionIds = [];
  const orderIds = [];
  const assets = [];
  const server = app.listen(0, "127.0.0.1");
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    for (const id of orderIds) await pool.execute("DELETE FROM orders WHERE id=? AND customer_name=?", [id, prefix]);
    for (const id of productIds) {
      await pool.execute("DELETE FROM inventory_movements WHERE product_id=?", [id]);
      await pool.execute("DELETE FROM products WHERE id=? AND slug LIKE ?", [id, prefix + "-%"]);
    }
    for (const sid of sessionIds) await pool.execute("DELETE FROM app_sessions WHERE sid=?", [sid]);
    for (const asset of assets) await fs.rm(path.join(__dirname, "../storage/customizations", path.basename(asset)), { force: true });
  });
  await new Promise((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const cookie = (sid) => {
    const signature = createHmac("sha256", process.env.SESSION_SECRET).update(sid).digest("base64").replace(/=+$/, "");
    return `gatondo.sid=${encodeURIComponent(`s:${sid}.${signature}`)}`;
  };
  async function session(data = {}) {
    const sid = randomBytes(24).toString("hex");
    sessionIds.push(sid);
    const expires = Date.now() + 600_000;
    await pool.execute("INSERT INTO app_sessions (sid, expires, data) VALUES (?, ?, ?)", [
      sid, expires, JSON.stringify({ cookie: { expires: new Date(expires), originalMaxAge: 600_000 }, ...data })
    ]);
    return cookie(sid);
  }
  const buyer = await session();
  const visitor = await session();
  const request = (route, body, client = buyer) => fetch(origin + route, {
    headers: { cookie: client }, body, method: body ? "POST" : "GET", redirect: "manual"
  });
  async function fixture(suffix, fields) {
    const product = await Product.create({
      name: `Prueba ${suffix}`, slug: `${prefix}-${suffix}`, active: true, featured: false, stock: 4,
      outOfStock: false, basePrice: 10, compareAtPrice: 0, gallery: [], variants: [],
      mainImageUrl: "/images/muestras-carrito/brazaletes-4.jpeg", ...fields
    });
    productIds.push(product._id);
    return `/product/${product.slug}`;
  }
  const textRoute = await fixture("texto", textConfig);
  const photoRoute = await fixture("foto", { hasCustomization: true, allowPhotoCustomization: true });
  const regularRoute = await fixture("normal", {});
  const incompleteRoute = await fixture("sin-fuentes", { ...textConfig, fontOptions: [] });
  const textHtml = await (await request(textRoute)).text();
  assert.match(textHtml, /name="engraving_0".*maxlength="8"/);
  assert.match(textHtml, /name="engravingFont"/);
  assert.match(textHtml, /id="productImageDialog"/);
  assert.doesNotMatch(textHtml, /engravingPreviewText|name="customizationPhoto"/);
  assert.match(await (await request(photoRoute)).text(), /name="customizationPhoto"/);
  assert.doesNotMatch(await (await request(regularRoute)).text(), /name="engravingFont"|name="customizationPhoto"/);
  assert.match(await (await request(incompleteRoute)).text(), /Grabado no disponible/);

  const addText = (value, font) => request(textRoute + "/add-to-cart", new URLSearchParams({ engraving_0: value, engravingFont: font }));
  assert.match((await addText("Ana", "Inválida")).headers.get("location"), /engraving=invalid/);
  assert.match((await addText("Andrea123", "Clásica")).headers.get("location"), /engraving=invalid/);
  assert.match((await addText("Ana", "Clásica")).headers.get("location"), /cart=added/);
  assert.match((await addText("Eva", "Moderna")).headers.get("location"), /cart=added/);
  const form = new FormData();
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0iAAAAAASUVORK5CYII=", "base64");
  form.set("customizationPhoto", new Blob([png], { type: "image/png" }), "prueba.png");
  assert.match((await request(photoRoute + "/add-to-cart", form)).headers.get("location"), /cart=added/);

  const cart = await (await request("/cart")).text();
  assert.match(cart, /Ana \| Tipografía: Clásica/);
  assert.match(cart, /Eva \| Tipografía: Moderna/);
  const asset = cart.match(/href="(\/customization-assets\/[a-f0-9-]+\.png)"/)?.[1];
  assert.ok(asset);
  assets.push(asset);
  assert.deepEqual(Buffer.from(await (await request(asset)).arrayBuffer()), png);
  assert.equal((await request(asset, null, visitor)).status, 404);

  const checkout = await (await request("/checkout")).text();
  const checkoutToken = checkout.match(/name="checkoutToken" value="([a-f0-9]+)"/)?.[1];
  const shippingMethod = checkout.match(/value="([^"]+)"\s+data-price=/)?.[1];
  assert.ok(checkoutToken && shippingMethod);
  const response = await request("/checkout", new URLSearchParams({
    checkoutToken, shippingMethod, customerName: prefix, phone: "0000000000"
  }));
  const confirmation = response.headers.get("location");
  assert.match(confirmation, /^\/order-success\/[a-f0-9]{24}$/);
  const orderId = confirmation.split("/").pop();
  orderIds.push(orderId);
  const order = await Order.findById(orderId).lean();
  assert.deepEqual(order.items.map((item) => item.engravingFields.map((field) => field.value)), [["Ana"], ["Eva"], []]);
  assert.deepEqual(order.items.map((item) => item.fontName), ["Clásica", "Moderna", ""]);
  assert.match(await (await request(confirmation)).text(), /Eva \| Tipografía: Moderna/);
  assert.equal((await request(asset)).status, 200);
  assert.equal((await request(asset, null, visitor)).status, 404);
  const [[admin]] = await pool.query("SELECT id FROM admin_users WHERE active=1 AND COALESCE(JSON_EXTRACT(payload, '$.mustChangePassword'), false)=false LIMIT 1");
  const adminCookie = await session({ adminId: admin.id });
  const adminPage = await request("/admin/orders", null, adminCookie);
  assert.equal(adminPage.status, 200);
  assert.match(await adminPage.text(), /Eva \| Tipografía: Moderna/);
  assert.equal((await request(asset, null, adminCookie)).status, 200);
});
