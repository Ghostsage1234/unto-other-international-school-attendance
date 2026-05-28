import initSqlJs from 'sql.js';
import fs from 'fs';

async function freshDatabase() {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  
  // Create all tables
  db.run(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      fullname TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE students (
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
    
    CREATE TABLE teachers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_id TEXT UNIQUE NOT NULL,
      fullname TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      subjects TEXT,
      hire_date TEXT DEFAULT CURRENT_DATE,
      status TEXT DEFAULT 'active'
    );
    
    CREATE TABLE attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id TEXT NOT NULL,
      class TEXT NOT NULL,
      date TEXT NOT NULL,
      status TEXT NOT NULL,
      marked_by INTEGER,
      UNIQUE(student_id, date)
    );
    
    CREATE TABLE fees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id TEXT NOT NULL,
      term TEXT NOT NULL,
      amount REAL NOT NULL,
      paid REAL DEFAULT 0,
      balance REAL,
      due_date TEXT,
      status TEXT DEFAULT 'pending'
    );
    
    CREATE TABLE payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_date TEXT DEFAULT CURRENT_DATE,
      receipt_no TEXT UNIQUE,
      term TEXT,
      notes TEXT
    );
    
    CREATE TABLE class_subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_name TEXT NOT NULL,
      subject_name TEXT NOT NULL,
      UNIQUE(class_name, subject_name)
    )
  `);
  
  // Add admin user (password: password - will be hashed on first login)
  db.run("INSERT INTO users (username, password, role, fullname) VALUES ('admin', 'password', 'admin', 'System Administrator')");
  
  // Define all subjects
  const subjectsData = {
    'Nursery 1': ['Language and Literacy', 'Numeracy', 'Creative Activities', 'Environmental Studies', 'Physical Development'],
    'Nursery 2': ['Language and Literacy', 'Numeracy', 'Creative Activities', 'Environmental Studies', 'Physical Development'],
    'KG 1': ['Language and Literacy', 'Numeracy', 'Creative Activities', 'Environmental Studies', 'Physical Development'],
    'KG 2': ['Language and Literacy', 'Numeracy', 'Creative Activities', 'Environmental Studies', 'Physical Development'],
    'Primary 1': ['English Language', 'Mathematics', 'Science', 'Computing', 'Creative Arts', 'Ghanaian Language', 'Religious and Moral Education', 'History'],
    'Primary 2': ['English Language', 'Mathematics', 'Science', 'Computing', 'Creative Arts', 'Ghanaian Language', 'Religious and Moral Education', 'History'],
    'Primary 3': ['English Language', 'Mathematics', 'Science', 'Computing', 'Creative Arts', 'Ghanaian Language', 'Religious and Moral Education', 'History'],
    'Primary 4': ['English Language', 'Mathematics', 'Science', 'Computing', 'Creative Arts', 'Ghanaian Language', 'Religious and Moral Education', 'French', 'History'],
    'Primary 5': ['English Language', 'Mathematics', 'Science', 'Computing', 'Creative Arts', 'Ghanaian Language', 'Religious and Moral Education', 'French', 'History'],
    'Primary 6': ['English Language', 'Mathematics', 'Science', 'Computing', 'Creative Arts', 'Ghanaian Language', 'Religious and Moral Education', 'French', 'History'],
    'JHS 1': ['English Language', 'Mathematics', 'Integrated Science', 'Social Studies', 'Ghanaian Language', 'Religious and Moral Education', 'French', 'Creative Arts', 'Information and Communications Technology', 'Career Technology'],
    'JHS 2': ['English Language', 'Mathematics', 'Integrated Science', 'Social Studies', 'Ghanaian Language', 'Religious and Moral Education', 'French', 'Creative Arts', 'Information and Communications Technology', 'Career Technology'],
    'JHS 3': ['English Language', 'Mathematics', 'Integrated Science', 'Social Studies', 'Ghanaian Language', 'Religious and Moral Education', 'French', 'Creative Arts', 'Information and Communications Technology', 'Career Technology']
  };
  
  // Insert subjects
  for (const [className, subjects] of Object.entries(subjectsData)) {
    for (const subject of subjects) {
      db.run("INSERT INTO class_subjects (class_name, subject_name) VALUES (?, ?)", [className, subject]);
    }
    console.log(`Added ${subjects.length} subjects for ${className}`);
  }
  
  // Save database
  const data = db.export();
  fs.writeFileSync('school.db', Buffer.from(data));
  
  console.log("\n✅ Fresh database created!");
  
  // Verify JHS subjects
  const jhsCheck = db.exec("SELECT subject_name FROM class_subjects WHERE class_name = 'JHS 1'");
  console.log("\nJHS 1 Subjects:");
  jhsCheck[0].values.forEach(row => console.log(`  - ${row[0]}`));
}

freshDatabase().catch(console.error);
