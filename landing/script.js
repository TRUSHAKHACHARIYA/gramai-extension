// GramAI Landing Page Scripts

const CFG = window.GRAMAI_CONFIG || {};
const GITHUB_REPO = CFG.GITHUB_REPO || 'TRUSHAKHACHARIYA/gramai-extension';
const CHROME_STORE_URL = CFG.CHROME_STORE_URL || '';
const CLOUD_API_URL = CFG.CLOUD_API_URL || '';
const WAITLIST_ENDPOINT = CFG.WAITLIST_ENDPOINT || (CLOUD_API_URL ? `${CLOUD_API_URL.replace(/\/$/, '')}/v1/waitlist` : '');

// ── Billing toggle ──────────────────────────────────────────
const toggleBtns = document.querySelectorAll('.toggle-btn');
const priceAmounts = document.querySelectorAll('.price-amount');
const proAnnualNote = document.getElementById('pro-annual-note');

function updateBilling(period) {
  priceAmounts.forEach(el => {
    el.textContent = el.dataset[period] || el.dataset.monthly;
  });
  if (proAnnualNote) {
    proAnnualNote.classList.toggle('is-hidden', period === 'annual');
  }
}

toggleBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    toggleBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    updateBilling(btn.dataset.period);
  });
});

// ── Hero demo ───────────────────────────────────────────────
const demoData = {
  fix: {
    label: 'Grammar fixed',
    before: 'Hi team, I wanted to <mark class="err">reach out</mark> about the <mark class="err">quarterly report</mark> we discussed.',
    after: 'Hi team, I wanted to <span class="diff-del">reach out</span> <span class="diff-add">follow up</span> about the quarterly report we discussed.',
  },
  rewrite: {
    label: 'Rewritten',
    before: 'Hi team, I wanted to <mark class="err">reach out</mark> about the <mark class="err">quarterly report</mark> we discussed.',
    after: 'Hi team — quick follow-up on the Q3 report from our last meeting. Let me know if you need anything from my end.',
  },
  score: {
    label: 'Writing score',
    before: 'Hi team, I wanted to <mark class="err">reach out</mark> about the <mark class="err">quarterly report</mark> we discussed.',
    after: `
      <div class="score-breakdown">
        <div class="score-overall"><strong>74</strong> / 100</div>
        <div class="score-bar-row"><span>Grammar</span><strong>88</strong><div class="score-bar"><div class="score-fill" style="width:88%"></div></div></div>
        <div class="score-bar-row"><span>Clarity</span><strong>70</strong><div class="score-bar"><div class="score-fill" style="width:70%"></div></div></div>
        <div class="score-bar-row"><span>Style</span><strong>64</strong><div class="score-bar"><div class="score-fill" style="width:64%"></div></div></div>
        <p class="score-tip">💡 Tip: "reach out" is overused in business writing. Consider "follow up."</p>
        <p class="score-consistency">Scores are calibrated — an 80 today is an 80 next week.</p>
      </div>`,
  },
  explain: {
    label: 'Explained',
    before: 'The <mark class="err">quarterly report</mark> contains <mark class="err">material non-public information</mark> subject to regulatory disclosure.',
    after: 'The quarterly report includes important company information that must be shared with the public according to government rules.',
  },
  pro: {
    label: 'Professional tone',
    before: 'Hi team, I wanted to <mark class="err">reach out</mark> about the <mark class="err">quarterly report</mark> we discussed.',
    after: 'Hi team, I am writing to follow up on the quarterly report we discussed in our previous meeting. Please let me know if you require any additional information.',
  },
};

const demoKeys = Object.keys(demoData);
let demoIndex = 0;
let demoCycleTimer = null;
let userInteracted = false;

const demoBefore = document.getElementById('demo-before');
const demoText = document.getElementById('demo-text');
const demoResult = document.getElementById('demo-result');
const demoLabel = document.getElementById('demo-label');
const demoOutput = document.getElementById('demo-output');
const demoHint = document.getElementById('demo-hint');

function showDemoBefore(key) {
  const data = demoData[key];
  if (!data || !demoText) return;

  demoText.innerHTML = data.before;
  demoBefore?.classList.remove('is-hidden');
  demoResult?.classList.add('is-hidden');
  if (demoHint) demoHint.textContent = 'Processing…';
}

function showDemoAfter(key) {
  const data = demoData[key];
  if (!data) return;

  demoBefore?.classList.add('is-hidden');
  if (demoLabel) demoLabel.textContent = data.label;
  if (demoOutput) demoOutput.innerHTML = data.after;
  demoResult?.classList.remove('is-hidden');
  if (demoHint) demoHint.textContent = 'Click a tool or watch the auto-demo ↻';
}

function runDemo(key, fromUser = false) {
  if (fromUser) userInteracted = true;

  document.querySelectorAll('[data-demo]').forEach(b => {
    b.classList.toggle('active', b.dataset.demo === key);
  });

  showDemoBefore(key);

  window.setTimeout(() => {
    showDemoAfter(key);
  }, 700);
}

function cycleDemo() {
  if (userInteracted) return;
  const key = demoKeys[demoIndex];
  runDemo(key);
  demoIndex = (demoIndex + 1) % demoKeys.length;
}

function startDemoCycle() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    runDemo('fix');
    return;
  }
  cycleDemo();
  demoCycleTimer = window.setInterval(cycleDemo, 4000);
}

document.querySelectorAll('[data-demo]').forEach(btn => {
  btn.addEventListener('click', () => {
    if (demoCycleTimer) window.clearInterval(demoCycleTimer);
    runDemo(btn.dataset.demo, true);
  });
});

startDemoCycle();

// ── Mobile nav ──────────────────────────────────────────────
const navHamburger = document.getElementById('nav-hamburger');
const navMobileMenu = document.getElementById('nav-mobile-menu');

function closeMobileNav() {
  navMobileMenu?.setAttribute('hidden', '');
  navHamburger?.setAttribute('aria-expanded', 'false');
}

navHamburger?.addEventListener('click', () => {
  const isOpen = !navMobileMenu?.hasAttribute('hidden');
  if (isOpen) {
    closeMobileNav();
  } else {
    navMobileMenu?.removeAttribute('hidden');
    navHamburger?.setAttribute('aria-expanded', 'true');
  }
});

navMobileMenu?.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', closeMobileNav);
});

// ── Install modal ───────────────────────────────────────────
const installModal = document.getElementById('install-modal');
const installModalClose = document.getElementById('install-modal-close');

function openInstallModal(e) {
  e?.preventDefault();
  if (CHROME_STORE_URL) {
    window.open(CHROME_STORE_URL, '_blank', 'noopener,noreferrer');
    return;
  }
  installModal?.showModal();
}

document.querySelectorAll('.install-trigger').forEach(el => {
  el.addEventListener('click', openInstallModal);
});

installModalClose?.addEventListener('click', () => installModal?.close());
installModal?.addEventListener('click', e => {
  if (e.target === installModal) installModal.close();
});

// ── GitHub stars ────────────────────────────────────────────
async function loadGitHubStars() {
  const starsEl = document.getElementById('github-stars');
  const metaEl = document.getElementById('github-meta');
  if (!starsEl) return;

  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}`);
    if (!res.ok) throw new Error('GitHub API error');
    const data = await res.json();
    starsEl.textContent = `⭐ ${data.stargazers_count.toLocaleString()}`;
    if (metaEl) {
      metaEl.textContent = `${data.forks_count} forks · Updated ${new Date(data.pushed_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
    }
  } catch {
    starsEl.textContent = '⭐ Open source on GitHub';
  }
}

loadGitHubStars();

// ── Early access banner ─────────────────────────────────────
async function loadEarlyAccessStats() {
  const banner = document.getElementById('early-access-banner');
  const countEl = document.getElementById('install-count');
  const textEl = document.getElementById('early-access-text');
  if (!CFG.EARLY_ACCESS) {
    banner?.classList.add('is-hidden');
    return;
  }
  if (textEl && CFG.EARLY_ACCESS_MESSAGE) {
    textEl.textContent = `🔥 ${CFG.EARLY_ACCESS_MESSAGE}`;
  }
  if (!countEl) return;

  let count = 0;
  if (CLOUD_API_URL) {
    try {
      const res = await fetch(`${CLOUD_API_URL.replace(/\/$/, '')}/v1/waitlist/count`);
      if (res.ok) {
        const data = await res.json();
        count = data.count || 0;
      }
    } catch {}
  }
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}`);
    if (res.ok) {
      const data = await res.json();
      count += (data.stargazers_count || 0) + (data.forks_count || 0);
    }
  } catch {}
  if (count > 0) {
    countEl.textContent = ` · ${count.toLocaleString()}+ early adopters`;
  }
}

loadEarlyAccessStats();

// ── Waitlist form ───────────────────────────────────────────
const waitlistForm = document.getElementById('waitlist-form');
const waitlistSuccess = document.getElementById('waitlist-success');

waitlistForm?.addEventListener('submit', async e => {
  e.preventDefault();
  const email = new FormData(waitlistForm).get('email');
  if (!email || typeof email !== 'string') return;

  if (WAITLIST_ENDPOINT) {
    try {
      const res = await fetch(WAITLIST_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'landing' }),
      });
      if (!res.ok) throw new Error('Waitlist API error');
    } catch {
      const list = JSON.parse(localStorage.getItem('gramai-waitlist') || '[]');
      if (!list.includes(email)) list.push(email);
      localStorage.setItem('gramai-waitlist', JSON.stringify(list));
    }
  } else {
    const list = JSON.parse(localStorage.getItem('gramai-waitlist') || '[]');
    if (!list.includes(email)) list.push(email);
    localStorage.setItem('gramai-waitlist', JSON.stringify(list));
  }

  waitlistForm.classList.add('is-hidden');
  waitlistSuccess?.classList.remove('is-hidden');
});

// ── FAQ tracking (for analytics) ────────────────────────────
document.querySelectorAll('.faq-item').forEach(item => {
  item.addEventListener('toggle', () => {
    if (item.open && window.plausible) {
      window.plausible('FAQ Open', { props: { question: item.querySelector('summary')?.textContent } });
    }
  });
});

// ── Scroll fade-up ──────────────────────────────────────────
if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) e.target.classList.add('visible');
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));
} else {
  document.querySelectorAll('.fade-up').forEach(el => el.classList.add('visible'));
}
