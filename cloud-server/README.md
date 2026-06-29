# GramAI Cloud Server

Backend for GramAI Pro/Team tiers. Handles license validation, cloud AI processing, team style guides, and developer API keys.

## Quick Start

```bash
cd cloud-server
npm install
npm start
```

Server runs at **http://localhost:3847**

## Demo License Keys

| Key | Tier |
|-----|------|
| `GRAMAI-PRO-DEMO-2026` | Pro |
| `GRAMAI-TEAM-DEMO-2026` | Team (includes admin dashboard) |

Activate these in the extension Options → Subscription page.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3847` | Server port |
| `OLLAMA_URL` | `http://localhost:11434` | Local Ollama for AI proxy |
| `OPENAI_API_KEY` | — | Optional OpenAI fallback |

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/v1/health` | — | Health check |
| POST | `/v1/license/validate` | — | Validate license key |
| POST | `/v1/generate` | License/API key | AI text processing |
| GET | `/v1/team/:id` | License | Team info |
| GET | `/v1/team/:id/style-guides` | License | List style guides |
| POST | `/v1/team/:id/style-guides` | License | Create/update guide |
| POST | `/v1/api-keys` | Team license | Generate API key |
| GET | `/v1/dashboard` | License | Dashboard data |
| POST | `/v1/webhooks/lemonsqueezy` | — | Payment webhook |

## LemonSqueezy Integration

1. Create products for Pro ($6.99/mo) and Team ($12/user/mo)
2. Set webhook URL to `https://your-domain.com/v1/webhooks/lemonsqueezy`
3. Add checkout URLs in extension Options

## Production Deployment

Deploy to Railway, Render, or Fly.io. Use PostgreSQL for license/team storage instead of in-memory maps.
