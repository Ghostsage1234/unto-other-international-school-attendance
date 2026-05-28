const schema = `
  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    full_name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS teachers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    subject TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    level INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS teacher_classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_id INTEGER NOT NULL,
    class_id INTEGER NOT NULL,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    UNIQUE(teacher_id, class_id)
  );
  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admission_number TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    class_id INTEGER NOT NULL,
    gender TEXT DEFAULT '',
    date_of_birth TEXT DEFAULT '',
    parent_name TEXT DEFAULT '',
    parent_phone TEXT DEFAULT '',
    address TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id)
  );
  CREATE TABLE IF NOT EXISTS terms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    start_date TEXT DEFAULT '',
    end_date TEXT DEFAULT '',
    is_current INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS holidays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    class_id INTEGER NOT NULL,
    teacher_id INTEGER NOT NULL DEFAULT 0,
    date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'absent',
    marked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id),
    UNIQUE(student_id, date)
  );
  CREATE TABLE IF NOT EXISTS auto_absent_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    class_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    marked_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    class_id INTEGER NOT NULL,
    teacher_id INTEGER,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id),
    UNIQUE(name, class_id)
  );
  CREATE TABLE IF NOT EXISTS grades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    subject_id INTEGER NOT NULL,
    term_id INTEGER NOT NULL,
    ca1 REAL DEFAULT 0,
    ca2 REAL DEFAULT 0,
    exam REAL DEFAULT 0,
    total REAL DEFAULT 0,
    grade TEXT DEFAULT '',
    remark TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (term_id) REFERENCES terms(id),
    UNIQUE(student_id, subject_id, term_id)
  );
  CREATE TABLE IF NOT EXISTS fee_structures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    term_id INTEGER NOT NULL,
    class_id INTEGER NOT NULL,
    label TEXT NOT NULL,
    amount REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (term_id) REFERENCES terms(id),
    FOREIGN KEY (class_id) REFERENCES classes(id)
  );
  CREATE TABLE IF NOT EXISTS fee_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    fee_structure_id INTEGER NOT NULL,
    amount_paid REAL NOT NULL,
    payment_date TEXT NOT NULL,
    payment_method TEXT DEFAULT 'cash',
    receipt_number TEXT DEFAULT '',
    note TEXT DEFAULT '',
    recorded_by INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (fee_structure_id) REFERENCES fee_structures(id)
  );
  CREATE TABLE IF NOT EXISTS timetable (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id INTEGER NOT NULL,
    day TEXT NOT NULL,
    period INTEGER NOT NULL,
    subject TEXT NOT NULL,
    teacher_id INTEGER,
    start_time TEXT DEFAULT '',
    end_time TEXT DEFAULT '',
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id),
    UNIQUE(class_id, day, period)
  );
  CREATE TABLE IF NOT EXISTS notices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    target TEXT DEFAULT 'all',
    created_by INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_name TEXT DEFAULT 'Unto Others International School',
    school_motto TEXT DEFAULT 'Faith and Righteousness',
    school_address TEXT DEFAULT '',
    school_phone TEXT DEFAULT '',
    school_email TEXT DEFAULT '',
    auto_absent_time TEXT DEFAULT '15:00',
    auto_absent_enabled INTEGER DEFAULT 1,
    currency_symbol TEXT DEFAULT 'GH₵'
  );
  INSERT OR IGNORE INTO admins (username, password, full_name)
  VALUES ('admin', '$2b$10$VU1/sp0GXH4ljjkPnm19L.nU9/gRvxkckQtgGAe4RC8s6UgG/mXSm', 'School Administrator');
  INSERT OR IGNORE INTO classes (name, level) VALUES
    ('Nursery 1',1),('Nursery 2',2),
    ('KG 1',3),('KG 2',4),
    ('Primary 1',5),('Primary 2',6),('Primary 3',7),
    ('Primary 4',8),('Primary 5',9),('Primary 6',10),
    ('JSS 1',11),('JSS 2',12),('JSS 3',13);
  INSERT OR IGNORE INTO terms (name, start_date, end_date, is_current)
  VALUES ('First Term 2025/2026', '2025-09-01', '2025-12-15', 1);
  INSERT OR IGNORE INTO settings (school_name, school_motto, currency_symbol)
  VALUES ('Unto Others International School', 'Faith and Righteousness', 'GH₵');
`;
module.exports = schema;
