const { createModel } = require("../db/mysql-model");
module.exports = createModel({
  table: "admin_users",
  columns: { name: "name", email: "email", passwordHash: "password_hash", active: "active" },
  types: { name: "string", email: "string", passwordHash: "string", active: "boolean" }
});