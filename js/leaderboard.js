// ══════════════════════════════════════
// Pedantix — Leaderboard Module
// ══════════════════════════════════════
import * as S from './state.js';
import { getFirebase } from './firebase.js';
import { formatTime } from './timer.js';
import { escHtml } from './ui.js';
import { articleKey } from './game.js';

export async function submitScore(pseudo) {
  const fb = await getFirebase();
  const { getElapsedSeconds } = await import('./timer.js');
  const { computeScore } = await import('./game.js');
  const time = getElapsedSeconds();
  const guesses = S.game.guesses.length;
  const score = computeScore(time, guesses, S.game.totalWords);
  const aKey = articleKey(S.game.title);
  const entryData = {
    pseudo, time, guesses, totalWords: S.game.totalWords,
    articleTitle: S.game.title, difficulty: S.currentDiff,
    mode: S.colabMode === 'solo' ? 'solo' : 'coop',
    playerCount: S.colabMode === 'solo' ? 1 : Object.keys(S.colabPlayers).length,
    date: Date.now(), score, isDaily: !!S.dailyActiveDate
  };
  const entryRef = fb.push(fb.ref(fb.db, `leaderboard/${aKey}`));
  await fb.set(entryRef, entryData);
  if (S.dailyActiveDate) {
    const dailyRef = fb.push(fb.ref(fb.db, `daily/${S.dailyActiveDate}/scores`));
    await fb.set(dailyRef, entryData);
    localStorage.setItem(`daily_done_${S.dailyActiveDate}`, JSON.stringify({ pseudo, time, guesses, score }));
  }
}

export async function loadLeaderboard(aKey, sortBy = 'time') {
  const fb = await getFirebase();
  const snap = await fb.get(fb.ref(fb.db, `leaderboard/${aKey}`));
  if (!snap.exists()) return [];
  const entries = [];
  snap.forEach(child => entries.push({ id: child.key, ...child.val() }));
  if (sortBy === 'time') entries.sort((a, b) => a.time - b.time);
  else if (sortBy === 'guesses') entries.sort((a, b) => a.guesses - b.guesses);
  else entries.sort((a, b) => b.score - a.score);
  return entries.slice(0, 100);
}

export async function loadGlobalLeaderboard(sortBy = 'time') {
  const fb = await getFirebase();
  const snap = await fb.get(fb.ref(fb.db, 'leaderboard'));
  if (!snap.exists()) return [];
  const entries = [];
  snap.forEach(articleSnap => {
    articleSnap.forEach(child => entries.push({ id: child.key, ...child.val() }));
  });
  if (sortBy === 'time') entries.sort((a, b) => a.time - b.time);
  else if (sortBy === 'guesses') entries.sort((a, b) => a.guesses - b.guesses);
  else entries.sort((a, b) => b.score - a.score);
  return entries.slice(0, 100);
}

export function renderLeaderboard(entries, sortBy, showArticleCol = false) {
  const el = document.getElementById('lb-content');
  if (!entries.length) {
    el.innerHTML = '<div class="lb-empty">Aucun score pour le moment. Soyez le premier ! 🚀</div>';
    return;
  }
  const timeLabel = sortBy === 'time' ? ' ▲' : '';
  const guessLabel = sortBy === 'guesses' ? ' ▲' : '';
  const scoreLabel = sortBy === 'score' ? ' ▼' : '';
  const articleTh = showArticleCol ? '<th>Article</th>' : '';
  let html = `<table class="lb-table"><thead><tr>
    <th>#</th><th>Pseudo</th><th>Temps${timeLabel}</th><th>Essais${guessLabel}</th>
    <th>Score${scoreLabel}</th>${articleTh}<th>Mode</th><th>Date</th>
  </tr></thead><tbody>`;
  entries.forEach((e, i) => {
    const rank = i + 1;
    const rankClass = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '';
    const rankIcon = rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : rank;
    const modeClass = e.mode === 'coop' ? 'coop' : 'solo';
    const modeLabel = e.mode === 'coop' ? `👥 ${e.playerCount || '?'}` : '🎮';
    const diffEmoji = { easy: '🟢', normal: '🟡', hard: '🔴' }[e.difficulty] || '';
    const dateStr = new Date(e.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    const articleTd = showArticleCol ? `<td style="font-size:.72rem;color:var(--text-2);max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${diffEmoji} ${escHtml(e.articleTitle || '—')}</td>` : '';
    html += `<tr>
      <td class="lb-rank ${rankClass}">${rankIcon}</td>
      <td class="lb-pseudo">${escHtml(e.pseudo)}</td>
      <td>${formatTime(e.time)}</td>
      <td>${e.guesses}</td>
      <td style="font-weight:700;color:var(--accent)">${e.score}</td>
      ${articleTd}
      <td><span class="lb-mode-badge ${modeClass}">${modeLabel}</span></td>
      <td style="font-size:.72rem;color:var(--text-3)">${dateStr}</td>
    </tr>`;
  });
  html += '</tbody></table>';
  el.innerHTML = html;
}

export async function openLeaderboard() {
  document.getElementById('lb-overlay').classList.remove('hidden');
  document.getElementById('lb-content').innerHTML = '<div class="lb-empty" style="font-style:normal">Chargement...</div>';
  const artName = S.game?.title || S.lbCurrentArticle || '';
  document.getElementById('lb-article-name').textContent = artName ? `📄 ${artName}` : '';
  if (!artName && S.lbView === 'article') {
    S.setLbView('global');
    document.querySelectorAll('.lb-view-btn').forEach(b => b.classList.toggle('active', b.dataset.view === 'global'));
  }
  await refreshLeaderboard();
}

export async function refreshLeaderboard() {
  try {
    let entries;
    const isGlobal = S.lbView === 'global';
    if (isGlobal) {
      entries = await loadGlobalLeaderboard(S.lbSort);
      document.getElementById('lb-article-name').textContent = '🌍 Tous les articles';
    } else {
      const title = S.game?.title || S.lbCurrentArticle || '';
      if (!title) { document.getElementById('lb-content').innerHTML = '<div class="lb-empty">Lancez une partie pour voir le leaderboard de l\'article 📄</div>'; return; }
      const aKey = articleKey(title);
      entries = await loadLeaderboard(aKey, S.lbSort);
      document.getElementById('lb-article-name').textContent = `📄 ${title}`;
    }
    renderLeaderboard(entries, S.lbSort, isGlobal);
  } catch (e) {
    document.getElementById('lb-content').innerHTML = '<div class="lb-empty">❌ Impossible de charger le leaderboard.<br>Vérifiez la configuration Firebase.</div>';
  }
}
