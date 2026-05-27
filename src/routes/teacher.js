const express = require('express');
const { get, all } = require('../db/database');
const { requireTeacher } = require('../middleware/auth');
const router = express.Router();

router.get('/dashboard', requireTeacher, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const classes = all('SELECT c.* FROM classes c JOIN teacher_classes tc ON tc.class_id=c.id WHERE tc.teacher_id=?', [req.user.id]) || [];
  classes.forEach(c => {
    c.total = (get('SELECT COUNT(*) as n FROM students WHERE class_id=?', [c.id])||{}).n||0;
    c.present = (get('SELECT COUNT(*) as n FROM attendance WHERE class_id=? AND date=? AND status="present"', [c.id,today])||{}).n||0;
    c.absent = (get('SELECT COUNT(*) as n FROM attendance WHERE class_id=? AND date=? AND status="absent"', [c.id,today])||{}).n||0;
    c.late = (get('SELECT COUNT(*) as n FROM attendance WHERE class_id=? AND date=? AND status="late"', [c.id,today])||{}).n||0;
    c.unmarked = c.total - ((get('SELECT COUNT(*) as n FROM attendance WHERE class_id=? AND date=?', [c.id,today])||{}).n||0);
  });
  const notices = all("SELECT * FROM notices WHERE target='all' OR target='teachers' ORDER BY created_at DESC LIMIT 5") || [];
  const term = get('SELECT * FROM terms WHERE is_current=1 ORDER BY id DESC LIMIT 1') || get('SELECT * FROM terms ORDER BY id DESC LIMIT 1') || { name:'First Term', id:1 };
  res.json({
    classes,
    presentToday: classes.reduce((s,c)=>s+c.present,0),
    absentToday: classes.reduce((s,c)=>s+c.absent,0),
    lateToday: classes.reduce((s,c)=>s+c.late,0),
    unmarked: classes.reduce((s,c)=>s+c.unmarked,0),
    notices, term
  });
});

router.get('/my-classes', requireTeacher, (req, res) => {
  res.json(all('SELECT c.* FROM classes c JOIN teacher_classes tc ON tc.class_id=c.id WHERE tc.teacher_id=? ORDER BY c.level', [req.user.id]) || []);
});

router.get('/profile', requireTeacher, (req, res) => {
  res.json(get('SELECT id,username,full_name,email,phone,subject,created_at FROM teachers WHERE id=?', [req.user.id]) || { id: req.user.id, full_name: req.user.name, username: '-' });
});

router.get('/term', requireTeacher, (req, res) => {
  res.json(get('SELECT * FROM terms WHERE is_current=1 ORDER BY id DESC LIMIT 1') || get('SELECT * FROM terms ORDER BY id DESC LIMIT 1') || { name:'First Term', id:1 });
});

router.get('/terms', requireTeacher, (req, res) => {
  res.json(all('SELECT * FROM terms ORDER BY id DESC') || []);
});

router.get('/notices', requireTeacher, (req, res) => {
  res.json(all("SELECT * FROM notices WHERE target='all' OR target='teachers' ORDER BY created_at DESC") || []);
});

module.exports = router;
