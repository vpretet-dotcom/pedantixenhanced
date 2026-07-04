// ══════════════════════════════════════
// Pedantix — Wikipedia API Module
// ══════════════════════════════════════
import { WIKI, REJECT, CATEGORIES } from './config.js';
import * as S from './state.js';
import { normalize } from './nlp.js';

// ── Fetch with timeout (prevents infinite loading if Wikipedia is slow)
const FETCH_TIMEOUT = 10000; // 10 seconds
async function fetchWithTimeout(url, opts = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    const r = await fetch(url, { ...opts, signal: controller.signal });
    clearTimeout(timer);
    return r;
  } catch (e) {
    clearTimeout(timer);
    if (e.name === 'AbortError') throw new Error('Délai dépassé — Wikipedia ne répond pas');
    throw e;
  }
}

export async function fetchArticleByTitle(title) {
  const r = await fetchWithTimeout(`${WIKI}?action=query&format=json&titles=${encodeURIComponent(title)}&prop=extracts|info&explaintext=true&inprop=url&origin=*`);
  const d = await r.json(); const pages = Object.values(d?.query?.pages || {}); if (!pages.length) return null;
  const p = pages[0]; if (p.missing !== undefined) return null;
  const ex = p.extract || '', url = p.fullurl || `https://fr.wikipedia.org/wiki/${title}`;
  if (ex.length < 800) return null;
  if (ex.split(/\s+/).filter(w => /^[a-zA-ZÀ-ÿ]{3,}$/.test(w)).length < 80) return null;
  if (REJECT.some(k => normalize(ex).includes(k) || normalize(title).includes(k))) return null;
  return { title: p.title || title, extract: ex, url };
}

export async function fetchCatMembers(cmtitle) {
  const r = await fetchWithTimeout(`${WIKI}?action=query&list=categorymembers&cmtitle=${encodeURIComponent(cmtitle)}&cmlimit=500&cmtype=page&cmnamespace=0&format=json&origin=*`);
  const d = await r.json(); return d?.query?.categorymembers || [];
}

export async function fetchFromCategories(catIds) {
  const catId = catIds[Math.random() * catIds.length | 0]; const cat = CATEGORIES.find(c => c.id === catId); if (!cat) return null;
  const shuffled = [...cat.cmtitles].sort(() => Math.random() - .5);
  for (const cmtitle of shuffled) {
    let members; try { members = await fetchCatMembers(cmtitle); } catch (e) { continue; } if (!members.length) continue;
    const tries = Math.min(10, members.length);
    const idxs = Array.from({ length: members.length }, (_, i) => i).sort(() => Math.random() - .5).slice(0, tries);
    for (const idx of idxs) { try { const art = await fetchArticleByTitle(members[idx].title); if (art) return art; } catch (e) { } }
  }
  return null;
}

export async function fetchMostViewed(limit) {
  try {
    const r = await fetchWithTimeout(`${WIKI}?action=query&list=mostviewed&mvlimit=${limit}&format=json&origin=*`);
    const d = await r.json();
    const mv = (d?.query?.mostviewed || []).filter(p => p.ns === 0 && !p.title.includes(':'));
    if (mv.length > 10) return mv;
  } catch (e) { }
  for (let daysAgo = 2; daysAgo <= 5; daysAgo++) {
    const past = new Date(); past.setDate(past.getDate() - daysAgo);
    const yy = past.getFullYear(), mm = String(past.getMonth() + 1).padStart(2, '0'), dd = String(past.getDate()).padStart(2, '0');
    try {
      const r2 = await fetchWithTimeout(`https://wikimedia.org/api/rest_v1/metrics/pageviews/top/fr.wikipedia/all-access/${yy}/${mm}/${dd}`);
      if (!r2.ok) continue;
      const d2 = await r2.json();
      const bad = ['Spécial:Recherche', 'Wikipédia:Accueil_principal', 'Cookie_(informatique)'];
      const articles = (d2?.items?.[0]?.articles || []).filter(a => !a.article.includes(':') && !bad.includes(a.article));
      if (articles.length > 10) return articles.slice(0, limit).map(a => ({ title: a.article.replace(/_/g, ' '), views: a.views }));
    } catch (e) { }
  }
  const results = [];
  for (let i = 0; i < Math.min(limit, 30); i++) {
    try {
      const r3 = await fetchWithTimeout(`${WIKI}?action=query&list=random&rnnamespace=0&rnlimit=20&format=json&origin=*`);
      const d3 = await r3.json();
      for (const p of (d3?.query?.random || [])) results.push({ title: p.title });
    } catch (e) { break; }
  }
  return results;
}

export async function fetchArticlePopular(limit) {
  let pool;
  try { pool = await fetchMostViewed(limit); } catch (e) { return null; }
  if (!pool.length) return null;
  const shuffled = [...pool].sort(() => Math.random() - .5);
  for (const entry of shuffled.slice(0, 20)) {
    try { const art = await fetchArticleByTitle(entry.title); if (art) return art; } catch (e) { }
  }
  return null;
}

export async function fetchArticle() {
  if (S.currentDiff === 'easy') { const art = await fetchArticlePopular(300); if (art) return art; }
  else if (S.currentDiff === 'normal') { const art = await fetchArticlePopular(3000); if (art) return art; }
  for (let t = 0; t < 8; t++) {
    const r = await fetchWithTimeout(`${WIKI}?action=query&format=json&generator=random&grnnamespace=0&grnlimit=10&prop=extracts|info&explaintext=true&inprop=url&origin=*`);
    const d = await r.json();
    for (const p of Object.values(d?.query?.pages || {})) {
      const title = p.title || '', ex = p.extract || '', url = p.fullurl || `https://fr.wikipedia.org/wiki/${title}`;
      if (ex.length < 800) continue;
      const wc = ex.split(/\s+/).filter(w => /^[a-zA-ZÀ-ÿ]{3,}$/.test(w)).length;
      if (wc < 80) continue;
      if (REJECT.some(k => ex.toLowerCase().includes(k) || title.toLowerCase().includes(k))) continue;
      return { title, extract: ex, url };
    }
  }
  throw new Error('Impossible de charger un article');
}
