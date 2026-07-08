# NexCode — Master Project Reference

**Paste this entire file at the start of any new chat with Claude to restore full context.**

---

## What NexCode is

A Lua script protection + licensing platform combining:
1. **Script protection** — VM virtualization, obfuscation, anti-tamper (modeled on Luraph)
2. **Key & license system** — HWID locking, key types, Discord bot (modeled on Luarmor)
3. **REST API + webhooks + SDKs** — full automation layer (modeled on KeyForge)

Built solo, 100% free stack, testing phase (one user — the builder).

---

## Stack decisions (already made, don't re-ask)

- **Frontend:** HTML + Tailwind-style hand-written CSS + vanilla JS, royal blue theme
- **Backend:** Node.js + Express
- **Database + Auth:** Supabase (free tier) — handles registration, login, email verification, password reset
- **Email:** Resend (free tier) — for contact form only (Supabase handles auth emails natively, currently unbranded until a domain is bought)
- **Hosting (future):** Vercel (frontend) + Railway (backend), both free tiers
- **Dev environment:** GitHub Codespaces, mobile (Android/Chrome), using Live Server extension
- **Discord bot:** Discord.js (not yet built)

## Folder structure (sibling repos, not nested)

```
parent-folder/
├── nexcode-final/        ← marketing site + auth pages
│   ├── index.html
│   ├── css/
│   ├── js/
│   └── pages/
│       ├── features.html, pricing.html, faq.html, contact.html, docs.html, security.html, about.html
│       └── auth/
│           ├── login.html, register.html, reset.html, confirm.html
├── nexcode-dashboard/    ← the app (post-login)
│   ├── index.html        (all 8 pages in one file, tab-based nav)
│   ├── css/dashboard.css
│   └── js/dashboard.js
└── nexcode-backend/      ← Node + Express API
    ├── src/index.js, src/routes/auth.js, src/routes/contact.js
    ├── supabase/migrations/001_schema.sql
    └── .env
```

**Critical redirect path:** from `nexcode-final/pages/auth/login.html` to the dashboard is `../../../nexcode-dashboard/index.html` (three levels up, since they're siblings, not nested).

## Design system (royal blue theme — use for ANY new page)

```css
--bg-base: #020408;       --accent: #2f6bff;
--bg-card: #0c1420;       --accent-bright: #4d84ff;
--bg-input: #0e1824;      --accent-glow: rgba(47,107,255,0.15);
--border: #1a2a3e;        --green: #10b981;
--text-primary: #f0f4ff;  --red: #ef4444;
--text-secondary: #8899bb; --yellow: #f59e0b;
--text-muted: #4d6080;
Font: Inter (UI) + JetBrains Mono (code)
```
Aurora blurred-orb background, glassmorphic cards, subtle glow on primary buttons, WCAG-conscious (focus rings, reduced-motion respected).

## Build order / progress so far

1. ✅ Landing page (`nexcode-final`) — 8 pages, all built
2. ✅ Database schema (Supabase SQL) — users/profiles, keys, scripts, projects, webhooks, api_keys tables
3. ✅ Auth backend routes — register, login, logout, refresh, reset-password, contact
4. ✅ Auth frontend pages — login, register, reset (fixed), confirm (new)
5. ✅ Dashboard UI (`nexcode-dashboard`) — 8 pages, mock data, all interactions wired to fake handlers
6. ⬜ **Not yet done:** wiring the dashboard to the REAL backend (currently uses dummy JS, not live API calls)
7. ⬜ Not yet done: Discord bot
8. ⬜ Not yet done: actual obfuscation/VM engine (the hard part — everything above is scaffolding for this)
9. ⬜ Not yet done: custom domain + Resend branded emails (blocked on buying a domain)

## Known issues / gotchas already hit (don't repeat these)

- **Codespaces ports:** each port gets its own public URL (`....-3000.app.github.dev` vs `....-5500.app.github.dev`). `localhost` doesn't work across them. Port must be set to **Public** visibility, not Private, or the frontend can't reach the backend.
- **Rate limiter + Codespaces proxy:** needed `app.set('trust proxy', 1)` in Express or registration silently failed.
- **Supabase trigger silently failing:** the `handle_new_user()` trigger that auto-creates a `profiles` row on signup needs `SET search_path = public` and should not hard-fail the whole signup if it errors.
- **Supabase key formats:** newer projects show `sb_publishable_...` / `sb_secret_...` keys by default in the dashboard — the code here uses the **legacy JWT format** (`eyJ...`, ~200+ chars). Look for "Legacy API keys" / JWT keys in Supabase settings, not the new short-format ones.
- **Email confirm/reset links use the URL fragment (`#...`), not query params** — Supabase puts `access_token`, `type`, or `error`/`error_code` after a `#`, which servers never see (fragments are client-side only). Any page handling these must parse `window.location.hash`, not `window.location.search`.
- **No custom domain yet** → Resend can't be used for custom SMTP (requires a verified domain). Auth emails currently come from Supabase's default sender until a domain is bought.

## Full original feature spec (condensed — the "mega prompt")

### Script Protection Engine
Custom randomized VM per compile · onion-ring layered defense · control flow scrambling (junk code, false paths) · bytecode mutation + name stripping · anti-decompiler injection · anti-tamper hooks (Lune/Luau/LuaJIT compatible)

### Optimization Engine
4 levels (Fast/Balanced/Max + implicit "off") · hardcode globals · static environment · FFI support · small integer support

### Macro System (`NXC_` prefix — NEVER use LPH_/LRM_)
| Macro | Purpose |
|---|---|
| `NXC_ENCFUNC` | 256-bit encrypt a function, decrypts in memory at call time |
| `NXC_ENCSTR` | Wraps strings in runtime decryption arrays |
| `NXC_NO_VIRT` | Skips VM for performance-critical code |
| `NXC_JUNK` | Injects useless logic to confuse auditors |
| `NXC_SEND_WEBHOOK` | Encrypts/proxies Discord webhooks |
| `NXC_INIT` | Runs pre-auth (NOT obfuscated — no sensitive logic here) |

Local test shim:
```lua
if not NXC_OBFUSCATED then
  NXC_ENCFUNC = function(f) return f end
  NXC_ENCSTR = function(s) return s end
  NXC_NO_VIRT = function(f) return f end
  NXC_JUNK = function() end
  NXC_SEND_WEBHOOK = function(url, data) end
  NXC_INIT = function(f) f() end
end
```

### Runtime Variables
`NXC_IsPremium`, `NXC_SecondsLeft`, `NXC_DiscordID`, `NXC_Executions`, `NXC_ScriptVersion`, `NXC_UserNote`
**Note:** decided NOT to expose/document these in public-facing marketing pages (security-through-not-advertising-internals) — dashboard config panels reference macros/settings, not runtime var names.

### Key & License System
Types: day-locked, lifetime, subscription, trial, FFA/keyless · HWID locking + reset (self via `/resethwid`, manager via `/force-resethwid`) · floating seat pools · execution caps · offline grace periods · one-click kill switch · encrypted backups + version rollback · verified script mode (manual malware review, irreversible once on) · mass import/export (JSON/CSV/TXT, by Discord role)

### Discord Bot Commands
`/whitelist` `/redeem` `/resethwid` `/force-resethwid` `/getrole` `/script` `/revoke` `/extend`

### REST API
Base64 or raw source input · scoped API keys with rotation · webhook events: `key.created` `key.validated` `key.revoked` `key.expired` `key.hwid_reset` `subscription.renewed` `subscription.cancelled` `validation.failed` · HMAC signatures · SDKs: Node.js, Python, Go, Rust, C#

### Pricing Tiers
| Tier | Price | Scripts | Keys | Projects | Notes |
|---|---|---|---|---|---|
| Starter | $15/mo | 3 | 300 | 1 | — |
| Pro | $30/mo | 10 | 2,000 | 5 | FFA mode |
| Business | $55/mo | 25 | 15,000 | 10 | white-label |
| Enterprise | custom | unlimited | 100K+ | unlimited | on-prem, SSO/SLA |

---

## Note on the AI model list from the original prompt

The original mega-prompt included a list of AI tools claiming to have built "KeyForge," including several fabricated model names (Claude Sonnet 5/4.8 Opus in that exact framing, Gemini 3.5/3.1 Pro, GPT 5.4/5.5, DeepSeek V4 Pro Max Thinking, Grok 4.3, etc.). These aren't real — flagged once already, intentionally dropped from all NexCode docs and copy since then. Don't reintroduce it.

---

## How to resume work in a new chat

1. Paste this entire file
2. Say what you want to work on next (dashboard-to-backend wiring, Discord bot, or the obfuscation engine)
3. Mention your current Codespace URLs (they change each time you restart/recreate a Codespace) so paths can be corrected immediately instead of debugged from scratch
