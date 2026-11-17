import { launchBrowser } from './browser.js';
import { uploadPngBase64 } from './cloudinary.js';
import { presetFieldsFromDevice } from './devices.js';
import { createBrowserContextOptionsFromPreset, normalizePresetInput, stealthFromPreset } from './preset.js';

const DEFAULT_PRESET = {
  name: 'Snappy Desktop',
  baseDevice: 'Desktop Chrome',
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1,
  isMobile: false,
  hasTouch: false,
  locale: 'en-US',
  timezoneId: 'UTC',
  stealth: false,
};

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function resolveSnappyPreset({ preset, device } = {}) {
  if (device) {
    const fromDevice = presetFieldsFromDevice(String(device).trim());
    if (!fromDevice) {
      throw new Error(`Unknown device "${device}"`);
    }
    if (preset && typeof preset === 'object') {
      return normalizePresetInput({
        ...fromDevice,
        ...preset,
        name: preset.name || fromDevice.baseDevice || 'Snappy',
      });
    }
    return fromDevice;
  }

  if (preset && typeof preset === 'object') {
    return normalizePresetInput({
      ...DEFAULT_PRESET,
      ...preset,
      name: preset.name || 'Snappy',
    });
  }

  return DEFAULT_PRESET;
}

async function loadPage(page, { url, html, waitUntil = 'networkidle' }) {
  const settled = ['load', 'domcontentloaded', 'networkidle', 'commit'].includes(waitUntil)
    ? waitUntil
    : 'networkidle';

  if (html != null && String(html).trim()) {
    await page.setContent(String(html), { waitUntil: settled === 'networkidle' ? 'load' : settled });
    await delay(150);
    return { source: 'html' };
  }

  const target = String(url || '').trim();
  if (!target) {
    throw new Error('Provide either url or html');
  }

  await page.goto(target, { waitUntil: settled, timeout: 45_000 });
  return { source: 'url', url: target };
}

/**
 * Capture a full-page PNG of a URL or HTML string using optional preset sizing.
 */
export async function snappyCapture({
  url,
  html,
  preset,
  device,
  waitUntil = 'networkidle',
  upload = true,
} = {}) {
  const start = Date.now();
  const resolved = resolveSnappyPreset({ preset, device });
  const stealth = stealthFromPreset(resolved);

  let browser = null;
  try {
    browser = await launchBrowser({ stealth });
    const context = await browser.newContext(createBrowserContextOptionsFromPreset(resolved));
    const page = await context.newPage();

    const loaded = await loadPage(page, { url, html, waitUntil });

    const image = await page.screenshot({ type: 'png', fullPage: true });
    const buffer = Buffer.isBuffer(image) ? image : Buffer.from(image);
    const base64 = buffer.toString('base64');

    let imageUrl = null;
    if (upload) {
      imageUrl = await uploadPngBase64(base64, `snappy-${Date.now()}`);
    }

    return {
      buffer,
      base64,
      imageUrl,
      viewport: resolved.viewport,
      deviceScaleFactor: resolved.deviceScaleFactor ?? 1,
      presetName: resolved.name || resolved.baseDevice || null,
      ...loaded,
      durationMs: Date.now() - start,
    };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}
