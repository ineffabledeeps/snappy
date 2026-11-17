import { writeFile } from 'node:fs/promises';
import { loadEnv } from '../lib/loadEnv.js';
import { snappyCapture } from '../lib/snappy.js';

loadEnv();

const args = process.argv.slice(2);
const url = args.find((a) => !a.startsWith('--')) || 'https://example.com';
const out = args.find((a) => a.startsWith('--out='))?.slice('--out='.length) || 'snappy-out.png';

let preset = null;
const presetArg = args.find((a) => a.startsWith('--preset='))?.slice('--preset='.length);
if (presetArg) {
  preset = JSON.parse(presetArg);
}

const result = await snappyCapture({ url, preset });
await writeFile(out, result.buffer);

const { buffer: _buf, ...json } = result;
console.log(JSON.stringify({ ...json, out }, null, 2));
