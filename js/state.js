// ══════════════════════════════════════
// Pedantix — Shared Application State
// ══════════════════════════════════════

// Game state
export let game = null;
export let gameStartedAt = null;
export let timerInterval = null;
export let scorePublished = false;
export let currentDiff = 'easy';
export let tid = 0;
export let hasPlayedOnce = false;
export let catGameMode = 'random';
export let selectedCats = new Set();

// Colab state
export let colabMode = 'solo';
export let colabSessionCode = null;
export let colabPlayerName = '';
export let colabPlayerColor = '#6366f1';
export let colabPlayerId = null;
export let colabUnsubscribers = [];
export let colabPlayers = {};

// Daily state
export let dailyActiveDate = null;
export let dailyCountdownInterval = null;
export let dailySelectedDay = 'today';
export let dailySort = 'time';

// Leaderboard state
export let lbSort = 'time';
export let lbView = 'article';
export let lbCurrentArticle = null;

// Ads state
export let _adsenseLoaded = false;
export let _adTimers = {};

// Firebase cache
export let _fb = null;

// Audio cache
export let _ac = null;

// Toast timer
export let _tt = null;

// Setters (needed because ES modules export bindings are read-only from outside)
export function setGame(g) { game = g; }
export function setGameStartedAt(t) { gameStartedAt = t; }
export function setTimerInterval(i) { timerInterval = i; }
export function setScorePublished(v) { scorePublished = v; }
export function setCurrentDiff(d) { currentDiff = d; }
export function setTid(v) { tid = v; }
export function incrementTid() { return tid++; }
export function setHasPlayedOnce(v) { hasPlayedOnce = v; }
export function setCatGameModeState(m) { catGameMode = m; }
export function setColabMode(m) { colabMode = m; }
export function setColabSessionCode(c) { colabSessionCode = c; }
export function setColabPlayerName(n) { colabPlayerName = n; }
export function setColabPlayerColor(c) { colabPlayerColor = c; }
export function setColabPlayerId(id) { colabPlayerId = id; }
export function setColabUnsubscribers(u) { colabUnsubscribers = u; }
export function setColabPlayers(p) { colabPlayers = p; }
export function setDailyActiveDate(d) { dailyActiveDate = d; }
export function setDailyCountdownInterval(i) { dailyCountdownInterval = i; }
export function setDailySelectedDay(d) { dailySelectedDay = d; }
export function setDailySort(s) { dailySort = s; }
export function setLbSort(s) { lbSort = s; }
export function setLbView(v) { lbView = v; }
export function setLbCurrentArticle(a) { lbCurrentArticle = a; }
export function setAdsenseLoaded(v) { _adsenseLoaded = v; }
export function setFb(fb) { _fb = fb; }
export function setAc(ac) { _ac = ac; }
export function setTt(t) { _tt = t; }