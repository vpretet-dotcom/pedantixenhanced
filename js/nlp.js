// ══════════════════════════════════════
// Pedantix — NLP Module
// ══════════════════════════════════════

export function normalize(t) {
  return t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '');
}

export function lemmatize(w) {
  w = w.toLowerCase();
  const rules = [[/(aient|asses|isses|ussent|eraient|iraient)$/, ''], [/(ais|ait|ons|ez|ant|ants|antes)$/, ''], [/(er|ir|re)$/, ''], [/(aux)$/, 'al'], [/(eaux)$/, 'eau'], [/(iques|ique)$/, 'ique'], [/(tions|tion)$/, 'tion'], [/(ments|ment)$/, 'ment'], [/(eurs|eur)$/, 'eur'], [/(euses|euse)$/, 'eux'], [/(ives|ive|ifs|if)$/, 'if'], [/(ales|ale|als|al)$/, 'al'], [/(nnes|nne)$/, 'n'], [/(es)$/, ''], [/(s)$/, '']];
  for (const [p, r] of rules) { const c = w.replace(p, r); if (c.length >= 3 && c !== w) return c; }
  return w;
}

const V = 512;
export { V };

export function wordVec(word) {
  const w = normalize(word), v = new Float32Array(V);
  const h = (s, seed) => { let h = seed * 2654435761; for (let i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 2654435761); h ^= h >>> 16 } return Math.abs(h) % V };
  for (const c of w) v[h(c, 0)]++;
  for (let i = 0; i < w.length - 1; i++) v[h(w[i] + w[i + 1], 1)]++;
  for (let i = 0; i < w.length - 2; i++) v[h(w[i] + w[i + 1] + w[i + 2], 2)]++;
  return v;
}

export function cosSim(a, b) {
  let d = 0, na = 0, nb = 0;
  for (let i = 0; i < V; i++) { d += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i] }
  return na && nb ? Math.max(0, d / (Math.sqrt(na) * Math.sqrt(nb))) : 0;
}
