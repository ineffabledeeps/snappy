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

Bad requests return `400` with `issues`, `received`, and `expected.body` where **each key has a hint** (`type`, `required`, `example`, `hint`):

```json
{
  "success": false,
  "error": "Invalid payload",
  "issues": ["Provide exactly one of url or html (non-empty string)"],
  "received": { "device": "iPhone 14" },
  "expected": {
    "method": "POST",
    "contentType": "application/json",
    "body": {
      "url": {
        "type": "string",
        "required": "one of url | html",
        "example": "https://example.com",
        "hint": "Absolute http(s) page URL to open and screenshot. Mutually exclusive with html."
      },
      "html": { "type": "string", "hint": "…" },
      "waitUntil": { "type": "string", "enum": ["networkidle", "load", "…"], "hint": "…" },
      "preset": {
        "type": "object",
        "hint": "Inline viewport/device options for this request only…",
        "keys": {
          "viewport": { "type": "object", "hint": "…", "keys": { "width": { "hint": "…" }, "height": { "hint": "…" } } },
          "deviceScaleFactor": { "type": "number", "hint": "Device pixel ratio (>= 1)…" }
        }
      }
    },
    "example": { "url": "https://example.com", "preset": { "…" } },
    "response": { "image": { "base64": { "hint": "…" }, "dataUrl": { "hint": "…" } } }
  }
}
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
