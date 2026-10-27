/* Blackjack — 6-deck shoe, dealer stands on all 17s, 3:2 blackjack, double any two, split once, DAS */
(function () {
  'use strict';
  const C = window.Core, UI = window.UI;
  let S = null;

  App.register({
    id: 'blackjack', name: 'Blackjack', tagline: '3:2 payouts, dealer stands on 17.',
    rtpShort: 'Edge ≈0.5%* (basic strategy)',
    art() { return UI.mini(['A♠', 'K♥'], 'fan fan2'); },
    info() {
      return `<p>Beat the dealer without going over 21. Blackjack (A + 10-value) pays <b>3:2</b>. Dealer <b>stands on all 17s</b> (including soft 17).</p>
      <ul class="rules"><li>6-deck shoe of standard 52-card decks, crypto-shuffled; reshuffled when fewer than ~25% of cards remain</li>
      <li>Double down on any first two cards (also after a split)</li><li>Split a pair (or two 10-value cards) <b>once</b>; split aces receive one card each; 21 after a split pays 1:1</li>
      <li>Dealer checks for blackjack when showing A or 10; no insurance, no surrender</li></ul>
      ${UI.infoRows([['Blackjack payout', '3:2'], ['Dealer', 'Stands on all 17s'], ['House edge', 'approx. 0.5% with perfect basic strategy for these rules (approx.; casual play is higher)'], ['Theoretical RTP', 'approx. 99.5% with basic strategy']])}${UI.DEMO_NOTE}`;
    },
    mount(el) {
      S = { shoe: C.makeShoe(6), alive: true, phase: 'bet', hands: [], active: 0, dealer: [], hole: true, bet: 0, last: null };
      el.innerHTML = `
        <div class="table-felt bj-table">
          <div class="side-label">Dealer <span id="bj-dtot" class="tot"></span></div>
          <div class="cards-row" id="bj-dealer"></div>
          <div class="status" id="bj-status">Place your bet and deal.</div>
          <div class="hands-wrap" id="bj-hands"></div>
        </div>
        <div class="controls">
          <div id="bj-bet"></div>
          <div class="btn-row" id="bj-bet-actions"><button class="btn btn-gold btn-lg" id="bj-deal">Deal</button></div>
          <div class="btn-row hidden" id="bj-actions">
            <button class="btn btn-ghost" id="bj-hit">Hit</button>
            <button class="btn btn-gold" id="bj-stand">Stand</button>
            <button class="btn btn-ghost" id="bj-double">Double</button>
            <button class="btn btn-ghost" id="bj-split">Split</button>
          </div>
        </div>`;
      S.el = el;
      S.stepper = UI.betStepper(el.querySelector('#bj-bet'), { key: 'bj', label: 'BET', defIdx: 1 });
      el.querySelector('#bj-deal').onclick = deal;
      el.querySelector('#bj-hit').onclick = hit;
      el.querySelector('#bj-stand').onclick = stand;
      el.querySelector('#bj-double').onclick = dbl;
      el.querySelector('#bj-split').onclick = split;
      paint();
    },
    unmount() { if (S) S.alive = false; App.setBusy(false); }
  });

  const $ = s => S.el.querySelector(s);
  function paint(newIdx) {
    const d = $('#bj-dealer'); d.innerHTML = '';
    S.dealer.forEach((c, i) => { const e = UI.card(c, { down: i === 1 && S.hole }); if (newIdx && newIdx.d === i) e.classList.add('deal-in'); d.appendChild(e); });
    const vis = S.hole ? S.dealer.slice(0, 1) : S.dealer;
    $('#bj-dtot').textContent = S.dealer.length ? (S.hole ? C.bjValue(vis).total : (C.bjValue(S.dealer).total > 21 ? 'BUST' : C.bjValue(S.dealer).total)) : '';
    const hw = $('#bj-hands'); hw.innerHTML = '';
    S.hands.forEach((h, hi) => {
      const v = C.bjValue(h.cards);
      const box = document.createElement('div'); box.className = 'bj-hand' + (S.phase === 'play' && hi === S.active ? ' active' : '') + (h.res ? ' res-' + h.res : '');
      box.innerHTML = `<div class="cards-row"></div><div class="hand-meta"><span class="tot">${v.total > 21 ? 'BUST' : (v.soft && v.total < 21 ? 'Soft ' : '') + v.total}</span><span class="hbet">${UI.coinIcon()}${UI.money(h.bet)}</span>${h.label ? `<span class="hres ${h.res}">${h.label}</span>` : ''}</div>`;
      const row = box.querySelector('.cards-row');
      h.cards.forEach((c, i) => { const e = UI.card(c); if (newIdx && newIdx.h === hi && newIdx.i === i) e.classList.add('deal-in'); row.appendChild(e); });
      hw.appendChild(box);
    });
    const play = S.phase === 'play';
    $('#bj-actions').classList.toggle('hidden', !play);
    $('#bj-bet-actions').classList.toggle('hidden', S.phase !== 'bet');
    $('#bj-bet').classList.toggle('hidden', S.phase !== 'bet');
    if (play) {
      const h = S.hands[S.active];
      $('#bj-double').disabled = !(h.cards.length === 2 && !h.noHit && App.wallet.canAfford(h.bet));
      $('#bj-split').disabled = !(S.hands.length === 1 && h.cards.length === 2 && C.bjCardVal(h.cards[0]) === C.bjCardVal(h.cards[1]) && App.wallet.canAfford(h.bet));
      $('#bj-hit').disabled = !!h.noHit;
    }
  }
  const draw = () => { if (S.shoe.length < 20) S.shoe = C.makeShoe(6); return S.shoe.pop(); };

  async function deal() {
    if (S.phase !== 'bet') return;
    const bet = S.stepper.get();
    if (S.shoe.length < 312 * 0.25) { S.shoe = C.makeShoe(6); App.toast('Shoe reshuffled', 'info'); }
    const r = App.wallet.spend(bet, { hand: true });
    if (!r.ok) { App.toast(r.reason, 'warn'); return; }
    App.setBusy(true); S.lock = false; S.phase = 'dealing'; S.hole = true; S.bet = bet;
    S.hands = [{ cards: [], bet, done: false }]; S.dealer = []; S.active = 0;
    UI.msg($('#bj-status'), 'Dealing…', ''); paint();
    const seq = [['h'], ['d'], ['h'], ['d']];
    for (const [who] of seq) {
      if (!S.alive) return;
      if (who === 'h') { S.hands[0].cards.push(draw()); paint({ h: 0, i: S.hands[0].cards.length - 1 }); }
      else { S.dealer.push(draw()); paint({ d: S.dealer.length - 1 }); }
      await UI.sleep(220);
    }
    const p = S.hands[0].cards, dUp = S.dealer[0];
    const dBJ = C.bjIsBlackjack(S.dealer), pBJ = C.bjIsBlackjack(p);
    if (C.bjCardVal(dUp) >= 10 && dBJ || pBJ) { // dealer peeked (A or 10 up) / player BJ
      S.hole = false; paint(); await UI.sleep(350);
      if (dBJ || pBJ) return settleAll();
    }
    S.phase = 'play';
    UI.msg($('#bj-status'), 'Your move.', ''); paint();
  }

  function cur() { return S.hands[S.active]; }
  async function hit() {
    const h = cur(); if (S.phase !== 'play' || h.noHit || S.lock) return;
    S.lock = true;
    h.cards.push(draw()); paint({ h: S.active, i: h.cards.length - 1 });
    if (C.bjValue(h.cards).total >= 21) { await UI.sleep(300); await next(); } else S.lock = false;
  }
  function stand() { if (S.phase !== 'play' || S.lock) return; S.lock = true; next(); }
  async function dbl() {
    const h = cur(); if (S.phase !== 'play' || h.cards.length !== 2 || S.lock) return;
    const r = App.wallet.spend(h.bet); if (!r.ok) { App.toast(r.reason, 'warn'); return; }
    S.lock = true;
    h.bet *= 2; h.doubled = true; h.cards.push(draw()); paint({ h: S.active, i: h.cards.length - 1 });
    await UI.sleep(450); await next();
  }
  async function split() {
    const h = cur(); if (S.phase !== 'play' || S.hands.length !== 1 || S.lock) return;
    const r = App.wallet.spend(h.bet); if (!r.ok) { App.toast(r.reason, 'warn'); return; }
    S.lock = true;
    const aces = h.cards[0].r === 14;
    const second = { cards: [h.cards.pop()], bet: h.bet, done: false, fromSplit: true };
    h.fromSplit = true; S.hands.push(second);
    h.cards.push(draw()); second.cards.push(draw());
    if (aces) { h.noHit = second.noHit = true; }
    paint();
    if (aces) { await UI.sleep(600); await next(); }
    else if (C.bjValue(h.cards).total === 21) { await UI.sleep(400); await next(); }
    else S.lock = false;
  }
  async function next() {
    if (!S.alive) return;
    S.active++;
    while (S.active < S.hands.length) {
      const h = S.hands[S.active];
      if (h.noHit || C.bjValue(h.cards).total >= 21) { S.active++; continue; }
      break;
    }
    if (S.active < S.hands.length) { S.lock = false; paint(); return; }
    S.active = S.hands.length - 1;
    await dealerTurn();
  }
  async function dealerTurn() {
    S.phase = 'dealer'; S.hole = false; paint();
    UI.msg($('#bj-status'), 'Dealer plays…', '');
    await UI.sleep(500);
    const live = S.hands.some(h => C.bjValue(h.cards).total <= 21);
    while (live && S.alive && C.bjDealerShouldHit(S.dealer)) {
      S.dealer.push(draw()); paint({ d: S.dealer.length - 1 }); await UI.sleep(600);
    }
    settleAll();
  }
  function settleAll() {
    if (!S.alive) return;
    S.phase = 'done'; S.hole = false;
    let totalBet = 0, totalBack = 0, labels = [];
    S.hands.forEach(h => {
      const r = C.bjSettle(h.cards, S.dealer, { fromSplit: !!h.fromSplit });
      h.res = r.res === 'blackjack' ? 'win' : (r.res === 'bust' ? 'lose' : r.res);
      h.label = ({ blackjack: 'BLACKJACK 3:2', win: 'WIN', push: 'PUSH', lose: 'LOSE', bust: 'BUST' })[r.res];
      totalBet += h.bet; totalBack += h.bet * r.mult;
    });
    if (totalBack > 0) App.wallet.credit(totalBack);
    const net = totalBack - totalBet;
    const st = $('#bj-status');
    if (net > 0) UI.msg(st, `You win ${UI.coinIcon()}${UI.money(net)}!`, 'win');
    else if (net === 0) UI.msg(st, 'Push — bet returned.', 'push');
    else UI.msg(st, `Dealer wins. −${UI.coinIcon()}${UI.money(-net)}`, 'lose');
    S.phase = 'bet'; paint(); // phase 'bet' shows deal button again; keep hands on table
    App.setBusy(false);
    $('#bj-deal').textContent = 'Deal Again';
  }
})();
