const crypto = require("node:crypto");

function ensureToken(req, res) {
  if (!req.session.adminCsrfToken) req.session.adminCsrfToken = crypto.randomBytes(32).toString("hex");
  res.locals.adminCsrfToken = req.session.adminCsrfToken;
}

function verifyToken(req, res, next) {
  const supplied = String(req.body?._csrf || "");
  const expected = String(req.session.adminCsrfToken || "");
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) {
    return res.status(403).send("La sesión del formulario expiró. Recarga la página e inténtalo de nuevo.");
  }
  return next();
}

function adminCsrf(req, res, next) {
  ensureToken(req, res);
  // El formulario multipart aún no se ha leído en el middleware global; se
  // valida obligatoriamente después de Multer mediante afterMultipart.
  if (req.method === "POST" && req.is("multipart/form-data")) return next();
  if (req.method === "POST") return verifyToken(req, res, next);
  res.locals.adminCsrfToken = req.session.adminCsrfToken;
  next();
}

adminCsrf.afterMultipart = function afterMultipart(req, res, next) {
  ensureToken(req, res);
  if (req.method === "POST" && req.is("multipart/form-data")) return verifyToken(req, res, next);
  if (req.method === "POST") return verifyToken(req, res, next);
  return next();
};

module.exports = adminCsrf;
