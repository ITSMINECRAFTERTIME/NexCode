# NexCode — Setup Guide
## How to get registration, login, and the contact form working

Everything below is free. Follow steps in order.

---

## STEP 1 — Create a Supabase project (5 min)

1. Go to **supabase.com** → Sign up → New project
2. Name it "nexcode", pick a strong DB password (save it), pick the closest region
3. Wait ~2 minutes for it to provision

### Run the database schema
1. In your Supabase dashboard → click **SQL Editor** in the left sidebar
2. Click **New query**
3. Open `nexcode-backend/supabase/migrations/001_schema.sql` from this folder
4. Paste the entire contents → click **Run**
5. You should see "Success. No rows returned." — that means it worked

### Get your API keys
1. Supabase dashboard → **Settings** (gear icon) → **API**
2. You need three values:
   - **Project URL** → looks like `https://xxxxx.supabase.co`
   - **anon / public key** → long JWT string
   - **service_role key** → another long JWT string (keep this secret!)

### Enable email verification
1. Supabase dashboard → **Authentication** → **Email**
2. Make sure "Enable email confirmations" is ON
3. The verification and reset emails work automatically — Supabase sends them

---

## STEP 2 — Create a Resend account (2 min)

1. Go to **resend.com** → Sign up (free)
2. **API Keys** → Create API Key → copy it
3. (For now in dev you can send to your own email without a custom domain)

---

## STEP 3 — Configure the backend

1. In `nexcode-backend/`, copy the example env file:
   ```
   cp .env.example .env
   ```
2. Open `.env` and fill in:
   ```
   SUPABASE_URL=https://xxxxx.supabase.co         ← from Step 1
   SUPABASE_ANON_KEY=eyJhb...                     ← anon key from Step 1
   SUPABASE_SERVICE_ROLE_KEY=eyJhb...             ← service role key from Step 1
   RESEND_API_KEY=re_xxx...                       ← from Step 2
   CONTACT_EMAIL_TO=your@email.com                ← where contact form emails land
   CONTACT_EMAIL_FROM=onboarding@resend.dev       ← use this for testing (Resend's default)
   PORT=3000
   FRONTEND_URL=http://127.0.0.1:5500
   ```

---

## STEP 4 — Install dependencies and run the backend

You need Node.js installed (free at nodejs.org — get the LTS version).

Open a terminal in the `nexcode-backend/` folder:

```bash
npm install
npm run dev
```

You should see:
```
🚀 NexCode backend running at http://localhost:3000
   Auth:    http://localhost:3000/auth
   Contact: http://localhost:3000/contact
   Health:  http://localhost:3000/health
```

Test it's alive: open http://localhost:3000/health in your browser.
It should return: `{"status":"ok","timestamp":"..."}`

---

## STEP 5 — Run the frontend

Open the `nexcode-final/` folder in VS Code.
Right-click `index.html` → **Open with Live Server**.

The site runs at `http://127.0.0.1:5500`.

---

## STEP 6 — Test registration

1. Go to `http://127.0.0.1:5500/pages/auth/register.html`
2. Fill in a name, email, and password (min 8 chars, 1 uppercase, 1 number)
3. Click **Create account**
4. Check your email inbox — you should get a verification link from Supabase
5. Click the link to verify your account
6. Go to `http://127.0.0.1:5500/pages/auth/login.html`
7. Sign in — it redirects to the dashboard

## Test the contact form

1. Go to `http://127.0.0.1:5500/pages/contact.html`
2. Fill in the form and click Send
3. Check your `CONTACT_EMAIL_TO` inbox — you should get the notification
4. The sender gets an auto-reply too

---

## Current API endpoints

| Method | Path | What it does |
|---|---|---|
| POST | /auth/register | Create account |
| POST | /auth/login | Login → returns tokens |
| POST | /auth/logout | Invalidate session |
| POST | /auth/refresh | Refresh access token |
| POST | /auth/reset-password | Send reset email |
| GET  | /auth/me | Get current user profile |
| POST | /contact | Submit contact form |
| GET  | /health | Health check |

---

## Troubleshooting

**"Could not connect to the server"** — the backend isn't running. Run `npm run dev` in the backend folder.

**"Invalid email or password"** — check you verified your email first (click the link Supabase sent).

**Contact form send fails** — check your Resend API key in `.env` and that `CONTACT_EMAIL_FROM` is either `onboarding@resend.dev` (testing) or a verified domain.

**Supabase auth errors** — check the Supabase dashboard → Authentication → Users to see if the account was created.

---

## What's next

Once this is working, the next session builds:
- The **dashboard** (with real data from Supabase)
- The **keys management** UI wired to the backend
- The **REST API** (`/v1/keys`, `/v1/scripts`, etc.)
