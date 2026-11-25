const { createModel } = require("../db/mysql-model");
module.exports = createModel({
  table: "orders",
  columns: { customerName: "customer_name", phone: "phone", email: "email", notes: "notes", shippingMethod: "shipping_method", shippingDescription: "shipping_description", shippingCost: "shipping_cost", subtotal: "subtotal", total: "total", paymentMethod: "payment_method", status: "status" },
  types: { customerName: "string", phone: "string", email: "string", notes: "string", shippingMethod: "string", shippingDescription: "string", shippingCost: "decimal", subtotal: "decimal", total: "decimal", paymentMethod: "string", status: "string" }
});