const express = require('express');
const { get, run, all } = require('../db/database');
const { requireTeacher, requireAdmin } = require('../middleware/auth');
const router = express.Router();

function canMark(date) {
  const day = new Date(date + 'T12:00:00').getDay();
  if (day === 0 || day === 6) return { ok: false, reason: `Cannot mark on ${day===0?'Sunday':'Saturday'}` };
  const h = get('SELECT * FROM holidays WHERE date=?', [date]);
  if (h) return { ok: false, reason: `Holiday: ${h.name}` };
  return { ok: true };
}

router.post('/scan', requireTeacher, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const check = canMark(today);
  if (!check.ok) return res.status(403).json({ error: check.reason });
  let parsed;
  try { parsed = JSON.parse(req.body.qr_data); } catch(e) { return res.status(400).json({ error: 'Invalid QR code' }); }
  const student = get('SELECT s.*,c.name as class_name FROM students s JOIN classes c ON c.id=s.class_id WHERE s.id=?', [parsed.student_id]);
  if (!student) return res.status(404).json({ error: 'Student not found' });
  if (req.user.role === 'teacher') {
    const assigned = get('SELECT id FROM teacher_classes WHERE teacher_id=? AND class_id=?', [req.user.id, student.class_id]);
    if (!assigned) return res.status(403).json({ error: 'This student is not in your class' });
  }
  const existing = get('SELECT * FROM attendance WHERE student_id=? AND date=?', [student.id, today]);
  if (existing) return res.status(409).json({ error: `${student.full_name} already marked as ${existing.status}`, already_marked: true });
  const status = req.body.status || 'present';
  run('INSERT INTO attendance (student_id,class_id,teacher_id,date,status) VALUES (?,?,?,?,?)', [student.id, student.class_id, req.user.id, today, status]);
  res.json({ message: `${student.full_name} marked ${status}`, student });
});

router.post('/manual', requireTeacher, (req, res) => {
  const { student_id, status, date } = req.body;
  const markDate = date || new Date().toISOString().split('T')[0];
  if (req.user.role === 'teacher') {
    const check = canMark(markDate);
    if (!check.ok) return res.status(403).json({ error: check.reason });
  }
  const student = get('SELECT * FROM students WHERE id=?', [student_id]);
  if (!student) return res.status(404).json({ error: 'Student not found' });
  if (req.user.role === 'teacher') {
    const assigned = get('SELECT id FROM teacher_classes WHERE teacher_id=? AND class_id=?', [req.user.id, student.class_id]);
    if (!assigned) return res.status(403).json({ error: 'Not your class' });
  }
  const existing = get('SELECT * FROM attendance WHERE student_id=? AND date=?', [student_id, markDate]);
  if (existing) {
    run('UPDATE attendance SET status=?,teacher_id=? WHERE id=?', [status, req.user.id, existing.id]);
    return res.json({ message: 'Updated' });
  }
  run('INSERT INTO attendance (student_id,class_id,teacher_id,date,status) VALUES (?,?,?,?,?)', [student_id, student.class_id, req.user.id, markDate, status]);
  res.json({ message: `Marked ${status}` });
});

router.get('/today', requireTeacher, (req, res) => {
  const { class_id, date } = req.query;
  if (!class_id) return res.status(400).json({ error: 'class_id required' });
  const d = date || new Date().toISOString().split('T')[0];
  if (req.user.role === 'teacher') {
    const assigned = get('SELECT id FROM teacher_classes WHERE teacher_id=? AND class_id=?', [req.user.id, class_id]);
    if (!assigned) return res.status(403).json({ error: 'Not your class' });
  }
  res.json(all('SELECT s.id,s.full_name,s.admission_number,a.status,a.marked_at FROM students s LEFT JOIN attendance a ON a.student_id=s.id AND a.date=? WHERE s.class_id=? ORDER BY s.full_name', [d, class_id]));
});

module.exports = router;
