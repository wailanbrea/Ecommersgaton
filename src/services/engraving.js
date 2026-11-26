const MOON_CHARM_FONT_PRESET = [
  { name: "Black Jack", previewText: "Aa", sampleStyle: "black-jack" },
  { name: "Dancing Script", previewText: "Aa", sampleStyle: "dancing-script" },
  { name: "Great Vibes", previewText: "Aa", sampleStyle: "great-vibes" },
  { name: "Baskerville", previewText: "Aa", sampleStyle: "baskerville" },
  { name: "Alex Brush", previewText: "Aa", sampleStyle: "alex-brush" },
  { name: "Lobster", previewText: "Aa", sampleStyle: "lobster" },
  { name: "Life Savers", previewText: "Aa", sampleStyle: "life-savers" },
  { name: "Courier New", previewText: "Aa", sampleStyle: "courier-new" },
  { name: "Impact", previewText: "Aa", sampleStyle: "impact" },
  { name: "Rockwell", previewText: "Aa", sampleStyle: "rockwell" }
];

function normalizeFontOptions(fontOptions) {
  const fonts = Array.isArray(fontOptions)
    ? fontOptions.filter((font) => typeof font?.name === "string" && font.name.trim())
    : [];
  const names = fonts.map((font) => font.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase()).sort();
  if (names.length === 3 && names.join("|") === ["clasica", "elegante", "moderna"].sort().join("|")) {
    return MOON_CHARM_FONT_PRESET.map((font) => ({ ...font }));
  }
  return fonts;
}

const FONT_SAMPLE_STYLES = new Map([
  ["black jack", "black-jack"], ["dancing script", "dancing-script"], ["great vibes", "great-vibes"],
  ["baskerville", "baskerville"], ["alex brush", "alex-brush"], ["lobster", "lobster"],
  ["life savers", "life-savers"], ["courier new", "courier-new"], ["impact", "impact"], ["rockwell", "rockwell"]
]);

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
  const fonts = (enabled ? normalizeFontOptions(product.fontOptions) : [])
    .map((font) => {
      const name = font.name.trim().toLowerCase();
      const sampleStyle = font.sampleStyle || FONT_SAMPLE_STYLES.get(name) || (name.includes("eleg") ? "script" : name.includes("modern") ? "sans" : "serif");
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

module.exports = { MOON_CHARM_FONT_PRESET, normalizeFontOptions, engravingOptions, readEngraving };
