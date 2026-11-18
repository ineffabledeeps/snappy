import { launchBrowser } from './browser.js';
import { normalizePreset, toBrowserContextOptions } from './preset.js';
import { stripEmptyPixels } from './stripEmptyPixels.js';

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadPage(page, { url, html, waitUntil = 'networkidle' }) {
  const settled = ['load', 'domcontentloaded', 'networkidle', 'commit'].includes(waitUntil)
    ? waitUntil
    : 'networkidle';

  if (html != null && String(html).trim()) {
    await page.setContent(String(html), {
      waitUntil: settled === 'networkidle' ? 'load' : settled,
      timeout: 60_000,
    });
    return { type: 'html' };
  }

  const target = String(url || '').trim();
  if (!target) throw new Error('Provide either url or html');

  await page.goto(target, { waitUntil: settled, timeout: 60_000 });
  return { type: 'url', url: target };
}

/**
 * Generic pre-capture hygiene for arbitrary landing pages:
 * - honor reduced-motion (disables many scroll-jack / parallax modes)
 * - neutralize sticky/fixed overlays that break fullPage stitching
 * - collapse oversized vh scroll-pin spacers
 * - clip overflow so decorative SVG/canvas cannot paint over later sections
 */
async function preparePageForCapture(page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });

  await page.addStyleTag({
    content: `
      html.snappy-capture,
      html.snappy-capture body {
        height: auto !important;
        min-height: 0 !important;
        max-height: none !important;
        overflow: visible !important;
      }
      /* Effect canvases / full-bleed fixed decor — never part of the design box */
      html.snappy-capture canvas.fixed,
      html.snappy-capture canvas[class*="fixed"],
      html.snappy-capture [aria-hidden="true"].fixed,
      html.snappy-capture [aria-hidden="true"][class*="fixed"][class*="inset-0"] {
        display: none !important;
      }
      /* Sticky/fixed chrome breaks Chromium fullPage scroll stitching */
      html.snappy-capture [class*="sticky"],
      html.snappy-capture header {
        position: relative !important;
        top: auto !important;
      }
    `,
  });

  await page.evaluate(async () => {
    document.documentElement.classList.add('snappy-capture');
    window.__SNAPPY_CAPTURE__ = true;

    try {
      if (document.fonts?.ready) await document.fonts.ready;
    } catch {
      /* ignore */
    }

    const vhPx = window.innerHeight || 800;

    for (const el of document.body.querySelectorAll('*')) {
      if (!(el instanceof HTMLElement)) continue;

      // Collapse scroll-pin spacers: inline height like 500vh / 600vh.
      const inlineH = el.style.height || '';
      const vhMatch = inlineH.match(/^(\d+(?:\.\d+)?)vh$/i);
      if (vhMatch && parseFloat(vhMatch[1]) >= 200) {
        el.style.setProperty('height', 'auto', 'important');
        el.style.setProperty('min-height', '0', 'important');
      }

      // Same for computed min-height spacers that invent empty scroll room.
      const cs = window.getComputedStyle(el);
      const minH = cs.minHeight;
      if (minH.endsWith('px')) {
        const px = parseFloat(minH);
        if (px >= vhPx * 2.5 && px >= el.scrollHeight + vhPx) {
          el.style.setProperty('min-height', '0', 'important');
        }
      }

      // Horizontal story tracks: drop translate so children stack in flow.
      if (el.style.transform && /translate/i.test(el.style.transform)) {
        el.style.setProperty('transform', 'none', 'important');
      }

      // Common class toggles for sideways storytelling.
      if (el.classList.contains('horizontal')) {
        el.classList.remove('horizontal');
      }
    }

    // Clip overflow on large section boxes so abs/SVG art cannot cover siblings.
    document
      .querySelectorAll('section, article, main, [class*="panel"], [class*="slide"]')
      .forEach((el) => {
        if (!(el instanceof HTMLElement)) return;
        el.style.setProperty('overflow', 'hidden', 'important');
      });

    window.dispatchEvent(new Event('resize'));
    window.scrollTo(0, 0);
  });

  // Let reduced-motion listeners + CDN CSS settle.
  await delay(400);
  await page.evaluate(() => window.scrollTo(0, 0));
}

/** Capture a full-page PNG and return a portable base64 / dataUrl payload. */
export async function snappyCapture({
  url,
  html,
  preset,
  waitUntil = 'networkidle',
  stripEmpty = true,
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
    await preparePageForCapture(page);

    const image = await page.screenshot({ type: 'png', fullPage: true });
    const raw = Buffer.isBuffer(image) ? image : Buffer.from(image);

    let buffer = raw;
    let trim = null;
    if (stripEmpty !== false) {
      try {
        const stripped = stripEmptyPixels(raw, {
          pad: 8,
          axes: 'y',
          ...(typeof stripEmpty === 'object' ? stripEmpty : {}),
        });
        buffer = stripped.buffer;
        trim = stripped.meta;
      } catch (err) {
        // Never fail a capture because trim could not parse a rare PNG variant.
        trim = { changed: false, error: err?.message || String(err) };
      }
    }

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
      trim,
      durationMs: Date.now() - start,
      buffer,
    };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

export { stripEmptyPixels } from './stripEmptyPixels.js';
