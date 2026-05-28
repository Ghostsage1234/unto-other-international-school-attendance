import initSqlJs from 'sql.js';
import fs from 'fs';

async function rebuildDatabase() {
  const SQL = await initSqlJs();
  
  // Create new database
  const db = new SQL.Database();
  
  // Create all tables
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
    
    CREATE TABLE IF NOT EXISTS class_subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_name TEXT NOT NULL,
      subject_name TEXT NOT NULL,
      UNIQUE(class_name, subject_name)
    )
  `);
  
  // Add admin user
  db.run("INSERT INTO users (username, password, role, fullname) VALUES ('admin', '$2a$10$hashedpassword', 'admin', 'System Administrator')");
  
  // Define subjects with History replacing Physical Education for Primary and above
  const subjectsByClass = {
    'Nursery 1': ['Language and Literacy', 'Numeracy', 'Creative Activities', 'Environmental Studies', 'Physical Development'],
    'Nursery 2': ['Language and Literacy', 'Numeracy', 'Creative Activities', 'Environmental Studies', 'Physical Development'],
    'KG 1': ['Language and Literacy', 'Numeracy', 'Creative Activities', 'Environmental Studies', 'Physical Development'],
    'KG 2': ['Language and Literacy', 'Numeracy', 'Creative Activities', 'Environmental Studies', 'Physical Development'],
    'Primary 1': ['English Language', 'Mathematics', 'Science', 'Computing', 'History', 'Creative Arts', 'Ghanaian Language', 'Religious and Moral Education'],
    'Primary 2': ['English Language', 'Mathematics', 'Science', 'Computing', 'History', 'Creative Arts', 'Ghanaian Language', 'Religious and Moral Education'],
    'Primary 3': ['English Language', 'Mathematics', 'Science', 'Computing', 'History', 'Creative Arts', 'Ghanaian Language', 'Religious and Moral Education'],
    'Primary 4': ['English Language', 'Mathematics', 'Science', 'Computing', 'History', 'Creative Arts', 'Ghanaian Language', 'Religious and Moral Education', 'French'],
    'Primary 5': ['English Language', 'Mathematics', 'Science', 'Computing', 'History', 'Creative Arts', 'Ghanaian Language', 'Religious and Moral Education', 'French'],
    'Primary 6': ['English Language', 'Mathematics', 'Science', 'Computing', 'History', 'Creative Arts', 'Ghanaian Language', 'Religious and Moral Education', 'French'],
    'JHS 1': ['English Language', 'Mathematics', 'Integrated Science', 'Social Studies', 'History', 'Ghanaian Language', 'Religious and Moral Education', 'French', 'Creative Arts', 'Information and Communications Technology', 'Career Technology'],
    'JHS 2': ['English Language', 'Mathematics', 'Integrated Science', 'Social Studies', 'History', 'Ghanaian Language', 'Religious and Moral Education', 'French', 'Creative Arts', 'Information and Communications Technology', 'Career Technology'],
    'JHS 3': ['English Language', 'Mathematics', 'Integrated Science', 'Social Studies', 'History', 'Ghanaian Language', 'Religious and Moral Education', 'French', 'Creative Arts', 'Information and Communications Technology', 'Career Technology']
  };
  
  // Insert all subjects
  let totalAdded = 0;
  for (const [className, subjects] of Object.entries(subjectsByClass)) {
    for (const subject of subjects) {
      db.run(
        "INSERT INTO class_subjects (class_name, subject_name) VALUES (?, ?)",
        [className, subject]
      );
      totalAdded++;
    }
    console.log(`Added ${subjects.length} subjects for ${className}`);
  }
  
  // Save database
  const data = db.export();
  const bufferData = Buffer.from(data);
  fs.writeFileSync('school.db', bufferData);
  
  console.log(`\n✅ Database rebuilt with ${totalAdded} subjects across 13 classes`);
  console.log('\nChanges made:');
  console.log('- Replaced Physical Education with History for all classes');
  console.log('- JHS classes have History as core subject');
  console.log('- Subjects ordered with core first, then electives');
}

rebuildDatabase().catch(console.error);
