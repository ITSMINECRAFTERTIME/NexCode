// src/routes/dashboard.js
const express = require('express');
const { supabaseAdmin } = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ── GET /dashboard/stats ────────────────────────────────────
router.get('/stats', requireAuth, async (req, res) => {
  const userId = req.user.id;

  try {
    // Active keys
    const { count: activeKeys } = await supabaseAdmin
      .from('keys')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'active');

    // Keys created this week
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count: keysThisWeek } = await supabaseAdmin
      .from('keys')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', weekAgo);

    // Total executions
    const { data: execData } = await supabaseAdmin
      .from('keys')
      .select('execution_count')
      .eq('user_id', userId);
    const totalExecutions = (execData || []).reduce((sum, k) => sum + (k.execution_count || 0), 0);

    // Executions last month
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: monthExecData } = await supabaseAdmin
      .from('execution_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('executed_at', monthAgo);
    const execsLastMonth = monthExecData || 0;

    // Live scripts
    const { count: liveScripts } = await supabaseAdmin
      .from('scripts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'live');

    // Projects
    const { count: projects } = await supabaseAdmin
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    return res.json({
      activeKeys:      activeKeys || 0,
      keysThisWeek:   keysThisWeek || 0,
      totalExecutions: totalExecutions || 0,
      execsLastMonth:  execsLastMonth || 0,
      liveScripts:     liveScripts || 0,
      projects:        projects || 0
    });

  } catch (err) {
    console.error('[dashboard/stats]', err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
