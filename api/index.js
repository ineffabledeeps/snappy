import { requireApiAuth } from '../lib/auth.js';
import { applyCors } from '../lib/cors.js';
import { snappyCapture } from '../lib/snappy.js';

const PRESET_EXAMPLE = {
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1,
  isMobile: false,
  hasTouch: false,
  colorScheme: null,
  locale: 'en-US',
  timezoneId: 'UTC',
  userAgent: '',
  stealth: false,
};

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (requireApiAuth(req, res)) return;

  if (req.method === 'GET') {
    return res.status(200).json({
      name: 'snappy',
      db: false,
      description: 'DB-less full-page screenshot API. Pass url|html + optional preset JSON.',
      preset: PRESET_EXAMPLE,
      usage: {
        method: 'POST',
        body: {
          url: 'https://example.com',
          html: null,
          preset: PRESET_EXAMPLE,
          waitUntil: 'networkidle',
          upload: false,
        },
        response: {
          success: true,
          mimeType: 'image/png',
          bytes: 0,
          encoding: 'base64',
          image: { base64: '…', dataUrl: 'data:image/png;base64,…' },
          cloudinary: null,
          source: { type: 'url', url: 'https://example.com' },
          preset: PRESET_EXAMPLE,
          durationMs: 0,
        },
      },
    });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    url,
    html,
    preset = null,
    waitUntil = 'networkidle',
    upload = false,
  } = req.body || {};

  const hasUrl = Boolean(String(url || '').trim());
  const hasHtml = html != null && Boolean(String(html).trim());
  if (!hasUrl && !hasHtml) {
    return res.status(400).json({ error: 'Provide either url or html' });
  }
  if (hasUrl && hasHtml) {
    return res.status(400).json({ error: 'Provide url or html, not both' });
  }

  try {
    const result = await snappyCapture({
      url,
      html,
      preset,
      waitUntil,
      upload: Boolean(upload),
    });

    // Strip Node Buffer — portable JSON only
    return res.status(200).json({
      success: true,
      mimeType: result.mimeType,
      bytes: result.bytes,
      encoding: result.encoding,
      image: result.image,
      cloudinary: result.cloudinary,
      source: result.source,
      preset: result.preset,
      durationMs: result.durationMs,
    });
  } catch (error) {
    console.error('Snappy capture failed:', error);
    return res.status(500).json({
      error: 'Snappy capture failed',
      details: error.message,
    });
  }
}
