// src/index.js
require('dotenv').config();

const express   = require('express');
const cors      = require('cors');
const rateLimit = require('express-rate-limit');
const path      = require('path');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

// ── CORS ─────────────────────────────────────────────────────
app.options('*', cors());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: false
}));

// ── BODY PARSER ──────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));

// ── STATIC FILES ─────────────────────────────────────────────
app.use('/dashboard', express.static(path.join(__dirname, '../../nexcode-dashboard')));
app.use('/site', express.static(path.join(__dirname, '../../nexcode-final')));
app.get('/', (req, res) => {
  res.redirect('/site/pages/auth/login.html');
});

// ── RATE LIMITS ──────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many requests. Please wait a moment and try again.' },
  standardHeaders: true,
  legacyHeaders: false
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests.' },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/auth', authLimiter);
app.use('/contact', apiLimiter);

// ── ROUTES ───────────────────────────────────────────────────
const authRoutes      = require('./routes/auth');
const contactRoutes   = require('./routes/contact');
const dashboardRoutes = require('./routes/dashboard');
const keysRoutes      = require('./routes/keys');
const scriptsRoutes = require('./routes/scripts');

app.use('/scripts', scriptsRoutes);
app.use('/auth',      authRoutes);
app.use('/contact',   contactRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/keys',      keysRoutes);

// ── HEALTH ───────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── 404 ──────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// ── GLOBAL ERROR HANDLER ─────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[error]', err);
  res.status(500).json({ error: 'An unexpected error occurred.' });
});

// ── START ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 NexCode backend running at http://localhost:${PORT}`);
  console.log(`   Auth:    http://localhost:${PORT}/auth`);
  console.log(`   Contact: http://localhost:${PORT}/contact`);
  console.log(`   Health:  http://localhost:${PORT}/health\n`);
});
