// src/index.js
require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const rateLimit = require('express-rate-limit');

const authRoutes    = require('./routes/auth');
const contactRoutes = require('./routes/contact');

const app  = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

const dashboardRoutes = require('./routes/dashboard');
app.use('/dashboard', dashboardRoutes);

const keysRoutes = require('./routes/keys');
app.use('/keys', keysRoutes);

// ── CORS ────────────────────────────────────────────────────
// Allow requests from your frontend (Live Server, Vercel, etc.)
app.use(cors({
  origin: process.env.FRONTEND_URL
    ? [process.env.FRONTEND_URL, 'http://127.0.0.1:5500', 'http://localhost:5500']
    : '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ── BODY PARSER ─────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));

// ── RATE LIMITS ─────────────────────────────────────────────
// Auth endpoints — tighter limit to prevent brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { error: 'Too many requests. Please wait a moment and try again.' },
  standardHeaders: true,
  legacyHeaders: false
});

// General API limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests.' },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/auth', authLimiter);
app.use('/contact', apiLimiter);

// ── ROUTES ──────────────────────────────────────────────────
app.use('/auth', authRoutes);
app.use('/contact', contactRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── 404 ─────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// ── GLOBAL ERROR HANDLER ─────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[error]', err);
  res.status(500).json({ error: 'An unexpected error occurred.' });
});

// ── START ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 NexCode backend running at http://localhost:${PORT}`);
  console.log(`   Auth:    http://localhost:${PORT}/auth`);
  console.log(`   Contact: http://localhost:${PORT}/contact`);
  console.log(`   Health:  http://localhost:${PORT}/health\n`);
});
