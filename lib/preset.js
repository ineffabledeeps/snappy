/**
 * Inline preset shape (no storage). Callers pass this on each request.
 *
 * {
 *   viewport: { width, height },
 *   screen?: { width, height },
 *   deviceScaleFactor?: number,
 *   isMobile?: boolean,
 *   hasTouch?: boolean,
 *   colorScheme?: 'light' | 'dark',
 *   locale?: string,
 *   timezoneId?: string,
 *   userAgent?: string,
 *   stealth?: boolean
 * }
 */

const DEFAULTS = {
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

export function normalizePreset(input = {}) {
  const viewport = input.viewport || {};
  const screen = input.screen;

  return {
    viewport: {
      width: Number(viewport.width) || DEFAULTS.viewport.width,
      height: Number(viewport.height) || DEFAULTS.viewport.height,
    },
    screen:
      screen && Number(screen.width) && Number(screen.height)
        ? { width: Number(screen.width), height: Number(screen.height) }
        : null,
    deviceScaleFactor: Math.max(1, Number(input.deviceScaleFactor) || DEFAULTS.deviceScaleFactor),
    isMobile: Boolean(input.isMobile),
    hasTouch: Boolean(input.hasTouch),
    colorScheme: input.colorScheme === 'light' || input.colorScheme === 'dark' ? input.colorScheme : null,
    locale: String(input.locale || DEFAULTS.locale).trim() || DEFAULTS.locale,
    timezoneId: String(input.timezoneId || DEFAULTS.timezoneId).trim() || DEFAULTS.timezoneId,
    userAgent: String(input.userAgent || '').trim(),
    stealth: Boolean(input.stealth),
  };
}

export function toBrowserContextOptions(preset) {
  const p = normalizePreset(preset);
  const options = {
    viewport: p.viewport,
    deviceScaleFactor: p.deviceScaleFactor,
    isMobile: p.isMobile,
    hasTouch: p.hasTouch,
    locale: p.locale,
    timezoneId: p.timezoneId,
  };

  if (p.screen) options.screen = p.screen;
  if (p.colorScheme) options.colorScheme = p.colorScheme;

  if (p.userAgent) {
    options.userAgent = p.userAgent;
  } else if (p.stealth) {
    options.userAgent =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36';
  }

  if (p.stealth) {
    options.extraHTTPHeaders = { 'Accept-Language': 'en-US,en;q=0.9' };
  }

  return options;
}
