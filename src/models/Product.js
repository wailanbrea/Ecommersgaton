const { createModel } = require("../db/mysql-model");
module.exports = createModel({
  table: "products",
  columns: { name: "name", slug: "slug", shortDescription: "short_description", description: "description", categoryId: "category_id", gender: "gender", basePrice: "base_price", compareAtPrice: "compare_at_price", mainImageUrl: "main_image_url", videoUrl: "video_url", stock: "stock", outOfStock: "out_of_stock", featured: "featured", active: "active" },
  types: { name: "string", slug: "string", shortDescription: "string", description: "string", categoryId: "string", gender: "string", basePrice: "decimal", compareAtPrice: "decimal", mainImageUrl: "string", videoUrl: "string", stock: "number", outOfStock: "boolean", featured: "boolean", active: "boolean" }
});