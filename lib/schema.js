export const PRESET_EXAMPLE = {
  viewport: { width: 1280, height: 720 },
  screen: null,
  deviceScaleFactor: 1,
  isMobile: false,
  hasTouch: false,
  colorScheme: null,
  locale: 'en-US',
  timezoneId: 'UTC',
  userAgent: '',
  stealth: false,
};

export const EXPECTED_REQUEST = {
  url: 'https://example.com',
  html: null,
  preset: PRESET_EXAMPLE,
  waitUntil: 'networkidle',
  upload: false,
};

export const EXPECTED_RESPONSE = {
  success: true,
  mimeType: 'image/png',
  bytes: 0,
  encoding: 'base64',
  image: {
    base64: '…',
    dataUrl: 'data:image/png;base64,…',
  },
  cloudinary: null,
  source: { type: 'url', url: 'https://example.com' },
  preset: PRESET_EXAMPLE,
  durationMs: 0,
};

export const WAIT_UNTIL_VALUES = ['networkidle', 'load', 'domcontentloaded', 'commit'];

const ALLOWED_BODY_KEYS = new Set(['url', 'html', 'preset', 'waitUntil', 'upload']);
const ALLOWED_PRESET_KEYS = new Set([
  'viewport',
  'screen',
  'deviceScaleFactor',
  'isMobile',
  'hasTouch',
  'colorScheme',
  'locale',
  'timezoneId',
  'userAgent',
  'stealth',
]);

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function sizePairErrors(label, value) {
  const errors = [];
  if (!isPlainObject(value)) {
    errors.push(`${label} must be an object like { "width": number, "height": number }`);
    return errors;
  }
  if (typeof value.width !== 'number' || !Number.isFinite(value.width) || value.width <= 0) {
    errors.push(`${label}.width must be a positive number`);
  }
  if (typeof value.height !== 'number' || !Number.isFinite(value.height) || value.height <= 0) {
    errors.push(`${label}.height must be a positive number`);
  }
  return errors;
}

/**
 * Validate POST body. Returns { ok: true, value } or { ok: false, error, issues, received }.
 */
export function validateCaptureBody(body) {
  const issues = [];

  if (body == null || typeof body !== 'object' || Array.isArray(body)) {
    return {
      ok: false,
      error: 'Request body must be a JSON object',
      issues: ['Send Content-Type: application/json with a JSON object body'],
      received: body === undefined ? null : body,
    };
  }

  const unknownKeys = Object.keys(body).filter((key) => !ALLOWED_BODY_KEYS.has(key));
  if (unknownKeys.length) {
    issues.push(`Unknown field(s): ${unknownKeys.join(', ')}. Allowed: ${[...ALLOWED_BODY_KEYS].join(', ')}`);
  }

  const url = body.url;
  const html = body.html;
  const hasUrl = typeof url === 'string' && Boolean(url.trim());
  const hasHtml = typeof html === 'string' && Boolean(html.trim());

  if (url != null && typeof url !== 'string') {
    issues.push('url must be a string when provided');
  }
  if (html != null && typeof html !== 'string') {
    issues.push('html must be a string when provided');
  }

  if (!hasUrl && !hasHtml) {
    issues.push('Provide exactly one of url or html (non-empty string)');
  } else if (hasUrl && hasHtml) {
    issues.push('Provide url or html, not both');
  }

  if (hasUrl) {
    try {
      const parsed = new URL(url.trim());
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        issues.push('url must use http: or https:');
      }
    } catch {
      issues.push('url must be a valid absolute URL, e.g. "https://example.com"');
    }
  }

  if (body.preset != null) {
    if (!isPlainObject(body.preset)) {
      issues.push('preset must be an object (inline device/viewport config)');
    } else {
      const unknownPreset = Object.keys(body.preset).filter((key) => !ALLOWED_PRESET_KEYS.has(key));
      if (unknownPreset.length) {
        issues.push(
          `Unknown preset field(s): ${unknownPreset.join(', ')}. Allowed: ${[...ALLOWED_PRESET_KEYS].join(', ')}`,
        );
      }

      if (body.preset.viewport != null) {
        issues.push(...sizePairErrors('preset.viewport', body.preset.viewport));
      }
      if (body.preset.screen != null) {
        issues.push(...sizePairErrors('preset.screen', body.preset.screen));
      }
      if (
        body.preset.deviceScaleFactor != null &&
        (typeof body.preset.deviceScaleFactor !== 'number' ||
          !Number.isFinite(body.preset.deviceScaleFactor) ||
          body.preset.deviceScaleFactor < 1)
      ) {
        issues.push('preset.deviceScaleFactor must be a number >= 1');
      }
      for (const flag of ['isMobile', 'hasTouch', 'stealth']) {
        if (body.preset[flag] != null && typeof body.preset[flag] !== 'boolean') {
          issues.push(`preset.${flag} must be a boolean`);
        }
      }
      if (
        body.preset.colorScheme != null &&
        body.preset.colorScheme !== 'light' &&
        body.preset.colorScheme !== 'dark'
      ) {
        issues.push('preset.colorScheme must be "light", "dark", or null');
      }
      for (const str of ['locale', 'timezoneId', 'userAgent']) {
        if (body.preset[str] != null && typeof body.preset[str] !== 'string') {
          issues.push(`preset.${str} must be a string`);
        }
      }
    }
  }

  if (body.waitUntil != null) {
    if (typeof body.waitUntil !== 'string' || !WAIT_UNTIL_VALUES.includes(body.waitUntil)) {
      issues.push(`waitUntil must be one of: ${WAIT_UNTIL_VALUES.join(', ')}`);
    }
  }

  if (body.upload != null && typeof body.upload !== 'boolean') {
    issues.push('upload must be a boolean (default false)');
  }

  if (issues.length) {
    return {
      ok: false,
      error: 'Invalid payload',
      issues,
      received: summarizeReceived(body),
    };
  }

  return {
    ok: true,
    value: {
      url: hasUrl ? url.trim() : null,
      html: hasHtml ? html : null,
      preset: body.preset ?? null,
      waitUntil: body.waitUntil || 'networkidle',
      upload: Boolean(body.upload),
    },
  };
}

function summarizeReceived(body) {
  if (!isPlainObject(body)) return body;
  const summary = {};
  for (const [key, value] of Object.entries(body)) {
    if (key === 'html' && typeof value === 'string') {
      summary.html = value.length > 120 ? `${value.slice(0, 120)}… (${value.length} chars)` : value;
    } else if (key === 'preset' && isPlainObject(value)) {
      summary.preset = value;
    } else {
      summary[key] = value;
    }
  }
  return summary;
}

export function badPayloadResponse(validation) {
  return {
    success: false,
    error: validation.error,
    issues: validation.issues,
    received: validation.received,
    expected: {
      method: 'POST',
      contentType: 'application/json',
      body: EXPECTED_REQUEST,
      notes: [
        'Send either url or html (exactly one).',
        'preset is optional; omit it to use 1280×720 desktop defaults.',
        'upload defaults to false; set true only if Cloudinary is configured.',
        'Response always includes image.base64 and image.dataUrl for other servers.',
      ],
      response: EXPECTED_RESPONSE,
    },
  };
}
