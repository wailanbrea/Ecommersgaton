require("dotenv").config({ path: process.env.ENV_FILE || ".env.local" });
const bcrypt = require("bcryptjs");
const { connectDB, closeDB } = require("../src/config/db");
const AdminUser = require("../src/models/AdminUser");
const Category = require("../src/models/Category");
const SiteSettings = require("../src/models/SiteSettings");
const slugify = require("../src/utils/slugify");

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Seed local bloqueado en NODE_ENV=production.");
  const required = ["ADMIN_EMAIL", "ADMIN_PASSWORD", "ADMIN_NAME"];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) throw new Error(`Configura estas variables: ${missing.join(", ")}`);
  await connectDB();
  const email = process.env.ADMIN_EMAIL.trim().toLowerCase();
  if (!await AdminUser.exists({ email })) {
    await AdminUser.create({ name: process.env.ADMIN_NAME.trim(), email, passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD, 12), roles: ["admin"], active: true });
  }
  if (!await SiteSettings.findOne()) {
    await SiteSettings.create({ brandName: process.env.SITE_BRAND_NAME || "GATON DO", slogan: process.env.SITE_SLOGAN || "Joyas con intención", whatsapp: process.env.SITE_WHATSAPP || "", instagram: process.env.SITE_INSTAGRAM || "", facebook: process.env.SITE_FACEBOOK || "", aboutTitle: "Nuestra filosofía", heroTitle: "Joyas que cuentan tu historia", shippingOptions: [] });
  }
  if ((await Category.find().lean()).length === 0) {
    const names = ["Joyería", "Fragancias", "Personalizados", "Collares", "Brazaletes"];
    await Category.insertMany(names.map((name, index) => ({ name, slug: slugify(name), parentId: null, description: name, imageUrl: "", active: true, sortOrder: index + 1 })));
  }
  console.log("Seed local idempotente listo; no se borraron ni reemplazaron productos o pedidos.");
}
main().catch((error) => { console.error("Falló el seed local:", error.message); process.exitCode = 1; }).finally(closeDB);