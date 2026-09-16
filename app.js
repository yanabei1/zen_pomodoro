/* ============================================================
   禅意番茄钟 · 逻辑
   纯 vanilla，无依赖
   ============================================================ */
(() => {
'use strict';

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

/* ---------------- 存储 ---------------- */
const KEY = 'zen-pomodoro-v1';
const DEFAULTS = {
  focus: 25, short: 5, long: 15, rounds: 4,
  autoBreak: true, autoFocus: false, sound: true, keepAwake: true,
  theme: 'light', lang: 'zh', clock: false
};
const LIMITS = { focus: [1, 90], short: [1, 30], long: [1, 60], rounds: [1, 8] };
/* 常用值：点数值就地展开，避免点十几次加减。
   专注时长里的 0 代表 ∞ —— 即禅意模式（正计时、无终点） */
const PRESETS = {
  focus:  [5, 15, 25, 45, 60, 0],
  short:  [3, 5, 10, 15, 20],
  long:   [5, 10, 15, 20, 30],
  rounds: [2, 3, 4, 5, 6]
};

function load() {
  let raw = {};
  try { raw = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}
  const s = Object.assign({}, DEFAULTS, raw.settings || {});
  if (!raw.settings || !raw.settings.theme) {
    s.theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  if (!Array.isArray(raw.sessions)) raw.sessions = [];
  return { settings: s, sessions: raw.sessions };
}
const store = load();
const S = () => store.settings;
function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} }

/* localStorage 在 file:// 或隐私模式下会直接抛错，静默失败会让统计永远是 0 */
let storageOK = true;
try { localStorage.setItem('__zen_probe', '1'); localStorage.removeItem('__zen_probe'); }
catch (e) { storageOK = false; }

/* 完成一轮后轮换的短句 */
const PRAISE = {
  zh: ['静水流深', '一念专注', '心自安然', '守得一刻', '又进一步', '安然前行'],
  en: ['Still water runs deep', 'One thing at a time', 'Well done', 'Nicely done', 'Stay present', 'Softly forward']
};
let praiseIdx = Math.floor(Math.random() * 6);

/* ---------------- 文案 ---------------- */
const I18N = {
  zh: {
    titleTimer: '专注', titleZen: '禅意', titleStats: '统计', titleSettings: '设置',
    modeFocus: '专注', modeShort: '短休息', modeLong: '长休息',
    navTimer: '计时', navStats: '统计',
    zenLine: '此刻，只做一件事', abandon: '放弃本轮', endZen: '结束并记录',
    stateIdle: '准备', stateFocus: '专注中', stateShort: '短休息中', stateLong: '长休息中', stateZen: '已专注',
    statePaused: '已暂停',
    weekLabel: '本周专注时长',
    gDuration: '时长', gDisplay: '显示', gBehavior: '习惯', gAbout: '关于',
    focusDur: '专注时长', shortDur: '短休息', longDur: '长休息', roundsDur: '长休息间隔',
    themeLabel: '主题', langLabel: '语言', clockLabel: '时钟模式', light: '浅色', dark: '深色',
    autoBreak: '自动开始休息', autoFocus: '自动开始专注', sound: '提示音', keepAwake: '保持屏幕常亮',
    version: '版本', resetAll: '恢复默认设置',
    preview: '试听', gData: '数据', demoData: '填充演示数据', doFill: '填充',
    clearLog: '清空所有记录', doClear: '清空',
    syncHint: '手机 · 电脑同步', doExport: '导出', doImport: '导入',
    syncNote: '导出的文件是全部设置与专注记录。在另一台设备上导入，即可合并两边的进度（时间与时长完全相同的记录只保留一条）。',
    syncEmpty: '还没有记录可导出',
    syncExported: '已导出',
    badFile: '文件读不出来',
    badFileSub: '不是本应用导出的 JSON 备份',
    importFail: '导入失败',
    importFailSub: '文件内容已损坏，或不是本应用的备份',
    importDone: '导入完成',
    importNone: '没有新记录',
    importNoneSub: '两台设备的记录已经是一致的',
    importedSub: (n, m, s) => `新增 ${n} 条专注记录 · 共 ${m} 分钟${s ? ' · 设置已同步' : ''}`,
    mSessions: '完成番茄', mAverage: '平均时长', mStreak: '最长连续',
    mToday: '今日专注', mWeek: '本周番茄', mTotal: '累计专注',
    noStore: '当前环境不能保存记录（请用 http:// 打开）',
    statRule: '仅统计专注时段 · 中途结束按实际时长计入',
    empty: '本周尚无记录 · 从第一个番茄开始',
    docTitle: '禅 · 番茄钟'
  },
  en: {
    titleTimer: 'Focus', titleZen: 'Zen', titleStats: 'Insights', titleSettings: 'Settings',
    modeFocus: 'Focus', modeShort: 'Short Break', modeLong: 'Long Break',
    navTimer: 'Timer', navStats: 'Stats',
    zenLine: 'One thing at a time.', abandon: 'Give up this round', endZen: 'End & record',
    stateIdle: 'Ready', stateFocus: 'Focusing', stateShort: 'Short break', stateLong: 'Long break', stateZen: 'Focusing',
    statePaused: 'Paused',
    weekLabel: 'FOCUS TIME THIS WEEK',
    gDuration: 'SESSION', gDisplay: 'DISPLAY', gBehavior: 'BEHAVIOR', gAbout: 'ABOUT',
    focusDur: 'Focus duration', shortDur: 'Short break', longDur: 'Long break', roundsDur: 'Rounds until long break',
    themeLabel: 'Theme', langLabel: 'Language', clockLabel: 'Clock mode', light: 'Light', dark: 'Dark',
    autoBreak: 'Auto-start breaks', autoFocus: 'Auto-start focus', sound: 'Sound', keepAwake: 'Keep screen awake',
    version: 'Version', resetAll: 'Reset all settings',
    preview: 'Preview', gData: 'DATA', demoData: 'Fill with demo data', doFill: 'Fill',
    clearLog: 'Clear all records', doClear: 'Clear',
    syncHint: 'Phone · desktop sync', doExport: 'Export', doImport: 'Import',
    syncNote: 'The file holds every setting and focus record. Import it on your other device to merge both sides — records with an identical time and length are kept once.',
    syncEmpty: 'Nothing to export yet',
    syncExported: 'Exported',
    badFile: 'Cannot read that file',
    badFileSub: 'Not a JSON backup from this app',
    importFail: 'Import failed',
    importFailSub: 'The file is damaged, or not a backup from this app',
    importDone: 'Import complete',
    importNone: 'Nothing new',
    importNoneSub: 'Both devices are already in sync',
    importedSub: (n, m, s) => `${n} new records · ${m} min total${s ? ' · settings synced' : ''}`,
    mSessions: 'Sessions completed', mAverage: 'Average session', mStreak: 'Longest streak',
    mToday: 'Today', mWeek: 'This week', mTotal: 'All time',
    noStore: 'Records cannot be saved here — open via http://',
    statRule: 'Focus time only · interrupted sessions count by minutes',
    empty: 'Nothing yet this week · start your first one',
    docTitle: 'Zen Pomodoro'
  }
};
const T = k => (I18N[S().lang][k] != null ? I18N[S().lang][k] : k);

/* ---------------- 时间格式 ---------------- */
const CN = ['〇','一','二','三','四','五','六','七','八','九'];
function cnNum(n) {
  if (n < 10) return CN[n];
  if (n < 20) return '十' + (n % 10 ? CN[n % 10] : '');
  return CN[Math.floor(n / 10)] + '十' + (n % 10 ? CN[n % 10] : '');
}
function fmtDate(d) {
  if (S().lang === 'zh') {
    return `${cnNum(d.getMonth() + 1)}月${cnNum(d.getDate())}日 · 星期${'日一二三四五六'[d.getDay()]}`;
  }
  const m = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric' }).format(d);
  const w = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(d);
  return `${m} · ${w}`;
}
function fmtRange(a, b) {
  if (S().lang === 'zh') return `${cnNum(a.getMonth() + 1)}月${cnNum(a.getDate())}日 — ${cnNum(b.getMonth() + 1)}月${cnNum(b.getDate())}日`;
  const f = d => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(d);
  return `${f(a)} — ${f(b)}`;
}
function fmtDur(min) {
  const zh = S().lang === 'zh';
  if (min >= 60) {
    const h = Math.floor(min / 60), m = min % 60;
    return zh ? `${h} 小时 ${String(m).padStart(2, '0')} 分` : `${h}h ${String(m).padStart(2, '0')}m`;
  }
  return zh ? `${min} 分钟` : `${min}m`;
}
function clockText(d) {
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}
const clockSecText = d => String(d.getSeconds()).padStart(2, '0');

/* 时钟模式：整秒对齐刷新。
   用 setInterval(1000) 会相对系统时钟漂移，久了会出现跳秒或同一秒闪两次；
   改成每次对齐到下一个整秒的边界。 */
function tickClock() {
  const d = new Date();
  const hm = document.getElementById('clockHM');
  const sec = document.getElementById('clockSec');
  if (hm) hm.textContent = clockText(d);
  if (sec) sec.textContent = clockSecText(d);
  /* 禅意未开始时，下面那行显示的就是现在的时刻，得跟着走 */
  if (t.zen && !t.running && !isPaused()) { paintTime(); renderZen(); }
  setTimeout(tickClock, 1000 - d.getMilliseconds() + 10);
}
const dayKey = d => d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
const sameDay = (a, b) => dayKey(a) === dayKey(b);

/* ---------------- 计时引擎 ---------------- */
const CIRC = 782.2;                       // 2πr, r = 124.5
const M = { focus: 'focus', short: 'short', long: 'long' };

const t = {
  mode: 'focus',
  done: 0,          // 本轮循环内已完成的专注轮数
  total: 0,
  remaining: 0,
  endAt: 0,
  running: false,
  /* 禅意模式（专注时长 = ∞）：改成正计时，没有终点 */
  zen: false,
  accum: 0,         // 暂停前已累计的毫秒
  startAt: 0,       // 本次开跑的起点
  startedAt: 0      // 整个阶段第一次开始的墙上时刻（用于「始于 09:39」）
};

const msOf = mode => S()[mode] * 60000;
const isZen = () => S().focus === 0;
const zenElapsed = () => t.accum + (t.running ? Date.now() - t.startAt : 0);
const isPaused = () => !t.running && (t.zen ? t.accum > 0 : (t.remaining < t.total && t.remaining > 0));

function resetPhase(mode, autostart) {
  t.mode = mode;
  t.zen = mode === M.focus && isZen();
  t.total = t.zen ? 0 : msOf(mode);
  t.remaining = t.total;
  t.endAt = 0;
  t.startAt = 0;
  t.accum = 0;
  t.startedAt = 0;
  t.running = false;
  releaseWakeLock();
  render();
  if (autostart) setTimeout(start, 900);
}

/* 主动切换模式：如果本来在跑，就用新模式的时长接着跑，不要停下来。
   （只有一轮自然结束时才由「自动开始休息 / 专注」决定要不要继续） */
function switchMode(mode) {
  if (mode === t.mode) return;
  const wasRunning = t.running;
  recordFocus(false);
  resetPhase(mode, false);
  if (wasRunning) start();
}

function start() {
  if (t.running) return;
  if (!t.startedAt) t.startedAt = Date.now();
  if (t.zen) {
    t.startAt = Date.now();          // 正计时：只记起点，没有终点
  } else {
    if (t.remaining <= 0) { t.total = msOf(t.mode); t.remaining = t.total; }
    /* 把终点吸附到整秒：
       倒计时翻秒的时刻取决于 endAt，而时钟模式里的秒针取决于墙上时钟。
       不对齐的话两者会相差一个固定的 0~1 秒的小数偏移，
       速率一样但永远错开，看起来就像两个时钟各走各的。
       向下取整（而不是四舍五入）能保证第一帧显示的仍是完整时长，
       代价是实际时长最多短不到 1 秒，对番茄钟可以忽略。 */
    t.endAt = Math.floor((Date.now() + t.remaining) / 1000) * 1000;
  }
  t.running = true;
  requestWakeLock();
  requestNotify();
  render();
  loop();
}

function pause() {
  if (!t.running) return;
  if (t.zen) { t.accum += Date.now() - t.startAt; t.startAt = 0; }
  else t.remaining = Math.max(0, t.endAt - Date.now());
  t.running = false;
  releaseWakeLock();
  render();
}

function toggle() {
  if (t.running) { pause(); return; }
  /* 禅意：按下开始会让表盘里那两行对调（∞/00:00 → 计时/∞）。
     只让这两行交叉淡化，整页完全不动 —— 按下的反馈应该即时，不被动画吞掉。 */
  if (t.zen) {
    document.documentElement.dataset.vt = 'zen-start';
    withViewTransition(start, () => { delete document.documentElement.dataset.vt; });
  } else start();
}

function reset() {
  recordFocus(false);            // 放弃本轮也要把已经专注的时间记下来
  resetPhase(t.mode, false);
}

/* 跳过：推进到下一阶段；运行中则不中断，且已专注的时间照记 */
function skip() {
  const wasRunning = t.running;
  t.running = false;
  releaseWakeLock();
  recordFocus(false);
  if (t.mode === M.focus) advanceFromFocus();
  else advanceFromBreak();
  render();
  if (wasRunning) start();
}

function loop() {
  if (!t.running) return;
  tickNow();
  if (!t.running) return;          // tickNow 里可能已经 finish 了
  /* 最多 100ms 一帧保证圆环顺滑；同时确保在跨过整秒后 ~8ms 内必有一帧，
     让倒计时翻秒和时钟模式的秒针几乎同时发生（实测两者都落在 10~20ms） */
  const toNextSec = 1000 - (Date.now() % 1000) + 8;
  setTimeout(loop, Math.min(100, toNextSec));
}

function tickNow() {
  if (!t.running) return;
  if (t.zen) { paintTime(); return; }     // 无终点，不会自行结束
  t.remaining = Math.max(0, t.endAt - Date.now());
  paintTime();
  if (t.remaining <= 0) finish();
}

function finish() {
  t.running = false;
  releaseWakeLock();
  if (S().sound) chime();
  notify();
  const wasFocus = t.mode === M.focus;
  if (wasFocus) {
    recordFocus(true);
    advanceFromFocus();
  } else {
    advanceFromBreak();
  }
  render();
  celebrate(wasFocus);
}

/* 正向提示：不挡操作、几秒后自动淡出 */
let toastTimer = null;
function toast(main, sub, ms) {
  const el = $('#toast');
  if (!el) return;
  el.querySelector('.toast-main').textContent = main;
  el.querySelector('.toast-sub').textContent = sub || '';
  el.classList.add('is-on');
  document.body.classList.add('is-toasting');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove('is-on');
    document.body.classList.remove('is-toasting');
  }, ms || 4200);
}

function celebrate(wasFocus) {
  const zh = S().lang === 'zh';
  if (!wasFocus) { toast(zh ? '回到当下' : 'Back to the present', '', 2600); return; }
  if (t.mode === M.long) {
    toast(zh ? '四轮圆满' : 'Cycle complete', zh ? '该好好休息了' : 'Time for a good rest', 5200);
    return;
  }
  const now = new Date();
  const today = store.sessions.filter(s => sameDay(new Date(s.t), now));
  const min = today.reduce((a, b) => a + b.min, 0);
  const pool = PRAISE[zh ? 'zh' : 'en'];
  const sub = zh ? `今日第 ${today.length} 个 · 已专注 ${fmtDur(min)}`
                 : `#${today.length} today · ${fmtDur(min)} focused`;
  toast(pool[praiseIdx++ % pool.length], sub);
}

/* 结束禅意：按实际经过的分钟记录，然后回到未开始 */
function endZen() {
  const min = Math.max(0, Math.round(zenElapsed() / 60000));
  t.running = false;
  releaseWakeLock();
  if (min >= 1) {
    store.sessions.push({ t: Date.now(), min, mode: 'focus', done: true, zen: true });
    save();
    const zh = S().lang === 'zh';
    toast(zh ? `已记下 ${min} 分钟` : `${min} min recorded`,
          zh ? '禅意记录不计入番茄数' : 'Zen sits are not counted as tomatoes', 3600);
  }
  resetPhase(M.focus, false);
}

const isIdle = () => !t.running && t.remaining === t.total;

/* ---------------- 专注记录 ----------------
   只要真正专注过一段时间就留下痕迹：
   - 自然走完  → done:true，记设置里的完整时长
   - 中途放弃 / 跳过 / 切模式 → done:false，按【实际经过的分钟数】记
   不足 30 秒的误触不留痕；只有专注计入，休息不计。 */
const MIN_LOG_MS = 30000;

function recordFocus(done) {
  if (t.mode !== M.focus) return 0;
  const spentMs = done ? t.total : Math.max(0, t.total - t.remaining);
  if (!done && spentMs < MIN_LOG_MS) return 0;
  const min = done ? S().focus : Math.max(1, Math.round(spentMs / 60000));
  store.sessions.push({ t: Date.now(), min, mode: 'focus', done: !!done });
  save();
  if (!done) {
    const zh = S().lang === 'zh';
    toast(zh ? `已记下 ${min} 分钟` : `${min} min recorded`,
          zh ? '中途结束也按实际时长计入' : 'Interrupted time still counts', 3000);
  }
  return min;
}

function advanceFromFocus() {
  t.done++;
  const next = t.done >= S().rounds ? M.long : M.short;
  resetPhase(next, S().autoBreak);
}

function advanceFromBreak() {
  if (t.mode === M.long) t.done = 0;
  resetPhase(M.focus, S().autoFocus);
}

/* ---------------- 唤醒锁 ---------------- */
let wakeLock = null;
async function requestWakeLock() {
  if (!S().keepAwake || !('wakeLock' in navigator)) return;
  try { wakeLock = await navigator.wakeLock.request('screen'); } catch (e) {}
}
function releaseWakeLock() {
  try { if (wakeLock) wakeLock.release(); } catch (e) {}
  wakeLock = null;
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    if (t.running) { tickNow(); requestWakeLock(); }
    renderStats();
    renderToday();
  }
});

/* ---------------- 提醒 ---------------- */
function requestNotify() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') Notification.requestPermission().catch(() => {});
}
function notify() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const zh = S().lang === 'zh';
  const title = t.mode === M.focus ? (zh ? '专注结束' : 'Focus complete')
                                   : (zh ? '休息结束' : 'Break over');
  try {
    new Notification(title, {
      body: zh ? '回到当下。' : 'Back to the present.',
      icon: 'icon.svg', silent: true, tag: 'zen-pomodoro'
    });
  } catch (e) {}
}

/* 一声磬：两个正弦叠加，指数衰减 */
let ac = null;
function chime() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = ac || new AC();
    if (ac.state === 'suspended') ac.resume();
    const t0 = ac.currentTime;
    [[528, 0.16], [792, 0.07], [1056, 0.035]].forEach(([f, vol], i) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(vol, t0 + 0.015 + i * 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.6);
      o.connect(g).connect(ac.destination);
      o.start(t0); o.stop(t0 + 2.7);
    });
  } catch (e) {}
}

/* ---------------- 渲染：计时 ---------------- */
function fmtClock(ms) {
  const s = Math.ceil(ms / 1000);
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}

/* 正计时：1 小时内 MM:SS，满 1 小时自动变 H:MM:SS */
function fmtElapsed(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const p = n => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${p(m)}:${p(sec)}` : `${p(m)}:${p(sec)}`;
}

function paintTime() {
  const zen = t.zen;
  const zenIdle = zen && !t.running && !isPaused();

  /* 禅意：未开始时 ∞ 在上（它是这一模式的定义）；一开始上下对调 ——
     计时器成为主角，∞ 退到下方做一个安静的记号。 */
  const mainIsInf = zen && zenIdle;
  const main = zen ? (zenIdle ? '∞' : fmtElapsed(zenElapsed())) : fmtClock(t.remaining);
  $('#time').textContent = main;
  $('#timeClock').textContent = main;
  /* ∞ 的字面高度远低于数字，同样字号下会显得小，得单独放大補平 */
  [$('#time'), $('#timeClock')].forEach(el => { if (el) el.classList.toggle('is-infinite', mainIsInf); });

  /* 禅意没有终点，所以圆环不做进度：它是一个完整的圆（円相），恒为朱砂。
     部分圆弧会被读成「已完成 4%」，反而隐含了目标感。 */
  const off = zen ? 0 : CIRC * (1 - (t.total ? t.remaining / t.total : 0));
  [$('#ring'), $('#ringClock')].forEach(r => { if (r) r.style.strokeDashoffset = off; });

  /* 副行：禅意——未开始时是待跑的 00:00，开跑后换成退到下方的 ∞；番茄钟是状态词 */
  const st = t.running
    ? (t.mode === M.focus ? 'stateFocus' : t.mode === M.short ? 'stateShort' : 'stateLong')
    : (isPaused() ? 'statePaused' : 'stateIdle');
  const sub = zen ? (zenIdle ? '00:00' : '∞') : T(st);
  [$('#dialState'), $('#dialStateClock')].forEach(el => {
    if (!el) return;
    el.textContent = sub;
    el.classList.toggle('is-time', zen);
  });
}

/* 模式行只在「未开始」时是选择器；一旦开跑（含暂停）就降级为当前阶段的提示，
   防止误触把正在走的专注白白丢掉 */
function renderModes() {
  const locked = t.running || isPaused();
  $('#modes').classList.toggle('is-locked', locked);
  $$('.mode').forEach(b => {
    b.classList.toggle('is-active', b.dataset.mode === t.mode);
    b.disabled = locked;
  });
}

function renderControls() {
  const btn = $('#btnToggle');
  btn.classList.toggle('is-running', t.running);
  $('#s-timer').classList.toggle('is-paused', isPaused() || (!t.running && t.remaining < t.total));
}

function renderRounds() {
  const box = $('#roundDots');
  const total = S().rounds;
  if (box.children.length !== total) {
    box.innerHTML = '';
    for (let i = 0; i < total; i++) {
      const d = document.createElement('span');
      d.className = 'round-dot';
      box.appendChild(d);
    }
  }
  const filled = Math.min(t.done + 1, total);
  Array.from(box.children).forEach((d, i) => d.classList.toggle('is-done', i < filled));
  const n = Math.min(t.done + 1, total);
  $('#roundsLabel').textContent = S().lang === 'zh'
    ? `第 ${n} 轮 · 共 ${total} 轮`
    : `Round ${n} of ${total}`;
}

function renderToday() {
  const now = new Date();
  const today = store.sessions.filter(s => sameDay(new Date(s.t), now));
  const min = today.reduce((a, b) => a + b.min, 0);
  $('#todayLine').textContent = t.zen
    ? (S().lang === 'zh' ? `今日 · 已专注 ${fmtDur(min)}` : `Today · ${fmtDur(min)} focused`)
    : (S().lang === 'zh' ? `今日 ${today.length} 个番茄 · ${fmtDur(min)}`
                         : `Today ${today.length} sessions · ${fmtDur(min)}`);
  $('#timerDate').textContent = fmtDate(now);
}

/* 禅意模式：整页换一副面孔 —— 无模式行、无轮次、标题变禅意 */
function renderZen() {
  const screen = $('#s-timer');
  screen.classList.toggle('is-zen', t.zen);
  screen.classList.toggle('is-idle', isIdle());
  $('#screenTitle').textContent = t.zen ? T('titleZen') : T('titleTimer');
  /* 这一行始终在位、位置不变；唯一的区别是开跑后前面多一个「始于」 */
  if (t.zen) {
    const d = t.startedAt ? new Date(t.startedAt) : new Date();
    $('#startLabel').textContent =
      (t.startedAt ? (S().lang === 'zh' ? '始于 ' : 'Started ') : '') + clockText(d);
  }
}

function renderFooter() {
  const el = $('#zenLine');
  /* 禅意：只有真的在跑（或暂停中）才有东西可结束 */
  if (t.zen && (t.running || isPaused())) {
    el.textContent = T('endZen');
    el.classList.add('is-action');
    el.dataset.act = 'end';
    return;
  }
  if (isPaused()) {
    el.textContent = T('abandon');
    el.classList.add('is-action');
    el.dataset.act = 'abandon';
  } else {
    el.textContent = T('zenLine');
    el.classList.remove('is-action');
    delete el.dataset.act;
  }
}

function render() {
  paintTime();
  renderModes();
  renderControls();
  renderRounds();
  renderToday();
  renderZen();
  renderFooter();
  /* 计时进行中隐藏时钟模式的秒针：两组同时在跳的数字显得杂乱 */
  document.body.classList.toggle('is-timing', t.running || isPaused());
}

/* ---------------- 渲染：统计 ---------------- */
function weekStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

function longestStreak() {
  if (!store.sessions.length) return 0;
  const set = new Set(store.sessions.map(s => dayKey(new Date(s.t))));
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (!set.has(dayKey(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (set.has(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

function renderStats() {
  const start = weekStart();
  const days = [];
  for (let i = 0; i < 7; i++) { const d = new Date(start); d.setDate(d.getDate() + i); days.push(d); }
  const mins = days.map(d =>
    store.sessions.filter(s => sameDay(new Date(s.t), d)).reduce((a, b) => a + b.min, 0)
  );
  const todayIdx = days.findIndex(d => sameDay(d, new Date()));
  const max = Math.max(100, ...mins);
  const letters = S().lang === 'zh' ? ['一','二','三','四','五','六','日'] : ['M','T','W','T','F','S','S'];

  $('#statsRange').textContent = fmtRange(days[0], days[6]);

  const chart = $('#chart');
  chart.innerHTML = '';

  /* 空状态：还没有任何记录时不摆一排零高柱子 */
  if (mins.every(m => m === 0)) {
    const p = document.createElement('p');
    p.className = 'chart-empty';
    p.textContent = T('empty');
    chart.appendChild(p);
  } else {
    mins.forEach((m, i) => {
      const col = document.createElement('div');
      col.className = 'col';
      const area = document.createElement('div');
      area.className = 'bar-area';
      const bar = document.createElement('div');
      bar.className = 'bar' + (i === todayIdx ? ' is-today' : '');
      bar.style.height = Math.max(3, Math.round(m / max * 132)) + 'px';
      area.appendChild(bar);
      const day = document.createElement('span');
      day.className = 'day' + (i === todayIdx ? ' is-today' : '');
      day.textContent = letters[i];
      col.appendChild(area); col.appendChild(day);
      chart.appendChild(col);
    });
  }

  const total = mins.reduce((a, b) => a + b, 0);
  const allMin = store.sessions.reduce((a, b) => a + b.min, 0);
  const avg = store.sessions.length ? Math.round(allMin / store.sessions.length) : 0;
  const todayMin = store.sessions
    .filter(s => sameDay(new Date(s.t), new Date()))
    .reduce((a, b) => a + b.min, 0);
  /* 只有自然走完的才算「一个番茄」，中途结束的只贡献分钟数；
     禅意（无限）也不算番茄 —— 它不是一个 25 分钟单位 */
  const count = store.sessions.filter(s => s.t >= start.getTime() && s.done !== false && !s.zen).length;

  $('#weekTotal').textContent = fmtDur(total);
  $('#statNote').textContent = (storageOK ? '' : T('noStore') + ' · ') + T('statRule');

  const zh = S().lang === 'zh';
  const rows = [
    [T('mToday'), fmtDur(todayMin)],
    [T('mWeek'), zh ? `${count} 个` : `${count}`],
    [T('mTotal'), fmtDur(allMin)],
    [T('mAverage'), zh ? `${avg} 分钟` : `${avg} min`],
    [T('mStreak'), zh ? `${longestStreak()} 天` : `${longestStreak()} days`]
  ];
  const box = $('#metrics');
  box.innerHTML = '';
  rows.forEach(([k, v], i) => {
    if (i) { const s = document.createElement('div'); s.className = 'sep'; box.appendChild(s); }
    const r = document.createElement('div');
    r.className = 'metric';
    r.innerHTML = `<span class="metric-label"></span><span class="metric-value"></span>`;
    r.children[0].textContent = k;
    r.children[1].textContent = v;
    box.appendChild(r);
  });
}

/* ---------------- 渲染：设置 ---------------- */
function valText(key) {
  const v = S()[key];
  if (key === 'focus' && v === 0) return '∞';
  if (key === 'rounds') return S().lang === 'zh' ? `${v} 个` : `${v}`;
  return S().lang === 'zh' ? `${v} 分钟` : `${v} min`;
}

function renderSettings() {
  $$('[data-val]').forEach(el => { el.textContent = valText(el.dataset.val); });
  $$('[data-toggle]').forEach(b => b.classList.toggle('is-on', !!S()[b.dataset.toggle]));
  $$('.switch2').forEach(g => {
    const key = g.dataset.switch;
    Array.from(g.querySelectorAll('button')).forEach(b =>
      b.classList.toggle('is-on', S()[key] === b.dataset.v));
  });
  /* 只作用于设置页的步进器，避免误伤计时页的时长按钮 */
  $$('#s-settings [data-step]').forEach(b => {
    const k = b.dataset.step, lim = LIMITS[k], v = S()[k];
    if (!lim) return;
    const dir = Number(b.dataset.dir);
    b.disabled = k === 'focus'
      ? (v === 0 ? dir > 0 : (dir < 0 ? v <= 1 : v >= 90))
      : ((dir < 0 && v <= lim[0]) || (dir > 0 && v >= lim[1]));
  });
}

/* ---------------- 主题 / 语言 / 视图 ---------------- */
function applyTheme() {
  document.documentElement.dataset.theme = S().theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = S().theme === 'dark' ? '#191714' : '#F5F1E8';
}

function applyLang() {
  const zh = S().lang === 'zh';
  document.documentElement.lang = zh ? 'zh-CN' : 'en';
  document.title = T('docTitle');
  $$('[data-i18n]').forEach(el => { el.textContent = T(el.dataset.i18n); });
  render();
  renderStats();
  renderSettings();
}

let view = 'timer';
const VIEWS = ['timer', 'stats', 'settings', 'clock'];

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

function applyView(v) {
  view = v;
  document.body.dataset.view = v;
  if (location.hash.slice(1) !== v) {
    try { history.replaceState(null, '', '#' + v); } catch (e) { location.hash = v; }
  }
  $$('.nav button').forEach(b => b.classList.toggle('is-active', b.dataset.go === v));
  if (v === 'stats') renderStats();
  if (v === 'settings') renderSettings();
}

/* 转场统一入口：不支持 View Transitions 时直接执行，不影响功能 */
function withViewTransition(fn, done) {
  if (!document.startViewTransition || reduceMotion) { fn(); if (done) done(); return; }
  document.startViewTransition(fn).finished.finally(() => { if (done) done(); });
}

/* 切页 */
function go(v) { withViewTransition(() => applyView(v)); }

/* 深链：#timer / #stats / #settings / #clock */
addEventListener('hashchange', () => {
  const v = location.hash.slice(1);
  if (VIEWS.includes(v) && v !== view) go(v);
});

function exitClock() { go('timer'); }

/* ---------------- 事件 ---------------- */
$('#btnToggle').addEventListener('click', toggle);
$('#btnReset').addEventListener('click', reset);
$('#btnSkip').addEventListener('click', skip);

$('#zenLine').addEventListener('click', e => {
  const act = e.currentTarget.dataset.act;
  if (act === 'abandon') reset();
  else if (act === 'end') endZen();
});

$$('.mode').forEach(b => b.addEventListener('click', () => switchMode(b.dataset.mode)));

$$('[data-go]').forEach(b => b.addEventListener('click', () => go(b.dataset.go)));

$('#s-clock').addEventListener('click', exitClock);

/* ---------------- 表盘：点数字调时长，点圆环进时钟模式 ----------------
   未开始时点一下表盘中间的数字，它就地展开成常用值（和设置页里是同一套预设），
   点其中一个即可；点圆环本体仍然是时钟模式。两个目标不同，不会误触。 */
function isPicking() { return $('#dialBtn').classList.contains('is-picking'); }
function closeDialPicker() { $('#dialBtn').classList.remove('is-picking'); }

function buildDialPicker() {
  const k = t.mode, box = $('#dialPicker');
  box.innerHTML = '';
  PRESETS[k].forEach(v => {
    const b = document.createElement('button');
    b.textContent = (k === 'focus' && v === 0) ? '∞' : v;
    b.classList.toggle('is-on', S()[k] === v);
    b.addEventListener('click', e => {
      e.stopPropagation();
      if (S()[k] === v) { closeDialPicker(); return; }
      /* 整段包在转场里：收起选项、换模式、重算状态都是同一次变化 */
      withViewTransition(() => {
        S()[k] = v;
        save();
        renderSettings();
        /* 统一走 resetPhase：它会一并重算 t.zen。
           直接改 t.total 会漏掉这一步，选 ∞ 时就会停在番茄钟布局。 */
        resetPhase(k, false);
        closeDialPicker();
      });
    });
    box.appendChild(b);
  });
}

function toggleDialPicker() {
  if (isPicking()) { closeDialPicker(); return; }
  buildDialPicker();
  $('#dialBtn').classList.add('is-picking');
}

[$('#time'), $('#dialState')].forEach(el => el.addEventListener('click', e => {
  e.stopPropagation();
  if (!isIdle()) return;               // 未开始时才可调；禅意也可以，用来切回定时
  toggleDialPicker();
}));

$('#dialBtn').addEventListener('click', () => {
  if (isPicking()) { closeDialPicker(); return; }
  go('clock');
});

document.addEventListener('click', closeDialPicker);

/* ---------- 改时长：单击一步，长按连续加速 ---------- */
function afterNudge(k) {
  save();
  renderSettings();
  if (k === 'rounds') { t.done = Math.min(t.done, S().rounds); renderRounds(); }
  else if (!t.running && t.mode === k) resetPhase(k, false);
  return true;
}

/* 专注时长的末尾是 ∞(0)：90 再往上一位进入 ∞，从 ∞ 往回退一位回到 90 */
function nudgeFocus(delta) {
  const v = S().focus;
  if (v === 0) {
    if (delta > 0) return false;
    S().focus = 90;
    return true;
  }
  if (delta > 0 && v + delta > 90) { S().focus = 0; return true; }
  const next = Math.min(90, Math.max(1, v + delta));
  if (next === v) return false;
  S().focus = next;
  return true;
}

function nudge(k, dir, mult) {
  const step = dir * (mult || 1);
  if (k === 'focus') return nudgeFocus(step) ? afterNudge(k) : false;
  const lim = LIMITS[k];
  const next = Math.min(lim[1], Math.max(lim[0], S()[k] + step));
  if (next === S()[k]) return false;
  S()[k] = next;
  return afterNudge(k);
}

$$('#s-settings [data-step]').forEach(b => {
  const k = b.dataset.step, dir = Number(b.dataset.dir);
  b.addEventListener('click', () => nudge(k, dir, 1));

  /* 按住 0.4s 后开始连发，速度分三档（1 → 5 → 10），25→60 约需 1.5s */
  let holdT = null, repT = null, ticks = 0;
  const stop = () => {
    clearTimeout(holdT); clearInterval(repT);
    holdT = repT = null; ticks = 0;
  };
  b.addEventListener('pointerdown', () => {
    if (b.disabled) return;
    ticks = 0;
    holdT = setTimeout(() => {
      repT = setInterval(() => {
        ticks++;
        const mult = ticks < 6 ? 1 : ticks < 14 ? 5 : 10;
        if (!nudge(k, dir, mult)) stop();
      }, 110);
    }, 400);
  });
  ['pointerup', 'pointerleave', 'pointercancel', 'lostpointercapture'].forEach(ev => b.addEventListener(ev, stop));
  /* 指针在窗口外松开、切走标签页等场景收不到 pointerup，用全局监听兜底，
     否则连发会在后台一直跑下去 */
  addEventListener('pointerup', stop);
  addEventListener('pointercancel', stop);
  addEventListener('blur', stop);
  document.addEventListener('visibilitychange', stop);
  b.addEventListener('contextmenu', e => e.preventDefault());
});

/* ---------- 点数值 → 就地展开常用值 ---------- */
function closePicker() {
  $$('.row.is-picking').forEach(r => r.classList.remove('is-picking'));
}

function buildPresets() {
  $$('[data-presets]').forEach(box => {
    const k = box.dataset.presets;
    box.innerHTML = '';
    PRESETS[k].forEach(v => {
      const b = document.createElement('button');
      b.dataset.presetVal = v;
      b.textContent = (k === 'focus' && v === 0) ? '∞' : v;
      b.addEventListener('click', () => {
        S()[k] = v;
        save();
        closePicker();
        renderSettings();
        if (k === 'rounds') { t.done = Math.min(t.done, S().rounds); renderRounds(); }
        else if (!t.running && t.mode === k) resetPhase(k, false);
      });
      box.appendChild(b);
    });
  });
}

$$('[data-pick]').forEach(b => b.addEventListener('click', e => {
  e.stopPropagation();
  const row = b.closest('.row');
  const wasOpen = row.classList.contains('is-picking');
  closePicker();
  if (wasOpen) return;
  const k = b.dataset.pick;
  row.querySelectorAll('[data-preset-val]').forEach(x =>
    x.classList.toggle('is-on', Number(x.dataset.presetVal) === S()[k]));
  row.classList.add('is-picking');
}));

document.addEventListener('click', closePicker);

/* 试听提示音 */
$('#previewSound').addEventListener('click', () => chime());

/* 演示数据 / 清空记录：方便验收统计页 */
$('#seedDemo').addEventListener('click', () => {
  const zh = S().lang === 'zh';
  if (!confirm(zh ? '生成最近两周的演示记录？会覆盖现有记录。' : 'Generate two weeks of demo data? This replaces current records.')) return;
  const out = [];
  const now = new Date();
  const pool = [20, 25, 25, 30, 45];
  for (let d = 13; d >= 0; d--) {
    const day = new Date(now);
    day.setDate(day.getDate() - d);
    day.setHours(0, 0, 0, 0);
    if (day.getDay() === 0) continue;            // 周日留白
    const n = 1 + Math.floor(Math.random() * 5);
    for (let i = 0; i < n; i++) {
      const when = new Date(day);
      when.setHours(9 + i * 2, Math.floor(Math.random() * 60), 0, 0);
      out.push({ t: when.getTime(), min: pool[(i + d) % pool.length], mode: 'focus', done: true });
    }
  }
  store.sessions = out;
  save();
  go('stats');
  toast(zh ? '演示数据已生成' : 'Demo data ready', zh ? `${out.length} 条记录` : `${out.length} records`, 2600);
});

$('#clearLog').addEventListener('click', () => {
  const zh = S().lang === 'zh';
  if (!confirm(zh ? '清空所有记录？不可撤销。' : 'Clear all records? This cannot be undone.')) return;
  store.sessions = [];
  save();
  renderStats();
  renderToday();
});

/* ---------------- 数据导出 / 导入 ----------------
   localStorage 只活在「这一个浏览器」里：手机与电脑各存各的，
   换浏览器、清缓存还会丢。这里用一份 JSON 文件做载体，
   手动把数据搬到另一台设备上 —— 不依赖任何第三方服务。
   导入走【按内容合并】而不是覆盖：
   两边各自记录过的番茄，合起来才是完整的历史。 */
const FILE_FORMAT = 1;
const sessionKey = s => s.t + '|' + s.min;

function exportPayload() {
  const payload = {
    app: 'zen-pomodoro',
    format: FILE_FORMAT,
    exportedAt: Date.now(),
    settings: S(),
    sessions: store.sessions
  };
  /* 用 Blob 生成下载，不弹新窗口，iOS 上也能直接存进「文件」 */
  return JSON.stringify(payload, null, 2);
}

function exportData() {
  if (!store.sessions.length) { toast(T('syncEmpty'), '', 3000); return; }
  const now = new Date();
  const p = n => String(n).padStart(2, '0');
  /* 文件名不用 ':' —— Windows 不允许，下载会变成一串下划线 */
  const stamp = `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}`
              + `-${p(now.getHours())}${p(now.getMinutes())}`;
  let url = '';
  try {
    url = URL.createObjectURL(new Blob([exportPayload()], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `zen-pomodoro-${stamp}.json`;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast(T('syncExported'),
          S().lang === 'zh' ? `${store.sessions.length} 条记录`
                            : `${store.sessions.length} records`, 3200);
  } catch (e) {
    toast(T('badFile'), T('badFileSub'), 3400);
  } finally {
    /* 立刻撤销会让部分浏览器（Safari）来不及取用这个 URL，延后释放 */
    if (url) setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
}

/* 合并设置：以本机为底，只吸收备份里确实存在的字段，
   过滤掉非法值 —— 备份文件是可以被手改的，别让它写坏状态 */
function mergeSettings(d) {
  if (!d || typeof d !== 'object') return false;
  let changed = false;
  for (const k in DEFAULTS) {
    const v = d[k];
    if (v === undefined || v === null) continue;
    if (k === 'theme' || k === 'lang') { if (typeof v === 'string') changed = S()[k] !== v; }
    else changed = S()[k] !== v;
    S()[k] = v;
  }
  /* 数值字段全部夹回合法区间，并转成 Number */
  for (const k in LIMITS) {
    const n = Number(S()[k]);
    if (!Number.isFinite(n)) { S()[k] = DEFAULTS[k]; continue; }
    S()[k] = k === 'focus' ? (n === 0 ? 0 : Math.min(90, Math.max(1, Math.round(n))))
                           : Math.min(LIMITS[k][1], Math.max(LIMITS[k][0], Math.round(n)));
  }
  ['autoBreak', 'autoFocus', 'sound', 'keepAwake', 'clock'].forEach(k => { S()[k] = !!S()[k]; });
  if (S().theme !== 'light' && S().theme !== 'dark') S().theme = DEFAULTS.theme;
  if (S().lang !== 'zh' && S().lang !== 'en') S().lang = DEFAULTS.lang;
  return changed;
}

function mergeSessions(incoming) {
  const seen = new Set(store.sessions.map(sessionKey));
  let added = 0, min = 0;
  incoming.forEach(s => {
    if (!s || typeof s !== 'object') return;
    const at = Number(s.t), m = Number(s.min);
    /* 时间是必填项：没有它整个统计页都算不出来，直接丢掉这条 */
    if (!Number.isFinite(at) || !Number.isFinite(m) || m <= 0) return;
    const rec = {
      t: at,
      min: Math.round(m),
      mode: s.mode === 'short' || s.mode === 'long' ? s.mode : 'focus',
      done: s.done !== false
    };
    if (s.zen) rec.zen = true;
    const key = sessionKey(rec);
    if (seen.has(key)) return;
    seen.add(key);
    store.sessions.push(rec);
    added++;
    min += rec.min;
  });
  return { added, min };
}

function importText(text) {
  let data;
  try { data = JSON.parse(text); }
  catch (e) { toast(T('badFile'), T('badFileSub'), 3600); return; }
  if (!data || typeof data !== 'object' || (!Array.isArray(data.sessions) && !data.settings)) {
    toast(T('badFile'), T('badFileSub'), 3600);
    return;
  }
  const setChanged = mergeSettings(data.settings);
  const { added, min } = mergeSessions(Array.isArray(data.sessions) ? data.sessions : []);
  /* 时间序：合并后按发生时刻排好，统计与「最长连续」才不受导入顺序影响 */
  store.sessions.sort((a, b) => a.t - b.t);
  /* 备份里的专注时长与本机不同时，正在走的这一轮会失去参照：
     t.total 还是旧值、圆环却按新值画，两边对不上。
     这里把它按新设置重置，宁可丢掉这一轮，也不留一个显示错乱的计时器。 */
  const phaseStale = !t.running && !isPaused() && (t.zen !== isZen() || t.total !== (t.zen ? 0 : msOf(t.mode)));
  if (added || setChanged) {
    save();
    applyTheme();
    applyLang();          /* 内部会重绘计时页 / 统计页 / 设置页 */
    if (phaseStale) resetPhase(t.mode, false);
    renderStats();
    renderToday();
    render();
    go('stats');          /* 让导入的结果立刻可见 */
  }
  toast(added ? T('importDone') : T('importNone'),
        added ? T('importedSub')(added, min, setChanged) : T('importNoneSub'),
        added ? 5200 : 3600);
}

$('#exportData').addEventListener('click', exportData);
$('#importData').addEventListener('click', () => {
  const input = $('#importFile');
  if (!input) return;
  input.value = '';        /* 清空，否则连续导入同一个文件不会触发 change */
  input.click();
});
$('#importFile').addEventListener('change', e => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => importText(String(reader.result));
  reader.onerror = () => toast(T('badFile'), T('badFileSub'), 3600);
  reader.readAsText(file);
});

$$('[data-toggle]').forEach(b => b.addEventListener('click', () => {
  const k = b.dataset.toggle;
  S()[k] = !S()[k];
  save();
  b.classList.toggle('is-on', S()[k]);
  if (k === 'keepAwake') { S().keepAwake && t.running ? requestWakeLock() : releaseWakeLock(); }
}));

$$('.switch2').forEach(g => g.addEventListener('click', e => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const key = g.dataset.switch;
  S()[key] = btn.dataset.v;
  save();
  if (key === 'theme') applyTheme();
  if (key === 'lang') applyLang();
  renderSettings();
}));

$('#resetAll').addEventListener('click', () => {
  if (!confirm(S().lang === 'zh' ? '恢复默认设置？记录不会被删除。' : 'Reset all settings? Your history is kept.')) return;
  store.settings = Object.assign({}, DEFAULTS, { theme: S().theme, lang: S().lang });
  save();
  applyTheme(); applyLang(); renderSettings(); render();
});

/* ---------------- 启动 ---------------- */
/* 先把计时状态立起来，再画界面：导入流程会读 t.total 判断这一轮要不要重置，
   顺序反了就会拿默认值 0 去比，永远判成「需要重置」 */
applyTheme();
applyLang();
buildPresets();
if (!document.startViewTransition) document.documentElement.classList.add('no-vt');
/* 统一走 resetPhase，否则会漏掉 t.zen 的初始化（专注时长 = ∞ 时就会错） */
resetPhase('focus', false);
/* 首次进入不走转场，避免页面加载时多一次闪烁 */
applyView(VIEWS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'timer');
tickClock();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}











})();
