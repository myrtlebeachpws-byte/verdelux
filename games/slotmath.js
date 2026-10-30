/* Verdelux data-driven slot engine — math core (theme configs, evaluation, exact RTP, round simulation).
   Pure JS, no DOM: runs in the browser (window.SlotMath) and in node (require). Virtual coins only. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SlotMath = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const LINES5 = [[1,1,1,1,1],[0,0,0,0,0],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2],[0,0,1,2,2],[2,2,1,0,0],[1,0,0,0,1],[1,2,2,2,1],[0,1,1,1,0]];
  const LINES3 = [[1,1,1],[0,0,0],[2,2,2],[0,1,2],[2,1,0]];

  /* ---------------- theme configs ----------------
     pay: multiples of LINE bet (total ÷ lines) for 3/4/5 (5-reel) or 3 (3-reel) of a kind.
     scatterPay / bonus prizes: multiples of TOTAL bet.  counts: symbols per reel strip. */
  const THEMES = [
    { id: 'pharaoh', name: "Pharaoh's Gold", badge: 'NEW', tagline: '5×3 · 10 lines · Free Spins ×3 with sticky-free fun.',
      reels: 5, rows: 3, lines: LINES5, top: 'MASK', wild: 'WILD', wildReels: [1, 2, 3], scatter: 'SCAT',
      syms: { MASK: 'Golden Mask', EYE: 'Eye of Horus', SCARAB: 'Scarab', ANKH: 'Ankh', PYR: 'Pyramid', LOTUS: 'Lotus', WILD: 'Wild Cartouche', SCAT: 'Sun Disc' },
      pay: { MASK: [50, 200, 1000], EYE: [30, 100, 400], SCARAB: [20, 60, 200], ANKH: [12, 30, 120], PYR: [8, 20, 80], LOTUS: [6, 15, 50] },
      scatterPay: { 3: 2, 4: 10, 5: 50 },
      bonus: { type: 'freespins', label: 'Tomb Free Spins', spinsBy: { 3: 10, 4: 15, 5: 25 }, mult: 3 },
      counts: [{ SCAT: 1, MASK: 2, EYE: 3, SCARAB: 4, ANKH: 6, PYR: 7, LOTUS: 9 }, { WILD: 1, SCAT: 1, MASK: 2, EYE: 3, SCARAB: 4, ANKH: 6, PYR: 7, LOTUS: 8 },
        { WILD: 1, SCAT: 1, MASK: 2, EYE: 3, SCARAB: 5, ANKH: 6, PYR: 7, LOTUS: 7 }, { WILD: 1, SCAT: 1, MASK: 3, EYE: 4, SCARAB: 5, ANKH: 6, PYR: 6, LOTUS: 6 }, { SCAT: 1, MASK: 4, EYE: 5, SCARAB: 5, ANKH: 6, PYR: 5, LOTUS: 5 }],
      cel: { big: 'BIG WIN', mega: 'MEGA WIN', epic: "PHARAOH'S FORTUNE!" },
      colors: { bg1: '#3a2a08', bg2: '#140c02', reel: '#2a1c05', accent: '#ffcf4a', glow: '#ff9f1a', sub: '#ffe9a8' } },

    { id: 'goldrush', name: 'Gold Rush Gulch', badge: 'HOT', tagline: '5×3 · 10 lines · Dynamite Pick-em mine bonus.',
      reels: 5, rows: 3, lines: LINES5, top: 'NUGGET', wild: 'WILD', wildReels: [1, 2, 3], scatter: 'TNT',
      syms: { NUGGET: 'Gold Nugget', SHERIFF: 'Sheriff Star', REVOLVER: 'Revolver', BOOT: 'Cowboy Boot', LANTERN: 'Lantern', PAN: 'Gold Pan', WILD: 'Wanted Wild', TNT: 'Dynamite' },
      pay: { NUGGET: [40, 175, 700], SHERIFF: [25, 90, 250], REVOLVER: [18, 50, 175], BOOT: [10, 25, 90], LANTERN: [7, 18, 60], PAN: [5, 14, 45] },
      scatterPay: { 3: 2, 4: 8, 5: 30 },
      bonus: { type: 'pick', label: 'Dynamite Mine Pick', prizes: [2, 2, 3, 4, 5, 8, 10, 12, 15, 25], mult: 3, collects: 3, multBy: { 3: 1, 4: 2, 5: 5 } },
      counts: [{ TNT: 1, NUGGET: 2, SHERIFF: 3, REVOLVER: 4, BOOT: 6, LANTERN: 7, PAN: 9 }, { WILD: 1, TNT: 1, NUGGET: 2, SHERIFF: 3, REVOLVER: 4, BOOT: 6, LANTERN: 7, PAN: 8 },
        { WILD: 1, TNT: 1, NUGGET: 2, SHERIFF: 3, REVOLVER: 5, BOOT: 6, LANTERN: 7, PAN: 7 }, { WILD: 1, TNT: 1, NUGGET: 3, SHERIFF: 4, REVOLVER: 5, BOOT: 6, LANTERN: 6, PAN: 6 }, { TNT: 1, NUGGET: 4, SHERIFF: 5, REVOLVER: 5, BOOT: 6, LANTERN: 5, PAN: 5 }],
      cel: { big: 'BIG STRIKE', mega: 'MOTHER LODE', epic: 'GOLD RUSH!' },
      colors: { bg1: '#4a2410', bg2: '#1a0b04', reel: '#2e170a', accent: '#f2b84b', glow: '#e06a1b', sub: '#ffd9a0' } },

    { id: 'deepsea', name: 'Deep Sea Doubloons', badge: 'NEW', tagline: '5×3 · 10 lines · Hold & Spin coin respins, Grand 500×.',
      reels: 5, rows: 3, lines: LINES5, top: 'CHEST', wild: 'WILD', wildReels: [1, 2, 3], scatter: null, coin: 'COIN',
      syms: { CHEST: 'Treasure Chest', SHIP: 'Pirate Ship', SKULL: 'Jolly Roger', ANCHOR: 'Anchor', SHELL: 'Pearl Shell', COMPASS: 'Compass', WILD: 'Kraken Wild', COIN: 'Doubloon' },
      pay: { CHEST: [60, 250, 1000], SHIP: [40, 125, 400], SKULL: [25, 75, 250], ANCHOR: [15, 40, 125], SHELL: [10, 25, 90], COMPASS: [8, 20, 60] },
      scatterPay: {},
      bonus: { type: 'hold', label: 'Doubloon Hold & Spin', trigger: 6, respins: 3, pNew: 0.14, values: [1, 1, 1, 2, 2, 2, 3, 3, 5, 10, 25, 50], named: { 25: 'MINOR', 50: 'MAJOR' }, grand: 500 },
      counts: [{ COIN: 4, CHEST: 2, SHIP: 3, SKULL: 4, ANCHOR: 6, SHELL: 7, COMPASS: 9 }, { WILD: 1, COIN: 4, CHEST: 2, SHIP: 3, SKULL: 4, ANCHOR: 6, SHELL: 7, COMPASS: 8 },
        { WILD: 1, COIN: 4, CHEST: 2, SHIP: 3, SKULL: 5, ANCHOR: 6, SHELL: 7, COMPASS: 7 }, { WILD: 1, COIN: 4, CHEST: 3, SHIP: 4, SKULL: 5, ANCHOR: 6, SHELL: 6, COMPASS: 6 }, { COIN: 4, CHEST: 4, SHIP: 5, SKULL: 5, ANCHOR: 6, SHELL: 5, COMPASS: 5 }],
      cel: { big: 'BIG BOOTY', mega: 'MEGA PLUNDER', epic: "DAVY JONES' HOARD!" },
      colors: { bg1: '#06364a', bg2: '#020f1a', reel: '#04202e', accent: '#ffd36b', glow: '#22c3e6', sub: '#bff3ff' } },

    { id: 'dragon', name: "Dragon's Fortune", badge: 'HOT', tagline: '5×3 · 10 lines · Expanding Dragon Wilds + Fortune Wheel.',
      reels: 5, rows: 3, lines: LINES5, top: 'DRAGON', wild: 'WILD', wildReels: [1, 2, 3], expanding: true, scatter: 'PEARL',
      syms: { DRAGON: 'Golden Dragon', LANT: 'Red Lantern', INGOT: 'Gold Ingot', KOI: 'Koi', FAN: 'Fan', COINS: 'Lucky Coins', WILD: 'Dragon Wild', PEARL: 'Fortune Pearl' },
      pay: { DRAGON: [35, 130, 500], LANT: [20, 65, 200], INGOT: [13, 40, 130], KOI: [8, 20, 65], FAN: [5, 13, 40], COINS: [3, 8, 30] },
      scatterPay: { 3: 2, 4: 10, 5: 40 },
      bonus: { type: 'wheel', label: 'Fortune Wheel', segs: [3, 5, 5, 8, 8, 10, 12, 15, 20, 25, 50, 88], multBy: { 3: 1, 4: 2, 5: 5 } },
      counts: [{ PEARL: 1, DRAGON: 2, LANT: 3, INGOT: 4, KOI: 6, FAN: 7, COINS: 9 }, { WILD: 1, PEARL: 1, DRAGON: 2, LANT: 3, INGOT: 4, KOI: 6, FAN: 8, COINS: 9 },
        { WILD: 1, PEARL: 1, DRAGON: 2, LANT: 3, INGOT: 5, KOI: 6, FAN: 8, COINS: 8 }, { WILD: 1, PEARL: 1, DRAGON: 3, LANT: 4, INGOT: 5, KOI: 6, FAN: 7, COINS: 7 }, { PEARL: 1, DRAGON: 4, LANT: 5, INGOT: 5, KOI: 6, FAN: 6, COINS: 6 }],
      cel: { big: 'BIG FORTUNE', mega: 'MEGA FORTUNE', epic: 'DRAGON EMPEROR!' },
      colors: { bg1: '#5a0a12', bg2: '#1c0205', reel: '#33060b', accent: '#ffcf4a', glow: '#ff3b3b', sub: '#ffd0c0' } },

    { id: 'neon777', name: 'Neon 777', badge: 'NEW', tagline: 'Classic 3 reels · 5 lines · 2× / 3× multiplier wilds (up to 9×).',
      reels: 3, rows: 3, lines: LINES3, top: 'SEVEN', wild: 'WILD2', wilds: { WILD2: 2, WILD3: 3 }, wildReels: [0, 1, 2], scatter: null,
      syms: { SEVEN: 'Neon 7', BAR3: 'Triple Bar', BAR2: 'Double Bar', BAR: 'Bar', BELL: 'Bell', CHERRY: 'Cherry', WILD2: '2× Wild', WILD3: '3× Wild', BLANK: 'Blank' },
      pay: { SEVEN: [100], BAR3: [33], BAR2: [22], BAR: [12], BELL: [6], CHERRY: [3] },
      scatterPay: {}, bonus: { type: 'multwild', label: 'Multiplier Wilds' },
      counts: [{ WILD2: 1, WILD3: 1, SEVEN: 2, BAR3: 3, BAR2: 4, BAR: 5, BELL: 6, CHERRY: 6, BLANK: 16 }, { WILD2: 1, WILD3: 1, SEVEN: 2, BAR3: 3, BAR2: 4, BAR: 5, BELL: 6, CHERRY: 6, BLANK: 16 }, { WILD2: 1, WILD3: 1, SEVEN: 2, BAR3: 3, BAR2: 4, BAR: 5, BELL: 6, CHERRY: 6, BLANK: 16 }],
      cel: { big: 'BIG WIN', mega: 'NEON MEGA', epic: 'JACKPOT 777!' },
      colors: { bg1: '#2a0a4a', bg2: '#08021a', reel: '#120626', accent: '#ff3bd4', glow: '#22e6ff', sub: '#ffb3f2' } },

    { id: 'royal', name: 'Black Diamond Royale', badge: 'VIP', vip: 'Black Diamond', tagline: 'Members-only · 3 reels · 5 lines · 2×/5× wilds + Crown Wheel.',
      reels: 3, rows: 3, lines: LINES3, top: 'BLACKD', wild: 'WILD2', wilds: { WILD2: 2, WILD5: 5 }, wildReels: [0, 1, 2], scatter: 'CROWN',
      syms: { BLACKD: 'Black Diamond', SCEPTER: 'Scepter', RING: 'Signet Ring', ORB: 'Royal Orb', CHAL: 'Chalice', WILD2: '2× Wild', WILD5: '5× Wild', CROWN: 'Crown', BLANK: 'Blank' },
      pay: { BLACKD: [100], SCEPTER: [25], RING: [14], ORB: [7], CHAL: [3] },
      scatterPay: { 3: 5 },
      bonus: { type: 'wheel', label: 'Crown Wheel', segs: [10, 15, 20, 25, 30, 40, 50, 75, 100, 250], multBy: { 3: 1 } },
      counts: [{ CROWN: 1, WILD2: 1, WILD5: 1, BLACKD: 2, SCEPTER: 3, RING: 4, ORB: 5, CHAL: 6, BLANK: 27 }, { CROWN: 1, WILD2: 1, WILD5: 1, BLACKD: 2, SCEPTER: 3, RING: 4, ORB: 5, CHAL: 6, BLANK: 27 }, { CROWN: 1, WILD2: 1, WILD5: 1, BLACKD: 2, SCEPTER: 3, RING: 4, ORB: 5, CHAL: 6, BLANK: 27 }],
      cel: { big: 'ROYAL WIN', mega: 'MEGA ROYALE', epic: 'BLACK DIAMOND!' },
      colors: { bg1: '#1d1d2e', bg2: '#050509', reel: '#0d0d18', accent: '#e8e4ff', glow: '#b89cff', sub: '#e8e4ff' } }
  ];

  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  /** Fixed reel strips: deterministic shuffle, then re-spaced so special symbols never sit within 3 stops of each other. */
  function buildStrips(T) {
    return T.counts.map((cnt, ri) => {
      const special = k => k === T.scatter || k === T.coin || isWild(T, k);
      const sp = [], rest = [];
      for (const k of Object.keys(cnt)) for (let i = 0; i < cnt[k]; i++) (special(k) && k !== T.coin ? sp : rest).push(k);
      const rng = mulberry32(9001 + ri * 131 + T.id.length * 7);
      const sh = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
      sh(rest); sh(sp);
      const L = sp.length + rest.length, out = rest.slice();
      sp.forEach((k, i) => out.splice(Math.floor((i + 0.5) * L / sp.length) % (out.length + 1), 0, k));
      return out;
    });
  }
  function isWild(T, s) { return T.wilds ? s in T.wilds : s === T.wild; }
  function wildMult(T, s) { return T.wilds ? (T.wilds[s] || 1) : 1; }
  THEMES.forEach(T => { T.strips = buildStrips(T); T.minCount = T.reels === 3 ? 3 : 3; });

  /** Window for reel ri at stop p, with expanding wilds applied. */
  function windowAt(T, ri, p) {
    const s = T.strips[ri], w = [0, 1, 2].map(r => s[(p + r) % s.length]);
    if (T.expanding && T.wildReels.includes(ri) && w.some(x => isWild(T, x))) return [T.wild, T.wild, T.wild];
    return w;
  }
  function gridAt(T, stops) { return stops.map((p, ri) => windowAt(T, ri, p)); }
  function rawGridAt(T, stops) { return stops.map((p, ri) => { const s = T.strips[ri]; return [0, 1, 2].map(r => s[(p + r) % s.length]); }); }

  /** Pay of a single line (array of symbols), as multiple of line bet. Returns {pay, sym, count, mult}. */
  function linePay(T, seq) {
    const n = seq.length; let best = { pay: 0, sym: null, count: 0, mult: 1 };
    // run of leading wilds (pays as top symbol)
    let w = 0, wm = 1; while (w < n && isWild(T, seq[w])) { wm *= wildMult(T, seq[w]); w++; }
    if (w >= 3 && T.pay[T.top]) { const p = T.pay[T.top][w - 3] * wm; if (p > best.pay) best = { pay: p, sym: T.top, count: w, mult: wm }; }
    const base = seq.find(x => !isWild(T, x));
    if (base && T.pay[base]) {
      let c = 0, m = 1; while (c < n && (seq[c] === base || isWild(T, seq[c]))) { m *= wildMult(T, seq[c]); c++; }
      if (c >= 3) { const p = T.pay[base][c - 3] * m; if (p > best.pay) best = { pay: p, sym: base, count: c, mult: m }; }
    }
    return best;
  }
  /** Evaluate a visible grid (grid[reel][row], expansion already applied). */
  function evaluate(T, grid) {
    const wins = [];
    T.lines.forEach((ln, li) => { const r = linePay(T, ln.map((row, ri) => grid[ri][row])); if (r.pay > 0) wins.push(Object.assign({ line: li }, r)); });
    let sc = 0, coins = 0; const scPos = [], coinPos = [];
    grid.forEach((col, ri) => col.forEach((s, r) => { if (T.scatter && s === T.scatter) { sc++; scPos.push([ri, r]); } if (T.coin && s === T.coin) { coins++; coinPos.push([ri, r]); } }));
    const B = T.bonus; const nSc = Math.min(sc, 5);
    return { wins, lineMult: wins.reduce((a, w) => a + w.pay, 0), scatters: sc, scatterPos: scPos, scatterMult: T.scatterPay[nSc] || 0,
      coins, coinPos,
      freeSpins: B.type === 'freespins' && sc >= 3 ? B.spinsBy[nSc] : 0,
      pick: B.type === 'pick' && sc >= 3 ? B.multBy[nSc] : 0,
      wheel: B.type === 'wheel' && sc >= 3 ? B.multBy[nSc] : 0,
      hold: B.type === 'hold' && coins >= B.trigger };
  }

  /* ---------------- bonus closed forms ---------------- */
  function pickEV(B) { const c = B.collects, S = B.prizes.reduce((a, b) => a + b, 0); return S / (c + 1) + (B.mult - 1) * S * 2 / ((c + 2) * (c + 1)); }
  function wheelEV(B) { return B.segs.reduce((a, b) => a + b, 0) / B.segs.length; }
  /** Hold & spin: exact DP on (coins, respins left). Returns {ev(k0), pGrand(k0)} in total-bet units. */
  function holdStats(B, cells) {
    cells = cells || 15; const mu = B.values.reduce((a, b) => a + b, 0) / B.values.length, q = B.pNew;
    const binom = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return r; };
    const memo = {};
    const EK = (k, r) => { // returns [E[final k], P(full)]
      if (k >= cells) return [cells, 1]; if (r === 0) return [k, 0];
      const key = k + ',' + r; if (memo[key]) return memo[key];
      const e = cells - k; let a = 0, b = 0;
      for (let j = 0; j <= e; j++) { const p = binom(e, j) * Math.pow(q, j) * Math.pow(1 - q, e - j); const [x, y] = j === 0 ? EK(k, r - 1) : EK(k + j, B.respins); a += p * x; b += p * y; }
      return (memo[key] = [a, b]);
    };
    return { mu, at(k) { const [x, y] = EK(k, B.respins); return { ev: mu * x + B.grand * y, pGrand: y, eK: x }; } };
  }
  function bonusValue(T, ev) {
    const B = T.bonus;
    if (B.type === 'pick' && ev.pick) return ev.pick * pickEV(B);
    if (B.type === 'wheel' && ev.wheel) return ev.wheel * wheelEV(B);
    if (B.type === 'hold' && ev.hold) return holdStats(B).at(ev.coins).ev;
    return 0;
  }

  /* ---------------- exact RTP ----------------
     Reels are independent and every stop is equally likely, so the expectation over all ∏L stop combinations
     equals the sum over per-reel symbol distributions. Line pay per line uses that line's (reel,row) marginals;
     scatter/coin counts use the convolution of per-reel count distributions. Exact (no sampling). */
  function exactRTP(T) {
    const R = T.reels, L = T.strips.map(s => s.length), nl = T.lines.length;
    // marginal symbol distribution per reel/row
    const marg = []; for (let ri = 0; ri < R; ri++) { marg[ri] = [0, 1, 2].map(() => ({})); for (let p = 0; p < L[ri]; p++) { const w = windowAt(T, ri, p); w.forEach((s, r) => { marg[ri][r][s] = (marg[ri][r][s] || 0) + 1 / L[ri]; }); } }
    let lineEV = 0, hitTuple = 0;
    for (const ln of T.lines) {
      const ds = ln.map((row, ri) => Object.entries(marg[ri][row]));
      const rec = (ri, seq, pr) => { if (ri === R) { lineEV += pr * linePay(T, seq).pay; return; } for (const [s, p] of ds[ri]) { seq[ri] = s; rec(ri + 1, seq, pr * p); } };
      rec(0, [], 1);
    }
    lineEV /= nl; // in total-bet units
    // count distributions
    const conv = key => { let d = [1]; for (let ri = 0; ri < R; ri++) { const c = []; for (let p = 0; p < L[ri]; p++) { const n = windowAt(T, ri, p).filter(s => s === key).length; c[n] = (c[n] || 0) + 1 / L[ri]; } const nd = []; d.forEach((a, i) => c.forEach((b, j) => { if (b) nd[i + j] = (nd[i + j] || 0) + a * (b || 0); })); d = nd; } return d.map(x => x || 0); };
    const scD = T.scatter ? conv(T.scatter) : [1], coinD = T.coin ? conv(T.coin) : [1];
    let scatEV = 0; scD.forEach((p, n) => { scatEV += p * (T.scatterPay[Math.min(n, 5)] || 0); });
    const paidEV = lineEV + scatEV, B = T.bonus; let bonusEV = 0, pBonus = 0;
    if (B.type === 'freespins') scD.forEach((p, n) => { if (n >= 3) { pBonus += p; bonusEV += p * B.spinsBy[Math.min(n, 5)] * B.mult * paidEV; } });
    if (B.type === 'pick') scD.forEach((p, n) => { if (n >= 3) { pBonus += p; bonusEV += p * B.multBy[Math.min(n, 5)] * pickEV(B); } });
    if (B.type === 'wheel') scD.forEach((p, n) => { if (n >= 3) { pBonus += p; bonusEV += p * B.multBy[Math.min(n, 5)] * wheelEV(B); } });
    let pGrand = 0;
    if (B.type === 'hold') { const H = holdStats(B); coinD.forEach((p, n) => { if (n >= B.trigger) { pBonus += p; const h = H.at(n); bonusEV += p * h.ev; pGrand += p * h.pGrand; } }); }
    const combos = L.reduce((a, b) => a * b, 1);
    return { rtp: paidEV + bonusEV, line: lineEV, scatter: scatEV, bonus: bonusEV, pBonus, pGrand, combos, strips: L };
  }
  /** Brute-force enumeration over every stop combination (feasible for 3-reel themes; used by tests to verify exactRTP). */
  function bruteRTP(T) {
    const L = T.strips.map(s => s.length), R = T.reels; let tot = 0, n = 0, paid = 0; const st = new Array(R).fill(0), bonusEVs = [];
    const rec = ri => { if (ri === R) { const ev = evaluate(T, gridAt(T, st)); const pd = ev.lineMult / T.lines.length + ev.scatterMult; paid += pd; tot += pd; bonusEVs.push(ev); n++; return; } for (let p = 0; p < L[ri]; p++) { st[ri] = p; rec(ri + 1); } };
    rec(0);
    const paidEV = paid / n; let b = 0;
    for (const ev of bonusEVs) { if (ev.freeSpins) b += ev.freeSpins * T.bonus.mult * paidEV; else b += bonusValue(T, ev); }
    return (tot + b) / n;
  }

  /* ---------------- live play helpers (used by UI and simulation) ---------------- */
  function spinStops(T, R) { return T.strips.map(s => R(s.length)); }
  function pickBoard(B, R) { const t = B.prizes.map(v => ({ t: 'P', v })).concat([{ t: 'X' }]); for (let i = 0; i < B.collects; i++) t.push({ t: 'C' }); for (let i = t.length - 1; i > 0; i--) { const j = R(i + 1); [t[i], t[j]] = [t[j], t[i]]; } return t; }
  function pickResult(B, tiles) { let s = 0, m = 1; for (const t of tiles) { if (t.t === 'C') break; if (t.t === 'X') m = B.mult; else s += t.v; } return s * m; }
  function coinValue(B, R) { return B.values[R(B.values.length)]; }
  /** Full hold & spin given starting coin positions; returns {cells:[{v}|null]*15, respinsLog, total}. rng01: ()=>[0,1). */
  function holdPlay(B, startIdx, R, rng01) {
    const cells = new Array(15).fill(null); startIdx.forEach(i => cells[i] = coinValue(B, R));
    const steps = []; let r = B.respins;
    while (r > 0 && cells.some(c => c === null)) {
      const add = []; cells.forEach((c, i) => { if (c === null && rng01() < B.pNew) add.push(i); });
      add.forEach(i => cells[i] = coinValue(B, R)); steps.push(add.map(i => [i, cells[i]]));
      r = add.length ? B.respins : r - 1;
    }
    const full = cells.every(c => c !== null);
    return { cells, steps, full, total: cells.reduce((a, c) => a + (c || 0), 0) + (full ? B.grand : 0) };
  }
  /** One complete paid round in total-bet units, for simulation. */
  function playRound(T, R, rng01) {
    const ev = evaluate(T, gridAt(T, spinStops(T, R))), B = T.bonus;
    const base = ev.lineMult / T.lines.length + ev.scatterMult; let bonus = 0;
    for (let i = 0; i < ev.freeSpins; i++) { const e2 = evaluate(T, gridAt(T, spinStops(T, R))); bonus += (e2.lineMult / T.lines.length + e2.scatterMult) * B.mult; }
    if (ev.pick) bonus += ev.pick * pickResult(B, pickBoard(B, R));
    if (ev.wheel) bonus += ev.wheel * B.segs[R(B.segs.length)];
    if (ev.hold) { const idx = ev.coinPos.map(([ri, r]) => ri * 3 + r); bonus += holdPlay(B, idx, R, rng01).total; }
    return { base, bonus, total: base + bonus };
  }
  const byId = {}; THEMES.forEach(T => byId[T.id] = T);
  return { THEMES, byId, buildStrips, evaluate, gridAt, rawGridAt, windowAt, linePay, exactRTP, bruteRTP, pickEV, wheelEV, holdStats, pickBoard, pickResult, holdPlay, coinValue, spinStops, playRound, isWild, wildMult, mulberry32 };
});
