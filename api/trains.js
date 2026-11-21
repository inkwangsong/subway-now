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
  // 붙여 넣을 때 섞인 공백·줄바꿈·따옴표는 지워요
  const raw = String(process.env.SEOUL_KEY || '');
  const key = raw.replace(/[^0-9A-Za-z]/g, '');
  if (!key) return res.status(500).json({ err: 'SEOUL_KEY 미설정' });
  // 진단용: ?probe=sample 이면 서울시 샘플키로 1호선을 불러서 중계 경로 자체가 되는지 확인해요
  const probe = req.query && req.query.probe === 'sample';
  const useKey = probe ? 'sample' : key;
  const useLine = probe ? '1호선' : line;

  const api = 'http://swopenapi.seoul.go.kr/api/subway/' + encodeURIComponent(useKey) +
    '/json/realtimePosition/' + (probe ? '0/5/' : '0/300/') + encodeURIComponent(useLine);
  let text = '', status = 0;
  try {
    const r = await fetch(api, { headers: { 'User-Agent': 'Mozilla/5.0 (subway-now relay)' } });
    status = r.status;
    text = await r.text();
    const j = JSON.parse(text);
    const msg = j.errorMessage || {};
    const rows = (j.realtimePositionList || []).map((x) => ({
      stn: x.statnNm, no: x.trainNo, term: x.statnTnm, st: x.trainSttus, ud: x.updnLine, t: x.recptnDt,
    }));
    let err = msg.code && msg.code !== 'INFO-000' ? (msg.code + ' ' + msg.message) : null;
    if (!j.realtimePositionList && !err) {
      // 오류가 다른 모양으로 올 때 (예: 인증키 문제): 코드와 메시지만 전해요
      const top = j.RESULT || j;
      err = String((top.CODE || top.code || '') + ' ' + (top.MESSAGE || top.message || '')).trim() || text.split(key).join('***').slice(0, 160);
    }
    return res.status(200).json({ rows, err });
  } catch (e) {
    // 원인 확인용: 상태 코드와 응답 앞부분만 (인증키는 지움)
    const peek = String(text || '').split(key).join('***').replace(/\s+/g, ' ').slice(0, 160);
    return res.status(502).json({ err: 'upstream', status, keyLen: key.length, rawLen: raw.length, why: String(e && e.message || e).slice(0, 120), peek });
  }
};
