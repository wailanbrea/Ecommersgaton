const { createModel } = require("../db/mysql-model");
module.exports = createModel({
  table: "reviews",
  columns: { productId: "product_id", customerName: "customer_name", email: "email", province: "province", rating: "rating", comment: "comment", photoUrl: "photo_url", approved: "approved", visible: "visible" },
  types: { productId: "string", customerName: "string", email: "string", province: "string", rating: "number", comment: "string", photoUrl: "string", approved: "boolean", visible: "boolean" }
});