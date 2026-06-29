// GramAI — Microsoft Word Online native integration
// Enhanced support for office.com/word and onedrive.live.com Word documents

(function () {
  if (window.__gramaiWordLoaded) return;
  window.__gramaiWordLoaded = true;

  function isWordOnline() {
    const host = location.hostname;
    return (
      (host.includes('office.com') || host.includes('officeapps.live.com') || host.includes('sharepoint.com')) &&
      (location.pathname.includes('/word/') || location.search.includes('wdOrigin') || document.title.includes('Word'))
    ) || (host.includes('onedrive.live.com') && location.search.includes('wd='));
  }

  if (!isWordOnline()) return;

  document.documentElement.classList.add('gramai-word-active');

  const style = document.createElement('style');
  style.textContent = `
    .gramai-word-badge {
      position: fixed; bottom: 24px; right: 24px; z-index: 2147483640;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white; padding: 8px 14px; border-radius: 20px;
      font-size: 12px; font-weight: 600; font-family: 'Segoe UI', sans-serif;
      box-shadow: 0 4px 16px rgba(99,102,241,0.4);
      cursor: pointer; display: none; align-items: center; gap: 6px;
      border: none;
    }
    .gramai-word-badge.visible { display: flex; }
    .gramai-word-fab-group {
      position: fixed; bottom: 24px; right: 24px; z-index: 2147483640;
      display: none; flex-direction: column; gap: 6px; align-items: flex-end;
    }
    .gramai-word-fab-group.visible { display: flex; }
    .gramai-word-fab {
      background: #1e1e2e; color: #e2e8f0; border: 1px solid #3f3f5c;
      padding: 6px 12px; border-radius: 16px; font-size: 11px;
      cursor: pointer; font-family: 'Segoe UI', sans-serif;
    }
    .gramai-word-fab:hover { background: #2a2a3c; }
  `;
  document.head.appendChild(style);

  const fabGroup = document.createElement('div');
  fabGroup.className = 'gramai-word-fab-group';
  fabGroup.innerHTML = `
    <button class="gramai-word-fab" data-action="grammar">✅ Fix Grammar</button>
    <button class="gramai-word-fab" data-action="rewrite">✍️ Rewrite</button>
    <button class="gramai-word-fab" data-action="tone-pro">👔 Professional</button>
    <button class="gramai-word-badge" id="gramai-word-main">✨ GramAI</button>
  `;
  document.body.appendChild(fabGroup);

  let lastSelection = '';
  let fabOpen = false;

  function getWordSelection() {
    const sel = window.getSelection()?.toString().trim();
    if (sel) return sel;

    const editables = document.querySelectorAll('[contenteditable="true"], .OutlineElement, .Paragraph');
    for (const el of editables) {
      const s = el.ownerDocument.getSelection?.()?.toString().trim();
      if (s) return s;
    }
    return '';
  }

  function updateFab() {
    const text = getWordSelection();
    if (text && text.length >= 3) {
      lastSelection = text;
      fabGroup.classList.add('visible');
    } else if (!fabOpen) {
      fabGroup.classList.remove('visible');
    }
  }

  document.addEventListener('mouseup', () => setTimeout(updateFab, 50));
  document.addEventListener('keyup', () => setTimeout(updateFab, 50));

  document.getElementById('gramai-word-main').addEventListener('click', () => {
    fabOpen = !fabOpen;
    fabGroup.querySelectorAll('.gramai-word-fab[data-action]').forEach(btn => {
      btn.style.display = fabOpen ? 'block' : 'none';
    });
  });

  fabGroup.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = btn.dataset.action;
      const text = getWordSelection() || lastSelection;
      if (!text) return;
      runWordAction(action, text);
      fabOpen = false;
      fabGroup.querySelectorAll('.gramai-word-fab[data-action]').forEach(b => { b.style.display = 'none'; });
    });
  });

  function runWordAction(action, text) {
    showToast('Processing…');
    chrome.runtime.sendMessage({ type: 'PROCESS_TEXT', action, text }, (res) => {
      if (res?.ok) replaceInWord(res.result);
      else showToast('⚠️ ' + (res?.error || 'Error'));
    });
  }

  function replaceInWord(newText) {
    const active = document.activeElement;
    if (active && (active.tagName === 'TEXTAREA' || active.contentEditable === 'true')) {
      document.execCommand('insertText', false, newText);
      showToast('✅ Text replaced');
      return;
    }
    navigator.clipboard.writeText(newText).then(() => {
      document.execCommand('paste');
      showToast('✅ Pasted — or press Ctrl+V');
    }).catch(() => {
      navigator.clipboard.writeText(newText);
      showToast('📋 Copied to clipboard');
    });
  }

  function showToast(msg) {
    const existing = document.querySelector('.gramai-word-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'gramai-word-toast';
    toast.style.cssText = `
      position:fixed;bottom:80px;right:24px;z-index:2147483641;
      background:#1e1e2e;color:#e2e8f0;padding:10px 16px;border-radius:8px;
      font-size:13px;font-family:'Segoe UI',sans-serif;
      box-shadow:0 4px 16px rgba(0,0,0,0.3);
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
  }

})();
