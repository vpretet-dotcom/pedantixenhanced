// ══════════════════════════════════════
// Pedantix — Firebase Module
// ══════════════════════════════════════
import * as S from './state.js';

export async function getFirebase() {
  if (S._fb) return S._fb;
  try {
    if (!window.FIREBASE_CONFIG || window.FIREBASE_CONFIG.apiKey === 'VOTRE_API_KEY') {
      throw new Error('Firebase non configuré — remplissez firebase-config.js');
    }
    const [appMod, dbMod] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/11.7.1/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/11.7.1/firebase-database.js')
    ]);
    const app = appMod.initializeApp(window.FIREBASE_CONFIG);
    const db = dbMod.getDatabase(app);
    S.setFb({ db, ...dbMod });
    return S._fb;
  } catch (e) {
    console.error('Firebase init failed:', e);
    const { showToast } = await import('./ui.js');
    showToast('❌ Firebase non configuré', '#ef4444', 3000);
    throw e;
  }
}
