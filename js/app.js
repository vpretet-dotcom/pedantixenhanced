// ══════════════════════════════════════
// Pedantix — Main Application Entry Point
// ══════════════════════════════════════
import * as S from './state.js';
import { CATEGORIES } from './config.js';
import { showToast, renderGame, renderGuesses, updateStats, updateGame, renderGuessItem, toastFeedback, proxColor, updatePlayersBar, updateColabPlayerList, proxTxtColor } from './ui.js';
import { sndFound, sndWin, sndDup, launchConfetti, cascadeTitle } from './audio.js';
import { startTimer, stopTimer, getElapsedSeconds, formatTime, updateTimerDisplay } from './timer.js';
import { initGame, guess, revealByNorm, computeScore, articleKey } from './game.js';
import { fetchArticle, fetchFromCategories } from './wiki.js';
import { showLoadingAd, hideLoadingAd, showWinAd, hideWinAd } from './ads.js';
import { colabCreateSession, colabJoinSession, colabWriteArticle, loadColabGame, setupColabGameListeners, colabSubmitGuess, cleanupColab } from './colab.js';
import { submitScore, openLeaderboard, refreshLeaderboard } from './leaderboard.js';
import { getParisDate, formatDateFr, getCountdownToMidnightParis, isDailyDone, getDailyResult, renderDailyOverlay, loadOrCreateDailyArticle } from './daily.js';

// ══════════════════════════════════════
// ── Theme Toggle
// ══════════════════════════════════════
const themeBtn = document.getElementById('theme-btn');
let _isDark = true;
themeBtn.addEventListener('click', () => {
  _isDark = !_isDark;
  document.documentElement.dataset.theme = _isDark ? 'dark' : 'light';
  themeBtn.textContent = _isDark ? '🌙' : '☀️';
  document.querySelectorAll('.word-block.hidden').forEach(el => {
    const tok = S.game?.allW.find(t => t.id == el.dataset.id);
    if (tok) el.style.backgroundColor = proxColor(tok.bestProx);
  });
});

// ══════════════════════════════════════
// ── Difficulty
// ══════════════════════════════════════
document.querySelectorAll('.diff-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    S.setCurrentDiff(btn.dataset.diff);
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// ══════════════════════════════════════
// ── Category UI
// ══════════════════════════════════════
function buildCatGrid() {
  const g = document.getElementById('cat-grid'); g.innerHTML = '';
  CATEGORIES.forEach(cat => {
    const el = document.createElement('div'); el.className = 'cat-item'; el.dataset.id = cat.id;
    el.innerHTML = `<div class="cat-bar" style="background:${cat.color}"></div><div class="cat-check">✓</div><span class="cat-icon">${cat.icon}</span><div class="cat-name">${cat.name}</div><div class="cat-desc">${cat.desc}</div>`;
    el.addEventListener('click', () => {
      if (S.selectedCats.has(cat.id)) { S.selectedCats.delete(cat.id); el.classList.remove('selected'); } else { S.selectedCats.add(cat.id); el.classList.add('selected'); }
      const n = S.selectedCats.size; document.getElementById('cat-sel-count').textContent = n; document.getElementById('play-btn').disabled = n === 0;
    });
    g.appendChild(el);
  });
}

function openCatOverlay() {
  document.getElementById('cat-overlay').classList.remove('hidden');
  const closeBtn = document.getElementById('cat-close-btn');
  if (S.hasPlayedOnce && S.game) closeBtn.classList.add('visible');
  else closeBtn.classList.remove('visible');
  setCatMode(S.catGameMode);
}

function closeCatOverlay() { document.getElementById('cat-overlay').classList.add('hidden'); }

function setCatMode(mode) {
  S.setCatGameModeState(mode);
  document.getElementById('mode-random-btn').classList.toggle('active', mode === 'random');
  document.getElementById('mode-daily-btn').classList.toggle('active', mode === 'daily');
  const randomOpts = document.getElementById('cat-random-options');
  const dailyOpts = document.getElementById('cat-daily-options');
  randomOpts.style.display = mode === 'random' ? '' : 'none';
  dailyOpts.style.display = mode === 'daily' ? '' : 'none';
  if (mode === 'daily') {
    try { updateCatDailyInfo(); } catch (e) { console.warn('updateCatDailyInfo error:', e); }
  }
}

function updateCatDailyInfo() {
  const today = getParisDate(0);
  document.getElementById('cat-daily-date').textContent = `📅 ${formatDateFr(today)}`;
  const updateCD = () => {
    const el = document.getElementById('cat-daily-countdown');
    if (el) el.textContent = `Prochain article dans ${getCountdownToMidnightParis()}`;
  };
  updateCD();
  const statusEl = document.getElementById('cat-daily-status');
  const done = isDailyDone(today);
  const result = getDailyResult(today);
  if (done && result) {
    statusEl.innerHTML = `<div class="daily-status-done"><p>✅ Déjà complété aujourd'hui !</p><p style="font-size:.78rem;color:var(--text-2);margin-top:.3rem">${result.pseudo || 'Anonyme'} — ⏱ ${formatTime(result.time)} — ${result.guesses} essais — Score: <strong style="color:var(--accent)">${result.score}</strong></p></div>`;
  } else {
    statusEl.innerHTML = '';
  }
}

buildCatGrid();
document.getElementById('cat-close-btn').addEventListener('click', closeCatOverlay);
document.getElementById('mode-random-btn').addEventListener('click', () => setCatMode('random'));
document.getElementById('mode-daily-btn').addEventListener('click', () => setCatMode('daily'));
document.getElementById('surprise-btn').addEventListener('click', () => { closeCatOverlay(); S.setHasPlayedOnce(true); startGame(null); });
document.getElementById('play-btn').addEventListener('click', () => { closeCatOverlay(); S.setHasPlayedOnce(true); startGame([...S.selectedCats]); });
document.getElementById('play-daily-today-btn').addEventListener('click', () => { closeCatOverlay(); S.setHasPlayedOnce(true); startDailyGame(getParisDate(0)); });
document.getElementById('play-daily-yesterday-btn').addEventListener('click', () => { closeCatOverlay(); S.setHasPlayedOnce(true); startDailyGame(getParisDate(-1)); });
document.getElementById('cat-btn').addEventListener('click', openCatOverlay);

// ══════════════════════════════════════
// ── Main Game Flow
// ══════════════════════════════════════
async function startGame(catIds) {
  showLoadingAd();
  hideWinAd();
  document.getElementById('loading-overlay').classList.remove('hidden');
  document.getElementById('win-overlay').classList.add('hidden');
  document.getElementById('title-area').innerHTML = '';
  document.getElementById('text-area').innerHTML = '';
  document.getElementById('guess-list').innerHTML = '<div class="guess-empty">Aucun mot proposé</div>';
  document.getElementById('sidebar-count').textContent = '0';
  ['guess-count-val', 'found-count-val', 'total-count-val', 'pct-val'].forEach(id => document.getElementById(id).textContent = '0');
  document.getElementById('guess-btn').disabled = true;
  document.querySelector('.progress-wrap')?.remove();
  stopTimer();
  document.getElementById('timer-display').textContent = '';

  const diffEmoji = { easy: '🟢', normal: '🟡', hard: '🔴' }[S.currentDiff] || '🎲';
  const diffName = { easy: 'Facile', normal: 'Normal', hard: 'Difficile' }[S.currentDiff] || '';
  let catLabel = `${diffEmoji} ${diffName}`;
  if (catIds && catIds.length) {
    const names = catIds.map(id => CATEGORIES.find(c => c.id === id)?.name || id);
    const icons = catIds.map(id => CATEGORIES.find(c => c.id === id)?.icon || '');
    const catPart = names.length === 1 ? `${icons[0]} ${names[0]}` : names.join(', ');
    catLabel = `${diffEmoji} ${catPart}`;
    document.getElementById('loading-step').textContent = `${diffName} · Recherche dans : ${names.join(', ')}...`;
  } else {
    document.getElementById('loading-step').textContent = `${diffName} · Sélection en cours...`;
  }
  if (S.colabMode !== 'solo') catLabel += ' 👥';
  document.getElementById('cat-display').textContent = catLabel;

  try {
    let article = null;
    if (catIds && catIds.length) {
      article = await fetchFromCategories(catIds);
      if (!article) {
        document.getElementById('loading-step').textContent = 'Catégorie vide, mode aléatoire...';
        article = await fetchArticle();
      }
    } else {
      article = await fetchArticle();
    }
    document.getElementById('loading-step').textContent = 'Analyse du texte…';
    await new Promise(r => setTimeout(r, 10));

    if (S.colabMode === 'host') {
      await colabWriteArticle(S.colabSessionCode, article, S.currentDiff, catIds);
      renderGame(); updateStats();
      document.getElementById('loading-overlay').classList.add('hidden');
      document.getElementById('guess-btn').disabled = false;
      document.getElementById('guess-input').focus();
      document.getElementById('session-indicator').classList.remove('hidden-bar');
      document.getElementById('session-code-header').textContent = S.colabSessionCode;
      startTimer();
      S.setGameStartedAt(Date.now());
      setupColabGameListeners(S.colabSessionCode);
    } else {
      initGame(article.title, article.extract, article.url);
      renderGame(); updateStats();
      document.getElementById('loading-overlay').classList.add('hidden');
      document.getElementById('guess-btn').disabled = false;
      document.getElementById('guess-input').focus();
      document.getElementById('session-indicator').classList.add('hidden-bar');
      startTimer();
    }
  } catch (e) { document.getElementById('loading-step').textContent = '❌ ' + e.message; console.error(e); }
}

// ── Win handler
export function handleWin() {
  sndWin(); cascadeTitle(); launchConfetti();
  stopTimer();
  const time = getElapsedSeconds();
  const score = computeScore(time, S.game.guesses.length, S.game.totalWords);
  setTimeout(() => {
    document.getElementById('win-overlay').classList.remove('hidden');
    document.getElementById('win-article-title').textContent = S.game.title;
    document.getElementById('win-stats').innerHTML =
      `${S.game.guesses.length} essai(s) — ${S.game.allW.filter(t => t.revealed).length} / ${S.game.totalWords} mots<br>` +
      `⏱ ${formatTime(time)} — Score : <strong style="color:var(--accent)">${score}</strong>`;
    document.getElementById('win-wiki-link').href = S.game.url;
    document.getElementById('win-pseudo-section').style.display = S.game.abandoned ? 'none' : '';
    document.getElementById('win-pseudo-input').value = S.colabPlayerName || '';
    document.getElementById('win-publish-btn').disabled = !(S.colabPlayerName || '');
    document.getElementById('win-publish-status').innerHTML = '';
    document.getElementById('win-lb-btn').style.display = 'none';
    S.setScorePublished(false);
  }, 1800);
  showWinAd();
}

// ── Submit guess
function submitGuess() {
  const inp = document.getElementById('guess-input'), w = inp.value.trim();
  if (!w || !S.game || S.game.won) return;
  inp.value = '';
  const r = guess(w);
  if (r?.dup) { sndDup(); inp.placeholder = `"${w}" déjà proposé !`; setTimeout(() => inp.placeholder = 'Proposez un mot…', 1500); return; }
  const ni = r?.newIds || new Set();
  updateGame(ni); renderGuesses(); updateStats();
  sndFound(r?.found || 0);
  const [msg, col] = toastFeedback(r?.found || 0, r?.sim || 0);
  showToast(msg, col);

  if (S.colabMode !== 'solo' && S.colabSessionCode) {
    colabSubmitGuess(w, r);
  }

  if (S.game.won && !S.game._winHandled) {
    S.game._winHandled = true;
    handleWin();
  }
  inp.focus();
}

// ══════════════════════════════════════
// ── Daily Game
// ══════════════════════════════════════
async function startDailyGame(dateKey) {
  showLoadingAd();
  hideWinAd();
  S.setDailyActiveDate(dateKey);
  document.getElementById('daily-overlay').classList.add('hidden');
  document.getElementById('loading-overlay').classList.remove('hidden');
  document.getElementById('loading-step').textContent = `📅 Chargement de la page du ${formatDateFr(dateKey)}...`;
  document.getElementById('win-overlay').classList.add('hidden');
  document.getElementById('title-area').innerHTML = '';
  document.getElementById('text-area').innerHTML = '';
  document.getElementById('guess-list').innerHTML = '<div class="guess-empty">Aucun mot proposé</div>';
  document.getElementById('sidebar-count').textContent = '0';
  ['guess-count-val', 'found-count-val', 'total-count-val', 'pct-val'].forEach(id => document.getElementById(id).textContent = '0');
  document.getElementById('guess-btn').disabled = true;
  document.querySelector('.progress-wrap')?.remove();
  stopTimer();

  try {
    const article = await loadOrCreateDailyArticle(dateKey);
    document.getElementById('loading-step').textContent = 'Analyse du texte…';
    await new Promise(r => setTimeout(r, 10));
    S.setCurrentDiff('normal');
    initGame(article.title, article.extract, article.url);
    renderGame(); updateStats();
    document.getElementById('cat-display').innerHTML = `<span class="daily-badge"><span class="daily-dot"></span>QUOTIDIEN</span> ${formatDateFr(dateKey)}`;
    document.getElementById('loading-overlay').classList.add('hidden');
    document.getElementById('guess-btn').disabled = false;
    document.getElementById('guess-input').focus();
    document.getElementById('session-indicator').classList.add('hidden-bar');
    startTimer();
  } catch (e) {
    document.getElementById('loading-step').textContent = '❌ ' + e.message;
    console.error(e);
  }
}
window.startDailyGame = startDailyGame;

// ══════════════════════════════════════
// ── Event Listeners
// ══════════════════════════════════════
document.getElementById('guess-btn').addEventListener('click', submitGuess);
document.getElementById('guess-input').addEventListener('keydown', e => { if (e.key === 'Enter') submitGuess() });
document.getElementById('new-game-btn').addEventListener('click', () => {
  S.setDailyActiveDate(null);
  if (S.colabMode === 'host') { openCatOverlay(); }
  else if (S.colabMode === 'guest') { showToast('Le host doit lancer la prochaine partie', '#f59e0b'); }
  else { openCatOverlay(); }
});
document.getElementById('win-new-game-btn').addEventListener('click', () => {
  document.getElementById('win-overlay').classList.add('hidden');
  S.setDailyActiveDate(null);
  if (S.colabMode === 'host') { openCatOverlay(); }
  else if (S.colabMode === 'guest') { showToast('En attente du host pour la prochaine partie...', '#f59e0b'); }
  else { openCatOverlay(); }
});
document.getElementById('reveal-btn').addEventListener('click', () => {
  if (!S.game || !confirm('Abandonner et révéler tous les mots ?')) return;
  const ni = new Set(S.game.allW.filter(t => !t.revealed).map(t => t.id));
  S.game.allW.forEach(t => t.revealed = true);
  S.game.won = true; S.game.abandoned = true;
  stopTimer();
  updateGame(ni); updateStats(); cascadeTitle();
  setTimeout(() => {
    document.getElementById('win-overlay').classList.remove('hidden');
    document.getElementById('win-article-title').textContent = S.game.title;
    document.getElementById('win-stats').innerHTML = `Abandonné — ${S.game.guesses.length} essai(s)`;
    document.getElementById('win-wiki-link').href = S.game.url;
    document.getElementById('win-pseudo-section').style.display = 'none';
  }, 1200);
});

// ── Win publish
document.getElementById('win-pseudo-input').addEventListener('input', e => {
  document.getElementById('win-publish-btn').disabled = !e.target.value.trim();
});
document.getElementById('win-publish-btn').addEventListener('click', async () => {
  if (S.scorePublished) return;
  const pseudo = document.getElementById('win-pseudo-input').value.trim();
  if (!pseudo) return;
  const btn = document.getElementById('win-publish-btn');
  btn.disabled = true; btn.textContent = '...';
  try {
    await submitScore(pseudo);
    S.setScorePublished(true);
    document.getElementById('win-publish-status').innerHTML = '<span class="score-published">✅ Score publié ! 🎉</span>';
    btn.textContent = '✅ Publié';
    document.getElementById('win-lb-btn').style.display = '';
  } catch (e) {
    document.getElementById('win-publish-status').innerHTML = '<span style="color:#ef4444;font-size:.78rem">❌ Erreur — vérifiez Firebase</span>';
    btn.disabled = false; btn.textContent = 'Réessayer';
  }
});
document.getElementById('win-lb-btn').addEventListener('click', () => {
  document.getElementById('win-overlay').classList.add('hidden');
  S.setLbView('article');
  S.setLbCurrentArticle(S.game?.title || '');
  document.querySelectorAll('.lb-view-btn').forEach(b => b.classList.toggle('active', b.dataset.view === 'article'));
  openLeaderboard();
});

// ── Leaderboard UI
document.getElementById('lb-btn').addEventListener('click', openLeaderboard);
document.getElementById('lb-close-btn').addEventListener('click', () => document.getElementById('lb-overlay').classList.add('hidden'));
document.querySelectorAll('.lb-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    S.setLbSort(btn.dataset.sort);
    document.querySelectorAll('.lb-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    refreshLeaderboard();
  });
});
document.querySelectorAll('.lb-view-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    S.setLbView(btn.dataset.view);
    document.querySelectorAll('.lb-view-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    refreshLeaderboard();
  });
});

// ── Multiplayer overlay UI
const colabOverlay = document.getElementById('colab-overlay');
const colabModeSelect = document.getElementById('colab-mode-select');
const colabCreateView = document.getElementById('colab-create-view');
const colabJoinView = document.getElementById('colab-join-view');

function showColabStep(step) {
  colabModeSelect.style.display = step === 'select' ? '' : 'none';
  colabCreateView.classList.toggle('active', step === 'create');
  colabJoinView.classList.toggle('active', step === 'join');
}

document.getElementById('colab-btn').addEventListener('click', () => {
  showColabStep('select');
  colabOverlay.classList.remove('hidden');
  document.getElementById('colab-join-error').textContent = '';
  document.getElementById('colab-join-waiting').style.display = 'none';
});
document.getElementById('colab-close-btn').addEventListener('click', () => colabOverlay.classList.add('hidden'));
document.getElementById('colab-back-create').addEventListener('click', () => { showColabStep('select'); cleanupColab(); S.setColabMode('solo'); });
document.getElementById('colab-back-join').addEventListener('click', () => { showColabStep('select'); cleanupColab(); S.setColabMode('solo'); });

document.getElementById('colab-create-mode').addEventListener('click', async () => {
  const pseudo = document.getElementById('colab-pseudo').value.trim();
  if (!pseudo) { document.getElementById('colab-pseudo').focus(); showToast('Entrez un pseudo !', '#f59e0b'); return; }
  showColabStep('create');
  try {
    const code = await colabCreateSession(pseudo);
    const display = document.getElementById('colab-code-display');
    display.innerHTML = '';
    for (const ch of code) {
      const d = document.createElement('div'); d.className = 'code-char'; d.textContent = ch;
      display.appendChild(d);
    }
  } catch (e) { showColabStep('select'); }
});

document.getElementById('colab-copy-btn').addEventListener('click', () => {
  navigator.clipboard.writeText(S.colabSessionCode).then(() => showToast('Code copié ! 📋', '#22c55e'));
});

document.getElementById('colab-launch-btn').addEventListener('click', () => {
  colabOverlay.classList.add('hidden');
  openCatOverlay();
});

document.getElementById('colab-join-mode').addEventListener('click', () => {
  const pseudo = document.getElementById('colab-pseudo').value.trim();
  if (!pseudo) { document.getElementById('colab-pseudo').focus(); showToast('Entrez un pseudo !', '#f59e0b'); return; }
  showColabStep('join');
});

document.getElementById('colab-join-btn').addEventListener('click', async () => {
  const code = document.getElementById('colab-code-input').value.trim().toUpperCase();
  const pseudo = document.getElementById('colab-pseudo').value.trim();
  const errEl = document.getElementById('colab-join-error');
  errEl.textContent = '';
  if (!code || code.length !== 6) { errEl.textContent = 'Le code doit faire 6 caractères'; return; }
  if (!pseudo) { errEl.textContent = 'Entrez un pseudo'; return; }
  try {
    const session = await colabJoinSession(code, pseudo);
    document.getElementById('colab-join-waiting').style.display = '';
    document.getElementById('colab-code-input').disabled = true;
    document.getElementById('colab-join-btn').disabled = true;
    if (session.status === 'playing') { await loadColabGame(code); }
  } catch (e) {
    errEl.textContent = e.message || 'Erreur de connexion';
  }
});

document.getElementById('session-code-header').addEventListener('click', () => {
  if (S.colabSessionCode) navigator.clipboard.writeText(S.colabSessionCode).then(() => showToast('Code copié ! 📋', '#22c55e'));
});

// ── Daily overlay UI
document.getElementById('daily-close-btn').addEventListener('click', () => {
  document.getElementById('daily-overlay').classList.add('hidden');
  clearInterval(S.dailyCountdownInterval);
});
document.querySelectorAll('.daily-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    S.setDailySelectedDay(btn.dataset.day);
    document.querySelectorAll('.daily-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderDailyOverlay();
  });
});
document.querySelectorAll('.daily-sort-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    S.setDailySort(btn.dataset.sort);
    document.querySelectorAll('.daily-sort-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderDailyOverlay();
  });
});

// ══════════════════════════════════════
// ── First Load: show category selector
// ══════════════════════════════════════
openCatOverlay();
