const assert = require("node:assert/strict");
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
  assert.equal(permissionForRequest("POST", "/users/abc/password"), "users.manage");
  assert.equal(permissionForRequest("GET", "/account/password"), "account.password.change");
  assert.equal(permissionForRequest("POST", "/logout"), null);
  assert.equal(permissionForRequest("GET", "/unmapped"), "admin.access");
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
});

test("CSRF acepta token de formulario y valida después de procesar multipart", () => {
  const session = { adminCsrfToken: "a".repeat(64) };
  let proceeded = false;
  adminCsrf({ method: "POST", session, body: { _csrf: session.adminCsrfToken }, is: () => false }, { locals: {} }, () => { proceeded = true; });
  assert.equal(proceeded, true);
  proceeded = false;
  adminCsrf({ method: "POST", session, body: {}, is: (type) => type === "multipart/form-data" }, { locals: {} }, () => { proceeded = true; });
  assert.equal(proceeded, true);
});
