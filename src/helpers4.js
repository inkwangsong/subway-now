/* 노선 데이터: © OpenStreetMap contributors (ODbL), kimmdr2/metroscope의 network.json에서 역 이름과 순서만 추림 */
var NET = __NET__;
var DETECTED = { n: '신흥', l: 7, ci: 0, toFirst: true };
var USUAL = { from: '신흥', to: '고속터미널', via: '가락시장' };
var FAVORITES = ['고속터미널', '잠실', '양재'];
var RECENT_ORIGINS = ['신흥', '고속터미널'];
var HOP = 2, XFER = 5;
/* 걸리는 시간 추정: 역 사이 = 정차·가감속 0.5분 + 거리 ÷ 노선 평균 속도(km/분)
   갈아타기 = 걸어서 4분 + 갈아탈 노선 배차 간격의 절반만큼 기다림 */
var LINE_SPEED = { '2호선': 0.7, '8호선': 0.7, '수인분당선': 0.68, '신분당선': 1.3, 'GTX-A': 2.0, '경의중앙선': 0.9, '경춘선': 1.0, '공항철도': 1.1, '서해선': 1.0, '경강선': 1.0, '1호선': 0.8, '9호선': 0.8 };
var LINE_GAP = { '2호선': 4, '8호선': 6, '9호선': 6, '수인분당선': 9, '신분당선': 6, 'GTX-A': 10, '경의중앙선': 13, '경춘선': 15, '공항철도': 8, '서해선': 12, '경강선': 10, '1호선': 6, '우이신설선': 5, '신림선': 5, '김포골드라인': 4, '의정부경전철': 6, '용인에버라인': 7 };
var NETPOS = null;
function hopMin(li, a, b) {
var pa = NETPOS && NETPOS[a + '|' + li], pb = NETPOS && NETPOS[b + '|' + li];
if (!pa || !pb) return HOP;
var km = Math.sqrt(Math.pow((pa[0] - pb[0]) * 0.7934, 2) + Math.pow(pa[1] - pb[1], 2)) * 111;
return 0.5 + km / (LINE_SPEED[NET[li].name] || 0.75);
}
function xferMin(toLi) { return 4 + (LINE_GAP[NET[toLi].name] || 5) / 2; }
var INK = '#2B2118';
var NAVY = '#1F3A5F', BLUE = '#1F5FA8';
/* 한강: 다리 위치를 따라 손으로 찍은 대략적인 중심선 (장식용) */
var RIVER = [[127.279,37.526],[127.235,37.57],[127.2,37.583],[127.165,37.578],[127.137,37.571],[127.1165,37.5445],[127.099,37.528],[127.086,37.5225],[127.075,37.521],[127.062,37.526],[127.04,37.532],[127.021,37.535],[127.0135,37.5275],[126.996,37.5155],[126.981,37.512],[126.958,37.5175],[126.943,37.526],[126.936,37.5335],[126.925,37.539],[126.9,37.543],[126.891,37.552],[126.865,37.571],[126.825,37.588],[126.78,37.61]];
/* 서울 명소 자리에 세우는 단순한 미니어처 (위치는 실제 좌표 근처, 모양은 장식) */
var LANDMARKS = [
{ kind: 'tower', name: '롯데월드타워', at: [127.1026, 37.5126] },
{ kind: 'needle', name: 'N서울타워', at: [126.9882, 37.5512] },
{ kind: 'palace', name: '경복궁', at: [126.977, 37.5796] },
{ kind: 'gate', name: '숭례문', at: [126.9753, 37.56] },
{ kind: 'gold', name: '63빌딩', at: [126.9403, 37.5198] },
{ kind: 'dome', name: '국회의사당', at: [126.9141, 37.5319] },
{ kind: 'blob', name: 'DDP', at: [127.0094, 37.5665] },
{ kind: 'blob', name: '세빛섬', at: [126.995, 37.5118] },
{ kind: 'wing', name: '올림픽공원', at: [127.1159, 37.5194] },
{ kind: 'stadium', name: '잠실종합운동장', at: [127.073, 37.5148] },
{ kind: 'stadium', name: '월드컵경기장', at: [126.8973, 37.5683] },
{ kind: 'hat', name: '예술의전당', at: [127.0119, 37.4788] },
{ kind: 'block', name: '코엑스', at: [127.059, 37.5116] },
{ kind: 'gate', name: '남한산성', at: [127.181, 37.479] }
];
var THEMES = {
morning: { ink: '#2B2118', sub: '#6B5B49', title: '#1F3A5F', blue: '#1F5FA8',
card: 'linear-gradient(160deg, rgba(255,255,255,0.84), rgba(255,246,240,0.6))', card_line: 'rgba(255,255,255,0.95)', card_shadow: '0 16px 30px rgba(120,60,40,0.22), inset 0 1px 0 #FFFFFF',
tile: 'rgba(43,33,24,0.07)', row: 'rgba(255,255,255,0.8)', row_shadow: '0 8px 16px rgba(120,60,40,0.14)', field: 'rgba(255,255,255,0.88)',
land: 'linear-gradient(180deg, #FBEDE6 0%, #F6E7D8 100%)', haze0: 'rgba(255,226,214,1)', hazeM: 'rgba(255,226,214,0.8)', hazeT: 'rgba(255,226,214,0)',
sun: 'radial-gradient(ellipse 340px 300px at 92% 2%, rgba(255,178,140,0.75), rgba(255,178,140,0) 70%)',
river: '#A9D6E8', river_edge: '#E6F5FA', grid: 'rgba(184,150,124,0.36)', tint: '#FFE9DF', lm_filter: 'none', night: false, kicker: '아침' },
noon: { ink: '#2B2118', sub: '#6B5B49', title: '#1F3A5F', blue: '#1F5FA8',
card: 'linear-gradient(160deg, rgba(255,255,255,0.82), rgba(255,255,255,0.58))', card_line: 'rgba(255,255,255,0.95)', card_shadow: '0 16px 30px rgba(90,58,20,0.24), inset 0 1px 0 #FFFFFF',
tile: 'rgba(43,33,24,0.07)', row: 'rgba(255,255,255,0.78)', row_shadow: '0 8px 16px rgba(90,58,20,0.14)', field: 'rgba(255,255,255,0.85)',
land: 'linear-gradient(180deg, #F7F1E1 0%, #F2E9D4 100%)', haze0: 'rgba(250,246,236,1)', hazeM: 'rgba(250,246,236,0.82)', hazeT: 'rgba(250,246,236,0)',
sun: 'radial-gradient(ellipse 360px 300px at 8% 4%, rgba(255,236,186,0.6), rgba(255,236,186,0) 70%)',
river: '#8ECBE2', river_edge: '#DDF2F8', grid: 'rgba(184,162,124,0.38)', tint: '#FFFFFF', lm_filter: 'none', night: false, kicker: '점심' },
evening: { ink: '#FFFFFF', sub: '#C9D0E0', title: '#FFFFFF', blue: '#9CC4FF',
card: 'linear-gradient(160deg, rgba(52,60,110,0.8), rgba(22,28,60,0.7))', card_line: 'rgba(255,255,255,0.28)', card_shadow: '0 16px 30px rgba(4,7,22,0.5), inset 0 1px 0 rgba(255,255,255,0.35)',
tile: 'rgba(255,255,255,0.12)', row: 'rgba(44,52,100,0.82)', row_shadow: '0 8px 16px rgba(4,7,22,0.35)', field: 'rgba(30,36,76,0.9)',
land: 'linear-gradient(180deg, #F7F1E1 0%, #F2E9D4 100%)', haze0: 'rgba(64,52,104,1)', hazeM: 'rgba(64,52,104,0.8)', hazeT: 'rgba(64,52,104,0)',
sun: 'radial-gradient(ellipse 420px 240px at 50% 0%, rgba(255,150,96,0.6), rgba(255,150,96,0) 70%)',
river: '#8ECBE2', river_edge: '#DDF2F8', grid: 'rgba(184,162,124,0.38)', tint: '#4B5596', lm_filter: 'brightness(0.62) saturate(0.85)', night: true, kicker: '저녁' }
};
var COS = 0.7934;

function fgFor(hex) {
var c = function (i) { var v = parseInt(hex.substr(i, 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
var L = 0.2126 * c(1) + 0.7152 * c(3) + 0.0722 * c(5);
return (1.05 / (L + 0.05)) >= 4.5 ? '#FFFFFF' : INK;
}
function buildNet() {
var adj = {}, linesAt = {}, names = [], pos = {};
var add = function (a, b, w) { (adj[a] = adj[a] || []).push({ to: b, w: w }); };
NET.forEach(function (L, li) {
L.chains.forEach(function (c) {
var s = c.s, k;
for (k = 0; k < s.length; k++) {
if (!linesAt[s[k]]) { linesAt[s[k]] = []; names.push(s[k]); }
if (linesAt[s[k]].indexOf(li) < 0) linesAt[s[k]].push(li);
pos[s[k] + '|' + li] = [c.p[k * 2] / 1e4, c.p[k * 2 + 1] / 1e4];
var nx = k + 1 < s.length ? s[k + 1] : (c.loop ? s[0] : null);
if (nx) { pos[nx + '|' + li] = pos[nx + '|' + li] || [c.p[((k + 1) % s.length) * 2] / 1e4, c.p[((k + 1) % s.length) * 2 + 1] / 1e4]; NETPOS = pos; var hw = hopMin(li, s[k], nx); add(s[k] + '|' + li, nx + '|' + li, hw); if (!c.one) add(nx + '|' + li, s[k] + '|' + li, hw); }
}
});
});
names.forEach(function (n) {
var ls = linesAt[n];
ls.forEach(function (a) { ls.forEach(function (b) { if (a !== b) add(n + '|' + a, n + '|' + b, xferMin(b)); }); });
});
names.sort();
NETPOS = pos;
return { adj: adj, linesAt: linesAt, names: names, pos: pos };
}
function dijkstra(G, srcs) {
var dist = {}, prev = {}, done = {}, open = srcs.slice();
srcs.forEach(function (s) { dist[s] = 0; });
while (open.length) {
var bi = 0, k;
for (k = 1; k < open.length; k++) if (dist[open[k]] < dist[open[bi]]) bi = k;
var u = open.splice(bi, 1)[0];
if (done[u]) continue;
done[u] = 1;
(G.adj[u] || []).forEach(function (e) {
var nd = dist[u] + e.w;
if (dist[e.to] === undefined || nd < dist[e.to]) { dist[e.to] = nd; prev[e.to] = u; open.push(e.to); }
});
}
return { dist: dist, prev: prev };
}
function chainDir(c, forward) {
var s = c.s;
if (c.loop) return forward ? (c.fw || '순환') : (c.bw || '순환');
return (forward ? s[s.length - 1] : s[0]) + ' 방면';
}
function dirOf(li, a, b) {
var cs = NET[li].chains, k;
for (k = 0; k < cs.length; k++) {
var s = cs[k].s, ia = s.indexOf(a), ib = s.indexOf(b), n = s.length;
if (ia < 0 || ib < 0) continue;
if (ib - ia === 1 || (cs[k].loop && ia === n - 1 && ib === 0)) return chainDir(cs[k], true);
if (ia - ib === 1 || (cs[k].loop && ib === n - 1 && ia === 0)) return chainDir(cs[k], false);
}
return '';
}
function withDirs(stops) {
stops.forEach(function (x, k) {
var nx = stops[k + 1], pv = stops[k - 1];
if (nx && nx.l === x.l) x.d = dirOf(x.l, x.n, nx.n);
else if (pv) x.d = dirOf(x.l, pv.n, x.n) || (pv.l === x.l ? pv.d : '');
else x.d = '';
});
return stops;
}
function pathTo(G, D, name) {
var best = null;
(G.linesAt[name] || []).forEach(function (li) { var k = name + '|' + li; if (D.dist[k] !== undefined && (best === null || D.dist[k] < D.dist[best])) best = k; });
if (best === null) return null;
var nodes = [], u = best;
while (u) { var p = u.split('|'); nodes.unshift({ n: p[0], l: +p[1] }); u = D.prev[u]; }
var stops = [];
nodes.forEach(function (x, k) { if (k > 0 && nodes[k - 1].n === x.n) return; stops.push({ n: x.n, l: x.l }); });
return withDirs(stops);
}
function srcsOf(G, o) {
if (o.l !== undefined && o.l !== null) return [o.n + '|' + o.l];
return (G.linesAt[o.n] || []).map(function (li) { return o.n + '|' + li; });
}
/* 목적지 없이 탈 때: 고른 호선·방향으로 종점(순환선은 한 바퀴)까지 */
function freeRoute(o) {
var c = NET[o.l].chains[o.ci], s = c.s, i = s.indexOf(o.n), part;
if (c.loop) { var r = s.slice(i).concat(s.slice(0, i)); part = o.toFirst ? [r[0]].concat(r.slice(1).reverse()) : r; }
else part = o.toFirst ? s.slice(0, i + 1).reverse() : s.slice(i);
var d = chainDir(c, !o.toFirst);
return part.map(function (n) { return { n: n, l: o.l, d: d }; });
}
function dirOptions(G, name) {
var out = [];
(G.linesAt[name] || []).forEach(function (li) {
NET[li].chains.forEach(function (c, ci) {
var i = c.s.indexOf(name);
if (i < 0) return;
if (c.loop || i < c.s.length - 1) out.push({ n: name, l: li, ci: ci, toFirst: false, label: NET[li].name + ' · ' + chainDir(c, true) });
if ((c.loop && !c.one) || (!c.loop && i > 0)) out.push({ n: name, l: li, ci: ci, toFirst: true, label: NET[li].name + ' · ' + chainDir(c, false) });
});
});
return out;
}
function stats(stops, from) {
var hops = stops.length - 1 - from, x = 0, k, m = 0;
for (k = from; k < stops.length - 1; k++) {
if (stops[k + 1].l !== stops[k].l) { x++; m += xferMin(stops[k + 1].l) + hopMin(stops[k + 1].l, stops[k].n, stops[k + 1].n); }
else m += hopMin(stops[k].l, stops[k].n, stops[k + 1].n);
}
return { hops: hops, x: x, min: Math.max(1, Math.round(m)) };
}
function summary(st) {
return (st.x ? '환승 ' + st.x + '번' : '환승 없이') + ' · ' + st.hops + '정거장 · 약 ' + st.min + '분';
}
function badge(li) {
var L = NET[li];
return { t: L.short, bg: L.color, fg: fgFor(L.color), show: 'inline-flex' };
}
var NOBADGE = { t: '', bg: 'transparent', fg: 'transparent', show: 'none' };
function badges(G, name) {
var ls = G.linesAt[name] || [];
return {
b1: ls[0] !== undefined ? badge(ls[0]) : NOBADGE,
b2: ls[1] !== undefined ? badge(ls[1]) : NOBADGE,
b3: ls[2] !== undefined ? badge(ls[2]) : NOBADGE,
more: ls.length > 3 ? '+' + (ls.length - 3) : ''
};
}
function nameSize(name, big) {
var len = name.length;
if (big) return len <= 5 ? '46px' : len <= 7 ? '38px' : len <= 9 ? '30px' : '24px';
return len <= 5 ? '34px' : len <= 7 ? '30px' : len <= 9 ? '26px' : '22px';
}
/* 역 이름 비교용: 괄호·'역'·띄어쓰기를 뺀 이름 */
/* 서울시 실시간 API의 역 이름 표기 차이 (예: '대모산' = 대모산입구, '응암순환(상선)' = 응암) */
var STN_ALIAS = { '대모산': '대모산입구', '응암순환': '응암', '서울': '서울역' };
function stnNorm(s) { var n = String(s || '').replace(/\(.*?\)/g, '').replace(/\s+/g, '').replace(/역$/, ''); return STN_ALIAS[n] ? STN_ALIAS[n].replace(/역$/, '') : n; }
/* i 다음에 처음 나오는 환승역 위치 (없으면 -1) */
function xferAfter(route, i) {
if (!route) return -1;
for (var k = i + 1; k < route.length - 1; k++) if (route[k + 1].l !== route[k].l) return k;
return -1;
}
