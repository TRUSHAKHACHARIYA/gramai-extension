# GramAI Cloud Server

Backend for GramAI Pro/Team tiers — license validation, cloud AI, waitlist, team style guides, and developer API.

## Quick Start

```bash
cd cloud-server
npm install
cp .env.example .env
npm start
```

Server runs at **http://localhost:3847** (API only — landing is on Vercel).

## Deploy to Render

1. Push repo to GitHub
2. Create new **Web Service** on Render → connect repo
3. Set **Root Directory** to `cloud-server`
4. Render reads `render.yaml` automatically
5. Add env vars: `OPENAI_API_KEY`, `LEMONSQUEEZY_WEBHOOK_SECRET`, `ADMIN_SECRET`
6. Copy deploy URL → set `CLOUD_API_URL` in `landing/config.js`

## Deploy with Docker

```bash
docker build -t gramai-cloud .
docker run -p 3847:3847 \
  -e OPENAI_API_KEY=sk-... \
  -e LEMONSQUEEZY_WEBHOOK_SECRET=... \
  -v gramai-data:/app/data \
  gramai-cloud
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3847` | Server port |
| `OLLAMA_URL` | `http://localhost:11434` | Ollama for AI proxy |
| `OPENAI_API_KEY` | — | OpenAI fallback (recommended for production) |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | — | Webhook HMAC secret from LemonSqueezy |
| `LEMONSQUEEZY_PRO_VARIANT_ID` | — | Pro product variant ID |
| `LEMONSQUEEZY_TEAM_VARIANT_ID` | — | Team product variant ID |
| `ADMIN_SECRET` | — | Protects `/v1/waitlist` GET and `/v1/license/generate` |

## Demo License Keys

| Key | Tier |
|-----|------|
| `GRAMAI-PRO-DEMO-2026` | Pro |
| `GRAMAI-TEAM-DEMO-2026` | Team |

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/v1/health` | — | Health + stats |
| POST | `/v1/waitlist` | — | Landing page email signup |
| GET | `/v1/waitlist/count` | — | Public waitlist count |
| GET | `/v1/waitlist` | Admin | Export waitlist |
| POST | `/v1/license/validate` | — | Validate license key |
| POST | `/v1/license/generate` | Admin | Generate license manually |
| POST | `/v1/generate` | License/API key | AI text processing |
| POST | `/v1/webhooks/lemonsqueezy` | Signature | Payment webhook |
| GET | `/v1/dashboard` | License | Dashboard data |

## LemonSqueezy Setup

1. Create Pro ($6.99/mo) and Team ($12/user/mo) products
2. Set webhook URL: `https://your-server.com/v1/webhooks/lemonsqueezy`
3. Copy webhook secret → `LEMONSQUEEZY_WEBHOOK_SECRET`
4. Copy variant IDs → env vars
5. Update checkout URLs in `landing/config.js` and extension Options

On purchase, server auto-generates license keys like `GRAMAI-PRO-A3F2B1-2026`.

## Data persistence

Licenses and waitlist emails are saved to `data/*.json` (gitignored). Mount a volume in production for persistence across deploys.

## Generate license manually

```bash
curl -X POST http://localhost:3847/v1/license/generate \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: your-admin-secret" \
  -d '{"tier":"pro","email":"user@example.com"}'
```
