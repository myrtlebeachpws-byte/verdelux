/* Texas Hold'em — you vs 3 AI opponents, no-limit, blinds, side pots, showdown */
(function () {
  'use strict';
  const C = window.Core, UI = window.UI;
  let S = null;
  const NAMES = ['You', 'Ava', 'Kai', 'Rex'];
  const STYLE = [1, 0.85, 1, 1.3];
  const LEVELS = { GC: [100, 200, 500, 1000], SC: [1, 2, 5, 10] };

  App.register({
    id: 'holdem', name: "Texas Hold'em", tagline: 'No-limit vs 3 AI players. Blinds, bluffs, showdowns.',
    rtpShort: 'vs AI · no rake',
    art() { return UI.mini(['A♥', 'A♦'], 'fan fan2') + '<div class="art-chips"><i></i><i></i><i></i></div>'; },
    info() {
      return `<p>No-limit Texas Hold'em, 4 players (you + Ava, Kai, Rex). Each player gets two hole cards, then flop, turn and river; best five-card hand from seven wins. Fold, check/call, or raise (including all-in). Side pots are handled correctly.</p>
      <ul class="rules"><li>You buy in for up to 100 big blinds from your balance each hand; unused chips return to your wallet after the hand</li>
      <li>AI opponents estimate their hand equity by Monte-Carlo simulation and compare it to pot odds (simple, beatable)</li><li>Ties split pots; odd chips go left of the dealer. Wheel (A-2-3-4-5) is the lowest straight</li></ul>
      ${UI.infoRows([['House edge / rake', 'None in this demo (all chips wagered are paid back out to the players in the hand)'], ['Theoretical RTP', 'Not a fixed-RTP game — results depend on skill vs. the AI. A live product would normally charge a rake or fee.'], ['Deck', 'Fresh 52-card deck, crypto.getRandomValues shuffle each hand']])}${UI.DEMO_NOTE}`;
    },
    mount(el) {
      S = { alive: true, el, eng: null, inHand: false, seen: new Set(), raiseTo: 0, unit: 1, bbU: 0, start: 0, resetAI: true, msg: 'Choose blinds and deal a hand.', msgKind: '' };
      el.innerHTML = `<div class="table-felt holdem" id="hd-table"></div>
        <div class="controls"><div id="hd-bet"></div><div id="hd-actions"></div></div>`;
      S.stepper = UI.betStepper(el.querySelector('#hd-bet'), { key: 'holdem', label: 'BIG BLIND', levels: LEVELS, defIdx: 0, onChange: () => { S.resetAI = true; } });
      S.leave = leave; window.addEventListener('pagehide', S.leave);
      paint();
    },
    unmount() { if (!S) return; S.alive = false; window.removeEventListener('pagehide', S.leave); leave(); App.setBusy(false); }
  });

  function leave() { // return unused chips if the player walks away mid-hand (bets already in the pot are forfeited)
    if (S && S.inHand) { const me = S.eng.players[0]; App.wallet.credit(me.stack * S.unit); App.wallet.addWager(me.total * S.unit); S.inHand = false; }
  }
  const fmtU = u => UI.money(u * S.unit);
  const $ = s => S.el.querySelector(s);

  function setup() {
    S.unit = App.wallet.unit();
    const BB = S.stepper.get(); S.bbU = Math.round(BB / S.unit);
    const sbU = S.bbU / 2;
    if (!S.eng || S.resetAI) {
      S.eng = new C.HoldemEngine({ names: NAMES, stacks: [0, 100 * S.bbU, 100 * S.bbU, 100 * S.bbU], sb: sbU, bb: S.bbU, human: [true, false, false, false] });
      S.eng.players.forEach((p, i) => p.style = STYLE[i]);
      S.resetAI = false;
    }
    S.eng.sb = sbU; S.eng.bb = S.bbU;
    S.eng.players.forEach((p, i) => { if (i > 0 && p.stack < 20 * S.bbU) p.stack = 100 * S.bbU; });
  }

  async function newHand() {
    setup();
    const w = App.wallet;
    const avail = Math.floor(w.bal() / S.unit + 1e-9), room = w.limitRoom();
    if (avail < S.bbU * 2) { App.toast('You need at least 2 big blinds to sit down. Lower the blinds or reload coins in Profile.', 'warn'); return; }
    if (room !== Infinity && room < S.bbU * S.unit) { App.toast('Daily wager limit reached. Adjust it in Profile.', 'warn'); return; }
    const stack = Math.min(avail, 100 * S.bbU);
    if (!w.spend(stack * S.unit, { track: false, hand: true }).ok) return;
    S.eng.players[0].stack = stack; S.start = stack; S.seen = new Set();
    S.eng.startHand(); S.inHand = true; S.raiseTo = 0;
    App.setBusy(true); S.stepper.setDisabled(true);
    S.msg = 'New hand — you are ' + posName(0) + '.'; S.msgKind = '';
    paint(); loop();
  }
  function posName(i) {
    const e = S.eng, n = e.n, rel = (i - e.dealer + n) % n;
    return ['on the button', 'the small blind', 'the big blind', 'under the gun'][rel] || '';
  }

  async function loop() {
    const e = S.eng;
    while (S.alive && e.street !== 'done') {
      const p = e.players[e.toAct];
      paint();
      if (p.human) return; // wait for the player's click
      await UI.sleep(e.players[0].folded ? 260 : 750 + C.randInt(450));
      if (!S.alive) return;
      const d = C.holdemDecide(e, e.toAct, 90);
      const before = e.street;
      e.act(d.type, d.raiseTo);
      if (e.street !== before && e.street !== 'done') { paint(); await UI.sleep(350); }
    }
    if (S.alive && e.street === 'done') finish();
  }

  function humanAct(type, raiseTo) {
    const e = S.eng; if (!S.alive || e.street === 'done' || !e.players[e.toAct].human) return;
    e.act(type, raiseTo); S.raiseTo = 0; paint(); loop();
  }

  function finish() {
    const e = S.eng, me = e.players[0], res = e.result;
    paint(true);
    App.wallet.credit(me.stack * S.unit); App.wallet.addWager(me.total * S.unit);
    S.inHand = false; App.setBusy(false); S.stepper.setDisabled(false);
    const net = me.stack - S.start;
    const parts = res.pots.map(p => {
      const names = p.winners.map(id => id === 0 ? 'You' : e.players[id].name).join(' & ');
      const verb = p.winners.length > 1 ? 'split' : (p.winners[0] === 0 ? 'win' : 'wins');
      return `${names} ${verb} ${fmtU(p.amount)}${res.showdown ? ' with ' + p.handName : ''}`;
    });
    S.msg = parts.join(' · ') + (net > 0 ? `  — net +${fmtU(net)}` : net < 0 ? `  — net −${fmtU(-net)}` : '');
    S.msgKind = net > 0 ? 'win' : (net < 0 ? 'lose' : 'push');
    if (!res.showdown) S.msg = (res.winners[0] === 0 ? 'Everyone folded — you take the pot of ' : e.players[res.winners[0]].name + ' wins the pot of ') + fmtU(res.pots[0].amount) + (net > 0 ? `  — net +${fmtU(net)}` : net < 0 ? `  — net −${fmtU(-net)}` : '');
    paint(true);
  }

  function seatHTML(p, i, over) {
    const e = S.eng, showdown = over && e.result && e.result.showdown;
    const isTurn = e.street !== 'done' && e.toAct === i;
    const win = over && e.result && e.result.winners.includes(i);
    const cards = p.hole.map((c, k) => {
      const key = 'h' + i + '-' + k, fresh = !S.seen.has(key); S.seen.add(key);
      const faceUp = p.human || (showdown && !p.folded);
      const el = UI.card(c, { down: !faceUp, cls: 'sm' + (fresh ? ' deal-in' : '') });
      return el.outerHTML;
    }).join('');
    return `<div class="seat ${p.human ? 'me' : ''} ${p.folded && e.street !== 'idle' ? 'folded' : ''} ${isTurn ? 'turn' : ''} ${win ? 'winner' : ''}">
      <div class="seat-top"><span class="avatar-hex">${p.name[0]}</span><div class="seat-info"><b>${p.name}</b><span class="stack">${UI.coinIcon()}${fmtU(p.stack)}${p.allIn ? ' · ALL-IN' : ''}</span></div>${e.dealer === i && e.street !== 'idle' ? '<span class="dbtn" title="Dealer">D</span>' : ''}</div>
      <div class="seat-cards">${cards || ''}</div>
      <div class="seat-act">${p.bet > 0 && e.street !== 'done' ? `<span class="bet-chip">${fmtU(p.bet)}</span>` : ''}${p.lastAction && !win ? `<em>${p.lastAction.replace(/\b(\d+)\b/g, m => fmtU(+m))}</em>` : ''}${win ? '<em class="wtag">WINNER</em>' : ''}</div>
    </div>`;
  }

  function paint(over) {
    if (!S || !S.alive) return;
    const e = S.eng; over = over || (e && e.street === 'done');
    if (!e) { $('#hd-table').innerHTML = `<div class="hd-empty"><div class="status">${S.msg}</div></div>`; renderActions(); return; }
    const board = [0, 1, 2, 3, 4].map(k => {
      const c = e.board[k]; if (!c) return '<div class="card empty"></div>';
      const key = 'b' + k, fresh = !S.seen.has(key); S.seen.add(key);
      const hl = over && e.result && e.result.showdown && boardWins(c);
      return UI.card(c, { cls: (fresh ? 'deal-in ' : '') + (hl ? 'hl' : '') }).outerHTML;
    }).join('');
    const streetName = { idle: 'Pre-deal', preflop: 'Pre-flop', flop: 'Flop', turn: 'Turn', river: 'River', done: 'Hand over' }[e.street];
    let hand = '';
    const me = e.players[0];
    if (me.hole.length && !me.folded && e.board.length >= 3) hand = C.describe(C.score7(me.hole.concat(e.board)));
    else if (me.hole.length && !me.folded) hand = (me.hole[0].r === me.hole[1].r) ? 'Pocket ' + C.RANK_NAMES[me.hole[0].r] + 's' : '';
    $('#hd-table').innerHTML = `
      <div class="opps">${[1, 2, 3].map(i => seatHTML(e.players[i], i, over)).join('')}</div>
      <div class="community">
        <div class="pot-pill">POT <b>${UI.coinIcon()}${fmtU(e.pot)}</b> <span class="street-tag">${streetName}</span></div>
        <div class="board cards-row">${board}</div>
      </div>
      <div class="status ${S.msgKind}" id="hd-status">${S.msg}</div>
      ${seatHTML(me, 0, over)}
      <div class="hand-name">${hand || '&nbsp;'}</div>`;
    renderActions();
  }
  function boardWins(c) { // highlight board cards that are part of a winning five-card hand (simple: any winner's best five)
    const e = S.eng; if (!e.result.showdown) return false;
    const used = new Set();
    for (const id of e.result.winners) {
      const cards = e.players[id].hole.concat(e.board);
      const best = bestFive(cards); best.forEach(x => used.add(x.r + x.s));
    }
    return used.has(c.r + c.s);
  }
  function bestFive(cs) {
    let best = null, bs = -1;
    for (let a = 0; a < 7; a++) for (let b = a + 1; b < 7; b++) { const h = cs.filter((_, i) => i !== a && i !== b); const s = C.score5(h); if (s > bs) { bs = s; best = h; } }
    return best;
  }

  function renderActions() {
    const host = $('#hd-actions'); const e = S.eng;
    if (!e || e.street === 'done' || e.street === 'idle') {
      host.innerHTML = `<button class="btn btn-gold btn-lg" id="hd-deal">${e && e.street === 'done' ? 'Next Hand' : 'Deal Hand'}</button>`;
      $('#hd-deal').onclick = newHand; return;
    }
    const me = e.players[0];
    if (me.folded) { host.innerHTML = '<div class="status push">You folded — watching the hand play out…</div>'; return; }
    if (!me.human || e.toAct !== 0) { host.innerHTML = '<div class="status">Waiting for opponents…</div>'; return; }
    const L = e.legal();
    const potRaise = f => { const t = e.currentBet + Math.round((e.pot + L.toCall) * f); return Math.max(L.minRaiseTo, Math.min(L.maxRaiseTo, Math.round(t / e.sb) * e.sb)); };
    if (!S.raiseTo || S.raiseTo < L.minRaiseTo || S.raiseTo > L.maxRaiseTo) S.raiseTo = L.minRaiseTo;
    host.innerHTML = `<div class="btn-row">
        <button class="btn btn-ghost" id="hd-fold">Fold</button>
        <button class="btn btn-gold" id="hd-call">${L.canCheck ? 'Check' : 'Call ' + fmtU(L.toCall)}${!L.canCheck && L.toCall >= me.stack ? ' (all-in)' : ''}</button>
      </div>
      ${L.canRaise ? `<div class="raise-box">
        <div class="presets"><button data-p="min">Min</button><button data-p="0.5">½ Pot</button><button data-p="1">Pot</button><button data-p="max">All-in</button></div>
        <div class="raise-row"><input type="range" id="hd-slider" min="${L.minRaiseTo}" max="${L.maxRaiseTo}" step="${e.sb}" value="${S.raiseTo}" ${L.minRaiseTo >= L.maxRaiseTo ? 'disabled' : ''}>
        <button class="btn btn-gold" id="hd-raise">${L.canCheck && e.currentBet === 0 ? 'Bet' : 'Raise to'} <b id="hd-rv">${fmtU(S.raiseTo)}</b></button></div></div>` : ''}`;
    $('#hd-fold').onclick = () => humanAct('fold');
    $('#hd-call').onclick = () => humanAct(L.canCheck ? 'check' : 'call');
    if (L.canRaise) {
      const sl = $('#hd-slider'), upd = v => { S.raiseTo = Math.max(L.minRaiseTo, Math.min(L.maxRaiseTo, v)); sl.value = S.raiseTo; $('#hd-rv').textContent = fmtU(S.raiseTo); };
      sl.oninput = () => upd(+sl.value);
      host.querySelectorAll('.presets button').forEach(b => b.onclick = () => { const p = b.dataset.p; upd(p === 'min' ? L.minRaiseTo : p === 'max' ? L.maxRaiseTo : potRaise(+p)); });
      $('#hd-raise').onclick = () => humanAct('raise', S.raiseTo);
    }
  }
})();
