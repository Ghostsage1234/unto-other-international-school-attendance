import initSqlJs from 'sql.js';
import fs from 'fs';

let db = null;

export async function initDatabase() {
  const SQL = await initSqlJs();
  
  // Check if database file exists
  let buffer = null;
  if (fs.existsSync('school.db')) {
    buffer = fs.readFileSync('school.db');
  }
  
  db = new SQL.Database(buffer);
  
  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      fullname TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id TEXT UNIQUE NOT NULL,
      fullname TEXT NOT NULL,
      class TEXT NOT NULL,
      gender TEXT,
      dob TEXT,
      address TEXT,
      parent_phone TEXT,
      enrollment_date TEXT DEFAULT CURRENT_DATE,
      status TEXT DEFAULT 'active'
    );
    
    CREATE TABLE IF NOT EXISTS teachers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_id TEXT UNIQUE NOT NULL,
      fullname TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      subjects TEXT,
      hire_date TEXT DEFAULT CURRENT_DATE,
      status TEXT DEFAULT 'active'
    );
    
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id TEXT NOT NULL,
      class TEXT NOT NULL,
      date TEXT NOT NULL,
      status TEXT NOT NULL,
      marked_by INTEGER,
      UNIQUE(student_id, date)
    );
    
    CREATE TABLE IF NOT EXISTS fees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id TEXT NOT NULL,
      term TEXT NOT NULL,
      amount REAL NOT NULL,
      paid REAL DEFAULT 0,
      balance REAL,
      due_date TEXT,
      status TEXT DEFAULT 'pending'
    );
    
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_date TEXT DEFAULT CURRENT_DATE,
      receipt_no TEXT UNIQUE,
      term TEXT,
      notes TEXT
    );
  `);
  
  // Insert default admin user (password: password)
  const adminExists = db.exec("SELECT * FROM users WHERE username = 'admin'");
  if (adminExists.length === 0 || adminExists[0].values.length === 0) {
    // Default password is "password" - we'll hash it later in server.js
    db.run("INSERT INTO users (username, password, role, fullname) VALUES ('admin', 'password', 'admin', 'System Administrator')");
  }
  
  // Save database to file
  const data = db.export();
  const bufferData = Buffer.from(data);
  fs.writeFileSync('school.db', bufferData);
  
  return db;
}

export function getDb() {
  return db;
}

export function saveDatabase() {
  if (db) {
    const data = db.export();
    const bufferData = Buffer.from(data);
    fs.writeFileSync('school.db', bufferData);
  }
}
