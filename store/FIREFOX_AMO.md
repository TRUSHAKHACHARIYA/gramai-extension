# Firefox Add-ons (AMO) Submission Guide

GramAI supports Firefox via Manifest V3. Publish to addons.mozilla.org for one-click installs.

## Prerequisites

- Firefox account: https://addons.mozilla.org/developers/
- `extension/` folder (manifest already includes Firefox-compatible settings)

## Package the extension

```bash
cd extension
zip -r ../gramai-firefox.zip . -x "*.DS_Store"
```

## Submit to AMO

1. Go to https://addons.mozilla.org/developers/addon/submit/distribution
2. Upload `gramai-firefox.zip`
3. Choose **On this site** (public listing)
4. Fill in listing details and privacy policy URL:
   ```
   https://gramai-extension.vercel.app/privacy.html
   ```

## Temporary install (before AMO approval)

1. Open `about:debugging` in Firefox
2. Click **This Firefox** → **Load Temporary Add-on**
3. Select `extension/manifest.json`

## After approval

Add Firefox Add-ons URL to `landing/config.js`.
