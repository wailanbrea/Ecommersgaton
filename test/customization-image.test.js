const assert = require("node:assert/strict");
const sharp = require("sharp");
const { test } = require("node:test");
const { normalizeCustomizationImage, MAX_IMAGE_DIMENSION } = require("../src/services/customizationImage");

async function image(format, width = 3, height = 2) {
  return sharp({
    create: { width, height, channels: 4, background: { r: 183, g: 139, b: 66, alpha: 1 } }
  })[format]().toBuffer();
}

test("decodifica y normaliza JPG, PNG y WebP según el formato real", async () => {
  for (const [format, mime] of [["jpeg", "image/jpeg"], ["png", "image/png"], ["webp", "image/webp"]]) {
    let original = await image(format);
    if (format === "jpeg") {
      original = await sharp(original).withExif({
        IFD0: { Artist: "GATON QA" },
        IFD3: { GPSLatitudeRef: "N", GPSLatitude: "18/1 30/1 0/1" }
      }).toBuffer();
      assert.ok((await sharp(original).metadata()).exif, "la entrada de prueba debe contener EXIF");
    }
    const normalized = await normalizeCustomizationImage(original, mime);
    const metadata = await sharp(normalized.buffer).metadata();
    assert.equal(normalized.mimeType, mime);
    assert.equal(metadata.format, format);
    assert.equal(metadata.width, 3);
    assert.equal(metadata.height, 2);
    assert.equal(metadata.exif, undefined, "la versión normalizada no debe conservar EXIF");
    assert.equal(normalized.width, 3);
    assert.equal(normalized.height, 2);
  }
});

test("rechaza MIME discordante y contenido truncado que solo conserva la cabecera", async () => {
  const png = await image("png");
  await assert.rejects(() => normalizeCustomizationImage(png, "image/webp"), /formato real no coincide/i);
  await assert.rejects(() => normalizeCustomizationImage(png.subarray(0, 33), "image/png"), /dañado|válida/i);
  await assert.rejects(() => normalizeCustomizationImage(Buffer.from("texto"), "image/png"), /dañado|válida/i);
  const marker = Buffer.from("<script>contenido añadido</script>");
  const normalized = await normalizeCustomizationImage(Buffer.concat([png, marker]), "image/png");
  assert.equal(normalized.buffer.includes(marker), false, "la salida decodificada no debe conservar payload añadido al final");
});

test("rechaza imágenes con una dimensión superior al límite de producto", async () => {
  const oversized = await image("png", MAX_IMAGE_DIMENSION + 1, 1);
  await assert.rejects(() => normalizeCustomizationImage(oversized, "image/png"), /dimensiones permitidas/i);
  const oversizedPixelArea = await image("png", 4_900, 4_900);
  await assert.rejects(() => normalizeCustomizationImage(oversizedPixelArea, "image/png"), /dimensiones permitidas/i);
});
