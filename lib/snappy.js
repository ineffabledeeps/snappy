import { launchBrowser } from './browser.js';
import { isCloudinaryConfigured, uploadPngBase64 } from './cloudinary.js';
import { normalizePreset, toBrowserContextOptions } from './preset.js';

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadPage(page, { url, html, waitUntil = 'networkidle' }) {
  const settled = ['load', 'domcontentloaded', 'networkidle', 'commit'].includes(waitUntil)
    ? waitUntil
    : 'networkidle';

  if (html != null && String(html).trim()) {
    await page.setContent(String(html), { waitUntil: settled === 'networkidle' ? 'load' : settled });
    await delay(150);
    return { type: 'html' };
  }

  const target = String(url || '').trim();
  if (!target) throw new Error('Provide either url or html');

  await page.goto(target, { waitUntil: settled, timeout: 45_000 });
  return { type: 'url', url: target };
}

/**
 * Capture a full-page PNG. Always returns portable image fields; Cloudinary is optional.
 */
export async function snappyCapture({
  url,
  html,
  preset,
  waitUntil = 'networkidle',
  upload = false,
} = {}) {
  const start = Date.now();
  const resolvedPreset = normalizePreset(preset);
  const stealth = Boolean(resolvedPreset.stealth);

  let browser = null;
  try {
    browser = await launchBrowser({ stealth });
    const context = await browser.newContext(toBrowserContextOptions(resolvedPreset));
    const page = await context.newPage();

    const source = await loadPage(page, { url, html, waitUntil });

    const image = await page.screenshot({ type: 'png', fullPage: true });
    const buffer = Buffer.isBuffer(image) ? image : Buffer.from(image);
    const base64 = buffer.toString('base64');
    const mimeType = 'image/png';

    let cloudinary = null;
    if (upload) {
      if (!isCloudinaryConfigured()) {
        throw new Error('upload=true but Cloudinary is not configured');
      }
      cloudinary = await uploadPngBase64(base64);
    }

    return {
      success: true,
      mimeType,
      bytes: buffer.length,
      encoding: 'base64',
      // Portable for other servers: raw base64 + data URL
      image: {
        base64,
        dataUrl: `data:${mimeType};base64,${base64}`,
      },
      // Optional host upload
      cloudinary,
      source,
      preset: resolvedPreset,
      durationMs: Date.now() - start,
      buffer,
    };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}
