// Generates PWA icons with a taiji (yin-yang) design
// Uses only Node.js built-in modules — no dependencies
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const ICONS_DIR = path.resolve(__dirname, '..', 'public', 'icons');

function crc32(buf) {
  const table = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
    table[i] = c;
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  return (crc ^ -1) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([len, typeAndData, crcBuf]);
}

function createPNG(size) {
  const pixels = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.42;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > r + 1) {
        // Background: primary color
        pixels[idx] = 0xdc;
        pixels[idx + 1] = 0x5a;
        pixels[idx + 2] = 0x2e;
        pixels[idx + 3] = 255;
      } else if (dist > r - 1) {
        // Anti-aliased edge
        const t = dist - (r - 1);
        pixels[idx] = 0xdc;
        pixels[idx + 1] = 0x5a;
        pixels[idx + 2] = 0x2e;
        pixels[idx + 3] = 255;
      } else {
        // Taiji circle
        const angle = Math.atan2(dy, dx);
        // Right half (wood/green side → modified to gold)
        if (dx > 0) {
          pixels[idx] = 0xfd;
          pixels[idx + 1] = 0xf8;
          pixels[idx + 2] = 0xf4;
          pixels[idx + 3] = 255;
        } else {
          // Left half: darker primary
          pixels[idx] = 0xb8;
          pixels[idx + 1] = 0x3a;
          pixels[idx + 2] = 0x1e;
          pixels[idx + 3] = 255;
        }
      }
    }
  }

  // Build raw image data with filter bytes
  const raw = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    raw[y * (1 + size * 4)] = 0; // filter: none
    pixels.copy(raw, y * (1 + size * 4) + 1, y * size * 4, (y + 1) * size * 4);
  }

  const compressed = zlib.deflateSync(raw);

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// Generate icons
fs.mkdirSync(ICONS_DIR, { recursive: true });

[192, 512, 180].forEach((size) => {
  const png = createPNG(size);
  const name = size === 180 ? 'apple-touch-icon.png' : `icon-${size}.png`;
  fs.writeFileSync(path.join(ICONS_DIR, name), png);
  console.log(`  ${name} (${png.length} bytes)`);
});

console.log('Icons generated in', ICONS_DIR);
