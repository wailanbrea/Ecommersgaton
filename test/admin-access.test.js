const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const { permissionForRequest, canGrantPermissionCodes } = require("../src/services/adminAccess");
const { isValidAdminPassword } = require("../src/utils/adminPasswordPolicy");
const adminCsrf = require("../src/middlewares/adminCsrf");

test("el middleware asigna permisos por recurso y método", () => {
  assert.equal(permissionForRequest("GET", "/dashboard"), "dashboard.view");
  assert.equal(permissionForRequest("POST", "/products/new"), "products.create");
  assert.equal(permissionForRequest("POST", "/products/abc/edit"), "products.edit");
  assert.equal(permissionForRequest("POST", "/orders/abc/status"), "orders.edit");
  assert.equal(permissionForRequest("POST", "/sales/orders/abc/payments"), "sales.payments.record");
  assert.equal(permissionForRequest("GET", "/inventory/export.pdf"), "inventory.export");
  assert.equal(permissionForRequest("POST", "/inventory/adjust"), "inventory.adjust");
  assert.equal(permissionForRequest("POST", "/users/abc/password"), "users.manage");
  assert.equal(permissionForRequest("GET", "/account/password"), "account.password.change");
  assert.equal(permissionForRequest("POST", "/logout"), null);
  assert.equal(permissionForRequest("GET", "/unmapped"), "admin.access");
});

test("todas las rutas administrativas declaradas tienen permiso explícito por recurso/acción", () => {
  const cases = [
    ["GET", "/dashboard", "dashboard.view"],
    ["GET", "/categories", "categories.view"],
    ["GET", "/categories/new", "categories.create"],
    ["POST", "/categories/new", "categories.create"],
    ["GET", "/categories/abc/edit", "categories.edit"],
    ["POST", "/categories/abc/edit", "categories.edit"],
    ["POST", "/categories/abc/delete", "categories.delete"],
    ["GET", "/products", "products.view"],
    ["GET", "/products/new", "products.create"],
    ["POST", "/products/new", "products.create"],
    ["GET", "/products/abc/personalization", "products.personalization"],
    ["POST", "/products/abc/personalization", "products.personalization"],
    ["GET", "/products/abc/edit", "products.edit"],
    ["POST", "/products/abc/edit", "products.edit"],
    ["POST", "/products/abc/delete", "products.delete"],
    ["GET", "/orders", "orders.view"],
    ["GET", "/orders/abc", "orders.view"],
    ["POST", "/orders/abc/status", "orders.edit"],
    ["GET", "/reviews", "reviews.view"],
    ["POST", "/reviews/abc/approve", "reviews.moderate"],
    ["POST", "/reviews/abc/toggle-visible", "reviews.moderate"],
    ["POST", "/reviews/abc/delete", "reviews.delete"],
    ["GET", "/settings", "settings.view"],
    ["POST", "/settings", "settings.edit"],
    ["GET", "/inventory", "inventory.view"],
    ["GET", "/inventory/movements", "inventory.view"],
    ["GET", "/inventory/export.csv", "inventory.export"],
    ["GET", "/inventory/export.xlsx", "inventory.export"],
    ["GET", "/inventory/export.pdf", "inventory.export"],
    ["POST", "/inventory/import/preview", "inventory.import"],
    ["POST", "/inventory/import/apply", "inventory.import"],
    ["POST", "/inventory/adjust", "inventory.adjust"],
    ["GET", "/sales", "sales.view"],
    ["POST", "/sales/orders/abc/payments", "sales.payments.record"],
    ["GET", "/sales/export.csv", "sales.export"],
    ["GET", "/sales/export.xlsx", "sales.export"],
    ["GET", "/sales/export.pdf", "sales.export"],
    ["GET", "/users", "users.manage"],
    ["GET", "/users/new", "users.manage"],
    ["POST", "/users/new", "users.manage"],
    ["POST", "/users/abc/roles", "users.manage"],
    ["POST", "/users/abc/status", "users.manage"],
    ["GET", "/users/abc/password", "users.manage"],
    ["POST", "/users/abc/password", "users.manage"],
    ["GET", "/roles", "roles.manage"],
    ["GET", "/roles/new", "roles.manage"],
    ["POST", "/roles/new", "roles.manage"],
    ["GET", "/roles/abc/edit", "roles.manage"],
    ["POST", "/roles/abc/edit", "roles.manage"],
    ["POST", "/roles/abc/delete", "roles.manage"],
    ["GET", "/account/password", "account.password.change"],
    ["POST", "/account/password", "account.password.change"],
    ["POST", "/logout", null]
  ];
  const declaredRoutes = [];
  for (const file of ["admin.js", "admin-tools.js", "admin-access.js"]) {
    const source = fs.readFileSync(path.join(__dirname, "../src/routes", file), "utf8");
    for (const match of source.matchAll(/router\.(get|post)\(\s*["']([^"']+)["']/g)) {
      const routePath = match[2];
      if (routePath === "/login") continue; // these routes precede the authenticated permission middleware
      declaredRoutes.push(`${match[1].toUpperCase()} ${routePath.replace(/:[^/]+/g, "abc")}`);
    }
  }
  assert.deepEqual(
    declaredRoutes.sort(),
    cases.map(([method, routePath]) => `${method} ${routePath}`).sort(),
    "cada ruta HTTP admin debe tener un caso explícito en esta matriz"
  );
  for (const [method, path, expected] of cases) {
    assert.equal(permissionForRequest(method, path), expected, `${method} ${path}`);
  }
});

test("el guard central cubre todas las rutas y subrouters administrativos protegidos", () => {
  const source = fs.readFileSync(path.join(__dirname, "../src/routes/admin.js"), "utf8");
  const guard = source.indexOf("router.use(requireAdmin, adminCsrf, attachAdminAccess)");
  assert.notEqual(guard, -1, "el router debe declarar el guard central de sesión, CSRF y permisos");

  const routesBeforeGuard = [...source.slice(0, guard).matchAll(/router\.(get|post)\(\s*["']([^"']+)["']/g)]
    .map((match) => `${match[1]} ${match[2]}`);
  assert.deepEqual(routesBeforeGuard, ["get /login", "post /login"], "solo el login puede preceder al guard");

  for (const mount of [
    'router.use(requireAdmin, require("./admin-tools"))',
    'router.use(requireAdmin, require("./admin-access"))'
  ]) {
    const position = source.indexOf(mount);
    assert.ok(position > guard, `${mount} debe montarse después del guard central`);
  }
});

test("contraseñas administrativas exigen 12 a 128 caracteres", () => {
  assert.equal(isValidAdminPassword("12345678901"), false);
  assert.equal(isValidAdminPassword("123456789012"), true);
  assert.equal(isValidAdminPassword("a".repeat(128)), true);
  assert.equal(isValidAdminPassword("a".repeat(129)), false);
});

test("roles delegados no pueden conceder permisos administrativos elevados", () => {
  assert.equal(canGrantPermissionCodes(false, ["products.view", "inventory.view"]), true);
  assert.equal(canGrantPermissionCodes(false, ["users.manage"]), false);
  assert.equal(canGrantPermissionCodes(false, ["roles.manage"]), false);
  assert.equal(canGrantPermissionCodes(false, ["admin.access"]), false);
  assert.equal(canGrantPermissionCodes(true, ["users.manage", "roles.manage", "admin.access"]), true);
});

test("CSRF crea token y rechaza mutación sin token", () => {
  const session = {};
  let statusCode = 200;
  let sent = "";
  let proceeded = false;
  const res = {
    locals: {},
    status(code) { statusCode = code; return this; },
    send(message) { sent = message; return this; }
  };
  adminCsrf({ method: "GET", session, body: {}, is: () => false }, res, () => {});
  assert.equal(typeof res.locals.adminCsrfToken, "string");
  assert.equal(res.locals.adminCsrfToken.length, 64);
  adminCsrf({ method: "POST", session, body: {}, is: () => false }, res, () => { proceeded = true; });
  assert.equal(statusCode, 403);
  assert.match(sent, /sesión del formulario/i);
  assert.equal(proceeded, false);
  statusCode = 200;
  adminCsrf({ method: "POST", session, body: { _csrf: "b".repeat(64) }, is: () => false }, res, () => { proceeded = true; });
  assert.equal(statusCode, 403, "un token CSRF incorrecto también debe fallar");
  assert.equal(proceeded, false);
});

test("CSRF valida multipart solo después de Multer y rechaza el token ausente", () => {
  const session = { adminCsrfToken: "a".repeat(64) };
  let proceeded = false;
  let statusCode = 200;
  const res = { locals: {}, status(code) { statusCode = code; return this; }, send() { return this; } };
  adminCsrf({ method: "POST", session, body: { _csrf: session.adminCsrfToken }, is: () => false }, { locals: {} }, () => { proceeded = true; });
  assert.equal(proceeded, true);
  proceeded = false;
  const multipart = { method: "POST", session, body: {}, is: (type) => type === "multipart/form-data" };
  adminCsrf(multipart, res, () => { proceeded = true; });
  assert.equal(proceeded, true, "el guard global debe aplazar multipart hasta después del parser");
  proceeded = false;
  adminCsrf.afterMultipart(multipart, res, () => { proceeded = true; });
  assert.equal(statusCode, 403);
  assert.equal(proceeded, false);
  statusCode = 200;
  adminCsrf.afterMultipart({ ...multipart, body: { _csrf: "b".repeat(64) } }, res, () => { proceeded = true; });
  assert.equal(statusCode, 403, "Multer no debe permitir un token multipart incorrecto");
  assert.equal(proceeded, false);
  proceeded = false;
  adminCsrf.afterMultipart({ ...multipart, body: { _csrf: session.adminCsrfToken } }, res, () => { proceeded = true; });
  assert.equal(proceeded, true);
});
