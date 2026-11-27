const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ejs = require("ejs");

const templatePath = path.join(__dirname, "..", "views", "store", "product-detail.ejs");
const templateSrc = fs.readFileSync(templatePath, "utf8");

function renderProductDetail(product) {
  return ejs.render(templateSrc, {
    product,
    category: { name: "Brazaletes", slug: "brazaletes" },
    reviews: [],
    relatedProducts: [],
    siteSettings: { brandName: "GATON DO", whatsapp: "+18493306269" },
    headerCategories: [],
    publicCategories: [],
    cartCount: 0,
    basketLines: [],
    defaultImage: "",
    defaultPrice: 1190,
    defaultCompareAt: 0,
    defaultStock: 5,
    defaultVariantIndex: 0,
    productUnavailable: false,
    cartAdded: false,
    stockLimited: false,
    stockUnavailable: false,
    reviewSubmitted: false,
    reviewInvalid: false,
    reviewError: false,
    engravingInvalid: false,
    engravingUploadInvalid: false,
    engraving: { enabled: false, unavailable: false, fields: [], fonts: [], photo: false },
    initialWhatsAppUrl: "https://wa.me/18493306269",
    isVariantUnavailable: (v) => Boolean(v.outOfStock) || Number(v.stock || 0) <= 0,
    getVariantStock: (v) => Math.max(0, Number(v.stock || 0)),
    safePublicUrl: (u, fb = "") => u || fb,
    jsonForInlineScript: (v) => JSON.stringify(v),
    formatCurrency: (n) => `RD$ ${Number(n || 0).toFixed(2)}`
  }, { filename: templatePath });
}

test("renderiza dos selectores enlazados (Color -> Tamaño) cuando las variantes tienen segunda opción", () => {
  const html = renderProductDetail({
    name: "Brazalete Orynth",
    slug: "brazalete-orynth",
    basePrice: 1190,
    hasVariants: true,
    variants: [
      { label: "Dorado · 18 cm", optionName: "Color", optionValue: "Dorado", optionName2: "Tamaño", optionValue2: "18 cm", price: 1190, stock: 5, outOfStock: false },
      { label: "Plateado · 18 cm", optionName: "Color", optionValue: "Plateado", optionName2: "Tamaño", optionValue2: "18 cm", price: 1190, stock: 4, outOfStock: false },
      { label: "Plateado · 21 cm", optionName: "Color", optionValue: "Plateado", optionName2: "Tamaño", optionValue2: "21 cm", price: 1290, stock: 3, outOfStock: false },
      { label: "Negro · 18 cm", optionName: "Color", optionValue: "Negro", optionName2: "Tamaño", optionValue2: "18 cm", price: 1190, stock: 6, outOfStock: false },
      { label: "Negro · 21 cm", optionName: "Color", optionValue: "Negro", optionName2: "Tamaño", optionValue2: "21 cm", price: 1290, stock: 2, outOfStock: false }
    ]
  });

  assert.match(html, /data-linked-variant-group="primary"/);
  assert.match(html, /<legend>Color<\/legend>/);
  assert.match(html, /data-primary-value="Dorado"/);
  assert.match(html, /data-primary-value="Plateado"/);
  assert.match(html, /data-primary-value="Negro"/);
  assert.match(html, /data-linked-variant-group="secondary"/);
  assert.match(html, /<legend>Tamaño<\/legend>/);
  assert.match(html, /data-secondary-value="18 cm"/);
  assert.match(html, /data-secondary-value="21 cm"/);
});

test("conserva el selector simple cuando las variantes tienen un solo atributo", () => {
  const html = renderProductDetail({
    name: "Pulsera Simple",
    slug: "pulsera-simple",
    basePrice: 900,
    hasVariants: true,
    variants: [
      { label: "Dorado", optionName: "Color", optionValue: "Dorado", price: 900, stock: 3, outOfStock: false },
      { label: "Plateado", optionName: "Color", optionValue: "Plateado", price: 900, stock: 2, outOfStock: false }
    ]
  });

  assert.match(html, /id="variantOptions"/);
  assert.doesNotMatch(html, /data-linked-variant-group="primary"/);
});
