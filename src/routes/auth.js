const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { get, run } = require('../db/database');
const { blacklistToken } = require('../middleware/auth');
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

const failed = new Map();
function recordFail(key) {
  failed.set(key, (failed.get(key) || 0) + 1);
  setTimeout(() => failed.delete(key), 15 * 60 * 1000);
}

router.post('/admin/login', async (req, res) => {
  const username = (req.body.username || '').trim();
  const password = req.body.password || '';
  if (!username || !password) return res.status(400).json({ error: 'All fields required' });
  const admin = get('SELECT * FROM admins WHERE LOWER(username) = LOWER(?)', [username]);
  if (!admin) {
    recordFail(username);
    await new Promise(r => setTimeout(r, 800));
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const valid = await bcrypt.compare(password, admin.password);
  if (!valid) {
    recordFail(username);
    await new Promise(r => setTimeout(r, 800));
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  failed.delete(username);
  const token = jwt.sign({ id: admin.id, role: 'admin', name: admin.full_name }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, name: admin.full_name, role: 'admin' });
});

router.post('/teacher/login', async (req, res) => {
  const username = (req.body.username || '').trim();
  const password = req.body.password || '';
  if (!username || !password) return res.status(400).json({ error: 'All fields required' });
  const teacher = get('SELECT * FROM teachers WHERE LOWER(username) = LOWER(?)', [username]);
  if (!teacher) {
    recordFail(username);
    await new Promise(r => setTimeout(r, 800));
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const valid = await bcrypt.compare(password, teacher.password);
  if (!valid) {
    recordFail(username);
    await new Promise(r => setTimeout(r, 800));
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  failed.delete(username);
  const token = jwt.sign({ id: teacher.id, role: 'teacher', name: teacher.full_name }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, name: teacher.full_name, role: 'teacher' });
});

router.post('/logout', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) blacklistToken(token);
  res.json({ message: 'Logged out' });
});

router.post('/admin/change-password', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) return res.status(400).json({ error: 'All fields required' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'Min 6 characters' });
    const admin = get('SELECT * FROM admins WHERE id = ?', [decoded.id]);
    const valid = await bcrypt.compare(oldPassword, admin.password);
    if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });
    run('UPDATE admins SET password = ? WHERE id = ?', [await bcrypt.hash(newPassword, 10), decoded.id]);
    blacklistToken(token);
    res.json({ message: 'Password changed. Please login again.' });
  } catch(e) { res.status(401).json({ error: 'Invalid token' }); }
});

router.post('/teacher/change-password', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'teacher') return res.status(403).json({ error: 'Forbidden' });
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) return res.status(400).json({ error: 'All fields required' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'Min 6 characters' });
    const teacher = get('SELECT * FROM teachers WHERE id = ?', [decoded.id]);
    const valid = await bcrypt.compare(oldPassword, teacher.password);
    if (!valid) return res.status(400).json({ error: 'Old password incorrect' });
    run('UPDATE teachers SET password = ? WHERE id = ?', [await bcrypt.hash(newPassword, 10), decoded.id]);
    blacklistToken(token);
    res.json({ message: 'Password changed. Please login again.' });
  } catch(e) { res.status(401).json({ error: 'Invalid token' }); }
});

module.exports = router;
