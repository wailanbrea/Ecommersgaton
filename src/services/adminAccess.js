const crypto = require("node:crypto");
const { pool } = require("../config/db");

const SUPERADMIN_ROLE_ID = "000000000000000000000001";

const PERMISSIONS = [
  ["dashboard.view", "Ver dashboard", "Principal"],
  ["sales.view", "Ver ventas y analítica", "Comercio"],
  ["sales.payments.record", "Registrar pagos", "Comercio"],
  ["sales.export", "Exportar reportes de ventas", "Comercio"],
  ["products.view", "Ver productos", "Catálogo"],
  ["products.create", "Crear productos", "Catálogo"],
  ["products.edit", "Editar productos", "Catálogo"],
  ["products.delete", "Desactivar o eliminar productos", "Catálogo"],
  ["products.personalization", "Configurar personalización", "Catálogo"],
  ["inventory.view", "Ver inventario", "Comercio"],
  ["inventory.import", "Importar existencias", "Comercio"],
  ["inventory.export", "Exportar inventario", "Comercio"],
  ["inventory.adjust", "Ajustar existencias con auditoría", "Comercio"],
  ["categories.view", "Ver categorías", "Catálogo"],
  ["categories.create", "Crear categorías", "Catálogo"],
  ["categories.edit", "Editar categorías", "Catálogo"],
  ["categories.delete", "Eliminar categorías", "Catálogo"],
  ["orders.view", "Ver pedidos", "Comercio"],
  ["orders.edit", "Actualizar pedidos", "Comercio"],
  ["reviews.view", "Ver reseñas", "Clientes"],
  ["reviews.moderate", "Moderar reseñas", "Clientes"],
  ["reviews.delete", "Eliminar reseñas", "Clientes"],
  ["settings.view", "Ver configuración", "Administración"],
  ["settings.edit", "Editar configuración", "Administración"],
  ["users.manage", "Administrar usuarios", "Administración"],
  ["roles.manage", "Administrar roles y permisos", "Administración"],
  ["account.password.change", "Cambiar contraseña propia", "Cuenta"],
  ["admin.access", "Acceder a otras secciones del panel", "Administración"]
].map(([code, label, area]) => ({ code, label, area }));

const ELEVATED_PERMISSION_CODES = new Set(["users.manage", "roles.manage", "admin.access"]);

function canGrantPermissionCodes(actorIsSuperAdmin, codes = []) {
  return Boolean(actorIsSuperAdmin) || !codes.some((code) => ELEVATED_PERMISSION_CODES.has(code));
}

function permissionForRequest(method, pathname) {
  const verb = String(method || "GET").toUpperCase();
  const path = String(pathname || "").split("?")[0].replace(/\/+$/, "") || "/";
  if (path === "/logout" || path === "/account/password") return path === "/logout" ? null : "account.password.change";
  if (path.startsWith("/users")) return "users.manage";
  if (path.startsWith("/roles")) return "roles.manage";
  if (path === "/dashboard") return "dashboard.view";
  if (path.startsWith("/sales/export.")) return "sales.export";
  if (/^\/sales\/orders\/[^/]+\/payments$/.test(path)) return "sales.payments.record";
  if (path.startsWith("/sales")) return "sales.view";
  if (path.startsWith("/inventory/export.")) return "inventory.export";
  if (path.startsWith("/inventory/import/")) return "inventory.import";
  if (path === "/inventory/adjust") return "inventory.adjust";
  if (path.startsWith("/inventory")) return "inventory.view";
  if (path === "/products") return "products.view";
  if (path === "/products/new") return verb === "GET" ? "products.create" : "products.create";
  if (/^\/products\/[^/]+\/personalization$/.test(path)) return "products.personalization";
  if (/^\/products\/[^/]+\/edit$/.test(path)) return "products.edit";
  if (/^\/products\/[^/]+\/delete$/.test(path)) return "products.delete";
  if (path.startsWith("/products/")) return "products.view";
  if (path === "/categories") return "categories.view";
  if (path === "/categories/new") return "categories.create";
  if (/^\/categories\/[^/]+\/edit$/.test(path)) return "categories.edit";
  if (/^\/categories\/[^/]+\/delete$/.test(path)) return "categories.delete";
  if (path.startsWith("/categories/")) return "categories.view";
  if (/^\/orders\/[^/]+\/status$/.test(path)) return "orders.edit";
  if (path.startsWith("/orders")) return "orders.view";
  if (/^\/reviews\/[^/]+\/delete$/.test(path)) return "reviews.delete";
  if (/^\/reviews\/[^/]+\/(approve|toggle-visible)$/.test(path)) return "reviews.moderate";
  if (path.startsWith("/reviews")) return "reviews.view";
  if (path === "/settings") return verb === "POST" ? "settings.edit" : "settings.view";
  return "admin.access";
}

async function loadPermissionCodes(userId, connection = pool) {
  const [rows] = await connection.execute(
    "SELECT DISTINCT p.code FROM admin_user_roles ur JOIN admin_roles r ON r.id=ur.role_id JOIN admin_role_permissions rp ON rp.role_id=r.id JOIN admin_permissions p ON p.id=rp.permission_id WHERE ur.user_id=?",
    [String(userId)]
  );
  return new Set(rows.map((row) => row.code));
}

async function getRoleRows(connection = pool) {
  const [rows] = await connection.execute("SELECT id, slug, name, description, is_system, created_at, updated_at FROM admin_roles ORDER BY is_system DESC, name ASC");
  return rows;
}

async function getPermissionRows(connection = pool) {
  const [rows] = await connection.execute("SELECT id, code, label, area, sort_order FROM admin_permissions ORDER BY sort_order, area, label");
  return rows;
}

async function getRolePermissionMap(connection = pool) {
  const [rows] = await connection.execute("SELECT role_id, permission_id FROM admin_role_permissions");
  const result = new Map();
  for (const row of rows) {
    if (!result.has(row.role_id)) result.set(row.role_id, []);
    result.get(row.role_id).push(row.permission_id);
  }
  return result;
}

async function getUserRoleMap(connection = pool) {
  const [rows] = await connection.execute("SELECT ur.user_id, r.id, r.slug, r.name FROM admin_user_roles ur JOIN admin_roles r ON r.id=ur.role_id ORDER BY r.name");
  const result = new Map();
  for (const row of rows) {
    if (!result.has(row.user_id)) result.set(row.user_id, []);
    result.get(row.user_id).push({ id: row.id, slug: row.slug, name: row.name });
  }
  return result;
}

async function writeAudit(actorId, action, targetType, targetId, details = {}, connection = pool) {
  const safeDetails = { ...details };
  delete safeDetails.password;
  delete safeDetails.passwordHash;
  delete safeDetails.newPassword;
  await connection.execute(
    "INSERT INTO admin_audit_logs (id, actor_id, action, target_type, target_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3))",
    [crypto.randomBytes(12).toString("hex"), actorId || null, action, targetType, String(targetId || ""), JSON.stringify(safeDetails)]
  );
}

module.exports = {
  PERMISSIONS,
  canGrantPermissionCodes,
  SUPERADMIN_ROLE_ID,
  permissionForRequest,
  loadPermissionCodes,
  getRoleRows,
  getPermissionRows,
  getRolePermissionMap,
  getUserRoleMap,
  writeAudit
};
