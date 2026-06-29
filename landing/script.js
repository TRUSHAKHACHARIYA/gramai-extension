// GramAI Landing Page Scripts

// ── Billing toggle ──────────────────────────────────────────
const toggleBtns = document.querySelectorAll('.toggle-btn');
const priceAmounts = document.querySelectorAll('.price-amount');

toggleBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    toggleBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const period = btn.dataset.period;
    priceAmounts.forEach(el => {
      el.textContent = el.dataset[period] || el.dataset.monthly;
    });
  });
});

// ── Demo toolbar interaction ────────────────────────────────
const demoData = {
  fix: {
    label: 'Grammar fixed',
    html: 'Hi team, I wanted to <span class="diff-del">reach out</span> <span class="diff-add">follow up</span> about the quarterly report we discussed.',
  },
  rewrite: {
    label: 'Rewritten',
    html: 'Hi team — quick follow-up on the Q3 report from our last meeting. Let me know if you need anything from my end.',
  },
  score: {
    label: 'Writing score',
    html: '<strong style="font-size:28px;color:var(--accent)">74 / 100</strong><br><span style="font-size:13px;color:var(--text-3)">Grammar 88 · Clarity 70 · Style 64</span><br><span style="font-size:13px;color:var(--text-2);display:block;margin-top:6px">Tip: "reach out" is overused in business email. Try "follow up."</span>',
  },
  pro: {
    label: 'Professional tone',
    html: 'Hi team, I am writing to follow up on the quarterly report we discussed in our previous meeting. Please let me know if you require any additional information.',
  },
  custom: {
    label: 'Custom: "Make punchy"',
    html: 'Team — quarterly report update. What do you need from me?',
  },
};

document.querySelectorAll('[data-demo]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-demo]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const key = btn.dataset.demo;
    document.getElementById('demo-label').textContent = demoData[key].label;
    document.getElementById('demo-output').innerHTML = demoData[key].html;
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

// ── Chrome CTA ──────────────────────────────────────────────
const CHROME_STORE_URL = '#';

document.getElementById('chrome-cta')?.addEventListener('click', (e) => {
  if (CHROME_STORE_URL === '#') {
    e.preventDefault();
    alert('Load the extension locally:\n\n1. Go to chrome://extensions\n2. Enable Developer mode\n3. Click "Load unpacked"\n4. Select the extension/ folder');
  }
});
