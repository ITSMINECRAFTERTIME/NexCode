# NexCode — Website (Design Phase)

Royal-blue production marketing site for the NexCode Lua protection & licensing platform.
This is the **design phase**: HTML + CSS + light interaction JS only. Backend, accounts,
emails, and the real dashboard come later.

## ▶️ How to run it (IMPORTANT)

These pages use relative paths and a shared layout injected by JavaScript, so you need to
open them through a **local server** — NOT by double-clicking the HTML file (that uses
`file://` and breaks the paths, giving you a blank/white page).

### Easiest way — VS Code Live Server
1. Open this folder in VS Code.
2. Install the **Live Server** extension (by Ritwick Dey) if you don't have it.
3. Right-click `index.html` → **Open with Live Server**.
4. It opens in your browser at something like `http://127.0.0.1:5500/index.html`. Done.

### Alternative — Python (if you have it)
```bash
cd nexcode-final
python -m http.server 8000
# then open http://localhost:8000 in your browser
```

## 📄 Pages
- `index.html` — Home (hero, features bento, how-it-works, testimonials, pricing preview)
- `pages/features.html` — Features + interactive compile-settings panel
- `pages/security.html` — Security architecture, VM layers, threat model
- `pages/pricing.html` — Pricing, billing toggle, full feature matrix, FAQ
- `pages/docs.html` — Developer docs with scroll-spy sidebar
- `pages/faq.html` — Searchable, categorized FAQ
- `pages/contact.html` — Contact channels + working form UI
- `pages/about.html` — Company story, values, timeline

## 📁 Structure
```
nexcode-final/
├── index.html
├── css/base.css        ← design system (royal blue theme, all tokens)
├── js/
│   ├── layout.js        ← injects nav + footer + WebGL particle background
│   └── core.js          ← cursor, scroll reveals, toggles, form, FAQ, etc.
└── pages/               ← all inner pages
```

## 🎨 Notes
- Theme: royal blue (`--a: #2f6bff`) on deep navy-black.
- The nav and footer are injected by `js/layout.js` so they stay identical on every page —
  edit them in one place.
- The WebGL particle background loads Three.js from a CDN, so you need an internet
  connection the first time. Everything still works without it (it just skips the particles).
- All buttons/forms are front-end only right now (no backend wired up yet).

## ⏭️ Next up (later phases)
Dashboard → database → backend/API → auth & accounts → Discord bot → emails.
