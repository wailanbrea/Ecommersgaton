const { createModel } = require("../db/mysql-model");
module.exports = createModel({
  table: "categories",
  columns: { name: "name", slug: "slug", parentId: "parent_id", description: "description", imageUrl: "image_url", destinationUrl: "destination_url", collectionFeatured: "collection_featured", active: "active", sortOrder: "sort_order" },
  types: { name: "string", slug: "string", parentId: "nullableString", description: "string", imageUrl: "string", destinationUrl: "string", collectionFeatured: "boolean", active: "boolean", sortOrder: "number" }
});