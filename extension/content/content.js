// GramAI Content Script
// Floating toolbar, real-time suggestions, diff view, and inline results

(function () {
  if (window.__gramaiLoaded) return;
  window.__gramaiLoaded = true;

  // ── Settings ───────────────────────────────────────────────────────────────

  let settings = {
    gramai_toolbar: true,
    gramai_autocopy: false,
    gramai_autoscore: false,
    gramai_realtime: true,
    gramai_min_selection: 3,
    gramai_dark_mode: 'auto',
  };

  function loadSettings() {
    chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (res) => {
      if (res?.settings) {
        settings = { ...settings, ...res.settings };
        applyTheme();
      }
    });
  }

  function applyTheme() {
    const dark = settings.gramai_dark_mode === 'dark' ||
      (settings.gramai_dark_mode !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    root.classList.toggle('gramai-dark', dark);
  }

  loadSettings();
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync') {
      Object.keys(changes).forEach(k => { settings[k] = changes[k].newValue; });
      applyTheme();
    }
  });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

  // ── DOM Setup ──────────────────────────────────────────────────────────────

  const root = document.createElement('div');
  root.id = 'gramai-root';
  document.body.appendChild(root);

  const toolbar = document.createElement('div');
  toolbar.id = 'gramai-toolbar';
  toolbar.setAttribute('role', 'toolbar');
  toolbar.setAttribute('aria-label', 'GramAI writing tools');
  toolbar.innerHTML = `
    <button class="gramai-tool-btn" data-action="grammar" title="Fix grammar (Alt+G)">
      <span class="gramai-icon">✅</span> Fix
    </button>
    <button class="gramai-tool-btn" data-action="rewrite" title="Rewrite (Alt+R)">
      <span class="gramai-icon">✍️</span> Rewrite
    </button>
    <button class="gramai-tool-btn" data-action="score" title="Writing score (Alt+S)">
      <span class="gramai-icon">📊</span> Score
    </button>
    <div class="gramai-divider"></div>
    <button class="gramai-tool-btn" data-action="tone-pro" title="Make professional">
      <span class="gramai-icon">👔</span> Pro
    </button>
    <button class="gramai-tool-btn" data-action="tone-friendly" title="Make friendly">
      <span class="gramai-icon">😊</span> Friendly
    </button>
    <button class="gramai-tool-btn" data-action="shorter" title="Make shorter">
      <span class="gramai-icon">✂️</span> Shorter
    </button>
    <div class="gramai-divider"></div>
    <button class="gramai-tool-btn" data-action="summarize" title="Summarize">
      <span class="gramai-icon">📋</span> Summary
    </button>
    <button class="gramai-tool-btn" data-action="explain" title="Explain">
      <span class="gramai-icon">💡</span> Explain
    </button>
    <button class="gramai-tool-btn" data-action="custom" title="Custom prompt">
      <span class="gramai-icon">🎯</span> Custom
    </button>
  `;
  root.appendChild(toolbar);

  const panel = document.createElement('div');
  panel.id = 'gramai-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'GramAI result');
  panel.innerHTML = `
    <div class="gramai-panel-header">
      <div class="gramai-panel-logo">
        <div class="gramai-panel-logo-icon">✨</div>
        GramAI
        <span class="gramai-panel-action-label" id="gramai-action-label"></span>
      </div>
      <button class="gramai-close-btn" id="gramai-close" aria-label="Close">×</button>
    </div>
    <div class="gramai-panel-body" id="gramai-panel-body"></div>
    <div class="gramai-panel-footer" id="gramai-panel-footer" style="display:none;"></div>
  `;
  root.appendChild(panel);

  const customDialog = document.createElement('div');
  customDialog.id = 'gramai-custom-dialog';
  customDialog.innerHTML = `
    <div class="gramai-custom-inner">
      <div class="gramai-custom-title">Custom instruction</div>
      <div class="gramai-saved-prompts" id="gramai-saved-prompts"></div>
      <textarea id="gramai-custom-input" placeholder="e.g. Make this sound like Hemingway" rows="3"></textarea>
      <div class="gramai-custom-actions">
        <button class="gramai-btn" id="gramai-custom-cancel">Cancel</button>
        <button class="gramai-btn gramai-btn-primary" id="gramai-custom-run">Run</button>
      </div>
    </div>
  `;
  root.appendChild(customDialog);

  // ── State ──────────────────────────────────────────────────────────────────

  let selectedText = '';
  let selectionRange = null;
  let currentResult = '';
  let realtimeTimer = null;
  let realtimeEl = null;
  let realtimeOverlay = null;

  const actionLabels = {
    grammar: '— Grammar fix',
    rewrite: '— Rewriting',
    'tone-pro': '— Professional tone',
    'tone-friendly': '— Friendly tone',
    shorter: '— Shorter',
    summarize: '— Summary',
    explain: '— Explanation',
    translate: '— Translation',
    score: '— Writing score',
    custom: '— Custom',
  };

  const rewriteActions = new Set(['grammar', 'rewrite', 'tone-pro', 'tone-friendly', 'shorter', 'translate', 'custom']);

  // ── Toolbar Logic ──────────────────────────────────────────────────────────

  document.addEventListener('mouseup', (e) => {
    if (root.contains(e.target)) return;
    if (!settings.gramai_toolbar) return;
    setTimeout(() => {
      const sel = window.getSelection();
      const text = sel?.toString().trim();
      const minLen = settings.gramai_min_selection || 3;
      if (!text || text.length < minLen) {
        hideToolbar();
        return;
      }
      selectedText = text;
      try { selectionRange = sel.getRangeAt(0).cloneRange(); } catch {}
      const rect = sel.rangeCount ? sel.getRangeAt(0).getBoundingClientRect() : null;
      positionToolbar(rect, e.clientX, e.clientY);
    }, 10);
  });

  document.addEventListener('mousedown', (e) => {
    if (root.contains(e.target)) return;
    hideToolbar();
    if (!panel.contains(e.target)) hidePanel();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { hideToolbar(); hidePanel(); hideCustomDialog(); }
  });

  toolbar.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    if (!selectedText) return;
    hideToolbar();
    if (action === 'custom') {
      showCustomDialog(selectedText);
      return;
    }
    runAction(action, selectedText);
  });

  document.getElementById('gramai-close').addEventListener('click', hidePanel);
  document.getElementById('gramai-custom-cancel').addEventListener('click', hideCustomDialog);
  document.getElementById('gramai-custom-run').addEventListener('click', () => {
    const prompt = document.getElementById('gramai-custom-input').value.trim();
    if (!prompt || !selectedText) return;
    hideCustomDialog();
    runAction('custom', selectedText, { customPrompt: prompt });
  });

  function positionToolbar(rect, mouseX, mouseY) {
    toolbar.classList.add('visible');
    const tw = toolbar.offsetWidth || 480;
    const th = toolbar.offsetHeight || 40;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const pad = 8;

    let anchorX = mouseX;
    let anchorY = mouseY;
    if (rect && rect.width > 0) {
      anchorX = rect.left + rect.width / 2;
      anchorY = rect.top;
    }

    let left = anchorX + scrollX - tw / 2;
    let top = anchorY + scrollY - th - 12;

    left = Math.max(pad + scrollX, Math.min(left, vw + scrollX - tw - pad));
    top = Math.max(pad + scrollY, top);
    if (top + th > vh + scrollY - pad) {
      top = anchorY + scrollY + (rect?.height || 20) + 12;
      top = Math.min(top, vh + scrollY - th - pad);
    }

    toolbar.style.left = left + 'px';
    toolbar.style.top = top + 'px';
  }

  function hideToolbar() {
    toolbar.classList.remove('visible');
  }

  function showCustomDialog(text) {
    selectedText = text;
    document.getElementById('gramai-custom-input').value = '';
    customDialog.classList.add('visible');
    document.getElementById('gramai-custom-input').focus();
    chrome.runtime.sendMessage({ type: 'GET_PROMPTS' }, (res) => {
      const container = document.getElementById('gramai-saved-prompts');
      const prompts = res?.prompts || [];
      if (!prompts.length) { container.innerHTML = ''; return; }
      container.innerHTML = '';
      prompts.slice(0, 5).forEach(p => {
        const chip = document.createElement('button');
        chip.className = 'gramai-prompt-chip';
        chip.textContent = p.name;
        chip.addEventListener('click', () => {
          document.getElementById('gramai-custom-input').value = p.prompt;
        });
        container.appendChild(chip);
      });
    });
  }

  function hideCustomDialog() {
    customDialog.classList.remove('visible');
  }

  // ── Panel Logic ────────────────────────────────────────────────────────────

  function showPanel(x, y) {
    panel.classList.add('visible');
    const pw = Math.min(380, window.innerWidth - 16);
    panel.style.width = pw + 'px';
    const ph = panel.offsetHeight || 400;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const pad = 8;

    let left = x + scrollX - pw / 2;
    let top = y + scrollY + 20;

    left = Math.max(pad + scrollX, Math.min(left, vw + scrollX - pw - pad));
    if (top + ph > vh + scrollY - pad) top = y + scrollY - ph - 12;
    top = Math.max(pad + scrollY, top);

    panel.style.left = left + 'px';
    panel.style.top = top + 'px';
  }

  function hidePanel() {
    panel.classList.remove('visible');
    currentResult = '';
  }

  function setActionLabel(action) {
    document.getElementById('gramai-action-label').textContent = actionLabels[action] || '';
  }

  function panelAnchor() {
    const sel = window.getSelection();
    if (sel?.rangeCount) {
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.bottom };
    }
    return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  }

  function showLoading(action) {
    setActionLabel(action);
    document.getElementById('gramai-panel-body').innerHTML = `
      <div class="gramai-original-label">Selected text</div>
      <div class="gramai-original-text">${escHtml(selectedText.slice(0, 120))}${selectedText.length > 120 ? '…' : ''}</div>
      <div class="gramai-loading">
        <div class="gramai-spinner"></div>
        <span>Processing with local AI…</span>
      </div>
    `;
    document.getElementById('gramai-panel-footer').style.display = 'none';
    const { x, y } = panelAnchor();
    showPanel(x, y);
  }

  function showResult(action, result, originalText) {
    currentResult = result.trim();
    setActionLabel(action);

    const body = document.getElementById('gramai-panel-body');
    const footer = document.getElementById('gramai-panel-footer');

    if (action === 'score') {
      body.innerHTML = renderScore(result);
      footer.style.display = 'none';
      const overall = parseScoreOverall(result);
      if (overall) chrome.runtime.sendMessage({ type: 'SET_BADGE_SCORE', score: overall });
    } else if (action === 'summarize' || action === 'explain') {
      body.innerHTML = `
        <div class="gramai-original-label">Original</div>
        <div class="gramai-original-text">${escHtml(originalText.slice(0, 100))}${originalText.length > 100 ? '…' : ''}</div>
        <div class="gramai-original-label" style="margin-top:8px;">Result</div>
        <div class="gramai-result-text">${escHtml(currentResult)}</div>
      `;
      footer.style.display = 'flex';
      footer.innerHTML = `<button class="gramai-btn" id="gramai-copy-btn">📋 Copy</button>`;
      document.getElementById('gramai-copy-btn').onclick = () => copyToClipboard(currentResult);
    } else if (rewriteActions.has(action)) {
      const diffHtml = window.GramAIDiff
        ? window.GramAIDiff.renderDiffHtml(originalText, currentResult)
        : escHtml(currentResult);
      body.innerHTML = `
        <div class="gramai-original-label">Changes</div>
        <div class="gramai-diff-view">${diffHtml}</div>
        <div class="gramai-original-label" style="margin-top:10px;">Improved</div>
        <div class="gramai-result-text">${escHtml(currentResult)}</div>
      `;
      footer.style.display = 'flex';
      footer.innerHTML = `
        <button class="gramai-btn" id="gramai-copy-btn">📋 Copy</button>
        <button class="gramai-btn gramai-btn-success" id="gramai-replace-btn">✅ Replace text</button>
      `;
      document.getElementById('gramai-copy-btn').onclick = () => copyToClipboard(currentResult);
      document.getElementById('gramai-replace-btn').onclick = () => replaceSelectedText(currentResult);
    }

    if (settings.gramai_autocopy && currentResult) copyToClipboard(currentResult);
    const { x, y } = panelAnchor();
    showPanel(x, y);
  }

  function showError(errorMsg) {
    const isOffline = /failed to fetch|networkerror|network|ollama not running/i.test(errorMsg);
    document.getElementById('gramai-panel-body').innerHTML = `
      <div class="gramai-error-msg">
        <span>⚠️</span>
        <div>
          ${isOffline ? `
            <strong>Ollama isn't running</strong>
            <p style="margin:8px 0 0;font-size:12px;color:inherit;">GramAI needs Ollama on your computer to work.</p>
            <div class="gramai-troubleshoot">
              <div class="gramai-troubleshoot-step"><span>1</span> Install from <a href="https://ollama.com" target="_blank">ollama.com</a></div>
              <div class="gramai-troubleshoot-step"><span>2</span> Open terminal and run: <code>ollama serve</code></div>
              <div class="gramai-troubleshoot-step"><span>3</span> Pull a model: <code>ollama pull llama3.2</code></div>
            </div>
            <button class="gramai-btn gramai-btn-primary" id="gramai-open-guide" style="margin-top:10px;width:100%;">📖 Open setup guide</button>
          ` : escHtml(errorMsg)}
        </div>
      </div>
    `;
    document.getElementById('gramai-panel-footer').style.display = 'none';
    const guideBtn = document.getElementById('gramai-open-guide');
    if (guideBtn) {
      guideBtn.onclick = () => chrome.runtime.sendMessage({ type: 'OPEN_SETUP' });
    }
    const { x, y } = panelAnchor();
    showPanel(x, y);
  }

  function parseScoreOverall(raw) {
    const m = raw.match(/overall:\s*(\d+)/i);
    return m ? parseInt(m[1], 10) : null;
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
    const scoreCards = ['overall', 'grammar', 'clarity', 'style'].map(k => {
      const val = scores[k] || 0;
      return `<div class="gramai-score-card">
        <div class="gramai-score-num" style="color:${scoreColor(val)}">${val}</div>
        <div class="gramai-score-lbl">${k}</div>
      </div>`;
    }).join('');
    return `
      <div class="gramai-score-grid">${scoreCards}</div>
      ${feedback ? `<div class="gramai-score-feedback">${escHtml(feedback)}</div>` : ''}
    `;
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  function runAction(action, text, extra = {}) {
    selectedText = text;
    showLoading(action);
    chrome.runtime.sendMessage(
      { type: 'PROCESS_TEXT', action, text, extra },
      (response) => {
        if (chrome.runtime.lastError) {
          showError('Extension error. Reload the page and try again.');
          return;
        }
        if (response?.ok) {
          showResult(action, response.result, text);
        } else {
          showError(response?.error || 'Unknown error');
        }
      }
    );
  }

  function replaceSelectedText(newText) {
    try {
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
        const start = active.selectionStart;
        const end = active.selectionEnd;
        const val = active.value;
        active.value = val.slice(0, start) + newText + val.slice(end);
        active.selectionStart = active.selectionEnd = start + newText.length;
        active.dispatchEvent(new Event('input', { bubbles: true }));
        hidePanel();
        return;
      }
      if (selectionRange) {
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(selectionRange);
        document.execCommand('insertText', false, newText);
        hidePanel();
        return;
      }
    } catch {}
    copyToClipboard(newText);
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      const btn = document.getElementById('gramai-copy-btn');
      if (btn) { btn.textContent = '✅ Copied!'; setTimeout(() => { btn.textContent = '📋 Copy'; }, 2000); }
    }).catch(() => {});
  }

  function escHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── Real-time Suggestions ──────────────────────────────────────────────────

  function getParagraphText(el) {
    const val = el.value || el.textContent || '';
    const pos = el.selectionStart ?? val.length;
    const before = val.slice(0, pos);
    const lastBreak = Math.max(before.lastIndexOf('\n\n'), before.lastIndexOf('. '));
    const start = lastBreak === -1 ? 0 : lastBreak + (before[lastBreak] === '.' ? 2 : 2);
    const after = val.slice(pos);
    const nextBreak = after.search(/\n\n|\.\s/);
    const end = nextBreak === -1 ? val.length : pos + nextBreak + 1;
    return { text: val.slice(start, end).trim(), start, end };
  }

  function setupRealtime(el) {
    if (el.dataset.gramaiRealtime) return;
    el.dataset.gramaiRealtime = '1';

    el.addEventListener('input', () => {
      if (!settings.gramai_realtime) return;
      clearTimeout(realtimeTimer);
      realtimeEl = el;
      realtimeTimer = setTimeout(() => checkRealtime(el), 1200);
    });

    el.addEventListener('blur', () => {
      clearTimeout(realtimeTimer);
      removeRealtimeOverlay();
    });
  }

  function checkRealtime(el) {
    const { text } = getParagraphText(el);
    if (!text || text.length < 10) {
      removeRealtimeOverlay();
      return;
    }

    chrome.runtime.sendMessage(
      { type: 'PROCESS_TEXT', action: 'realtime-check', text },
      (response) => {
        if (!response?.ok || !response.result) return;
        const corrected = response.result.trim();
        if (corrected !== text.trim()) {
          showRealtimeIssues(el, text, corrected);
        } else {
          removeRealtimeOverlay();
        }
        if (settings.gramai_autoscore && text.length > 30) {
          chrome.runtime.sendMessage(
            { type: 'PROCESS_TEXT', action: 'score', text: text.slice(0, 500) },
            (r) => {
              const overall = r?.ok ? parseScoreOverall(r.result) : null;
              if (overall) chrome.runtime.sendMessage({ type: 'SET_BADGE_SCORE', score: overall });
            }
          );
        }
      }
    );
  }

  function showRealtimeIssues(el, original, corrected) {
    removeRealtimeOverlay();

    const overlay = document.createElement('div');
    overlay.className = 'gramai-realtime-hint';
    overlay.innerHTML = `
      <span class="gramai-realtime-dot grammar"></span>
      <span>Grammar issues detected</span>
      <button class="gramai-realtime-fix">Fix</button>
      <button class="gramai-realtime-dismiss">×</button>
    `;

    const rect = el.getBoundingClientRect();
    overlay.style.top = (rect.bottom + window.scrollY + 4) + 'px';
    overlay.style.left = (rect.left + window.scrollX) + 'px';
    overlay.style.maxWidth = Math.min(rect.width, window.innerWidth - 16) + 'px';

    overlay.querySelector('.gramai-realtime-fix').onclick = () => {
      if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
        const start = el.selectionStart;
        const { text, start: pStart } = getParagraphText(el);
        const newVal = el.value.slice(0, pStart) + corrected + el.value.slice(pStart + text.length);
        el.value = newVal;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
      removeRealtimeOverlay();
    };
    overlay.querySelector('.gramai-realtime-dismiss').onclick = removeRealtimeOverlay;

    document.body.appendChild(overlay);
    realtimeOverlay = overlay;
  }

  function removeRealtimeOverlay() {
    if (realtimeOverlay) {
      realtimeOverlay.remove();
      realtimeOverlay = null;
    }
  }

  document.addEventListener('focusin', (e) => {
    const el = e.target;
    if (el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && ['text', 'search', 'email'].includes(el.type)))) {
      setupRealtime(el);
    }
  });

  // ── Message Listeners ────────────────────────────────────────────────────────

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'SHOW_LOADING') {
      selectedText = msg.selectedText;
      showLoading(msg.action);
    } else if (msg.type === 'SHOW_RESULT') {
      showResult(msg.action, msg.result, msg.originalText);
    } else if (msg.type === 'SHOW_ERROR') {
      showError(msg.error);
    } else if (msg.type === 'SHOW_EXTENDED_TOOLBAR') {
      selectedText = msg.selectedText;
      try {
        const sel = window.getSelection();
        if (sel?.rangeCount) {
          const rect = sel.getRangeAt(0).getBoundingClientRect();
          positionToolbar(rect, rect.left, rect.bottom);
        }
      } catch {}
      toolbar.classList.add('visible');
    } else if (msg.type === 'RUN_SHORTCUT') {
      const text = window.getSelection()?.toString().trim();
      if (text) runAction(msg.action, text);
    }
  });

})();
