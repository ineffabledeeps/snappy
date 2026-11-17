import { launchBrowser } from './browser.js';
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

/** Capture a full-page PNG and return a portable base64 / dataUrl payload. */
export async function snappyCapture({
  url,
  html,
  preset,
  waitUntil = 'networkidle',
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

    return {
      success: true,
      mimeType,
      bytes: buffer.length,
      encoding: 'base64',
      image: {
        base64,
        dataUrl: `data:${mimeType};base64,${base64}`,
      },
      source,
      preset: resolvedPreset,
      durationMs: Date.now() - start,
      buffer,
    };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}
