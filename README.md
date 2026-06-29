# GramAI — Privacy-First AI Writing Assistant

> Free locally with Ollama · Pro Cloud · Team style guides · Open source MIT

**Site:** https://gramai-extension.vercel.app  
**Repo:** https://github.com/TRUSHAKHACHARIYA/gramai-extension

---

## Project structure

```
gramai-extension/
├── extension/       # Browser extension — load this folder in Chrome/Firefox
├── landing/         # Marketing site (deployed via Vercel)
├── cloud-server/    # Pro/Team API (deploy to Render/Railway)
└── store/           # Chrome Web Store & Firefox AMO guides
```

---

## Features

| Mode | Setup | Cost |
|------|-------|------|
| **Free (local)** | ~5 min, Ollama wizard | $0 forever |
| **Pro (cloud)** | 30 sec, license key | $6.99/mo |
| **Team** | Pro + style guides | $12/user/mo |

**11 tools:** grammar, rewrite, score, summarize, explain, translate, tone, real-time hints (Pro), custom prompts (Pro), style guides (Team), history.

**Also:** floating toolbar, context menu, `Alt+G/R/S` shortcuts, Google Docs & Word Online, Firefox support.

---

## Quick start (free / local)

1. Install [Ollama](https://ollama.com) and run `ollama pull llama3.2`
2. Open `chrome://extensions` → Developer mode → **Load unpacked** → select `extension/`
3. Open extension Options → run setup wizard
4. Select text on any webpage → use the toolbar

**Demo license keys:** `GRAMAI-PRO-DEMO-2026` · `GRAMAI-TEAM-DEMO-2026`

---

## Cloud server

```bash
cd cloud-server
npm install
cp .env.example .env
npm start
```

Deploy with `render.yaml` or `Dockerfile`. Set `OPENAI_API_KEY` and LemonSqueezy env vars in production.

---

## Launch checklist

Edit `landing/config.js` when ready:

| Step | Action |
|------|--------|
| 1 | Deploy `cloud-server/` → set `CLOUD_API_URL` |
| 2 | LemonSqueezy products + webhook → update checkout URLs |
| 3 | Chrome Web Store → see `store/CHROME_WEB_STORE.md` → set `CHROME_STORE_URL` |
| 4 | Plausible.io account for analytics (script already in landing page) |

---

## Privacy

Local mode sends zero bytes to servers. Pro Cloud processes over HTTPS and discards text immediately.

Full policy: https://gramai-extension.vercel.app/privacy.html

---

## License

MIT
