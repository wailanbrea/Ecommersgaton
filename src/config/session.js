const session = require("express-session");
const { pool } = require("./db");

class MysqlSessionStore extends session.Store {
  async get(sid, callback) {
    try {
      const [rows] = await pool.execute("SELECT expires, data FROM app_sessions WHERE sid = ? LIMIT 1", [sid]);
      if (!rows.length) return callback(null, null);
      if (Number(rows[0].expires) <= Date.now()) {
        await pool.execute("DELETE FROM app_sessions WHERE sid = ?", [sid]);
        return callback(null, null);
      }
      callback(null, JSON.parse(rows[0].data));
    } catch (error) { callback(error); }
  }

  async set(sid, value, callback = () => {}) {
    try {
      const expires = value?.cookie?.expires ? new Date(value.cookie.expires).getTime() : Date.now() + 86400000;
      await pool.execute(
        "INSERT INTO app_sessions (sid, expires, data) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE expires=VALUES(expires), data=VALUES(data)",
        [sid, expires, JSON.stringify(value)]
      );
      callback(null);
    } catch (error) { callback(error); }
  }

  async touch(sid, value, callback = () => {}) {
    try {
      const expires = value?.cookie?.expires ? new Date(value.cookie.expires).getTime() : Date.now() + 86400000;
      await pool.execute("UPDATE app_sessions SET expires = ? WHERE sid = ?", [expires, sid]);
      callback(null);
    } catch (error) { callback(error); }
  }

  async destroy(sid, callback = () => {}) {
    try { await pool.execute("DELETE FROM app_sessions WHERE sid = ?", [sid]); callback(null); }
    catch (error) { callback(error); }
  }
}

const secret = process.env.SESSION_SECRET;
if (!secret || secret.length < 32) throw new Error("SESSION_SECRET debe tener al menos 32 caracteres.");

module.exports = session({
  name: "gatondo.sid",
  secret,
  resave: false,
  saveUninitialized: false,
  store: new MysqlSessionStore(),
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 24
  }
});