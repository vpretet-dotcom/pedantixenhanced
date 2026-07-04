// ══════════════════════════════════════
// Pedantix — UI Rendering Module
// ══════════════════════════════════════
import * as S from './state.js';

// ── Toast
export function showToast(msg, color, dur = 1800) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.style.color = color;
  t.classList.add('show');
  clearTimeout(S._tt); S.setTt(setTimeout(() => t.classList.remove('show'), dur));
}

// ── Colors
const _dark = () => document.documentElement.dataset.theme === 'dark';

export function proxColor(p) {
  if (p <= 0.01) return _dark() ? 'hsl(240,18%,22%)' : 'hsl(235,18%,82%)';
  const hue = p < 0.5 ? 230 - p * 2 * 120 : 110 - (p - 0.5) * 2 * 110;
  const sat = 55 + p * 30 | 0;
  const lit = _dark() ? 24 + p * 26 | 0 : 70 - p * 24 | 0;
  return `hsl(${hue | 0},${sat}%,${lit}%)`;
}

export function proxTxtColor(p) {
  return p < .25 ? '#6b7394' : p < .5 ? '#a0a8c0' : p < .7 ? '#f59e0b' : '#22c55e';
}

// ── Hot/cold feedback
export function toastFeedback(found, sim) {
  if (found > 0) return [`+${found} mot${found > 1 ? 's' : ''} trouv${found > 1 ? 'és' : 'é'} !`, '#22c55e'];
  if (sim >= .75) return ['🔥 Brûlant !', '#ef4444'];
  if (sim >= .60) return ['♨️ Très chaud !', '#f97316'];
  if (sim >= .45) return ['🌡 Chaud', '#f59e0b'];
  if (sim >= .30) return ['🌊 Tiède...', '#60a5fa'];
  if (sim >= .15) return ['❄️ Froid', '#93c5fd'];
  return ['🧊 Très froid', '#6b7394'];
}

// ── Token DOM creation
export function mkTok(tok, isT) {
  if (!tok.isWord) { const s = document.createElement('span'); s.className = 'punct-token'; s.textContent = tok.text + tok.ws; return s; }
  const s = document.createElement('span'); s.dataset.id = tok.id; s.dataset.length = tok.length;
  if (tok.isStop) {
    s.className = 'word-block stopword'; s.textContent = tok.text;
  } else if (tok.revealed) {
    s.className = `word-block revealed${isT ? ' title-block' : ''}`; s.textContent = tok.text;
  } else {
    s.className = `word-block hidden${isT ? ' title-block' : ''}`;
    const cw = isT ? 11 : 9; s.style.width = s.style.minWidth = `${Math.max(tok.length * cw, 20)}px`;
    s.style.backgroundColor = proxColor(tok.bestProx);
    s.textContent = tok.length;
    if (tok.bestGuess) s.dataset.bestGuess = tok.bestGuess;
  }
  const f = document.createDocumentFragment(); f.appendChild(s); if (tok.ws) f.appendChild(document.createTextNode(tok.ws)); return f;
}

// ── Update tokens in DOM
export function updateToks(container, toks, isT, newIds = new Set()) {
  const map = {}; container.querySelectorAll('.word-block').forEach(el => { map[el.dataset.id] = el });
  let firstNew = null;
  for (const t of toks) {
    if (!t.isWord) continue; const el = map[t.id]; if (!el) continue;
    if (t.revealed && el.classList.contains('hidden')) {
      el.className = `word-block revealed${isT ? ' title-block' : ''}`; el.textContent = t.text; el.style.cssText = ''; el.removeAttribute('data-best-guess');
      const n = el.cloneNode(true); el.parentNode.replaceChild(n, el);
      if (newIds.has(t.id)) { n.classList.add('flash-new'); if (!firstNew) firstNew = n; }
    } else if (!t.revealed) {
      el.style.backgroundColor = proxColor(t.bestProx);
      if (t.bestGuess) el.dataset.bestGuess = t.bestGuess;
    }
  }
  return firstNew;
}

// ── Render full game
export function renderGame() {
  const ta = document.getElementById('title-area'), ba = document.getElementById('text-area');
  ta.innerHTML = ''; ba.innerHTML = '';
  for (const t of S.game.titleToks) ta.appendChild(mkTok(t, true));
  for (const sec of S.game.secs) {
    if (sec.h && sec.headToks) { const h = document.createElement('div'); h.className = `section-title${sec.lv === 3 ? ' h3' : ''}`; for (const t of sec.headToks) h.appendChild(mkTok(t, false)); ba.appendChild(h); }
    for (const para of sec.paras) { if (!para.length) continue; const p = document.createElement('p'); for (const t of para) p.appendChild(mkTok(t, false)); ba.appendChild(p); }
  }
}

// ── Update game DOM (incremental)
export function updateGame(newIds = new Set()) {
  const ta = document.getElementById('title-area'), ba = document.getElementById('text-area');
  let first = updateToks(ta, S.game.titleToks, true, newIds);
  for (const sec of S.game.secs) {
    if (sec.headToks) { const r = updateToks(ba, sec.headToks, false, newIds); if (!first) first = r; }
    for (const para of sec.paras) { const r = updateToks(ba, para, false, newIds); if (!first) first = r; }
  }
  if (first) setTimeout(() => first.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
}

// ── Render guess item
export function renderGuessItem(g, idx, prepend = true) {
  const list = document.getElementById('guess-list');
  list.querySelector('.guess-empty')?.remove();
  const item = document.createElement('div'); item.className = 'guess-item'; item.style.animation = 'guessSlideIn .25s ease-out';
  const n = document.createElement('span'); n.className = 'guess-num'; n.textContent = idx + 1;
  const parts = [n];
  if (S.colabMode !== 'solo' && g.playerName) {
    const pb = document.createElement('span'); pb.className = 'guess-player-badge';
    pb.textContent = g.playerName; pb.style.background = g.playerColor || '#6366f1';
    parts.push(pb);
  }
  const w = document.createElement('span'); w.className = 'guess-word'; w.textContent = g.word;
  const b = document.createElement('span'); b.className = `guess-badge ${g.found ? 'found' : 'miss'}`; b.textContent = g.found ? `+${g.found}` : '✗';
  const p = document.createElement('span'); p.className = 'guess-prox-pct'; p.textContent = `${(g.sim * 100).toFixed(1)}%`; p.style.color = proxTxtColor(g.sim);
  parts.push(w, b, p);
  item.append(...parts);
  if (prepend) list.insertBefore(item, list.firstChild);
  else list.appendChild(item);
  document.getElementById('sidebar-count').textContent = (list.querySelectorAll('.guess-item').length);
}

// ── Render all guesses
export function renderGuesses() {
  const list = document.getElementById('guess-list'), gs = S.game.guesses;
  if (!gs.length) { list.innerHTML = '<div class="guess-empty">Aucun mot proposé</div>'; document.getElementById('sidebar-count').textContent = '0'; return; }
  const existing = list.querySelectorAll('.guess-item').length;
  if (existing === gs.length) return;
  for (let i = gs.length - 1; i >= existing; i--) {
    renderGuessItem(gs[i], i, true);
  }
}

// ── Update stats display
export function updateStats() {
  if (!S.game) return;
  const rev = S.game.allW.filter(t => t.revealed).length, tot = S.game.totalWords, pct = tot ? Math.round(rev / tot * 100) : 0;
  document.getElementById('guess-count-val').textContent = S.game.guesses.length;
  document.getElementById('found-count-val').textContent = rev;
  document.getElementById('total-count-val').textContent = tot;
  document.getElementById('pct-val').textContent = pct;
  let bar = document.querySelector('.progress-bar');
  if (!bar) { const tr = document.createElement('div'); tr.className = 'progress-track'; bar = document.createElement('div'); bar.className = 'progress-bar'; tr.appendChild(bar); const wr = document.createElement('div'); wr.className = 'progress-wrap'; wr.appendChild(tr); document.querySelector('.stats-row').after(wr); }
  bar.style.width = `${pct}%`;
}

// ── Players bar
export function updatePlayersBar() {
  const bar = document.getElementById('players-bar');
  if (S.colabMode === 'solo') { bar.classList.add('hidden-bar'); return; }
  bar.classList.remove('hidden-bar');
  bar.innerHTML = '';
  const entries = Object.values(S.colabPlayers);
  entries.forEach(p => {
    const av = document.createElement('div'); av.className = 'player-avatar';
    av.style.background = p.color || '#6366f1';
    av.textContent = (p.name || '?')[0].toUpperCase();
    const tip = document.createElement('span'); tip.className = 'pa-tooltip'; tip.textContent = p.name;
    av.appendChild(tip);
    bar.appendChild(av);
  });
  const cnt = document.createElement('span'); cnt.className = 'players-count';
  cnt.textContent = `${entries.length} joueur${entries.length > 1 ? 's' : ''}`;
  bar.appendChild(cnt);
}

// ── HTML escaping
export function escHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

// ── Colab player list
export function updateColabPlayerList(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = '';
  Object.values(S.colabPlayers).forEach(p => {
    const av = document.createElement('div'); av.className = 'player-avatar';
    av.style.background = p.color || '#6366f1';
    av.textContent = (p.name || '?')[0].toUpperCase();
    const tip = document.createElement('span'); tip.className = 'pa-tooltip'; tip.textContent = p.name;
    av.appendChild(tip);
    el.appendChild(av);
  });
}
