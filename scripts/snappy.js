import { writeFile } from 'node:fs/promises';
import { loadEnv } from '../lib/loadEnv.js';
import { snappyCapture } from '../lib/snappy.js';

loadEnv();

const args = process.argv.slice(2);
const url = args.find((a) => !a.startsWith('--')) || 'https://example.com';
const device = args.find((a) => a.startsWith('--device='))?.slice('--device='.length) || null;
const out = args.find((a) => a.startsWith('--out='))?.slice('--out='.length) || 'snappy-out.png';
const upload = !args.includes('--no-upload');

const result = await snappyCapture({ url, device, upload });
await writeFile(out, result.buffer);

console.log(
  JSON.stringify(
    {
      ok: true,
      out,
      imageUrl: result.imageUrl,
      viewport: result.viewport,
      durationMs: result.durationMs,
    },
    null,
    2,
  ),
);
