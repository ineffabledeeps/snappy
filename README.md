# Snappy

DB-less full-page screenshot API. Pass a **URL** or **HTML** plus an optional **preset** JSON for viewport/device sizing. Returns a portable PNG payload (`base64` / `dataUrl`) that other servers can store or forward.

**Live:** [https://snappy-ivory.vercel.app](https://snappy-ivory.vercel.app)  
**API:** `POST https://snappy-ivory.vercel.app/api`

## Quick examples

### Docs / expected payload (per-key hints)

```bash
curl https://snappy-ivory.vercel.app/api
```

### Capture a URL (desktop defaults)

```bash
curl -X POST https://snappy-ivory.vercel.app/api \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"https://example.com\"}"
```

### Capture with a mobile preset

```bash
curl -X POST https://snappy-ivory.vercel.app/api \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"https://example.com\",
    \"preset\": {
      \"viewport\": { \"width\": 390, \"height\": 844 },
      \"deviceScaleFactor\": 3,
      \"isMobile\": true,
      \"hasTouch\": true
    }
  }"
```

### Capture raw HTML

```bash
curl -X POST https://snappy-ivory.vercel.app/api \
  -H "Content-Type: application/json" \
  -d "{
    \"html\": \"<!doctype html><html><body style='height:2400px;font:24px sans-serif'>Hello from Snappy</body></html>\",
    \"preset\": { \"viewport\": { \"width\": 800, \"height\": 600 } }
  }"
```

### Save PNG from the response (Node)

```js
const res = await fetch('https://snappy-ivory.vercel.app/api', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://example.com',
    preset: { viewport: { width: 1280, height: 720 } },
  }),
});
const data = await res.json();
// data.image.base64 | data.image.dataUrl
```

## `POST /api`

```json
{
  "url": "https://example.com",
  "preset": {
    "viewport": { "width": 390, "height": 844 },
    "deviceScaleFactor": 3,
    "isMobile": true,
    "hasTouch": true,
    "userAgent": "",
    "locale": "en-US",
    "timezoneId": "UTC",
    "colorScheme": null,
    "stealth": false
  }
}
```

### Response

```json
{
  "success": true,
  "mimeType": "image/png",
  "bytes": 184220,
  "encoding": "base64",
  "image": {
    "base64": "iVBORw0KGgo…",
    "dataUrl": "data:image/png;base64,iVBORw0KGgo…"
  },
  "source": { "type": "url", "url": "https://example.com" },
  "preset": { "viewport": { "width": 390, "height": 844 }, "…": "…" },
  "durationMs": 2140
}
```

| Field | Notes |
|---|---|
| `url` **or** `html` | Exactly one |
| `preset` | Inline only — nothing is stored |
| `waitUntil` | `networkidle` (default), `load`, `domcontentloaded` |

Auth: if `API_SECRET` is set, send `Authorization: Bearer <API_SECRET>`.

### Invalid payload

Bad requests return `400` with `issues`, `received`, and `expected.body` where **each key has a hint** (`type`, `required`, `example`, `hint`). Try:

```bash
curl -X POST https://snappy-ivory.vercel.app/api \
  -H "Content-Type: application/json" \
  -d "{\"device\":\"iPhone 14\"}"
```

`GET /api` returns the same hinted `expected` docs.

## Local

```bash
cp .env.example .env
npm install
npm run snappy -- https://example.com --preset="{\"viewport\":{\"width\":390,\"height\":844}}"
npx vercel dev
```

## Environment

```env
API_SECRET=
CORS_ORIGIN=*
AWS_LAMBDA_JS_RUNTIME=nodejs22.x
```

`AWS_LAMBDA_JS_RUNTIME=nodejs22.x` is required on Vercel so Chromium’s shared libraries load correctly. The `/api` function is configured for 1024MB / 60s (Pro recommended for longer pages).
