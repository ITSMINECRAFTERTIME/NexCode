# NexCode Auth Fixes — Setup Instructions

## What was broken → what's fixed

1. **Dashboard redirect pointed into the wrong folder**
   `nexcode-final` and `nexcode-dashboard` are sibling folders, not nested.
   Fixed in `login.html` — redirect path is now:
   `../../../nexcode-dashboard/index.html`
   (from `nexcode-final/pages/auth/login.html`, `../../../` walks up to the parent that contains both folders)

2. **Reset password page didn't exist**
   Built `reset.html` — handles BOTH:
   - Requesting a reset email (default view)
   - Actually setting a new password (shown automatically when Supabase redirects back with a valid recovery token in the URL)
   - A clean "link expired" state instead of a raw error

3. **Email confirm link showed a raw error with no page**
   `#error=access_denied&error_code=otp_expired&error_description=...`
   Built `confirm.html` — parses that exact fragment and shows a proper "link expired, sign up again" screen instead of a blank/broken page. Also handles the SUCCESS case (valid confirmation) with a clean "Email confirmed" screen.

---

## Step 1 — Drop in the files

Copy these into your `nexcode-final` repo, preserving the folder structure:

```
nexcode-final/
├── css/
│   └── auth.css          ← new
└── pages/
    └── auth/
        ├── login.html     ← replace existing
        ├── register.html  ← replace existing
        ├── reset.html      ← NEW
        └── confirm.html    ← NEW
```

## Step 2 — Fill in your Supabase anon key

Open `pages/auth/reset.html` and find this line near the top of the `<script>`:

```js
const SUPABASE_ANON_KEY = 'PASTE_YOUR_SUPABASE_ANON_KEY_HERE';
```

Replace with your real anon key (Supabase → Settings → API → the `eyJ...` anon/public key — same one already in your backend `.env`). This is safe to expose client-side; it's the public key, not the service role key.

## Step 3 — Point Supabase's redirect URLs at confirm.html and reset.html

This is the important part — right now Supabase redirects to your bare frontend root, which is why you got a raw `#error=...` fragment with no page to handle it.

Go to **Supabase → Authentication → URL Configuration** and set:

**Site URL:**
```
https://scaling-space-waddle-qrv79j4pp92x9w4-5500.app.github.dev/nexcode-final/pages/auth/confirm.html
```

**Redirect URLs** (add both):
```
https://scaling-space-waddle-qrv79j4pp92x9w4-5500.app.github.dev/nexcode-final/pages/auth/confirm.html
https://scaling-space-waddle-qrv79j4pp92x9w4-5500.app.github.dev/nexcode-final/pages/auth/reset.html
```

Swap in your actual Codespace URL if it's changed since last session.

**Why two different pages:** Supabase uses the same "Site URL" for the confirmation-email redirect. Signup confirmations land on `confirm.html`, password recovery links land on `reset.html`. Both pages read the URL fragment Supabase attaches and act accordingly — you don't need separate Site URL configs per flow, Supabase's recovery API call (triggered by your backend's `/auth/reset-password` route) sends users to whatever redirect URL your backend specifies when it calls Supabase, which should be `reset.html`.

## Step 4 — Check your backend's reset-password route

Open `nexcode-backend/src/routes/auth.js` and find the reset-password route. Make sure the `redirectTo` option points at `reset.html`, not the bare frontend:

```js
const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: 'https://scaling-space-waddle-qrv79j4pp92x9w4-5500.app.github.dev/nexcode-final/pages/auth/reset.html'
});
```

If that route doesn't already do this, add the `redirectTo` option — otherwise Supabase falls back to Site URL and you're back to square one.

## Step 5 — Test both flows

**Confirmation flow:**
1. Register a new test account
2. Check email, click the confirm link
3. Should land on `confirm.html` → brief loading → "Email confirmed" → button to sign in

**Reset flow:**
1. Go to `login.html` → click "Forgot password?"
2. Enter your email → submit
3. Check email, click the reset link
4. Should land on `reset.html` and show the "Set a new password" form (not the request form)
5. Enter new password → redirects to login with a success message

**Expired link (to verify the fix for your original error):**
- Wait for a link to expire (or reuse an already-used one) and click it
- Should show "Link expired" with a clean message and a button — not a raw URL fragment
