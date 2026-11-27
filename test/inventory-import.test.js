const assert = require("node:assert/strict");
const { test } = require("node:test");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const { inventoryTestHelpers: inventory } = require("../src/routes/admin-tools");

const productId = "0123456789abcdef01234567";
const headers = "productId,productName,sku,variantIndex,variantSignature,stock";

function csvFile(body, name = "inventory.csv") {
  return { originalname: name, buffer: Buffer.from(body, "utf8") };
}

async function pdfFile(text, name = "inventory.pdf") {
  const doc = new PDFDocument();
  const chunks = [];
  doc.on("data", (chunk) => chunks.push(chunk));
  const ended = new Promise((resolve, reject) => {
    doc.on("end", resolve);
    doc.on("error", reject);
  });
  doc.text(text);
  doc.end();
  await ended;
  return { originalname: name, buffer: Buffer.concat(chunks) };
}

async function exportedInventoryPdf(rows) {
  let buffer;
  const response = {
    type() { return this; },
    set() { return this; },
    send(value) { buffer = value; return this; }
  };
  await inventory.sendPdf(response, rows, "Exportación / formato importable");
  return { originalname: "gaton-inventario.pdf", buffer };
}

test("importa una fila CSV válida sin perder la identidad del producto", async () => {
  const rows = await inventory.parseUpload(csvFile(`${headers}\n${productId},Brazalete,BR-1,,,12`));
  assert.deepEqual(rows, [{ productId, variantIndex: null, variantSignature: "", stock: 12, rowNumber: 2 }]);
});

test("rechaza filas repetidas y fórmulas en el stock del CSV", async () => {
  const row = `${productId},Brazalete,BR-1,,,12`;
  await assert.rejects(inventory.parseUpload(csvFile(`${headers}\n${row}\n${row}`)), /duplicado/i);
  await assert.rejects(inventory.parseUpload(csvFile(`${headers}\n${productId},Brazalete,BR-1,,,=1+1`)), /stock debe ser un entero/i);
});

test("importa una fila XLSX válida y neutraliza celdas CSV con fórmula", async () => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Inventario");
  sheet.addRow(headers.split(","));
  sheet.addRow([productId, "Brazalete", "BR-1", "", "", 7]);
  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  const rows = await inventory.parseUpload({ originalname: "inventory.xlsx", buffer });
  assert.equal(rows[0].stock, 7);
  assert.equal(inventory.cleanCell("=HYPERLINK(\"https://example.test\")"), "'=HYPERLINK(\"https://example.test\")");
  assert.equal(inventory.csvEscape("+1+1"), "\"'+1+1\"");
});

test("rechaza un PDF sin filas del formato oficial importable", async () => {
  const file = await pdfFile("Reporte de inventario de otro sistema");
  await assert.rejects(inventory.parseUpload(file), /formato oficial GATÓN DO/i);
});

test("reimporta desde el PDF real que genera la exportación del inventario", async () => {
  const file = await exportedInventoryPdf([{
    productId, productName: "Brazalete", sku: "BR-1", variantIndex: 1,
    variantSignature: "Talla|M|", stock: 9
  }]);
  const rows = await inventory.parseUpload(file);
  assert.deepEqual(rows, [{ productId, variantIndex: 1, variantSignature: "Talla|M|", stock: 9, rowNumber: 2 }]);
});
