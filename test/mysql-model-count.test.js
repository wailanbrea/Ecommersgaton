const assert = require("node:assert/strict");
const { after, test } = require("node:test");
const { pool } = require("../src/config/db");
const Product = require("../src/models/Product");

const originalExecute = pool.execute;
const calls = [];

pool.execute = async (sql, values) => {
  calls.push({ sql, values });
  return [[{ count: "7" }]];
};

test("countDocuments devuelve el total de MySQL", async () => {
  assert.equal(await Product.countDocuments(), 7);
  assert.match(calls.at(-1).sql, /SELECT COUNT\(\*\) AS count FROM `products`/);
  assert.deepEqual(calls.at(-1).values, []);
});

test("countDocuments conserva los filtros del dashboard", async () => {
  assert.equal(await Product.countDocuments({ active: true }), 7);
  assert.match(calls.at(-1).sql, /WHERE `active` = \?/);
  assert.deepEqual(calls.at(-1).values, [1]);
});

after(() => { pool.execute = originalExecute; });
