# GramAI Launch Checklist

Items that require your accounts/credentials — everything else is implemented in code.

## You must do (external accounts)

- [ ] **Deploy cloud server** to Render/Railway/Fly.io using `cloud-server/render.yaml`
- [ ] Set `CLOUD_API_URL` in `landing/config.js` to your deployed URL
- [ ] **LemonSqueezy** — create Pro/Team products, set webhook secret in cloud server env
- [ ] Update `LEMONSQUEEZY_PRO_URL` / `LEMONSQUEEZY_TEAM_URL` in `landing/config.js` with real checkout links
- [ ] **Chrome Web Store** — follow `store/CHROME_WEB_STORE.md`, then set `CHROME_STORE_URL`
- [ ] **Plausible** — create site at plausible.io for `gramai-extension.vercel.app` (script already in HTML)
- [ ] **Custom domain** (optional) — add in Vercel project settings

## Already implemented in code

- [x] Landing page with FAQ, install modal, GitHub stars, waitlist form
- [x] Privacy policy at `landing/privacy.html`
- [x] Cloud server waitlist API (`POST /v1/waitlist`)
- [x] LemonSqueezy webhook with license auto-generation
- [x] Docker + Render deploy configs
- [x] OG image PNG for social sharing
- [x] README v2.0 + store submission guides
- [x] Central config in `landing/config.js`

## After cloud deploy

```js
// landing/config.js
CLOUD_API_URL: 'https://gramai-cloud.onrender.com',
```

Waitlist will automatically sync to your server. Set `ADMIN_SECRET` to export emails:

```bash
curl -H "x-admin-secret: YOUR_SECRET" https://your-server/v1/waitlist
```
