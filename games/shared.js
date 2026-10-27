/* Shared UI helpers for the game modules. */
(function () {
  'use strict';
  const C = window.Core;
  const sleep = ms => new Promise(r => setTimeout(r, App.state.reduceMotion ? Math.min(ms, 60) : ms));
  const LEVELS = { GC: [100, 500, 1000, 5000, 10000], SC: [1, 2, 5, 10, 25] };

  function card(c, o) {
    o = o || {};
    const el = document.createElement('div');
    el.className = 'card' + (o.down ? ' down' : '') + (c && C.RED[c.s] ? ' red' : '') + (o.cls ? ' ' + o.cls : '');
    if (!o.down && c) {
      const r = C.rankLabel(c.r);
      el.innerHTML = `<span class="c-tl">${r}<i>${c.s}</i></span><span class="c-mid">${c.s}</span><span class="c-br">${r}<i>${c.s}</i></span>`;
      el.setAttribute('aria-label', C.RANK_NAMES[c.r] + ' of ' + ({ '♠': 'spades', '♥': 'hearts', '♦': 'diamonds', '♣': 'clubs' })[c.s]);
    } else el.setAttribute('aria-label', 'face-down card');
    return el;
  }
  /** Card flip-reveal: face-down -> face-up */
  function reveal(el, c) {
    const n = card(c, { cls: el.className.replace(/\b(card|down|red)\b/g, '').trim() });
    el.className = n.className + ' flip'; el.innerHTML = n.innerHTML; el.setAttribute('aria-label', n.getAttribute('aria-label'));
  }

  function bump(el) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }

  /** − / + bet selector persisted per game & currency. */
  function betStepper(host, o) {
    const st = App.state;
    const api = {
      levels() { return (o.levels && o.levels[st.cur]) || LEVELS[st.cur]; },
      idx() { st.betIdx[o.key] = st.betIdx[o.key] || {}; let i = st.betIdx[o.key][st.cur]; if (i == null) i = o.defIdx == null ? 1 : o.defIdx; return Math.min(Math.max(i, 0), this.levels().length - 1); },
      get() { return this.levels()[this.idx()]; },
      set(i) { st.betIdx[o.key] = st.betIdx[o.key] || {}; st.betIdx[o.key][st.cur] = Math.min(Math.max(i, 0), this.levels().length - 1); App.save(); this.draw(); if (o.onChange) o.onChange(this.get()); },
      disabled: false,
      setDisabled(b) { this.disabled = b; host.querySelectorAll('button').forEach(x => x.disabled = b); },
      draw() {
        host.className = 'bet-stepper';
        host.innerHTML = `<button class="step" data-d="-1" aria-label="Decrease bet">−</button>
          <div class="bet-val"><span class="coin coin-${st.cur.toLowerCase()}"></span><b>${App.wallet.fmt(this.get())}</b><small>${o.label || 'BET'}</small></div>
          <button class="step" data-d="1" aria-label="Increase bet">+</button>
          <button class="step max" data-d="max">MAX</button>`;
        host.querySelectorAll('button').forEach(b => b.onclick = () => {
          const d = b.dataset.d; if (d === 'max') this.set(this.levels().length - 1); else this.set(this.idx() + (+d));
        });
        if (this.disabled) this.setDisabled(true);
      }
    };
    api.draw();
    App.on('cur', () => { api.draw(); if (o.onChange) o.onChange(api.get()); });
    return api;
  }

  /* ---- slot / lobby symbol art (inline SVG, 64x64) ---- */
  const defs = `<defs>
    <linearGradient id="gGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff0b0"/><stop offset=".5" stop-color="#e2b93b"/><stop offset="1" stop-color="#9b7314"/></linearGradient>
    <linearGradient id="gEm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7ef0b8"/><stop offset=".5" stop-color="#14b36f"/><stop offset="1" stop-color="#075c3b"/></linearGradient>
    <linearGradient id="gEm2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b6ffd9"/><stop offset="1" stop-color="#16a46a"/></linearGradient></defs>`;
  const SYMS = {
    GEM: `<polygon points="32,5 55,18 55,46 32,59 9,46 9,18" fill="url(#gEm)" stroke="#d4af37" stroke-width="2.5"/><polygon points="32,15 46,23 46,41 32,49 18,41 18,23" fill="url(#gEm2)" opacity=".85"/><path d="M32 5v10M55 18l-9 5M55 46l-9-5M32 59V49M9 46l9-5M9 18l9 5" stroke="#d4af37" stroke-width="1.4" opacity=".8"/><path d="M24 24l8-5" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".8"/>`,
    CROWN: `<path d="M9 47L7 19l15 13 10-19 10 19 15-13-2 28z" fill="url(#gGold)" stroke="#7a5a0c" stroke-width="2" stroke-linejoin="round"/><rect x="9" y="47" width="46" height="8" rx="2" fill="url(#gGold)" stroke="#7a5a0c" stroke-width="2"/><circle cx="32" cy="12" r="3.5" fill="#34d399" stroke="#7a5a0c"/><circle cx="7" cy="18" r="3" fill="#34d399" stroke="#7a5a0c"/><circle cx="57" cy="18" r="3" fill="#34d399" stroke="#7a5a0c"/><circle cx="32" cy="39" r="4" fill="#0f8f5b" stroke="#fff3b8"/>`,
    SEVEN: `<text x="32" y="52" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-weight="900" font-size="58" fill="url(#gGold)" stroke="#6b4a00" stroke-width="2.2" paint-order="stroke">7</text>`,
    CLOVER: `<g fill="url(#gEm)" stroke="#d4af37" stroke-width="2"><circle cx="23" cy="23" r="12"/><circle cx="41" cy="23" r="12"/><circle cx="23" cy="40" r="12"/><circle cx="41" cy="40" r="12"/></g><path d="M32 32q2 14 12 26" stroke="#d4af37" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="32" cy="32" r="4" fill="#d4af37"/>`,
    WILD: `<polygon points="32,3 40,22 60,24 45,38 49,59 32,48 15,59 19,38 4,24 24,22" fill="url(#gGold)" stroke="#7a5a0c" stroke-width="2" stroke-linejoin="round"/><text x="32" y="38" text-anchor="middle" font-family="Arial,sans-serif" font-weight="900" font-size="13" fill="#064e3b">WILD</text>`,
    SCAT: `<circle cx="32" cy="32" r="27" fill="url(#gGold)" stroke="#7a5a0c" stroke-width="3"/><circle cx="32" cy="32" r="21" fill="#0b5d3f" stroke="#fff0b0" stroke-width="2"/><polygon points="32,15 47,24 47,40 32,49 17,40 17,24" fill="none" stroke="#fff0b0" stroke-width="2.4"/><text x="32" y="37" text-anchor="middle" font-family="Arial,sans-serif" font-weight="900" font-size="12" fill="#fff0b0">BONUS</text>`
  };
  ['A', 'K', 'Q', 'J'].forEach((l, i) => {
    const col = ['#f5d77a', '#7ef0b8', '#9fe4ff', '#d9b3ff'][i];
    SYMS[l] = `<text x="32" y="50" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-weight="900" font-size="50" fill="${col}" stroke="#04140f" stroke-width="2" paint-order="stroke">${l}</text>`;
  });

  /* ---- Jewels A Million gem symbols (faceted SVG) ---- */
  const GEMCOL = { // light, mid, dark, deep, edge
    RUBY: ['#ffd0d6', '#ff3b5c', '#b3002a', '#5c0016', '#ffe3a3'],
    SAPH: ['#d4e6ff', '#3f7dff', '#1636b8', '#0a1a5c', '#dce9ff'],
    EMER: ['#ccffe6', '#22d47f', '#078a4f', '#03432a', '#e6ffef'],
    DIAM: ['#ffffff', '#dff4ff', '#9fd2f0', '#5f95bf', '#ffffff'],
    BLACK: ['#8a86a6', '#3a3550', '#191626', '#06050c', '#c9c2ff']
  };
  function glint(x, y, r, col) { return `<path class="glint" d="M${x} ${y - r}L${x + r * .22} ${y - r * .22}L${x + r} ${y}L${x + r * .22} ${y + r * .22}L${x} ${y + r}L${x - r * .22} ${y + r * .22}L${x - r} ${y}L${x - r * .22} ${y - r * .22}Z" fill="${col || '#fff'}"/>`; }
  function radialGem(c, n, rx, ry, k, rot) {
    const P = (i, sx, sy) => { const a = (i / n) * Math.PI * 2 + (rot || 0) - Math.PI / 2; return [32 + Math.cos(a) * sx, 33 + Math.sin(a) * sy]; };
    const sh = [c[1], c[2], c[0], c[2], c[1], c[3], c[2], c[1]];
    let o = '';
    for (let i = 0; i < n; i++) {
      const a = P(i, rx, ry), b = P(i + 1, rx, ry), ai = P(i, rx * k, ry * k), bi = P(i + 1, rx * k, ry * k);
      o += `<polygon points="${a} ${b} ${bi} ${ai}" fill="${sh[i % sh.length]}"/>`;
    }
    const inner = Array.from({ length: n }, (_, i) => P(i, rx * k, ry * k).join(',')).join(' ');
    o += `<polygon points="${inner}" fill="url(#gT_${c.id})"/>`;
    o += Array.from({ length: n }, (_, i) => `<line x1="32" y1="33" x2="${P(i, rx * k, ry * k)[0]}" y2="${P(i, rx * k, ry * k)[1]}" stroke="${c[0]}" stroke-opacity=".35" stroke-width=".8"/>`).join('');
    const outer = Array.from({ length: n }, (_, i) => P(i, rx, ry).join(',')).join(' ');
    return `<polygon points="${outer}" fill="none" stroke="${c[4]}" stroke-width="1.6" stroke-linejoin="round"/>` .replace(/^/, o);
  }
  function brilliant(c) {
    return `<polygon points="20,13 44,13 38,25 26,25" fill="url(#gT_${c.id})"/>
      <polygon points="6,25 20,13 26,25" fill="${c[1]}"/><polygon points="44,13 58,25 38,25" fill="${c[2]}"/>
      <polygon points="20,13 26,25 32,13" fill="${c[0]}" opacity=".55"/><polygon points="44,13 38,25 32,13" fill="${c[1]}" opacity=".6"/>
      <polygon points="6,25 26,25 32,58" fill="${c[2]}"/><polygon points="26,25 38,25 32,58" fill="${c[0]}"/><polygon points="38,25 58,25 32,58" fill="${c[3]}"/>
      <polygon points="6,25 16,25 32,58" fill="${c[1]}" opacity=".7"/><polygon points="48,25 58,25 32,58" fill="${c[2]}" opacity=".8"/>
      <polygon points="20,13 44,13 58,25 32,58 6,25" fill="none" stroke="${c[4]}" stroke-width="1.6" stroke-linejoin="round"/>
      <line x1="6" y1="25" x2="58" y2="25" stroke="${c[4]}" stroke-width="1" opacity=".8"/>`;
  }
  function stepCut(c) {
    const O = '16,6 48,6 57,15 57,51 48,60 16,60 7,51 7,15', I = '21,15 43,15 48,20 48,46 43,51 21,51 16,46 16,20';
    const q = (p, f) => `<polygon points="${p}" fill="${f}"/>`;
    return q(O, c[2]) + q('16,6 48,6 43,15 21,15', c[0]) + q('48,6 57,15 48,20 43,15', c[1]) + q('57,15 57,51 48,46 48,20', c[2]) + q('57,51 48,60 43,51 48,46', c[3]) +
      q('48,60 16,60 21,51 43,51', c[3]) + q('16,60 7,51 16,46 21,51', c[2]) + q('7,51 7,15 16,20 16,46', c[1]) + q('7,15 16,6 21,15 16,20', c[0]) +
      q(I, `url(#gT_${c.id})`) + `<polygon points="25,21 39,21 42,24 42,42 39,45 25,45 22,42 22,24" fill="none" stroke="${c[0]}" stroke-opacity=".5" stroke-width="1"/>` +
      `<polygon points="${O}" fill="none" stroke="${c[4]}" stroke-width="1.6" stroke-linejoin="round"/>`;
  }
  const gemDefs = Object.keys(GEMCOL).map(k => { const c = GEMCOL[k]; return `<linearGradient id="gT_${k}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c[0]}"/><stop offset=".55" stop-color="${c[1]}"/><stop offset="1" stop-color="${c[2]}"/></linearGradient>`; }).join('') +
    `<radialGradient id="gAura" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
     <linearGradient id="gRain" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff3b5c"/><stop offset=".3" stop-color="#3f7dff"/><stop offset=".6" stop-color="#22d47f"/><stop offset="1" stop-color="#c9c2ff"/></linearGradient>`;
  Object.keys(GEMCOL).forEach(k => GEMCOL[k].id = k);
  SYMS.RUBY = radialGem(GEMCOL.RUBY, 10, 26, 25, .52, Math.PI / 10) + glint(22, 20, 6) + glint(42, 44, 3, '#ffe3e8');
  SYMS.SAPH = radialGem(GEMCOL.SAPH, 8, 21, 28, .5, 0) + glint(25, 17, 6) + glint(40, 46, 3, '#dce9ff');
  SYMS.EMER = stepCut(GEMCOL.EMER) + glint(22, 16, 6) + glint(46, 50, 3);
  SYMS.DIAM = brilliant(GEMCOL.DIAM) + glint(22, 16, 7) + glint(48, 22, 4) + glint(33, 44, 3, '#bfe8ff');
  SYMS.BLACK = `<circle cx="32" cy="34" r="30" fill="url(#gAura)" opacity=".5"/>` + brilliant(GEMCOL.BLACK) + glint(22, 16, 7, '#e8e4ff') + glint(49, 21, 4, '#b89cff') + glint(31, 42, 4, '#d9d9e8') + glint(12, 30, 2.5, '#b89cff');
  SYMS.WILD = `<rect x="4" y="12" width="56" height="40" rx="9" fill="url(#gGold)" stroke="#7a5a0c" stroke-width="2"/><rect x="8" y="16" width="48" height="32" rx="6" fill="#2a0f3d" stroke="#fff0b0" stroke-width="1.2"/>
    <g transform="translate(22 1) scale(.32)">${brilliant(GEMCOL.DIAM)}</g><text x="32" y="43" text-anchor="middle" font-family="Georgia,serif" font-weight="900" font-size="17" fill="url(#gGold)" stroke="#3a2600" stroke-width=".8">WILD</text>` + glint(52, 14, 4);
  SYMS.SCAT = `<circle cx="32" cy="32" r="28" fill="url(#gGold)" stroke="#7a5a0c" stroke-width="2.5"/><circle cx="32" cy="32" r="22" fill="#14081f" stroke="url(#gRain)" stroke-width="3"/>
    <g transform="translate(15 9) scale(.32)">${radialGem(GEMCOL.RUBY, 10, 26, 25, .52, .3)}</g><g transform="translate(29 9) scale(.32)">${radialGem(GEMCOL.SAPH, 8, 21, 28, .5, 0)}</g><g transform="translate(22 4) scale(.32)">${brilliant(GEMCOL.BLACK)}</g>
    <text x="32" y="40" text-anchor="middle" font-family="Arial,sans-serif" font-weight="900" font-size="11" fill="#fff0b0">BONUS</text><text x="32" y="50" text-anchor="middle" font-family="Arial,sans-serif" font-weight="800" font-size="6.5" fill="#c9c2ff">FREE SPINS</text>` + glint(48, 14, 4);
  function sym(name) { return `<svg viewBox="0 0 64 64" class="sym sym-${name}" aria-label="${name}" role="img">${SYMS[name]}</svg>`; }
  (function () { const h = document.createElement('div'); h.setAttribute('aria-hidden', 'true'); h.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden'; h.innerHTML = `<svg width="0" height="0">${defs.replace('</defs>', gemDefs + '</defs>')}</svg>`; document.body.appendChild(h); })();

  function mini(cards, cls) {
    return `<div class="mini-cards ${cls || ''}">${cards.map(c => { const red = c[c.length - 1] === '♥' || c[c.length - 1] === '♦'; return `<div class="card sm ${red ? 'red' : ''}"><span class="c-tl">${c.slice(0, -1)}<i>${c.slice(-1)}</i></span><span class="c-mid">${c.slice(-1)}</span></div>`; }).join('')}</div>`;
  }

  function msg(host, html, kind) { host.className = 'status ' + (kind || ''); host.innerHTML = html; }

  /** Pay-out helper text */
  const money = (x) => App.wallet.fmt(x);
  function coinIcon() { return `<span class="coin coin-${App.state.cur.toLowerCase()}"></span>`; }
  function infoRows(rows) { return `<table class="info-table">${rows.map(r => `<tr><th>${r[0]}</th><td>${r[1]}</td></tr>`).join('')}</table>`; }
  const DEMO_NOTE = '<p class="fine">Virtual coins only — no cash value, no real-money payouts. Theoretical figures are long-run averages and do not predict any single session.</p>';

  window.UI = { sleep, card, reveal, bump, betStepper, sym, mini, msg, money, coinIcon, infoRows, DEMO_NOTE, LEVELS, SYMS };
})();
