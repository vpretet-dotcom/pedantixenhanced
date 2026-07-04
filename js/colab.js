// ══════════════════════════════════════
// Pedantix — Collaborative Mode Module
// ══════════════════════════════════════
import * as S from './state.js';
import { PLAYER_COLORS } from './config.js';
import { getFirebase } from './firebase.js';
import { showToast, updatePlayersBar, updateColabPlayerList, renderGame, renderGuesses, updateStats, updateGame, renderGuessItem, toastFeedback, proxTxtColor } from './ui.js';
import { initGame, revealByNorm, tokenize } from './game.js';
import { wordVec } from './nlp.js';
import { stopTimer, updateTimerDisplay, formatTime } from './timer.js';

export function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = '';
  for (let i = 0; i < 6; i++) c += chars[Math.random() * chars.length | 0];
  return c;
}

export function cleanupColab() {
  S.colabUnsubscribers.forEach(fn => { try { fn() } catch (e) { } });
  S.setColabUnsubscribers([]);
  S.setColabPlayers({});
}

export async function colabCreateSession(playerName) {
  const fb = await getFirebase();
  const code = generateCode();
  S.setColabSessionCode(code);
  S.setColabPlayerName(playerName);
  S.setColabPlayerId('p_' + Math.random().toString(36).slice(2, 8));
  S.setColabPlayerColor(PLAYER_COLORS[Math.random() * PLAYER_COLORS.length | 0]);
  S.setColabMode('host');

  const sessionRef = fb.ref(fb.db, `sessions/${code}`);
  await fb.set(sessionRef, { host: playerName, status: 'waiting', createdAt: Date.now() });

  const playerRef = fb.ref(fb.db, `sessions/${code}/players/${S.colabPlayerId}`);
  await fb.set(playerRef, { name: playerName, color: S.colabPlayerColor, joinedAt: Date.now(), online: true });
  fb.onDisconnect(playerRef).remove();

  const unsub = fb.onValue(fb.ref(fb.db, `sessions/${code}/players`), snap => {
    S.setColabPlayers(snap.val() || {});
    updateColabPlayerList('colab-create-players');
    updatePlayersBar();
  });
  S.colabUnsubscribers.push(unsub);
  return code;
}

export async function colabJoinSession(code, playerName) {
  const fb = await getFirebase();
  const snap = await fb.get(fb.ref(fb.db, `sessions/${code}`));
  if (!snap.exists()) throw new Error('Session introuvable');

  S.setColabSessionCode(code);
  S.setColabPlayerName(playerName);
  S.setColabPlayerId('p_' + Math.random().toString(36).slice(2, 8));
  S.setColabPlayerColor(PLAYER_COLORS[Math.random() * PLAYER_COLORS.length | 0]);
  S.setColabMode('guest');

  const playerRef = fb.ref(fb.db, `sessions/${code}/players/${S.colabPlayerId}`);
  await fb.set(playerRef, { name: playerName, color: S.colabPlayerColor, joinedAt: Date.now(), online: true });
  fb.onDisconnect(playerRef).remove();

  const unsub1 = fb.onValue(fb.ref(fb.db, `sessions/${code}/players`), snap => {
    S.setColabPlayers(snap.val() || {});
    updateColabPlayerList('colab-join-players');
    updatePlayersBar();
  });
  S.colabUnsubscribers.push(unsub1);

  const unsub2 = fb.onValue(fb.ref(fb.db, `sessions/${code}/status`), async snap => {
    const status = snap.val();
    console.log('[Colab] Status changed:', status);
    if (status === 'playing') {
      try {
        console.log('[Colab] Loading game from Firebase...');
        await loadColabGame(code);
        console.log('[Colab] Game loaded successfully!');
      } catch (e) {
        console.error('[Colab] loadColabGame FAILED:', e);
        showToast('❌ Erreur chargement: ' + e.message, '#ef4444', 5000);
      }
    } else if (status === 'won') {
      if (S.game && !S.game.won) {
        S.game.won = true;
        stopTimer();
        const { handleWin } = await import('./app.js');
        handleWin();
      }
    }
  });
  S.colabUnsubscribers.push(unsub2);
  return snap.val();
}

export async function colabWriteArticle(code, article, difficulty, categories) {
  const fb = await getFirebase();
  initGame(article.title, article.extract, article.url);

  const serializeToks = toks => toks.map(t => {
    const o = { ...t };
    delete o.vec;
    return o;
  });

  const titleToksJSON = JSON.stringify(serializeToks(S.game.titleToks));
  const secsJSON = JSON.stringify(S.game.secs.map(s => ({
    h: s.h, lv: s.lv,
    headToks: s.headToks ? serializeToks(s.headToks) : null,
    paras: s.paras.map(p => serializeToks(p))
  })));

  console.log('[Colab] Writing article to Firebase...', { titleLen: titleToksJSON.length, secsLen: secsJSON.length });
  try {
    await fb.update(fb.ref(fb.db, `sessions/${code}`), {
      status: 'playing',
      startedAt: Date.now(),
      'config/difficulty': difficulty,
      'config/categories': categories || [],
      'article/titleToksJSON': titleToksJSON,
      'article/secsJSON': secsJSON,
      'article/totalWords': S.game.totalWords,
      'article/url': article.url,
      'article/title': article.title,
    });
    console.log('[Colab] Article written successfully!');
  } catch (e) {
    console.error('[Colab] Firebase write FAILED:', e);
    showToast('❌ Erreur Firebase: ' + e.message, '#ef4444', 5000);
    throw e;
  }
}

export async function loadColabGame(code) {
  const fb = await getFirebase();
  const articleSnap = await fb.get(fb.ref(fb.db, `sessions/${code}/article`));
  const sessionSnap = await fb.get(fb.ref(fb.db, `sessions/${code}`));
  if (!articleSnap.exists()) return;

  const art = articleSnap.val();
  const sess = sessionSnap.val();
  const titleToks = JSON.parse(art.titleToksJSON);
  const secs = JSON.parse(art.secsJSON);

  const rebuildVec = t => { if (t.isWord && !t.isStop) t.vec = wordVec(t.text); return t; };
  titleToks.forEach(rebuildVec);
  secs.forEach(s => {
    if (s.headToks) s.headToks.forEach(rebuildVec);
    s.paras.forEach(p => p.forEach(rebuildVec));
  });

  S.setTid(0);
  const allW = [...titleToks.filter(t => t.isWord && !t.isStop)];
  for (const s of secs) {
    if (s.headToks) allW.push(...s.headToks.filter(t => t.isWord && !t.isStop));
    for (const p of s.paras) allW.push(...p.filter(t => t.isWord && !t.isStop));
  }

  S.setGame({ titleToks, secs, allW, totalWords: allW.length, guesses: [], won: false, abandoned: false, url: art.url, title: art.title });
  S.setScorePublished(false);

  const revSnap = await fb.get(fb.ref(fb.db, `sessions/${code}/revealed`));
  if (revSnap.exists()) {
    const revealed = revSnap.val();
    for (const norm of Object.keys(revealed)) { revealByNorm(norm); }
  }

  const guessSnap = await fb.get(fb.ref(fb.db, `sessions/${code}/guesses`));
  if (guessSnap.exists()) {
    const guesses = [];
    guessSnap.forEach(child => guesses.push(child.val()));
    guesses.sort((a, b) => a.timestamp - b.timestamp);
    S.game.guesses = guesses;
  }

  document.getElementById('colab-overlay').classList.add('hidden');
  document.getElementById('loading-overlay').classList.add('hidden');
  renderGame(); renderGuesses(); updateStats();

  const diffSnap = await fb.get(fb.ref(fb.db, `sessions/${code}/config/difficulty`));
  S.setCurrentDiff(diffSnap.val() || 'easy');
  const diffEmoji = { easy: '🟢', normal: '🟡', hard: '🔴' }[S.currentDiff] || '🎲';
  document.getElementById('cat-display').textContent = `${diffEmoji} 👥 Coop`;

  document.getElementById('session-indicator').classList.remove('hidden-bar');
  document.getElementById('session-code-header').textContent = code;

  S.setGameStartedAt(sess.startedAt || Date.now());
  clearInterval(S.timerInterval);
  updateTimerDisplay();
  S.setTimerInterval(setInterval(updateTimerDisplay, 1000));

  document.getElementById('guess-btn').disabled = false;
  document.getElementById('guess-input').focus();

  setupColabGameListeners(code);
}

export function setupColabGameListeners(code) {
  const fb2 = S._fb;
  const { sndFound } = require_audio();

  const unsub1 = fb2.onChildAdded(fb2.ref(fb2.db, `sessions/${code}/revealed`), snap => {
    const norm = snap.key;
    const newIds = revealByNorm(norm);
    if (newIds.size > 0) { updateGame(newIds); updateStats(); }
    if (S.game.won && !S.game._winHandled) {
      S.game._winHandled = true;
      stopTimer();
      import('./app.js').then(m => m.handleWin());
    }
  });
  S.colabUnsubscribers.push(unsub1);

  let initialGuessCount = S.game.guesses.length;
  const unsub2 = fb2.onChildAdded(fb2.ref(fb2.db, `sessions/${code}/guesses`), snap => {
    if (initialGuessCount > 0) { initialGuessCount--; return; }
    const g = snap.val();
    if (g.playerName === S.colabPlayerName && g.timestamp > Date.now() - 2000) return;
    S.game.guesses.push(g);
    renderGuessItem(g, S.game.guesses.length - 1, true);
    updateStats();
    if (g.playerName !== S.colabPlayerName) {
      if (g.found > 0) {
        showToast(`🎯 ${g.playerName} a trouvé +${g.found} mot${g.found > 1 ? 's' : ''} !`, '#22c55e');
        sndFound(g.found);
      } else {
        const [msg] = toastFeedback(0, g.sim);
        showToast(`${g.playerName}: ${msg}`, proxTxtColor(g.sim), 1200);
      }
    }
  });
  S.colabUnsubscribers.push(unsub2);

  const unsub3 = fb2.onChildRemoved(fb2.ref(fb2.db, `sessions/${code}/players`), snap => {
    const p = snap.val();
    showToast(`👋 ${p?.name || 'Un joueur'} a quitté`, '#f59e0b', 2000);
    delete S.colabPlayers[snap.key];
    updatePlayersBar();
  });
  S.colabUnsubscribers.push(unsub3);
}

// Lazy import to avoid circular deps
function require_audio() {
  // sndFound is imported lazily
  let _sndFound = () => {};
  import('./audio.js').then(m => { _sndFound = m.sndFound; });
  return { sndFound: (...args) => _sndFound(...args) };
}

export async function colabSubmitGuess(word, result) {
  if (!S.colabSessionCode) return;
  const fb = await getFirebase();
  const guessRef = fb.push(fb.ref(fb.db, `sessions/${S.colabSessionCode}/guesses`));
  await fb.set(guessRef, {
    word, found: result.found, sim: result.sim,
    playerName: S.colabPlayerName, playerColor: S.colabPlayerColor,
    timestamp: Date.now()
  });
  if (result.revealedNorms && result.revealedNorms.length) {
    const updates = {};
    for (const norm of result.revealedNorms) updates[`sessions/${S.colabSessionCode}/revealed/${norm}`] = true;
    await fb.update(fb.ref(fb.db), updates);
  }
  if (S.game.won) {
    await fb.update(fb.ref(fb.db, `sessions/${S.colabSessionCode}`), { status: 'won' });
  }
}
