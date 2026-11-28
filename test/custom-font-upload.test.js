const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const ejs = require("ejs");

const { engravingOptions, normalizeFontOptions } = require("../src/services/engraving");
const adminRoutes = require("../src/routes/admin");

test("normalizeFontOptions con includeInactive conserva tipografías desactivadas para el editor admin", () => {
  const list = [
    { name: "Black Jack", active: true },
    { name: "Lobster", active: false }
  ];
  assert.deepEqual(normalizeFontOptions(list).map((f) => f.name), ["Black Jack"]);
  assert.deepEqual(normalizeFontOptions(list, { includeInactive: true }).map((f) => f.name), ["Black Jack", "Lobster"]);
});

test("engravingOptions conserva fontFileUrl válido, asigna customFontFamily y excluye tipografías desactivadas", () => {
  const product = {
    hasCustomization: true,
    customizationFields: [{ key: "frente", label: "Frente", maxLength: 20, required: true }],
    fontOptions: [
      { name: "Mi Cursiva", previewText: "Aa", fontFileUrl: "/uploads/fonts/mi-cursiva-123.ttf", active: true },
      { name: "Oculta", previewText: "Aa", fontFileUrl: "/uploads/fonts/oculta-1.ttf", active: false },
      { name: "Fuente Inválida", previewText: "Aa", fontFileUrl: "https://evil.example/font.ttf" },
      { name: "Dancing Script", previewText: "Aa" }
    ]
  };

  const options = engravingOptions(product);
  assert.deepEqual(options.fonts.map((f) => f.name), ["Mi Cursiva", "Fuente Inválida", "Dancing Script"]);
  assert.equal(options.fonts[0].fontFileUrl, "/uploads/fonts/mi-cursiva-123.ttf");
  assert.equal(options.fonts[0].customFontFamily, "gaton-custom-font-0");
  assert.equal(options.fonts[1].fontFileUrl, "");
  assert.equal(options.fonts[1].customFontFamily, "");
  assert.equal(options.fonts[2].fontFileUrl, "");
  assert.equal(options.fonts[2].customFontFamily, "");
});

test("buildFontOptionsFromBody conserva estado active true/false por tipografía", () => {
  const fonts = adminRoutes.buildFontOptionsFromBody({
    fontName: ["Black Jack", "Lobster", "Rockwell"],
    fontPreviewText: ["Aa", "Aa", "Aa"],
    fontPreviewImageUrl: ["", "", ""],
    fontFileUrl: ["", "", ""],
    fontActive: ["false", "true", "false", "false", "true"]
  });
  assert.deepEqual(
    fonts.map(({ name, active }) => ({ name, active })),
    [
      { name: "Black Jack", active: true },
      { name: "Lobster", active: false },
      { name: "Rockwell", active: true }
    ]
  );
});

test("product-detail.ejs emite @font-face y muestra selector de tipografía visible en cada lado", () => {
  const viewPath = path.join(__dirname, "..", "views", "store", "product-detail.ejs");
  const template = fs.readFileSync(viewPath, "utf8");
  const product = {
    name: "Placa Personalizada",
    slug: "placa-personalizada",
    basePrice: 1200,
    compareAtPrice: 0,
    mainImageUrl: "/images/test.jpg",
    gallery: [],
    hasVariants: false,
    variants: [],
    hasCustomization: true,
    customizationFields: [
      { key: "frente", label: "Frente", maxLength: 20, required: true },
      { key: "reverso", label: "Reverso", maxLength: 20, required: false }
    ],
    fontOptions: [
      { name: "Mi Fuente", previewText: "Aa", fontFileUrl: "/uploads/fonts/mi-fuente-1.woff2", active: true },
      { name: "Desactivada", previewText: "Aa", active: false }
    ]
  };

  const engraving = engravingOptions(product);
  const html = ejs.render(template, {
    filename: viewPath,
    product,
    category: null,
    engraving,
    defaultImage: product.mainImageUrl,
    defaultPrice: 1200,
    defaultCompareAt: 0,
    defaultStock: 5,
    defaultVariantIndex: null,
    productUnavailable: false,
    cartAdded: false,
    stockLimited: false,
    stockUnavailable: false,
    engravingInvalid: false,
    engravingUploadInvalid: false,
    initialWhatsAppUrl: "https://wa.me/18090000000",
    reviews: [],
    reviewSubmitted: false,
    reviewInvalid: false,
    reviewError: false,
    relatedProducts: [],
    siteSettings: { brandName: "GATON DO", menuItems: [] },
    cartCount: 0,
    currentPath: "/product/placa-personalizada",
    safePublicUrl: (u) => u,
    isVariantUnavailable: () => false,
    getVariantStock: () => 5
  });

  assert.match(html, /@font-face\s*\{/);
  assert.match(html, /font-family:\s*'gaton-custom-font-0'/);
  assert.match(html, /url\('\/uploads\/fonts\/mi-fuente-1\.woff2'\)/);
  assert.match(html, /data-custom-font-family="gaton-custom-font-0"/);
  assert.doesNotMatch(html, /Desactivada/);
  assert.match(html, /data-font-group-for="engraving_0">/);
  assert.match(html, /data-font-group-for="engraving_1">/);
  assert.doesNotMatch(html, /data-font-group-for="engraving_1"\s+hidden/);
});

test("engravingOptions y product-detail.ejs soportan 1 imagen por lado o 1 imagen general con boton Añadir archivo", () => {
  const viewPath = path.join(__dirname, "..", "views", "store", "product-detail.ejs");
  const template = fs.readFileSync(viewPath, "utf8");
  const product = {
    name: "Brazalete Foto",
    slug: "brazalete-foto",
    basePrice: 1200,
    compareAtPrice: 0,
    mainImageUrl: "/images/test.jpg",
    gallery: [],
    hasVariants: false,
    variants: [],
    hasCustomization: true,
    allowPhotoCustomization: true,
    allowPhotoPerField: true,
    customizationFields: [
      { key: "frente", label: "Frente", maxLength: 20, required: true, allowPhoto: true },
      { key: "reverso", label: "Reverso", maxLength: 20, required: false, allowPhoto: false }
    ],
    fontOptions: [{ name: "Dancing Script", previewText: "Aa", active: true }]
  };

  const engraving = engravingOptions(product);
  assert.equal(engraving.photoPerField, true);
  assert.equal(engraving.fields[0].allowPhoto, true);
  assert.equal(engraving.fields[1].allowPhoto, false);

  const html = ejs.render(template, {
    filename: viewPath,
    product,
    category: null,
    engraving,
    defaultImage: product.mainImageUrl,
    defaultPrice: 1200,
    defaultCompareAt: 0,
    defaultStock: 5,
    defaultVariantIndex: null,
    productUnavailable: false,
    cartAdded: false,
    stockLimited: false,
    stockUnavailable: false,
    engravingInvalid: false,
    engravingUploadInvalid: false,
    initialWhatsAppUrl: "https://wa.me/18090000000",
    reviews: [],
    reviewSubmitted: false,
    reviewInvalid: false,
    reviewError: false,
    relatedProducts: [],
    siteSettings: { brandName: "GATON DO", menuItems: [] },
    cartCount: 0,
    currentPath: "/product/brazalete-foto",
    safePublicUrl: (u) => u,
    isVariantUnavailable: () => false,
    getVariantStock: () => 5
  });

  assert.match(html, /name="customizationPhoto_0"/);
  assert.doesNotMatch(html, /name="customizationPhoto_1"/);
  assert.doesNotMatch(html, /name="customizationPhoto"/);
  assert.match(html, /Añadir archivo/);
  assert.match(html, /No grabamos imágenes de baja calidad, en blanco y negro o pixeladas\./);
});
