const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 Table for PNG chunks
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const combined = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(combined), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

/**
 * Checks whether normalized coordinates (nx, ny) in [0, 1] fall inside a bold centered "Z".
 */
function isInsideZ(nx, ny) {
  const left = 0.27;
  const right = 0.73;
  const top = 0.25;
  const bottom = 0.75;
  const barThickness = 0.11;

  if (nx < left || nx > right || ny < top || ny > bottom) {
    return false;
  }

  // Top horizontal bar
  if (ny >= top && ny <= top + barThickness) {
    return true;
  }

  // Bottom horizontal bar
  if (ny >= bottom - barThickness && ny <= bottom) {
    return true;
  }

  // Diagonal bar from top-right to bottom-left
  const diagTopY = top + barThickness * 0.6;
  const diagBottomY = bottom - barThickness * 0.6;
  if (ny >= diagTopY && ny <= diagBottomY) {
    const t = (ny - diagTopY) / (diagBottomY - diagTopY);
    const centerX = right - 0.07 - t * (right - left - 0.14);
    const halfWidth = 0.068;
    if (Math.abs(nx - centerX) <= halfWidth) {
      return true;
    }
  }

  return false;
}

/**
 * Generates an RGBA PNG Buffer of size `width x height` with #059669 background and white "Z"
 * using 2x2 supersampling for smooth anti-aliased edges.
 */
function generateZentavoPNG(size) {
  // Emerald #059669 -> R: 5, G: 150, B: 105
  const bgR = 5;
  const bgG = 150;
  const bgB = 105;

  const rawData = Buffer.alloc(size * (size * 4 + 1));

  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1);
    rawData[rowStart] = 0; // Filter type 0 (None)

    for (let x = 0; x < size; x++) {
      // 2x2 supersampling for crisp edges on the "Z"
      let hits = 0;
      const offsets = [0.25, 0.75];
      for (const ox of offsets) {
        for (const oy of offsets) {
          const nx = (x + ox) / size;
          const ny = (y + oy) / size;
          if (isInsideZ(nx, ny)) hits++;
        }
      }
      const alphaWhite = hits / 4;

      const r = Math.round(bgR * (1 - alphaWhite) + 255 * alphaWhite);
      const g = Math.round(bgG * (1 - alphaWhite) + 255 * alphaWhite);
      const b = Math.round(bgB * (1 - alphaWhite) + 255 * alphaWhite);

      const pxOffset = rowStart + 1 + x * 4;
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = 255;
    }
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // Bit depth 8
  ihdr[9] = 6; // Color type 6 (RGBA)
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const compressed = zlib.deflateSync(rawData, { level: 9 });

  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

const publicDir = path.join(__dirname, '..', 'public');
fs.mkdirSync(publicDir, { recursive: true });

const png180 = generateZentavoPNG(180);
const png512 = generateZentavoPNG(512);

fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), png180);
fs.writeFileSync(path.join(publicDir, 'icon-180.png'), png180);
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), png512);

console.log('Generated /public/apple-touch-icon.png (180x180), /public/icon-180.png (180x180), and /public/icon-512.png (512x512).');
