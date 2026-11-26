const crypto = require("node:crypto");

function adminCsrf(req, res, next) {
  if (!req.session.adminCsrfToken) req.session.adminCsrfToken = crypto.randomBytes(32).toString("hex");
  const multipartPost = req.method === "POST" && req.is("multipart/form-data");
  if (req.method === "POST" && !multipartPost) {
    const supplied = String(req.body?._csrf || "");
    const expected = String(req.session.adminCsrfToken || "");
    if (supplied.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) {
      return res.status(403).send("La sesión del formulario expiró. Recarga la página e inténtalo de nuevo.");
    }
  }
  res.locals.adminCsrfToken = req.session.adminCsrfToken;
  next();
}

module.exports = adminCsrf;
