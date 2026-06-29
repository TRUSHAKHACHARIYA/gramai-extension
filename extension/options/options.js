// GramAI Options Page Script v2.0

let detectedModels = [];

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  loadLicenseStatus();
  loadPrompts();
  loadStyleGuides();

  document.getElementById('test-btn').addEventListener('click', testConnection);
  document.getElementById('test-cloud-btn').addEventListener('click', testCloud);
  document.getElementById('save-btn').addEventListener('click', saveSettings);
  document.getElementById('reset-btn').addEventListener('click', resetSettings);
  document.getElementById('clear-history-btn').addEventListener('click', clearHistory);
  document.getElementById('activate-license-btn').addEventListener('click', activateLicense);
  document.getElementById('deactivate-license-btn').addEventListener('click', deactivateLicense);
  document.getElementById('add-prompt-btn').addEventListener('click', addPrompt);
  document.getElementById('open-dashboard-btn').addEventListener('click', openDashboard);
  document.getElementById('sync-guides-btn').addEventListener('click', syncGuides);

  const slider = document.getElementById('feat-min-selection');
  const sliderVal = document.getElementById('min-sel-val');
  slider.addEventListener('input', () => { sliderVal.textContent = slider.value; });
  document.getElementById('dark-mode').addEventListener('change', applyTheme);
  document.getElementById('active-style-guide').addEventListener('change', (e) => {
    chrome.storage.sync.set({ gramai_active_style_guide: e.target.value });
  });
});

function loadSettings() {
  chrome.storage.sync.get({
    gramai_ollama_url: 'http://localhost:11434',
    gramai_model: '',
    gramai_toolbar: true,
    gramai_contextmenu: true,
    gramai_autocopy: false,
    gramai_history: true,
    gramai_autoscore: false,
    gramai_realtime: true,
    gramai_min_selection: 3,
    gramai_dark_mode: 'auto',
    gramai_mode: 'local',
    gramai_cloud_url: 'http://localhost:3847',
    gramai_license_key: '',
    gramai_active_style_guide: '',
  }, (data) => {
    document.getElementById('ollama-url').value = data.gramai_ollama_url;
    document.getElementById('cloud-url').value = data.gramai_cloud_url;
    document.getElementById('ai-mode').value = data.gramai_mode;
    document.getElementById('license-key').value = data.gramai_license_key;
    document.getElementById('feat-toolbar').checked = data.gramai_toolbar;
    document.getElementById('feat-contextmenu').checked = data.gramai_contextmenu;
    document.getElementById('feat-autocopy').checked = data.gramai_autocopy;
    document.getElementById('feat-history').checked = data.gramai_history;
    document.getElementById('feat-autoscore').checked = data.gramai_autoscore;
    document.getElementById('feat-realtime').checked = data.gramai_realtime;
    document.getElementById('feat-min-selection').value = data.gramai_min_selection;
    document.getElementById('min-sel-val').textContent = data.gramai_min_selection;
    document.getElementById('dark-mode').value = data.gramai_dark_mode;
    applyTheme();
  });
}

function loadLicenseStatus() {
  chrome.runtime.sendMessage({ type: 'GET_TIER' }, (res) => {
    const badge = document.getElementById('tier-badge');
    const status = document.getElementById('license-status');
    const dot = document.getElementById('license-dot');
    const tier = res?.gramai_tier || 'free';

    badge.textContent = tier.toUpperCase();
    badge.className = `tier-badge tier-${tier}`;

    if (res?.gramai_license_key) {
      dot.className = 'status-dot dot-green';
      status.textContent = `${tier.toUpperCase()} active — ${res.gramai_license_email || res.gramai_license_key}`;
    } else {
      dot.className = 'status-dot dot-gray';
      status.textContent = 'No license activated — using Free tier';
    }
  });
}

function activateLicense() {
  const key = document.getElementById('license-key').value.trim();
  if (!key) return alert('Enter a license key');
  const cloudUrl = document.getElementById('cloud-url').value.trim();
  chrome.storage.sync.set({ gramai_cloud_url: cloudUrl }, () => {
    chrome.runtime.sendMessage({ type: 'ACTIVATE_LICENSE', key }, (res) => {
      if (res?.ok) {
        showToast('✅ License activated!');
        loadLicenseStatus();
      } else {
        alert(res?.error || 'Activation failed');
      }
    });
  });
}

function deactivateLicense() {
  if (!confirm('Deactivate license? You will revert to Free tier.')) return;
  chrome.runtime.sendMessage({ type: 'DEACTIVATE_LICENSE' }, () => {
    document.getElementById('license-key').value = '';
    loadLicenseStatus();
    showToast('License deactivated');
  });
}

function testCloud() {
  const url = document.getElementById('cloud-url').value.trim();
  chrome.storage.sync.set({ gramai_cloud_url: url }, () => {
    const dot = document.getElementById('cloud-dot');
    const status = document.getElementById('cloud-status');
    dot.className = 'status-dot dot-gray';
    status.textContent = 'Testing…';
    chrome.runtime.sendMessage({ type: 'CHECK_CLOUD' }, (res) => {
      if (res?.ok) {
        dot.className = 'status-dot dot-green';
        status.textContent = `Cloud online — provider: ${res.provider || 'ollama'}`;
      } else {
        dot.className = 'status-dot dot-red';
        status.textContent = res?.error || 'Cloud API unavailable';
      }
    });
  });
}

function loadPrompts() {
  chrome.runtime.sendMessage({ type: 'GET_PROMPTS' }, (res) => {
    const list = document.getElementById('prompt-list');
    const prompts = res?.prompts || [];
    if (!prompts.length) {
      list.innerHTML = '<div class="hint">No saved prompts. Add one above (Pro required).</div>';
      return;
    }
    list.innerHTML = prompts.map(p => `
      <div class="prompt-row">
        <span><strong>${escHtml(p.name)}</strong> — ${escHtml(p.prompt.slice(0, 60))}</span>
        <button class="btn btn-secondary" onclick="deletePrompt('${p.id}')">Delete</button>
      </div>
    `).join('');
  });
}

window.deletePrompt = function(id) {
  chrome.runtime.sendMessage({ type: 'DELETE_PROMPT', id }, () => loadPrompts());
};

function addPrompt() {
  const name = document.getElementById('new-prompt-name').value.trim();
  const prompt = document.getElementById('new-prompt-text').value.trim();
  if (!name || !prompt) return alert('Enter name and prompt text');
  chrome.runtime.sendMessage({ type: 'SAVE_PROMPT', prompt: { name, prompt } }, (res) => {
    if (res?.ok) {
      document.getElementById('new-prompt-name').value = '';
      document.getElementById('new-prompt-text').value = '';
      loadPrompts();
      showToast('Prompt saved!');
    } else {
      alert(res?.error || 'Failed — Pro license required');
    }
  });
}

function loadStyleGuides() {
  chrome.runtime.sendMessage({ type: 'GET_STYLE_GUIDES' }, (res) => {
    const guides = res?.guides || [];
    const select = document.getElementById('active-style-guide');
    const list = document.getElementById('guide-list');

    select.innerHTML = '<option value="">None</option>';
    guides.forEach(g => {
      const opt = document.createElement('option');
      opt.value = g.id;
      opt.textContent = g.name;
      select.appendChild(opt);
    });

    chrome.storage.sync.get({ gramai_active_style_guide: '' }, (data) => {
      if (data.gramai_active_style_guide) select.value = data.gramai_active_style_guide;
    });

    if (!guides.length) {
      list.innerHTML = '<div class="hint">No style guides. Use the Admin Dashboard (Team license).</div>';
      return;
    }
    list.innerHTML = guides.map(g => `
      <div class="guide-row">
        <span><strong>${escHtml(g.name)}</strong> — ${escHtml((g.rules || '').slice(0, 80))}</span>
      </div>
    `).join('');
  });
}

function openDashboard() {
  chrome.runtime.sendMessage({ type: 'GET_DASHBOARD_URL' }, (res) => {
    if (res?.url) chrome.tabs.create({ url: res.url });
  });
}

function syncGuides() {
  chrome.runtime.sendMessage({ type: 'SYNC_STYLE_GUIDES' }, (res) => {
    if (res?.ok) { loadStyleGuides(); showToast('Style guides synced!'); }
    else alert(res?.error || 'Sync failed — Team license and cloud server required');
  });
}

function applyTheme() {
  const mode = document.getElementById('dark-mode').value;
  const dark = mode === 'dark' || (mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.body.classList.toggle('dark', dark);
}

function testConnection() {
  const url = document.getElementById('ollama-url').value.trim() || 'http://localhost:11434';
  const dot = document.getElementById('conn-dot');
  const status = document.getElementById('conn-status');
  dot.className = 'status-dot dot-gray';
  status.textContent = 'Testing…';

  fetch(`${url}/api/tags`, { signal: AbortSignal.timeout(4000) })
    .then(r => r.json())
    .then(data => {
      detectedModels = (data.models || []).map(m => m.name);
      dot.className = 'status-dot dot-green';
      status.textContent = `Connected — ${detectedModels.length} model(s) found`;
      populateModels(detectedModels);
    })
    .catch(() => {
      dot.className = 'status-dot dot-red';
      status.textContent = 'Cannot connect. Is Ollama running?';
      document.getElementById('models-list').innerHTML =
        '<div style="font-size:12px;color:#dc2626;">No models found — start Ollama first</div>';
    });
}

function populateModels(models) {
  const select = document.getElementById('model-select');
  const list = document.getElementById('models-list');
  select.innerHTML = '<option value="">Auto-detect (recommended)</option>';
  models.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m; opt.textContent = m;
    select.appendChild(opt);
  });
  chrome.storage.sync.get({ gramai_model: '' }, (data) => {
    if (data.gramai_model) select.value = data.gramai_model;
  });
  if (!models.length) {
    list.innerHTML = '<div style="font-size:12px;color:var(--text-faint);">No models installed.</div>';
    return;
  }
  list.innerHTML = models.map(m => `
    <div class="model-row">
      <span class="model-name">${escHtml(m)}</span>
      <button class="model-select-btn" data-model="${escHtml(m)}" onclick="selectModel(this,'${escHtml(m)}')">Select</button>
    </div>
  `).join('');
}

function selectModel(btn, model) {
  document.querySelectorAll('.model-select-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  btn.textContent = '✅ Selected';
  document.getElementById('model-select').value = model;
}

function saveSettings() {
  chrome.storage.sync.set({
    gramai_ollama_url: document.getElementById('ollama-url').value.trim() || 'http://localhost:11434',
    gramai_cloud_url: document.getElementById('cloud-url').value.trim() || 'http://localhost:3847',
    gramai_mode: document.getElementById('ai-mode').value,
    gramai_model: document.getElementById('model-select').value,
    gramai_toolbar: document.getElementById('feat-toolbar').checked,
    gramai_contextmenu: document.getElementById('feat-contextmenu').checked,
    gramai_autocopy: document.getElementById('feat-autocopy').checked,
    gramai_history: document.getElementById('feat-history').checked,
    gramai_autoscore: document.getElementById('feat-autoscore').checked,
    gramai_realtime: document.getElementById('feat-realtime').checked,
    gramai_min_selection: parseInt(document.getElementById('feat-min-selection').value, 10),
    gramai_dark_mode: document.getElementById('dark-mode').value,
  }, () => showToast('✅ Settings saved!'));
}

function clearHistory() {
  if (!confirm('Clear all action history?')) return;
  chrome.storage.local.set({ gramai_history: [] }, () => showToast('✅ History cleared!'));
}

function resetSettings() {
  if (!confirm('Reset all settings to defaults?')) return;
  chrome.storage.sync.clear(() => { loadSettings(); loadLicenseStatus(); });
  document.getElementById('conn-dot').className = 'status-dot dot-gray';
  document.getElementById('conn-status').textContent = 'Click "Test" to check the connection';
}

function showToast(msg) {
  const toast = document.getElementById('save-toast');
  toast.textContent = msg;
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; toast.textContent = '✅ Settings saved!'; }, 2500);
}

function escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
