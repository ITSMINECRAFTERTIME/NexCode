// src/middleware/auth.js
// Reads the Authorization: Bearer <token> header, validates it with Supabase,
// and attaches req.user to the request.

const { supabaseAdmin } = require('../lib/supabase');

async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header.' });
  }

  const token = header.slice(7);

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }

  req.user = user;       // { id, email, ... }
  req.token = token;
  next();
}

module.exports = { requireAuth };
