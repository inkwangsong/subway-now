COLORS = ['#0052A4', '#00A84D', '#EF7C1C', '#00A5DE', '#996CAC', '#CD7C2F', '#747F00', '#E6186C', '#BDB092', '#77C4A3', '#0090D2', '#0C8E72', '#FABE00', '#D4003B', '#B0CE18', '#8FC31F', '#003DA5', '#6789CA', '#9A6292', '#A17800', '#FDA600', '#509F22', '#7CA8D5', '#ED8B00']

LINE = 'fill="none" stroke-linecap="round" stroke-linejoin="round"'
bg_paths = '\n'.join(f'<path d="{{{{b{i}}}}}" {LINE} stroke="{c}" stroke-opacity="0.6" stroke-width="2.4"></path>' for i, c in enumerate(COLORS))
legs_glow = '\n'.join(f'<path d="{{{{r{i}.d}}}}" {LINE} stroke="#FFF6DC" stroke-width="18"></path>' for i in range(5))
legs_core = '\n'.join(f'<path d="{{{{r{i}.d}}}}" {LINE} stroke="{{{{r{i}.c}}}}" stroke-width="7"></path>' for i in range(5))

def badges(v, size=22):
    r = size // 2
    return '\n'.join(
        f'<span style="display: {{{{{v}.b{k}.show}}}}; min-width: {size}px; height: {size}px; box-sizing: border-box; padding: 0 7px; border-radius: {r}px; background: {{{{{v}.b{k}.bg}}}}; color: {{{{{v}.b{k}.fg}}}}; font-size: 12px; font-weight: 700; align-items: center; justify-content: center">{{{{{v}.b{k}.t}}}}</span>'
        for k in (1, 2, 3))

INK = 'var(--ink)'
SUB = 'var(--sub)'
NAVY = 'var(--title)'
BLUE = 'var(--blue)'
BLUR = 'backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px)'
ACRYL = f'background: var(--card); border: 1px solid var(--card-line); box-shadow: var(--card-shadow); {BLUR}'
TILE = 'background: var(--tile); border: 0'
PRIMARY = 'background: linear-gradient(180deg, #2F5890, #1F3A5F); border: 1px solid rgba(255,255,255,0.5); box-shadow: 0 12px 24px rgba(20,36,70,0.45), inset 0 1px 0 rgba(255,255,255,0.4)'
TABLE = 'background: var(--land)'
LAYER = 'position: absolute; left: 0; top: 0'
SVG = f'aria-hidden="true" width="390" height="1000" viewBox="0 0 390 1000"'

def search_icon(color):
    return '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"></circle><line x1="16.5" y1="16.5" x2="21" y2="21"></line></svg>'

MARKUP = f'''<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>이동 중 화면</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
body{{margin:0}}
a{{color:{BLUE}}}a:hover{{color:{NAVY}}}
button{{font-family:inherit;cursor:pointer}}
input{{font-family:inherit}}
input::placeholder{{color:{SUB}}}
@keyframes sn-spin{{to{{transform:rotate(360deg)}}}}
@keyframes sn-pulse{{0%,100%{{opacity:1;transform:scale(1)}}50%{{opacity:.35;transform:scale(.7)}}}}
@keyframes sn-dots{{0%{{content:''}}25%{{content:'.'}}50%{{content:'..'}}75%{{content:'...'}}}}
.sn-dots::after{{content:'';display:inline-block;width:1.2em;text-align:left;animation:sn-dots 1.2s steps(1) infinite}}
</style>
</helmet>
<div style="position: relative; width: 390px; height: {{{{H}}}}; overflow: hidden; --ink: {{{{th.ink}}}}; --sub: {{{{th.sub}}}}; --title: {{{{th.title}}}}; --blue: {{{{th.blue}}}}; --card: {{{{th.card}}}}; --card-line: {{{{th.card_line}}}}; --card-shadow: {{{{th.card_shadow}}}}; --tile: {{{{th.tile}}}}; --row: {{{{th.row}}}}; --row-shadow: {{{{th.row_shadow}}}}; --field: {{{{th.field}}}}; --land: {{{{th.land}}}}; --haze0: {{{{th.haze0}}}}; --hazeM: {{{{th.hazeM}}}}; --hazeT: {{{{th.hazeT}}}}; --sun: {{{{th.sun}}}}; --river: {{{{th.river}}}}; --river-edge: {{{{th.river_edge}}}}; --grid: {{{{th.grid}}}}; --tint: {{{{th.tint}}}}; --lm-filter: {{{{th.lm_filter}}}}; {TABLE}; color: {INK}; font-family: 'IBM Plex Sans KR', sans-serif">

<sc-if value="{{{{ showMap }}}}" hint-placeholder-val="{{{{ true }}}}">
<div style="position: absolute; left: 0; top: 0; width: 390px; height: {{{{H}}}}; overflow: hidden">
<sc-for list="{{{{ patches }}}}" as="g" hint-placeholder-count="3">
<div style="position: absolute; left: {{{{g.x}}}}; top: {{{{g.y}}}}; width: {{{{g.w}}}}; height: {{{{g.h}}}}; transform: translate(-50%, -50%); border-radius: 50%; background: {{{{g.c}}}}"></div>
</sc-for>
<svg {SVG} style="{LAYER}">
<path d="{{{{grid}}}}" fill="none" stroke-width="1" style="stroke: var(--grid)"></path>
<polygon points="{{{{river}}}}" stroke-width="2.5" stroke-linejoin="round" style="fill: var(--river); stroke: var(--river-edge)"></polygon>
{bg_paths}
</svg>
<svg {SVG} style="{LAYER}; filter: blur(7px); opacity: 0.95">
{legs_glow}
</svg>
<svg {SVG} style="{LAYER}">
<path d="{{{{bd_d0.d}}}}" fill="{{{{bd_d0.c}}}}" stroke="#FFFFFF" stroke-opacity="0.55" stroke-width="0.6" stroke-linejoin="round"></path>
<path d="{{{{bd_d1.d}}}}" fill="{{{{bd_d1.c}}}}" stroke="#FFFFFF" stroke-opacity="0.55" stroke-width="0.6" stroke-linejoin="round"></path>
<path d="{{{{bd_d2.d}}}}" fill="{{{{bd_d2.c}}}}" stroke="#FFFFFF" stroke-opacity="0.55" stroke-width="0.6" stroke-linejoin="round"></path>
<path d="{{{{bd_d3.d}}}}" fill="{{{{bd_d3.c}}}}" stroke="#FFFFFF" stroke-opacity="0.55" stroke-width="0.6" stroke-linejoin="round"></path>
<path d="{{{{bd_l0.d}}}}" fill="{{{{bd_l0.c}}}}" stroke="#FFFFFF" stroke-opacity="0.55" stroke-width="0.6" stroke-linejoin="round"></path>
<path d="{{{{bd_l1.d}}}}" fill="{{{{bd_l1.c}}}}" stroke="#FFFFFF" stroke-opacity="0.55" stroke-width="0.6" stroke-linejoin="round"></path>
<path d="{{{{bd_l2.d}}}}" fill="{{{{bd_l2.c}}}}" stroke="#FFFFFF" stroke-opacity="0.55" stroke-width="0.6" stroke-linejoin="round"></path>
<path d="{{{{bd_l3.d}}}}" fill="{{{{bd_l3.c}}}}" stroke="#FFFFFF" stroke-opacity="0.55" stroke-width="0.6" stroke-linejoin="round"></path>
<path d="{{{{bd_t0.d}}}}" fill="{{{{bd_t0.c}}}}" stroke="#FFFFFF" stroke-opacity="0.55" stroke-width="0.6" stroke-linejoin="round"></path>
<path d="{{{{bd_t1.d}}}}" fill="{{{{bd_t1.c}}}}" stroke="#FFFFFF" stroke-opacity="0.55" stroke-width="0.6" stroke-linejoin="round"></path>
<path d="{{{{bd_t2.d}}}}" fill="{{{{bd_t2.c}}}}" stroke="#FFFFFF" stroke-opacity="0.55" stroke-width="0.6" stroke-linejoin="round"></path>
<path d="{{{{bd_t3.d}}}}" fill="{{{{bd_t3.c}}}}" stroke="#FFFFFF" stroke-opacity="0.55" stroke-width="0.6" stroke-linejoin="round"></path>
</svg>
<sc-for list="{{{{ trees }}}}" as="t" hint-placeholder-count="6">
<div style="position: absolute; left: {{{{t.x}}}}; top: {{{{t.y}}}}; transform: translate(-50%, -100%); display: flex; flex-direction: column; align-items: center">
<div style="position: absolute; left: 55%; bottom: {{{{t.sb}}}}; width: {{{{t.sw}}}}; height: {{{{t.sh}}}}; border-radius: 50%; background: rgba(70,48,14,0.3)"></div>
<div style="position: relative; width: {{{{t.aw}}}}; height: {{{{t.ah}}}}; background: {{{{t.aBg}}}}; clip-path: {{{{t.aClip}}}}; -webkit-clip-path: {{{{t.aClip}}}}; border-radius: {{{{t.aRad}}}}"></div>
<div style="position: relative; width: {{{{t.bw}}}}; height: {{{{t.bh}}}}; background: {{{{t.bBg}}}}; border-radius: {{{{t.bRad}}}}"></div>
</div>
</sc-for>
<div style="position: absolute; left: 0; top: 0; width: 390px; height: {{{{H}}}}; background: var(--tint); mix-blend-mode: multiply"></div>
<sc-for list="{{{{ lights }}}}" as="l" hint-placeholder-count="0">
<div style="position: absolute; left: {{{{l.x}}}}; top: {{{{l.y}}}}; width: {{{{l.s}}}}; height: {{{{l.s}}}}; transform: translate(-50%, -50%); border-radius: 50%; background: #FFE08A; box-shadow: 0 0 8px 3px rgba(255,214,120,0.75)"></div>
</sc-for>
<svg {SVG} style="{LAYER}">
<path d="{{{{pl0.d}}}}" {LINE} stroke="{{{{pl0.c}}}}" stroke-opacity="0.38" stroke-width="7"></path>
<path d="{{{{pl1.d}}}}" {LINE} stroke="{{{{pl1.c}}}}" stroke-opacity="0.38" stroke-width="7"></path>
<path d="{{{{pl2.d}}}}" {LINE} stroke="{{{{pl2.c}}}}" stroke-opacity="0.38" stroke-width="7"></path>
{legs_core}
<path d="{{{{casing}}}}" {LINE} stroke="#FFFFFF" stroke-opacity="0.85" stroke-width="1.8"></path>
<path d="{{{{dotsP}}}}" fill="none" stroke="#2B2118" stroke-opacity="0.4" stroke-width="9" stroke-linecap="round"></path>
<path d="{{{{dotsP}}}}" fill="none" stroke="#FFFFFF" stroke-opacity="0.85" stroke-width="5.5" stroke-linecap="round"></path>
<path d="{{{{dots}}}}" fill="none" stroke="#2B2118" stroke-width="10" stroke-linecap="round"></path>
<path d="{{{{dots}}}}" fill="none" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round"></path>
</svg>
<sc-if value="{{{{ hasHere }}}}" hint-placeholder-val="{{{{ true }}}}">
<svg {SVG} style="{LAYER}">
<polygon points="{{{{tr.shadow}}}}" fill="#3A2408" fill-opacity="0.28"></polygon>
<polygon points="{{{{tr.sideL}}}}" fill="#BCC4CD" stroke="#FFFFFF" stroke-width="1" stroke-linejoin="round"></polygon>
<polygon points="{{{{tr.sideR}}}}" fill="#C9D0D8" stroke="#FFFFFF" stroke-width="1" stroke-linejoin="round"></polygon>
<polygon points="{{{{tr.endF}}}}" fill="#D3D9DF" stroke="#FFFFFF" stroke-width="1" stroke-linejoin="round"></polygon>
<polygon points="{{{{tr.endR}}}}" fill="#D3D9DF" stroke="#FFFFFF" stroke-width="1" stroke-linejoin="round"></polygon>
<polygon points="{{{{tr.top}}}}" fill="#EEF1F4" stroke="#FFFFFF" stroke-width="1" stroke-linejoin="round"></polygon>
<polygon points="{{{{tr.stripeL}}}}" fill="{{{{here.c}}}}" ></polygon>
<polygon points="{{{{tr.stripeR}}}}" fill="{{{{here.c}}}}" ></polygon>
<polygon points="{{{{tr.winL}}}}" fill="#22303F" ></polygon>
<polygon points="{{{{tr.winR}}}}" fill="#22303F" ></polygon>
<polygon points="{{{{tr.glassF}}}}" fill="#22303F" ></polygon>
<polygon points="{{{{tr.glassR}}}}" fill="#22303F" ></polygon>
<polygon points="{{{{tr.bandF}}}}" fill="{{{{here.c}}}}" ></polygon>
<polygon points="{{{{tr.bandR}}}}" fill="{{{{here.c}}}}" ></polygon>
<polygon points="{{{{tr.ac1}}}}" fill="#BAC3CD" ></polygon>
<polygon points="{{{{tr.ac2}}}}" fill="#BAC3CD" ></polygon>
<polygon points="{{{{tr.lightA}}}}" fill="#FFD36B" ></polygon>
<polygon points="{{{{tr.lightB}}}}" fill="#FFD36B" ></polygon>
</svg>
</sc-if>
<sc-for list="{{{{ stopTags }}}}" as="s" hint-placeholder-count="3">
<div style="position: absolute; left: {{{{s.x}}}}; top: {{{{s.y}}}}; transform: translate(-50%, 0); opacity: {{{{s.op}}}}; background: rgba(255,255,255,0.78); border-radius: 7px; padding: 1px 6px; font-size: 11px; font-weight: 600; color: #2B2118; white-space: nowrap">{{{{s.name}}}}</div>
</sc-for>
<sc-for list="{{{{ marks }}}}" as="m" hint-placeholder-count="2">
<div style="position: absolute; left: {{{{m.x}}}}; top: {{{{m.y}}}}; transform: translate(-50%, -100%); display: flex; flex-direction: column; align-items: center">
<div style="background: #FFFFFF; border-radius: 9px; padding: 4px 9px; display: flex; align-items: center; gap: 6px; white-space: nowrap; box-shadow: 0 5px 10px rgba(60,40,10,0.3)">
<span style="display: {{{{m.tagShow}}}}; height: 18px; box-sizing: border-box; padding: 0 7px; border-radius: 9px; background: {{{{m.tagBg}}}}; color: {{{{m.tagFg}}}}; font-size: 11px; font-weight: 700; align-items: center">{{{{m.tag}}}}</span>
<span style="font-size: 13px; font-weight: 700; color: #2B2118">{{{{m.name}}}}</span>
</div>
<div style="position: relative; width: 2px; height: {{{{m.pole}}}}; background: {INK}">
<div style="display: {{{{m.flagShow}}}}; position: absolute; left: 2px; top: 1px; width: 0; height: 0; border-top: 6px solid transparent; border-bottom: 6px solid transparent; border-left: 13px solid #D9482B"></div>
</div>
</div>
</sc-for>
<div style="position: absolute; left: 0; right: 0; top: 0; height: 250px; backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); mask-image: linear-gradient(180deg, #000 0%, #000 45%, rgba(0,0,0,0) 100%); -webkit-mask-image: linear-gradient(180deg, #000 0%, #000 45%, rgba(0,0,0,0) 100%)"></div>
<div style="position: absolute; left: 0; right: 0; top: 0; height: 260px; background: linear-gradient(180deg, var(--haze0) 0%, var(--hazeM) 34%, var(--hazeT) 100%)"></div>
<div style="position: absolute; left: 0; top: 0; width: 390px; height: 460px; background: var(--sun)"></div>
<div style="position: absolute; left: 0; top: 0; width: 390px; height: {{{{H}}}}; filter: var(--lm-filter)">
<svg {SVG} style="{LAYER}">
<path d="{{{{f0.d}}}}" fill="{{{{f0.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f1.d}}}}" fill="{{{{f1.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f2.d}}}}" fill="{{{{f2.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f3.d}}}}" fill="{{{{f3.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f4.d}}}}" fill="{{{{f4.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f5.d}}}}" fill="{{{{f5.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f6.d}}}}" fill="{{{{f6.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f7.d}}}}" fill="{{{{f7.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f8.d}}}}" fill="{{{{f8.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f9.d}}}}" fill="{{{{f9.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f10.d}}}}" fill="{{{{f10.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f11.d}}}}" fill="{{{{f11.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f12.d}}}}" fill="{{{{f12.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f13.d}}}}" fill="{{{{f13.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f14.d}}}}" fill="{{{{f14.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f15.d}}}}" fill="{{{{f15.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f16.d}}}}" fill="{{{{f16.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f17.d}}}}" fill="{{{{f17.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f18.d}}}}" fill="{{{{f18.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f19.d}}}}" fill="{{{{f19.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f20.d}}}}" fill="{{{{f20.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f21.d}}}}" fill="{{{{f21.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f22.d}}}}" fill="{{{{f22.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f23.d}}}}" fill="{{{{f23.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f24.d}}}}" fill="{{{{f24.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f25.d}}}}" fill="{{{{f25.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f26.d}}}}" fill="{{{{f26.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f27.d}}}}" fill="{{{{f27.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f28.d}}}}" fill="{{{{f28.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f29.d}}}}" fill="{{{{f29.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f30.d}}}}" fill="{{{{f30.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f31.d}}}}" fill="{{{{f31.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f32.d}}}}" fill="{{{{f32.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f33.d}}}}" fill="{{{{f33.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f34.d}}}}" fill="{{{{f34.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f35.d}}}}" fill="{{{{f35.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f36.d}}}}" fill="{{{{f36.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f37.d}}}}" fill="{{{{f37.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f38.d}}}}" fill="{{{{f38.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f39.d}}}}" fill="{{{{f39.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f40.d}}}}" fill="{{{{f40.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f41.d}}}}" fill="{{{{f41.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f42.d}}}}" fill="{{{{f42.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f43.d}}}}" fill="{{{{f43.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f44.d}}}}" fill="{{{{f44.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f45.d}}}}" fill="{{{{f45.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f46.d}}}}" fill="{{{{f46.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f47.d}}}}" fill="{{{{f47.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f48.d}}}}" fill="{{{{f48.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f49.d}}}}" fill="{{{{f49.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f50.d}}}}" fill="{{{{f50.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f51.d}}}}" fill="{{{{f51.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f52.d}}}}" fill="{{{{f52.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f53.d}}}}" fill="{{{{f53.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f54.d}}}}" fill="{{{{f54.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f55.d}}}}" fill="{{{{f55.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f56.d}}}}" fill="{{{{f56.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f57.d}}}}" fill="{{{{f57.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f58.d}}}}" fill="{{{{f58.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f59.d}}}}" fill="{{{{f59.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f60.d}}}}" fill="{{{{f60.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f61.d}}}}" fill="{{{{f61.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f62.d}}}}" fill="{{{{f62.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f63.d}}}}" fill="{{{{f63.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f64.d}}}}" fill="{{{{f64.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f65.d}}}}" fill="{{{{f65.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f66.d}}}}" fill="{{{{f66.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f67.d}}}}" fill="{{{{f67.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f68.d}}}}" fill="{{{{f68.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f69.d}}}}" fill="{{{{f69.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f70.d}}}}" fill="{{{{f70.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f71.d}}}}" fill="{{{{f71.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f72.d}}}}" fill="{{{{f72.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f73.d}}}}" fill="{{{{f73.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f74.d}}}}" fill="{{{{f74.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f75.d}}}}" fill="{{{{f75.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f76.d}}}}" fill="{{{{f76.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f77.d}}}}" fill="{{{{f77.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f78.d}}}}" fill="{{{{f78.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f79.d}}}}" fill="{{{{f79.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f80.d}}}}" fill="{{{{f80.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f81.d}}}}" fill="{{{{f81.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f82.d}}}}" fill="{{{{f82.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f83.d}}}}" fill="{{{{f83.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f84.d}}}}" fill="{{{{f84.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f85.d}}}}" fill="{{{{f85.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f86.d}}}}" fill="{{{{f86.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f87.d}}}}" fill="{{{{f87.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f88.d}}}}" fill="{{{{f88.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f89.d}}}}" fill="{{{{f89.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f90.d}}}}" fill="{{{{f90.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f91.d}}}}" fill="{{{{f91.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f92.d}}}}" fill="{{{{f92.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f93.d}}}}" fill="{{{{f93.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f94.d}}}}" fill="{{{{f94.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f95.d}}}}" fill="{{{{f95.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f96.d}}}}" fill="{{{{f96.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f97.d}}}}" fill="{{{{f97.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f98.d}}}}" fill="{{{{f98.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f99.d}}}}" fill="{{{{f99.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f100.d}}}}" fill="{{{{f100.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f101.d}}}}" fill="{{{{f101.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f102.d}}}}" fill="{{{{f102.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f103.d}}}}" fill="{{{{f103.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f104.d}}}}" fill="{{{{f104.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f105.d}}}}" fill="{{{{f105.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f106.d}}}}" fill="{{{{f106.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f107.d}}}}" fill="{{{{f107.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f108.d}}}}" fill="{{{{f108.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f109.d}}}}" fill="{{{{f109.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f110.d}}}}" fill="{{{{f110.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f111.d}}}}" fill="{{{{f111.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f112.d}}}}" fill="{{{{f112.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f113.d}}}}" fill="{{{{f113.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f114.d}}}}" fill="{{{{f114.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f115.d}}}}" fill="{{{{f115.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f116.d}}}}" fill="{{{{f116.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f117.d}}}}" fill="{{{{f117.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f118.d}}}}" fill="{{{{f118.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f119.d}}}}" fill="{{{{f119.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f120.d}}}}" fill="{{{{f120.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f121.d}}}}" fill="{{{{f121.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f122.d}}}}" fill="{{{{f122.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f123.d}}}}" fill="{{{{f123.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f124.d}}}}" fill="{{{{f124.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f125.d}}}}" fill="{{{{f125.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f126.d}}}}" fill="{{{{f126.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f127.d}}}}" fill="{{{{f127.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f128.d}}}}" fill="{{{{f128.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f129.d}}}}" fill="{{{{f129.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f130.d}}}}" fill="{{{{f130.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f131.d}}}}" fill="{{{{f131.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f132.d}}}}" fill="{{{{f132.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f133.d}}}}" fill="{{{{f133.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f134.d}}}}" fill="{{{{f134.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f135.d}}}}" fill="{{{{f135.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f136.d}}}}" fill="{{{{f136.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f137.d}}}}" fill="{{{{f137.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f138.d}}}}" fill="{{{{f138.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f139.d}}}}" fill="{{{{f139.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f140.d}}}}" fill="{{{{f140.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f141.d}}}}" fill="{{{{f141.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f142.d}}}}" fill="{{{{f142.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f143.d}}}}" fill="{{{{f143.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f144.d}}}}" fill="{{{{f144.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f145.d}}}}" fill="{{{{f145.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f146.d}}}}" fill="{{{{f146.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f147.d}}}}" fill="{{{{f147.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f148.d}}}}" fill="{{{{f148.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f149.d}}}}" fill="{{{{f149.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f150.d}}}}" fill="{{{{f150.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f151.d}}}}" fill="{{{{f151.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f152.d}}}}" fill="{{{{f152.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f153.d}}}}" fill="{{{{f153.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f154.d}}}}" fill="{{{{f154.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f155.d}}}}" fill="{{{{f155.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f156.d}}}}" fill="{{{{f156.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f157.d}}}}" fill="{{{{f157.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f158.d}}}}" fill="{{{{f158.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
<path d="{{{{f159.d}}}}" fill="{{{{f159.c}}}}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5" stroke-linejoin="round"></path>
</svg>
</div>
<sc-for list="{{{{ lmLights }}}}" as="l" hint-placeholder-count="0">
<div style="position: absolute; left: {{{{l.x}}}}; top: {{{{l.y}}}}; width: {{{{l.s}}}}; height: {{{{l.s}}}}; transform: translate(-50%, -50%); border-radius: 50%; background: #FFE08A; box-shadow: 0 0 9px 4px rgba(255,214,120,0.8)"></div>
</sc-for>
</div>
</sc-if>

<sc-if value="{{{{ isRide }}}}" hint-placeholder-val="{{{{ true }}}}">
<div style="position: absolute; left: 16px; right: 16px; top: 52px; {ACRYL}; border-radius: 22px; padding: 10px 10px 10px 18px; display: flex; flex-direction: column; gap: 10px">
<div style="display: flex; align-items: center; gap: 10px">
<div style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px">
<div style="font-size: 11px; font-weight: 700; letter-spacing: 2px; color: {BLUE}">{{{{headKicker}}}}</div>
<div style="font-size: 20px; font-weight: 700; letter-spacing: -0.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{{{{headTitle}}}}</div>
<div style="font-size: 13px; font-weight: 500; color: {SUB}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{{{{headSub}}}}</div>
</div>
<sc-if value="{{{{ isLiveRide }}}}" hint-placeholder-val="{{{{ false }}}}">
<button onClick="{{{{ onListen }}}}" aria-label="{{{{listenAria}}}}" style="position: relative; width: 44px; height: 44px; border: 0; border-radius: 14px; background: {{{{listenBg}}}}; color: {{{{listenFg}}}}; padding: 0; display: flex; align-items: center; justify-content: center; flex-shrink: 0">
<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"></rect><path d="M5 11a7 7 0 0 0 14 0"></path><line x1="12" y1="18" x2="12" y2="21"></line></svg>
<span style="display: {{{{listenDot}}}}; position: absolute; right: 7px; top: 7px; width: 8px; height: 8px; border-radius: 4px; background: #E8453C; box-shadow: 0 0 0 2px #FFFFFF"></span>
</button>
</sc-if>
<button onClick="{{{{ onPick }}}}" style="height: 44px; border-radius: 14px; {TILE}; color: {INK}; font-size: 14px; font-weight: 600; padding: 0 14px; flex-shrink: 0">{{{{pickLabel}}}}</button>
</div>
<sc-if value="{{{{ rideFavs }}}}" hint-placeholder-val="{{{{ false }}}}">
<div style="display: flex; gap: 6px; overflow-x: auto; margin: 0 0 0 -8px; padding-bottom: 2px; scrollbar-width: none">
<sc-for list="{{{{ favChips }}}}" as="p" hint-placeholder-count="2">
<button onClick="{{{{ p.pick }}}}" style="flex-shrink: 0; height: 38px; border-radius: 19px; {TILE}; color: {INK}; padding: 0 12px 0 10px; display: flex; align-items: center; gap: 5px">
<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="#F6B545" stroke="#E09A20" stroke-width="1.8" stroke-linejoin="round"><polygon points="12 2.8 14.8 8.9 21.4 9.6 16.4 14.1 17.9 20.6 12 17.2 6.1 20.6 7.6 14.1 2.6 9.6 9.2 8.9"></polygon></svg>
<span style="font-size: 15px; font-weight: 700">{{{{p.name}}}}</span>
<span style="font-size: 12px; font-weight: 600; color: {SUB}">{{{{p.mins}}}}</span>
</button>
</sc-for>
</div>
</sc-if>
</div>
</sc-if>

<sc-if value="{{{{ isConfirm }}}}" hint-placeholder-val="{{{{ false }}}}">
<div style="position: absolute; left: 20px; right: 20px; top: 52px; display: flex; flex-direction: column; align-items: flex-start; gap: 10px">
<div style="{ACRYL}; border-radius: 16px; height: 32px; box-sizing: border-box; padding: 0 12px 0 9px; display: flex; align-items: center; gap: 6px; max-width: 100%; color: {{{{locFg}}}}">
<span style="display: {{{{locSpin}}}}; flex-shrink: 0; width: 14px; height: 14px; box-sizing: border-box; border-radius: 50%; border: 2px solid var(--card-line); border-top-color: var(--blue); animation: sn-spin 0.8s linear infinite"></span>
<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; display: {{{{locPin}}}}"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"></path><circle cx="12" cy="9.5" r="2.5"></circle></svg>
<span class="{{{{locDots}}}}" style="font-size: 13px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{{{{pillText}}}}</span>
</div>
<sc-if value="{{{{ isLive }}}}" hint-placeholder-val="{{{{ false }}}}">
<button onClick="{{{{ onHomeListen }}}}" style="{ACRYL}; border-radius: 16px; height: 32px; box-sizing: border-box; padding: 0 12px 0 9px; display: flex; align-items: center; gap: 6px; color: {{{{hlFg}}}}">
<span style="display: {{{{hlDot}}}}; width: 8px; height: 8px; border-radius: 4px; background: #E8453C; animation: sn-pulse 1s ease-in-out infinite"></span>
<svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display: {{{{hlMic}}}}"><rect x="9" y="3" width="6" height="11" rx="3"></rect><path d="M5 11a7 7 0 0 0 14 0"></path><line x1="12" y1="18" x2="12" y2="21"></line></svg>
<span class="{{{{hlDots}}}}" style="font-size: 13px; font-weight: 700; white-space: nowrap">{{{{hlLabel}}}}</span>
</button>
</sc-if>
<div style="font-size: 34px; font-weight: 700; letter-spacing: -1.2px; line-height: 1.2; color: {NAVY}; padding-left: 4px">{{{{hello}}}}</div>
</div>
</sc-if>

<sc-if value="{{{{ isConfirm }}}}" hint-placeholder-val="{{{{ false }}}}">
<div style="position: absolute; left: 16px; right: 16px; bottom: 20px; display: flex; flex-direction: column; gap: 10px">

<sc-if value="{{{{ hasOrigin }}}}" hint-placeholder-val="{{{{ true }}}}">
<div style="display: flex; flex-direction: column; gap: 10px">
<div style="{ACRYL}; border-radius: 24px; padding: 6px; display: flex; align-items: stretch">
<button onClick="{{{{ onPickOrigin }}}}" style="flex: 1 1 0; min-width: 0; border: 0; background: transparent; border-radius: 18px; color: {INK}; text-align: left; padding: 10px 12px; display: flex; flex-direction: column; gap: 4px">
<span style="font-size: 11px; font-weight: 700; letter-spacing: 2px; color: {SUB}">출발</span>
<span style="display: flex; align-items: center; gap: 5px; min-width: 0">
<span style="font-size: 22px; font-weight: 700; letter-spacing: -0.6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0">{{{{o.name}}}}</span>
{badges('o', 20)}
</span>
<span style="font-size: 12px; font-weight: 500; color: {SUB}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{{{{o.label}}}}</span>
</button>
<div style="flex-shrink: 0; width: 1px; margin: 12px 2px; background: var(--card-line)"></div>
<button onClick="{{{{ onPick }}}}" style="flex: 1 1 0; min-width: 0; border: 0; background: transparent; border-radius: 18px; color: {INK}; text-align: left; padding: 10px 12px; display: flex; flex-direction: column; gap: 4px">
<span style="font-size: 11px; font-weight: 700; letter-spacing: 2px; color: {SUB}">도착</span>
<span style="font-size: 22px; font-weight: 700; letter-spacing: -0.6px; color: {BLUE}">어디까지?</span>
<span style="font-size: 12px; font-weight: 500; color: {SUB}; display: flex; align-items: center; gap: 4px"><svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><circle cx="11" cy="11" r="7"></circle><line x1="16.5" y1="16.5" x2="21" y2="21"></line></svg>역 이름으로 검색</span>
</button>
</div>
<sc-if value="{{{{ hasFavs }}}}" hint-placeholder-val="{{{{ true }}}}">
<div style="display: flex; gap: 8px; overflow-x: auto; padding: 2px 2px 4px; margin: -2px -2px -4px; scrollbar-width: none">
<sc-for list="{{{{ favChips }}}}" as="p" hint-placeholder-count="2">
<button onClick="{{{{ p.pick }}}}" style="flex-shrink: 0; height: 46px; border-radius: 23px; {ACRYL}; color: {INK}; padding: 0 16px 0 12px; display: flex; align-items: center; gap: 6px">
<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="#F6B545" stroke="#E09A20" stroke-width="1.8" stroke-linejoin="round"><polygon points="12 2.8 14.8 8.9 21.4 9.6 16.4 14.1 17.9 20.6 12 17.2 6.1 20.6 7.6 14.1 2.6 9.6 9.2 8.9"></polygon></svg>
<span style="font-size: 16px; font-weight: 700; margin-right: 2px">{{{{p.name}}}}</span>
{badges('p', 20)}
<span style="font-size: 12px; font-weight: 600; color: {SUB}">{{{{p.mins}}}}</span>
</button>
</sc-for>
</div>
</sc-if>
<sc-if value="{{{{ hasUsual }}}}" hint-placeholder-val="{{{{ true }}}}">
<button onClick="{{{{ onUsual }}}}" style="height: 60px; border-radius: 20px; {PRIMARY}; color: #FFFFFF; text-align: left; padding: 0 18px; display: flex; align-items: center; gap: 12px">
<span style="font-size: 11px; font-weight: 700; letter-spacing: 1px; opacity: 0.8; flex-shrink: 0">평소처럼</span>
<span style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column">
<span style="font-size: 17px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{{{{usualName}}}}</span>
<span style="font-size: 12px; font-weight: 500; opacity: 0.85; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{{{{usualSummary}}}}</span>
</span>
<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0"><line x1="4" y1="12" x2="20" y2="12"></line><polyline points="13 5 20 12 13 19"></polyline></svg>
</button>
</sc-if>
<div style="display: flex; justify-content: center; align-items: center; gap: 4px">
<sc-if value="{{{{ isLive }}}}" hint-placeholder-val="{{{{ false }}}}">
<button onClick="{{{{ onDemo }}}}" style="height: 40px; border: 0; background: transparent; color: {INK}; font-size: 13px; font-weight: 600; padding: 0 10px">데모 보기</button>
</sc-if>
</div>
</div>
</sc-if>

<sc-if value="{{{{ noOrigin }}}}" hint-placeholder-val="{{{{ false }}}}">
<div style="display: flex; flex-direction: column; gap: 10px">
<div style="{ACRYL}; border-radius: 24px; padding: 16px 20px; font-size: 14px; font-weight: 500; line-height: 1.6; color: {INK}">{{{{noOriginMsg}}}}</div>
<button onClick="{{{{ onPickOrigin }}}}" style="height: 60px; border-radius: 20px; {PRIMARY}; color: #FFFFFF; font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: 12px; padding: 0 20px">
{search_icon('#FFFFFF')}
<span>출발역 검색</span>
</button>
<sc-if value="{{{{ isLive }}}}" hint-placeholder-val="{{{{ false }}}}">
<button onClick="{{{{ onDemo }}}}" style="height: 44px; border: 0; background: transparent; color: {INK}; font-size: 13px; font-weight: 600; text-decoration: underline">데모로 미리 보기 (신흥 → 고속터미널)</button>
</sc-if>
<div style="font-size: 11px; font-weight: 700; letter-spacing: 2px; color: {SUB}; padding: 6px 6px 0">자주 타는 역</div>
<sc-for list="{{{{ recents }}}}" as="p" hint-placeholder-count="2">
<button onClick="{{{{ p.pick }}}}" style="height: 58px; border-radius: 20px; {ACRYL}; color: {INK}; font-size: 18px; font-weight: 700; text-align: left; padding: 0 20px; display: flex; align-items: center; gap: 6px">
<span style="margin-right: 4px">{{{{p.name}}}}</span>
{badges('p')}
</button>
</sc-for>
</div>
</sc-if>
</div>
</sc-if>

<sc-if value="{{{{ isRide }}}}" hint-placeholder-val="{{{{ true }}}}">
<div style="position: absolute; left: 16px; right: 16px; bottom: 20px; display: flex; flex-direction: column; gap: 10px">

<sc-if value="{{{{ hasBanner }}}}" hint-placeholder-val="{{{{ false }}}}">
<div style="border-radius: 20px; padding: 11px 18px; display: flex; flex-direction: column; gap: 1px; background: {{{{bannerBg}}}}; border: 1px solid {{{{bannerLine}}}}; box-shadow: {{{{bannerGlow}}}}; {BLUR}">
<div style="font-size: 11px; font-weight: 700; letter-spacing: 2px; color: {{{{bannerSub}}}}">{{{{bannerLabel}}}}</div>
<div style="font-size: 17px; font-weight: 700; line-height: 1.4; letter-spacing: -0.3px; color: {{{{bannerFg}}}}">{{{{banner}}}}</div>
</div>
</sc-if>

<div style="{ACRYL}; border-radius: 26px; padding: 14px 18px 16px; display: flex; flex-direction: column; gap: 6px">
<div style="display: flex; align-items: center; gap: 8px">
<div style="min-width: 24px; height: 24px; box-sizing: border-box; padding: 0 8px; border-radius: 12px; background: {{{{c.bg}}}}; color: {{{{c.fg}}}}; font-size: 13px; font-weight: 700; display: flex; align-items: center; justify-content: center">{{{{c.short}}}}</div>
<div style="font-size: 13px; font-weight: 500; color: {SUB}">{{{{c.label}}}}</div>
<div style="margin-left: auto; font-size: 11px; font-weight: 700; letter-spacing: 2px; color: {BLUE}">{{{{hereTag}}}}</div>
</div>
<div style="font-size: {{{{nameSize}}}}; font-weight: 700; line-height: 1.15; letter-spacing: -1.5px; white-space: nowrap; color: {NAVY}">{{{{c.name}}}}</div>
<sc-if value="{{{{ showTiles }}}}" hint-placeholder-val="{{{{ true }}}}">
<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; padding-top: 4px">
<div style="{TILE}; border-radius: 14px; padding: 8px 12px; display: flex; flex-direction: column; min-width: 0">
<div style="font-size: 11px; font-weight: 700; letter-spacing: 1px; color: {SUB}">이전</div>
<div style="font-size: 16px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{{{{prev}}}}</div>
</div>
<div style="{TILE}; border-radius: 14px; padding: 8px 12px; display: flex; flex-direction: column; min-width: 0">
<div style="font-size: 11px; font-weight: 700; letter-spacing: 1px; color: {BLUE}">다음</div>
<div style="font-size: 16px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{{{{next}}}}</div>
</div>
</div>
</sc-if>
<sc-if value="{{{{ isArrived }}}}" hint-placeholder-val="{{{{ false }}}}">
<div style="{TILE}; border-radius: 14px; padding: 10px 12px; display: flex; flex-direction: column; gap: 2px; margin-top: 4px">
<div style="font-size: 11px; font-weight: 700; letter-spacing: 1px; color: {SUB}">이 역 근처</div>
<div style="font-size: 15px; font-weight: 600">[제휴 매장 이름] · [쿠폰 내용]</div>
</div>
</sc-if>
</div>

<div style="display: flex; gap: 8px">
<button onClick="{{{{ onReset }}}}" style="height: 50px; border-radius: 18px; {ACRYL}; color: {INK}; font-size: 14px; font-weight: 600; padding: 0 14px; flex-shrink: 0">{{{{resetLabel}}}}</button>
<button onClick="{{{{ onToggle }}}}" disabled="{{{{ atEnd }}}}" style="display: {{{{toggleDisp}}}}; align-items: center; justify-content: center; flex-grow: 1; height: 50px; border-radius: 18px; {PRIMARY}; color: #FFFFFF; font-size: 15px; font-weight: 600; opacity: {{{{nextOpacity}}}}">{{{{playLabel}}}}</button>
<button onClick="{{{{ onNext }}}}" disabled="{{{{ atEnd }}}}" style="height: 50px; border-radius: 18px; {ACRYL}; color: {INK}; font-size: 14px; font-weight: 600; padding: 0 14px; flex-shrink: 0; flex-grow: {{{{nextGrow}}}}; opacity: {{{{nextOpacity}}}}">다음 역</button>
</div>
<div style="font-size: 11px; font-weight: 500; color: {INK}; text-align: center">{{{{footNote}}}}</div>
</div>
</sc-if>

<sc-if value="{{{{ isPick }}}}" hint-placeholder-val="{{{{ false }}}}">
<div style="position: absolute; left: 0; top: 0; right: 0; bottom: 0; padding: 56px 16px 20px; box-sizing: border-box; display: flex; flex-direction: column; gap: 12px">
<div style="font-size: 30px; font-weight: 700; letter-spacing: -1px; padding: 0 8px; color: {NAVY}">{{{{pickTitle}}}}</div>
<div style="display: flex; align-items: center; gap: 8px">
<button onClick="{{{{ onBack }}}}" aria-label="뒤로" style="width: 54px; height: 54px; border-radius: 18px; {ACRYL}; color: {INK}; padding: 0; display: flex; align-items: center; justify-content: center; flex-shrink: 0">
<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 5 8 12 15 19"></polyline></svg>
</button>
<label for="stq" style="position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0)">역 이름 검색</label>
<input id="stq" type="search" value="{{{{ q }}}}" onChange="{{{{ onQ }}}}" placeholder="역 이름" autocomplete="off" style="flex-grow: 1; min-width: 0; height: 54px; box-sizing: border-box; border-radius: 18px; background: var(--field); border: 2px solid var(--blue); box-shadow: var(--row-shadow); color: {INK}; font-size: 17px; font-weight: 600; padding: 0 18px">
</div>
<div style="font-size: 11px; font-weight: 700; letter-spacing: 2px; color: {SUB}; padding: 6px 8px 0">{{{{listLabel}}}}</div>
<div style="flex-grow: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding-bottom: 24px">
<sc-for list="{{{{ picks }}}}" as="p" hint-placeholder-count="5">
<div style="flex-shrink: 0; position: relative; border-radius: 20px; background: var(--row); border: 1px solid var(--card-line); box-shadow: var(--row-shadow); display: flex; align-items: stretch">
<button onClick="{{{{ p.pick }}}}" style="flex-grow: 1; min-width: 0; min-height: 68px; border: 0; border-radius: 20px; background: transparent; color: {INK}; text-align: left; padding: 12px 4px 12px 20px; display: flex; flex-direction: column; justify-content: center; gap: 3px">
<span style="display: flex; align-items: center; gap: 6px">
<span style="font-size: 18px; font-weight: 700; margin-right: 2px">{{{{p.name}}}}</span>
{badges('p')}
<span style="font-size: 12px; font-weight: 600; color: {SUB}">{{{{p.more}}}}</span>
</span>
<span style="font-size: 13px; font-weight: 500; color: {SUB}">{{{{p.note}}}}</span>
</button>
<button onClick="{{{{ p.star }}}}" aria-label="{{{{p.starAria}}}}" style="flex-shrink: 0; width: 56px; border: 0; border-radius: 20px; background: transparent; padding: 0; display: flex; align-items: center; justify-content: center">
<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="{{{{p.starFill}}}}" stroke="{{{{p.starLine}}}}" stroke-width="1.8" stroke-linejoin="round"><polygon points="12 2.8 14.8 8.9 21.4 9.6 16.4 14.1 17.9 20.6 12 17.2 6.1 20.6 7.6 14.1 2.6 9.6 9.2 8.9"></polygon></svg>
</button>
</div>
</sc-for>
<sc-if value="{{{{ noResult }}}}" hint-placeholder-val="{{{{ false }}}}">
<div style="padding: 32px 20px; font-size: 15px; font-weight: 500; line-height: 1.6; color: {SUB}; text-align: center">그런 역은 못 찾았어요. 이름을 다시 확인해 주세요.</div>
</sc-if>
</div>
</div>
</sc-if>

<sc-if value="{{{{ isDir }}}}" hint-placeholder-val="{{{{ false }}}}">
<div style="position: absolute; left: 0; top: 0; right: 0; bottom: 0; padding: 56px 16px 20px; box-sizing: border-box; display: flex; flex-direction: column; gap: 12px">
<div style="font-size: 30px; font-weight: 700; letter-spacing: -1px; padding: 0 8px; color: {NAVY}">어느 방향 열차예요?</div>
<div style="font-size: 14px; font-weight: 500; line-height: 1.6; color: {SUB}; padding: 0 8px 4px">{{{{dirSub}}}}</div>
<div style="flex-grow: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding-bottom: 24px">
<sc-for list="{{{{ dirs }}}}" as="d" hint-placeholder-count="2">
<button onClick="{{{{ d.pick }}}}" style="flex-shrink: 0; min-height: 64px; border-radius: 20px; background: var(--row); border: 1px solid var(--card-line); box-shadow: var(--row-shadow); color: {INK}; text-align: left; padding: 0 20px; display: flex; align-items: center; gap: 12px">
<span style="min-width: 26px; height: 26px; box-sizing: border-box; padding: 0 8px; border-radius: 13px; background: {{{{d.bg}}}}; color: {{{{d.fg}}}}; font-size: 13px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0">{{{{d.short}}}}</span>
<span style="font-size: 18px; font-weight: 600">{{{{d.label}}}}</span>
</button>
</sc-for>
</div>
<button onClick="{{{{ onBack }}}}" style="flex-shrink: 0; height: 54px; border-radius: 18px; {ACRYL}; color: {INK}; font-size: 15px; font-weight: 600">뒤로</button>
</div>
</sc-if>

</div>
</x-dc>
'''
open('markup4.html', 'w', encoding='utf-8').write(MARKUP)
print(len(MARKUP))
