/*
 * 지금 어느 역 — 실시간 열차 위치 중계 (Cloudflare Workers)
 *
 * 서울시 실시간 지하철 API는 http 주소라서 https 웹앱에서 바로 부를 수 없고,
 * 인증키를 웹앱에 넣으면 누구나 볼 수 있어요. 그래서 이 작은 중계가 대신 불러줘요.
 *
 * 설정: Workers 설정 > 변수 및 암호에 SEOUL_KEY (서울 열린데이터광장 '실시간 지하철' 인증키)를 암호로 넣어요.
 * 호출: https://<이름>.workers.dev/?line=8호선
 */
const ALLOW = 'https://inkwangsong.github.io';

export default {
  async fetch(request, env) {
    const headers = {
      'Access-Control-Allow-Origin': ALLOW,
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=10',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers });
    const line = new URL(request.url).searchParams.get('line');
    if (!line || line.length > 20) return new Response(JSON.stringify({ err: 'line' }), { status: 400, headers });
    if (!env.SEOUL_KEY) return new Response(JSON.stringify({ err: 'SEOUL_KEY 미설정' }), { status: 500, headers });

    const api = 'http://swopenapi.seoul.go.kr/api/subway/' + encodeURIComponent(env.SEOUL_KEY) +
      '/json/realtimePosition/0/300/' + encodeURIComponent(line);
    try {
      const r = await fetch(api, { cf: { cacheTtl: 10, cacheEverything: true } });
      const j = await r.json();
      const msg = j.errorMessage || {};
      const rows = (j.realtimePositionList || []).map((x) => ({
        stn: x.statnNm,      // 열차가 있는 역
        no: x.trainNo,       // 열차 번호
        term: x.statnTnm,    // 종착역
        st: x.trainSttus,    // 0 진입, 1 도착, 2 출발, 3 전역 출발
        ud: x.updnLine,      // 상하행(내외선) 구분
        t: x.recptnDt,       // 정보 수신 시각
      }));
      const err = msg.code && msg.code !== 'INFO-000' ? msg.message : null;
      return new Response(JSON.stringify({ rows, err }), { headers });
    } catch (e) {
      return new Response(JSON.stringify({ err: 'upstream' }), { status: 502, headers });
    }
  },
};
