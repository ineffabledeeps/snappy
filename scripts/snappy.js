import { readFile, writeFile } from 'node:fs/promises';
import { loadEnv } from '../lib/loadEnv.js';
import { snappyCapture } from '../lib/snappy.js';

loadEnv();

const args = process.argv.slice(2);
const htmlPath = args.find((a) => a.startsWith('--html='))?.slice('--html='.length);
const url = args.find((a) => !a.startsWith('--')) || (htmlPath ? null : 'https://example.com');
const out = args.find((a) => a.startsWith('--out='))?.slice('--out='.length) || 'snappy-out.png';

let preset = null;
const presetArg = args.find((a) => a.startsWith('--preset='))?.slice('--preset='.length);
if (presetArg) {
  preset = JSON.parse(presetArg);
}

const html = htmlPath ? await readFile(htmlPath, 'utf8') : undefined;
const result = await snappyCapture({ url, html, preset });
await writeFile(out, result.buffer);

const { buffer: _buf, ...json } = result;
console.log(JSON.stringify({ ...json, out }, null, 2));
