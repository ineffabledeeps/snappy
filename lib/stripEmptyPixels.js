import { inflateSync, deflateSync } from 'node:zlib';

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return ~c;
}

/**
 * Decode Playwright PNG into RGBA pixels.
 * Supports color type 2 (RGB) and 6 (RGBA), 8-bit, non-interlaced.
 */
export function decodePngRgba(buf) {
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const bitDepth = buf[24];
  const colorType = buf[25];
  const interlace = buf[28];
  if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6) || interlace !== 0) {
    throw new Error(
      `stripEmptyPixels supports 8-bit RGB/RGBA PNGs only (got depth=${bitDepth} type=${colorType} interlace=${interlace})`,
    );
  }

  let offset = 8;
  const idats = [];
  while (offset < buf.length) {
    const len = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    const data = buf.subarray(offset + 8, offset + 8 + len);
    if (type === 'IDAT') idats.push(data);
    if (type === 'IEND') break;
    offset += 12 + len;
  }

  const inflated = inflateSync(Buffer.concat(idats));
  const srcBpp = colorType === 6 ? 4 : 3;
  const srcStride = width * srcBpp;
  const stride = width * 4;
  const pixels = Buffer.alloc(height * stride);
  let prev = Buffer.alloc(srcStride);

  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + srcStride);
    const filter = inflated[rowStart];
    const raw = inflated.subarray(rowStart + 1, rowStart + 1 + srcStride);
    const decoded = Buffer.alloc(srcStride);
    for (let i = 0; i < srcStride; i++) {
      const left = i >= srcBpp ? decoded[i - srcBpp] : 0;
      const up = prev[i];
      const upLeft = i >= srcBpp ? prev[i - srcBpp] : 0;
      let val = raw[i];
      if (filter === 1) val = (val + left) & 255;
      else if (filter === 2) val = (val + up) & 255;
      else if (filter === 3) val = (val + ((left + up) >> 1)) & 255;
      else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        val =
          (val + (pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft)) & 255;
      }
      decoded[i] = val;
    }
    prev = decoded;

    const out = pixels.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < width; x++) {
      const si = x * srcBpp;
      const di = x * 4;
      out[di] = decoded[si];
      out[di + 1] = decoded[si + 1];
      out[di + 2] = decoded[si + 2];
      out[di + 3] = colorType === 6 ? decoded[si + 3] : 255;
    }
  }

  return { width, height, pixels, stride };
}

export function encodePngRgba(width, height, pixels, stride) {
  const raw = Buffer.alloc((1 + stride) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (1 + stride)] = 0;
    pixels.copy(raw, y * (1 + stride) + 1, y * stride, (y + 1) * stride);
  }
  const compressed = deflateSync(raw);
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeB = Buffer.from(type);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([typeB, data])) >>> 0);
    return Buffer.concat([len, typeB, data, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * A row/column is "content" when it has enough contrast or non-uniform pixels.
 * Uniform black voids and solid letterboxing count as empty; designed dark
 * heroes with text/UI keep their contrast and stay.
 */
function lineHasContent(getValue, length, { contrastMin = 22, outlierRatio = 0.012 } = {}) {
  if (length <= 0) return false;
  let min = 255;
  let max = 0;
  let sum = 0;
  const samples = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    const v = getValue(i);
    samples[i] = v;
    if (v < min) min = v;
    if (v > max) max = v;
    sum += v;
  }
  if (max - min >= contrastMin) return true;
  const mean = sum / length;
  let outliers = 0;
  for (let i = 0; i < length; i++) {
    if (Math.abs(samples[i] - mean) >= 10) outliers++;
  }
  return outliers / length >= outlierRatio;
}

/**
 * Strip empty (near-uniform) pixels before and after the design.
 *
 * @param {Buffer} pngBuf
 * @param {{
 *   pad?: number,
 *   axes?: 'y' | 'xy',
 *   contrastMin?: number,
 *   outlierRatio?: number,
 * }} [options]
 * @returns {{ buffer: Buffer, meta: {
 *   width: number,
 *   height: number,
 *   trimmedTop: number,
 *   trimmedBottom: number,
 *   trimmedLeft: number,
 *   trimmedRight: number,
 *   changed: boolean,
 * } }}
 */
export function stripEmptyPixels(pngBuf, options = {}) {
  const pad = Number.isFinite(options.pad) ? Math.max(0, options.pad) : 8;
  const axes = options.axes === 'xy' ? 'xy' : 'y';
  const contrastMin = options.contrastMin ?? 22;
  const outlierRatio = options.outlierRatio ?? 0.012;

  const img = decodePngRgba(pngBuf);
  const { width, height, pixels, stride } = img;

  const rowContent = (y) =>
    lineHasContent(
      (x) => {
        const i = y * stride + x * 4;
        return Math.max(pixels[i], pixels[i + 1], pixels[i + 2]);
      },
      width,
      { contrastMin, outlierRatio },
    );

  const colContent = (x) =>
    lineHasContent(
      (y) => {
        const i = y * stride + x * 4;
        return Math.max(pixels[i], pixels[i + 1], pixels[i + 2]);
      },
      height,
      { contrastMin, outlierRatio },
    );

  let top = 0;
  while (top < height && !rowContent(top)) top += 1;
  let bottom = height - 1;
  while (bottom > top && !rowContent(bottom)) bottom -= 1;

  let left = 0;
  let right = width - 1;
  if (axes === 'xy') {
    while (left < width && !colContent(left)) left += 1;
    while (right > left && !colContent(right)) right -= 1;
  }

  // Nothing meaningful found — leave the original alone.
  if (top >= height || bottom <= top) {
    return {
      buffer: pngBuf,
      meta: {
        width,
        height,
        trimmedTop: 0,
        trimmedBottom: 0,
        trimmedLeft: 0,
        trimmedRight: 0,
        changed: false,
      },
    };
  }

  const y0 = Math.max(0, top - pad);
  const y1 = Math.min(height - 1, bottom + pad);
  const x0 = Math.max(0, left - pad);
  const x1 = Math.min(width - 1, right + pad);
  const outW = x1 - x0 + 1;
  const outH = y1 - y0 + 1;

  if (outW === width && outH === height) {
    return {
      buffer: pngBuf,
      meta: {
        width,
        height,
        trimmedTop: 0,
        trimmedBottom: 0,
        trimmedLeft: 0,
        trimmedRight: 0,
        changed: false,
      },
    };
  }

  const outStride = outW * 4;
  const outPixels = Buffer.alloc(outH * outStride);
  for (let y = 0; y < outH; y++) {
    const src = (y0 + y) * stride + x0 * 4;
    pixels.copy(outPixels, y * outStride, src, src + outStride);
  }

  return {
    buffer: encodePngRgba(outW, outH, outPixels, outStride),
    meta: {
      width: outW,
      height: outH,
      trimmedTop: y0,
      trimmedBottom: height - 1 - y1,
      trimmedLeft: x0,
      trimmedRight: width - 1 - x1,
      changed: true,
    },
  };
}
