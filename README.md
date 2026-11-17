# Snappy

DB-less full-page screenshot API. Pass a **URL** or **HTML** plus an optional **preset** JSON for viewport/device sizing. Returns a portable PNG payload (`base64` / `dataUrl`) that other servers can store or forward.

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

Bad requests return `400` with what went wrong, what was received, and the expected shape:

```json
{
  "success": false,
  "error": "Invalid payload",
  "issues": [
    "Provide exactly one of url or html (non-empty string)",
    "Unknown field(s): device. Allowed: url, html, preset, waitUntil"
  ],
  "received": { "device": "iPhone 14" },
  "expected": {
    "method": "POST",
    "contentType": "application/json",
    "body": {
      "url": "https://example.com",
      "html": null,
      "preset": { "viewport": { "width": 1280, "height": 720 }, "…": "…" },
      "waitUntil": "networkidle"
    },
    "notes": [
      "Send either url or html (exactly one).",
      "preset is optional; omit it to use 1280×720 desktop defaults."
    ],
    "response": { "success": true, "image": { "base64": "…", "dataUrl": "…" }, "…": "…" }
  }
}
```

`GET /api` returns the same expected request/response docs.

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
