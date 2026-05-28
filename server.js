import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { initDatabase, getDb, saveDatabase } from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'unto-others-secret-key-2026';

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

let db;

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token.' });
    }
    req.user = user;
    next();
  });
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
}

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const result = db.exec("SELECT * FROM users WHERE username = ?", [username]);
    
    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    
    const user = result[0].values[0];
    const storedPassword = user[2];
    
    let passwordValid = false;
    if (storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$')) {
      passwordValid = await bcrypt.compare(password, storedPassword);
    } else {
      passwordValid = (password === storedPassword);
      if (passwordValid) {
        const hashedPassword = await bcrypt.hash(storedPassword, 10);
        db.run("UPDATE users SET password = ? WHERE username = ?", [hashedPassword, username]);
        saveDatabase();
      }
    }
    
    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    
    const token = jwt.sign(
      { id: user[0], username: user[1], role: user[3], fullname: user[4] },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      token,
      user: { id: user[0], username: user[1], role: user[3], fullname: user[4] }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed.' });
  }
});

app.post('/api/verify-token', authenticateToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});

app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const totalStudents = db.exec("SELECT COUNT(*) as count FROM students WHERE status = 'active'");
    const totalTeachers = db.exec("SELECT COUNT(*) as count FROM teachers WHERE status = 'active'");
    const todayDate = new Date().toISOString().split('T')[0];
    const todayAttendance = db.exec("SELECT COUNT(*) as count FROM attendance WHERE date = ?", [todayDate]);
    
    res.json({
      students: totalStudents[0]?.values[0]?.[0] || 0,
      teachers: totalTeachers[0]?.values[0]?.[0] || 0,
      todayAttendance: todayAttendance[0]?.values[0]?.[0] || 0,
      classes: 15
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats.' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Students Module
app.get('/api/students', authenticateToken, async (req, res) => {
  try {
    const classFilter = req.query.class;
    let query = "SELECT * FROM students WHERE status = 'active'";
    let params = [];
    if (classFilter) {
      query += " AND class = ?";
      params.push(classFilter);
    }
    query += " ORDER BY fullname";
    const result = db.exec(query, params);
    const students = result.length > 0 ? result[0].values.map(row => ({
      id: row[0], student_id: row[1], fullname: row[2], class: row[3],
      gender: row[4], dob: row[5], address: row[6], parent_phone: row[7],
      enrollment_date: row[8], status: row[9]
    })) : [];
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch students.' });
  }
});

app.post('/api/students', authenticateToken, requireAdmin, async (req, res) => {
  const { fullname, class: className, gender, dob, address, parent_phone } = req.body;
  if (!fullname || !className) {
    return res.status(400).json({ error: 'Fullname and class are required.' });
  }
  try {
    const countResult = db.exec("SELECT COUNT(*) as count FROM students");
    const count = countResult[0]?.values[0]?.[0] || 0;
    const studentId = `STU${new Date().getFullYear()}${String(count + 1).padStart(4, '0')}`;
    db.run("INSERT INTO students (student_id, fullname, class, gender, dob, address, parent_phone) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [studentId, fullname, className, gender || '', dob || '', address || '', parent_phone || '']);
    saveDatabase();
    res.json({ success: true, student_id: studentId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add student.' });
  }
});

app.put('/api/students/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { fullname, class: className, gender, dob, address, parent_phone } = req.body;
  try {
    db.run("UPDATE students SET fullname = ?, class = ?, gender = ?, dob = ?, address = ?, parent_phone = ? WHERE id = ?",
      [fullname, className, gender, dob, address, parent_phone, id]);
    saveDatabase();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update student.' });
  }
});

app.delete('/api/students/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    db.run("UPDATE students SET status = 'inactive' WHERE id = ?", [id]);
    saveDatabase();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete student.' });
  }
});

// Teachers Module
app.get('/api/teachers', authenticateToken, async (req, res) => {
  try {
    const result = db.exec("SELECT * FROM teachers WHERE status = 'active' ORDER BY fullname");
    const teachers = result.length > 0 ? result[0].values.map(row => ({
      id: row[0], teacher_id: row[1], fullname: row[2], email: row[3],
      phone: row[4], subjects: row[5], hire_date: row[6], status: row[7]
    })) : [];
    res.json(teachers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch teachers.' });
  }
});

app.post('/api/teachers', authenticateToken, requireAdmin, async (req, res) => {
  const { fullname, email, phone, subjects } = req.body;
  if (!fullname) return res.status(400).json({ error: 'Fullname is required.' });
  try {
    const countResult = db.exec("SELECT COUNT(*) as count FROM teachers");
    const count = countResult[0]?.values[0]?.[0] || 0;
    const teacherId = `TCH${new Date().getFullYear()}${String(count + 1).padStart(4, '0')}`;
    db.run("INSERT INTO teachers (teacher_id, fullname, email, phone, subjects) VALUES (?, ?, ?, ?, ?)",
      [teacherId, fullname, email || '', phone || '', subjects || '']);
    saveDatabase();
    res.json({ success: true, teacher_id: teacherId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add teacher.' });
  }
});

app.put('/api/teachers/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { fullname, email, phone, subjects } = req.body;
  try {
    db.run("UPDATE teachers SET fullname = ?, email = ?, phone = ?, subjects = ? WHERE id = ?",
      [fullname, email, phone, subjects, id]);
    saveDatabase();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update teacher.' });
  }
});

app.delete('/api/teachers/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    db.run("UPDATE teachers SET status = 'inactive' WHERE id = ?", [id]);
    saveDatabase();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete teacher.' });
  }
});

// Attendance Module
app.get('/api/attendance/students/:class', authenticateToken, async (req, res) => {
  try {
    const result = db.exec("SELECT id, student_id, fullname FROM students WHERE class = ? AND status = 'active' ORDER BY fullname", [req.params.class]);
    const students = result.length > 0 ? result[0].values.map(row => ({ id: row[0], student_id: row[1], fullname: row[2] })) : [];
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch students.' });
  }
});

app.get('/api/attendance/:class/:date', authenticateToken, async (req, res) => {
  try {
    const result = db.exec("SELECT student_id, status FROM attendance WHERE class = ? AND date = ?", [req.params.class, req.params.date]);
    const attendance = {};
    if (result.length > 0) {
      result[0].values.forEach(row => { attendance[row[0]] = row[1]; });
    }
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch attendance.' });
  }
});

app.post('/api/attendance', authenticateToken, async (req, res) => {
  const { class: className, date, attendance } = req.body;
  if (!className || !date || !attendance) {
    return res.status(400).json({ error: 'Class, date, and attendance data required.' });
  }
  try {
    db.run("BEGIN TRANSACTION");
    db.run("DELETE FROM attendance WHERE class = ? AND date = ?", [className, date]);
    for (const [studentId, status] of Object.entries(attendance)) {
      if (status) {
        db.run("INSERT INTO attendance (student_id, class, date, status, marked_by) VALUES (?, ?, ?, ?, ?)",
          [studentId, className, date, status, req.user.id]);
      }
    }
    db.run("COMMIT");
    saveDatabase();
    res.json({ success: true });
  } catch (error) {
    db.run("ROLLBACK");
    res.status(500).json({ error: 'Failed to save attendance.' });
  }
});

// Classes Module
app.get('/api/classes', authenticateToken, async (req, res) => {
  res.json(['Nursery 1', 'Nursery 2', 'KG 1', 'KG 2', 'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6', 'JHS 1', 'JHS 2', 'JHS 3']);
});

app.get('/api/classes/:className/subjects', authenticateToken, async (req, res) => {
  const result = db.exec("SELECT subject_name FROM class_subjects WHERE class_name = ? ORDER BY subject_name", [req.params.className]);
  const subjects = result.length > 0 ? result[0].values.map(row => row[0]) : [];
  res.json(subjects);
});

app.post('/api/classes/:className/subjects', authenticateToken, requireAdmin, async (req, res) => {
  const { subject_name } = req.body;
  if (!subject_name) return res.status(400).json({ error: 'Subject name is required.' });
  try {
    db.run("INSERT OR IGNORE INTO class_subjects (class_name, subject_name) VALUES (?, ?)", [req.params.className, subject_name]);
    saveDatabase();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add subject.' });
  }
});

app.delete('/api/classes/:className/subjects/:subjectName', authenticateToken, requireAdmin, async (req, res) => {
  try {
    db.run("DELETE FROM class_subjects WHERE class_name = ? AND subject_name = ?", [req.params.className, decodeURIComponent(req.params.subjectName)]);
    saveDatabase();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove subject.' });
  }
});

// Holidays Module
app.get('/api/holidays', authenticateToken, async (req, res) => {
  try {
    const result = db.exec("SELECT * FROM holidays ORDER BY holiday_date");
    const holidays = result.length > 0 ? result[0].values.map(row => ({ id: row[0], holiday_date: row[1], name: row[2], description: row[3], is_recurring: row[4] })) : [];
    res.json(holidays);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch holidays.' });
  }
});

app.post('/api/holidays', authenticateToken, requireAdmin, async (req, res) => {
  const { holiday_date, name, description } = req.body;
  if (!holiday_date || !name) return res.status(400).json({ error: 'Date and name are required.' });
  try {
    db.run("INSERT INTO holidays (holiday_date, name, description) VALUES (?, ?, ?)", [holiday_date, name, description || '']);
    saveDatabase();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add holiday.' });
  }
});

app.delete('/api/holidays/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    db.run("DELETE FROM holidays WHERE id = ?", [req.params.id]);
    saveDatabase();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete holiday.' });
  }
});

app.get('/api/is-holiday/:date', authenticateToken, async (req, res) => {
  try {
    const result = db.exec("SELECT name FROM holidays WHERE holiday_date = ?", [req.params.date]);
    const isHoliday = result.length > 0 && result[0].values.length > 0;
    res.json({ isHoliday, holidayName: isHoliday ? result[0].values[0][0] : null });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check holiday.' });
  }
});

async function startServer() {
  db = await initDatabase();
  
  // Create holidays table
  db.run(`CREATE TABLE IF NOT EXISTS holidays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    holiday_date TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_recurring INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  
  // Hash admin password
  const adminResult = db.exec("SELECT password FROM users WHERE username = 'admin'");
  if (adminResult.length > 0 && adminResult[0].values.length > 0) {
    const password = adminResult[0].values[0][0];
    if (!password.startsWith('$2a$') && !password.startsWith('$2b$')) {
      const hashedPassword = await bcrypt.hash(password, 10);
      db.run("UPDATE users SET password = ? WHERE username = 'admin'", [hashedPassword]);
      saveDatabase();
    }
  }
  
  saveDatabase();
  
  app.listen(PORT, () => {
    console.log(`School Management System running on port ${PORT}`);
    console.log(`Admin login: username="admin", password="password"`);
  });
}

startServer().catch(console.error);
