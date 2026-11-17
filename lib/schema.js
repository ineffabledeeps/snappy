export const WAIT_UNTIL_VALUES = ['networkidle', 'load', 'domcontentloaded', 'commit'];

/** Per-key hints for request body (shown on GET and on 400s). */
export const EXPECTED_BODY = {
  url: {
    type: 'string',
    required: 'one of url | html',
    example: 'https://example.com',
    hint: 'Absolute http(s) page URL to open and screenshot. Mutually exclusive with html.',
  },
  html: {
    type: 'string',
    required: 'one of url | html',
    example: '<!doctype html><html><body>…</body></html>',
    hint: 'Raw HTML document to render via setContent. Mutually exclusive with url.',
  },
  waitUntil: {
    type: 'string',
    required: false,
    default: 'networkidle',
    enum: WAIT_UNTIL_VALUES,
    example: 'networkidle',
    hint: 'Playwright load state before capturing. Prefer networkidle for remote pages; load is fine for static html.',
  },
  preset: {
    type: 'object',
    required: false,
    hint: 'Inline viewport/device options for this request only. Nothing is stored. Omit to use 1280×720 desktop defaults.',
    keys: {
      viewport: {
        type: 'object',
        required: false,
        example: { width: 1280, height: 720 },
        hint: 'Browser viewport in CSS pixels. width/height must be positive numbers.',
        keys: {
          width: {
            type: 'number',
            required: true,
            example: 1280,
            hint: 'Viewport width in CSS pixels (> 0).',
          },
          height: {
            type: 'number',
            required: true,
            example: 720,
            hint: 'Viewport height in CSS pixels (> 0). Full-page shot still scrolls beyond this.',
          },
        },
      },
      screen: {
        type: 'object | null',
        required: false,
        example: { width: 1280, height: 720 },
        hint: 'Optional screen size reported to the page. Same shape as viewport, or null.',
        keys: {
          width: {
            type: 'number',
            required: true,
            example: 1280,
            hint: 'Screen width in CSS pixels (> 0).',
          },
          height: {
            type: 'number',
            required: true,
            example: 720,
            hint: 'Screen height in CSS pixels (> 0).',
          },
        },
      },
      deviceScaleFactor: {
        type: 'number',
        required: false,
        default: 1,
        example: 1,
        hint: 'Device pixel ratio (>= 1). Use 2–3 for retina/mobile sharpness.',
      },
      isMobile: {
        type: 'boolean',
        required: false,
        default: false,
        example: false,
        hint: 'Emulate a mobile browser (affects touch/layout heuristics).',
      },
      hasTouch: {
        type: 'boolean',
        required: false,
        default: false,
        example: false,
        hint: 'Expose touch support to the page.',
      },
      colorScheme: {
        type: 'string | null',
        required: false,
        enum: ['light', 'dark', null],
        example: null,
        hint: 'Prefers-color-scheme: "light", "dark", or null for default.',
      },
      locale: {
        type: 'string',
        required: false,
        default: 'en-US',
        example: 'en-US',
        hint: 'BCP-47 locale for the browser context (e.g. en-US, fr-FR).',
      },
      timezoneId: {
        type: 'string',
        required: false,
        default: 'UTC',
        example: 'UTC',
        hint: 'IANA timezone id (e.g. UTC, America/New_York).',
      },
      userAgent: {
        type: 'string',
        required: false,
        default: '',
        example: '',
        hint: 'Override User-Agent. Empty string keeps Playwright/Chromium default (or stealth UA when stealth=true).',
      },
      stealth: {
        type: 'boolean',
        required: false,
        default: false,
        example: false,
        hint: 'Launch with stealth patches to reduce bot detection.',
      },
    },
  },
};

/** Example values only (for quick copy/paste). */
export const EXAMPLE_REQUEST = {
  url: 'https://example.com',
  html: null,
  waitUntil: 'networkidle',
  preset: {
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
  },
};

export const EXPECTED_RESPONSE = {
  success: {
    type: 'boolean',
    example: true,
    hint: 'true when capture succeeded.',
  },
  mimeType: {
    type: 'string',
    example: 'image/png',
    hint: 'Image MIME type. Always image/png.',
  },
  bytes: {
    type: 'number',
    example: 184220,
    hint: 'PNG byte length before base64 encoding.',
  },
  encoding: {
    type: 'string',
    example: 'base64',
    hint: 'Encoding of image.base64.',
  },
  image: {
    type: 'object',
    hint: 'Portable image payload for other servers to store or forward.',
    keys: {
      base64: {
        type: 'string',
        example: 'iVBORw0KGgo…',
        hint: 'Raw PNG as base64 (no data: prefix).',
      },
      dataUrl: {
        type: 'string',
        example: 'data:image/png;base64,iVBORw0KGgo…',
        hint: 'Ready-to-use data URL (mime + base64).',
      },
    },
  },
  source: {
    type: 'object',
    hint: 'What was captured.',
    keys: {
      type: {
        type: 'string',
        enum: ['url', 'html'],
        example: 'url',
        hint: 'Whether the capture came from a url or html body.',
      },
      url: {
        type: 'string',
        example: 'https://example.com',
        hint: 'Present when source.type is url.',
      },
    },
  },
  preset: {
    type: 'object',
    hint: 'Normalized preset actually applied (defaults filled in).',
    example: EXAMPLE_REQUEST.preset,
  },
  durationMs: {
    type: 'number',
    example: 2140,
    hint: 'Wall time for browser launch + load + screenshot, in milliseconds.',
  },
};

// Back-compat aliases used by older imports
export const PRESET_EXAMPLE = EXAMPLE_REQUEST.preset;
export const EXPECTED_REQUEST = EXAMPLE_REQUEST;

const ALLOWED_BODY_KEYS = new Set(['url', 'html', 'preset', 'waitUntil']);
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

export function expectedDocs() {
  return {
    method: 'POST',
    contentType: 'application/json',
    body: EXPECTED_BODY,
    example: EXAMPLE_REQUEST,
    response: EXPECTED_RESPONSE,
  };
}

export function badPayloadResponse(validation) {
  return {
    success: false,
    error: validation.error,
    issues: validation.issues,
    received: validation.received,
    expected: expectedDocs(),
  };
}
