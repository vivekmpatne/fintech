/* ═══════════════════════════════════════════════════════
   index.js — Application Form Logic
═══════════════════════════════════════════════════════ */

const API_BASE = 'http://localhost:8000';
let currentStep = 1;

// ── Industry / tier / util label maps ─────────────────
const INDUSTRY_NAMES = ['Retail', 'Manufacturing', 'Services', 'Food & Beverage', 'Textile'];
const TIER_NAMES     = ['', 'Tier 1 — Metro', 'Tier 2 — Mid-size', 'Tier 3 — Small town'];
const UTIL_NAMES     = ['Poor', 'Average', 'Good'];

// ── Helpers ───────────────────────────────────────────
function fmtINR(v) {
  const n = +v;
  if (isNaN(n)) return '—';
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)} Cr`;
  if (n >= 100_000)    return `₹${(n / 100_000).toFixed(1)} L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

function el(id) { return document.getElementById(id); }

function showToast(msg, type = 'error') {
  const t = el('toast');
  t.textContent = msg;
  t.className   = `toast show ${type}`;
  clearTimeout(t._tid);
  t._tid = setTimeout(() => t.classList.remove('show'), 3800);
}

// ── Step management ───────────────────────────────────
function setStep(step) {
  for (let i = 1; i <= 3; i++) {
    const node  = el(`step-node-${i}`);
    const panel = el(`panel${i}`);
    if (!node || !panel) continue;

    panel.classList.toggle('active', i === step);
    node.classList.remove('active', 'done');
    if (i < step)       node.classList.add('done');
    else if (i === step) node.classList.add('active');
  }

  // Connectors
  for (let i = 1; i <= 2; i++) {
    const conn = el(`conn-${i}`);
    if (conn) conn.classList.toggle('done', i < step);
  }

  currentStep = step;
  if (step === 3) buildSummary();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Slider fill update ────────────────────────────────
function updateSlider(input) {
  const min = +input.min || 0;
  const max = +input.max || 100;
  const pct = ((+input.value - min) / (max - min)) * 100;
  input.style.setProperty('--pct', pct + '%');
}

// ── Validation ────────────────────────────────────────
const STEP_FIELDS = {
  1: ['business_age', 'industry_type', 'num_employees', 'city_tier'],
  2: ['annual_revenue', 'existing_debt', 'upi_volume'],
  3: ['loan_amount'],
};

function validateStep(step) {
  let valid = true;

  (STEP_FIELDS[step] || []).forEach(id => {
    const input = el(id);
    const wrap  = el(`f-${id}`);
    if (!input || !wrap) return;

    const val   = input.value.trim();
    const isNum = input.type === 'number';
    const min   = input.min !== '' ? +input.min : -Infinity;
    const max   = input.max !== '' ? +input.max : Infinity;
    const ok    = val !== '' && (!isNum || (+val >= min && +val <= max));

    wrap.classList.toggle('error', !ok);
    if (!ok) valid = false;
  });

  return valid;
}

// ── Navigation ────────────────────────────────────────
function nextStep(from) {
  if (!validateStep(from)) {
    showToast('Please fill in all required fields correctly.');
    return;
  }
  setStep(from + 1);
}

function prevStep(from) {
  setStep(from - 1);
}

// ── Summary builder ───────────────────────────────────
function buildSummary() {
  const utilInput = document.querySelector('input[name="utility_payment"]:checked');

  const rows = [
    { label: 'Business Age',    val: `${el('business_age').value} years` },
    { label: 'Industry',        val: INDUSTRY_NAMES[el('industry_type').value] || '—' },
    { label: 'Employees',       val: el('num_employees').value },
    { label: 'City',            val: TIER_NAMES[el('city_tier').value] || '—' },
    { label: 'Annual Revenue',  val: fmtINR(el('annual_revenue').value) },
    { label: 'Existing Debt',   val: fmtINR(el('existing_debt').value) },
    { label: 'Monthly UPI Vol', val: fmtINR(el('upi_volume').value) },
    { label: 'GST Consistency', val: `${el('gst_consistency').value}%` },
    { label: 'Utility Payments',val: UTIL_NAMES[utilInput ? utilInput.value : 1] || '—' },
  ];

  el('summaryTable').innerHTML = rows.map(r =>
    `<div class="summary-row">
      <span class="s-label">${r.label}</span>
      <span class="s-val">${r.val}</span>
    </div>`
  ).join('');
}

// ── Collect form data ─────────────────────────────────
function collectData() {
  const util = document.querySelector('input[name="utility_payment"]:checked');
  return {
    business_age:    parseFloat(el('business_age').value),
    industry_type:   parseInt(el('industry_type').value),
    num_employees:   parseInt(el('num_employees').value),
    city_tier:       parseInt(el('city_tier').value),
    annual_revenue:  parseFloat(el('annual_revenue').value),
    gst_consistency: parseFloat(el('gst_consistency').value),
    existing_debt:   parseFloat(el('existing_debt').value),
    upi_volume:      parseFloat(el('upi_volume').value),
    utility_payment: parseInt(util ? util.value : 1),
    loan_amount:     parseFloat(el('loan_amount').value),
    loan_duration:   parseInt(el('loan_duration').value),
  };
}

// ── Submit ────────────────────────────────────────────
async function submitForm() {
  if (!validateStep(3)) {
    showToast('Please enter a valid loan amount.');
    return;
  }

  const btn = el('submitBtn');
  btn.classList.add('loading');
  btn.disabled = true;

  try {
    const payload = collectData();

    const res = await fetch(`${API_BASE}/predict`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Server error (${res.status})`);
    }

    const json = await res.json();

    // The backend /predict endpoint returns the payload directly (not wrapped in .data)
    //  FIX — unwrap .data before storing
    sessionStorage.setItem('riskResult', JSON.stringify(json.data));
    sessionStorage.setItem('formInput',  JSON.stringify(payload));
    window.location.href = 'result.html';

  } catch (e) {
    showToast(`Submission failed: ${e.message}`);
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}

// ── Clear errors on input ─────────────────────────────
function clearError(el) {
  const wrap = document.getElementById(`f-${el.name || el.id}`);
  if (wrap) wrap.classList.remove('error');
}

// ── Init ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Slider fill init
  document.querySelectorAll('input[type="range"]').forEach(s => {
    updateSlider(s);
    s.addEventListener('input', () => updateSlider(s));
  });

  // Clear error on change
  document.querySelectorAll('input, select').forEach(inp => {
    inp.addEventListener('input',  () => clearError(inp));
    inp.addEventListener('change', () => clearError(inp));
  });

  // Set step 1 active
  setStep(1);
});