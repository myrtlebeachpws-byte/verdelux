/* Baccarat (Punto Banco) — 8-deck shoe, banker 5% commission, tie 8:1 */
(function () {
  'use strict';
  const C = window.Core, UI = window.UI;
  let S = null;
  const SPOTS = [['player', 'PLAYER', '1 : 1'], ['tie', 'TIE', '8 : 1'], ['banker', 'BANKER', '0.95 : 1']];

  App.register({
    id: 'baccarat', name: 'Baccarat', tagline: 'Player, Banker or Tie — 8-deck shoe.',
    rtpShort: 'Banker edge 1.06%',
    art() { return `<div class="bac-art"><span class="orb p">P</span><span class="orb t">T</span><span class="orb b">B</span></div>`; },
    info() {
      const ex = C.bacExact(8);
      const pc = x => (x * 100).toFixed(2) + '%', ed = x => (x * 100).toFixed(2) + '%';
      return `<p>Bet on which hand will finish closest to 9: <b>Player</b>, <b>Banker</b> or <b>Tie</b>. Aces = 1, 2–9 face value, 10/J/Q/K = 0; hand total is the last digit. Third-card drawing follows the standard Punto Banco tableau (applied automatically).</p>
      <table class="info-table pay"><tr><th>Bet</th><td>Pays</td><td>Win prob.</td><td>House edge</td></tr>
      <tr><th>Player</th><td>1:1</td><td>${pc(ex.prob.player)}</td><td>${ed(ex.edge.player)}</td></tr>
      <tr><th>Banker</th><td>0.95:1 (5% commission)</td><td>${pc(ex.prob.banker)}</td><td>${ed(ex.edge.banker)}</td></tr>
      <tr><th>Tie</th><td>8:1</td><td>${pc(ex.prob.tie)}</td><td>${ed(ex.edge.tie)}</td></tr></table>
      ${UI.infoRows([['Theoretical RTP', 'Banker ' + pc(1 - ex.edge.banker) + ' · Player ' + pc(1 - ex.edge.player) + ' · Tie ' + pc(1 - ex.edge.tie)], ['Basis', 'Computed exactly by enumerating all draws from a fresh 8-deck shoe (matches published figures; varies very slightly as the shoe depletes)'], ['Ties', 'Player and Banker bets push (returned) on a Tie'], ['Shoe', '8 standard 52-card decks, crypto-shuffled, reshuffled when fewer than 24 cards remain']])}${UI.DEMO_NOTE}`;
    },
    mount(el) {
      S = { alive: true, el, shoe: C.makeShoe(8), bets: { player: 0, tie: 0, banker: 0 }, last: null, hist: [], busy: false, chipIdx: 1 };
      el.innerHTML = `
        <div class="table-felt bac-table">
          <div class="bac-hands">
            <div class="bac-side" id="bac-p"><h4>PLAYER <span class="tot" id="bac-pt"></span></h4><div class="cards-row"></div></div>
            <div class="bac-side" id="bac-b"><h4>BANKER <span class="tot" id="bac-bt"></span></h4><div class="cards-row"></div></div>
          </div>
          <div class="status" id="bac-status">Tap a spot to place chips.</div>
          <div class="bac-spots" id="bac-spots">${SPOTS.map(s => `<button class="spot spot-${s[0]}" data-spot="${s[0]}"><b>${s[1]}</b><small>${s[2]}</small><span class="spot-bet"></span></button>`).join('')}</div>
          <div class="beads" id="bac-hist" aria-label="Recent results"></div>
        </div>
        <div class="controls">
          <div class="chip-row" id="bac-chips"></div>
          <div class="btn-row"><button class="btn btn-ghost" id="bac-clear">Clear</button><button class="btn btn-ghost" id="bac-rebet">Rebet</button><button class="btn btn-gold btn-lg" id="bac-deal">Deal</button></div>
        </div>`;
      S.chipIdx = Math.min((App.state.betIdx.bac || {}).idx == null ? 1 : App.state.betIdx.bac.idx, 4);
      drawChips(); drawSpots(); drawHist();
      el.querySelectorAll('.spot').forEach(b => b.onclick = () => addBet(b.dataset.spot));
      el.querySelector('#bac-clear').onclick = () => { if (!S.busy) { S.bets = { player: 0, tie: 0, banker: 0 }; drawSpots(); } };
      el.querySelector('#bac-rebet').onclick = () => { if (!S.busy && S.last) { S.bets = Object.assign({}, S.last); drawSpots(); } };
      el.querySelector('#bac-deal').onclick = deal;
      App.on('cur', () => { S.bets = { player: 0, tie: 0, banker: 0 }; S.last = null; drawChips(); drawSpots(); });
    },
    unmount() { if (S) S.alive = false; App.setBusy(false); }
  });

  const $ = s => S.el.querySelector(s);
  const total = () => S.bets.player + S.bets.tie + S.bets.banker;
  function chips() { return UI.LEVELS[App.state.cur]; }
  function drawChips() {
    const host = $('#bac-chips'); host.innerHTML = '';
    chips().forEach((v, i) => {
      const b = document.createElement('button'); b.className = 'chip c' + i + (i === S.chipIdx ? ' sel' : ''); b.textContent = App.state.cur === 'GC' ? (v >= 1000 ? v / 1000 + 'K' : v) : v;
      b.setAttribute('aria-label', 'Chip ' + v); b.onclick = () => { if (S.busy) return; S.chipIdx = i; App.state.betIdx.bac = { idx: i }; App.save(); drawChips(); };
      host.appendChild(b);
    });
  }
  function drawSpots() {
    SPOTS.forEach(([k]) => { const sp = S.el.querySelector(`.spot-${k} .spot-bet`); sp.innerHTML = S.bets[k] > 0 ? `${UI.coinIcon()}${UI.money(S.bets[k])}` : ''; S.el.querySelector(`.spot-${k}`).classList.toggle('has', S.bets[k] > 0); });
  }
  function drawHist() {
    $('#bac-hist').innerHTML = S.hist.slice(-24).map(w => `<i class="bead ${w[0]}">${w[0].toUpperCase()}</i>`).join('') || '<span class="muted small">Results appear here</span>';
  }
  function addBet(spot) {
    if (S.busy) return;
    const v = chips()[S.chipIdx];
    if (total() + v > App.wallet.bal() + 1e-9) { App.toast('Not enough ' + App.state.cur + ' for that chip.', 'warn'); return; }
    S.bets[spot] = Math.round((S.bets[spot] + v) * 100) / 100; drawSpots();
  }
  function side(k) { return $(k === 'p' ? '#bac-p .cards-row' : '#bac-b .cards-row'); }

  async function deal() {
    if (S.busy) return;
    const t = total();
    if (t <= 0) { App.toast('Place a bet first.', 'warn'); return; }
    const r = App.wallet.spend(t, { hand: true }); if (!r.ok) { App.toast(r.reason, 'warn'); return; }
    S.busy = true; App.setBusy(true); $('#bac-deal').disabled = true;
    if (S.shoe.length < 24) { S.shoe = C.makeShoe(8); App.toast('New shoe shuffled', 'info'); }
    S.last = Object.assign({}, S.bets);
    const bets = Object.assign({}, S.bets);
    const res = C.bacPlay(() => S.shoe.pop());
    side('p').innerHTML = ''; side('b').innerHTML = ''; $('#bac-pt').textContent = ''; $('#bac-bt').textContent = '';
    $('#bac-p').classList.remove('winner'); $('#bac-b').classList.remove('winner');
    UI.msg($('#bac-status'), 'Dealing…', '');
    const shown = { p: [], b: [] };
    for (const step of res.order) {
      if (!S.alive) return;
      await UI.sleep(shown.p.length + shown.b.length < 4 ? 380 : 800);
      shown[step.who].push(step.card);
      const e = UI.card(step.card, { cls: 'deal-in' + (shown[step.who].length === 3 ? ' third' : '') }); side(step.who).appendChild(e);
      $(step.who === 'p' ? '#bac-pt' : '#bac-bt').textContent = C.bacTot(shown[step.who].map(C.bacVal));
      if (shown.p.length + shown.b.length === 4 && res.order.length > 4) UI.msg($('#bac-status'), 'Third card…', '');
    }
    await UI.sleep(450);
    if (!S.alive) return;
    let back = 0; Object.keys(bets).forEach(k => { back += C.bacReturn(k, bets[k], res.winner); });
    back = Math.round(back * 100) / 100;
    if (back > 0) App.wallet.credit(back);
    const net = Math.round((back - t) * 100) / 100;
    const label = res.winner === 'tie' ? `TIE ${res.pt}–${res.bt}` : `${res.winner.toUpperCase()} WINS ${res.winner === 'player' ? res.pt + '–' + res.bt : res.bt + '–' + res.pt}`;
    const nat = res.natural ? ' (natural)' : '';
    UI.msg($('#bac-status'), `<b>${label}${nat}</b> — ` + (net > 0 ? `you win ${UI.coinIcon()}${UI.money(net)}` : net === 0 ? 'bets returned / even' : `you lose ${UI.coinIcon()}${UI.money(-net)}`), net > 0 ? 'win' : (net === 0 ? 'push' : 'lose'));
    if (res.winner !== 'tie') $(res.winner === 'player' ? '#bac-p' : '#bac-b').classList.add('winner');
    S.hist.push(res.winner); drawHist();
    S.bets = { player: 0, tie: 0, banker: 0 }; drawSpots();
    S.busy = false; App.setBusy(false); $('#bac-deal').disabled = false;
  }
})();
