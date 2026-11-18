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
 * Must run BEFORE html/url load so page scripts read reduced-motion as true
 * on first matchMedia() (otherwise scroll-jack layouts arm and stay on).
 */
async function preferReducedMotion(page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    const native = window.matchMedia.bind(window);
    window.matchMedia = (query) => {
      const mql = native(query);
      if (!/prefers-reduced-motion\s*:\s*reduce/i.test(String(query))) return mql;
      const forced = {
        matches: true,
        media: mql.media,
        onchange: null,
        addListener: (cb) => mql.addListener?.(cb),
        removeListener: (cb) => mql.removeListener?.(cb),
        addEventListener: (type, cb, opts) => mql.addEventListener?.(type, cb, opts),
        removeEventListener: (type, cb, opts) =>
          mql.removeEventListener?.(type, cb, opts),
        dispatchEvent: (ev) => mql.dispatchEvent?.(ev) ?? false,
      };
      return forced;
    };
  });
}

function forceStackedStoryLayout() {
  // Runs in the page. Collapse sideways “pin track” storytelling into normal flow.
  const collapse = () => {
    document.documentElement.classList.add('snappy-capture');
    window.__SNAPPY_CAPTURE__ = true;

    document.querySelectorAll('.horizontal').forEach((el) => {
      el.classList.remove('horizontal');
    });

    document.querySelectorAll('.week, [data-block="story-panels"]').forEach((week) => {
      if (!(week instanceof HTMLElement)) return;
      week.classList.remove('horizontal');
      week.style.setProperty('height', 'auto', 'important');
      week.style.setProperty('min-height', '0', 'important');

      const pin = week.querySelector('.pin');
      if (pin instanceof HTMLElement) {
        pin.style.setProperty('position', 'relative', 'important');
        pin.style.setProperty('height', 'auto', 'important');
        pin.style.setProperty('overflow', 'visible', 'important');
      }

      const track = week.querySelector('.track, [data-slot="panels"]');
      if (track instanceof HTMLElement) {
        track.style.setProperty('display', 'block', 'important');
        track.style.setProperty('transform', 'none', 'important');
        track.style.setProperty('height', 'auto', 'important');
        track.style.setProperty('will-change', 'auto', 'important');
      }

      week.querySelectorAll('.panel, [data-item]').forEach((panel) => {
        if (!(panel instanceof HTMLElement)) return;
        panel.style.setProperty('flex', 'none', 'important');
        panel.style.setProperty('width', '100%', 'important');
        panel.style.setProperty('height', 'auto', 'important');
        panel.style.setProperty('min-height', '0', 'important');
        panel.style.setProperty('overflow', 'hidden', 'important');
      });
    });

    // Any leftover scroll-pin spacer: inline height like 600vh.
    for (const el of document.body.querySelectorAll('*')) {
      if (!(el instanceof HTMLElement)) continue;
      const inlineH = el.style.height || '';
      const vhMatch = inlineH.match(/^(\d+(?:\.\d+)?)vh$/i);
      if (vhMatch && parseFloat(vhMatch[1]) >= 200) {
        el.style.setProperty('height', 'auto', 'important');
        el.style.setProperty('min-height', '0', 'important');
      }
      if (el.style.transform && /translate/i.test(el.style.transform)) {
        el.style.setProperty('transform', 'none', 'important');
      }
    }

    window.scrollTo(0, 0);
  };

  collapse();
  return collapse;
}

/**
 * Generic pre-capture hygiene for arbitrary landing pages.
 */
async function preparePageForCapture(page) {
  await page.addStyleTag({
    content: `
      html.snappy-capture,
      html.snappy-capture body {
        height: auto !important;
        min-height: 0 !important;
        max-height: none !important;
        overflow: visible !important;
      }
      html.snappy-capture canvas.fixed,
      html.snappy-capture canvas[class*="fixed"],
      html.snappy-capture [aria-hidden="true"].fixed,
      html.snappy-capture [aria-hidden="true"][class*="fixed"][class*="inset-0"] {
        display: none !important;
      }
      html.snappy-capture [class*="sticky"],
      html.snappy-capture header {
        position: relative !important;
        top: auto !important;
      }
      /* Story-panel horizontal pins — force stack even if .horizontal returns */
      html.snappy-capture .week,
      html.snappy-capture .week.horizontal,
      html.snappy-capture [data-block="story-panels"] {
        height: auto !important;
        min-height: 0 !important;
      }
      html.snappy-capture .week .pin,
      html.snappy-capture .week.horizontal .pin {
        position: relative !important;
        height: auto !important;
        overflow: visible !important;
      }
      html.snappy-capture .week .track,
      html.snappy-capture .week.horizontal .track {
        display: block !important;
        height: auto !important;
        transform: none !important;
        will-change: auto !important;
      }
      html.snappy-capture .week .panel,
      html.snappy-capture .week.horizontal .panel {
        flex: none !important;
        width: 100% !important;
        height: auto !important;
        min-height: 0 !important;
        overflow: hidden !important;
      }
      html.snappy-capture .week .panel-inner {
        height: auto !important;
        grid-template-columns: 1fr !important;
      }
    `,
  });

  await page.evaluate(async () => {
    try {
      if (document.fonts?.ready) await document.fonts.ready;
    } catch {
      /* ignore */
    }
  });

  // Collapse once, nudge layout listeners, then collapse again so setMode
  // cannot leave a 600vh horizontal pin behind.
  await page.evaluate(forceStackedStoryLayout);
  await page.evaluate(() => {
    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new Event('orientationchange'));
  });
  await delay(450);
  await page.evaluate(forceStackedStoryLayout);
  await delay(100);
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

    // Before navigation/setContent so first matchMedia('prefers-reduced-motion') is true.
    await preferReducedMotion(page);

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
