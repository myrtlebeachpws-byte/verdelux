/* Verdelux data-driven slot engine — UI. One renderer for every theme in SlotMath.THEMES:
   reels, paylines, expanding / multiplier wilds, free spins, pick-em, wheel, hold & spin, themed tiered celebrations. */
(function () {
  'use strict';
  const M = window.SlotMath, C = window.Core, UI = window.UI;
  const R = n => C.randInt(n), rnd01 = () => C.randInt(1 << 30) / (1 << 30);
  const r2 = x => Math.round(x * 100) / 100;
  const DEBUG = /[?&]debug=1/.test(location.search);
  const SIM = { pharaoh: [95.918, '95.69–96.15'], goldrush: [96.033, '95.63–96.43'], deepsea: [95.686, '95.05–96.33'], dragon: [94.393, '94.16–94.63'], neon777: [96.221, '95.63–96.81'], royal: [96.333, '94.96–97.71'] };
  const STATS = { pharaoh: [34.3, 79, 387, 992], goldrush: [36.9, 213, 526, 497], deepsea: [27.1, 145, 677, 729], dragon: [37.9, 84, 545, 671], neon777: [9.5, 91, 220, 315], royal: [4.7, 163, 312, 292] };
  let S = null, forced = null;
  const Snd = {
    ctx: null, get muted() { return localStorage.getItem('jam-mute') === '1'; },
    ac() { if (this.muted) return null; try { if (!this.ctx) { const A = window.AudioContext || window.webkitAudioContext; if (!A) return null; this.ctx = new A(); } if (this.ctx.state === 'suspended') this.ctx.resume(); return this.ctx; } catch (e) { return null; } },
    tone(f, t0, d, type, v) { const a = this.ac(); if (!a) return; const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + (t0 || 0); o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v || .1, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(g).connect(a.destination); o.start(t); o.stop(t + d + .05); },
    stop() { this.tone(170, 0, .07, 'triangle', .07); }, chime(n) { [660, 880, 990, 1320, 1760].slice(0, n || 3).forEach((f, i) => this.tone(f, i * .07, .3, 'sine', .08)); },
    fan(l) { const s = [523, 659, 784, 1047, 1319, 1568]; for (let i = 0; i < 3 + l * 2; i++) this.tone(s[i % 6], i * .1, .45, 'square', .04); }, tick() { this.tone(1500 + Math.random() * 500, 0, .03, 'square', .02); },
    toggle() { localStorage.setItem('jam-mute', this.muted ? '0' : '1'); if (this.muted && this.ctx) this.ctx.suspend(); }
  };
  const sk = (T, s) => T.id + ':' + s;
  const sym = (T, s) => UI.sym(sk(T, s));
  const RTP = {}; M.THEMES.forEach(T => { RTP[T.id] = M.exactRTP(T); });

  function vipLocked(T) { return T.vip && App.member && !App.member.unlocked(T.vip); }

  M.THEMES.forEach(T => App.register({
    id: T.id, kind: 'slot', badge: T.badge, vip: T.vip, name: T.name, tagline: T.tagline,
    rtp: RTP[T.id].rtp, rtpShort: 'RTP ' + (RTP[T.id].rtp * 100).toFixed(2) + '% (exact)',
    art() { const k = Object.keys(T.pay); return `<div class="slot-art vx-art th-${T.id}" style="${vars(T)}">${sym(T, k[2])}${sym(T, T.top)}${sym(T, T.scatter || T.coin || T.wild)}<span class="vx-logo">${T.name}</span></div>`; },
    info() { return infoHTML(T); },
    mount(el) { mount(T, el); },
    unmount() { if (S) { S.alive = false; window.removeEventListener('keydown', S.key); if (S.cel) S.cel.kill(); } App.setBusy(false); S = null; }
  }));

  function vars(T) { const c = T.colors; return `--vx-bg1:${c.bg1};--vx-bg2:${c.bg2};--vx-reel:${c.reel};--vx-acc:${c.accent};--vx-glow:${c.glow};--vx-sub:${c.sub}`; }
  function bonusText(T) {
    const B = T.bonus;
    if (B.type === 'freespins') return `<b>${B.label}</b>: 3 / 4 / 5 ${T.syms[T.scatter]} anywhere → ${B.spinsBy[3]} / ${B.spinsBy[4]} / ${B.spinsBy[5]} free spins, every win <b>×${B.mult}</b>. Scatter also pays ${T.scatterPay[3]}× / ${T.scatterPay[4]}× / ${T.scatterPay[5]}× total bet. No re-triggers.`;
    if (B.type === 'pick') return `<b>${B.label}</b>: 3 / 4 / 5 ${T.syms[T.scatter]} → pick-em over ${B.prizes.length + 1 + B.collects} rocks: nuggets (${Math.min(...B.prizes)}–${Math.max(...B.prizes)}× bet), one <b>×${B.mult}</b> multiplier, and ${B.collects} CAVE-IN tiles that end the pick. Bonus total ×${B.multBy[3]} / ×${B.multBy[4]} / ×${B.multBy[5]} by trigger size (avg ${M.pickEV(B).toFixed(2)}× bet before trigger multiplier).`;
    if (B.type === 'wheel') return `<b>${B.label}</b>: ${Object.keys(B.multBy).map(n => n).join(' / ')} ${T.syms[T.scatter]} anywhere → spin a ${B.segs.length}-segment wheel (${B.segs.join(', ')}× bet, avg ${M.wheelEV(B).toFixed(2)}×)${Object.keys(B.multBy).length > 1 ? `, prize ×${Object.values(B.multBy).join(' / ×')}` : ''}.`;
    if (B.type === 'hold') return `<b>${B.label}</b>: ${B.trigger}+ Doubloons anywhere lock in place, ${B.respins} respins; every new coin resets respins to ${B.respins}. Coins are ${[...new Set(B.values)].join(', ')}× bet (25× = MINOR, 50× = MAJOR). Fill all 15 for the <b>GRAND ${B.grand}×</b> bonus.`;
    return `<b>Multiplier Wilds</b>: ${Object.entries(T.wilds).map(([k, m]) => `${T.syms[k]} = ×${m}`).join(', ')}. Wild multipliers on a line multiply together (up to ×${Object.values(T.wilds).reduce((a, b) => a * Math.max(b, 1), 1) * Math.max(...Object.values(T.wilds))}).`;
  }
  function infoHTML(T) {
    const r = RTP[T.id], st = STATS[T.id], sim = SIM[T.id], pct = x => (x * 100).toFixed(2) + '%';
    const wildTxt = T.wilds ? `Wilds (${Object.keys(T.wilds).map(k => T.syms[k]).join(', ')}) on every reel substitute for all paying symbols and multiply line wins.` : `<b>${T.syms[T.wild]}</b> (reels ${T.wildReels.map(x => x + 1).join('–')}) substitutes for all paying symbols${T.expanding ? ' and <b>expands to fill its whole reel</b>' : ''}; a line of wilds pays as ${T.syms[T.top]}.`;
    return `<p><b>${T.name}</b> — ${T.reels} reels × 3 rows, <b>${T.lines.length} fixed lines</b>, wins pay left to right, 3${T.reels === 5 ? '+' : ''} of a kind. ${wildTxt}</p>
      <h4>Signature bonus</h4><div class="jam-trig"><li>${sym(T, T.scatter || T.coin || T.wild)}<span>${bonusText(T)}</span></li>${T.bonus.type !== 'multwild' && T.wilds ? `<li>${sym(T, T.wild)}<span>${bonusText(Object.assign({}, T, { bonus: { type: 'multwild' } }))}</span></li>` : ''}</div>
      <h4>Win celebrations</h4><p class="fine">≥10× bet: <b>${T.cel.big}</b> · ≥25×: <b>${T.cel.mega}</b> · ≥50×: <b>${T.cel.epic}</b>. Tap to skip.</p>
      ${UI.infoRows([['Theoretical RTP', `<b>${pct(r.rtp)}</b> — exact: expectation over all ${r.strips.join('×')} = ${r.combos.toLocaleString()} equally likely reel-stop combinations (independent reels), bonus EV in closed form${T.bonus.type === 'hold' ? ' (exact Markov chain over coins × respins)' : ''}`],
        ['RTP breakdown', `Line wins ${pct(r.line)}${r.scatter ? ' · Scatter ' + pct(r.scatter) : ''}${r.bonus ? ' · ' + (T.bonus.label || 'Bonus') + ' ' + pct(r.bonus) : ''}`],
        ['Cross-check', `10,000,000-round simulation incl. bonuses: ${sim[0].toFixed(2)}% (95% CI ${sim[1]}%)`],
        ['House edge', (100 - r.rtp * 100).toFixed(2) + '%'], ['Hit frequency (sim)', '≈' + st[0] + '% of rounds pay'],
        r.pBonus ? ['Bonus frequency', '≈1 in ' + Math.round(1 / r.pBonus).toLocaleString() + ' spins' + (r.pGrand ? ` · GRAND ≈1 in ${Math.round(1 / r.pGrand).toLocaleString()}` : '')] : ['Bonus', 'Multiplier wilds on every spin'],
        ['Celebrations (sim)', `Big ≈1 in ${st[1]} · Mega ≈1 in ${st[2]} · Epic ≈1 in ${st[3]}`],
        ['RNG', 'crypto.getRandomValues for every reel stop, tile, wheel segment and respin']])}${UI.DEMO_NOTE}`;
  }
  function payHTML(T) {
    const keys = Object.keys(T.pay);
    const hdr = T.reels === 5 ? '<th>3</th><th>4</th><th>5</th>' : '<th>3 on a line</th>';
    const rows = keys.map(s => `<tr><td class="ps">${sym(T, s)}<small>${T.syms[s]}</small></td>${T.pay[s].map(v => `<td>${v}×</td>`).join('')}</tr>`).join('');
    const lines = T.lines.map((l, i) => `<div class="pl"><small>${i + 1}</small><div class="plg" style="grid-template-columns:repeat(${T.reels},1fr)">${[0, 1, 2].map(r => l.map(c => `<i class="${c === r ? 'on' : ''}"></i>`).join('')).join('')}</div></div>`).join('');
    return `<table class="info-table paytab"><tr><th></th>${hdr}</tr>${rows}</table><p class="fine">Multiples of the <b>line bet</b> (total bet ÷ ${T.lines.length}).</p>
      <div class="special"><div>${sym(T, T.scatter || T.coin || T.wild)}<p>${bonusText(T)}</p></div></div><h4>Lines</h4><div class="plines">${lines}</div>
      <p class="fine">Theoretical RTP ${(RTP[T.id].rtp * 100).toFixed(2)}% (exact).</p>`;
  }

  /* ---------------- mount ---------------- */
  function mount(T, el) {
    if (vipLocked(T)) {
      el.innerHTML = `<div class="panel vx-locked th-${T.id}" style="${vars(T)}"><div class="vx-lock-art">${sym(T, T.top)}</div><h3>${T.name}</h3><p>Exclusive to <b>${T.vip}</b> members. Earn XP by playing any game (virtual coins) to unlock.</p>
        <div class="lvl-bar"><i style="width:${App.member.progress().pct}%"></i></div><p class="fine">${App.member.progress().label}</p><a class="btn btn-gold" href="#/member">View membership</a></div>`;
      return;
    }
    const st = M.spinStops(T, R);
    S = { T, alive: true, el, busy: false, raw: M.rawGridAt(T, st), coinVals: {} };
    el.innerHTML = `
      <div class="slot-machine vx th-${T.id} r${T.reels}" style="${vars(T)}">
        <div class="vx-title"><span>${T.name}</span><button class="jam-mute" id="sl-mute" aria-label="Toggle sound"></button></div>
        <div class="fs-banner hidden" id="sl-fs"></div>
        <div class="reels" id="sl-reels" style="grid-template-columns:repeat(${T.reels},var(--cell))">${T.strips.map((_, i) => `<div class="reel" data-i="${i}"><div class="strip"></div></div>`).join('')}</div>
        <div class="slot-info"><div><small>LINES</small><b>${T.lines.length}</b></div><div><small>TOTAL BET</small><b id="sl-tb">0</b></div><div><small>WIN</small><b id="sl-lw">0</b></div></div>
        <div class="status" id="sl-status">Press SPIN. ${T.tagline}</div>
        <div class="jam-bonus vx-bonus hidden" id="sl-bonus"></div>
      </div>
      <div class="controls"><div id="sl-bet"></div><div class="vx-tokens" id="sl-tok"></div>
        <div class="btn-row"><button class="btn btn-ghost" id="sl-pay">Paytable</button><button class="btn btn-gold btn-lg" id="sl-spin">SPIN</button></div></div>`;
    S.stepper = UI.betStepper(el.querySelector('#sl-bet'), { key: 'vx-' + T.id, label: 'TOTAL BET', defIdx: 1, onChange: updBet });
    T.strips.forEach((_, i) => setStrip(i, S.raw[i]));
    updBet(); drawMute(); drawTok();
    $('#sl-spin').onclick = () => spin();
    $('#sl-mute').onclick = () => { Snd.toggle(); drawMute(); };
    $('#sl-pay').onclick = () => App.modal({ title: 'Paytable — ' + T.name, html: payHTML(T) });
    S.key = e => { if (e.code === 'Space' && !/INPUT|BUTTON|SELECT/.test((e.target || {}).tagName || '')) { e.preventDefault(); spin(); } };
    window.addEventListener('keydown', S.key);
  }
  const $ = s => S.el.querySelector(s);
  function drawMute() { const b = $('#sl-mute'); b.textContent = Snd.muted ? '🔇' : '🔊'; }
  function drawTok() { const t = App.member ? App.member.tokens() : 0, h = $('#sl-tok'); h.innerHTML = t > 0 ? `<label class="switch"><input type="checkbox" id="sl-usetok" ${S.useTok !== false ? 'checked' : ''}><span>Use member free spins (<b>${t}</b> left · min bet, no wager)</span></label>` : ''; const c = h.querySelector('#sl-usetok'); if (c) c.onchange = () => S.useTok = c.checked; }
  function updBet() { if (S) $('#sl-tb').textContent = UI.money(S.stepper.get()); }
  function cellHTML(T, s, ri, r) { const v = s === T.coin && S.coinVals[ri * 3 + r]; return `<div class="cell" data-s="${s}">${sym(T, s)}${v ? `<span class="coin-v">${v}×</span>` : ''}</div>`; }
  function setStrip(i, syms) { const st = S.el.querySelector(`.reel[data-i="${i}"] .strip`); st.style.transition = 'none'; st.style.transform = 'none'; st.innerHTML = syms.map((s, r) => cellHTML(S.T, s, i, r)).join(''); }
  function animate(raw) {
    const T = S.T, fast = App.state.reduceMotion, jobs = [];
    const fill = Object.keys(T.counts[0]);
    raw.forEach((col, i) => {
      const reel = S.el.querySelector(`.reel[data-i="${i}"]`), st = reel.querySelector('.strip');
      const h = reel.clientHeight / 3, n = 12 + i * 4;
      const list = col.map((s, r) => cellHTML(T, s, i, r)).concat(Array.from({ length: n }, () => `<div class="cell">${sym(T, fill[R(fill.length)])}</div>`), S.raw[i].map(s => `<div class="cell">${sym(T, s)}</div>`));
      st.style.transition = 'none'; st.innerHTML = list.join(''); st.style.transform = `translateY(${-(list.length - 3) * h}px)`; void st.offsetWidth;
      const dur = fast ? 60 : 800 + i * 260; reel.classList.add('spinning');
      st.style.transition = `transform ${dur}ms cubic-bezier(.12,.72,.18,1)`; st.style.transform = 'translateY(0px)';
      jobs.push(new Promise(res => setTimeout(() => { reel.classList.remove('spinning'); setStrip(i, col); Snd.stop(); res(); }, dur + 40)));
    });
    S.raw = raw; return Promise.all(jobs);
  }
  const cellAt = (ri, r) => S.el.querySelectorAll(`.reel[data-i="${ri}"] .cell`)[r];
  async function expandWilds(raw) {
    const T = S.T; if (!T.expanding) return;
    let any = false;
    T.wildReels.forEach(ri => { if (raw[ri].some(s => M.isWild(T, s))) { any = true; const reel = S.el.querySelector(`.reel[data-i="${ri}"]`); reel.classList.add('expanding'); setStrip(ri, [T.wild, T.wild, T.wild]); } });
    if (any) { Snd.chime(4); await UI.sleep(600); }
  }
  function highlight(ev) {
    const T = S.T; S.el.querySelectorAll('.cell.win,.cell.dim').forEach(c => c.classList.remove('win', 'dim'));
    const on = new Set();
    ev.wins.forEach(w => { const ln = T.lines[w.line]; for (let ri = 0; ri < w.count; ri++) on.add(ri + ':' + ln[ri]); });
    if (ev.scatters >= 3) ev.scatterPos.forEach(p => on.add(p[0] + ':' + p[1]));
    if (ev.hold) ev.coinPos.forEach(p => on.add(p[0] + ':' + p[1]));
    if (!on.size) return;
    for (let ri = 0; ri < T.reels; ri++) for (let r = 0; r < 3; r++) { const c = cellAt(ri, r); if (c) c.classList.add(on.has(ri + ':' + r) ? 'win' : 'dim'); }
  }
  async function oneSpin(bet, mult) {
    const T = S.T; let raw;
    if (forced) { raw = forced; forced = null; } else raw = M.rawGridAt(T, M.spinStops(T, R));
    S.coinVals = {}; if (T.coin) raw.forEach((col, ri) => col.forEach((s, r) => { if (s === T.coin) S.coinVals[ri * 3 + r] = M.coinValue(T.bonus, R); }));
    S.el.querySelectorAll('.reel.expanding').forEach(r => r.classList.remove('expanding'));
    await animate(raw); if (!S || !S.alive) return null;
    await expandWilds(raw); if (!S || !S.alive) return null;
    const grid = T.expanding ? raw.map((col, ri) => T.wildReels.includes(ri) && col.some(s => M.isWild(T, s)) ? [T.wild, T.wild, T.wild] : col) : raw;
    const ev = M.evaluate(T, grid);
    const win = r2((ev.lineMult * bet / T.lines.length + ev.scatterMult * bet) * mult);
    highlight(ev); return { ev, win };
  }
  function lock(on) { S.busy = on; App.setBusy(on); S.stepper.setDisabled(on); $('#sl-spin').disabled = on; }
  async function spin() {
    if (!S || S.busy) return;
    const T = S.T; let bet = S.stepper.get(), token = false;
    if (S.useTok !== false && App.member && App.member.tokens() > 0 && App.state.cur === 'GC') { token = App.member.useToken(); if (token) bet = UI.LEVELS.GC[0]; }
    if (!token) { const r = App.wallet.spend(bet, { hand: true, game: T.id }); if (!r.ok) { App.toast(r.reason, 'warn'); return; } }
    drawTok(); lock(true); Snd.ac();
    UI.msg($('#sl-status'), token ? 'Member free spin…' : 'Spinning…', ''); $('#sl-lw').textContent = '0';
    const out = await oneSpin(bet, 1); if (!out) return;
    let total = out.win; if (out.win > 0) App.wallet.credit(out.win);
    report(out, 1); if (out.win > 0) { Snd.chime(3); await countUp($('#sl-lw'), 0, out.win, 600); }
    const ev = out.ev, B = T.bonus;
    if (ev.freeSpins) { await UI.sleep(800); if (!S || !S.alive) return; total += await freeSpins(bet, ev.freeSpins); }
    if (ev.pick && S && S.alive) { await UI.sleep(700); if (!S || !S.alive) return; total += await pickem(bet, ev.pick); }
    if (ev.wheel && S && S.alive) { await UI.sleep(700); if (!S || !S.alive) return; total += await wheel(bet, ev.wheel); }
    if (ev.hold && S && S.alive) { await UI.sleep(700); if (!S || !S.alive) return; total += await holdSpin(bet, ev); }
    if (!S || !S.alive) return;
    total = r2(total); $('#sl-lw').textContent = UI.money(total);
    if (total >= bet * 10) await celebrate(total, bet);
    if (!S || !S.alive) return;
    if (ev.freeSpins || ev.pick || ev.wheel || ev.hold) UI.msg($('#sl-status'), `Round total <b>${UI.coinIcon()}${UI.money(total)}</b> (${(total / bet).toFixed(1)}× bet)`, total > 0 ? 'win' : 'lose');
    lock(false); drawTok();
  }
  function report(out, mult) {
    const T = S.T, ev = out.ev, tags = [];
    if (ev.freeSpins) tags.push('FREE SPINS!'); if (ev.pick) tags.push('PICK BONUS!'); if (ev.wheel) tags.push(T.bonus.label.toUpperCase() + '!'); if (ev.hold) tags.push('HOLD & SPIN!');
    if (out.win > 0) {
      const best = ev.wins.slice().sort((a, b) => b.pay - a.pay)[0], bits = [];
      if (ev.wins.length) bits.push(`${ev.wins.length} line${ev.wins.length > 1 ? 's' : ''}${best ? ` (best: ${best.count}× ${T.syms[best.sym]}${best.mult > 1 ? ' ×' + best.mult : ''})` : ''}`);
      if (ev.scatterMult) bits.push(`${ev.scatters} ${T.syms[T.scatter]}`);
      UI.msg($('#sl-status'), `<b>WIN ${UI.coinIcon()}${UI.money(out.win)}</b> — ${bits.join(' + ')}${mult > 1 ? ' · ×' + mult : ''}${tags.length ? ' · <b>' + tags.join(' ') + '</b>' : ''}`, 'win');
    } else UI.msg($('#sl-status'), tags.length ? '<b>' + tags.join(' ') + '</b>' : 'No win this spin.', tags.length ? 'win' : 'lose');
  }
  function countUp(elm, from, to, ms) {
    return new Promise(res => {
      if (App.state.reduceMotion) { elm.textContent = UI.money(to); return res(); }
      const t0 = performance.now(); let lt = 0;
      const step = now => { if (!S || !S.alive) return res(); const p = Math.min(1, (now - t0) / ms); elm.textContent = UI.money(r2(from + (to - from) * (1 - Math.pow(1 - p, 3)))); if (now - lt > 70 && p < 1) { Snd.tick(); lt = now; } if (p < 1) requestAnimationFrame(step); else res(); };
      requestAnimationFrame(step);
    });
  }
  const bonusHost = cls => { const h = $('#sl-bonus'); h.className = 'jam-bonus vx-bonus ' + cls; return h; };
  const closeBonus = () => { const h = $('#sl-bonus'); if (h) { h.className = 'jam-bonus vx-bonus hidden'; h.innerHTML = ''; } };

  /* ---- free spins ---- */
  async function freeSpins(bet, n) {
    const T = S.T, B = T.bonus, fs = $('#sl-fs'); let total = 0;
    fs.classList.remove('hidden'); Snd.fan(1); S.el.querySelector('.slot-machine').classList.add('in-fs');
    const draw = i => fs.innerHTML = `<b>${B.label.toUpperCase()}</b> <span>${i} / ${n}</span> <span>×${B.mult}</span> <span>${UI.coinIcon()}${UI.money(total)}</span>`;
    for (let i = 1; i <= n; i++) {
      draw(i); await UI.sleep(i === 1 ? 700 : 280);
      const out = await oneSpin(bet, B.mult); if (!out) return total;
      if (out.win > 0) { App.wallet.credit(out.win); total = r2(total + out.win); Snd.chime(3); }
      report(out, B.mult); draw(i); await UI.sleep(out.win > 0 ? 900 : 350);
    }
    UI.msg($('#sl-status'), `${B.label} complete — ${UI.coinIcon()}${UI.money(total)}!`, total > 0 ? 'win' : 'lose');
    await UI.sleep(900); if (S && S.alive) { fs.classList.add('hidden'); S.el.querySelector('.slot-machine').classList.remove('in-fs'); }
    return total;
  }
  /* ---- pick-em ---- */
  function pickem(bet, tmult) {
    return new Promise(resolve => {
      const T = S.T, B = T.bonus, tiles = M.pickBoard(B, R), host = bonusHost('vx-pick'); let sum = 0, mult = 1, done = false, timer = null;
      host.innerHTML = `<div class="jb-head"><b>${B.label.toUpperCase()}</b><span>Blast rocks for gold until a CAVE-IN${tmult > 1 ? ` · bonus ×${tmult}` : ''}</span></div>
        <div class="vault-grid">${tiles.map((_, i) => `<button class="vt" data-i="${i}" aria-label="Rock ${i + 1}">${sym(T, T.scatter)}</button>`).join('')}</div>
        <div class="jb-foot"><span>Haul: <b id="vt-sum">${UI.coinIcon()}0</b> <i id="vt-m"></i></span><button class="btn btn-ghost btn-sm" id="vt-auto">Auto-pick</button></div>`;
      Snd.fan(1);
      const show = (b, t, cls) => { b.classList.add('open', cls); b.disabled = true; b.innerHTML = t.t === 'C' ? '<span class="vt-c">CAVE-IN</span>' : t.t === 'X' ? `<span class="vt-x">×${B.mult}</span>` : `<span class="vt-p">${sym(T, T.top)}${UI.money(r2(t.v * bet * tmult))}</span>`; };
      const finish = async () => {
        done = true; clearInterval(timer);
        host.querySelectorAll('.vt:not(.open)').forEach(b => show(b, tiles[+b.dataset.i], 'unpicked'));
        const won = r2(sum * mult * tmult * bet); if (won > 0) App.wallet.credit(won);
        host.querySelector('.jb-head').innerHTML = `<b>HAUL COLLECTED</b><span>${UI.coinIcon()}${UI.money(won)} (${sum}×${mult > 1 ? ' ×' + mult : ''}${tmult > 1 ? ' ×' + tmult : ''} bet)</span>`;
        Snd.chime(5); await UI.sleep(1700); closeBonus(); resolve(won);
      };
      const pick = i => {
        if (done || !S || !S.alive) return; const b = host.querySelector(`.vt[data-i="${i}"]`); if (!b || b.disabled) return;
        const t = tiles[i]; show(b, t, 'picked');
        if (t.t === 'C') { Snd.stop(); finish(); return; }
        if (t.t === 'X') { mult = B.mult; host.querySelector('#vt-m').textContent = '×' + mult; Snd.chime(5); } else { sum += t.v; Snd.chime(2); }
        host.querySelector('#vt-sum').innerHTML = `${UI.coinIcon()}${UI.money(r2(sum * bet * tmult))}`;
      };
      host.querySelectorAll('.vt').forEach(b => b.onclick = () => pick(+b.dataset.i));
      host.querySelector('#vt-auto').onclick = () => { if (timer) return; timer = setInterval(() => { const c = host.querySelectorAll('.vt:not(.open)'); if (!c.length || done) return clearInterval(timer); pick(+c[R(c.length)].dataset.i); }, App.state.reduceMotion ? 60 : 420); };
      S.pick = pick; S.pickTiles = tiles;
    });
  }
  /* ---- wheel ---- */
  function wheelSVG(T) {
    const segs = T.bonus.segs, n = segs.length, c = T.colors, cols = [c.bg1, c.glow, '#111', c.reel];
    let o = '';
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * 2 * Math.PI - Math.PI / 2 - Math.PI / n, a1 = a0 + 2 * Math.PI / n, p = a => `${100 + 92 * Math.cos(a)},${100 + 92 * Math.sin(a)}`;
      const am = (a0 + a1) / 2, tx = 100 + 64 * Math.cos(am), ty = 100 + 64 * Math.sin(am);
      o += `<path d="M100,100 L${p(a0)} A92,92 0 0 1 ${p(a1)} Z" fill="${cols[i % cols.length]}" stroke="${c.accent}" stroke-width="1.5"/><text x="${tx}" y="${ty}" transform="rotate(${am * 180 / Math.PI + 90} ${tx} ${ty})" text-anchor="middle" dominant-baseline="middle" font-weight="900" font-size="${segs[i] >= 50 ? 17 : 14}" fill="#fff8d8" font-family="Georgia,serif">${segs[i]}×</text>`;
    }
    return `<svg viewBox="0 0 200 200" class="wheel-svg"><circle cx="100" cy="100" r="97" fill="url(#vxGold)"/>${o}<circle cx="100" cy="100" r="20" fill="url(#vxGold)"/><g transform="translate(86 86) scale(.44)">${UI.SYMS[sk(T, T.scatter)]}</g></svg>`;
  }
  function wheel(bet, tmult) {
    return new Promise(resolve => {
      const T = S.T, B = T.bonus, idx = R(B.segs.length), n = B.segs.length, host = bonusHost('wheel');
      host.innerHTML = `<div class="jb-head"><b>${B.label.toUpperCase()}</b><span>Spin for a prize${tmult > 1 ? ` — all prizes ×${tmult}` : ''}!</span></div>
        <div class="wheel-wrap"><div class="wheel-box"><div class="wheel-ptr"></div><div class="wheel-rot" id="wh-rot">${wheelSVG(T)}</div></div></div><div class="jb-foot"><button class="btn btn-gold" id="wh-go">SPIN THE WHEEL</button></div>`;
      Snd.fan(1); let started = false;
      const go = async () => {
        if (started) return; started = true; const btn = host.querySelector('#wh-go'); btn.disabled = true;
        const rot = host.querySelector('#wh-rot'), dur = App.state.reduceMotion ? 50 : 4000;
        rot.style.transition = `transform ${dur}ms cubic-bezier(.15,.8,.15,1)`; rot.style.transform = `rotate(${360 * 6 - idx * (360 / n)}deg)`;
        const tk = setInterval(() => Snd.tick(), 90); setTimeout(() => clearInterval(tk), dur * .7);
        await UI.sleep(dur + 150);
        const won = r2(B.segs[idx] * tmult * bet); App.wallet.credit(won); Snd.chime(5);
        host.querySelector('.jb-head').innerHTML = `<b>${B.label.toUpperCase()}</b><span>Landed on <b>${B.segs[idx]}×${tmult > 1 ? ' ×' + tmult : ''}</b> — ${UI.coinIcon()}${UI.money(won)}</span>`;
        btn.textContent = 'Collected'; host.querySelector('.wheel-wrap').classList.add('landed');
        await UI.sleep(1700); closeBonus(); resolve(won);
      };
      host.querySelector('#wh-go').onclick = go; S.wheelGo = go;
    });
  }
  /* ---- hold & spin ---- */
  async function holdSpin(bet, ev) {
    const T = S.T, B = T.bonus, host = bonusHost('vx-hold');
    const cells = new Array(15).fill(null); ev.coinPos.forEach(([ri, r]) => { cells[ri * 3 + r] = S.coinVals[ri * 3 + r] || M.coinValue(B, R); });
    const lab = v => B.named[v] || (v + '×');
    const draw = (left, fresh) => {
      host.innerHTML = `<div class="jb-head"><b>${B.label.toUpperCase()}</b><span>Respins left: <b class="hs-left">${left}</b> · fill all 15 for GRAND ${B.grand}×</span></div>
      <div class="hs-grid">${[0, 1, 2].map(r => [0, 1, 2, 3, 4].map(ri => { const i = ri * 3 + r, v = cells[i]; return `<div class="hs-c ${v ? 'on' : ''} ${fresh && fresh.includes(i) ? 'new' : ''}">${v ? sym(T, T.coin) + `<span class="coin-v ${B.named[v] ? 'named' : ''}">${lab(v)}</span>` : ''}</div>`; }).join('')).join('')}</div>
      <div class="jb-foot"><span>Total: <b>${UI.coinIcon()}${UI.money(r2(cells.reduce((a, c) => a + (c || 0), 0) * bet))}</b></span><span>${cells.filter(Boolean).length}/15</span></div>`;
    };
    let left = B.respins; draw(left); Snd.fan(1); await UI.sleep(1200);
    while (left > 0 && cells.some(c => c === null)) {
      if (!S || !S.alive) return 0;
      const add = []; cells.forEach((c, i) => { if (c === null && rnd01() < B.pNew) add.push(i); });
      add.forEach(i => cells[i] = M.coinValue(B, R));
      left = add.length ? B.respins : left - 1; draw(left, add); if (add.length) Snd.chime(3); else Snd.stop();
      await UI.sleep(add.length ? 900 : 650);
    }
    const full = cells.every(Boolean), won = r2((cells.reduce((a, c) => a + (c || 0), 0) + (full ? B.grand : 0)) * bet);
    App.wallet.credit(won);
    host.querySelector('.jb-head').innerHTML = `<b>${full ? 'GRAND!' : 'TREASURE COLLECTED'}</b><span>${UI.coinIcon()}${UI.money(won)} (${(won / bet).toFixed(0)}× bet)</span>`;
    Snd.chime(5); await UI.sleep(1800); closeBonus(); return won;
  }
  /* ---- themed tiered celebration ---- */
  function celebrate(total, bet) {
    const T = S.T, x = total / bet, k = x >= 50 ? 'epic' : x >= 25 ? 'mega' : x >= 10 ? 'big' : null; if (!k) return Promise.resolve();
    const lvl = { big: 1, mega: 2, epic: 3 }[k], ms = { big: 3200, mega: 4600, epic: 6200 }[k];
    return new Promise(resolve => {
      const ov = document.createElement('div'); ov.className = `jam-cel vx-cel ${k} th-${T.id}`; ov.setAttribute('style', vars(T)); ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', T.cel[k]);
      ov.innerHTML = `<canvas></canvas><div class="cel-rays"></div><div class="cel-box"><div class="cel-sub">${k === 'epic' ? 'EPIC WIN' : T.name.toUpperCase()}</div><div class="cel-title">${T.cel[k]}</div><div class="cel-amt">${UI.coinIcon()}<span class="cel-n">0</span></div><div class="cel-x">${x.toFixed(1)}× bet</div><div class="cel-skip">Tap to skip</div></div>`;
      document.body.appendChild(ov);
      const host = document.querySelector('#app'); if (!App.state.reduceMotion) host.classList.add('jam-shake-' + lvl);
      Snd.fan(lvl + 1);
      const cv = ov.querySelector('canvas'), ctx = cv.getContext('2d'), dpr = Math.min(2, window.devicePixelRatio || 1), W = cv.width = innerWidth * dpr, H = cv.height = innerHeight * dpr;
      const defs = (window.SlotArt ? window.SlotArt.defs() : '') + (document.querySelector('svg defs') ? document.querySelector('svg defs').innerHTML : '');
      const imgs = [T.top, T.scatter || T.coin || T.wild, Object.keys(T.pay)[1]].map(s => { const im = new Image(); im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs>${defs}</defs>${UI.SYMS[sk(T, s)]}</svg>`); return im; });
      const P = [], rate = [0, .3, .6, 1.1][lvl];
      const spawn = () => P.push({ x: Math.random() * W, y: -40 * dpr, vx: (Math.random() - .5) * 3 * dpr, vy: (2 + Math.random() * 4) * dpr, r: (14 + Math.random() * 16) * dpr, a: Math.random() * 6, va: (Math.random() - .5) * .2, im: Math.random() < .6 ? imgs[(Math.random() * 3) | 0] : null });
      for (let i = 0; i < 16 * lvl; i++) { const a = Math.random() * Math.PI * 2, v = (4 + Math.random() * 8) * dpr; P.push({ x: W / 2, y: H * .42, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 4 * dpr, r: (8 + Math.random() * 10) * dpr, a: 0, va: .2, im: Math.random() < .5 ? imgs[0] : null }); }
      let raf = 0, alive = true, skipped = false, lt = 0; const t0 = performance.now(), dur = App.state.reduceMotion ? 900 : ms, amt = ov.querySelector('.cel-n'), acc = T.colors.accent;
      const frame = now => {
        if (!alive) return; const p = Math.min(1, (now - t0) / (dur * .7));
        amt.textContent = UI.money(skipped ? total : r2(total * (1 - Math.pow(1 - p, 2.2)))); if (now - lt > 60 && p < 1 && !skipped) { Snd.tick(); lt = now; }
        if (!App.state.reduceMotion) { let q = rate; while (q >= 1) { spawn(); q--; } if (Math.random() < q) spawn(); }
        ctx.clearRect(0, 0, W, H);
        for (let i = P.length - 1; i >= 0; i--) { const q = P[i]; q.vy += .18 * dpr; q.x += q.vx; q.y += q.vy; q.a += q.va; if (q.y > H + 60 * dpr || P.length > 260) { P.splice(i, 1); continue; }
          ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.a);
          if (q.im && q.im.complete) ctx.drawImage(q.im, -q.r, -q.r, q.r * 2, q.r * 2); else { ctx.fillStyle = acc; ctx.beginPath(); ctx.ellipse(0, 0, q.r * .6 * Math.abs(Math.cos(q.a * 2)) + 1, q.r * .6, 0, 0, Math.PI * 2); ctx.fill(); }
          ctx.restore(); }
        if (now - t0 > dur) return end(); raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
      const end = () => { if (!alive) return; alive = false; cancelAnimationFrame(raf); host.classList.remove('jam-shake-1', 'jam-shake-2', 'jam-shake-3'); ov.classList.add('out'); setTimeout(() => ov.remove(), 250); if (S) S.cel = null; resolve(); };
      ov.addEventListener('click', () => { if (!skipped) { skipped = true; amt.textContent = UI.money(total); setTimeout(end, 450); } else end(); });
      S.cel = { kill: end, skip: () => ov.click() };
    });
  }
  /* ---- debug hook (only with ?debug=1) ---- */
  if (DEBUG) window.VX = {
    force(g) { forced = g; }, spin() { return spin(); }, state() { return S && { busy: S.busy, id: S.T.id }; },
    celebrate(m) { const b = S.stepper.get(); return celebrate(r2(b * m), b); }, skip() { if (S && S.cel) S.cel.skip(); },
    pick(i) { if (S && S.pick) S.pick(i); }, pickTiles() { return S && S.pickTiles; }, wheelGo() { if (S && S.wheelGo) S.wheelGo(); },
    grid(id, kind) { // build a raw grid that triggers the theme's bonus / a line win
      const T = M.byId[id], filler = Object.keys(T.pay).slice(-3), g = Array.from({ length: T.reels }, (_, ri) => [0, 1, 2].map(r => filler[(ri + r) % 3]));
      if (kind === 'bonus') { if (T.coin) [[0, 0], [1, 1], [2, 2], [3, 0], [4, 1], [2, 0], [0, 2]].forEach(([a, b]) => g[a][b] = T.coin); else if (T.scatter) [0, 2, 4].slice(0, T.reels === 3 ? 3 : 3).forEach((ri, i) => g[Math.min(ri, T.reels - 1 - (T.reels === 3 ? 2 - i : 0))][1] = T.scatter); }
      if (kind === 'bonus' && T.reels === 3 && T.scatter) { g[0][1] = g[1][1] = g[2][1] = T.scatter; }
      if (kind === 'win') { for (let ri = 0; ri < T.reels; ri++) g[ri][1] = ri === 1 && T.wildReels.includes(1) ? (T.wilds ? Object.keys(T.wilds)[1] : T.wild) : T.top; }
      return g;
    }
  };
})();
