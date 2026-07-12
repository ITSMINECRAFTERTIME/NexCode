// src/routes/keys.js
const express = require('express');
const { supabaseAdmin } = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Generate a random NexCode key
function generateKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const seg = () => Array.from({length:4}, () => chars[Math.floor(Math.random()*chars.length)]).join('');
  return `NEXC-${seg()}-${seg()}-${seg()}`;
}

// ── GET /keys ─────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { status, type, search, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  try {
    let query = supabaseAdmin
      .from('keys')
      .select('*', { count: 'exact' })
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== 'all') query = query.eq('status', status.toLowerCase());
    if (type && type !== 'all') query = query.eq('key_type', type.toLowerCase());
    if (search) query = query.or(`key_value.ilike.%${search}%,note.ilike.%${search}%`);

    const { data, error, count } = await query;
    if (error) return res.status(400).json({ error: error.message });

    return res.json({ keys: data || [], total: count || 0, page: Number(page), limit: Number(limit) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /keys ────────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { script_id, key_type = 'lifetime', days, note = '', hwid_policy = 'lock_on_exec' } = req.body || {};

  try {
    const keyValue = generateKey();
    let expiresAt = null;

    if (key_type === 'day' || key_type === 'trial') {
      const d = parseInt(days) || 30;
      expiresAt = new Date(Date.now() + d * 24 * 60 * 60 * 1000).toISOString();
    }

    const { data, error } = await supabaseAdmin
      .from('keys')
      .insert({
        owner_id: userId,
        script_id: script_id || null,
        key_value: keyValue,
        key_type,
        status: 'active',
        hwid: null,
        hwid_policy,
        expires_at: expiresAt,
        note,
      })
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    return res.status(201).json({ key: data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /keys/bulk ───────────────────────────────────────────
router.post('/bulk', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { script_id, key_type = 'lifetime', days, count = 10, note = '' } = req.body;

  const n = Math.min(parseInt(count) || 10, 500);

  try {
    let expiresAt = null;
    if (key_type === 'day' || key_type === 'trial') {
      const d = parseInt(days) || 30;
      expiresAt = new Date(Date.now() + d * 24 * 60 * 60 * 1000).toISOString();
    }

    const rows = Array.from({ length: n }, () => ({
      owner_id: userId,
      script_id: script_id || null,
      key_value: generateKey(),
      key_type,
      status: 'active',
      hwid: null,
      hwid_policy: 'lock_on_exec',
      expires_at: expiresAt,
      note,
    }));

    const { data, error } = await supabaseAdmin
      .from('keys')
      .insert(rows)
      .select('key_value');

    if (error) return res.status(400).json({ error: error.message });
    return res.json({ keys: data.map(k => k.key_value), count: data.length });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── PATCH /keys/:id/revoke ────────────────────────────────────
router.patch('/:id/revoke', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    const { error } = await supabaseAdmin
      .from('keys')
      .update({ status: 'revoked', hwid: null })
      .eq('id', id)
      .eq('owner_id', userId);

    if (error) return res.status(400).json({ error: error.message });
    return res.json({ message: 'Key revoked.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── PATCH /keys/:id/reset-hwid ───────────────────────────────
router.patch('/:id/reset-hwid', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    const { error } = await supabaseAdmin
      .from('keys')
      .update({ hwid: null })
      .eq('id', id)
      .eq('owner_id', userId);

    if (error) return res.status(400).json({ error: error.message });
    return res.json({ message: 'HWID reset.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── PATCH /keys/:id/extend ────────────────────────────────────
router.patch('/:id/extend', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { days = 30 } = req.body;

  try {
    const { data: key, error: fetchErr } = await supabaseAdmin
      .from('keys')
      .select('expires_at')
      .eq('id', id)
      .eq('owner_id', userId)
      .single();

    if (fetchErr) return res.status(404).json({ error: 'Key not found.' });

    const base = key.expires_at ? new Date(key.expires_at) : new Date();
    const newExpiry = new Date(base.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabaseAdmin
      .from('keys')
      .update({ expires_at: newExpiry, status: 'active' })
      .eq('id', id)
      .eq('owner_id', userId);

    if (error) return res.status(400).json({ error: error.message });
    return res.json({ message: `Extended ${days} days.`, expires_at: newExpiry });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
