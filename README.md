# Snappy

Full-page screenshot API. Send a **URL** or raw **HTML**, optionally size it with a device name or preset JSON, and get a PNG of the entire scrolled page.

Runs on Vercel with `@sparticuz/chromium` + Playwright.

## API

### `GET /api`

Health + curated device list.

### `POST /api`

```json
{
  "url": "https://example.com",
  "device": "iPhone 14",
  "response": "url"
}
```

Or HTML + inline preset:

```json
{
  "html": "<!doctype html><html><body style='height:3000px'>tall</body></html>",
  "preset": {
    "viewport": { "width": 390, "height": 844 },
    "deviceScaleFactor": 3,
    "isMobile": true,
    "hasTouch": true
  },
  "response": "both"
}
```

| Field | Description |
|---|---|
| `url` **or** `html` | Page to capture (exactly one) |
| `device` | Playwright device name, e.g. `iPhone 14`, `Pixel 7` |
| `preset` | Inline viewport / UA / scale JSON |
| `waitUntil` | `networkidle` (default), `load`, `domcontentloaded` |
| `response` | `url` (Cloudinary), `base64`, or `both` |
| `upload` | Force Cloudinary upload on/off |

Auth: if `API_SECRET` is set, send `Authorization: Bearer <API_SECRET>`.

## Local

```bash
cp .env.example .env
npm install
npm run snappy -- https://example.com --device=iPhone 14 --no-upload
npx vercel dev
```

## Environment

```env
API_SECRET=
CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME
CORS_ORIGIN=*
AWS_LAMBDA_JS_RUNTIME=nodejs22.x
```

`AWS_LAMBDA_JS_RUNTIME=nodejs22.x` is required on Vercel so Chromium’s shared libraries load correctly. The `/api` function is configured for 1024MB / 60s (Pro recommended).
