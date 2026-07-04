// ══════════════════════════════════════
// Pedantix — Ads Management Module
// ══════════════════════════════════════
import * as S from './state.js';
import { AD_CONFIG } from './config.js';

export function loadAdSense() {
  if (S._adsenseLoaded || !AD_CONFIG.enabled) return Promise.resolve();
  if (AD_CONFIG.adsenseId.includes('XXXX')) {
    console.log('[Ads] AdSense ID not configured — running in demo mode');
    S.setAdsenseLoaded(true);
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${AD_CONFIG.adsenseId}`;
    s.crossOrigin = 'anonymous';
    s.async = true;
    s.onload = () => { S.setAdsenseLoaded(true); resolve(); };
    s.onerror = () => { console.warn('[Ads] AdSense failed to load'); resolve(); };
    document.head.appendChild(s);
  });
}

export function createAdUnit(containerId, slotId, format = 'auto') {
  if (!AD_CONFIG.enabled) return;
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  if (AD_CONFIG.adsenseId.includes('XXXX')) {
    container.innerHTML = `
      <div style="width:100%;padding:1.2rem;text-align:center;border-radius:8px;
        background:rgba(99,102,241,.06);border:1px dashed rgba(99,102,241,.15)">
        <div style="font-size:.7rem;color:var(--text-3);opacity:.6">Espace publicitaire</div>
        <div style="font-size:.62rem;color:var(--text-3);opacity:.4;margin-top:.2rem">Configurez votre AdSense ID</div>
      </div>`;
    setTimeout(() => container.classList.add('ad-visible'), 100);
    return;
  }
  const ins = document.createElement('ins');
  ins.className = 'adsbygoogle';
  ins.style.display = 'block';
  ins.dataset.adClient = AD_CONFIG.adsenseId;
  ins.dataset.adSlot = slotId;
  ins.dataset.adFormat = format;
  ins.dataset.fullWidthResponsive = 'true';
  container.appendChild(ins);
  try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) { console.warn('[Ads] AdSense push error:', e); }
  setTimeout(() => container.classList.add('ad-visible'), 200);
}

export function showLoadingAd() {
  if (!AD_CONFIG.enabled) return;
  const wrap = document.getElementById('ad-loading-wrap');
  if (wrap) wrap.style.display = '';
  loadAdSense().then(() => {
    createAdUnit('ad-loading', AD_CONFIG.slots.loading, 'rectangle');
  });
}

export function hideLoadingAd() {
  const container = document.getElementById('ad-loading');
  if (container) container.classList.remove('ad-visible');
}

export function showWinAd() {
  if (!AD_CONFIG.enabled) return;
  clearTimeout(S._adTimers.win);
  const wrap = document.getElementById('ad-win-wrap');
  if (!wrap) return;
  S._adTimers.win = setTimeout(() => {
    wrap.style.display = '';
    loadAdSense().then(() => {
      createAdUnit('ad-win', AD_CONFIG.slots.win, 'rectangle');
    });
  }, AD_CONFIG.winDelay);
}

export function hideWinAd() {
  clearTimeout(S._adTimers.win);
  const wrap = document.getElementById('ad-win-wrap');
  if (wrap) wrap.style.display = 'none';
  const container = document.getElementById('ad-win');
  if (container) { container.classList.remove('ad-visible'); container.innerHTML = ''; }
}

console.log('[Ads] Ad system initialized (Phase 1 — loading + win)');
