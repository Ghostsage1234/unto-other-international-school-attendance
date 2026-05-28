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

// Middleware to verify JWT token
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

// Middleware to check admin role
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
}

// Auth Routes
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required.' });
  }
  
  try {
    const result = db.exec("SELECT * FROM users WHERE username = ?", [username]);
    
    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    
    const user = result[0].values[0];
    const storedPassword = user[2];
    
    // Check if password is hashed or plain
    let passwordValid = false;
    if (storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$')) {
      passwordValid = await bcrypt.compare(password, storedPassword);
    } else {
      // For default admin password, compare directly then hash it
      passwordValid = (password === storedPassword);
      if (passwordValid && storedPassword !== '$2a$10$hashed') {
        // Hash the password for next time
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
      user: {
        id: user[0],
        username: user[1],
        role: user[3],
        fullname: user[4]
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed.' });
  }
});

app.post('/api/verify-token', authenticateToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// Dashboard stats
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
      classes: 15 // Nursery 1-2, KG 1-2, Primary 1-6, JSS 1-3
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats.' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize database and start server
async function startServer() {
  db = await initDatabase();
  
  // Hash default admin password if it's plain text
  const adminResult = db.exec("SELECT password FROM users WHERE username = 'admin'");
  if (adminResult.length > 0 && adminResult[0].values.length > 0) {
    const password = adminResult[0].values[0][0];
    if (!password.startsWith('$2a$') && !password.startsWith('$2b$')) {
      const hashedPassword = await bcrypt.hash(password, 10);
      db.run("UPDATE users SET password = ? WHERE username = 'admin'", [hashedPassword]);
      saveDatabase();
    }
  }
  
  app.listen(PORT, () => {
    console.log(`School Management System running on port ${PORT}`);
    console.log(`Admin login: username="admin", password="password"`);
  });
}

startServer().catch(console.error);
