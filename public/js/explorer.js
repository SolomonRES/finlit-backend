const origin = window.location.origin;
document.getElementById('base-url').textContent = origin;

function copyBaseUrl() {
  navigator.clipboard.writeText(origin).then(() => {
    const btn = document.getElementById('copy-btn');
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
      btn.classList.remove('copied');
    }, 1500);
  });
}

const DOMAIN_COLORS = {
  ib: { bg: 'rgba(23,23,23,0.08)', text: '#171717', border: 'rgba(23,23,23,0.15)', gradient: 'linear-gradient(135deg, #f5f5f5 0%, #ebebeb 50%, #e5e5e5 100%)' },
  cm: { bg: 'rgba(29,78,216,0.08)', text: '#1d4ed8', border: 'rgba(29,78,216,0.15)', gradient: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 50%, #d0e4ff 100%)' },
  am: { bg: 'rgba(21,128,61,0.08)',  text: '#15803d', border: 'rgba(21,128,61,0.15)', gradient: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #d1fae0 100%)' },
  cf: { bg: 'rgba(124,58,237,0.08)', text: '#7c3aed', border: 'rgba(124,58,237,0.15)', gradient: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 50%, #e4dffb 100%)' },
  re: { bg: 'rgba(217,119,6,0.08)',  text: '#d97706', border: 'rgba(217,119,6,0.15)', gradient: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fdedb8 100%)' },
  ir: { bg: 'rgba(220,38,38,0.08)',  text: '#dc2626', border: 'rgba(220,38,38,0.15)', gradient: 'linear-gradient(135deg, #fef2f2 0%, #fecaca 50%, #fdc5c5 100%)' },
};

function domainStyle(key) {
  const c = DOMAIN_COLORS[key] || DOMAIN_COLORS.ib;
  return `background:${c.bg};color:${c.text};border-color:${c.border}`;
}

function statusMeta(status) {
  if (status === 'completed') return { icon: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>', label: 'Completed', cls: 'status-completed' };
  if (status === 'locked')    return { icon: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>', label: 'Locked', cls: 'status-locked' };
  return                       { icon: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>', label: 'In Progress', cls: 'status-pending' };
}

let cachedCourses = [];
let currentView = 'cards';
let lastJson = null;

async function fetchAllCourses() {
  activateCard('ep-all');
  showResults('GET /api/courses', null);
  setLoading();
  const res = await fetch('/api/courses');
  const data = await res.json();
  renderResults(data, 'GET /api/courses');
}

async function fetchCourseById() {
  const id = parseInt(document.getElementById('course-id-input').value) || 1;
  activateCard('ep-id');
  showResults(`GET /api/courses/${id}`, null);
  setLoading();
  const res = await fetch(`/api/courses/${id}`);
  if (!res.ok) { showError('Course not found - try an ID between 1 and 13.'); return; }
  const data = await res.json();
  renderResults([data], `GET /api/courses/${id}`);
}

async function fetchByDomain() {
  const key = document.getElementById('domain-key-select').value;
  activateCard('ep-domain');
  showResults(`GET /api/courses/domain/${key}`, null);
  setLoading();
  const res = await fetch(`/api/courses/domain/${key}`);
  const data = await res.json();
  renderResults(data, `GET /api/courses/domain/${key}`);
}

function activateCard(id) {
  document.querySelectorAll('.endpoint-card').forEach(el => el.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function showResults(endpoint, _label) {
  const sec = document.getElementById('results-section');
  sec.classList.add('visible');
  document.getElementById('active-endpoint').textContent = endpoint;
  sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeResults() {
  document.getElementById('results-section').classList.remove('visible');
  document.querySelectorAll('.endpoint-card').forEach(el => el.classList.remove('active'));
}

function setLoading() {
  document.getElementById('result-count').textContent = '';
  document.getElementById('courses-grid').innerHTML = '<div class="loading-indicator"><div class="spinner"></div><span>Fetching from server...</span></div>';
  document.getElementById('json-block').textContent = '';
}

function showError(msg) {
  document.getElementById('courses-grid').innerHTML = `<div class="error-msg">${msg}</div>`;
}

function renderResults(data, endpoint) {
  cachedCourses = data;
  lastJson = data;
  const count = data.length;
  document.getElementById('result-count').textContent = `${count} result${count !== 1 ? 's' : ''}`;
  document.getElementById('active-endpoint').textContent = endpoint;

  if (data.length === 0) {
    document.getElementById('courses-grid').innerHTML = '<div class="error-msg">No courses found for this query.</div>';
  } else {
    document.getElementById('courses-grid').innerHTML = data.map(c => buildCard(c)).join('');
  }

  document.getElementById('json-block').textContent = JSON.stringify(count === 1 ? data[0] : data, null, 2);
  setView(currentView);
}

function buildCard(c) {
  const s = statusMeta(c.status);
  const dc = DOMAIN_COLORS[c.domain_key] || DOMAIN_COLORS.ib;
  return `
    <div class="course-card" onclick="openModal(${c._id})">
      <div class="course-thumb" style="background:${dc.gradient}">
        <img src="/${c.img_name}" alt="${c.title}" loading="lazy" onerror="this.closest('.course-thumb').classList.add('no-img')" />
        <div class="thumb-placeholder">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
        </div>
      </div>
      <div class="course-body">
        <span class="domain-badge" style="${domainStyle(c.domain_key)}">${c.domain}</span>
        <h3 class="course-title">${c.title}</h3>
        <p class="course-desc">${c.description}</p>
        <div class="course-footer">
          <span class="course-meta-item">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            ${c.duration} min
          </span>
          <span class="course-meta-item ${s.cls}">${s.icon} ${s.label}</span>
        </div>
      </div>
    </div>`;
}

function setView(v) {
  currentView = v;
  document.getElementById('cards-view').style.display = v === 'cards' ? 'block' : 'none';
  document.getElementById('json-view').style.display  = v === 'json'  ? 'block' : 'none';
  document.getElementById('toggle-cards').classList.toggle('active', v === 'cards');
  document.getElementById('toggle-json').classList.toggle('active',  v === 'json');
}

function openModal(id) {
  const c = cachedCourses.find(x => x._id === id);
  if (!c) return;
  const s = statusMeta(c.status);
  const dc = DOMAIN_COLORS[c.domain_key] || DOMAIN_COLORS.ib;
  document.getElementById('modal-content').innerHTML = `
    <div class="modal-thumb" style="background:${dc.gradient}">
      <img src="/${c.img_name}" alt="${c.title}" onerror="this.closest('.modal-thumb').classList.add('no-img')" />
      <div class="thumb-placeholder">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
      </div>
    </div>
    <div class="modal-body">
      <span class="domain-badge" style="${domainStyle(c.domain_key)}">${c.domain}</span>
      <h2 class="modal-title">${c.title}</h2>
      <p class="modal-desc">${c.description}</p>
      <div class="modal-meta-grid">
        <div class="modal-meta-item">
          <span class="meta-label">Duration</span>
          <span class="meta-value">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            ${c.duration} minutes
          </span>
        </div>
        <div class="modal-meta-item">
          <span class="meta-label">Status</span>
          <span class="meta-value ${s.cls}">${s.icon} ${s.label}</span>
        </div>
        <div class="modal-meta-item">
          <span class="meta-label">Domain Key</span>
          <span class="meta-value"><code class="inline-code">${c.domain_key}</code></span>
        </div>
        <div class="modal-meta-item">
          <span class="meta-label">Course ID</span>
          <span class="meta-value"><code class="inline-code">#${c._id}</code></span>
        </div>
      </div>
      <div class="modal-api-row">
        <span class="api-label">Endpoint</span>
        <code class="api-code">GET ${origin}/api/courses/${c._id}</code>
      </div>
    </div>`;
  document.getElementById('modal-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

function togglePostForm(e) {
  if (e.target.closest('.post-form-wrapper')) return;
  const wrapper = document.getElementById('post-form-wrapper');
  wrapper.classList.toggle('open');
  document.getElementById('ep-post').classList.toggle('active');
}

function buildWatchlistCard(w) {
  return `
    <div class="course-card" style="cursor:default">
      <div class="course-body" style="padding:20px 20px 18px">
        <span class="domain-badge" style="background:#f5f5f5;color:#404040;border:1px solid #e5e5e5">${w.sector}</span>
        <h3 class="course-title" style="margin-top:8px">${w.symbol} - ${w.name}</h3>
        <p class="course-desc">Target: <strong>$${Number(w.targetPrice).toFixed(2)}</strong>${w.notes ? '<br><em style="color:#737373">' + w.notes + '</em>' : ''}</p>
        <div class="course-footer" style="flex-direction:column;align-items:flex-start;gap:4px">
          <span class="course-meta-item" style="font-size:10px;color:#a3a3a3">
            _id: <code style="font-size:10px;background:#f5f5f5;padding:1px 4px;border-radius:3px;user-select:all;cursor:text">${w._id}</code>
          </span>
          ${w.imageUrl ? `<span class="course-meta-item" style="font-size:10px;color:#a3a3a3">Image: <a href="${w.imageUrl}" target="_blank" style="color:#3b82f6">${w.imageUrl}</a></span>` : ''}
        </div>
      </div>
    </div>`;
}

async function fetchWatchlist() {
  const card = document.getElementById('ep-watchlist');
  card.classList.add('active');
  showResults('GET /api/watchlist', null);
  setLoading();
  try {
    const res = await fetch('/api/watchlist');
    const data = await res.json();
    if (data.length === 0) {
      document.getElementById('courses-grid').innerHTML = '<div class="error-msg">No entries yet - use POST /api/watchlist to add one.</div>';
      document.getElementById('result-count').textContent = '0 results';
      document.getElementById('json-block').textContent = '[]';
    } else {
      document.getElementById('result-count').textContent = data.length + ' result' + (data.length !== 1 ? 's' : '');
      document.getElementById('courses-grid').innerHTML = data.map(buildWatchlistCard).join('');
      document.getElementById('json-block').textContent = JSON.stringify(data, null, 2);
    }
    setView(currentView);
  } catch {
    document.getElementById('courses-grid').innerHTML = '<div class="error-msg">Could not reach server.</div>';
  }
  setTimeout(() => card.classList.remove('active'), 600);
}

async function postWatchlist(e) {
  e.preventDefault();
  e.stopPropagation();
  const banner = document.getElementById('post-banner');
  const btn = document.getElementById('post-submit-btn');

  const symbol = document.getElementById('pf-symbol').value.trim().toUpperCase();
  const name = document.getElementById('pf-name').value.trim();
  const targetPrice = parseFloat(document.getElementById('pf-price').value);
  const sector = document.getElementById('pf-sector').value;
  const notes = document.getElementById('pf-notes').value.trim();

  const errs = [];
  if (!symbol || !/^[A-Z]{1,5}$/.test(symbol)) errs.push('Symbol must be 1-5 letters');
  if (!name || name.length < 2) errs.push('Company name must be at least 2 characters');
  if (isNaN(targetPrice) || targetPrice <= 0) errs.push('Target price must be a positive number');
  if (!sector) errs.push('Please select a sector');
  if (notes.length > 200) errs.push('Notes must be 200 characters or fewer');

  if (errs.length) {
    banner.className = 'post-banner post-banner-error';
    banner.textContent = errs.join('. ');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;border-width:2px"></span> Adding...';

  try {
    const res = await fetch('/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol, name, targetPrice, notes, sector }),
    });
    const data = await res.json();
    if (!res.ok) {
      banner.className = 'post-banner post-banner-error';
      banner.textContent = Array.isArray(data.error) ? data.error.join('. ') : data.error;
    } else {
      banner.className = 'post-banner post-banner-success';
      banner.textContent = data.symbol + ' ($' + Number(data.targetPrice).toFixed(2) + ') added and saved to MongoDB';
      document.getElementById('post-form').reset();
      loadWatchlistSelects();
    }
  } catch {
    banner.className = 'post-banner post-banner-error';
    banner.textContent = 'Could not reach server. Is it running?';
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg> Add to Watchlist';
  }
}

let watchlistSelectCache = [];

async function loadWatchlistSelects() {
  try {
    const res = await fetch('/api/watchlist');
    watchlistSelectCache = await res.json();
  } catch {
    watchlistSelectCache = [];
  }
  const optionsHtml = watchlistSelectCache.length
    ? watchlistSelectCache.map(w =>
        `<option value="${w._id}">${w.symbol} - ${w.name} ($${Number(w.targetPrice).toFixed(2)})</option>`
      ).join('')
    : '<option value="" disabled>No entries yet - add one via POST first</option>';

  document.getElementById('put-select').innerHTML = '<option value="">-- choose an entry --</option>' + optionsHtml;
  document.getElementById('delete-select').innerHTML = '<option value="">-- choose an entry --</option>' + optionsHtml;
}

function onPutSelectChange() {
  const id = document.getElementById('put-select').value;
  const entry = watchlistSelectCache.find(w => w._id === id);
  if (!entry) return;
  document.getElementById('put-symbol').value = entry.symbol;
  document.getElementById('put-name').value = entry.name;
  document.getElementById('put-price').value = entry.targetPrice;
  document.getElementById('put-sector').value = entry.sector;
  document.getElementById('put-notes').value = entry.notes || '';
}

function togglePutForm(e) {
  if (e.target.closest('.post-form-wrapper')) return;
  const wrapper = document.getElementById('put-form-wrapper');
  wrapper.classList.toggle('open');
  document.getElementById('ep-put').classList.toggle('active');
  if (wrapper.classList.contains('open')) loadWatchlistSelects();
}

async function putWatchlist(e) {
  e.preventDefault();
  e.stopPropagation();
  const banner = document.getElementById('put-banner');
  const btn = document.getElementById('put-submit-btn');

  const id = document.getElementById('put-select').value;
  const symbol = document.getElementById('put-symbol').value.trim().toUpperCase();
  const name = document.getElementById('put-name').value.trim();
  const targetPrice = parseFloat(document.getElementById('put-price').value);
  const sector = document.getElementById('put-sector').value;
  const notes = document.getElementById('put-notes').value.trim();

  const errs = [];
  if (!id) errs.push('Please select an entry to edit');
  if (!symbol || !/^[A-Z]{1,5}$/.test(symbol)) errs.push('Symbol must be 1-5 letters');
  if (!name || name.length < 2) errs.push('Company name must be at least 2 characters');
  if (name.length > 60) errs.push('Company name must be 60 characters or fewer');
  if (isNaN(targetPrice) || targetPrice <= 0) errs.push('Target price must be a positive number');
  if (!sector) errs.push('Please select a sector');
  if (notes.length > 200) errs.push('Notes must be 200 characters or fewer');

  if (errs.length) {
    banner.className = 'post-banner post-banner-error';
    banner.textContent = errs.join('. ');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;border-width:2px"></span> Updating...';

  try {
    const res = await fetch('/api/watchlist/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol, name, targetPrice, notes, sector }),
    });
    const data = await res.json();
    if (!res.ok) {
      banner.className = 'post-banner post-banner-error';
      banner.textContent = Array.isArray(data.error) ? data.error.join('. ') : (data.error || 'Server error');
    } else {
      banner.className = 'post-banner post-banner-success';
      banner.textContent = data.symbol + ' updated successfully';
      showResults('PUT /api/watchlist/' + id, null);
      document.getElementById('result-count').textContent = '1 result';
      document.getElementById('courses-grid').innerHTML = buildWatchlistCard(data);
      document.getElementById('json-block').textContent = JSON.stringify(data, null, 2);
      setView(currentView);
      loadWatchlistSelects();
    }
  } catch {
    banner.className = 'post-banner post-banner-error';
    banner.textContent = 'Could not reach server. Is it running?';
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Update Entry';
  }
}

async function deleteWatchlist() {
  const id = document.getElementById('delete-select').value;
  const resultEl = document.getElementById('delete-result');
  const card = document.getElementById('ep-delete');

  if (!id) {
    resultEl.className = 'delete-result-banner post-banner-error';
    resultEl.textContent = 'Please select an entry to delete';
    return;
  }

  card.classList.add('active');

  try {
    const res = await fetch('/api/watchlist/' + id, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      resultEl.className = 'delete-result-banner post-banner-error';
      resultEl.textContent = data.error || 'Entry not found';
    } else {
      resultEl.className = 'delete-result-banner post-banner-success';
      resultEl.textContent = 'Entry deleted successfully';
      loadWatchlistSelects();
    }
  } catch {
    resultEl.className = 'delete-result-banner post-banner-error';
    resultEl.textContent = 'Could not reach server. Is it running?';
  } finally {
    setTimeout(() => card.classList.remove('active'), 600);
  }
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeModal(); closeResults(); }
});

loadWatchlistSelects();
