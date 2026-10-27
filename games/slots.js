/* Jewels A Million — 5x3, 10 lines, gem symbols, tiered win celebrations, 3 bonus games. Virtual coins only. */
(function () {
  'use strict';
  const C = window.Core, UI = window.UI, SL = C.SLOT;
  let S = null, forced = null;
  const FILL = ['RUBY', 'SAPH', 'EMER', 'DIAM', 'BLACK', 'RUBY', 'SAPH', 'EMER', 'WILD', 'SCAT'];
  const NAMES = { RUBY: 'Ruby', SAPH: 'Sapphire', EMER: 'Emerald', DIAM: 'Diamond', BLACK: 'Black Diamond', WILD: 'Wild', SCAT: 'Bonus' };
  const RTP = (SL.rtpPublished * 100).toFixed(2) + '%';
  const TIER = [{ x: 50, k: 'epic', t: 'JEWELS A MILLION!', sub: 'EPIC WIN', ms: 6500 }, { x: 25, k: 'mega', t: 'MEGA WIN', sub: '', ms: 4800 }, { x: 10, k: 'big', t: 'BIG WIN', sub: '', ms: 3400 }];

  /* ---------- synthesized audio (WebAudio, optional, mute toggle) ---------- */
  const Snd = {
    ctx: null, muted: localStorage.getItem('jam-mute') === '1',
    ac() { if (this.muted) return null; try { if (!this.ctx) { const A = window.AudioContext || window.webkitAudioContext; if (!A) return null; this.ctx = new A(); } if (this.ctx.state === 'suspended') this.ctx.resume(); return this.ctx; } catch (e) { return null; } },
    tone(f, t0, dur, type, vol) { const a = this.ac(); if (!a) return; const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + (t0 || 0); o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.12, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.05); },
    stop() { this.tone(180, 0, 0.08, 'triangle', 0.08); },
    chime(n) { [784, 988, 1175, 1568, 1976].slice(0, n || 3).forEach((f, i) => this.tone(f, i * 0.07, 0.35, 'sine', 0.09)); },
    fanfare(level) { const seq = [523, 659, 784, 1047, 1319, 1568, 2093]; const n = 3 + level * 2; for (let i = 0; i < n; i++) { this.tone(seq[i % seq.length] * (i >= 7 ? 2 : 1), i * 0.11, 0.5, 'square', 0.05); this.tone(seq[i % seq.length] / 2, i * 0.11, 0.4, 'triangle', 0.06); } },
    tick() { this.tone(1400 + Math.random() * 600, 0, 0.04, 'square', 0.025); },
    toggle() { this.muted = !this.muted; localStorage.setItem('jam-mute', this.muted ? '1' : '0'); if (this.muted && this.ctx) this.ctx.suspend(); }
  };

  App.register({
    id: 'slots', name: 'Jewels A Million', tagline: '5 reels · 10 lines · Free Spins, Vault Pick & Jewel Wheel bonuses.',
    rtpShort: 'RTP ' + RTP + ' (exact)',
    art() { return `<div class="slot-art jam-art">${UI.sym('RUBY')}${UI.sym('BLACK')}${UI.sym('SAPH')}<span class="jam-logo">Jewels<br><b>A Million</b></span></div>`; },
    info() {
      const r = SL.rtpPublished;
      return `<p><b>Jewels A Million</b> — 5 reels × 3 rows, <b>10 fixed paylines</b>. Wins pay left to right from reel 1, 3+ of a kind. Gems from lowest to highest: Ruby, Sapphire, Emerald, Diamond, <b>Black Diamond</b> (top premium). <b>WILD</b> (reels 2–4) substitutes for every gem.</p>
      <h4>Bonus triggers</h4>
      <ul class="jam-trig">
        <li>${UI.sym('SCAT')}<span><b>Free Spins</b>: 3 / 4 / 5 BONUS anywhere → ${SL.freeSpinsBy[3]} / ${SL.freeSpinsBy[4]} / ${SL.freeSpinsBy[5]} free spins, all wins <b>×${SL.freeMult}</b>. Scatter also pays ${SL.scatterPay[3]}× / ${SL.scatterPay[4]}× / ${SL.scatterPay[5]}× total bet. No re-triggers; Vault & Wheel don't trigger during free spins.</span></li>
        <li>${UI.sym('BLACK')}<span><b>Vault Pick</b>: 3+ Black Diamonds on a payline (wilds count). Pick from ${SL.vault.prizes.length + 1 + SL.vault.collects} hidden tiles: coin prizes (${Math.min(...SL.vault.prizes)}–${Math.max(...SL.vault.prizes)}× bet) and one <b>×${SL.vault.mult}</b> multiplier, until you hit one of ${SL.vault.collects} COLLECT tiles. Average ${C.vaultEV().toFixed(2)}× bet.</span></li>
        <li>${UI.sym('DIAM')}<span><b>Jewel Wheel</b>: 5 of a kind of any gem on a payline (wilds count), or a <b>Rainbow</b> line: Ruby → Sapphire → Emerald → Diamond → Black Diamond on reels 1–5. Wheel of ${SL.wheel.length} equal segments: ${SL.wheel.join(', ')}× bet (avg ${C.wheelEV().toFixed(2)}×).</span></li>
      </ul>
      <h4>Win celebrations</h4><p class="fine">Any win: glow + count-up. ≥10× bet: <b>Big Win</b>. ≥25×: <b>Mega Win</b>. ≥50×: <b>Epic — Jewels A Million!</b> Tap to skip.</p>
      ${UI.infoRows([['Theoretical RTP', `<b>${RTP}</b> — exact, by enumerating all ${SL.strips.map(s => s.length).join('×')} = ${SL.strips.reduce((a, s) => a * s.length, 1).toLocaleString()} reel-stop combinations, with bonus EVs computed in closed form`],
        ['RTP breakdown', 'Line wins 56.11% · Scatter pays 1.45% · Free spins 8.48% · Vault Pick 12.39% · Jewel Wheel 17.75%'],
        ['Cross-check', '10,000,000-round simulation of full play incl. bonuses: 96.07% (95% CI 95.82–96.32%)'],
        ['House edge', (100 - r * 100).toFixed(2) + '%'], ['Hit frequency', '≈40.4% of paid spins return a line or scatter win'],
        ['Bonus frequency', 'Free Spins ≈1 in 167 · Vault Pick ≈1 in 105 · Jewel Wheel ≈1 in 39'],
        ['Celebration frequency (sim)', 'Big ≈1 in 58 · Mega ≈1 in 190 · Epic ≈1 in 810 rounds'],
        ['Volatility', 'Medium–high'], ['Top line prize', `${SL.pay.BLACK[2]}× line bet for 5 Black Diamonds (×${SL.freeMult} in free spins)`],
        ['RNG', 'crypto.getRandomValues picks every reel stop, tile shuffle and wheel segment']])}
      <p class="fine">Line wins are multiples of the <i>line bet</i> (total bet ÷ 10); scatter and bonus prizes are multiples of the total bet. Vault picks are face-down pre-shuffled tiles, so pick choice does not change the odds.</p>${UI.DEMO_NOTE}`;
    },
    mount(el) {
      S = { alive: true, el, busy: false, grid: C.slotGridAt(SL.strips.map(s => C.randInt(s.length))) };
      el.innerHTML = `
        <div class="slot-machine jam">
          <div class="jam-title"><span>Jewels</span> <b>A Million</b><button class="jam-mute" id="sl-mute" aria-label="Toggle sound"></button></div>
          <div class="fs-banner hidden" id="sl-fs"></div>
          <div class="reels" id="sl-reels">${[0, 1, 2, 3, 4].map(i => `<div class="reel" data-i="${i}"><div class="strip"></div></div>`).join('')}</div>
          <div class="slot-info"><div><small>LINES</small><b>10</b></div><div><small>TOTAL BET</small><b id="sl-tb">0</b></div><div><small>WIN</small><b id="sl-lw">0</b></div></div>
          <div class="status" id="sl-status">Press SPIN. Match 3+ gems from the left.</div>
          <div class="jam-bonus hidden" id="sl-bonus"></div>
        </div>
        <div class="controls">
          <div id="sl-bet"></div>
          <div class="btn-row"><button class="btn btn-ghost" id="sl-pay">Paytable</button><button class="btn btn-gold btn-lg" id="sl-spin">SPIN</button></div>
        </div>`;
      S.stepper = UI.betStepper(el.querySelector('#sl-bet'), { key: 'slots', label: 'TOTAL BET', defIdx: 1, onChange: updBet });
      for (let i = 0; i < 5; i++) setStrip(i, S.grid[i]);
      updBet(); drawMute();
      el.querySelector('#sl-spin').onclick = () => spin();
      el.querySelector('#sl-mute').onclick = () => { Snd.toggle(); drawMute(); };
      el.querySelector('#sl-pay').onclick = () => App.modal({ title: 'Paytable — Jewels A Million', html: payHTML() });
      S.key = e => { if (e.code === 'Space' && !/INPUT|BUTTON|SELECT/.test((e.target || {}).tagName || '')) { e.preventDefault(); spin(); } };
      window.addEventListener('keydown', S.key);
    },
    unmount() { if (S) { S.alive = false; window.removeEventListener('keydown', S.key); if (S.cel) S.cel.kill(); } App.setBusy(false); }
  });

  const $ = s => S.el.querySelector(s);
  const cell = s => `<div class="cell" data-s="${s}">${UI.sym(s)}</div>`;
  function drawMute() { const b = $('#sl-mute'); b.textContent = Snd.muted ? '🔇' : '🔊'; b.title = Snd.muted ? 'Sound off' : 'Sound on'; }
  function setStrip(i, syms) { const st = S.el.querySelector(`.reel[data-i="${i}"] .strip`); st.style.transition = 'none'; st.style.transform = 'none'; st.innerHTML = syms.map(cell).join(''); }
  function updBet() { if (S) $('#sl-tb').textContent = UI.money(S.stepper.get()); }
  const r2 = x => Math.round(x * 100) / 100;

  function payHTML() {
    const rows = ['BLACK', 'DIAM', 'EMER', 'SAPH', 'RUBY'].map(s => `<tr><td class="ps">${UI.sym(s)}<small>${NAMES[s]}</small></td><td>${SL.pay[s][0]}×</td><td>${SL.pay[s][1]}×</td><td>${SL.pay[s][2]}×</td></tr>`).join('');
    const lines = SL.lines.map((l, i) => `<div class="pl"><small>${i + 1}</small><div class="plg">${[0, 1, 2].map(r => [0, 1, 2, 3, 4].map(c => `<i class="${l[c] === r ? 'on' : ''}"></i>`).join('')).join('')}</div></div>`).join('');
    return `<table class="info-table paytab"><tr><th></th><th>3</th><th>4</th><th>5</th></tr>${rows}</table>
      <p class="fine">Multiples of the <b>line bet</b> (total bet ÷ 10). 5 of a kind of any gem also triggers the <b>Jewel Wheel</b>; 3+ Black Diamonds trigger the <b>Vault Pick</b>.</p>
      <div class="special"><div>${UI.sym('WILD')}<p><b>WILD</b> on reels 2–4 substitutes for all gems (not BONUS). A line of WILDs pays as Black Diamonds.</p></div>
      <div>${UI.sym('SCAT')}<p><b>BONUS</b> anywhere: 3 = ${SL.scatterPay[3]}×, 4 = ${SL.scatterPay[4]}×, 5 = ${SL.scatterPay[5]}× <b>total bet</b> + ${SL.freeSpinsBy[3]}/${SL.freeSpinsBy[4]}/${SL.freeSpinsBy[5]} Free Spins at ×${SL.freeMult}.</p></div>
      <div><span class="jam-rainbow">${['RUBY', 'SAPH', 'EMER', 'DIAM', 'BLACK'].map(UI.sym).join('')}</span><p><b>Rainbow line</b> (in this order, reels 1→5) → Jewel Wheel.</p></div></div>
      <h4>Paylines</h4><div class="plines">${lines}</div>
      <p class="fine">Theoretical RTP ${RTP} (exact enumeration incl. bonuses).</p>`;
  }

  function animate(grid) {
    const fast = App.state.reduceMotion, jobs = [];
    for (let i = 0; i < 5; i++) {
      const reel = S.el.querySelector(`.reel[data-i="${i}"]`), st = reel.querySelector('.strip');
      const h = reel.clientHeight / 3, n = 14 + i * 5;
      const fill = Array.from({ length: n }, () => FILL[C.randInt(FILL.length)]);
      const list = grid[i].concat(fill, S.grid[i]);
      st.style.transition = 'none'; st.innerHTML = list.map(cell).join('');
      st.style.transform = `translateY(${-(list.length - 3) * h}px)`;
      void st.offsetWidth;
      const dur = fast ? 60 : 900 + i * 280;
      reel.classList.add('spinning');
      st.style.transition = `transform ${dur}ms cubic-bezier(.12,.72,.18,1)`;
      st.style.transform = 'translateY(0px)';
      jobs.push(new Promise(res => setTimeout(() => { reel.classList.remove('spinning'); setStrip(i, grid[i]); Snd.stop(); res(); }, dur + 40)));
    }
    S.grid = grid;
    return Promise.all(jobs);
  }
  function cellAt(ri, r) { return S.el.querySelectorAll(`.reel[data-i="${ri}"] .cell`)[r]; }
  function highlight(ev) {
    S.el.querySelectorAll('.cell.win,.cell.dim').forEach(c => c.classList.remove('win', 'dim'));
    const on = new Set();
    ev.wins.forEach(w => { const ln = SL.lines[w.line]; for (let ri = 0; ri < w.count; ri++) on.add(ri + ':' + ln[ri]); });
    if (ev.wheel) { const ln = SL.lines[ev.wheel.line]; for (let ri = 0; ri < 5; ri++) on.add(ri + ':' + ln[ri]); }
    if (ev.scatters >= 3) ev.scatterPos.forEach(p => on.add(p[0] + ':' + p[1]));
    if (!on.size) return;
    for (let ri = 0; ri < 5; ri++) for (let r = 0; r < 3; r++) { const c = cellAt(ri, r); if (c) c.classList.add(on.has(ri + ':' + r) ? 'win' : 'dim'); }
  }

  async function oneSpin(bet, mult) {
    let grid;
    if (forced) { grid = forced; forced = null; } else grid = C.slotSpin().grid;
    S.el.querySelectorAll('.cell.win,.cell.dim').forEach(c => c.classList.remove('win', 'dim'));
    await animate(grid);
    if (!S.alive) return null;
    const ev = C.slotEvaluate(grid);
    const win = r2((ev.lineMult * (bet / 10) + ev.scatterMult * bet) * mult);
    highlight(ev);
    return { ev, win };
  }

  function lock(on) { S.busy = on; App.setBusy(on); S.stepper.setDisabled(on); $('#sl-spin').disabled = on; }
  async function spin() {
    if (S.busy) return;
    const bet = S.stepper.get();
    const r = App.wallet.spend(bet, { hand: true });
    if (!r.ok) { App.toast(r.reason, 'warn'); return; }
    lock(true); Snd.ac();
    UI.msg($('#sl-status'), 'Spinning…', ''); $('#sl-lw').textContent = '0';
    const out = await oneSpin(bet, 1); if (!out) return;
    let total = out.win;
    if (out.win > 0) App.wallet.credit(out.win);
    report(out, 1);
    if (out.win > 0) { Snd.chime(out.win >= bet ? 4 : 2); await countUp($('#sl-lw'), 0, out.win, 700); }
    const ev = out.ev;
    if (ev.triggered) { await UI.sleep(900); if (!S.alive) return; total += await freeSpins(bet, ev.freeSpins); }
    if (ev.vault && S.alive) { await UI.sleep(700); if (!S.alive) return; total += await vaultPick(bet); }
    if (ev.wheel && S.alive) { await UI.sleep(700); if (!S.alive) return; total += await jewelWheel(bet, ev.wheel.why); }
    if (!S.alive) return;
    total = r2(total);
    $('#sl-lw').textContent = UI.money(total);
    if (total >= bet * 10) await celebrate(total, bet);
    if (!S.alive) return;
    if (ev.triggered || ev.vault || ev.wheel) UI.msg($('#sl-status'), `Round total <b>${UI.coinIcon()}${UI.money(total)}</b> (${(total / bet).toFixed(1)}× bet)`, total > 0 ? 'win' : 'lose');
    lock(false);
  }
  function report(out, mult) {
    const ev = out.ev, st = $('#sl-status');
    const tags = [];
    if (ev.triggered) tags.push('FREE SPINS!'); if (ev.vault) tags.push('VAULT PICK!'); if (ev.wheel) tags.push('JEWEL WHEEL! (' + ev.wheel.why + ')');
    if (out.win > 0) {
      const best = ev.wins.slice().sort((a, b) => b.mult - a.mult)[0];
      const bits = [];
      if (ev.wins.length) bits.push(`${ev.wins.length} line${ev.wins.length > 1 ? 's' : ''}${best ? ` (best: ${best.count}× ${NAMES[best.sym]})` : ''}`);
      if (ev.scatterMult) bits.push(`${ev.scatters} BONUS`);
      UI.msg(st, `<b>WIN ${UI.coinIcon()}${UI.money(out.win)}</b> — ${bits.join(' + ')}${mult > 1 ? ' · ×' + mult : ''}${tags.length ? ' · <b>' + tags.join(' ') + '</b>' : ''}`, 'win');
    } else UI.msg(st, tags.length ? '<b>' + tags.join(' ') + '</b>' : 'No win this spin.', tags.length ? 'win' : 'lose');
  }
  function countUp(elm, from, to, ms) {
    return new Promise(res => {
      if (App.state.reduceMotion || ms < 50) { elm.textContent = UI.money(to); return res(); }
      const t0 = performance.now(); let lastTick = 0;
      const step = now => {
        if (!S || !S.alive) return res();
        const p = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - p, 3);
        elm.textContent = UI.money(r2(from + (to - from) * e));
        if (now - lastTick > 70 && p < 1) { Snd.tick(); lastTick = now; }
        if (p < 1) requestAnimationFrame(step); else res();
      };
      requestAnimationFrame(step);
    });
  }

  /* ---------- Free spins ---------- */
  async function freeSpins(bet, n) {
    const fs = $('#sl-fs'); let total = 0;
    fs.classList.remove('hidden'); Snd.fanfare(1);
    const draw = i => fs.innerHTML = `<b>FREE SPINS</b> <span>${i} / ${n}</span> <span>×${SL.freeMult} wins</span> <span class="fs-total">Won ${UI.coinIcon()}${UI.money(total)}</span>`;
    for (let i = 1; i <= n; i++) {
      draw(i); UI.msg($('#sl-status'), 'Free spin ' + i + '…', '');
      await UI.sleep(i === 1 ? 700 : 300);
      const out = await oneSpin(bet, SL.freeMult); if (!out) return total;
      if (out.win > 0) { App.wallet.credit(out.win); total = r2(total + out.win); Snd.chime(3); }
      report(out, SL.freeMult); draw(i);
      await UI.sleep(out.win > 0 ? 1000 : 400);
    }
    UI.msg($('#sl-status'), `Free spins complete — ${UI.coinIcon()}${UI.money(total)}!`, total > 0 ? 'win' : 'lose');
    await UI.sleep(1000);
    if (S.alive) fs.classList.add('hidden');
    return total;
  }

  /* ---------- Vault Pick ---------- */
  function vaultPick(bet) {
    return new Promise(resolve => {
      const host = $('#sl-bonus'), tiles = C.vaultBoard(); let sum = 0, mult = 1, done = false, timer = null;
      host.className = 'jam-bonus vault';
      host.innerHTML = `<div class="jb-head"><b>VAULT PICK</b><span>Pick gems until you find COLLECT</span></div>
        <div class="vault-grid">${tiles.map((_, i) => `<button class="vt" data-i="${i}" aria-label="Vault tile ${i + 1}">${UI.sym('BLACK')}</button>`).join('')}</div>
        <div class="jb-foot"><span>Vault: <b id="vt-sum">${UI.coinIcon()}0</b> <i id="vt-m"></i></span><button class="btn btn-ghost btn-sm" id="vt-auto">Auto-pick</button></div>`;
      Snd.fanfare(1);
      const show = (b, t, cls) => { b.classList.add('open', cls || ''); b.disabled = true; b.innerHTML = t.t === 'C' ? '<span class="vt-c">COLLECT</span>' : t.t === 'X2' ? `<span class="vt-x">×${SL.vault.mult}</span>` : `<span class="vt-p">${UI.coinIcon()}${UI.money(r2(t.v * bet))}</span>`; };
      const finish = async () => {
        done = true; clearInterval(timer);
        host.querySelectorAll('.vt:not(.open)').forEach(b => show(b, tiles[+b.dataset.i], 'unpicked'));
        const won = r2(sum * mult * bet);
        if (won > 0) App.wallet.credit(won);
        host.querySelector('.jb-head').innerHTML = `<b>VAULT COLLECTED</b><span>${UI.coinIcon()}${UI.money(won)} (${sum}×${mult > 1 ? ' ×' + mult : ''} bet)</span>`;
        Snd.chime(5);
        await UI.sleep(1800);
        host.className = 'jam-bonus hidden'; host.innerHTML = '';
        resolve(won);
      };
      const pick = i => {
        if (done || !S.alive) return;
        const b = host.querySelector(`.vt[data-i="${i}"]`); if (!b || b.disabled) return;
        const t = tiles[i]; show(b, t, 'picked');
        if (t.t === 'C') { Snd.stop(); finish(); return; }
        if (t.t === 'X2') { mult = SL.vault.mult; host.querySelector('#vt-m').textContent = '×' + mult; Snd.chime(5); }
        else { sum += t.v; Snd.chime(2); }
        host.querySelector('#vt-sum').innerHTML = `${UI.coinIcon()}${UI.money(r2(sum * bet))}`;
      };
      host.querySelectorAll('.vt').forEach(b => b.onclick = () => pick(+b.dataset.i));
      host.querySelector('#vt-auto').onclick = () => { if (timer) return; timer = setInterval(() => { const c = host.querySelectorAll('.vt:not(.open)'); if (!c.length || done) return clearInterval(timer); pick(+c[C.randInt(c.length)].dataset.i); }, App.state.reduceMotion ? 60 : 450); };
      S.vaultPick = pick; S.vaultTiles = tiles;
    });
  }

  /* ---------- Jewel Wheel ---------- */
  function wheelSVG() {
    const n = SL.wheel.length, cols = ['#b3002a', '#1636b8', '#078a4f', '#5f95bf', '#191626', '#7a5a0c'];
    let o = '';
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * 2 * Math.PI - Math.PI / 2 - Math.PI / n, a1 = a0 + 2 * Math.PI / n;
      const p = a => `${100 + 92 * Math.cos(a)},${100 + 92 * Math.sin(a)}`;
      const am = (a0 + a1) / 2, tx = 100 + 66 * Math.cos(am), ty = 100 + 66 * Math.sin(am);
      o += `<path d="M100,100 L${p(a0)} A92,92 0 0 1 ${p(a1)} Z" fill="${cols[i % cols.length]}" stroke="#f5d77a" stroke-width="1.5"/>`;
      o += `<text x="${tx}" y="${ty}" transform="rotate(${am * 180 / Math.PI + 90} ${tx} ${ty})" text-anchor="middle" dominant-baseline="middle" font-weight="900" font-size="${SL.wheel[i] >= 25 ? 17 : 14}" fill="#fff8d8" font-family="Georgia,serif">${SL.wheel[i]}×</text>`;
    }
    return `<svg viewBox="0 0 200 200" class="wheel-svg"><circle cx="100" cy="100" r="97" fill="url(#gGold)"/>${o}<circle cx="100" cy="100" r="18" fill="url(#gGold)" stroke="#7a5a0c" stroke-width="2"/><g transform="translate(88 86) scale(.38)">${UI.SYMS.BLACK}</g></svg>`;
  }
  function jewelWheel(bet, why) {
    return new Promise(resolve => {
      const host = $('#sl-bonus'); const res = C.wheelSpin(), n = SL.wheel.length;
      host.className = 'jam-bonus wheel';
      host.innerHTML = `<div class="jb-head"><b>JEWEL WHEEL</b><span>${why} — spin for a prize!</span></div>
        <div class="wheel-wrap"><div class="wheel-box"><div class="wheel-ptr"></div><div class="wheel-rot" id="wh-rot">${wheelSVG()}</div></div></div>
        <div class="jb-foot"><button class="btn btn-gold" id="wh-go">SPIN THE WHEEL</button></div>`;
      Snd.fanfare(1);
      let started = false;
      const go = async () => {
        if (started) return; started = true;
        const btn = host.querySelector('#wh-go'); btn.disabled = true;
        const rot = host.querySelector('#wh-rot'), deg = 360 * 6 - res.index * (360 / n);
        const dur = App.state.reduceMotion ? 50 : 4200;
        rot.style.transition = `transform ${dur}ms cubic-bezier(.15,.8,.15,1)`; rot.style.transform = `rotate(${deg}deg)`;
        const tk = setInterval(() => Snd.tick(), 90); setTimeout(() => clearInterval(tk), dur * 0.7);
        await UI.sleep(dur + 150);
        const won = r2(res.prize * bet); App.wallet.credit(won); Snd.chime(5);
        host.querySelector('.jb-head').innerHTML = `<b>JEWEL WHEEL</b><span>Landed on <b>${res.prize}×</b> — ${UI.coinIcon()}${UI.money(won)}</span>`;
        btn.textContent = 'Collected'; host.querySelector('.wheel-wrap').classList.add('landed');
        await UI.sleep(1800);
        host.className = 'jam-bonus hidden'; host.innerHTML = '';
        resolve(won);
      };
      host.querySelector('#wh-go').onclick = go;
      S.wheelGo = go;
    });
  }

  /* ---------- tiered celebration overlay ---------- */
  function celebrate(total, bet) {
    const x = total / bet, tier = TIER.find(t => x >= t.x); if (!tier) return Promise.resolve();
    const lvl = tier.k === 'epic' ? 3 : tier.k === 'mega' ? 2 : 1;
    return new Promise(resolve => {
      const ov = document.createElement('div'); ov.className = 'jam-cel ' + tier.k; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', tier.t);
      ov.innerHTML = `<canvas></canvas><div class="cel-rays"></div><div class="cel-box"><div class="cel-sub">${tier.sub}</div><div class="cel-title">${tier.t}</div>
        <div class="cel-amt">${UI.coinIcon()}<span class="cel-n">0</span></div><div class="cel-x">${x.toFixed(1)}× bet</div><div class="cel-skip">Tap to ${'skip'}</div></div>`;
      document.body.appendChild(ov);
      const shakeHost = document.querySelector('#app') || document.body;
      if (!App.state.reduceMotion) shakeHost.classList.add('jam-shake-' + lvl);
      Snd.fanfare(lvl + 1);
      const cv = ov.querySelector('canvas'), ctx = cv.getContext('2d'), dpr = Math.min(2, window.devicePixelRatio || 1);
      const W = cv.width = innerWidth * dpr, H = cv.height = innerHeight * dpr;
      const imgs = ['RUBY', 'SAPH', 'EMER', 'DIAM', 'BLACK'].map(k => { const im = new Image(); im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs>${document.querySelector('svg defs') ? document.querySelector('svg defs').innerHTML : ''}</defs>${UI.SYMS[k]}</svg>`); return im; });
      const P = [], rate = [0, .35, .7, 1.2][lvl];
      const spawn = () => { const gem = Math.random() < 0.55; P.push({ x: Math.random() * W, y: -40 * dpr, vx: (Math.random() - .5) * 3 * dpr, vy: (2 + Math.random() * 4) * dpr, r: (gem ? 18 + Math.random() * 18 : 9 + Math.random() * 7) * dpr, a: Math.random() * 6, va: (Math.random() - .5) * .25, gem, im: imgs[(Math.random() * 5) | 0] }); };
      const burst = () => { for (let i = 0; i < 18 * lvl; i++) { const a = Math.random() * Math.PI * 2, v = (4 + Math.random() * 9) * dpr; P.push({ x: W / 2, y: H * .42, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 4 * dpr, r: (8 + Math.random() * 10) * dpr, a: 0, va: .2, gem: Math.random() < .5, im: imgs[(Math.random() * 5) | 0] }); } };
      burst();
      let raf = 0, alive = true; const t0 = performance.now(), dur = App.state.reduceMotion ? 900 : tier.ms;
      const amt = ov.querySelector('.cel-n'); let lastTick = 0, skipped = false;
      const frame = now => {
        if (!alive) return;
        const p = Math.min(1, (now - t0) / (dur * 0.7));
        amt.textContent = UI.money(skipped ? total : r2(total * (1 - Math.pow(1 - p, 2.2))));
        if (now - lastTick > 60 && p < 1 && !skipped) { Snd.tick(); lastTick = now; }
        if (!App.state.reduceMotion) { let k = rate; while (k >= 1) { spawn(); k--; } if (Math.random() < k) spawn(); }
        ctx.clearRect(0, 0, W, H);
        for (let i = P.length - 1; i >= 0; i--) {
          const q = P[i]; q.vy += .18 * dpr; q.x += q.vx; q.y += q.vy; q.a += q.va;
          if (q.y > H + 60 * dpr) { P.splice(i, 1); continue; }
          ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.a);
          if (q.gem && q.im.complete) ctx.drawImage(q.im, -q.r, -q.r, q.r * 2, q.r * 2);
          else { const g = ctx.createRadialGradient(-q.r * .3, -q.r * .3, 1, 0, 0, q.r); g.addColorStop(0, '#fff6c4'); g.addColorStop(.5, '#e2b93b'); g.addColorStop(1, '#8a6410'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, q.r * Math.abs(Math.cos(q.a * 2)) + 1, q.r, 0, 0, Math.PI * 2); ctx.fill(); }
          ctx.restore();
        }
        if (now - t0 > dur) return end();
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
      const end = () => { if (!alive) return; alive = false; cancelAnimationFrame(raf); shakeHost.classList.remove('jam-shake-1', 'jam-shake-2', 'jam-shake-3'); ov.classList.add('out'); setTimeout(() => ov.remove(), 250); if (S) S.cel = null; resolve(); };
      ov.addEventListener('click', () => { if (!skipped) { skipped = true; amt.textContent = UI.money(total); ov.classList.add('skipped'); setTimeout(end, 500); } else end(); });
      S.cel = { kill: end, skip: () => ov.click() };
    });
  }

  /* ---------- debug hook (prototype/testing only; virtual coins) ---------- */
  window.JAM = {
    force(grid) { forced = grid; },
    grids: {
      normal: [['RUBY', 'SAPH', 'EMER'], ['RUBY', 'DIAM', 'SAPH'], ['RUBY', 'EMER', 'DIAM'], ['SAPH', 'EMER', 'RUBY'], ['DIAM', 'BLACK', 'SAPH']],
      freeSpins: [['SCAT', 'RUBY', 'SAPH'], ['EMER', 'SCAT', 'RUBY'], ['SAPH', 'EMER', 'DIAM'], ['RUBY', 'SCAT', 'EMER'], ['DIAM', 'SAPH', 'EMER']],
      vault: [['RUBY', 'BLACK', 'SAPH'], ['SAPH', 'BLACK', 'EMER'], ['EMER', 'BLACK', 'RUBY'], ['DIAM', 'SAPH', 'EMER'], ['SAPH', 'RUBY', 'DIAM']],
      wheel: [['SAPH', 'RUBY', 'EMER'], ['EMER', 'SAPH', 'DIAM'], ['DIAM', 'EMER', 'RUBY'], ['RUBY', 'DIAM', 'SAPH'], ['EMER', 'BLACK', 'SAPH']],
      big: [['DIAM', 'BLACK', 'RUBY'], ['DIAM', 'BLACK', 'SAPH'], ['DIAM', 'EMER', 'RUBY'], ['SAPH', 'DIAM', 'EMER'], ['RUBY', 'SAPH', 'EMER']]
    },
    celebrate(mult) { const bet = S.stepper.get(); return celebrate(r2(bet * mult), bet); },
    skip() { if (S && S.cel) S.cel.skip(); },
    vaultPick(i) { if (S && S.vaultPick) S.vaultPick(i); }, vaultTiles() { return S && S.vaultTiles; },
    wheelGo() { if (S && S.wheelGo) S.wheelGo(); },
    spin() { return spin(); }, state() { return S && { busy: S.busy }; }
  };
})();
