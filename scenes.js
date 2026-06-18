/* =========================================================
   CAPTCHA Sprint — procedural SVG scene engine
   Every "photo" in every captcha tile is drawn here as
   inline SVG. No image assets anywhere in the project.
   ========================================================= */
const Scenes = (() => {
  'use strict';

  /* ---------- seeded RNG (mulberry32) ---------- */
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
  const rb = (r, a, b) => a + r() * (b - a);
  const ri = (r, a, b) => Math.floor(rb(r, a, b + 1));

  let UID = 0; // unique gradient ids across all inlined tiles

  /* ---------- atmosphere ---------- */
  const SKIES = [
    ['#bfe3f7', '#eaf7ff'],   // clear day
    ['#a9d4f5', '#dff0fb'],   // bright day
    ['#ffd9a8', '#fff3df'],   // golden hour
    ['#c4cdd6', '#e8edf2'],   // overcast
    ['#f7c6c0', '#ffeede'],   // sunset pink
  ];

  function skyBlock(r, horizonY) {
    const id = 'sk' + (UID++);
    const [top, bot] = pick(r, SKIES);
    let s = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">` +
            `<stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bot}"/>` +
            `</linearGradient></defs>` +
            `<rect width="100" height="${horizonY + 2}" fill="url(#${id})"/>`;
    if (r() < 0.45) { // sun
      const sx = rb(r, 12, 88), sy = rb(r, 8, 22);
      s += `<circle cx="${sx}" cy="${sy}" r="${rb(r, 4, 6.5).toFixed(1)}" fill="#ffe082" opacity="0.9"/>`;
    }
    const nClouds = ri(r, 0, 2);
    for (let i = 0; i < nClouds; i++) {
      const cx = rb(r, 10, 90), cy = rb(r, 8, 26), w = rb(r, 9, 15);
      s += `<g fill="#ffffff" opacity="0.85">` +
           `<ellipse cx="${cx}" cy="${cy}" rx="${w}" ry="${w * 0.38}"/>` +
           `<ellipse cx="${cx + w * 0.5}" cy="${cy - 2.5}" rx="${w * 0.55}" ry="${w * 0.3}"/></g>`;
    }
    if (r() < 0.2) { // distant birds
      const bx = rb(r, 20, 75), by = rb(r, 10, 24);
      s += `<g stroke="#5d6d7a" stroke-width="0.8" fill="none" opacity="0.7">` +
           `<path d="M${bx} ${by} q2 -2 4 0 q2 -2 4 0"/>` +
           `<path d="M${bx + 8} ${by + 3} q1.6 -1.6 3.2 0 q1.6 -1.6 3.2 0"/></g>`;
    }
    return s;
  }

  const BUILDING_COLORS = ['#9fb2bd', '#b3a59a', '#aab8a2', '#c0aab2', '#9aa7c0', '#b8b0a0'];

  function buildingsBlock(r, horizonY) {
    let s = '', x = -rb(r, 0, 8);
    while (x < 100) {
      const w = rb(r, 16, 30), h = rb(r, 18, 42);
      const c = pick(r, BUILDING_COLORS);
      s += `<rect x="${x.toFixed(1)}" y="${(horizonY - h).toFixed(1)}" width="${w.toFixed(1)}" height="${h + 2}" fill="${c}"/>`;
      // a few windows
      const cols = ri(r, 2, 3), rows = ri(r, 2, 4);
      for (let cI = 0; cI < cols; cI++) for (let rI = 0; rI < rows; rI++) {
        if (r() < 0.75) {
          const wx = x + 3 + cI * ((w - 6) / cols) + 1;
          const wy = horizonY - h + 4 + rI * ((h - 8) / rows);
          s += `<rect x="${wx.toFixed(1)}" y="${wy.toFixed(1)}" width="${((w - 6) / cols - 2.5).toFixed(1)}" height="${((h - 8) / rows - 2.5).toFixed(1)}" fill="${r() < 0.2 ? '#ffe9a8' : '#dde9f2'}" opacity="0.9"/>`;
        }
      }
      x += w + rb(r, 1, 4);
    }
    return `<g opacity="0.9">${s}</g>`;
  }

  function treelineBlock(r, horizonY) {
    let s = '';
    const n = ri(r, 4, 6);
    for (let i = 0; i < n; i++) {
      const cx = rb(r, 4, 96), rr = rb(r, 7, 13);
      const g = pick(r, ['#7fae6f', '#6d9c60', '#8eb87a', '#5f8f56']);
      s += `<circle cx="${cx.toFixed(1)}" cy="${(horizonY - rr * 0.7).toFixed(1)}" r="${rr.toFixed(1)}" fill="${g}" opacity="0.85"/>`;
    }
    return s;
  }

  /* ---------- grounds ---------- */
  function groundRoad(r, horizonY) {
    let s = `<rect x="0" y="${horizonY}" width="100" height="${100 - horizonY}" fill="#6b7178"/>` +
            `<rect x="0" y="${horizonY}" width="100" height="2.5" fill="#8b9199"/>`;
    if (r() < 0.7) { // lane dashes
      const y = horizonY + (100 - horizonY) * 0.55;
      for (let x = 4; x < 100; x += 16) {
        s += `<rect x="${x}" y="${y.toFixed(1)}" width="9" height="2.2" rx="1" fill="#e8c94f" opacity="0.85"/>`;
      }
    }
    return s;
  }
  function groundSidewalk(r, horizonY) {
    let s = `<rect x="0" y="${horizonY}" width="100" height="${100 - horizonY}" fill="#c3cad1"/>` +
            `<rect x="0" y="${horizonY}" width="100" height="2" fill="#a9b2ba"/>`;
    for (let x = 12; x < 100; x += 24) {
      s += `<line x1="${x}" y1="${horizonY + 2}" x2="${x - 6}" y2="100" stroke="#aab3bb" stroke-width="1.2"/>`;
    }
    return s;
  }
  function groundGrass(r, horizonY) {
    let s = `<rect x="0" y="${horizonY}" width="100" height="${100 - horizonY}" fill="#86b768"/>` +
            `<rect x="0" y="${horizonY}" width="100" height="3" fill="#97c47a"/>`;
    for (let i = 0; i < 7; i++) {
      const x = rb(r, 4, 94), y = rb(r, horizonY + 6, 96);
      s += `<path d="M${x.toFixed(1)} ${y.toFixed(1)} l1.6 -3.4 l1.6 3.4" stroke="#6da153" stroke-width="1" fill="none"/>`;
    }
    return s;
  }
  function groundWater(r, horizonY) {
    const id = 'wt' + (UID++);
    let s = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">` +
            `<stop offset="0" stop-color="#5fa8d3"/><stop offset="1" stop-color="#3d7fa8"/></linearGradient></defs>` +
            `<rect x="0" y="${horizonY}" width="100" height="${100 - horizonY}" fill="url(#${id})"/>`;
    for (let i = 0; i < 5; i++) {
      const x = rb(r, 2, 70), y = rb(r, horizonY + 5, 96), w = rb(r, 10, 24);
      s += `<path d="M${x.toFixed(1)} ${y.toFixed(1)} q${(w / 2).toFixed(1)} 2 ${w.toFixed(1)} 0" stroke="#cfe9f7" stroke-width="1.1" fill="none" opacity="0.6"/>`;
    }
    return s;
  }
  function groundSand(r, horizonY) {
    return `<rect x="0" y="${horizonY}" width="100" height="${100 - horizonY}" fill="#e8d5a3"/>` +
           `<rect x="0" y="${horizonY}" width="100" height="2.5" fill="#f2e2b8"/>` +
           `<ellipse cx="${rb(r, 20, 80).toFixed(1)}" cy="${rb(r, horizonY + 8, 92).toFixed(1)}" rx="6" ry="1.6" fill="#dcc68f"/>`;
  }

  /* =========================================================
     OBJECT DRAWERS — each returns SVG for one hero object,
     drawn around center-bottom (50, ~92), with variants.
     ========================================================= */

  function drawTrafficLight(r) {
    const housings = ['#3a3f44', '#2c3136', '#c79321'];
    const hc = pick(r, housings);
    const lit = ri(r, 0, 2); // 0 red 1 yellow 2 green
    const LIT = ['#ff5147', '#ffd23f', '#3ddc6e'];
    const cx = rb(r, 42, 58);
    let s = `<ellipse cx="${cx}" cy="93" rx="10" ry="2.2" fill="#000" opacity="0.15"/>`;
    s += `<rect x="${cx - 2}" y="52" width="4" height="40" fill="#4a5258"/>`;
    s += `<rect x="${cx - 5}" y="90" width="10" height="3.5" rx="1" fill="#3c4348"/>`;
    s += `<rect x="${cx - 11}" y="10" width="22" height="46" rx="5" fill="${hc}"/>`;
    s += `<rect x="${cx - 11}" y="10" width="22" height="46" rx="5" fill="none" stroke="#1f2326" stroke-width="1" opacity="0.5"/>`;
    const ys = [20, 33, 46];
    for (let i = 0; i < 3; i++) {
      if (i === lit) {
        s += `<circle cx="${cx}" cy="${ys[i]}" r="8" fill="${LIT[i]}" opacity="0.28"/>`;
        s += `<circle cx="${cx}" cy="${ys[i]}" r="4.8" fill="${LIT[i]}"/>`;
        s += `<circle cx="${cx - 1.5}" cy="${ys[i] - 1.5}" r="1.4" fill="#fff" opacity="0.7"/>`;
      } else {
        s += `<circle cx="${cx}" cy="${ys[i]}" r="4.8" fill="#15181a"/>`;
      }
      // visor
      s += `<path d="M${cx - 6} ${ys[i] - 4.5} a6.5 6.5 0 0 1 12 0" fill="none" stroke="#16191c" stroke-width="2"/>`;
    }
    return s;
  }

  function drawHydrant(r) {
    const body = pick(r, ['#e2453c', '#f3c623', '#e8762c', '#d63a6a']);
    const cap = pick(r, ['#f5f0e6', '#3a3f44', '#ffd23f']);
    let s = `<ellipse cx="50" cy="93" rx="14" ry="2.6" fill="#000" opacity="0.15"/>`;
    s += `<rect x="38" y="88" width="24" height="5" rx="1.5" fill="#5b6166"/>`;          // base
    s += `<rect x="41" y="56" width="18" height="33" rx="6" fill="${body}"/>`;            // body
    s += `<path d="M41 56 a9 9 0 0 1 18 0 z" fill="${body}"/>`;                           // dome
    s += `<rect x="46.5" y="42" width="7" height="6" rx="2" fill="${cap}"/>`;             // top cap
    s += `<circle cx="50" cy="40.5" r="2.6" fill="${cap}"/>`;
    s += `<rect x="38" y="62" width="24" height="4" rx="2" fill="${cap}"/>`;              // flange
    s += `<circle cx="36" cy="72" r="4.4" fill="${body}"/><circle cx="36" cy="72" r="2.4" fill="${cap}"/>`;  // nozzles
    s += `<circle cx="64" cy="72" r="4.4" fill="${body}"/><circle cx="64" cy="72" r="2.4" fill="${cap}"/>`;
    s += `<circle cx="50" cy="74" r="5" fill="${body}" stroke="${cap}" stroke-width="1.6"/>`; // front cap
    s += `<path d="M44.5 58 q-1.5 8 0 16" stroke="#fff" stroke-width="1.4" fill="none" opacity="0.35"/>`;   // sheen
    return s;
  }

  function drawBus(r) {
    const body = pick(r, ['#3f8fd2', '#f0b429', '#5cab62', '#d2553f', '#7d6bb5']);
    let s = `<ellipse cx="50" cy="92" rx="42" ry="2.8" fill="#000" opacity="0.15"/>`;
    s += `<rect x="8" y="38" width="84" height="42" rx="5" fill="${body}"/>`;
    s += `<rect x="8" y="38" width="84" height="7" rx="3.5" fill="#fff" opacity="0.25"/>`;            // roof highlight
    s += `<rect x="10" y="70" width="80" height="4" fill="#2c3136" opacity="0.35"/>`;                 // skirt stripe
    for (let i = 0; i < 4; i++) {                                                                     // windows
      s += `<rect x="${13 + i * 15}" y="44" width="12" height="13" rx="2" fill="#cfe8f7"/>`;
    }
    s += `<rect x="74" y="44" width="14" height="30" rx="2" fill="#cfe8f7"/>`;                        // door
    s += `<line x1="81" y1="44" x2="81" y2="74" stroke="${body}" stroke-width="1.6"/>`;
    s += `<rect x="12" y="30.5" width="26" height="7" rx="2" fill="#23272b"/>` +                      // route board
         `<rect x="14.5" y="32.5" width="21" height="3" rx="1.5" fill="#ffd23f"/>`;
    s += `<circle cx="26" cy="82" r="7.5" fill="#23272b"/><circle cx="26" cy="82" r="3.2" fill="#9aa6ad"/>`;
    s += `<circle cx="62" cy="82" r="7.5" fill="#23272b"/><circle cx="62" cy="82" r="3.2" fill="#9aa6ad"/>`;
    s += `<rect x="6" y="62" width="3.5" height="6" rx="1.5" fill="#ffd23f"/>`;                       // headlight
    s += `<rect x="90.5" y="62" width="3.5" height="6" rx="1.5" fill="#e2453c"/>`;                    // taillight
    return s;
  }

  function drawBicycle(r) {
    const frame = pick(r, ['#d2453f', '#2e7fb8', '#3aa66a', '#e08a2e', '#574f8a']);
    let s = `<ellipse cx="52" cy="90" rx="34" ry="2.4" fill="#000" opacity="0.15"/>`;
    const wheel = (cx) =>
      `<circle cx="${cx}" cy="74" r="13" fill="none" stroke="#2c3136" stroke-width="2.6"/>` +
      `<circle cx="${cx}" cy="74" r="1.8" fill="#2c3136"/>` +
      `<g stroke="#7d878e" stroke-width="0.9" opacity="0.8">` +
      `<line x1="${cx}" y1="61.5" x2="${cx}" y2="86.5"/>` +
      `<line x1="${cx - 12.5}" y1="74" x2="${cx + 12.5}" y2="74"/>` +
      `<line x1="${cx - 8.8}" y1="65.2" x2="${cx + 8.8}" y2="82.8"/>` +
      `<line x1="${cx - 8.8}" y1="82.8" x2="${cx + 8.8}" y2="65.2"/></g>`;
    s += wheel(31) + wheel(73);
    s += `<g stroke="${frame}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round">` +
         `<path d="M31 74 L46 52 L68 52 L73 74"/>` +     // top tube + fork
         `<path d="M46 52 L56 74 L31 74"/>` +            // seat & chain stays
         `</g>`;
    s += `<circle cx="56" cy="74" r="3.4" fill="none" stroke="#444b50" stroke-width="1.6"/>`; // crank
    s += `<line x1="56" y1="74" x2="60" y2="79" stroke="#444b50" stroke-width="1.8"/>`;       // pedal arm
    s += `<rect x="57.8" y="78" width="5" height="2" rx="1" fill="#2c3136"/>`;
    s += `<path d="M68 52 L66 44 M62 43.5 q5 -2.5 9 0.5" stroke="#2c3136" stroke-width="2.4" fill="none" stroke-linecap="round"/>`; // bars
    s += `<path d="M46 52 L44 45 M40 45 h9" stroke="#2c3136" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;              // seat
    return s;
  }

  function drawCar(r) {
    const body = pick(r, ['#d2453f', '#2e7fb8', '#48a564', '#e0b62e', '#6a7178', '#9152a8']);
    let s = `<ellipse cx="50" cy="90" rx="40" ry="2.6" fill="#000" opacity="0.15"/>`;
    s += `<path d="M12 78 v-9 q0 -6 7 -7 l9 -2 8 -9 q2.5 -2.5 7 -2.5 h16 q4.5 0 7 2.5 l8 9 9 2 q7 1 7 7 v9 q0 2 -2 2 H14 q-2 0 -2 -2 z" fill="${body}"/>`;
    s += `<path d="M38 60 l6.5 -8 q1 -1.5 3.5 -1.5 h4 v9.5 z" fill="#cfe8f7"/>`;
    s += `<path d="M55 50.5 h5 q2.5 0 3.5 1.5 l6.5 8 h-15 z" fill="#cfe8f7"/>`;
    s += `<line x1="54" y1="50.5" x2="54" y2="78" stroke="#1f2428" stroke-width="1.2" opacity="0.4"/>`;
    s += `<rect x="12.5" y="66" width="6" height="4" rx="2" fill="#ffe28a"/>`;
    s += `<rect x="81.5" y="66" width="6" height="4" rx="2" fill="#ff7a6e"/>`;
    s += `<circle cx="30" cy="80" r="7" fill="#23272b"/><circle cx="30" cy="80" r="3" fill="#9aa6ad"/>`;
    s += `<circle cx="70" cy="80" r="7" fill="#23272b"/><circle cx="70" cy="80" r="3" fill="#9aa6ad"/>`;
    s += `<rect x="14" y="62" width="72" height="1.6" fill="#fff" opacity="0.25"/>`;
    return s;
  }

  function drawCrosswalkStripes(r, horizonY) {
    // zebra crossing receding toward the horizon
    let s = '';
    const n = 6;
    for (let i = 0; i < n; i++) {
      const cb = 8 + i * (84 / (n - 1));           // bottom center
      const ct = 50 + (cb - 50) * 0.55;            // top center (converge)
      s += `<polygon points="${(cb - 6.5).toFixed(1)},97 ${(cb + 6.5).toFixed(1)},97 ${(ct + 3.6).toFixed(1)},${horizonY + 4} ${(ct - 3.6).toFixed(1)},${horizonY + 4}" fill="#e9edf0" opacity="0.95"/>`;
    }
    return s;
  }

  function drawPalm(r) {
    const lean = rb(r, -8, 8);
    const topX = 50 + lean, topY = 44;
    let s = `<ellipse cx="50" cy="93" rx="12" ry="2.4" fill="#000" opacity="0.15"/>`;
    s += `<path d="M48 93 Q${47 + lean * 0.5} 68 ${topX} ${topY + 4}" stroke="#8a6248" stroke-width="6" fill="none" stroke-linecap="round"/>`;
    s += `<path d="M48 93 Q${47 + lean * 0.5} 68 ${topX} ${topY + 4}" stroke="#a17a5a" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    const greens = ['#2f8f4e', '#3da45f', '#27784a'];
    const fronds = [
      `M${topX} ${topY} q-16 -10 -28 -2 q14 -3 28 6`,
      `M${topX} ${topY} q16 -10 28 -2 q-14 -3 -28 6`,
      `M${topX} ${topY} q-18 2 -24 12 q12 -7 24 -6`,
      `M${topX} ${topY} q18 2 24 12 q-12 -7 -24 -6`,
      `M${topX} ${topY} q-4 -14 6 -20 q-7 10 0 22`,
      `M${topX} ${topY} q2 -15 -8 -19 q8 9 2 21`,
    ];
    fronds.forEach((d, i) => { s += `<path d="${d}" fill="${greens[i % 3]}"/>`; });
    s += `<circle cx="${topX - 3}" cy="${topY + 5}" r="2.4" fill="#6d4c35"/>` +
         `<circle cx="${topX + 3.5}" cy="${topY + 6}" r="2.4" fill="#7c5840"/>`;
    return s;
  }

  function drawStairs(r) {
    const tone = pick(r, ['#aeb8bf', '#bcae9d', '#9aa7b0']);
    const edge = '#7f8a91';
    let s = `<ellipse cx="52" cy="93" rx="34" ry="2.4" fill="#000" opacity="0.12"/>`;
    // 5 steps rising left → right
    s += `<path d="M18 92 h64 v-50 h-12.8 v10 h-12.8 v10 h-12.8 v10 h-12.8 v10 h-12.8 z" fill="${tone}"/>`;
    for (let i = 0; i < 5; i++) {
      const x = 18 + i * 12.8, y = 92 - i * 10;
      s += `<line x1="${x}" y1="${y}" x2="${x + 12.8}" y2="${y}" stroke="${edge}" stroke-width="1.4"/>`;
      s += `<line x1="${x + 12.8}" y1="${y}" x2="${x + 12.8}" y2="${y - 10}" stroke="${edge}" stroke-width="1"/>`;
    }
    // railing
    s += `<line x1="22" y1="78" x2="76" y2="36" stroke="#4d585f" stroke-width="2.6" stroke-linecap="round"/>`;
    for (let i = 0; i < 5; i++) {
      const x = 24 + i * 12.8, y = 90 - i * 10;
      s += `<line x1="${x}" y1="${y}" x2="${x}" y2="${y - 13.5}" stroke="#4d585f" stroke-width="1.8"/>`;
    }
    return s;
  }

  function drawBoat(r) {
    const hull = pick(r, ['#b5543b', '#3b5fb5', '#3a3f44', '#2e8f6e']);
    const sail = pick(r, ['#f7f4ec', '#ffdf8a', '#f2b6b0']);
    let s = '';
    s += `<polygon points="28,76 72,76 64,87 36,87" fill="${hull}"/>`;
    s += `<rect x="28" y="74.5" width="44" height="2.5" rx="1" fill="#fff" opacity="0.45"/>`;
    s += `<line x1="50" y1="75" x2="50" y2="40" stroke="#4d4337" stroke-width="2.2"/>`;
    s += `<polygon points="52.5,43 52.5,72 72,72" fill="${sail}"/>`;
    s += `<polygon points="47.5,46 47.5,72 32,72" fill="${sail}" opacity="0.85"/>`;
    s += `<polygon points="50,40 50,45.5 57,42.8" fill="#e2453c"/>`;
    s += `<path d="M30 90 q6 2.4 12 0 M58 91 q6 2.4 12 0" stroke="#cfe9f7" stroke-width="1.2" fill="none" opacity="0.7"/>`;
    return s;
  }

  function drawBridge(r) {
    const steel = pick(r, ['#b5543b', '#5d6a73', '#3e6f8e']);
    let s = '';
    s += `<rect x="0" y="56" width="100" height="6" fill="#5d676e"/>` +
         `<rect x="0" y="56" width="100" height="2" fill="#828d94"/>`;
    s += `<rect x="27" y="32" width="5.5" height="30" fill="${steel}"/>` +
         `<rect x="67.5" y="32" width="5.5" height="30" fill="${steel}"/>`;
    s += `<path d="M0 50 Q30 30 50 45 Q70 30 100 50" fill="none" stroke="${steel}" stroke-width="2.4"/>`;
    for (const hx of [12, 20, 40, 50, 60, 80, 88]) {
      const cy = hx < 30 ? 44 - Math.abs(hx - 30) * 0.3 : hx < 50 ? 38 + Math.abs(hx - 50) * 0.25 : hx < 70 ? 38 + Math.abs(hx - 50) * 0.25 : 44 - Math.abs(hx - 70) * 0.3;
      s += `<line x1="${hx}" y1="${cy.toFixed(1)}" x2="${hx}" y2="56" stroke="${steel}" stroke-width="1.1" opacity="0.85"/>`;
    }
    s += `<path d="M0 62 l27 18 v12 H0 z M100 62 l-27 18 v12 h27 z" fill="#4d575e" opacity="0.5"/>`; // banks/piers
    return s;
  }

  function drawMotorcycle(r) {
    const body = pick(r, ['#d2453f', '#2c3136', '#2e7fb8', '#e08a2e']);
    let s = `<ellipse cx="52" cy="90" rx="32" ry="2.4" fill="#000" opacity="0.15"/>`;
    const wheel = (cx) =>
      `<circle cx="${cx}" cy="77" r="10.5" fill="#23272b"/>` +
      `<circle cx="${cx}" cy="77" r="6.2" fill="#3c4347"/>` +
      `<circle cx="${cx}" cy="77" r="2.6" fill="#9aa6ad"/>`;
    s += wheel(30) + wheel(72);
    s += `<path d="M30 77 L44 62 L62 62 L72 77" stroke="#444b50" stroke-width="3" fill="none" stroke-linejoin="round"/>`;
    s += `<path d="M36 64 q10 -8 26 -4 l4 6 q-4 6 -16 6 q-10 0 -14 -8 z" fill="${body}"/>`;       // tank+body
    s += `<rect x="33" y="58" width="13" height="4.5" rx="2" fill="#23272b"/>`;                    // seat
    s += `<path d="M64 60 L72 48 M68 47 q5 -2 8 1" stroke="#2c3136" stroke-width="2.6" fill="none" stroke-linecap="round"/>`; // bars
    s += `<circle cx="74.5" cy="59" r="3" fill="#ffe28a" stroke="#8c8c8c" stroke-width="1"/>`;     // headlight
    s += `<path d="M34 74 L58 80" stroke="#aeb6bc" stroke-width="3" stroke-linecap="round"/>`;     // exhaust
    s += `<path d="M22 72 a11 11 0 0 1 9 -6 M64 70 a11 11 0 0 1 14 2" stroke="${body}" stroke-width="2.6" fill="none"/>`; // fenders
    return s;
  }

  function drawMountains(r, horizonY) {
    const far = pick(r, ['#8fa3b8', '#9aa8c4']);
    const near = pick(r, ['#5d7490', '#69806f', '#6b7a99']);
    let s = '';
    const p1 = rb(r, 18, 34), p2 = rb(r, 56, 78);
    s += `<polygon points="${(p1 - 30).toFixed(0)},${horizonY + 2} ${p1.toFixed(0)},26 ${(p1 + 30).toFixed(0)},${horizonY + 2}" fill="${far}"/>`;
    s += `<polygon points="${(p1 - 7).toFixed(0)},40 ${p1.toFixed(0)},26 ${(p1 + 7).toFixed(0)},40 ${(p1 + 3).toFixed(0)},37 ${p1.toFixed(0)},41 ${(p1 - 3).toFixed(0)},37" fill="#f4f8fb"/>`;
    s += `<polygon points="${(p2 - 34).toFixed(0)},${horizonY + 2} ${p2.toFixed(0)},16 ${(p2 + 34).toFixed(0)},${horizonY + 2}" fill="${near}"/>`;
    s += `<polygon points="${(p2 - 9).toFixed(0)},33 ${p2.toFixed(0)},16 ${(p2 + 9).toFixed(0)},33 ${(p2 + 4).toFixed(0)},29 ${p2.toFixed(0)},34 ${(p2 - 4).toFixed(0)},29" fill="#ffffff"/>`;
    // foreground pines
    for (let i = 0; i < 3; i++) {
      const x = rb(r, 8, 92), y = rb(r, horizonY + 6, 88), h = rb(r, 8, 13);
      s += `<polygon points="${x.toFixed(1)},${(y - h).toFixed(1)} ${(x - h * 0.42).toFixed(1)},${y.toFixed(1)} ${(x + h * 0.42).toFixed(1)},${y.toFixed(1)}" fill="#3c6b46"/>` +
           `<rect x="${(x - 0.9).toFixed(1)}" y="${y.toFixed(1)}" width="1.8" height="3" fill="#6d4c35"/>`;
    }
    return s;
  }

  /* ---------- filler details (object-free scenes) ---------- */
  function fillerDetail(r, horizonY) {
    const kind = ri(r, 0, 3);
    if (kind === 0) { // storefront
      const c = pick(r, ['#c8856e', '#7e9bb5', '#a3b58e', '#bfa3c4']);
      let s = `<rect x="16" y="${horizonY - 38}" width="68" height="${38 + 30}" fill="${c}"/>`;
      s += `<rect x="16" y="${horizonY - 4}" width="68" height="7" fill="#fff" opacity="0.85"/>`;
      s += `<rect x="22" y="${horizonY + 8}" width="24" height="22" rx="1.5" fill="#d9ecf5"/>`;
      s += `<rect x="54" y="${horizonY + 8}" width="14" height="28" rx="1.5" fill="#6d5648"/>`;
      s += `<circle cx="65.5" cy="${horizonY + 22}" r="1.2" fill="#e8c94f"/>`;
      for (let i = 0; i < 3; i++) s += `<rect x="${24 + i * 20}" y="${horizonY - 30}" width="12" height="14" rx="1.5" fill="#dde9f2"/>`;
      return s;
    }
    if (kind === 1) { // park trees + bench-free lawn
      let s = '';
      for (let i = 0; i < 2; i++) {
        const x = rb(r, 22, 78), gy = rb(r, horizonY + 10, horizonY + 18);
        const g = pick(r, ['#5f9e54', '#74ad62', '#4d8a4a']);
        s += `<rect x="${(x - 2).toFixed(1)}" y="${(gy - 4).toFixed(1)}" width="4" height="16" fill="#8a6248"/>` +
             `<circle cx="${x.toFixed(1)}" cy="${(gy - 14).toFixed(1)}" r="12" fill="${g}"/>` +
             `<circle cx="${(x - 8).toFixed(1)}" cy="${(gy - 8).toFixed(1)}" r="8" fill="${g}" opacity="0.9"/>` +
             `<circle cx="${(x + 8).toFixed(1)}" cy="${(gy - 9).toFixed(1)}" r="8.5" fill="${g}" opacity="0.9"/>`;
      }
      return s;
    }
    if (kind === 2) { // picket fence + bushes
      let s = '';
      s += `<rect x="0" y="${horizonY + 8}" width="100" height="2.6" fill="#e7e2d6"/>` +
           `<rect x="0" y="${horizonY + 16}" width="100" height="2.6" fill="#e7e2d6"/>`;
      for (let x = 4; x < 100; x += 9) {
        s += `<polygon points="${x},${horizonY + 24} ${x},${horizonY + 4} ${x + 2.5},${horizonY + 1} ${x + 5},${horizonY + 4} ${x + 5},${horizonY + 24}" fill="#f2eee2"/>`;
      }
      s += `<circle cx="${rb(r, 12, 30).toFixed(0)}" cy="${horizonY + 24}" r="7" fill="#5f9e54"/>` +
           `<circle cx="${rb(r, 60, 86).toFixed(0)}" cy="${horizonY + 25}" r="8" fill="#4d8a4a"/>`;
      return s;
    }
    // mailbox-and-puddle quiet street
    let s = `<ellipse cx="${rb(r, 25, 70).toFixed(0)}" cy="${horizonY + 22}" rx="13" ry="3" fill="#9fb4c2" opacity="0.55"/>`;
    s += `<rect x="70" y="${horizonY - 2}" width="3" height="18" fill="#4d585f"/>` +
         `<rect x="64" y="${horizonY - 12}" width="15" height="10" rx="4" fill="#2e6fb0"/>` +
         `<rect x="64" y="${horizonY - 12}" width="4" height="10" rx="2" fill="#245a91"/>`;
    return s;
  }

  /* =========================================================
     SCENE COMPOSER
     ========================================================= */
  const DRAWERS = {
    traffic:    { ground: ['road', 'sidewalk'],  backdrop: ['buildings', 'trees'], draw: drawTrafficLight },
    hydrant:    { ground: ['sidewalk', 'grass'], backdrop: ['buildings', 'trees'], draw: drawHydrant },
    bus:        { ground: ['road'],              backdrop: ['buildings', 'trees'], draw: drawBus },
    bicycle:    { ground: ['road', 'sidewalk'],  backdrop: ['buildings', 'trees'], draw: drawBicycle },
    car:        { ground: ['road'],              backdrop: ['buildings', 'trees'], draw: drawCar },
    crosswalk:  { ground: ['road'],              backdrop: ['buildings'],          draw: null }, // ground feature
    palm:       { ground: ['sand', 'grass'],     backdrop: ['none'],               draw: drawPalm },
    stairs:     { ground: ['sidewalk'],          backdrop: ['buildings', 'none'],  draw: drawStairs },
    boat:       { ground: ['water'],             backdrop: ['none'],               draw: drawBoat },
    bridge:     { ground: ['water'],             backdrop: ['none'],               draw: null }, // spans the scene
    motorcycle: { ground: ['road'],              backdrop: ['buildings', 'trees'], draw: drawMotorcycle },
    mountain:   { ground: ['grass'],             backdrop: ['none'],               draw: null }, // is the backdrop
    filler:     { ground: ['road', 'sidewalk', 'grass'], backdrop: ['buildings', 'trees', 'none'], draw: null },
  };

  const GROUNDS = { road: groundRoad, sidewalk: groundSidewalk, grass: groundGrass, water: groundWater, sand: groundSand };

  function makeTile(r, key) {
    const spec = DRAWERS[key] || DRAWERS.filler;
    const horizonY = Math.round(rb(r, 56, 64));
    const ground = pick(r, spec.ground);
    const backdrop = pick(r, spec.backdrop);

    let inner = skyBlock(r, horizonY);
    if (key === 'mountain') {
      inner += drawMountains(r, horizonY);
    } else if (backdrop === 'buildings') {
      inner += buildingsBlock(r, horizonY);
    } else if (backdrop === 'trees') {
      inner += treelineBlock(r, horizonY);
    }
    inner += GROUNDS[ground](r, horizonY);

    if (key === 'crosswalk') inner += drawCrosswalkStripes(r, horizonY);
    else if (key === 'bridge') inner += drawBridge(r);
    else if (key === 'filler') inner += fillerDetail(r, horizonY);
    else if (spec.draw) inner += spec.draw(r);

    // subtle vignette + grain-ish noise lines for a photographic feel
    inner += `<rect width="100" height="100" fill="none" stroke="#000" stroke-width="3" opacity="0.05"/>`;
    return `<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" role="img">${inner}</svg>`;
  }

  /* =========================================================
     CHALLENGE POOL — 12 categories × 4 seeds = 48 captchas
     ========================================================= */
  const CATEGORIES = [
    { key: 'traffic',    label: 'traffic lights' },
    { key: 'hydrant',    label: 'fire hydrants' },
    { key: 'bus',        label: 'buses' },
    { key: 'bicycle',    label: 'bicycles' },
    { key: 'car',        label: 'cars' },
    { key: 'crosswalk',  label: 'crosswalks' },
    { key: 'palm',       label: 'palm trees' },
    { key: 'stairs',     label: 'stairs' },
    { key: 'boat',       label: 'boats' },
    { key: 'bridge',     label: 'bridges' },
    { key: 'motorcycle', label: 'motorcycles' },
    { key: 'mountain',   label: 'mountains' },
  ];

  // visually-confusable pairs never appear as distractors for each other
  const EXCLUDE = {
    bicycle: ['motorcycle'], motorcycle: ['bicycle'],
    bus: ['car'], car: ['bus', 'motorcycle'],
    boat: ['bridge'], bridge: ['boat'],
  };

  const POOL = [];
  CATEGORIES.forEach((cat, ci) => {
    for (let v = 0; v < 4; v++) {
      POOL.push({ id: ci * 4 + v, key: cat.key, label: cat.label, seed: (ci + 1) * 7919 + v * 104729 });
    }
  });

  /** Build the 9 tiles for one challenge. Deterministic per seed. */
  function buildChallenge(ch, reroll) {
    const r = mulberry32(ch.seed + (reroll ? Math.floor(Math.random() * 1e9) : 0));
    const targetCount = ri(r, 3, 5);
    const idxs = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    // shuffle
    for (let i = idxs.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [idxs[i], idxs[j]] = [idxs[j], idxs[i]];
    }
    const targetSet = new Set(idxs.slice(0, targetCount));
    const banned = new Set([ch.key, ...(EXCLUDE[ch.key] || [])]);
    const distractorKeys = CATEGORIES.map(c => c.key).filter(k => !banned.has(k));

    const tiles = [];
    for (let i = 0; i < 9; i++) {
      const isTarget = targetSet.has(i);
      let key;
      if (isTarget) key = ch.key;
      else key = r() < 0.42 ? 'filler' : pick(r, distractorKeys);
      tiles.push({ svg: makeTile(r, key), isTarget });
    }
    return { label: ch.label, tiles };
  }

  return { POOL, buildChallenge, CATEGORIES };
})();
