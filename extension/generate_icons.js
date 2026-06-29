// Generate GramAI extension icons using Node.js (no dependencies)
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPng(size, outputPath) {
  const pixels = [];
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2;

  for (let y = 0; y < size; y++) {
    const row = [];
    for (let x = 0; x < size; x++) {
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (dist > r - 0.5) {
        row.push(0, 0, 0, 0);
        continue;
      }
      const t = (x + y) / (size * 2);
      const pr = Math.round(0x63 + (0x8b - 0x63) * t);
      const pg = Math.round(0x66 + (0x5c - 0x66) * t);
      const pb = Math.round(0xf1 + (0xf6 - 0xf1) * t);
      const alpha = Math.round(Math.min(1, r - dist) * 255);
      row.push(pr, pg, pb, alpha);
    }
    pixels.push(row);
  }

  if (size >= 32) {
    const m = Math.floor(size / 2);
    const arm = Math.max(2, Math.floor(size / 8));
    const setPixel = (px, py) => {
      if (px >= 0 && px < size && py >= 0 && py < size) {
        const i = px * 4;
        pixels[py][i] = 255;
        pixels[py][i + 1] = 255;
        pixels[py][i + 2] = 255;
        pixels[py][i + 3] = 255;
      }
    };
    for (let i = -arm; i <= arm; i++) {
      for (let t = -Math.max(1, Math.floor(size / 16)); t <= Math.max(1, Math.floor(size / 16)); t++) {
        setPixel(m + i, m + t);
        setPixel(m + t, m + i);
      }
    }
  }

  const crc32 = (buf) => {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
    return (c ^ 0xffffffff) >>> 0;
  };

  const chunk = (name, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const type = Buffer.from(name);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([type, data])));
    return Buffer.concat([len, type, data, crc]);
  };

  let raw = Buffer.alloc(0);
  for (const row of pixels) {
    raw = Buffer.concat([raw, Buffer.from([0]), Buffer.from(row)]);
  }
  const compressed = zlib.deflateSync(raw, { level: 9 });
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);

  fs.writeFileSync(outputPath, png);
  console.log(`Created ${outputPath} (${size}x${size})`);
}

const iconsDir = path.join(__dirname, 'icons');
fs.mkdirSync(iconsDir, { recursive: true });
[16, 32, 48, 128].forEach(size => createPng(size, path.join(iconsDir, `icon${size}.png`)));
console.log('All icons generated!');
