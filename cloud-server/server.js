/**
 * GramAI Cloud Server v2.0
 * Deploy for Pro Cloud mode, license validation, waitlist, team style guides, and API.
 *
 * Start: npm install && npm start
 * Deploy: see render.yaml, Dockerfile, or cloud-server/README.md
 */

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { loadJson, saveJson } = require('./lib/store');
const {
  loadLicenses,
  generateLicenseKey,
  activateLicense,
} = require('./lib/licenses');

const PORT = process.env.PORT || 3847;
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const LEMONSQUEEZY_WEBHOOK_SECRET = process.env.LEMONSQUEEZY_WEBHOOK_SECRET || '';
const LEMONSQUEEZY_PRO_VARIANT_ID = process.env.LEMONSQUEEZY_PRO_VARIANT_ID || '';
const LEMONSQUEEZY_TEAM_VARIANT_ID = process.env.LEMONSQUEEZY_TEAM_VARIANT_ID || '';
const ADMIN_SECRET = process.env.ADMIN_SECRET || '';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

let LICENSES = loadLicenses();

const TEAMS = {
  'team-demo-001': {
    name: 'Demo Team',
    members: [
      { email: 'admin@gramai.local', role: 'admin' },
      { email: 'writer@gramai.local', role: 'member' },
    ],
    styleGuides: [
      {
        id: 'sg-001',
        name: 'Brand Voice',
        rules: 'Use active voice. Keep sentences under 25 words. Avoid jargon.',
        vocabulary: { prefer: ['streamline', 'enhance'], avoid: ['leverage', 'synergy'] },
      },
    ],
    usage: { requests: 142, tokens: 48200 },
  },
};

const API_KEYS = new Map();

function authMiddleware(req, res, next) {
  const licenseKey = req.headers['x-license-key'];
  const apiKey = req.headers['x-api-key'];

  if (apiKey && API_KEYS.has(apiKey)) {
    req.auth = API_KEYS.get(apiKey);
    return next();
  }
  if (licenseKey && LICENSES[licenseKey.toUpperCase()]) {
    req.auth = LICENSES[licenseKey.toUpperCase()];
    req.auth.licenseKey = licenseKey.toUpperCase();
    return next();
  }
  return res.status(401).json({ error: 'Invalid or missing license/API key' });
}

function adminAuth(req, res, next) {
  if (!ADMIN_SECRET) return res.status(503).json({ error: 'Admin API not configured' });
  if (req.headers['x-admin-secret'] !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

function verifyLemonSqueezySignature(req) {
  if (!LEMONSQUEEZY_WEBHOOK_SECRET) return true;
  const signature = req.headers['x-signature'];
  if (!signature) return false;
  const digest = crypto
    .createHmac('sha256', LEMONSQUEEZY_WEBHOOK_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');
  return signature === digest;
}

function tierFromVariant(variantId, variantName) {
  const id = String(variantId || '');
  const name = String(variantName || '').toLowerCase();
  if (LEMONSQUEEZY_TEAM_VARIANT_ID && id === LEMONSQUEEZY_TEAM_VARIANT_ID) return 'team';
  if (LEMONSQUEEZY_PRO_VARIANT_ID && id === LEMONSQUEEZY_PRO_VARIANT_ID) return 'pro';
  if (name.includes('team')) return 'team';
  return 'pro';
}

// ─── Health ───────────────────────────────────────────────────────────────────

app.get('/v1/health', async (req, res) => {
  let ollama = false;
  try {
    const r = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(2000) });
    ollama = r.ok;
  } catch {}
  res.json({
    status: 'ok',
    version: '2.0.0',
    ollama,
    openai: !!OPENAI_API_KEY,
    provider: OPENAI_API_KEY ? 'openai' : ollama ? 'ollama' : 'none',
    licenses: Object.keys(LICENSES).length,
    waitlist: loadJson('waitlist.json', []).length,
  });
});

// ─── Waitlist ─────────────────────────────────────────────────────────────────

app.post('/v1/waitlist', (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  const waitlist = loadJson('waitlist.json', []);
  const exists = waitlist.some(entry => entry.email === email);
  if (!exists) {
    waitlist.push({ email, addedAt: new Date().toISOString(), source: req.body.source || 'landing' });
    saveJson('waitlist.json', waitlist);
  }

  res.json({ ok: true, count: waitlist.length });
});

app.get('/v1/waitlist/count', (req, res) => {
  const waitlist = loadJson('waitlist.json', []);
  res.json({ count: waitlist.length });
});

app.get('/v1/waitlist', adminAuth, (req, res) => {
  res.json({ waitlist: loadJson('waitlist.json', []) });
});

// ─── License ──────────────────────────────────────────────────────────────────

app.post('/v1/license/validate', (req, res) => {
  const key = (req.body.licenseKey || '').trim().toUpperCase();
  const license = LICENSES[key];
  if (!license) return res.status(400).json({ valid: false, error: 'Invalid license key' });
  res.json({
    valid: true,
    tier: license.tier,
    email: license.email,
    teamId: license.teamId || '',
    teamRole: license.role || '',
    expiresAt: license.expiresAt || null,
  });
});

app.post('/v1/license/generate', adminAuth, (req, res) => {
  const tier = req.body.tier === 'team' ? 'team' : 'pro';
  const email = (req.body.email || 'user@gramai.local').trim();
  const key = generateLicenseKey(tier);
  let teamId = null;
  if (tier === 'team') {
    teamId = `team-${crypto.randomBytes(4).toString('hex')}`;
    TEAMS[teamId] = {
      name: `${email}'s Team`,
      members: [{ email, role: 'admin' }],
      styleGuides: [],
      usage: { requests: 0, tokens: 0 },
    };
  }
  activateLicense(LICENSES, { key, tier, email, teamId, role: tier === 'team' ? 'admin' : undefined });
  LICENSES = loadLicenses();
  res.json({ licenseKey: key, tier, email, teamId });
});

app.post('/v1/webhooks/lemonsqueezy', (req, res) => {
  if (!verifyLemonSqueezySignature(req)) {
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  const body = req.body || {};
  const eventName = body.meta?.event_name || body.event_name || '';

  if (eventName && !['order_created', 'subscription_created', 'license_key_created'].includes(eventName)) {
    return res.json({ received: true, skipped: true });
  }

  const attrs = body.data?.attributes || body.attributes || body;
  const email = attrs.user_email || attrs.customer_email || body.email || 'customer@gramai.local';
  const variantId = attrs.variant_id || attrs.first_order_item?.variant_id || body.variant;
  const variantName = attrs.variant_name || attrs.product_name || body.variant || '';
  const existingKey = attrs.license_key?.key || body.license_key;

  const tier = tierFromVariant(variantId, variantName);
  const licenseKey = (existingKey || generateLicenseKey(tier)).toUpperCase();
  let teamId = null;

  if (tier === 'team') {
    teamId = `team-${crypto.randomBytes(4).toString('hex')}`;
    TEAMS[teamId] = {
      name: `${email}'s Team`,
      members: [{ email, role: 'admin' }],
      styleGuides: [],
      usage: { requests: 0, tokens: 0 },
    };
  }

  activateLicense(LICENSES, {
    key: licenseKey,
    tier,
    email,
    teamId,
    role: tier === 'team' ? 'admin' : undefined,
  });
  LICENSES = loadLicenses();

  console.log(`License activated: ${licenseKey} (${tier}) for ${email}`);
  res.json({ received: true, licenseKey, tier });
});

// ─── AI Generate ──────────────────────────────────────────────────────────────

const PROMPTS = {
  grammar: (text) => `Fix ALL grammar, spelling, and punctuation errors. Return ONLY the corrected text.\n\nText: ${text}\n\nCorrected:`,
  rewrite: (text) => `Rewrite for clarity and engagement. Return ONLY the rewritten text.\n\nText: ${text}\n\nRewritten:`,
  score: (text) => `Analyze writing quality. Format EXACTLY:\nOverall: [0-100]\nGrammar: [0-100]\nClarity: [0-100]\nStyle: [0-100]\nFeedback: [2-3 sentences]\n\nText: ${text}`,
};

app.post('/v1/generate', authMiddleware, async (req, res) => {
  const { action, text, prompt, extra } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });

  const styleContext = extra?.styleGuide || '';
  const fullPrompt = prompt || (PROMPTS[action] ? PROMPTS[action](text) : `Improve this text. Return ONLY the result.\n\nText: ${text}`);
  const finalPrompt = styleContext ? `${styleContext}\n\n${fullPrompt}` : fullPrompt;

  try {
    let result;
    if (OPENAI_API_KEY) {
      result = await generateOpenAI(finalPrompt);
    } else {
      result = await generateOllama(finalPrompt);
    }

    if (req.auth.teamId && TEAMS[req.auth.teamId]) {
      TEAMS[req.auth.teamId].usage.requests++;
    }

    res.json({ result: result.trim() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function generateOllama(prompt) {
  const res = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3.2',
      prompt,
      stream: false,
      options: { temperature: 0.3, num_predict: 800 },
    }),
    signal: AbortSignal.timeout(90000),
  });
  if (!res.ok) throw new Error('Ollama unavailable — start Ollama or set OPENAI_API_KEY');
  const data = await res.json();
  return data.response || '';
}

async function generateOpenAI(prompt) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 800,
    }),
    signal: AbortSignal.timeout(90000),
  });
  if (!res.ok) throw new Error('OpenAI API error');
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// ─── Team / Style Guides ──────────────────────────────────────────────────────

app.get('/v1/team/:teamId/style-guides', authMiddleware, (req, res) => {
  const team = TEAMS[req.params.teamId];
  if (!team) return res.status(404).json({ error: 'Team not found' });
  res.json({ guides: team.styleGuides });
});

app.post('/v1/team/:teamId/style-guides', authMiddleware, (req, res) => {
  const team = TEAMS[req.params.teamId];
  if (!team) return res.status(404).json({ error: 'Team not found' });
  const guide = {
    id: req.body.id || `sg-${crypto.randomBytes(4).toString('hex')}`,
    name: req.body.name || 'Untitled',
    rules: req.body.rules || '',
    vocabulary: req.body.vocabulary || { prefer: [], avoid: [] },
  };
  const idx = team.styleGuides.findIndex(g => g.id === guide.id);
  if (idx >= 0) team.styleGuides[idx] = guide;
  else team.styleGuides.push(guide);
  res.json({ guide });
});

app.delete('/v1/team/:teamId/style-guides/:guideId', authMiddleware, (req, res) => {
  const team = TEAMS[req.params.teamId];
  if (!team) return res.status(404).json({ error: 'Team not found' });
  team.styleGuides = team.styleGuides.filter(g => g.id !== req.params.guideId);
  res.json({ ok: true });
});

app.get('/v1/team/:teamId', authMiddleware, (req, res) => {
  const team = TEAMS[req.params.teamId];
  if (!team) return res.status(404).json({ error: 'Team not found' });
  res.json({ id: req.params.teamId, name: team.name, members: team.members, usage: team.usage });
});

// ─── Developer API Keys ───────────────────────────────────────────────────────

app.post('/v1/api-keys', authMiddleware, (req, res) => {
  if (req.auth.tier !== 'team') return res.status(403).json({ error: 'Team license required' });
  const apiKey = `gai_${crypto.randomBytes(24).toString('hex')}`;
  API_KEYS.set(apiKey, { ...req.auth, name: req.body.name || 'API Key', createdAt: Date.now() });
  res.json({ apiKey });
});

app.get('/v1/api-keys', authMiddleware, (req, res) => {
  const keys = [];
  for (const [key, meta] of API_KEYS) {
    if (meta.licenseKey === req.auth.licenseKey) {
      keys.push({ prefix: key.slice(0, 12) + '…', name: meta.name, createdAt: meta.createdAt });
    }
  }
  res.json({ keys });
});

app.get('/v1/dashboard', authMiddleware, (req, res) => {
  const teamId = req.auth.teamId;
  const team = teamId ? TEAMS[teamId] : null;
  res.json({
    tier: req.auth.tier,
    email: req.auth.email,
    team: team ? { id: teamId, name: team.name, members: team.members, usage: team.usage, styleGuides: team.styleGuides } : null,
  });
});

app.listen(PORT, () => {
  console.log(`GramAI Cloud Server running on http://localhost:${PORT}`);
  console.log('Demo keys: GRAMAI-PRO-DEMO-2026, GRAMAI-TEAM-DEMO-2026');
  console.log(`Licenses loaded: ${Object.keys(LICENSES).length}`);
});
