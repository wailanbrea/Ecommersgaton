require("dotenv").config({ path: process.env.ENV_FILE || ".env.local" });
const assert = require("node:assert/strict");
const { after, test } = require("node:test");
const { pool, connectDB, closeDB } = require("../src/config/db");
const Category = require("../src/models/Category");
const Product = require("../src/models/Product");
const SiteSettings = require("../src/models/SiteSettings");
const AdminUser = require("../src/models/AdminUser");
const { loadPermissionCodes } = require("../src/services/adminAccess");
const pkg = require("../package.json");

test("MySQL y el esquema versionado están listos", async () => {
  await connectDB();
  const [rows] = await pool.execute("SELECT version FROM schema_migrations WHERE version = ?", ["001_initial"]);
  assert.equal(rows.length, 1);
  const [rbac] = await pool.execute("SELECT version FROM schema_migrations WHERE version = ?", ["003_admin_rbac"]);
  assert.equal(rbac.length, 1);
  const [checkout] = await pool.execute("SELECT version FROM schema_migrations WHERE version = ?", ["004_checkout_idempotency"]);
  assert.equal(checkout.length, 1);
});

test("los administradores existentes reciben el rol de continuidad y acceso completo", async () => {
  const users = await AdminUser.find().lean();
  assert.ok(users.length >= 1);
  for (const user of users) {
    const permissions = await loadPermissionCodes(user._id);
    assert.ok(permissions.has("dashboard.view"));
    assert.ok(permissions.has("users.manage"));
    assert.ok(permissions.has("roles.manage"));
    assert.ok(permissions.has("account.password.change"));
  }
});

test("los datos importados mantienen categorías, productos y configuraciones", async () => {
  const categories = await Category.find().lean();
  const products = await Product.find({ active: true }).lean();
  const settings = await SiteSettings.findOne().lean();
  assert.ok(categories.length >= 1);
  assert.ok(products.length >= 1);
  assert.ok(settings);
  assert.ok(products.every((product) => Array.isArray(product.gallery) && Array.isArray(product.variants)));
});

test("el repositorio SQL traduce filtros OR, regex, IN, orden y proyección", async () => {
  const matches = await Product.find({
    active: true,
    $or: [
      { name: { $regex: "collar", $options: "i" } },
      { tags: { $in: [/collar/i] } }
    ]
  }).sort({ createdAt: -1 }).limit(10).lean();
  assert.ok(matches.some((product) => product.slug === "muestra-carrito-collares-1"));
  const selected = await Product.findOne({ slug: "muestra-carrito-collares-1" }).select("name slug").lean();
  assert.ok(selected._id);
  assert.equal(selected.name, "Collar trébol · Muestra");
  assert.equal(Object.hasOwn(selected, "description"), false);
});

test("MongoDB no es una dependencia de ejecución de la web", () => {
  assert.equal(Object.hasOwn(pkg.dependencies, "mongoose"), false);
  assert.equal(Object.hasOwn(pkg.dependencies, "connect-mongo"), false);
  assert.ok(Object.hasOwn(pkg.devDependencies, "mongoose"));
});

after(async () => { await closeDB(); });
