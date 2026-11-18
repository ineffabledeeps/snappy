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
 * Full-page captures should show stacked document flow — not scroll-jacked /
 * sticky-horizontal story layouts that invent hundreds of vh of empty space
 * (black voids between hero and footer).
 */
async function preparePageForCapture(page) {
  // Prefer reduced-motion layouts when pages honor the media query.
  await page.emulateMedia({ reducedMotion: 'reduce' });

  await page.addStyleTag({
    content: `
      html.snappy-capture .week {
        height: auto !important;
      }
      html.snappy-capture .week.horizontal,
      html.snappy-capture .week .pin {
        position: relative !important;
        height: auto !important;
        overflow: visible !important;
      }
      html.snappy-capture .week .track {
        display: block !important;
        height: auto !important;
        transform: none !important;
        will-change: auto !important;
      }
      html.snappy-capture .week .panel {
        flex: none !important;
        width: 100% !important;
        height: auto !important;
        min-height: 0 !important;
      }
      html.snappy-capture .week .panel-inner {
        height: auto !important;
        grid-template-columns: 1fr !important;
      }
      html.snappy-capture .hdr {
        position: absolute !important;
      }
    `,
  });

  await page.evaluate(async () => {
    document.documentElement.classList.add('snappy-capture');

    try {
      if (document.fonts?.ready) await document.fonts.ready;
    } catch {
      /* ignore */
    }

    // Collapse sticky pin tracks used for horizontal scroll storytelling.
    document.querySelectorAll('.week').forEach((week) => {
      week.classList.remove('horizontal');
      week.style.height = 'auto';
      week.style.minHeight = '0';
      const pin = week.querySelector('.pin');
      if (pin) {
        pin.style.position = 'relative';
        pin.style.height = 'auto';
        pin.style.overflow = 'visible';
      }
      const track = week.querySelector('.track');
      if (track) {
        track.style.transform = 'none';
        track.style.display = 'block';
        track.style.height = 'auto';
      }
      week.querySelectorAll('.panel').forEach((panel) => {
        panel.style.width = '100%';
        panel.style.height = 'auto';
        panel.style.flex = 'none';
      });
    });

    // Nudge layout listeners after forcing stack mode.
    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new Event('orientationchange'));
  });

  // Tailwind CDN + late layout scripts need a beat after reduced-motion flips.
  await delay(500);

  // Re-assert stack in case page scripts re-enabled horizontal on resize.
  await page.evaluate(() => {
    document.querySelectorAll('.week').forEach((week) => {
      week.classList.remove('horizontal');
      week.style.height = 'auto';
      const track = week.querySelector('.track');
      if (track) track.style.transform = 'none';
    });
    window.scrollTo(0, 0);
  });
  await delay(150);
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
    await preparePageForCapture(page);

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
