// ══════════════════════════════════════
// Pedantix — Game Logic Module
// ══════════════════════════════════════
import * as S from './state.js';
import { STOP_WORDS } from './config.js';
import { normalize, lemmatize, wordVec, cosSim } from './nlp.js';

export function tokenize(text) {
  const parts = text.split(/(\s+|[^\w\u00C0-\u024F''-]+)/u), tokens = [];
  for (const part of parts) {
    if (!part) continue;
    const isW = /^[\w\u00C0-\u024F''-]+$/u.test(part) && /[a-zA-ZÀ-ÿ]/.test(part);
    if (isW) {
      const lo = part.toLowerCase(), nm = normalize(part), lm = lemmatize(lo), lmn = normalize(lm);
      const isStop = STOP_WORDS.has(lo);
      tokens.push({ id: S.incrementTid(), text: part, lower: lo, norm: nm, lemma: lm, lemNorm: lmn, vec: wordVec(part), isWord: true, revealed: isStop, isStop, bestProx: 0, bestGuess: null, length: part.length, ws: '' });
    } else if (/\s/.test(part)) { if (tokens.length) tokens[tokens.length - 1].ws = part; }
    else tokens.push({ id: S.incrementTid(), text: part, isWord: false, revealed: true, ws: '' });
  }
  return tokens;
}

export function parseSections(ex) {
  const lines = ex.split('\n'), secs = [];
  let cur = null, buf = [];
  const flush = () => { if (!buf.length) return; const s = buf.join(' ').trim(); if (s) { if (cur) cur.paras.push(s); else secs.push({ h: null, lv: 0, paras: [s] }); } buf = []; };
  for (const l of lines) {
    const h2 = l.match(/^==\s*(.+?)\s*==$/), h3 = l.match(/^===\s*(.+?)\s*===$/);
    if (h2 || h3) { flush(); cur = { h: (h2 || h3)[1], lv: h2 ? 2 : 3, paras: [] }; secs.push(cur); }
    else if (l.trim()) buf.push(l.trim());
    else flush();
  }
  flush();
  return secs.filter(s => s.paras.some(p => p.trim()));
}

export function initGame(title, extract, url) {
  S.setTid(0);
  const titleToks = tokenize(title);
  const secs = parseSections(extract).map(s => ({ h: s.h, lv: s.lv, headToks: s.h ? tokenize(s.h) : null, paras: s.paras.map(p => tokenize(p)).filter(t => t.length) }));
  const allW = [...titleToks.filter(t => t.isWord && !t.isStop)];
  for (const s of secs) { if (s.headToks) allW.push(...s.headToks.filter(t => t.isWord && !t.isStop)); for (const p of s.paras) allW.push(...p.filter(t => t.isWord && !t.isStop)); }
  S.setGame({ titleToks, secs, allW, totalWords: allW.length, guesses: [], won: false, abandoned: false, url, title });
  S.setScorePublished(false);
}

export function guess(word) {
  if (!S.game || S.game.won) return;
  word = word.trim().slice(0, 100); if (!word) return;
  if (S.game.guesses.some(g => g.word.toLowerCase() === word.toLowerCase())) return { dup: true };
  const lo = word.toLowerCase(), nm = normalize(word), lm = lemmatize(lo), lmn = normalize(lm), gv = wordVec(word);
  let found = 0, bestSim = 0, bestW = null;
  const newIds = new Set();
  const revealedNorms = [];
  for (const t of S.game.allW) {
    if (!t.revealed) {
      const match = lo === t.lower || nm === t.norm || lm === t.lemma || lmn === t.lemNorm || nm === t.lemNorm || lmn === t.norm;
      if (match) { t.revealed = true; found++; newIds.add(t.id); revealedNorms.push(t.norm); continue; }
    }
    const s = cosSim(gv, t.vec);
    if (!t.revealed && s > t.bestProx) { t.bestProx = s; t.bestGuess = word; }
    if (s > bestSim) { bestSim = s; bestW = t.text; }
  }
  const displaySim = found > 0 ? 1.0 : bestSim;
  S.game.guesses.push({ word, found, sim: displaySim, closest: bestW, playerName: S.colabPlayerName || 'Vous', playerColor: S.colabPlayerColor });
  if (S.game.titleToks.filter(t => t.isWord && !t.isStop).every(t => t.revealed)) S.game.won = true;
  return { found, sim: displaySim, newIds, revealedNorms };
}

export function revealByNorm(norm) {
  if (!S.game) return new Set();
  const newIds = new Set();
  for (const t of S.game.allW) {
    if (!t.revealed && t.norm === norm) {
      t.revealed = true;
      newIds.add(t.id);
    }
  }
  if (S.game.titleToks.filter(t => t.isWord && !t.isStop).every(t => t.revealed)) S.game.won = true;
  return newIds;
}

export function computeScore(time, guesses, totalWords) {
  const efficiency = totalWords / Math.max(guesses, 1);
  const speed = Math.max(1, 600 - time) / 600;
  return Math.round(efficiency * 100 * (0.5 + speed * 0.5));
}

export function articleKey(title) {
  return (title || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 80).toLowerCase();
}
