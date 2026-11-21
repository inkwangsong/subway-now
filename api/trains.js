// 지금 어느 역 — 실시간 열차 위치 중계 (Vercel 서버리스 함수)
// 환경 변수 SEOUL_KEY 에 서울 열린데이터광장 '실시간 지하철' 인증키를 넣어요. 키는 여기에만 있고 웹앱에는 없어요.
// 호출: https://<프로젝트>.vercel.app/api/trains?line=8호선
const ALLOW = ['https://inkwangsong.github.io'];

module.exports = async (req, res) => {
  const origin = req.headers.origin || '';
  res.setHeader('Access-Control-Allow-Origin', ALLOW.includes(origin) ? origin : ALLOW[0]);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=20, stale-while-revalidate=10');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const line = String((req.query && req.query.line) || '');
  if (!line || line.length > 20) return res.status(400).json({ err: 'line' });
  const key = process.env.SEOUL_KEY;
  if (!key) return res.status(500).json({ err: 'SEOUL_KEY 미설정' });

  const api = 'http://swopenapi.seoul.go.kr/api/subway/' + encodeURIComponent(key) +
    '/json/realtimePosition/0/300/' + encodeURIComponent(line);
  try {
    const r = await fetch(api);
    const j = await r.json();
    const msg = j.errorMessage || {};
    const rows = (j.realtimePositionList || []).map((x) => ({
      stn: x.statnNm, no: x.trainNo, term: x.statnTnm, st: x.trainSttus, ud: x.updnLine, t: x.recptnDt,
    }));
    const err = msg.code && msg.code !== 'INFO-000' ? msg.message : null;
    return res.status(200).json({ rows, err });
  } catch (e) {
    return res.status(502).json({ err: 'upstream' });
  }
};
