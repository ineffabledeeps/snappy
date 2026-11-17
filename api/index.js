import { requireApiAuth } from '../lib/auth.js';
import { applyCors } from '../lib/cors.js';
import { listDevices } from '../lib/devices.js';
import { snappyCapture } from '../lib/snappy.js';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (requireApiAuth(req, res)) return;

  if (req.method === 'GET') {
    return res.status(200).json({
      name: 'snappy',
      description: 'Full-page screenshot API for url or html',
      devices: listDevices().map((d) => d.key),
      usage: {
        method: 'POST',
        body: {
          url: 'https://example.com',
          device: 'iPhone 14',
          response: 'url | base64 | both',
        },
      },
    });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    url,
    html,
    preset = null,
    device = null,
    waitUntil = 'networkidle',
    response: responseMode = 'url',
    upload,
  } = req.body || {};

  const hasUrl = Boolean(String(url || '').trim());
  const hasHtml = html != null && Boolean(String(html).trim());
  if (!hasUrl && !hasHtml) {
    return res.status(400).json({ error: 'Provide either url or html' });
  }
  if (hasUrl && hasHtml) {
    return res.status(400).json({ error: 'Provide url or html, not both' });
  }

  const mode = String(responseMode || 'url').toLowerCase();
  if (mode !== 'url' && mode !== 'base64' && mode !== 'both') {
    return res.status(400).json({ error: 'response must be url, base64, or both' });
  }

  const shouldUpload = upload != null ? Boolean(upload) : mode !== 'base64';

  try {
    const result = await snappyCapture({
      url,
      html,
      preset,
      device,
      waitUntil,
      upload: shouldUpload,
    });

    const payload = {
      success: true,
      source: result.source,
      url: result.url || null,
      viewport: result.viewport,
      deviceScaleFactor: result.deviceScaleFactor,
      presetName: result.presetName,
      durationMs: result.durationMs,
    };

    if (mode === 'url' || mode === 'both') {
      payload.imageUrl = result.imageUrl;
    }
    if (mode === 'base64' || mode === 'both') {
      payload.imageBase64 = result.base64;
      payload.mimeType = 'image/png';
    }

    if ((mode === 'url' || mode === 'both') && shouldUpload && !result.imageUrl) {
      return res.status(500).json({ error: 'Screenshot captured but upload failed' });
    }

    return res.status(200).json(payload);
  } catch (error) {
    console.error('Snappy capture failed:', error);
    return res.status(500).json({
      error: 'Snappy capture failed',
      details: error.message,
    });
  }
}
