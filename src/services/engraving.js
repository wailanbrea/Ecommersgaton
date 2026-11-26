function engravingOptions(product) {
  const enabled = Boolean(product.hasCustomization);
  const photo = enabled && Boolean(product.allowPhotoCustomization);
  const fields = (enabled && Array.isArray(product.customizationFields) ? product.customizationFields : [])
    .map((field, index) => ({
      ...field,
      inputName: `engraving_${index}`,
      label: String(field?.label || field?.key || "").trim(),
      maxLength: Math.min(500, Math.max(1, Math.trunc(Number(field?.maxLength) || 100)))
    }))
    .filter((field) => field.label);
  const fonts = (enabled && Array.isArray(product.fontOptions) ? product.fontOptions : [])
    .filter((font) => typeof font?.name === "string" && font.name.trim())
    .map((font) => {
      const name = font.name.toLowerCase();
      const sampleStyle = name.includes("eleg") ? "script" : name.includes("modern") ? "sans" : "serif";
      return { ...font, sampleStyle };
    });
  return {
    photo,
    fields,
    fonts,
    unavailable: enabled && ((!fields.length && !photo) || (fields.length > 0 && !fonts.length))
  };
}

function readEngraving(options, body) {
  const fields = [];
  for (const field of options.fields) {
    const raw = body[field.inputName] ?? "";
    if (typeof raw !== "string" || /[\u0000-\u001f\u007f]/.test(raw)) return null;
    const value = raw.trim();
    if ((field.required && !value) || value.length > field.maxLength) return null;
    if (value) fields.push({ key: field.key || field.inputName, label: field.label, value });
  }
  const suppliedFont = body.engravingFont;
  const font = options.fonts.find((choice) => choice.name === suppliedFont);
  if (options.fields.length && !options.photo && !fields.length) return null;
  if ((fields.length || (options.fields.length && suppliedFont !== undefined)) && !font) return null;
  const fontName = fields.length ? font.name : "";
  const summary = fields.map((field) => `${field.label}: ${field.value}`);
  if (fontName) summary.push(`Tipografía: ${fontName}`);
  return { fields, fontName, summary: summary.join(" | ") };
}

module.exports = { engravingOptions, readEngraving };
