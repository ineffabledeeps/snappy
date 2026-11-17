# Snappy

DB-less full-page screenshot API. Pass a **URL** or **HTML** plus an optional **preset** JSON for viewport/device sizing. Always returns a portable PNG payload other servers can store or forward; optionally uploads to Cloudinary when asked.

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
  },
  "upload": false
}
```

### Response (always portable)

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
  "cloudinary": null,
  "source": { "type": "url", "url": "https://example.com" },
  "preset": { "viewport": { "width": 390, "height": 844 }, "…": "…" },
  "durationMs": 2140
}
```

Use `image.base64` / `image.dataUrl` from another service. Set `"upload": true` (and configure Cloudinary) to also get:

```json
"cloudinary": {
  "url": "https://res.cloudinary.com/…/snappy/….png",
  "publicId": "snappy/…",
  "bytes": 184220,
  "width": 1170,
  "height": 4200
}
```

| Field | Notes |
|---|---|
| `url` **or** `html` | Exactly one |
| `preset` | Inline only — nothing is stored |
| `waitUntil` | `networkidle` (default), `load`, `domcontentloaded` |
| `upload` | `false` by default; Cloudinary only when `true` |

Auth: if `API_SECRET` is set, send `Authorization: Bearer <API_SECRET>`.

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
# Only needed when upload=true
CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME
CORS_ORIGIN=*
AWS_LAMBDA_JS_RUNTIME=nodejs22.x
```
