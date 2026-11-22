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
try { if (localStorage.getItem(LISTEN_KEY) === '1') app.state = Object.assign({}, app.state, { listenOn: true }); } catch (e) {}
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
var ALERT = { '곧 환승': 2, '환승': 4, '곧 도착': 2, '내릴 준비': 4, '도착': 4 };
var lastAlert = '', wasArrived = false, wake = null, lastNear = '';
var keepAwake = function (on) {
try {
if (on && !wake && navigator.wakeLock) navigator.wakeLock.request('screen').then(function (w) { wake = w; w.addEventListener('release', function () { wake = null; }); }).catch(function () {});
if (!on && wake) { wake.release(); wake = null; }
} catch (e) {}
};
var afterRender = function (vals) {
var st = app.state || {}, riding = st.mode === 'ride';
keepAwake(riding || st.mode === 'confirm' || !st.mode);
var key = riding ? vals.bannerLabel + '|' + vals.banner : '';
if (key !== lastAlert) {
lastAlert = key;
var n = riding && vals.banner ? ALERT[vals.bannerLabel] : 0;
if (n) { beep(n); try { if (navigator.vibrate) navigator.vibrate(n > 2 ? [300, 120, 300, 120, 300] : [200, 100, 200]); } catch (e) {} }
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
var txt = '';
for (var k = e.resultIndex; k < e.results.length; k++) for (var a = 0; a < e.results[k].length; a++) txt += ' ' + e.results[k][a].transcript;
app.applyHeard(txt, recCk);
};
rec.onerror = function (e) { app.setState({ listenErr: e && e.error || 'error' }); };
rec.onend = function () { recOn = false; rec = null; recEndT = Date.now(); app.setState({ listening: false }); };
rec.start(); recOn = true; if (!ckStart[ck]) ckStart[ck] = Date.now();
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
var homeTimer = null;
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
else if (!want && recOn && recCk !== 'warmup' && !(recCk === 'home' && (st.mode || 'confirm') === 'confirm')) stopRec();
/* 시작 화면에서 듣다가 방송으로 탑승이 잡히면 이어서 듣기 표시를 꺼요 */
if (st.homeListening && (st.mode || 'confirm') !== 'confirm') app.setState({ homeListening: false });
/* 듣기가 끝났는데(권한 거부 등) 표시가 남아 있으면 끄고, 3분 안이면 다시 이어 들어요 */
if (st.homeListening && !recOn && (st.mode || 'confirm') === 'confirm' && Date.now() - recEndT > 1200) { if (st.listenErr === 'not-allowed') app.setState({ homeListening: false }); else startRec('home'); }
};

/* 실시간 열차 위치: 탄 뒤에만 30초마다 (인증키 하루 1,000회 제한) 지금 노선의 열차 위치를 받아요 */
var rtBusy = false, rtLast = 0;
var pollTrains = function () {
var st = app.state || {}, route = app._route;
if (!RT_URL || rtBusy || st.mode !== 'ride' || st.demo || !st.boarded || !route || document.hidden) return;
var i = Math.min(st.i || 0, route.length - 1);
if (i >= route.length - 1) return;
var line = NET[route[i + 1].l].name;
rtBusy = true; rtLast = Date.now();
fetch(RT_URL + (RT_URL.indexOf('?') < 0 ? '?' : '&') + 'line=' + encodeURIComponent(line), { cache: 'no-store' })
.then(function (r) { return r.json(); })
.then(function (j) { rtBusy = false; if (j && j.rows) app.applyTrains(j.rows); app.setState({ rtErr: j && j.err || null }); })
.catch(function () { rtBusy = false; app.setState({ rtErr: 'network' }); });
};
setInterval(pollTrains, 30000);
/* 시작 화면: 대략적인 위치(실내·지하)일 때 근처 노선의 열차들을 30초마다 보고 같이 움직이는 열차를 찾아요.
   집에 오래 켜 두면 하루 조회 한도를 다 쓰지 않게, 위치가 크게 바뀌지 않으면 15분 뒤 멈춰요 */
var homeBusy = false, homeAnchor = null;
var pollHome = function () {
var st = app.state || {}, geo = st.geo;
if (!RT_URL || homeBusy || document.hidden || st.demo || (st.mode || 'confirm') !== 'confirm' || !geo || !(geo.acc > 60)) return;
var now = Date.now();
if (!homeAnchor || Math.sqrt(Math.pow((geo.lon - homeAnchor.lon) * COS, 2) + Math.pow(geo.lat - homeAnchor.lat, 2)) * 111000 > 1000) homeAnchor = { lat: geo.lat, lon: geo.lon, t: now };
if (now - homeAnchor.t > 900000) return;
var lines = app.homeLines();
if (!lines.length) return;
homeBusy = true;
var left = lines.length;
lines.forEach(function (li) {
fetch(RT_URL + (RT_URL.indexOf('?') < 0 ? '?' : '&') + 'line=' + encodeURIComponent(NET[li].name), { cache: 'no-store' })
.then(function (r) { return r.json(); })
.then(function (j) { if (j && j.rows) app.applyHomeTrains(li, j.rows); })
.catch(function () {})
.then(function () { if (--left === 0) homeBusy = false; });
});
};
setInterval(pollHome, 30000);
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
if (RT_URL && (app.state || {}).boarded && Date.now() - rtLast > 30000) pollTrains();
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
document.addEventListener('visibilitychange', function () { if (!document.hidden) { app.tick(); schedule(); } });
window.addEventListener('resize', layout);
window.addEventListener('orientationchange', layout);
layout();
app.componentDidMount();
startGeo();
window.__app = app;
})();
