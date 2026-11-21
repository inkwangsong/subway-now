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
setInterval(function () { var t = todNow(); if (t !== app.props.tod) { app.props.tod = t; schedule(); } }, 60000);

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
var lastAlert = '', wasArrived = false, wake = null;
var keepAwake = function (on) {
try {
if (on && !wake && navigator.wakeLock) navigator.wakeLock.request('screen').then(function (w) { wake = w; w.addEventListener('release', function () { wake = null; }); }).catch(function () {});
if (!on && wake) { wake.release(); wake = null; }
} catch (e) {}
};
var afterRender = function (vals) {
var st = app.state || {}, riding = st.mode === 'ride';
keepAwake(riding);
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
};

var queued = false;
var draw = function () {
queued = false;
var vals = app.renderVals();
var kids = [];
for (var k = 0; k < tplNodes.length; k++) { var r = render(tplNodes[k], vals); if (r !== null) kids.push(r); }
preact.render(h(Fragment, null, kids), stage);
afterRender(vals);
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
