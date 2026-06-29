// GramAI — Google Docs native integration
// Enhanced text selection and in-place replacement for docs.google.com

(function () {
  if (window.__gramaiDocsLoaded) return;
  window.__gramaiDocsLoaded = true;

  const DOCS_SELECTORS = [
    '.kix-appview-editor',
    '.docs-texteventtarget-iframe',
    '.canvas-page',
  ];

  function isDocsEditor() {
    return location.hostname === 'docs.google.com' && /\/document\//.test(location.pathname);
  }

  if (!isDocsEditor()) return;

  document.documentElement.classList.add('gramai-docs-active');

  // Inject Docs-specific styles
  const style = document.createElement('style');
  style.textContent = `
    .gramai-docs-badge {
      position: fixed; bottom: 24px; right: 24px; z-index: 2147483640;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white; padding: 8px 14px; border-radius: 20px;
      font-size: 12px; font-weight: 600; font-family: -apple-system, sans-serif;
      box-shadow: 0 4px 16px rgba(99,102,241,0.4);
      cursor: pointer; display: none; align-items: center; gap: 6px;
      border: none;
    }
    .gramai-docs-badge.visible { display: flex; }
    .gramai-docs-badge:hover { opacity: 0.9; }
  `;
  document.head.appendChild(style);

  const badge = document.createElement('button');
  badge.className = 'gramai-docs-badge';
  badge.innerHTML = '✨ Fix with GramAI';
  badge.title = 'Fix grammar on selected text (Alt+G)';
  document.body.appendChild(badge);

  let lastSelection = '';

  function getDocsSelection() {
    const sel = window.getSelection()?.toString().trim();
    if (sel) return sel;

    const iframe = document.querySelector('.docs-texteventtarget-iframe');
    if (iframe?.contentDocument) {
      return iframe.contentDocument.getSelection()?.toString().trim() || '';
    }
    return '';
  }

  function updateBadge() {
    const text = getDocsSelection();
    if (text && text.length >= 3) {
      lastSelection = text;
      badge.classList.add('visible');
    } else {
      badge.classList.remove('visible');
    }
  }

  document.addEventListener('mouseup', () => setTimeout(updateBadge, 50));
  document.addEventListener('keyup', () => setTimeout(updateBadge, 50));

  badge.addEventListener('click', () => {
    const text = getDocsSelection() || lastSelection;
    if (!text) return;
    chrome.runtime.sendMessage({ type: 'PROCESS_TEXT', action: 'grammar', text }, (res) => {
      if (res?.ok) replaceInDocs(res.result);
    });
  });

  function replaceInDocs(newText) {
    navigator.clipboard.writeText(newText).then(() => {
      document.execCommand('paste');
      showToast('✅ Text replaced');
    }).catch(() => {
      showToast('📋 Copied — press Ctrl+V to paste');
      navigator.clipboard.writeText(newText);
    });
  }

  function showToast(msg) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position:fixed;bottom:70px;right:24px;z-index:2147483641;
      background:#1e1e2e;color:#e2e8f0;padding:10px 16px;border-radius:8px;
      font-size:13px;font-family:-apple-system,sans-serif;
      box-shadow:0 4px 16px rgba(0,0,0,0.3);
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'DOCS_REPLACE' && msg.text) {
      replaceInDocs(msg.text);
    }
  });

})();
