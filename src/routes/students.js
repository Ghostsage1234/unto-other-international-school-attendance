const express = require('express');
const QRCode = require('qrcode');
const { get, all } = require('../db/database');
const { requireTeacher } = require('../middleware/auth');
const router = express.Router();

router.get('/:id/qr', requireTeacher, async (req, res) => {
  const student = get('SELECT s.*,c.name as class_name FROM students s JOIN classes c ON c.id=s.class_id WHERE s.id=?', [req.params.id]);
  if (!student) return res.status(404).json({ error: 'Student not found' });
  const qr = await QRCode.toDataURL(JSON.stringify({ student_id: student.id, admission: student.admission_number }), { width: 300, margin: 2 });
  res.json({ qr, student });
});

router.get('/:id/profile', requireTeacher, (req, res) => {
  const student = get('SELECT s.*,c.name as class_name FROM students s JOIN classes c ON c.id=s.class_id WHERE s.id=?', [req.params.id]);
  if (!student) return res.status(404).json({ error: 'Not found' });
  const stats = get('SELECT COUNT(*) as total, SUM(CASE WHEN status="present" THEN 1 ELSE 0 END) as present, SUM(CASE WHEN status="absent" THEN 1 ELSE 0 END) as absent, SUM(CASE WHEN status="late" THEN 1 ELSE 0 END) as late FROM attendance WHERE student_id=?', [student.id]);
  res.json({ ...student, stats: stats || { total:0, present:0, absent:0, late:0 } });
});

module.exports = router;
