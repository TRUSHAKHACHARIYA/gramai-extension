# GramAI — Free AI Writing Assistant Chrome Extension

> 100% free · runs locally · no API keys · no subscriptions · no data sent to any server

---

## What It Does

GramAI is a Chrome extension that adds AI-powered writing tools to every website you visit.
It uses **Ollama** to run open-source AI models (Llama, Qwen, Mistral, etc.) directly on your computer.

### Features
- ✅ **Grammar fix** — corrects grammar, spelling, punctuation
- ✍️ **Rewrite** — improves clarity and flow
- 👔 **Professional tone** — rewrites for workplace communication
- 😊 **Friendly tone** — makes text warm and conversational
- ✂️ **Make shorter** — removes filler, keeps meaning
- 📋 **Summarize** — 2-3 sentence summary of any text
- 💡 **Explain** — simplifies complex text
- 🌐 **Translate** — translates any language to English
- 📊 **Writing score** — grades your text 0–100

### How It Works
1. **Select any text** on any webpage → a floating toolbar appears
2. **Click a tool** → AI processes the text locally
3. **Accept or copy** the result → or replace the text in-place
4. Also works via **right-click context menu** and the **popup**

---

## Setup (One-time, takes ~5 minutes)

### Step 1 — Install Ollama

Go to **https://ollama.com** and download for your OS (Windows, Mac, Linux).

### Step 2 — Start Ollama

```bash
ollama serve
```

Leave this terminal open (or Ollama runs as a background service on Mac/Windows).

### Step 3 — Download a Free AI Model

Pick one based on your computer's RAM:

| Model | RAM needed | Quality | Command |
|-------|-----------|---------|---------|
| llama3.2 (3B) | 4 GB | Good | `ollama pull llama3.2` |
| qwen2.5 (7B) | 8 GB | Better | `ollama pull qwen2.5` |
| llama3.1 (8B) | 8 GB | Best | `ollama pull llama3.1:8b` |
| mistral (7B) | 8 GB | Great | `ollama pull mistral` |
| phi4 (3.8B) | 4 GB | Fast | `ollama pull phi4` |

**Recommended for most people:**
```bash
ollama pull llama3.2
```

### Step 4 — Install the Extension in Chrome

1. Open Chrome and go to: `chrome://extensions`
2. Turn on **Developer mode** (toggle in top-right corner)
3. Click **"Load unpacked"**
4. Select the `extension/` folder from this project
5. The GramAI icon (✨) appears in your toolbar

### Step 5 — Test It

1. Go to any website (Gmail, Twitter, Google Docs, etc.)
2. Select some text with your mouse
3. The GramAI toolbar appears — click ✅ Fix or ✍️ Rewrite
4. Done!

---

## Project Structure

```
gramai-extension/
├── extension/               ← Load this folder in Chrome
│   ├── manifest.json        ← Extension config (Manifest V3)
│   ├── icons/               ← Extension icons (auto-generated)
│   │   ├── icon16.png
│   │   ├── icon32.png
│   │   ├── icon48.png
│   │   └── icon128.png
│   ├── background/
│   │   └── service_worker.js  ← Handles Ollama API calls & context menus
│   ├── content/
│   │   ├── content.js         ← Floating toolbar & result panel
│   │   └── content.css        ← Toolbar & panel styles
│   ├── popup/
│   │   ├── popup.html         ← Extension popup UI
│   │   ├── popup.css          ← Popup styles
│   │   └── popup.js           ← Popup logic
│   └── options/
│       ├── options.html       ← Settings page
│       └── options.js         ← Settings logic
└── README.md
```

---

## Cost Breakdown

| Item | Cost |
|------|------|
| Ollama | Free forever |
| AI models (Llama, Qwen, etc.) | Free forever |
| Chrome extension | Free forever |
| API keys needed | None |
| Internet required to run | No (fully offline) |
| Data sent to any server | None |

**Total cost: $0**

---

## Sharing With Friends

Since this is a local extension with no backend, here's how your friends can use it:

**Option A — Share the zip**
- Send them the `gramai-extension.zip` file
- They follow the same setup steps above

**Option B — GitHub**
- Push this project to GitHub
- Friends clone it and load the `extension/` folder in Chrome

**Option C — Chrome Web Store** (optional, one-time $5 fee)
- Submit the `extension/` folder to the Chrome Web Store
- Friends install it like any other extension (no Developer Mode needed)

---

## Troubleshooting

**"Cannot reach Ollama"**
- Make sure `ollama serve` is running in a terminal
- Check: http://localhost:11434 should show `{"models":[...]}`
- On Windows, Ollama may run as a system tray app automatically

**"Model not found"**
- Run `ollama list` to see installed models
- Pull a model: `ollama pull llama3.2`

**Toolbar doesn't appear**
- Reload the webpage after installing the extension
- Check that the extension is enabled at `chrome://extensions`

**Slow responses**
- Use a smaller model (`phi4` or `llama3.2:3b`)
- The first run is slow (model loads into memory); subsequent runs are faster

**Works on Gmail / Google Docs?**
- Yes! The toolbar works on any webpage including Gmail, Twitter/X, LinkedIn, Notion, and Google Docs

---

## Supported Browsers

| Browser | Status |
|---------|--------|
| Chrome | ✅ Full support |
| Edge | ✅ Full support (same steps) |
| Brave | ✅ Full support |
| Opera | ✅ Full support |
| Firefox | ⚠️ Needs minor manifest changes |

---

## Privacy

- All AI processing happens **on your computer**
- No text is ever sent to any external server
- No account or login required
- No usage tracking or analytics

---

## Future Improvements

- [ ] Firefox support
- [ ] Keyboard shortcut (e.g. Alt+G to trigger toolbar)
- [ ] Custom prompt templates
- [ ] Writing history / session log
- [ ] Export results to clipboard/file
- [ ] Dark mode support
- [ ] Multi-language UI
- [ ] OCR support (image → text → grammar fix)

---

## License

MIT — free to use, modify, and share.
