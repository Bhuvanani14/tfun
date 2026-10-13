/* TFun – Telugu cinema trivia. Vanilla JS, local-first. No data leaves the device. */
(() => {
const $ = (s, r = document) => r.querySelector(s);
const app = $('#app');
const store = {
  get: (k, d) => { try { return JSON.parse(localStorage.getItem('tfun.' + k)) ?? d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem('tfun.' + k, JSON.stringify(v)); } catch {} }
};
let S = { lang: 'en', sound: true, captions: true, motion: 'system', answer: 'choice', te: true, diff: 'any', timed: false, name: '', board: false, notify: false, ...store.get('settings', {}) };
let P = { points: 0, best: 0, played: 0, done: {}, fav: [], outfit: 'classic', celeb: 'cheer', board: [], ...store.get('prog', {}) };
let R = store.get('run', null);
let D = null, seenWelcome = store.get('seen', false), timerId = null, curScreen = 'welcome', tmpOpts = { mode: 'dd', len: 5 };
const save = () => { store.set('settings', S); store.set('prog', P); };

/* ---------- i18n ---------- */
const T = {
  en: { play: 'Play', modes: 'Choose a mode', len: 'Session length', q: 'Question', pts: 'pts', hint: 'Hint', skip: 'Skip', next: 'Next round', stop: 'Finish for now', exit: 'Leave (progress saved)', again: 'Play again', home: 'Home', start: 'Start', correct: 'Correct!', wrong: 'Not this time', timeup: "Time's up – no worries", resume: 'Resume last session', packs: 'Quiz packs', progress: 'Progress', settings: 'Settings', answer: 'Answer', submit: 'Submit', typeIt: 'Type your answer (English or తెలుగు)', skipHost: 'Skip animation', listen: 'Play narrator', locked: 'Unlocks at', fav: 'Favourite film', diff: 'Difficulty' },
  te: { play: 'ఆడండి', modes: 'మోడ్ ఎంచుకోండి', len: 'సెషన్ నిడివి', q: 'ప్రశ్న', pts: 'పాయింట్లు', hint: 'సూచన', skip: 'దాటవేయి', next: 'తదుపరి రౌండ్', stop: 'ఇప్పటికి ముగించు', exit: 'వెళ్ళండి (పురోగతి భద్రం)', again: 'మళ్లీ ఆడండి', home: 'హోమ్', start: 'ప్రారంభించు', correct: 'సరైనది!', wrong: 'ఈసారి కాదు', timeup: 'సమయం ముగిసింది – ఫర్వాలేదు', resume: 'చివరి సెషన్ కొనసాగించు', packs: 'క్విజ్ ప్యాక్‌లు', progress: 'పురోగతి', settings: 'సెట్టింగ్‌లు', answer: 'సమాధానం', submit: 'పంపు', typeIt: 'మీ సమాధానం టైప్ చేయండి (English / తెలుగు)', skipHost: 'యానిమేషన్ దాటవేయి', listen: 'కథకుడిని వినండి', locked: 'అన్‌లాక్:', fav: 'ఇష్టమైన సినిమా', diff: 'కఠినత' }
};
const t = k => (T[S.lang] && T[S.lang][k]) || T.en[k] || k;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nm = n => (S.te && D.names[n]) ? `${esc(n)} <small lang="te">${esc(D.names[n])}</small>` : esc(n);
const MODES = [
  { id: 'vm', em: '🎙️', n: 'Voice Match', nTe: 'వాయిస్ మ్యాచ్', d: 'A narrator performs a character – who is it?' },
  { id: 'dd', em: '🕵️', n: 'Dialogue Detective', nTe: 'డైలాగ్ డిటెక్టివ్', d: 'Original clues point to a film.' },
  { id: 'hv', em: '🦸', n: 'Hero vs. Villain', nTe: 'హీరో vs విలన్', d: 'Who would say this line?' },
  { id: 'qf', em: '⚡', n: 'Quickfire', nTe: 'క్విక్‌ఫైర్', d: 'Fast mixed set – timed or untimed.' },
  { id: 'daily', em: '📅', n: 'Daily Challenge', nTe: 'డైలీ ఛాలెంజ్', d: "Today's set – replay freely, no streaks." },
  { id: 'party', em: '🎉', n: 'Party Mode', nTe: 'పార్టీ మోడ్', d: 'Pass-and-play for teams.' }
];
const OUTFITS = [
  { id: 'classic', n: 'Classic Kurta', at: 0, c: '#ff4f8b' }, { id: 'golden', n: 'Golden Silk', at: 50, c: '#ffc83d' },
  { id: 'cape', n: 'Dramatic Cape', at: 150, c: '#7b2cff' }, { id: 'director', n: 'Director Jacket', at: 300, c: '#2ee6c5' }
];
const CELEBS = [{ id: 'cheer', n: 'Happy hop', at: 0 }, { id: 'dance', n: 'Dance break', at: 100 }, { id: 'pose', n: 'Victory pose', at: 200 }];
const outfit = () => OUTFITS.find(o => o.id === P.outfit && P.points >= o.at) || OUTFITS[0];
const celeb = () => (CELEBS.find(c => c.id === P.celeb && P.points >= c.at) || CELEBS[0]).id;

/* ---------- host + speech ---------- */
const hostSVG = () => `<svg class="host" id="host" data-mood="idle" viewBox="0 0 120 150" role="img" aria-label="Host Tara, an animated narrator">
<g class="arm" style="transform-origin:28px 92px"><rect x="14" y="88" width="16" height="42" rx="8" fill="#e8a679"/></g>
<rect x="30" y="85" width="60" height="55" rx="18" fill="${outfit().c}"/><rect x="52" y="85" width="16" height="55" fill="#fff6" />
<circle cx="60" cy="52" r="34" fill="#f2b88a"/><path d="M26 48c2-30 66-30 68 0-10-14-58-14-68 0z" fill="#2a0a3d"/><circle cx="60" cy="20" r="6" fill="${outfit().c}"/>
<g class="eye"><circle cx="46" cy="52" r="4.5" fill="#222"/><circle cx="74" cy="52" r="4.5" fill="#222"/></g>
<path d="M38 42q8-6 16 0M66 42q8-6 16 0" stroke="#2a0a3d" stroke-width="3" fill="none" stroke-linecap="round"/>
<path class="m m-idle" d="M48 68q12 9 24 0" stroke="#7a1a2a" stroke-width="4" fill="none" stroke-linecap="round"/>
<path class="m m-happy" d="M44 64q16 22 32 0z" fill="#7a1a2a"/>
<ellipse class="m m-oops" cx="60" cy="72" rx="8" ry="10" fill="#7a1a2a"/>
<path class="m m-hint" d="M48 70q12-2 24-6" stroke="#7a1a2a" stroke-width="4" fill="none" stroke-linecap="round"/>
<g class="arm2"><rect x="90" y="88" width="16" height="42" rx="8" fill="#e8a679"/></g></svg>`;
const MOODTXT = { idle: 'Host: ready', happy: 'Host: celebrating ✔', oops: 'Host: dramatic oops ✖', hint: 'Host: leaning in with a hint 💡' };
function hostSay(text, mood = 'idle', act = '') {
  const h = $('#host'); if (h) { h.dataset.mood = mood; h.dataset.act = ''; void h.getBoundingClientRect(); h.dataset.act = act; }
  const mt = $('#moodtag'); if (mt) mt.textContent = MOODTXT[mood];
  const b = $('#bubbleText'); if (b) b.textContent = S.captions ? text : '(captions off)';
  speak(text);
}
function speak(text) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  if (!S.sound) return;
  const u = new SpeechSynthesisUtterance(text); u.lang = S.lang === 'te' ? 'te-IN' : 'en-IN'; u.rate = 1.02; u.pitch = 1.25;
  speechSynthesis.speak(u);
}
const stopHost = () => { if ('speechSynthesis' in window) speechSynthesis.cancel(); const h = $('#host'); if (h) h.dataset.act = ''; };
const LINES = {
  intro: ['Lights, camera, guess! Ready for this one?', 'Next scene! Take your time.', 'Here comes a fun one!'],
  ok: ['Superb! Take a bow!', 'Blockbuster answer!', 'That deserves a whistle!'],
  no: ["Oh no! The hero stumbles! No worries, here's the answer.", 'Plot twist! Not quite, but you were close to the scene.', 'Cut! Let us try that take again next time.'],
  hint: ['Psst… lean in. Here is a little clue.'],
  done: ['What a show! Want another round, or take a break?']
};
const pick = a => a[Math.floor(Math.random() * a.length)];
function confetti() {
  if (document.body.classList.contains('calm') || (S.motion === 'system' && matchMedia('(prefers-reduced-motion:reduce)').matches)) return;
  const c = document.createElement('div'); c.className = 'confetti'; c.setAttribute('aria-hidden', 'true');
  c.innerHTML = Array.from({ length: 36 }, () => `<i style="left:${Math.random() * 100}%;background:hsl(${Math.random() * 360} 90% 60%);animation-delay:${Math.random() * .6}s"></i>`).join('');
  document.body.appendChild(c); setTimeout(() => c.remove(), 2600);
}

/* ---------- helpers ---------- */
function applyMotion() {
  document.body.classList.toggle('calm', S.motion === 'reduce');
  document.body.classList.toggle('full', S.motion === 'full');
  document.documentElement.lang = S.lang === 'te' ? 'te' : 'en';
  const m = $('#muteBtn'); m.textContent = S.sound ? '🔊' : '🔇'; m.setAttribute('aria-pressed', String(!S.sound)); m.setAttribute('aria-label', S.sound ? 'Mute narration' : 'Unmute narration');
}
const rng = seed => () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const shuffle = (a, r = Math.random) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const unlockedPack = p => P.points >= p.unlockAt;
const norm = s => String(s).toLowerCase().normalize('NFC').replace(/[^a-z0-9\u0C00-\u0C7F]/g, '');
function lev(a, b) { const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; }
function isRight(q, val) {
  const g = norm(val); if (!g) return false;
  return [q.answer, ...(q.accept || []), D.names[q.answer] || ''].filter(Boolean).some(c => { const n = norm(c); return n === g || lev(n, g) <= (n.length > 8 ? 2 : n.length > 4 ? 1 : 0); });
}

/* ---------- navigation ---------- */
function go(name, arg) {
  stopHost(); clearInterval(timerId);
  const c = $('#curtain'), animate = !document.body.classList.contains('calm') && !(S.motion === 'system' && matchMedia('(prefers-reduced-motion:reduce)').matches);
  const draw = () => { curScreen = name; (screens[name] || screens.welcome)(arg); app.focus({ preventScroll: true }); scrollTo(0, 0); c.classList.remove('on'); };
  if (animate) { c.classList.add('on'); setTimeout(draw, 230); } else draw();
}
document.addEventListener('click', e => {
  const g = e.target.closest('[data-go]'); if (g) { if (curScreen === 'question' || curScreen === 'reveal') leave(false); go(g.dataset.go); }
});
$('#muteBtn').addEventListener('click', () => { S.sound = !S.sound; if (!S.sound) stopHost(); save(); applyMotion(); });
addEventListener('online', () => $('#offline').hidden = true);
addEventListener('offline', () => $('#offline').hidden = false);

/* ---------- screens ---------- */
const screens = {
  welcome() {
    app.innerHTML = `<div class="marquee" aria-hidden="true">${'<i></i>'.repeat(9)}</div>
    <h1 class="hero-title" style="font-size:clamp(3.4rem,18vw,6rem)">TFun</h1>
    <p class="sub" style="text-align:center">${S.lang === 'te' ? 'తెలుగు సినిమా క్విజ్ ఆట!' : 'The Telugu cinema trivia party!'}</p>
    <div class="stage card">${'' }<div class="host-wrap">${hostSVG()}<div class="mood-tag" id="moodtag"></div></div>
    <div class="bubble" aria-live="polite"><span id="bubbleText"></span><small>Tara – original TFun narrator (device text-to-speech, not a real actor)</small></div></div>
    <h2>Language · భాష</h2>
    <div class="row"><button class="tile ${S.lang === 'en' ? 'sel' : ''}" data-lang="en" aria-pressed="${S.lang === 'en'}"><span class="em">🇬🇧</span><b>English</b></button>
    <button class="tile ${S.lang === 'te' ? 'sel' : ''}" data-lang="te" aria-pressed="${S.lang === 'te'}" lang="te"><span class="em">తె</span><b>తెలుగు</b></button></div>
    <div class="grid" style="margin-top:1rem"><button class="btn big pink" data-go="modes" id="playBtn">▶ ${t('play')}</button>
    ${R && R.i < R.qs.length ? `<button class="btn big alt" id="resume">↩ ${t('resume')} (${R.i}/${R.qs.length})</button>` : ''}
    <div class="grid two"><button class="btn alt" data-go="packs">📦 ${t('packs')}</button><button class="btn alt" data-go="progress">🏆 ${t('progress')}</button></div></div>
    <p class="sub" style="margin-top:1rem;font-size:.8rem">🔒 Progress is saved only on this device. TFun sends nothing to any server.</p>`;
    app.querySelectorAll('[data-lang]').forEach(b => b.onclick = () => { S.lang = b.dataset.lang; save(); applyMotion(); screens.welcome(); });
    const r = $('#resume'); if (r) r.onclick = () => go('question');
    hostSay(S.lang === 'te' ? 'నమస్కారం! టీఫన్‌కు స్వాగతం!' : 'Namaste! Welcome to TFun, where every clue is a scene!', 'happy', 'cheer');
  },
  modes() {
    app.innerHTML = `<h1>${t('modes')}</h1>
    <div class="grid" role="radiogroup" aria-label="${t('modes')}">${MODES.map(m => `<button class="tile ${tmpOpts.mode === m.id ? 'sel' : ''}" role="radio" aria-checked="${tmpOpts.mode === m.id}" data-m="${m.id}"><span class="em">${m.em}</span><span><b>${S.lang === 'te' ? m.nTe : m.n}</b><small>${m.d}</small></span></button>`).join('')}</div>
    <h2>${t('len')}</h2><div class="row" role="radiogroup">${[5, 8, 12].map(n => `<button class="btn alt ${tmpOpts.len === n ? 'teal' : ''}" role="radio" aria-checked="${tmpOpts.len === n}" data-len="${n}">${n}</button>`).join('')}</div>
    <h2>${t('diff')}</h2><select class="field" id="diff" aria-label="${t('diff')}">${['any', 'easy', 'medium', 'hard'].map(d => `<option value="${d}" ${S.diff === d ? 'selected' : ''}>${d}</option>`).join('')}</select>
    <label class="switch"><span>⏱ Timed (Quickfire only – 20 s each, no penalty)</span><input type="checkbox" id="timed" ${S.timed ? 'checked' : ''}></label>
    <div class="row" style="margin-top:1rem"><button class="btn big pink" id="go">${t('start')}</button></div>`;
    app.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { tmpOpts.mode = b.dataset.m; screens.modes(); $(`[data-m="${tmpOpts.mode}"]`).focus(); });
    app.querySelectorAll('[data-len]').forEach(b => b.onclick = () => { tmpOpts.len = +b.dataset.len; screens.modes(); $(`[data-len="${tmpOpts.len}"]`).focus(); });
    $('#diff').onchange = e => { S.diff = e.target.value; save(); };
    $('#timed').onchange = e => { S.timed = e.target.checked; save(); };
    $('#go').onclick = () => tmpOpts.mode === 'party' ? go('party') : startRun(tmpOpts.mode, tmpOpts.len);
  },
  party() {
    app.innerHTML = `<h1>🎉 Party Mode</h1><p class="sub">Pass the device. Team names and rounds are yours to set.</p>
    <label for="tc">Teams</label><select class="field" id="tc">${[2, 3, 4].map(n => `<option>${n}</option>`).join('')}</select>
    <div id="tn"></div><label for="pr">Rounds per team</label><select class="field" id="pr">${[2, 3, 4, 5].map(n => `<option>${n}</option>`).join('')}</select>
    <button class="btn big pink" id="go" style="margin-top:1rem">${t('start')}</button>`;
    const drawN = () => { const n = +$('#tc').value; $('#tn').innerHTML = Array.from({ length: n }, (_, i) => `<label for="t${i}">Team ${i + 1} name</label><input class="field" id="t${i}" maxlength="20" value="Team ${i + 1}">`).join(''); };
    $('#tc').onchange = drawN; drawN();
    $('#go').onclick = () => { const n = +$('#tc').value; const teams = Array.from({ length: n }, (_, i) => ({ name: $('#t' + i).value.trim() || 'Team ' + (i + 1), score: 0 })); startRun('party', n * +$('#pr').value, teams); };
  },
  question() {
    if (!R || R.i >= R.qs.length) return go('results');
    const q = byId(R.qs[R.i]); if (!q) { R.i++; save1(); return screens.question(); }
    if (R.teams && !R.passed) {
      const tm = R.teams[R.i % R.teams.length];
      app.innerHTML = `<div class="card err" style="border-color:var(--gold)"><h1>📱 Pass to ${esc(tm.name)}</h1><p>Hand over the device. Ready?</p><button class="btn big pink" id="rdy">I'm ready</button></div>`;
      $('#rdy').onclick = () => { R.passed = true; screens.question(); }; return;
    }
    R.hints = 0; R.reveal = false;
    const opts = R.shuffled?.[R.i] || (R.shuffled = R.shuffled || {}, R.shuffled[R.i] = shuffle(q.options));
    const typed = S.answer === 'typed';
    const lic = q.license.type === 'licensed';
    app.innerHTML = `<div class="row between"><span class="pill">${t('q')} ${R.i + 1}/${R.qs.length}</span><span class="pill" id="pts">${R.teams ? esc(R.teams[R.i % R.teams.length].name) + ' · ' : ''}${R.score} ${t('pts')}</span></div>
    <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="${R.qs.length}" aria-valuenow="${R.i}"><i style="width:${R.i / R.qs.length * 100}%"></i></div>
    <div class="stage card"><div class="host-wrap">${hostSVG()}<div class="mood-tag" id="moodtag"></div></div>
      <div class="bubble" aria-live="polite"><span id="bubbleText"></span><small>Tara · original narrator</small></div></div>
    <div class="row"><button class="btn alt" id="skipHost">⏭ ${t('skipHost')}</button><span id="timer" class="timer" aria-live="off"></span></div>
    <section class="card" aria-labelledby="clue"><span class="pill ${lic ? 'lic' : 'org'}">${lic ? '🎞 Licensed clip' : '✍️ Original clue'}</span><span class="pill">${esc(q.mode === 'vm' ? 'Voice Match' : q.mode === 'hv' ? 'Hero vs. Villain' : 'Dialogue Detective')}</span>
      ${q.audio ? `<audio controls src="${esc(q.audio)}" aria-label="Clip"></audio>` : ''}
      <p class="clue" id="clue" tabindex="-1">${esc(S.lang === 'te' && q.clueTe ? q.clueTe : q.clue)}</p>
      ${S.te && S.lang === 'en' && q.clueTe ? `<p class="clue-te" lang="te">${esc(q.clueTe)}</p>` : ''}
      ${q.mode === 'vm' ? `<button class="btn alt" id="listen">🔈 ${t('listen')}</button> <small>Transcript shown above for everyone.</small>` : ''}
      <div id="hints" aria-live="polite"></div>
      ${typed ? `<form id="tf"><label for="ans">${t('typeIt')}</label><input class="field" id="ans" autocomplete="off" autocapitalize="off" spellcheck="false"><button class="btn big" style="margin-top:.6rem">${t('submit')}</button></form>`
        : `<div class="opts ${opts.length > 2 ? 'cols' : ''}" role="group" aria-label="${t('answer')}">${opts.map((o, i) => `<button class="opt" data-o="${esc(o)}"><span class="k">${'ABCD'[i]}</span><span>${nm(o)}</span></button>`).join('')}</div>`}
    </section>
    <div class="row"><button class="btn teal" id="hintBtn">💡 ${t('hint')}</button><button class="btn alt" id="skip">${t('skip')}</button><button class="btn alt" id="leave">${t('exit')}</button></div>`;
    $('#skipHost').onclick = stopHost;
    $('#leave').onclick = () => { leave(true); };
    $('#skip').onclick = () => reveal(q, null, 'skip');
    $('#hintBtn').onclick = () => hint(q);
    const l = $('#listen'); if (l) l.onclick = () => speak(q.clue);
    app.querySelectorAll('.opt').forEach(b => b.onclick = () => answer(q, b.dataset.o));
    const tf = $('#tf'); if (tf) tf.onsubmit = e => { e.preventDefault(); answer(q, $('#ans').value); };
    document.onkeydown = e => { if (curScreen !== 'question' || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return; const i = 'abcd'.indexOf(e.key.toLowerCase()), k = '1234'.indexOf(e.key); const ix = i >= 0 ? i : k; const btn = app.querySelectorAll('.opt')[ix]; if (btn && !btn.disabled) btn.click(); if (e.key.toLowerCase() === 'h') hint(q); };
    hostSay(pick(LINES.intro), 'idle');
    if (R.timed) startTimer(q);
    save1();
  },
  reveal() {
    const q = byId(R.qs[R.i]), res = R.last;
    const ok = res.ok, ic = ok ? '✔' : '✖', label = res.how === 'time' ? t('timeup') : res.how === 'skip' ? 'Skipped – here is the answer' : ok ? t('correct') : t('wrong');
    const fav = P.fav.includes(q.film);
    app.innerHTML = `<div class="stage card"><div class="host-wrap">${hostSVG()}<div class="mood-tag" id="moodtag"></div></div><div class="bubble" aria-live="polite"><span id="bubbleText"></span><small>Tara · original narrator</small></div></div>
    <div class="verdict ${ok ? 'ok' : 'no'}" role="status"><span aria-hidden="true">${ic}</span> ${label} ${res.gain ? `<span class="pill">+${res.gain} ${t('pts')}</span>` : ''}</div>
    <section class="card"><p>${t('answer')}: <b>${nm(q.answer)}</b></p>
      <p>🎬 <b>${nm(q.film)}</b> (${q.year}) · ${esc(q.genre)}<br>🎭 ${nm(q.character.replace(/ \(.*\)/, ''))} – ${esc(q.ctype)}</p>
      <p>${esc(q.explain)}</p><span class="pill">Spoiler level ${q.spoiler}/2</span>
      <span class="pill ${q.license.type === 'licensed' ? 'lic' : 'org'}">${esc(q.license.type)} · ${esc(q.license.source)}</span>
      <div class="row" style="margin-top:.6rem"><button class="btn alt" id="fav" aria-pressed="${fav}">${fav ? '★ Favourite film' : '☆ Favourite film'}</button><button class="btn alt" id="skipHost">⏭ ${t('skipHost')}</button></div></section>
    <div class="grid two"><button class="btn big pink" id="next">${R.i + 1 >= R.qs.length ? 'See results' : t('next')} →</button><button class="btn big alt" id="stop">${t('stop')}</button></div>`;
    $('#skipHost').onclick = stopHost;
    $('#fav').onclick = () => { P.fav = fav ? P.fav.filter(f => f !== q.film) : [...P.fav, q.film]; save(); screens.reveal(); };
    $('#next').onclick = () => { R.i++; R.passed = false; R.reveal = false; save1(); go(R.i >= R.qs.length ? 'results' : 'question'); };
    $('#stop').onclick = () => { R.i++; R.passed = false; save1(); go('results'); };
    $('#next').focus();
    if (ok) { hostSay(pick(LINES.ok), 'happy', celeb()); confetti(); } else hostSay(res.how === 'time' ? "Time's up – that's okay! Here's the answer." : pick(LINES.no), 'oops', 'oops');
  },
  results() {
    if (!R) return go('welcome');
    const total = Math.min(R.i, R.qs.length) || 0, newBest = R.score > P.best && !R.teams;
    if (!R.finished) { R.finished = true; P.played++; if (!R.teams && R.score > P.best) P.best = R.score; if (S.board && R.mode !== 'party') { P.board = [...P.board, { n: S.name || 'Player', s: R.score, d: new Date().toISOString().slice(0, 10) }].sort((a, b) => b.s - a.s).slice(0, 10); } save(); save1(); }
    const ranked = R.teams && [...R.teams].sort((a, b) => b.score - a.score);
    app.innerHTML = `<h1>${R.teams ? '🏆 ' + esc(ranked[0].name) + ' wins!' : 'Session complete!'}</h1>
    <div class="stage card"><div class="host-wrap">${hostSVG()}<div class="mood-tag" id="moodtag"></div></div><div class="bubble" aria-live="polite"><span id="bubbleText"></span><small>Tara · original narrator</small></div></div>
    <section class="card"><p class="verdict ok">${R.score} ${t('pts')} · ${R.correct}/${total} correct</p>${newBest ? '<p>🌟 New personal best!</p>' : `<p>Personal best: ${P.best} ${t('pts')}</p>`}
    ${ranked ? `<ol>${ranked.map(x => `<li>${esc(x.name)} – ${x.score}</li>`).join('')}</ol>` : ''}
    <p class="sub">You can unlock outfits, dances and packs as points grow. No streaks to lose.</p></section>
    <div class="grid two"><button class="btn big pink" id="again">${t('again')}</button><button class="btn big alt" data-go="modes">Change mode</button><button class="btn alt" data-go="progress">🏆 ${t('progress')}</button><button class="btn alt" data-go="welcome">${t('home')}</button></div>`;
    $('#again').onclick = () => R.teams ? startRun('party', R.qs.length, R.teams.map(x => ({ name: x.name, score: 0 }))) : startRun(R.mode, R.qs.length);
    hostSay(pick(LINES.done), 'happy', celeb()); if (R.correct >= total / 2) confetti();
    store.set('run', null);
  },
  packs() {
    if (!D) return loadData().then(() => screens.packs());
    app.innerHTML = `<h1>${t('packs')}</h1><div class="grid">${D.packs.map(p => {
      const qs = D.questions.filter(q => q.pack === p.id), done = (P.done[p.id] || []).length, lock = !unlockedPack(p);
      return `<button class="tile" data-p="${p.id}" ${lock ? 'disabled' : ''}><span class="em">${lock ? '🔒' : p.emoji}</span><span style="flex:1"><b>${S.lang === 'te' ? esc(p.titleTe) : esc(p.title)}</b><small>${lock ? t('locked') + ' ' + p.unlockAt + ' ' + t('pts') : done + '/' + qs.length + ' mastered'}</small><div class="bar" style="margin-top:.3rem"><i style="width:${done / qs.length * 100}%"></i></div></span></button>`;
    }).join('')}</div>
    <h2>⭐ ${t('fav')}</h2>${P.fav.length ? P.fav.map(f => `<span class="pill">${nm(f)}</span>`).join('') : '<div class="card empty">No favourites yet – tap ☆ on any answer reveal.</div>'}`;
    app.querySelectorAll('[data-p]').forEach(b => b.onclick = () => startRun('pack', 8, null, b.dataset.p));
  },
  progress() {
    app.innerHTML = `<h1>🏆 ${t('progress')}</h1>
    <div class="grid two"><div class="card"><b>${P.points}</b><br>${t('pts')}</div><div class="card"><b>${P.best}</b><br>Personal best</div><div class="card"><b>${P.played}</b><br>Sessions</div><div class="card"><b>${Object.values(P.done).flat().length}/${D ? D.questions.length : '–'}</b><br>Clues mastered</div></div>
    <h2>Avatar outfits</h2><div class="grid two">${OUTFITS.map(o => { const lk = P.points < o.at; return `<button class="tile ${P.outfit === o.id && !lk ? 'sel' : ''}" data-o="${o.id}" ${lk ? 'disabled' : ''} aria-pressed="${P.outfit === o.id}"><span class="em" style="color:${o.c}">${lk ? '🔒' : '👘'}</span><span><b>${o.n}</b><small>${lk ? o.at + ' ' + t('pts') : 'Unlocked'}</small></span></button>`; }).join('')}</div>
    <h2>Celebrations</h2><div class="grid two">${CELEBS.map(c => { const lk = P.points < c.at; return `<button class="tile ${celeb() === c.id ? 'sel' : ''}" data-c="${c.id}" ${lk ? 'disabled' : ''}><span class="em">${lk ? '🔒' : '🎉'}</span><span><b>${c.n}</b><small>${lk ? c.at + ' ' + t('pts') : 'Unlocked'}</small></span></button>`; }).join('')}</div>
    <h2>⭐ ${t('fav')}</h2>${P.fav.length ? P.fav.map(f => `<span class="pill">${esc(f)}</span>`).join('') : '<div class="card empty">Nothing here yet. Play a round and star a film!</div>'}
    <h2>On-device leaderboard (opt-in)</h2>${S.board ? (P.board.length ? `<ol>${P.board.map(b => `<li>${esc(b.n)} – ${b.s} (${b.d})</li>`).join('')}</ol>` : '<div class="card empty">Finish a session to appear.</div>') : '<div class="card empty">Off. Enable in Settings. It never leaves this device.</div>'}`;
    app.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { P.outfit = b.dataset.o; save(); screens.progress(); });
    app.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { P.celeb = b.dataset.c; save(); screens.progress(); });
  },
  settings() {
    const sw = (id, label, v) => `<label class="switch"><span>${label}</span><input type="checkbox" id="${id}" ${v ? 'checked' : ''}></label>`;
    app.innerHTML = `<h1>${t('settings')}</h1><section class="card">
    <label for="lang">Language · భాష</label><select class="field" id="lang"><option value="en">English</option><option value="te">తెలుగు</option></select>
    <label for="ans">Answer style</label><select class="field" id="ansSel"><option value="choice">Multiple choice</option><option value="typed">Typed (English or Telugu script)</option></select>
    ${sw('te', 'Show Telugu script alongside names', S.te)}${sw('sound', 'Narrator audio on', S.sound)}${sw('cap', 'Captions for all host dialogue', S.captions)}
    <label for="mo">Motion</label><select class="field" id="mo"><option value="system">Follow my device</option><option value="reduce">Reduced motion</option><option value="full">Full animation</option></select></section>
    <section class="card"><h2>Privacy & notifications</h2>
    <p>All progress and settings stay in this browser. TFun sends no data to a server and has no accounts or ads.</p>
    ${sw('board', 'Show an on-device leaderboard (opt-in)', S.board)}<label for="dn">Display name for leaderboard</label><input class="field" id="dn" maxlength="16" value="${esc(S.name)}">
    ${sw('notify', 'Reminder notifications (we never nag – currently none are sent)', S.notify)}
    <button class="btn alt" id="reset" style="margin-top:.8rem">Erase all my TFun data</button></section>`;
    $('#lang').value = S.lang; $('#ansSel').value = S.answer; $('#mo').value = S.motion;
    const bind = (id, k, f = e => e.target.checked) => $('#' + id).addEventListener('change', e => { S[k] = f(e); save(); applyMotion(); if (k === 'lang') screens.settings(); });
    bind('lang', 'lang', e => e.target.value); bind('ansSel', 'answer', e => e.target.value); bind('mo', 'motion', e => e.target.value);
    bind('te', 'te'); bind('sound', 'sound'); bind('cap', 'captions'); bind('board', 'board'); bind('notify', 'notify');
    $('#dn').oninput = e => { S.name = e.target.value.slice(0, 16); save(); };
    $('#reset').onclick = () => { if (confirm('Erase all saved progress and settings on this device?')) { Object.keys(localStorage).filter(k => k.startsWith('tfun.')).forEach(k => localStorage.removeItem(k)); location.reload(); } };
  },
  error(msg) {
    app.innerHTML = `<div class="card err"><h1>Oops, scene missing 🎬</h1><p>${esc(msg || 'Could not load quiz packs.')}</p><p class="sub">Check your connection and try again.</p><button class="btn big pink" id="retry">Retry</button></div>`;
    $('#retry').onclick = () => { app.innerHTML = '<p class="loading"><span class="spinner"></span> Loading…</p>'; loadData().then(() => go('welcome')); };
  }
};

/* ---------- game logic ---------- */
const byId = id => D.questions.find(q => q.id === id);
function save1() { store.set('run', R); }
function startRun(mode, len, teams, packId) {
  let pool = D.questions.filter(q => unlockedPack(D.packs.find(p => p.id === q.pack)));
  if (mode === 'pack') pool = pool.filter(q => q.pack === packId);
  else if (['vm', 'dd', 'hv'].includes(mode)) pool = pool.filter(q => q.mode === mode);
  const dmap = { easy: 1, medium: 2, hard: 3 };
  if (S.diff !== 'any') { const f = pool.filter(q => q.difficulty === dmap[S.diff]); if (f.length >= 3) pool = f; }
  if (!pool.length) { app.innerHTML = '<div class="card empty"><h1>Nothing here yet</h1><p>No clues match. Try another mode or pack.</p><button class="btn" data-go="modes">Back</button></div>'; return; }
  let qs;
  if (mode === 'daily') { const d = new Date(), seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); qs = shuffle(pool, rng(seed)).slice(0, 5); len = 5; }
  else qs = shuffle(pool);
  while (teams && qs.length < len) qs = qs.concat(shuffle(pool));
  qs = qs.slice(0, Math.min(len, Math.max(qs.length, 1))).map(q => q.id);
  R = { mode, qs, i: 0, score: 0, correct: 0, teams: teams || null, timed: mode === 'qf' && S.timed, passed: false, finished: false, shuffled: {}, last: null };
  save1(); go('question');
}
function leave(toHome) { stopHost(); clearInterval(timerId); save1(); if (toHome) go('welcome'); }
function startTimer(q) {
  let s = 20; const el = $('#timer'); const draw = () => el.textContent = `⏱ ${s}s`; draw();
  timerId = setInterval(() => { s--; draw(); if (s <= 0) { clearInterval(timerId); reveal(q, null, 'time'); } }, 1000);
}
function hint(q) {
  const hs = [`Decade: ${q.decade}`, `Genre: ${q.genre}`, `Character type: ${q.ctype}`, `Visual clue: ${q.visual}`];
  if (R.hints >= hs.length) return hostSay('That is every hint I have – you are doing great!', 'hint', 'lean');
  const h = hs[R.hints++]; const box = $('#hints');
  const p = document.createElement('p'); p.className = 'pill'; p.innerHTML = '💡 ' + esc(h) + (R.hints === 4 ? ` <span class="sr">(${esc(q.visualLabel)})</span>` : ''); if (R.hints === 4) p.setAttribute('aria-label', 'Visual clue: ' + q.visualLabel);
  box.appendChild(p); hostSay(R.hints === 1 ? pick(LINES.hint) : h, 'hint', 'lean');
}
function answer(q, val) { reveal(q, isRight(q, val), 'ans', val); }
function reveal(q, ok, how, val) {
  clearInterval(timerId); if (R.reveal) return; R.reveal = true;
  document.onkeydown = null;
  let gain = 0;
  if (ok) { gain = 10 + (q.difficulty - 1) * 5 + (R.timed ? 5 : 0) + (R.mode === 'hv' ? 0 : 0); R.score += gain; R.correct++; P.points += gain; (P.done[q.pack] = P.done[q.pack] || []); if (!P.done[q.pack].includes(q.id)) P.done[q.pack].push(q.id); if (R.teams) R.teams[R.i % R.teams.length].score += gain; save(); }
  R.last = { ok: !!ok, how, gain, val }; save1();
  go('reveal');
}

/* ---------- boot ---------- */
async function loadData() {
  try { const r = await fetch('data/packs.json'); if (!r.ok) throw new Error('HTTP ' + r.status); D = await r.json(); }
  catch (e) { D = null; screens.error(navigator.onLine ? 'The quiz packs could not be loaded.' : 'You are offline and packs are not cached yet. Connect once and try again.'); throw e; }
}
applyMotion(); $('#offline').hidden = navigator.onLine;
loadData().then(() => go('welcome')).catch(() => {});
if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
window.__tfun = { go };
})();
