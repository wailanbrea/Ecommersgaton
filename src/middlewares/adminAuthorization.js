const { loadPermissionCodes, permissionForRequest } = require("../services/adminAccess");

async function attachAdminAccess(req, res, next) {
  const permissions = await loadPermissionCodes(req.adminUser._id);
  req.adminPermissions = permissions;
  res.locals.adminPermissions = [...permissions];
  res.locals.canManageUsers = permissions.has("users.manage");
  res.locals.canManageRoles = permissions.has("roles.manage");

  const required = permissionForRequest(req.method, req.path);
  if (required && !permissions.has(required)) {
    return res.status(403).render("admin/forbidden", { requiredPermission: required });
  }
  return next();
}

module.exports = { attachAdminAccess };
