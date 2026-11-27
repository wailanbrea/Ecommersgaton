const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const safePublicUrl = require("../src/utils/safePublicUrl");

test("safePublicUrl permits same-origin and HTTP(S) links", () => {
  assert.equal(safePublicUrl("/shop?category=anillos"), "/shop?category=anillos");
  assert.equal(safePublicUrl("#historia"), "#historia");
  assert.equal(safePublicUrl("https://www.instagram.com/gaton.do"), "https://www.instagram.com/gaton.do");
});

test("safePublicUrl rejects executable, ambiguous, and credential-bearing URLs", () => {
  for (const value of ["javascript:alert(1)", "data:text/html,hi", "//evil.example/path", "\\\\evil.example", "https://user:pass@example.com"]) {
    assert.equal(safePublicUrl(value), "", `should reject ${value}`);
  }
  assert.equal(safePublicUrl("javascript:alert(1)", "/shop"), "/shop");
  assert.equal(safePublicUrl("https://example.com/line\nbreak"), "");
});

test("todos los href de CMS en CTA/categorías y redes usan el filtro", () => {
  const root = path.join(__dirname, "..");
  const home = fs.readFileSync(path.join(root, "views/store/home.ejs"), "utf8");
  const header = fs.readFileSync(path.join(root, "views/partials/header.ejs"), "utf8");
  const footer = fs.readFileSync(path.join(root, "views/partials/footer.ejs"), "utf8");
  for (const field of ["heroButtonUrl", "heroSecondaryButtonUrl", "fragranceButtonUrl", "storyButtonUrl", "category.destinationUrl"]) {
    assert.match(home, new RegExp(`safePublicUrl\\([^\\n]*${field.replaceAll(".", "\\.")}`));
  }
  for (const field of ["instagramUrl", "tiktokUrl", "facebookUrl", "linktreeUrl"]) {
    assert.match(footer, new RegExp(`safePublicUrl\\([^\\n]*${field}`));
  }
  assert.match(header, /safePublicUrl\(ref10PersonalizedUrl/);
});

test("los src y data-image dinámicos de catálogo usan URLs permitidas", () => {
  const root = path.join(__dirname, "..");
  const files = [
    "views/store/home.ejs", "views/store/shop.ejs", "views/store/product-detail.ejs", "views/store/cart.ejs",
    "views/partials/header.ejs", "views/partials/footer.ejs", "views/partials/basket-panel.ejs"
  ];
  for (const file of files) {
    const source = fs.readFileSync(path.join(root, file), "utf8");
    for (const match of source.matchAll(/(?:src|data-image)=\"<%=([\s\S]*?)%>/g)) {
      const expression = match[1].trim();
      assert.ok(
        expression.includes("safePublicUrl") || ["ref10Logo", "ref10MobileLogo"].includes(expression),
        `${file}: dynamic media URL must pass through the allowlist (${expression})`
      );
    }
  }
  const productDetail = fs.readFileSync(path.join(root, "views/store/product-detail.ejs"), "utf8");
  assert.match(productDetail, /safeProductImageUrl\(variant\.imageUrl\)/);
});
