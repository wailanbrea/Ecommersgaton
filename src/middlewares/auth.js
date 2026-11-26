const AdminUser = require("../models/AdminUser");

async function requireAdmin(req, res, next) {
  if (!req.session || !req.session.adminId) return res.redirect("/admin/login");

  if (!req.adminUser) {
    const user = await AdminUser.findById(req.session.adminId);
    if (!user || !user.active) {
      return req.session.destroy(() => res.redirect("/admin/login"));
    }
    req.adminUser = user;
    req.session.adminEmail = user.email;
  }

  const path = String(req.path || "").split("?")[0];
  if (req.adminUser.mustChangePassword && !["/account/password", "/logout"].includes(path)) {
    return res.redirect("/admin/account/password?required=1");
  }
  return next();
}

function redirectIfLoggedIn(req, res, next) {
  if (req.session && req.session.adminId) {
    return res.redirect("/admin/dashboard");
  }
  next();
}

module.exports = {
  requireAdmin,
  redirectIfLoggedIn
};
