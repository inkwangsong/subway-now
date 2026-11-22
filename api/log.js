// 탑승 기록 저장: 앱이 보내는 1초 단위 센서 요약·감지 이벤트·앱 판단을 비공개 저장소(Vercel Blob)에 남겨요.
// 정확한 위치 좌표나 녹음은 받지 않아요. 기록은 정차 감지 기준값을 맞추는 데만 써요.
const { put } = require('@vercel/blob');
const ALLOW = ['https://inkwangsong.github.io'];

module.exports = async (req, res) => {
  const origin = req.headers.origin || '';
  if (ALLOW.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ err: 'POST only' });
  if (origin && !ALLOW.includes(origin)) return res.status(403).json({ err: 'origin' });
  let body = req.body;
  if (typeof body !== 'string') body = JSON.stringify(body || {});
  if (body.length > 300000) return res.status(413).json({ err: 'too big' });
  let j;
  try { j = JSON.parse(body); } catch (e) { return res.status(400).json({ err: 'json' }); }
  const id = String(j.id || '').replace(/[^0-9A-Za-z-]/g, '').slice(0, 40);
  const part = Math.max(0, Math.min(999, parseInt(j.part, 10) || 0));
  if (!id) return res.status(400).json({ err: 'id' });
  const day = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  try {
    await put(`rides/${day}/${id}-${String(part).padStart(3, '0')}.json`, body, { access: 'private', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true });
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ err: String(e && e.message || e).slice(0, 120) });
  }
};
