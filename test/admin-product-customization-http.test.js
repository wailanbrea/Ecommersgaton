require("dotenv").config({ path: process.env.ENV_FILE || ".env.local" });
const assert = require("node:assert/strict");
const { createHmac, randomBytes } = require("node:crypto");
const bcrypt = require("bcryptjs");
const { test } = require("node:test");
const AdminUser = require("../src/models/AdminUser");
const Product = require("../src/models/Product");

test("administra campos/lados, recargos y fotograbado por producto y los sirve en la ficha", {
  skip: process.env.RUN_DB_MUTATION_TESTS !== "1"
}, async (t) => {
  assert.notEqual(process.env.NODE_ENV, "production", "la prueba de personalización está prohibida en producción");
  assert.equal(process.env.MYSQL_HOST, "127.0.0.1");
  const { pool, closeDB } = require("../src/config/db");
  const [[database]] = await pool.query("SELECT DATABASE() AS name");
  assert.equal(database.name, "gatondo_local_mysql");

  const userId = randomBytes(12).toString("hex");
  const roleId = randomBytes(12).toString("hex");
  const productId = randomBytes(12).toString("hex");
  const sid = randomBytes(24).toString("hex");
  const csrf = randomBytes(32).toString("hex");
  const email = `${userId}@qa.invalid`;
  const roleSlug = `qa-product-config-${roleId}`;
  const productSlug = `qa-configurator-${productId}`;
  const expires = Date.now() + 600_000;
  let server;

  t.after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    await pool.execute("DELETE FROM app_sessions WHERE sid=?", [sid]);
    await pool.execute("DELETE FROM admin_user_roles WHERE user_id=? AND role_id=?", [userId, roleId]);
    await pool.execute("DELETE FROM admin_role_permissions WHERE role_id=?", [roleId]);
    await pool.execute("DELETE FROM products WHERE id=? AND slug=?", [productId, productSlug]);
    await pool.execute("DELETE FROM admin_users WHERE id=? AND email=?", [userId, email]);
    await pool.execute("DELETE FROM admin_roles WHERE id=? AND slug=?", [roleId, roleSlug]);
    await closeDB();
  });

  await AdminUser.create({
    _id: userId,
    name: "QA configurador por producto",
    email,
    passwordHash: await bcrypt.hash("Solo-Laboratorio-2026!", 4),
    active: true,
    mustChangePassword: false
  });
  const now = new Date();
  await pool.execute(
    "INSERT INTO admin_roles (id,slug,name,description,is_system,created_at,updated_at) VALUES (?,?,?,?,0,?,?)",
    [roleId, roleSlug, "QA edición de personalización", "Fixture temporal de prueba", now, now]
  );
  await pool.execute("INSERT INTO admin_user_roles (user_id,role_id,created_at) VALUES (?,?,?)", [userId, roleId, now]);
  const [permissionRows] = await pool.execute(
    "SELECT id FROM admin_permissions WHERE code IN ('products.edit','products.personalization')"
  );
  assert.equal(permissionRows.length, 2);
  for (const permission of permissionRows) {
    await pool.execute("INSERT INTO admin_role_permissions (role_id,permission_id) VALUES (?,?)", [roleId, permission.id]);
  }
  await Product.create({
    _id: productId,
    name: "QA producto configurable",
    slug: productSlug,
    active: true,
    stock: 10,
    outOfStock: false,
    featured: false,
    basePrice: 1290,
    compareAtPrice: 0,
    mainImageUrl: "/images/muestras-carrito/brazaletes-4.jpeg",
    hasCustomization: false,
    allowPhotoCustomization: false,
    customizationFields: [],
    fontOptions: [],
    gallery: []
  });
  await pool.execute("INSERT INTO app_sessions (sid,expires,data) VALUES (?,?,?)", [sid, expires, JSON.stringify({
    cookie: { expires: new Date(expires), originalMaxAge: 600_000 },
    adminId: userId,
    adminCsrfToken: csrf
  })]);

  const signature = createHmac("sha256", process.env.SESSION_SECRET).update(sid).digest("base64").replace(/=+$/, "");
  const cookie = `gatondo.sid=${encodeURIComponent(`s:${sid}.${signature}`)}`;
  const { app } = require("../server");
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const adminEditPath = `/admin/products/${productId}/edit`;
  const storefrontPath = `/product/${productSlug}`;

  const editBefore = await fetch(`${origin}${adminEditPath}`, { headers: { cookie } });
  assert.equal(editBefore.status, 200);
  const initialForm = await editBefore.text();
  assert.match(initialForm, /name="hasCustomization"/);
  assert.match(initialForm, /name="allowPhotoCustomization"/);
  assert.match(initialForm, /name="customKey"/);
  assert.match(initialForm, /Agregar campo/);
  const advancedPersonalization = await fetch(`${origin}/admin/products/${productId}/personalization`, { headers: { cookie } });
  assert.equal(advancedPersonalization.status, 200, "la ruta administrativa de personalización debe abrir para el producto existente");
  assert.match(await advancedPersonalization.text(), /Personalización avanzada/);

  const values = {
    _csrf: csrf,
    name: "QA producto configurable",
    slug: productSlug,
    shortDescription: "Fixture de laboratorio",
    description: "Producto sintético para validar el formulario administrativo.",
    categoryId: "",
    gender: "",
    tags: "qa",
    basePrice: "1290",
    compareAtPrice: "0",
    mainImageUrl: "/images/muestras-carrito/brazaletes-4.jpeg",
    videoUrl: "",
    stock: "10",
    active: "true",
    featured: "false",
    outOfStock: "false",
    hasVariants: "false",
    hasCustomization: "true",
    allowPhotoCustomization: "true",
    customKey: ["front", "back"],
    customLabel: ["Texto de la parte delantera", "Texto de la parte trasera"],
    customPlaceholder: ["Hasta 20 caracteres", "Opcional · hasta 20 caracteres"],
    customRequired: ["false", "true", "false"],
    customMaxLength: ["20", "20"],
    customPriceDelta: ["0.00", "200.00"],
    fontName: ["Baskerville", "Courier New"],
    fontPreviewText: ["Valentina", "GATON"],
    galleryUrl: ["/images/muestras-carrito/brazaletes-7-reverso-liso.png"],
    galleryType: ["image"],
    galleryAltText: ["Reverso de la placa"]
  };
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    for (const item of Array.isArray(value) ? value : [value]) body.append(key, item);
  }
  const saved = await fetch(`${origin}${adminEditPath}`, {
    method: "POST",
    headers: { cookie, "content-type": "application/x-www-form-urlencoded" },
    body,
    redirect: "manual"
  });
  assert.equal(saved.status, 302);
  assert.equal(saved.headers.get("location"), "/admin/products");

  const configured = await Product.findById(productId).lean();
  assert.equal(configured.hasCustomization, true);
  assert.equal(configured.allowPhotoCustomization, true);
  assert.deepEqual(configured.customizationFields.map(({ key, label, required, priceDeltaMinor }) => ({ key, label, required, priceDeltaMinor })), [
    { key: "front", label: "Texto de la parte delantera", required: true, priceDeltaMinor: 0 },
    { key: "back", label: "Texto de la parte trasera", required: false, priceDeltaMinor: 20_000 }
  ]);
  assert.deepEqual(configured.fontOptions.map(({ name }) => name), ["Baskerville", "Courier New"]);
  assert.equal(configured.gallery.length, 1);

  const editAfter = await fetch(`${origin}${adminEditPath}`, { headers: { cookie } });
  assert.equal(editAfter.status, 200);
  const savedForm = await editAfter.text();
  assert.match(savedForm, /name="allowPhotoCustomization" checked/);
  assert.match(savedForm, /Texto de la parte trasera/);
  assert.match(savedForm, /value="200\.00"/);

  const storefront = await fetch(`${origin}${storefrontPath}`);
  assert.equal(storefront.status, 200);
  const storefrontHtml = await storefront.text();
  assert.match(storefrontHtml, /Texto de la parte delantera/);
  assert.match(storefrontHtml, /Texto de la parte trasera.*\+RD\$ 200\.00/);
  assert.match(storefrontHtml, /name="engravingFont_0"/);
  assert.match(storefrontHtml, /name="engravingFont_1"/);
  assert.match(storefrontHtml, /name="customizationPhoto"/);
  assert.match(storefrontHtml, /brazaletes-7-reverso-liso\.png/);

  const invalidBody = new URLSearchParams(body);
  invalidBody.set("customPriceDelta", "-2.00");
  const rejected = await fetch(`${origin}${adminEditPath}`, {
    method: "POST",
    headers: { cookie, "content-type": "application/x-www-form-urlencoded" },
    body: invalidBody,
    redirect: "manual"
  });
  assert.equal(rejected.status, 400);
  assert.match(await rejected.text(), /El costo adicional.*monto no negativo/);
  const [[unchanged]] = await pool.execute(
    "SELECT JSON_UNQUOTE(JSON_EXTRACT(payload,'$.customizationFields[1].priceDeltaMinor')) AS rear_delta FROM products WHERE id=?",
    [productId]
  );
  assert.equal(Number(unchanged.rear_delta), 20_000, "un recargo inválido no debe reemplazar la configuración guardada");
});
