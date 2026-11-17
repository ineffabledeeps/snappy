import { devices } from 'playwright-core';

const DESKTOP_CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36';

export const CUSTOM_DEVICES = {
  'Laptop L': {
    baseDevice: 'Laptop L',
    viewport: { width: 1440, height: 900 },
    screen: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
    userAgent: DESKTOP_CHROME_UA,
    colorScheme: null,
    locale: 'en-US',
    timezoneId: 'UTC',
    stealth: false,
  },
};

export const CURATED_DEVICE_KEYS = [
  'Desktop Chrome',
  'Laptop L',
  'Desktop Edge',
  'Desktop Firefox',
  'Desktop Safari',
  'iPhone 14',
  'iPhone SE',
  'iPhone 13',
  'Pixel 7',
  'Pixel 5',
  'Galaxy S9+',
  'iPad Pro 11',
  'iPad Mini',
];

export function presetFieldsFromDevice(deviceKey) {
  if (CUSTOM_DEVICES[deviceKey]) {
    return { ...CUSTOM_DEVICES[deviceKey] };
  }

  const device = devices[deviceKey];
  if (!device) return null;

  return {
    baseDevice: deviceKey,
    viewport: {
      width: device.viewport?.width ?? 1280,
      height: device.viewport?.height ?? 720,
    },
    screen: device.screen
      ? { width: device.screen.width, height: device.screen.height }
      : null,
    deviceScaleFactor: device.deviceScaleFactor ?? 1,
    isMobile: Boolean(device.isMobile),
    hasTouch: Boolean(device.hasTouch),
    userAgent: device.userAgent || '',
    colorScheme: null,
    locale: 'en-US',
    timezoneId: 'UTC',
    stealth: false,
  };
}

export function listDevices() {
  return CURATED_DEVICE_KEYS.filter((key) => Boolean(devices[key] || CUSTOM_DEVICES[key])).map(
    (key) => ({
      key,
      label: key,
      ...presetFieldsFromDevice(key),
    }),
  );
}
