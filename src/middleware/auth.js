const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;
const blacklist = new Set();

function blacklistToken(token) {
  blacklist.add(token);
  setTimeout(() => blacklist.delete(token), 8 * 60 * 60 * 1000);
}

function requireAdmin(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  if (blacklist.has(token)) return res.status(401).json({ error: 'Session expired. Please login again.' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    req.user = decoded; req.token = token; next();
  } catch(e) {
    if (e.name === 'TokenExpiredError') return res.status(401).json({ error: 'Session expired. Please login again.' });
    res.status(401).json({ error: 'Invalid token' });
  }
}

function requireTeacher(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  if (blacklist.has(token)) return res.status(401).json({ error: 'Session expired. Please login again.' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'teacher' && decoded.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    req.user = decoded; req.token = token; next();
  } catch(e) {
    if (e.name === 'TokenExpiredError') return res.status(401).json({ error: 'Session expired. Please login again.' });
    res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = { requireAdmin, requireTeacher, blacklistToken };
