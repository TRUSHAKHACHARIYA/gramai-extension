// Simple word-level diff for GramAI — no external dependencies

function tokenizeWords(text) {
  const tokens = [];
  const re = /(\S+|\s+)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    tokens.push(m[0]);
  }
  return tokens;
}

function lcs(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  const result = [];
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      result.unshift({ type: 'equal', value: a[i - 1] });
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      result.unshift({ type: 'delete', value: a[i - 1] });
      i--;
    } else {
      result.unshift({ type: 'insert', value: b[j - 1] });
      j--;
    }
  }
  while (i > 0) {
    result.unshift({ type: 'delete', value: a[i - 1] });
    i--;
  }
  while (j > 0) {
    result.unshift({ type: 'insert', value: b[j - 1] });
    j--;
  }
  return result;
}

function renderDiffHtml(original, improved) {
  const origTokens = tokenizeWords(original);
  const imprTokens = tokenizeWords(improved);
  const ops = lcs(origTokens, imprTokens);

  let html = '';
  for (const op of ops) {
    const escaped = escDiff(op.value);
    if (op.type === 'equal') {
      html += escaped;
    } else if (op.type === 'delete') {
      html += `<span class="gramai-diff-del">${escaped}</span>`;
    } else if (op.type === 'insert') {
      html += `<span class="gramai-diff-ins">${escaped}</span>`;
    }
  }
  return html;
}

function escDiff(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Export for content script / popup
if (typeof window !== 'undefined') {
  window.GramAIDiff = { renderDiffHtml, tokenizeWords };
}
