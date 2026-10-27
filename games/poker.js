/* Five Card Draw — 9/6 Jacks or Better pay table */
(function () {
  'use strict';
  const C = window.Core, UI = window.UI;
  let S = null;

  App.register({
    id: 'poker', name: 'Five Card Draw', tagline: 'Ante up, hold your best, draw once.',
    rtpShort: 'RTP 99.54%* (9/6 JoB)',
    art() { return UI.mini(['A♠', 'K♠', 'Q♠', 'J♠', '10♠'], 'fan fan5'); },
    info() {
      return `<p>Classic five card draw: place your ante, get five cards, tap cards to <b>hold</b>, then draw replacements <b>once</b>. Pays by the standard poker rankings below (Jacks or Better to win).</p>
      <table class="info-table pay"><tr><th>Hand</th><td>Pays (× ante)</td></tr>${C.DRAW_PAYTABLE.map(p => `<tr><th>${p.name}</th><td>${p.mult}×</td></tr>`).join('')}</table>
      <p class="fine">A 1× payout returns your ante (a push).</p>
      ${UI.infoRows([['Pay table', '9/6 Jacks or Better (Full House 9×, Flush 6×), Royal Flush 800×'], ['Theoretical RTP', '99.54% with optimal strategy (standard published figure for this pay table)'], ['House edge', 'approx. 0.46% with optimal play; higher for casual play (approx. 2–5%)'], ['Deck', 'Fresh 52-card deck, shuffled with crypto.getRandomValues every hand']])}${UI.DEMO_NOTE}`;
    },
    mount(el) {
      S = { phase: 'bet', deck: [], hand: [], held: [false, false, false, false, false], bet: 0, alive: true };
      el.innerHTML = `
        <div class="table-felt poker-table">
          <div class="paytable-mini" id="pk-pay">${C.DRAW_PAYTABLE.map(p => `<div class="prow" data-cat="${p.cat}"><span>${p.name}</span><b>${p.mult}×</b></div>`).join('')}</div>
          <div class="hand-name" id="pk-name">&nbsp;</div>
          <div class="cards-row five" id="pk-cards"></div>
          <div class="status" id="pk-status">Set your ante and deal.</div>
        </div>
        <div class="controls">
          <div id="pk-bet"></div>
          <button class="btn btn-gold btn-lg" id="pk-go">Deal</button>
        </div>`;
      S.stepper = UI.betStepper(el.querySelector('#pk-bet'), { key: 'poker', label: 'ANTE', defIdx: 1 });
      el.querySelector('#pk-go').onclick = () => (S.phase === 'bet' ? deal(el) : draw(el));
      drawCards(el, true);
    },
    unmount() { if (S) S.alive = false; App.setBusy(false); }
  });

  function drawCards(el, blank) {
    const row = el.querySelector('#pk-cards'); row.innerHTML = '';
    for (let i = 0; i < 5; i++) {
      const wrap = document.createElement('button'); wrap.className = 'card-slot'; wrap.type = 'button';
      const c = blank ? UI.card(null, { down: true }) : UI.card(S.hand[i]);
      if (!blank) c.classList.add('deal-in'), c.style.animationDelay = (i * 70) + 'ms';
      wrap.appendChild(c);
      const tag = document.createElement('span'); tag.className = 'held-tag'; tag.textContent = 'HELD'; wrap.appendChild(tag);
      wrap.classList.toggle('held', S.held[i]);
      wrap.onclick = () => {
        if (S.phase !== 'draw') return;
        S.held[i] = !S.held[i]; wrap.classList.toggle('held', S.held[i]);
      };
      row.appendChild(wrap);
    }
  }
  function hint(el) {
    const e = C.eval5(S.hand), p = C.drawPayout(S.hand);
    el.querySelector('#pk-name').textContent = e.text + (p.mult ? '' : '');
  }
  function deal(el) {
    const bet = S.stepper.get();
    const r = App.wallet.spend(bet, { hand: true });
    if (!r.ok) { App.toast(r.reason, 'warn'); return; }
    S.bet = bet; S.deck = C.shuffle(C.makeDeck());
    S.hand = [S.deck.pop(), S.deck.pop(), S.deck.pop(), S.deck.pop(), S.deck.pop()];
    S.held = [false, false, false, false, false]; S.phase = 'draw';
    App.setBusy(true); S.stepper.setDisabled(true);
    el.querySelectorAll('.prow').forEach(r => r.classList.remove('hit'));
    drawCards(el); hint(el);
    UI.msg(el.querySelector('#pk-status'), 'Tap the cards you want to <b>hold</b>, then draw.', '');
    const b = el.querySelector('#pk-go'); b.textContent = 'Draw';
  }
  async function draw(el) {
    el.querySelector('#pk-go').disabled = true;
    const slots = el.querySelectorAll('.card-slot');
    for (let i = 0; i < 5; i++) {
      if (!S.held[i]) {
        S.hand[i] = S.deck.pop();
        const c = slots[i].querySelector('.card'); UI.reveal(c, S.hand[i]);
      }
    }
    await UI.sleep(450);
    if (!S.alive) return;
    const res = C.drawPayout(S.hand), e = C.eval5(S.hand);
    el.querySelector('#pk-name').textContent = e.text;
    const win = S.bet * res.mult;
    if (win > 0) App.wallet.credit(win);
    const st = el.querySelector('#pk-status');
    if (res.mult > 1) UI.msg(st, `<b>${res.name}!</b> You win ${UI.coinIcon()}${UI.money(win - S.bet)} (${res.mult}×)`, 'win');
    else if (res.mult === 1) UI.msg(st, `Jacks or Better — ante returned.`, 'push');
    else UI.msg(st, `${e.text} — no win. Better luck next hand.`, 'lose');
    if (res.mult) el.querySelectorAll('.prow').forEach(r => r.classList.toggle('hit', +r.dataset.cat === res.cat));
    slots.forEach((s, i) => s.classList.toggle('win', res.mult > 0));
    S.phase = 'bet'; App.setBusy(false); S.stepper.setDisabled(false);
    const b = el.querySelector('#pk-go'); b.textContent = 'Deal'; b.disabled = false;
  }
})();
