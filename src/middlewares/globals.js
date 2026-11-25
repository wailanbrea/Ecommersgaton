const SiteSettings = require("../models/SiteSettings");
const Category = require("../models/Category");

const GENDER_WORDS = [
  "hombre",
  "hombres",
  "mujer",
  "mujeres",
  "nino",
  "ninos",
  "niño",
  "niños",
  "niñ@s",
  "nina",
  "ninas",
  "niña",
  "niñas",
  "animal",
  "animales"
];

function normalizeComparable(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const isGenderCategory = require("../utils/hiddenCategory");

function displayText(value = "") {
  return String(value || "")
    .replace(/cat�logo/g, "catálogo")
    .replace(/Cat�logo/g, "Catálogo")
    .replace(/CAT�LOGO/g, "CATÁLOGO")
    .replace(/colecci�n/g, "colección")
    .replace(/Colecci�n/g, "Colección")
    .replace(/COLECCI�N/g, "COLECCIÓN")
    .replace(/intenci�n/g, "intención")
    .replace(/Intenci�n/g, "Intención")
    .replace(/INTENCI�N/g, "INTENCIÓN")
    .replace(/dise�os/g, "diseños")
    .replace(/Dise�os/g, "Diseños")
    .replace(/DISE�OS/g, "DISEÑOS")
    .replace(/env�os/g, "envíos")
    .replace(/Env�os/g, "Envíos")
    .replace(/ENV�OS/g, "ENVÍOS")
    .replace(/ni�os/g, "niños")
    .replace(/Ni�os/g, "Niños")
    .replace(/NI�OS/g, "NIÑOS")
    .replace(/ni�as/g, "niñas")
    .replace(/Ni�as/g, "Niñas")
    .replace(/NI�AS/g, "NIÑAS")
    .replace(/Joyer�a/g, "Joyería")
    .replace(/joyer�a/g, "joyería")
    .replace(/fraganc�as/g, "fragancias")
    .replace(/Fraganc�as/g, "Fragancias");
}

function formatCurrency(value = 0) {
  const number = Number(value || 0);
  return `RD$ ${number.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

module.exports = async function globals(req, res, next) {
  const adminPath = String(req.originalUrl || req.path || "").split("?")[0];
  const adminPageTitle = adminPath === "/admin/dashboard" ? "Dashboard"
    : adminPath.startsWith("/admin/products") ? (adminPath.endsWith("/new") ? "Nuevo producto" : adminPath.includes("/edit") ? "Editar producto" : "Productos")
    : adminPath.startsWith("/admin/categories") ? (adminPath.endsWith("/new") ? "Nueva categoría" : adminPath.includes("/edit") ? "Editar categoría" : "Categorías")
    : adminPath.startsWith("/admin/orders") ? "Pedidos"
    : adminPath.startsWith("/admin/sales") ? "Ventas y analítica"
    : adminPath.startsWith("/admin/inventory") ? (adminPath.includes("movements") ? "Movimientos de inventario" : "Inventario")
    : adminPath.startsWith("/admin/reviews") ? "Reseñas"
    : adminPath.startsWith("/admin/settings") ? "Configuración"
    : "Panel administrativo";
  res.locals.adminCurrentPath = adminPath;
  res.locals.adminPageTitle = adminPageTitle;

  try {
    const [settings, allCategories] = await Promise.all([
      SiteSettings.findOne().lean(),
      Category.find({ active: true }).sort({ sortOrder: 1, name: 1 }).lean()
    ]);

    const cart = req.session && Array.isArray(req.session.cart) ? req.session.cart : [];
    const cartCount = cart.reduce((acc, item) => acc + Number(item.quantity || 0), 0);

    const publicCategories = allCategories.filter((category) => !isGenderCategory(category));

    const topLevelCategories = publicCategories
      .filter((category) => !category.parentId)
      .map((parent) => {
        const children = publicCategories.filter(
          (child) => String(child.parentId || "") === String(parent._id)
        );

        return {
          ...parent,
          children
        };
      });

    res.locals.siteSettings = settings || null;
    res.locals.headerCategories = topLevelCategories || [];
    res.locals.publicCategories = publicCategories || [];
    res.locals.displayText = displayText;
    res.locals.formatCurrency = formatCurrency;
    res.locals.isAdminLoggedIn = Boolean(req.session && req.session.adminId);
    res.locals.currentAdminEmail = req.session?.adminEmail || null;
    res.locals.cartCount = cartCount;
    res.locals.basketLines = cart;

    next();
  } catch (error) {
    console.error("⚠️ Error en globals middleware:", error.message);

    const cart = req.session && Array.isArray(req.session.cart) ? req.session.cart : [];
    const cartCount = cart.reduce((acc, item) => acc + Number(item.quantity || 0), 0);

    res.locals.siteSettings = null;
    res.locals.headerCategories = [];
    res.locals.publicCategories = [];
    res.locals.displayText = displayText;
    res.locals.formatCurrency = formatCurrency;
    res.locals.isAdminLoggedIn = Boolean(req.session && req.session.adminId);
    res.locals.currentAdminEmail = req.session?.adminEmail || null;
    res.locals.cartCount = cartCount;
    res.locals.basketLines = cart;

    next();
  }
};
