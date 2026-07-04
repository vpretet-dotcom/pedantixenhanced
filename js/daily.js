// ══════════════════════════════════════
// Pedantix — Daily Mode Module
// ══════════════════════════════════════
import * as S from './state.js';
import { getFirebase } from './firebase.js';
import { formatTime } from './timer.js';
import { fetchMostViewed, fetchArticleByTitle } from './wiki.js';
import { renderLeaderboard } from './leaderboard.js';

export function getParisDate(offset = 0) {
  const now = new Date();
  const paris = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
  paris.setDate(paris.getDate() + offset);
  const y = paris.getFullYear(), m = String(paris.getMonth() + 1).padStart(2, '0'), d = String(paris.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatDateFr(dateKey) {
  const [y, m, d] = dateKey.split('-');
  const days = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const months = ['janvier', 'f\u00e9vrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'ao\u00fbt', 'septembre', 'octobre', 'novembre', 'd\u00e9cembre'];
  const dt = new Date(+y, +m - 1, +d);
  return `${days[dt.getDay()]} ${+d} ${months[dt.getMonth()]} ${y}`;
}

export function getCountdownToMidnightParis() {
  const now = new Date();
  const parisStr = now.toLocaleString('en-US', { timeZone: 'Europe/Paris', hour12: false });
  const paris = new Date(parisStr);
  const h = paris.getHours(), m = paris.getMinutes(), s = paris.getSeconds();
  const totalSecs = (24 * 3600) - (h * 3600 + m * 60 + s);
  const hh = Math.floor(totalSecs / 3600), mm = Math.floor((totalSecs % 3600) / 60), ss = totalSecs % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

export function dateSeed(dateKey) {
  let h = 0;
  for (let i = 0; i < dateKey.length; i++) {
    h = Math.imul(h ^ dateKey.charCodeAt(i), 2654435761);
    h ^= h >>> 16;
  }
  return Math.abs(h);
}

export async function loadOrCreateDailyArticle(dateKey) {
  let fb;
  try {
    fb = await getFirebase();
    const snap = await fb.get(fb.ref(fb.db, `daily/${dateKey}/article`));
    if (snap.exists()) return snap.val();
  } catch (e) {
    console.warn('Firebase daily read failed:', e.message);
  }
  const seed = dateSeed(dateKey);
  let pool;
  try { pool = await fetchMostViewed(500); } catch (e) { pool = []; }
  if (!pool.length) { try { pool = await fetchMostViewed(50); } catch (e) { pool = []; } }
  if (!pool.length) throw new Error('Impossible de charger les articles populaires');
  const startIdx = seed % pool.length;
  for (let i = 0; i < Math.min(30, pool.length); i++) {
    const idx = (startIdx + i) % pool.length;
    try {
      const art = await fetchArticleByTitle(pool[idx].title);
      if (art) {
        if (fb) { try { await fb.set(fb.ref(fb.db, `daily/${dateKey}/article`), { title: art.title, extract: art.extract, url: art.url, createdAt: Date.now() }); } catch (e) { } }
        return { title: art.title, extract: art.extract, url: art.url };
      }
    } catch (e) { continue; }
  }
  throw new Error('Pas d\'article trouvé pour le quotidien');
}

export function isDailyDone(dateKey) {
  return !!localStorage.getItem(`daily_done_${dateKey}`);
}

export function getDailyResult(dateKey) {
  try { return JSON.parse(localStorage.getItem(`daily_done_${dateKey}`)); } catch { return null; }
}

export async function loadDailyLeaderboard(dateKey, sortBy = 'time') {
  const fb = await getFirebase();
  const snap = await fb.get(fb.ref(fb.db, `daily/${dateKey}/scores`));
  if (!snap.exists()) return [];
  const entries = [];
  snap.forEach(child => entries.push({ id: child.key, ...child.val() }));
  if (sortBy === 'time') entries.sort((a, b) => a.time - b.time);
  else if (sortBy === 'guesses') entries.sort((a, b) => a.guesses - b.guesses);
  else entries.sort((a, b) => b.score - a.score);
  return entries.slice(0, 1000);
}

export async function renderDailyOverlay() {
  const dateKey = S.dailySelectedDay === 'today' ? getParisDate(0) : getParisDate(-1);
  const isToday = S.dailySelectedDay === 'today';

  document.getElementById('daily-date').textContent = `📅 ${formatDateFr(dateKey)}`;

  clearInterval(S.dailyCountdownInterval);
  if (isToday) {
    const updateCD = () => document.getElementById('daily-countdown').textContent = `Prochain article dans ${getCountdownToMidnightParis()}`;
    updateCD();
    S.setDailyCountdownInterval(setInterval(updateCD, 1000));
  } else {
    document.getElementById('daily-countdown').textContent = '';
  }

  const statusEl = document.getElementById('daily-status');
  const done = isDailyDone(dateKey);
  const result = getDailyResult(dateKey);

  if (done && result) {
    statusEl.innerHTML = `
      <div class="daily-status-done">
        <p>✅ Déjà complété !</p>
        <p style="font-size:.78rem;color:var(--text-2);margin-top:.3rem">
          ${result.pseudo || 'Anonyme'} — ⏱ ${formatTime(result.time)} — ${result.guesses} essais — Score: <strong style="color:var(--accent)">${result.score}</strong>
        </p>
      </div>
      <div class="daily-play-row">
        <button class="btn btn-ghost" onclick="startDailyGame('${dateKey}')">🔁 Rejouer (hors classement)</button>
      </div>`;
  } else {
    statusEl.innerHTML = `
      <p style="font-size:.88rem;color:var(--text-2);margin-bottom:.6rem">
        ${isToday ? 'Jouez la page du jour et comparez-vous aux autres !' : 'Vous avez manqué la page d\'hier ? Rattrapez-vous !'}
      </p>
      <div class="daily-play-row">
        <button class="btn btn-primary" onclick="startDailyGame('${dateKey}')" style="font-size:.9rem">▶️ Jouer ${isToday ? 'le quotidien' : 'la page d\'hier'}</button>
      </div>`;
  }

  const lbEl = document.getElementById('daily-lb-content');
  lbEl.innerHTML = '<div class="lb-empty" style="font-style:normal">Chargement...</div>';
  try {
    const entries = await loadDailyLeaderboard(dateKey, S.dailySort);
    if (!entries.length) {
      lbEl.innerHTML = '<div class="lb-empty">Aucun score encore. Soyez le premier ! 🚀</div>';
    } else {
      renderLeaderboard(entries, S.dailySort, false);
      const mainLb = document.getElementById('lb-content');
      lbEl.innerHTML = mainLb.innerHTML;
    }
  } catch (e) {
    lbEl.innerHTML = '<div class="lb-empty">❌ Impossible de charger les scores</div>';
  }
}
