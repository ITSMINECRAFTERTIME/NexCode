// src/routes/auth.js
// All auth is handled by Supabase — we just call their API.
// Supabase sends the verification + reset emails automatically (configured in their dashboard).

const express = require('express');
const { z } = require('zod');
const { supabase, supabaseAdmin } = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ── Validation schemas ──────────────────────────────────────
const registerSchema = z.object({
  email:       z.string().email('Invalid email address'),
  password:    z.string().min(8, 'Password must be at least 8 characters')
                          .regex(/[A-Z]/, 'Password must contain an uppercase letter')
                          .regex(/[0-9]/, 'Password must contain a number'),
  displayName: z.string().min(2, 'Display name must be at least 2 characters')
                          .max(40, 'Display name too long').optional()
});

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1)
});

const resetRequestSchema = z.object({
  email: z.string().email()
});

const resetConfirmSchema = z.object({
  password: z.string().min(8)
                      .regex(/[A-Z]/, 'Password must contain an uppercase letter')
                      .regex(/[0-9]/, 'Password must contain a number')
});

// ── POST /auth/register ─────────────────────────────────────
// Creates the account. Supabase auto-sends a verification email.
router.post('/register', async (req, res) => {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.errors[0].message });
  }

  const { email, password, displayName } = result.data;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName || email.split('@')[0] },
      // After they click the email link, they land here:
      emailRedirectTo: `${process.env.FRONTEND_URL}/pages/auth/verify.html`
    }
  });

  if (error) {
        console.error('SUPABASE ERROR:', error);
            return res.status(400).json({ error: error.message || error.code || JSON.stringify(error) });
              }

  // data.user exists but session is null until email is confirmed
  return res.status(201).json({
    message: 'Account created. Check your email to verify your address before logging in.',
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
    // Keep error generic — don't reveal whether email exists
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const { session, user } = data;

  return res.json({
    message: 'Logged in successfully.',
    accessToken:  session.access_token,
    refreshToken: session.refresh_token,
    expiresAt:    session.expires_at,
    user: {
      id:    user.id,
      email: user.email
    }
  });
});

// ── POST /auth/logout ───────────────────────────────────────
router.post('/logout', requireAuth, async (req, res) => {
  // Invalidate the session on Supabase's side
  const { error } = await supabase.auth.admin.signOut(req.token);
  if (error) console.error('[auth/logout]', error.message);
  return res.json({ message: 'Logged out.' });
});

// ── POST /auth/refresh ──────────────────────────────────────
// Exchange a refresh token for a new access token
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

// Email verification via token_hash
router.get('/verify', async (req, res) => {
  const { token_hash, type } = req.query;
    
      if (!token_hash) {
          return res.redirect(`${process.env.FRONTEND_URL}/pages/auth/verify.html?error=no_token`);
            }

              try {
                  const { data, error } = await supabase.auth.verifyOtp({
                        token_hash,
                              type: type || 'signup'
                                  });

                                      if (error) {
                                            return res.redirect(`${process.env.FRONTEND_URL}/pages/auth/verify.html?error=${encodeURIComponent(error.message)}`);
                                                }

                                                    // Success — redirect to dashboard with tokens in query
                                                        const session = data.session;
                                                            return res.redirect(
                                                                  `${process.env.FRONTEND_URL}/pages/auth/verify.html?success=1&access_token=${session.access_token}&refresh_token=${session.refresh_token}`
                                                                      );
                                                                        } catch (err) {
                                                                            return res.redirect(`${process.env.FRONTEND_URL}/pages/auth/verify.html?error=${encodeURIComponent(err.message)}`);
                                                                              }
                                                                              });

// ── POST /auth/reset-password ───────────────────────────────
// Step 1: user enters their email → Supabase sends a reset link
router.post('/reset-password', async (req, res) => {
  const result = resetRequestSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.errors[0].message });

  // Always return 200 even if email not found — prevents email enumeration
  await supabase.auth.resetPasswordForEmail(req.body.email, {
    redirectTo: `${process.env.FRONTEND_URL}/pages/auth/reset-confirm.html`
  });

  return res.json({ message: 'If that email exists, a password reset link has been sent.' });
});

// ── POST /auth/reset-password/confirm ──────────────────────
// Step 2: user lands on the reset page with a token, submits new password
// The access_token comes from the URL hash that Supabase puts in the redirect URL
router.post('/reset-password/confirm', async (req, res) => {
  const result = resetConfirmSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.errors[0].message });

  // requireAuth already verified the token from the Authorization header
  // (the frontend sets this from the URL hash on the reset-confirm page)
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token. Use the link from your email.' });
  }
  const token = authHeader.slice(7);

  // Set the session from the token, then update the password
  const { error: sessionError } = await supabase.auth.setSession({
    access_token: token,
    refresh_token: req.body.refreshToken || ''
  });

  if (sessionError) return res.status(401).json({ error: 'Reset link is invalid or expired.' });

  const { error } = await supabase.auth.updateUser({ password: req.body.password });

  if (error) {
    console.error("SUPABASE ERROR:", JSON.stringify(error));
    return res.status(400).json({ error: error.message || JSON.stringify(error) });
  }

  return res.json({ message: 'Password updated successfully. You can now log in.' });
});

// ── GET /auth/me ────────────────────────────────────────────
// Returns the current user's profile
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

module.exports = router;
