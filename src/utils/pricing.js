function resolveEffectivePricing(rawPrice, rawCompareAt) {
  const price = Math.max(0, Number(rawPrice || 0));
  const compareAt = Math.max(0, Number(rawCompareAt || 0));

  if (compareAt > 0 && price > 0 && compareAt < price) {
    return {
      salePrice: compareAt,
      regularPrice: price,
      hasOffer: true
    };
  }

  if (compareAt > price && price > 0) {
    return {
      salePrice: price,
      regularPrice: compareAt,
      hasOffer: true
    };
  }

  return {
    salePrice: price,
    regularPrice: 0,
    hasOffer: false
  };
}

function resolveProductDisplayPricing(product) {
  if (!product || typeof product !== "object") {
    return { salePrice: 0, regularPrice: 0, hasOffer: false };
  }
  const baseCompare = Number(product.compareAtPrice || 0);
  if (product.hasVariants && Array.isArray(product.variants) && product.variants.length) {
    const activeVariants = product.variants.filter((v) => !v?.outOfStock && Number(v?.stock || 0) > 0);
    const pool = activeVariants.length ? activeVariants : product.variants;
    let best = null;
    for (const v of pool) {
      const vPrice = Number(v?.price ?? product.basePrice ?? 0);
      const vCompare = Number(v?.compareAtPrice || 0) > 0 ? Number(v.compareAtPrice) : baseCompare;
      const resolved = resolveEffectivePricing(vPrice, vCompare);
      if (!best || (resolved.salePrice > 0 && resolved.salePrice < best.salePrice)) {
        best = resolved;
      }
    }
    if (best) return best;
  }
  return resolveEffectivePricing(product.basePrice, baseCompare);
}

module.exports = {
  resolveEffectivePricing,
  resolveProductDisplayPricing
};
