/* Interview Ready Tracker — plain HTML/CSS/JS, data kept in localStorage */
(function () {
'use strict';
const D = window.PLAN60_DATA;
const KEY = 'plan60.v1';
const PLAN_DAYS = 60;
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DOW_L = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ICON = "data:image/svg+xml," + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'><rect width='512' height='512' rx='112' fill='#0b0f17'/><path d='M128 272l96 96 168-208' fill='none' stroke='#12b886' stroke-width='56' stroke-linecap='round' stroke-linejoin='round'/></svg>");

const HABITS = [
  { k: 'ds',      ico: '🧠', name: 'Data Science (Prime)' },
  { k: 'dsa',     ico: '💻', name: 'DSA in Python' },
  { k: 'gym',     ico: '🏋️', name: 'Gym' },
  { k: 'intern',  ico: '💼', name: 'Internship' },
  { k: 'prep',    ico: '🎯', name: 'Interview prep' },
  { k: 'trading', ico: '📈', name: 'Trading (paper)' },
  { k: 'guitar',  ico: '🎸', name: 'Guitar' },
  { k: 'chess',   ico: '♟️', name: 'Chess' }
];
const HAB = Object.fromEntries(HABITS.map(h => [h.k, h]));

/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const pad = n => String(n).padStart(2, '0');
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const parseDate = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const diffDays = (a, b) => Math.round((new Date(a.getFullYear(), a.getMonth(), a.getDate()) - new Date(b.getFullYear(), b.getMonth(), b.getDate())) / 864e5);
const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const shortDate = d => d.getDate() + ' ' + MON[d.getMonth()];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function fmtTime(t) { const [h, m] = t.split(':').map(Number); return ((h % 12) || 12) + ':' + pad(m) + ' ' + (h < 12 ? 'AM' : 'PM'); }
function human(ms) {
  const m = Math.max(0, Math.round(ms / 60000));
  if (m < 1) return 'less than a minute';
  const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60;
  return (d ? d + 'd ' : '') + (h ? h + 'h ' : '') + (!d && mm ? mm + 'm' : '').trim();
}

/* ---------- state ---------- */
function defaultAlarms() {
  const mk = (time, label, habit, note, days) => ({ id: 'a' + Math.random().toString(36).slice(2, 9), time, label, habit: habit || '', note: note || '', days: days || [1, 2, 3, 4, 5, 6], enabled: true });
  return [
    mk('05:30', 'Wake up · water · freshen up', '', 'No scrolling. Drink water first.'),
    mk('06:00', 'Gym time 💪', 'gym', ''),
    mk('08:30', 'Data Science (Prime batch)', 'ds', ''),
    mk('14:00', 'Internship', 'intern', ''),
    mk('16:00', 'DSA in Python', 'dsa', ''),
    mk('17:30', 'Interview prep', 'prep', ''),
    mk('18:30', 'Trading learning (paper)', 'trading', ''),
    mk('19:00', 'Guitar 🎸', 'guitar', ''),
    mk('19:30', 'Chess ♟️', 'chess', 'Puzzles + 1 game'),
    mk('20:45', 'Revision + English speaking + plan tomorrow', '', '15 min English speaking.'),
    mk('21:30', 'Log today\'s progress', '', 'Open the tracker and tick what you finished.', [0, 1, 2, 3, 4, 5, 6]),
    mk('22:00', 'Sleep 😴', '', '7-8 hours of sleep.', [0, 1, 2, 3, 4, 5, 6])
  ];
}
function defaults() {
  return {
    v: 2, topics: {}, gymLib: {},
    settings: { start: '2026-10-19', goal: '2026-12-30', dsaPerDay: 2, sound: true, vibrate: true, wake: false, theme: 'light' },
    days: {}, alarms: defaultAlarms(), fired: {}, snoozes: []
  };
}
let S;
function load() {
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(KEY)); } catch (e) { }
  const d = defaults();
  if (raw && typeof raw === 'object') {
    S = Object.assign(d, raw);
    S.settings = Object.assign(d.settings, raw.settings || {});
    if (!Array.isArray(S.alarms)) S.alarms = d.alarms;
    if (!S.days || typeof S.days !== 'object') S.days = {};
    if (!S.fired) S.fired = {};
    if (!S.topics || typeof S.topics !== 'object') S.topics = {};
    if (!S.gymLib || typeof S.gymLib !== 'object') S.gymLib = {};
    if (!Array.isArray(S.snoozes)) S.snoozes = [];
  } else S = d;
}
let memOnly = false;
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { memOnly = true; }
}
load();

/* ---------- plan model ---------- */
const startDate = () => parseDate(S.settings.start);
const goalDate = () => parseDate(S.settings.goal);
const totalDays = () => Math.max(PLAN_DAYS, diffDays(goalDate(), startDate()) + 1);
const dateOf = n => addDays(startDate(), n - 1);
const todayNum = () => diffDays(new Date(), startDate()) + 1;
const weekOf = n => Math.ceil(n / 7);

/* ---- Data-science topics: tick any topic on any day; remaining ones are re-spread automatically ---- */
const topicsDoneOn = ds => Object.keys(S.topics).filter(i => S.topics[i] === ds).map(Number).sort((a, b) => a - b);
const dsCount = n => topicsDoneOn(fmtDate(dateOf(n))).length;
const doneTopicCount = () => Object.keys(S.topics).filter(i => +i < PLAN_DAYS).length;
function nextTopics(k) { const out = []; for (let i = 0; i < PLAN_DAYS && out.length < k; i++) if (!S.topics[i]) out.push(i); return out; }
let projC = null;
function projection() {
  const key = todayStr() + '|' + S.settings.start + '|' + JSON.stringify(S.topics);
  if (projC && projC.key === key) return projC.map;
  const rem = []; for (let i = 0; i < PLAN_DAYS; i++) if (!S.topics[i]) rem.push(i);
  const tn = todayNum(); let startDay = Math.max(1, tn);
  if (tn >= 1 && topicsDoneOn(todayStr()).length) startDay++;
  const days = Math.max(1, PLAN_DAYS - startDay + 1), map = {};
  rem.forEach((idx, p) => { const d = startDay + Math.min(days - 1, Math.floor(p * days / rem.length)); (map[d] = map[d] || []).push(idx); });
  projC = { key, map }; return map;
}
function dayTopics(n) {
  const done = topicsDoneOn(fmtDate(dateOf(n))), planned = projection()[n] || [];
  const list = done.length ? done : planned;
  return { done, planned, list, text: list.map(i => D.syllabus[i][1]).join(' • '), module: list.length ? D.syllabus[list[0]][0] : '' };
}
const viewDate = n => n === todayNum() ? todayStr() : fmtDate(dateOf(n));
const GROUPS = ['Warm-up', 'Mix', 'Chest', 'Triceps', 'Back', 'Biceps', 'Legs', 'Shoulders', 'Abs', 'Cardio'];
const SUGG = { 'Warm-up': D.gym.warmup, Mix: D.gym.mix, Chest: D.gym.Chest, Triceps: D.gym.Triceps, Back: D.gym.Back, Biceps: D.gym.Biceps, Legs: D.gym.Legs, Shoulders: D.gym.Shoulders,
  Abs: ['Crunches', 'Plank', 'Leg raises', 'Russian twist', 'Cable crunch', 'Hanging knee raise'], Cardio: ['Treadmill walk', 'Cycling', 'Skipping rope', 'Stair climber', 'Rowing machine'] };
const gymTotal = n => dayInfo(n).groups.reduce((a, g) => a + (S.gymLib[g] || []).length, 0);
const QUOTES = [
  "If it doesn't happen the way you want, it will happen in a better way than you can imagine. ✨",
  "Small steps every single day beat big plans someday.",
  "Jo aaj kar raha hai, wahi kal ban raha hai. Keep going 💪",
  "Discipline is choosing what you want most over what you want right now.",
  "You don't have to be great to start, but you have to start to be great.",
  "Today's effort is tomorrow's confidence.",
  "Your future self is watching. Make them proud.",
  "One more topic, one more problem, one step closer to the offer letter.",
  "Progress, not perfection.",
  "Mehnat karte reh, safalta ek din zaroor milegi. 🌅",
  "Consistency turns ordinary days into extraordinary results.",
  "Be patient with yourself. Good things take time, and you are on your way.",
  "Every expert was once a beginner who refused to quit.",
  "The only bad workout is the one that didn't happen.",
  "Trust the process. Your time is coming.",
  "You are one habit away from a completely different life.",
  "Fall seven times, stand up eight.",
  "Your only competition is who you were yesterday.",
  "Jo hota hai achhe ke liye hota hai. Tu bas apna kaam karta reh. 🙏",
  "Doubt kills more dreams than failure ever will.",
  "Slow progress is still progress.",
  "The grind you avoid today is the gap you'll regret tomorrow.",
  "Offers don't come to those who wait. They come to those who prepared.",
  "Believe in the plan. Believe in yourself.",
  "Tough times never last, but tough people do.",
  "Make today count. You'll never get it back.",
  "Dream big, start small, act now.",
  "Rest if you must, but never quit.",
  "Har din ek nayi shuruaat hai. Aaj ka din tera hai. ☀️"
];

function dayInfo(n) {
  const date = dateOf(n), dow = DOW[date.getDay()], week = weekOf(n);
  const th = D.themes[Math.min(week, 9) - 1];
  const info = { n, date, dow, week, theme: { prep: th[0], trading: th[1], guitar: th[2], chess: th[3] } };
  if (n <= PLAN_DAYS) {
    const dt = dayTopics(n); info.module = dt.module || '—'; info.topic = dt.text || 'No topic planned';
    info.dsaTopic = D.dsa[n - 1][0]; info.dsaTarget = (+S.settings.dsaPerDay || 0) + D.dsa[n - 1][1];
  } else {
    info.module = 'Buffer'; info.topic = 'Buffer: revise weak topics + mock interviews';
    info.dsaTopic = 'Revision / timed mock'; info.dsaTarget = (+S.settings.dsaPerDay || 0) + 1;
  }
  const sp = D.split[dow], defFocus = week === 1 ? sp[0] : sp[1], ov = S.days[n] && S.days[n].groups;
  info.defGroups = defFocus === 'Rest' ? ['Rest'] : week === 1 ? ['Warm-up', 'Mix'] : defFocus.split(' + ');
  info.groups = ov || info.defGroups;
  info.rest = info.groups.length === 1 && info.groups[0] === 'Rest';
  info.gymFocus = info.rest ? 'Rest' : (info.groups.join(' + ') || 'Not selected');
  return info;
}
const rec = n => S.days[n] || (S.days[n] = {});
const todayStr = () => fmtDate(new Date());
function syncDsa(n) { const r = rec(n), info = dayInfo(n); setDone(n, 'dsa', (r.dsa || 0) >= info.dsaTarget && info.dsaTarget > 0); }
/* set / clear a goal and remember the REAL date it was completed on */
function setDone(n, k, val) {
  const r = rec(n); r.doneOn = r.doneOn || {};
  if (k === 'dsa') { if (val) r.doneOn.dsa = r.doneOn.dsa || todayStr(); else delete r.doneOn.dsa; return; }
  r[k] = !!val;
  if (val) r.doneOn[k] = r.doneOn[k] || todayStr(); else delete r.doneOn[k];
}
const doneDate = (n, k) => { const r = S.days[n]; return r && r.doneOn && r.doneOn[k] ? r.doneOn[k] : null; };
function doneLabel(n, k) {
  const d = doneDate(n, k); if (!d) return '';
  const diff = diffDays(parseDate(d), dateOf(n));
  const rel = diff === 0 ? 'on time' : diff < 0 ? (-diff) + ' day' + (diff < -1 ? 's' : '') + ' early' : diff + ' day' + (diff > 1 ? 's' : '') + ' late';
  return `✔ Completed ${shortDate(parseDate(d))} · ${rel}`;
}
function dayScore(n) {
  const r = S.days[n] || {}, info = dayInfo(n);
  const any = ['gym', 'intern', 'prep', 'trading', 'guitar', 'chess'].some(k => r[k]) || (r.dsa > 0) || dsCount(n) > 0;
  if (!any) return { c: 0, pct: 0, touched: false, done: {} };
  const done = {
    ds: dsCount(n) > 0, dsa: (r.dsa || 0) >= info.dsaTarget && info.dsaTarget > 0, gym: info.rest || !!r.gym,
    intern: !!r.intern, prep: !!r.prep, trading: !!r.trading, guitar: !!r.guitar, chess: !!r.chess
  };
  const c = Object.values(done).filter(Boolean).length;
  return { c, pct: c / 8, touched: true, done };
}
function status(n) {
  const s = dayScore(n);
  if (s.touched) return s.pct >= 0.75 ? 'full' : 'part';
  return n < todayNum() ? 'miss' : 'up';
}
function exercisesFor(info) {
  if (info.rest) return [];
  return info.groups.map(g => ({ g, tag: g, list: S.gymLib[g] || [] }));
}
function counts() {
  const N = totalDays(); let ds = 0, dsa = 0, dsaT = 0, gym = 0, scoreSum = 0, scoreDays = 0;
  for (let n = 1; n <= N; n++) {
    const r = S.days[n] || {};
    dsa += +r.dsa || 0;
    if (r.gym && !dayInfo(n).rest) gym++;
    const sc = dayScore(n); if (sc.touched) { scoreSum += sc.pct; scoreDays++; }
  }
  const tn = clamp(todayNum(), 0, N);
  for (let n = 1; n <= tn; n++) dsaT += dayInfo(n).dsaTarget;
  return { ds: doneTopicCount(), dsa, dsaT, gym, avg: scoreDays ? scoreSum / scoreDays : 0 };
}
function streak() {
  let n = todayNum(), s = 0;
  if (n > totalDays()) n = totalDays();
  if (n < 1) return 0;
  if (dayScore(n).pct < 0.5) n--;
  while (n >= 1 && dayScore(n).pct >= 0.5) { s++; n--; }
  return s;
}

/* ---------- UI state ---------- */
const ui = { tab: 'today', viewDay: null, filter: 'all' };
function initView() {
  const tn = todayNum();
  ui.viewDay = clamp(tn, 1, totalDays());
}
function migrate() {
  if ((S.v || 1) >= 2) return;
  Object.keys(S.days).forEach(k => {
    const r = S.days[k], i = +k - 1;
    if (r.ds && i >= 0 && i < PLAN_DAYS && !S.topics[i]) S.topics[i] = (r.doneOn && r.doneOn.ds) || fmtDate(dateOf(+k));
    delete r.ds; if (r.doneOn) delete r.doneOn.ds;
  });
  S.v = 2; save();
}
migrate();
initView();

/* ---------- toast / sheet ---------- */
let toastT;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 2400);
}
function openSheet(html) {
  $('#sheet').innerHTML = '<div class="grab"></div>' + html;
  $('#sheetWrap').hidden = false;
}
function closeSheet() { $('#sheetWrap').hidden = true; $('#sheet').innerHTML = ''; }

/* ---------- shared components ---------- */
function ringSvg(pct, size, stroke, color, track) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" style="stroke:${track || 'var(--track)'}" stroke-width="${stroke}"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color || 'url(#rg)'}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - clamp(pct, 0, 1))}" style="transition:stroke-dashoffset .6s"/><defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#12b886"/><stop offset="1" stop-color="#6c5ce7"/></linearGradient></defs></svg>`;
}
function dayNav(n) {
  const info = dayInfo(n), N = totalDays(), isToday = n === todayNum();
  return `<div class="daynav">
    <button data-act="day" data-d="-1" aria-label="Previous day" ${n <= 1 ? 'disabled' : ''}>‹</button>
    <div class="mid" data-act="gotoday"><b>Day ${n} of ${N}${isToday ? ' · Today' : ''}</b><span>${DOW_L[info.date.getDay()]}, ${shortDate(info.date)} ${info.date.getFullYear()}${isToday ? '' : ' · tap to jump to today'}</span></div>
    <button data-act="day" data-d="1" aria-label="Next day" ${n >= N ? 'disabled' : ''}>›</button>
  </div>`;
}
function bar(p, cls) { return `<div class="bar ${cls || ''}"><i style="width:${Math.round(clamp(p, 0, 1) * 100)}%"></i></div>`; }

/* ---------- TODAY ---------- */
function renderToday() {
  const n = ui.viewDay, info = dayInfo(n), r = S.days[n] || {}, sc = dayScore(n), tn = todayNum(), N = totalDays();
  const dsaOk = (r.dsa || 0) >= info.dsaTarget;
  const next = nextAlarm();
  let pre = '';
  if (tn < 1) {
    const left = 1 - tn;
    pre = `<div class="card" style="text-align:center"><h3 style="margin-bottom:4px">Your plan starts soon</h3>
      <div class="countdown"><div><b>${left}</b><span>day${left > 1 ? 's' : ''} to go</span></div></div>
      <p class="muted small" style="margin-top:8px">Day 1 = ${DOW_L[startDate().getDay()]}, ${shortDate(startDate())}. You can already preview the plan and set your alarms.</p></div>`;
  } else if (tn > N) {
    pre = `<div class="banner good"><b>🎉 Plan finished!</b> The goal date (${shortDate(goalDate())}) has passed. You can still review and edit any day.</div>`;
  }
  const sub = h => {
    switch (h.k) {
      case 'ds': return '';
      case 'gym': return info.rest ? 'Rest day — auto counted. Sleep 7-8 h, protein, water.' : esc(info.gymFocus) + ' · ' + gymTotal(n) + ' exercises';
      case 'intern': return '2 hours · 2:00 PM';
      case 'prep': return esc(info.theme.prep);
      case 'trading': return esc(info.theme.trading) + ' · 30 min';
      case 'guitar': return esc(info.theme.guitar) + ' · 30 min';
      case 'chess': return esc(info.theme.chess) + ' · 30 min';
    }
  };
  const tasks = HABITS.filter(h => h.k !== 'dsa' && h.k !== 'ds').map(h => {
    const on = h.k === 'gym' ? (info.rest || r.gym) : r[h.k];
    const extra = h.k === 'gym' && !info.rest ? `<button class="btn sm" data-act="opengym" style="flex:none">Workout ›</button>` : '';
    return `<div class="task ${on ? 'done' : ''} ${h.k === 'gym' && info.rest ? 'auto' : ''}" data-act="toggle" data-k="${h.k}" role="button" tabindex="0">
      <div class="ico">${h.ico}</div><div class="grow"><div class="t">${h.name}</div><div class="s">${sub(h)}</div>${on && !(h.k === 'gym' && info.rest) ? `<div class="s" style="color:var(--accent);margin-top:4px" data-act="editdone" data-k="${h.k}">${doneLabel(n, h.k) || '✔ Completed'} <u>change</u></div>` : ''}</div>${extra}<div class="chk">✓</div></div>`;
  });
  // insert DSA after ds
  const dsaBox = `<div class="dsa-box ${dsaOk ? 'done' : ''}">
      <div class="task" style="border:0;background:none;padding:0;pointer-events:none"><div class="ico">💻</div><div class="grow"><div class="t" style="${dsaOk ? 'color:var(--accent)' : ''}">DSA in Python</div><div class="s">${esc(info.dsaTopic)} · target ${info.dsaTarget}</div>${dsaOk ? `<div class="s" style="color:var(--accent);margin-top:4px;pointer-events:auto" data-act="editdone" data-k="dsa">${doneLabel(n, 'dsa') || '✔ Target reached'} <u>change</u></div>` : ''}</div></div>
      <div class="stepper"><button data-act="dsa" data-d="-1" aria-label="Minus one">−</button><input type="number" inputmode="numeric" min="0" max="99" value="${r.dsa || 0}" data-dsa aria-label="DSA problems solved"><button data-act="dsa" data-d="1" aria-label="Plus one">+</button></div></div>`;
  tasks.unshift(dsaBox); tasks.unshift(dsCard(n));

  return `<div class="stack">
    ${dayNav(n)}
    ${pre}
    <div class="card hero">
      <div class="ring-chart">${ringSvg(sc.pct, 96, 10, '#fff', 'rgba(255,255,255,.3)')}<div class="num"><div>${sc.c}/8<small>goals</small></div></div></div>
      <div style="position:relative;z-index:1">
        <h2>${sc.pct >= 1 ? 'Perfect day! 🔥' : sc.touched ? (sc.pct >= .75 ? 'Great going 💪' : 'Keep pushing') : (n < tn ? 'Nothing logged' : 'Let\'s get started')}</h2>
        <p class="muted small" style="margin-top:4px">${esc(info.module === '—' ? 'Pick your topics below' : info.module)}</p>
        <div class="meta"><span class="pill c">Week ${Math.min(info.week, 11)}</span><span class="pill ${streak() ? 'g' : ''}">🔥 ${streak()} day streak</span>${tn >= 1 && tn <= N ? `<span class="pill w">${diffDays(goalDate(), new Date())} days to goal</span>` : ''}</div>
      </div>
    </div>
    ${quoteCard()}
    ${n === tn && next ? `<button class="card tight row" data-act="tab" data-tab="alarms" style="text-align:left;width:100%"><div class="task" style="border:0;background:none;padding:0;pointer-events:none"><div class="ico">⏰</div><div class="grow"><div class="t">Next alarm · ${fmtTime(next.a.time)}</div><div class="s">${esc(next.a.label)} · in ${human(next.at - Date.now())}</div></div></div><span class="muted">›</span></button>` : ''}
    ${n === tn ? completedToday(n) : ''}
    <div class="sec-title"><h2>${n === tn ? 'Today\'s goals' : 'Goals for this day'}</h2><span>Tap to complete</span></div>
    ${tasks.join('')}
    <div class="sec-title"><h2>Notes</h2><span>auto-saved</span></div>
    <textarea class="note" id="dayNote" placeholder="What did you learn? Any doubts to revise?">${esc(r.note || '')}</textarea>
  </div>`;
}

function quoteCard() {
  const d = new Date(), doy = Math.floor((startOfDay(d) - new Date(d.getFullYear(), 0, 0)) / 864e5);
  return `<button class="quote" data-act="quote"><div class="qmark">“</div><p>${esc(QUOTES[(doy + (ui.qOff || 0)) % QUOTES.length])}</p><span>Tap for another ✨</span></button>`;
}
function topicRow(i, act) {
  const d = S.topics[i], t = D.syllabus[i];
  return `<div class="trow ${d ? 'done' : ''}" data-act="${act}" data-i="${i}" role="button" tabindex="0"><div class="chk">✓</div><div class="grow"><div class="t">${i + 1}. ${esc(t[1])}</div><div class="s">${esc(t[0])}${d ? ' · done ' + shortDate(parseDate(d)) : ''}</div></div>${d ? `<button class="ex-edit" data-act="topicDate" data-i="${i}" aria-label="Change completion date">📅</button>` : ''}</div>`;
}
function dsCard(n) {
  const ds = viewDate(n), done = topicsDoneOn(ds), nx = nextTopics(4), tot = doneTopicCount(), tn = todayNum();
  const remN = PLAN_DAYS - tot, startDay = Math.max(1, tn) + (tn >= 1 && topicsDoneOn(todayStr()).length ? 1 : 0), left = Math.max(1, PLAN_DAYS - startDay + 1);
  const pace = remN > 0 ? `${tot}/60 done · ${remN} left, about ${Math.ceil(remN / left)}/day to finish by ${shortDate(dateOf(PLAN_DAYS))}` : 'All 60 topics completed 🎉';
  return `<div class="card dscard">
    <div class="row between"><div class="row" style="min-width:0"><div class="ico">🧠</div><div class="grow"><div style="font-weight:800;font-size:15px">Data Science (Prime)</div><div class="s">${pace}</div></div></div><span class="pill ${done.length ? 'g' : ''}">${done.length} ${n === tn ? 'today' : 'this day'}</span></div>
    ${bar(tot / PLAN_DAYS)}
    ${done.length ? `<div class="mini-h">✔ Completed ${n === tn ? 'today' : 'on this day'}</div>` + done.map(i => topicRow(i, 'topicToggle')).join('') : ''}
    ${nx.length ? `<div class="mini-h">Up next · tap when you finish a topic</div>` + nx.map(i => topicRow(i, 'topicToggle')).join('') : ''}
    <button class="btn sm block" data-act="topicsAll">Select from all 60 topics</button></div>`;
}
function topicsSheet() {
  const sc = $('#sheet') ? $('#sheet').scrollTop : 0;
  let html = `<h2>All Data Science topics</h2><p class="muted small">Tap every topic you have finished. It is saved with the date you finish it (${shortDate(parseDate(viewDate(ui.viewDay)))}), so doing 4 topics in one day works. Tap again to undo.</p>`, last = '';
  D.syllabus.forEach((t, i) => {
    if (t[0] !== last) { last = t[0]; const mi = D.syllabus.map((x, j) => x[0] === t[0] ? j : -1).filter(j => j >= 0); html += `<div class="grp-h"><b>${esc(t[0])}</b><span class="muted small">${mi.filter(j => S.topics[j]).length}/${mi.length}</span></div>`; }
    html += `<div style="margin-bottom:6px">${topicRow(i, 'topicSheetToggle')}</div>`;
  });
  html += '<button class="btn primary big" style="margin-top:12px" data-act="closeSheet">Done</button>';
  $('#sheet').innerHTML = '<div class="grab"></div>' + html; $('#sheetWrap').hidden = false; $('#sheet').scrollTop = sc;
}
function topicDateSheet(i) {
  openSheet(`<h2>Completed on</h2><p class="muted small">${esc(D.syllabus[i][1])}</p><label class="f">Date finished</label><input class="field" type="date" id="topicDate" value="${S.topics[i] || todayStr()}">
    <div class="btn-row" style="margin-top:16px"><button class="btn primary" data-act="topicDateSave" data-i="${i}">Save</button><button class="btn" data-act="closeSheet">Cancel</button></div>`);
}
function completedToday(cur) {
  const ts = todayStr(), out = [];
  Object.keys(S.days).forEach(k => {
    const n = +k, r = S.days[k]; if (n === cur || !r.doneOn) return;
    Object.entries(r.doneOn).forEach(([hk, d]) => { if (d === ts && HAB[hk]) out.push({ n, hk }); });
  });
  if (!out.length) return '';
  out.sort((a, b) => a.n - b.n);
  return `<div class="card tight"><h3 style="margin-bottom:8px">Also completed today (other days' work)</h3>` + out.map(o => {
    const inf = dayInfo(o.n), what = o.hk === 'ds' ? inf.topic : o.hk === 'dsa' ? inf.dsaTopic : HAB[o.hk].name;
    return `<div class="row small" style="padding:5px 0"><span>${HAB[o.hk].ico}</span><span class="grow">Day ${o.n} · ${esc(what)}</span><span class="pill ${o.n > cur ? 'g' : 'w'}">${o.n > cur ? 'ahead' : 'catch-up'}</span></div>`;
  }).join('') + '</div>';
}
function doneSheet(k) {
  const n = ui.viewDay, d = doneDate(n, k) || todayStr();
  openSheet(`<h2>Completed on</h2><p class="muted small">Planned date: ${shortDate(dateOf(n))}. Pick the day you really finished it.</p>
    <label class="f">${HAB[k].name}</label><input class="field" type="date" id="doneDate" value="${d}">
    <div class="btn-row" style="margin-top:16px"><button class="btn primary" data-act="doneSave" data-k="${k}">Save</button><button class="btn" data-act="closeSheet">Cancel</button></div>`);
}
/* ---------- PLAN ---------- */
function renderPlan() {
  const N = totalDays(), tn = todayNum(), f = ui.filter, curW = weekOf(clamp(tn, 1, N));
  const chip = (k, l) => `<button class="chip ${f === k ? 'on' : ''}" data-act="filter" data-f="${k}">${l}</button>`;
  let html = `<div class="chips">${chip('all', 'All days')}${chip('week', 'This week')}${chip('pending', 'Pending')}${chip('done', 'Done')}${chip('up', 'Upcoming')}</div>`;
  let lastW = 0, any = false;
  for (let n = 1; n <= N; n++) {
    const st = status(n), w = weekOf(n), info = dayInfo(n);
    if (f === 'week' && w !== curW) continue;
    if (f === 'pending' && !(st === 'miss' || (st === 'part' && n < tn))) continue;
    if (f === 'done' && st !== 'full') continue;
    if (f === 'up' && n < tn) continue;
    any = true;
    if (w !== lastW) {
      lastW = w;
      const th = D.themes[Math.min(w, 9) - 1];
      html += `<div class="week-h"><b>Week ${w}${w > 9 ? ' · buffer' : ''}</b><span>${shortDate(dateOf(n))} – ${shortDate(dateOf(Math.min(N, w * 7)))}</span></div><div class="muted small" style="margin:-4px 4px 8px">🎯 ${esc(th[0])}</div>`;
    }
    const sc = dayScore(n);
    html += `<button class="drow ${n === tn ? 'today' : ''}" data-act="openday" data-n="${n}"><div class="n">${n}</div>
      <div class="grow"><div class="tt">${n <= PLAN_DAYS || dayTopics(n).text ? (dayTopics(n).text ? (dayTopics(n).done.length ? '✔ ' : '📌 ') + esc(dayTopics(n).text) : 'No topic done') : esc(info.topic)}</div><div class="ss">${info.dow}, ${shortDate(info.date)} · ${esc(info.dsaTopic)} · ${info.rest ? 'Rest' : esc(info.gymFocus)}</div></div>
      <div style="text-align:right"><div class="small" style="font-weight:700">${sc.touched ? Math.round(sc.pct * 100) + '%' : ''}</div><span class="sdot ${st}" style="display:inline-block"></span></div></button>`;
  }
  if (!any) html += `<div class="empty-state"><div class="big">🗂️</div>Nothing here yet.</div>`;
  return html;
}

/* ---------- GYM ---------- */
let rest = { left: 0, total: 0, end: 0, iv: null };
function renderGym() {
  const n = ui.viewDay, info = dayInfo(n), r = S.days[n] || {}, ex = r.ex || {};
  const groups = exercisesFor(info);
  let total = 0, done = 0;
  groups.forEach(g => g.list.forEach(x => { total++; if (ex[x.id]) done++; }));
  const c = counts();
  const chips = [...GROUPS, 'Rest'].map(g => `<button class="chip ${info.groups.includes(g) ? 'on' : ''}" data-act="gGroup" data-g="${g}">${g === 'Rest' ? '😴 Rest day' : g}</button>`).join('');
  let body = `<div class="card"><h3>What are you training on this day?</h3><div class="chips wrap">${chips}</div>
    <p class="muted small" style="margin-top:10px;line-height:1.5">Plan suggests <b>${esc(info.defGroups.join(' + '))}</b> for ${DOW_L[info.date.getDay()]}. Pick any groups you like.${r.groups ? ' <u data-act="gReset" style="color:var(--accent-2);cursor:pointer">Reset</u>' : ''}</p></div>`;
  if (info.rest) {
    body += `<div class="card empty-state"><div class="big">😴</div><b style="color:var(--text);font-size:17px">Rest day</b><p style="margin-top:6px">Muscles grow while you rest. Sleep 7-8 hours, drink water, eat protein. A light walk is fine.</p></div>`;
  } else if (!groups.length) {
    body += `<div class="card empty-state"><div class="big">💪</div><b style="color:var(--text)">Choose your muscle groups above</b><p style="margin-top:6px">Then add the exercises you do for each one.</p></div>`;
  } else {
    body += `<div class="card"><div class="row between"><div><div class="muted small">Today's workout</div><h2 style="font-size:20px;margin-top:2px;font-weight:800">${esc(info.gymFocus)}</h2></div>
        <div class="ring-chart" style="width:64px;height:64px">${ringSvg(total ? done / total : 0, 64, 7)}<div class="num" style="font-size:14px">${done}/${total}</div></div></div></div>
      <div class="card tight"><div class="timer"><div class="t ${rest.left > 0 ? 'run' : ''}" id="restT">${restFmt(rest.left)}</div><div class="muted small">rest timer<br>between sets</div></div>
        <div class="btn-row" style="margin-top:10px">${[45, 60, 90, 120].map(s => `<button class="btn sm" data-act="restStart" data-s="${s}">${s >= 60 ? (s / 60) + ' min' : s + ' sec'}</button>`).join('')}<button class="btn sm danger" data-act="restStop">Stop</button></div></div>`;
    groups.forEach(g => {
      const gd = g.list.filter(x => ex[x.id]).length;
      body += `<div class="grp-h"><b>${esc(g.g)}</b><div class="row" style="gap:8px"><span class="muted small">${gd}/${g.list.length}</span><button class="btn sm" data-act="exAdd" data-g="${esc(g.g)}">+ Add exercise</button></div></div>`;
      if (!g.list.length) body += `<div class="empty-lib">No ${esc(g.g)} exercises yet.<br>Tap <b>+ Add exercise</b> and write what you do for ${esc(g.g)}. They are saved for every day.</div>`;
      else body += '<div class="stack" style="gap:8px">' + g.list.map(x => `<div class="ex ${ex[x.id] ? 'done' : ''}" data-act="exToggle" data-id="${x.id}" role="button" tabindex="0"><div class="i">✓</div><div class="grow"><div class="nm">${esc(x.name)}</div>${x.detail ? `<div class="sub">${esc(x.detail)}</div>` : ''}</div><button class="ex-edit" data-act="exEdit" data-g="${esc(g.g)}" data-id="${x.id}" aria-label="Edit exercise">✎</button></div>`).join('') + '</div>';
    });
    body += `<button class="btn ${r.gym ? 'ok' : 'primary'} big" data-act="toggle" data-k="gym" style="margin-top:14px">${r.gym ? '✔ Workout completed' : 'Mark workout complete'}</button>`;
  }
  const todayDow = info.date.getDay();
  const tbl = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => `<tr class="${DOW[todayDow] === d ? 'me' : ''}"><td>${d}</td><td>${esc(D.split[d][0])}</td><td>${esc(D.split[d][1])}</td></tr>`).join('');
  return `<div class="stack">${dayNav(n)}
    ${body}
    <div class="kpis two"><div class="kpi"><b>${c.gym}</b><span>gym sessions done</span></div><div class="kpi"><b>${streakGym()}</b><span>sessions this week</span></div></div>
    <div class="card"><h3>Suggested weekly split (from your plan)</h3><table class="tbl"><tr class="hd"><td></td><td>Week 1</td><td>Week 2+</td></tr>${tbl}</table>
    <p class="muted small" style="margin-top:8px">Progressive overload: add a little weight or reps every week. Protein, water, 7 hours of sleep.</p></div></div>`;
}
function exSheet(g, id) {
  const lib = S.gymLib[g] || [], x = id ? lib.find(e => e.id === id) : { name: '', detail: '' };
  if (!x) return;
  const have = new Set(lib.map(e => e.name.toLowerCase())), sg = (SUGG[g] || []).filter(nm => !have.has(nm.toLowerCase()));
  openSheet(`<h2>${id ? 'Edit' : 'Add'} ${esc(g)} exercise</h2>
    <label class="f">Exercise name</label><input class="field" id="exName" maxlength="60" placeholder="e.g. Incline dumbbell press" value="${esc(x.name)}">
    <label class="f">Sets × reps or weight (optional)</label><input class="field" id="exDetail" maxlength="40" placeholder="3 × 10-12 · 20 kg" value="${esc(x.detail || '')}">
    ${!id && sg.length ? `<div class="mini-h" style="margin-top:14px">Ideas from your plan · tap to use</div><div class="sugg">${sg.map(nm => `<button type="button" data-act="exSugg" data-name="${esc(nm)}">${esc(nm)}</button>`).join('')}</div>` : ''}
    <div class="btn-row" style="margin-top:18px"><button class="btn primary" data-act="exSave" data-g="${esc(g)}" data-id="${id || ''}">Save</button>${id ? '' : `<button class="btn" data-act="exSave" data-more="1" data-g="${esc(g)}" data-id="">Save and add next</button>`}</div>
    ${id ? `<div class="btn-row" style="margin-top:8px"><button class="btn danger" data-act="exDel" data-g="${esc(g)}" data-id="${id}">Delete exercise</button></div>` : ''}`);
  setTimeout(() => { const el = $('#exName'); if (el && !id) el.focus(); }, 300);
}
function streakGym() {
  const tn = clamp(todayNum(), 1, totalDays()), w = weekOf(tn); let k = 0;
  for (let n = (w - 1) * 7 + 1; n <= Math.min(w * 7, totalDays()); n++) if ((S.days[n] || {}).gym && !dayInfo(n).rest) k++;
  return k;
}
const restFmt = s => pad(Math.floor(s / 60)) + ':' + pad(s % 60);
function updateRestUI() { const el = $('#restT'); if (el) { el.textContent = restFmt(rest.left); el.classList.toggle('run', rest.left > 0); } }
function startRest(sec) {
  stopRest(); unlockAudio();
  rest.total = rest.left = sec; rest.end = Date.now() + sec * 1000;
  rest.iv = setInterval(() => {
    rest.left = Math.max(0, Math.ceil((rest.end - Date.now()) / 1000)); updateRestUI();
    if (rest.left <= 0) {
      stopRest(); updateRestUI(); toast('Rest over — next set 💪');
      if (S.settings.sound) { beep(880, .18); setTimeout(() => beep(880, .18), 260); setTimeout(() => beep(1320, .35), 520); }
      if (S.settings.vibrate && navigator.vibrate) navigator.vibrate([250, 120, 250]);
      if (document.visibilityState !== 'visible') notify('Rest over', 'Time for your next set 💪', 'rest');
    }
  }, 250); updateRestUI();
}
function stopRest() { if (rest.iv) clearInterval(rest.iv); rest.iv = null; rest.left = 0; updateRestUI(); }

/* ---------- STATS ---------- */
function lineChart(series, xmax, ymax, fmt) {
  const W = 320, H = 170, pl = 30, pr = 8, pt = 8, pb = 22;
  const x = i => pl + (W - pl - pr) * i / xmax, y = v => pt + (H - pt - pb) * (1 - v / ymax);
  let g = '';
  for (let t = 0; t <= 4; t++) { const v = ymax * t / 4; g += `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" style="stroke:var(--line)" stroke-width="1"/><text x="${pl - 5}" y="${y(v) + 3}" text-anchor="end">${fmt ? fmt(v) : Math.round(v)}</text>`; }
  [0, .25, .5, .75, 1].forEach(t => { g += `<text x="${x(xmax * t)}" y="${H - 6}" text-anchor="middle">${Math.round(xmax * t)}</text>`; });
  const paths = series.map(s => {
    if (!s.pts.length) return '';
    const d = s.pts.map((v, i) => (i ? 'L' : 'M') + x(i + 1).toFixed(1) + ' ' + y(Math.min(v, ymax)).toFixed(1)).join(' ');
    return `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" ${s.dash ? 'stroke-dasharray="5 4"' : ''}/>`;
  }).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}">${g}${paths}</svg>`;
}
function renderStats() {
  const N = totalDays(), tn = todayNum(), c = counts();
  const cur = clamp(tn, 0, N);
  // modules
  const mods = {}; D.syllabus.forEach((s, i) => { (mods[s[0]] = mods[s[0]] || { t: 0, d: 0 }).t++; if (S.topics[i]) mods[s[0]].d++; });
  const modHtml = Object.entries(mods).map(([m, v]) => `<div class="mod"><div class="h"><b>${esc(m)}</b><span class="muted">${v.d}/${v.t}</span></div>${bar(v.d / v.t)}</div>`).join('');
  // charts
  const planDs = [], actDs = [], planDsa = [], actDsa = [];
  let pd = 0, ad = 0, adsa = 0, dsaMax = 0;
  for (let n = 1; n <= N; n++) {
    planDs.push(Math.min(n, PLAN_DAYS));
    pd += dayInfo(n).dsaTarget; planDsa.push(pd);
    if (n <= cur) { const dt = fmtDate(dateOf(n)); ad = Object.keys(S.topics).filter(i => +i < PLAN_DAYS && S.topics[i] <= dt).length; actDs.push(ad); adsa += +(S.days[n] || {}).dsa || 0; actDsa.push(adsa); }
  }
  dsaMax = Math.max(pd, adsa, 10);
  // weekly
  const W = weekOf(N); let weekRows = '', bars = '';
  for (let w = 1; w <= W; w++) {
    let ds = 0, dsa = 0, gym = 0, sum = 0, cnt = 0;
    for (let n = (w - 1) * 7 + 1; n <= Math.min(N, w * 7); n++) {
      const r = S.days[n] || {}; ds += dsCount(n); dsa += +r.dsa || 0; if (r.gym && !dayInfo(n).rest) gym++;
      const sc = dayScore(n); if (sc.touched) { sum += sc.pct; cnt++; }
    }
    const avg = cnt ? sum / cnt : 0;
    weekRows += `<tr class="${w === weekOf(clamp(tn, 1, N)) ? 'me' : ''}"><td>W${w}</td><td>${ds}</td><td>${dsa}</td><td>${gym}</td><td>${cnt ? Math.round(avg * 100) + '%' : '–'}</td></tr>`;
    bars += `<div class="col"><em>${cnt ? Math.round(avg * 100) : ''}</em><div class="b" style="height:${Math.round(avg * 84)}px"></div><span>W${w}</span></div>`;
  }
  // heatmap
  const sd = startDate().getDay();
  let heat = `<div class="heat"><span></span>` + [0, 1, 2, 3, 4, 5, 6].map(i => `<span class="wl" style="text-align:center">${DOW[(sd + i) % 7][0]}</span>`).join('');
  for (let w = 1; w <= W; w++) {
    heat += `<span class="wl">W${w}</span>`;
    for (let i = 0; i < 7; i++) {
      const n = (w - 1) * 7 + i + 1;
      if (n > N) { heat += '<span class="c empty"></span>'; continue; }
      const sc = dayScore(n); const l = !sc.touched ? '' : sc.pct > .75 ? 'l4' : sc.pct > .5 ? 'l3' : sc.pct > .25 ? 'l2' : 'l1';
      heat += `<span class="c ${l} ${n === tn ? 'today' : ''}" data-act="openday" data-n="${n}">${n}</span>`;
    }
  }
  heat += '</div><div class="legend">less <i style="background:var(--bg)"></i><i style="background:rgba(52,211,153,.18)"></i><i style="background:rgba(52,211,153,.38)"></i><i style="background:rgba(52,211,153,.66)"></i><i style="background:var(--accent)"></i> more</div>';
  // habit consistency
  const elapsed = Math.max(1, cur);
  const habHtml = HABITS.map(h => {
    let k = 0;
    for (let n = 1; n <= cur; n++) { const r = S.days[n] || {}, inf = dayInfo(n); if (h.k === 'ds' ? dsCount(n) > 0 : h.k === 'dsa' ? (r.dsa || 0) >= inf.dsaTarget && inf.dsaTarget > 0 : h.k === 'gym' ? (inf.rest || r.gym) && dayScore(n).touched || (inf.rest && false) : r[h.k]) k++; }
    return `<div class="mod"><div class="h"><b>${h.ico} ${h.name}</b><span class="muted">${cur ? Math.round(k / elapsed * 100) : 0}%</span></div>${bar(cur ? k / elapsed : 0, 'v')}</div>`;
  }).join('');
  const daysLeft = Math.max(0, diffDays(goalDate(), new Date()));
  const lead = c.ds - Math.min(Math.max(cur, 0), PLAN_DAYS);
  return `<div class="stack">
    <div class="kpis">
      <div class="kpi"><b>${clamp(tn, 0, N)}<small style="font-size:12px;color:var(--muted)">/${N}</small></b><span>day</span></div>
      <div class="kpi"><b>${daysLeft}</b><span>days to ${shortDate(goalDate())}</span></div>
      <div class="kpi"><b>${Math.round(c.avg * 100)}%</b><span>avg daily score</span></div>
      <div class="kpi"><b>${c.ds}<small style="font-size:12px;color:var(--muted)">/60</small></b><span>DS topics</span></div>
      <div class="kpi"><b>${c.dsa}</b><span>DSA solved</span></div>
      <div class="kpi"><b>${c.gym}</b><span>gym sessions</span></div>
    </div>
    <div class="card"><div class="row between"><h3 style="margin:0">Data Science progress</h3><span class="pill ${lead >= 0 ? 'g' : 'b'}">${cur ? (lead >= 0 ? (lead ? lead + ' ahead' : 'on track') : -lead + ' behind') : 'not started'}</span></div>
      <div class="row" style="margin:14px 0 6px"><div style="font-size:32px;font-weight:800;letter-spacing:-1px">${Math.round(c.ds / PLAN_DAYS * 100)}%</div><div class="grow">${bar(c.ds / PLAN_DAYS)}</div></div></div>
    <div class="card"><h3>Planned vs actual · DS topics</h3>${lineChart([{ pts: planDs, color: '#a59fc4', dash: 1 }, { pts: actDs, color: '#12b886' }], N, 60)}
      <div class="legend" style="justify-content:flex-start"><i style="background:#a59fc4"></i>planned <i style="background:#12b886;margin-left:10px"></i>actual</div></div>
    <div class="card"><h3>Planned vs actual · DSA problems</h3>${lineChart([{ pts: planDsa, color: '#a59fc4', dash: 1 }, { pts: actDsa, color: '#6c5ce7' }], N, Math.ceil(dsaMax / 20) * 20)}
      <div class="legend" style="justify-content:flex-start"><i style="background:#a59fc4"></i>planned (${c.dsaT} so far) <i style="background:#6c5ce7;margin-left:10px"></i>solved (${c.dsa})</div></div>
    <div class="card"><h3>Module-wise progress</h3>${modHtml}</div>
    <div class="card"><h3>Consistency heatmap</h3>${heat}</div>
    <div class="card"><h3>Habit consistency (till today)</h3>${habHtml}</div>
    <div class="card"><h3>Weekly score</h3><div class="wbars">${bars}</div></div>
    <div class="card"><h3>Weekly summary</h3><table class="tbl"><tr><td style="background:none;border:0;color:var(--faint)">Wk</td><td style="background:none;border:0;color:var(--faint)">DS</td><td style="background:none;border:0;color:var(--faint)">DSA</td><td style="background:none;border:0;color:var(--faint)">Gym</td><td style="background:none;border:0;color:var(--faint)">Avg</td></tr>${weekRows}</table></div>
  </div>`;
}

/* ---------- ALARMS ---------- */
function notifState() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}
function dowLabel(days) {
  if (days.length === 7) return 'Every day';
  const k = days.slice().sort().join();
  if (k === '1,2,3,4,5,6') return 'Mon – Sat';
  if (k === '1,2,3,4,5') return 'Weekdays';
  if (!days.length) return 'Never';
  return [1, 2, 3, 4, 5, 6, 0].filter(d => days.includes(d)).map(d => DOW[d]).join(', ');
}
function renderAlarms() {
  const ns = notifState(), st = S.settings;
  let nb;
  if (ns === 'granted') nb = `<div class="banner good"><b>Notifications are on.</b> Alarms will show a notification and ring when the app is open.</div>`;
  else if (ns === 'denied') nb = `<div class="banner bad"><b>Notifications are blocked.</b> Allow them in your browser / phone site settings, then reload. Alarms will still ring on screen while the app is open.</div>`;
  else if (ns === 'unsupported') nb = `<div class="banner warn"><b>Notifications aren't supported here.</b> On iPhone: open this page in Safari → Share → Add to Home Screen, then open it from the home screen. In-app ringing and the calendar export below still work.</div>`;
  else nb = `<div class="banner warn"><b>Notifications are off.</b> Tap "Enable notifications" to allow reminders.</div>`;
  const list = S.alarms.slice().sort((a, b) => a.time.localeCompare(b.time)).map(a => `
    <div class="alarm ${a.enabled ? '' : 'off'}" data-act="alarmEdit" data-id="${a.id}" role="button" tabindex="0">
      <div class="tm">${fmtTime(a.time).replace(' ', '<small style="font-size:12px;color:var(--muted);margin-left:3px">') + '</small>'}</div>
      <div class="grow"><div class="lb">${esc(a.label)}</div><div class="dy">${dowLabel(a.days)}${a.habit ? ' · ' + HAB[a.habit].name : ''}</div></div>
      <div class="sw ${a.enabled ? 'on' : ''}" data-act="alarmToggle" data-id="${a.id}" role="switch" aria-checked="${a.enabled}"></div></div>`).join('');
  const next = nextAlarm();
  return `<div class="stack">
    ${nb}
    <div class="btn-row">
      ${ns === 'default' ? '<button class="btn primary" data-act="notifEnable">Enable notifications</button>' : ''}
      <button class="btn" data-act="notifTest">Test notification</button>
      <button class="btn" data-act="ringTest">Test alarm ring</button>
    </div>
    ${next ? `<div class="card tight row"><div class="ico" style="font-size:24px">⏰</div><div class="grow"><div style="font-weight:700">Next: ${esc(next.a.label)}</div><div class="muted small">${DOW_L[next.at.getDay()]} ${fmtTime(next.a.time)} · in ${human(next.at - Date.now())}</div></div></div>` : ''}
    <div class="sec-title"><h2>Your alarms</h2><span>tap to edit</span></div>
    <div class="stack" style="gap:8px">${list}</div>
    <button class="btn primary big" data-act="alarmNew">+ Add alarm</button>
    <div class="card"><h3>Alarm options</h3>
      <div class="setting"><div><b>Dark mode</b><span class="d">Easier on the eyes at night</span></div><div class="sw ${st.theme === 'dark' ? 'on' : ''}" data-act="theme" role="switch"></div></div>
      <div class="setting"><div><b>Sound</b><span class="d">Play a ringing tone with the alarm</span></div><div class="sw ${st.sound ? 'on' : ''}" data-act="setBool" data-s="sound" role="switch"></div></div>
      <div class="setting"><div><b>Vibration</b><span class="d">Vibrate (Android phones)</span></div><div class="sw ${st.vibrate ? 'on' : ''}" data-act="setBool" data-s="vibrate" role="switch"></div></div>
      <div class="setting"><div><b>Keep screen awake</b><span class="d">While this app is open. Helps alarms fire on time.</span></div><div class="sw ${st.wake ? 'on' : ''}" data-act="setBool" data-s="wake" role="switch"></div></div>
    </div>
    <div class="card"><h3>Make alarms reliable</h3>
      <p class="muted small" style="line-height:1.55;margin-bottom:12px">A web page can only ring while it is running. If the app is closed or the phone is locked, the browser may stop it. For guaranteed reminders, export your alarms to the phone's <b>Calendar</b> — those fire even when this app is closed.</p>
      <div class="btn-row"><button class="btn" data-act="ics">📅 Export to calendar (.ics)</button><button class="btn" data-act="alarmsReset">Reset default alarms</button></div>
      <p class="faint small" style="margin-top:10px;line-height:1.5">Tip: install this page to your home screen (Chrome menu → Install app, or Safari → Share → Add to Home Screen). Keep it open in the background for best results.</p></div>
    <div class="card"><h3>Plan settings</h3>
      <label class="f" style="margin-top:0">Start date (Day 1)</label><input class="field" type="date" data-setting="start" value="${esc(st.start)}">
      <label class="f">Goal date (last day)</label><input class="field" type="date" data-setting="goal" value="${esc(st.goal)}">
      <label class="f">DSA problems per day (+1 on revision / mock days)</label><input class="field" type="number" inputmode="numeric" min="0" max="20" data-setting="dsaPerDay" value="${esc(st.dsaPerDay)}">
      <p class="faint small" style="margin-top:10px;line-height:1.5">The 60-day content plan runs from the start date. Any days left until the goal date become buffer days for revision and mock interviews.</p>
    </div>
    <div class="card"><h3>Your data</h3>
      <p class="muted small" style="margin-bottom:12px;line-height:1.5">Everything is saved on this device in your browser (localStorage).${memOnly ? ' <b style="color:var(--bad)">Storage looks blocked — data may be lost on close.</b>' : ''} Take a backup before clearing browser data.</p>
      <div class="btn-row"><button class="btn" data-act="exportJson">⬇ Backup</button><button class="btn" data-act="importJson">⬆ Restore</button><button class="btn danger" data-act="resetAll">Reset all</button></div></div>
  </div>`;
}
function alarmSheet(id) {
  const a = id ? S.alarms.find(x => x.id === id) : { id: '', time: '07:00', label: '', note: '', days: [1, 2, 3, 4, 5, 6], enabled: true, habit: '' };
  openSheet(`<h2>${id ? 'Edit alarm' : 'New alarm'}</h2>
    <label class="f">Time</label><input class="field" type="time" id="alTime" value="${a.time}">
    <label class="f">Label</label><input class="field" type="text" id="alLabel" maxlength="60" placeholder="e.g. Gym time" value="${esc(a.label)}">
    <label class="f">Repeat</label><div class="dow" id="alDays">${[1, 2, 3, 4, 5, 6, 0].map(d => `<button type="button" data-d="${d}" class="${a.days.includes(d) ? 'on' : ''}">${DOW[d][0]}</button>`).join('')}</div>
    <label class="f">Linked goal (Done button ticks it for you)</label><select class="field" id="alHabit"><option value="">None</option>${HABITS.map(h => `<option value="${h.k}" ${a.habit === h.k ? 'selected' : ''}>${h.ico} ${h.name}</option>`).join('')}</select>
    <label class="f">Note (optional)</label><input class="field" type="text" id="alNote" maxlength="100" value="${esc(a.note)}">
    <div class="btn-row" style="margin-top:18px"><button class="btn primary" data-act="alarmSave" data-id="${a.id}">Save</button><button class="btn" data-act="closeSheet">Cancel</button></div>
    ${id ? `<div class="btn-row" style="margin-top:8px"><button class="btn" data-act="alarmTestOne" data-id="${a.id}">Test ring</button><button class="btn danger" data-act="alarmDel" data-id="${a.id}">Delete</button></div>` : ''}`);
  $('#alDays').addEventListener('click', e => { const b = e.target.closest('button'); if (b) b.classList.toggle('on'); });
}

/* ---------- alarm engine ---------- */
let audioCtx = null;
function unlockAudio() {
  try {
    if (!audioCtx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) audioCtx = new AC(); }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  } catch (e) { }
}
function beep(freq, dur, vol) {
  if (!audioCtx) return;
  try {
    const o = audioCtx.createOscillator(), g = audioCtx.createGain(), t = audioCtx.currentTime;
    o.type = 'square'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || .25, t + .01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(audioCtx.destination); o.start(t); o.stop(t + dur + .02);
  } catch (e) { }
}
let ringIv = null, vibIv = null, ringStopT = null, ringing = null; const queue = [];
function dynNote(a, info) {
  const bits = [];
  if (a.note) bits.push(a.note);
  if (info) switch (a.habit) {
    case 'ds': { const nx = nextTopics(1); bits.push(nx.length ? 'Next: ' + D.syllabus[nx[0]][1] : 'All topics done 🎉'); break; }
    case 'gym': bits.push(info.rest ? 'Rest day today' : info.gymFocus); break;
    case 'dsa': bits.push(info.dsaTopic + ' · target ' + info.dsaTarget); break;
    case 'prep': bits.push(info.theme.prep); break;
    case 'trading': bits.push(info.theme.trading); break;
    case 'guitar': bits.push(info.theme.guitar); break;
    case 'chess': bits.push(info.theme.chess); break;
  }
  return bits.join(' · ');
}
function inPlan(date) { const n = diffDays(date, startDate()) + 1; return n >= 1 && n <= totalDays() ? n : 0; }
function fireAlarm(a, late, test) {
  const now = new Date(), n = inPlan(now), info = n ? dayInfo(n) : null;
  const item = { a, n, info, late, test, note: dynNote(a, info) };
  if (ringing) { if (!queue.some(q => q.a.id === a.id)) queue.push(item); return; }
  startRing(item);
}
function startRing(item) {
  ringing = item;
  const now = new Date();
  $('#ringTime').textContent = fmtTime(pad(now.getHours()) + ':' + pad(now.getMinutes()));
  $('#ringTitle').textContent = item.a.label || 'Alarm';
  $('#ringNote').textContent = (item.late ? 'Missed ' + item.late + ' min ago · ' : '') + item.note;
  $('#ringQuote').textContent = '“' + QUOTES[Math.floor(Math.random() * QUOTES.length)] + '”';
  $('#ringDone').hidden = !item.a.habit;
  $('#ringDone').textContent = 'Done ✔ — mark ' + (item.a.habit ? HAB[item.a.habit].name : '') ;
  $('#ring').hidden = false;
  if (S.settings.sound) {
    unlockAudio();
    const pattern = () => { beep(880, .16); setTimeout(() => beep(880, .16), 220); setTimeout(() => beep(1175, .3), 440); };
    pattern(); ringIv = setInterval(pattern, 1500);
    ringStopT = setTimeout(() => { clearInterval(ringIv); ringIv = null; }, 120000);
  }
  if (S.settings.vibrate && navigator.vibrate) {
    const v = () => navigator.vibrate([500, 250, 500, 250, 500]);
    v(); vibIv = setInterval(v, 2500);
  }
  if (document.visibilityState !== 'visible' || item.test) notify(item.a.label || 'Alarm', item.note || 'Time for your next activity', 'alarm-' + item.a.id);
}
function stopRing() {
  clearInterval(ringIv); clearInterval(vibIv); clearTimeout(ringStopT); ringIv = vibIv = ringStopT = null;
  if (navigator.vibrate) navigator.vibrate(0);
  $('#ring').hidden = true; ringing = null;
  if (queue.length) setTimeout(() => startRing(queue.shift()), 300);
}
function markHabit(n, k) {
  if (!n || !k) return false;
  if (k === 'ds') { const nx = nextTopics(1); if (!nx.length) return false; S.topics[nx[0]] = todayStr(); save(); return true; }
  const r = rec(n), info = dayInfo(n);
  if (k === 'dsa') { r.dsa = Math.max(+r.dsa || 0, info.dsaTarget); setDone(n, 'dsa', true); }
  else if (k === 'gym' && info.rest) return false;
  else setDone(n, k, true);
  save(); return true;
}
function habitDone(n, k) {
  if (!n) return false; const r = S.days[n] || {}, info = dayInfo(n);
  if (k === 'ds') return dsCount(n) > 0;
  if (k === 'dsa') return (r.dsa || 0) >= info.dsaTarget;
  if (k === 'gym') return info.rest || !!r.gym;
  return !!r[k];
}
function nextAlarm() {
  const now = new Date(); let best = null;
  const sn = S.snoozes.filter(s => s.at > Date.now()).sort((a, b) => a.at - b.at)[0];
  if (sn) { const a = S.alarms.find(x => x.id === sn.id); if (a) best = { a: Object.assign({}, a, { label: a.label + ' (snoozed)' }), at: new Date(sn.at) }; }
  for (let d = 0; d < 9; d++) {
    const day = addDays(startOfDay(now), d);
    if (!inPlan(day)) continue;
    for (const a of S.alarms) {
      if (!a.enabled || !a.days.includes(day.getDay())) continue;
      const [h, m] = a.time.split(':').map(Number), at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m);
      if (at > now && (!best || at < best.at)) best = { a, at };
    }
    if (best && best.at < addDays(startOfDay(now), d + 1)) break;
  }
  return best;
}
function tick() {
  const now = new Date(), nowMs = now.getTime();
  // snoozes
  for (const s of S.snoozes.slice()) {
    if (nowMs >= s.at) { S.snoozes = S.snoozes.filter(x => x !== s); save(); const a = S.alarms.find(x => x.id === s.id); if (a) fireAlarm(a, 0); }
  }
  const n = inPlan(now); if (!n) return;
  const ds = fmtDate(now); let changed = false;
  for (const a of S.alarms) {
    if (!a.enabled || !a.days.includes(now.getDay())) continue;
    const [h, m] = a.time.split(':').map(Number);
    const due = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m).getTime();
    const key = a.id + '|' + ds;
    if (nowMs >= due && nowMs - due < 15 * 60000 && !S.fired[key]) {
      S.fired[key] = 1; changed = true;
      if (a.habit && habitDone(n, a.habit)) continue;      // already done — stay quiet
      fireAlarm(a, nowMs - due > 90000 ? Math.round((nowMs - due) / 60000) : 0);
    }
  }
  if (changed) {
    // prune old fired keys
    const keep = {}; Object.keys(S.fired).forEach(k => { if (k.split('|')[1] >= fmtDate(addDays(now, -2))) keep[k] = 1; }); S.fired = keep;
    save(); if (ui.tab === 'alarms') render();
  }
}
async function notify(title, body, tag) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return false;
  const opts = { body, tag, icon: ICON, badge: ICON, vibrate: [300, 150, 300, 150, 300], requireInteraction: true, renotify: true };
  try { const reg = swReg && await swReg; if (reg && reg.showNotification) { await reg.showNotification(title, opts); return true; } } catch (e) { }
  try { new Notification(title, opts); return true; } catch (e) { return false; }
}
let swReg = null;
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  try { swReg = navigator.serviceWorker.register('sw.js').then(() => navigator.serviceWorker.ready).catch(() => null); } catch (e) { }
}
let wakeLock = null;
async function setWake() {
  try {
    if (S.settings.wake && 'wakeLock' in navigator && document.visibilityState === 'visible') { if (!wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => wakeLock = null); } }
    else if (!S.settings.wake && wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch (e) { }
}

/* ---------- ICS export ---------- */
function exportIcs() {
  const icsEsc = s => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  const BY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  const start = startDate(), goal = goalDate();
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Plan Tracker//EN', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Interview Ready Plan'];
  let cnt = 0;
  S.alarms.filter(a => a.enabled && a.days.length).forEach(a => {
    let d = new Date(start); for (let i = 0; i < 7 && !a.days.includes(d.getDay()); i++) d = addDays(d, 1);
    if (d > goal) return;
    const [h, m] = a.time.split(':').map(Number);
    const ymd = fmtDate(d).replace(/-/g, ''), t = pad(h) + pad(m) + '00';
    const endM = h * 60 + m + 30, et = pad(Math.floor(endM / 60) % 24) + pad(endM % 60) + '00';
    L.push('BEGIN:VEVENT', 'UID:' + a.id + '@plan60', 'DTSTAMP:' + stamp, 'DTSTART:' + ymd + 'T' + t, 'DTEND:' + ymd + 'T' + et,
      'RRULE:FREQ=WEEKLY;BYDAY=' + a.days.map(x => BY[x]).join(',') + ';UNTIL=' + fmtDate(goal).replace(/-/g, '') + 'T235959',
      'SUMMARY:' + icsEsc(a.label), 'DESCRIPTION:' + icsEsc(a.note || 'Interview Ready Plan'),
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEsc(a.label), 'TRIGGER:PT0S', 'END:VALARM', 'END:VEVENT');
    cnt++;
  });
  L.push('END:VCALENDAR');
  download('interview-ready-alarms.ics', L.join('\r\n'), 'text/calendar');
  toast(cnt + ' recurring alarms exported');
}
function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type: type + ';charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1500);
}

/* ---------- render ---------- */
const VIEWS = { today: renderToday, plan: renderPlan, gym: renderGym, stats: renderStats, alarms: renderAlarms };
function render() {
  $$('.view').forEach(v => v.hidden = v.id !== 'v-' + ui.tab);
  $$('#tabbar button').forEach(b => b.classList.toggle('active', b.dataset.tab === ui.tab));
  document.documentElement.dataset.theme = S.settings.theme === 'dark' ? 'dark' : 'light';
  const mt = $('#metaTheme'); if (mt) mt.content = S.settings.theme === 'dark' ? '#0e1020' : '#f5f3ff';
  const el = $('#v-' + ui.tab);
  const active = document.activeElement;
  if (active && el.contains(active) && active.id === 'dayNote') return;
  el.innerHTML = VIEWS[ui.tab]();
  const tn = todayNum(), N = totalDays();
  $('#hdrSub').textContent = tn < 1 ? `Starts in ${1 - tn} day${tn < 0 ? 's' : ''} · ${shortDate(startDate())}` : tn > N ? 'Plan complete 🎉' : `Day ${tn} of ${N} · ${Math.max(0, diffDays(goalDate(), new Date()))} days to ${shortDate(goalDate())}`;
  const dot = $('#bellDot'), ns = notifState();
  dot.hidden = false; dot.classList.toggle('off', ns !== 'granted');
}
function go(tab) { ui.tab = tab; render(); window.scrollTo({ top: 0 }); }

/* ---------- events ---------- */
document.addEventListener('pointerdown', unlockAudio, { once: true, passive: true });
$('#tabbar').addEventListener('click', e => { const b = e.target.closest('button[data-tab]'); if (b) go(b.dataset.tab); });
$('#btnBell').addEventListener('click', () => go('alarms'));
$('#sheetBg').addEventListener('click', closeSheet);

function toggleHabit(k) {
  const n = ui.viewDay, r = rec(n), info = dayInfo(n);
  if (k === 'gym' && info.rest) return;
  const before = dayScore(n).pct;
  setDone(n, k, !r[k]); save(); render();
  if (dayScore(n).pct >= 1 && before < 1) toast('Perfect day! 🔥 8/8 goals');
}
document.addEventListener('click', e => {
  const t = e.target.closest('[data-act]'); if (!t) return;
  const act = t.dataset.act;
  switch (act) {
    case 'tab': go(t.dataset.tab); break;
    case 'toggle': e.stopPropagation(); toggleHabit(t.dataset.k); break;
    case 'opengym': e.stopPropagation(); go('gym'); break;
    case 'dsa': { const r = rec(ui.viewDay); r.dsa = clamp((+r.dsa || 0) + (+t.dataset.d), 0, 99); syncDsa(ui.viewDay); save(); render(); if (dayScore(ui.viewDay).pct >= 1) toast('Perfect day! 🔥'); break; }
    case 'day': ui.viewDay = clamp(ui.viewDay + (+t.dataset.d), 1, totalDays()); render(); break;
    case 'gotoday': ui.viewDay = clamp(todayNum(), 1, totalDays()); render(); break;
    case 'openday': ui.viewDay = +t.dataset.n; go('today'); break;
    case 'filter': ui.filter = t.dataset.f; render(); break;
    case 'exToggle': {
      const n = ui.viewDay, r = rec(n); r.ex = r.ex || {}; const k = t.dataset.id; r.ex[k] = !r.ex[k];
      const info = dayInfo(n); let all = true, tot = 0; exercisesFor(info).forEach(g => g.list.forEach(x => { tot++; if (!r.ex[x.id]) all = false; }));
      all = all && tot > 0;
      if (all && !r.gym) { setDone(n, 'gym', true); toast('Workout complete 💪 Gym ticked'); } else if (!all && r.gym && r.gymAuto) setDone(n, 'gym', false);
      r.gymAuto = all; save(); render(); break;
    }
    case 'gGroup': {
      const g = t.dataset.g, n = ui.viewDay, r = rec(n); let cur = dayInfo(n).groups.slice();
      if (g === 'Rest') cur = ['Rest']; else { cur = cur.filter(x => x !== 'Rest'); const i = cur.indexOf(g); if (i >= 0) cur.splice(i, 1); else cur.push(g); }
      cur.sort((a, b) => GROUPS.indexOf(a) - GROUPS.indexOf(b)); r.groups = cur; save(); render(); break;
    }
    case 'gReset': { const r = rec(ui.viewDay); delete r.groups; save(); render(); break; }
    case 'exAdd': exSheet(t.dataset.g, ''); break;
    case 'exEdit': e.stopPropagation(); exSheet(t.dataset.g, t.dataset.id); break;
    case 'exSugg': { const el = $('#exName'); el.value = t.dataset.name; $('#exDetail').focus(); break; }
    case 'exSave': {
      const name = $('#exName').value.trim(); if (!name) { toast('Write the exercise name first'); break; }
      const detail = $('#exDetail').value.trim(), g = t.dataset.g, lib = S.gymLib[g] = S.gymLib[g] || [];
      if (t.dataset.id) { const x = lib.find(e => e.id === t.dataset.id); if (x) { x.name = name; x.detail = detail; } }
      else lib.push({ id: 'e' + Math.random().toString(36).slice(2, 9), name, detail });
      save(); if (t.dataset.more) { render(); exSheet(g, ''); toast('Added ✔'); } else { closeSheet(); render(); toast('Saved ✔'); } break;
    }
    case 'exDel': if (confirm('Delete this exercise?')) { const g = t.dataset.g; S.gymLib[g] = (S.gymLib[g] || []).filter(x => x.id !== t.dataset.id); save(); closeSheet(); render(); } break;
    case 'topicToggle': {
      const i = +t.dataset.i; if (S.topics[i]) delete S.topics[i]; else { S.topics[i] = viewDate(ui.viewDay); toast('Topic done ✔  ' + doneTopicCount() + '/60'); }
      save(); render(); break;
    }
    case 'topicsAll': topicsSheet(); break;
    case 'topicSheetToggle': { const i = +t.dataset.i; if (S.topics[i]) delete S.topics[i]; else S.topics[i] = viewDate(ui.viewDay); save(); topicsSheet(); render(); break; }
    case 'topicDate': e.stopPropagation(); topicDateSheet(+t.dataset.i); break;
    case 'topicDateSave': { const v = $('#topicDate').value; if (v) { S.topics[+t.dataset.i] = v; save(); } closeSheet(); render(); toast('Date updated'); break; }
    case 'quote': ui.qOff = (ui.qOff || 0) + 1; render(); break;
    case 'theme': S.settings.theme = S.settings.theme === 'dark' ? 'light' : 'dark'; save(); render(); break;
    case 'restStart': startRest(+t.dataset.s); break;
    case 'restStop': stopRest(); break;
    case 'closeSheet': closeSheet(); break;
    case 'editdone': e.stopPropagation(); doneSheet(t.dataset.k); break;
    case 'doneSave': { const v = $('#doneDate').value; if (v) { const r = rec(ui.viewDay); r.doneOn = r.doneOn || {}; r.doneOn[t.dataset.k] = v; save(); } closeSheet(); render(); toast('Date updated'); break; }
    case 'alarmToggle': { e.stopPropagation(); const a = S.alarms.find(x => x.id === t.dataset.id); if (a) { a.enabled = !a.enabled; save(); render(); } break; }
    case 'alarmEdit': alarmSheet(t.dataset.id); break;
    case 'alarmNew': alarmSheet(''); break;
    case 'alarmSave': {
      const time = $('#alTime').value || '07:00', label = $('#alLabel').value.trim() || 'Alarm';
      const days = $$('#alDays button.on').map(b => +b.dataset.d), habit = $('#alHabit').value, note = $('#alNote').value.trim();
      if (!days.length) { toast('Pick at least one day'); break; }
      let a = S.alarms.find(x => x.id === t.dataset.id);
      if (!a) { a = { id: 'a' + Math.random().toString(36).slice(2, 9), enabled: true }; S.alarms.push(a); }
      Object.assign(a, { time, label, days, habit, note });
      S.fired = {}; save(); closeSheet(); render(); toast('Alarm saved'); break;
    }
    case 'alarmDel': if (confirm('Delete this alarm?')) { S.alarms = S.alarms.filter(x => x.id !== t.dataset.id); save(); closeSheet(); render(); } break;
    case 'alarmTestOne': { const a = S.alarms.find(x => x.id === t.dataset.id); closeSheet(); if (a) setTimeout(() => fireAlarm(a, 0, true), 200); break; }
    case 'alarmsReset': if (confirm('Replace all alarms with the default routine alarms?')) { S.alarms = defaultAlarms(); S.fired = {}; save(); render(); toast('Default alarms restored'); } break;
    case 'setBool': { const k = t.dataset.s; S.settings[k] = !S.settings[k]; save(); if (k === 'wake') setWake(); if (k === 'sound' && S.settings.sound) unlockAudio(); render(); break; }
    case 'notifEnable': unlockAudio(); if ('Notification' in window) Notification.requestPermission().then(p => { render(); toast(p === 'granted' ? 'Notifications enabled ✔' : 'Permission not granted'); if (p === 'granted') notify('Notifications are on ✔', 'You will get reminders for your daily routine.', 'welcome'); }); break;
    case 'notifTest': unlockAudio(); notify('Test notification', 'If you can see this, reminders will work 👍', 'test').then(ok => toast(ok ? 'Notification sent' : (notifState() === 'granted' ? 'Could not show notification' : 'Enable notifications first'))); break;
    case 'ringTest': unlockAudio(); fireAlarm({ id: 'test', label: 'Test alarm', note: 'This is how your alarm will ring', habit: '', time: '00:00', days: [], enabled: true }, 0, true); break;
    case 'ics': exportIcs(); break;
    case 'exportJson': download('plan-backup-' + fmtDate(new Date()) + '.json', JSON.stringify(S, null, 1), 'application/json'); break;
    case 'importJson': {
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/json,.json';
      inp.onchange = () => { const f = inp.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { try { const j = JSON.parse(rd.result); if (!j || typeof j.days !== 'object' || !j.settings) throw 0; localStorage.setItem(KEY, JSON.stringify(j)); load(); initView(); render(); toast('Backup restored'); } catch (er) { toast('Not a valid backup file'); } }; rd.readAsText(f); };
      inp.click(); break;
    }
    case 'resetAll': if (confirm('Erase ALL progress and settings on this device?') && confirm('Are you really sure? This cannot be undone.')) { try { localStorage.removeItem(KEY); } catch (er) { } load(); initView(); render(); toast('Everything reset'); } break;
  }
});
document.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[role=button][data-act]')) { e.preventDefault(); e.target.click(); }
});
document.addEventListener('input', e => {
  if (e.target.id === 'dayNote') { rec(ui.viewDay).note = e.target.value; save(); }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.matches('[data-dsa]')) { rec(ui.viewDay).dsa = clamp(parseInt(t.value, 10) || 0, 0, 99); syncDsa(ui.viewDay); save(); render(); }
  else if (t.dataset.setting) {
    const k = t.dataset.setting; let v = t.value;
    if (k === 'dsaPerDay') v = clamp(parseInt(v, 10) || 0, 0, 20);
    if ((k === 'start' || k === 'goal') && !v) return;
    const old = S.settings[k]; S.settings[k] = v;
    if (parseDate(S.settings.goal) < parseDate(S.settings.start)) { S.settings[k] = old; toast('Goal date must be after the start date'); render(); return; }
    S.fired = {}; save(); initView(); render(); toast('Settings saved');
  }
});
$('#ringDone').addEventListener('click', () => { const it = ringing; if (it && it.a.habit) { const n = it.n || inPlan(new Date()); if (markHabit(n, it.a.habit)) { toast(HAB[it.a.habit].name + ' ticked ✔'); } } stopRing(); render(); });
$('#ringSnooze').addEventListener('click', () => { const it = ringing; if (it && it.a.id !== 'test') { S.snoozes.push({ id: it.a.id, at: Date.now() + 5 * 60000 }); save(); toast('Snoozed for 5 minutes'); } stopRing(); });
$('#ringStop').addEventListener('click', stopRing);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { setWake(); tick(); render(); } });
window.addEventListener('focus', tick);
window.addEventListener('pageshow', tick);

/* ---------- boot ---------- */
render();
tick();
setInterval(tick, 1000);
setInterval(() => { if (document.visibilityState === 'visible' && !ringing && ['today', 'alarms'].includes(ui.tab) && !$('#sheetWrap').hidden === false) render(); }, 60000);
setWake();
window.__plan = { S: () => S, tick, fireAlarm, render, ui }; // debugging helper
})();
