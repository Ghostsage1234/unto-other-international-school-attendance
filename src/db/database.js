const path = require('path');
const fs = require('fs');
const schema = require('./schema');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../database.db');
let db;

async function initDB() {
  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs({
    locateFile: file => path.join(__dirname, '../../node_modules/sql.js/dist/', file)
  });
  if (fs.existsSync(DB_PATH)) {
    db = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    db = new SQL.Database();
  }
  const statements = schema.split(';').filter(s => s.trim());
  for (const stmt of statements) {
    try { if (stmt.trim()) db.run(stmt); } catch(e) {}
  }
  saveDB();
  console.log('✅ Database ready at', DB_PATH);
  // Always ensure admin exists with correct password
  const bcrypt = require('bcryptjs');
  const existingAdmin = get('SELECT id FROM admins WHERE username=?', ['admin']);
  const freshHash = bcrypt.hashSync('password', 10);
  if (!existingAdmin) {
    run('INSERT INTO admins (username, password, full_name) VALUES (?,?,?)', ['admin', freshHash, 'School Administrator']);
    console.log('Default admin created');
  } else {
    run('UPDATE admins SET password=? WHERE username=?', [freshHash, 'admin']);
    console.log('Admin password refreshed');
  }

  return db;
}

function saveDB() {
  try {
    const data = db.export();
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  } catch(e) { console.error('Save error:', e.message); }
}

function run(sql, params = []) {
  db.run(sql, params);
  saveDB();
}

function get(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return row;
    }
    stmt.free();
    return null;
  } catch(e) { return null; }
}

function all(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  } catch(e) { return []; }
}

module.exports = { initDB, saveDB, run, get, all };
