// ══════════════════════════════════════
// Pedantix — Configuration & Constants
// ══════════════════════════════════════

export const CATEGORIES = [
  { id: 'geo', name: 'G\u00e9ographie', icon: '\ud83c\udf0d', desc: 'Pays, villes, fleuves, r\u00e9gions', color: '#3b82f6', cmtitles: ['Cat\u00e9gorie:Pays', 'Cat\u00e9gorie:Capitale'] },
  { id: 'hist', name: 'Histoire', icon: '\ud83c\udfdb\ufe0f', desc: 'Batailles, empires, r\u00e9volutions', color: '#f59e0b', cmtitles: ['Cat\u00e9gorie:Bataille', 'Cat\u00e9gorie:Trait\u00e9'] },
  { id: 'sci', name: 'Sciences', icon: '\ud83d\udd2c', desc: 'Physique, maths, chimie, biologie', color: '#06b6d4', cmtitles: ['Cat\u00e9gorie:Physicien', 'Cat\u00e9gorie:Math\u00e9maticien', 'Cat\u00e9gorie:Chimiste'] },
  { id: 'nature', name: 'Nature', icon: '\ud83e\udd81', desc: 'Animaux, plantes, \u00e9cosyst\u00e8mes', color: '#22c55e', cmtitles: ['Cat\u00e9gorie:Mammif\u00e8re', 'Cat\u00e9gorie:Oiseau', 'Cat\u00e9gorie:Reptile'] },
  { id: 'cinema', name: 'Cin\u00e9ma', icon: '\ud83c\udfac', desc: 'Films, r\u00e9alisateurs, acteurs', color: '#ec4899', cmtitles: ['Cat\u00e9gorie:Film fran\u00e7ais', 'Cat\u00e9gorie:R\u00e9alisateur fran\u00e7ais'] },
  { id: 'sport', name: 'Sport', icon: '\u26bd', desc: 'Football, tennis, athl\u00e9tisme', color: '#f97316', cmtitles: ['Cat\u00e9gorie:Footballeur international fran\u00e7ais', 'Cat\u00e9gorie:Joueur de tennis'] },
  { id: 'art', name: 'Arts & Musique', icon: '\ud83c\udfa8', desc: 'Peinture, musique, sculpture', color: '#a855f7', cmtitles: ['Cat\u00e9gorie:Peintre fran\u00e7ais', 'Cat\u00e9gorie:Compositeur fran\u00e7ais'] },
  { id: 'litt', name: 'Litt\u00e9rature', icon: '\ud83d\udcda', desc: 'Romans, auteurs, po\u00e9sie', color: '#14b8a6', cmtitles: ['Cat\u00e9gorie:Romancier fran\u00e7ais', 'Cat\u00e9gorie:Po\u00e8te fran\u00e7ais'] },
  { id: 'techno', name: 'Technologie', icon: '\ud83d\udcbb', desc: 'Informatique, inventions, ing\u00e9nieurs', color: '#8b5cf6', cmtitles: ['Cat\u00e9gorie:Informaticien', 'Cat\u00e9gorie:Inventeur'] },
  { id: 'gastro', name: 'Gastronomie', icon: '\ud83c\udf7d\ufe0f', desc: 'Cuisines, plats, chefs, vins', color: '#ef4444', cmtitles: ['Cat\u00e9gorie:Cuisine fran\u00e7aise', 'Cat\u00e9gorie:Gastronomie fran\u00e7aise'] },
];

export const PLAYER_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4', '#f97316', '#a855f7', '#ef4444'];

export const STOP_WORDS = new Set(['le', 'la', 'les', 'de', 'des', 'du', 'un', 'une', 'et', 'en', 'au', 'aux', 'a', '\u00e0', 'par', 'pour', 'dans', 'sur', 'avec', 'que', 'qui', 'est', 'sont', 'ont', 'pas', 'plus', 'mais', 'ou', 'o\u00f9', 'ne', 'se', 'ce', 'cette', 'ces', 'son', 'sa', 'ses', 'leur', 'leurs', 'il', 'elle', 'ils', 'elles', 'nous', 'vous', 'on', 'je', 'tu', 'me', 'te', 'lui', 'y', 'si', 'ni', 'dont', 'car', 'donc', 'comme', 'fut', 'fait', 'tous', 'tout', 'toute', 'toutes', 'entre', 'aussi', 'bien', 'peut', '\u00eatre', 'avoir', '\u00e9t\u00e9', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'ans', 'apr\u00e8s', 'avant', 'lors', 'depuis', 'jusqu', 'chez', 'vers', 'sous', 'sans', 'autre', 'autres', 'm\u00eame', 'peu', 'tr\u00e8s', 'alors', 'encore', 'd\u00e9j\u00e0', 'ainsi', 'puis', 'ici', 'l\u00e0']);

export const WIKI = 'https://fr.wikipedia.org/w/api.php';
export const REJECT = ['homonymie', 'peut d\u00e9signer', 'liste de', 'saison ', '\u00e9pisode ', '\u00e9lections '];

export const AD_CONFIG = {
  enabled: true,
  adsenseId: 'ca-pub-6410125606135546',
  slots: { loading: 'XXXXXXXXXX', win: 'XXXXXXXXXX' },
  winDelay: 3000,
  loadingMinDisplay: 1500,
};