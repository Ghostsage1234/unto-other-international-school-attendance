const express = require('express');
const { get, run, all } = require('../db/database');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

router.get('/structures', requireAdmin, (req, res) => {
  const { term_id, class_id } = req.query;
  let sql = 'SELECT fs.*,t.name as term_name,c.name as class_name FROM fee_structures fs JOIN terms t ON t.id=fs.term_id JOIN classes c ON c.id=fs.class_id WHERE 1=1';
  const params = [];
  if (term_id) { sql += ' AND fs.term_id=?'; params.push(term_id); }
  if (class_id) { sql += ' AND fs.class_id=?'; params.push(class_id); }
  res.json(all(sql + ' ORDER BY c.level,fs.label', params));
});

router.post('/structures', requireAdmin, (req, res) => {
  const { term_id, class_id, label, amount } = req.body;
  if (!term_id || !class_id || !label || !amount) return res.status(400).json({ error: 'All fields required' });
  run('INSERT INTO fee_structures (term_id,class_id,label,amount) VALUES (?,?,?,?)', [term_id, class_id, label, amount]);
  res.json({ message: 'Fee structure added' });
});

router.delete('/structures/:id', requireAdmin, (req, res) => {
  run('DELETE FROM fee_structures WHERE id=?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

router.get('/payments', requireAdmin, (req, res) => {
  const { student_id, term_id } = req.query;
  let sql = 'SELECT fp.*,s.full_name,s.admission_number,fs.label,fs.amount as fee_amount,c.name as class_name,t.name as term_name FROM fee_payments fp JOIN students s ON s.id=fp.student_id JOIN fee_structures fs ON fs.id=fp.fee_structure_id JOIN classes c ON c.id=fs.class_id JOIN terms t ON t.id=fs.term_id WHERE 1=1';
  const params = [];
  if (student_id) { sql += ' AND fp.student_id=?'; params.push(student_id); }
  if (term_id) { sql += ' AND fs.term_id=?'; params.push(term_id); }
  res.json(all(sql + ' ORDER BY fp.payment_date DESC', params));
});

router.post('/payments', requireAdmin, (req, res) => {
  const { student_id, fee_structure_id, amount_paid, payment_date, payment_method, receipt_number, note } = req.body;
  if (!student_id || !fee_structure_id || !amount_paid || !payment_date) return res.status(400).json({ error: 'Required fields missing' });
  run('INSERT INTO fee_payments (student_id,fee_structure_id,amount_paid,payment_date,payment_method,receipt_number,note,recorded_by) VALUES (?,?,?,?,?,?,?,?)',
    [student_id, fee_structure_id, amount_paid, payment_date, payment_method||'cash', receipt_number||'', note||'', req.user.id]);
  res.json({ message: 'Payment recorded' });
});

router.delete('/payments/:id', requireAdmin, (req, res) => {
  run('DELETE FROM fee_payments WHERE id=?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

router.get('/student-balance/:student_id', requireAdmin, (req, res) => {
  const { term_id } = req.query;
  if (!term_id) return res.status(400).json({ error: 'term_id required' });
  const student = get('SELECT s.*,c.name as class_name FROM students s JOIN classes c ON c.id=s.class_id WHERE s.id=?', [req.params.student_id]);
  if (!student) return res.status(404).json({ error: 'Not found' });
  const structures = all('SELECT * FROM fee_structures WHERE term_id=? AND class_id=?', [term_id, student.class_id]);
  const fees = structures.map(fs => {
    const paid = (get('SELECT SUM(amount_paid) as total FROM fee_payments WHERE student_id=? AND fee_structure_id=?', [student.id, fs.id]) || {}).total || 0;
    return { ...fs, paid, balance: fs.amount - paid, status: paid >= fs.amount ? 'paid' : paid > 0 ? 'partial' : 'unpaid' };
  });
  const totalFee = fees.reduce((s, f) => s + f.amount, 0);
  const totalPaid = fees.reduce((s, f) => s + f.paid, 0);
  res.json({ student, fees, totalFee, totalPaid, balance: totalFee - totalPaid });
});

router.get('/class-summary', requireAdmin, (req, res) => {
  const { class_id, term_id } = req.query;
  if (!class_id || !term_id) return res.status(400).json({ error: 'class_id and term_id required' });
  const students = all('SELECT * FROM students WHERE class_id=? ORDER BY full_name', [class_id]);
  const structures = all('SELECT * FROM fee_structures WHERE term_id=? AND class_id=?', [term_id, class_id]);
  const totalFee = structures.reduce((s, f) => s + f.amount, 0);
  const result = students.map(s => {
    const paid = (get('SELECT SUM(fp.amount_paid) as total FROM fee_payments fp JOIN fee_structures fs ON fs.id=fp.fee_structure_id WHERE fp.student_id=? AND fs.term_id=? AND fs.class_id=?', [s.id, term_id, class_id]) || {}).total || 0;
    return { ...s, totalFee, paid, balance: totalFee - paid, status: paid >= totalFee ? 'paid' : paid > 0 ? 'partial' : 'unpaid' };
  });
  res.json(result);
});

module.exports = router;
