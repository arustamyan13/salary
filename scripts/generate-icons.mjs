import { createWriteStream, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..', 'public')

mkdirSync(join(root, 'icons'), { recursive: true })

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i += 1) {
    c ^= buf[i]
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1
    }
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type)
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const crcBuf = Buffer.alloc(4)
  const crc = crc32(Buffer.concat([typeBuf, data]))
  crcBuf.writeUInt32BE(crc)
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

/** Solid rounded-square PNG (zinc-900) with a simple white glyph. */
function createIcon(size) {
  const { width, height } = { width: size, height: size }
  const raw = Buffer.alloc((width * 4 + 1) * height)

  const bg = [24, 24, 27, 255]
  const fg = [255, 255, 255, 255]
  const radius = size * 0.22

  const inRoundRect = (x, y) => {
    const cx = Math.max(radius, Math.min(x, width - 1 - radius))
    const cy = Math.max(radius, Math.min(y, height - 1 - radius))
    const dx = x - cx
    const dy = y - cy
    return dx * dx + dy * dy <= radius * radius
  }

  // Plus glyph bounds
  const bar = size * 0.1
  const arm = size * 0.28
  const cx = size / 2
  const cy = size / 2

  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 4 + 1)] = 0
    for (let x = 0; x < width; x += 1) {
      const i = y * (width * 4 + 1) + 1 + x * 4
      let color = [0, 0, 0, 0]
      if (inRoundRect(x, y)) {
        const onPlus =
          (Math.abs(x - cx) <= arm && Math.abs(y - cy) <= bar) ||
          (Math.abs(y - cy) <= arm && Math.abs(x - cx) <= bar)
        color = onPlus ? fg : bg
      }
      raw[i] = color[0]
      raw[i + 1] = color[1]
      raw[i + 2] = color[2]
      raw[i + 3] = color[3]
    }
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function writePng(path, size) {
  const buf = createIcon(size)
  createWriteStream(path).end(buf)
  console.log('Wrote', path)
}

writePng(join(root, 'icons', 'icon-192.png'), 192)
writePng(join(root, 'icons', 'icon-512.png'), 512)
writePng(join(root, 'apple-touch-icon.png'), 180)

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#18181b"/>
  <path d="M18 32h28M32 18v28" stroke="#fff" stroke-width="6" stroke-linecap="round"/>
</svg>`

createWriteStream(join(root, 'favicon.svg')).end(favicon)
console.log('Wrote favicon.svg')
