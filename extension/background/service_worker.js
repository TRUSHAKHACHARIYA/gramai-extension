// GramAI - Background Service Worker v2.0
importScripts('../lib/tier.js', 'license.js', 'cloud.js');

const DEFAULT_OLLAMA_URL = 'http://localhost:11434';

const LANGUAGE_NAMES = {
  en: 'English', es: 'Spanish', fr: 'French', de: 'German', it: 'Italian',
  pt: 'Portuguese', nl: 'Dutch', ru: 'Russian', zh: 'Chinese', ja: 'Japanese',
  ko: 'Korean', ar: 'Arabic', hi: 'Hindi', tr: 'Turkish', pl: 'Polish',
};

const LEMONSQUEEZY_URLS = {
  pro: 'https://gramai.lemonsqueezy.com/checkout/pro',
  team: 'https://gramai.lemonsqueezy.com/checkout/team',
};

// ─── Settings ─────────────────────────────────────────────────────────────────

async function getSettings() {
  return chrome.storage.sync.get({
    gramai_ollama_url: DEFAULT_OLLAMA_URL,
    gramai_model: '',
    gramai_toolbar: true,
    gramai_contextmenu: true,
    gramai_autocopy: false,
    gramai_history: true,
    gramai_autoscore: false,
    gramai_realtime: true,
    gramai_min_selection: 3,
    gramai_dark_mode: 'auto',
    gramai_translate_lang: 'en',
    gramai_setup_complete: false,
    gramai_mode: 'local',
    gramai_cloud_url: GramAICloud.DEFAULT_CLOUD_URL,
    gramai_license_key: '',
    gramai_tier: 'free',
    gramai_team_id: '',
    gramai_active_style_guide: '',
    gramai_saved_prompts: [],
    gramai_style_guides: [],
    gramai_lemonsqueezy_pro_url: LEMONSQUEEZY_URLS.pro,
    gramai_lemonsqueezy_team_url: LEMONSQUEEZY_URLS.team,
  });
}

async function getOllamaBase() {
  const { gramai_ollama_url } = await getSettings();
  return (gramai_ollama_url || DEFAULT_OLLAMA_URL).replace(/\/$/, '');
}

async function getStyleGuideContext() {
  const settings = await getSettings();
  const tier = await GramAILicense.getUserTier();
  if (!GramAITier.canUseFeature(tier, 'style_guides') && !settings.gramai_active_style_guide) return '';

  let guides = settings.gramai_style_guides || [];
  if (GramAITier.canUseFeature(tier, 'style_guides')) {
    try {
      const cloudGuides = await GramAICloud.fetchTeamStyleGuides();
      if (cloudGuides.length) guides = cloudGuides;
    } catch {}
  }

  const active = guides.find(g => g.id === settings.gramai_active_style_guide) || guides[0];
  if (!active) return '';

  const vocab = active.vocabulary || {};
  const prefer = (vocab.prefer || []).join(', ');
  const avoid = (vocab.avoid || []).join(', ');
  return `STYLE GUIDE — ${active.name}:
Rules: ${active.rules || 'Follow team writing standards.'}
${prefer ? `Prefer words: ${prefer}` : ''}
${avoid ? `Avoid words: ${avoid}` : ''}`;
}

// ─── Context Menus ────────────────────────────────────────────────────────────

async function setupContextMenus() {
  const settings = await getSettings();
  await chrome.contextMenus.removeAll();
  if (!settings.gramai_contextmenu) return;

  chrome.contextMenus.create({ id: 'gramai-root', title: 'GramAI ✨', contexts: ['selection'] });
  chrome.contextMenus.create({ id: 'gramai-grammar', parentId: 'gramai-root', title: '✅ Fix Grammar', contexts: ['selection'] });
  chrome.contextMenus.create({ id: 'gramai-rewrite', parentId: 'gramai-root', title: '✍️ Rewrite & Improve', contexts: ['selection'] });
  chrome.contextMenus.create({ id: 'gramai-summarize', parentId: 'gramai-root', title: '📋 Summarize', contexts: ['selection'] });
  chrome.contextMenus.create({ id: 'gramai-more', parentId: 'gramai-root', title: '⋯ More GramAI tools…', contexts: ['selection'] });
}

chrome.runtime.onInstalled.addListener(() => setupContextMenus());
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.gramai_contextmenu) setupContextMenus();
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!info.menuItemId.startsWith('gramai-')) return;
  const text = info.selectionText;
  if (!text?.trim()) return;

  if (info.menuItemId === 'gramai-more') {
    await chrome.storage.local.set({ gramai_pending_text: text });
    try { await chrome.action.openPopup(); } catch {
      chrome.tabs.sendMessage(tab.id, { type: 'SHOW_EXTENDED_TOOLBAR', selectedText: text });
    }
    return;
  }
  runContextAction(tab.id, info.menuItemId.replace('gramai-', ''), text);
});

function runContextAction(tabId, action, text) {
  chrome.tabs.sendMessage(tabId, { type: 'SHOW_LOADING', action, selectedText: text });
  processText(action, text).then(result => {
    chrome.tabs.sendMessage(tabId, { type: 'SHOW_RESULT', action, originalText: text, result });
  }).catch(err => {
    chrome.tabs.sendMessage(tabId, { type: 'SHOW_ERROR', error: err.message });
  });
}

// ─── Keyboard Shortcuts ───────────────────────────────────────────────────────

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (!tab?.id) return;
  const actionMap = { 'fix-grammar': 'grammar', 'rewrite-text': 'rewrite', 'score-text': 'score' };
  const action = actionMap[command];
  if (!action) return;
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection()?.toString().trim() || '',
    });
    if (result) runContextAction(tab.id, action, result);
  } catch {
    chrome.tabs.sendMessage(tab.id, { type: 'RUN_SHORTCUT', action });
  }
});

// ─── Message Handling ─────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const handlers = {
    PROCESS_TEXT: () => processText(msg.action, msg.text, msg.extra || {}).then(r => ({ ok: true, result: r })),
    CHECK_OLLAMA: () => checkConnection(),
    GET_MODELS: () => getModels().then(async models => ({ ok: true, models, activeModel: await getPreferredModel() })),
    GET_SETTINGS: () => getSettings().then(settings => ({ ok: true, settings })),
    GET_TIER: () => GramAILicense.getLicenseInfo().then(info => ({ ok: true, ...info })),
    ACTIVATE_LICENSE: () => activateLicenseMsg(msg.key),
    DEACTIVATE_LICENSE: () => GramAILicense.deactivateLicense().then(() => ({ ok: true })),
    CHECK_CLOUD: () => GramAICloud.checkCloudStatus().then(info => ({ ok: true, ...info })),
    GET_HISTORY: () => chrome.storage.local.get({ gramai_history: [] }).then(d => ({ ok: true, history: d.gramai_history })),
    CLEAR_HISTORY: () => chrome.storage.local.set({ gramai_history: [] }).then(() => ({ ok: true })),
    TOGGLE_STAR_HISTORY: () => toggleStar(msg.id),
    DELETE_HISTORY_ITEM: () => deleteHistoryItem(msg.id),
    GET_PROMPTS: () => chrome.storage.sync.get({ gramai_saved_prompts: [] }).then(d => ({ ok: true, prompts: d.gramai_saved_prompts })),
    SAVE_PROMPT: () => savePrompt(msg.prompt),
    DELETE_PROMPT: () => deletePrompt(msg.id),
    GET_STYLE_GUIDES: () => getStyleGuides(),
    SAVE_STYLE_GUIDE: () => saveStyleGuide(msg.guide),
    DELETE_STYLE_GUIDE: () => deleteStyleGuide(msg.id),
    SYNC_STYLE_GUIDES: () => syncStyleGuides(),
    GENERATE_API_KEY: () => GramAICloud.generateApiKey().then(d => ({ ok: true, ...d })),
    GET_DASHBOARD_URL: () => ({ ok: true, url: chrome.runtime.getURL('dashboard/index.html') }),
  };

  const handler = handlers[msg.type];
  if (!handler) {
    if (msg.type === 'SET_BADGE_SCORE') {
      const score = parseInt(msg.score, 10);
      if (score > 0) {
        chrome.action.setBadgeText({ text: String(score), tabId: sender.tab?.id });
        chrome.action.setBadgeBackgroundColor({ color: score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444' });
      }
      return false;
    }
    if (msg.type === 'CLEAR_BADGE') { chrome.action.setBadgeText({ text: '' }); return false; }
    if (msg.type === 'OPEN_SETUP') { chrome.runtime.openOptionsPage(); return false; }
    return false;
  }

  handler().then(r => sendResponse(r)).catch(err => sendResponse({ ok: false, error: err.message }));
  return true;
});

async function activateLicenseMsg(key) {
  const { gramai_cloud_url } = await getSettings();
  const result = await GramAILicense.activateLicense(key, gramai_cloud_url);
  return { ok: true, ...result };
}

async function toggleStar(id) {
  const data = await chrome.storage.local.get({ gramai_history: [] });
  const history = data.gramai_history.map(item => item.id === id ? { ...item, starred: !item.starred } : item);
  await chrome.storage.local.set({ gramai_history: history });
  return { ok: true, history };
}

async function deleteHistoryItem(id) {
  const data = await chrome.storage.local.get({ gramai_history: [] });
  await chrome.storage.local.set({ gramai_history: data.gramai_history.filter(i => i.id !== id) });
  return { ok: true };
}

async function savePrompt(prompt) {
  const tier = await GramAILicense.getUserTier();
  if (!GramAITier.canUseFeature(tier, 'custom_prompts')) throw new Error('Pro license required to save prompts');
  const data = await chrome.storage.sync.get({ gramai_saved_prompts: [] });
  const entry = { id: Date.now().toString(36), name: prompt.name, prompt: prompt.prompt, createdAt: Date.now() };
  const prompts = [entry, ...data.gramai_saved_prompts].slice(0, 20);
  await chrome.storage.sync.set({ gramai_saved_prompts: prompts });
  return { ok: true, prompts };
}

async function deletePrompt(id) {
  const data = await chrome.storage.sync.get({ gramai_saved_prompts: [] });
  await chrome.storage.sync.set({ gramai_saved_prompts: data.gramai_saved_prompts.filter(p => p.id !== id) });
  return { ok: true };
}

async function getStyleGuides() {
  const data = await chrome.storage.sync.get({ gramai_style_guides: [] });
  return { ok: true, guides: data.gramai_style_guides };
}

async function saveStyleGuide(guide) {
  const tier = await GramAILicense.getUserTier();
  if (!GramAITier.canUseFeature(tier, 'style_guides')) throw new Error('Team license required for style guides');
  const data = await chrome.storage.sync.get({ gramai_style_guides: [] });
  const guides = [...data.gramai_style_guides];
  const idx = guides.findIndex(g => g.id === guide.id);
  const entry = { ...guide, id: guide.id || `sg-${Date.now().toString(36)}` };
  if (idx >= 0) guides[idx] = entry; else guides.push(entry);
  await chrome.storage.sync.set({ gramai_style_guides: guides });
  try { await GramAICloud.syncStyleGuideToCloud(entry); } catch {}
  return { ok: true, guides };
}

async function deleteStyleGuide(id) {
  const data = await chrome.storage.sync.get({ gramai_style_guides: [] });
  await chrome.storage.sync.set({ gramai_style_guides: data.gramai_style_guides.filter(g => g.id !== id) });
  return { ok: true };
}

async function syncStyleGuides() {
  const cloudGuides = await GramAICloud.fetchTeamStyleGuides();
  if (cloudGuides.length) await chrome.storage.sync.set({ gramai_style_guides: cloudGuides });
  return { ok: true, guides: cloudGuides };
}

// ─── History ──────────────────────────────────────────────────────────────────

async function saveToHistory(action, textIn, textOut, extra = {}) {
  const settings = await getSettings();
  const tier = await GramAILicense.getUserTier();
  if (!settings.gramai_history) return;
  const limit = GramAITier.canUseFeature(tier, 'unlimited_history') ? 100 : 20;
  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    action, textIn: textIn.slice(0, 500), textOut: textOut.slice(0, 500),
    timestamp: Date.now(), starred: false, extra,
  };
  const data = await chrome.storage.local.get({ gramai_history: [] });
  await chrome.storage.local.set({ gramai_history: [entry, ...data.gramai_history].slice(0, limit) });
}

// ─── Connection Check ─────────────────────────────────────────────────────────

async function checkConnection() {
  const settings = await getSettings();
  const tier = await GramAILicense.getUserTier();

  if (settings.gramai_mode === 'cloud' || (settings.gramai_mode === 'auto' && tier !== 'free')) {
    try {
      const cloud = await GramAICloud.checkCloudStatus();
      return { running: true, mode: 'cloud', ...cloud };
    } catch {
      if (settings.gramai_mode === 'cloud') throw new Error('Cloud unavailable');
    }
  }

  try {
    const ollama = await checkOllama();
    return { ...ollama, mode: 'local' };
  } catch {
    if (tier !== 'free') {
      try {
        const cloud = await GramAICloud.checkCloudStatus();
        return { running: true, mode: 'cloud', ...cloud };
      } catch {}
    }
    throw new Error('No AI backend available');
  }
}

async function checkOllama() {
  const base = await getOllamaBase();
  const res = await fetch(`${base}/api/tags`, { signal: AbortSignal.timeout(3000) });
  if (!res.ok) throw new Error('Ollama not running');
  const data = await res.json();
  return { running: true, modelCount: data.models?.length || 0 };
}

async function getModels() {
  const base = await getOllamaBase();
  const res = await fetch(`${base}/api/tags`, { signal: AbortSignal.timeout(3000) });
  const data = await res.json();
  return (data.models || []).map(m => m.name);
}

async function getPreferredModel() {
  const { gramai_model } = await getSettings();
  if (gramai_model) return gramai_model;
  try {
    const models = await getModels();
    const preferred = ['llama3.2', 'llama3.1', 'llama3', 'qwen2.5', 'qwen2', 'mistral', 'gemma2', 'gemma', 'phi4', 'phi3'];
    for (const p of preferred) {
      const found = models.find(m => m.toLowerCase().startsWith(p));
      if (found) return found;
    }
    return models[0] || 'llama3.2';
  } catch { return 'llama3.2'; }
}

// ─── Unified Text Processing ──────────────────────────────────────────────────

async function processText(action, text, extra = {}) {
  const settings = await getSettings();
  const tier = await GramAILicense.getUserTier();

  if (action === 'realtime-check' && !GramAITier.canUseFeature(tier, 'realtime')) {
    throw new Error('Real-time suggestions require GramAI Pro');
  }

  const styleGuide = await getStyleGuideContext();
  if (styleGuide) extra = { ...extra, styleGuide };

  const prompt = buildPrompt(action, text, extra);
  const useCloud = settings.gramai_mode === 'cloud' ||
    (settings.gramai_mode === 'auto' && tier !== 'free');

  let result;
  if (useCloud) {
    try {
      result = await GramAICloud.processWithCloud(action, text, extra, prompt);
    } catch (cloudErr) {
      if (settings.gramai_mode === 'cloud') throw cloudErr;
      result = await processWithOllama(action, text, extra, prompt);
    }
  } else {
    result = await processWithOllama(action, text, extra, prompt);
  }

  if (action !== 'realtime-check' && action !== 'score') {
    await saveToHistory(action, text, result, extra);
  }
  return result;
}

async function processWithOllama(action, text, extra = {}, promptOverride) {
  const base = await getOllamaBase();
  const model = await getPreferredModel();
  const prompt = promptOverride || buildPrompt(action, text, extra);
  const numPredict = action === 'realtime-check' ? 400 : action === 'score' ? 300 : 800;

  const res = await fetch(`${base}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt, stream: false, options: { temperature: 0.3, top_p: 0.9, num_predict: numPredict } }),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`Ollama error: ${await res.text()}`);
  const data = await res.json();
  return (data.response || '').trim();
}

function buildPrompt(action, text, extra = {}) {
  const langName = LANGUAGE_NAMES[extra.targetLang] || extra.targetLang || 'English';
  const stylePrefix = extra.styleGuide ? `${extra.styleGuide}\n\n` : '';

  const prompts = {
    grammar: `${stylePrefix}You are a grammar expert. Fix ALL grammar, spelling, and punctuation errors in the text below.
Return ONLY the corrected text. Do not add explanations.
If the text is already correct, return it unchanged.

Text: ${text}

Corrected text:`,

    rewrite: `${stylePrefix}You are a professional editor. Rewrite the text below to be clearer, more engaging, and better structured.
Preserve the original meaning. Return ONLY the rewritten text.

Text: ${text}

Rewritten:`,

    'tone-pro': `${stylePrefix}Rewrite the text below in a professional, formal tone.
Return ONLY the rewritten text.

Text: ${text}

Professional version:`,

    'tone-friendly': `${stylePrefix}Rewrite the text below in a warm, friendly, conversational tone.
Return ONLY the rewritten text.

Text: ${text}

Friendly version:`,

    shorter: `${stylePrefix}Make the text below more concise. Keep all key information. Return ONLY the shortened text.

Text: ${text}

Shortened:`,

    summarize: `Summarize the text below into 2-3 clear sentences. Return ONLY the summary.

Text: ${text}

Summary:`,

    explain: `Explain the text below in simple language. Return ONLY the explanation.

Text: ${text}

Explanation:`,

    translate: `Translate the text below to ${langName}. Return ONLY the translated text.

Text: ${text}

Translation:`,

    score: `Analyze the writing quality of the text below. Format EXACTLY:
Overall: [score]
Grammar: [score]
Clarity: [score]
Style: [score]
Feedback: [2-3 sentences]

Text: ${text}`,

    'realtime-check': `Fix grammar, spelling, and clarity issues. Return ONLY the corrected text unchanged if no fixes needed.

Text: ${text}

Corrected:`,

    custom: `${stylePrefix}${extra.customPrompt || 'Improve the text below.'}
Return ONLY the result.

Text: ${text}

Result:`,
  };

  return prompts[action] || prompts.grammar;
}
