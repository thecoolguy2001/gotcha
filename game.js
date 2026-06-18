/* =========================================================
   CAPTCHA Sprint — game logic
   10 rounds · one clock · localStorage leaderboard
   ========================================================= */
(() => {
  'use strict';

  const ROUNDS = 10;
  const BASE_PTS = 1000;       // max points per captcha
  const DECAY_PER_SEC = 18;    // points lost per second on a round
  const WRONG_PENALTY = 100;   // points lost per failed verify
  const MIN_PTS = 100;

  const LS_SCORES = 'cs_scores';
  const LS_PLAYER = 'cs_player';

  const $ = (id) => document.getElementById(id);
  const screens = {
    home: $('screen-home'), game: $('screen-game'),
    results: $('screen-results'), board: $('screen-board'),
  };

  /* ---------- state ---------- */
  let run = null;        // current run state
  let timerInterval = null;

  /* ---------- helpers ---------- */
  function fmtTime(ms) {
    const t = Math.max(0, ms);
    const m = Math.floor(t / 60000);
    const s = Math.floor((t % 60000) / 1000);
    const tenth = Math.floor((t % 1000) / 100);
    return `${m}:${String(s).padStart(2, '0')}.${tenth}`;
  }
  function show(name) {
    Object.entries(screens).forEach(([k, el]) => { el.hidden = k !== name; });
    $('hud').hidden = name !== 'game';
    $('topnav').hidden = name === 'game';
    window.scrollTo(0, 0);
  }
  function snackbar(msg) {
    const sb = $('snackbar');
    sb.textContent = msg;
    sb.classList.add('on');
    clearTimeout(sb._t);
    sb._t = setTimeout(() => sb.classList.remove('on'), 2600);
  }
  const loadScores = () => { try { return JSON.parse(localStorage.getItem(LS_SCORES)) || []; } catch { return []; } };
  const saveScores = (s) => localStorage.setItem(LS_SCORES, JSON.stringify(s));

  /* ---------- home: anchor checkbox ---------- */
  const anchor = $('anchor');
  function startFromAnchor() {
    if (anchor.classList.contains('spinning')) return;
    anchor.classList.add('spinning');
    setTimeout(() => {
      anchor.classList.remove('spinning');
      anchor.classList.add('checked');
      setTimeout(() => {
        anchor.classList.remove('checked');
        startRun();
      }, 350);
    }, 900);
  }
  anchor.addEventListener('click', startFromAnchor);
  anchor.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startFromAnchor(); }
  });

  function renderBestStrip() {
    const scores = loadScores();
    const strip = $('best-strip');
    if (!scores.length) { strip.hidden = true; return; }
    const best = scores.reduce((a, b) => (b.score > a.score ? b : a));
    $('best-chip').innerHTML =
      `High score: <b>${best.score.toLocaleString()}</b> pts · ${fmtTime(best.timeMs)} — ${escapeHtml(best.name)}`;
    strip.hidden = false;
  }

  /* ---------- the run ---------- */
  function startRun() {
    // 10 distinct categories per run, each with a random seed variant
    const cats = Scenes.CATEGORIES.map(c => c.key);
    for (let i = cats.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cats[i], cats[j]] = [cats[j], cats[i]];
    }
    const challenges = cats.slice(0, ROUNDS).map(key => {
      const variants = Scenes.POOL.filter(p => p.key === key);
      return variants[Math.floor(Math.random() * variants.length)];
    });
    run = {
      challenges,
      round: 0,
      startedAt: performance.now(),
      roundStartedAt: 0,
      wrongTotal: 0,
      roundResults: [],   // {label, ms, wrong, pts}
      roundWrong: 0,
      selected: new Set(),
      tiles: [],
    };
    show('game');
    buildHudDots();
    loadRound(false);
    timerInterval = setInterval(() => {
      $('hud-timer').textContent = fmtTime(performance.now() - run.startedAt);
    }, 47);
  }

  function buildHudDots() {
    const wrap = $('hud-dots');
    wrap.innerHTML = '';
    for (let i = 0; i < ROUNDS; i++) {
      const d = document.createElement('span');
      d.className = 'hud-dot';
      wrap.appendChild(d);
    }
  }
  function paintHudDots() {
    [...$('hud-dots').children].forEach((d, i) => {
      d.className = 'hud-dot' + (i < run.round ? ' done' : i === run.round ? ' now' : '');
    });
  }

  function loadRound(isReroll) {
    const ch = run.challenges[run.round];
    const built = Scenes.buildChallenge(ch, isReroll);
    run.tiles = built.tiles;
    run.selected.clear();
    if (!isReroll) { run.roundStartedAt = performance.now(); run.roundWrong = 0; }
    $('ch-target').textContent = built.label;
    $('ch-error').hidden = true;
    paintHudDots();

    const grid = $('grid');
    grid.innerHTML = '';
    built.tiles.forEach((tile, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tile';
      btn.style.animationDelay = `${i * 28}ms`;
      btn.setAttribute('aria-pressed', 'false');
      btn.setAttribute('aria-label', `Image ${i + 1}`);
      btn.innerHTML = tile.svg +
        `<span class="chk"><svg viewBox="0 0 24 24"><path d="M9 16.2l-3.5-3.5L4 14.2 9 19.2 20 8.2l-1.4-1.4z" fill="#fff"/></svg></span>`;
      btn.addEventListener('click', () => toggleTile(i));
      grid.appendChild(btn);
    });
  }

  function toggleTile(i) {
    if (!run) return;
    const btn = $('grid').children[i];
    if (run.selected.has(i)) {
      run.selected.delete(i);
      btn.classList.remove('sel');
      btn.setAttribute('aria-pressed', 'false');
    } else {
      run.selected.add(i);
      btn.classList.add('sel');
      btn.setAttribute('aria-pressed', 'true');
    }
    $('ch-error').hidden = true;
  }

  function verify() {
    if (!run) return;
    if (run.selected.size === 0) {
      const err = $('ch-error');
      err.textContent = 'Please select all matching images.';
      err.hidden = false;
      shakeCard();
      return;
    }
    const correct = run.tiles.every((t, i) => t.isTarget === run.selected.has(i));
    if (!correct) {
      run.roundWrong++;
      run.wrongTotal++;
      const err = $('ch-error');
      err.textContent = 'Please try again.';
      err.hidden = false;
      shakeCard();
      return;
    }
    // round complete
    const ms = performance.now() - run.roundStartedAt;
    const pts = Math.max(MIN_PTS, Math.round(
      BASE_PTS - (ms / 1000) * DECAY_PER_SEC - run.roundWrong * WRONG_PENALTY
    ));
    run.roundResults.push({ label: run.challenges[run.round].label, ms, wrong: run.roundWrong, pts });

    // brief success flash, then advance
    const card = $('challenge-card');
    card.classList.add('solved');
    floatPoints(pts);
    setTimeout(() => {
      card.classList.remove('solved');
      run.round++;
      if (run.round >= ROUNDS) finishRun();
      else loadRound(false);
    }, 380);
  }

  function shakeCard() {
    const card = $('challenge-card');
    card.classList.remove('shake');
    void card.offsetWidth; // restart animation
    card.classList.add('shake');
  }

  function floatPoints(pts) {
    const el = document.createElement('div');
    el.className = 'float-pts';
    el.textContent = `+${pts}`;
    $('challenge-card').appendChild(el);
    setTimeout(() => el.remove(), 900);
  }

  function quitRun() {
    clearInterval(timerInterval);
    run = null;
    show('home');
    renderBestStrip();
  }

  /* ---------- results ---------- */
  function finishRun() {
    clearInterval(timerInterval);
    const totalMs = performance.now() - run.startedAt;
    const score = run.roundResults.reduce((a, r) => a + r.pts, 0);
    const attempts = ROUNDS + run.wrongTotal;
    const accuracy = Math.round((ROUNDS / attempts) * 100);
    run.final = { totalMs, score, accuracy };

    $('res-time').textContent = fmtTime(totalMs);
    $('res-score').textContent = score.toLocaleString();
    $('res-acc').textContent = accuracy + '%';

    // flags: new high score? flawless?
    const scores = loadScores();
    const prevBest = scores.length ? Math.max(...scores.map(s => s.score)) : 0;
    const flags = [];
    if (score > prevBest && scores.length) flags.push('🏆 New high score');
    if (!scores.length) flags.push('🚩 First run');
    if (run.wrongTotal === 0) flags.push('✨ Flawless — zero wrong verifies');
    const fastest = [...run.roundResults].sort((a, b) => a.ms - b.ms)[0];
    flags.push(`⚡ Fastest grid: ${fastest.label} in ${(fastest.ms / 1000).toFixed(1)}s`);
    $('res-flags').innerHTML = flags.map(f => `<span class="flag">${f}</span>`).join('');

    // per-round breakdown bars
    const maxMs = Math.max(...run.roundResults.map(r => r.ms));
    $('breakdown').innerHTML = run.roundResults.map((r, i) => `
      <div class="bd-row">
        <span class="bd-idx">${i + 1}</span>
        <span class="bd-label">${escapeHtml(r.label)}${r.wrong ? ` <i class="bd-wrong">×${r.wrong}</i>` : ''}</span>
        <span class="bd-bar"><i style="width:${Math.max(6, (r.ms / maxMs) * 100).toFixed(1)}%"></i></span>
        <span class="bd-ms">${(r.ms / 1000).toFixed(1)}s</span>
        <span class="bd-pts">+${r.pts}</span>
      </div>`).join('');

    $('player-name').value = localStorage.getItem(LS_PLAYER) || '';
    $('save-form').hidden = false;
    show('results');
    confettiBurst();
  }

  $('save-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!run || !run.final) return;
    const name = $('player-name').value.trim().slice(0, 16) || 'Anonymous';
    localStorage.setItem(LS_PLAYER, name);
    const scores = loadScores();
    scores.push({
      name,
      score: run.final.score,
      timeMs: Math.round(run.final.totalMs),
      accuracy: run.final.accuracy,
      date: Date.now(),
    });
    scores.sort((a, b) => b.score - a.score);
    saveScores(scores.slice(0, 50));
    $('save-form').hidden = true;
    renderBoard(run.final.score, Math.round(run.final.totalMs));
    show('board');
  });

  $('btn-again').addEventListener('click', () => startRun());

  /* ---------- leaderboard ---------- */
  function renderBoard(justScore, justTime) {
    const scores = loadScores();
    const body = $('board-body');
    const empty = $('board-empty');
    const table = $('board-table');
    $('board-stats').innerHTML = scores.length
      ? `<span>${scores.length} run${scores.length > 1 ? 's' : ''} recorded</span>` +
        `<span>best ${Math.max(...scores.map(s => s.score)).toLocaleString()} pts</span>` +
        `<span>fastest ${fmtTime(Math.min(...scores.map(s => s.timeMs)))}</span>`
      : '';
    if (!scores.length) {
      table.hidden = true; empty.hidden = false; body.innerHTML = '';
      return;
    }
    table.hidden = false; empty.hidden = true;
    const medal = (i) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1);
    let highlighted = false;
    body.innerHTML = scores.map((s, i) => {
      const isJust = !highlighted && justScore != null && s.score === justScore && s.timeMs === justTime;
      if (isJust) highlighted = true;
      return `<tr class="${isJust ? 'just-saved' : ''}">
        <td class="th-rank">${medal(i)}</td>
        <td class="td-name">${escapeHtml(s.name)}</td>
        <td class="th-num td-score">${s.score.toLocaleString()}</td>
        <td class="th-num">${fmtTime(s.timeMs)}</td>
        <td class="th-num">${s.accuracy}%</td>
        <td class="th-date">${new Date(s.date).toLocaleDateString()}</td>
      </tr>`;
    }).join('');
  }

  $('btn-clear-board').addEventListener('click', () => {
    if (!loadScores().length) return;
    if (confirm('Clear all scores? This cannot be undone.')) {
      localStorage.removeItem(LS_SCORES);
      renderBoard();
      renderBestStrip();
    }
  });

  /* ---------- challenge bar buttons ---------- */
  $('btn-verify').addEventListener('click', verify);
  $('btn-reload').addEventListener('click', () => { if (run) loadRound(true); });
  $('btn-audio').addEventListener('click', () =>
    snackbar('Audio challenges are not available. You wouldn\'t want them on the clock anyway.'));
  $('btn-info').addEventListener('click', () =>
    snackbar(`Scoring: up to ${BASE_PTS} pts per captcha, −${DECAY_PER_SEC}/sec, −${WRONG_PENALTY} per wrong verify.`));
  $('btn-quit').addEventListener('click', quitRun);

  /* ---------- keyboard ---------- */
  document.addEventListener('keydown', (e) => {
    if (!run || screens.game.hidden) return;
    if (e.target.tagName === 'INPUT') return;
    if (e.key >= '1' && e.key <= '9') toggleTile(Number(e.key) - 1);
    else if (e.key === 'Enter') { e.preventDefault(); verify(); }
    else if (e.key === 'r' || e.key === 'R') loadRound(true);
  });

  /* ---------- nav ---------- */
  document.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const dest = el.getAttribute('data-nav');
      if (run && !screens.game.hidden) { quitRun(); }
      if (dest === 'board') { renderBoard(); show('board'); }
      else { show('home'); renderBestStrip(); }
    });
  });

  /* ---------- confetti (Google colors) ---------- */
  function confettiBurst() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const layer = $('confetti');
    const colors = ['#4285f4', '#ea4335', '#fbbc05', '#34a853'];
    for (let i = 0; i < 80; i++) {
      const p = document.createElement('i');
      p.style.left = Math.random() * 100 + 'vw';
      p.style.background = colors[i % 4];
      p.style.animationDelay = Math.random() * 0.7 + 's';
      p.style.animationDuration = 2 + Math.random() * 1.6 + 's';
      p.style.width = p.style.height = 5 + Math.random() * 6 + 'px';
      if (Math.random() < 0.5) p.style.borderRadius = '50%';
      layer.appendChild(p);
    }
    setTimeout(() => { layer.innerHTML = ''; }, 4500);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /* ---------- init ---------- */
  show('home');
  renderBestStrip();
})();
