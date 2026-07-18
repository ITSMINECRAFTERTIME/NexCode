// src/routes/scripts.js
const express = require('express');
const { supabaseAdmin } = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /scripts — list all scripts for user
router.get('/', requireAuth, async (req, res) => {
  const userId = req.user.id;
  try {
    const { data, error } = await supabaseAdmin
      .from('scripts')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ scripts: data || [] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /scripts — create new script
router.post('/', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { name, description, lua_source, obf_settings } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name is required' });

  try {
    const { data, error } = await supabaseAdmin
      .from('scripts')
      .insert({
        owner_id: userId,
        name,
        description: description || '',
        lua_source: lua_source || '',
        obf_settings: obf_settings || {},
        status: 'live',
        version: '1.0.0',
        executions: 0,
      })
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });
    return res.status(201).json({ script: data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /scripts/:id — get single script
router.get('/:id', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  try {
    const { data, error } = await supabaseAdmin
      .from('scripts')
      .select('*')
      .eq('id', id)
      .eq('owner_id', userId)
      .single();
    if (error) return res.status(404).json({ error: 'Script not found' });
    return res.json({ script: data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /scripts/:id — update script (source, settings, status, version)
router.patch('/:id', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { name, description, lua_source, obf_settings, status, version, obfuscated_source } = req.body || {};

  const updates = { updated_at: new Date().toISOString() };
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (lua_source !== undefined) updates.lua_source = lua_source;
  if (obf_settings !== undefined) updates.obf_settings = obf_settings;
  if (status !== undefined) updates.status = status;
  if (version !== undefined) updates.version = version;
  if (obfuscated_source !== undefined) updates.obfuscated_source = obfuscated_source;

  try {
    const { data, error } = await supabaseAdmin
      .from('scripts')
      .update(updates)
      .eq('id', id)
      .eq('owner_id', userId)
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ script: data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /scripts/:id
router.delete('/:id', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  try {
    const { error } = await supabaseAdmin
      .from('scripts')
      .delete()
      .eq('id', id)
      .eq('owner_id', userId);
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ message: 'Script deleted.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /scripts/:id/killswitch — toggle kill switch
router.patch('/:id/killswitch', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  try {
    const { data: script } = await supabaseAdmin
      .from('scripts')
      .select('status')
      .eq('id', id)
      .eq('owner_id', userId)
      .single();
    
    const newStatus = script?.status === 'killed' ? 'live' : 'killed';
    const { data, error } = await supabaseAdmin
      .from('scripts')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('owner_id', userId)
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ script: data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
