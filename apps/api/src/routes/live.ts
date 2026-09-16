import { Router } from 'express';
import type { LiveManager } from '../live';

export function createLiveRouter(manager: LiveManager) {
  const r = Router();
  r.get('/status', (_req, res) =>
    res.json({ ...manager.getStatus(), restream: manager.getRestream() }));

  // Configura retransmissão (ex.: YouTube): { enabled, url }
  // url completa rtmp://a.rtmp.youtube.com/live2/<chave> OU só a chave do YouTube
  r.put('/restream', (req, res) => {
    const { enabled, url, youtubeKey } = req.body ?? {};
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled (boolean) é obrigatório' });
    }
    const finalUrl = youtubeKey
      ? `rtmp://a.rtmp.youtube.com/live2/${String(youtubeKey).trim()}`
      : url !== undefined ? (url || null) : undefined;
    res.json(manager.setRestream({ enabled, url: finalUrl }));
  });

  return r;
}
