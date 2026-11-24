// 지금 어느 역 — 역별 실시간 도착 정보 중계 (서울시 realtimeStationArrival)
// 호출: https://<프로젝트>.vercel.app/api/arrivals?stn=신흥
const ALLOW = ['https://inkwangsong.github.io'];

module.exports = async (req, res) => {
  const origin = req.headers.origin || '';
  res.setHeader('Access-Control-Allow-Origin', ALLOW.includes(origin) ? origin : ALLOW[0]);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=15, stale-while-revalidate=10');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const stn = String((req.query && req.query.stn) || '').trim();
  if (!stn || stn.length > 30) return res.status(400).json({ err: 'stn' });
  const raw = String(process.env.SEOUL_KEY || '');
  const key = raw.split(/[^0-9A-Za-z]+/).reduce((a, b) => (b.length > a.length ? b : a), '');
  if (!key) return res.status(500).json({ err: 'SEOUL_KEY 미설정' });

  const api = 'http://swopenapi.seoul.go.kr/api/subway/' + encodeURIComponent(key) +
    '/json/realtimeStationArrival/0/40/' + encodeURIComponent(stn);
  try {
    const r = await fetch(api, { headers: { 'User-Agent': 'Mozilla/5.0 (subway-now relay)' } });
    const j = JSON.parse(await r.text());
    const msg = j.errorMessage || {};
    const rows = (j.realtimeArrivalList || []).map(x => ({
      line: x.subwayId,          // 1008 = 8호선 …
      ud: x.updnLine,            // 상행/하행/내선/외선
      head: x.trainLineNm,       // "모란행 - 수진방면"
      sec: +x.barvlDt || 0,      // 도착까지 남은 초(노선에 따라 0일 수 있음)
      msg: x.arvlMsg2,           // "3분 후 (단대오거리)", "전역 출발" …
      at: x.arvlMsg3,            // 지금 열차가 있는 역
      code: x.arvlCd,            // 0 진입 1 도착 2 출발 3 전역출발 4 전역진입 5 전역도착 99 운행중
      no: x.btrainNo,
      term: x.bstatnNm,
      t: x.recptnDt,
      ord: x.ordkey
    }));
    const err = msg.code && msg.code !== 'INFO-000' ? (msg.code + ' ' + msg.message) : null;
    return res.status(200).json({ rows, err });
  } catch (e) {
    return res.status(502).json({ err: 'upstream' });
  }
};
