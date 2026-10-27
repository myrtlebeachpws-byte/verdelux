/* Verdelux core: RNG, deck, hand evaluation, baccarat, blackjack, slots, hold'em engine.
   UMD: works in the browser (window.Core) and Node (require). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Core = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- RNG (crypto.getRandomValues) ---------- */
  const cryptoObj = (typeof globalThis !== 'undefined' && globalThis.crypto) || null;
  function rnd32() {
    const a = new Uint32Array(1);
    cryptoObj.getRandomValues(a);
    return a[0];
  }
  /** Unbiased integer in [0, n) via rejection sampling. */
  function randInt(n) {
    const lim = Math.floor(0x100000000 / n) * n;
    let x;
    do { x = rnd32(); } while (x >= lim);
    return x % n;
  }
  function randFloat() { return rnd32() / 0x100000000; }

  /* ---------- Cards ---------- */
  const SUITS = ['♠', '♥', '♦', '♣'];
  const RED = { '♥': true, '♦': true };
  function rankLabel(r) { return r <= 10 ? String(r) : ({ 11: 'J', 12: 'Q', 13: 'K', 14: 'A' })[r]; }
  const RANK_NAMES = { 2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six', 7: 'Seven', 8: 'Eight', 9: 'Nine', 10: 'Ten', 11: 'Jack', 12: 'Queen', 13: 'King', 14: 'Ace' };
  function makeDeck() {
    const d = [];
    for (let s = 0; s < 4; s++) for (let r = 2; r <= 14; r++) d.push({ r, s: SUITS[s] });
    return d;
  }
  /** Fisher-Yates, in place, using crypto RNG. */
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = randInt(i + 1);
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function makeShoe(decks) {
    let s = [];
    for (let i = 0; i < decks; i++) s = s.concat(makeDeck());
    return shuffle(s);
  }
  function cardStr(c) { return rankLabel(c.r) + c.s; }

  /* ---------- Poker hand evaluation ---------- */
  const HAND_NAMES = ['High Card', 'Pair', 'Two Pair', 'Three of a Kind', 'Straight', 'Flush', 'Full House', 'Four of a Kind', 'Straight Flush', 'Royal Flush'];
  const B = 759375; // 15^5

  /** Numeric score: category * 15^5 + tiebreak digits (base 15). Higher is better. */
  function score5(cs) {
    const r = [cs[0].r, cs[1].r, cs[2].r, cs[3].r, cs[4].r].sort((a, b) => b - a);
    const flush = cs[0].s === cs[1].s && cs[1].s === cs[2].s && cs[2].s === cs[3].s && cs[3].s === cs[4].s;
    const g = []; // groups [rank, count]
    for (let i = 0; i < 5; i++) {
      if (g.length && g[g.length - 1][0] === r[i]) g[g.length - 1][1]++;
      else g.push([r[i], 1]);
    }
    g.sort((a, b) => b[1] - a[1]); // stable: ranks stay descending within same count
    let cat, tb;
    if (g.length === 5) {
      let sh = 0;
      if (r[0] - r[4] === 4) sh = r[0];
      else if (r[0] === 14 && r[1] === 5 && r[4] === 2) sh = 5; // wheel
      if (sh && flush) { cat = sh === 14 ? 9 : 8; tb = [sh]; }
      else if (flush) { cat = 5; tb = r; }
      else if (sh) { cat = 4; tb = [sh]; }
      else { cat = 0; tb = r; }
    } else if (g.length === 4) { cat = 1; tb = g.map(x => x[0]); }
    else if (g.length === 3) { cat = g[0][1] === 3 ? 3 : 2; tb = g.map(x => x[0]); }
    else { cat = g[0][1] === 4 ? 7 : 6; tb = g.map(x => x[0]); }
    let sc = cat * B, mul = B / 15;
    for (let i = 0; i < tb.length; i++) { sc += tb[i] * mul; mul /= 15; }
    return sc;
  }
  function categoryOf(score) { return Math.floor(score / B); }
  function describe(score) {
    const cat = categoryOf(score);
    let rem = score - cat * B, d = [], mul = B / 15;
    for (let i = 0; i < 5; i++) { d.push(Math.floor(rem / mul)); rem -= d[i] * mul; mul /= 15; }
    const n = x => RANK_NAMES[x];
    switch (cat) {
      case 0: return n(d[0]) + '-High';
      case 1: return 'Pair of ' + n(d[0]) + 's';
      case 2: return 'Two Pair, ' + n(d[0]) + 's & ' + n(d[1]) + 's';
      case 3: return 'Three ' + n(d[0]) + 's';
      case 4: return n(d[0]) + '-High Straight';
      case 5: return n(d[0]) + '-High Flush';
      case 6: return 'Full House, ' + n(d[0]) + 's over ' + n(d[1]) + 's';
      case 7: return 'Four ' + n(d[0]) + 's';
      case 8: return n(d[0]) + '-High Straight Flush';
      default: return 'Royal Flush';
    }
  }
  function eval5(cs) { const s = score5(cs); return { score: s, rank: categoryOf(s), name: HAND_NAMES[categoryOf(s)], text: describe(s) }; }

  const COMBOS_7_5 = (function () {
    const out = [];
    for (let a = 0; a < 7; a++) for (let b = a + 1; b < 7; b++) out.push([a, b]); // two cards to exclude
    return out;
  })();
  /** Best 5-card score from 5..7 cards. */
  function score7(cs) {
    if (cs.length === 5) return score5(cs);
    const n = cs.length;
    let best = -1;
    if (n === 6) {
      for (let x = 0; x < 6; x++) {
        const h = []; for (let i = 0; i < 6; i++) if (i !== x) h.push(cs[i]);
        const s = score5(h); if (s > best) best = s;
      }
      return best;
    }
    for (let k = 0; k < COMBOS_7_5.length; k++) {
      const ex = COMBOS_7_5[k], h = [];
      for (let i = 0; i < 7; i++) if (i !== ex[0] && i !== ex[1]) h.push(cs[i]);
      const s = score5(h); if (s > best) best = s;
    }
    return best;
  }

  /* ---------- Five Card Draw pay table (9/6 Jacks or Better) ---------- */
  const DRAW_PAYTABLE = [
    { cat: 9, name: 'Royal Flush', mult: 800 },
    { cat: 8, name: 'Straight Flush', mult: 50 },
    { cat: 7, name: 'Four of a Kind', mult: 25 },
    { cat: 6, name: 'Full House', mult: 9 },
    { cat: 5, name: 'Flush', mult: 6 },
    { cat: 4, name: 'Straight', mult: 4 },
    { cat: 3, name: 'Three of a Kind', mult: 3 },
    { cat: 2, name: 'Two Pair', mult: 2 },
    { cat: 1, name: 'Jacks or Better', mult: 1 }
  ];
  /** Returns {mult, name} total-return multiple of ante (1 = ante returned). */
  function drawPayout(cs) {
    const s = score5(cs), cat = categoryOf(s);
    if (cat === 1) {
      const pairRank = Math.floor((s - B) / (B / 15));
      return pairRank >= 11 ? { mult: 1, name: 'Jacks or Better', cat } : { mult: 0, name: 'Pair (below Jacks)', cat };
    }
    if (cat === 0) return { mult: 0, name: 'No Win', cat };
    const row = DRAW_PAYTABLE.find(p => p.cat === cat);
    return { mult: row.mult, name: row.name, cat };
  }

  /* ---------- Blackjack ---------- */
  function bjCardVal(c) { return c.r === 14 ? 11 : (c.r >= 10 ? 10 : c.r); }
  function bjValue(cards) {
    let t = 0, aces = 0;
    for (const c of cards) { t += bjCardVal(c); if (c.r === 14) aces++; }
    while (t > 21 && aces > 0) { t -= 10; aces--; }
    return { total: t, soft: aces > 0 && t <= 21 };
  }
  function bjIsBlackjack(cards) { return cards.length === 2 && bjValue(cards).total === 21; }
  /** Dealer draws to 17, standing on all 17s (S17). */
  function bjDealerShouldHit(cards) { return bjValue(cards).total < 17; }
  /** Total returned for a settled hand (multiple of bet). */
  function bjSettle(playerCards, dealerCards, opts) {
    opts = opts || {};
    const p = bjValue(playerCards).total, d = bjValue(dealerCards).total;
    const pBJ = !opts.fromSplit && bjIsBlackjack(playerCards), dBJ = bjIsBlackjack(dealerCards);
    if (p > 21) return { mult: 0, res: 'bust' };
    if (pBJ && dBJ) return { mult: 1, res: 'push' };
    if (pBJ) return { mult: 2.5, res: 'blackjack' };
    if (dBJ) return { mult: 0, res: 'lose' };
    if (d > 21) return { mult: 2, res: 'win' };
    if (p > d) return { mult: 2, res: 'win' };
    if (p === d) return { mult: 1, res: 'push' };
    return { mult: 0, res: 'lose' };
  }

  /* ---------- Baccarat ---------- */
  function bacVal(c) { return c.r >= 10 && c.r <= 13 ? 0 : (c.r === 14 ? 1 : c.r); }
  function bacTot(vals) { let t = 0; for (const v of vals) t += v; return t % 10; }
  /** Who draws next given baccarat values arrays? returns 'p' | 'b' | null (initial 2+2 cards must be dealt first). */
  function bacNeed(p, b) {
    const pt = bacTot(p), bt = bacTot(b);
    if (p.length === 2 && b.length === 2) {
      if (pt >= 8 || bt >= 8) return null; // natural
      if (pt <= 5) return 'p';
      return bt <= 5 ? 'b' : null; // player stands on 6/7; banker draws on 0-5
    }
    if (p.length === 3 && b.length === 2) {
      const v = p[2];
      let draw;
      if (bt <= 2) draw = true;
      else if (bt === 3) draw = v !== 8;
      else if (bt === 4) draw = v >= 2 && v <= 7;
      else if (bt === 5) draw = v >= 4 && v <= 7;
      else if (bt === 6) draw = v === 6 || v === 7;
      else draw = false;
      return draw ? 'b' : null;
    }
    return null;
  }
  /** Plays a full coup. draw() returns a card. Returns cards in deal order too (for animation). */
  function bacPlay(draw) {
    const P = [], Bk = [], order = [];
    const d = who => { const c = draw(); (who === 'p' ? P : Bk).push(c); order.push({ who, card: c }); };
    d('p'); d('b'); d('p'); d('b');
    for (;;) {
      const nx = bacNeed(P.map(bacVal), Bk.map(bacVal));
      if (!nx) break;
      d(nx);
    }
    const pt = bacTot(P.map(bacVal)), bt = bacTot(Bk.map(bacVal));
    return { player: P, banker: Bk, order, pt, bt, winner: pt > bt ? 'player' : (bt > pt ? 'banker' : 'tie'), natural: P.length === 2 && Bk.length === 2 && (pt >= 8 || bt >= 8) };
  }
  /** Total returned (incl. stake) for a bet of `bet` on `spot`. Banker pays 0.95:1 (5% commission); Tie pays 8:1; P/B push on tie. */
  function bacReturn(spot, bet, winner) {
    if (spot === 'tie') return winner === 'tie' ? bet * 9 : 0;
    if (winner === 'tie') return bet;
    if (spot === winner) return spot === 'banker' ? bet + bet * 0.95 : bet * 2;
    return 0;
  }
  /** Exact outcome probabilities for an N-deck shoe (fresh shoe, first coup) by full enumeration. */
  function bacExact(decks) {
    decks = decks || 8;
    const cnt = [16, 4, 4, 4, 4, 4, 4, 4, 4, 4].map(x => x * decks);
    const res = { player: 0, banker: 0, tie: 0 };
    function rec(p, b, prob, left) {
      let nx = p.length < 2 && p.length <= b.length ? 'p' : (b.length < 2 ? 'b' : bacNeed(p, b));
      if (p.length === 2 && b.length < 2) nx = 'b';
      if (!nx) {
        const pt = bacTot(p), bt = bacTot(b);
        res[pt > bt ? 'player' : (bt > pt ? 'banker' : 'tie')] += prob;
        return;
      }
      for (let v = 0; v < 10; v++) {
        if (cnt[v] === 0) continue;
        const pr = cnt[v] / left;
        cnt[v]--;
        if (nx === 'p') { p.push(v); rec(p, b, prob * pr, left - 1); p.pop(); }
        else { b.push(v); rec(p, b, prob * pr, left - 1); b.pop(); }
        cnt[v]++;
      }
    }
    rec([], [], 1, 52 * decks);
    const edge = {
      banker: -(res.banker * 0.95 - res.player),
      player: -(res.player - res.banker),
      tie: -(res.tie * 8 - (1 - res.tie))
    };
    return { prob: res, edge };
  }

  /* ---------- Slots: "Jewels A Million" ---------- */
  // 5x3, 10 lines. Gems (low→high): RUBY, SAPH, EMER, DIAM, BLACK (black diamond). WILD reels 2–4. SCAT = bonus scatter.
  const GEMS = ['RUBY', 'SAPH', 'EMER', 'DIAM', 'BLACK'];
  const SLOT = {
    name: 'Jewels A Million',
    syms: ['WILD', 'SCAT', 'BLACK', 'DIAM', 'EMER', 'SAPH', 'RUBY'],
    gems: GEMS,
    lines: [
      [1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2], [0, 1, 2, 1, 0], [2, 1, 0, 1, 2],
      [0, 0, 1, 2, 2], [2, 2, 1, 0, 0], [1, 0, 0, 0, 1], [1, 2, 2, 2, 1], [0, 1, 1, 1, 0]
    ],
    // multiples of LINE bet (total bet / 10) for 3/4/5 of a kind
    pay: {BLACK:  [20, 100, 500], DIAM:  [12, 40, 150], EMER:  [8, 25, 80], SAPH:  [4, 12, 50], RUBY:  [3, 8, 30]},
    scatterPay: { 3: 2, 4: 10, 5: 50 },          // x total bet, anywhere
    freeSpinsBy: { 3: 8, 4: 12, 5: 20 }, freeMult: 3, // free spins: x3 on all wins, no bonus re-triggers
    // Vault Pick: tiles shuffled face-down; pick until a COLLECT. Prize values are x total bet. 'X2' doubles the vault total.
    vault: { prizes: [1, 1, 2, 2, 3, 3, 5, 8, 12], mult: 2, collects: 3 },
    // Jewel Wheel: equal-weight segments, x total bet
    wheel: [1, 2, 2, 3, 3, 4, 5, 5, 8, 10, 15, 25],
    counts: [{SCAT:  1, BLACK:  2, DIAM:  4, EMER:  7, SAPH:  9, RUBY:  11}, {WILD:  1, SCAT:  1, BLACK:  3, DIAM:  5, EMER:  7, SAPH:  8, RUBY:  9}, {WILD:  1, SCAT:  1, BLACK:  4, DIAM:  6, EMER:  7, SAPH:  7, RUBY:  8}, {WILD:  1, SCAT:  1, BLACK:  5, DIAM:  7, EMER:  7, SAPH:  7, RUBY:  6}, {SCAT:  1, BLACK:  8, DIAM:  9, EMER:  7, SAPH:  5, RUBY:  4}],
    rtpPublished: 0.9617
  };
  SLOT.freeSpins = SLOT.freeSpinsBy[3];
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  /** Fixed (deterministic) reel strips, so the paytable RTP is exact and reproducible. */
  SLOT.strips = SLOT.counts.map((cnt, ri) => {
    const arr = [];
    for (const k of Object.keys(cnt)) for (let i = 0; i < cnt[k]; i++) arr.push(k);
    const rng = mulberry32(4321 + ri * 77);
    for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
    return arr;
  });
  /** grid[reel][row]. Line wins in line-bet multiples; scatter in total-bet multiples; bonus triggers. */
  function slotEvaluate(grid) {
    const wins = []; let vault = false, wheel = null;
    for (let li = 0; li < SLOT.lines.length; li++) {
      const ln = SLOT.lines[li];
      let base = null, cnt = 0;
      for (let ri = 0; ri < 5; ri++) {
        const s = grid[ri][ln[ri]];
        if (s === 'SCAT') break;
        if (s === 'WILD') { cnt++; continue; }
        if (base === null) { base = s; cnt++; }
        else if (s === base) cnt++;
        else break;
      }
      if (cnt >= 3) {
        const sym = base || 'BLACK';
        wins.push({ line: li, sym, count: cnt, mult: SLOT.pay[sym][cnt - 3] });
        if (sym === 'BLACK') vault = true;
        if (cnt === 5 && !wheel) wheel = { line: li, why: '5 of a kind' };
      }
      if (!wheel) { // rainbow: ruby, sapphire, emerald, diamond, black diamond in order on reels 1-5 (no wilds)
        let ok = true;
        for (let ri = 0; ri < 5; ri++) if (grid[ri][ln[ri]] !== GEMS[ri]) { ok = false; break; }
        if (ok) wheel = { line: li, why: 'Rainbow line' };
      }
    }
    let sc = 0; const scPos = [];
    for (let ri = 0; ri < 5; ri++) for (let r = 0; r < 3; r++) if (grid[ri][r] === 'SCAT') { sc++; scPos.push([ri, r]); }
    const s5 = Math.min(sc, 5);
    return { wins, lineMult: wins.reduce((a, w) => a + w.mult, 0), scatters: sc, scatterPos: scPos, scatterMult: SLOT.scatterPay[s5] || 0,
      triggered: sc >= 3, freeSpins: SLOT.freeSpinsBy[s5] || 0, vault, wheel };
  }
  function slotSpin() {
    const stops = SLOT.strips.map(s => randInt(s.length));
    return { stops, grid: slotGridAt(stops) };
  }
  function slotGridAt(stops) {
    return SLOT.strips.map((s, i) => [0, 1, 2].map(r => s[(stops[i] + r) % s.length]));
  }
  /** Vault board: shuffled tiles. Returns array of {t:'P',v}|{t:'X2'}|{t:'C'}. */
  function vaultBoard(rnd) {
    const v = SLOT.vault, tiles = v.prizes.map(x => ({ t: 'P', v: x })).concat([{ t: 'X2' }]);
    for (let i = 0; i < v.collects; i++) tiles.push({ t: 'C' });
    const r = rnd || (n => randInt(n));
    for (let i = tiles.length - 1; i > 0; i--) { const j = r(i + 1); const t = tiles[i]; tiles[i] = tiles[j]; tiles[j] = t; }
    return tiles;
  }
  /** Result of revealing tiles in order until first COLLECT (x total bet). */
  function vaultResult(tiles) {
    let sum = 0, m = 1, picks = 0;
    for (const t of tiles) { picks++; if (t.t === 'C') break; if (t.t === 'X2') m = SLOT.vault.mult; else sum += t.v; }
    return { sum, mult: m, total: sum * m, picks };
  }
  /** Exact EV of the vault (x total bet). A given tile precedes all c COLLECTs w.p. 1/(c+1); a prize AND the X2 both do w.p. 2/((c+2)(c+1)). */
  function vaultEV() {
    const c = SLOT.vault.collects, S = SLOT.vault.prizes.reduce((a, b) => a + b, 0);
    return S / (c + 1) + (SLOT.vault.mult - 1) * S * 2 / ((c + 2) * (c + 1));
  }
  function wheelEV() { return SLOT.wheel.reduce((a, b) => a + b, 0) / SLOT.wheel.length; }
  function wheelSpin() { const i = randInt(SLOT.wheel.length); return { index: i, prize: SLOT.wheel[i] }; }
  /** Exact RTP by enumerating every reel-stop combination (product of strip lengths). */
  function slotRTP() {
    const idx = {}; SLOT.syms.forEach((s, i) => idx[s] = i);
    const L = SLOT.strips.map(s => s.length);
    const win = SLOT.strips.map((s, i) => s.map((_, p) => [0, 1, 2].map(r => idx[s[(p + r) % s.length]])));
    const payT = SLOT.syms.map(s => SLOT.pay[s] || null);
    const lines = SLOT.lines, WILD = idx.WILD, SCAT = idx.SCAT, BLACK = idx.BLACK;
    const RB = GEMS.map(s => idx[s]);
    let total = 0, lineSum = 0, scatSum = 0, hits = 0, vaultN = 0, wheelN = 0, fsSpins = 0;
    const trigN = { 3: 0, 4: 0, 5: 0 };
    const g = new Array(5);
    for (let a = 0; a < L[0]; a++) { g[0] = win[0][a];
      for (let b = 0; b < L[1]; b++) { g[1] = win[1][b];
        for (let c = 0; c < L[2]; c++) { g[2] = win[2][c];
          for (let d = 0; d < L[3]; d++) { g[3] = win[3][d];
            for (let e = 0; e < L[4]; e++) { g[4] = win[4][e];
              total++;
              let lm = 0, vt = false, wh = false;
              for (let li = 0; li < 10; li++) {
                const ln = lines[li]; let base = -1, cnt = 0, rb = true;
                for (let ri = 0; ri < 5; ri++) {
                  const s = g[ri][ln[ri]];
                  if (rb && s !== RB[ri]) rb = false;
                  if (cnt === ri) {
                    if (s === SCAT) { cnt = -cnt - 1; }
                    else if (s === WILD) cnt++;
                    else if (base === -1) { base = s; cnt++; } else if (s === base) cnt++; else cnt = -cnt - 1;
                  }
                }
                if (cnt < 0) cnt = -cnt - 1;
                if (cnt >= 3) { const bs = base === -1 ? BLACK : base; lm += payT[bs][cnt - 3]; if (bs === BLACK) vt = true; if (cnt === 5) wh = true; }
                if (rb) wh = true;
              }
              let sc = 0;
              for (let ri = 0; ri < 5; ri++) { const w = g[ri]; if (w[0] === SCAT) sc++; if (w[1] === SCAT) sc++; if (w[2] === SCAT) sc++; }
              const s5 = sc > 5 ? 5 : sc;
              const sm = SLOT.scatterPay[s5] || 0;
              lineSum += lm / 10; scatSum += sm;
              if (lm > 0 || sm > 0) hits++;
              if (sc >= 3) { trigN[s5]++; fsSpins += SLOT.freeSpinsBy[s5]; }
              if (vt) vaultN++;
              if (wh) wheelN++;
            }}}}}
    const lineRTP = lineSum / total, scatterRTP = scatSum / total, paidEV = lineRTP + scatterRTP;
    const freeRTP = (fsSpins / total) * SLOT.freeMult * paidEV;  // each free spin pays (line+scatter) x freeMult; bonuses don't trigger in free spins
    const vaultRTP = (vaultN / total) * vaultEV(), wheelRTP = (wheelN / total) * wheelEV();
    return { total, lineRTP, scatterRTP, freeRTP, vaultRTP, wheelRTP, rtp: paidEV + freeRTP + vaultRTP + wheelRTP,
      hitFreq: hits / total, pFree: (trigN[3] + trigN[4] + trigN[5]) / total, pVault: vaultN / total, pWheel: wheelN / total, vaultEV: vaultEV(), wheelEV: wheelEV() };
  }
  /** Play one full paid spin incl. all bonuses (auto-picks), returning total win x total bet. Used for simulation. */
  function slotPlayRound(rnd) {
    const R = rnd || (n => randInt(n));
    const grid = slotGridAt(SLOT.strips.map(s => R(s.length)));
    const ev = slotEvaluate(grid);
    let w = ev.lineMult / 10 + ev.scatterMult, fs = 0, vault = 0, wheel = 0;
    for (let i = 0; i < ev.freeSpins; i++) { const e2 = slotEvaluate(slotGridAt(SLOT.strips.map(s => R(s.length)))); fs += (e2.lineMult / 10 + e2.scatterMult) * SLOT.freeMult; }
    if (ev.vault) vault = vaultResult(vaultBoard(R)).total;
    if (ev.wheel) wheel = SLOT.wheel[R(SLOT.wheel.length)];
    return { base: w, fs, vault, wheel, total: w + fs + vault + wheel, ev };
  }

  /* ---------- Texas Hold'em engine (no-limit, side pots) ---------- */
  function equity(hole, board, opps, samples) {
    const known = hole.concat(board);
    const d = makeDeck().filter(c => !known.some(k => k.r === c.r && k.s === c.s));
    const needBoard = 5 - board.length, need = needBoard + 2 * opps;
    let won = 0;
    for (let s = 0; s < samples; s++) {
      for (let i = 0; i < need; i++) { const j = i + randInt(d.length - i); const t = d[i]; d[i] = d[j]; d[j] = t; }
      const full = board.concat(d.slice(0, needBoard));
      const mine = score7(hole.concat(full));
      let best = -1, ties = 0;
      for (let o = 0; o < opps; o++) {
        const oh = [d[needBoard + 2 * o], d[needBoard + 2 * o + 1]];
        const sc = score7(oh.concat(full));
        if (sc > best) { best = sc; ties = 1; } else if (sc === best) ties++;
      }
      if (mine > best) won += 1; else if (mine === best) won += 1 / (ties + 1);
    }
    return won / samples;
  }

  class HoldemEngine {
    /** names: array, stacks: integer chip counts, sb/bb integers. */
    constructor(opts) {
      this.sb = opts.sb; this.bb = opts.bb;
      this.players = opts.names.map((n, i) => ({ id: i, name: n, stack: opts.stacks[i], hole: [], bet: 0, total: 0, folded: false, allIn: false, acted: false, human: !!(opts.human && opts.human[i]) }));
      this.dealer = opts.dealer == null ? this.players.length - 1 : opts.dealer;
      this.board = []; this.pot = 0; this.street = 'idle'; this.currentBet = 0; this.minRaise = this.bb; this.toAct = -1;
      this.result = null; this.log = [];
    }
    get n() { return this.players.length; }
    startHand() {
      this.players.forEach(p => { p.hole = []; p.bet = 0; p.total = 0; p.folded = p.stack <= 0; p.allIn = false; p.acted = false; p.lastAction = ''; });
      this.deck = shuffle(makeDeck()); this.board = []; this.pot = 0; this.result = null; this.log = [];
      this.dealer = (this.dealer + 1) % this.n;
      for (let k = 0; k < 2; k++) for (let i = 1; i <= this.n; i++) { const p = this.players[(this.dealer + i) % this.n]; if (!p.folded) p.hole.push(this.deck.pop()); }
      const sbI = this.n === 2 ? this.dealer : (this.dealer + 1) % this.n;
      const bbI = (sbI + 1) % this.n;
      this.sbIdx = sbI; this.bbIdx = bbI;
      this._post(sbI, this.sb); this._post(bbI, this.bb);
      this.street = 'preflop'; this.currentBet = this.bb; this.minRaise = this.bb;
      this.toAct = this._next(bbI);
      this._checkSkip();
    }
    _post(i, amt) {
      const p = this.players[i]; const a = Math.min(amt, p.stack);
      p.stack -= a; p.bet += a; p.total += a; this.pot += a; if (p.stack === 0) p.allIn = true;
      return a;
    }
    _next(from) {
      for (let k = 1; k <= this.n; k++) {
        const i = (from + k) % this.n, p = this.players[i];
        if (!p.folded && !p.allIn && (!p.acted || p.bet < this.currentBet)) return i;
      }
      return -1;
    }
    _canActCount() { return this.players.filter(p => !p.folded && !p.allIn).length; }
    _checkSkip() { // nobody (or only one player) able to bet: run it out
      if (this.street === 'done') return;
      if (this.toAct !== -1 && this._canActCount() <= 1 && this.players[this.toAct].bet >= this.currentBet) {
        this._endStreet();
      }
    }
    legal() {
      const p = this.players[this.toAct];
      const toCall = Math.min(this.currentBet - p.bet, p.stack);
      const others = this.players.some((q, i) => i !== this.toAct && !q.folded && !q.allIn);
      const canRaise = p.stack > this.currentBet - p.bet && others;
      return {
        toCall, canCheck: this.currentBet - p.bet === 0, canRaise,
        minRaiseTo: Math.min(this.currentBet + this.minRaise, p.bet + p.stack), maxRaiseTo: p.bet + p.stack
      };
    }
    act(type, raiseTo) {
      if (this.street === 'done' || this.toAct < 0) throw new Error('no action pending');
      const p = this.players[this.toAct], L = this.legal();
      if (type === 'fold') { p.folded = true; p.lastAction = 'Fold'; }
      else if (type === 'call' || type === 'check') {
        const a = this._post(p.id, L.toCall); p.lastAction = L.toCall === 0 ? 'Check' : (p.allIn ? 'All-in ' + a : 'Call ' + a);
      } else if (type === 'raise') {
        if (!L.canRaise) throw new Error('cannot raise');
        let to = Math.max(L.minRaiseTo, Math.min(raiseTo, L.maxRaiseTo));
        const size = to - this.currentBet;
        this._post(p.id, to - p.bet);
        if (size >= this.minRaise) this.minRaise = size;
        const opening = this.currentBet === 0;
        this.currentBet = to;
        this.players.forEach(q => { if (q !== p && !q.folded && !q.allIn) q.acted = false; });
        p.lastAction = p.allIn ? 'All-in ' + to : (opening ? 'Bet ' : 'Raise to ') + to;
      } else throw new Error('bad action');
      p.acted = true;
      this.log.push(p.name + ': ' + p.lastAction);
      const alive = this.players.filter(q => !q.folded);
      if (alive.length === 1) { this._finishUncontested(alive[0]); return; }
      const nx = this._next(this.toAct);
      if (nx === -1) this._endStreet(); else this.toAct = nx;
      this._checkSkip();
    }
    _endStreet() {
      this.players.forEach(p => { p.bet = 0; p.acted = false; });
      this.currentBet = 0; this.minRaise = this.bb;
      if (this.street === 'river') { this._showdown(); return; }
      if (this.street === 'preflop') { this.board.push(this.deck.pop(), this.deck.pop(), this.deck.pop()); this.street = 'flop'; }
      else if (this.street === 'flop') { this.board.push(this.deck.pop()); this.street = 'turn'; }
      else if (this.street === 'turn') { this.board.push(this.deck.pop()); this.street = 'river'; }
      this.players.forEach(p => { if (!p.folded && !p.allIn) p.lastAction = ''; });
      this.toAct = this._next(this.dealer);
      if (this.toAct === -1 || this._canActCount() <= 1) this._endStreet();
    }
    _finishUncontested(w) {
      w.stack += this.pot;
      this.result = { showdown: false, pots: [{ amount: this.pot, winners: [w.id], eligible: [w.id] }], winners: [w.id] };
      this.pot = 0; this.street = 'done'; this.toAct = -1;
      this.players.forEach(p => { p.bet = 0; });
    }
    _showdown() {
      const ps = this.players;
      const levels = [...new Set(ps.filter(p => p.total > 0).map(p => p.total))].sort((a, b) => a - b);
      const scores = {};
      ps.forEach(p => { if (!p.folded) scores[p.id] = score7(p.hole.concat(this.board)); });
      const pots = []; let prev = 0;
      for (const lv of levels) {
        let amount = 0;
        ps.forEach(p => { amount += Math.min(p.total, lv) - Math.min(p.total, prev); });
        const elig = ps.filter(p => !p.folded && p.total >= lv).map(p => p.id);
        if (amount > 0) {
          if (!elig.length && pots.length) pots[pots.length - 1].amount += amount;
          else pots.push({ amount, eligible: elig });
        }
        prev = lv;
      }
      const winnersAll = new Set();
      for (const pot of pots) {
        let best = -1, w = [];
        pot.eligible.forEach(id => { const s = scores[id]; if (s > best) { best = s; w = [id]; } else if (s === best) w.push(id); });
        const share = Math.floor(pot.amount / w.length); let odd = pot.amount - share * w.length;
        // odd chips go to winners in order starting left of the dealer
        const ordered = w.slice().sort((a, b) => ((a - this.dealer - 1 + this.n) % this.n) - ((b - this.dealer - 1 + this.n) % this.n));
        ordered.forEach(id => { ps[id].stack += share + (odd > 0 ? 1 : 0); if (odd > 0) odd--; winnersAll.add(id); });
        pot.winners = w; pot.score = best; pot.handName = describe(best);
      }
      this.result = { showdown: true, pots, winners: [...winnersAll], scores };
      this.pot = 0; this.street = 'done'; this.toAct = -1;
    }
  }

  /** Simple Monte-Carlo-equity AI. Returns {type, raiseTo}. */
  function holdemDecide(eng, idx, samples) {
    samples = samples || 110;
    const p = eng.players[idx], L = eng.legal();
    const opps = eng.players.filter((q, i) => i !== idx && !q.folded).length;
    const eq = equity(p.hole, eng.board, opps, samples);
    const need = eng.currentBet - p.bet;
    const potOdds = need > 0 ? need / (eng.pot + need) : 0;
    const base = 1 / (opps + 1);
    const style = p.style || 1;
    const raiseThr = base + (1 - base) * 0.32 / style;
    const callThr = Math.max(potOdds + 0.04, base * 0.85);
    const r = randFloat();
    const round = x => Math.max(eng.sb, Math.round(x / eng.sb) * eng.sb);
    if (need === 0) {
      if (L.canRaise && ((eq > raiseThr && r < 0.7) || (eq > base * 0.7 && r < 0.05 * style))) {
        return { type: 'raise', raiseTo: eng.currentBet + round(eng.pot * (0.45 + 0.4 * randFloat())) };
      }
      return { type: 'check' };
    }
    if (eq > raiseThr + 0.1 && L.canRaise && r < 0.45 * style) return { type: 'raise', raiseTo: eng.currentBet + Math.max(eng.minRaise, round(eng.pot * 0.7)) };
    if (eq >= callThr) return { type: 'call' };
    if (need <= eng.bb && eq > base * 0.6 && r < 0.2) return { type: 'call' };
    return { type: 'fold' };
  }

  return {
    SUITS, RED, rankLabel, RANK_NAMES, randInt, randFloat, makeDeck, shuffle, makeShoe, cardStr,
    HAND_NAMES, score5, score7, categoryOf, describe, eval5, DRAW_PAYTABLE, drawPayout,
    bjCardVal, bjValue, bjIsBlackjack, bjDealerShouldHit, bjSettle,
    bacVal, bacTot, bacNeed, bacPlay, bacReturn, bacExact,
    SLOT, slotEvaluate, slotSpin, slotGridAt, slotRTP, vaultBoard, vaultResult, vaultEV, wheelEV, wheelSpin, slotPlayRound,
    equity, HoldemEngine, holdemDecide
  };
});
