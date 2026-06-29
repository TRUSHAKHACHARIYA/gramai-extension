# Chrome Web Store Submission Guide

Submit GramAI to the Chrome Web Store so users can install without Developer Mode.

## Prerequisites

- Google account
- One-time **$5 developer registration fee**: https://chrome.google.com/webstore/devconsole
- Extension ZIP or uploaded folder (`extension/`)

## Required assets

| Asset | Size | File |
|-------|------|------|
| Icon | 128×128 | `extension/icons/icon128.png` |
| Screenshots | 1280×800 or 640×400 | Capture popup, toolbar, options (min 1, max 5) |
| Small promo tile | 440×280 | Optional |
| Marquee promo | 1400×560 | Optional |

Store screenshots in `store/screenshots/` before uploading.

## Steps

1. **Zip the extension folder**
   ```bash
   cd extension
   zip -r ../gramai-extension-v2.zip . -x "*.DS_Store"
   ```

2. **Open Chrome Web Store Developer Dashboard**
   - https://chrome.google.com/webstore/devconsole
   - Click **New item** → upload `gramai-extension-v2.zip`

3. **Listing details**
   - **Name:** GramAI - AI Writing Assistant
   - **Summary:** Free AI grammar, rewrite & tone tools. 100% local with Ollama, or Pro Cloud.
   - **Description:** Use README.md feature list + privacy highlights
   - **Category:** Productivity
   - **Language:** English

4. **Privacy practices**
   - Single purpose: AI writing assistance
   - Permissions justification:
     - `storage` — save settings and history locally
     - `contextMenus` — right-click GramAI actions
     - `activeTab` / `scripting` — inject toolbar on selected text
     - `host_permissions` — run on webpages user visits; localhost for Ollama/cloud

5. **Privacy policy URL**
   ```
   https://gramai-extension.vercel.app/privacy.html
   ```

6. **Submit for review** (typically 1–3 business days)

## After approval

1. Copy your store URL (e.g. `https://chromewebstore.google.com/detail/gramai/...`)
2. Set it in `landing/config.js`:
   ```js
   CHROME_STORE_URL: 'https://chromewebstore.google.com/detail/...',
   ```
3. Push to GitHub — install buttons will link directly to the store
