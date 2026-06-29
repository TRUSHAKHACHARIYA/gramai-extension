# GramAI — Privacy-First AI Writing Assistant

> Free locally with Ollama · Pro Cloud with zero setup · Team style guides · Open source MIT

**Live site:** https://gramai-extension.vercel.app  
**GitHub:** https://github.com/TRUSHAKHACHARIYA/gramai-extension

---

## What It Does

GramAI is a browser extension that adds AI writing tools to every website — Gmail, Google Docs, Notion, LinkedIn, and anywhere you type.

| Mode | Setup | Privacy | Cost |
|------|-------|---------|------|
| **Free (Local)** | ~5 min (Ollama wizard) | 100% on your device | $0 forever |
| **Pro (Cloud)** | 30 seconds | Encrypted, not stored | $6.99/mo |
| **Team** | Same as Pro | + shared style guides | $12/user/mo |

### Writing tools (11 total)
- ✅ Grammar fix · ✍️ Rewrite + diff · 📊 Writing score
- 📋 Summarize · 💡 Explain · 🌐 Translate (15+ languages, bidirectional)
- 👔 Tone tools (professional, friendly, casual, academic)
- ⚡ Real-time hints (Pro) · 🎯 Custom prompts (Pro) · 📐 Style guides (Team)

### Also includes
- Floating toolbar on text selection + right-click context menu
- Keyboard shortcuts: `Alt+G` fix · `Alt+R` rewrite · `Alt+S` score · `Esc` dismiss
- Google Docs & Word Online integrations
- Local history, dark mode, setup wizard
- Firefox, Chrome, Edge, Brave, Opera support

---

## Quick Start (Free / Local)

### 1. Install Ollama
Download from https://ollama.com and pull a model:
```bash
ollama pull llama3.2
```

### 2. Load the extension
1. Open `chrome://extensions` (or your browser's extensions page)
2. Enable **Developer mode**
3. Click **Load unpacked** → select the `extension/` folder

### 3. Run setup wizard
Open extension Options → follow the wizard to connect Ollama.

### 4. Use it
Select text on any webpage → toolbar appears → click a tool.

---

## Pro / Team (Cloud Mode)

### Demo license keys (for testing)
| Key | Tier |
|-----|------|
| `GRAMAI-PRO-DEMO-2026` | Pro |
| `GRAMAI-TEAM-DEMO-2026` | Team |

Enter in **Options → Subscription**.

### Deploy cloud server
```bash
cd cloud-server
npm install
cp .env.example .env   # set OPENAI_API_KEY, LEMONSQUEEZY_*, ADMIN_SECRET
npm start
```

Deploy to Render (one-click via `render.yaml`), Railway, or Docker:
```bash
docker build -t gramai-cloud ./cloud-server
docker run -p 3847:3847 -e OPENAI_API_KEY=sk-... gramai-cloud
```

Set cloud URL in extension Options → Cloud mode.

---

## Project Structure

```
gramai-extension/
├── extension/          ← Load in Chrome/Firefox (Manifest V3)
│   ├── background/     ← service_worker, cloud, license
│   ├── content/        ← toolbar, docs.js, word.js
│   ├── popup/          ← popup UI
│   ├── options/        ← settings + setup wizard
│   ├── dashboard/      ← Team admin dashboard
│   └── lib/            ← diff, languages, tier
├── landing/            ← Marketing site (Vercel / GitHub Pages)
│   ├── config.js       ← Site URLs — edit when going live
│   └── privacy.html    ← Privacy policy
├── cloud-server/       ← Pro/Team API (license, AI, waitlist)
├── store/              ← Chrome Web Store & Firefox AMO guides
└── .github/workflows/  ← GitHub Pages deploy
```

---

## Configuration

Edit `landing/config.js` when going live:

```js
CHROME_STORE_URL: 'https://chromewebstore.google.com/detail/...',
CLOUD_API_URL: 'https://your-cloud-server.onrender.com',
```

Waitlist emails auto-post to `{CLOUD_API_URL}/v1/waitlist` when cloud is deployed.

---

## Publishing

| Platform | Guide |
|----------|-------|
| Chrome Web Store | `store/CHROME_WEB_STORE.md` |
| Firefox AMO | `store/FIREFOX_AMO.md` |
| Landing (Vercel) | Connect repo — uses root `vercel.json` |
| Cloud API | `cloud-server/render.yaml` or Dockerfile |

---

## API (Cloud Server)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/health` | Health check |
| POST | `/v1/waitlist` | Email signup from landing page |
| POST | `/v1/license/validate` | Validate license key |
| POST | `/v1/generate` | AI text processing |
| POST | `/v1/webhooks/lemonsqueezy` | Payment webhook |
| GET | `/v1/dashboard` | Team dashboard data |

See `cloud-server/README.md` for full API docs.

---

## Privacy

- **Local mode:** Zero bytes sent to servers. Architecture, not a promise.
- **Pro Cloud:** HTTPS only, processed and discarded immediately.
- **No account** required for free tier.
- Full policy: https://gramai-extension.vercel.app/privacy.html

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Cannot reach Ollama | Run `ollama serve`, check http://localhost:11434 |
| Toolbar missing | Reload page, check extension is enabled |
| Cloud mode fails | Verify license key + cloud server URL in Options |
| Slow responses | Use smaller model (`phi4`, `llama3.2`) |

---

## License

MIT — free to use, modify, and share.
