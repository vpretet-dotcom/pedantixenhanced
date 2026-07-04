// ══════════════════════════════════════
// Pedantix — Audio & Effects
// ══════════════════════════════════════
import * as S from './state.js';

function getAC() {
  if (!S._ac) S.setAc(new (window.AudioContext || window.webkitAudioContext)());
  return S._ac;
}

export function beep(freq, dur, vol = 0.12, type = 'sine') {
  try {
    const c = getAC(), o = c.createOscillator(), g = c.createGain();
    o.connect(g); g.connect(c.destination);
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    o.start(); o.stop(c.currentTime + dur);
  } catch (e) { }
}

export function sndFound(n) {
  if (n === 0) { beep(220, .1, .07, 'triangle'); return; }
  beep(660, .09, .13);
  if (n > 2) setTimeout(() => beep(880, .1, .1), 70);
  if (n > 5) setTimeout(() => beep(1100, .12, .08), 140);
}

export function sndWin() {
  [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, .22, .12), i * 100));
}

export function sndDup() { beep(280, .08, .07, 'square'); }

export function launchConfetti() {
  const cv = document.getElementById('confetti-canvas');
  cv.style.display = 'block'; cv.width = innerWidth; cv.height = innerHeight;
  const cx = cv.getContext('2d');
  const pts = Array.from({ length: 150 }, () => ({
    x: Math.random() * innerWidth, y: -20 - Math.random() * innerHeight * .25,
    w: 6 + Math.random() * 8, h: 3 + Math.random() * 5,
    r: Math.random() * Math.PI * 2, dr: (.5 - Math.random()) * .13,
    vx: (.5 - Math.random()) * 3, vy: 1.5 + Math.random() * 3.5,
    c: `hsl(${Math.random() * 360 | 0},80%,60%)`
  }));
  let fr = 0;
  (function draw() {
    cx.clearRect(0, 0, cv.width, cv.height);
    pts.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.r += p.dr; p.vy += .06;
      cx.save(); cx.translate(p.x, p.y); cx.rotate(p.r);
      cx.fillStyle = p.c; cx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      cx.restore();
    });
    if (++fr < 220) requestAnimationFrame(draw);
    else cv.style.display = 'none';
  })();
}

export function cascadeTitle() {
  document.getElementById('title-area').querySelectorAll('.word-block')
    .forEach((el, i) => setTimeout(() => { el.className = 'word-block win-cascade'; el.style.cssText = ''; }, i * 130));
}
