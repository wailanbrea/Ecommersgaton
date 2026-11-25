const crypto = require("node:crypto");
const { pool } = require("../config/db");

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function escapeLike(value) {
  return String(value).replace(/[\\%_]/g, "\\$&");
}

function regexValue(value) {
  return value instanceof RegExp ? value.source : String(value || "");
}

function createModel(config) {
  const columnByField = { _id: "id", createdAt: "created_at", updatedAt: "updated_at", ...config.columns };
  const allowedFields = new Set(Object.keys(columnByField));

  class Document {
    constructor(values = {}) {
      Object.assign(this, clone(config.defaults || {}), clone(values));
      if (this._id) this._id = String(this._id);
    }

    async save() {
      if (!this._id) this._id = crypto.randomBytes(12).toString("hex");
      const now = new Date();
      this.createdAt = this.createdAt ? new Date(this.createdAt) : now;
      this.updatedAt = now;

      const data = {};
      for (const [key, value] of Object.entries(this)) {
        if (typeof value !== "function" && value !== undefined) data[key] = value;
      }
      const values = [String(this._id)];
      const columns = ["id"];
      for (const [field, column] of Object.entries(config.columns || {})) {
        columns.push(column);
        values.push(toDatabaseValue(this[field], config.types?.[field]));
      }
      columns.push("created_at", "updated_at", "payload");
      values.push(this.createdAt, this.updatedAt, JSON.stringify(data));

      const quoted = columns.map((column) => `\`${column}\``);
      const updates = quoted.slice(1).map((column) => `${column}=VALUES(${column})`);
      await pool.execute(
        `INSERT INTO \`${config.table}\` (${quoted.join(",")}) VALUES (${columns.map(() => "?").join(",")}) ON DUPLICATE KEY UPDATE ${updates.join(",")}`,
        values
      );
      return this;
    }

    toObject() {
      return clone(Object.fromEntries(Object.entries(this).filter(([, value]) => typeof value !== "function")));
    }
  }

  class Query {
    constructor(filter = {}, one = false) {
      this.filter = filter || {};
      this.one = one;
      this.order = [];
      this.maxRows = null;
      this.projection = null;
      this.asPlain = false;
    }

    sort(spec = {}) {
      this.order = Object.entries(spec).filter(([key]) => allowedFields.has(key));
      return this;
    }

    limit(count) {
      this.maxRows = Math.max(0, Number(count) || 0);
      return this;
    }

    select(fields = "") {
      this.projection = new Set(String(fields).split(/\s+/).filter(Boolean));
      return this;
    }

    lean() {
      this.asPlain = true;
      return this;
    }

    async execute() {
      const { sql: where, values } = buildWhere(this.filter);
      const order = this.order.length
        ? ` ORDER BY ${this.order.map(([key, direction]) => `\`${columnByField[key]}\` ${Number(direction) < 0 ? "DESC" : "ASC"}`).join(",")}`
        : "";
      const limit = this.one ? " LIMIT 1" : (this.maxRows === null ? "" : ` LIMIT ${this.maxRows}`);
      const [rows] = await pool.execute(`SELECT * FROM \`${config.table}\` ${where}${order}${limit}`, values);
      const docs = rows.map((row) => hydrate(row));
      const result = this.one ? (docs[0] || null) : docs;
      const selected = Array.isArray(result) ? result.map((doc) => project.call(this, doc)) : project.call(this, result);
      return this.asPlain ? toPlain(selected) : selected;
    }

    then(resolve, reject) { return this.execute().then(resolve, reject); }
    catch(reject) { return this.execute().catch(reject); }
    finally(callback) { return this.execute().finally(callback); }
  }

  function project(document) {
    if (!document || !this?.projection) return document;
    const fields = [...this.projection];
    const excluded = fields.filter((field) => field.startsWith("-"));
    const included = fields.filter((field) => !field.startsWith("-"));
    const output = included.length ? { _id: document._id } : document.toObject();
    for (const field of included) if (Object.hasOwn(document, field)) output[field] = document[field];
    for (const field of excluded) delete output[field.slice(1)];
    return this.asPlain ? output : new Document(output);
  }
  function hydrate(row) {
    let data = {};
    try { data = typeof row.payload === "string" ? JSON.parse(row.payload || "{}") : (row.payload || {}); } catch {}
    data._id = String(row.id);
    data.createdAt = row.created_at;
    data.updatedAt = row.updated_at;
    for (const [field, column] of Object.entries(config.columns || {})) {
      const value = row[column];
      data[field] = fromDatabaseValue(value, config.types?.[field]);
    }
    return new Document(data);
  }

  function toPlain(value) {
    if (Array.isArray(value)) return value.map((item) => item?.toObject ? item.toObject() : clone(item));
    return value?.toObject ? value.toObject() : clone(value);
  }

  function buildWhere(filter) {
    const clauses = [];
    const params = [];
    for (const [field, expected] of Object.entries(filter || {})) {
      if (field === "$or" || field === "$and") {
        if (!Array.isArray(expected) || !expected.length) continue;
        const operator = field === "$or" ? "OR" : "AND";
        const nested = expected.map((item) => buildWhere(item)).filter((item) => item.sql);
        if (nested.length) clauses.push(`(${nested.map((item) => item.sql.replace(/^WHERE\s+/, "")).join(` ${operator} `)})`);
        for (const item of nested) params.push(...item.values);
        continue;
      }
      const column = columnByField[field];
      if ((!column && field !== "tags") || (column && !allowedFields.has(field))) continue;
      if (expected instanceof RegExp) {
        clauses.push("LOWER(payload) LIKE LOWER(?)");
        params.push(`%${escapeLike(regexValue(expected))}%`);
        continue;
      }
      if (expected && typeof expected === "object" && !Array.isArray(expected) && !(expected instanceof Date)) {
        for (const [operator, operand] of Object.entries(expected)) {
          if (operator === "$options") continue;
          if (operator === "$in" || operator === "$nin") {
            if (!Array.isArray(operand) || !operand.length) {
              clauses.push(operator === "$in" ? "1=0" : "1=1");
            } else if (operand.some((item) => item instanceof RegExp)) {
              const patterns = operand.filter((item) => item instanceof RegExp).map(regexValue);
              clauses.push("LOWER(payload) LIKE LOWER(?)");
              params.push(`%${escapeLike(patterns.join(" "))}%`);
            } else {
              clauses.push(`\`${column}\` ${operator === "$in" ? "IN" : "NOT IN"} (${operand.map(() => "?").join(",")})`);
              params.push(...operand.map((item) => toDatabaseValue(item, config.types?.[field])));
            }
          } else if (operator === "$ne") {
            clauses.push(expectedValueNull(operand) ? `\`${column}\` IS NOT NULL` : `\`${column}\` <> ?`);
            if (!expectedValueNull(operand)) params.push(toDatabaseValue(operand, config.types?.[field]));
          } else if (operator === "$regex") {
            clauses.push("LOWER(payload) LIKE LOWER(?)");
            params.push(`%${escapeLike(regexValue(operand))}%`);
          }
        }
      } else if (expected === null) {
        clauses.push(`\`${column}\` IS NULL`);
      } else {
        clauses.push(`\`${column}\` = ?`);
        params.push(toDatabaseValue(expected, config.types?.[field]));
      }
    }
    return { sql: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "", values: params };
  }

  function expectedValueNull(value) { return value === null || value === undefined; }

  function toDatabaseValue(value, type) {
    if (value === undefined) return type === "string" ? "" : null;
    if (type === "boolean") return value ? 1 : 0;
    if (type === "number" || type === "decimal") return value === null ? 0 : Number(value);
    if (value instanceof Date) return value;
    if (value === null) return type === "nullableString" ? null : type === "string" ? "" : null;
    return String(value);
  }
  function fromDatabaseValue(value, type) {
    if (value === null || value === undefined) return value;
    if (type === "boolean") return Boolean(Number(value));
    if (type === "number" || type === "decimal") return Number(value);
    return value;
  }

  function createDocument(values) { return new Document(values); }
  createDocument.modelName = config.table;
  createDocument.find = (filter = {}) => new Query(filter);
  createDocument.findOne = (filter = {}) => new Query(filter, true);
  createDocument.findById = (id) => new Query({ _id: String(id) }, true);
  createDocument.create = async (values) => new Document(values).save();
  createDocument.insertMany = async (values) => Promise.all(values.map((value) => new Document(value).save()));
  createDocument.importMany = async (values, connection) => {
    for (const value of values) {
      const doc = new Document(value);
      if (!doc._id) throw new Error(`Un registro de ${config.table} no tiene ID de origen.`);
      doc.createdAt = doc.createdAt ? new Date(doc.createdAt) : new Date();
      doc.updatedAt = doc.updatedAt ? new Date(doc.updatedAt) : doc.createdAt;
      const data = {};
      for (const [key, fieldValue] of Object.entries(doc)) if (typeof fieldValue !== "function" && fieldValue !== undefined) data[key] = fieldValue;
      const columns = ["id"];
      const params = [String(doc._id)];
      for (const [field, column] of Object.entries(config.columns || {})) {
        columns.push(column);
        params.push(toDatabaseValue(doc[field], config.types?.[field]));
      }
      columns.push("created_at", "updated_at", "payload");
      params.push(doc.createdAt, doc.updatedAt, JSON.stringify(data));
      await connection.execute(
        `INSERT INTO \`${config.table}\` (${columns.map((column) => `\`${column}\``).join(",")}) VALUES (${columns.map(() => "?").join(",")})`,
        params
      );
    }
  };
  createDocument.exists = async (filter = {}) => Boolean(await createDocument.findOne(filter).select("_id").lean());
  createDocument.countDocuments = async (filter = {}) => {
    const { sql, values } = buildWhere(filter);
    const [rows] = await pool.execute(`SELECT COUNT(*) AS count FROM \`${config.table}\` ${sql}`, values);
    return Number(rows[0]?.count || 0);
  };
  createDocument.findByIdAndUpdate = async (id, update = {}) => {
    const document = await createDocument.findById(id);
    if (!document) return null;
    Object.assign(document, update.$set || update);
    return document.save();
  };
  createDocument.findByIdAndDelete = async (id) => {
    const document = await createDocument.findById(id);
    if (document) await pool.execute(`DELETE FROM \`${config.table}\` WHERE id=?`, [String(id)]);
    return document;
  };
  createDocument.deleteMany = async (filter = {}) => {
    if (!filter || Object.keys(filter).length === 0) throw new Error("deleteMany requiere un filtro explícito; no se permite vaciar una tabla.");
    const { sql, values } = buildWhere(filter);
    const [result] = await pool.execute(`DELETE FROM \`${config.table}\` ${sql}`, values);
    return { deletedCount: result.affectedRows };
  };

  return createDocument;
}

module.exports = { createModel };
