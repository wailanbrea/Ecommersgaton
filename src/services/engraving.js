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

function normalizeFontOptions(fontOptions, { includeInactive = false } = {}) {
  const fonts = Array.isArray(fontOptions)
    ? fontOptions.filter((font) => typeof font?.name === "string" && font.name.trim() && (includeInactive || font.active !== false))
    : [];
  const names = fonts.map((font) => font.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase()).sort();
  if (names.length === 3 && names.join("|") === ["clasica", "elegante", "moderna"].sort().join("|")) {
    return MOON_CHARM_FONT_PRESET.map((font) => ({ ...font }));
  }
  return fonts;
}

function normalizePriceDeltaMinor(value) {
  if (value === undefined || value === null || value === "") return 0;
  const amount = Number(value);
  if (!Number.isSafeInteger(amount) || amount < 0 || amount > 100_000_000) return null;
  return amount;
}

function toMinorUnits(amount) {
  const number = Number(amount);
  if (!Number.isFinite(number) || number < 0) return null;
  const minor = Math.round(number * 100);
  return Number.isSafeInteger(minor) ? minor : null;
}

function fromMinorUnits(amount) {
  return Number(amount || 0) / 100;
}

const FONT_SAMPLE_STYLES = new Map([
  ["black jack", "black-jack"], ["dancing script", "dancing-script"], ["great vibes", "great-vibes"],
  ["baskerville", "baskerville"], ["alex brush", "alex-brush"], ["lobster", "lobster"],
  ["life savers", "life-savers"], ["courier new", "courier-new"], ["impact", "impact"], ["rockwell", "rockwell"]
]);

function engravingOptions(product) {
  const enabled = Boolean(product.hasCustomization);
  const photo = enabled && Boolean(product.allowPhotoCustomization);
  const photoPerField = photo && Boolean(product.allowPhotoPerField);
  const configuredFields = enabled && Array.isArray(product.customizationFields) ? product.customizationFields : [];
  const fields = configuredFields
    .map((field, index) => ({
      ...field,
      inputName: `engraving_${index}`,
      fontInputName: configuredFields.length === 1 ? "engravingFont" : `engravingFont_${index}`,
      photoInputName: `customizationPhoto_${index}`,
      allowPhoto: photoPerField ? field?.allowPhoto !== false : false,
      label: String(field?.label || field?.key || "").trim(),
      maxLength: Math.min(500, Math.max(1, Math.trunc(Number(field?.maxLength) || 100))),
      priceDeltaMinor: normalizePriceDeltaMinor(field?.priceDeltaMinor)
    }))
    .filter((field) => field.label);
  const fonts = (enabled ? normalizeFontOptions(product.fontOptions) : [])
    .map((font, idx) => {
      const name = font.name.trim().toLowerCase();
      const sampleStyle = font.sampleStyle || FONT_SAMPLE_STYLES.get(name) || (name.includes("eleg") ? "script" : name.includes("modern") ? "sans" : "serif");
      const rawFontFile = String(font.fontFileUrl || "").trim();
      const validFontFile = /^\/uploads\/fonts\/[a-z0-9._-]+\.(?:ttf|otf|woff2|woff)$/i.test(rawFontFile) ? rawFontFile : "";
      const customFontFamily = validFontFile ? `gaton-custom-font-${idx}` : "";
      return { ...font, sampleStyle, fontFileUrl: validFontFile, customFontFamily };
    });
  return {
    photo,
    photoPerField,
    fields,
    fonts,
    unavailable: enabled && ((!fields.length && !photo) || (fields.length > 0 && !fonts.length) || fields.some((field) => field.priceDeltaMinor === null))
  };
}

function readEngraving(options, body) {
  const fields = [];
  for (const field of options.fields) {
    const raw = body[field.inputName] ?? "";
    if (typeof raw !== "string" || /[\u0000-\u001f\u007f]/.test(raw)) return null;
    const value = raw.trim();
    if ((field.required && !value) || value.length > field.maxLength) return null;
    if (value) {
      const suppliedFont = body[field.fontInputName] ?? (options.fields.length === 1 ? body.engravingFont : undefined);
      const font = options.fonts.find((choice) => choice.name === suppliedFont);
      if (!font) return null;
      fields.push({
        key: field.key || field.inputName,
        label: field.label,
        value,
        priceDeltaMinor: field.priceDeltaMinor,
        fontName: font.name
      });
    }
  }
  if (options.fields.length && !options.photo && !fields.length) return null;
  const fontName = fields.length === 1 ? fields[0].fontName : "";
  const fontSelections = fields.map((field) => ({ key: field.key, label: field.label, fontName: field.fontName }));
  const summary = fields.map((field) => `${field.label}: ${field.value}${field.priceDeltaMinor ? ` (+RD$ ${fromMinorUnits(field.priceDeltaMinor).toFixed(2)})` : ""} | ${fields.length === 1 ? "Tipografía" : `Tipografía ${field.label}`}: ${field.fontName}`);
  const surchargeMinor = fields.reduce((sum, field) => sum + (field.priceDeltaMinor || 0), 0);
  return { fields, fontName, fontSelections, summary: summary.join(" | "), surchargeMinor, surcharge: fromMinorUnits(surchargeMinor) };
}

function priceCustomizationSnapshot(options, savedFields = [], fontNameOrSelections = "") {
  if (!options || options.unavailable) return null;
  const savedByKey = new Map((Array.isArray(savedFields) ? savedFields : []).map((field) => [String(field.key || ""), field]));
  const body = {};
  for (const field of options.fields) {
    const saved = savedByKey.get(String(field.key || field.inputName));
    body[field.inputName] = typeof saved?.value === "string" ? saved.value : "";
    const selected = Array.isArray(fontNameOrSelections)
      ? fontNameOrSelections.find((choice) => String(choice.key || "") === String(field.key || field.inputName))?.fontName
      : saved?.fontName || (options.fields.length === 1 ? fontNameOrSelections : "");
    if (selected) body[field.fontInputName] = selected;
  }
  return readEngraving(options, body);
}

function quoteUnitPrice(basePrice, engraving) {
  const baseMinor = toMinorUnits(basePrice);
  if (baseMinor === null || !engraving || !Number.isSafeInteger(engraving.surchargeMinor) || engraving.surchargeMinor < 0) return null;
  const unitPriceMinor = baseMinor + engraving.surchargeMinor;
  if (!Number.isSafeInteger(unitPriceMinor)) return null;
  return {
    baseUnitPrice: fromMinorUnits(baseMinor),
    baseUnitPriceMinor: baseMinor,
    customizationSurcharge: fromMinorUnits(engraving.surchargeMinor),
    customizationSurchargeMinor: engraving.surchargeMinor,
    unitPrice: fromMinorUnits(unitPriceMinor),
    unitPriceMinor
  };
}

module.exports = {
  MOON_CHARM_FONT_PRESET,
  normalizeFontOptions,
  engravingOptions,
  readEngraving,
  priceCustomizationSnapshot,
  quoteUnitPrice,
  toMinorUnits,
  fromMinorUnits
};
