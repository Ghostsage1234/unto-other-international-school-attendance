const express = require('express');
const { get, run, all } = require('../db/database');
const { requireAdmin, requireTeacher } = require('../middleware/auth');
const router = express.Router();

function calcGrade(total) {
  if (total >= 75) return { grade: 'A', remark: 'Excellent' };
  if (total >= 65) return { grade: 'B', remark: 'Very Good' };
  if (total >= 55) return { grade: 'C', remark: 'Good' };
  if (total >= 45) return { grade: 'D', remark: 'Pass' };
  if (total >= 40) return { grade: 'E', remark: 'Fair' };
  return { grade: 'F', remark: 'Fail' };
}

router.get('/subjects', requireTeacher, (req, res) => {
  const { class_id } = req.query;
  if (!class_id) return res.status(400).json({ error: 'class_id required' });
  res.json(all('SELECT s.*,t.full_name as teacher_name FROM subjects s LEFT JOIN teachers t ON t.id=s.teacher_id WHERE s.class_id=? ORDER BY s.name', [class_id]));
});

router.post('/subjects', requireAdmin, (req, res) => {
  const { name, class_id, teacher_id } = req.body;
  if (!name || !class_id) return res.status(400).json({ error: 'Name and class required' });
  if (get('SELECT id FROM subjects WHERE LOWER(name)=LOWER(?) AND class_id=?', [name, class_id])) return res.status(400).json({ error: 'Subject already exists for this class' });
  run('INSERT INTO subjects (name,class_id,teacher_id) VALUES (?,?,?)', [name, class_id, teacher_id||null]);
  res.json({ message: 'Subject added' });
});

router.delete('/subjects/:id', requireAdmin, (req, res) => {
  run('DELETE FROM subjects WHERE id=?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

router.post('/enter', requireTeacher, (req, res) => {
  const { student_id, subject_id, term_id, ca1, ca2, exam } = req.body;
  if (!student_id || !subject_id || !term_id) return res.status(400).json({ error: 'Required fields missing' });
  const total = (parseFloat(ca1)||0) + (parseFloat(ca2)||0) + (parseFloat(exam)||0);
  const { grade, remark } = calcGrade(total);
  const existing = get('SELECT id FROM grades WHERE student_id=? AND subject_id=? AND term_id=?', [student_id, subject_id, term_id]);
  if (existing) {
    run('UPDATE grades SET ca1=?,ca2=?,exam=?,total=?,grade=?,remark=? WHERE id=?', [ca1||0, ca2||0, exam||0, total, grade, remark, existing.id]);
  } else {
    run('INSERT INTO grades (student_id,subject_id,term_id,ca1,ca2,exam,total,grade,remark) VALUES (?,?,?,?,?,?,?,?,?)', [student_id, subject_id, term_id, ca1||0, ca2||0, exam||0, total, grade, remark]);
  }
  res.json({ message: 'Saved', total, grade, remark });
});

router.get('/class', requireTeacher, (req, res) => {
  const { class_id, term_id, subject_id } = req.query;
  if (!class_id || !term_id) return res.status(400).json({ error: 'class_id and term_id required' });
  let sql = 'SELECT g.*,s.full_name,s.admission_number,sub.name as subject_name FROM grades g JOIN students s ON s.id=g.student_id JOIN subjects sub ON sub.id=g.subject_id WHERE s.class_id=? AND g.term_id=?';
  const params = [class_id, term_id];
  if (subject_id) { sql += ' AND g.subject_id=?'; params.push(subject_id); }
  res.json(all(sql + ' ORDER BY s.full_name,sub.name', params));
});

router.get('/bulk/:class_id/:subject_id/:term_id', requireTeacher, (req, res) => {
  const { class_id, subject_id, term_id } = req.params;
  const students = all('SELECT * FROM students WHERE class_id=? ORDER BY full_name', [class_id]);
  res.json(students.map(s => ({
    student: s,
    grade: get('SELECT * FROM grades WHERE student_id=? AND subject_id=? AND term_id=?', [s.id, subject_id, term_id]) || { ca1:0, ca2:0, exam:0, total:0, grade:'', remark:'' }
  })));
});

router.get('/report-card/:student_id', requireTeacher, (req, res) => {
  const { term_id } = req.query;
  if (!term_id) return res.status(400).json({ error: 'term_id required' });
  const student = get('SELECT s.*,c.name as class_name FROM students s JOIN classes c ON c.id=s.class_id WHERE s.id=?', [req.params.student_id]);
  if (!student) return res.status(404).json({ error: 'Not found' });
  const term = get('SELECT * FROM terms WHERE id=?', [term_id]);
  const grades = all('SELECT g.*,sub.name as subject_name FROM grades g JOIN subjects sub ON sub.id=g.subject_id WHERE g.student_id=? AND g.term_id=? ORDER BY sub.name', [req.params.student_id, term_id]);
  const avg = grades.length ? (grades.reduce((s,g) => s+g.total, 0) / grades.length).toFixed(1) : 0;
  const { grade: overallGrade, remark: overallRemark } = calcGrade(parseFloat(avg));
  const attendance = get('SELECT COUNT(*) as total, SUM(CASE WHEN status="present" THEN 1 ELSE 0 END) as present FROM attendance WHERE student_id=?', [req.params.student_id]) || { total:0, present:0 };
  const settings = get('SELECT * FROM settings LIMIT 1') || {};
  res.json({ student, term, grades, average: avg, overallGrade, overallRemark, attendance, settings });
});

router.get('/class-result/:class_id/:term_id', requireTeacher, (req, res) => {
  const { class_id, term_id } = req.params;
  const students = all('SELECT * FROM students WHERE class_id=? ORDER BY full_name', [class_id]);
  const subjects = all('SELECT * FROM subjects WHERE class_id=? ORDER BY name', [class_id]);
  const result = students.map(s => {
    const grades = all('SELECT g.*,sub.name as subject_name FROM grades g JOIN subjects sub ON sub.id=g.subject_id WHERE g.student_id=? AND g.term_id=?', [s.id, term_id]);
    const avg = grades.length ? (grades.reduce((sum,g) => sum+g.total, 0) / grades.length).toFixed(1) : 0;
    return { ...s, grades, average: parseFloat(avg), ...calcGrade(parseFloat(avg)) };
  });
  result.sort((a,b) => b.average - a.average);
  result.forEach((s,i) => { s.position = i+1; });
  res.json({ students: result, subjects });
});

module.exports = router;
