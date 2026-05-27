const express = require('express');
const bcrypt = require('bcryptjs');
const { run, get, all } = require('../db/database');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

// ── SETTINGS ──────────────────────────────────────────────
router.get('/settings', requireAdmin, (req, res) => {
  res.json(get('SELECT * FROM settings LIMIT 1') || {});
});
router.put('/settings', requireAdmin, (req, res) => {
  const { school_name, school_motto, school_address, school_phone, school_email, auto_absent_time, auto_absent_enabled, currency_symbol } = req.body;
  const s = get('SELECT id FROM settings LIMIT 1');
  if (s) {
    run('UPDATE settings SET school_name=?,school_motto=?,school_address=?,school_phone=?,school_email=?,auto_absent_time=?,auto_absent_enabled=?,currency_symbol=? WHERE id=?',
      [school_name, school_motto, school_address||'', school_phone||'', school_email||'', auto_absent_time||'15:00', auto_absent_enabled?1:0, currency_symbol||'GH₵', s.id]);
  }
  res.json({ message: 'Settings saved' });
});

// ── CLASSES ───────────────────────────────────────────────
router.get('/classes', requireAdmin, (req, res) => {
  res.json(all('SELECT * FROM classes ORDER BY level'));
});

// ── TEACHERS ──────────────────────────────────────────────
router.get('/teachers', requireAdmin, (req, res) => {
  const teachers = all('SELECT id,username,full_name,email,phone,subject,created_at FROM teachers ORDER BY full_name');
  teachers.forEach(t => {
    t.classes = all('SELECT c.id,c.name FROM classes c JOIN teacher_classes tc ON tc.class_id=c.id WHERE tc.teacher_id=?', [t.id]);
  });
  res.json(teachers);
});
router.post('/teachers', requireAdmin, async (req, res) => {
  const { username, password, full_name, email, phone, subject } = req.body;
  if (!username || !password || !full_name) return res.status(400).json({ error: 'Name, username and password required' });
  if (get('SELECT id FROM teachers WHERE LOWER(username)=LOWER(?)', [username])) return res.status(400).json({ error: 'Username already exists' });
  run('INSERT INTO teachers (username,password,full_name,email,phone,subject) VALUES (?,?,?,?,?,?)',
    [username, await bcrypt.hash(password, 10), full_name, email||'', phone||'', subject||'']);
  res.json({ message: 'Teacher created' });
});
router.put('/teachers/:id', requireAdmin, (req, res) => {
  const { full_name, email, phone, subject } = req.body;
  run('UPDATE teachers SET full_name=?,email=?,phone=?,subject=? WHERE id=?',
    [full_name, email||'', phone||'', subject||'', req.params.id]);
  res.json({ message: 'Teacher updated' });
});
router.delete('/teachers/:id', requireAdmin, (req, res) => {
  run('DELETE FROM teachers WHERE id=?', [req.params.id]);
  res.json({ message: 'Teacher deleted' });
});
router.post('/teachers/:id/classes', requireAdmin, (req, res) => {
  const { class_ids } = req.body;
  run('DELETE FROM teacher_classes WHERE teacher_id=?', [req.params.id]);
  (class_ids||[]).forEach(cid => {
    try { run('INSERT INTO teacher_classes (teacher_id,class_id) VALUES (?,?)', [req.params.id, cid]); } catch(e) {}
  });
  res.json({ message: 'Classes assigned' });
});
router.post('/teachers/:id/reset-password', requireAdmin, async (req, res) => {
  const { new_password } = req.body;
  if (!new_password || new_password.length < 6) return res.status(400).json({ error: 'Min 6 characters' });
  run('UPDATE teachers SET password=? WHERE id=?', [await bcrypt.hash(new_password, 10), req.params.id]);
  res.json({ message: 'Password reset' });
});

// ── STUDENTS ──────────────────────────────────────────────
router.get('/students', requireAdmin, (req, res) => {
  const { class_id } = req.query;
  let sql = 'SELECT s.*,c.name as class_name FROM students s JOIN classes c ON c.id=s.class_id';
  const params = [];
  if (class_id) { sql += ' WHERE s.class_id=?'; params.push(class_id); }
  sql += ' ORDER BY c.level,s.full_name';
  const students = all(sql, params);
  students.forEach(s => {
    const a = get('SELECT COUNT(*) as total, SUM(CASE WHEN status="present" THEN 1 ELSE 0 END) as present, SUM(CASE WHEN status="absent" THEN 1 ELSE 0 END) as absent, SUM(CASE WHEN status="late" THEN 1 ELSE 0 END) as late FROM attendance WHERE student_id=?', [s.id]);
    s.stats = a || { total:0, present:0, absent:0, late:0 };
  });
  res.json(students);
});
router.post('/students', requireAdmin, (req, res) => {
  const { admission_number, full_name, class_id, gender, date_of_birth, parent_name, parent_phone, address } = req.body;
  if (!admission_number || !full_name || !class_id) return res.status(400).json({ error: 'Admission number, name and class required' });
  if (get('SELECT id FROM students WHERE admission_number=?', [admission_number])) return res.status(400).json({ error: 'Admission number already exists' });
  run('INSERT INTO students (admission_number,full_name,class_id,gender,date_of_birth,parent_name,parent_phone,address) VALUES (?,?,?,?,?,?,?,?)',
    [admission_number, full_name, class_id, gender||'', date_of_birth||'', parent_name||'', parent_phone||'', address||'']);
  res.json({ message: 'Student added' });
});
router.put('/students/:id', requireAdmin, (req, res) => {
  const { full_name, class_id, gender, date_of_birth, parent_name, parent_phone, address } = req.body;
  run('UPDATE students SET full_name=?,class_id=?,gender=?,date_of_birth=?,parent_name=?,parent_phone=?,address=? WHERE id=?',
    [full_name, class_id, gender||'', date_of_birth||'', parent_name||'', parent_phone||'', address||'', req.params.id]);
  res.json({ message: 'Student updated' });
});
router.delete('/students/:id', requireAdmin, (req, res) => {
  run('DELETE FROM students WHERE id=?', [req.params.id]);
  res.json({ message: 'Student deleted' });
});

// ── DASHBOARD ─────────────────────────────────────────────
router.get('/dashboard', requireAdmin, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const totalStudents = (get('SELECT COUNT(*) as c FROM students') || {}).c || 0;
  const totalTeachers = (get('SELECT COUNT(*) as c FROM teachers') || {}).c || 0;
  const present = (get('SELECT COUNT(*) as c FROM attendance WHERE date=? AND status="present"', [today]) || {}).c || 0;
  const absent = (get('SELECT COUNT(*) as c FROM attendance WHERE date=? AND status="absent"', [today]) || {}).c || 0;
  const late = (get('SELECT COUNT(*) as c FROM attendance WHERE date=? AND status="late"', [today]) || {}).c || 0;
  const unmarked = (get('SELECT COUNT(*) as c FROM students s WHERE NOT EXISTS (SELECT 1 FROM attendance a WHERE a.student_id=s.id AND a.date=?)', [today]) || {}).c || 0;
  const byClass = all('SELECT c.id,c.name,COUNT(s.id) as total FROM classes c LEFT JOIN students s ON s.class_id=c.id GROUP BY c.id ORDER BY c.level');
  byClass.forEach(c => {
    c.present = (get('SELECT COUNT(*) as n FROM attendance WHERE class_id=? AND date=? AND status="present"', [c.id, today]) || {}).n || 0;
    c.absent = (get('SELECT COUNT(*) as n FROM attendance WHERE class_id=? AND date=? AND status="absent"', [c.id, today]) || {}).n || 0;
    c.late = (get('SELECT COUNT(*) as n FROM attendance WHERE class_id=? AND date=? AND status="late"', [c.id, today]) || {}).n || 0;
  });
  res.json({ today, totalStudents, totalTeachers, present, absent, late, unmarked, byClass });
});

// ── ATTENDANCE ────────────────────────────────────────────
router.get('/attendance', requireAdmin, (req, res) => {
  const { date, class_id } = req.query;
  let sql = `SELECT a.*,s.full_name,s.admission_number,c.name as class_name,
    COALESCE(t.full_name,'System') as teacher_name
    FROM attendance a JOIN students s ON s.id=a.student_id
    JOIN classes c ON c.id=a.class_id
    LEFT JOIN teachers t ON t.id=a.teacher_id WHERE 1=1`;
  const params = [];
  if (date) { sql += ' AND a.date=?'; params.push(date); }
  if (class_id) { sql += ' AND a.class_id=?'; params.push(class_id); }
  sql += ' ORDER BY a.date DESC,s.full_name';
  res.json(all(sql, params));
});
router.put('/attendance/:id', requireAdmin, (req, res) => {
  run('UPDATE attendance SET status=? WHERE id=?', [req.body.status, req.params.id]);
  res.json({ message: 'Updated' });
});
router.get('/attendance/export', requireAdmin, (req, res) => {
  const { class_id, from, to } = req.query;
  let sql = `SELECT s.full_name,s.admission_number,c.name as class_name,a.date,a.status,
    COALESCE(t.full_name,'System') as teacher
    FROM attendance a JOIN students s ON s.id=a.student_id
    JOIN classes c ON c.id=a.class_id LEFT JOIN teachers t ON t.id=a.teacher_id WHERE 1=1`;
  const params = [];
  if (class_id) { sql += ' AND a.class_id=?'; params.push(class_id); }
  if (from) { sql += ' AND a.date>=?'; params.push(from); }
  if (to) { sql += ' AND a.date<=?'; params.push(to); }
  sql += ' ORDER BY a.date,s.full_name';
  const rows = all(sql, params);
  const csv = ['Student,Admission No,Class,Date,Status,Teacher',
    ...rows.map(r => `"${r.full_name}","${r.admission_number}","${r.class_name}","${r.date}","${r.status}","${r.teacher}"`)
  ].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=attendance.csv');
  res.send(csv);
});

// ── HOLIDAYS ──────────────────────────────────────────────
router.get('/holidays', requireAdmin, (req, res) => {
  res.json(all('SELECT * FROM holidays ORDER BY date'));
});
router.post('/holidays', requireAdmin, (req, res) => {
  const { date, name } = req.body;
  if (!date || !name) return res.status(400).json({ error: 'Date and name required' });
  if (get('SELECT id FROM holidays WHERE date=?', [date])) return res.status(400).json({ error: 'Holiday already exists for this date' });
  run('INSERT INTO holidays (date,name) VALUES (?,?)', [date, name]);
  res.json({ message: 'Holiday added' });
});
router.delete('/holidays/:id', requireAdmin, (req, res) => {
  run('DELETE FROM holidays WHERE id=?', [req.params.id]);
  res.json({ message: 'Removed' });
});

// ── TERMS ─────────────────────────────────────────────────
router.get('/terms', requireAdmin, (req, res) => {
  res.json(all('SELECT * FROM terms ORDER BY id DESC'));
});
router.get('/current-term', (req, res) => {
  res.json(get('SELECT * FROM terms WHERE is_current=1 ORDER BY id DESC LIMIT 1') || get('SELECT * FROM terms ORDER BY id DESC LIMIT 1') || { name:'No Term', id:0 });
});
router.post('/terms', requireAdmin, (req, res) => {
  const { name, start_date, end_date } = req.body;
  if (!name) return res.status(400).json({ error: 'Term name required' });
  if (!req.body.confirmed) return res.status(400).json({ error: 'Please confirm' });
  run('UPDATE terms SET is_current=0');
  run('DELETE FROM attendance');
  run('DELETE FROM auto_absent_log');
  run('INSERT INTO terms (name,start_date,end_date,is_current) VALUES (?,?,?,1)', [name, start_date||'', end_date||'']);
  res.json({ message: `New term "${name}" started` });
});

// ── NOTICES ───────────────────────────────────────────────
router.get('/notices', (req, res) => {
  res.json(all('SELECT * FROM notices ORDER BY created_at DESC LIMIT 20'));
});
router.post('/notices', requireAdmin, (req, res) => {
  const { title, body, target } = req.body;
  if (!title || !body) return res.status(400).json({ error: 'Title and body required' });
  run('INSERT INTO notices (title,body,target,created_by) VALUES (?,?,?,?)', [title, body, target||'all', req.user.id]);
  res.json({ message: 'Notice posted' });
});
router.delete('/notices/:id', requireAdmin, (req, res) => {
  run('DELETE FROM notices WHERE id=?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

// ── AUTO ABSENT ───────────────────────────────────────────
function markAbsentUnmarked() {
  const today = new Date().toISOString().split('T')[0];
  const dayOfWeek = new Date(today + 'T12:00:00').getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) return 0;
  const holiday = get('SELECT id FROM holidays WHERE date=?', [today]);
  if (holiday) return 0;
  const unmarked = all('SELECT s.id,s.class_id FROM students s WHERE NOT EXISTS (SELECT 1 FROM attendance a WHERE a.student_id=s.id AND a.date=?)', [today]);
  let count = 0;
  unmarked.forEach(s => {
    try {
      run('INSERT OR IGNORE INTO attendance (student_id,class_id,teacher_id,date,status) VALUES (?,?,0,?,"absent")', [s.id, s.class_id, today]);
      run('INSERT INTO auto_absent_log (student_id,class_id,date) VALUES (?,?,?)', [s.id, s.class_id, today]);
      count++;
    } catch(e) {}
  });
  return count;
}
router.post('/auto-absent', requireAdmin, (req, res) => {
  const count = markAbsentUnmarked();
  res.json({ message: `${count} students marked absent` });
});
router.get('/absent-log', requireAdmin, (req, res) => {
  const date = req.query.date || new Date().toISOString().split('T')[0];
  res.json(all('SELECT al.*,s.full_name,s.admission_number,c.name as class_name FROM auto_absent_log al JOIN students s ON s.id=al.student_id JOIN classes c ON c.id=al.class_id WHERE al.date=? ORDER BY al.marked_at DESC', [date]));
});
router.get('/check-day', (req, res) => {
  const date = req.query.date || new Date().toISOString().split('T')[0];
  const day = new Date(date + 'T12:00:00').getDay();
  const isWeekend = day === 0 || day === 6;
  const holiday = get('SELECT * FROM holidays WHERE date=?', [date]);
  res.json({ date, isWeekend, isHoliday: !!holiday, holidayName: holiday?.name || null, canMark: !isWeekend && !holiday });
});

// patch: delete term
router.delete('/terms/:id', requireAdmin, (req, res) => {
  const current = require('../db/database').get(
    'SELECT is_current FROM terms WHERE id=?',
    [req.params.id]
  );

  if (current && current.is_current) {
    return res.status(400).json({
      error: 'Cannot delete the current term. Set another term as current first.'
    });
  }

  require('../db/database').run(
    'DELETE FROM terms WHERE id=?',
    [req.params.id]
  );

  res.json({ message: 'Term deleted' });
});

router.markAbsentUnmarked = markAbsentUnmarked;
module.exports = router;
