import { createBrowserContextOptions as legacyOptions } from './browser.js';

const COLOR_SCHEMES = new Set(['light', 'dark', null, undefined, '']);

export function normalizePresetInput(body = {}) {
  const viewport = body.viewport || {};
  const screen = body.screen;

  return {
    name: String(body.name || '').trim(),
    baseDevice: String(body.baseDevice || 'Desktop Chrome').trim(),
    viewport: {
      width: Number(viewport.width) || 1280,
      height: Number(viewport.height) || 720,
    },
    screen: screen && Number(screen.width) && Number(screen.height)
      ? { width: Number(screen.width), height: Number(screen.height) }
      : null,
    deviceScaleFactor: Math.max(1, Number(body.deviceScaleFactor) || 1),
    isMobile: Boolean(body.isMobile),
    hasTouch: Boolean(body.hasTouch),
    colorScheme: COLOR_SCHEMES.has(body.colorScheme) && body.colorScheme ? body.colorScheme : null,
    locale: String(body.locale || 'en-US').trim() || 'en-US',
    timezoneId: String(body.timezoneId || 'UTC').trim() || 'UTC',
    userAgent: String(body.userAgent || '').trim(),
    stealth: Boolean(body.stealth),
  };
}

export function createBrowserContextOptionsFromPreset(preset) {
  if (!preset) {
    return legacyOptions({ stealth: false });
  }

  const useStealth = Boolean(preset.stealth);
  const options = {
    viewport: preset.viewport || { width: 1280, height: 720 },
    deviceScaleFactor: preset.deviceScaleFactor ?? 1,
    isMobile: Boolean(preset.isMobile),
    hasTouch: Boolean(preset.hasTouch),
    locale: preset.locale || 'en-US',
    timezoneId: preset.timezoneId || 'UTC',
  };

  if (preset.screen?.width && preset.screen?.height) {
    options.screen = {
      width: preset.screen.width,
      height: preset.screen.height,
    };
  }

  if (preset.colorScheme === 'light' || preset.colorScheme === 'dark') {
    options.colorScheme = preset.colorScheme;
  }

  if (preset.userAgent) {
    options.userAgent = preset.userAgent;
  } else if (useStealth) {
    options.userAgent =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36';
  }

  if (useStealth) {
    options.extraHTTPHeaders = {
      'Accept-Language': 'en-US,en;q=0.9',
      ...(options.extraHTTPHeaders || {}),
    };
    if (!preset.locale) options.locale = 'en-US';
    if (!preset.timezoneId) options.timezoneId = 'America/New_York';
  }

  return options;
}

export function stealthFromPreset(preset) {
  return Boolean(preset?.stealth);
}
