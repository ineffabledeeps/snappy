import { requireApiAuth } from '../lib/auth.js';
import { applyCors } from '../lib/cors.js';
import {
  EXPECTED_REQUEST,
  EXPECTED_RESPONSE,
  PRESET_EXAMPLE,
  badPayloadResponse,
  validateCaptureBody,
} from '../lib/schema.js';
import { snappyCapture } from '../lib/snappy.js';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (requireApiAuth(req, res)) return;

  if (req.method === 'GET') {
    return res.status(200).json({
      name: 'snappy',
      db: false,
      description: 'DB-less full-page screenshot API. Pass url|html + optional preset JSON.',
      expected: {
        method: 'POST',
        contentType: 'application/json',
        body: EXPECTED_REQUEST,
        response: EXPECTED_RESPONSE,
        preset: PRESET_EXAMPLE,
      },
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      issues: [`Got ${req.method}; use POST`],
      expected: {
        method: 'POST',
        contentType: 'application/json',
        body: EXPECTED_REQUEST,
      },
    });
  }

  const validation = validateCaptureBody(req.body);
  if (!validation.ok) {
    return res.status(400).json(badPayloadResponse(validation));
  }

  const { url, html, preset, waitUntil } = validation.value;

  try {
    const result = await snappyCapture({
      url,
      html,
      preset,
      waitUntil,
    });

    return res.status(200).json({
      success: true,
      mimeType: result.mimeType,
      bytes: result.bytes,
      encoding: result.encoding,
      image: result.image,
      source: result.source,
      preset: result.preset,
      durationMs: result.durationMs,
    });
  } catch (error) {
    console.error('Snappy capture failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Snappy capture failed',
      details: error.message,
      expected: {
        body: EXPECTED_REQUEST,
        response: EXPECTED_RESPONSE,
      },
    });
  }
}
