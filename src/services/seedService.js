const bcrypt = require("bcryptjs");
const AdminUser = require("../models/AdminUser");
const Category = require("../models/Category");
const SiteSettings = require("../models/SiteSettings");
const slugify = require("../utils/slugify");

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL.toLowerCase().trim();
  const existing = await AdminUser.findOne({ email });

  if (!existing) {
    const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);

    await AdminUser.create({
      name: process.env.ADMIN_NAME,
      email,
      passwordHash,
      roles: ["admin"],
      active: true
    });

    console.log(`✅ Admin inicial creado: ${email}`);
  }
}

async function seedSiteSettings() {
  const existing = await SiteSettings.findOne();

  if (!existing) {
    await SiteSettings.create({
      brandName: process.env.SITE_BRAND_NAME,
      slogan: process.env.SITE_SLOGAN,
      email: process.env.SITE_EMAIL,
      whatsapp: process.env.SITE_WHATSAPP,
      instagram: process.env.SITE_INSTAGRAM,
      tiktok: process.env.SITE_TIKTOK,
      facebook: process.env.SITE_FACEBOOK,
      aboutTitle: "Sobre Nosotros",
      aboutSubtitle: "Joyas con intención.",
      aboutText:
        "En Gaton Do - Joyería & Fragancias, transformamos joyería, bisutería y accesorios en piezas únicas que van más allá de lo estético. Desde 2024, cada diseño es personalizado con propósito, pensado para reflejar esencia, identidad y emoción. Trabajamos para todo tipo de público, creando piezas que combinan elegancia, significado y funcionalidad. Porque el verdadero valor de una joya está en lo que representa.",
      heroTitle: "Joyas con intención",
      heroSubtitle:
        "Diseños personalizados con esencia, elegancia y significado.",
      shippingOptions: [
        {
          name: "Envíos al Interior",
          price: 250,
          description: "Vimenpaq, Caribe Pack, EPS, BM Cargo y Domex",
          active: true
        },
        {
          name: "Pago contra entrega D.N.",
          price: 250,
          description: "Distrito Nacional",
          active: true
        },
        {
          name: "Pago contra entrega SD Este/Oeste/Norte",
          price: 300,
          description: "Santo Domingo Este, Oeste y Norte",
          active: true
        },
        {
          name: "Otras zonas",
          price: 0,
          description: "Cotizar con servicio al cliente",
          active: true
        }
      ]
    });

    console.log("✅ SiteSettings iniciales creados");
  }
}

async function seedCategories() {
  const count = await Category.countDocuments();
  if (count > 0) return;

  const categories = [
    "Joyería",
    "Hombre",
    "Mujeres",
    "Niñ@s",
    "Animales",
    "Fragancias",
    "Feromonas femeninas",
    "Feromonas masculinas",
    "Personalizados",
    "Collares",
    "Brazaletes"
  ];

  const docs = categories.map((name, index) => ({
    name,
    slug: slugify(name),
    parentId: null,
    description: name,
    imageUrl: "",
    active: true,
    sortOrder: index + 1
  }));

  await Category.insertMany(docs);
  console.log("✅ Categorías base creadas");
}

module.exports = async function runSeed() {
  await seedAdmin();
  await seedSiteSettings();
  await seedCategories();
};