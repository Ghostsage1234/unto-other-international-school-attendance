const express = require('express');
const { get, run, all } = require('../db/database');
const { requireAdmin, requireTeacher } = require('../middleware/auth');
const router = express.Router();

const dayOrder = "CASE day WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 WHEN 'Wednesday' THEN 3 WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5 ELSE 6 END";

router.get('/', requireTeacher, (req, res) => {
  const { class_id, teacher_id } = req.query;
  let sql = `SELECT tt.*,c.name as class_name,t.full_name as teacher_name FROM timetable tt JOIN classes c ON c.id=tt.class_id LEFT JOIN teachers t ON t.id=tt.teacher_id WHERE 1=1`;
  const params = [];
  if (class_id) { sql += ' AND tt.class_id=?'; params.push(class_id); }
  if (teacher_id) { sql += ' AND tt.teacher_id=?'; params.push(teacher_id); }
  res.json(all(sql + ` ORDER BY ${dayOrder},tt.period`, params));
});

router.post('/', requireAdmin, (req, res) => {
  const { class_id, day, period, subject, teacher_id, start_time, end_time } = req.body;
  if (!class_id || !day || !period || !subject) return res.status(400).json({ error: 'class_id, day, period and subject required' });
  const existing = get('SELECT id FROM timetable WHERE class_id=? AND day=? AND period=?', [class_id, day, period]);
  if (existing) {
    run('UPDATE timetable SET subject=?,teacher_id=?,start_time=?,end_time=? WHERE id=?', [subject, teacher_id||null, start_time||'', end_time||'', existing.id]);
    return res.json({ message: 'Updated' });
  }
  run('INSERT INTO timetable (class_id,day,period,subject,teacher_id,start_time,end_time) VALUES (?,?,?,?,?,?,?)', [class_id, day, period, subject, teacher_id||null, start_time||'', end_time||'']);
  res.json({ message: 'Added' });
});

router.delete('/:id', requireAdmin, (req, res) => {
  run('DELETE FROM timetable WHERE id=?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

module.exports = router;
