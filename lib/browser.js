import { chromium as coreChromium } from 'playwright-core';

function isVercel() {
  return Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
}

async function loadChromiumPack() {
  const mod = await import('@sparticuz/chromium');
  return mod.default;
}

async function loadStealthChromium() {
  const [{ chromium }, StealthPlugin] = await Promise.all([
    import('@zorilla/playwright-extra'),
    import('@zorilla/puppeteer-extra-plugin-stealth'),
  ]);

  const plugin = StealthPlugin.default || StealthPlugin;
  chromium.use(plugin());
  return chromium;
}

async function resolveLaunchOptions({ stealth = false } = {}) {
  const args = [];

  if (stealth) {
    args.push('--disable-blink-features=AutomationControlled');
  }

  if (isVercel()) {
    const chromiumPack = await loadChromiumPack();
    chromiumPack.setGraphicsMode = false;

    return {
      args: [...chromiumPack.args, ...args],
      executablePath: await chromiumPack.executablePath(),
      headless: chromiumPack.headless,
    };
  }

  return {
    channel: 'chrome',
    headless: true,
    args,
  };
}

export async function launchBrowser({ stealth = false } = {}) {
  const launchOptions = await resolveLaunchOptions({ stealth });
  const launcher = stealth ? await loadStealthChromium() : coreChromium;
  return launcher.launch(launchOptions);
}

