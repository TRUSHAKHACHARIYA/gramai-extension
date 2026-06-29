// GramAI Popup Script

const toolNames = {
  grammar:       '✅ Grammar fix',
  rewrite:       '✍️ Rewritten',
  score:         '📊 Writing score',
  'tone-pro':    '👔 Professional',
  'tone-friendly': '😊 Friendly',
  shorter:       '✂️ Shorter',
  summarize:     '📋 Summary',
  explain:       '💡 Explanation',
  translate:     '🌐 Translation',
  custom:        '🎯 Custom',
};

const rewriteTools = new Set(['grammar', 'rewrite', 'tone-pro', 'tone-friendly', 'shorter', 'translate', 'custom']);

let selectedTool = 'grammar';
let isProcessing = false;
let wizardStep = 1;
let settings = {};

// ── Init ───────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  loadTier();
  setupTabs();
  setupToolCards();
  setupTextarea();
  setupButtons();
  setupWizard();
  setupLanguageSelect();
  setupPrompts();
  loadLastText();
  loadPendingText();
  checkOllamaStatus();
  loadHistory();
});

function loadTier() {
  chrome.runtime.sendMessage({ type: 'GET_TIER' }, (res) => {
    const pill = document.getElementById('tier-pill');
    const tier = res?.gramai_tier || 'free';
    pill.textContent = tier.toUpperCase();
    pill.className = 'tier-pill ' + tier;
  });
}

function loadSettings() {
  chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (res) => {
    if (res?.settings) {
      settings = res.settings;
      applyTheme();
    }
  });
}

function applyTheme() {
  const dark = settings.gramai_dark_mode === 'dark' ||
    (settings.gramai_dark_mode !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.body.classList.toggle('dark', dark);
}

// ── Tabs ───────────────────────────────────────────────────────────────────

function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
      if (btn.dataset.tab === 'history') loadHistory();
      if (btn.dataset.tab === 'prompts') loadPrompts();
    });
  });
}

// ── Ollama Status ──────────────────────────────────────────────────────────

function checkOllamaStatus() {
  const dot = document.getElementById('status-dot');
  const txt = document.getElementById('status-text');
  const modelEl = document.getElementById('status-model');
  const wizard = document.getElementById('setup-wizard');
  const mainPanel = document.getElementById('main-panel');
  const skeleton = document.getElementById('skeleton-wrap');

  dot.className = 'status-indicator checking';
  txt.textContent = 'Checking Ollama…';
  skeleton.style.display = '';

  chrome.runtime.sendMessage({ type: 'CHECK_OLLAMA' }, (res) => {
    skeleton.style.display = 'none';

    if (res?.ok) {
      dot.className = 'status-indicator online';
      const modeLabel = res.mode === 'cloud' ? 'Cloud' : 'Local';
      txt.textContent = `${modeLabel} · ${res.modelCount != null ? res.modelCount + ' models' : 'online'}`;
      wizard.style.display = 'none';
      mainPanel.style.display = '';

      chrome.runtime.sendMessage({ type: 'GET_MODELS' }, (r) => {
        if (r?.activeModel) {
          modelEl.textContent = r.activeModel.split(':')[0];
        } else if (r?.models?.length) {
          modelEl.textContent = r.models[0].split(':')[0];
        }
      });

      if (!settings.gramai_setup_complete) {
        chrome.storage.sync.set({ gramai_setup_complete: true });
      }
      updateRunButton();
    } else {
      dot.className = 'status-indicator offline';
      txt.textContent = 'Ollama offline';
      modelEl.textContent = '';
      mainPanel.style.display = 'none';
      wizard.style.display = '';
      showWizardStep(1);
    }
  });
}

// ── Setup Wizard ───────────────────────────────────────────────────────────

function setupWizard() {
  document.getElementById('wizard-next').addEventListener('click', () => {
    if (wizardStep < 4) showWizardStep(wizardStep + 1);
    else checkOllamaStatus();
  });
  document.getElementById('wizard-prev').addEventListener('click', () => {
    if (wizardStep > 1) showWizardStep(wizardStep - 1);
  });
  document.getElementById('wizard-test-btn').addEventListener('click', () => {
    const resultEl = document.getElementById('wizard-test-result');
    resultEl.textContent = 'Testing…';
    chrome.runtime.sendMessage({ type: 'CHECK_OLLAMA' }, (res) => {
      if (res?.ok) {
        resultEl.textContent = `✅ Connected! ${res.modelCount} model(s) found.`;
        resultEl.style.color = '#059669';
        setTimeout(checkOllamaStatus, 1000);
      } else {
        resultEl.textContent = '❌ Still offline. Make sure Ollama is running.';
        resultEl.style.color = '#dc2626';
      }
    });
  });

  document.querySelectorAll('.copy-code-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      navigator.clipboard.writeText(btn.dataset.copy).then(() => {
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
      });
    });
  });
}

function showWizardStep(step) {
  wizardStep = step;
  for (let i = 1; i <= 4; i++) {
    document.getElementById('wizard-panel-' + i).style.display = i === step ? '' : 'none';
    const stepEl = document.querySelector(`.wizard-step[data-step="${i}"]`);
    stepEl.classList.toggle('active', i === step);
    stepEl.classList.toggle('done', i < step);
  }
  document.getElementById('wizard-prev').disabled = step === 1;
  document.getElementById('wizard-next').textContent = step === 4 ? 'Finish' : 'Next →';
}

// ── Language Select ────────────────────────────────────────────────────────

function setupLanguageSelect() {
  const select = document.getElementById('translate-lang');
  const langs = window.GramAILanguages?.GRAMAI_LANGUAGES || [{ code: 'en', name: 'English' }];
  langs.forEach(l => {
    const opt = document.createElement('option');
    opt.value = l.code;
    opt.textContent = l.name;
    select.appendChild(opt);
  });
  chrome.storage.sync.get({ gramai_translate_lang: 'en' }, data => {
    select.value = data.gramai_translate_lang;
  });
  select.addEventListener('change', () => {
    chrome.storage.sync.set({ gramai_translate_lang: select.value });
    updateRunButton();
  });
}

// ── Tool Cards ─────────────────────────────────────────────────────────────

function setupToolCards() {
  document.querySelectorAll('.tool-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.tool-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedTool = card.dataset.tool;
      document.getElementById('translate-section').style.display = selectedTool === 'translate' ? '' : 'none';
      document.getElementById('custom-section').style.display = selectedTool === 'custom' ? '' : 'none';
      updateRunButton();
      hideResult();
    });
  });
}

function updateRunButton() {
  const btn = document.getElementById('run-btn');
  const txtEl = document.getElementById('run-btn-text');
  const text = document.getElementById('main-input').value.trim();
  const dot = document.getElementById('status-dot');
  const online = dot.classList.contains('online');

  if (!online) {
    btn.disabled = true;
    txtEl.textContent = 'Ollama offline';
    return;
  }
  if (!text) {
    btn.disabled = true;
    txtEl.textContent = 'Enter text above';
    return;
  }
  if (selectedTool === 'custom' && !document.getElementById('custom-prompt').value.trim()) {
    btn.disabled = true;
    txtEl.textContent = 'Enter custom instruction';
    return;
  }
  if (isProcessing) {
    btn.disabled = true;
    txtEl.textContent = 'Processing…';
    return;
  }
  btn.disabled = false;
  const labels = {
    grammar: 'Fix Grammar',
    rewrite: 'Rewrite Text',
    score: 'Score Writing',
    'tone-pro': 'Make Professional',
    'tone-friendly': 'Make Friendly',
    shorter: 'Make Shorter',
    summarize: 'Summarize',
    explain: 'Explain This',
    translate: `Translate to ${getLangName()}`,
    custom: 'Run Custom',
  };
  txtEl.textContent = labels[selectedTool] || 'Run';
}

function getLangName() {
  const code = document.getElementById('translate-lang').value;
  return window.GramAILanguages?.getLanguageName(code) || 'English';
}

// ── Textarea ───────────────────────────────────────────────────────────────

function setupTextarea() {
  const ta = document.getElementById('main-input');
  const cc = document.getElementById('char-count');

  ta.addEventListener('input', () => {
    cc.textContent = ta.value.length;
    updateRunButton();
    chrome.storage.local.set({ gramai_last_text: ta.value });
  });

  document.getElementById('custom-prompt').addEventListener('input', updateRunButton);
}

function loadLastText() {
  chrome.storage.local.get({ gramai_last_text: '' }, (data) => {
    if (data.gramai_last_text) {
      document.getElementById('main-input').value = data.gramai_last_text;
      document.getElementById('char-count').textContent = data.gramai_last_text.length;
      updateRunButton();
    }
  });
}

function loadPendingText() {
  chrome.storage.local.get({ gramai_pending_text: '' }, (data) => {
    if (data.gramai_pending_text) {
      document.getElementById('main-input').value = data.gramai_pending_text;
      document.getElementById('char-count').textContent = data.gramai_pending_text.length;
      chrome.storage.local.remove('gramai_pending_text');
      updateRunButton();
    }
  });
}

// ── Buttons ────────────────────────────────────────────────────────────────

function setupButtons() {
  document.getElementById('run-btn').addEventListener('click', runTool);
  document.getElementById('result-close').addEventListener('click', hideResult);
  document.getElementById('settings-btn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  document.getElementById('open-options').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
  document.getElementById('history-clear-btn').addEventListener('click', () => {
    if (!confirm('Clear all history?')) return;
    chrome.runtime.sendMessage({ type: 'CLEAR_HISTORY' }, () => loadHistory());
  });
  document.getElementById('upgrade-link').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
  document.getElementById('save-prompt-btn').addEventListener('click', savePromptFromPopup);
}

// ── Run Tool ───────────────────────────────────────────────────────────────

function runTool() {
  const text = document.getElementById('main-input').value.trim();
  if (!text || isProcessing) return;

  const extra = {};
  if (selectedTool === 'translate') {
    extra.targetLang = document.getElementById('translate-lang').value;
  }
  if (selectedTool === 'custom') {
    extra.customPrompt = document.getElementById('custom-prompt').value.trim();
    if (!extra.customPrompt) return;
  }

  isProcessing = true;
  updateRunButton();
  showLoading();

  chrome.runtime.sendMessage(
    { type: 'PROCESS_TEXT', action: selectedTool, text, extra },
    (response) => {
      isProcessing = false;
      updateRunButton();

      if (chrome.runtime.lastError || !response) {
        showResultError('Extension error. Try reloading.');
        return;
      }
      if (response.ok) {
        showResultText(response.result, selectedTool, text);
      } else {
        const isOffline = (response.error || '').match(/fetch|network/i);
        showResultError(isOffline
          ? 'Cannot reach Ollama. Make sure it is running.'
          : response.error || 'Unknown error'
        );
      }
    }
  );
}

// ── Result Display ─────────────────────────────────────────────────────────

function showLoading() {
  const sec = document.getElementById('result-section');
  const body = document.getElementById('result-body');
  const actions = document.getElementById('result-actions');
  const title = document.getElementById('result-title');

  title.textContent = 'Working…';
  body.innerHTML = `
    <div class="result-skeleton">
      <div class="skeleton skeleton-line"></div>
      <div class="skeleton skeleton-line short"></div>
      <div class="skeleton skeleton-line"></div>
      <div class="skeleton skeleton-line medium"></div>
    </div>
    <div class="result-spinner"><div class="spinner"></div><span>Running local AI model…</span></div>
  `;
  actions.innerHTML = '';
  sec.style.display = '';
}

function showResultText(text, tool, originalText) {
  const sec = document.getElementById('result-section');
  const body = document.getElementById('result-body');
  const actions = document.getElementById('result-actions');
  const title = document.getElementById('result-title');

  const result = text.trim();
  title.textContent = toolNames[tool] || 'Result';

  if (tool === 'score') {
    body.innerHTML = renderScore(result);
    actions.innerHTML = '';
  } else if (rewriteTools.has(tool)) {
    const diffHtml = window.GramAIDiff
      ? window.GramAIDiff.renderDiffHtml(originalText, result)
      : escHtml(result);
    body.innerHTML = `
      <div class="diff-label">Changes</div>
      <div class="diff-view">${diffHtml}</div>
      <div class="diff-label" style="margin-top:8px;">Result</div>
      <div class="result-text-block">${escHtml(result)}</div>
    `;
    actions.innerHTML = `
      <button class="result-btn" id="popup-copy-btn">📋 Copy</button>
      <button class="result-btn result-btn-primary" id="popup-use-btn">✅ Use this</button>
    `;
    bindResultActions(result);
  } else {
    body.innerHTML = `<div class="result-text-block">${escHtml(result)}</div>`;
    actions.innerHTML = `
      <button class="result-btn" id="popup-copy-btn">📋 Copy</button>
      <button class="result-btn result-btn-primary" id="popup-use-btn">✅ Use this</button>
    `;
    bindResultActions(result);
  }

  sec.style.display = '';
}

function bindResultActions(result) {
  const copyBtn = document.getElementById('popup-copy-btn');
  const useBtn = document.getElementById('popup-use-btn');
  if (copyBtn) {
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(result).then(() => {
        copyBtn.textContent = '✅ Copied!';
        setTimeout(() => { copyBtn.textContent = '📋 Copy'; }, 2000);
      });
    };
  }
  if (useBtn) {
    useBtn.onclick = () => {
      document.getElementById('main-input').value = result;
      document.getElementById('char-count').textContent = result.length;
      updateRunButton();
      hideResult();
    };
  }
}

function renderScore(raw) {
  const lines = raw.split('\n');
  const scores = {};
  let feedback = '';
  for (const line of lines) {
    const m = line.match(/^(\w+):\s*(\d+)/i);
    if (m) scores[m[1].toLowerCase()] = parseInt(m[2], 10);
    if (line.toLowerCase().startsWith('feedback:')) feedback = line.replace(/^feedback:\s*/i, '');
  }
  const scoreColor = (n) => n >= 80 ? '#10b981' : n >= 60 ? '#f59e0b' : '#ef4444';
  const cards = ['overall', 'grammar', 'clarity', 'style'].map(k => {
    const val = scores[k] || 0;
    return `<div class="score-card"><div class="score-num" style="color:${scoreColor(val)}">${val}</div><div class="score-lbl">${k}</div></div>`;
  }).join('');
  return `<div class="score-grid">${cards}</div>${feedback ? `<div class="score-feedback">${escHtml(feedback)}</div>` : ''}`;
}

function showResultError(msg) {
  const body = document.getElementById('result-body');
  const title = document.getElementById('result-title');
  const actions = document.getElementById('result-actions');
  title.textContent = 'Error';
  body.innerHTML = `<span class="error-text">⚠️ ${escHtml(msg)}</span>`;
  actions.innerHTML = '';
  document.getElementById('result-section').style.display = '';
}

function hideResult() {
  document.getElementById('result-section').style.display = 'none';
}

// ── History ────────────────────────────────────────────────────────────────

function loadHistory() {
  chrome.runtime.sendMessage({ type: 'GET_HISTORY' }, (res) => {
    const list = document.getElementById('history-list');
    const items = res?.history || [];
    if (!items.length) {
      list.innerHTML = '<div class="history-empty">No history yet. Run a tool to see results here.</div>';
      return;
    }
    list.innerHTML = items.map(item => `
      <div class="history-item" data-id="${item.id}">
        <div class="history-item-header">
          <span class="history-action">${escHtml(item.action)}</span>
          <span class="history-time">${formatTime(item.timestamp)}</span>
          <button class="history-star ${item.starred ? 'starred' : ''}" data-id="${item.id}" title="Star">${item.starred ? '★' : '☆'}</button>
        </div>
        <div class="history-in">${escHtml(item.textIn.slice(0, 80))}${item.textIn.length > 80 ? '…' : ''}</div>
        <div class="history-out">${escHtml(item.textOut.slice(0, 80))}${item.textOut.length > 80 ? '…' : ''}</div>
        <div class="history-item-actions">
          <button class="history-use-btn" data-id="${item.id}">Use result</button>
          <button class="history-del-btn" data-id="${item.id}">Delete</button>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('.history-star').forEach(btn => {
      btn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'TOGGLE_STAR_HISTORY', id: btn.dataset.id }, () => loadHistory());
      });
    });
    list.querySelectorAll('.history-use-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = items.find(i => i.id === btn.dataset.id);
        if (!item) return;
        document.getElementById('main-input').value = item.textOut;
        document.getElementById('char-count').textContent = item.textOut.length;
        document.querySelector('[data-tab="write"]').click();
        updateRunButton();
      });
    });
    list.querySelectorAll('.history-del-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'DELETE_HISTORY_ITEM', id: btn.dataset.id }, () => loadHistory());
      });
    });
  });
}

function formatTime(ts) {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Prompts Library ────────────────────────────────────────────────────────

function setupPrompts() {
  loadPrompts();
}

function loadPrompts() {
  chrome.runtime.sendMessage({ type: 'GET_PROMPTS' }, (res) => {
    const list = document.getElementById('prompts-list');
    const prompts = res?.prompts || [];
    if (!prompts.length) {
      list.innerHTML = '<div class="history-empty">No saved prompts. Save one below (Pro).</div>';
      return;
    }
    list.innerHTML = prompts.map(p => `
      <div class="prompt-item" data-prompt="${escAttr(p.prompt)}">
        <div class="prompt-item-name">${escHtml(p.name)}</div>
        <div class="prompt-item-text">${escHtml(p.prompt.slice(0, 80))}</div>
      </div>
    `).join('');
    list.querySelectorAll('.prompt-item').forEach(item => {
      item.addEventListener('click', () => {
        selectedTool = 'custom';
        document.querySelectorAll('.tool-card').forEach(c => c.classList.remove('selected'));
        document.querySelector('[data-tool="custom"]')?.classList.add('selected');
        document.getElementById('custom-section').style.display = '';
        document.getElementById('custom-prompt').value = item.dataset.prompt;
        document.querySelector('[data-tab="write"]').click();
        updateRunButton();
      });
    });
  });
}

function savePromptFromPopup() {
  const name = document.getElementById('popup-prompt-name').value.trim();
  const prompt = document.getElementById('popup-prompt-text').value.trim();
  if (!name || !prompt) return;
  chrome.runtime.sendMessage({ type: 'SAVE_PROMPT', prompt: { name, prompt } }, (res) => {
    if (res?.ok) {
      document.getElementById('popup-prompt-name').value = '';
      document.getElementById('popup-prompt-text').value = '';
      loadPrompts();
    } else {
      alert(res?.error || 'Pro license required');
    }
  });
}

function escAttr(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
}
