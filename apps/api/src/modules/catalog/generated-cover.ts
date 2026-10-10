import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { deflateSync } from 'node:zlib'

const BLUE = [0x0b, 0x5e, 0xa2]
const YELLOW = [0xff, 0xf2, 0x00]
const WHITE = [0xff, 0xff, 0xff]

type FontCommand = {
  type: string
  x: number
  y: number
  x1: number
  y1: number
  x2: number
  y2: number
}

type FontFace = {
  ascender: number
  unitsPerEm: number
  getPath(text: string, x: number, y: number, fontSize: number): { commands: FontCommand[] }
  getAdvanceWidth(text: string, fontSize: number): number
}

type Segment = { x0: number; y0: number; x1: number; y1: number }

const require = createRequire(import.meta.url)
const opentype = require('opentype.js') as { parse(buffer: ArrayBuffer): FontFace }

function loadFont(file: string) {
  const bytes = readFileSync(new URL(`./fonts/${file}`, import.meta.url))
  return opentype.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))
}

const titleFont = loadFont('Poppins-Black.ttf')
const authorFont = loadFont('Poppins-SemiBold.ttf')

// Same proportions as the cover-lab card: 220px wide, 3:4, Poppins 18/12, padding 16 and left 24.
const SCALE = 3
const WIDTH = 220 * SCALE
const HEIGHT = 880
const STRIPE = 10 * SCALE
const PAD_TOP = 16 * SCALE
const PAD_LEFT = 24 * SCALE
const PAD_RIGHT = 16 * SCALE
const PAD_BOTTOM = 16 * SCALE
const TITLE_SIZE = 18 * SCALE
const TITLE_LEADING = 22.5 * SCALE
const AUTHOR_SIZE = 12 * SCALE
const AUTHOR_LEADING = 20 * SCALE

export function renderGeneratedCoverPng(title: string, author: string) {
  const pixels = Buffer.alloc(WIDTH * HEIGHT * 3)
  for (let index = 0; index < pixels.length; index += 3) {
    pixels[index] = BLUE[0]
    pixels[index + 1] = BLUE[1]
    pixels[index + 2] = BLUE[2]
  }
  fillRect(pixels, 0, 0, STRIPE, HEIGHT, YELLOW)
  const maxWidth = WIDTH - PAD_LEFT - PAD_RIGHT
  const lines = wrap(titleFont, title, TITLE_SIZE, maxWidth, 6)
  lines.forEach((line, index) => {
    drawText(pixels, titleFont, line, PAD_LEFT, lineBaseline(titleFont, TITLE_SIZE, PAD_TOP + index * TITLE_LEADING, TITLE_LEADING), TITLE_SIZE, YELLOW)
  })
  const authorLines = wrap(authorFont, author.trim() || 'Author not recorded', AUTHOR_SIZE, maxWidth, 3)
  const authorTop = HEIGHT - PAD_BOTTOM - AUTHOR_LEADING * authorLines.length
  authorLines.forEach((line, index) => {
    drawText(pixels, authorFont, line, PAD_LEFT, lineBaseline(authorFont, AUTHOR_SIZE, authorTop + index * AUTHOR_LEADING, AUTHOR_LEADING), AUTHOR_SIZE, WHITE)
  })
  return encodePng(pixels, WIDTH, HEIGHT)
}

function lineBaseline(face: FontFace, size: number, lineTop: number, lineHeight: number) {
  const ascender = (face.ascender / face.unitsPerEm) * size
  return lineTop + (lineHeight - size) / 2 + ascender
}

export function isGeneratedCover(coverPath: string | null | undefined) {
  return typeof coverPath === 'string' && /\/generated-(?:v\d+-)?[a-f0-9-]{36}\.png(?:$|\?)/i.test(coverPath)
}

export function isCurrentGeneratedCover(coverPath: string | null | undefined) {
  return typeof coverPath === 'string' && /\/generated-v4-[a-f0-9-]{36}\.png(?:$|\?)/i.test(coverPath)
}

function drawText(pixels: Buffer, face: FontFace, text: string, left: number, baseline: number, size: number, color: number[]) {
  fillPath(pixels, face.getPath(text, left, baseline, size).commands, color)
}

function wrap(face: FontFace, value: string, size: number, maxWidth: number, maxLines: number) {
  const words = value.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)
  const lines: string[] = []
  let index = 0
  while (index < words.length && lines.length < maxLines) {
    let line = ''
    while (index < words.length) {
      const candidate = line ? `${line} ${words[index]}` : words[index]
      if (face.getAdvanceWidth(candidate, size) <= maxWidth) {
        line = candidate
        index += 1
        continue
      }
      if (!line) {
        line = trimToWidth(face, words[index], size, maxWidth)
        index += 1
      }
      break
    }
    if (line) lines.push(line)
  }
  if (index < words.length && lines.length) lines[lines.length - 1] = trimToWidth(face, lines[lines.length - 1], size, maxWidth)
  return lines
}

function trimToWidth(face: FontFace, value: string, size: number, maxWidth: number) {
  let text = value.trimEnd()
  while (text.length > 0 && face.getAdvanceWidth(`${text}...`, size) > maxWidth) text = text.slice(0, -1).trimEnd()
  return text ? `${text}...` : '...'
}

function fillPath(pixels: Buffer, commands: FontCommand[], color: number[]) {
  const segs = segments(commands)
  if (!segs.length) return
  let minY = Infinity
  let maxY = -Infinity
  for (const seg of segs) {
    minY = Math.min(minY, seg.y0, seg.y1)
    maxY = Math.max(maxY, seg.y0, seg.y1)
  }
  const first = Math.max(0, Math.floor(minY))
  const last = Math.min(HEIGHT - 1, Math.ceil(maxY))
  for (let y = first; y <= last; y += 1) {
    const scan = y + 0.5
    const hits: Array<{ x: number; dir: number }> = []
    for (const seg of segs) {
      if (seg.y0 === seg.y1) continue
      const top = seg.y0 < seg.y1 ? seg.y0 : seg.y1
      const bottom = seg.y0 < seg.y1 ? seg.y1 : seg.y0
      if (scan < top || scan >= bottom) continue
      const t = (scan - seg.y0) / (seg.y1 - seg.y0)
      hits.push({ x: seg.x0 + t * (seg.x1 - seg.x0), dir: seg.y1 > seg.y0 ? 1 : -1 })
    }
    hits.sort((left, right) => left.x - right.x)
    let wind = 0
    let spanStart = 0
    for (const hit of hits) {
      const next = wind + hit.dir
      if (wind === 0 && next !== 0) spanStart = hit.x
      else if (wind !== 0 && next === 0) fillSpan(pixels, y, spanStart, hit.x, color)
      wind = next
    }
  }
}

function segments(commands: FontCommand[]) {
  const segs: Segment[] = []
  let cx = 0
  let cy = 0
  let sx = 0
  let sy = 0
  for (const command of commands) {
    if (command.type === 'M') {
      cx = command.x
      cy = command.y
      sx = cx
      sy = cy
    } else if (command.type === 'L') {
      segs.push({ x0: cx, y0: cy, x1: command.x, y1: command.y })
      cx = command.x
      cy = command.y
    } else if (command.type === 'C') {
      flattenCubic(cx, cy, command.x1, command.y1, command.x2, command.y2, command.x, command.y, segs)
      cx = command.x
      cy = command.y
    } else if (command.type === 'Q') {
      flattenQuad(cx, cy, command.x1, command.y1, command.x, command.y, segs)
      cx = command.x
      cy = command.y
    } else if (command.type === 'Z') {
      if (cx !== sx || cy !== sy) segs.push({ x0: cx, y0: cy, x1: sx, y1: sy })
      cx = sx
      cy = sy
    }
  }
  return segs
}

function flattenCubic(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, segs: Segment[]) {
  let px = x0
  let py = y0
  for (let step = 1; step <= 6; step += 1) {
    const t = step / 6
    const mt = 1 - t
    const x = mt * mt * mt * x0 + 3 * mt * mt * t * x1 + 3 * mt * t * t * x2 + t * t * t * x3
    const y = mt * mt * mt * y0 + 3 * mt * mt * t * y1 + 3 * mt * t * t * y2 + t * t * t * y3
    segs.push({ x0: px, y0: py, x1: x, y1: y })
    px = x
    py = y
  }
}

function flattenQuad(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, segs: Segment[]) {
  let px = x0
  let py = y0
  for (let step = 1; step <= 6; step += 1) {
    const t = step / 6
    const mt = 1 - t
    const x = mt * mt * x0 + 2 * mt * t * x1 + t * t * x2
    const y = mt * mt * y0 + 2 * mt * t * y1 + t * t * y2
    segs.push({ x0: px, y0: py, x1: x, y1: y })
    px = x
    py = y
  }
}

function fillSpan(pixels: Buffer, y: number, xStart: number, xEnd: number, color: number[]) {
  if (xEnd < xStart) return
  const start = Math.floor(xStart)
  const end = Math.floor(xEnd)
  if (start === end) {
    blend(pixels, start, y, color, xEnd - xStart)
    return
  }
  blend(pixels, start, y, color, start + 1 - xStart)
  for (let x = start + 1; x < end; x += 1) blend(pixels, x, y, color, 1)
  if (xEnd > end) blend(pixels, end, y, color, xEnd - end)
}

function blend(pixels: Buffer, x: number, y: number, color: number[], coverage: number) {
  if (coverage <= 0 || x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return
  const amount = Math.min(1, coverage)
  const offset = (y * WIDTH + x) * 3
  pixels[offset] = Math.round(pixels[offset] * (1 - amount) + color[0] * amount)
  pixels[offset + 1] = Math.round(pixels[offset + 1] * (1 - amount) + color[1] * amount)
  pixels[offset + 2] = Math.round(pixels[offset + 2] * (1 - amount) + color[2] * amount)
}

function fillRect(pixels: Buffer, x: number, y: number, width: number, height: number, color: number[]) {
  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) blend(pixels, x + column, y + row, color, 1)
  }
}

function encodePng(pixels: Buffer, width: number, height: number) {
  const scanlines = Buffer.alloc(height * (1 + width * 3))
  for (let row = 0; row < height; row += 1) {
    const offset = row * (1 + width * 3)
    scanlines[offset] = 0
    pixels.copy(scanlines, offset + 1, row * width * 3, (row + 1) * width * 3)
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header[8] = 8
  header[9] = 2
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(scanlines)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function chunk(type: string, data: Buffer) {
  const body = Buffer.concat([Buffer.from(type), data])
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body), 0)
  return Buffer.concat([length, body, crc])
}

function crc32(buffer: Buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return (~crc) >>> 0
}
