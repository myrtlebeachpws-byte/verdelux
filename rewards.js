/* Verdelux rewards: membership tiers & XP, 30-minute bonus, 7-day daily streak, daily mini wheel, weekly & birthday bonus.
   All values are virtual coins stored in localStorage. No purchases, no cash value. */
(function () {
  'use strict';
  const HALF = 30 * 60 * 1000, DAY = 864e5, WEEK = 7 * DAY;
  const $ = (s, el) => (el || document).querySelector(s);
  const st = () => App.state, fmt = n => Math.round(n).toLocaleString('en-US');
  const TIERS = [
    { name: 'Emerald', xp: 0, mult: 1, xpBoost: 1, fs: 0, weekly: 2500, bday: 10000, col: '#22d47f', perks: ['30-min bonus 1,000 GC + 0.10 SC', 'Daily streak & mini wheel', 'Weekly bonus 2,500 GC'] },
    { name: 'Sapphire', xp: 25000, mult: 1.25, xpBoost: 1.1, fs: 5, weekly: 5000, bday: 25000, col: '#3f7dff', perks: ['All bonuses ×1.25', '+10% XP (faster levels)', '5 member free spins daily', 'Weekly bonus 5,000 GC', 'Birthday bonus 25,000 GC'] },
    { name: 'Ruby', xp: 150000, mult: 1.5, xpBoost: 1.2, fs: 10, weekly: 10000, bday: 50000, col: '#ff3b5c', perks: ['All bonuses ×1.5', '+20% XP', '10 member free spins daily', 'Weekly bonus 10,000 GC', 'Birthday bonus 50,000 GC'] },
    { name: 'Diamond', xp: 750000, mult: 2, xpBoost: 1.35, fs: 20, weekly: 25000, bday: 100000, col: '#9fd2f0', perks: ['All bonuses ×2', '+35% XP', '20 member free spins daily', 'Weekly bonus 25,000 GC', 'Birthday bonus 100,000 GC'] },
    { name: 'Black Diamond', xp: 3000000, mult: 3, xpBoost: 1.5, fs: 30, weekly: 50000, bday: 250000, col: '#c9c2ff', perks: ['All bonuses ×3', '+50% XP', '30 member free spins daily', 'Weekly bonus 50,000 GC', 'Birthday bonus 250,000 GC', 'Exclusive slot: Black Diamond Royale'] }
  ];
  const DAILY = [{ gc: 2000, sc: .2 }, { gc: 3000, sc: .3 }, { gc: 4000, sc: .4 }, { gc: 5000, sc: .5 }, { gc: 7500, sc: .75 }, { gc: 10000, sc: 1 }, { gc: 25000, sc: 3, fs: 10, mega: true }];
  const WHEEL = [500, 1000, 1500, 2000, 2500, 5000, 1000, 10000];
  const HOURLY = { gc: 1000, sc: 0.1 };

  const tierIdx = xp => { let i = 0; TIERS.forEach((t, k) => { if (xp >= t.xp) i = k; }); return i; };
  const tier = () => TIERS[tierIdx(st().xp)];
  const level = xp => Math.floor(Math.sqrt(xp / 250)) + 1;
  function progress() {
    const xp = st().xp, i = tierIdx(xp), t = TIERS[i], n = TIERS[i + 1];
    const lv = level(xp), lo = 250 * (lv - 1) ** 2, hi = 250 * lv ** 2;
    return { tier: t, next: n, lv, lvPct: Math.min(100, (xp - lo) / (hi - lo) * 100), pct: n ? Math.min(100, (xp - t.xp) / (n.xp - t.xp) * 100) : 100,
      label: n ? `${fmt(xp)} / ${fmt(n.xp)} XP to ${n.name}` : `${fmt(xp)} XP · top tier reached` };
  }
  function addXP(amount, cur) {
    const before = tierIdx(st().xp);
    st().xp = Math.round(st().xp + amount * (cur === 'SC' ? 100 : 1) * tier().xpBoost);
    const after = tierIdx(st().xp);
    if (after > before) setTimeout(() => notify(`🎉 Welcome to ${TIERS[after].name}! Your bonuses are now ×${TIERS[after].mult}.`, 'win'), 50);
  }
  const unlocked = name => tierIdx(st().xp) >= TIERS.findIndex(t => t.name === name);
  function grant(gc, sc, why) {
    App.wallet._set('GC', st().gc + gc); if (sc) App.wallet._set('SC', st().sc + sc); App.save(); App.render();
    notify(`${why}: +${fmt(gc)} GC${sc ? ` · +${sc.toFixed(2)} SC` : ''}`, 'win');
  }
  function notify(msg, kind) { // notification-style toast
    const root = $('#toast-root'); const el = document.createElement('div'); el.className = 'toast notif ' + (kind || '');
    el.innerHTML = `<span class="n-ico"></span><div><b>Verdelux</b><span>${App.escapeHtml(msg)}</span></div>`;
    root.appendChild(el); requestAnimationFrame(() => el.classList.add('in'));
    setTimeout(() => { el.classList.remove('in'); setTimeout(() => el.remove(), 300); }, 4200);
  }
  /* ---- 30-minute bonus ---- */
  function hourly() { const wait = st().hourlyLast + HALF - App.now(), m = tier().mult; return { ready: wait <= 0, wait: Math.max(0, wait), gc: Math.round(HOURLY.gc * m), sc: st().hourlySC ? Math.round(HOURLY.sc * m * 100) / 100 : 0, pct: Math.min(1, 1 - wait / HALF) }; }
  function claimHourly() { const h = hourly(); if (!h.ready) return; st().hourlyLast = App.now(); notified = false; grant(h.gc, h.sc, '30-minute bonus collected'); refresh(); }
  /* ---- daily streak ---- */
  function daily() {
    const d = st().daily, today = App.localDay(), yest = App.localDay(App.now() - DAY);
    const claimed = d.last === today, cont = d.last === yest || claimed;
    const streak = cont ? d.streak : 0; // missed a day -> reset
    const nextDay = claimed ? streak : (streak % 7) + 1; // 1..7
    const m = tier().mult, rw = DAILY[nextDay - 1];
    return { claimed, streak, nextDay, reset: !cont && d.streak > 0, gc: Math.round(rw.gc * m), sc: Math.round(rw.sc * m * 100) / 100, fs: (rw.fs || 0) + tier().fs, mega: rw.mega };
  }
  function claimDaily() {
    const x = daily(); if (x.claimed) return;
    st().daily = { last: App.localDay(), streak: x.nextDay }; st().tokens += x.fs;
    grant(x.gc, x.sc, `Day ${x.nextDay} reward${x.mega ? ' (MEGA!)' : ''}${x.fs ? ` + ${x.fs} member free spins` : ''}`); refresh();
  }
  const wheelReady = () => st().wheelDay !== App.localDay();
  const weekly = () => { const w = st().weeklyLast + WEEK - App.now(); return { ready: w <= 0, wait: Math.max(0, w), gc: tier().weekly }; };
  function bday() { const b = st().birthday; if (!b) return { set: false }; const d = new Date(App.now()), md = String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); return { set: true, today: md === b, ready: md === b && st().bdayYear !== d.getFullYear(), gc: tier().bday }; }
  function fmtWait(ms) { const s = Math.ceil(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = s % 60; return (h ? h + ':' : '') + String(m).padStart(2, '0') + ':' + String(x).padStart(2, '0'); }

  /* ---- shared widgets ---- */
  function ring(pct, inner, cls) { const C = 2 * Math.PI * 26; return `<svg viewBox="0 0 64 64" class="ring ${cls || ''}"><circle cx="32" cy="32" r="26" class="ring-bg"/><circle cx="32" cy="32" r="26" class="ring-fg" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct)}" transform="rotate(-90 32 32)"/></svg><span class="ring-in">${inner}</span>`; }
  function memberChip() { const p = progress(); return `<a class="member-chip" href="#/member" style="--tc:${p.tier.col}"><span class="mc-gem"></span><div><b>${p.tier.name}</b> · Level ${p.lv}<div class="lvl-bar"><i style="width:${p.pct}%"></i></div><small>${p.label}</small></div></a>`; }
  function limitsHTML() {
    const L = st().limits, w = st().wagered, row = c => L[c] > 0 ? `<div class="lim-row"><span>${c} wagered today</span><b>${App.wallet.fmt(w[c], c)} / ${App.wallet.fmt(L[c], c)}</b><div class="lvl-bar lim"><i style="width:${Math.min(100, w[c] / L[c] * 100)}%"></i></div></div>` : `<div class="lim-row"><span>${c} daily wager limit</span><b>Not set</b></div>`;
    return `<div class="panel rg-panel"><div class="rg-head"><b>Responsible play</b><a href="#/safe">Edit limits ›</a></div>${row('GC')}${row('SC')}<p class="fine">Limits are enforced on every wager, including all slots. Bonuses never bypass limits or breaks.</p></div>`;
  }
  let lobbyRoot = null;
  function mountLobby(root, disposers) {
    lobbyRoot = root;
    $('#lobby-member', root).innerHTML = memberChip();
    $('#lobby-limits', root).innerHTML = limitsHTML();
    drawLobby();
    const iv = setInterval(drawLobby, 1000); disposers.push(() => { clearInterval(iv); lobbyRoot = null; });
  }
  function drawLobby() {
    const root = lobbyRoot; if (!root || !document.body.contains(root)) return;
    const h = hourly(), d = daily(), host = $('#lobby-rewards', root);
    const html = `<div class="rw-strip">
      <button class="rw-card rw-hourly ${h.ready ? 'ready' : ''}" id="rw-hourly" ${h.ready ? '' : 'aria-disabled="true"'}>
        <div class="rw-ring">${ring(h.pct, h.ready ? '🎁' : '<small>' + fmtWait(h.wait) + '</small>', h.ready ? 'done' : '')}</div>
        <div class="rw-txt"><small>30-MIN BONUS</small><b>${h.ready ? 'Collect now!' : 'Next in ' + fmtWait(h.wait)}</b><span>+${fmt(h.gc)} GC${h.sc ? ` · +${h.sc.toFixed(2)} SC` : ''}</span></div></button>
      <a class="rw-card rw-daily ${!d.claimed ? 'ready' : ''}" href="#/rewards">
        <div class="rw-ring"><div class="cal-mini">${[1, 2, 3, 4, 5, 6, 7].map(i => `<i class="${i <= (d.claimed ? d.streak : d.nextDay - 1) ? 'on' : ''} ${i === 7 ? 'm' : ''}"></i>`).join('')}</div></div>
        <div class="rw-txt"><small>DAILY REWARDS</small><b>${d.claimed ? `Day ${d.streak} claimed ✓` : `Day ${d.nextDay} ready!`}</b><span>${wheelReady() ? 'Mini wheel spin ready' : 'Streak ' + (d.claimed ? d.streak : d.streak) + ' day' + (d.streak === 1 ? '' : 's')}</span></div></a></div>`;
    if (host.dataset.h !== html) { host.innerHTML = html; host.dataset.h = html; const b = $('#rw-hourly', host); b.onclick = () => { if (hourly().ready) claimHourly(); else notify(`Next 30-minute bonus in ${fmtWait(hourly().wait)}`, 'info'); }; }
  }
  function refresh() { if (lobbyRoot) drawLobby(); const v = $('#view-rewards'); if (v && !v.hidden) renderRewards(v); const m = $('#view-member'); if (m && !m.hidden) renderMember(m); }

  /* ---- Rewards page ---- */
  function wheelSVG() {
    const n = WHEEL.length, m = tier().mult, cols = ['#0b5d3f', '#d4af37', '#0e7a52', '#8a6410'];
    let o = ''; for (let i = 0; i < n; i++) { const a0 = (i / n) * 2 * Math.PI - Math.PI / 2 - Math.PI / n, a1 = a0 + 2 * Math.PI / n, p = a => `${100 + 92 * Math.cos(a)},${100 + 92 * Math.sin(a)}`, am = (a0 + a1) / 2, tx = 100 + 62 * Math.cos(am), ty = 100 + 62 * Math.sin(am);
      o += `<path d="M100,100 L${p(a0)} A92,92 0 0 1 ${p(a1)} Z" fill="${cols[i % 4]}" stroke="#f5d77a" stroke-width="1.5"/><text x="${tx}" y="${ty}" transform="rotate(${am * 180 / Math.PI + 90} ${tx} ${ty})" text-anchor="middle" dominant-baseline="middle" font-weight="900" font-size="13" fill="#fff8d8" font-family="Georgia,serif">${fmt(WHEEL[i] * m)}</text>`; }
    return `<svg viewBox="0 0 200 200" class="wheel-svg"><circle cx="100" cy="100" r="97" fill="url(#gGold)"/>${o}<circle cx="100" cy="100" r="16" fill="url(#gGold)"/></svg>`;
  }
  function renderRewards(root) {
    const d = daily(), w = weekly(), b = bday(), h = hourly(), m = tier().mult;
    root.innerHTML = `<div class="panel rw-page">
      <h2>Daily Rewards</h2><p class="muted">Claim once per day to build a 7-day streak. Miss a day and the streak resets to Day 1. Rewards ×${m} for <b>${tier().name}</b>.</p>
      ${d.reset ? '<div class="notice-box warn">You missed a day — your streak was reset to Day 1.</div>' : ''}
      <div class="cal7">${DAILY.map((r, i) => { const day = i + 1, done = d.claimed ? day <= d.streak : day < d.nextDay, cur = !d.claimed && day === d.nextDay;
        return `<div class="cal-d ${done ? 'done' : ''} ${cur ? 'cur' : ''} ${r.mega ? 'mega' : ''}"><small>DAY ${day}</small><span class="cal-ico">${r.mega ? '💎' : done ? '✓' : '🪙'}</span><b>${fmt(r.gc * m)}</b><em>+${(r.sc * m).toFixed(2)} SC${r.fs ? ` · ${r.fs} FS` : ''}</em>${r.mega ? '<i class="mega-tag">MEGA</i>' : ''}</div>`; }).join('')}</div>
      <button class="btn btn-gold btn-lg" id="rw-claim" ${d.claimed ? 'disabled' : ''}>${d.claimed ? `Day ${d.streak} claimed — come back tomorrow` : `Claim Day ${d.nextDay}: +${fmt(d.gc)} GC · +${d.sc.toFixed(2)} SC${d.fs ? ` · ${d.fs} free spins` : ''}`}</button>
    </div>
    <div class="grid2">
      <div class="panel rw-wheel"><h3>Daily Mini Wheel</h3><p class="muted small">One free spin per day.</p>
        <div class="wheel-wrap"><div class="wheel-box sm"><div class="wheel-ptr"></div><div class="wheel-rot" id="mw-rot">${wheelSVG()}</div></div></div>
        <button class="btn btn-gold" id="mw-go" ${wheelReady() ? '' : 'disabled'}>${wheelReady() ? 'SPIN FREE' : 'Spun today ✓'}</button></div>
      <div class="panel"><h3>More bonuses</h3>
        <div class="bon-row"><div class="rw-ring sm">${ring(h.pct, h.ready ? '🎁' : '')}</div><div><b>30-minute bonus</b><small>${h.ready ? 'Ready' : 'in ' + fmtWait(h.wait)} · +${fmt(h.gc)} GC${h.sc ? ` +${h.sc.toFixed(2)} SC` : ''}</small></div><button class="btn btn-gold btn-sm" id="rw-h" ${h.ready ? '' : 'disabled'}>Collect</button></div>
        <div class="bon-row"><span class="bon-ico">📅</span><div><b>Weekly bonus</b><small>${w.ready ? 'Ready' : 'in ' + Math.ceil(w.wait / DAY) + ' day(s)'} · +${fmt(w.gc)} GC</small></div><button class="btn btn-gold btn-sm" id="rw-w" ${w.ready ? '' : 'disabled'}>Claim</button></div>
        <div class="bon-row"><span class="bon-ico">🎂</span><div><b>Birthday bonus</b><small>${b.set ? (b.ready ? 'Happy birthday!' : 'On ' + st().birthday) : 'Set your birthday on the VIP page'} · +${fmt(tier().bday)} GC</small></div><button class="btn btn-gold btn-sm" id="rw-b" ${b.ready ? '' : 'disabled'}>Claim</button></div>
        <div class="bon-row"><span class="bon-ico">🎰</span><div><b>Member free spins</b><small>${st().tokens} available · used automatically at min bet (GC) in themed slots</small></div></div>
      </div></div>`;
    $('#rw-claim', root).onclick = claimDaily;
    $('#rw-h', root).onclick = claimHourly;
    $('#rw-w', root).onclick = () => { if (!weekly().ready) return; st().weeklyLast = App.now(); grant(weekly().gc, 0, 'Weekly bonus'); refresh(); };
    $('#rw-b', root).onclick = () => { const x = bday(); if (!x.ready) return; st().bdayYear = new Date(App.now()).getFullYear(); grant(x.gc, 0, 'Birthday bonus'); refresh(); };
    $('#mw-go', root).onclick = () => {
      if (!wheelReady()) return; st().wheelDay = App.localDay(); App.save();
      const i = window.Core.randInt(WHEEL.length), rot = $('#mw-rot', root), dur = st().reduceMotion ? 50 : 3500, btn = $('#mw-go', root); btn.disabled = true;
      rot.style.transition = `transform ${dur}ms cubic-bezier(.15,.8,.15,1)`; rot.style.transform = `rotate(${360 * 5 - i * 360 / WHEEL.length}deg)`;
      setTimeout(() => { grant(Math.round(WHEEL[i] * tier().mult), 0, 'Mini wheel'); btn.textContent = 'Spun today ✓'; }, dur + 100);
    };
  }
  /* ---- Member page ---- */
  function renderMember(root) {
    const p = progress(), cur = tierIdx(st().xp);
    root.innerHTML = `<div class="panel member-hero" style="--tc:${p.tier.col}"><div class="mh-gem"></div><div class="mh-txt"><small>VERDELUX MEMBERSHIP</small><h2>${p.tier.name}</h2><span>Level <b>${p.lv}</b></span>
        <div class="lvl-bar big"><i style="width:${p.lvPct}%"></i></div><small class="muted">Level ${p.lv} → ${p.lv + 1}</small>
        <div class="lvl-bar"><i style="width:${p.pct}%"></i></div><small class="muted">${p.label}</small></div></div>
      <p class="muted small center">Earn XP from every virtual-coin wager: 1 XP per GC, 100 XP per SC, boosted by your tier. Status never expires in this demo.</p>
      <div class="tier-list">${TIERS.map((t, i) => `<div class="tier-card ${i === cur ? 'cur' : ''} ${i < cur ? 'past' : ''}" style="--tc:${t.col}"><div class="tc-head"><span class="mc-gem"></span><b>${t.name}</b><small>${i === 0 ? 'Start' : fmt(t.xp) + ' XP'}</small>${i === cur ? '<em>YOU</em>' : ''}</div>
        <ul>${t.perks.map(x => `<li>${x}</li>`).join('')}</ul></div>`).join('')}</div>
      <div class="grid2"><div class="panel"><h3>Birthday</h3>${st().birthday ? `<p>Birthday set: <b>${st().birthday}</b> (MM-DD). Claim your bonus on Rewards that day.</p>` : `<p class="muted small">Set once (MM-DD). Your tier's birthday bonus unlocks on that date.</p><div class="limit-row"><label class="field">Month<input type="number" id="bd-m" min="1" max="12" placeholder="MM"></label><label class="field">Day<input type="number" id="bd-d" min="1" max="31" placeholder="DD"></label></div><button class="btn btn-gold" id="bd-save">Save birthday</button>`}
        <label class="switch"><input type="checkbox" id="set-hsc" ${st().hourlySC ? 'checked' : ''}><span>Include Sweeps Coins in the 30-min bonus</span></label></div>
        <div id="mem-limits">${limitsHTML()}</div></div>`;
    const bs = $('#bd-save', root); if (bs) bs.onclick = () => { const m = +$('#bd-m', root).value, d = +$('#bd-d', root).value; if (!(m >= 1 && m <= 12 && d >= 1 && d <= 31)) return App.toast('Enter a valid month and day', 'warn'); st().birthday = String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0'); App.save(); renderMember(root); };
    $('#set-hsc', root).onchange = e => { st().hourlySC = e.target.checked; App.save(); };
  }
  /* ---- global ticker: notify when the 30-min bonus becomes ready ---- */
  let notified = false;
  function start() { setInterval(() => { if (!st() || !st().ageOK) return; const h = hourly(); if (h.ready && !notified) { notified = true; if (st().hourlyLast) notify(`Your 30-minute bonus is ready: +${fmt(h.gc)} GC. Collect it in the lobby!`, 'info'); } if (!h.ready) notified = false; }, 1000); }
  window.Rewards = { TIERS, DAILY, tier, tierIdx, progress, addXP, unlocked, hourly, claimHourly, daily, claimDaily, mountLobby, renderRewards, renderMember, start, notify,
    tokens: () => st().tokens, useToken() { if (st().tokens > 0) { st().tokens--; App.save(); return true; } return false; } };
  App.member = { unlocked, progress: () => progress(), tokens: () => st().tokens, useToken: () => window.Rewards.useToken() };
})();
