const crypto = require("node:crypto");
const express = require("express");
const bcrypt = require("bcryptjs");
const { pool } = require("../config/db");
const AdminUser = require("../models/AdminUser");
const adminCsrf = require("../middlewares/adminCsrf");
const { isValidAdminPassword } = require("../utils/adminPasswordPolicy");
const {
  SUPERADMIN_ROLE_ID,
  canGrantPermissionCodes,
  getRoleRows,
  getPermissionRows,
  getRolePermissionMap,
  getUserRoleMap,
  writeAudit
} = require("../services/adminAccess");

const router = express.Router();
router.use(adminCsrf);

const id = () => crypto.randomBytes(12).toString("hex");
const cleanText = (value, max = 191) => String(value || "").trim().slice(0, max);
const asArray = (value) => (Array.isArray(value) ? value : value ? [value] : []).map(String);
const emailIsValid = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
async function validateRolePermissions(permissionIds, actorId, connection = pool) {
  const normalized = [...new Set(asArray(permissionIds))];
  if (!normalized.length) throw new Error("Selecciona por lo menos un permiso.");
  const [available] = await connection.execute(
    `SELECT id, code FROM admin_permissions WHERE id IN (${normalized.map(() => "?").join(",")})`,
    normalized
  );
  if (available.length !== normalized.length) throw new Error("La selección contiene permisos inválidos.");
  const [systemRole] = await connection.execute(
    "SELECT 1 FROM admin_user_roles WHERE user_id=? AND role_id=? LIMIT 1",
    [String(actorId), SUPERADMIN_ROLE_ID]
  );
  if (!canGrantPermissionCodes(systemRole.length > 0, available.map((permission) => permission.code))) {
    throw new Error("Solo un superadministrador puede conceder permisos de administración de usuarios, roles o acceso global.");
  }
  return normalized;
}

function safeUser(user, roles = []) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    active: Boolean(user.active),
    mustChangePassword: Boolean(user.mustChangePassword),
    roles
  };
}

function renderError(res, view, data, message, status = 400) {
  return res.status(status).render(view, { ...data, error: message });
}

async function selectedRoles(roleIds, connection = pool) {
  const normalized = [...new Set(asArray(roleIds))];
  if (!normalized.length) return [];
  const [rows] = await connection.execute(
    `SELECT id FROM admin_roles WHERE id IN (${normalized.map(() => "?").join(",")})`,
    normalized
  );
  if (rows.length !== normalized.length) throw new Error("Una selección incluye un rol que ya no existe.");
  return normalized;
}

async function applyUserRoles(connection, userId, roleIds, actorId) {
  await connection.execute("DELETE FROM admin_user_roles WHERE user_id=?", [userId]);
  for (const roleId of roleIds) {
    await connection.execute(
      "INSERT INTO admin_user_roles (user_id, role_id, assigned_by, created_at) VALUES (?, ?, ?, UTC_TIMESTAMP(3))",
      [userId, roleId, actorId]
    );
  }
}

async function ensureNotLastSuperadmin(connection, target, roleIds, remainsActive = Boolean(target.active)) {
  const currentIsSuperadmin = (await connection.execute(
    "SELECT 1 FROM admin_user_roles WHERE user_id=? AND role_id=? LIMIT 1",
    [target._id, SUPERADMIN_ROLE_ID]
  ))[0].length > 0;
  if (!currentIsSuperadmin || (roleIds.includes(SUPERADMIN_ROLE_ID) && remainsActive)) return;
  const [rows] = await connection.execute(
    "SELECT COUNT(DISTINCT u.id) AS count FROM admin_users u JOIN admin_user_roles ur ON ur.user_id=u.id WHERE u.active=1 AND ur.role_id=? AND u.id<>?",
    [SUPERADMIN_ROLE_ID, target._id]
  );
  if (Number(rows[0]?.count || 0) < 1) throw new Error("No se puede quitar o desactivar al último superadministrador activo.");
}

router.get("/users", async (req, res) => {
  const [rows, roleMap, roles] = await Promise.all([
    AdminUser.find().sort({ email: 1 }).lean(),
    getUserRoleMap(),
    getRoleRows()
  ]);
  res.render("admin/access/users", {
    users: rows.map((user) => safeUser(user, roleMap.get(String(user._id)) || [])),
    roles,
    currentAdminId: String(req.adminUser._id),
    error: null,
    message: req.query.created ? "Usuario creado. La persona deberá cambiar su contraseña al iniciar sesión."
      : req.query.passwordReset ? "La contraseña se actualizó y se revocaron las sesiones anteriores."
      : req.query.updated ? "Los cambios se guardaron." : null
  });
});

router.get("/users/new", async (_req, res) => {
  res.render("admin/access/user-new", { roles: await getRoleRows(), error: null });
});

router.post("/users/new", async (req, res) => {
  const name = cleanText(req.body.name, 120);
  const email = cleanText(req.body.email, 191).toLowerCase();
  const password = String(req.body.password || "");
  const confirmation = String(req.body.passwordConfirmation || "");
  let roleIds = [];
  const viewData = { roles: await getRoleRows(), formData: { name, email, roleIds: asArray(req.body.roleIds) } };
  if (!name || !emailIsValid(email)) return renderError(res, "admin/access/user-new", viewData, "Escribe un nombre y un correo válido.");
  if (!isValidAdminPassword(password)) return renderError(res, "admin/access/user-new", viewData, "La contraseña temporal debe tener entre 12 y 128 caracteres.");
  if (password !== confirmation) return renderError(res, "admin/access/user-new", viewData, "Las contraseñas no coinciden.");

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    roleIds = await selectedRoles(req.body.roleIds, connection);
    if (!roleIds.length) throw new Error("Asigna por lo menos un rol al nuevo usuario.");
    const [existing] = await connection.execute("SELECT id FROM admin_users WHERE email=? LIMIT 1", [email]);
    if (existing.length) throw new Error("Ya existe un usuario con ese correo.");

    const userId = id();
    const passwordHash = await bcrypt.hash(password, 12);
    const now = new Date();
    const payload = { _id: userId, name, email, passwordHash, active: true, mustChangePassword: true, roles: [] };
    await connection.execute(
      "INSERT INTO admin_users (id,name,email,password_hash,active,created_at,updated_at,payload) VALUES (?,?,?,?,1,?,?,?)",
      [userId, name, email, passwordHash, now, now, JSON.stringify(payload)]
    );
    await applyUserRoles(connection, userId, roleIds, String(req.adminUser._id));
    await writeAudit(String(req.adminUser._id), "user.created", "admin_user", userId, { email, roleIds }, connection);
    await connection.commit();
    return res.redirect("/admin/users?created=1");
  } catch (error) {
    await connection.rollback();
    return renderError(res, "admin/access/user-new", { ...viewData, roles: await getRoleRows() }, error.message || "No se pudo crear el usuario.");
  } finally { connection.release(); }
});

router.post("/users/:id/roles", async (req, res) => {
  const target = await AdminUser.findById(req.params.id);
  if (!target) return res.status(404).send("Usuario no encontrado.");
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const roleIds = await selectedRoles(req.body.roleIds, connection);
    if (!roleIds.length) throw new Error("Cada usuario activo debe conservar por lo menos un rol.");
    await ensureNotLastSuperadmin(connection, target, roleIds);
    await applyUserRoles(connection, String(target._id), roleIds, String(req.adminUser._id));
    if (String(target._id) === String(req.adminUser._id)) {
      const [own] = await connection.execute(
        "SELECT DISTINCT p.code FROM admin_user_roles ur JOIN admin_role_permissions rp ON rp.role_id=ur.role_id JOIN admin_permissions p ON p.id=rp.permission_id WHERE ur.user_id=?",
        [String(req.adminUser._id)]
      );
      const ownPermissions = new Set(own.map((row) => row.code));
      if (!ownPermissions.has("users.manage") || !ownPermissions.has("roles.manage")) throw new Error("No puedes quitarte el acceso de administración de usuarios y roles.");
    }
    await writeAudit(String(req.adminUser._id), "user.roles.updated", "admin_user", String(target._id), { roleIds }, connection);
    await connection.commit();
    return res.redirect("/admin/users?updated=1");
  } catch (error) {
    await connection.rollback();
    return res.status(400).send(error.message || "No se pudieron actualizar los roles.");
  } finally { connection.release(); }
});

router.post("/users/:id/status", async (req, res) => {
  const target = await AdminUser.findById(req.params.id);
  if (!target) return res.status(404).send("Usuario no encontrado.");
  const active = req.body.active === "1";
  if (!active && String(target._id) === String(req.adminUser._id)) return res.status(400).send("No puedes desactivar tu propia cuenta.");
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const roleIds = (await connection.execute("SELECT role_id FROM admin_user_roles WHERE user_id=?", [String(target._id)]))[0].map((row) => row.role_id);
    await ensureNotLastSuperadmin(connection, target, roleIds, active);
    target.active = active;
    target.updatedAt = new Date();
    await connection.execute("UPDATE admin_users SET active=?, updated_at=?, payload=? WHERE id=?", [
      active ? 1 : 0,
      target.updatedAt,
      JSON.stringify(target.toObject()),
      String(target._id)
    ]);
    await writeAudit(String(req.adminUser._id), active ? "user.activated" : "user.deactivated", "admin_user", String(target._id), { active }, connection);
    await connection.commit();
    return res.redirect("/admin/users?updated=1");
  } catch (error) {
    await connection.rollback();
    return res.status(400).send(error.message || "No se pudo actualizar el usuario.");
  } finally { connection.release(); }
});

router.get("/users/:id/password", async (req, res) => {
  const user = await AdminUser.findById(req.params.id);
  if (!user) return res.status(404).send("Usuario no encontrado.");
  res.render("admin/access/user-password", { user: safeUser(user), error: null });
});

router.post("/users/:id/password", async (req, res) => {
  const user = await AdminUser.findById(req.params.id);
  if (!user) return res.status(404).send("Usuario no encontrado.");
  if (String(user._id) === String(req.adminUser._id)) return res.status(400).send("Para cambiar tu propia contraseña, usa Mi contraseña.");
  const password = String(req.body.password || "");
  const confirmation = String(req.body.passwordConfirmation || "");
  if (!isValidAdminPassword(password)) return renderError(res, "admin/access/user-password", { user: safeUser(user) }, "La clave temporal debe tener entre 12 y 128 caracteres.");
  if (password !== confirmation) return renderError(res, "admin/access/user-password", { user: safeUser(user) }, "Las contraseñas no coinciden.");

  user.passwordHash = await bcrypt.hash(password, 12);
  user.mustChangePassword = true;
  await user.save();
  await pool.execute("DELETE FROM app_sessions WHERE JSON_UNQUOTE(JSON_EXTRACT(data, '$.adminId'))=?", [String(user._id)]);
  await writeAudit(String(req.adminUser._id), "user.password.reset", "admin_user", String(user._id), { email: user.email, requiresChange: true });
  return res.redirect("/admin/users?passwordReset=1");
});

router.get("/roles", async (req, res) => {
  const [roles, permissions, rolePermissionMap] = await Promise.all([getRoleRows(), getPermissionRows(), getRolePermissionMap()]);
  const [counts] = await pool.execute("SELECT role_id, COUNT(*) AS user_count FROM admin_user_roles GROUP BY role_id");
  const userCounts = new Map(counts.map((row) => [row.role_id, Number(row.user_count)]));
  res.render("admin/access/roles", {
    roles, permissions, rolePermissionMap, userCounts, error: null,
    message: req.query.created ? "Rol creado." : req.query.updated ? "Permisos guardados." : req.query.deleted ? "Rol eliminado." : null
  });
});

router.get("/roles/new", async (_req, res) => {
  res.render("admin/access/role-form", { role: null, permissions: await getPermissionRows(), selected: [], error: null });
});

router.post("/roles/new", async (req, res) => {
  const name = cleanText(req.body.name, 120);
  const description = cleanText(req.body.description, 500);
  let permissionIds = [...new Set(asArray(req.body.permissions))];
  const viewData = { role: { name, description }, permissions: await getPermissionRows(), selected: permissionIds };
  if (!name) return renderError(res, "admin/access/role-form", viewData, "El nombre del rol es obligatorio.");
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    permissionIds = await validateRolePermissions(permissionIds, req.adminUser._id, connection);
    const roleId = id();
    const slug = `${name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 55) || "rol"}-${roleId.slice(0, 6)}`;
    const now = new Date();
    await connection.execute("INSERT INTO admin_roles (id,slug,name,description,is_system,created_at,updated_at) VALUES (?,?,?,?,0,?,?)", [roleId, slug, name, description, now, now]);
    for (const permissionId of permissionIds) await connection.execute("INSERT INTO admin_role_permissions (role_id,permission_id) VALUES (?,?)", [roleId, permissionId]);
    await writeAudit(String(req.adminUser._id), "role.created", "admin_role", roleId, { slug, name, permissionIds }, connection);
    await connection.commit();
    return res.redirect("/admin/roles?created=1");
  } catch (error) {
    await connection.rollback();
    return renderError(res, "admin/access/role-form", { ...viewData, permissions: await getPermissionRows() }, error.code === "ER_DUP_ENTRY" ? "Ya existe un rol con esos datos." : (error.message || "No se pudo crear el rol."));
  } finally { connection.release(); }
});

router.get("/roles/:id/edit", async (req, res) => {
  const [rows] = await pool.execute("SELECT id, slug, name, description, is_system FROM admin_roles WHERE id=? LIMIT 1", [req.params.id]);
  if (!rows.length) return res.status(404).send("Rol no encontrado.");
  const [permissions, selectedRows] = await Promise.all([
    getPermissionRows(),
    pool.execute("SELECT permission_id FROM admin_role_permissions WHERE role_id=?", [req.params.id])
  ]);
  res.render("admin/access/role-form", { role: rows[0], permissions, selected: selectedRows[0].map((row) => row.permission_id), error: null });
});

router.post("/roles/:id/edit", async (req, res) => {
  const [found] = await pool.execute("SELECT id, slug, name, description, is_system FROM admin_roles WHERE id=? LIMIT 1", [req.params.id]);
  if (!found.length) return res.status(404).send("Rol no encontrado.");
  const role = found[0];
  let permissionIds = [...new Set(asArray(req.body.permissions))];
  const viewData = { role, permissions: await getPermissionRows(), selected: permissionIds };
  if (role.is_system) return res.status(403).send("El rol de Superadministrador está protegido.");
  const name = cleanText(req.body.name, 120);
  const description = cleanText(req.body.description, 500);
  if (!name || !permissionIds.length) return renderError(res, "admin/access/role-form", viewData, "Indica un nombre y selecciona al menos un permiso.");
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    permissionIds = await validateRolePermissions(permissionIds, req.adminUser._id, connection);
    await connection.execute("UPDATE admin_roles SET name=?, description=?, updated_at=UTC_TIMESTAMP(3) WHERE id=? AND is_system=0", [name, description, role.id]);
    await connection.execute("DELETE FROM admin_role_permissions WHERE role_id=?", [role.id]);
    for (const permissionId of permissionIds) await connection.execute("INSERT INTO admin_role_permissions (role_id,permission_id) VALUES (?,?)", [role.id, permissionId]);
    await writeAudit(String(req.adminUser._id), "role.permissions.updated", "admin_role", role.id, { name, permissionIds }, connection);
    await connection.commit();
    return res.redirect("/admin/roles?updated=1");
  } catch (error) {
    await connection.rollback();
    return renderError(res, "admin/access/role-form", { ...viewData, permissions: await getPermissionRows() }, error.message || "No se pudo actualizar el rol.");
  } finally { connection.release(); }
});

router.post("/roles/:id/delete", async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute("SELECT id, slug, name, is_system FROM admin_roles WHERE id=? FOR UPDATE", [req.params.id]);
    if (!rows.length) throw new Error("Rol no encontrado.");
    if (rows[0].is_system) throw new Error("El rol de Superadministrador está protegido.");
    const [assigned] = await connection.execute("SELECT COUNT(*) AS count FROM admin_user_roles WHERE role_id=?", [rows[0].id]);
    if (Number(assigned[0].count) > 0) throw new Error("Primero reasigna a los usuarios que usan este rol.");
    await writeAudit(String(req.adminUser._id), "role.deleted", "admin_role", rows[0].id, { slug: rows[0].slug, name: rows[0].name }, connection);
    await connection.execute("DELETE FROM admin_roles WHERE id=? AND is_system=0", [rows[0].id]);
    await connection.commit();
    return res.redirect("/admin/roles?deleted=1");
  } catch (error) {
    await connection.rollback();
    return res.status(400).send(error.message || "No se pudo eliminar el rol.");
  } finally { connection.release(); }
});

router.get("/account/password", (req, res) => {
  res.render("admin/access/account-password", { error: null, required: req.query.required === "1" || Boolean(req.adminUser.mustChangePassword) });
});

router.post("/account/password", async (req, res) => {
  const currentPassword = String(req.body.currentPassword || "");
  const password = String(req.body.password || "");
  const confirmation = String(req.body.passwordConfirmation || "");
  const required = Boolean(req.adminUser.mustChangePassword);
  if (!required && !(await bcrypt.compare(currentPassword, req.adminUser.passwordHash))) {
    return renderError(res, "admin/access/account-password", { required }, "La contraseña actual no coincide.");
  }
  if (!isValidAdminPassword(password)) return renderError(res, "admin/access/account-password", { required }, "La nueva contraseña debe tener entre 12 y 128 caracteres.");
  if (password !== confirmation) return renderError(res, "admin/access/account-password", { required }, "Las contraseñas nuevas no coinciden.");
  req.adminUser.passwordHash = await bcrypt.hash(password, 12);
  req.adminUser.mustChangePassword = false;
  await req.adminUser.save();
  const currentSessionId = req.sessionID;
  await pool.execute("DELETE FROM app_sessions WHERE JSON_UNQUOTE(JSON_EXTRACT(data, '$.adminId'))=? AND sid<>?", [String(req.adminUser._id), currentSessionId]);
  await writeAudit(String(req.adminUser._id), "account.password.changed", "admin_user", String(req.adminUser._id), { selfService: true });
  const userId = String(req.adminUser._id);
  const email = req.adminUser.email;
  return req.session.regenerate((error) => {
    if (error) return res.status(500).send("La contraseña se guardó, pero no se pudo renovar la sesión. Vuelve a iniciar sesión.");
    req.session.adminId = userId;
    req.session.adminEmail = email;
    req.session.mustChangePassword = false;
    return req.session.save((saveError) => {
      if (saveError) return res.status(500).send("La contraseña se guardó, pero no se pudo actualizar la sesión. Vuelve a iniciar sesión.");
      return res.redirect("/admin/dashboard?passwordChanged=1");
    });
  });
});

module.exports = router;
