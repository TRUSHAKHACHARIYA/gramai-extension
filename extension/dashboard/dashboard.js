// GramAI Admin Dashboard

let cloudUrl = 'http://localhost:3847';
let licenseKey = '';
let dashboardData = null;
let editingGuideId = null;

const api = (path, opts = {}) => {
  const headers = { 'Content-Type': 'application/json', 'X-License-Key': licenseKey, ...opts.headers };
  return fetch(`${cloudUrl.replace(/\/$/, '')}${path}`, { ...opts, headers }).then(r => {
    if (!r.ok) return r.json().then(e => { throw new Error(e.error || r.statusText); });
    return r.json();
  });
};

document.addEventListener('DOMContentLoaded', () => {
  loadSavedAuth();
  setupNav();
  setupButtons();
});

function loadSavedAuth() {
  try {
    const saved = JSON.parse(localStorage.getItem('gramai_dashboard') || '{}');
    if (saved.cloudUrl) { cloudUrl = saved.cloudUrl; document.getElementById('cloud-url').value = cloudUrl; }
    if (saved.licenseKey) { licenseKey = saved.licenseKey; document.getElementById('license-key').value = licenseKey; connect(); }
  } catch {}
}

function setupNav() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('view-' + btn.dataset.view).classList.add('active');
      document.getElementById('view-title').textContent = btn.textContent;
    });
  });
}

function setupButtons() {
  document.getElementById('connect-btn').addEventListener('click', connect);
  document.getElementById('new-guide-btn').addEventListener('click', () => openGuideEditor());
  document.getElementById('save-guide-btn').addEventListener('click', saveGuide);
  document.getElementById('cancel-guide-btn').addEventListener('click', () => {
    document.getElementById('guide-editor').style.display = 'none';
  });
  document.getElementById('gen-api-key-btn').addEventListener('click', generateApiKey);
  document.getElementById('sync-guides-btn').addEventListener('click', syncToExtension);
  document.getElementById('open-options-btn').addEventListener('click', () => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    }
  });
}

async function connect() {
  cloudUrl = document.getElementById('cloud-url').value.trim() || 'http://localhost:3847';
  licenseKey = document.getElementById('license-key').value.trim().toUpperCase();
  if (!licenseKey) return alert('Enter a license key');

  try {
    dashboardData = await api('/v1/dashboard');
    localStorage.setItem('gramai_dashboard', JSON.stringify({ cloudUrl, licenseKey }));
    document.body.classList.add('connected');
    document.getElementById('login-gate').style.display = 'none';
    document.getElementById('sidebar-tier').textContent = (dashboardData.tier || 'free').toUpperCase();
    renderOverview();
    renderGuides();
    renderMembers();
  } catch (err) {
    alert('Connection failed: ' + err.message);
  }
}

function renderOverview() {
  const team = dashboardData?.team;
  document.getElementById('stat-requests').textContent = team?.usage?.requests ?? '0';
  document.getElementById('stat-tokens').textContent = team?.usage?.tokens?.toLocaleString() ?? '0';
  document.getElementById('stat-members').textContent = team?.members?.length ?? '0';
  document.getElementById('stat-guides').textContent = team?.styleGuides?.length ?? '0';
}

function renderGuides() {
  const guides = dashboardData?.team?.styleGuides || [];
  const list = document.getElementById('guides-list');
  if (!guides.length) {
    list.innerHTML = '<p class="hint">No style guides yet. Create one to enforce team writing standards.</p>';
    return;
  }
  list.innerHTML = guides.map(g => `
    <div class="guide-card">
      <div>
        <h4>${esc(g.name)}</h4>
        <p>${esc((g.rules || '').slice(0, 120))}</p>
      </div>
      <button class="btn btn-secondary" onclick="editGuide('${g.id}')">Edit</button>
    </div>
  `).join('');
}

window.editGuide = function(id) {
  const guide = dashboardData.team.styleGuides.find(g => g.id === id);
  if (guide) openGuideEditor(guide);
};

function openGuideEditor(guide = null) {
  editingGuideId = guide?.id || null;
  document.getElementById('guide-editor').style.display = 'block';
  document.getElementById('editor-title').textContent = guide ? 'Edit Style Guide' : 'New Style Guide';
  document.getElementById('guide-name').value = guide?.name || '';
  document.getElementById('guide-rules').value = guide?.rules || '';
  document.getElementById('guide-prefer').value = (guide?.vocabulary?.prefer || []).join(', ');
  document.getElementById('guide-avoid').value = (guide?.vocabulary?.avoid || []).join(', ');
}

async function saveGuide() {
  const teamId = dashboardData?.team?.id;
  if (!teamId) return alert('Team license required');

  const guide = {
    id: editingGuideId,
    name: document.getElementById('guide-name').value.trim(),
    rules: document.getElementById('guide-rules').value.trim(),
    vocabulary: {
      prefer: document.getElementById('guide-prefer').value.split(',').map(s => s.trim()).filter(Boolean),
      avoid: document.getElementById('guide-avoid').value.split(',').map(s => s.trim()).filter(Boolean),
    },
  };

  try {
    const result = await api(`/v1/team/${teamId}/style-guides`, { method: 'POST', body: JSON.stringify(guide) });
    if (!dashboardData.team.styleGuides) dashboardData.team.styleGuides = [];
    const idx = dashboardData.team.styleGuides.findIndex(g => g.id === result.guide.id);
    if (idx >= 0) dashboardData.team.styleGuides[idx] = result.guide;
    else dashboardData.team.styleGuides.push(result.guide);
    document.getElementById('guide-editor').style.display = 'none';
    renderGuides();
    renderOverview();
  } catch (err) {
    alert('Save failed: ' + err.message);
  }
}

function renderMembers() {
  const members = dashboardData?.team?.members || [];
  document.getElementById('members-list').innerHTML = members.length
    ? members.map(m => `
      <div class="member-row">
        <span>${esc(m.email)}</span>
        <span class="member-role">${esc(m.role)}</span>
      </div>
    `).join('')
    : '<p class="hint">No team members yet.</p>';
}

async function generateApiKey() {
  try {
    const data = await api('/v1/api-keys', { method: 'POST', body: JSON.stringify({ name: 'Dashboard' }) });
    const el = document.getElementById('api-key-result');
    el.style.display = 'block';
    el.textContent = `API Key (copy now — shown once): ${data.apiKey}`;
  } catch (err) {
    alert(err.message);
  }
}

function syncToExtension() {
  if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
    chrome.runtime.sendMessage({ type: 'SYNC_STYLE_GUIDES' }, (res) => {
      alert(res?.ok ? 'Style guides synced to extension!' : 'Sync failed — open dashboard from extension.');
    });
  } else {
    alert('Open this dashboard from the GramAI extension Options page for sync.');
  }
}

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
