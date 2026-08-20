// Generates PWA PNG icons using only Node.js built-ins (no dependencies)
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crcBytes = Buffer.alloc(4);
  crcBytes.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])));
  return Buffer.concat([len, typeBytes, data, crcBytes]);
}

function lerp(a, b, t) { return Math.round(a + (b - a) * t); }

function inRoundedRect(px, py, left, top, right, bottom, r) {
  if (px < left || px > right || py < top || py > bottom) return false;
  if (px < left + r && py < top + r) return Math.hypot(px - (left + r), py - (top + r)) <= r;
  if (px > right - r && py < top + r) return Math.hypot(px - (right - r), py - (top + r)) <= r;
  if (px < left + r && py > bottom - r) return Math.hypot(px - (left + r), py - (bottom - r)) <= r;
  if (px > right - r && py > bottom - r) return Math.hypot(px - (right - r), py - (bottom - r)) <= r;
  return true;
}

function generatePNG(size) {
  const raw = Buffer.alloc(size * (1 + size * 4));
  const ICON_R = 0.18;

  for (let y = 0; y < size; y++) {
    const row = y * (1 + size * 4);
    raw[row] = 0;

    for (let x = 0; x < size; x++) {
      const off = row + 1 + x * 4;
      const px = x / size;
      const py = y / size;

      // Rounded icon boundary
      const dx = Math.max(0, Math.max(ICON_R - px, px - (1 - ICON_R)));
      const dy = Math.max(0, Math.max(ICON_R - py, py - (1 - ICON_R)));
      if (Math.hypot(dx, dy) > ICON_R) {
        raw[off] = raw[off+1] = raw[off+2] = raw[off+3] = 0;
        continue;
      }

      // Background gradient #006492 → #009ee3
      const t = (px + py) / 2;
      let r = 0, g = lerp(100, 158, t), b = lerp(146, 227, t), a = 255;

      // Wallet body
      const inBody = inRoundedRect(px, py, 0.14, 0.30, 0.86, 0.76, 0.055);
      // Card tab
      const inCard = inRoundedRect(px, py, 0.14, 0.19, 0.68, 0.36, 0.04);
      // Pocket
      const inPocket = inRoundedRect(px, py, 0.56, 0.38, 0.86, 0.68, 0.04);
      // Coin
      const inCoin = Math.hypot(px - 0.71, py - 0.53) <= 0.095;

      if (inBody || inCard)  { r = 255; g = 255; b = 255; }
      if (inPocket && !inCoin) { r = 176; g = 215; b = 235; }
      if (inCoin)            { r = 255; g = 255; b = 255; }

      raw[off] = r; raw[off+1] = g; raw[off+2] = b; raw[off+3] = a;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr.writeUInt8(8, 8); ihdr.writeUInt8(6, 9);

  return Buffer.concat([
    Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

const outDir = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(outDir, { recursive: true });

for (const size of [192, 512]) {
  fs.writeFileSync(path.join(outDir, `icon-${size}.png`), generatePNG(size));
  console.log(`✓ icon-${size}.png`);
}
