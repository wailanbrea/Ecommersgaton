require("dotenv").config({ path: process.env.ENV_FILE || ".env.local" });
const assert = require("node:assert/strict");
const { test } = require("node:test");

test("el render HTTP ignora esquemas inseguros en configuración CMS sin escribirla", {
  skip: process.env.RUN_DB_MUTATION_TESTS !== "1"
}, async (t) => {
  assert.notEqual(process.env.NODE_ENV, "production");
  assert.equal(process.env.MYSQL_HOST, "127.0.0.1");
  const { pool, closeDB } = require("../src/config/db");
  const [[database]] = await pool.query("SELECT DATABASE() AS name");
  assert.equal(database.name, "gatondo_local_mysql");
  const SiteSettings = require("../src/models/SiteSettings");
  const Category = require("../src/models/Category");
  const originalFindOne = SiteSettings.findOne;
  const originalCategoryFind = Category.find;
  const hostileCategory = {
    _id: "qa-hostile-category", name: "<svg onload=alert(9)>Personalizados", slug: "personalizados", active: true,
    collectionFeatured: true, destinationUrl: "javascript:alert(7)"
  };
  const hostileSettings = {
    brandName: "GATON QA",
    heroTitle: "<img src=x onerror=alert(8)>",
    collectionsTitle: "<svg/onload=alert(10)>",
    fragranceText: "<img src=x onerror=alert(11)>",
    steps: [{ number: "01", title: "<svg onload=alert(12)>", text: "<img src=x onerror=alert(13)>" }],
    contactText: "<img src=x onerror=alert(14)>",
    slogan: "<svg/onload=alert(15)>",
    heroButtonUrl: "javascript:alert(1)",
    heroSecondaryButtonUrl: "data:text/html,alert(1)",
    fragranceButtonUrl: "//attacker.invalid/path",
    storyButtonUrl: "https://user:pass@attacker.invalid/",
    logoUrl: "javascript:alert(2)",
    heroLogoUrl: "data:image/svg+xml,<svg/onload=alert(3)>",
    footerLogoUrl: "javascript:alert(4)",
    instagramUrl: "javascript:alert(5)",
    tiktokUrl: "data:text/html,alert(6)",
    facebookUrl: "//attacker.invalid/track",
    linktreeUrl: "https://user:pass@attacker.invalid/"
  };
  let server;
  t.after(async () => {
    SiteSettings.findOne = originalFindOne;
    Category.find = originalCategoryFind;
    if (server) await new Promise((resolve) => server.close(resolve));
    await closeDB();
  });

  SiteSettings.findOne = () => ({ lean: async () => hostileSettings });
  Category.find = () => ({ sort() { return this; }, lean: async () => [hostileCategory] });
  const { app } = require("../server");
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
  let html;
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/`);
    html = await response.text();
    assert.equal(response.status, 200);
  } finally {
    SiteSettings.findOne = originalFindOne;
    Category.find = originalCategoryFind;
  }
  assert.doesNotMatch(html, /(?:href|src)="(?:javascript:|data:|\/\/|https:\/\/user:pass@)/i);
  assert.match(html, /href="\/shop"/);
  assert.match(html, /href="#historia"/);
  assert.match(html, /src="\/images\/logo-gatondo-color\.png"/);
  assert.match(html, /src="\/images\/logo-gatondo-white\.png"/);
  assert.match(html, /href="https:\/\/www\.instagram\.com\/gaton\.do"/);
  assert.match(html, /href="\/shop\?q=personalizado"/);
  assert.match(html, /href="\/shop\?category=personalizados"/);
  assert.doesNotMatch(html, /<img src=x onerror=alert\(8\)>/i);
  assert.match(html, /&lt;img src=x onerror=alert\(8\)&gt;/i, "el contenido CMS debe salir como texto HTML escapado");
  for (const payload of [
    "<svg\/onload=alert(10)>", "<img src=x onerror=alert(11)>", "<svg onload=alert(12)>",
    "<img src=x onerror=alert(13)>", "<img src=x onerror=alert(14)>", "<svg\/onload=alert(15)>",
    "<svg onload=alert(9)>Personalizados"
  ]) {
    assert.ok(!html.includes(payload), `el valor CMS no debe insertarse como HTML: ${payload}`);
    assert.ok(html.includes(payload.replace(/</g, "&lt;").replace(/>/g, "&gt;")), `el valor debe escaparse en salida: ${payload}`);
  }
});
