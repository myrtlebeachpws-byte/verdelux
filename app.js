/* Verdelux app shell: state, wallet (localStorage), router, lobby, profile, redeem. */
(function () {
  'use strict';
  const KEY = 'verdelux.v1';
  const DAY = 24 * 3600 * 1000;
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const r2 = x => Math.round(x * 100) / 100;
  const today = () => new Date().toISOString().slice(0, 10);

  const defaults = () => ({
    gc: 10000, sc: 10, cur: 'GC', name: 'Player One', lastBonus: 0, streak: 0, ageOK: false,
    limits: { GC: 0, SC: 0, remindMin: 0 }, wagered: { day: today(), GC: 0, SC: 0 },
    breakUntil: 0, betIdx: {}, reduceMotion: false, totals: { hands: 0, won: 0, lost: 0 }
  });
  let state;
  function load() {
    try { state = Object.assign(defaults(), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { state = defaults(); }
    state.limits = Object.assign(defaults().limits, state.limits);
    if (!state.wagered || state.wagered.day !== today()) state.wagered = { day: today(), GC: 0, SC: 0 };
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode */ } }

  /* ---------- tiny event bus (listeners auto-cleared on route change) ---------- */
  const bus = {}; let viewDisposers = [];
  function on(evt, fn) { (bus[evt] = bus[evt] || []).push(fn); viewDisposers.push(() => { bus[evt] = bus[evt].filter(f => f !== fn); }); }
  function emit(evt, a) { (bus[evt] || []).slice().forEach(f => f(a)); }

  /* ---------- wallet ---------- */
  const wallet = {
    get cur() { return state.cur; },
    bal(c) { c = c || state.cur; return c === 'GC' ? state.gc : state.sc; },
    fmt(x, c) { c = c || state.cur; x = r2(x); return c === 'GC' ? Math.round(x).toLocaleString('en-US') : x.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); },
    unit(c) { return (c || state.cur) === 'GC' ? 1 : 0.01; },
    _set(c, v) { v = r2(Math.max(0, v)); if (c === 'GC') state.gc = v; else state.sc = v; },
    limitRoom(c) { c = c || state.cur; const L = state.limits[c]; return L > 0 ? Math.max(0, r2(L - state.wagered[c])) : Infinity; },
    /** Debit a wager. Returns {ok, reason}. */
    spend(amount, opts) {
      opts = opts || {}; const c = state.cur; amount = r2(amount);
      if (state.breakUntil > Date.now()) return { ok: false, reason: 'You are on a break.' };
      if (amount > this.bal(c) + 1e-9) return { ok: false, reason: 'Not enough ' + c + '.' };
      if (opts.track !== false && amount > this.limitRoom(c) + 1e-9) return { ok: false, reason: 'Daily wager limit reached (' + this.fmt(state.limits[c], c) + ' ' + c + '). Adjust it in Profile.' };
      this._set(c, this.bal(c) - amount);
      if (opts.track !== false) state.wagered[c] = r2(state.wagered[c] + amount);
      state.totals.hands += opts.hand ? 1 : 0;
      save(); render(); return { ok: true };
    },
    credit(amount, c) { c = c || state.cur; this._set(c, this.bal(c) + amount); save(); render(); },
    addWager(amount, c) { c = c || state.cur; state.wagered[c] = r2(state.wagered[c] + amount); save(); },
    canAfford(a) { return a <= this.bal() + 1e-9; }
  };

  function render() {
    $$('[data-bal="GC"]').forEach(e => e.textContent = wallet.fmt(state.gc, 'GC'));
    $$('[data-bal="SC"]').forEach(e => e.textContent = wallet.fmt(state.sc, 'SC'));
    $$('.cur-btn').forEach(b => b.classList.toggle('active', b.dataset.cur === state.cur));
    $$('.lobby-cur').forEach(b => b.classList.toggle('active', b.dataset.cur === state.cur));
    document.body.classList.toggle('reduce-motion', !!state.reduceMotion);
    document.body.dataset.cur = state.cur;
  }

  let busy = false;
  function setBusy(b) { busy = b; }
  function setCurrency(c) {
    if (c === state.cur) return;
    if (busy) { toast('Finish your current hand before switching currency.', 'warn'); return; }
    state.cur = c; save(); render(); emit('cur', c);
    toast('Now playing with ' + (c === 'GC' ? 'Gold Coins (GC)' : 'Sweeps Coins (SC)'), 'info');
  }

  /* ---------- toast & modal ---------- */
  function toast(msg, kind) {
    const el = document.createElement('div'); el.className = 'toast ' + (kind || '');
    el.textContent = msg; $('#toast-root').appendChild(el);
    requestAnimationFrame(() => el.classList.add('in'));
    setTimeout(() => { el.classList.remove('in'); setTimeout(() => el.remove(), 300); }, 3200);
  }
  function modal(opts) {
    const root = $('#modal-root'); const wrap = document.createElement('div'); wrap.className = 'modal-wrap';
    wrap.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-label="${opts.title || ''}">
      <button class="modal-x" aria-label="Close">×</button>
      <h3>${opts.title || ''}</h3><div class="modal-body">${opts.html || ''}</div>
      <div class="modal-actions"></div></div>`;
    root.appendChild(wrap);
    const close = () => { wrap.remove(); if (opts.onClose) opts.onClose(); };
    wrap.addEventListener('click', e => { if (e.target === wrap) close(); });
    $('.modal-x', wrap).onclick = close;
    const act = $('.modal-actions', wrap);
    (opts.actions || [{ label: 'Close', cls: 'btn-ghost' }]).forEach(a => {
      const b = document.createElement('button'); b.className = 'btn ' + (a.cls || 'btn-gold'); b.textContent = a.label;
      b.onclick = () => { if (a.onClick) a.onClick(close); if (!a.keep) close(); }; act.appendChild(b);
    });
    return close;
  }

  /* ---------- game registry ---------- */
  const games = {}; const gameOrder = [];
  function register(def) { games[def.id] = def; gameOrder.push(def.id); }

  /* ---------- router ---------- */
  let currentGame = null;
  const NAV = [
    { id: 'lobby', label: 'Lobby', href: '#/lobby', icon: '<path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>' },
    { id: 'redeem', label: 'Redeem', href: '#/redeem', icon: '<circle cx="12" cy="12" r="9"/><path d="M12 7v10M9 9.5c0-1.2 1.3-2 3-2s3 .8 3 2-1.3 1.8-3 2-3 .8-3 2 1.3 2 3 2 3-.8 3-2"/>' },
    { id: 'profile', label: 'Profile', href: '#/profile', icon: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>' },
    { id: 'safe', label: 'Play Safe', href: '#/safe', icon: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>' }
  ];
  function buildNav() {
    const mk = (n, cls) => `<a class="${cls}" data-nav="${n.id}" href="${n.href}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${n.icon}</svg><span>${n.label}</span></a>`;
    $('.topnav').innerHTML = NAV.map(n => mk(n, 'navlink')).join('');
    $('.bottomnav').innerHTML = NAV.map(n => mk(n, 'bnlink')).join('');
  }
  function show(id) {
    ['welcome', 'lobby', 'game', 'redeem', 'profile'].forEach(v => { $('#view-' + v).hidden = v !== id; });
    $('#shell').hidden = id === 'welcome';
  }
  function route() {
    // tear down previous view
    if (currentGame && currentGame.unmount) { try { currentGame.unmount(); } catch (e) { console.error(e); } }
    currentGame = null; busy = false;
    viewDisposers.forEach(f => f()); viewDisposers = [];
    $('#modal-root').innerHTML = '';
    const h = (location.hash || '').replace(/^#\/?/, '');
    const [name, arg] = h.split('/');
    if (!state.ageOK && name && name !== 'welcome') { location.replace('#/welcome'); return; }
    if (checkBreak()) return;
    window.scrollTo(0, 0);
    let navId = name;
    if (!name || name === 'welcome') { show('welcome'); initWelcome(); return; }
    if (name === 'lobby') { show('lobby'); renderLobby(); }
    else if (name === 'game' && games[arg]) { show('game'); renderGame(games[arg]); navId = 'lobby'; }
    else if (name === 'redeem') { show('redeem'); renderRedeem(); }
    else if (name === 'profile' || name === 'safe') { show('profile'); renderProfile(name === 'safe'); }
    else { location.replace('#/lobby'); return; }
    $$('[data-nav]').forEach(a => a.classList.toggle('active', a.dataset.nav === navId));
    render();
  }

  /* ---------- welcome ---------- */
  function initWelcome() {
    const cb = $('#age-ok'), btn = $('#btn-enter');
    cb.checked = !!state.ageOK; btn.disabled = !cb.checked;
    cb.onchange = () => { btn.disabled = !cb.checked; };
    btn.onclick = () => { state.ageOK = true; save(); location.hash = '#/lobby'; };
  }

  /* ---------- self-exclusion / break (placeholder) ---------- */
  function checkBreak() {
    const lock = $('#lock');
    if (state.breakUntil > Date.now()) {
      lock.hidden = false;
      const mins = Math.ceil((state.breakUntil - Date.now()) / 60000);
      lock.innerHTML = `<div class="lock-card"><h2>You're on a break</h2><p>Play is paused for about <b>${mins >= 60 ? Math.ceil(mins / 60) + ' h' : mins + ' min'}</b>. Taking a break is a healthy choice.</p>
        <p class="fine">Need support? Call <a href="tel:18004262537">1-800-GAMBLER</a> (24/7, US).</p>
        <button class="btn btn-ghost" id="end-break">Demo only: end break</button><p class="fine">PLACEHOLDER — in a real product this would be enforced server-side with no override.</p></div>`;
      $('#end-break').onclick = () => { state.breakUntil = 0; save(); lock.hidden = true; route(); };
      return true;
    }
    lock.hidden = true; return false;
  }

  /* ---------- lobby ---------- */
  function bonusInfo() {
    const wait = state.lastBonus + DAY - Date.now();
    const streak = (Date.now() - state.lastBonus > 2 * DAY) ? 0 : state.streak;
    const next = Math.min(streak + 1, 7);
    return { ready: wait <= 0, wait, next, gc: 5000 + (next - 1) * 1000, sc: 1 };
  }
  function claimBonus() {
    const b = bonusInfo(); if (!b.ready) return;
    state.streak = b.next; state.lastBonus = Date.now();
    wallet._set('GC', state.gc + b.gc); wallet._set('SC', state.sc + b.sc); save(); render();
    toast(`Daily bonus claimed: +${b.gc.toLocaleString()} GC and +${b.sc.toFixed(2)} SC (day ${b.next} streak)`, 'win');
    if ($('#view-lobby') && !$('#view-lobby').hidden) updateBonusBtn();
  }
  function fmtWait(ms) { const s = Math.max(0, Math.floor(ms / 1000)); return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }
  function updateBonusBtn() {
    const btn = $('#btn-bonus'); if (!btn) return; const b = bonusInfo();
    btn.disabled = !b.ready; btn.classList.toggle('pulse', b.ready);
    btn.innerHTML = b.ready ? `<span class="gift"></span> Claim Daily Bonus <small>+${b.gc.toLocaleString()} GC · +${b.sc.toFixed(2)} SC</small>` : `<span class="gift"></span> Next bonus in <b>${fmtWait(b.wait)}</b>`;
    const dots = $('#streak'); if (dots) dots.innerHTML = Array.from({ length: 7 }, (_, i) => `<i class="${i < (b.ready ? (Date.now() - state.lastBonus > 2 * DAY ? 0 : state.streak) : state.streak) ? 'on' : ''}"></i>`).join('');
  }
  function renderLobby() {
    const root = $('#view-lobby');
    const rtpBadge = { poker: 'RTP 99.54%*', blackjack: 'Edge ≈0.5%*', holdem: 'vs AI · No rake', slots: 'RTP 96.17%', baccarat: 'Banker edge 1.06%' };
    root.innerHTML = `
      <div class="hero">
        <div class="hero-text">
          <div class="eyebrow">Welcome back</div>
          <h2>${escapeHtml(state.name)}</h2>
          <p>Pick a table, spin the reels, or grab your free daily coins.</p>
        </div>
        <div class="wallet-card">
          <div class="wc-row">
            <div class="wc-bal"><span class="coin coin-gc"></span><div><small>Gold Coins</small><b data-bal="GC">0</b></div></div>
            <div class="wc-bal"><span class="coin coin-sc"></span><div><small>Sweeps Coins</small><b data-bal="SC">0.00</b></div></div>
          </div>
          <div class="seg" role="group" aria-label="Play with">
            <span class="seg-label">Play with</span>
            <button class="lobby-cur" data-cur="GC">Gold Coins</button>
            <button class="lobby-cur" data-cur="SC">Sweeps Coins</button>
          </div>
          <button id="btn-bonus" class="btn btn-gold btn-bonus"></button>
          <div class="streak" id="streak" title="Daily streak"></div>
        </div>
      </div>
      <div class="section-title"><h3>Games</h3><span class="muted">All games use virtual coins · tap <b>i</b> in any game for RTP / house edge</span></div>
      <div class="tiles">
        ${gameOrder.map(id => { const g = games[id]; return `<a class="tile" href="#/game/${id}" data-game="${id}">
          <div class="tile-art">${g.art()}</div>
          <div class="tile-body"><h4>${g.name}</h4><p>${g.tagline}</p>
          <div class="tile-foot"><span class="chip-rtp">${rtpBadge[id]}</span><span class="play">Play ›</span></div></div></a>`; }).join('')}
      </div>
      <p class="fine center">* RTP shown for optimal strategy where applicable; approximate for table games. Virtual coins only — no cash value in this demo.</p>
      <div class="notice-bar"><b>21+</b> (18+ where permitted). Play for entertainment. Help: <a href="tel:18004262537">1-800-GAMBLER</a> · <a href="#/safe">Set limits</a></div>`;
    $$('.lobby-cur', root).forEach(b => b.onclick = () => setCurrency(b.dataset.cur));
    $('#btn-bonus').onclick = claimBonus;
    updateBonusBtn();
    const iv = setInterval(updateBonusBtn, 1000); viewDisposers.push(() => clearInterval(iv));
    on('cur', render);
  }

  /* ---------- game container ---------- */
  function renderGame(g) {
    const root = $('#view-game');
    root.innerHTML = `<div class="game-head">
        <a class="back" href="#/lobby" aria-label="Back to lobby">‹ Lobby</a>
        <div class="gh-title"><h2>${g.name}</h2><span class="chip-rtp" id="gh-rtp">${g.rtpShort || ''}</span></div>
        <button class="icon-btn" id="btn-info" aria-label="Game info: RTP and house edge">i</button>
      </div><div class="game-body" id="game-body"></div>`;
    $('#btn-info').onclick = () => modal({ title: g.name + ' — Rules & RTP', html: g.info() });
    currentGame = g;
    g.mount($('#game-body'), { App, wallet, UI: window.UI, Core: window.Core });
  }

  /* ---------- redeem (demo placeholder) ---------- */
  function renderRedeem() {
    const root = $('#view-redeem');
    root.innerHTML = `
      <div class="panel demo-panel">
        <div class="demo-stamp">DEMO ONLY</div>
        <h2>Redeem Sweeps Coins</h2>
        <p class="lead">This screen is a <b>non-functional placeholder</b>. This prototype has <b>no payments, no real prizes and no real redemption</b>. All coins live in your browser's local storage and have no cash value.</p>
        <div class="redeem-bal"><span class="coin coin-sc"></span><div><small>Your demo Sweeps Coins</small><b data-bal="SC">0.00</b></div></div>
        <form id="redeem-form" class="form-grid" onsubmit="return false">
          <label>Amount (SC)<input type="number" min="0" step="0.01" placeholder="e.g. 50.00" disabled></label>
          <label>Method<select disabled><option>Bank transfer (not available)</option><option>Gift card (not available)</option></select></label>
          <label>Identity verification<input type="text" placeholder="KYC not implemented" disabled></label>
          <button class="btn btn-gold" id="btn-redeem-demo" type="button">Request Redemption</button>
        </form>
        <div class="steps">
          <h4>What a production flow would need</h4>
          <ol><li>Age &amp; identity verification (KYC) and geo-location checks</li>
            <li>State-by-state eligibility (sweepstakes law differs widely; many states are excluded)</li>
            <li>Alternate method of entry (AMOE) &amp; official "no purchase necessary" rules</li>
            <li>Minimum redemption, playthrough rules, payout processor &amp; anti-fraud</li>
            <li>Licensed legal review before launch</li></ol>
        </div>
        <button class="btn btn-ghost" id="btn-reload">Reload demo balance (+5,000 GC · +5.00 SC)</button>
      </div>`;
    $('#btn-redeem-demo').onclick = () => modal({ title: 'Demo only', html: '<p>Redemption is <b>not available</b>. This prototype is a design/gameplay demo using virtual currency. Nothing here can be exchanged for cash, gift cards or prizes.</p>', actions: [{ label: 'Got it', cls: 'btn-gold' }] });
    $('#btn-reload').onclick = () => { wallet.credit(5000, 'GC'); wallet.credit(5, 'SC'); toast('Demo balance reloaded', 'win'); };
  }

  /* ---------- profile / settings / responsible play ---------- */
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }
  function renderProfile(scrollSafe) {
    const root = $('#view-profile');
    const L = state.limits;
    root.innerHTML = `
      <div class="panel profile-head">
        <div class="avatar">${escapeHtml(state.name.trim().charAt(0).toUpperCase() || 'P')}</div>
        <div><h2>${escapeHtml(state.name)}</h2><p class="muted">Verdelux demo account · local to this browser</p></div>
      </div>
      <div class="grid2">
        <div class="panel">
          <h3>Settings</h3>
          <label class="field">Display name<input id="set-name" maxlength="20" value="${escapeHtml(state.name)}"></label>
          <label class="switch"><input type="checkbox" id="set-motion" ${state.reduceMotion ? 'checked' : ''}><span>Reduce motion / faster animations</span></label>
          <div class="stats"><div><small>Wagered today (GC)</small><b>${wallet.fmt(state.wagered.GC, 'GC')}</b></div><div><small>Wagered today (SC)</small><b>${wallet.fmt(state.wagered.SC, 'SC')}</b></div></div>
          <div class="row-btns"><button class="btn btn-ghost" id="btn-reload2">Reload demo coins</button><button class="btn btn-danger" id="btn-reset">Reset all demo data</button></div>
        </div>
        <div class="panel" id="safe">
          <h3>Responsible play</h3>
          <div class="notice-box"><b>21+</b> (18+ where local law allows). Games here are for entertainment with virtual coins. Results are random; no strategy guarantees wins.</div>
          <h4>Daily wager limits <small class="muted">(0 = no limit)</small></h4>
          <div class="limit-row">
            <label class="field">Gold Coins<input type="number" min="0" step="100" id="lim-gc" value="${L.GC}"></label>
            <label class="field">Sweeps Coins<input type="number" min="0" step="1" id="lim-sc" value="${L.SC}"></label>
          </div>
          <label class="field">Play-time reminder
            <select id="lim-rem"><option value="0">Off</option><option value="15">Every 15 min</option><option value="30">Every 30 min</option><option value="60">Every 60 min</option></select></label>
          <button class="btn btn-gold" id="btn-save-limits">Save limits</button>
          <h4>Take a break / self-exclusion <span class="tag-ph">PLACEHOLDER</span></h4>
          <p class="muted small">In production this would offer 24h, 7-day, 30-day and permanent self-exclusion, enforced server-side across devices. Here a 1-hour break is local-only.</p>
          <div class="row-btns"><button class="btn btn-ghost" id="btn-break">Take a 1-hour break</button><button class="btn btn-ghost" id="btn-selfex">Self-exclude…</button></div>
          <h4>Get help</h4>
          <p><a class="helpline" href="tel:18004262537">1-800-GAMBLER</a> <span class="muted small">(24/7, confidential, US) · ncpgambling.org</span></p>
        </div>
      </div>`;
    $('#lim-rem').value = String(L.remindMin);
    $('#set-name').onchange = e => { state.name = e.target.value.trim() || 'Player One'; save(); renderProfile(); };
    $('#set-motion').onchange = e => { state.reduceMotion = e.target.checked; save(); render(); };
    $('#btn-reload2').onclick = () => { wallet.credit(5000, 'GC'); wallet.credit(5, 'SC'); toast('Demo balance reloaded', 'win'); };
    $('#btn-reset').onclick = () => modal({ title: 'Reset demo data?', html: '<p>This clears coins, limits and settings stored in this browser.</p>', actions: [{ label: 'Reset', cls: 'btn-danger', onClick() { localStorage.removeItem(KEY); load(); save(); render(); location.hash = '#/welcome'; } }, { label: 'Cancel', cls: 'btn-ghost' }] });
    $('#btn-save-limits').onclick = () => {
      state.limits.GC = Math.max(0, +$('#lim-gc').value || 0); state.limits.SC = Math.max(0, +$('#lim-sc').value || 0);
      state.limits.remindMin = +$('#lim-rem').value || 0; save(); startReminder(); toast('Limits saved', 'info');
    };
    $('#btn-break').onclick = () => modal({ title: 'Take a 1-hour break?', html: '<p>Play will be paused for 1 hour (demo placeholder).</p>', actions: [{ label: 'Start break', onClick() { state.breakUntil = Date.now() + 3600e3; save(); route(); } }, { label: 'Cancel', cls: 'btn-ghost' }] });
    $('#btn-selfex').onclick = () => modal({ title: 'Self-exclusion (placeholder)', html: '<p>A real product would collect identity details and block access for your chosen period (e.g. 30 days, 1 year, permanent), and share the exclusion across devices.</p><p class="muted">Not implemented in this prototype.</p>', actions: [{ label: 'OK', cls: 'btn-gold' }] });
    if (scrollSafe) setTimeout(() => $('#safe').scrollIntoView({ behavior: 'auto', block: 'start' }), 30);
  }

  let remTimer = null;
  function startReminder() {
    clearInterval(remTimer); if (!state.limits.remindMin) return;
    const t0 = Date.now();
    remTimer = setInterval(() => toast(`Reminder: you've been playing for ${Math.round((Date.now() - t0) / 60000)} minutes.`, 'warn'), state.limits.remindMin * 60000);
  }

  /* ---------- boot ---------- */
  function start() {
    load(); buildNav(); render();
    $$('.cur-btn').forEach(b => b.onclick = () => setCurrency(b.dataset.cur));
    window.addEventListener('hashchange', route);
    startReminder();
    // Test/screenshot helper: ?seed=1 enables a pre-confirmed age gate
    if (/[?&]age=1/.test(location.search) && !state.ageOK) { state.ageOK = true; save(); }
    route();
  }

  window.App = { start, wallet, on, emit, toast, modal, register, setBusy, setCurrency, get state() { return state; }, save, render, games, escapeHtml };
})();
