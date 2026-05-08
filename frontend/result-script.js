/* ═══════════════════════════════════════════════════════
   result.js — Risk Result Page Logic
═══════════════════════════════════════════════════════ */

const API_BASE = 'http://localhost:8000';

// ── Risk config ───────────────────────────────────────
const RISK_CONFIG = {
  Low: {
    accentColor: '#009688',
    pillClass:   'pill-low',
    badgeClass:  'badge-approved',
    headline:    'Strong Credit Profile',
    desc:        'Your business demonstrates healthy financials, consistent GST compliance, and a manageable debt-to-revenue ratio. You are well-positioned for loan approval.',
    ctaTitle:    'Congratulations — Your loan application has been approved.',
    ctaDesc:     'Our relationship team will contact you within 1–2 business days to complete verification and initiate disbursement.',
  },
  Medium: {
    accentColor: '#b45309',
    pillClass:   'pill-medium',
    badgeClass:  'badge-partial',
    headline:    'Moderate Credit Profile',
    desc:        'Your profile carries some risk signals. A partial loan offer has been extended. Improving GST filing consistency or reducing existing debt can improve your eligibility.',
    ctaTitle:    'A partial loan offer has been structured for your application.',
    ctaDesc:     'You may re-apply after 90 days with improved financials to qualify for the full requested amount.',
  },
  High: {
    accentColor: '#b91c1c',
    pillClass:   'pill-high',
    badgeClass:  'badge-rejected',
    headline:    'Elevated Credit Risk',
    desc:        'Multiple risk indicators were identified in your profile. The requested loan amount cannot be approved at this time. Please review the factor analysis below.',
    ctaTitle:    'Your application could not be approved at this time.',
    ctaDesc:     'Focus on clearing existing obligations, maintaining regular utility payments, and consistent GST filing for at least 6 consecutive months before re-applying.',
  },
};

const PROB_COLORS = {
  Low:    '#009688',
  Medium: '#b45309',
  High:   '#b91c1c',
};

// ── Helpers ───────────────────────────────────────────
function el(id) { return document.getElementById(id); }

function fmtINR(n) {
  n = +n;
  if (isNaN(n)) return '—';
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)} Cr`;
  if (n >= 100_000)    return `₹${(n / 100_000).toFixed(2)} L`;
  return '₹' + n.toLocaleString('en-IN');
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function animateCount(elem, from, to, duration, fmt = v => v.toFixed(1)) {
  const start = performance.now();
  function tick(now) {
    const t    = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    elem.textContent = fmt(from + (to - from) * ease);
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// ── Gauge ─────────────────────────────────────────────
function animateGauge(score, color) {
  const fill   = el('gaugeFill');
  const needle = el('gaugeNeedle');

  // Arc length for the half-circle (r=80): π * 80 ≈ 251.3
  const ARC = 251.3;

  fill.style.stroke          = color;
  fill.style.strokeDasharray = ARC;
  fill.style.strokeDashoffset = ARC; // start empty

  requestAnimationFrame(() => {
    setTimeout(() => {
      fill.style.strokeDashoffset = ARC * (1 - score / 100);
    }, 80);
  });

  // Needle: starts at -90deg (left, score=0), ends at +90deg (right, score=100)
  needle.style.transform = `rotate(-90deg)`;
  setTimeout(() => {
    needle.style.transform = `rotate(${-90 + (score / 100) * 180}deg)`;
  }, 100);
}

// ── Prob bars ─────────────────────────────────────────
function setProbBar(barId, valId, labelColor, pct) {
  const bar = el(barId);
  const val = el(valId);
  if (bar) { bar.style.background = labelColor; setTimeout(() => { bar.style.width = pct + '%'; }, 350); }
  if (val) val.textContent = pct.toFixed(1) + '%';
}

// ── SHAP list ─────────────────────────────────────────
function renderShap(items) {
  const strengthWidth = { high: 92, medium: 58, low: 28 };
  const list = el('shapList');
  if (!list) return;

  list.innerHTML = items.map((item, i) => {
    const isPos  = item.impact === 'positive';
    const width  = strengthWidth[item.strength] || 40;
    const barCls = isPos ? 'bar-pos' : 'bar-neg';
    const tagCls = isPos ? 'tag-pos' : 'tag-neg';
    const icon   = isPos ? '▲' : '▼';

    return `
      <div class="shap-item" id="shap-${i}">
        <div class="shap-feat">${item.feature}</div>
        <div class="shap-bar-track">
          <div class="shap-bar ${barCls}" id="sbar-${i}" data-w="${width}"></div>
        </div>
        <div class="shap-tag ${tagCls}">
          ${icon} ${item.strength}
        </div>
      </div>`;
  }).join('');

  // Staggered animation
  items.forEach((_, i) => {
    setTimeout(() => {
      const item = el(`shap-${i}`);
      const bar  = el(`sbar-${i}`);
      if (item) item.classList.add('reveal');
      setTimeout(() => {
        if (bar) bar.style.width = bar.dataset.w + '%';
      }, 150);
    }, 400 + i * 90);
  });
}

// ── EMI fetch ─────────────────────────────────────────
async function fetchAndRenderEMI(principal, rate, months) {
  try {
    const res  = await fetch(`${API_BASE}/emi-calculate?principal=${principal}&annual_interest_rate=${rate}&months=${months}`);
    const data = await res.json();

    el('emiMonthly').textContent   = fmtINR(data.emi);
    el('emiPrincipal').textContent = fmtINR(data.principal);
    el('emiInterest').textContent  = fmtINR(data.total_interest);
    el('emiTotal').textContent     = fmtINR(data.total_payment);
  } catch {
    // Fallback: client-side EMI calculation
    const r   = rate / 12 / 100;
    const emi = r === 0 ? principal / months : principal * r * Math.pow(1+r, months) / (Math.pow(1+r, months) - 1);
    el('emiMonthly').textContent   = fmtINR(emi);
    el('emiPrincipal').textContent = fmtINR(principal);
    el('emiInterest').textContent  = fmtINR(emi * months - principal);
    el('emiTotal').textContent     = fmtINR(emi * months);
  }
}

// ── Main render ───────────────────────────────────────
async function render(d) {
  const cfg      = RISK_CONFIG[d.risk_label] || RISK_CONFIG['Medium'];
  const riskLabel = d.risk_label || 'Medium';

  // Date
  el('reportDate').textContent = new Date().toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  // Header
  el('resultTitle').textContent = `Assessment Result — ${riskLabel} Risk`;

  // Approval badge
  const badge = el('approvalBadge');
  badge.textContent = d.approval_status;
  badge.className   = `approval-badge ${cfg.badgeClass}`;

  // Risk score card accent
  document.documentElement.style.setProperty('--accent-color', cfg.accentColor);
  document.querySelectorAll('.risk-score-card::before').forEach(el => {
    el.style.background = cfg.accentColor;
  });

  // Apply accent directly via a style injection
  const style = document.createElement('style');
  style.textContent = `.risk-score-card::before { background: ${cfg.accentColor} !important; }`;
  document.head.appendChild(style);

  // Gauge
  const score = d.confidence_score || 50;
  animateGauge(score, cfg.accentColor);
  animateCount(el('gaugeNum'), 0, score, 1400, v => v.toFixed(1));

  // Risk pill
  const pill = el('riskPill');
  pill.className = `risk-label-pill ${cfg.pillClass}`;
  el('riskLabelText').textContent = riskLabel;

  // Prob bars — reconstruct from confidence
  // If the backend sends class_probabilities, use them; else synthesize
  const probs = d.class_probabilities || buildFakeProbs(riskLabel, d.confidence_score);
  await sleep(300);
  setProbBar('pb-low',  'pv-low',  PROB_COLORS.Low,    probs.Low    || 0);
  setProbBar('pb-med',  'pv-med',  PROB_COLORS.Medium,  probs.Medium || 0);
  setProbBar('pb-high', 'pv-high', PROB_COLORS.High,    probs.High   || 0);

  // Risk detail
  el('riskHeadline').textContent = cfg.headline;
  el('riskDesc').textContent     = cfg.desc;

  // Metric list
  const form = JSON.parse(sessionStorage.getItem('formInput') || '{}');
  el('metricList').innerHTML = [
    { k: 'Requested Amount', v: fmtINR(form.loan_amount)     },
    { k: 'Loan Duration',    v: `${form.loan_duration} months` },
    { k: 'Industry',         v: ['Retail','Manufacturing','Services','Food & Bev','Textile'][form.industry_type] || '—' },
    { k: 'City Tier',        v: `Tier ${form.city_tier}`     },
  ].map(r => `
    <div class="metric-row">
      <span class="metric-key">${r.k}</span>
      <span class="metric-val">${r.v}</span>
    </div>`).join('');

  // Stat cards
  el('suggestedAmount').textContent = fmtINR(d.suggested_loan_amount);
  el('suggestedPct').textContent    = `${Math.round((d.suggested_loan_amount / (form.loan_amount || 1)) * 100)}% of requested`;

  el('interestRate').textContent  = `${d.interest_rate}%`;
  el('interestRange').textContent = riskLabel === 'Low' ? '8–10% p.a.' : riskLabel === 'Medium' ? '12–15% p.a.' : '18–20% p.a.';

  el('confidence').textContent = `${d.confidence_score?.toFixed(1)}%`;
  el('confidenceSub').textContent = `${riskLabel} risk prediction`;

  // EMI
  if (d.approval_status !== 'Rejected') {
    await fetchAndRenderEMI(d.suggested_loan_amount, d.interest_rate, form.loan_duration || 24);
  } else {
    ['emiMonthly','emiPrincipal','emiInterest','emiTotal'].forEach(id => {
      el(id).textContent = '—';
    });
  }

  // SHAP
  renderShap(d.explanation || []);

  // CTA
  el('ctaTitle').textContent = cfg.ctaTitle;
  el('ctaDesc').textContent  = cfg.ctaDesc;

  // Show result
  el('loadingView').style.display = 'none';
  el('resultView').style.display  = 'block';
}

// ── Fake prob distribution if not provided ────────────
function buildFakeProbs(riskLabel, confidence) {
  const c = confidence || 70;
  const r = (100 - c) / 2;
  if (riskLabel === 'Low')    return { Low: c,      Medium: r,      High: r * 0.5 };
  if (riskLabel === 'Medium') return { Low: r * 0.5, Medium: c,     High: r };
  return                             { Low: r * 0.3,  Medium: r,     High: c };
}

// ── Bootstrap ─────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  await sleep(900);

  const raw = sessionStorage.getItem('riskResult');
  if (!raw) {
    el('loadingView').style.display = 'none';
    el('errorView').style.display   = 'flex';
    return;
  }

  try {
    const data = JSON.parse(raw);
    await render(data);
  } catch (e) {
    console.error('Render error:', e);
    el('loadingView').style.display = 'none';
    el('errorView').style.display   = 'flex';
  }
});