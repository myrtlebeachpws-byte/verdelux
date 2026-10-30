/* Themed SVG symbol art for the data-driven slots (64×64 viewBox). Registers into UI.SYMS as `${theme}:${sym}`. */
(function () {
  'use strict';
  const D = [];
  const lg = (id, a, b, c) => { D.push(`<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/>${c ? `<stop offset=".5" stop-color="${b}"/><stop offset="1" stop-color="${c}"/>` : `<stop offset="1" stop-color="${b}"/>`}</linearGradient>`); return `url(#${id})`; };
  const rg = (id, a, b) => { D.push(`<radialGradient id="${id}" cx=".38" cy=".32" r=".7"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient>`); return `url(#${id})`; };
  const G = lg('vxGold', '#fff3b8', '#e2b93b', '#8a6410'), GR = rg('vxGoldR', '#fff6c4', '#a8780f');
  const T = (txt, y, size, fill, stroke, font) => `<text x="32" y="${y}" text-anchor="middle" font-family="${font || 'Georgia,serif'}" font-weight="900" font-size="${size}" fill="${fill}" stroke="${stroke || '#000'}" stroke-width="1.2" paint-order="stroke">${txt}</text>`;
  const plate = (fill, stroke) => `<rect x="4" y="4" width="56" height="56" rx="12" fill="${fill}" stroke="${stroke}" stroke-width="2.5"/>`;
  const coin = (fill, txt, tcol) => `<circle cx="32" cy="32" r="27" fill="${GR}" stroke="#6b4a00" stroke-width="2.5"/><circle cx="32" cy="32" r="21" fill="${fill}" stroke="#fff0b0" stroke-width="1.6"/>${txt ? T(txt, 37, txt.length > 3 ? 11 : 14, tcol || '#fff0b0', '#000', 'Arial,sans-serif') : ''}`;
  const A = {};

  /* ---- Pharaoh's Gold ---- */
  const lapis = lg('phLap', '#5b8cff', '#1a2f8a'), sand = lg('phSand', '#ffe3a1', '#c08a2c');
  A.pharaoh = {
    MASK: `<path d="M14 14q18-12 36 0l4 26q-22 26-44 0z" fill="${G}" stroke="#5a3d00" stroke-width="2"/><path d="M14 20h36M13 27h38M12 34h40" stroke="${lapis}" stroke-width="4"/><path d="M22 14q10 6 20 0v24q-10 10-20 0z" fill="${sand}" stroke="#7a5a0c" stroke-width="1.5"/><path d="M25 26h5M34 26h5" stroke="#111" stroke-width="2.5" stroke-linecap="round"/><path d="M29 41v8h6v-8" fill="${lapis}" stroke="#5a3d00"/><circle cx="32" cy="12" r="4" fill="#ff3b3b" stroke="#5a3d00"/>`,
    EYE: `<path d="M6 30q26-22 52 0q-26 18-52 0z" fill="#fff8e0" stroke="${G}" stroke-width="4"/><circle cx="32" cy="29" r="8" fill="${lapis}" stroke="#0a1a5c" stroke-width="2"/><circle cx="32" cy="29" r="3" fill="#000"/><path d="M28 38q-2 10 -10 14M40 38l4 14" stroke="${G}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M10 18q20-10 42 0" stroke="${lapis}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
    SCARAB: `<ellipse cx="32" cy="36" rx="14" ry="18" fill="${lg('phSc', '#4ee2b0', '#0a5c44')}" stroke="#d4af37" stroke-width="2"/><path d="M32 18v36" stroke="#d4af37" stroke-width="2"/><circle cx="32" cy="16" r="6" fill="#0a5c44" stroke="#d4af37" stroke-width="2"/><path d="M18 30q-14-6-14-18q10 2 16 12M46 30q14-6 14-18q-10 2-16 12M18 44l-10 6M46 44l10 6" stroke="${G}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`,
    ANKH: `<path d="M32 6c-10 0-14 8-14 14s6 12 11 14H12v8h17v16h6V42h17v-8H35c5-2 11-8 11-14S42 6 32 6zm0 7c4 0 6 4 6 8s-3 9-6 11c-3-2-6-7-6-11s2-8 6-8z" fill="${G}" stroke="#5a3d00" stroke-width="1.6"/>`,
    PYR: `<path d="M32 8L58 54H6z" fill="${sand}" stroke="#7a5a0c" stroke-width="2.4" stroke-linejoin="round"/><path d="M32 8L58 54H32z" fill="#a8741c" opacity=".7"/><path d="M32 8l6 10H26z" fill="${G}"/><path d="M14 40h36M20 30h24" stroke="#7a5a0c" stroke-width="1.2" opacity=".6"/>`,
    LOTUS: `<g stroke="#fff" stroke-width="1.2"><path d="M32 12q10 16 0 36q-10-20 0-36z" fill="#3fc2ff"/><path d="M14 22q16 6 18 26q-18-6-18-26z" fill="#1f8fe0"/><path d="M50 22q-16 6-18 26q18-6 18-26z" fill="#1f8fe0"/></g><path d="M12 50h40" stroke="${G}" stroke-width="5" stroke-linecap="round"/>`,
    WILD: `${plate(lg('phW', '#1a2f8a', '#081250'), '#e2b93b')}<path d="M32 8l5 8h-10z" fill="${G}"/><ellipse cx="32" cy="32" rx="22" ry="12" fill="none" stroke="${G}" stroke-width="2.5"/>${T('WILD', 38, 16, G, '#2a1d00')}<path d="M12 52h40" stroke="${G}" stroke-width="3"/>`,
    SCAT: `<circle cx="32" cy="32" r="28" fill="${rg('phSun', '#fff6a8', '#ff7a00')}" stroke="#8a3d00" stroke-width="2"/>${Array.from({ length: 12 }, (_, i) => `<path d="M32 2l3 7h-6z" fill="${G}" transform="rotate(${i * 30} 32 32)"/>`).join('')}<circle cx="32" cy="32" r="14" fill="#c0392b" stroke="#fff0b0" stroke-width="2"/>${T('FREE', 36, 10, '#fff0b0', '#000', 'Arial,sans-serif')}`
  };
  /* ---- Gold Rush Gulch ---- */
  const wood = lg('grWood', '#a0612b', '#4a2410'), steel = lg('grSteel', '#e6e9ef', '#6b7380');
  A.goldrush = {
    NUGGET: `<path d="M10 40l6-16 12-8 16 2 10 12 0 14-12 8-22 0z" fill="${GR}" stroke="#6b4a00" stroke-width="2.4" stroke-linejoin="round"/><path d="M20 28l8 6M36 22l2 10M44 40l-8-2" stroke="#fff6c4" stroke-width="2" opacity=".8"/><circle cx="24" cy="24" r="3" fill="#fff"/>`,
    SHERIFF: `<polygon points="32,4 38,22 58,22 42,34 48,54 32,42 16,54 22,34 6,22 26,22" fill="${G}" stroke="#5a3d00" stroke-width="2"/>${[[32, 4], [58, 22], [48, 54], [16, 54], [6, 22]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.5" fill="${G}" stroke="#5a3d00"/>`).join('')}<circle cx="32" cy="30" r="8" fill="#7a5a0c"/>${T('★', 35, 12, '#fff0b0', '#000')}`,
    REVOLVER: `<path d="M6 22h38l4-4h8v10H30v6l-6 4-4 14H10l4-18H6z" fill="${steel}" stroke="#222" stroke-width="2" stroke-linejoin="round"/><circle cx="34" cy="28" r="6" fill="#4b5563" stroke="#111"/><path d="M12 38l2-6h10l-2 18H10z" fill="${wood}" stroke="#2a1205" stroke-width="1.5"/>`,
    BOOT: `<path d="M22 6h18l-2 30 16 6q6 4 2 12H14l2-18z" fill="${wood}" stroke="#2a1205" stroke-width="2.2" stroke-linejoin="round"/><path d="M22 18h17M20 28h18" stroke="${G}" stroke-width="2.2"/><circle cx="12" cy="50" r="5" fill="none" stroke="${steel}" stroke-width="2.5"/>`,
    LANTERN: `<path d="M22 14h20l4 8v26l-4 6H22l-4-6V22z" fill="${rg('grFl', '#fff6a8', '#e06a1b')}" stroke="#3b2a02" stroke-width="2.2"/><path d="M26 6h12v8H26zM18 22h28M18 48h28" stroke="#3b2a02" stroke-width="2.4" fill="none"/><path d="M32 28q5 8 0 14q-5-6 0-14z" fill="#fff"/>`,
    PAN: `<ellipse cx="30" cy="38" rx="24" ry="14" fill="${steel}" stroke="#333" stroke-width="2.2"/><ellipse cx="30" cy="36" rx="17" ry="8" fill="#5b4632"/><circle cx="24" cy="35" r="3" fill="${G}"/><circle cx="33" cy="37" r="2.5" fill="${G}"/><circle cx="37" cy="33" r="2" fill="${G}"/><path d="M54 36l8-12" stroke="${wood}" stroke-width="5" stroke-linecap="round"/>`,
    WILD: `${plate('#f3e2b3', '#5a3d00')}${T('WANTED', 18, 10, '#5a2a0a', '#f3e2b3', 'Georgia,serif')}<rect x="14" y="22" width="36" height="20" fill="#d9c28a" stroke="#5a2a0a"/>${T('WILD', 38, 15, '#a3200b', '#f3e2b3')}${T('$$$', 54, 10, '#5a2a0a', '#f3e2b3')}`,
    TNT: `<g transform="rotate(-12 32 34)">${[18, 28, 38].map(x => `<rect x="${x}" y="18" width="10" height="36" rx="3" fill="${lg('grT' + x, '#ff5a3c', '#8a1206')}" stroke="#3a0602" stroke-width="1.6"/>`).join('')}<rect x="15" y="30" width="36" height="8" fill="#2a1205"/>${T('TNT', 37, 8, '#ffcf4a', '#000', 'Arial,sans-serif')}</g><path d="M34 18q4-10 12-10" stroke="#555" stroke-width="2" fill="none"/><circle cx="47" cy="8" r="4.5" fill="#ffe14a"/><circle cx="47" cy="8" r="2" fill="#fff"/>`
  };
  /* ---- Deep Sea Doubloons ---- */
  const sea = lg('dsSea', '#2ad0ff', '#04507a');
  A.deepsea = {
    CHEST: `<path d="M8 28q24-22 48 0v24H8z" fill="${wood}" stroke="#2a1205" stroke-width="2.2"/><path d="M8 28h48" stroke="${G}" stroke-width="4"/><path d="M8 40h48" stroke="${G}" stroke-width="3"/><rect x="27" y="30" width="10" height="12" rx="2" fill="${G}" stroke="#5a3d00"/><circle cx="20" cy="22" r="4" fill="${GR}"/><circle cx="44" cy="22" r="3.4" fill="${GR}"/><circle cx="32" cy="17" r="3.8" fill="#ff3b5c" stroke="#fff"/>`,
    SHIP: `<path d="M6 40h52l-8 14H14z" fill="${wood}" stroke="#2a1205" stroke-width="2"/><path d="M30 6v34M42 14v26" stroke="#2a1205" stroke-width="2.5"/><path d="M30 8q-18 14 0 28zM42 16q-12 10 0 20z" fill="#f1ead6" stroke="#5b4632" stroke-width="1.4"/><path d="M30 6h10l-3 4h-7z" fill="#111"/><path d="M4 56q8-4 14 0t14 0 14 0 14 0" stroke="${sea}" stroke-width="3" fill="none"/>`,
    SKULL: `<rect x="4" y="8" width="56" height="44" rx="4" fill="#111" stroke="#ffd36b" stroke-width="2"/><circle cx="32" cy="26" r="11" fill="#f5f5f5"/><circle cx="28" cy="25" r="3" fill="#111"/><circle cx="36" cy="25" r="3" fill="#111"/><rect x="27" y="33" width="10" height="6" fill="#f5f5f5"/><path d="M14 40l36 8M50 40l-36 8" stroke="#f5f5f5" stroke-width="4" stroke-linecap="round"/>`,
    ANCHOR: `<circle cx="32" cy="12" r="5" fill="none" stroke="${G}" stroke-width="4"/><path d="M32 17v38M20 26h24M10 38q4 16 22 17q18-1 22-17" stroke="${G}" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M6 40l6-6 4 8zM58 40l-6-6-4 8z" fill="${G}"/>`,
    SHELL: `<path d="M32 54L8 28q2-18 24-20q22 2 24 20z" fill="${lg('dsSh', '#ffd6e8', '#e0679b')}" stroke="#7a1f48" stroke-width="2"/>${[-30, -15, 0, 15, 30].map(a => `<path d="M32 54L32 12" stroke="#7a1f48" stroke-width="1.4" transform="rotate(${a} 32 54)"/>`).join('')}<circle cx="32" cy="46" r="6" fill="${rg('dsPearl', '#ffffff', '#b8c4d8')}"/>`,
    COMPASS: `<circle cx="32" cy="32" r="26" fill="${G}" stroke="#5a3d00" stroke-width="2"/><circle cx="32" cy="32" r="20" fill="#f1ead6"/><path d="M32 12l5 20-5 20-5-20z" fill="#c0392b"/><path d="M32 32l5 0-5 20-5-20z" fill="#1f2937"/><path d="M12 32l20-4 20 4-20 4z" fill="#64748b" opacity=".7"/><circle cx="32" cy="32" r="3" fill="${G}"/>`,
    WILD: `${plate(lg('dsW', '#6a1b9a', '#1a0630'), '#22c3e6')}${[0, 1, 2, 3, 4].map(i => `<path d="M${12 + i * 10} 56q-6-14 2-22q6-6 0-14" stroke="${lg('dsT' + i, '#ff8fd0', '#9c27b0')}" stroke-width="5" fill="none" stroke-linecap="round"/>`).join('')}<circle cx="24" cy="18" r="3" fill="#ffd36b"/><circle cx="40" cy="18" r="3" fill="#ffd36b"/>${T('WILD', 40, 15, '#bff3ff', '#1a0630')}`,
    COIN: coin('#b8860b', '☠', '#fff0b0')
  };
  /* ---- Dragon's Fortune ---- */
  const red = lg('dfRed', '#ff5a4a', '#8a0a0a');
  A.dragon = {
    DRAGON: `<path d="M10 46q-4-24 16-34q14-6 26 4l-6 2 8 6-8 2q4 8-2 16q8 2 12 8q-14 4-22-4q-12 10-24 0z" fill="${G}" stroke="#5a1a00" stroke-width="2" stroke-linejoin="round"/><circle cx="40" cy="22" r="3" fill="#c0392b" stroke="#000"/><path d="M14 40q8-8 18-4M18 30q8-6 16-2" stroke="#8a4a00" stroke-width="1.6" fill="none"/><path d="M48 14l8-8M44 12l4-10" stroke="${G}" stroke-width="2.5" stroke-linecap="round"/>`,
    LANT: `<path d="M30 4h4v6h-4z" fill="${G}"/><ellipse cx="32" cy="32" rx="20" ry="20" fill="${red}" stroke="#5a0000" stroke-width="2"/><path d="M16 22h32M14 32h36M16 42h32" stroke="#ffcf4a" stroke-width="1.4" opacity=".6"/><rect x="22" y="10" width="20" height="5" rx="2" fill="${G}"/><rect x="22" y="49" width="20" height="5" rx="2" fill="${G}"/><path d="M28 54v8M32 54v9M36 54v8" stroke="#ffcf4a" stroke-width="1.6"/>${T('福', 39, 16, '#ffcf4a', '#5a0000')}`,
    INGOT: `<path d="M6 34q8 4 14-4h24q6 8 14 4l-6 16H12z" fill="${G}" stroke="#5a3d00" stroke-width="2" stroke-linejoin="round"/><ellipse cx="32" cy="30" rx="12" ry="9" fill="${GR}" stroke="#5a3d00" stroke-width="1.6"/><path d="M26 26q4-4 8 0" stroke="#fff" stroke-width="2" fill="none"/>`,
    KOI: `<path d="M8 32q16-18 36-6l12-10-2 16 2 16-12-10q-20 12-36-6z" fill="${lg('dfKoi', '#ffb36b', '#e0431b')}" stroke="#7a1a00" stroke-width="2" stroke-linejoin="round"/><circle cx="18" cy="30" r="2.6" fill="#000"/><path d="M26 24q6 8 0 16M34 24q4 8 0 16" stroke="#fff" stroke-width="2.5" fill="none" opacity=".8"/>`,
    FAN: `<path d="M32 54L6 28A32 32 0 0 1 58 28z" fill="${red}" stroke="#5a0000" stroke-width="2"/>${[-40, -20, 0, 20, 40].map(a => `<path d="M32 54L32 16" stroke="#ffcf4a" stroke-width="1.6" transform="rotate(${a} 32 54)"/>`).join('')}<circle cx="32" cy="54" r="4" fill="${G}"/>`,
    COINS: `<circle cx="22" cy="36" r="15" fill="${GR}" stroke="#6b4a00" stroke-width="2"/><rect x="18" y="32" width="8" height="8" fill="#6b1000"/><circle cx="42" cy="28" r="15" fill="${GR}" stroke="#6b4a00" stroke-width="2"/><rect x="38" y="24" width="8" height="8" fill="#6b1000"/><path d="M8 54h48" stroke="#c0392b" stroke-width="3" stroke-linecap="round"/>`,
    WILD: `${plate(red, '#ffcf4a')}<path d="M14 44q4-24 22-26q12 0 16 10l-6 0 4 6q-8 4-14-2q-8 6-6 14z" fill="${G}" stroke="#5a1a00" stroke-width="1.6"/>${T('WILD', 56, 14, G, '#3a0000')}`,
    PEARL: `<circle cx="32" cy="32" r="26" fill="${rg('dfPearl', '#ffffff', '#9fb6d8')}" stroke="${G}" stroke-width="4"/><path d="M14 32q18-22 36 0q-18 22-36 0z" fill="none" stroke="#ff3b3b" stroke-width="2" opacity=".7"/>${T('BONUS', 37, 10, '#8a0a0a', '#fff', 'Arial,sans-serif')}<circle cx="22" cy="20" r="5" fill="#fff" opacity=".9"/>`
  };
  /* ---- Neon 777 ---- */
  const neon = (txt, col, size, y) => `<text x="32" y="${y || 46}" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="${size}" fill="none" stroke="${col}" stroke-width="2.6" style="filter:drop-shadow(0 0 3px ${col})">${txt}</text><text x="32" y="${y || 46}" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="${size}" fill="#fff" opacity=".9">${txt}</text>`;
  const bar = (n, col) => Array.from({ length: n }, (_, i) => `<rect x="10" y="${32 - n * 7 + i * 14}" width="44" height="11" rx="3" fill="#0b0220" stroke="${col}" stroke-width="2.4" style="filter:drop-shadow(0 0 3px ${col})"/><text x="32" y="${32 - n * 7 + i * 14 + 9}" text-anchor="middle" font-family="Arial,sans-serif" font-weight="900" font-size="9" fill="#fff">BAR</text>`).join('');
  A.neon777 = {
    SEVEN: neon('7', '#ff3bd4', 54, 52), BAR3: bar(3, '#22e6ff'), BAR2: bar(2, '#7cff6b'), BAR: bar(1, '#ffd36b'),
    BELL: `<path d="M32 8q-14 0-14 20v12l-6 8h40l-6-8V28q0-20-14-20z" fill="none" stroke="#ffd36b" stroke-width="3" style="filter:drop-shadow(0 0 4px #ffd36b)"/><circle cx="32" cy="52" r="4" fill="#ffd36b"/>`,
    CHERRY: `<path d="M22 40q4-20 22-30M42 40q-4-16 2-30" stroke="#7cff6b" stroke-width="3" fill="none" style="filter:drop-shadow(0 0 3px #7cff6b)"/><circle cx="22" cy="44" r="10" fill="#ff2b5c" stroke="#ffb3c6" stroke-width="2" style="filter:drop-shadow(0 0 4px #ff2b5c)"/><circle cx="42" cy="44" r="10" fill="#ff2b5c" stroke="#ffb3c6" stroke-width="2"/>`,
    WILD2: `<rect x="5" y="10" width="54" height="44" rx="10" fill="#14042a" stroke="#22e6ff" stroke-width="3" style="filter:drop-shadow(0 0 5px #22e6ff)"/>${neon('WILD', '#22e6ff', 14, 28)}${neon('2×', '#ff3bd4', 20, 50)}`,
    WILD3: `<rect x="5" y="10" width="54" height="44" rx="10" fill="#14042a" stroke="#ff3bd4" stroke-width="3" style="filter:drop-shadow(0 0 5px #ff3bd4)"/>${neon('WILD', '#ff3bd4', 14, 28)}${neon('3×', '#ffd36b', 20, 50)}`,
    BLANK: `<circle cx="32" cy="32" r="3" fill="#3a1f66"/>`
  };
  /* ---- Black Diamond Royale ---- */
  const plat = lg('rbPl', '#ffffff', '#b9b6cc', '#5a5670');
  const bd = `<polygon points="20,13 44,13 58,25 32,58 6,25" fill="${lg('rbBd', '#8a86a6', '#191626')}" stroke="#e8e4ff" stroke-width="1.8" stroke-linejoin="round"/><path d="M6 25h52M20 13l6 12 6-12 6 12 6-12M26 25l6 33 6-33" stroke="#c9c2ff" stroke-width="1.1" fill="none" opacity=".7"/>`;
  A.royal = {
    BLACKD: bd + `<path d="M20 20l4-4" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>`,
    SCEPTER: `<path d="M30 20h4v38h-4z" fill="${plat}"/><circle cx="32" cy="14" r="9" fill="#7c3aed" stroke="${plat}" stroke-width="3"/><path d="M24 24h16" stroke="${G}" stroke-width="4" stroke-linecap="round"/><circle cx="32" cy="58" r="3" fill="${G}"/>`,
    RING: `<circle cx="32" cy="38" r="17" fill="none" stroke="${G}" stroke-width="6"/><rect x="22" y="8" width="20" height="16" rx="4" fill="#111" stroke="${G}" stroke-width="3"/>${T('V', 21, 12, G, '#000')}`,
    ORB: `<circle cx="32" cy="38" r="20" fill="${rg('rbOrb', '#b89cff', '#2a0f50')}" stroke="${G}" stroke-width="2.5"/><path d="M12 38h40M32 18v40" stroke="${G}" stroke-width="2.5"/><path d="M32 4v12M26 10h12" stroke="${G}" stroke-width="3.5" stroke-linecap="round"/>`,
    CHAL: `<path d="M14 10h36q0 22-18 26q-18-4-18-26z" fill="${plat}" stroke="#3a3550" stroke-width="2"/><path d="M30 36h4v14h-4z" fill="${plat}"/><path d="M18 56h28l-4-6H22z" fill="${plat}" stroke="#3a3550" stroke-width="1.5"/><circle cx="32" cy="20" r="4" fill="#ff3b5c"/>`,
    WILD2: `${plate('#0d0d18', '#e8e4ff')}<g transform="translate(16 2) scale(.5)">${bd}</g>${T('WILD', 44, 13, plat, '#000')}${T('2×', 58, 12, '#b89cff', '#000')}`,
    WILD5: `${plate(lg('rbW5', '#3b1a5c', '#0d0d18'), '#ffcf4a')}<g transform="translate(16 2) scale(.5)">${bd}</g>${T('WILD', 44, 13, G, '#000')}${T('5×', 58, 12, '#ffcf4a', '#000')}`,
    CROWN: `<path d="M9 47L7 19l15 13 10-19 10 19 15-13-2 28z" fill="${plat}" stroke="#3a3550" stroke-width="2" stroke-linejoin="round"/><rect x="9" y="47" width="46" height="8" rx="2" fill="${G}" stroke="#5a3d00" stroke-width="1.5"/><circle cx="32" cy="38" r="4" fill="#191626" stroke="#e8e4ff"/>`,
    BLANK: `<circle cx="32" cy="32" r="3" fill="#2a2840"/>`
  };
  const hold = document.createElement('div'); hold.setAttribute('aria-hidden', 'true'); hold.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  hold.innerHTML = `<svg width="0" height="0"><defs>${D.join('')}</defs></svg>`; document.body.appendChild(hold);
  Object.keys(A).forEach(t => Object.keys(A[t]).forEach(k => { window.UI.SYMS[t + ':' + k] = A[t][k]; }));
  window.SlotArt = { A, defs: () => D.join('') };
})();
