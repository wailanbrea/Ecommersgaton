const test = require("node:test");
const assert = require("node:assert/strict");
const { resolveEffectivePricing, resolveProductDisplayPricing } = require("../src/utils/pricing");

test("resolveEffectivePricing soporta precio de oferta menor al precio base", () => {
  const res = resolveEffectivePricing(1190, 1000);
  assert.deepEqual(res, { salePrice: 1000, regularPrice: 1190, hasOffer: true });
});

test("resolveEffectivePricing conserva compatibilidad con compareAt mayor al precio", () => {
  const res = resolveEffectivePricing(1000, 1190);
  assert.deepEqual(res, { salePrice: 1000, regularPrice: 1190, hasOffer: true });
});

test("resolveEffectivePricing no marca oferta cuando compareAt es 0 o igual al precio", () => {
  assert.deepEqual(resolveEffectivePricing(1190, 0), { salePrice: 1190, regularPrice: 0, hasOffer: false });
  assert.deepEqual(resolveEffectivePricing(1190, 1190), { salePrice: 1190, regularPrice: 0, hasOffer: false });
});

test("resolveProductDisplayPricing toma el menor precio efectivo de variantes disponibles", () => {
  const product = {
    basePrice: 1190,
    compareAtPrice: 0,
    hasVariants: true,
    variants: [
      { price: 1190, compareAtPrice: 1000, stock: 2, outOfStock: false },
      { price: 1190, compareAtPrice: 800, stock: 3, outOfStock: false }
    ]
  };
  assert.deepEqual(resolveProductDisplayPricing(product), { salePrice: 800, regularPrice: 1190, hasOffer: true });
});
