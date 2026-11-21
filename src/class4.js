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
/* 실제 주행: 역 사이를 평균 110초로 보고 시간으로 추정해요. 위치가 잡히면 그 값이 우선이에요 */
var now = Date.now(), dt = this._lastT ? (now - this._lastT) / 1000 : 0;
this._lastT = now;
this._acc = (this._acc || 0) + dt;
if (this._acc < 1) return;
/* 화면이 꺼졌다 켜져도 그동안 흐른 시간만큼 한꺼번에 나아가요 */
var total = i + (st.f || 0) + this._acc / 110; this._acc = 0;
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
var route = this._route, G = this._G;
if (st.mode === 'ride' && this.props.live && !st.demo && route && G && geo && geo.acc < 1500) {
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
if (nxt > cur - 0.15) { if (best.t > 0.96) { patch.i = best.k + 1; patch.f = 0; } else { patch.i = best.k; patch.f = best.t; } patch.fixT = Date.now(); }
}
}
this.setState(patch);
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
var srcs = riding ? [c.n + '|' + c.l] : (origin ? srcsOf(G, origin) : []);
var skey = srcs.join(',');
if (!this._D || this._D.key !== skey) { this._D = dijkstra(G, srcs); this._D.key = skey; }
var D = this._D;
var here = riding ? c.n : (origin ? origin.n : '');
var clear = { q: '', from: null, pickFor: null };

var go = function (name) {
var path = pathTo(G, D, name);
if (!path) return;
var head = riding ? route.slice(0, i) : [];
self.setState(Object.assign({ mode: 'ride', dest: name, route: head.concat(path), i: head.length, f: 0, playing: true }, clear));
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
var found = q
? G.names.filter(function (x) { return (forOrigin || x !== here) && x.indexOf(q) >= 0; })
: (forOrigin ? RECENT_ORIGINS.slice() : FAVORITES.filter(function (x) { return x !== here; }));
if (q) found.sort(function (a, b) { return (a.indexOf(q) - b.indexOf(q)) || (a.length - b.length); });
var total = found.length;
var picks = mode !== 'pick' ? [] : found.slice(0, 30).map(function (name) {
var o = badges(G, name), path = forOrigin ? null : pathTo(G, D, name);
o.name = name;
o.note = forOrigin
? (G.linesAt[name] || []).map(function (li) { return NET[li].name; }).join(' · ')
: (path ? summary(stats(path, 0)) : '이어지는 길이 없어요');
o.pick = function () { if (forOrigin) setOrigin(name); else go(name); };
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
if (dest) {
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
out.pickTitle = forOrigin ? '어디서 타요?' : '어디까지 가요?';
out.dirs = dirs;
out.dirSub = origin ? origin.n + (origin.n.slice(-1) === '역' ? '' : '역') + '에서 탄 열차를 골라 주세요' : '';
out.c = { name: c.n, short: NET[c.l].short, bg: NET[c.l].color, fg: fgFor(NET[c.l].color), label: NET[c.l].name + (c.d ? ' · ' + c.d : '') };
out.nameSize = nameSize(c.n, true);
out.prev = p ? p.n : '출발역';
out.next = n ? n.n : (dest ? '도착' : '종착역');
out.headKicker = (dest ? '가는 중' : '둘러보는 중') + ' · ' + TM.kicker;
var playing = st.playing !== false;
out.hereTag = frac > 0 ? '달리는 중' : (i >= last ? '도착' : '정차 중');
out.playLabel = i >= last ? '도착했어요' : (live ? (playing ? '시간 추정 끄기' : '시간으로 추정하기') : (playing ? '잠깐 멈추기' : '자동으로 달리기'));
out.resetLabel = live ? '종료' : '처음부터';
var fixAge = st.fixT ? Math.round((Date.now() - st.fixT) / 1000) : null;
out.footNote = live
? (fixAge !== null && fixAge < 25 ? '위치로 따라가는 중' + (geo ? ' (오차 약 ' + Math.round(geo.acc) + 'm)' : '') : (playing ? '위치 신호가 없어서 시간으로 추정 중이에요. 틀리면 다음 역을 눌러 주세요' : '위치 신호가 없어요. 다음 역을 눌러 맞춰 주세요'))
: (st.demo ? '데모예요. 종료를 누르면 내 위치로 돌아가요' : '시안용 조작이에요. 실제 앱은 열차를 따라 알아서 움직여요');
out.onDemo = function () {
var D0 = dijkstra(G, srcsOf(G, { n: USUAL.from })), a = pathTo(G, D0, USUAL.via), tail = a[a.length - 1], b = pathTo(G, dijkstra(G, [tail.n + '|' + tail.l]), USUAL.to);
self.setState(Object.assign({ demo: true, mode: 'ride', origin: DETECTED, dest: USUAL.to, route: withDirs(a.concat(b.slice(1))), i: 0, f: 0, playing: true }, clear));
};
out.onToggle = function () { self.setState({ playing: !playing }); };
out.headTitle = dest ? dest : '목적지 없이';
out.headSub = dest ? (i === last ? '다 왔어요' : summary(cs)) : '지금 역만 보여줘요';
out.pickLabel = dest ? '바꾸기' : '도착역 정하기';
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
out.onUsual = function () { if (usualPath) self.setState(Object.assign({ mode: 'ride', dest: usualTo, route: usualPath, i: 0, f: 0, playing: true }, clear)); };
out.onFree = function () {
if (oLine !== null) self.setState(Object.assign({ mode: 'ride', dest: null, route: null, i: 0, f: 0, playing: true }, clear));
else self.setState({ mode: 'dir', from: 'confirm' });
};
out.onPick = function () { self.setState({ mode: 'pick', from: mode, pickFor: 'dest', q: '' }); };
out.onPickOrigin = function () { self.setState({ mode: 'pick', from: 'confirm', pickFor: 'origin', q: '' }); };
out.onNext = function () { self._dwell = 0; self.setState({ i: Math.min(i + 1, last), f: 0, playing: false }); };
out.onReset = function () { self.setState(Object.assign({ mode: 'confirm', origin: null, dest: null, route: null, i: 0, f: 0, demo: false, fixT: null }, clear)); };
return out;
}
}
