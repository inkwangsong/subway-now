// 지금 어느 역 — 목소리 복제 중계 (ElevenLabs)
// 환경 변수 ELEVEN_KEY 에 ElevenLabs API 키를 넣어요. 키는 여기에만 있고 웹앱에는 없어요.
//  POST /api/voice?do=clone  {name, mime, audio(base64)}  → {voice}
//  GET  /api/voice?do=tts&voice=<id>&text=<문장>          → audio/mpeg (같은 문장은 서버에서 캐시)
const ALLOW = ['https://inkwangsong.github.io'];

module.exports = async (req, res) => {
  const origin = req.headers.origin || '';
  res.setHeader('Access-Control-Allow-Origin', ALLOW.includes(origin) ? origin : ALLOW[0]);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  const key = String(process.env.ELEVEN_KEY || '').trim();
  if (!key) return res.status(503).json({ err: 'ELEVEN_KEY 미설정' });
  const act = String((req.query && req.query.do) || '');

  try {
    if (act === 'clone' && req.method === 'POST') {
      if (origin && !ALLOW.includes(origin)) return res.status(403).json({ err: 'origin' });
      let body = req.body; if (typeof body === 'string') body = JSON.parse(body);
      const b64 = String(body.audio || ''), mime = String(body.mime || 'audio/mp4');
      if (!b64 || b64.length > 6000000) return res.status(400).json({ err: 'audio' });
      const buf = Buffer.from(b64, 'base64');
      const fd = new FormData();
      fd.append('name', String(body.name || '지금역 목소리').slice(0, 40));
      fd.append('remove_background_noise', 'true');
      fd.append('files', new Blob([buf], { type: mime }), 'sample.' + (/webm/.test(mime) ? 'webm' : 'm4a'));
      const r = await fetch('https://api.elevenlabs.io/v1/voices/add', { method: 'POST', headers: { 'xi-api-key': key }, body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return res.status(r.status).json({ err: (j.detail && (j.detail.message || j.detail.status)) || ('clone ' + r.status) });
      return res.status(200).json({ voice: j.voice_id });
    }
    if (act === 'tts') {
      const voice = String(req.query.voice || '').replace(/[^0-9A-Za-z]/g, '').slice(0, 40);
      const text = String(req.query.text || '').slice(0, 160);
      if (!voice || !text) return res.status(400).json({ err: 'voice/text' });
      const r = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + voice + '?output_format=mp3_44100_64', {
        method: 'POST',
        headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
        body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.5, similarity_boost: 0.85, style: 0.2, use_speaker_boost: true } })
      });
      if (!r.ok) { const t = await r.text(); return res.status(r.status).json({ err: t.slice(0, 160) }); }
      const ab = Buffer.from(await r.arrayBuffer());
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable');
      return res.status(200).send(ab);
    }
    return res.status(400).json({ err: 'do' });
  } catch (e) {
    return res.status(502).json({ err: String(e && e.message || e).slice(0, 120) });
  }
};
