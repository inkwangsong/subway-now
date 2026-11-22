class Component extends DCLogic {
componentDidMount() { var self = this; this._timer = setInterval(function () { self.tick(); }, 70); }
componentWillUnmount() { clearInterval(this._timer); }
/* 자동 주행: 역 사이를 조금씩 나아가고, 역에 닿으면 잠깐 섰다가 다시 출발해요 */
tick() {
var st = this.state || {};
if (st.mode !== 'ride' || st.playing === false) { this._lastT = 0; return; }
var i = Math.min(st.i || 0, this._last || 0);
if (i >= (this._last || 0)) return;
var f;
if (this.props.live && !st.demo) {
if (!st.boarded) { this._lastT = 0; return; }
/* 실제 주행: 역 사이를 평균 110초로 보고 시간으로 추정해요. 위치가 잡히면 그 값이 우선이에요 */
var now = Date.now(), dt = this._lastT ? (now - this._lastT) / 1000 : 0;
this._lastT = now;
this._acc = (this._acc || 0) + dt;
if (this._acc < 1) return;
/* 화면이 꺼졌다 켜져도 그동안 흐른 시간만큼 한꺼번에 나아가요 */
var total = i + (st.f || 0) + this._acc / 110; this._acc = 0;
/* 탄 열차를 실시간으로 따라가는 중이면, 다음 도착 소식이 올 때까지 역 직전에서 기다려요 */
if (st.trainNo && st.trainT && now - st.trainT < 60000) total = Math.min(total, i + 0.92);
/* 환승역에 닿으면 멈추고 다시 탑승을 기다려요 (갈아탈 열차를 타면 다시 출발) */
var tx = xferAfter(this._route, i);
if (tx >= 0 && total >= tx) { this.setState({ i: tx, f: 0, boarded: false, trainNo: null, trainMiss: 0 }); return; }
var ni = Math.min(this._last, Math.floor(total));
this.setState({ i: ni, f: ni >= this._last ? 0 : total - ni });
return;
} else {
if (this._dwell > 0) { this._dwell--; return; }
f = (st.f || 0) + 0.028;
}
if (f >= 1) { this._dwell = this._xferNext ? 34 : 18; this.setState({ i: i + 1, f: 0 }); }
else this.setState({ f: f });
}
/* 위치 반영: 경로 위에서 지금 역부터 세 정거장 앞까지만 보고 가장 가까운 지점으로 옮겨요 (뒤로는 안 가요) */
applyGeo(geo) {
var st = this.state || {};
var patch = { geo: geo };
if ((st.mode || 'confirm') === 'confirm' && this.props.live && !st.demo && geo) {
var auto = this.detectRide(geo);
if (auto) { this.setState(Object.assign(patch, auto)); return; }
}
var route = this._route, G = this._G;
if (st.mode === 'ride' && this.props.live && !st.demo && route && G && geo && geo.acc < 1500) {
if (!st.boarded && geo.speed && geo.speed > 5) { patch.boarded = true; patch.playing = true; }
var i = Math.min(st.i || 0, route.length - 1), best = null;
for (var k = i; k < Math.min(route.length - 1, i + 3); k++) {
var a = G.pos[route[k].n + '|' + route[k + 1].l] || G.pos[route[k].n + '|' + route[k].l], b = G.pos[route[k + 1].n + '|' + route[k + 1].l];
var ax = a[0] * COS, ay = a[1], bx = b[0] * COS, by = b[1], px = geo.lon * COS, py = geo.lat;
var vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy || 1, tt = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / l2));
var ex = ax + vx * tt - px, ey = ay + vy * tt - py, dist = Math.sqrt(ex * ex + ey * ey) * 111000;
if (!best || dist < best.dist) best = { k: k, t: tt, dist: dist };
}
if (best && best.dist < Math.max(500, geo.acc * 1.5)) {
var cur = i + (st.f || 0), nxt = best.k + best.t;
if (!st.boarded && (nxt > i + 0.35 || (geo.speed && geo.speed > 5))) { patch.boarded = true; patch.playing = true; }
if ((st.boarded || patch.boarded) && nxt > cur - 0.15) { if (best.t > 0.96) { patch.i = best.k + 1; patch.f = 0; } else { patch.i = best.k; patch.f = best.t; } patch.fixT = Date.now(); }
var txG = xferAfter(route, i);
if (patch.i !== undefined && txG >= 0 && patch.i + (patch.f || 0) >= txG && (st.boarded || patch.boarded)) { patch.i = txG; patch.f = 0; patch.boarded = false; patch.trainNo = null; }
}
}
this.setState(patch);
}
/* 탑승 자동 감지 (앱만 켜 둔 상태): 최근 위치들이 같은 노선 위를 열차 속도로 지나가면
   그 노선·방향으로 '지금 역 보기'를 시작해요 */
segOn(G, lat, lon) {
var best = null, px = lon * COS, py = lat;
for (var li = 0; li < NET.length; li++) {
var cs = NET[li].chains;
for (var ci = 0; ci < cs.length; ci++) {
var s = cs[ci].s;
for (var k = 0; k < s.length - 1; k++) {
var a = G.pos[s[k] + '|' + li], b = G.pos[s[k + 1] + '|' + li];
if (!a || !b) continue;
var ax = a[0] * COS, ay = a[1], vx = b[0] * COS - ax, vy = b[1] - ay, l2 = vx * vx + vy * vy || 1e-12;
var t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / l2));
var ex = ax + vx * t - px, ey = ay + vy * t - py, d = Math.sqrt(ex * ex + ey * ey) * 111000;
if (!best || d < best.d) best = { li: li, ci: ci, s: k + t, d: d };
}
}
}
return best;
}
detectRide(geo) {
var now = Date.now();
if (this._autoOff && now - this._autoOff < 300000) return null;
/* 지하에선 와이파이·기지국으로 잡힌 대략적인 위치(오차 1km 미만)도 써요. 대신 더 많이 움직여야 인정해요 */
if (!(geo.acc < 1000)) return null;
var G = this._G || (this._G = buildNet());
var on = this.segOn(G, geo.lat, geo.lon);
if (!on || on.d > Math.max(200, geo.acc * 0.8)) return null;
var tr = (this._trail || []).filter(function (p) { return now - p.t < 300000 && p.li === on.li && p.ci === on.ci; });
tr.push({ t: now, lat: geo.lat, lon: geo.lon, li: on.li, ci: on.ci, s: on.s, acc: geo.acc });
this._trail = tr;
/* 최근 2분 반 안에서, 지금보다 반 정거장 이상 떨어져 있던 가장 최근 위치와 비교해요
   (승강장에서 기다린 시간은 빠지도록) */
var first = null;
for (var w = tr.length - 2; w >= 0; w--) { if (now - tr[w].t > 240000) break; var need = Math.max(geo.acc, tr[w].acc || 0) > 300 ? 0.9 : 0.5; if (Math.abs(on.s - tr[w].s) >= need) { first = tr[w]; break; } }
if (!first) return null;
var ds = on.s - first.s, sec = (now - first.t) / 1000;
if (sec < 15) return null;
var meters = Math.sqrt(Math.pow((geo.lon - first.lon) * COS, 2) + Math.pow(geo.lat - first.lat, 2)) * 111000;
/* 걷기보다 훨씬 빠르게(초속 5m 이상), 400m 넘게 움직였을 때만 탄 걸로 봐요 */
if (meters < (Math.max(geo.acc, first.acc || 0) > 300 ? 700 : 400) || meters / sec < 5) return null;
var c = NET[on.li].chains[on.ci], fwd = ds > 0, k0 = fwd ? Math.floor(on.s) : Math.ceil(on.s);
k0 = Math.max(0, Math.min(c.s.length - 1, k0));
var o = { n: c.s[k0], l: on.li, ci: on.ci, toFirst: !fwd };
var route = freeRoute(o);
if (route.length < 2) return null;
this._trail = [];
return { mode: 'ride', origin: o, dest: null, route: route, i: 0, f: Math.max(0, Math.min(0.95, Math.abs(on.s - k0))), boarded: true, playing: true, auto: true, fixT: now, ckDone: {}, trainNo: null, q: '', from: null, pickFor: null };
}
/* 안내방송 반영: "이번 역은 문정" → 문정으로 가는 중(곧 도착), "다음 역은 가락시장" → 방금 문정을 떠남 */
/* 시작 화면 실시간 열차 맞추기: 사용자가 아무것도 안 해도, 대략적인 내 위치를 따라
   같이 움직이는 열차를 서울시 실시간 열차 정보에서 찾아내면 그 열차에 탄 걸로 봐요 */
homeLines() {
var st = this.state || {}, geo = st.geo, G = this._G;
if (!G || !geo || Date.now() - (geo.t || 0) > 600000 || !(geo.acc < 1500)) return [];
var R = Math.max(1500, geo.acc), best = {};
for (var pk in G.pos) {
var q = G.pos[pk], d = Math.sqrt(Math.pow((q[0] - geo.lon) * COS, 2) + Math.pow(q[1] - geo.lat, 2)) * 111000;
var li = +pk.split('|')[1];
if (d < R && (best[li] === undefined || d < best[li])) best[li] = d;
}
return Object.keys(best).sort(function (a, b) { return best[a] - best[b]; }).slice(0, 3).map(Number);
}
applyHomeTrains(li, rows) {
var st = this.state || {}, geo = st.geo, G = this._G;
if ((st.mode || 'confirm') !== 'confirm' || !geo || !G || !rows) return;
var now = Date.now(), cs = NET[li].chains, cand = this._cand || (this._cand = {});
rows.forEach(function (r) {
for (var ci = 0; ci < cs.length; ci++) {
var s = cs[ci].s, k = -1, tq = -1;
for (var q = 0; q < s.length; q++) { if (stnNorm(s[q]) === stnNorm(r.stn)) k = q; if (stnNorm(s[q]) === stnNorm(r.term)) tq = q; }
if (k < 0 || tq < 0 || tq === k || cs[ci].loop) continue;
var dir = tq > k ? 1 : -1, code = String(r.st);
var off = code === '0' ? -0.2 : code === '1' ? 0 : code === '2' ? 0.1 : -0.8;
var lag = r.t ? (now - new Date(String(r.t).replace(' ', 'T') + '+09:00').getTime()) / 1000 : 0;
if (lag > 5 && lag < 600) off = Math.min(off + lag / 110, 0.92);
var sp = Math.max(0, Math.min(s.length - 1, k + dir * off)), a0 = Math.floor(sp), a1 = Math.min(s.length - 1, a0 + 1), u = sp - a0;
var pa = G.pos[s[a0] + '|' + li], pb = G.pos[s[a1] + '|' + li];
if (!pa || !pb) continue;
var lon = pa[0] + (pb[0] - pa[0]) * u, lat = pa[1] + (pb[1] - pa[1]) * u;
var d = Math.sqrt(Math.pow((lon - geo.lon) * COS, 2) + Math.pow(lat - geo.lat, 2)) * 111000;
var key = li + ':' + r.no, c = cand[key] || (cand[key] = { li: li, ci: ci, dir: dir, no: String(r.no), h: [] });
c.h = c.h.filter(function (x) { return now - x.t < 240000; });
c.h.push({ t: now, d: d, s: sp, lat: geo.lat, lon: geo.lon, acc: geo.acc });
break;
}
});
/* 판정: 최근 4분 동안 3번 넘게 내 위치 가까이 있었고, 그동안 열차도 나도 한 정거장쯤 같이 움직였어야 해요 */
var ok = [];
for (var key2 in cand) {
var c2 = cand[key2], h = c2.h.filter(function (x) { return now - x.t < 240000; });
if (h.length < 3) continue;
var near = h.every(function (x) { return x.d < Math.max(600, x.acc * 1.5); });
var moved = Math.abs(h[h.length - 1].s - h[0].s) >= 0.8;
var me = Math.sqrt(Math.pow((h[h.length - 1].lon - h[0].lon) * COS, 2) + Math.pow(h[h.length - 1].lat - h[0].lat, 2)) * 111000;
if (near && moved && me >= 350) ok.push({ c: c2, avg: h.reduce(function (a, x) { return a + x.d; }, 0) / h.length, last: h[h.length - 1] });
}
/* 진행 표시용: 내 근처에 계속 있는 열차가 몇 번 확인됐는지 */
var bestN = 0;
for (var key3 in cand) { var hh = cand[key3].h.filter(function (x) { return now - x.t < 240000; }); var run = 0; for (var z = hh.length - 1; z >= 0 && hh[z].d < Math.max(600, hh[z].acc * 1.5); z--) run++; if (run > bestN) bestN = run; }
if (bestN !== (st.matchN || 0) || bestN) this.setState({ matchN: bestN, matchT: now });
if (!ok.length) return;
ok.sort(function (a, b) { return a.avg - b.avg; });
/* 비슷하게 맞는 열차가 둘이면(같은 방향에 붙어 오는 열차 등) 아직 고르지 않아요 */
if (ok.length > 1 && ok[1].avg - ok[0].avg < 150) return;
var w = ok[0], ch = NET[w.c.li].chains[w.c.ci], sNow = w.last.s, k0 = w.c.dir > 0 ? Math.floor(sNow) : Math.ceil(sNow);
k0 = Math.max(0, Math.min(ch.s.length - 1, k0));
var o = { n: ch.s[k0], l: w.c.li, ci: w.c.ci, toFirst: w.c.dir < 0 }, route = freeRoute(o);
if (route.length < 2) return;
this._cand = {};
this.setState({ mode: 'ride', origin: o, dest: null, route: route, i: 0, f: Math.max(0, Math.min(0.95, Math.abs(sNow - k0))), boarded: true, playing: true, auto: true, trainNo: w.c.no, trainT: now, trainMiss: 0, fixT: now, ckDone: {}, q: '', from: null, pickFor: null });
}
/* 시작 화면에서 안내방송 듣기: "이번 역은 X" + "다음 역은 Y"로 노선·방향까지 알아내요 */
applyHeardHome(text) {
var st = this.state || {}, G = this._G || (this._G = buildNet());
var T = String(text || '').replace(/\s+/g, '');
var find = function (key) {
var at = T.lastIndexOf(key); if (at < 0) return null;
var rest = T.slice(at + key.length, at + key.length + 14), best = null;
G.names.forEach(function (nm) { var n = stnNorm(nm); if (n.length >= 2 && rest.indexOf(n) === 0 && (!best || n.length > stnNorm(best).length)) best = nm; });
return best;
};
var cur = find('이번역은') || find('이번역') , nxt = find('다음역은') || find('다음역');
var now = Date.now(), mem = this._heardHome || {};
if (cur) mem.cur = { n: cur, t: now };
if (nxt) mem.nxt = { n: nxt, t: now };
this._heardHome = mem;
var a = mem.cur && now - mem.cur.t < 300000 ? mem.cur.n : null, b = mem.nxt && now - mem.nxt.t < 300000 ? mem.nxt.n : null;
/* 두 역이 한 노선에서 바로 이웃이면 방향이 정해져요 */
if (a && b && a !== b) {
for (var li = 0; li < NET.length; li++) {
var cs = NET[li].chains;
for (var ci = 0; ci < cs.length; ci++) {
var s = cs[ci].s, ia = s.indexOf(a), ib = s.indexOf(b);
if (ia < 0 || ib < 0) continue;
var fwd = ib - ia === 1 || (cs[ci].loop && ia === s.length - 1 && ib === 0), back = ia - ib === 1 || (cs[ci].loop && ib === s.length - 1 && ia === 0);
if (!fwd && !back) continue;
/* "다음 역은 b"가 더 나중에 들렸으면 a를 막 떠난 것, 아니면 a에 들어가는 중 */
var left = mem.nxt.t >= mem.cur.t;
var o = { n: a, l: li, ci: ci, toFirst: back }, route = freeRoute(o);
if (route.length < 2) continue;
this._heardHome = {};
this.setState({ mode: 'ride', origin: o, dest: null, route: route, i: 0, f: left ? 0.1 : 0, boarded: true, playing: true, auto: true, heardName: left ? b : a, heardT: now, ckDone: { leg0: 'heard' }, trainNo: null, q: '', from: null, pickFor: null, homeHeard: null });
return;
}
}
}
if (a || b) this.setState({ origin: { n: a || b }, homeHeard: a || b, homeHeardT: now });
}
applyHeard(text, ck) {
var st = this.state || {}, route = this._route;
if ((st.mode || 'confirm') === 'confirm') { if (ck === 'home' || ck === 'sync') this.applyHeardHome(text); return; }
if (!route || st.mode !== 'ride' || !text) return;
var T = String(text).replace(/\s+/g, ''), last = route.length - 1, i = Math.min(st.i || 0, last), best = null;
for (var k = Math.max(1, i); k <= Math.min(last, i + 4); k++) {
var nm = stnNorm(route[k].n);
if (nm.length < 2) continue;
var pos = T.lastIndexOf(nm);
if (pos < 0) continue;
var kind = T.slice(Math.max(0, pos - 6), pos).indexOf('다음') >= 0 ? 'next' : 'this';
var score = (kind === 'this' ? 100 : 50) + nm.length;
if (!best || score > best.score) best = { k: k, kind: kind, score: score };
}
if (!best) return;
var ni = best.k - 1, nf = best.kind === 'this' ? Math.max(0.85, ni === i ? (st.f || 0) : 0) : 0.1;
if (ni + nf < i + (st.f || 0) - 1.2) return;
var patch = { i: ni, f: nf, boarded: true, playing: true, heardName: route[best.k].n, heardT: Date.now() };
if (ck && ck !== 'live' && ck !== 'warmup' && ck !== 'sync') { patch.ckDone = Object.assign({}, st.ckDone || {}); patch.ckDone[ck] = 'heard'; }
this._acc = 0; this._lastT = 0;
this.setState(patch);
}
/* 실시간 열차 위치 반영: 내가 탄 열차를 한 번 찾으면 그 열차 번호로 계속 따라가요 */
applyTrains(rows) {
var st = this.state || {}, route = this._route;
if (!route || st.mode !== 'ride' || !rows) return;
var last = route.length - 1, i = Math.min(st.i || 0, last);
if (i >= last) return;
if (!st.boarded) { this.watchBoarding(rows, route, i); return; }
var L = route[i + 1].l, lo = i, hi = i + 1;
while (lo > 0 && route[lo].l === L) lo--;
while (hi < last && route[hi + 1].l === L) hi++;
var idxOf = function (name) { var nn = stnNorm(name); for (var k = lo; k <= hi; k++) if (stnNorm(route[k].n) === nn) return k; return -1; };
/* 열차 상태: 0 진입, 1 도착, 2 출발, 3 전역 출발 */
var posOf = function (r) {
var k = idxOf(r.stn); if (k < 0) return null;
var s = String(r.st), p = s === '0' ? k - 0.2 : s === '1' ? k : s === '2' ? k + 0.05 : k - 0.8;
/* 정보 생성 시각과 지금의 차이만큼 열차가 더 갔다고 보정해요 (다음 역은 넘지 않게) */
var lag = r.t ? (Date.now() - new Date(String(r.t).replace(' ', 'T') + '+09:00').getTime()) / 1000 : 0;
if (lag > 5 && lag < 600) p = Math.min(Math.floor(p + 1) - 0.08, p + lag / 110);
return p;
};
var dirOk = function (r) {
var cs = NET[L].chains;
for (var c = 0; c < cs.length; c++) {
var s = cs[c].s, a = s.indexOf(route[i].n), b = s.indexOf(route[i + 1].n), tq = -1, sq = -1;
if (a < 0 || b < 0) continue;
for (var q = 0; q < s.length; q++) { if (stnNorm(s[q]) === stnNorm(r.term)) tq = q; if (stnNorm(s[q]) === stnNorm(r.stn)) sq = q; }
if (cs[c].loop || tq < 0 || sq < 0) return true;
return (b - a) * (tq - sq) > 0;
}
return true;
};
var cur = i + (st.f || 0), patch = null;
if (st.trainNo) {
var mine = null;
rows.forEach(function (r) { if (String(r.no) === String(st.trainNo)) mine = r; });
var mp = mine ? posOf(mine) : null;
if (mp === null) { patch = { trainMiss: (st.trainMiss || 0) + 1 }; if (patch.trainMiss >= 4) patch.trainNo = null; }
else if (mp >= cur - 0.3) patch = { trainT: Date.now(), trainMiss: 0, i: Math.max(0, Math.floor(mp)), f: mp - Math.floor(mp) };
else patch = { trainT: Date.now(), trainMiss: 0 };
} else {
var best = null;
rows.forEach(function (r) { var p = posOf(r); if (p === null || !dirOk(r)) return; var d = Math.abs(p - cur); if (d <= 0.75 && (!best || d < best.d)) best = { r: r, p: p, d: d }; });
if (best) patch = { trainNo: String(best.r.no), trainT: Date.now(), trainMiss: 0, i: Math.max(0, Math.floor(Math.max(best.p, cur - 0.1))), f: Math.max(best.p, cur - 0.1) - Math.floor(Math.max(best.p, cur - 0.1)) };
}
if (patch) {
if (patch.i !== undefined && patch.i >= last) { patch.i = last; patch.f = 0; }
var txT = xferAfter(route, i);
if (patch.i !== undefined && txT >= 0 && patch.i + (patch.f || 0) >= txT) { patch.i = txT; patch.f = 0; patch.boarded = false; patch.trainNo = null; }
this._acc = 0; this.setState(patch);
}
}
/* 탑승 대기 중: 내가 기다리는 역에 내 방향 열차가 들어왔다가 떠나면 그 열차에 탄 걸로 봐요 */
watchBoarding(rows, route, i) {
var st = this.state || {}, now = Date.now(), S = stnNorm(route[i].n), N = stnNorm(route[i + 1].n), L = route[i + 1].l;
var cs = NET[L].chains, w = this._bw || (this._bw = { t0: now, seen: {} });
if (w.at !== route[i].n + '|' + L) { this._bw = w = { t0: now, seen: {}, at: route[i].n + '|' + L }; }
var dirOk = function (r) {
for (var c = 0; c < cs.length; c++) {
var s = cs[c].s, a = -1, b = -1, tq = -1;
for (var q = 0; q < s.length; q++) { var nq = stnNorm(s[q]); if (nq === S) a = q; if (nq === N) b = q; if (nq === stnNorm(r.term)) tq = q; }
if (a < 0 || b < 0) continue;
if (cs[c].loop || tq < 0) return true;
return (b - a) * (tq - a) > 0;
}
return false;
};
var hit = null;
rows.forEach(function (r) {
if (!dirOk(r)) return;
var at = stnNorm(r.stn), code = String(r.st), no = String(r.no);
if (at === S && (code === '0' || code === '1')) { if (!w.seen[no]) w.seen[no] = now; }
/* 떠남: 우리 역에서 출발(2)했거나, 다음 역으로 넘어감(다음 역 진입·도착·전역출발) */
var gone = (at === S && code === '2') || (at === N && (code === '0' || code === '1' || code === '3'));
if (gone && (w.seen[no] || now - w.t0 > 45000) && !hit) hit = { no: no, p: at === S ? 0.1 : (code === '3' ? 0.3 : code === '0' ? 0.8 : 0.95) };
});
if (!hit) return;
this._bw = null; this._acc = 0;
this.setState({ boarded: true, playing: true, trainNo: hit.no, trainT: now, trainMiss: 0, i: i, f: Math.min(0.95, hit.p), boardedBy: 'train' });
}
renderVals() {
var self = this;
var G = this._G || (this._G = buildNet());
var st = this.state || {};
var TM = THEMES[this.props.tod] || THEMES.noon;
var live = !!this.props.live && !((this.state || {}).demo);
var VH = this.props.viewH || 844, compact = VH < 780;
var detected = (this.props.detected === undefined || this.props.detected === null) ? true : !!this.props.detected;
var mode = st.mode || 'confirm';
var q = (st.q || '').trim();
var prevMode = st.from || 'confirm';
var pickFor = st.pickFor || 'dest';
var geo = st.geo || null, nearName = null;
if (live && geo) {
if (!this._near || this._near.t !== geo.t) {
var bd0 = 1e9, bn0 = null;
for (var pk in G.pos) { var pp0 = G.pos[pk], ddx0 = (pp0[0] - geo.lon) * COS, ddy0 = pp0[1] - geo.lat, dd0 = ddx0 * ddx0 + ddy0 * ddy0; if (dd0 < bd0) { bd0 = dd0; bn0 = pk; } }
this._near = { t: geo.t, name: bn0 ? bn0.split('|')[0] : null, m: Math.sqrt(bd0) * 111000 };
}
if (this._near.m < 900) nearName = this._near.name;
}
var origin = st.origin || (live ? (nearName ? { n: nearName } : null) : (detected ? DETECTED : null));
var oLine = origin && origin.l !== undefined ? origin.l : null;
var dest = st.dest || null;
var route = st.route || (oLine !== null ? freeRoute(origin) : [{ n: origin ? origin.n : '', l: origin ? G.linesAt[origin.n][0] : 0, d: '' }]);
var i = Math.min(st.i || 0, route.length - 1);
var last = route.length - 1;
var frac = i < last ? Math.max(0, Math.min(0.999, st.f || 0)) : 0;
this._last = last;
var c = route[i], p = route[i - 1], n = route[i + 1], nn = route[i + 2];
var isRide = mode === 'ride';
var riding = isRide || (mode === 'pick' && prevMode === 'ride');
/* 달리는 중에 목적지를 고르면 진행 방향의 다음 역부터 길을 찾아요 (반대로 돌아가지 않게) */
var fromNext = riding && !!st.boarded && !!n && i < last && (st.f || 0) > 0.05;
var srcs = riding ? [fromNext ? n.n + '|' + n.l : c.n + '|' + c.l] : (origin ? srcsOf(G, origin) : []);
var skey = srcs.join(',');
if (!this._D || this._D.key !== skey) { this._D = dijkstra(G, srcs); this._D.key = skey; }
var D = this._D;
var here = riding ? c.n : (origin ? origin.n : '');
var clear = { q: '', from: null, pickFor: null };

var go = function (name) {
var path = pathTo(G, D, name);
if (!path) return;
var head = riding ? route.slice(0, fromNext ? i + 1 : i) : [];
self.setState(Object.assign({ mode: 'ride', dest: name, route: withDirs(head.concat(path)), i: fromNext ? i : head.length, f: fromNext ? (st.f || 0) : 0, playing: true, boarded: riding ? !!st.boarded : false, ckDone: {}, trainNo: null }, clear));
};
var setOrigin = function (name) {
self.setState(Object.assign({ mode: 'confirm', origin: { n: name }, dest: null, route: null, i: 0 }, clear));
};

/* 평소 경로: 익숙한 환승역을 거쳐 가는 길 (출발역이 평소와 같을 때만) */
var usualPath = null, usualTo = USUAL.to;
if (live) {
/* 실제 사용: 이 출발역에서 가장 자주 간 곳을 기록에서 골라요 */
var hist = this.props.hist || {}, bestN = 0;
if (origin) for (var hk in hist) { var hp = hk.split('>'); if (hp[0] === origin.n && hist[hk] > bestN && G.linesAt[hp[1]]) { bestN = hist[hk]; usualTo = hp[1]; } }
if (bestN > 0) usualPath = pathTo(G, D, usualTo);
} else if (origin && origin.n === USUAL.from) {
if (!this._usual) {
var D0 = dijkstra(G, srcsOf(G, { n: USUAL.from })), a = pathTo(G, D0, USUAL.via);
var tail = a[a.length - 1], b = pathTo(G, dijkstra(G, [tail.n + '|' + tail.l]), USUAL.to);
this._usual = withDirs(a.concat(b.slice(1)));
}
usualPath = this._usual;
}

/* 검색: 도착역 또는 출발역 */
var forOrigin = pickFor === 'origin';
var favs = (this.props.favs || []).slice();
var found = q
? G.names.filter(function (x) { return (forOrigin || x !== here) && x.indexOf(q) >= 0; })
: (function () {
/* 검색어가 없으면 별표한 역을 먼저, 그다음 기본 목록을 보여줘요 */
var base = forOrigin ? RECENT_ORIGINS : FAVORITES, seen = {}, outL = [];
favs.concat(base).forEach(function (x) { if (!seen[x] && G.linesAt[x] && (forOrigin || x !== here)) { seen[x] = 1; outL.push(x); } });
return outL;
})();
if (q) found.sort(function (a, b) { return (a.indexOf(q) - b.indexOf(q)) || (a.length - b.length); });
var total = found.length;
var picks = mode !== 'pick' ? [] : found.slice(0, 30).map(function (name) {
var o = badges(G, name), path = forOrigin ? null : pathTo(G, D, name);
o.name = name;
o.note = forOrigin
? (G.linesAt[name] || []).map(function (li) { return NET[li].name; }).join(' · ')
: (path ? summary(stats(path, 0)) : '이어지는 길이 없어요');
o.pick = function () { if (forOrigin) setOrigin(name); else go(name); };
var on = favs.indexOf(name) >= 0;
o.starFill = on ? '#F6B545' : 'none'; o.starLine = on ? '#E09A20' : 'var(--sub)';
o.starAria = on ? name + ' 별표 빼기' : name + ' 별표하기';
o.star = function () { if (self.props.onFav) self.props.onFav(name); };
return o;
});
/* 시작 화면의 별표 역 버튼: 누르면 바로 그 역으로 가는 길을 따라가요 */
var favChips = !origin ? [] : favs.filter(function (x) { return x !== here && G.linesAt[x]; }).map(function (name) {
var o = badges(G, name), path = pathTo(G, D, name), stt = path ? stats(path, 0) : null;
o.name = name; o.mins = stt ? summary(stt).split(' · ').pop() : '';
o.pick = function () { go(name); };
return o;
});
var recents = RECENT_ORIGINS.map(function (name) { var o = badges(G, name); o.name = name; o.pick = function () { setOrigin(name); }; return o; });

/* 방향 고르기 (목적지 없이, 출발역을 직접 골랐을 때) */
var dirs = origin ? dirOptions(G, origin.n).map(function (o) {
return { short: NET[o.l].short, bg: NET[o.l].color, fg: fgFor(NET[o.l].color), label: o.label,
pick: function () { self.setState(Object.assign({ mode: 'ride', origin: o, dest: null, route: null, i: 0, f: 0, playing: true }, clear)); } };
}) : [];

/* 안내 문구 */
var banner = '', bannerLabel = '안내', strong = false;
if (live && isRide && !st.boarded && i < last) { var nb = route[i + 1]; banner = c.n + '역에서 ' + NET[nb.l].name + ' ' + (nb.d || '') + ' 열차를 타세요'; bannerLabel = i > 0 ? '환승' : '탑승 대기'; strong = i > 0; }
else if (dest) {
var remain = last - i;
if (i === last) { banner = dest + ' 도착! 내려요'; strong = true; bannerLabel = '도착'; }
else if (n.l !== c.l) { banner = '지금 내려서 ' + NET[n.l].name + ' ' + n.d + (n.d.indexOf('방면') >= 0 ? '으로' : ' 열차로') + ' 갈아타요'; strong = true; bannerLabel = '환승'; }
else if (nn && nn.l !== n.l) { banner = '다음 역 ' + n.n + '에서 ' + NET[nn.l].name + ' 갈아타요'; bannerLabel = '곧 환승'; }
else if (p && p.l !== c.l) { banner = NET[c.l].name + ' ' + c.d + ', 제대로 탔어요'; bannerLabel = '환승 완료'; }
else if (remain === 2) { banner = '두 정거장 남았어요'; bannerLabel = '곧 도착'; }
else if (remain === 1) { banner = '다음 역에서 내려요'; strong = true; bannerLabel = '내릴 준비'; }
} else if (isRide) {
var others = (G.linesAt[c.n] || []).filter(function (li) { return li !== c.l; });
if (others.length) { bannerLabel = '갈아탈 수 있어요'; banner = others.map(function (li) { return NET[li].name; }).join(', '); }
}

/* 디오라마 지도: 실제 역 좌표를 화면 가득 펼친 지면에 놓고 원근 투영해요. 진행 방향이 화면 안쪽을 향해요 */
var showMap = mode === 'confirm' || isRide;
var mRoute = isRide ? route : (usualPath || (origin ? [route[0]] : []));
var mI = isRide ? i : 0;
var mDest = isRide ? !!dest : !!usualPath;
var mLast = mRoute.length - 1;
var ll = function (s) { return G.pos[s.n + '|' + s.l]; };
var TH = 52 * Math.PI / 180, SIN = Math.sin(TH), COSV = Math.cos(TH), CAM = 620, LIFT = 0;
var YFAR = 1500;
var cy = isRide ? (compact ? VH - 352 : VH - 424) : (origin ? VH - 414 : VH - 449);
this._route = route;
var mF = isRide ? frac : 0;
this._xferNext = isRide && mI + 1 < mLast && mRoute[mI + 2].l !== mRoute[mI + 1].l;
/* 카메라: 역 idx에 있을 때의 진행 방향과 배율을 구하고, 역 사이에서는 앞뒤 값을 부드럽게 섞어요 */
var camAt = function (idx, apt) {
var u = [0, 1], tgI = isRide ? Math.min(mLast, idx + 4) : mLast;
var from = apt, tg = mRoute.length > 1 ? ll(mRoute[tgI]) : null;
if (tg && tgI === idx && idx > 0) { from = ll(mRoute[idx - 1]); tg = apt; }
if (tg) { var ddx = (tg[0] - from[0]) * COS, ddy = tg[1] - from[1], dl = Math.sqrt(ddx * ddx + ddy * ddy); if (dl > 1e-6) u = [ddx / dl, ddy / dl]; }
var dg = function (pt) { var dx = (pt[0] - apt[0]) * COS, dy = pt[1] - apt[1]; return [dx * u[1] - dy * u[0], dx * u[0] + dy * u[1]]; };
var fw = 0.03, fg = [];
(isRide ? mRoute.slice(idx, idx + 6) : mRoute).forEach(function (s) { var g = dg(ll(s)); fw = Math.max(fw, g[1]); fg.push(g); });
if (!mRoute.length) fw = 0.16;
var dyT = Math.max(110, cy - 205), k0 = (dyT * CAM / (COSV * CAM - dyT * SIN)) / fw;
for (var it = 0; it < 4; it++) {
var worst = 0;
fg.forEach(function (g) { var dp = CAM + g[1] * k0 * SIN; if (dp > 200) worst = Math.max(worst, Math.abs(g[0] * k0 * CAM / dp)); });
if (worst > 150) k0 *= 150 / worst;
}
return { u: u, k: k0 };
};
var anchor = [126.99, 37.5], ux = 0, uy = 1, kk;
if (mRoute.length) {
var sA = mRoute[mI], sB = mRoute[mI + 1];
var pA = sB ? (G.pos[sA.n + '|' + sB.l] || ll(sA)) : ll(sA);
var c0 = camAt(mI, pA);
if (sB && mF > 0) {
var pB = ll(sB), c1 = camAt(mI + 1, pB), e = mF * mF * (3 - 2 * mF);
anchor = [pA[0] + (pB[0] - pA[0]) * mF, pA[1] + (pB[1] - pA[1]) * mF];
var bx = c0.u[0] + (c1.u[0] - c0.u[0]) * e, by = c0.u[1] + (c1.u[1] - c0.u[1]) * e, bl = Math.sqrt(bx * bx + by * by) || 1;
ux = bx / bl; uy = by / bl; kk = c0.k + (c1.k - c0.k) * e;
} else { anchor = pA; ux = c0.u[0]; uy = c0.u[1]; kk = c0.k; }
} else kk = camAt(0, anchor).k;
var deg = function (pt) { var dx = (pt[0] - anchor[0]) * COS, dy = pt[1] - anchor[1]; return [dx * uy - dy * ux, dx * ux + dy * uy]; };
var r1 = function (v) { return Math.round(v * 10) / 10; };
var S = function (X, Y, h) {
var depth = CAM + Y * SIN;
if (depth < 200) return null;
var s = CAM / depth;
return [r1(195 + X * s), r1(cy - Y * COSV * s - (h || 0) * SIN * s), s];
};
var GR = function (pt) { var g = deg(pt); return [g[0] * kk, g[1] * kk]; };
var P = function (pt, h) { var g = GR(pt); return S(g[0], g[1], h); };
var inSlab = function (g, m) {
if (g[1] > YFAR || g[1] < -520) return false;
var q = S(g[0], g[1], 0);
return !!q && q[0] >= -10 + m && q[0] <= 400 - m && q[1] >= 60 && q[1] <= VH + 16;
};
var poly = function (pts) { return pts.map(function (q) { return q[0] + ',' + q[1]; }).join(' '); };
var out = {};
var grid = '';
if (showMap) {
/* 지도 접힌 자국처럼 보이는 눈금: 지도와 함께 움직이도록 세계 좌표에 고정 */
var step = 160, north = ux === 0, w0 = deg([127, 37.5]);
var ox = north ? ((-(w0[0] * kk) % step) + step) % step : 0, oy = north ? ((-(w0[1] * kk) % step) + step) % step : 0;
for (var gx = -960 + ox; gx <= 960; gx += step) { var g1 = S(gx, -320, 0), g2 = S(gx, 2240, 0); grid += 'M' + g1[0] + ' ' + g1[1] + 'L' + g2[0] + ' ' + g2[1]; }
for (var gy = -320 + oy; gy <= 2240; gy += step) { var g3 = S(-1400, gy, 0), g4 = S(1400, gy, 0); grid += 'M' + g3[0] + ' ' + g3[1] + 'L' + g4[0] + ' ' + g4[1]; }
}
out.grid = grid;
/* 한강 띠 */
var river = '';
if (showMap) {
var HW = 0.0048, L = [], R = [];
RIVER.forEach(function (pt, k) {
var a = RIVER[Math.max(0, k - 1)], b = RIVER[Math.min(RIVER.length - 1, k + 1)];
var tx = (b[0] - a[0]) * COS, ty = b[1] - a[1], tl = Math.sqrt(tx * tx + ty * ty) || 1, nx = -ty / tl, ny = tx / tl;
var p1 = P([pt[0] + nx * HW / COS, pt[1] + ny * HW], 0), p2 = P([pt[0] - nx * HW / COS, pt[1] - ny * HW], 0);
if (p1 && p2) { L.push(p1); R.unshift(p2); }
});
river = poly(L.concat(R));
}
out.river = river;
NET.forEach(function (Ln, li) {
var d = '';
if (showMap) Ln.chains.forEach(function (ch) {
var pen = false, first = null, prevIn = false, prevXY = null;
for (var k = 0; k < ch.s.length; k++) {
var pt = [ch.p[k * 2] / 1e4, ch.p[k * 2 + 1] / 1e4], g = GR(pt), xy = S(g[0], g[1], 0);
if (!xy) { pen = false; prevXY = null; prevIn = false; continue; }
var near = Math.abs(g[0]) < 900 && g[1] > -400 && g[1] < 2200;
if (near || prevIn) {
if (!pen && prevXY) d += 'M' + prevXY[0] + ' ' + prevXY[1] + 'L' + xy[0] + ' ' + xy[1];
else d += (pen ? 'L' : 'M') + xy[0] + ' ' + xy[1];
pen = true;
} else pen = false;
if (k === 0) first = near ? xy : null;
prevXY = xy; prevIn = near;
}
if (ch.loop && pen && first) d += 'L' + first[0] + ' ' + first[1];
});
out['b' + li] = d;
});
var seg = function (a, b, h) {
/* a→b 구간: b가 탄 호선 기준 좌표로 잇는다 (환승역은 호선마다 좌표가 조금 달라요) */
var ga = GR(G.pos[a.n + '|' + b.l] || ll(a)), gb = GR(ll(b));
if (Math.max(Math.abs(ga[0]), Math.abs(gb[0])) > 1200 || Math.min(ga[1], gb[1]) < -500 || Math.max(ga[1], gb[1]) > 2600) return '';
var A = S(ga[0], ga[1], h), B = S(gb[0], gb[1], h);
return A && B ? 'M' + A[0] + ' ' + A[1] + 'L' + B[0] + ' ' + B[1] : '';
};
var passedLegs = [], casing = '', dots = '', legs = [], routeG = [];
if (showMap) {
for (var k = 0; k < mLast; k++) {
routeG.push([GR(ll(mRoute[k])), GR(ll(mRoute[k + 1]))]);
var sd = seg(mRoute[k], mRoute[k + 1], LIFT);
if (k === mI && mF > 0 && sd) {
/* 달리는 중인 구간: 열차가 지나온 부분은 바로 흐리게, 앞부분만 진하게 */
var tA = S(GR(G.pos[mRoute[k].n + '|' + mRoute[k + 1].l] || ll(mRoute[k]))[0], GR(G.pos[mRoute[k].n + '|' + mRoute[k + 1].l] || ll(mRoute[k]))[1], LIFT), tM = S(0, 0, LIFT), tB = S(GR(ll(mRoute[k + 1]))[0], GR(ll(mRoute[k + 1]))[1], LIFT);
if (tA && tM && tB) {
var behind = 'M' + tA[0] + ' ' + tA[1] + 'L' + tM[0] + ' ' + tM[1], pcM = NET[mRoute[k + 1].l].color;
if (passedLegs.length && passedLegs[passedLegs.length - 1].c === pcM) passedLegs[passedLegs.length - 1].d += behind; else if (passedLegs.length < 3) passedLegs.push({ d: behind, c: pcM }); else passedLegs[2].d += behind;
sd = 'M' + tM[0] + ' ' + tM[1] + 'L' + tB[0] + ' ' + tB[1];
}
}
if (k < mI) {
if (sd) { var pc0 = NET[mRoute[k + 1].l].color; if (passedLegs.length && passedLegs[passedLegs.length - 1].c === pc0) passedLegs[passedLegs.length - 1].d += sd; else if (passedLegs.length < 3) passedLegs.push({ d: sd, c: pc0 }); else passedLegs[2].d += sd; }
continue;
}
if (!sd) continue;
casing += sd;
var col = NET[mRoute[k + 1].l].color;
if (legs.length && legs[legs.length - 1].c === col) legs[legs.length - 1].d += sd;
else if (legs.length < 5) legs.push({ d: sd, c: col });
else legs[4].d += sd;
var gq = GR(ll(mRoute[k + 1]));
if (inSlab(gq, 4)) {
var top = S(gq[0], gq[1], LIFT), base = S(gq[0], gq[1], 0);
dots += 'M' + top[0] + ' ' + top[1] + 'l0.01 0';
}
}
}
for (var r = 0; r < 5; r++) out['r' + r] = legs[r] || { d: '', c: 'transparent' };
for (var r2 = 0; r2 < 3; r2++) out['pl' + r2] = passedLegs[r2] || { d: '', c: 'transparent' };
var marks = [];
var addMark = function (k, tag, tagBg, tagFg, flag) {
var s = mRoute[k], g = GR(ll(s));
if (!inSlab(g, 2)) return;
var xy = S(g[0], g[1], LIFT);
if (xy[0] < 20 || xy[0] > 370 || xy[1] < 150 || xy[1] > cy - 4) return;
marks.push({ x: Math.max(60, Math.min(330, xy[0])) + 'px', y: (xy[1] - 3) + 'px', name: s.n, tag: tag || '', tagShow: tag ? 'inline-flex' : 'none', tagBg: tagBg || 'transparent', tagFg: tagFg || 'transparent', pole: flag ? '26px' : '12px', flagShow: flag ? 'block' : 'none' });
};
if (showMap && mRoute.length > 1) {
for (var m = mI + 1; m <= mLast; m++) {
var isX = m < mLast && mRoute[m + 1].l !== mRoute[m].l;
if (m === mLast && mDest) addMark(m, '도착', '#D9482B', '#FFFFFF', true);
else if (isX) addMark(m, NET[mRoute[m + 1].l].name + ' 환승', NET[mRoute[m + 1].l].color, fgFor(NET[mRoute[m + 1].l].color), false);
else if (m === mI + 1 && isRide) addMark(m, '다음', '#E3ECF7', NAVY, false);
}
}
/* 미니어처 소품: 나무·건물은 세계 좌표 격자에 고정된 장식이에요 (실제 건물 위치가 아니에요) */
var props = [];
for (var fz = 0; fz < 160; fz++) out['f' + fz] = { d: '', c: 'transparent' };
['d', 'l', 't'].forEach(function (lv) { for (var q = 0; q < 4; q++) out['bd_' + lv + q] = { d: '', c: 'transparent' }; });
if (showMap) {
var cell = isRide ? 0.008 : 0.002 * Math.pow(2, Math.round(Math.log(88 / kk / 0.002) / Math.LN2));
var inv = function (X, Y) { var dx = (uy * X + ux * Y) / kk, dy = (-ux * X + uy * Y) / kk; return [anchor[0] + dx / COS, anchor[1] + dy]; };
var cs4 = [inv(-250, -330), inv(250, -330), inv(640, YFAR), inv(-640, YFAR)];
var lo0 = Math.min.apply(null, cs4.map(function (q) { return q[0]; })), lo1 = Math.max.apply(null, cs4.map(function (q) { return q[0]; }));
var la0 = Math.min.apply(null, cs4.map(function (q) { return q[1]; })), la1 = Math.max.apply(null, cs4.map(function (q) { return q[1]; }));
var cw = cell / COS;
var rnd = function (a, b, s) { var v = Math.sin(a * 127.1 + b * 311.7 + s * 74.7) * 43758.5453; return v - Math.floor(v); };
var segDist = function (g) {
var best = 1e9;
routeG.forEach(function (sg) {
var ax = sg[0][0], ay = sg[0][1], bx = sg[1][0], by = sg[1][1], vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy || 1;
var tt = Math.max(0, Math.min(1, ((g[0] - ax) * vx + (g[1] - ay) * vy) / l2)), ex = ax + vx * tt - g[0], ey = ay + vy * tt - g[1];
best = Math.min(best, Math.sqrt(ex * ex + ey * ey));
});
return best;
};
var nearRiver = function (pt) {
for (var k = 0; k < RIVER.length - 1; k++) {
var ax = RIVER[k][0] * COS, ay = RIVER[k][1], bx = RIVER[k + 1][0] * COS, by = RIVER[k + 1][1], px = pt[0] * COS, py = pt[1];
var vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy || 1, tt = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / l2));
var ex = ax + vx * tt - px, ey = ay + vy * tt - py;
if (Math.sqrt(ex * ex + ey * ey) < 0.0068) return true;
}
return false;
};
var GREENS = ['#7DBB42', '#5FA648', '#2F8F5B', '#8CC84B', '#F6B9CE', '#7DBB42', '#F4A9C4'], AWN = ['#F2A65A', '#F5CF5B', '#7DB7E8', '#E98A8A', '#B79AE0'];
var count = 0, blds = [];
for (var ix = Math.floor(lo0 / cw); ix <= Math.ceil(lo1 / cw) && count < 170; ix++) {
for (var iy = Math.floor(la0 / cell); iy <= Math.ceil(la1 / cell) && count < 170; iy++) {
var pick = rnd(ix, iy, 1);
if (pick > 0.55) continue;
var pt = [(ix + 0.2 + 0.6 * rnd(ix, iy, 2)) * cw, (iy + 0.2 + 0.6 * rnd(ix, iy, 3)) * cell];
var g = GR(pt);
if (!inSlab(g, 0) || segDist(g) < 34 || nearRiver(pt)) continue;
var xy = S(g[0], g[1], 0), s = xy[2], v = rnd(ix, iy, 4);
count++;
if (pick < 0.2) {
blds.push({ g: g, w: 20 + 16 * v, d: 18 + 14 * rnd(ix, iy, 9), h: 14 + 34 * rnd(ix, iy, 5), ci: Math.floor(rnd(ix, iy, 6) * 4), xy: xy });
} else {
var round = v > 0.4, tw = Math.round((round ? 17 : 14) * (0.8 + 0.5 * rnd(ix, iy, 7)) * s), gc = GREENS[Math.floor(rnd(ix, iy, 8) * GREENS.length)];
props.push({ z: g[1], sw: Math.round(26 * s) + 'px', sh: Math.round(9 * s) + 'px', sb: '-' + Math.round(3 * s) + 'px', x: xy[0] + 'px', y: xy[1] + 'px', aw: tw + 'px', ah: Math.round(tw * (round ? 1 : 1.5)) + 'px', aBg: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.35), rgba(255,255,255,0) 55%), ' + gc,
aClip: round ? 'none' : 'polygon(50% 0, 100% 100%, 0 100%)', aRad: round ? '50%' : '0',
bw: Math.max(2, Math.round(tw * 0.2)) + 'px', bh: Math.max(2, Math.round(tw * 0.3)) + 'px', bRad: '0', bBg: '#7A5230' });
}
}
}
/* 3D 모형: 꼭짓점을 지도와 같은 원근으로 투영해서 보이는 면만, 빛 방향에 따라 밝기를 달리해 그려요 */
var EYE = [0, -CAM * SIN, CAM * COSV], LD = [-0.52, -0.42, 0.74];
var EX = [uy, ux], NX = [-ux, uy];
var shade = function (hex, b) {
var ch = function (k) { return Math.max(0, Math.min(255, Math.round(parseInt(hex.substr(k, 2), 16) * b))); };
return 'rgb(' + ch(1) + ',' + ch(3) + ',' + ch(5) + ')';
};
var mkObj = function (gx, gy, m, sink) {
var o = {};
o.P = function (x, y, z) { return [gx + m * (x * EX[0] + y * NX[0]), gy + m * (x * EX[1] + y * NX[1]), m * z]; };
o.poly = function (pts, hex, opt) {
opt = opt || {};
var a0 = pts[0], a1 = pts[1], a2 = pts[2];
var e1 = [a1[0] - a0[0], a1[1] - a0[1], a1[2] - a0[2]], e2 = [a2[0] - a0[0], a2[1] - a0[1], a2[2] - a0[2]];
var n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]], nl = Math.sqrt(n[0] * n[0] + n[1] * n[1] + n[2] * n[2]) || 1;
n = [n[0] / nl, n[1] / nl, n[2] / nl];
var cx0 = 0, cy0 = 0, cz0 = 0;
pts.forEach(function (q) { cx0 += q[0]; cy0 += q[1]; cz0 += q[2]; });
cx0 /= pts.length; cy0 /= pts.length; cz0 /= pts.length;
var facing = n[0] * (EYE[0] - cx0) + n[1] * (EYE[1] - cy0) + n[2] * (EYE[2] - cz0);
if (facing <= 0) { if (!opt.both) return; n = [-n[0], -n[1], -n[2]]; }
var d = '';
for (var k = 0; k < pts.length; k++) { var w = S(pts[k][0], pts[k][1], pts[k][2]); if (!w) return; d += (k ? 'L' : 'M') + w[0] + ' ' + w[1]; }
var lit = Math.max(0, n[0] * LD[0] + n[1] * LD[1] + n[2] * LD[2]);
sink(d + 'Z', opt.flat ? hex : shade(hex, 0.6 + 0.46 * lit), n, lit);
};
o.fr = function (nSides, cx, cy, rx0, ry0, rx1, ry1, z0, z1, phase, side, top) {
var bot = [], tp = [], k;
for (k = 0; k < nSides; k++) { var a = (phase + k * 360 / nSides) * Math.PI / 180; bot.push(o.P(cx + rx0 * Math.cos(a), cy + ry0 * Math.sin(a), z0)); tp.push(o.P(cx + rx1 * Math.cos(a), cy + ry1 * Math.sin(a), z1)); }
for (k = 0; k < nSides; k++) { var k2 = (k + 1) % nSides; o.poly([bot[k], bot[k2], tp[k2], tp[k]], side); }
if (top) o.poly(tp, top);
};
o.box = function (cx, cy, w, d, z0, z1, side, top) { o.fr(4, cx, cy, w * 0.7071, d * 0.7071, w * 0.7071, d * 0.7071, z0, z1, 45, side, top); };
o.roof = function (cx, cy, w0, d0, w1, d1, z0, z1, side, top) { o.fr(4, cx, cy, w0 * 0.7071, d0 * 0.7071, w1 * 0.7071, d1 * 0.7071, z0, z1, 45, side, top); };
o.shadow = function (rx, ry) { var pts = [], k; for (k = 0; k < 12; k++) { var a = k * 30 * Math.PI / 180; pts.push(o.P(rx * 0.35 + rx * 1.25 * Math.cos(a), -ry * 0.35 + ry * 1.25 * Math.sin(a), 0)); } o.poly(pts, 'rgba(58,36,8,0.2)', { flat: true }); };
return o;
};
var MODELS = {
tower: function (o) { o.shadow(18, 18); o.fr(4, 0, 0, 16, 16, 12.5, 12.5, 0, 50, 45, '#8FBDE6'); o.fr(4, 0, 0, 12.5, 12.5, 9, 9, 50, 96, 45, '#9CC6EC'); o.fr(4, 0, 0, 9, 9, 4.2, 4.2, 96, 128, 45, '#ABD0F0'); o.fr(4, 0, 0, 4.2, 4.2, 0.6, 0.6, 128, 142, 45, '#DCEBF7', '#FFFFFF'); },
needle: function (o) { o.shadow(34, 34); o.fr(10, 0, 0, 36, 36, 22, 22, 0, 14, 0, '#5FA648'); o.fr(10, 0, 0, 22, 22, 7, 7, 14, 23, 0, '#6DB455', '#7DBB42'); o.fr(8, 0, 0, 3.4, 3.4, 2.6, 2.6, 23, 70, 0, '#EDEBE6'); o.fr(8, 0, 0, 3.6, 3.6, 9.5, 9.5, 70, 76, 0, '#DAD7D0'); o.fr(8, 0, 0, 9.5, 9.5, 9.5, 9.5, 76, 82, 0, '#F7F5F0'); o.fr(8, 0, 0, 9.5, 9.5, 3.6, 3.6, 82, 86, 0, '#E4E1DA', '#F7F5F0'); o.fr(4, 0, 0, 2.1, 2.1, 1.2, 1.2, 86, 104, 45, '#D9482B'); o.fr(4, 0, 0, 1.2, 1.2, 0.4, 0.4, 104, 122, 45, '#F7F5F0', '#FFFFFF'); },
palace: function (o) { o.shadow(40, 28); o.box(0, 0, 76, 50, 0, 5, '#D9D2C3', '#E9E3D6'); o.box(0, 0, 54, 30, 5, 18, '#B5443A'); o.roof(0, 0, 70, 46, 44, 22, 18, 27, '#4A5561', '#5B6672'); o.box(0, 0, 36, 18, 27, 34, '#B5443A'); o.roof(0, 0, 54, 34, 10, 3, 34, 47, '#4A5561', '#6A7682'); },
gate: function (o) { o.shadow(28, 18); o.box(0, 0, 48, 26, 0, 14, '#C9C2B4', '#DAD4C8'); o.poly([o.P(-6, -13.1, 0), o.P(6, -13.1, 0), o.P(6, -13.1, 10), o.P(-6, -13.1, 10)], '#3A2B1F', { flat: true }); o.box(0, 0, 34, 15, 14, 21, '#B5443A'); o.roof(0, 0, 48, 27, 8, 3, 21, 32, '#4A5561', '#6A7682'); },
gold: function (o) { o.shadow(16, 12); o.fr(4, 0, 0, 16, 10.5, 11.5, 7.5, 0, 98, 45, '#E3B95E', '#F8E4AE'); },
dome: function (o) { o.shadow(38, 22); o.box(0, 0, 66, 34, 0, 14, '#F1EDE4'); o.box(0, 0, 70, 38, 14, 17, '#FFFFFF', '#FFFFFF'); o.fr(10, 0, 0, 12, 12, 12, 12, 17, 22, 0, '#DAD5CA'); o.fr(10, 0, 0, 12, 12, 9, 9, 22, 28, 0, '#8FB3A8'); o.fr(10, 0, 0, 9, 9, 4, 4, 28, 32, 0, '#9DBFB4', '#A9C9BE'); },
blob: function (o) { o.shadow(34, 20); o.fr(12, 0, 0, 36, 21, 32, 18, 0, 7, 0, '#D3D9E0'); o.fr(12, 0, 0, 32, 18, 15, 8, 7, 13, 0, '#E6EAEE', '#F6F8FA'); },
wing: function (o) { o.shadow(30, 12); o.box(-10, 0, 8, 8, 0, 22, '#EDE7DA', '#F6F2E8'); o.box(10, 0, 8, 8, 0, 22, '#EDE7DA', '#F6F2E8'); o.poly([o.P(-38, -8, 36), o.P(-1, -8, 22), o.P(-1, 8, 22), o.P(-38, 8, 36)], '#E8743B', { both: true }); o.poly([o.P(1, -8, 22), o.P(38, -8, 36), o.P(38, 8, 36), o.P(1, 8, 22)], '#3E7FB8', { both: true }); },
stadium: function (o) { o.shadow(40, 28); o.fr(14, 0, 0, 37, 27, 41, 30, 0, 12, 0, '#C9D1DA', '#EEF1F4'); var f = [], k; for (k = 0; k < 14; k++) { var a = k * 360 / 14 * Math.PI / 180; f.push(o.P(22 * Math.cos(a), 14 * Math.sin(a), 12.2)); } o.poly(f, '#69B35A', { flat: true }); },
hat: function (o) { o.shadow(32, 24); o.box(0, 0, 58, 40, 0, 10, '#D8CBB0', '#E4D9C2'); o.fr(12, 0, 0, 24, 24, 21, 21, 10, 13, 0, '#BFAF8E'); o.fr(12, 0, 0, 21, 21, 6, 6, 13, 22, 0, '#CDBE9F', '#DDD0B4'); },
block: function (o) { o.shadow(34, 20); o.box(0, 0, 60, 34, 0, 18, '#7FAAD3', '#E9EEF3'); o.box(-8, 0, 30, 20, 18, 28, '#93B9DD', '#F4F7FA'); }
};
var lmFaces = [], lmLightPts = [];
var lmList = [];
LANDMARKS.forEach(function (lm) {
var g = GR(lm.at);
if (g[1] > 6000 || g[1] < -300) return;
var xy = S(g[0], g[1], 0);
if (!xy || xy[0] < -20 || xy[0] > 410 || xy[1] < 152 || xy[1] > VH + 36) return;
lmList.push({ lm: lm, g: g, xy: xy });
});
lmList.sort(function (a, b) { return b.g[1] - a.g[1]; });
lmList.forEach(function (it) {
var m = Math.max(1.45, 0.5 / it.xy[2]);
if (lmFaces.length > 150) return;
var o = mkObj(it.g[0], it.g[1], m, function (d, c) { lmFaces.push({ d: d, c: c }); });
MODELS[it.lm.kind](o);
var tip = S(it.g[0], it.g[1], m * ({ tower: 110, needle: 80, gold: 80 }[it.lm.kind] || 16));
if (tip) lmLightPts.push({ x: tip[0] + 'px', y: tip[1] + 'px', s: '5px' });
});
/* 같은 색이 이어지는 면은 한 칸에 묶어 그려요 */
var slots = [];
lmFaces.forEach(function (f) { var lastS = slots[slots.length - 1]; if (lastS && lastS.c === f.c) lastS.d += f.d; else slots.push({ d: f.d, c: f.c }); });
for (var fs = 0; fs < 160; fs++) out['f' + fs] = slots[fs] || { d: '', c: 'transparent' };
/* 일반 건물: 색·밝기별로 묶어서 옆면 먼저, 지붕 나중에 */
var BCOL = ['#EDE8DE', '#F3E3C6', '#DCE8F2', '#F2D9D2'], bq = {};
['d', 'l', 't'].forEach(function (lv) { for (var q = 0; q < 4; q++) bq[lv + q] = ''; });
var bLights = [];
blds.sort(function (a, b) { return b.g[1] - a.g[1]; });
blds.forEach(function (bd) {
var o = mkObj(bd.g[0], bd.g[1], 1, function (d, c, n, lit) { bq[(n[2] > 0.9 ? 't' : (lit > 0.18 ? 'l' : 'd')) + bd.ci] += d; });
o.box(0, 0, bd.w, bd.d, 0, bd.h, BCOL[bd.ci], '#FFFFFF');
var mid = S(bd.g[0], bd.g[1], bd.h * 0.5);
if (mid && bLights.length < 50) bLights.push({ x: mid[0] + 'px', y: mid[1] + 'px', s: '3px' });
});
var bShade = { d: 0.72, l: 0.92, t: 1.06 };
['d', 'l', 't'].forEach(function (lv) { for (var q = 0; q < 4; q++) out['bd_' + lv + q] = { d: bq[lv + q], c: lv === 't' ? '#FFFFFF' : shade(BCOL[q], bShade[lv]) }; });
props.sort(function (a, b) { return b.z - a.z; });
}
var patches = [];
if (showMap) {
var pc = cell * 4, pcw = pc / COS, PCOL = ['#DDE9C3', '#E4EDCB', '#D5E6BE'];
for (var jx = Math.floor(lo0 / pcw) - 1; jx <= Math.ceil(lo1 / pcw) + 1; jx++) for (var jy = Math.floor(la0 / pc) - 1; jy <= Math.ceil(la1 / pc) + 1; jy++) {
if (rnd(jx, jy, 11) > 0.45 || patches.length >= 26) continue;
var pp = [(jx + rnd(jx, jy, 12)) * pcw, (jy + rnd(jx, jy, 13)) * pc];
if (nearRiver(pp)) continue;
var pg = GR(pp);
if (pg[1] > YFAR || pg[1] < -500) continue;
var pq = S(pg[0], pg[1], 0);
if (!pq || pq[0] < -120 || pq[0] > 510) continue;
var pr = (90 + 120 * rnd(jx, jy, 14)) * pq[2];
patches.push({ x: pq[0] + 'px', y: pq[1] + 'px', w: Math.round(pr * 2) + 'px', h: Math.round(pr * 2 * COSV * (0.6 + 0.5 * rnd(jx, jy, 15))) + 'px', c: PCOL[Math.floor(rnd(jx, jy, 16) * 3)] });
}
}
out.patches = patches;
out.trees = props;
out.lmLights = showMap && TM.night ? lmLightPts : [];
out.lights = showMap && TM.night ? bLights : [];
out.lmLabels = [];  /* 명소는 그림만 보여주고 이름표는 달지 않아요 */
out.th = TM;
var stopTags = [], dotsP = '';
if (showMap && mRoute.length > 1) {
var taken = marks.map(function (mk) { return mk.name; }), placed = [];
for (var sk = 0; sk <= mLast; sk++) {
var sg = GR(ll(mRoute[sk]));
if (!inSlab(sg, 0)) continue;
var sq = S(sg[0], sg[1], LIFT);
if (sk <= mI) dotsP += 'M' + sq[0] + ' ' + sq[1] + 'l0.01 0';
if (taken.indexOf(mRoute[sk].n) >= 0 || sq[0] < 30 || sq[0] > 360 || sq[1] < 160 || sq[1] > VH - 44) continue;
if (sk === mI && !mF) continue;
var clash = placed.some(function (q) { return Math.abs(q[1] - sq[1]) < 15 && Math.abs(q[0] - sq[0]) < 64; });
if (clash) continue;
placed.push(sq);
stopTags.push({ x: sq[0] + 'px', y: (sq[1] + 8) + 'px', name: mRoute[sk].n, op: sk <= mI ? 0.5 : 0.85 });
}
}
out.stopTags = stopTags; out.dotsP = dotsP;
var hereGr = mRoute.length ? S(0, 0, 0) : null, hereO = mRoute.length ? S(0, 0, LIFT) : null;

var cs = dest ? stats(route, i) : null;
var ob = origin ? (oLine !== null ? { b1: badge(oLine), b2: NOBADGE, b3: NOBADGE } : badges(G, origin.n)) : { b1: NOBADGE, b2: NOBADGE, b3: NOBADGE };
out.isConfirm = mode === 'confirm';
out.isPick = mode === 'pick';
out.isDir = mode === 'dir';
out.isRide = isRide;
out.showMap = showMap;
out.casing = casing; out.dots = dots; out.marks = marks;
out.hasHere = showMap && !!hereGr && !!hereO;
/* 행선판은 내 목적지가 아니라 지금 탄 열차의 종착역(방면)을 보여줘요 */
var signStop = isRide ? c : (mRoute.length ? mRoute[0] : null);
var signName = signStop && signStop.d ? signStop.d.replace(' 방면', '') : (oLine !== null && origin ? chainDir(NET[oLine].chains[origin.ci], !origin.toFirst).replace(' 방면', '') : '');
out.signText = signName.length > 6 ? signName.slice(0, 6) : signName;
/* 3D 전동차: 선로 방향으로 놓인 상자를 같은 원근으로 투영해서 보이는 면만 그려요 */
var tr = { shadow: '', top: '', sideL: '', sideR: '', endF: '', endR: '', stripeL: '', stripeR: '', winL: '', winR: '', glassF: '', glassR: '', bandF: '', bandR: '', ac1: '', ac2: '', lightA: '', lightB: '' };
if (hereO) {
var fx = 0, fy = 1;
if (mRoute.length > 1) {
var fromS = mI < mLast ? mRoute[mI] : mRoute[mI - 1], toS = mI < mLast ? mRoute[mI + 1] : mRoute[mI];
var ga2 = GR(G.pos[fromS.n + '|' + toS.l] || ll(fromS)), gb2 = GR(ll(toS)), fl = Math.sqrt(Math.pow(gb2[0] - ga2[0], 2) + Math.pow(gb2[1] - ga2[1], 2));
if (fl > 1e-6) { fx = (gb2[0] - ga2[0]) / fl; fy = (gb2[1] - ga2[1]) / fl; }
}
var rx = fy, ry = -fx, TL = 74, TW = 24, THh = 26, Z0 = 3;
var pt3 = function (a, b, z) { return [rx * a * TW / 2 + fx * b * TL / 2, ry * a * TW / 2 + fy * b * TL / 2, z]; };
var pj = function (q) { var w = S(q[0], q[1], q[2]); return w ? w[0] + ',' + w[1] : ''; };
var quad = function (o, e1, e2, u0, u1, v0, v1) {
var at = function (u, v) { return [o[0] + e1[0] * u + e2[0] * v, o[1] + e1[1] * u + e2[1] * v, o[2] + e1[2] * u + e2[2] * v]; };
return [at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)].map(pj).join(' ');
};
var sub = function (a, b) { return [b[0] - a[0], b[1] - a[1], b[2] - a[2]]; };
var eye = [0, -CAM * SIN, CAM * COSV];
var vis = function (n, ctr) { return n[0] * (eye[0] - ctr[0]) + n[1] * (eye[1] - ctr[1]) + n[2] * (eye[2] - ctr[2]) > 0; };
var H1 = Z0 + THh;
tr.shadow = [pt3(-1.25, -1.05, 0), pt3(1.25, -1.05, 0), pt3(1.25, 1.05, 0), pt3(-1.25, 1.05, 0)].map(function (q) { return pj([q[0] + 6, q[1] - 5, 0]); }).join(' ');
var topO = pt3(-1, -1, H1), topE1 = sub(topO, pt3(1, -1, H1)), topE2 = sub(topO, pt3(-1, 1, H1));
tr.top = quad(topO, topE1, topE2, 0, 1, 0, 1);
tr.ac1 = quad(topO, topE1, topE2, 0.25, 0.75, 0.16, 0.4);
tr.ac2 = quad(topO, topE1, topE2, 0.25, 0.75, 0.6, 0.84);
var up = [0, 0, THh];
var side = function (sgn, kFace, kStripe, kWin) {
if (!vis([rx * sgn, ry * sgn, 0], [rx * sgn * TW / 2, ry * sgn * TW / 2, Z0 + THh / 2])) return;
var o = pt3(sgn, -1, Z0), e1 = sub(o, pt3(sgn, 1, Z0));
tr[kFace] = quad(o, e1, up, 0, 1, 0, 1);
tr[kStripe] = quad(o, e1, up, 0, 1, 0.16, 0.34);
tr[kWin] = quad(o, e1, up, 0.07, 0.93, 0.48, 0.82);
};
side(1, 'sideR', 'stripeR', 'winR'); side(-1, 'sideL', 'stripeL', 'winL');
var end = function (sgn, kFace, kGlass, kBand) {
if (!vis([fx * sgn, fy * sgn, 0], [fx * sgn * TL / 2, fy * sgn * TL / 2, Z0 + THh / 2])) return false;
var o = pt3(-1, sgn, Z0), e1 = sub(o, pt3(1, sgn, Z0));
tr[kFace] = quad(o, e1, up, 0, 1, 0, 1);
tr[kGlass] = quad(o, e1, up, 0.12, 0.88, 0.46, 0.86);
tr[kBand] = quad(o, e1, up, 0, 1, 0.16, 0.34);
tr.lightA = quad(o, e1, up, 0.1, 0.26, 0.02, 0.13);
tr.lightB = quad(o, e1, up, 0.74, 0.9, 0.02, 0.13);
return true;
};
end(1, 'endF', 'glassF', 'bandF'); end(-1, 'endR', 'glassR', 'bandR');
}
out.tr = tr;
out.here = hereGr && hereO ? { x: hereGr[0] + 'px', gy: hereGr[1] + 'px', oy: hereO[1] + 'px', c: NET[mRoute[mI].l].color } : { x: '0px', gy: '0px', oy: '0px', c: 'transparent' };
out.hasOrigin = !!origin;
out.noOrigin = !origin;
out.pillText = live ? (st.origin ? '출발역을 골랐어요' : (origin ? '지금 가장 가까운 역' : (st.geoErr ? '위치를 못 잡았어요' : '내 위치 확인 중'))) : (!origin ? '출발역을 못 찾았어요' : (st.origin ? '출발역을 골랐어요' : '방금 탑승을 감지했어요'));
out.H = VH + 'px';
/* 역 근처 알림: 앱이 켜져 있을 때, 탑승 전 화면에서 역 150m 안으로 들어오면 알려요 (멀어지면 다시 준비) */
var nm = live && geo && this._near && geo.acc < 200 ? this._near : null;
var nearOn = !!(nm && nm.m < 150 && mode === 'confirm');
out.nearStation = nearOn ? nm.name : '';
out.nearFar = !nm || nm.m > 300;
/* 현재 위치 칩: 출발역을 직접 골라도 내 위치는 따로 계속 보여줘요 */
var distTxt = nm ? (nm.m < 1000 ? Math.round(nm.m / 10) * 10 + 'm' : (nm.m / 1000).toFixed(1) + 'km') : '';
var nmAny = live && geo && this._near ? this._near : null, ageS = geo && geo.t ? Math.round((Date.now() - geo.t) / 1000) : 0;
if (live) out.pillText = nearOn ? '지금 ' + nm.name + '역 · 탈 준비하세요'
: nm ? '현재 위치 · ' + nm.name + '역에서 ' + distTxt
: nmAny && ageS < 90 ? '대략 ' + nmAny.name + '역 부근 · 오차 ' + (geo.acc < 1000 ? Math.round(geo.acc / 10) * 10 + 'm' : (geo.acc / 1000).toFixed(1) + 'km')
: nmAny ? '위치 신호 약함 · ' + Math.max(1, Math.round(ageS / 60)) + '분 전 ' + nmAny.name + '역 부근'
: (st.geoErr ? '위치를 못 잡았어요' : '현재 위치 확인 중');
out.locFg = nearOn ? 'var(--blue)' : 'var(--ink)';
var homeHeardOn = live && st.homeHeard && st.homeHeardT && Date.now() - st.homeHeardT < 300000;
var locBusy = live && !geo && !st.geoErr && !homeHeardOn;
if (homeHeardOn) out.pillText = '방송으로 확인 · ' + st.homeHeard + '역 · 다음 역을 기다려요';
if (locBusy) out.pillText = '현재 위치 찾는 중';
out.noOriginMsg = locBusy ? '위치를 찾고 있어요. 열차 안이면 같이 움직이는 열차를 찾아서 알아서 시작해요.' : '아직 위치를 못 잡았어요. 잡히면 알아서 시작해요. 급하면 출발역을 골라 주세요.';
/* 진행 표시: 위치 찾는 중엔 움직이는 막대, 같이 가는 열차를 확인하는 중엔 n/3 채워지는 막대 */
var mN = live && !homeHeardOn ? Math.min(3, st.matchN || 0) : 0, mFresh = st.matchT && Date.now() - st.matchT < 90000;
if (mN > 0 && mFresh && !nearOn) out.pillText = '같이 움직이는 열차 확인 중 · ' + mN + '/3';
out.progShow = locBusy || (mN > 0 && mFresh) ? 'block' : 'none';
out.progIndet = locBusy ? 'block' : 'none'; out.progDet = locBusy ? 'none' : 'block';
out.progW = Math.round(mN / 3 * 100) + '%';
/* 현장 테스트용 진단 줄: 마이크·위치·실시간 연결 상태를 한 줄로 보여줘요 */
var nowD = Date.now(), ago = function (t) { return t ? Math.round((nowD - t) / 1000) + '초 전' : '없음'; };
out.diag = live ? ['마이크 ' + (this.props.srOk ? (st.listening ? '듣는 중' : (st.listenOn ? '대기' : '꺼짐')) + ' ' + (st.recStarts || 0) + '회' + (st.lastErr ? ' 오류:' + st.lastErr : '') : '미지원'),
'들린 말 ' + (st.rawHeard ? '"' + st.rawHeard + '" ' + ago(st.rawT) : '없음'),
'위치 ' + (geo ? '오차 ' + Math.round(geo.acc) + 'm ' + ago(geo.t) : (st.geoErr ? '오류:' + st.geoErr : '없음')),
'실시간 ' + (this.props.rtUrl ? (st.rtErr ? '오류:' + String(st.rtErr).slice(0, 20) : '응답 ' + ago(st.rtOkT)) : '연결 안 됨')].join(' · ') : '';
out.hasDiag = !!out.diag;
out.onRefresh = function () { if (self.props.onSync) self.props.onSync(); };
out.syncAnim = st.syncing ? 'sn-spin 0.9s linear infinite' : 'none';
out.syncLabel = st.syncing ? '지금 위치 다시 확인 중' : '지금 위치 다시 확인';
out.locSpin = locBusy ? 'inline-block' : 'none'; out.locPin = locBusy ? 'none' : 'block'; out.locDots = locBusy ? 'sn-dots' : '';
var hl = !!st.homeListening;
out.hlLabel = hl ? '안내방송 듣는 중' : '안내방송으로 찾기';
out.hlDots = hl ? 'sn-dots' : ''; out.hlDot = hl ? 'inline-block' : 'none'; out.hlMic = hl ? 'none' : 'block';
out.hlFg = hl ? 'var(--blue)' : 'var(--ink)';
out.onHomeListen = function () { if (self.props.onHomeListen) self.props.onHomeListen(!hl); };
out.isLive = !!this.props.live && !st.demo && mode === 'confirm';
out.showTiles = !(dest && i === last) && !compact;
out.hello = !origin ? '어디서 타요?' : '어디까지 가요?';
out.o = origin ? {
name: origin.n, size: nameSize(origin.n, false), b1: ob.b1, b2: ob.b2, b3: ob.b3,
label: oLine !== null ? NET[oLine].name + ' · ' + chainDir(NET[oLine].chains[origin.ci], !origin.toFirst)
: (G.linesAt[origin.n] || []).map(function (li) { return NET[li].name; }).join(' · ')
} : { name: '', size: '38px', b1: NOBADGE, b2: NOBADGE, b3: NOBADGE, label: '' };
out.hasUsual = !!usualPath;
out.usualName = usualTo;
out.usualSummary = usualPath ? summary(stats(usualPath, 0)) : '';
out.recents = recents;
out.favChips = favChips; out.hasFavs = favChips.length > 0;
out.pickTitle = forOrigin ? '어디서 타요?' : '어디까지 가요?';
out.dirs = dirs;
out.dirSub = origin ? origin.n + (origin.n.slice(-1) === '역' ? '' : '역') + '에서 탄 열차를 골라 주세요' : '';
out.c = { name: c.n, short: NET[c.l].short, bg: NET[c.l].color, fg: fgFor(NET[c.l].color), label: NET[c.l].name + (c.d ? ' · ' + c.d : '') };
out.nameSize = nameSize(c.n, true);
out.prev = p ? p.n : '출발역';
out.next = n ? n.n : (dest ? '도착' : '종착역');
var freeLive = live && isRide && !dest;
out.headKicker = freeLive ? (st.auto ? '지하철 탔네요!' : '지금 역 보는 중') : (dest ? '가는 중' : '둘러보는 중') + ' · ' + TM.kicker;
out.isFreeRide = isRide && !dest;
out.rideFavs = isRide && !dest && favChips.length > 0;
var playing = st.playing !== false;
var waiting = live && isRide && !st.boarded;
/* 안내방송 듣기: 탑승 직후 첫 구간, 환승 후 첫 구간, 내리기 전 구간에만 잠깐 들어요 */
var ckDone = st.ckDone || {}, listenCk = '', listenMax = 0;
if (live && isRide && st.listenOn && i < last) {
var isLegStart = i === 0 || route[i + 1].l !== route[i].l;
if (isLegStart && (st.boarded || i > 0) && !ckDone['leg' + i]) { listenCk = 'leg' + i; listenMax = i > 0 ? 300 : 150; }
else if (i === last - 1 && st.boarded && !ckDone.dest) { listenCk = 'dest'; listenMax = 150; }
/* 실시간 열차로 확실히 따라가는 중이 아니면 계속 들어요 (위치가 제일 중요하니까) */
/* 실시간 열차로 못 따라가는 중이면, 방송을 마지막으로 들은 지 4분이 지났을 때만 다시 들어요 (계속 켜 두지 않게) */
else if (st.boarded && !(st.trainNo && st.trainT && Date.now() - st.trainT < 90000) && !(st.heardT && Date.now() - st.heardT < 240000)) { listenCk = 'live'; listenMax = 86400; }
}
out.listenCk = listenCk; out.listenMax = listenMax;
out.isLiveRide = live && isRide;
out.listenBg = st.listenOn ? '#1F3A5F' : 'var(--tile)';
out.listenFg = st.listenOn ? '#FFFFFF' : 'var(--ink)';
out.listenAria = st.listenOn ? '안내방송 듣기 끄기' : '안내방송 듣기 켜기';
out.listenDot = st.listening ? 'block' : 'none';
out.onListen = function () {
if (st.listenOn && st.listenErr && listenCk && st.listenErr !== 'unsupported') { self.setState({ listenErr: null }); if (self.props.onListenRetry) self.props.onListenRetry(listenCk); return; }
var on = !st.listenOn; self.setState({ listenOn: on }); if (self.props.onListenToggle) self.props.onListenToggle(on); };
out.hereTag = waiting ? '탑승 전' : (frac > 0 ? '달리는 중' : (i >= last ? '도착' : '정차 중'));
out.playLabel = i >= last ? '도착했어요' : waiting ? '열차 탔어요' : (live ? (playing ? '시간 추정 끄기' : '시간으로 추정하기') : (playing ? '잠깐 멈추기' : '자동으로 달리기'));
out.resetLabel = live || st.demo ? '종료' : '처음부터';
/* 실제로 따라가는 중엔 '시간 추정' 버튼을 숨기고 다음 역 버튼을 넓혀요 */
var hideToggle = (live && !waiting && i < last) || (!!st.demo && i < last);
out.toggleDisp = hideToggle ? 'none' : 'flex';
out.nextGrow = hideToggle ? 1 : 0;
var fixAge = st.fixT ? Math.round((Date.now() - st.fixT) / 1000) : null;
var nowT = Date.now(), tail = st.listening ? ' · 안내방송 듣는 중' : (listenCk && st.listenErr === 'unsupported' ? ' · 이 브라우저는 음성인식을 못 써요' : (listenCk && st.listenErr ? ' · 마이크 버튼을 눌러 방송 듣기를 다시 켜 주세요' : ''));
out.footNote = (waiting
? (i > 0 ? '갈아탈 열차를 타면 알아서 다시 따라가요. 안 되면 \'열차 탔어요\'를 눌러 주세요' : '아직 탑승 전이에요. 열차에 타면 \'열차 탔어요\'를 눌러 주세요. 움직임이 잡히면 알아서 시작해요')
: !live ? (st.demo ? '데모예요. 종료를 누르면 내 위치로 돌아가요' : '시안용 조작이에요. 실제 앱은 열차를 따라 알아서 움직여요')
: st.heardT && nowT - st.heardT < 25000 ? '안내방송으로 확인했어요: ' + st.heardName
: st.trainNo && st.trainT && nowT - st.trainT < 60000 ? st.trainNo + '번 열차를 실시간으로 따라가는 중 (서울특별시 공공데이터)'
: fixAge !== null && fixAge < 25 ? '위치로 따라가는 중' + (geo ? ' (오차 약 ' + Math.round(geo.acc) + 'm)' : '')
: playing ? '위치 신호가 없어서 시간으로 추정 중이에요. 틀리면 다음 역을 눌러 주세요' : '위치 신호가 없어요. 다음 역을 눌러 맞춰 주세요') + tail;
out.onDemo = function () {
var D0 = dijkstra(G, srcsOf(G, { n: USUAL.from })), a = pathTo(G, D0, USUAL.via), tail = a[a.length - 1], b = pathTo(G, dijkstra(G, [tail.n + '|' + tail.l]), USUAL.to);
self.setState(Object.assign({ demo: true, mode: 'ride', origin: DETECTED, dest: USUAL.to, route: withDirs(a.concat(b.slice(1))), i: 0, f: 0, playing: true }, clear));
};
out.onToggle = function () { if (waiting) { self._lastT = 0; self.setState({ boarded: true, playing: true }); } else self.setState({ playing: !playing }); };
out.headTitle = dest ? (route && route.length ? route[0].n + ' → ' : '') + dest : '어디 가요?';
out.headSub = dest ? (i === last ? '다 왔어요' : summary(cs)) : NET[c.l].name + (c.d ? ' · ' + c.d : '') + ' · 골라 주면 내릴 역도 알려줘요';
out.pickLabel = dest ? '바꾸기' : '검색';
out.hasBanner = !!banner;
out.banner = banner;
out.bannerLabel = bannerLabel;
out.bannerBg = strong ? '#F6B545' : (TM.night ? 'rgba(40,48,92,0.82)' : 'rgba(255,255,255,0.72)');
out.bannerLine = strong ? '#FFE3A6' : TM.card_line;
out.bannerFg = strong ? '#2B2118' : TM.ink;
out.bannerGlow = (strong ? '0 0 22px rgba(246,181,69,0.75), ' : '') + '0 14px 26px rgba(90,58,20,0.25), inset 0 1px 0 rgba(255,255,255,0.8)';
out.bannerSub = strong ? '#2B2118' : TM.blue;
out.isArrived = !!dest && i === last;
out.notArrived = !(dest && i === last);
out.atEnd = i >= last;
out.nextOpacity = i >= last ? 0.4 : 1;
out.picks = picks;
out.q = st.q || '';
out.listLabel = q ? '검색 결과 ' + total + '개' + (total > 30 ? ' · 30개만 보여줘요' : '') : (forOrigin ? '자주 타는 역' : '자주 가는 역');
out.noResult = mode === 'pick' && total === 0;
out.onQ = function (e) { self.setState({ q: e.target.value }); };
out.onBack = function () { self.setState(Object.assign({ mode: prevMode === 'pick' || prevMode === 'dir' ? 'confirm' : prevMode }, clear)); };
out.onUsual = function () { if (usualPath) self.setState(Object.assign({ mode: 'ride', dest: usualTo, route: usualPath, i: 0, f: 0, playing: true, boarded: false, ckDone: {}, trainNo: null }, clear)); };
out.onFree = function () {
if (oLine !== null) self.setState(Object.assign({ mode: 'ride', dest: null, route: null, i: 0, f: 0, playing: true }, clear));
else self.setState({ mode: 'dir', from: 'confirm' });
};
out.onPick = function () { self.setState({ mode: 'pick', from: mode, pickFor: 'dest', q: '' }); };
out.onPickOrigin = function () { self.setState({ mode: 'pick', from: 'confirm', pickFor: 'origin', q: '' }); };
out.onNext = function () { self._dwell = 0; var tx2 = live ? xferAfter(route, i) : -1; self.setState({ i: Math.min(i + 1, last), f: 0, playing: live || !!st.demo, boarded: live ? !(tx2 === i + 1) : st.boarded, trainNo: null }); };
out.onReset = function () { if (live && st.mode === 'ride') { self._autoOff = Date.now(); self._trail = []; } self.setState(Object.assign({ mode: 'confirm', origin: null, dest: null, route: null, i: 0, f: 0, demo: false, fixT: null, boarded: false, ckDone: {}, trainNo: null, heardT: null }, clear)); };
return out;
}
}
