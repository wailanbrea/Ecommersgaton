const crypto = require("node:crypto");
const express = require("express");
const multer = require("multer");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const pdfParse = require("pdf-parse");
const { pool } = require("../config/db");
const Order = require("../models/Order");
const Product = require("../models/Product");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1 } });
const PDF_MARKER = "GATON-INV-V1";
const pad2 = (n) => String(n).padStart(2, "0");
const dayString = (date) => `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
const id = () => crypto.randomBytes(12).toString("hex");
const toCents = (value) => Math.round(Number(value || 0) * 100);
function csrf(req, res, next) {
  if (!req.session.csrfToken) req.session.csrfToken = crypto.randomBytes(32).toString("hex");
  if (req.method === "POST") {
    const supplied = String(req.body?._csrf || "");
    const expected = String(req.session.csrfToken || "");
    if (supplied.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) return res.status(403).send("La sesión del formulario expiró. Recarga la página e inténtalo de nuevo.");
  }
  res.locals.adminCsrfToken = req.session.csrfToken;
  next();
}
router.use((req, res, next) => req.method === "POST" ? next() : csrf(req, res, next));
const cleanCell = (value) => {
  const text = String(value ?? "");
  return /^[=+@\-\t\r]/.test(text) ? `'${text}` : text;
};
function signature(variant) {
  return [variant?.optionName || "", variant?.optionValue || "", variant?.label || ""].map((part) => String(part).trim()).join("|");
}
function inventoryRows(products) {
  const rows = [];
  for (const p of products) {
    const variants = Array.isArray(p.variants) ? p.variants : [];
    if (variants.length) variants.forEach((v, index) => rows.push({ productId: p._id, productName: p.name, sku: v.sku || p.sku || "", variantIndex: index, variantSignature: signature(v), stock: Math.max(0, Number(v.stock || 0)) }));
    else rows.push({ productId: p._id, productName: p.name, sku: p.sku || "", variantIndex: "", variantSignature: "", stock: Math.max(0, Number(p.stock || 0)) });
  }
  return rows;
}
function parseCsv(text) {
  const lines = String(text).replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) throw new Error("El CSV está vacío.");
  const parseLine = (line) => { const out = []; let current = "", quoted = false; for (let i = 0; i < line.length; i++) { const c = line[i]; if (c === '"' && line[i + 1] === '"' && quoted) { current += '"'; i++; } else if (c === '"') quoted = !quoted; else if (c === "," && !quoted) { out.push(current); current = ""; } else current += c; } out.push(current); if (quoted) throw new Error("El CSV contiene comillas sin cerrar."); return out; };
  const headers = parseLine(lines[0]).map((v) => v.trim());
  const required = ["productId", "variantIndex", "variantSignature", "stock"];
  if (required.some((h) => !headers.includes(h))) throw new Error(`Faltan columnas requeridas: ${required.join(", ")}.`);
  return lines.slice(1).map((line) => { const cells = parseLine(line); return Object.fromEntries(headers.map((h, i) => [h, cells[i] || ""])); });
}
async function parseUpload(file) {
  const ext = String(file.originalname).toLowerCase().split(".").pop();
  let raw;
  if (ext === "csv") raw = parseCsv(file.buffer.toString("utf8"));
  else if (ext === "xlsx" || ext === "xlsm") {
    const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(file.buffer);
    const sheet = workbook.worksheets[0]; if (!sheet) throw new Error("El Excel no contiene una hoja.");
    const headers = sheet.getRow(1).values.slice(1).map((v) => String(v || "").trim());
    const required = ["productId", "variantIndex", "variantSignature", "stock"];
    if (required.some((h) => !headers.includes(h))) throw new Error(`Faltan columnas requeridas: ${required.join(", ")}.`);
    raw = [];
    sheet.eachRow((row, n) => { if (n === 1) return; const values = row.values.slice(1); raw.push(Object.fromEntries(headers.map((h, i) => [h, values[i]?.text ?? values[i] ?? ""]))); });
  } else if (ext === "pdf") {
    const parsed = await pdfParse(file.buffer);
    raw = parsed.text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.startsWith(`${PDF_MARKER}|`)).map((line) => {
      const [, productId, variantIndex, signatureEncoded, stock] = line.split("|");
      return { productId, variantIndex, variantSignature: Buffer.from(signatureEncoded || "", "base64url").toString("utf8"), stock };
    });
    if (!raw.length) throw new Error("Este PDF no contiene filas del formato oficial GATÓN DO. Exporta la plantilla PDF desde Inventario y edita su sección de datos antes de importarla.");
  } else throw new Error("Formato no permitido. Usa CSV, Excel .xlsx o PDF de inventario GATÓN DO.");
  if (!raw.length || raw.length > 5000) throw new Error("El archivo debe tener entre 1 y 5,000 filas.");
  const seen = new Set();
  return raw.map((row, index) => {
    const productId = String(row.productId || "").trim();
    const variantIndex = String(row.variantIndex ?? "").trim();
    const variantSignature = String(row.variantSignature || "").trim();
    const stockValue = String(row.stock ?? "").trim();
    if (!/^[a-f0-9]{24}$/i.test(productId)) throw new Error(`Fila ${index + 2}: productId inválido.`);
    if (variantIndex !== "" && (!/^\d+$/.test(variantIndex) || Number(variantIndex) > 1000)) throw new Error(`Fila ${index + 2}: variantIndex inválido.`);
    if (!/^\d+$/.test(stockValue) || Number(stockValue) > 1000000) throw new Error(`Fila ${index + 2}: stock debe ser un entero entre 0 y 1,000,000.`);
    const key = `${productId}:${variantIndex}`; if (seen.has(key)) throw new Error(`Fila ${index + 2}: producto/variante duplicado.`); seen.add(key);
    return { productId, variantIndex: variantIndex === "" ? null : Number(variantIndex), variantSignature, stock: Number(stockValue), rowNumber: index + 2 };
  });
}
function csvEscape(value) { return `"${cleanCell(value).replace(/"/g, '""')}"`; }
async function sendPdf(res, rows, title) {
  const doc = new PDFDocument({ size: "LETTER", margin: 40 }); const chunks = [];
  doc.on("data", (chunk) => chunks.push(chunk));
  const done = new Promise((resolve, reject) => { doc.on("end", resolve); doc.on("error", reject); });
  doc.fontSize(18).fillColor("#211c18").text("GATÓN DO · Inventario", { align: "left" }).moveDown(.4);
  doc.fontSize(9).fillColor("#756d65").text(`${title} · ${new Date().toLocaleString("es-DO", { timeZone: "America/Santo_Domingo" })}`).moveDown();
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]; const sig = Buffer.from(r.variantSignature || "", "utf8").toString("base64url");
    if (doc.y > 730) doc.addPage();
    doc.fontSize(8).fillColor("#211c18").text(`${r.productName} | ${r.sku || "sin SKU"} | ${r.variantIndex === "" || r.variantIndex == null ? "Producto" : `Variante ${r.variantIndex}`} | Stock: ${r.stock}`, { continued: false });
    // Datos oficiales legibles por máquina para permitir importar este PDF sin inferir identidades.
    doc.fontSize(4).fillColor("#756d65").text(`${PDF_MARKER}|${r.productId}|${r.variantIndex ?? ""}|${sig}|${r.stock}`, { lineBreak: false });
    doc.moveDown(.5);
  }
  doc.end(); await done; res.type("pdf").set("Content-Disposition", 'attachment; filename="gaton-inventario.pdf"').send(Buffer.concat(chunks));
}
function validDate(value) { if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return false; const date = new Date(`${value}T00:00:00Z`); return !Number.isNaN(date.getTime()) && dayString(date) === value; }
function utcStart(day) { return `${day} 04:00:00.000`; } // Santo Domingo: UTC-04:00.
function nextDay(day) { const d = new Date(`${day}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1); return dayString(d); }
function shiftDay(day, offset) { const d = new Date(`${day}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + offset); return dayString(d); }
function periodRange(preset, today) {
  const mondayOffset = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7;
  const monthStart = `${today.slice(0, 8)}01`;
  const quarterMonth = Math.floor((Number(today.slice(5, 7)) - 1) / 3) * 3 + 1;
  const quarterStart = `${today.slice(0, 4)}-${pad2(quarterMonth)}-01`;
  if (preset === "today") return [today, today];
  if (preset === "yesterday") return [shiftDay(today, -1), shiftDay(today, -1)];
  if (preset === "this_week") return [shiftDay(today, -mondayOffset), today];
  if (preset === "last_week") return [shiftDay(today, -mondayOffset - 7), shiftDay(today, -mondayOffset - 1)];
  if (preset === "this_month") return [monthStart, today];
  if (preset === "last_month") { const lastEnd = shiftDay(monthStart, -1); return [`${lastEnd.slice(0, 8)}01`, lastEnd]; }
  if (preset === "this_quarter") return [quarterStart, today];
  if (preset === "this_year") return [`${today.slice(0, 4)}-01-01`, today];
  const days = preset === "last7" ? 7 : preset === "last90" ? 90 : 30;
  return [shiftDay(today, -(days - 1)), today];
}
function getItems(order) { return Array.isArray(order.items) ? order.items : Array.isArray(order.payload?.items) ? order.payload.items : []; }

router.get("/inventory", async (req, res) => {
  const products = await Product.find({ active: true }).sort({ name: 1 }).lean();
  res.render("admin/inventory/index", { rows: inventoryRows(products), importResult: req.query.imported === "1", error: null });
});
router.get("/inventory/export.csv", async (_req, res) => {
  const products = await Product.find({ active: true }).sort({ name: 1 }).lean(); const rows = inventoryRows(products);
  const headers = ["productId", "productName", "sku", "variantIndex", "variantSignature", "stock"];
  const body = [headers, ...rows.map((r) => headers.map((h) => r[h]))].map((r) => r.map(csvEscape).join(",")).join("\r\n");
  res.type("text/csv; charset=utf-8").set("Content-Disposition", 'attachment; filename="gaton-inventario.csv"').send(`\uFEFF${body}`);
});
router.get("/inventory/export.xlsx", async (_req, res) => {
  const products = await Product.find({ active: true }).sort({ name: 1 }).lean(); const rows = inventoryRows(products);
  const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet("Inventario");
  ws.columns = ["productId", "productName", "sku", "variantIndex", "variantSignature", "stock"].map((key) => ({ header: key, key, width: key === "variantSignature" ? 34 : 22 }));
  ws.addRows(rows.map((row) => ({ ...row, productName: cleanCell(row.productName), sku: cleanCell(row.sku), variantSignature: cleanCell(row.variantSignature) }))); ws.views = [{ state: "frozen", ySplit: 1 }]; const buf = await wb.xlsx.writeBuffer();
  res.type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet").set("Content-Disposition", 'attachment; filename="gaton-inventario.xlsx"').send(Buffer.from(buf));
});
router.get("/inventory/export.pdf", async (_req, res) => { const products = await Product.find({ active: true }).sort({ name: 1 }).lean(); return sendPdf(res, inventoryRows(products), "Exportación / formato importable"); });
router.post("/inventory/import/preview", upload.single("inventoryFile"), csrf, async (req, res) => {
  try {
    if (!req.file) throw new Error("Selecciona un archivo CSV, Excel o PDF.");
    const rows = await parseUpload(req.file);
    const productIds = [...new Set(rows.map((r) => r.productId))];
    const [products] = await pool.execute("SELECT id, name, stock, payload FROM products WHERE id IN (" + productIds.map(() => "?").join(",") + ")", productIds);
    const byId = new Map(products.map((p) => [String(p.id), p]));
    const preview = rows.map((row) => {
      const product = byId.get(row.productId); if (!product) throw new Error(`Fila ${row.rowNumber}: el producto ya no existe.`);
      const data = typeof product.payload === "string" ? JSON.parse(product.payload) : product.payload;
      let before, variantSig = "";
      if (row.variantIndex === null) { if (Array.isArray(data.variants) && data.variants.length) throw new Error(`Fila ${row.rowNumber}: falta indicar la variante.`); before = Number(product.stock); }
      else { const variant = data.variants?.[row.variantIndex]; if (!variant) throw new Error(`Fila ${row.rowNumber}: variante no encontrada.`); variantSig = signature(variant); if (variantSig !== row.variantSignature) throw new Error(`Fila ${row.rowNumber}: identidad de variante cambió; exporta el inventario actualizado.`); before = Number(variant.stock || 0); }
      if (row.variantIndex === null && row.variantSignature) throw new Error(`Fila ${row.rowNumber}: una línea de producto no debe tener firma de variante.`);
      return { ...row, productName: data.name || product.name, before, delta: row.stock - before };
    });
    const token = crypto.randomBytes(24).toString("hex");
    req.session.inventoryPreview = { token, rows: preview, createdAt: Date.now() };
    res.render("admin/inventory/preview", { rows: preview, token, error: null });
  } catch (error) {
    res.status(400).render("admin/inventory/index", { rows: [], importResult: false, error: error.message });
  }
});
router.post("/inventory/import/apply", csrf, async (req, res) => {
  const pending = req.session.inventoryPreview;
  if (!pending || pending.token !== req.body.token || Date.now() - pending.createdAt > 30 * 60 * 1000) return res.status(400).send("La vista previa expiró. Vuelve a cargar el archivo.");
  const conn = await pool.getConnection(); const batchId = id();
  try {
    await conn.beginTransaction();
    const grouped = new Map(); for (const row of pending.rows) { if (!grouped.has(row.productId)) grouped.set(row.productId, []); grouped.get(row.productId).push(row); }
    for (const [productId, rows] of grouped) {
      const [found] = await conn.execute("SELECT id, name, stock, out_of_stock, payload FROM products WHERE id=? FOR UPDATE", [productId]);
      if (!found.length) throw new Error(`El producto ${productId} dejó de existir.`);
      const rec = found[0], payload = typeof rec.payload === "string" ? JSON.parse(rec.payload) : rec.payload;
      for (const row of rows) {
        let current;
        if (row.variantIndex === null) current = Number(rec.stock);
        else { const variant = payload.variants?.[row.variantIndex]; if (!variant || signature(variant) !== row.variantSignature) throw new Error(`La variante de ${row.productName} cambió desde la vista previa.`); current = Number(variant.stock || 0); }
        if (current !== row.before) throw new Error(`El stock de ${row.productName} cambió desde la vista previa. Genera otra vista previa.`);
        if (row.variantIndex === null) payload.stock = row.stock;
        else payload.variants[row.variantIndex].stock = row.stock;
        await conn.execute("INSERT INTO inventory_movements (id,batch_id,product_id,variant_index,variant_signature,product_name,quantity_before,quantity_after,quantity_delta,action,actor_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(3))", [id(), batchId, productId, row.variantIndex, row.variantSignature, row.productName, current, row.stock, row.stock - current, "import", req.session.adminId,]);
      }
      const totalStock = Array.isArray(payload.variants) && payload.variants.length ? payload.variants.reduce((sum, v) => sum + Math.max(0, Number(v.stock || 0)), 0) : Number(payload.stock || 0);
      payload.stock = totalStock; payload.outOfStock = totalStock <= 0;
      await conn.execute("UPDATE products SET stock=?,out_of_stock=?,payload=?,updated_at=UTC_TIMESTAMP(3) WHERE id=?", [totalStock, totalStock <= 0 ? 1 : 0, JSON.stringify(payload), productId]);
    }
    await conn.commit(); delete req.session.inventoryPreview; return res.redirect("/admin/inventory?imported=1");
  } catch (error) { await conn.rollback(); return res.status(409).send(`No se aplicó ningún cambio: ${error.message}`); }
  finally { conn.release(); }
});
router.get("/inventory/movements", async (_req, res) => {
  const [movements] = await pool.execute("SELECT * FROM inventory_movements ORDER BY created_at DESC LIMIT 250");
  res.render("admin/inventory/movements", { movements });
});

router.get("/sales", async (req, res) => {
  const today = dayString(new Date(Date.now() - 4 * 60 * 60 * 1000));
  const presets = new Set(["today", "yesterday", "this_week", "last_week", "this_month", "last_month", "this_quarter", "this_year", "last7", "last30", "last90", "custom"]);
  const preset = presets.has(req.query.preset) ? req.query.preset : "last30";
  if (preset === "custom" && (!validDate(req.query.start) || !validDate(req.query.end))) return res.status(400).send("El rango personalizado debe contener fechas válidas.");
  const selectedRange = preset === "custom" && validDate(req.query.start) && validDate(req.query.end) ? [req.query.start, req.query.end] : periodRange(preset, today);
  const start = selectedRange[0], end = selectedRange[1];
  if (start > end) return res.status(400).send("El rango de fechas no es válido.");
  const startUtc = utcStart(start), endUtc = utcStart(nextDay(end));
  const [payments] = await pool.execute("SELECT p.id,p.order_id,p.amount,p.method,p.reference,p.recorded_at,o.customer_name FROM order_payments p JOIN orders o ON o.id=p.order_id WHERE p.recorded_at>=? AND p.recorded_at<? ORDER BY p.recorded_at", [startUtc, endUtc]);
    const [paidByOrder] = await pool.execute("SELECT order_id,SUM(amount) AS paid FROM order_payments GROUP BY order_id");
    const paymentOrderIds = [...new Set(payments.map((p) => p.order_id))];
    const paidOrders = paymentOrderIds.length ? (await pool.execute(`SELECT id,total,status,payload FROM orders WHERE id IN (${paymentOrderIds.map(() => "?").join(",")})`, paymentOrderIds))[0] : [];
  const [orders] = await pool.execute("SELECT id,customer_name,total,status,created_at,payload FROM orders WHERE created_at>=? AND created_at<? ORDER BY created_at DESC", [startUtc, endUtc]);
  const revenue = payments.reduce((sum, p) => sum + toCents(p.amount), 0) / 100;
  const fullyPaid = paidOrders.filter((o) => o.status !== "cancelled" && Number(paidByOrder.find((p) => p.order_id === o.id)?.paid || 0) >= Number(o.total));
  const fullyPaidOrderValue = fullyPaid.reduce((sum, order) => sum + toCents(order.total), 0) / 100;
  const span = Math.max(1, Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000) + 1);
  const priorEnd = new Date(`${start}T00:00:00Z`); priorEnd.setUTCDate(priorEnd.getUTCDate() - 1); const priorStart = new Date(priorEnd); priorStart.setUTCDate(priorStart.getUTCDate() - span + 1);
  const [prior] = await pool.execute("SELECT COALESCE(SUM(amount),0) AS amount FROM order_payments WHERE recorded_at>=? AND recorded_at<?", [utcStart(dayString(priorStart)), utcStart(nextDay(dayString(priorEnd)))]);
  const priorRevenue = Number(prior[0]?.amount || 0); const delta = priorRevenue ? ((revenue - priorRevenue) / priorRevenue) * 100 : (revenue === 0 ? 0 : null);
  const trend = new Map(); for (const p of payments) { const d = new Date(p.recorded_at); const localDay = dayString(new Date(d.getTime() - 4 * 60 * 60 * 1000)); trend.set(localDay, (trend.get(localDay) || 0) + Number(p.amount)); }
  const top = new Map();
  for (const o of fullyPaid) {
    let payload = {}; try { payload = typeof o.payload === "string" ? JSON.parse(o.payload) : o.payload; } catch {}
    for (const item of getItems(payload)) { const name = String(item.productName || item.name || "Producto"); top.set(name, (top.get(name) || 0) + Number(item.quantity || 1)); }
  }
  const topProducts = [...top].map(([name, units]) => ({ name, units })).sort((a, b) => b.units - a.units).slice(0, 10);
  res.render("admin/sales/index", { start, end, preset, revenue, paymentCount: payments.length, paidOrderCount: fullyPaid.length, orderCount: orders.length, averageOrder: fullyPaid.length ? fullyPaidOrderValue / fullyPaid.length : 0, delta, difference: Math.round((revenue - priorRevenue) * 100) / 100, paymentSaved: req.query.payment === "recorded", trend: [...trend].map(([date, amount]) => ({ date, amount })), topProducts, payments, pendingOrders: orders.filter((o) => o.status !== "cancelled").slice(0, 80), paidByOrder: Object.fromEntries(paidByOrder.map((p) => [p.order_id, Number(p.paid)])), priorRevenue });
});
router.post("/sales/orders/:id/payments", csrf, async (req, res) => {
  const amountText = String(req.body.amount || "").trim(); const amountCents = /^\d{1,10}(\.\d{1,2})?$/.test(amountText) ? toCents(amountText) : 0; const amount = amountCents / 100;
  const method = String(req.body.method || "").trim().slice(0, 80); const reference = String(req.body.reference || "").trim().slice(0, 191);
  if (!amountCents || !method) return res.status(400).send("Indica un monto positivo, con hasta dos decimales, y el método de pago.");
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction(); const [orders] = await conn.execute("SELECT id,total,status,created_at FROM orders WHERE id=? FOR UPDATE", [req.params.id]);
    if (!orders.length || orders[0].status === "cancelled") throw new Error("Pedido no disponible para registrar pago.");
    const [sumRows] = await conn.execute("SELECT COALESCE(SUM(amount),0) AS paid FROM order_payments WHERE order_id=?", [req.params.id]);
    const remainingCents = toCents(orders[0].total) - toCents(sumRows[0].paid); if (amountCents > remainingCents) throw new Error("El pago excede el saldo pendiente del pedido.");
    await conn.execute("INSERT INTO order_payments (id,order_id,amount,method,reference,recorded_by,recorded_at) VALUES (?,?,?,?,?,?,UTC_TIMESTAMP(3))", [id(), req.params.id, amount, method, reference, req.session.adminId]);
    await conn.commit(); return res.redirect(`/admin/sales?start=${String(req.body.start || "").slice(0,10)}&end=${String(req.body.end || "").slice(0,10)}&preset=custom&payment=recorded`);
  } catch (error) { await conn.rollback(); return res.status(400).send(error.message); }
  finally { conn.release(); }
});
router.get("/sales/export.csv", async (req, res) => {
  const start = validDate(req.query.start) ? req.query.start : "2000-01-01", end = validDate(req.query.end) ? req.query.end : "2099-12-31";
  const [rows] = await pool.execute("SELECT p.recorded_at,p.order_id,o.customer_name,p.amount,p.method,p.reference FROM order_payments p JOIN orders o ON o.id=p.order_id WHERE p.recorded_at>=? AND p.recorded_at<? ORDER BY p.recorded_at", [utcStart(start), utcStart(nextDay(end))]);
  const total = rows.reduce((sum, row) => sum + Number(row.amount), 0);
  const csv = [["# GATÓN DO · Reporte de pagos registrados"], [`# Generado: ${new Date().toISOString()}`], [`# Responsable: ${cleanCell(req.session.adminEmail || "Administrador")}`], [`# Período: ${start} a ${end} · America/Santo_Domingo`], [`# Total cobrado DOP: ${total.toFixed(2)} · Método: solo pagos registrados por administración`], ["recordedAt", "orderId", "customer", "amountDOP", "method", "reference"], ...rows.map((r) => [r.recorded_at, r.order_id, r.customer_name, r.amount, r.method, r.reference])].map((row) => row.map(csvEscape).join(",")).join("\r\n");
  res.type("text/csv; charset=utf-8").set("Content-Disposition", 'attachment; filename="gaton-ventas.csv"').send(`\uFEFF${csv}`);
});
router.get("/sales/export.xlsx", async (req, res) => {
  const start = validDate(req.query.start) ? req.query.start : "2000-01-01", end = validDate(req.query.end) ? req.query.end : "2099-12-31";
  const [rows] = await pool.execute("SELECT p.recorded_at,p.order_id,o.customer_name,p.amount,p.method,p.reference FROM order_payments p JOIN orders o ON o.id=p.order_id WHERE p.recorded_at>=? AND p.recorded_at<? ORDER BY p.recorded_at", [utcStart(start), utcStart(nextDay(end))]);
  const wb = new ExcelJS.Workbook(), summary = wb.addWorksheet("Resumen");
  summary.addRows([["GATÓN DO · Reporte de pagos"],["Generado",new Date().toISOString()],["Responsable",req.session.adminEmail || "Administrador"],["Período",`${start} a ${end} · America/Santo_Domingo`],["Cobros confirmados DOP",rows.reduce((sum,row)=>sum+Number(row.amount),0)],["Metodología","Suma de pagos registrados por administración por fecha de confirmación; abonos incluidos."]]);
  const ws = wb.addWorksheet("Pagos registrados"); ws.columns = [{header:"Fecha",key:"recorded_at",width:24},{header:"Pedido",key:"order_id",width:28},{header:"Cliente",key:"customer_name",width:28},{header:"Monto DOP",key:"amount",width:18},{header:"Método",key:"method",width:20},{header:"Referencia",key:"reference",width:24}]; ws.addRows(rows.map(row=>({...row,customer_name:cleanCell(row.customer_name),method:cleanCell(row.method),reference:cleanCell(row.reference)}))); const buf = await wb.xlsx.writeBuffer();
  res.type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet").set("Content-Disposition", 'attachment; filename="gaton-ventas.xlsx"').send(Buffer.from(buf));
});
router.get("/sales/export.pdf", async (req, res) => {
  const start = validDate(req.query.start) ? req.query.start : "2000-01-01", end = validDate(req.query.end) ? req.query.end : "2099-12-31";
  const [rows] = await pool.execute("SELECT p.recorded_at,p.order_id,o.customer_name,p.amount,p.method,p.reference FROM order_payments p JOIN orders o ON o.id=p.order_id WHERE p.recorded_at>=? AND p.recorded_at<? ORDER BY p.recorded_at", [utcStart(start), utcStart(nextDay(end))]);
  const doc = new PDFDocument({ size: "LETTER", margin: 40 }); res.type("pdf").set("Content-Disposition", 'attachment; filename="gaton-ventas.pdf"'); doc.pipe(res);
  doc.fontSize(18).fillColor("#211c18").text("GATÓN DO · Reporte de pagos").moveDown(); doc.fontSize(9).fillColor("#756d65").text(`Generado: ${new Date().toISOString()} · Responsable: ${req.session.adminEmail || "Administrador"}`).text(`Período: ${start} — ${end} · America/Santo_Domingo`).text("Método: cobros registrados por administración; se incluyen abonos parciales.").moveDown();
  doc.fontSize(12).fillColor("#211c18").text(`Total cobrado: RD$ ${rows.reduce((sum,row)=>sum+Number(row.amount),0).toFixed(2)} · ${rows.length} pagos`).moveDown();
  rows.forEach((r) => doc.fontSize(9).fillColor("#211c18").text(`${r.recorded_at} · ${r.order_id} · ${r.customer_name} · RD$ ${Number(r.amount).toFixed(2)} · ${r.method} · ${r.reference}`)); doc.end();
});

module.exports = router;
