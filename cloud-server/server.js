/**
 * GramAI Cloud Server v2.0
 * Deploy this for Pro Cloud mode, license validation, team style guides, and developer API.
 *
 * Start: npm install && npm start
 * Default: http://localhost:3847
 *
 * Demo license keys:
 *   GRAMAI-PRO-DEMO-2026
 *   GRAMAI-TEAM-DEMO-2026
 */

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');

const PORT = process.env.PORT || 3847;
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// ─── In-memory store (use PostgreSQL in production) ───────────────────────────

const LICENSES = {
  'GRAMAI-PRO-DEMO-2026': { tier: 'pro', email: 'demo@gramai.local', teamId: null },
  'GRAMAI-TEAM-DEMO-2026': { tier: 'team', email: 'admin@gramai.local', teamId: 'team-demo-001', role: 'admin' },
};

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
  });
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

// LemonSqueezy webhook placeholder — activate license on purchase
app.post('/v1/webhooks/lemonsqueezy', (req, res) => {
  const { license_key, email, variant } = req.body || {};
  if (license_key) {
    const tier = (variant || '').includes('team') ? 'team' : 'pro';
    const teamId = tier === 'team' ? `team-${crypto.randomBytes(4).toString('hex')}` : null;
    LICENSES[license_key.toUpperCase()] = { tier, email, teamId, role: tier === 'team' ? 'admin' : undefined };
    if (teamId) {
      TEAMS[teamId] = { name: `${email}'s Team`, members: [{ email, role: 'admin' }], styleGuides: [], usage: { requests: 0, tokens: 0 } };
    }
  }
  res.json({ received: true });
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

// ─── Dashboard data endpoint ──────────────────────────────────────────────────

app.get('/v1/dashboard', authMiddleware, (req, res) => {
  const teamId = req.auth.teamId;
  const team = teamId ? TEAMS[teamId] : null;
  res.json({
    tier: req.auth.tier,
    email: req.auth.email,
    team: team ? { id: teamId, name: team.name, members: team.members, usage: team.usage, styleGuides: team.styleGuides } : null,
  });
});

// Landing page (serve after API routes)
app.use(express.static(path.join(__dirname, '..', 'landing')));

app.listen(PORT, () => {
  console.log(`GramAI Cloud Server running on http://localhost:${PORT}`);
  console.log(`Demo keys: GRAMAI-PRO-DEMO-2026, GRAMAI-TEAM-DEMO-2026`);
});
