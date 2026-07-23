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

/** Rounded dark tile with a white ruble (₽) glyph. */
function createIcon(size) {
  const width = size
  const height = size
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

  // Normalized ₽ shape in unit box [0..1]
  const stroke = 0.09
  const onRuble = (nx, ny) => {
    // vertical stem
    const stemX = 0.38
    const stemTop = 0.22
    const stemBottom = 0.78
    const onStem =
      nx >= stemX - stroke / 2 &&
      nx <= stemX + stroke / 2 &&
      ny >= stemTop &&
      ny <= stemBottom

    // bowl of Р (right side of stem)
    const bowlCx = stemX
    const bowlCy = 0.36
    const bowlRx = 0.22
    const bowlRy = 0.16
    const inBowlOuter =
      ((nx - bowlCx) / bowlRx) ** 2 + ((ny - bowlCy) / bowlRy) ** 2 <= 1 && nx >= stemX
    const inBowlInner =
      ((nx - bowlCx) / (bowlRx - stroke)) ** 2 + ((ny - bowlCy) / (bowlRy - stroke)) ** 2 <= 1 &&
      nx >= stemX + stroke * 0.2
    const onBowl = inBowlOuter && !inBowlInner && ny <= bowlCy + bowlRy

    // two horizontal bars (ruble)
    const bar1y = 0.54
    const bar2y = 0.66
    const barLeft = stemX - 0.02
    const barRight = 0.72
    const onBar1 =
      ny >= bar1y - stroke / 2 &&
      ny <= bar1y + stroke / 2 &&
      nx >= barLeft &&
      nx <= barRight
    const onBar2 =
      ny >= bar2y - stroke / 2 &&
      ny <= bar2y + stroke / 2 &&
      nx >= barLeft &&
      nx <= barRight

    return onStem || onBowl || onBar1 || onBar2
  }

  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 4 + 1)] = 0
    for (let x = 0; x < width; x += 1) {
      const i = y * (width * 4 + 1) + 1 + x * 4
      let color = [0, 0, 0, 0]
      if (inRoundRect(x, y)) {
        color = onRuble(x / (width - 1), y / (height - 1)) ? fg : bg
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
  createWriteStream(path).end(createIcon(size))
  console.log('Wrote', path)
}

writePng(join(root, 'icons', 'icon-192.png'), 192)
writePng(join(root, 'icons', 'icon-512.png'), 512)
writePng(join(root, 'apple-touch-icon.png'), 180)

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#18181b"/>
  <text x="32" y="44" text-anchor="middle" font-size="36" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-weight="600" fill="#fff">₽</text>
</svg>`

createWriteStream(join(root, 'favicon.svg')).end(favicon)
console.log('Wrote favicon.svg')
