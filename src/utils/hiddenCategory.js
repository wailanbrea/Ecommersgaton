const excluded = new Set(["hombre","hombres","mujer","mujeres","nins","nin@s","ninos","ninas","animal","animales","feromonas femeninas","feromonas masculinas"]);
module.exports = category => [category.name, category.slug].some(value =>
  excluded.has(String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/-/g, " ").trim())
);
