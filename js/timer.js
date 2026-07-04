// ══════════════════════════════════════
// Pedantix — Timer Module
// ══════════════════════════════════════
import * as S from './state.js';

export function startTimer() {
  S.setGameStartedAt(Date.now());
  clearInterval(S.timerInterval);
  updateTimerDisplay();
  S.setTimerInterval(setInterval(updateTimerDisplay, 1000));
}

export function stopTimer() { clearInterval(S.timerInterval); }

export function getElapsedSeconds() {
  return S.gameStartedAt ? Math.floor((Date.now() - S.gameStartedAt) / 1000) : 0;
}

export function formatTime(secs) {
  const m = Math.floor(secs / 60), s = secs % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function updateTimerDisplay() {
  const el = document.getElementById('timer-display');
  if (S.gameStartedAt) el.textContent = '⏱ ' + formatTime(getElapsedSeconds());
  else el.textContent = '';
}
