const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const ejs = require("ejs");

const { engravingOptions } = require("../src/services/engraving");

test("engravingOptions conserva fontFileUrl válido y asigna customFontFamily", () => {
  const product = {
    hasCustomization: true,
    customizationFields: [{ key: "frente", label: "Frente", maxLength: 20, required: true }],
    fontOptions: [
      { name: "Mi Cursiva", previewText: "Aa", fontFileUrl: "/uploads/fonts/mi-cursiva-123.ttf" },
      { name: "Fuente Inválida", previewText: "Aa", fontFileUrl: "https://evil.example/font.ttf" },
      { name: "Dancing Script", previewText: "Aa" }
    ]
  };

  const options = engravingOptions(product);
  assert.equal(options.fonts.length, 3);
  assert.equal(options.fonts[0].fontFileUrl, "/uploads/fonts/mi-cursiva-123.ttf");
  assert.equal(options.fonts[0].customFontFamily, "gaton-custom-font-0");
  assert.equal(options.fonts[1].fontFileUrl, "");
  assert.equal(options.fonts[1].customFontFamily, "");
  assert.equal(options.fonts[2].fontFileUrl, "");
  assert.equal(options.fonts[2].customFontFamily, "");
});

test("product-detail.ejs emite @font-face y data-custom-font-family para fuentes subidas", () => {
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
    customizationFields: [{ key: "frente", label: "Frente", maxLength: 20, required: true }],
    fontOptions: [
      { name: "Mi Fuente", previewText: "Aa", fontFileUrl: "/uploads/fonts/mi-fuente-1.woff2" }
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
});
