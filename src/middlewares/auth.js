function requireAdmin(req, res, next) {
  if (!req.session || !req.session.adminId) {
    return res.redirect("/admin/login");
  }
  next();
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