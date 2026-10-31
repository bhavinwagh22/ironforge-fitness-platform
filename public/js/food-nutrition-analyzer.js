const NUTRIENTS = [
  ['calories','Calories (kcal)','kcal'],
  ['protein','Protein (g)','g'],
  ['carbohydrates','Carbs (g)','g'],
  ['total_fat','Fat (g)','g'],
  ['dietary_fiber','Fiber (g)','g'],
  ['sugar','Sugar (g)','g'],
  ['saturated_fat','Sat. Fat (g)','g'],
  ['sodium','Sodium (mg)','mg'],
  ['potassium','Potassium (mg)','mg'],
  ['calcium','Calcium (mg)','mg'],
  ['iron','Iron (mg)','mg'],
  ['vitamin_c','Vit C (mg)','mg'],
  ['vitamin_a','Vit A (mcg)','mcg'],
];

let identifiedItems = [];
let itemState = [];
let calcRows = [];
let lastTotals = {};

async function api(path, options) {
  const opts = Object.assign({ credentials: 'include' }, options || {});
  const res = await fetch(path, opts);
  if (!res.ok) {
    let msg = 'API error ' + res.status;
    try { const j = await res.json(); if (j.error) msg = j.error; } catch(e) {}
    throw new Error(msg);
  }
  return res.json();
}

async function ensureAuth() {
  try {
    const r = await fetch('/api/me', { credentials: 'include' });
    if (!r.ok) window.location.href = 'login.html';
  } catch (e) {}
}

document.addEventListener('DOMContentLoaded', function() {
  console.log('DEBUG: DOMContentLoaded - analyzer script loaded');
  const analyzeBtnEl = document.getElementById('analyzeBtn');
  const clearBtnEl = document.getElementById('clearBtn');
  const calcBtnEl = document.getElementById('calcBtn');

  console.log('DEBUG: Button found:', !!analyzeBtnEl);

  if (analyzeBtnEl) {
    analyzeBtnEl.addEventListener('click', async function() {
      try {
        console.log('DEBUG: Analyze clicked');
        const textEl = document.getElementById('foodInput');
        const text = textEl ? textEl.value.trim() : '';
        if (!text) { alert('Please enter some food items.'); return; }
        if (typeof FoodIdentify === 'undefined') {
          document.getElementById('itemsContainer').innerHTML = '<div class="fna-unavail">FoodIdentify module not loaded</div>';
          return;
        }

        const parsed = FoodIdentify.identify(text);
        console.log('DEBUG: Parsed:', parsed);
        identifiedItems = parsed.items;

        const container = document.getElementById('itemsContainer');
        container.innerHTML = '<div class="fna-loading">Identifying foods...</div>';
        document.getElementById('calcCard').style.display = 'none';
        document.getElementById('results').classList.remove('show');
        itemState = [];

        for (const it of identifiedItems) {
          let candidates = [];
          try {
            const data = await api('/api/foods/search?q=' + encodeURIComponent(it.food_text || it.original_text));
            candidates = data.results || [];
          } catch (e) {
            console.error('Search error:', e);
            candidates = [];
          }
          itemState.push({ item: it, candidates, selectedId: (candidates.length === 1 ? candidates[0].id : null) });
        }

        container.innerHTML = '';
        itemState.forEach((st, idx) => {
          const it = st.item;
          const rcClass = it.raw_or_cooked === 'raw' ? 'raw' : (it.raw_or_cooked === 'cooked' ? 'cooked' : 'unknown');
          const rcLabel = it.raw_or_cooked || 'unknown';
          const opts = st.candidates.length
            ? st.candidates.map(c => '<option value="' + c.id + '" ' + (st.selectedId===c.id?'selected':'') + '>' + c.food_name + ' (' + c.raw_or_cooked + ', ' + c.calories + ' kcal/100g) — ' + c.data_source + '</option>').join('')
            : '<option value="">No matches — data unavailable</option>';

          const card = document.createElement('div');
          card.className = 'fna-item';
          card.innerHTML = ''
            + '<div class="row"><strong>' + it.original_text + '</strong> <span class="badge ' + rcClass + '">' + rcLabel + '</span> ' + (it.ambiguous ? '<span style="color:var(--accent);font-size:12px;">(confirm match)</span>' : '') + '</div>'
            + '<div class="row"><label style="margin:0;font-size:12px;">Quantity</label><input type="number" class="qty" data-idx="' + idx + '" value="' + (it.quantity||'') + '" step="0.1" />'
            + '<select class="unit" data-idx="' + idx + '"><option value="g">grams (g)</option><option value="ml">milliliters (ml)</option><option value="kg">kilograms (kg)</option></select>'
            + '<label style="margin:0;font-size:12px;">Food match</label><select class="foodsel" data-idx="' + idx + '" style="min-width:280px;">' + opts + '</select></div>'
            + '<div class="meta">Detected: "' + it.food_text + '" · Unit entered: ' + it.unit + ' · ' + st.candidates.length + ' candidate(s) found' + (st.candidates.length===0?' — nutrition data unavailable':'') + '</div>';
          container.appendChild(card);
        });

        document.getElementById('calcCard').style.display = itemState.length ? 'block' : 'none';
      } catch (err) {
        console.error(err);
        document.getElementById('itemsContainer').innerHTML = '<div class="fna-unavail">Error: ' + err.message + '</div>';
      }
    });
  }

  if (clearBtnEl) {
    clearBtnEl.addEventListener('click', function() {
      const ti = document.getElementById('foodInput');
      if (ti) ti.value = '';
      document.getElementById('itemsContainer').innerHTML = '';
      document.getElementById('calcCard').style.display = 'none';
      document.getElementById('results').classList.remove('show');
    });
  }

  if (calcBtnEl) {
    calcBtnEl.addEventListener('click', async function() {
      try {
        const qtyInputs = document.querySelectorAll('.qty');
        const unitSelects = document.querySelectorAll('.unit');
        const foodSelects = document.querySelectorAll('.foodsel');
        const selections = [];
        itemState.forEach((st, idx) => {
          const qty = parseFloat(qtyInputs[idx].value);
          const unit = unitSelects[idx].value;
          const foodId = foodSelects[idx].value;
          selections.push({ st, qty, unit, foodId });
        });

        for (const s of selections) {
          if (!s.qty || s.qty <= 0) { alert('Enter a valid positive quantity for all items.'); return; }
          if (!['g','ml','kg'].includes(s.unit)) { alert('Unsupported unit. Use g, ml or kg.'); return; }
          if (!s.foodId) { alert('Select a food match for all items.'); return; }
        }

        const gramItems = selections.map(s => {
          let grams = s.qty;
          if (s.unit === 'kg') grams = s.qty * 1000;
          if (s.unit === 'ml') grams = s.qty;
          return { ...s, grams };
        });

        const details = await Promise.all(gramItems.map(s => api('/api/foods/' + s.foodId).catch(() => null)));

        calcRows = [];
        const totals = {};
        NUTRIENTS.forEach(([k]) => totals[k] = 0);
        let hasAny = false;

        gramItems.forEach((s, i) => {
          const d = details[i];
          if (!d || !d.food) {
            calcRows.push({ name: 'Unknown food', unavailable: true, source: null, ref: null, grams: s.grams });
            return;
          }
          const f = d.food;
          const factor = s.grams / 100;
          const n = {};
          NUTRIENTS.forEach(([k]) => {
            const val = f[k];
            n[k] = (val === null || val === undefined) ? null : Math.round(val * factor * 1000) / 1000;
          });
          calcRows.push({ name: f.food_name, rawCooked: f.raw_or_cooked, grams: s.grams, nutrients: n, source: f.data_source, ref: f.source_reference_id });
          NUTRIENTS.forEach(([k]) => { if (n[k] !== null) totals[k] += n[k]; });
          hasAny = true;
        });

        NUTRIENTS.forEach(([k]) => { totals[k] = Math.round(totals[k] * 1000) / 1000; });
        lastTotals = totals;

        const summaryEl = document.getElementById('summary');
        summaryEl.innerHTML = '';
        NUTRIENTS.forEach(([k, label, unit]) => {
          const v = totals[k];
          summaryEl.innerHTML += '<div class="fna-stat"><div class="lbl">' + label + '</div><div class="val">' + (v === 0 && !hasAny ? '—' : v) + ' <span>' + unit + '</span></div></div>';
        });

        const bd = document.getElementById('breakdown');
        bd.innerHTML = '';
        calcRows.forEach(r => {
          if (r.unavailable) {
            bd.innerHTML += '<div class="fna-food-card"><div class="name">' + r.name + '</div><div class="fna-unavail">Nutrition data unavailable</div></div>';
            return;
          }
          const nums = NUTRIENTS.map(([k, label, unit]) => {
            const v = r.nutrients[k];
            return '<div><div style="color:var(--muted);font-size:11px;">' + label + '</div><strong>' + (v === null ? 'n/a' : v) + '</strong> <span style="color:var(--muted);font-size:11px;">' + unit + '</span></div>';
          }).join('');
          bd.innerHTML += '<div class="fna-food-card"><div><div class="name">' + r.name + ' <span class="badge ' + (r.rawCooked==='raw'?'raw':(r.rawCooked==='cooked'?'cooked':'unknown')) + '">' + r.rawCooked + '</span> <span style="color:var(--muted);font-size:13px;">· ' + r.grams + ' g</span></div><div class="src">Source: ' + r.source + ' · Ref: ' + r.ref + '</div></div><div class="nums">' + nums + '</div></div>';
        });

        document.getElementById('results').classList.add('show');
        document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
      } catch (err) {
        console.error(err);
        alert('Error: ' + err.message);
      }
    });
  }

  // ---------- HISTORY ----------
  const saveBtn = document.getElementById('saveAnalysisBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', async function() {
      try {
        const items = calcRows.map(r => ({
          name: r.name, rawCooked: r.rawCooked, grams: r.grams,
          nutrients: r.nutrients, source: r.source, ref: r.ref
        }));
        const totals = {};
        NUTRIENTS.forEach(([k]) => totals[k] = totalVal(k));
        const today = new Date().toISOString().slice(0, 10);
        const res = await api('/api/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ analysis_date: today, items: items, totals: totals })
        });
        if (res.ok) {
          const statusEl = document.getElementById('historyStatus');
          if (statusEl) statusEl.textContent = 'Analysis saved successfully!';
          setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 3000);
        } else {
          alert('Failed to save: ' + (res.error || 'unknown'));
        }
      } catch (err) {
        console.error(err);
        alert('Error saving: ' + err.message);
      }
    });
  }

  function totalVal(key) {
    const el = document.querySelector('.fna-stat .val');
    // Recompute from items
    let sum = 0;
    calcRows.forEach(r => {
      if (r.nutrients && r.nutrients[key] !== null) sum += r.nutrients[key];
    });
    return Math.round(sum * 1000) / 1000;
  }

  // Load history
  async function loadHistory(dateFilter) {
    try {
      const statusEl = document.getElementById('historyStatus');
      if (statusEl) statusEl.textContent = 'Loading...';
      const data = await api('/api/history');
      const listEl = document.getElementById('historyList');
      if (!listEl) return;
      listEl.innerHTML = '';
      let history = data.history || [];
      if (dateFilter) {
        history = history.filter(h => h.analysis_date === dateFilter);
      }
      if (history.length === 0) {
        listEl.innerHTML = '<div style="text-align:center;color:var(--muted);padding:20px;">No saved analyses yet.</div>';
        if (statusEl) statusEl.textContent = '';
        return;
      }
      history.forEach(h => {
        const t = h.totals || {};
        const card = document.createElement('div');
        card.className = 'fna-food-card';
        card.innerHTML = '<div><div class="name">Analysis — ' + h.analysis_date + '</div>' +
          '<div style="color:var(--muted);font-size:12px;margin-top:4px;">' + (h.items || []).length + ' food(s) · ' + h.created_at + '</div>' +
          '<div style="margin-top:8px;font-size:13px;">Cal: ' + (t.calories||0) + ' kcal · P: ' + (t.protein||0) + 'g · C: ' + (t.carbohydrates||0) + 'g · F: ' + (t.total_fat||0) + 'g</div></div>' +
          '<div><button class="fna-btn secondary viewDetailBtn" data-id="' + h.id + '" style="padding:8px 16px;font-size:12px;">View</button> <button class="fna-btn secondary deleteHistBtn" data-id="' + h.id + '" style="padding:8px 16px;font-size:12px;">Delete</button></div>';
        listEl.appendChild(card);
      });
      // Attach handlers
      document.querySelectorAll('.viewDetailBtn').forEach(btn => {
        btn.onclick = function() {
          const id = this.getAttribute('data-id');
          const h = history.find(x => x.id == id);
          if (!h) return;
          const detail = window.open('', '_blank');
          if (detail) {
            detail.document.write('<html><head><title>Analysis Detail</title><link rel="stylesheet" href="/css/gym-landing.css"><style>body{background:var(--bg);color:var(--text);padding:20px;font-family:Inter,sans-serif;} .card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px;margin:8px 0;}</style></head><body><h1>Nutrition Report</h1><p>Date: ' + h.analysis_date + '</p><div class="card"><strong>Totals:</strong> Cal ' + (h.totals.calories||0) + ' · P ' + (h.totals.protein||0) + ' · C ' + (h.totals.carbohydrates||0) + ' · F ' + (h.totals.total_fat||0) + '</div>');
            (h.items || []).forEach(it => {
              detail.document.write('<div class="card"><strong>' + it.name + '</strong> (' + it.grams + 'g) · ' + it.rawCooked + '<br>Source: ' + it.source + ' · Ref: ' + it.ref + '<br>Cal: ' + (it.nutrients.calories||'n/a') + ' · P: ' + (it.nutrients.protein||'n/a') + ' · C: ' + (it.nutrients.carbohydrates||'n/a') + ' · F: ' + (it.nutrients.total_fat||'n/a') + '</div>');
            });
            detail.document.write('</body></html>');
            detail.document.close();
          }
        };
      });
      document.querySelectorAll('.deleteHistBtn').forEach(btn => {
        btn.onclick = async function() {
          if (!confirm('Delete this analysis?')) return;
          const id = this.getAttribute('data-id');
          await api('/api/history/' + id, { method: 'DELETE' });
          loadHistory(dateFilter);
        };
      });
      if (statusEl) statusEl.textContent = history.length + ' saved analyses loaded.';
    } catch (err) {
      console.error(err);
      const statusEl = document.getElementById('historyStatus');
      if (statusEl) statusEl.textContent = 'Error loading history: ' + err.message;
    }
  }

  const loadHistBtn = document.getElementById('loadHistoryBtn');
  if (loadHistBtn) {
    loadHistBtn.addEventListener('click', function() {
      const df = document.getElementById('historyDateFilter').value;
      loadHistory(df);
    });
  }

  // ---------- DAILY SUMMARY ----------
  async function loadDailySummary(dateStr) {
    try {
      const statusEl = document.getElementById('dailyStatus');
      if (statusEl) statusEl.textContent = 'Loading...';
      const data = await api('/api/insights/daily?date=' + encodeURIComponent(dateStr));
      const cardsEl = document.getElementById('dailySummaryCards');
      if (cardsEl) {
        cardsEl.innerHTML = '';
        NUTRIENTS.forEach(([k, label, unit]) => {
          const v = data.totals[k] !== undefined ? data.totals[k] : 'N/A';
          cardsEl.innerHTML += '<div class="fna-stat"><div class="lbl">' + label + '</div><div class="val">' + v + ' <span>' + unit + '</span></div></div>';
        });
      }
      if (statusEl) statusEl.textContent = data.analysis_count + ' analyses saved on ' + dateStr;
    } catch (err) {
      console.error(err);
      const statusEl = document.getElementById('dailyStatus');
      if (statusEl) statusEl.textContent = 'Error: ' + err.message;
    }
  }

  const loadDailyBtn = document.getElementById('loadDailyBtn');
  if (loadDailyBtn) {
    loadDailyBtn.addEventListener('click', function() {
      const df = document.getElementById('dailyDateFilter').value;
      if (df) loadDailySummary(df);
    });
  }

  // Auto-load daily summary with today's date
  const today = new Date().toISOString().slice(0, 10);
  const dailyDateEl = document.getElementById('dailyDateFilter');
  if (dailyDateEl) dailyDateEl.value = today;
  loadDailySummary(today);

  // ---------- WEEKLY TRENDS ----------
  async function loadWeeklyTrends(startStr) {
    try {
      const statusEl = document.getElementById('weeklyStatus');
      if (statusEl) statusEl.textContent = 'Loading...';
      const data = await api('/api/insights/weekly?start=' + encodeURIComponent(startStr));
      const chartEl = document.getElementById('weeklyChart');
      const listEl = document.getElementById('weeklyTrendList');
      const avgEl = document.getElementById('weeklyAvgCards');

      if (avgEl) {
        avgEl.innerHTML = '';
        avgEl.innerHTML += '<div class="fna-stat"><div class="lbl">Avg Calories</div><div class="val">' + data.weekly_average_calories + ' <span>kcal</span></div></div>';
        avgEl.innerHTML += '<div class="fna-stat"><div class="lbl">Avg Protein</div><div class="val">' + data.weekly_average_protein + ' <span>g</span></div></div>';
        avgEl.innerHTML += '<div class="fna-stat"><div class="lbl">Days with Data</div><div class="val">' + data.days_with_data + ' <span>/7</span></div></div>';
      }

      const days = data.days || [];
      const maxCal = Math.max(...days.map(d => d.calories), 1);

      if (chartEl) {
        chartEl.innerHTML = '';
        days.forEach(d => {
          const pct = Math.round((d.calories / maxCal) * 100);
          const bar = document.createElement('div');
          bar.style.cssText = 'flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;';
          bar.innerHTML = '<div style="font-size:10px;color:var(--muted);">' + d.calories + '</div>' +
            '<div style="width:100%;background:linear-gradient(180deg,var(--accent),var(--accent2));height:' + (pct || 2) + 'px;border-radius:4px 4px 0 0;min-height:2px;"></div>' +
            '<div style="font-size:10px;color:var(--muted);">' + d.date.slice(5) + '</div>';
          chartEl.appendChild(bar);
        });
      }

      if (listEl) {
        listEl.innerHTML = '';
        days.forEach(d => {
          const card = document.createElement('div');
          card.className = 'fna-food-card';
          card.innerHTML = '<div><div class="name">' + d.date + '</div><div style="color:var(--muted);font-size:12px;margin-top:4px;">Cal: ' + d.calories + ' · P: ' + d.protein + 'g · C: ' + d.carbohydrates + 'g · F: ' + d.total_fat + 'g</div></div>';
          listEl.appendChild(card);
        });
      }

      if (statusEl) statusEl.textContent = data.days_with_data + ' days with saved analyses in this week.';
    } catch (err) {
      console.error(err);
      const statusEl = document.getElementById('weeklyStatus');
      if (statusEl) statusEl.textContent = 'Error loading weekly trends: ' + err.message;
    }
  }

  const prevWeekBtn = document.getElementById('prevWeekBtn');
  const nextWeekBtn = document.getElementById('nextWeekBtn');
  const weeklyDateEl = document.getElementById('weeklyDateFilter');

  if (weeklyDateEl) weeklyDateEl.value = today;

  if (prevWeekBtn) {
    prevWeekBtn.addEventListener('click', function() {
      const df = weeklyDateEl.value;
      const d = new Date(df + 'T00:00:00');
      d.setDate(d.getDate() - 7);
      weeklyDateEl.value = d.toISOString().slice(0, 10);
      loadWeeklyTrends(weeklyDateEl.value);
    });
  }

  if (nextWeekBtn) {
    nextWeekBtn.addEventListener('click', function() {
      const df = weeklyDateEl.value;
      const d = new Date(df + 'T00:00:00');
      d.setDate(d.getDate() + 7);
      weeklyDateEl.value = d.toISOString().slice(0, 10);
      loadWeeklyTrends(weeklyDateEl.value);
    });
  }

  if (weeklyDateEl) {
    weeklyDateEl.addEventListener('change', function() {
      loadWeeklyTrends(this.value);
    });
  }

  loadWeeklyTrends(today);

  // Auto-load history on page load
  loadHistory(null);

  ensureAuth();
});
