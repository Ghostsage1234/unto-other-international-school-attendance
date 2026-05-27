require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cron = require('node-cron');
const path = require('path');
const { initDB, get } = require('./db/database');
const { loginLimiter, apiLimiter, speedLimiter } = require('./middleware/security');

const app = express();
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: '*', methods: ['GET','POST','PUT','DELETE'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.disable('x-powered-by');
app.use(express.static(path.join(__dirname, '../public')));
app.use('/api/', apiLimiter);
app.use('/api/', speedLimiter);
app.use('/api/auth', loginLimiter);

app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/teacher', require('./routes/teacher'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/students', require('./routes/students'));
app.use('/api/fees', require('./routes/fees'));
app.use('/api/grades', require('./routes/grades'));
app.use('/api/timetable', require('./routes/timetable'));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, '../public/admin.html')));
app.get('/teacher', (req, res) => res.sendFile(path.join(__dirname, '../public/teacher.html')));
app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => { console.error(err.message); res.status(500).json({ error: 'Server error' }); });

cron.schedule('* * * * *', () => {
  try {
    const s = get('SELECT * FROM settings LIMIT 1');
    if (!s || !s.auto_absent_enabled) return;
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    if (time === (s.auto_absent_time || '15:00')) {
      const { markAbsentUnmarked } = require('./routes/admin');
      const count = markAbsentUnmarked();
      if (count > 0) console.log(`Auto-absent: ${count} students`);
    }
  } catch(e) {}
});

const https = require('https');
const SITE_URL = process.env.RENDER_EXTERNAL_URL;
if (SITE_URL) setInterval(() => { https.get(SITE_URL, ()=>{}).on('error', ()=>{}); }, 10 * 60 * 1000);

const PORT = process.env.PORT || 3000;
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Unto Others International School System`);
    console.log(`🚀 Running on http://localhost:${PORT}`);
  });
}).catch(err => { console.error('Failed:', err); process.exit(1); });
