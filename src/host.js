/* 화면 그리기: 시안과 같은 템플릿({{값}}, sc-if, sc-for)을 읽어서 화면으로 바꿔요 */
(function () {
'use strict';
var h = preact.h, Fragment = preact.Fragment;
var stage = document.getElementById('stage'), fatal = document.getElementById('fatal');
var showFatal = function (msg) { fatal.textContent = msg; fatal.style.display = 'block'; };
window.addEventListener('error', function (e) { showFatal('문제가 생겼어요: ' + (e.message || e)); });

var WHOLE = /^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/, PART = /\{\{\s*([^}]+?)\s*\}\}/g;
var lookup = function (scope, path) {
if (path === 'true') return true;
if (path === 'false') return false;
var parts = path.split('.'), v = scope;
for (var k = 0; k < parts.length; k++) { if (v === null || v === undefined) return undefined; v = v[parts[k]]; }
return v;
};
var compileValue = function (raw) {
var m = WHOLE.exec(raw);
if (m) return { path: m[1] };
if (raw.indexOf('{{') < 0) return { text: raw };
return { tpl: raw };
};
var evalValue = function (cv, scope) {
if (cv.path !== undefined) return lookup(scope, cv.path);
if (cv.text !== undefined) return cv.text;
return cv.tpl.replace(PART, function (_, p) { var v = lookup(scope, p); return v === null || v === undefined ? '' : v; });
};
var EVENT = { onclick: 'onClick', onchange: 'onInput' };
var compile = function (node) {
if (node.nodeType === 3) { var tx = node.nodeValue; return tx.trim() ? { text: compileValue(tx) } : null; }
if (node.nodeType !== 1) return null;
var tag = node.localName, out = { tag: tag, attrs: [], kids: [] };
for (var a = 0; a < node.attributes.length; a++) {
var at = node.attributes[a];
if (at.name.indexOf('hint-') === 0) continue;
out.attrs.push({ name: EVENT[at.name] || at.name, v: compileValue(at.value) });
}
for (var c = node.firstChild; c; c = c.nextSibling) { var k = compile(c); if (k) out.kids.push(k); }
return out;
};
var attrOf = function (n, name) { for (var k = 0; k < n.attrs.length; k++) if (n.attrs[k].name === name) return n.attrs[k].v; return null; };
var renderKids = function (n, scope) { var arr = []; for (var k = 0; k < n.kids.length; k++) { var r = render(n.kids[k], scope); if (r !== null) arr.push(r); } return arr; };
var render = function (n, scope) {
if (n.text) return evalValue(n.text, scope);
if (n.tag === 'sc-if') return evalValue(attrOf(n, 'value'), scope) ? h(Fragment, null, renderKids(n, scope)) : null;
if (n.tag === 'sc-for') {
var list = evalValue(attrOf(n, 'list'), scope) || [], as = attrOf(n, 'as').text, items = [];
for (var k = 0; k < list.length; k++) { var sc = Object.create(scope); sc[as] = list[k]; sc.$index = k; items.push(h(Fragment, null, renderKids(n, sc))); }
return h(Fragment, null, items);
}
var props = {};
for (var a = 0; a < n.attrs.length; a++) props[n.attrs[a].name] = evalValue(n.attrs[a].v, scope);
return h(n.tag, props, renderKids(n, scope));
};
var tplNodes = [];
for (var c0 = document.getElementById('tpl').content.firstChild; c0; c0 = c0.nextSibling) { var cc = compile(c0); if (cc) tplNodes.push(cc); }

var app = new Component();
var HIST_KEY = 'subway-now:hist';
var readHist = function () { try { return JSON.parse(localStorage.getItem(HIST_KEY) || '{}') || {}; } catch (e) { return {}; } };
var todNow = function () { var hr = new Date().getHours(); return hr >= 5 && hr < 10 ? 'morning' : (hr >= 10 && hr < 17 ? 'noon' : 'evening'); };
app.props = { live: true, tod: todNow(), hist: readHist(), viewH: 844 };
app.props.srOk = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
/* 진단 줄은 주소 끝에 ?debug=1 을 붙여 열 때만 보여요 */
try { app.props.debug = /[?&]debug=1/.test(location.search); } catch (e) {}
/* 별표한 역: 처음엔 서현·서초로 시작해요 */
var FAV_KEY = 'subway-now:favs';
var readFavs = function () { try { var v = localStorage.getItem(FAV_KEY); return v === null ? ['서현', '서초'] : (JSON.parse(v) || []); } catch (e) { return ['서현', '서초']; } };
app.props.favs = readFavs();
app.props.onFav = function (name) {
var f = app.props.favs.slice(), k = f.indexOf(name);
if (k >= 0) f.splice(k, 1); else f.push(name);
app.props.favs = f;
try { localStorage.setItem(FAV_KEY, JSON.stringify(f)); } catch (e) {}
schedule();
};
var LISTEN_KEY = 'subway-now:listen', RT_KEY = 'subway-now:rt';
/* 안내방송 듣기는 기본으로 켜 둬요 (끄면 그 설정을 기억해요) */
/* 새로고침해도 타고 가던 상태(경로·현재 역·탄 열차)를 이어가요. 30분 지난 건 버려요 */
var RIDE_KEY = 'subway-now:ride', RIDE_FIELDS = ['mode', 'origin', 'dest', 'route', 'i', 'f', 'boarded', 'playing', 'trainNo', 'trainT', 'ckDone', 'auto'];
try {
var saved = JSON.parse(localStorage.getItem(RIDE_KEY) || 'null');
if (saved && saved.mode === 'ride' && Date.now() - saved.at < 1800000) { var away = (Date.now() - saved.at) / 1000; delete saved.at; app.state = Object.assign({}, app.state, saved); setTimeout(function () { app.resume(away); if (app.props.onSync) app.props.onSync(true); }, 600); }
} catch (e) {}
var saveRide = function () {
var st = app.state || {};
try {
if (st.mode === 'ride' && !st.demo) { var o = { at: Date.now() }; RIDE_FIELDS.forEach(function (k) { if (st[k] !== undefined) o[k] = st[k]; }); localStorage.setItem(RIDE_KEY, JSON.stringify(o)); }
else localStorage.removeItem(RIDE_KEY);
} catch (e) {}
};

try { if (localStorage.getItem(LISTEN_KEY) !== '0') app.state = Object.assign({}, app.state, { listenOn: true }); } catch (e) { app.state = Object.assign({}, app.state, { listenOn: true }); }
/* 실시간 열차 위치 중계 주소: 주소 끝에 ?rt=https://... 를 붙여 한 번 열면 저장돼요 */
var RT_URL = (window.SUBWAY_RT_URL || '');
try { var qrt = new URLSearchParams(location.search).get('rt'); if (qrt) localStorage.setItem(RT_KEY, qrt); RT_URL = localStorage.getItem(RT_KEY) || RT_URL; } catch (e) {}
setInterval(function () { var t = todNow(); if (t !== app.props.tod) { app.props.tod = t; schedule(); } }, 60000);
/* 위치 신호가 끊겨도 '몇 분 전' 표시가 흐르도록 가끔 다시 그려요 */
setInterval(function () { schedule(); }, 15000);

var layout = function () {
var w = Math.min(window.innerWidth, 480), scale = w / 390;
app.props.viewH = Math.max(560, Math.round(window.innerHeight / scale));
stage.style.transform = 'scale(' + scale + ')';
stage.style.left = Math.round((window.innerWidth - w) / 2) + 'px';
schedule();
};

/* 알림: 환승·하차 안내가 새로 뜨면 소리와 진동으로 알려요 */
var audio = null;
var unlockAudio = function () { try { if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume(); } catch (e) {} };
document.addEventListener('pointerdown', unlockAudio, { passive: true });
var beep = function (times) {
if (!audio) return;
try {
for (var k = 0; k < times; k++) {
var o = audio.createOscillator(), g = audio.createGain(), t0 = audio.currentTime + k * 0.32;
o.type = 'sine'; o.frequency.value = k % 2 ? 1175 : 880;
g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.35, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.26);
o.connect(g); g.connect(audio.destination); o.start(t0); o.stop(t0 + 0.28);
}
} catch (e) {}
};
/* 음성 안내: 음악을 듣고 있어도 알 수 있게 소리 내어 말해줘요 (이어폰이면 이어폰으로)
   아이폰은 화면을 한 번 누른 뒤에만 말할 수 있어서, 첫 터치 때 미리 열어 둬요 */
var TTS = window.speechSynthesis, ttsUntil = 0, ttsReady = false, koVoice = null;
var pickVoice = function () { try { var vs = TTS.getVoices() || []; koVoice = vs.filter(function (v) { return /^ko/i.test(v.lang); })[0] || null; } catch (e) {} };
if (TTS) { pickVoice(); try { TTS.onvoiceschanged = pickVoice; } catch (e) {} }
var unlockTTS = function () {
if (!TTS || ttsReady) return;
try { var u = new SpeechSynthesisUtterance(' '); u.volume = 0; u.lang = 'ko-KR'; TTS.speak(u); ttsReady = true; } catch (e) {}
};
document.addEventListener('touchend', unlockTTS, true);
document.addEventListener('click', unlockTTS, true);
var say = function (text) {
if (!TTS || !text) return;
try {
TTS.cancel();
var u = new SpeechSynthesisUtterance(text); u.lang = 'ko-KR'; u.rate = 1.0; u.volume = 1; if (koVoice) u.voice = koVoice;
ttsUntil = Date.now() + 1500 + text.length * 180;
TTS.speak(u);
} catch (e) {}
};
var SAY = function (label, vals, st) {
var dest = st.dest || '';
if (label === '내릴 준비') return '다음 역에서 내려요. ' + dest + '역이에요. 내릴 준비하세요.';
if (label === '도착') return dest + '역에 도착했어요. 지금 내리세요.';
if (label === '곧 환승' || label === '환승') return vals.banner;
if (label === '곧 도착') return '두 정거장 남았어요.';
return '';
};
var ALERT = { '곧 환승': 2, '환승': 4, '곧 도착': 2, '내릴 준비': 4, '도착': 4 };
var wasOn = false, manualBoard = false;
var lastAlert = '', wasArrived = false, wake = null, lastNear = '';
var keepAwake = function (on) {
try {
if (on && !wake && navigator.wakeLock) navigator.wakeLock.request('screen').then(function (w) { wake = w; w.addEventListener('release', function () { wake = null; }); }).catch(function () {});
if (!on && wake) { wake.release(); wake = null; }
} catch (e) {}
};
var afterRender = function (vals) {
var st = app.state || {}, riding = st.mode === 'ride';
saveRide();
/* 탑승이 (버튼 없이) 잡히는 순간 진동 + 소리로 알려요 */
var onNow = riding && !!st.boarded && !st.demo;
if (onNow && !wasOn && !manualBoard) { beep(1); try { if (navigator.vibrate) navigator.vibrate([150, 80, 150]); } catch (e) {} }
wasOn = onNow; manualBoard = false;
keepAwake(riding || st.mode === 'confirm' || !st.mode);
var key = riding ? vals.bannerLabel + '|' + vals.banner : '';
if (key !== lastAlert) {
lastAlert = key;
var n = riding && vals.banner ? ALERT[vals.bannerLabel] : 0;
if (n) { beep(n); try { if (navigator.vibrate) navigator.vibrate(n > 2 ? [300, 120, 300, 120, 300] : [200, 100, 200]); } catch (e) {} setTimeout(function () { say(SAY(vals.bannerLabel, vals, st)); }, n * 320 + 150); }
}
if (vals.isArrived && !wasArrived && !st.demo && st.route && st.dest) {
var hist = readHist(), hk = st.route[0].n + '>' + st.dest;
hist[hk] = (hist[hk] || 0) + 1;
try { localStorage.setItem(HIST_KEY, JSON.stringify(hist)); } catch (e) {}
app.props.hist = hist;
}
wasArrived = !!vals.isArrived;
if (vals.nearStation && vals.nearStation !== lastNear) {
lastNear = vals.nearStation;
beep(3);
try { if (navigator.vibrate) navigator.vibrate([250, 120, 250]); } catch (e) {}
} else if (vals.nearFar) lastNear = '';
};

/* 안내방송 듣기: 기기 음성인식으로 잠깐씩만 듣고, 들은 말에서 역 이름만 찾아요. 녹음은 저장하지 않아요 */
var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
var rec = null, recOn = false, recCk = '', recEndT = 0, ckStart = {};
var stopRec = function () { if (rec) { try { rec.stop(); } catch (e) {} } };
var startRec = function (ck) {
if (!SR) { app.setState({ listenErr: 'unsupported' }); return; }
try {
rec = new SR(); rec.lang = 'ko-KR'; rec.continuous = true; rec.interimResults = true; rec.maxAlternatives = 3;
recCk = ck;
rec.onresult = function (e) {
/* 앱이 직접 말하는 동안 들린 건 방송이 아니니 무시해요 */
if (Date.now() < ttsUntil) return;
var txt = '';
for (var k = e.resultIndex; k < e.results.length; k++) for (var a = 0; a < e.results[k].length; a++) txt += ' ' + e.results[k][a].transcript;
app.setState({ rawHeard: String((e.results[e.results.length - 1][0] || {}).transcript || '').trim().slice(-28), rawT: Date.now() });
app.applyHeard(txt, recCk);
};
/* 듣기를 우리가 멈출 때 나는 aborted, 조용해서 나는 no-speech 는 오류가 아니에요 */
rec.onerror = function (e) { var er = e && e.error || 'error'; if (er === 'aborted' || er === 'no-speech') return; app.setState({ listenErr: er, lastErr: er }); };
rec.onend = function () { recOn = false; rec = null; recEndT = Date.now(); app.setState({ listening: false }); };
rec.start(); recOn = true; app.setState({ recStarts: ((app.state || {}).recStarts || 0) + 1 }); if (!ckStart[ck]) ckStart[ck] = Date.now();
app.setState({ listening: true, listenErr: null });
} catch (e) { recOn = false; rec = null; recEndT = Date.now(); app.setState({ listenErr: 'start' }); }
};
app.props.onListenToggle = function (on) {
try { localStorage.setItem(LISTEN_KEY, on ? '1' : '0'); } catch (e) {}
unlockAudio();
/* 켤 때 버튼을 누른 그 순간 한 번 시작해야 마이크 권한을 물을 수 있어요 */
if (on && SR && !recOn) { startRec('warmup'); setTimeout(function () { if (recCk === 'warmup') stopRec(); }, 1500); }
if (!on) stopRec();
};
app.props.onListenRetry = function (ck) { unlockAudio(); if (!recOn) startRec(ck); };
/* 시작 화면의 '안내방송으로 찾기': 누른 순간 시작해서 최대 3분 들어요 */
/* 아이폰은 화면을 한 번 눌러야 마이크를 켤 수 있어요. 그래서 앱의 아무 버튼이나 누르는 그 순간에
   탑승 중이면 바로 듣기를 시작해요 (따로 마이크 버튼을 누를 필요 없게) */
var gestureKick = function () {
return; /* 안내방송 듣기 뺌 */
var st = app.state || {};
if (!SR || recOn || !st.listenOn || st.demo || st.listenErr === 'not-allowed') return;
unlockAudio();
var want = lastVals && lastVals.listenCk;
/* 지금 들어야 하는 순간일 때만 켜요 (버튼 누를 때마다 켜지 않게) */
if (want) startRec(want);
};
document.addEventListener('click', function () { setTimeout(gestureKick, 0); }, true);
document.addEventListener('touchend', gestureKick, true);
/* ===== 움직임 센서로 정거장 세기 =====
   열차는 역마다 출발(가속) → 달림 → 감속 → 정차를 되풀이해요. 폰이 느끼는 가속도(중력 뺀 값)를
   1.5초로 고르게 만든 크기가 3초 넘게 0.28m/s² 이상이면 '가속·감속 구간'으로 보고,
   출발 → (25초 이상) → 감속 → 조용해짐(3초) 을 '정차', 정차 뒤 다시 가속을 '출발'로 셉니다.
   아이폰은 처음에 화면을 누를 때 한 번 '동작 및 방향' 권한을 물어봐요 */
var M = { walkSec: 0, walkEmitted: false, on: false, asked: false, t: 0, grav: null, s: [0, 0, 0], vib: 0, hold: 0, low: 0, phase: 'unknown', phaseT: 0, decelSeen: false, lastEvt: 0, events: [] };
var A_TH = 0.28, LOW_TH = 0.12;
/* ===== 탑승 기록 (자동) =====
   1초마다 센서 요약과 앱 판단을 모아 1분마다 subway-now 서버의 비공개 저장소로 보내요.
   좌표·녹음은 보내지 않아요(가까운 역 이름과 오차만). 탈 때나 움직일 때만 보내요 */
var REC = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8), part: 0, buf: [], ev: [], rt: [], t0: Date.now(), dirty: false };
var recUrl = function () { return RT_URL ? RT_URL.replace(/\/api\/trains.*$/, '/api/log') : ''; };
setInterval(function () {
var st = app.state || {}, g = st.geo, r = app._route;
if (!M.on && st.mode !== 'ride') return;
var i = r ? Math.min(st.i || 0, r.length - 1) : -1;
var nm = app._near;
REC.buf.push([Math.round((Date.now() - REC.t0) / 1000), +(M.lastMag || 0).toFixed(2), +M.vib.toFixed(2), M.phase.charAt(0), (st.mode || 'confirm').charAt(0), i, r && i >= 0 ? r[i].n : '', +(st.f || 0).toFixed(2), st.boarded ? 1 : 0, st.trainNo || '', g ? Math.round(g.acc) : -1, g ? Math.round((Date.now() - g.t) / 1000) : -1, nm ? nm.name : '', nm ? Math.round(nm.m) : -1]);
if (st.mode === 'ride' || M.phase === 'moving') REC.dirty = true;
}, 1000);
var recFlush = function (beacon) {
var url = recUrl();
if (!url || !REC.buf.length) return;
if (!REC.dirty) { REC.buf = []; REC.ev = []; REC.rt = []; return; }
var st = app.state || {}, r = app._route;
var body = JSON.stringify({ id: REC.id, part: REC.part++, t0: REC.t0, cols: 't,mag,vib,phase,mode,i,stn,f,boarded,train,gAcc,gAge,near,nearM', s: REC.buf, ev: REC.ev, rt: REC.rt, route: r ? r.map(function (x) { return x.n + '/' + NET[x.l].short; }).join(' ') : '', dest: st.dest || '', ua: navigator.userAgent.slice(0, 80) });
REC.buf = []; REC.ev = []; REC.rt = []; REC.dirty = false;
try {
if (beacon && navigator.sendBeacon) navigator.sendBeacon(url, new Blob([body], { type: 'text/plain' }));
else fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: body, keepalive: true }).catch(function () {});
} catch (e) {}
};
setInterval(function () { recFlush(false); }, 60000);
document.addEventListener('visibilitychange', function () { if (document.hidden) recFlush(true); });
window.addEventListener('pagehide', function () { recFlush(true); });
var mEmit = function (type, t) {
REC.ev.push([type, Math.round((t - REC.t0) / 1000)]);
var walked = M.walkSec;
if (type === 'stop') { M.walkSec = 0; M.walkEmitted = false; }
if (type === 'depart') { M.walkSec = 0; M.walkEmitted = false; }
M.events.push(type + ' ' + new Date(t).toTimeString().slice(0, 8)); if (M.events.length > 6) M.events.shift();
try { var lg = JSON.parse(localStorage.getItem('subway-now:mlog') || '[]'); lg.push([type, t]); localStorage.setItem('subway-now:mlog', JSON.stringify(lg.slice(-200))); } catch (e) {}
app.applyMotion(type, t, { walked: walked });
if (type === 'depart') { rtLast = 0; setTimeout(function () { var st = app.state || {}; if (st.mode === 'ride') pollTrains(); else pollHome(true); }, 15000); }
};
var onMotion = function (e) {
var now = Date.now(), dt = M.t ? Math.min(0.5, (now - M.t) / 1000) : 0.016; M.t = now;
var a = e.acceleration, x, y, z;
if (a && a.x !== null && a.x !== undefined) { x = a.x; y = a.y; z = a.z; }
else {
var g = e.accelerationIncludingGravity; if (!g || g.x === null) return;
if (!M.grav) M.grav = [g.x, g.y, g.z];
var kg = Math.min(1, dt / 20); M.grav = [M.grav[0] + (g.x - M.grav[0]) * kg, M.grav[1] + (g.y - M.grav[1]) * kg, M.grav[2] + (g.z - M.grav[2]) * kg];
x = g.x - M.grav[0]; y = g.y - M.grav[1]; z = g.z - M.grav[2];
}
var ks = Math.min(1, dt / 1.5);
M.s = [M.s[0] + (x - M.s[0]) * ks, M.s[1] + (y - M.s[1]) * ks, M.s[2] + (z - M.s[2]) * ks];
var mag = Math.sqrt(M.s[0] * M.s[0] + M.s[1] * M.s[1] + M.s[2] * M.s[2]); M.lastMag = mag;
var dv = Math.sqrt(Math.pow(x - M.s[0], 2) + Math.pow(y - M.s[1], 2) + Math.pow(z - M.s[2], 2));
M.vib = M.vib + (dv - M.vib) * Math.min(1, dt / 2);
var walking = M.vib > 0.9;
M.hold = mag > A_TH && !walking ? M.hold + dt : 0;
/* 정차 뒤에 걸은 시간: 환승·하차를 알아보는 데 써요 (20초 넘게 걸으면 'walk' 한 번) */
if (walking && M.phase !== 'moving') { M.walkSec += dt; if (M.walkSec >= 20 && !M.walkEmitted) { M.walkEmitted = true; mEmit('walk', now); } }
M.low = mag < LOW_TH ? M.low + dt : 0;
/* 상태 바뀜 */
if (M.phase !== 'moving' && M.hold >= 3 && now - M.lastEvt > 15000) { M.phase = 'moving'; M.phaseT = now; M.decelSeen = false; M.lastEvt = now; mEmit('depart', now); }
else if (M.phase === 'moving') {
if (M.hold >= 3 && now - M.phaseT > 25000) M.decelSeen = true;
if (M.decelSeen && M.low >= 3) { M.phase = 'stopped'; M.phaseT = now; M.lastEvt = now; mEmit('stop', now); }
}
else if (M.phase === 'unknown' && M.low >= 8) { M.phase = 'stopped'; M.phaseT = now; }
if (now - (M.uiT || 0) > 1000) {
M.uiT = now;
app.setState({ mdbg: (M.phase === 'moving' ? '달림' : M.phase === 'stopped' ? '정차' : '?') + ' ' + mag.toFixed(2) + '/' + M.vib.toFixed(2) + (walking ? ' 걷는 중' : '') + (M.events.length ? ' [' + M.events.slice(-2).join(', ') + ']' : '') });
}
};
var startMotion = function () { if (M.on) return; M.on = true; window.addEventListener('devicemotion', onMotion); app.setState({ motionOn: true, motionErr: null }); };
var askMotion = function () {
if (M.asked) return; M.asked = true;
var D = window.DeviceMotionEvent;
if (!D) { app.setState({ motionErr: '미지원' }); return; }
if (typeof D.requestPermission === 'function') {
D.requestPermission().then(function (r) { if (r === 'granted') startMotion(); else app.setState({ motionErr: r }); }).catch(function (er) { M.asked = false; app.setState({ motionErr: String(er && er.name || 'err') }); });
} else startMotion();
};
document.addEventListener('click', askMotion, true);
document.addEventListener('touchend', askMotion, true);
/* 안드로이드 등 권한이 필요 없는 곳은 바로 시작해요 */
try { if (window.DeviceMotionEvent && typeof window.DeviceMotionEvent.requestPermission !== 'function') { M.asked = true; startMotion(); } } catch (e) {}
window.__motion = M; window.__onMotion = onMotion;
var homeTimer = null;
/* 오른쪽 아래(시작 화면은 위) 다시 확인 버튼: 페이지를 새로 여는 게 아니라 지금 위치를 바로 다시 맞춰요
   GPS 새로 받기 + 실시간 열차 바로 조회 + 안내방송 1분 듣기 */
var syncT = 0;
app.props.onSync = function (auto) {
var st = app.state || {};
syncT = Date.now();
app.setState({ syncing: true });
if (auto !== true) try { if (navigator.vibrate) navigator.vibrate(30); } catch (e) {}
setTimeout(function () { app.setState({ syncing: false }); }, 6000);
try { navigator.geolocation.getCurrentPosition(function (pos) { app.applyGeo({ lat: pos.coords.latitude, lon: pos.coords.longitude, acc: pos.coords.accuracy || 9999, speed: pos.coords.speed, t: pos.timestamp || Date.now() }); }, function () {}, { enableHighAccuracy: true, maximumAge: 0, timeout: 8000 }); } catch (e) {}
if (st.mode === 'ride') { rtLast = 0; pollTrains(); } else pollHome(true);
/* 자동으로 다시 맞출 때는 화면을 누른 게 아니라서 마이크는 켤 수 없어요(아이폰 제한) */
if (false && auto !== true && SR && st.listenOn !== false && st.listenErr !== 'not-allowed') { unlockAudio(); if (recOn) recCk = 'sync'; else startRec('sync'); }
};
app.props.onHomeListen = function (on) {
unlockAudio();
if (homeTimer) { clearTimeout(homeTimer); homeTimer = null; }
if (!on) { if (recCk === 'home') stopRec(); app.setState({ homeListening: false }); return; }
if (recOn) stopRec();
setTimeout(function () {
startRec('home');
app.setState({ homeListening: true });
homeTimer = setTimeout(function () { if (recCk === 'home') stopRec(); app.setState({ homeListening: false }); }, 180000);
}, recOn ? 300 : 0);
};
var manageListen = function (vals) {
var want = vals.listenCk, st = app.state || {};
if (want && ckStart[want] && Date.now() - ckStart[want] > vals.listenMax * 1000) {
var done = Object.assign({}, st.ckDone || {}); done[want] = 'timeout';
stopRec(); app.setState({ ckDone: done }); return;
}
if (want && !recOn && Date.now() - recEndT > 1200 && st.listenErr !== 'not-allowed') startRec(want);
else if (want && recOn) recCk = want;
else if (!want && recOn && recCk !== 'warmup' && !(recCk === 'sync' && Date.now() - syncT < 60000) && !(recCk === 'home' && (st.mode || 'confirm') === 'confirm')) stopRec();
/* 시작 화면에서 듣다가 방송으로 탑승이 잡히면 이어서 듣기 표시를 꺼요 */
if (st.homeListening && (st.mode || 'confirm') !== 'confirm') app.setState({ homeListening: false });
/* 듣기가 끝났는데(권한 거부 등) 표시가 남아 있으면 끄고, 3분 안이면 다시 이어 들어요 */
if (st.homeListening && !recOn && (st.mode || 'confirm') === 'confirm' && Date.now() - recEndT > 1200) { if (st.listenErr === 'not-allowed') app.setState({ homeListening: false }); else startRec('home'); }
};

/* 실시간 열차 위치: 탄 뒤에만 30초마다 (인증키 하루 1,000회 제한) 지금 노선의 열차 위치를 받아요 */
var rtBusy = false, rtLast = 0;
var pollTrains = function () {
var st = app.state || {}, route = app._route;
if (!RT_URL || rtBusy || st.mode !== 'ride' || st.demo || !route || document.hidden) return;
var i = Math.min(st.i || 0, route.length - 1);
if (i >= route.length - 1) return;
var line = NET[route[i + 1].l].name;
rtBusy = true; rtLast = Date.now();
fetch(RT_URL + (RT_URL.indexOf('?') < 0 ? '?' : '&') + 'line=' + encodeURIComponent(line), { cache: 'no-store' })
.then(function (r) { return r.json(); })
.then(function (j) { rtBusy = false; if (j && j.rows) { try { var names = {}; route.forEach(function (x) { names[stnNorm(x.n)] = 1; }); REC.rt.push([Math.round((Date.now() - REC.t0) / 1000), line, j.rows.filter(function (x) { return names[stnNorm(x.stn)]; }).map(function (x) { return [x.stn, x.no, x.st, x.ud, x.term, x.t]; })]); } catch (e) {} app.applyTrains(j.rows); } app.setState({ rtErr: j && j.err || null, rtOkT: j && j.rows ? Date.now() : (app.state || {}).rtOkT }); })
.catch(function () { rtBusy = false; app.setState({ rtErr: 'network' }); });
};
setInterval(function () { var st = app.state || {}; if (st.mode === 'ride' && !st.boarded && Date.now() - rtLast > 18000) pollTrains(); }, 5000);
setInterval(pollTrains, 30000);
/* 시작 화면: 대략적인 위치(실내·지하)일 때 근처 노선의 열차들을 30초마다 보고 같이 움직이는 열차를 찾아요.
   집에 오래 켜 두면 하루 조회 한도를 다 쓰지 않게, 위치가 크게 바뀌지 않으면 15분 뒤 멈춰요 */
var homeBusy = false, homeAnchor = null;
var pollHome = function (force) {
var st = app.state || {}, geo = st.geo;
var moving = st.motionT && Date.now() - st.motionT < 600000;
if (!RT_URL || homeBusy || document.hidden || st.demo || (st.mode || 'confirm') !== 'confirm' || !geo || !(force === true || moving || geo.acc > 60)) return;
var now = Date.now();
if (force === true || moving) homeAnchor = null;
if (!homeAnchor || Math.sqrt(Math.pow((geo.lon - homeAnchor.lon) * COS, 2) + Math.pow(geo.lat - homeAnchor.lat, 2)) * 111000 > 1000) homeAnchor = { lat: geo.lat, lon: geo.lon, t: now };
if (now - homeAnchor.t > 900000) return;
var lines = app.homeLines();
if (!lines.length) return;
homeBusy = true;
var left = lines.length;
lines.forEach(function (li) {
fetch(RT_URL + (RT_URL.indexOf('?') < 0 ? '?' : '&') + 'line=' + encodeURIComponent(NET[li].name), { cache: 'no-store' })
.then(function (r) { return r.json(); })
.then(function (j) { app.setState({ rtOkT: j && j.rows ? Date.now() : (app.state || {}).rtOkT, rtErr: j && j.err || null }); if (j && j.rows) app.applyHomeTrains(li, j.rows); })
.catch(function () {})
.then(function () { if (--left === 0) homeBusy = false; });
});
};
setInterval(pollHome, 30000);
/* 자동 업데이트: 새 버전이 올라오면 (타고 가는 중이 아닐 때) 알아서 새로 열어요.
   홈 화면 앱은 예전 화면을 오래 들고 있어서, 고친 게 안 보이던 문제를 막아요 */
var checkUpdate = function () {
if (typeof BUILD === 'undefined' || document.hidden) return;
fetch(location.pathname + '?u=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.text(); }).then(function (t) {
var m = t.match(/var BUILD = '([0-9a-f]+)'/);
if (!m || m[1] === BUILD) return;
var st = app.state || {};
if (st.mode === 'ride' && st.boarded) return;
try { localStorage.setItem('subway-now:updatedTo', m[1]); } catch (e) {}
location.replace(location.pathname + '?v=' + m[1]);
}).catch(function () {});
};
setTimeout(checkUpdate, 3000);
setInterval(checkUpdate, 600000);
document.addEventListener('visibilitychange', function () { if (!document.hidden) setTimeout(checkUpdate, 1500); });
/* ===== 지도 손으로 움직이기 =====
   한 손가락: 끌어서 이동 · 두 손가락: 벌리고 오므려 확대/축소 · 두 번 톡: 원래대로 · 마우스 휠: 확대/축소.
   화면을 늘리는 게 아니라 지도 자체를 그 위치·배율로 다시 그려서, 옮긴 곳까지 건물·노선이 채워져요 */
var MG = { x: 0, y: 0, s: 1, pts: {}, start: null, lastTap: 0, raf: 0 };
var mgApply = function () { if (MG.raf) return; MG.raf = (window.requestAnimationFrame || setTimeout)(function () { MG.raf = 0; var m = Math.abs(MG.x) > 2 || Math.abs(MG.y) > 2 || Math.abs(MG.s - 1) > 0.02; app.setState({ view: { x: MG.x, y: MG.y, z: MG.s }, mapMoved: m }); }); };
app.props.onRecenter = function () {
var x0 = MG.x, y0 = MG.y, s0 = MG.s, t0 = Date.now();
var step = function () { var u = Math.min(1, (Date.now() - t0) / 350), e = u * (2 - u); MG.x = x0 * (1 - e); MG.y = y0 * (1 - e); MG.s = s0 + (1 - s0) * e; app.setState({ view: { x: MG.x, y: MG.y, z: MG.s }, mapMoved: u < 1 }); if (u < 1) (window.requestAnimationFrame || setTimeout)(step); };
step();
};
var toLocal = function (e) { var r = stage.getBoundingClientRect(), k = r.width / 390; return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k }; };
var mgCy = function () { return lastVals && lastVals.mapCy ? lastVals.mapCy : 420; };
/* 손가락 가운데 있던 지도 점이 계속 손가락 가운데 오도록 배율과 이동을 같이 바꿔요 */
var zoomAbout = function (c0, c1, S, ns) {
ns = Math.max(0.5, Math.min(4, ns)); var r = ns / S.s, cy = mgCy();
MG.x = (c1.x - 195) - ((c0.x - 195) - S.x) * r; MG.y = (c1.y - cy) - ((c0.y - cy) - S.y) * r; MG.s = ns;
};
stage.addEventListener('pointerdown', function (e) {
if (!e.target.closest || !e.target.closest('#mapgest')) return;
MG.pts[e.pointerId] = toLocal(e);
try { e.target.setPointerCapture && e.target.setPointerCapture(e.pointerId); } catch (er) {}
if (Object.keys(MG.pts).length === 1) {
var now = Date.now();
if (now - MG.lastTap < 300) { MG.pts = {}; MG.start = null; MG.lastTap = 0; app.props.onRecenter(); return; }
MG.lastTap = now;
}
MG.start = { x: MG.x, y: MG.y, s: MG.s, pts: JSON.parse(JSON.stringify(MG.pts)) };
});
stage.addEventListener('pointermove', function (e) {
if (!MG.pts[e.pointerId] || !MG.start) return;
MG.pts[e.pointerId] = toLocal(e);
var ids = Object.keys(MG.pts), S = MG.start;
if (ids.length === 1 && S.pts[ids[0]]) {
var a = MG.pts[ids[0]], a0 = S.pts[ids[0]];
MG.x = S.x + (a.x - a0.x); MG.y = S.y + (a.y - a0.y);
} else if (ids.length >= 2 && S.pts[ids[0]] && S.pts[ids[1]]) {
var p1 = MG.pts[ids[0]], p2 = MG.pts[ids[1]], q1 = S.pts[ids[0]], q2 = S.pts[ids[1]];
var d0 = Math.hypot(q2.x - q1.x, q2.y - q1.y) || 1, d1 = Math.hypot(p2.x - p1.x, p2.y - p1.y);
zoomAbout({ x: (q1.x + q2.x) / 2, y: (q1.y + q2.y) / 2 }, { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }, S, S.s * d1 / d0);
}
mgApply(); e.preventDefault();
}, { passive: false });
var mgEnd = function (e) { if (!MG.pts[e.pointerId]) return; delete MG.pts[e.pointerId]; MG.start = Object.keys(MG.pts).length ? { x: MG.x, y: MG.y, s: MG.s, pts: JSON.parse(JSON.stringify(MG.pts)) } : null; };
stage.addEventListener('pointerup', mgEnd); stage.addEventListener('pointercancel', mgEnd);
stage.addEventListener('wheel', function (e) {
if (!e.target.closest || !e.target.closest('#mapgest')) return;
var p = toLocal(e); zoomAbout(p, p, { x: MG.x, y: MG.y, s: MG.s }, MG.s * Math.exp(-e.deltaY / 400)); mgApply(); e.preventDefault();
}, { passive: false });
/* 다음 열차: 화면에 출발역이 있을 때 20초마다 그 역 도착 정보를 받아요. 남은 시간은 1초마다 다시 그려요 */
var arrBusy = false;
var pollArr = function () {
var vals = lastVals, stn = vals && vals.arrStn;
if (!RT_URL || arrBusy || document.hidden || !stn) return;
var st = app.state || {};
if (st.arr && st.arr.stn === stn && Date.now() - st.arr.at < 18000) return;
arrBusy = true;
fetch(RT_URL.replace(/\/api\/trains.*$/, '/api/arrivals') + '?stn=' + encodeURIComponent(stnNorm(stn)), { cache: 'no-store' })
.then(function (r) { return r.json(); })
.then(function (j) { arrBusy = false; if (j && j.rows) app.setState({ arr: { stn: stn, rows: j.rows, at: Date.now() } }); })
.catch(function () { arrBusy = false; });
};
setInterval(pollArr, 5000);
setInterval(function () { if (lastVals && lastVals.arrStn) schedule(); }, 1000);
app.props.rtUrl = RT_URL;
setTimeout(pollHome, 4000);

var lastVals = null;
setInterval(function () { if (lastVals) manageListen(lastVals); }, 1000);
var queued = false;
var draw = function () {
queued = false;
var vals = app.renderVals();
var kids = [];
for (var k = 0; k < tplNodes.length; k++) { var r = render(tplNodes[k], vals); if (r !== null) kids.push(r); }
preact.render(h(Fragment, null, kids), stage);
afterRender(vals);
lastVals = vals;
manageListen(vals);
if (RT_URL && (app.state || {}).mode === 'ride' && Date.now() - rtLast > 30000) pollTrains();
};
var schedule = function () { if (!queued) { queued = true; (window.requestAnimationFrame || setTimeout)(draw); } };
DCLogic.onChange = schedule;

/* 내 위치 */
var startGeo = function () {
if (!navigator.geolocation) { app.setState({ geoErr: 'none' }); return; }
navigator.geolocation.watchPosition(function (pos) {
app.applyGeo({ lat: pos.coords.latitude, lon: pos.coords.longitude, acc: pos.coords.accuracy || 9999, speed: pos.coords.speed, t: pos.timestamp || Date.now() });
}, function (err) { app.setState({ geoErr: err && err.code ? err.code : 'err' }); }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });
};
var hiddenAt = 0;
document.addEventListener('visibilitychange', function () {
if (document.hidden) { hiddenAt = Date.now(); return; }
var away = hiddenAt ? (Date.now() - hiddenAt) / 1000 : 0; hiddenAt = 0;
/* 15초 넘게 다른 앱에 있다 돌아오면 바로 다시 맞춰요 */
if (away > 15 && (app.state || {}).mode === 'ride') { if (away > 60) app.setState({ fixNote: '화면이 꺼져 있던 ' + Math.round(away / 60) + '분 동안은 알림을 못 드렸어요. 지금 위치로 다시 맞췄어요', fixNoteT: Date.now() }); app.resume(away); if (app.props.onSync) app.props.onSync(true); }
app.tick(); schedule();
});
window.addEventListener('resize', layout);
window.addEventListener('orientationchange', layout);
layout();
app.componentDidMount();
startGeo();
window.__app = app;
})();
