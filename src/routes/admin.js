const fs = require("fs");
const path = require("path");
const express = require("express");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const AdminUser = require("../models/AdminUser");
const Product = require("../models/Product");
const Category = require("../models/Category");
const Review = require("../models/Review");
const SiteSettings = require("../models/SiteSettings");
const Order = require("../models/Order");
const { requireAdmin, redirectIfLoggedIn } = require("../middlewares/auth");
const { attachAdminAccess } = require("../middlewares/adminAuthorization");
const adminCsrf = require("../middlewares/adminCsrf");
const slugify = require("../utils/slugify");
const { normalizeFontOptions } = require("../services/engraving");

const router = express.Router();

const UPLOAD_ROOT = path.join(__dirname, "../../public/uploads");
const UPLOAD_MAX_SIZE_MB = 25;
const ALLOWED_UPLOAD_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime"
]);

function ensureUploadDirs() {
  fs.mkdirSync(path.join(UPLOAD_ROOT, "images"), { recursive: true });
  fs.mkdirSync(path.join(UPLOAD_ROOT, "videos"), { recursive: true });
}

function safeFilename(originalName = "archivo") {
  const parsed = path.parse(originalName);
  const base = String(parsed.name || "archivo")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "archivo";

  return base;
}

function extensionFromMime(mimeType = "") {
  const map = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/quicktime": ".mov"
  };

  return map[mimeType] || "";
}

ensureUploadDirs();

const uploadStorage = multer.diskStorage({
  destination(req, file, cb) {
    const folder = String(file.mimetype || "").startsWith("video/") ? "videos" : "images";
    const destination = path.join(UPLOAD_ROOT, folder);
    fs.mkdirSync(destination, { recursive: true });
    cb(null, destination);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname || "") || extensionFromMime(file.mimetype);
    const name = safeFilename(file.originalname);
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${name}-${unique}${ext}`);
  }
});

const upload = multer({
  storage: uploadStorage,
  limits: {
    fileSize: UPLOAD_MAX_SIZE_MB * 1024 * 1024,
    files: 30
  },
  fileFilter(req, file, cb) {
    if (!ALLOWED_UPLOAD_TYPES.has(file.mimetype)) {
      return cb(new Error("Tipo de archivo no permitido. Usa imágenes JPG, PNG, WEBP, GIF o videos MP4/WEBM/MOV."));
    }

    return cb(null, true);
  }
});

function uploadedFilePath(file) {
  if (!file) return "";

  const folder = String(file.mimetype || "").startsWith("video/") ? "videos" : "images";
  return `/uploads/${folder}/${file.filename}`;
}

function uploadedFiles(req, fieldName) {
  return (req.files || []).filter((file) => file.fieldname === fieldName);
}

function uploadedFile(req, fieldName) {
  return uploadedFiles(req, fieldName)[0] || null;
}

function uploadedIndexedFile(req, prefix, index) {
  return uploadedFile(req, `${prefix}${index}`) || uploadedFile(req, `${prefix}[]`) || null;
}

function resolveUploadedOrBody(req, fieldName, bodyValue = "") {
  const file = uploadedFile(req, fieldName);
  return uploadedFilePath(file) || String(bodyValue || "").trim();
}


const GENDER_OPTIONS = [
  { value: "", label: "Sin género específico" },
  { value: "hombre", label: "Hombres" },
  { value: "mujer", label: "Mujeres" },
  { value: "ninos", label: "Niñ@s" },
  { value: "animales", label: "Animales" }
];

function toBoolean(value) {
  return value === "on" || value === "true" || value === true;
}

function toNumber(value, fallback = 0) {
  if (value === undefined || value === null || value === "") return fallback;

  let raw = String(value).trim();

  if (!raw) return fallback;

  raw = raw
    .replace(/RD\$/gi, "")
    .replace(/\s+/g, "")
    .replace(/,/g, "");

  const parsed = Number(raw);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function normalizeGender(value = "") {
  return String(value || "").trim().toLowerCase();
}

function normalizeComparable(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

const isGenderCategoryAdmin = require("../utils/hiddenCategory");

function productCategoryList(categories = []) {
  return categories.filter((category) => !isGenderCategoryAdmin(category));
}

function normalizeTags(csv = "") {
  return String(csv)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function ensureArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function buildVariantsFromBody(body, req = null) {
  const labels = ensureArray(body.variantLabel);
  const optionNames = ensureArray(body.variantOptionName);
  const optionValues = ensureArray(body.variantOptionValue);
  const prices = ensureArray(body.variantPrice);
  const comparePrices = ensureArray(body.variantCompareAtPrice);
  const stocks = ensureArray(body.variantStock);
  const imageUrls = ensureArray(body.variantImageUrl);
  const outOfStocks = ensureArray(body.variantOutOfStock);

  const maxLength = Math.max(
    labels.length,
    optionNames.length,
    optionValues.length,
    prices.length,
    comparePrices.length,
    stocks.length,
    imageUrls.length,
    outOfStocks.length
  );

  const variants = [];

  for (let i = 0; i < maxLength; i++) {
    const label = String(labels[i] || "").trim();
    const optionName = String(optionNames[i] || "").trim();
    const optionValue = String(optionValues[i] || "").trim();
    const uploadedVariantImage = req ? uploadedIndexedFile(req, "variantImageFile", i) : null;
    const imageUrl = uploadedFilePath(uploadedVariantImage) || String(imageUrls[i] || "").trim();
    const hasContent =
      label || optionName || optionValue || imageUrl || prices[i] || comparePrices[i] || stocks[i];

    if (!hasContent) continue;

    variants.push({
      label,
      optionName,
      optionValue,
      price: toNumber(prices[i], 0),
      compareAtPrice: toNumber(comparePrices[i], 0),
      stock: toNumber(stocks[i], 0),
      imageUrl,
      outOfStock: String(outOfStocks[i] || "") === "true"
    });
  }

  return variants;
}

function buildCustomizationFieldsFromBody(body) {
  const keys = ensureArray(body.customKey);
  const labels = ensureArray(body.customLabel);
  const placeholders = ensureArray(body.customPlaceholder);
  const requireds = ensureArray(body.customRequired);
  const maxLengths = ensureArray(body.customMaxLength);

  const maxLength = Math.max(
    keys.length,
    labels.length,
    placeholders.length,
    requireds.length,
    maxLengths.length
  );

  const fields = [];

  for (let i = 0; i < maxLength; i++) {
    const key = String(keys[i] || "").trim();
    const label = String(labels[i] || "").trim();
    const placeholder = String(placeholders[i] || "").trim();

    if (!key && !label && !placeholder) continue;

    fields.push({
      key,
      label,
      placeholder,
      required: String(requireds[i] || "") === "true",
      maxLength: toNumber(maxLengths[i], 100)
    });
  }

  return fields;
}

function buildFontOptionsFromBody(body, req = null) {
  const names = ensureArray(body.fontName);
  const previews = ensureArray(body.fontPreviewText);
  const imageUrls = ensureArray(body.fontPreviewImageUrl);

  const maxLength = Math.max(names.length, previews.length, imageUrls.length);
  const fonts = [];

  for (let i = 0; i < maxLength; i++) {
    const name = String(names[i] || "").trim();
    const previewText = String(previews[i] || "").trim();
    const uploadedFontImage = req ? uploadedIndexedFile(req, "fontPreviewImageFile", i) : null;
    const previewImageUrl = uploadedFilePath(uploadedFontImage) || String(imageUrls[i] || "").trim();

    if (!name && !previewText && !previewImageUrl) continue;

    fonts.push({
      name,
      previewText,
      previewImageUrl
    });
  }

  return fonts;
}

function buildGalleryFromBody(body, req = null) {
  const urls = ensureArray(body.galleryUrl);
  const types = ensureArray(body.galleryType);
  const alts = ensureArray(body.galleryAltText);

  const maxLength = Math.max(urls.length, types.length, alts.length);
  const gallery = [];

  for (let i = 0; i < maxLength; i++) {
    const url = String(urls[i] || "").trim();
    const type = String(types[i] || "image").trim() || "image";
    const altText = String(alts[i] || "").trim();

    if (!url) continue;

    gallery.push({
      url,
      type,
      altText
    });
  }

  if (req) {
    uploadedFiles(req, "galleryFiles").forEach((file) => {
      gallery.push({
        url: uploadedFilePath(file),
        type: String(file.mimetype || "").startsWith("video/") ? "video" : "image",
        altText: body.name ? `Galería de ${body.name}` : ""
      });
    });
  }

  return gallery;
}

function buildShippingOptionsFromBody(body) {
  const names = ensureArray(body.shippingName);
  const descriptions = ensureArray(body.shippingDescription);
  const prices = ensureArray(body.shippingPrice);
  const actives = ensureArray(body.shippingActive);

  const maxLength = Math.max(
    names.length,
    descriptions.length,
    prices.length,
    actives.length
  );

  const shippingOptions = [];

  for (let i = 0; i < maxLength; i++) {
    const name = String(names[i] || "").trim();
    const description = String(descriptions[i] || "").trim();

    if (!name && !description && !prices[i]) continue;

    shippingOptions.push({
      name,
      description,
      price: toNumber(prices[i], 0),
      active: String(actives[i] || "") === "true"
    });
  }

  return shippingOptions;
}


function buildPersonalizedVisualsFromBody(body = {}, req = null) {
  const titles = ensureArray(body.personalizedVisualTitle);
  const imageUrls = ensureArray(body.personalizedVisualImageUrl);
  const linkUrls = ensureArray(body.personalizedVisualLinkUrl);

  const maxLength = Math.max(4, titles.length, imageUrls.length, linkUrls.length);
  const visuals = [];

  for (let i = 0; i < maxLength; i++) {
    const title = String(titles[i] || "").trim();
    const linkUrl = String(linkUrls[i] || "").trim();
    const imageUrl = req
      ? resolveUploadedOrBody(req, `personalizedVisualFile${i}`, imageUrls[i] || "")
      : String(imageUrls[i] || "").trim();

    if (!title && !imageUrl && !linkUrl) continue;

    visuals.push({
      title,
      imageUrl,
      linkUrl
    });
  }

  return visuals;
}

function buildHomeStepsFromBody(body = {}) {
  const numbers = ensureArray(body.stepNumber);
  const titles = ensureArray(body.stepTitle);
  const texts = ensureArray(body.stepText);
  const maxLength = Math.max(3, numbers.length, titles.length, texts.length);
  const steps = [];

  for (let i = 0; i < maxLength; i++) {
    const fallbackNumber = String(i + 1).padStart(2, "0");
    const number = String(numbers[i] || fallbackNumber).trim();
    const title = String(titles[i] || "").trim();
    const text = String(texts[i] || "").trim();
    if (!number && !title && !text) continue;
    steps.push({ number, title, text });
  }

  return steps;
}

function settingsFormDataFromSettings(settings = {}) {
  return {
    brandName: settings?.brandName || "",
    slogan: settings?.slogan || "",
    collectionLinkText: settings?.collectionLinkText || "",
    fragranceButtonText: settings?.fragranceButtonText || "",
    fragranceButtonUrl: settings?.fragranceButtonUrl || "",
    filterLabel: settings?.filterLabel || "",
    clearLabel: settings?.clearLabel || "",
    searchHint: settings?.searchHint || "",
    heroLogoUrl: settings?.heroLogoUrl || "",
    footerLogoUrl: settings?.footerLogoUrl || "",
    topbarText: settings?.topbarText || "Envíos disponibles en RD • Joyas con intención • Personalizados con estilo",
    email: settings?.email || "",
    whatsapp: settings?.whatsapp || "",
    phone: settings?.phone || "",
    instagram: settings?.instagram || "",
    tiktok: settings?.tiktok || "",
    facebook: settings?.facebook || "",
    aboutTitle: settings?.aboutTitle || "",
    aboutSubtitle: settings?.aboutSubtitle || "",
    aboutText: settings?.aboutText || "",
    aboutImageUrl: settings?.aboutImageUrl || "",
    storyButtonText: settings?.storyButtonText || "Descubre la colección",
    storyButtonUrl: settings?.storyButtonUrl || "/shop",
    heroTitle: settings?.heroTitle || "",
    heroSubtitle: settings?.heroSubtitle || "",
    heroImageUrl: settings?.heroImageUrl || "",
    heroVideoUrl: settings?.heroVideoUrl || "",
    heroButtonText: settings?.heroButtonText || "Ver la colección",
    heroButtonUrl: settings?.heroButtonUrl || "/shop",
    heroSecondaryButtonText: settings?.heroSecondaryButtonText || "Nuestra esencia",
    heroSecondaryButtonUrl: settings?.heroSecondaryButtonUrl || "#historia",
    marqueeText: settings?.marqueeText || "Joyas con intención ✦ Hecho a mano ✦ GATON ✦ Personalizados",
    collectionsEyebrow: settings?.collectionsEyebrow || "Explora",
    collectionsTitle: settings?.collectionsTitle || "Nuestras colecciones",
    discoverTitle: settings?.discoverTitle || "Joyas que cuentan tu historia",
    discoverText: settings?.discoverText || "Piezas únicas y fragancias diseñadas para regalar, recordar y hacer cada momento inolvidable.",
    catalogEyebrow: settings?.catalogEyebrow || "Catálogo",
    catalogTitle: settings?.catalogTitle || "Joyería",
    catalogText: settings?.catalogText || "Cada pieza está pensada para acompañarte. Selecciona, agrega al carrito y finaliza tu pedido por WhatsApp.",
    fragranceEyebrow: settings?.fragranceEyebrow || "Fragancias de autor",
    fragranceTitle: settings?.fragranceTitle || "Una esencia para cada historia",
    fragranceText: settings?.fragranceText || "Aromas envolventes que complementan tu estilo. Edición limitada, embotellados con intención.",
    stepsEyebrow: settings?.stepsEyebrow || "¿Cómo pedir?",
    stepsTitle: settings?.stepsTitle || "Tu pedido en 3 pasos",
    steps: settings?.steps || [],
    testimonialsEyebrow: settings?.testimonialsEyebrow || "Clientes",
    testimonialsTitle: settings?.testimonialsTitle || "Lo que dicen de GATON",
    contactEyebrow: settings?.contactEyebrow || "Contáctanos",
    contactTitle: settings?.contactTitle || "Hablemos de tu próxima joya",
    contactText: settings?.contactText || "¿Quieres una pieza personalizada o tienes dudas sobre un producto? Escríbenos y te respondemos en breve.",
    instagramHandle: settings?.instagramHandle || "@gaton.do",
    locationText: settings?.locationText || "Santo Domingo, RD",
    shippingText: settings?.shippingText || "A todo el país DO",
    personalizedTitle: settings?.personalizedTitle || "Personaliza tus joyas, cuenta tu historia.",
    personalizedText: settings?.personalizedText || "Grabamos nombres, iniciales, fechas o palabras especiales y convertimos una pieza en un recuerdo para siempre.",
    personalizedButtonText: settings?.personalizedButtonText || "Personalizar ahora",
    personalizedButtonUrl: settings?.personalizedButtonUrl || "/shop?q=personalizado",
    personalizedVisuals: settings?.personalizedVisuals || [],
    logoUrl: settings?.logoUrl || "",
    primaryFont: settings?.primaryFont || "Times New Roman",
    secondaryFont: settings?.secondaryFont || "Open Sans",
    shippingOptions: settings?.shippingOptions || []
  };
}

function settingsFormDataFromBody(body = {}, req = null) {
  return {
    brandName: body.brandName || "",
    slogan: body.slogan || "",
    collectionLinkText: body.collectionLinkText || "",
    fragranceButtonText: body.fragranceButtonText || "",
    fragranceButtonUrl: body.fragranceButtonUrl || "",
    filterLabel: body.filterLabel || "",
    clearLabel: body.clearLabel || "",
    searchHint: body.searchHint || "",
    heroLogoUrl: body.heroLogoUrl || "",
    footerLogoUrl: body.footerLogoUrl || "",
    topbarText: body.topbarText || "",
    email: body.email || "",
    whatsapp: body.whatsapp || "",
    phone: body.phone || "",
    instagram: body.instagram || "",
    tiktok: body.tiktok || "",
    facebook: body.facebook || "",
    aboutTitle: body.aboutTitle || "",
    aboutSubtitle: body.aboutSubtitle || "",
    aboutText: body.aboutText || "",
    aboutImageUrl: req ? resolveUploadedOrBody(req, "aboutImageFile", body.aboutImageUrl) : body.aboutImageUrl || "",
    storyButtonText: body.storyButtonText || "Descubre la colección",
    storyButtonUrl: body.storyButtonUrl || "/shop",
    heroTitle: body.heroTitle || "",
    heroSubtitle: body.heroSubtitle || "",
    heroImageUrl: req ? resolveUploadedOrBody(req, "heroImageFile", body.heroImageUrl) : body.heroImageUrl || "",
    heroVideoUrl: req ? resolveUploadedOrBody(req, "heroVideoFile", body.heroVideoUrl) : body.heroVideoUrl || "",
    heroButtonText: body.heroButtonText || "Ver la colección",
    heroButtonUrl: body.heroButtonUrl || "/shop",
    heroSecondaryButtonText: body.heroSecondaryButtonText || "Nuestra esencia",
    heroSecondaryButtonUrl: body.heroSecondaryButtonUrl || "#historia",
    marqueeText: body.marqueeText || "Joyas con intención ✦ Hecho a mano ✦ GATON ✦ Personalizados",
    collectionsEyebrow: body.collectionsEyebrow || "Explora",
    collectionsTitle: body.collectionsTitle || "Nuestras colecciones",
    discoverTitle: body.discoverTitle || "Joyas que cuentan tu historia",
    discoverText: body.discoverText || "Piezas únicas y fragancias diseñadas para regalar, recordar y hacer cada momento inolvidable.",
    catalogEyebrow: body.catalogEyebrow || "Catálogo",
    catalogTitle: body.catalogTitle || "Joyería",
    catalogText: body.catalogText || "Cada pieza está pensada para acompañarte. Selecciona, agrega al carrito y finaliza tu pedido por WhatsApp.",
    fragranceEyebrow: body.fragranceEyebrow || "Fragancias de autor",
    fragranceTitle: body.fragranceTitle || "Una esencia para cada historia",
    fragranceText: body.fragranceText || "Aromas envolventes que complementan tu estilo. Edición limitada, embotellados con intención.",
    stepsEyebrow: body.stepsEyebrow || "¿Cómo pedir?",
    stepsTitle: body.stepsTitle || "Tu pedido en 3 pasos",
    steps: buildHomeStepsFromBody(body),
    testimonialsEyebrow: body.testimonialsEyebrow || "Clientes",
    testimonialsTitle: body.testimonialsTitle || "Lo que dicen de GATON",
    contactEyebrow: body.contactEyebrow || "Contáctanos",
    contactTitle: body.contactTitle || "Hablemos de tu próxima joya",
    contactText: body.contactText || "¿Quieres una pieza personalizada o tienes dudas sobre un producto? Escríbenos y te respondemos en breve.",
    instagramHandle: body.instagramHandle || "@gaton.do",
    locationText: body.locationText || "Santo Domingo, RD",
    shippingText: body.shippingText || "A todo el país DO",
    personalizedTitle: body.personalizedTitle || "Personaliza tus joyas, cuenta tu historia.",
    personalizedText: body.personalizedText || "Grabamos nombres, iniciales, fechas o palabras especiales y convertimos una pieza en un recuerdo para siempre.",
    personalizedButtonText: body.personalizedButtonText || "Personalizar ahora",
    personalizedButtonUrl: body.personalizedButtonUrl || "/shop?q=personalizado",
    personalizedVisuals: buildPersonalizedVisualsFromBody(body, req),
    logoUrl: body.logoUrl || "",
    primaryFont: body.primaryFont || "Times New Roman",
    secondaryFont: body.secondaryFont || "Open Sans",
    shippingOptions: buildShippingOptionsFromBody(body)
  };
}

function productFormDataFromBody(body = {}, req = null) {
  return {
    name: body.name || "",
    slug: body.slug || "",
    shortDescription: body.shortDescription || "",
    description: body.description || "",
    categoryId: body.categoryId || "",
    gender: normalizeGender(body.gender || ""),
    tags: body.tags || "",
    basePrice: body.basePrice || 0,
    compareAtPrice: body.compareAtPrice || 0,
    mainImageUrl: req ? resolveUploadedOrBody(req, "mainImageFile", body.mainImageUrl) : body.mainImageUrl || "",
    videoUrl: req ? resolveUploadedOrBody(req, "videoFile", body.videoUrl) : body.videoUrl || "",
    stock: body.stock || 0,
    featured: toBoolean(body.featured),
    active: body.active === undefined ? true : toBoolean(body.active),
    outOfStock: toBoolean(body.outOfStock),
    hasVariants: toBoolean(body.hasVariants),
    hasCustomization: toBoolean(body.hasCustomization),
    allowPhotoCustomization: toBoolean(body.allowPhotoCustomization),
    variants: buildVariantsFromBody(body, req),
    customizationFields: buildCustomizationFieldsFromBody(body),
    fontOptions: buildFontOptionsFromBody(body, req),
    gallery: buildGalleryFromBody(body, req)
  };
}

router.get("/login", redirectIfLoggedIn, adminCsrf, (req, res) => {
  res.render("admin/login", {
    error: null
  });
});

router.post("/login", redirectIfLoggedIn, adminCsrf, async (req, res) => {
  const { email, password } = req.body;

  const admin = await AdminUser.findOne({
    email: String(email || "").toLowerCase().trim(),
    active: true
  });

  if (!admin) {
    return res.status(401).render("admin/login", {
      error: "Credenciales incorrectas"
    });
  }

  const validPassword = await bcrypt.compare(password, admin.passwordHash);

  if (!validPassword) {
    return res.status(401).render("admin/login", {
      error: "Credenciales incorrectas"
    });
  }

  return req.session.regenerate((error) => {
    if (error) return res.status(500).render("admin/login", { error: "No se pudo iniciar la sesión. Inténtalo de nuevo." });
    req.session.adminId = admin._id.toString();
    req.session.adminEmail = admin.email;
    req.session.mustChangePassword = Boolean(admin.mustChangePassword);
    return req.session.save((saveError) => {
      if (saveError) return res.status(500).render("admin/login", { error: "No se pudo iniciar la sesión. Inténtalo de nuevo." });
      return res.redirect(admin.mustChangePassword ? "/admin/account/password?required=1" : "/admin/dashboard");
    });
  });
});

router.use(requireAdmin, attachAdminAccess, adminCsrf);

router.post("/logout", requireAdmin, (req, res) => {
  req.session.destroy(() => {
    res.redirect("/admin/login");
  });
});

router.get("/dashboard", requireAdmin, async (req, res) => {
  const [
    productCount,
    categoryCount,
    reviewCount,
    pendingReviewCount,
    adminCount,
    orderCount,
    pendingOrderCount,
    siteSettings
  ] = await Promise.all([
    Product.countDocuments(),
    Category.countDocuments(),
    Review.countDocuments(),
    Review.countDocuments({ approved: false }),
    AdminUser.countDocuments(),
    Order.countDocuments(),
    Order.countDocuments({ status: "pending" }),
    SiteSettings.findOne().lean()
  ]);

  res.render("admin/dashboard", {
    productCount,
    categoryCount,
    reviewCount,
    pendingReviewCount,
    adminCount,
    orderCount,
    pendingOrderCount,
    siteSettings
  });
});

/* =========================
   CATEGORÍAS
========================= */

router.get("/categories", requireAdmin, async (req, res) => {
  const categories = await Category.find().sort({ sortOrder: 1, name: 1 }).lean();

  res.render("admin/categories/index", {
    categories
  });
});

router.get("/categories/new", requireAdmin, async (req, res) => {
  const categories = await Category.find().sort({ sortOrder: 1, name: 1 }).lean();

  res.render("admin/categories/new", {
    categories,
    error: null,
    formData: {
      name: "",
      slug: "",
      parentId: "",
      description: "",
      imageUrl: "",
      destinationUrl: "",
      collectionFeatured: false,
      sortOrder: 0,
      active: true
    }
  });
});

router.post("/categories/new", requireAdmin, upload.any(), adminCsrf, async (req, res) => {
  try {
    const {
      name,
      slug,
      parentId,
      description,
      imageUrl,
      destinationUrl,
      sortOrder
    } = req.body;

    const finalCategoryImageUrl = resolveUploadedOrBody(req, "categoryImageFile", imageUrl);
    const finalSlug = slugify(slug || name || "");

    if (!name || !finalSlug) {
      const categories = await Category.find().sort({ sortOrder: 1, name: 1 }).lean();
      return res.status(400).render("admin/categories/new", {
        categories,
        error: "Nombre y slug son obligatorios.",
        formData: {
          name,
          slug,
          parentId,
          description,
          imageUrl: finalCategoryImageUrl,
          destinationUrl,
          collectionFeatured: toBoolean(req.body.collectionFeatured),
          sortOrder,
          active: toBoolean(req.body.active)
        }
      });
    }

    const exists = await Category.findOne({ slug: finalSlug });
    if (exists) {
      const categories = await Category.find().sort({ sortOrder: 1, name: 1 }).lean();
      return res.status(400).render("admin/categories/new", {
        categories,
        error: "Ya existe una categoría con ese slug.",
        formData: {
          name,
          slug,
          parentId,
          description,
          imageUrl: finalCategoryImageUrl,
          destinationUrl,
          collectionFeatured: toBoolean(req.body.collectionFeatured),
          sortOrder,
          active: toBoolean(req.body.active)
        }
      });
    }

    await Category.create({
      name: String(name).trim(),
      slug: finalSlug,
      parentId: parentId || null,
      description: description || "",
      imageUrl: finalCategoryImageUrl,
      destinationUrl: String(destinationUrl || "").trim(),
      collectionFeatured: toBoolean(req.body.collectionFeatured),
      sortOrder: toNumber(sortOrder, 0),
      active: toBoolean(req.body.active)
    });

    return res.redirect("/admin/categories");
  } catch (error) {
    console.error("❌ Error creando categoría:", error);
    return res.status(500).send("Error interno creando categoría");
  }
});

router.get("/categories/:id/edit", requireAdmin, async (req, res) => {
  const [category, categories] = await Promise.all([
    Category.findById(req.params.id).lean(),
    Category.find().sort({ sortOrder: 1, name: 1 }).lean()
  ]);

  if (!category) {
    return res.status(404).send("Categoría no encontrada");
  }

  res.render("admin/categories/edit", {
    categories,
    error: null,
    category
  });
});

router.post("/categories/:id/edit", requireAdmin, upload.any(), adminCsrf, async (req, res) => {
  try {
    const existingCategory = await Category.findById(req.params.id);

    if (!existingCategory) {
      return res.status(404).send("Categoría no encontrada");
    }

    const {
      name,
      slug,
      parentId,
      description,
      imageUrl,
      destinationUrl,
      sortOrder
    } = req.body;

    const finalCategoryImageUrl = resolveUploadedOrBody(req, "categoryImageFile", imageUrl);
    const finalSlug = slugify(slug || name || "");

    const duplicated = await Category.findOne({
      slug: finalSlug,
      _id: { $ne: existingCategory._id }
    });

    if (duplicated) {
      const categories = await Category.find().sort({ sortOrder: 1, name: 1 }).lean();
      return res.status(400).render("admin/categories/edit", {
        categories,
        error: "Ya existe otra categoría con ese slug.",
        category: {
          ...existingCategory.toObject(),
          name,
          slug,
          parentId,
          description,
          imageUrl: finalCategoryImageUrl,
          destinationUrl,
          collectionFeatured: toBoolean(req.body.collectionFeatured),
          sortOrder,
          active: toBoolean(req.body.active)
        }
      });
    }

    existingCategory.name = String(name || "").trim();
    existingCategory.slug = finalSlug;
    existingCategory.parentId = parentId || null;
    existingCategory.description = description || "";
    existingCategory.imageUrl = finalCategoryImageUrl;
    existingCategory.destinationUrl = String(destinationUrl || "").trim();
    existingCategory.collectionFeatured = toBoolean(req.body.collectionFeatured);
    existingCategory.sortOrder = toNumber(sortOrder, 0);
    existingCategory.active = toBoolean(req.body.active);

    await existingCategory.save();

    return res.redirect("/admin/categories");
  } catch (error) {
    console.error("❌ Error editando categoría:", error);
    return res.status(500).send("Error interno editando categoría");
  }
});

router.post("/categories/:id/delete", requireAdmin, async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    return res.redirect("/admin/categories");
  } catch (error) {
    console.error("❌ Error eliminando categoría:", error);
    return res.status(500).send("Error interno eliminando categoría");
  }
});

/* =========================
   PRODUCTOS
========================= */

router.get("/products", requireAdmin, async (req, res) => {
  const [products, categories] = await Promise.all([
    Product.find().sort({ createdAt: -1 }).lean(),
    Category.find().sort({ sortOrder: 1, name: 1 }).lean()
  ]);

  const categoryMap = Object.fromEntries(categories.map((c) => [String(c._id), c.name]));

  res.render("admin/products/index", {
    products,
    categoryMap
  });
});

router.get("/products/new", requireAdmin, async (req, res) => {
  const allCategories = await Category.find().sort({ sortOrder: 1, name: 1 }).lean();
  const categories = productCategoryList(allCategories);

  res.render("admin/products/new", {
    categories,
    genderOptions: GENDER_OPTIONS,
    error: null,
    formData: {
      name: "",
      slug: "",
      shortDescription: "",
      description: "",
      categoryId: "",
      gender: "",
      tags: "",
      basePrice: 0,
      compareAtPrice: 0,
      mainImageUrl: "",
      videoUrl: "",
      stock: 0,
      featured: false,
      active: true,
      outOfStock: false,
      hasVariants: false,
      hasCustomization: false,
      allowPhotoCustomization: false,
      variants: [],
      customizationFields: [],
      fontOptions: [],
      gallery: []
    }
  });
});

router.post("/products/new", requireAdmin, upload.any(), adminCsrf, async (req, res) => {
  try {
    const formData = productFormDataFromBody(req.body, req)
    const allCategories = await Category.find().sort({ sortOrder: 1, name: 1 }).lean();
    const categories = productCategoryList(allCategories);
    const finalSlug = slugify(formData.slug || formData.name || "");

    if (!formData.name || !finalSlug) {
      return res.status(400).render("admin/products/new", {
        categories,
        genderOptions: GENDER_OPTIONS,
        error: "Nombre y slug son obligatorios.",
        formData
      });
    }

    const exists = await Product.findOne({ slug: finalSlug });
    if (exists) {
      return res.status(400).render("admin/products/new", {
        categories,
        genderOptions: GENDER_OPTIONS,
        error: "Ya existe un producto con ese slug.",
        formData
      });
    }

    await Product.create({
      name: String(formData.name).trim(),
      slug: finalSlug,
      shortDescription: formData.shortDescription || "",
      description: formData.description || "",
      categoryId: formData.categoryId || "",
      gender: formData.gender || "",
      tags: normalizeTags(formData.tags),
      basePrice: toNumber(formData.basePrice, 0),
      compareAtPrice: toNumber(formData.compareAtPrice, 0),
      mainImageUrl: formData.mainImageUrl || "",
      videoUrl: formData.videoUrl || "",
      stock: toNumber(formData.stock, 0),
      featured: formData.featured,
      active: formData.active,
      outOfStock: formData.outOfStock,
      hasVariants: formData.hasVariants,
      hasCustomization: formData.hasCustomization,
      allowPhotoCustomization: formData.allowPhotoCustomization,
      variants: formData.variants,
      customizationFields: formData.customizationFields,
      fontOptions: formData.fontOptions,
      gallery: formData.gallery
    });

    return res.redirect("/admin/products");
  } catch (error) {
    console.error("❌ Error creando producto:", error);
    return res.status(500).send("Error interno creando producto");
  }
});

function productAdvancedConfig(product) {
  const config = product?.advancedConfig && typeof product.advancedConfig === "object"
    ? product.advancedConfig
    : {};
  return {
    ...config,
    engravingPreviewEnabled: Boolean(config.engravingPreviewEnabled),
    customizationUploadEnabled: Boolean(config.customizationUploadEnabled),
    customizationUploadRequired: Boolean(config.customizationUploadRequired),
    customizationUploadLabel: config.customizationUploadLabel || "Añadir fotografía",
    customizationUploadMaxSizeMB: Number(config.customizationUploadMaxSizeMB) || 20,
    customizationUploadHelp: config.customizationUploadHelp || "",
    choiceGroups: Array.isArray(config.choiceGroups) ? config.choiceGroups : [],
    customizationFields: Array.isArray(config.customizationFields) ? config.customizationFields : [],
    fontOptions: normalizeFontOptions(config.fontOptions),
    gallery: Array.isArray(config.gallery) ? config.gallery : []
  };
}

router.get("/products/:id/personalization", requireAdmin, async (req, res) => {
  const product = await Product.findById(req.params.id).lean();
  if (!product) return res.status(404).send("Producto no encontrado");

  return res.render("admin/products/personalization", {
    product,
    advancedConfig: productAdvancedConfig(product),
    saved: req.query.saved === "1",
    error: null
  });
});

router.post("/products/:id/personalization", requireAdmin, async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).send("Producto no encontrado");

  let advancedConfig;
  try {
    advancedConfig = JSON.parse(String(req.body.advancedConfigJson || "{}"));
    if (!advancedConfig || typeof advancedConfig !== "object" || Array.isArray(advancedConfig)) {
      throw new Error("La configuración debe ser un objeto JSON.");
    }
  } catch {
    return res.status(400).render("admin/products/personalization", {
      product,
      advancedConfig: productAdvancedConfig(product),
      saved: false,
      error: "No se pudo leer la configuración. Revisa los campos e inténtalo de nuevo."
    });
  }

  product.advancedConfig = advancedConfig;
  await product.save();
  return res.redirect(`/admin/products/${encodeURIComponent(product._id)}/personalization?saved=1`);
});

router.get("/products/:id/edit", requireAdmin, async (req, res) => {
  const [product, categories] = await Promise.all([
    Product.findById(req.params.id).lean(),
    Category.find().sort({ sortOrder: 1, name: 1 }).lean()
  ]);

  const productCategories = productCategoryList(categories);

  if (!product) {
    return res.status(404).send("Producto no encontrado");
  }

  res.render("admin/products/edit", {
    categories: productCategories,
    genderOptions: GENDER_OPTIONS,
    error: null,
    formData: {
      ...product,
      tags: Array.isArray(product.tags) ? product.tags.join(", ") : "",
      variants: product.variants || [],
      customizationFields: product.customizationFields || [],
      fontOptions: normalizeFontOptions(product.fontOptions),
      gallery: product.gallery || []
    }
  });
});

router.post("/products/:id/edit", requireAdmin, upload.any(), adminCsrf, async (req, res) => {
  try {
    const existingProduct = await Product.findById(req.params.id);
    const allCategories = await Category.find().sort({ sortOrder: 1, name: 1 }).lean();
    const categories = productCategoryList(allCategories);

    if (!existingProduct) {
      return res.status(404).send("Producto no encontrado");
    }

    const formData = productFormDataFromBody(req.body, req)
    const finalSlug = slugify(formData.slug || formData.name || "");

    const duplicated = await Product.findOne({
      slug: finalSlug,
      _id: { $ne: existingProduct._id }
    });

    if (duplicated) {
      return res.status(400).render("admin/products/edit", {
        categories,
        genderOptions: GENDER_OPTIONS,
        error: "Ya existe otro producto con ese slug.",
        formData: {
          ...formData,
          _id: existingProduct._id
        }
      });
    }

    existingProduct.name = String(formData.name || "").trim();
    existingProduct.slug = finalSlug;
    existingProduct.shortDescription = formData.shortDescription || "";
    existingProduct.description = formData.description || "";
    existingProduct.categoryId = formData.categoryId || "";
    existingProduct.gender = formData.gender || "";
    existingProduct.tags = normalizeTags(formData.tags);
    existingProduct.basePrice = toNumber(formData.basePrice, 0);
    existingProduct.compareAtPrice = toNumber(formData.compareAtPrice, 0);
    existingProduct.mainImageUrl = formData.mainImageUrl || "";
    existingProduct.videoUrl = formData.videoUrl || "";
    existingProduct.stock = toNumber(formData.stock, 0);
    existingProduct.featured = formData.featured;
    existingProduct.active = formData.active;
    existingProduct.outOfStock = formData.outOfStock;
    existingProduct.hasVariants = formData.hasVariants;
    existingProduct.hasCustomization = formData.hasCustomization;
    existingProduct.allowPhotoCustomization = formData.allowPhotoCustomization;
    existingProduct.variants = formData.variants;
    existingProduct.customizationFields = formData.customizationFields;
    existingProduct.fontOptions = formData.fontOptions;
    existingProduct.gallery = formData.gallery;

    await existingProduct.save();

    return res.redirect("/admin/products");
  } catch (error) {
    console.error("❌ Error editando producto:", error);
    return res.status(500).send("Error interno editando producto");
  }
});

router.post("/products/:id/delete", requireAdmin, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    return res.redirect("/admin/products");
  } catch (error) {
    console.error("❌ Error eliminando producto:", error);
    return res.status(500).send("Error interno eliminando producto");
  }
});

/* =========================
   PEDIDOS
========================= */

router.get("/orders", requireAdmin, async (req, res) => {
  const orders = await Order.find().sort({ createdAt: -1 }).lean();

  res.render("admin/orders/index", {
    orders
  });
});

router.get("/orders/:id", requireAdmin, async (req, res) => {
  return res.redirect("/admin/orders");
});

router.post("/orders/:id/status", requireAdmin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).send("Pedido no encontrado");
    }

    const allowedStatuses = ["pending", "confirmed", "processing", "completed", "cancelled"];
    const newStatus = String(req.body.status || "").trim();

    if (!allowedStatuses.includes(newStatus)) {
      return res.redirect(`/admin/orders`);
    }

    order.status = newStatus;
    await order.save();

    return res.redirect(`/admin/orders`);
  } catch (error) {
    console.error("❌ Error actualizando estado del pedido:", error);
    return res.status(500).send("Error interno actualizando pedido");
  }
});

/* =========================
   RESEÑAS
========================= */

router.get("/reviews", requireAdmin, async (req, res) => {
  const reviews = await Review.find().sort({ createdAt: -1 }).lean();
  const productIds = [...new Set((reviews || []).map((review) => review.productId).filter(Boolean))];
  const products = productIds.length
    ? await Product.find({ _id: { $in: productIds } }).select("name slug").lean()
    : [];
  const productMap = Object.fromEntries(products.map((product) => [String(product._id), product]));

  res.render("admin/reviews/index", {
    reviews,
    productMap
  });
});

router.post("/reviews/:id/approve", requireAdmin, async (req, res) => {
  try {
    await Review.findByIdAndUpdate(req.params.id, {
      approved: true,
      visible: true
    });

    return res.redirect("/admin/reviews");
  } catch (error) {
    console.error("❌ Error aprobando reseña:", error);
    return res.status(500).send("Error interno aprobando reseña");
  }
});

router.post("/reviews/:id/toggle-visible", requireAdmin, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).send("Reseña no encontrada");
    }

    review.visible = !review.visible;
    await review.save();

    return res.redirect("/admin/reviews");
  } catch (error) {
    console.error("❌ Error cambiando visibilidad de reseña:", error);
    return res.status(500).send("Error interno cambiando visibilidad");
  }
});

router.post("/reviews/:id/delete", requireAdmin, async (req, res) => {
  try {
    await Review.findByIdAndDelete(req.params.id);
    return res.redirect("/admin/reviews");
  } catch (error) {
    console.error("❌ Error eliminando reseña:", error);
    return res.status(500).send("Error interno eliminando reseña");
  }
});

/* =========================
   SETTINGS DEL SITIO
========================= */

router.get("/settings", requireAdmin, async (req, res) => {
  const siteSettings = await SiteSettings.findOne().lean();

  res.render("admin/settings/edit", {
    error: null,
    success: req.query.saved === "1",
    formData: settingsFormDataFromSettings(siteSettings || {})
  });
});

router.post("/settings", requireAdmin, upload.any(), adminCsrf, async (req, res) => {
  try {
    const formData = settingsFormDataFromBody(req.body, req);

    let siteSettings = await SiteSettings.findOne();

    if (!siteSettings) {
      siteSettings = new SiteSettings();
    }

    siteSettings.brandName = formData.brandName;
    siteSettings.slogan = formData.slogan;
    siteSettings.collectionLinkText = formData.collectionLinkText;
    siteSettings.fragranceButtonText = formData.fragranceButtonText;
    siteSettings.fragranceButtonUrl = formData.fragranceButtonUrl;
    siteSettings.filterLabel = formData.filterLabel;
    siteSettings.clearLabel = formData.clearLabel;
    siteSettings.searchHint = formData.searchHint;
    siteSettings.heroLogoUrl = formData.heroLogoUrl;
    siteSettings.footerLogoUrl = formData.footerLogoUrl;
    siteSettings.topbarText = formData.topbarText;
    siteSettings.email = formData.email;
    siteSettings.whatsapp = formData.whatsapp;
    siteSettings.phone = formData.phone;
    siteSettings.instagram = formData.instagram;
    siteSettings.tiktok = formData.tiktok;
    siteSettings.facebook = formData.facebook;
    siteSettings.aboutTitle = formData.aboutTitle;
    siteSettings.aboutSubtitle = formData.aboutSubtitle;
    siteSettings.aboutText = formData.aboutText;
    siteSettings.aboutImageUrl = formData.aboutImageUrl;
    siteSettings.storyButtonText = formData.storyButtonText;
    siteSettings.storyButtonUrl = formData.storyButtonUrl;
    siteSettings.heroTitle = formData.heroTitle;
    siteSettings.heroSubtitle = formData.heroSubtitle;
    siteSettings.heroImageUrl = formData.heroImageUrl;
    siteSettings.heroVideoUrl = formData.heroVideoUrl;
    siteSettings.heroButtonText = formData.heroButtonText;
    siteSettings.heroButtonUrl = formData.heroButtonUrl;
    siteSettings.heroSecondaryButtonText = formData.heroSecondaryButtonText;
    siteSettings.heroSecondaryButtonUrl = formData.heroSecondaryButtonUrl;
    siteSettings.marqueeText = formData.marqueeText;
    siteSettings.collectionsEyebrow = formData.collectionsEyebrow;
    siteSettings.collectionsTitle = formData.collectionsTitle;
    siteSettings.discoverTitle = formData.discoverTitle;
    siteSettings.discoverText = formData.discoverText;
    siteSettings.catalogEyebrow = formData.catalogEyebrow;
    siteSettings.catalogTitle = formData.catalogTitle;
    siteSettings.catalogText = formData.catalogText;
    siteSettings.fragranceEyebrow = formData.fragranceEyebrow;
    siteSettings.fragranceTitle = formData.fragranceTitle;
    siteSettings.fragranceText = formData.fragranceText;
    siteSettings.stepsEyebrow = formData.stepsEyebrow;
    siteSettings.stepsTitle = formData.stepsTitle;
    siteSettings.steps = formData.steps;
    siteSettings.testimonialsEyebrow = formData.testimonialsEyebrow;
    siteSettings.testimonialsTitle = formData.testimonialsTitle;
    siteSettings.contactEyebrow = formData.contactEyebrow;
    siteSettings.contactTitle = formData.contactTitle;
    siteSettings.contactText = formData.contactText;
    siteSettings.instagramHandle = formData.instagramHandle;
    siteSettings.locationText = formData.locationText;
    siteSettings.shippingText = formData.shippingText;
    siteSettings.personalizedTitle = formData.personalizedTitle;
    siteSettings.personalizedText = formData.personalizedText;
    siteSettings.personalizedButtonText = formData.personalizedButtonText;
    siteSettings.personalizedButtonUrl = formData.personalizedButtonUrl;
    siteSettings.personalizedVisuals = formData.personalizedVisuals;
    siteSettings.logoUrl = formData.logoUrl;
    siteSettings.primaryFont = formData.primaryFont;
    siteSettings.secondaryFont = formData.secondaryFont;
    siteSettings.shippingOptions = formData.shippingOptions;

    await siteSettings.save();

    return res.redirect("/admin/settings?saved=1");
  } catch (error) {
    console.error("❌ Error guardando settings:", error);

    return res.status(500).render("admin/settings/edit", {
      error: "No se pudo guardar la configuración.",
      success: false,
      formData: settingsFormDataFromBody(req.body, req)
    });
  }
});

router.use(requireAdmin, require("./admin-tools"));
router.use(requireAdmin, require("./admin-access"));

module.exports = router;
