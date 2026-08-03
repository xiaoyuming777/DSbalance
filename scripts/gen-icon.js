// 生成占位应用图标 assets/icon.png（256x256 蓝色圆角方块 + 白色"硬币"）
// 零依赖：手写 PNG 编码（zlib + CRC32）。后续正式图标可替换此文件。
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const SIZE = 256;
const RADIUS = 56; // 圆角半径
const BG = [77, 107, 254]; // DeepSeek 蓝 #4D6BFE
const COIN = [255, 255, 255];
const COIN_CORE = [77, 107, 254];

// ---- PNG 编码工具 ----
const crcTable = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

// ---- 像素绘制 ----
function inRoundRect(x, y, x0, y0, x1, y1, r) {
  const cx = Math.min(Math.max(x, x0 + r), x1 - r);
  const cy = Math.min(Math.max(y, y0 + r), y1 - r);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1)); // 每行 1 字节 filter + RGBA
for (let y = 0; y < SIZE; y++) {
  const rowStart = y * (SIZE * 4 + 1);
  raw[rowStart] = 0; // filter: None
  for (let x = 0; x < SIZE; x++) {
    const px = rowStart + 1 + x * 4;
    const insideBg = inRoundRect(x, y, 0, 0, SIZE - 1, SIZE - 1, RADIUS);
    const inCoin = (x - SIZE / 2) ** 2 + (y - SIZE / 2) ** 2 <= (SIZE * 0.28) ** 2;
    const inCore = (x - SIZE / 2) ** 2 + (y - SIZE / 2) ** 2 <= (SIZE * 0.19) ** 2;
    const c = !insideBg ? [0, 0, 0, 0] : inCore ? [...COIN_CORE, 255] : inCoin ? [...COIN, 255] : [...BG, 255];
    raw[px] = c[0];
    raw[px + 1] = c[1];
    raw[px + 2] = c[2];
    raw[px + 3] = c[3];
  }
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // color type: RGBA
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

const out = path.join(__dirname, '..', 'assets', 'icon.png');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, png);
console.log(`icon written: ${out} (${png.length} bytes)`);
