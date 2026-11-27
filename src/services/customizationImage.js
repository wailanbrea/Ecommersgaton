const sharp = require("sharp");

const MAX_INPUT_PIXELS = 24_000_000;
const MAX_IMAGE_DIMENSION = 12_000;
const MAX_OUTPUT_BYTES = 15 * 1024 * 1024;
const FORMAT_BY_MIME = Object.freeze({
  "image/jpeg": { format: "jpeg", extension: ".jpg" },
  "image/png": { format: "png", extension: ".png" },
  "image/webp": { format: "webp", extension: ".webp" }
});

async function normalizeCustomizationImage(buffer, declaredMime) {
  const declared = FORMAT_BY_MIME[declaredMime];
  if (!Buffer.isBuffer(buffer) || !declared) throw new Error("Formato de imagen no permitido.");

  try {
    const options = {
      failOn: "warning",
      limitInputPixels: MAX_INPUT_PIXELS,
      limitInputChannels: 4,
      sequentialRead: true
    };
    const image = sharp(buffer, options);
    const metadata = await image.metadata();
    if (metadata.format !== declared.format) throw new Error("El formato real no coincide con el MIME declarado.");
    if (!Number.isInteger(metadata.width) || !Number.isInteger(metadata.height) || metadata.width < 1 || metadata.height < 1) {
      throw new Error("La imagen no tiene dimensiones válidas.");
    }
    if (metadata.width > MAX_IMAGE_DIMENSION || metadata.height > MAX_IMAGE_DIMENSION || metadata.width * metadata.height > MAX_INPUT_PIXELS) {
      throw new Error("La imagen supera las dimensiones permitidas.");
    }
    if ((metadata.pages || 1) !== 1) throw new Error("No se permiten imágenes animadas o multipágina.");

    // Decodifica todos los píxeles y vuelve a codificar el archivo. La salida elimina
    // metadatos EXIF/XMP/ICC y datos añadidos al final del archivo de entrada.
    const { data, info } = await image.rotate().toBuffer({ resolveWithObject: true });
    if (info.format !== declared.format || data.length > MAX_OUTPUT_BYTES) {
      throw new Error("No se pudo normalizar la imagen dentro de los límites permitidos.");
    }
    return {
      buffer: data,
      mimeType: `image/${info.format}`,
      extension: declared.extension,
      width: info.width,
      height: info.height
    };
  } catch (error) {
    if (/exceeds pixel limit|exceeds input limit/i.test(error.message || "")) {
      throw new Error("La imagen supera las dimensiones permitidas.");
    }
    if (error.message === "El formato real no coincide con el MIME declarado." ||
        error.message === "La imagen no tiene dimensiones válidas." ||
        error.message === "La imagen supera las dimensiones permitidas." ||
        error.message === "No se permiten imágenes animadas o multipágina." ||
        error.message === "No se pudo normalizar la imagen dentro de los límites permitidos.") {
      throw error;
    }
    throw new Error("El archivo está dañado o no es una imagen válida.");
  }
}

module.exports = { normalizeCustomizationImage, MAX_INPUT_PIXELS, MAX_IMAGE_DIMENSION, MAX_OUTPUT_BYTES };
