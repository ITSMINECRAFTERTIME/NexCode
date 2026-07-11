// src/routes/auth.js
const express = require('express');
const { z } = require('zod');
const { supabase, supabaseAdmin } = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ── Validation schemas ──────────────────────────────────────

const registerSchema = z.object({
  email:       z.string().email('Invalid email address'),
  password:    z.string()
                 .min(8, 'Password must be at least 8 characters')
                 .regex(/[A-Z]/, 'Password must contain an uppercase letter')
                 .regex(/[0-9]/, 'Password must contain a number'),
  displayName: z.string().min(2).max(40).optional()
});

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1)
});

const resetConfirmSchema = z.object({
  password: z.string()
              .min(8, 'Password must be at least 8 characters')
              .regex(/[A-Z]/, 'Password must contain an uppercase letter')
              .regex(/[0-9]/, 'Password must contain a number'),
  token_hash: z.string().min(1, 'Missing reset token')
});

// ── POST /auth/register ─────────────────────────────────────
router.post('/register', async (req, res) => {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.errors[0].message });
  }

  const { email, password, displayName } = result.data;
  const FRONTEND = process.env.FRONTEND_URL;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName || email.split('@')[0] },
      emailRedirectTo: `${FRONTEND}/pages/auth/verify.html`
    }
  });

  if (error) {
    console.error('[register]', error);
    return res.status(400).json({ error: error.message || JSON.stringify(error) });
  }

  return res.status(201).json({
    message: 'Account created. Check your email to verify your address.',
    userId: data.user?.id
  });
});

// ── POST /auth/login ────────────────────────────────────────
router.post('/login', async (req, res) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.errors[0].message });
  }

  const { email, password } = result.data;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const { session, user } = data;
  return res.json({
    message: 'Logged in successfully.',
    accessToken:  session.access_token,
    refreshToken: session.refresh_token,
    expiresAt:    session.expires_at,
    user: { id: user.id, email: user.email }
  });
});

// ── POST /auth/logout ───────────────────────────────────────
router.post('/logout', requireAuth, async (req, res) => {
  const { error } = await supabase.auth.admin.signOut(req.token);
  if (error) console.error('[logout]', error.message);
  return res.json({ message: 'Logged out.' });
});

// ── POST /auth/refresh ──────────────────────────────────────
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken is required.' });

  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.session) {
    return res.status(401).json({ error: 'Refresh token invalid or expired.' });
  }

  return res.json({
    accessToken:  data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresAt:    data.session.expires_at
  });
});

// ── GET /auth/me ────────────────────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', req.user.id)
    .single();

  if (error) return res.status(404).json({ error: 'Profile not found.' });

  return res.json({
    id:          req.user.id,
    email:       req.user.email,
    displayName: profile.display_name,
    avatarUrl:   profile.avatar_url,
    plan:        profile.plan,
    createdAt:   profile.created_at
  });
});

// ── GET /auth/verify-redirect ───────────────────────────────
// Email confirmation link from Supabase hits this backend route,
// verifies the OTP, then redirects to the frontend with tokens.
router.get('/verify-redirect', async (req, res) => {
  const { token_hash, type } = req.query;
  const FRONTEND = process.env.FRONTEND_URL;

  if (!token_hash) {
    return res.redirect(`${FRONTEND}/pages/auth/verify.html?error=No+token`);
  }

  try {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type || 'signup'
    });

    if (error) {
      return res.redirect(`${FRONTEND}/pages/auth/verify.html?error=${encodeURIComponent(error.message)}`);
    }

    const { access_token, refresh_token } = data.session;
    return res.redirect(
      `${FRONTEND}/pages/auth/verify.html?success=1&access_token=${access_token}&refresh_token=${refresh_token}`
    );
  } catch (err) {
    return res.redirect(`${FRONTEND}/pages/auth/verify.html?error=${encodeURIComponent(err.message)}`);
  }
});

// ── GET /auth/reset-redirect ────────────────────────────────
// Password reset link from Supabase hits this backend route,
// passes token through to the frontend without consuming it.
router.get('/reset-redirect', async (req, res) => {
  const { token_hash, type } = req.query;
  const FRONTEND = process.env.FRONTEND_URL;

  if (!token_hash) {
    return res.redirect(`${FRONTEND}/pages/auth/reset-confirm.html?error=No+token`);
  }

  return res.redirect(
    `${FRONTEND}/pages/auth/reset-confirm.html?token_hash=${encodeURIComponent(token_hash)}&type=${type || 'recovery'}`
  );
});

// ── POST /auth/reset-password ───────────────────────────────
// User submits new password from the reset-confirm page.
router.post('/reset-password', async (req, res) => {
  const result = resetConfirmSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.errors[0].message });
  }

  const { token_hash, password } = result.data;

  try {
    // Verify the OTP to get a session
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash,
      type: 'recovery'
    });
    if (error) return res.status(400).json({ error: error.message });

    // Update the password via admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      data.user.id,
      { password }
    );
    if (updateError) return res.status(400).json({ error: updateError.message });

    return res.json({ message: 'Password updated successfully. You can now log in.' });
  } catch (err) {
    console.error('[reset-password]', err);
    return res.status(500).json({ error: err.message });
  }
});

router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
      if (!email) return res.status(400).json({ error: 'Email required.' });

        const FRONTEND = process.env.FRONTEND_URL;

          await supabase.auth.resetPasswordForEmail(email, {
              redirectTo: `https://scaling-space-waddle-qrv79j4pp92x9w4-3000.app.github.dev/auth/reset-redirect`
                });

                  // Always return success (don't reveal if email exists)
                    return res.json({ message: 'If that email exists, a reset link has been sent.' });
});

module.exports = router;
