// Generates PNG icons (192, 512, 512-maskable) as pure Node — no native deps.
// Produces a simple solid-color + vector triangle + circle, matching favicon.svg.
// Uses hand-rolled PNG encoder (zlib + CRC32) so it works without sharp/canvas.
import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = resolve(__dirname, "../public");
mkdirSync(PUBLIC, { recursive: true });

const BG = [8, 13, 25]; // #080d19
const ACCENT = [129, 140, 248]; // #818cf8
const OK = [52, 211, 153]; // #34d399
const TEXT = [226, 232, 240];

function mkImage(size, maskable) {
  const buf = Buffer.alloc(size * size * 4);
  const inset = maskable ? Math.round(size * 0.12) : 0;
  const radius = maskable ? 0 : Math.round(size * 0.19);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // Rounded-square mask
      let inMask = true;
      if (!maskable) {
        const r = radius;
        const dx = x < r ? r - x : x > size - r - 1 ? x - (size - r - 1) : 0;
        const dy = y < r ? r - y : y > size - r - 1 ? y - (size - r - 1) : 0;
        if (dx > 0 && dy > 0 && dx * dx + dy * dy > r * r) inMask = false;
      }
      if (!inMask) {
        buf[i] = 0; buf[i + 1] = 0; buf[i + 2] = 0; buf[i + 3] = 0;
        continue;
      }

      // Default bg
      let c = BG;

      // Triangle: from (0.25,0.69) to (0.5,0.28) to (0.75,0.69)
      const W = size - inset * 2;
      const px = (x - inset) / W;
      const py = (y - inset) / W;
      const ax = 0.25, ay = 0.69;
      const bx = 0.5,  by = 0.28;
      const cx = 0.75, cy = 0.69;

      // Signed distance to triangle edges — draw as stroke
      const strokeW = 0.06;
      const edges = [
        [ax, ay, bx, by],
        [bx, by, cx, cy],
        [cx, cy, ax, ay],
      ];
      let minDist = Infinity;
      for (const [x1, y1, x2, y2] of edges) {
        const vx = x2 - x1;
        const vy = y2 - y1;
        const wx = px - x1;
        const wy = py - y1;
        const t = Math.max(0, Math.min(1, (wx * vx + wy * vy) / (vx * vx + vy * vy)));
        const dx2 = wx - vx * t;
        const dy2 = wy - vy * t;
        const d = Math.sqrt(dx2 * dx2 + dy2 * dy2);
        if (d < minDist) minDist = d;
      }
      if (minDist < strokeW / 2) c = ACCENT;

      // Circle at (0.5, 0.59) radius 0.08
      const ccx = 0.5, ccy = 0.59, cr = 0.08;
      const ddx = px - ccx;
      const ddy = py - ccy;
      if (ddx * ddx + ddy * ddy < cr * cr) c = OK;

      buf[i] = c[0];
      buf[i + 1] = c[1];
      buf[i + 2] = c[2];
      buf[i + 3] = 255;
    }
  }
  return buf;
}

function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePNG(rgba, width, height) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const ihdrChunk = chunk("IHDR", ihdr);

  // Filter byte per row = 0
  const filtered = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    filtered[y * (1 + width * 4)] = 0;
    rgba.copy(filtered, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idatChunk = chunk("IDAT", deflateSync(filtered));
  const iendChunk = chunk("IEND", Buffer.alloc(0));
  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

for (const [name, size, maskable] of [
  ["icon-192.png", 192, false],
  ["icon-512.png", 512, false],
  ["icon-512-maskable.png", 512, true],
]) {
  const rgba = mkImage(size, maskable);
  const png = encodePNG(rgba, size, size);
  writeFileSync(resolve(PUBLIC, name), png);
  console.log(`wrote ${name} (${size}x${size})`);
}
