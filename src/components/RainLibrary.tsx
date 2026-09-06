import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { BookOpen, CloudRain, DoorOpen, Flame, Image as ImageIcon, Lightbulb, Pause, Play, Sparkles, X } from 'lucide-react'
import { libraryDoorPhrase, libraryPhrases, libraryPoems, portraitPhrases } from '../data/libraryPoems'
import './rain-library.css'

export type RainLibraryCue = 'rain' | 'fire' | 'book'

export type RainLibraryProps = {
  reducedMotion?: boolean
  /** Controlled ambience values. They default to rain on and fire on. */
  rainEnabled?: boolean
  fireEnabled?: boolean
  effectsEnabled?: boolean
  onRainToggle?: (enabled: boolean) => void
  onFireToggle?: (enabled: boolean) => void
  onAmbientCue?: (cue: RainLibraryCue) => void
  onBookOpen?: (poem: string, index: number) => void
  onTarotOpen?: () => void
  className?: string
}

type RainDrop = {
  x: number
  y: number
  speed: number
  length: number
  opacity: number
  slant: number
  width: number
}

type Ember = {
  x: number
  y: number
  speed: number
  drift: number
  size: number
  life: number
  phase: number
}

type PortraitState = {
  index: number
  seenMask: number
  lampActive: boolean
  obscured: boolean
  unlocked: boolean
}

const portraitVariants = [
  { src: '/image1.png', name: 'Mynoghra' },
  { src: '/image2.png', name: 'Yibb-Tstll' },
  { src: '/image3.png', name: 'Yhoundeh' },
] as const

const portraitMask = (index: number) => 1 << index
const allPortraitsSeen = (mask: number) => (mask & 0b111) === 0b111
const randomOtherPortrait = (current: number) => {
  const candidates = portraitVariants.map((_, index) => index).filter((index) => index !== current)
  return candidates[Math.floor(Math.random() * candidates.length)] ?? 0
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const randomIndex = (length: number, previous = -1) => {
  if (length <= 1) return 0
  const next = Math.floor(Math.random() * length)
  return next === previous ? (next + 1) % length : next
}

const seededRandom = (seed: number) => {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}

let rainAudioContext: AudioContext | null = null

const startRainAmbience = () => {
  if (typeof window === 'undefined') return () => undefined
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextClass) return () => undefined
  if (!rainAudioContext || rainAudioContext.state === 'closed') rainAudioContext = new AudioContextClass()
  const context = rainAudioContext
  const now = context.currentTime
  const master = context.createGain()
  master.gain.setValueAtTime(0.0001, now)
  master.gain.linearRampToValueAtTime(0.34, now + 1.1)
  master.connect(context.destination)

  const makeNoise = (seconds: number, level: number, filterType: BiquadFilterType, frequency: number) => {
    const source = context.createBufferSource()
    const buffer = context.createBuffer(1, Math.floor(context.sampleRate * seconds), context.sampleRate)
    const data = buffer.getChannelData(0)
    for (let index = 0; index < data.length; index += 1) {
      // Keep the loop continuously energized; fading both ends created a noticeable silent gap.
      data[index] = Math.random() * 2 - 1
    }
    const crossfadeSamples = Math.min(Math.floor(context.sampleRate * 0.12), Math.floor(data.length / 4))
    for (let index = 0; index < crossfadeSamples; index += 1) {
      const progress = index / crossfadeSamples
      const tailIndex = data.length - crossfadeSamples + index
      data[tailIndex] = data[tailIndex] * (1 - progress) + data[index] * progress
    }
    source.buffer = buffer
    source.loop = true
    const filter = context.createBiquadFilter()
    filter.type = filterType
    filter.frequency.setValueAtTime(frequency, now)
    filter.Q.setValueAtTime(filterType === 'bandpass' ? 0.55 : 0.35, now)
    const gain = context.createGain()
    gain.gain.setValueAtTime(level, now)
    source.connect(filter).connect(gain).connect(master)
    source.start(now)
    return source
  }

  const rain = makeNoise(3.2, 0.42, 'bandpass', 2300)
  const roofRumble = makeNoise(2.7, 0.2, 'lowpass', 760)
  const activeDrops = new Set<AudioBufferSourceNode>()
  let dropTimer: number | null = null
  const playWindowDrop = () => {
    const source = context.createBufferSource()
    const buffer = context.createBuffer(1, Math.floor(context.sampleRate * 0.12), context.sampleRate)
    const data = buffer.getChannelData(0)
    for (let index = 0; index < data.length; index += 1) {
      const progress = index / data.length
      data[index] = (Math.random() * 2 - 1) * Math.pow(1 - progress, 2.6)
    }
    source.buffer = buffer
    const filter = context.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.setValueAtTime(3600 + Math.random() * 2800, context.currentTime)
    filter.Q.setValueAtTime(5.5, context.currentTime)
    const gain = context.createGain()
    const now = context.currentTime
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.13 + Math.random() * 0.1, now + 0.004)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11)
    source.connect(filter).connect(gain).connect(master)
    source.onended = () => activeDrops.delete(source)
    activeDrops.add(source)
    source.start(now)
    source.stop(now + 0.13)
  }
  const scheduleDrop = () => {
    dropTimer = window.setTimeout(() => {
      playWindowDrop()
      scheduleDrop()
    }, 320 + Math.random() * 1450)
  }
  scheduleDrop()
  const wake = () => {
    if (context.state === 'suspended') void context.resume().catch(() => undefined)
  }
  window.addEventListener('pointerdown', wake, { once: true })
  window.addEventListener('keydown', wake, { once: true })
  wake()

  return () => {
    window.removeEventListener('pointerdown', wake)
    window.removeEventListener('keydown', wake)
    if (dropTimer !== null) window.clearTimeout(dropTimer)
    activeDrops.forEach((source) => {
      try { source.stop() } catch { /* source may have ended naturally */ }
    })
    activeDrops.clear()
    const stopAt = context.currentTime + 0.24
    master.gain.cancelScheduledValues(context.currentTime)
    master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), context.currentTime)
    master.gain.exponentialRampToValueAtTime(0.0001, stopAt)
    try { rain.stop(stopAt) } catch { /* already stopped during a route change */ }
    try { roofRumble.stop(stopAt) } catch { /* already stopped during a route change */ }
  }
}

const announce = (message: string) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('gothic:announce', { detail: message }))
  }
}

const drawRoundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) => {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + width, y, x + width, y + height, r)
  ctx.arcTo(x + width, y + height, x, y + height, r)
  ctx.arcTo(x, y + height, x, y, r)
  ctx.arcTo(x, y, x + width, y, r)
  ctx.closePath()
}

const drawCoverImage = (
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  alpha: number,
) => {
  if (!image.complete || image.naturalWidth === 0 || image.naturalHeight === 0) return
  const imageRatio = image.naturalWidth / image.naturalHeight
  const boxRatio = width / height
  let sourceX = 0
  let sourceY = 0
  let sourceWidth = image.naturalWidth
  let sourceHeight = image.naturalHeight
  if (imageRatio > boxRatio) {
    sourceWidth = image.naturalHeight * boxRatio
    sourceX = (image.naturalWidth - sourceWidth) / 2
  } else {
    sourceHeight = image.naturalWidth / boxRatio
    sourceY = (image.naturalHeight - sourceHeight) / 2
  }
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.globalCompositeOperation = 'screen'
  ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height)
  ctx.restore()
}

const preparePortrait = (image: HTMLImageElement): HTMLCanvasElement => {
  const portrait = document.createElement('canvas')
  portrait.width = image.naturalWidth
  portrait.height = image.naturalHeight
  const portraitCtx = portrait.getContext('2d')
  if (!portraitCtx) return portrait
  portraitCtx.imageSmoothingEnabled = true
  portraitCtx.drawImage(image, 0, 0)
  const pixels = portraitCtx.getImageData(0, 0, portrait.width, portrait.height)
  const pixelCount = portrait.width * portrait.height
  const background = new Uint8Array(pixelCount)
  const queue: number[] = []
  const isWhiteBackground = (pixelIndex: number) => {
    const offset = pixelIndex * 4
    const red = pixels.data[offset]
    const green = pixels.data[offset + 1]
    const blue = pixels.data[offset + 2]
    const brightness = (red + green + blue) / 3
    const spread = Math.max(red, green, blue) - Math.min(red, green, blue)
    return brightness > 218 && spread < 34
  }
  const enqueue = (pixelIndex: number) => {
    if (pixelIndex < 0 || pixelIndex >= pixelCount || background[pixelIndex] || !isWhiteBackground(pixelIndex)) return
    background[pixelIndex] = 1
    queue.push(pixelIndex)
  }
  for (let x = 0; x < portrait.width; x += 1) {
    enqueue(x)
  }
  for (let y = 0; y < portrait.height; y += 1) {
    enqueue(y * portrait.width)
    enqueue(y * portrait.width + portrait.width - 1)
  }
  for (let head = 0; head < queue.length; head += 1) {
    const pixelIndex = queue[head]
    const x = pixelIndex % portrait.width
    const y = Math.floor(pixelIndex / portrait.width)
    if (x > 0) enqueue(pixelIndex - 1)
    if (x < portrait.width - 1) enqueue(pixelIndex + 1)
    if (y > 0) enqueue(pixelIndex - portrait.width)
    if (y < portrait.height - 1) enqueue(pixelIndex + portrait.width)
  }
  for (let index = 0; index < pixels.data.length; index += 4) {
    const red = pixels.data[index]
    const green = pixels.data[index + 1]
    const blue = pixels.data[index + 2]
    const brightness = (red + green + blue) / 3
    if (background[index / 4]) {
      // Only edge-connected white pixels are removed; white clothing and lace remain opaque.
      pixels.data[index + 3] = brightness > 236 ? 0 : Math.round((236 - brightness) * 6)
    }
    // Warm the paper and compress highlights so the avatar reads as a painted portrait.
    pixels.data[index] = clamp(Math.round(red * 0.84 + 34), 0, 255)
    pixels.data[index + 1] = clamp(Math.round(green * 0.72 + 27), 0, 255)
    pixels.data[index + 2] = clamp(Math.round(blue * 0.64 + 24), 0, 255)
  }
  portraitCtx.putImageData(pixels, 0, 0)
  return portrait
}

const drawPortraitFrame = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  portrait: HTMLCanvasElement | null,
  portraitName: string,
  portraitVisible: boolean,
  portraitObscured: boolean,
) => {
  ctx.save()
  const frame = ctx.createLinearGradient(x, y, x + width, y + height)
  frame.addColorStop(0, '#8f6942')
  frame.addColorStop(0.25, '#d0a66a')
  frame.addColorStop(0.55, '#5d3e31')
  frame.addColorStop(1, '#a77a4b')
  ctx.fillStyle = frame
  ctx.shadowColor = 'rgba(0, 0, 0, .68)'
  ctx.shadowBlur = 24
  drawRoundedRect(ctx, x, y, width, height, Math.max(4, width * 0.018))
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.strokeStyle = 'rgba(232, 191, 124, .72)'
  ctx.lineWidth = Math.max(1.5, width * 0.012)
  ctx.stroke()

  const innerX = x + width * 0.09
  const innerY = y + height * 0.07
  const innerW = width * 0.82
  const innerH = height * 0.76
  ctx.fillStyle = '#24171b'
  drawRoundedRect(ctx, innerX, innerY, innerW, innerH, Math.max(3, width * 0.014))
  ctx.fill()
  ctx.strokeStyle = 'rgba(197, 151, 103, .45)'
  ctx.lineWidth = Math.max(1, width * 0.006)
  ctx.stroke()

  ctx.save()
  ctx.beginPath()
  ctx.moveTo(innerX, innerY + innerH)
  ctx.lineTo(innerX, innerY + innerH * 0.3)
  ctx.quadraticCurveTo(innerX + innerW * 0.5, innerY - innerH * 0.08, innerX + innerW, innerY + innerH * 0.3)
  ctx.lineTo(innerX + innerW, innerY + innerH)
  ctx.closePath()
  ctx.clip()
  const paper = ctx.createLinearGradient(innerX, innerY, innerX + innerW, innerY + innerH)
  paper.addColorStop(0, '#6f4b42')
  paper.addColorStop(0.36, '#493039')
  paper.addColorStop(0.74, '#2b2029')
  paper.addColorStop(1, '#17131b')
  ctx.fillStyle = paper
  ctx.fillRect(innerX, innerY, innerW, innerH)
  const paperLight = ctx.createRadialGradient(innerX + innerW * 0.44, innerY + innerH * 0.2, 0, innerX + innerW * 0.44, innerY + innerH * 0.2, innerW * 0.72)
  paperLight.addColorStop(0, 'rgba(226, 183, 140, .18)')
  paperLight.addColorStop(0.6, 'rgba(153, 102, 83, .04)')
  paperLight.addColorStop(1, 'rgba(11, 9, 14, .28)')
  ctx.fillStyle = paperLight
  ctx.fillRect(innerX, innerY, innerW, innerH)
  if (portraitVisible && portrait && portrait.width > 0 && portrait.height > 0) {
    const imageW = innerW * 0.94
    const imageH = innerH * 0.97
    const imageX = innerX + (innerW - imageW) / 2
    const imageY = innerY + innerH * 0.012
    const sourceRatio = portrait.width / portrait.height
    const targetRatio = imageW / imageH
    let sourceX = 0
    let sourceY = 0
    let sourceW = portrait.width
    let sourceH = portrait.height
    if (sourceRatio > targetRatio) {
      sourceW = portrait.height * targetRatio
      sourceX = (portrait.width - sourceW) / 2
    } else {
      sourceH = portrait.width / targetRatio
      sourceY = (portrait.height - sourceH) / 2
    }
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(portrait, sourceX, sourceY, sourceW, sourceH, imageX, imageY, imageW, imageH)
    ctx.globalCompositeOperation = 'multiply'
    ctx.fillStyle = 'rgba(131, 76, 52, .18)'
    ctx.fillRect(innerX, innerY, innerW, innerH)
    ctx.globalCompositeOperation = 'source-over'
    if (portraitObscured) {
      // Extend the veil through the jaw so the mouth cannot remain visible.
      const shadow = ctx.createRadialGradient(
        imageX + imageW * 0.52,
        imageY + imageH * 0.37,
        imageW * 0.03,
        imageX + imageW * 0.52,
        imageY + imageH * 0.4,
        imageW * 0.49,
      )
      shadow.addColorStop(0, 'rgba(2, 2, 7, .99)')
      shadow.addColorStop(0.58, 'rgba(4, 3, 9, .94)')
      shadow.addColorStop(0.86, 'rgba(5, 4, 10, .58)')
      shadow.addColorStop(1, 'rgba(5, 4, 10, 0)')
      ctx.fillStyle = shadow
      ctx.beginPath()
      ctx.ellipse(imageX + imageW * 0.52, imageY + imageH * 0.4, imageW * 0.43, imageH * 0.34, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(0, 0, 4, .78)'
      ctx.beginPath()
      ctx.moveTo(imageX + imageW * 0.16, imageY + imageH * 0.2)
      ctx.quadraticCurveTo(imageX + imageW * 0.5, imageY + imageH * 0.05, imageX + imageW * 0.84, imageY + imageH * 0.2)
      ctx.lineTo(imageX + imageW * 0.8, imageY + imageH * 0.62)
      ctx.quadraticCurveTo(imageX + imageW * 0.5, imageY + imageH * 0.76, imageX + imageW * 0.2, imageY + imageH * 0.62)
      ctx.closePath()
      ctx.fill()
    }
  } else {
    ctx.fillStyle = '#000000'
    ctx.fillRect(innerX, innerY, innerW, innerH)
  }
  if (portraitVisible) {
    ctx.strokeStyle = 'rgba(224, 193, 157, .18)'
    ctx.lineWidth = Math.max(0.8, width * 0.004)
    for (let stroke = -3; stroke < 15; stroke += 1) {
      ctx.beginPath()
      ctx.moveTo(innerX + innerW * (stroke / 12), innerY + innerH)
      ctx.lineTo(innerX + innerW * ((stroke + 5) / 12), innerY)
      ctx.stroke()
    }
  }
  ctx.restore()

  ctx.fillStyle = 'rgba(232, 188, 121, .5)'
  ctx.strokeStyle = 'rgba(61, 38, 30, .7)'
  ctx.lineWidth = Math.max(1, width * 0.004)
  for (const corner of [
    [x + width * 0.045, y + height * 0.055],
    [x + width * 0.955, y + height * 0.055],
    [x + width * 0.045, y + height * 0.84],
    [x + width * 0.955, y + height * 0.84],
  ]) {
    ctx.beginPath()
    ctx.arc(corner[0], corner[1], Math.max(2, width * 0.018), 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }
  ctx.fillStyle = '#3c2728'
  ctx.fillRect(x + width * 0.18, y + height * 0.88, width * 0.64, height * 0.075)
  ctx.strokeStyle = 'rgba(218, 176, 117, .68)'
  ctx.strokeRect(x + width * 0.18, y + height * 0.88, width * 0.64, height * 0.075)
  ctx.fillStyle = 'rgba(239, 209, 169, .84)'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `600 ${Math.max(8, width * 0.045)}px "Cormorant Garamond", serif`
  if (portraitName) ctx.fillText(portraitName, x + width * 0.5, y + height * 0.917)
  ctx.restore()
}

const drawInteriorBackLayer = (ctx: CanvasRenderingContext2D, width: number, height: number, cameraX: number, cameraY: number) => {
  ctx.save()
  // The rear wall is the slowest plane, so it visibly lags behind the camera.
  ctx.translate(cameraX * 0.58, cameraY * 0.58)
  const worldLeft = -width * 0.4
  const worldRight = width * 1.52
  ctx.fillStyle = 'rgba(8, 7, 12, .42)'
  ctx.fillRect(worldLeft, height * 0.17, worldRight - worldLeft, height * 0.54)
  // Filled pier bodies and capitals give the rear arcade a physical mass;
  // the old single-pixel uprights made the wall read as a wireframe.
  for (let column = 0; column < 12; column += 1) {
    const x = worldLeft + width * (0.06 + column * 0.16)
    const pierW = width * (0.024 + (column % 3) * 0.004)
    const pier = ctx.createLinearGradient(x - pierW, 0, x + pierW, 0)
    pier.addColorStop(0, 'rgba(21, 17, 25, .92)')
    pier.addColorStop(0.46, 'rgba(99, 69, 68, .54)')
    pier.addColorStop(0.64, 'rgba(55, 42, 50, .7)')
    pier.addColorStop(1, 'rgba(10, 9, 15, .94)')
    ctx.fillStyle = pier
    ctx.fillRect(x - pierW / 2, height * 0.2, pierW, height * 0.5)
    ctx.fillStyle = 'rgba(174, 132, 100, .24)'
    ctx.fillRect(x - pierW * 0.82, height * 0.19, pierW * 1.64, height * 0.022)
    ctx.fillRect(x - pierW * 0.66, height * 0.695, pierW * 1.32, height * 0.018)
  }
  ctx.strokeStyle = 'rgba(180, 143, 117, .13)'
  ctx.lineWidth = Math.max(1, width * 0.0012)
  for (let column = 0; column < 12; column += 1) {
    const x = worldLeft + width * (0.06 + column * 0.16)
    ctx.beginPath()
    ctx.moveTo(x, height * 0.17)
    ctx.lineTo(x, height * 0.73)
    ctx.stroke()
    ctx.fillStyle = 'rgba(207, 164, 117, .17)'
    ctx.beginPath()
    ctx.moveTo(x - width * 0.018, height * 0.17)
    ctx.lineTo(x, height * 0.135)
    ctx.lineTo(x + width * 0.018, height * 0.17)
    ctx.closePath()
    ctx.fill()
  }
  ctx.strokeStyle = 'rgba(197, 156, 119, .2)'
  ctx.lineWidth = Math.max(1, width * 0.0014)
  for (let arch = 0; arch < 9; arch += 1) {
    const x = worldLeft + width * (0.02 + arch * 0.22)
    const archW = width * 0.16
    const archY = height * 0.7
    ctx.strokeStyle = 'rgba(104, 75, 75, .34)'
    ctx.lineWidth = Math.max(5, width * 0.012)
    ctx.beginPath()
    ctx.moveTo(x, archY)
    ctx.lineTo(x, height * 0.34)
    ctx.quadraticCurveTo(x + archW * 0.5, height * 0.17, x + archW, height * 0.34)
    ctx.lineTo(x + archW, archY)
    ctx.stroke()
    ctx.strokeStyle = 'rgba(218, 174, 123, .12)'
    ctx.lineWidth = Math.max(1, width * 0.002)
    ctx.beginPath()
    ctx.moveTo(x, archY)
    ctx.lineTo(x, height * 0.34)
    ctx.quadraticCurveTo(x + archW * 0.5, height * 0.17, x + archW, height * 0.34)
    ctx.lineTo(x + archW, archY)
    ctx.stroke()
  }
  ctx.restore()
}

const drawSculpture = (ctx: CanvasRenderingContext2D, x: number, baseY: number, scale: number, t: number) => {
  ctx.save()
  ctx.translate(x, baseY)
  ctx.shadowColor = 'rgba(0, 0, 0, .68)'
  ctx.shadowBlur = scale * 0.2
  const stone = ctx.createLinearGradient(-scale * 0.48, 0, scale * 0.48, 0)
  stone.addColorStop(0, '#25242b')
  stone.addColorStop(0.44, '#9a8c83')
  stone.addColorStop(0.66, '#5b575e')
  stone.addColorStop(1, '#1b1a22')
  ctx.fillStyle = stone
  ctx.fillRect(-scale * 0.48, -scale * 0.16, scale * 0.96, scale * 0.16)
  ctx.fillRect(-scale * 0.36, -scale * 0.58, scale * 0.72, scale * 0.42)
  ctx.strokeStyle = 'rgba(226, 211, 193, .38)'
  ctx.lineWidth = Math.max(1, scale * 0.018)
  ctx.strokeRect(-scale * 0.36, -scale * 0.58, scale * 0.72, scale * 0.42)
  ctx.shadowBlur = 0

  // Sword and shield sit behind the armor silhouette to make the subject read as a knight.
  ctx.fillStyle = '#5f6268'
  ctx.strokeStyle = 'rgba(224, 217, 201, .48)'
  ctx.lineWidth = Math.max(1, scale * 0.014)
  ctx.beginPath()
  ctx.moveTo(scale * 0.33, -scale * 0.62)
  ctx.lineTo(scale * 0.79, -scale * 2.62)
  ctx.lineTo(scale * 0.89, -scale * 2.68)
  ctx.lineTo(scale * 0.47, -scale * 0.54)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.strokeStyle = '#a38a67'
  ctx.lineWidth = Math.max(2, scale * 0.035)
  ctx.beginPath()
  ctx.moveTo(scale * 0.3, -scale * 0.63)
  ctx.lineTo(scale * 0.53, -scale * 0.83)
  ctx.moveTo(scale * 0.2, -scale * 0.73)
  ctx.lineTo(scale * 0.43, -scale * 0.94)
  ctx.stroke()
  ctx.fillStyle = '#3e3c45'
  ctx.beginPath()
  ctx.moveTo(-scale * 0.55, -scale * 1.04)
  ctx.quadraticCurveTo(-scale * 0.76, -scale * 1.33, -scale * 0.56, -scale * 1.82)
  ctx.quadraticCurveTo(-scale * 0.31, -scale * 1.98, -scale * 0.17, -scale * 1.76)
  ctx.lineTo(-scale * 0.2, -scale * 1.14)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.strokeStyle = 'rgba(217, 190, 142, .48)'
  ctx.lineWidth = Math.max(1, scale * 0.017)
  ctx.beginPath()
  ctx.moveTo(-scale * 0.59, -scale * 1.42)
  ctx.lineTo(-scale * 0.24, -scale * 1.42)
  ctx.moveTo(-scale * 0.42, -scale * 1.78)
  ctx.lineTo(-scale * 0.42, -scale * 1.08)
  ctx.stroke()

  const armor = ctx.createLinearGradient(-scale * 0.42, -scale * 2.3, scale * 0.42, -scale * 0.45)
  armor.addColorStop(0, '#b9b0a7')
  armor.addColorStop(0.28, '#77767c')
  armor.addColorStop(0.68, '#3f414a')
  armor.addColorStop(1, '#20212a')
  ctx.fillStyle = armor
  ctx.beginPath()
  ctx.moveTo(-scale * 0.32, -scale * 0.52)
  ctx.lineTo(-scale * 0.39, -scale * 1.42)
  ctx.quadraticCurveTo(-scale * 0.31, -scale * 1.86, -scale * 0.24, -scale * 2.12)
  ctx.lineTo(scale * 0.24, -scale * 2.12)
  ctx.quadraticCurveTo(scale * 0.31, -scale * 1.86, scale * 0.39, -scale * 1.42)
  ctx.lineTo(scale * 0.32, -scale * 0.52)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(226, 215, 197, .46)'
  ctx.lineWidth = Math.max(1, scale * 0.02)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(225, 213, 193, .27)'
  ctx.lineWidth = Math.max(0.8, scale * 0.013)
  ctx.beginPath()
  ctx.moveTo(0, -scale * 2.04)
  ctx.lineTo(0, -scale * 0.58)
  ctx.moveTo(-scale * 0.22, -scale * 1.88)
  ctx.lineTo(scale * 0.22, -scale * 1.88)
  ctx.moveTo(-scale * 0.28, -scale * 1.58)
  ctx.lineTo(scale * 0.28, -scale * 1.58)
  ctx.stroke()

  ctx.fillStyle = '#666870'
  ctx.beginPath()
  ctx.ellipse(-scale * 0.4, -scale * 1.87, scale * 0.2, scale * 0.29, -0.24, 0, Math.PI * 2)
  ctx.ellipse(scale * 0.4, -scale * 1.87, scale * 0.2, scale * 0.29, 0.24, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.strokeStyle = 'rgba(225, 213, 193, .38)'
  ctx.lineWidth = Math.max(0.8, scale * 0.014)
  ctx.beginPath()
  ctx.moveTo(-scale * 0.5, -scale * 1.96)
  ctx.lineTo(-scale * 0.29, -scale * 1.82)
  ctx.moveTo(scale * 0.5, -scale * 1.96)
  ctx.lineTo(scale * 0.29, -scale * 1.82)
  ctx.stroke()

  ctx.fillStyle = '#4c4d56'
  ctx.beginPath()
  ctx.moveTo(-scale * 0.25, -scale * 0.52)
  ctx.lineTo(-scale * 0.22, -scale * 1.15)
  ctx.lineTo(-scale * 0.06, -scale * 1.18)
  ctx.lineTo(-scale * 0.04, -scale * 0.52)
  ctx.closePath()
  ctx.moveTo(scale * 0.04, -scale * 0.52)
  ctx.lineTo(scale * 0.06, -scale * 1.18)
  ctx.lineTo(scale * 0.22, -scale * 1.15)
  ctx.lineTo(scale * 0.25, -scale * 0.52)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = '#77767a'
  ctx.beginPath()
  ctx.arc(0, -scale * 2.33, scale * 0.23, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(229, 215, 194, .48)'
  ctx.lineWidth = Math.max(1, scale * 0.018)
  ctx.stroke()
  ctx.fillStyle = '#292a33'
  ctx.beginPath()
  ctx.moveTo(-scale * 0.29, -scale * 2.43)
  ctx.quadraticCurveTo(0, -scale * 2.8, scale * 0.29, -scale * 2.43)
  ctx.lineTo(scale * 0.25, -scale * 2.15)
  ctx.lineTo(-scale * 0.25, -scale * 2.15)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.strokeStyle = 'rgba(228, 211, 181, .5)'
  ctx.lineWidth = Math.max(1, scale * 0.015)
  ctx.beginPath()
  ctx.moveTo(-scale * 0.24, -scale * 2.31)
  ctx.lineTo(scale * 0.24, -scale * 2.31)
  ctx.moveTo(-scale * 0.15, -scale * 2.42)
  ctx.lineTo(scale * 0.15, -scale * 2.42)
  ctx.stroke()
  ctx.fillStyle = '#373641'
  ctx.beginPath()
  ctx.moveTo(-scale * 0.18, -scale * 2.62)
  ctx.quadraticCurveTo(0, -scale * 3.05, scale * 0.18, -scale * 2.62)
  ctx.lineTo(scale * 0.13, -scale * 2.48)
  ctx.lineTo(-scale * 0.13, -scale * 2.48)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = `rgba(210, 165, 106, ${0.12 + Math.sin(t * 1.6) * 0.025})`
  ctx.beginPath()
  ctx.arc(0, -scale * 1.5, scale * 0.045, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

const drawVintageLamp = (ctx: CanvasRenderingContext2D, x: number, baseY: number, scale: number, t: number, active: boolean) => {
  ctx.save()
  const flicker = active ? 1 + Math.sin(t * 3.4) * 0.035 + Math.sin(t * 7.1) * 0.018 : 1
  const glowStrength = 0.48 + Math.sin(t * 4.6) * 0.04 + Math.sin(t * 9.4) * 0.02
  const lampY = baseY - scale * 2.35
  if (active) {
    const glow = ctx.createRadialGradient(x, lampY, 0, x, lampY, scale * 4.8)
    glow.addColorStop(0, `rgba(255, 202, 124, ${glowStrength})`)
    glow.addColorStop(0.24, 'rgba(239, 154, 78, .22)')
    glow.addColorStop(0.58, 'rgba(203, 109, 62, .1)')
    glow.addColorStop(1, 'rgba(82, 34, 31, 0)')
    ctx.globalCompositeOperation = 'screen'
    ctx.fillStyle = glow
    ctx.fillRect(x - scale * 4.8, baseY - scale * 7.1, scale * 9.6, scale * 7.1)
    // A low pool of light makes the lamp contact the floor instead of floating in the gallery.
    const floorGlow = ctx.createRadialGradient(x, baseY - scale * 0.05, 0, x, baseY - scale * 0.05, scale * 2.7)
    floorGlow.addColorStop(0, 'rgba(244, 176, 101, .28)')
    floorGlow.addColorStop(0.45, 'rgba(203, 109, 62, .12)')
    floorGlow.addColorStop(1, 'rgba(82, 34, 31, 0)')
    ctx.save()
    ctx.scale(1.35, 0.28)
    ctx.fillStyle = floorGlow
    ctx.beginPath()
    ctx.arc(x / 1.35, (baseY - scale * 0.05) / 0.28, scale * 2.7, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    ctx.globalCompositeOperation = 'source-over'
  }

  ctx.fillStyle = '#1a171c'
  ctx.beginPath()
  ctx.ellipse(x, baseY - scale * 0.09, scale * 0.4, scale * 0.1, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(202, 164, 112, .66)'
  ctx.lineWidth = Math.max(1, scale * 0.025)
  ctx.stroke()
  ctx.fillStyle = '#7c5a40'
  ctx.fillRect(x - scale * 0.045, baseY - scale * 2.18, scale * 0.09, scale * 2.08)
  ctx.beginPath()
  ctx.arc(x, baseY - scale * 2.2, scale * 0.16, 0, Math.PI * 2)
  ctx.fill()
  const shade = ctx.createLinearGradient(x - scale * 0.52, baseY - scale * 3.1, x + scale * 0.52, baseY - scale * 2.1)
  shade.addColorStop(0, active ? '#5e3a32' : '#302329')
  shade.addColorStop(0.5, active ? '#d29a5c' : '#59404a')
  shade.addColorStop(1, active ? '#3b282c' : '#211a22')
  ctx.fillStyle = shade
  ctx.beginPath()
  ctx.moveTo(x - scale * 0.5, baseY - scale * 2.95)
  ctx.quadraticCurveTo(x, baseY - scale * (3.2 * flicker), x + scale * 0.5, baseY - scale * 2.95)
  ctx.lineTo(x + scale * 0.34, baseY - scale * 2.08)
  ctx.lineTo(x - scale * 0.34, baseY - scale * 2.08)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(230, 190, 123, .76)'
  ctx.lineWidth = Math.max(1, scale * 0.028)
  ctx.stroke()
  ctx.fillStyle = active ? '#f4ce8d' : '#2b2227'
  ctx.beginPath()
  ctx.arc(x, baseY - scale * 2.25, scale * 0.12 * flicker, 0, Math.PI * 2)
  ctx.fill()
  if (active) {
    ctx.globalCompositeOperation = 'screen'
    ctx.fillStyle = `rgba(255, 223, 157, ${0.5 + glowStrength})`
    ctx.beginPath()
    ctx.arc(x, baseY - scale * 2.25, scale * 0.25 * flicker, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalCompositeOperation = 'source-over'
  }
  ctx.fillStyle = 'rgba(221, 167, 99, .45)'
  ctx.fillRect(x - scale * 0.58, baseY - scale * 2.99, scale * 1.16, scale * 0.06)
  ctx.restore()
}

const drawChandelier = (
  ctx: CanvasRenderingContext2D,
  x: number,
  topY: number,
  scale: number,
  t: number,
  active: boolean,
) => {
  ctx.save()
  const armY = topY + scale * 1.02
  const glowStrength = 0.3 + Math.sin(t * 3.7) * 0.035 + Math.sin(t * 8.2 + 1.1) * 0.018
  if (active) {
    const glow = ctx.createRadialGradient(x, armY + scale * 0.28, 0, x, armY + scale * 0.28, scale * 4.5)
    glow.addColorStop(0, `rgba(255, 201, 122, ${glowStrength})`)
    glow.addColorStop(0.3, 'rgba(223, 139, 69, .16)')
    glow.addColorStop(0.72, 'rgba(126, 59, 42, .07)')
    glow.addColorStop(1, 'rgba(78, 34, 31, 0)')
    ctx.globalCompositeOperation = 'screen'
    ctx.fillStyle = glow
    ctx.fillRect(x - scale * 4.5, topY, scale * 9, scale * 6.6)
    ctx.globalCompositeOperation = 'source-over'
  }

  ctx.strokeStyle = active ? 'rgba(208, 165, 107, .74)' : 'rgba(128, 102, 88, .46)'
  ctx.lineWidth = Math.max(1, scale * 0.035)
  ctx.beginPath()
  ctx.moveTo(x, topY)
  ctx.lineTo(x, armY - scale * 0.18)
  ctx.stroke()
  ctx.fillStyle = active ? '#9b7247' : '#4c3a3b'
  ctx.beginPath()
  ctx.arc(x, armY - scale * 0.18, scale * 0.12, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = active ? '#aa7d4d' : '#514143'
  ctx.lineWidth = Math.max(1.3, scale * 0.04)
  ctx.beginPath()
  ctx.moveTo(x - scale * 1.28, armY)
  ctx.quadraticCurveTo(x - scale * 0.72, armY - scale * 0.22, x, armY)
  ctx.quadraticCurveTo(x + scale * 0.72, armY - scale * 0.22, x + scale * 1.28, armY)
  ctx.stroke()
  ctx.fillStyle = active ? '#c08d55' : '#514044'
  ctx.beginPath()
  ctx.arc(x, armY, scale * 0.16, 0, Math.PI * 2)
  ctx.fill()

  const candles = [-1.08, -0.54, 0, 0.54, 1.08]
  for (const offset of candles) {
    const candleX = x + scale * offset
    const candleY = armY + scale * (0.07 + Math.abs(offset) * 0.08)
    ctx.strokeStyle = active ? 'rgba(215, 178, 125, .72)' : 'rgba(122, 95, 85, .46)'
    ctx.lineWidth = Math.max(1, scale * 0.024)
    ctx.beginPath()
    ctx.moveTo(candleX, armY)
    ctx.lineTo(candleX, candleY + scale * 0.18)
    ctx.stroke()
    ctx.fillStyle = active ? '#d0a265' : '#59434a'
    ctx.fillRect(candleX - scale * 0.07, candleY, scale * 0.14, scale * 0.21)
    ctx.fillStyle = active ? '#f2d49c' : '#2c232b'
    ctx.beginPath()
    ctx.arc(candleX, candleY - scale * 0.015, scale * 0.08, 0, Math.PI * 2)
    ctx.fill()
    if (active) drawFlame(ctx, candleX, candleY - scale * 0.06, scale * 0.2, t + offset, true)
  }
  ctx.restore()
}

const drawSideTable = (ctx: CanvasRenderingContext2D, x: number, baseY: number, width: number, height: number) => {
  ctx.save()
  ctx.fillStyle = '#4b2b2d'
  ctx.shadowColor = 'rgba(0, 0, 0, .55)'
  ctx.shadowBlur = width * 0.12
  ctx.fillRect(x - width * 0.5, baseY - height, width, height * 0.14)
  ctx.fillStyle = '#2c1c22'
  ctx.fillRect(x - width * 0.39, baseY - height * 0.86, width * 0.1, height * 0.86)
  ctx.fillRect(x + width * 0.29, baseY - height * 0.86, width * 0.1, height * 0.86)
  ctx.shadowBlur = 0
  ctx.strokeStyle = 'rgba(177, 130, 90, .56)'
  ctx.lineWidth = Math.max(1, width * 0.018)
  ctx.strokeRect(x - width * 0.5, baseY - height, width, height * 0.14)
  ctx.strokeStyle = 'rgba(171, 119, 88, .36)'
  ctx.lineWidth = Math.max(0.8, width * 0.012)
  ctx.strokeRect(x - width * 0.25, baseY - height * 0.82, width * 0.5, height * 0.24)
  ctx.fillStyle = 'rgba(207, 161, 100, .58)'
  ctx.beginPath()
  ctx.arc(x, baseY - height * 0.73, Math.max(1.5, width * 0.025), 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#6f4b3d'
  ctx.beginPath()
  ctx.moveTo(x - width * 0.07, baseY - height * 1.02)
  ctx.quadraticCurveTo(x - width * 0.11, baseY - height * 1.18, x, baseY - height * 1.24)
  ctx.quadraticCurveTo(x + width * 0.11, baseY - height * 1.18, x + width * 0.07, baseY - height * 1.02)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(222, 175, 109, .45)'
  ctx.stroke()
  ctx.restore()
}

const drawReadingChair = (ctx: CanvasRenderingContext2D, x: number, baseY: number, width: number, height: number) => {
  ctx.save()
  ctx.fillStyle = '#21151a'
  ctx.shadowColor = 'rgba(0, 0, 0, .52)'
  ctx.shadowBlur = width * 0.16
  ctx.beginPath()
  ctx.moveTo(x - width * 0.38, baseY)
  ctx.lineTo(x - width * 0.31, baseY - height * 0.64)
  ctx.quadraticCurveTo(x, baseY - height * 0.9, x + width * 0.31, baseY - height * 0.64)
  ctx.lineTo(x + width * 0.38, baseY)
  ctx.closePath()
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.fillStyle = '#4b2d31'
  ctx.beginPath()
  ctx.moveTo(x - width * 0.3, baseY - height * 0.34)
  ctx.quadraticCurveTo(x, baseY - height * 0.2, x + width * 0.3, baseY - height * 0.34)
  ctx.lineTo(x + width * 0.25, baseY - height * 0.07)
  ctx.lineTo(x - width * 0.25, baseY - height * 0.07)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(189, 139, 93, .5)'
  ctx.lineWidth = Math.max(1, width * 0.018)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(171, 119, 88, .46)'
  ctx.lineWidth = Math.max(1, width * 0.014)
  for (const leg of [-0.26, 0.26]) {
    ctx.beginPath()
    ctx.moveTo(x + width * leg, baseY - height * 0.08)
    ctx.lineTo(x + width * (leg * 1.08), baseY + height * 0.08)
    ctx.stroke()
  }
  ctx.restore()
}

const drawForegroundPillars = (ctx: CanvasRenderingContext2D, width: number, height: number, cameraX: number, cameraY: number, fireActive: boolean) => {
  ctx.save()
  // The stone columns are close to the viewer and should track the camera most.
  ctx.translate(cameraX * 0.06, cameraY * 0.06)
  for (const x of [-width * 0.035, width * 0.96]) {
    const pillarW = width * 0.048
    const top = height * 0.12
    const bottom = height * 0.86
    const stone = ctx.createLinearGradient(x, top, x + pillarW, top)
    stone.addColorStop(0, '#17131c')
    stone.addColorStop(0.38, fireActive ? '#6a4542' : '#42333b')
    stone.addColorStop(0.62, fireActive ? '#3c292e' : '#2d252f')
    stone.addColorStop(1, '#100d14')
    ctx.fillStyle = stone
    ctx.shadowColor = 'rgba(0, 0, 0, .48)'
    ctx.shadowBlur = width * 0.018
    ctx.fillRect(x, top, pillarW, bottom - top)
    ctx.shadowBlur = 0
    ctx.strokeStyle = 'rgba(211, 169, 120, .32)'
    ctx.lineWidth = Math.max(1, width * 0.0015)
    ctx.strokeRect(x, top, pillarW, bottom - top)
    ctx.fillStyle = 'rgba(185, 137, 97, .46)'
    ctx.fillRect(x - pillarW * 0.18, top - height * 0.012, pillarW * 1.36, height * 0.018)
    ctx.fillRect(x - pillarW * 0.12, top + height * 0.035, pillarW * 1.24, height * 0.012)
    ctx.fillRect(x - pillarW * 0.16, bottom - height * 0.02, pillarW * 1.32, height * 0.022)
    ctx.strokeStyle = 'rgba(223, 181, 132, .22)'
    ctx.lineWidth = Math.max(0.8, width * 0.001)
    for (let groove = 0; groove < 4; groove += 1) {
      const grooveX = x + pillarW * (0.2 + groove * 0.2)
      ctx.beginPath()
      ctx.moveTo(grooveX, top + height * 0.07)
      ctx.lineTo(grooveX, bottom - height * 0.05)
      ctx.stroke()
    }
  }
  ctx.restore()
}

const drawGalleryExtension = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  portrait: HTMLCanvasElement | null,
  portraitName: string,
  portraitVisible: boolean,
  portraitObscured: boolean,
  cameraX: number,
  cameraY: number,
) => {
  const start = width * 0.98
  const panelWidth = width * 0.46
  ctx.save()
  const leftStart = -width * 0.4
  const leftWidth = width * 0.4
  // The side door belongs to a deeper corridor plane than the main room.
  ctx.save()
  ctx.translate(cameraX * 0.34, cameraY * 0.34)
  const leftWall = ctx.createLinearGradient(leftStart, 0, 0, height)
  leftWall.addColorStop(0, '#17131c')
  leftWall.addColorStop(0.52, '#2b2028')
  leftWall.addColorStop(1, '#110d14')
  ctx.fillStyle = leftWall
  ctx.fillRect(leftStart, 0, leftWidth, height)
  ctx.strokeStyle = 'rgba(169, 132, 111, .24)'
  ctx.lineWidth = Math.max(1, width * 0.0015)
  for (let seam = 0; seam < 4; seam += 1) {
    const seamX = leftStart + leftWidth * (0.1 + seam * 0.27)
    ctx.beginPath()
    ctx.moveTo(seamX, height * 0.08)
    ctx.lineTo(seamX, height * 0.94)
    ctx.stroke()
  }
  const doorX = leftStart + leftWidth * 0.56
  const doorY = height * 0.18
  const doorW = leftWidth * 0.29
  const doorH = height * 0.68
  ctx.fillStyle = '#0c0b11'
  ctx.beginPath()
  ctx.moveTo(doorX, doorY + doorH)
  ctx.lineTo(doorX, doorY + doorH * 0.3)
  ctx.quadraticCurveTo(doorX + doorW * 0.33, doorY + doorH * 0.08, doorX + doorW * 0.5, doorY - doorH * 0.02)
  ctx.quadraticCurveTo(doorX + doorW * 0.67, doorY + doorH * 0.08, doorX + doorW, doorY + doorH * 0.3)
  ctx.lineTo(doorX + doorW, doorY + doorH)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(178, 139, 106, .48)'
  ctx.lineWidth = Math.max(2, width * 0.0026)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(220, 181, 131, .28)'
  ctx.lineWidth = Math.max(1, width * 0.0014)
  ctx.beginPath()
  ctx.moveTo(doorX - doorW * 0.035, doorY + doorH * 0.31)
  ctx.quadraticCurveTo(doorX + doorW * 0.33, doorY - doorH * 0.1, doorX + doorW * 0.5, doorY - doorH * 0.12)
  ctx.quadraticCurveTo(doorX + doorW * 0.67, doorY - doorH * 0.1, doorX + doorW * 1.035, doorY + doorH * 0.31)
  ctx.stroke()
  ctx.fillStyle = 'rgba(205, 165, 112, .48)'
  for (let stud = 0; stud < 6; stud += 1) {
    const studY = doorY + doorH * (0.42 + stud * 0.075)
    for (const studSide of [-1, 1]) {
      ctx.beginPath()
      ctx.arc(doorX + doorW * (0.16 + (studSide > 0 ? 0.68 : 0)), studY, Math.max(1, width * 0.0017), 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.fillStyle = 'rgba(197, 150, 94, .5)'
  ctx.fillRect(doorX + doorW * 0.14, doorY + doorH * 0.48, doorW * 0.72, height * 0.008)
  ctx.fillRect(doorX + doorW * 0.49, doorY + doorH * 0.19, width * 0.004, doorH * 0.57)
  ctx.strokeStyle = 'rgba(218, 174, 118, .32)'
  ctx.lineWidth = Math.max(1, width * 0.0015)
  ctx.beginPath()
  ctx.moveTo(doorX + doorW * 0.14, doorY + doorH * 0.48)
  ctx.lineTo(doorX + doorW * 0.21, doorY + doorH * 0.29)
  ctx.lineTo(doorX + doorW * 0.36, doorY + doorH * 0.18)
  ctx.moveTo(doorX + doorW * 0.86, doorY + doorH * 0.48)
  ctx.lineTo(doorX + doorW * 0.79, doorY + doorH * 0.29)
  ctx.lineTo(doorX + doorW * 0.64, doorY + doorH * 0.18)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(194, 145, 103, .28)'
  ctx.lineWidth = Math.max(0.8, width * 0.0011)
  for (let plank = 0; plank < 5; plank += 1) {
    const plankY = doorY + doorH * (0.61 + plank * 0.065)
    ctx.beginPath()
    ctx.moveTo(doorX + doorW * 0.12, plankY)
    ctx.lineTo(doorX + doorW * 0.88, plankY + height * 0.002)
    ctx.stroke()
  }
  ctx.fillStyle = 'rgba(218, 174, 118, .42)'
  for (const hingeY of [doorY + doorH * 0.39, doorY + doorH * 0.72]) {
    ctx.fillRect(doorX + doorW * 0.08, hingeY, doorW * 0.14, height * 0.012)
    ctx.fillRect(doorX + doorW * 0.78, hingeY, doorW * 0.14, height * 0.012)
  }
  ctx.fillStyle = 'rgba(30, 20, 25, .92)'
  ctx.fillRect(doorX + doorW * 0.09, doorY + doorH * 0.67, doorW * 0.82, doorH * 0.19)
  ctx.strokeStyle = 'rgba(174, 133, 96, .38)'
  ctx.strokeRect(doorX + doorW * 0.09, doorY + doorH * 0.67, doorW * 0.82, doorH * 0.19)
  ctx.strokeStyle = 'rgba(206, 160, 110, .26)'
  ctx.lineWidth = Math.max(0.8, width * 0.001)
  ctx.beginPath()
  ctx.moveTo(doorX + doorW * 0.17, doorY + doorH * 0.73)
  ctx.lineTo(doorX + doorW * 0.83, doorY + doorH * 0.73)
  ctx.moveTo(doorX + doorW * 0.5, doorY + doorH * 0.7)
  ctx.lineTo(doorX + doorW * 0.5, doorY + doorH * 0.83)
  ctx.stroke()
  ctx.fillStyle = 'rgba(214, 164, 106, .46)'
  ctx.beginPath()
  ctx.arc(doorX + doorW * 0.5, doorY + doorH * 0.765, Math.max(1.2, width * 0.002), 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(210, 160, 101, .68)'
  ctx.beginPath()
  ctx.arc(doorX + doorW * 0.78, doorY + doorH * 0.55, Math.max(1.6, width * 0.0028), 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(239, 203, 145, .56)'
  ctx.fillRect(doorX + doorW * 0.73, doorY + doorH * 0.52, doorW * 0.1, height * 0.012)
  ctx.restore()

  const wall = ctx.createLinearGradient(start, 0, start + panelWidth, height)
  wall.addColorStop(0, '#24171d')
  wall.addColorStop(0.5, '#332027')
  wall.addColorStop(1, '#161018')
  ctx.fillStyle = wall
  ctx.fillRect(start, 0, panelWidth, height)
  ctx.strokeStyle = 'rgba(199, 155, 108, .32)'
  ctx.lineWidth = Math.max(1, width * 0.0016)
  for (let seam = 0; seam < 4; seam += 1) {
    const seamX = start + panelWidth * (0.06 + seam * 0.3)
    ctx.beginPath()
    ctx.moveTo(seamX, height * 0.06)
    ctx.lineTo(seamX, height * 0.9)
    ctx.stroke()
  }
  ctx.strokeStyle = 'rgba(211, 175, 131, .42)'
  ctx.lineWidth = Math.max(1.2, width * 0.002)
  ctx.beginPath()
  ctx.moveTo(start, height * 0.13)
  ctx.lineTo(start + panelWidth, height * 0.13)
  ctx.moveTo(start, height * 0.15)
  ctx.lineTo(start + panelWidth, height * 0.15)
  ctx.stroke()
  for (let ornament = 0; ornament < 5; ornament += 1) {
    ctx.fillStyle = 'rgba(181, 139, 96, .2)'
    ctx.beginPath()
    ctx.arc(start + panelWidth * (0.08 + ornament * 0.21), height * 0.14, Math.max(2, width * 0.005), 0, Math.PI * 2)
    ctx.fill()
  }

  // An arch niche gives the portrait a believable wall recess when the camera reaches the gallery.
  const archX = start + panelWidth * 0.07
  const archY = height * 0.12
  const archW = panelWidth * 0.7
  const archH = height * 0.78
  ctx.fillStyle = '#100d13'
  ctx.beginPath()
  ctx.moveTo(archX, archY + archH)
  ctx.lineTo(archX, archY + archH * 0.27)
  ctx.quadraticCurveTo(archX + archW * 0.5, archY - archH * 0.05, archX + archW, archY + archH * 0.27)
  ctx.lineTo(archX + archW, archY + archH)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(133, 99, 85, .54)'
  ctx.lineWidth = Math.max(2, width * 0.003)
  ctx.stroke()
  const portraitW = archW * 0.6
  const portraitH = archH * 0.62
  drawPortraitFrame(
    ctx,
    archX + (archW - portraitW) / 2,
    archY + archH * 0.1,
    portraitW,
    portraitH,
    portrait,
    portraitName,
    portraitVisible,
    portraitObscured,
  )
  ctx.fillStyle = 'rgba(208, 164, 112, .3)'
  ctx.fillRect(start + panelWidth * 0.82, height * 0.24, panelWidth * 0.08, height * 0.42)
  ctx.fillRect(start + panelWidth * 0.85, height * 0.27, panelWidth * 0.02, height * 0.36)
  ctx.restore()
}

const drawPerspectiveSideWalls = (ctx: CanvasRenderingContext2D, width: number, height: number, cameraX: number, cameraY: number) => {
  const vanishingX = width * 0.5
  const vanishingY = height * 0.69
  const wallTop = height * 0.12
  const worldLeft = -width * 0.4
  const worldRight = width * 1.52
  const windowLeft = width * 0.045
  const windowRight = width * 0.663

  ctx.save()
  ctx.translate(cameraX * 0.36, cameraY * 0.36)

  // One overhead vault spans the whole world width. The center window is
  // painted over it later, so its ribs remain visible only at the sides and
  // above the opening, visually tying the side walls to the central chamber.
  ctx.fillStyle = 'rgba(7, 8, 13, .54)'
  ctx.beginPath()
  ctx.moveTo(worldLeft, -height * .34)
  ctx.lineTo(worldRight, -height * .34)
  ctx.lineTo(worldRight, wallTop)
  ctx.lineTo(vanishingX, vanishingY)
  ctx.lineTo(worldLeft, wallTop)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(202, 158, 112, .16)'
  ctx.lineWidth = Math.max(1, width * .0014)
  for (let rib = 0; rib < 9; rib += 1) {
    const topX = worldLeft + (worldRight - worldLeft) * (rib + 1) / 10
    ctx.beginPath()
    ctx.moveTo(topX, -height * .34)
    ctx.lineTo(vanishingX, vanishingY)
    ctx.stroke()
  }

  // The side walls are clipped outside the window opening and converge toward
  // the same vanishing point as the floor, joining both halves of the room.
  ctx.save()
  ctx.beginPath()
  ctx.rect(worldLeft, 0, windowLeft - worldLeft, height)
  ctx.clip()
  const leftWall = ctx.createLinearGradient(worldLeft, 0, windowLeft, 0)
  leftWall.addColorStop(0, 'rgba(8, 8, 13, .9)')
  leftWall.addColorStop(.7, 'rgba(50, 34, 39, .6)')
  leftWall.addColorStop(1, 'rgba(32, 23, 29, .52)')
  ctx.fillStyle = leftWall
  ctx.beginPath()
  ctx.moveTo(worldLeft, wallTop)
  ctx.lineTo(windowLeft, wallTop)
  ctx.lineTo(vanishingX, vanishingY)
  ctx.lineTo(worldLeft, vanishingY)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(200, 156, 111, .2)'
  ctx.lineWidth = Math.max(1, width * .0012)
  for (let beam = 0; beam < 6; beam += 1) {
    const topX = worldLeft + (windowLeft - worldLeft) * (beam + 1) / 7
    ctx.beginPath()
    ctx.moveTo(topX, wallTop)
    ctx.lineTo(vanishingX, vanishingY)
    ctx.stroke()
  }
  ctx.restore()

  ctx.save()
  ctx.beginPath()
  ctx.rect(windowRight, 0, worldRight - windowRight, height)
  ctx.clip()
  const rightWall = ctx.createLinearGradient(windowRight, 0, worldRight, 0)
  rightWall.addColorStop(0, 'rgba(43, 30, 36, .52)')
  rightWall.addColorStop(.35, 'rgba(52, 34, 39, .7)')
  rightWall.addColorStop(1, 'rgba(9, 8, 13, .94)')
  ctx.fillStyle = rightWall
  ctx.beginPath()
  ctx.moveTo(windowRight, wallTop)
  ctx.lineTo(worldRight, wallTop)
  ctx.lineTo(worldRight, vanishingY)
  ctx.lineTo(vanishingX, vanishingY)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(205, 160, 112, .2)'
  ctx.lineWidth = Math.max(1, width * .0012)
  for (let beam = 0; beam < 7; beam += 1) {
    const topX = windowRight + (worldRight - windowRight) * (beam + 1) / 8
    ctx.beginPath()
    ctx.moveTo(topX, wallTop)
    ctx.lineTo(vanishingX, vanishingY)
    ctx.stroke()
  }
  ctx.restore()

  // Low dado rails reinforce the shared horizon and make the side walls feel
  // attached to the floor rather than floating behind the furniture.
  ctx.strokeStyle = 'rgba(211, 169, 116, .26)'
  ctx.lineWidth = Math.max(2, width * .0025)
  ctx.beginPath()
  ctx.moveTo(worldLeft, vanishingY)
  ctx.lineTo(vanishingX, vanishingY)
  ctx.lineTo(worldRight, vanishingY)
  ctx.stroke()
  ctx.restore()
}

const drawBook = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, hue: number, tilt = 0) => {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(tilt)
  const cover = `hsl(${hue} 24% 17%)`
  const edge = `hsl(${hue} 30% 38%)`
  ctx.shadowColor = 'rgba(0, 0, 0, .45)'
  ctx.shadowBlur = 9
  ctx.fillStyle = cover
  drawRoundedRect(ctx, -width / 2, -height, width, height, Math.max(1, width * 0.05))
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.strokeStyle = edge
  ctx.lineWidth = Math.max(1, width * 0.025)
  ctx.stroke()
  ctx.strokeStyle = `hsla(${hue} 34% 65% / .38)`
  ctx.lineWidth = Math.max(1, width * 0.012)
  ctx.beginPath()
  ctx.moveTo(-width * 0.3, -height * 0.72)
  ctx.lineTo(width * 0.3, -height * 0.72)
  ctx.moveTo(-width * 0.3, -height * 0.58)
  ctx.lineTo(width * 0.16, -height * 0.58)
  ctx.stroke()
  ctx.restore()
}

const drawGothicRosette = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  stroke: string,
  fill: string,
) => {
  ctx.save()
  ctx.fillStyle = fill
  ctx.strokeStyle = stroke
  ctx.lineWidth = Math.max(0.7, radius * 0.08)
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(x, y, radius * 0.72, 0, Math.PI * 2)
  ctx.stroke()
  for (let petal = 0; petal < 8; petal += 1) {
    const angle = (petal / 8) * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + Math.cos(angle) * radius * 0.78, y + Math.sin(angle) * radius * 0.78)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(
      x + Math.cos(angle) * radius * 0.47,
      y + Math.sin(angle) * radius * 0.47,
      radius * 0.2,
      angle - Math.PI * 0.68,
      angle + Math.PI * 0.68,
    )
    ctx.stroke()
  }
  ctx.fillStyle = stroke
  ctx.beginPath()
  ctx.arc(x, y, radius * 0.12, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

const drawOpenworkButtress = (
  ctx: CanvasRenderingContext2D,
  anchorX: number,
  anchorY: number,
  pierX: number,
  baseY: number,
  thickness: number,
  stone: string,
) => {
  const side = pierX >= anchorX ? 1 : -1
  const span = Math.abs(pierX - anchorX)
  const archBase = anchorY + (baseY - anchorY) * 0.62
  const band = Math.max(1, thickness * 0.58)
  ctx.save()
  ctx.lineJoin = 'round'
  ctx.fillStyle = stone
  ctx.strokeStyle = 'rgba(190, 190, 178, .48)'
  ctx.lineWidth = Math.max(0.8, thickness * 0.16)
  ctx.beginPath()
  ctx.moveTo(anchorX, anchorY)
  ctx.quadraticCurveTo(anchorX + side * span * 0.48, anchorY + (archBase - anchorY) * 0.12, pierX, archBase)
  ctx.lineTo(pierX + side * band, archBase + band)
  ctx.quadraticCurveTo(anchorX + side * span * 0.48, anchorY + band + (archBase - anchorY) * 0.12, anchorX, anchorY + band)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  // The dark inner arch makes the span read as a real opening instead of a single line.
  ctx.fillStyle = 'rgba(5, 9, 16, .88)'
  ctx.strokeStyle = 'rgba(177, 184, 179, .42)'
  ctx.lineWidth = Math.max(0.7, thickness * 0.11)
  ctx.beginPath()
  ctx.moveTo(anchorX + side * band * 1.7, archBase + band * 1.35)
  ctx.quadraticCurveTo(anchorX + side * span * 0.5, anchorY + (archBase - anchorY) * 0.35, pierX - side * band * 1.6, archBase + band * 1.35)
  ctx.lineTo(pierX - side * band * 1.6, baseY)
  ctx.lineTo(anchorX + side * band * 1.7, baseY)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  // A thick landing pier and a small pinnacle anchor the far end of the flying arch.
  const pierW = Math.max(1.4, thickness * 0.72)
  ctx.fillStyle = 'rgba(12, 17, 25, .94)'
  ctx.strokeStyle = 'rgba(183, 183, 170, .46)'
  ctx.lineWidth = Math.max(0.7, thickness * 0.12)
  ctx.beginPath()
  ctx.moveTo(pierX - pierW, baseY)
  ctx.lineTo(pierX - pierW * 0.78, archBase + band * 0.9)
  ctx.lineTo(pierX + pierW * 0.78, archBase + band * 0.9)
  ctx.lineTo(pierX + pierW, baseY)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = 'rgba(7, 11, 18, .98)'
  ctx.beginPath()
  ctx.moveTo(pierX - pierW * 1.18, archBase + band * 0.95)
  ctx.lineTo(pierX, archBase - thickness * 0.85)
  ctx.lineTo(pierX + pierW * 1.18, archBase + band * 0.95)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}

const drawWindowArchitecture = (
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  ww: number,
  wh: number,
  backdrop: HTMLImageElement | null,
  cameraX: number,
  cameraY: number,
) => {
  ctx.save()
  ctx.beginPath()
  ctx.rect(wx + 5, wy + 5, ww - 10, wh - 10)
  ctx.clip()
  ctx.save()
  ctx.translate(cameraX * 0.62, cameraY * 0.62)

  // Overscan the moving plate so the window never exposes an unpainted strip at either edge.
  const backdropOverflow = Math.abs(cameraX) * 0.62 + ww * 0.04
  const backdropOverflowY = Math.abs(cameraY) * 0.62 + wh * 0.04
  const backdropX = wx + 5 - backdropOverflow
  const backdropWidth = ww - 10 + backdropOverflow * 2
  if (backdrop) drawCoverImage(ctx, backdrop, backdropX, wy + 5 - backdropOverflowY, backdropWidth, wh - 10 + backdropOverflowY * 2, 0.78)

  const windowSky = ctx.createLinearGradient(wx - backdropOverflow, wy, wx + ww + backdropOverflow, wy + wh)
  windowSky.addColorStop(0, 'rgba(18, 35, 58, .3)')
  windowSky.addColorStop(0.5, 'rgba(29, 39, 54, .16)')
  windowSky.addColorStop(1, 'rgba(25, 18, 28, .42)')
  ctx.fillStyle = windowSky
  ctx.fillRect(wx - backdropOverflow, wy - backdropOverflowY, ww + backdropOverflow * 2, wh + backdropOverflowY * 2)

  // Small stars and cloud strokes add depth without flattening the supplied background plate.
  ctx.fillStyle = 'rgba(218, 208, 181, .52)'
  for (let star = 0; star < 24; star += 1) {
    const starX = wx + ww * (0.04 + ((star * 37) % 91) / 100)
    const starY = wy + wh * (0.08 + ((star * 19) % 43) / 100)
    const radius = Math.max(0.65, ww * (0.0012 + (star % 3) * 0.0007))
    ctx.globalAlpha = 0.28 + (star % 4) * 0.1
    ctx.beginPath()
    ctx.arc(starX, starY, radius, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
  ctx.strokeStyle = 'rgba(152, 170, 183, .16)'
  ctx.lineWidth = Math.max(1, ww * 0.003)
  ctx.beginPath()
  ctx.moveTo(wx - ww * 0.08, wy + wh * 0.34)
  ctx.bezierCurveTo(wx + ww * 0.17, wy + wh * 0.25, wx + ww * 0.26, wy + wh * 0.42, wx + ww * 0.5, wy + wh * 0.33)
  ctx.bezierCurveTo(wx + ww * 0.7, wy + wh * 0.26, wx + ww * 0.82, wy + wh * 0.35, wx + ww * 1.08, wy + wh * 0.27)
  ctx.stroke()

  // Three anchored depth bands keep the towers grounded while the camera scrolls.
  // The lowest masonry deck is drawn first so every spire has a continuous landing.
  ctx.restore()
  ctx.save()
  ctx.translate(cameraX * 0.54, cameraY * 0.54)
  const farBase = wy + wh * 0.77
  const farBottom = wy + wh * 0.94
  ctx.fillStyle = 'rgba(5, 9, 17, .82)'
  ctx.fillRect(wx - ww * 0.12, farBase, ww * 1.24, farBottom - farBase)
  ctx.strokeStyle = 'rgba(143, 161, 170, .27)'
  ctx.lineWidth = Math.max(0.8, ww * 0.002)
  ctx.beginPath()
  ctx.moveTo(wx - ww * 0.12, farBase)
  ctx.lineTo(wx + ww * 1.12, farBase + wh * 0.014)
  ctx.stroke()
  for (let course = 1; course < 4; course += 1) {
    const courseY = farBase + (farBottom - farBase) * course / 4
    ctx.strokeStyle = 'rgba(128, 150, 160, .16)'
    ctx.beginPath()
    ctx.moveTo(wx - ww * 0.1, courseY)
    ctx.lineTo(wx + ww * 1.1, courseY + wh * 0.006)
    ctx.stroke()
  }
  for (let pier = 0; pier < 13; pier += 1) {
    const pierX = wx - ww * 0.08 + pier * ww * 0.1
    ctx.fillStyle = pier % 2 ? 'rgba(8, 13, 22, .9)' : 'rgba(10, 16, 26, .78)'
    ctx.beginPath()
    ctx.moveTo(pierX, farBottom)
    ctx.lineTo(pierX + ww * 0.018, farBase + wh * 0.018)
    ctx.lineTo(pierX + ww * 0.036, farBottom)
    ctx.closePath()
    ctx.fill()
  }

  // Far towers sit at different depths and all run into the masonry deck.
  for (let index = 0; index < 10; index += 1) {
    const center = wx + ww * (-0.04 + index * 0.112)
    const buildingWidth = ww * (0.07 + (index % 4) * 0.014)
    const buildingHeight = wh * (0.2 + ((index * 19) % 9) * 0.018)
    const bodyTop = farBase - buildingHeight
    const half = buildingWidth / 2
    const bodyBottom = farBottom + wh * (index % 3 === 0 ? 0.012 : 0)
    ctx.fillStyle = index % 2 === 0 ? 'rgba(7, 13, 23, .88)' : 'rgba(11, 17, 28, .8)'
    ctx.beginPath()
    ctx.moveTo(center - half * 0.72, bodyBottom)
    ctx.lineTo(center - half * 0.62, bodyTop + buildingHeight * 0.12)
    ctx.lineTo(center - half * 0.45, bodyTop + buildingHeight * 0.04)
    ctx.lineTo(center + half * 0.45, bodyTop + buildingHeight * 0.04)
    ctx.lineTo(center + half * 0.62, bodyTop + buildingHeight * 0.12)
    ctx.lineTo(center + half * 0.72, bodyBottom)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = 'rgba(4, 8, 15, .94)'
    ctx.beginPath()
    ctx.moveTo(center - half * 0.56, bodyTop + buildingHeight * 0.06)
    ctx.lineTo(center, bodyTop - buildingHeight * (0.34 + (index % 3) * 0.05))
    ctx.lineTo(center + half * 0.56, bodyTop + buildingHeight * 0.06)
    ctx.closePath()
    ctx.fill()
    for (const side of [-1, 1]) {
      const pinnacleX = center + side * half * 0.58
      ctx.beginPath()
      ctx.moveTo(pinnacleX - half * 0.1, bodyTop + buildingHeight * 0.12)
      ctx.lineTo(pinnacleX, bodyTop - buildingHeight * 0.16)
      ctx.lineTo(pinnacleX + half * 0.1, bodyTop + buildingHeight * 0.12)
      ctx.closePath()
      ctx.fill()
    }
    ctx.strokeStyle = 'rgba(145, 168, 176, .3)'
    ctx.lineWidth = Math.max(0.7, ww * 0.0018)
    for (let tier = 1; tier < 4; tier += 1) {
      const tierY = bodyTop + buildingHeight * (0.23 + tier * 0.16)
      ctx.beginPath()
      ctx.moveTo(center - half * 0.54, tierY)
      ctx.lineTo(center + half * 0.54, tierY + wh * 0.004)
      ctx.stroke()
    }
    ctx.strokeStyle = 'rgba(185, 181, 164, .38)'
    ctx.lineWidth = Math.max(0.7, ww * 0.0015)
    ctx.beginPath()
    ctx.moveTo(center - half * 0.6, bodyTop + buildingHeight * 0.2)
    ctx.lineTo(center + half * 0.6, bodyTop + buildingHeight * 0.2)
    ctx.moveTo(center - half * 0.48, bodyTop + buildingHeight * 0.24)
    ctx.lineTo(center + half * 0.48, bodyTop + buildingHeight * 0.24)
    ctx.stroke()
    drawGothicRosette(
      ctx,
      center,
      bodyTop + buildingHeight * 0.31,
      Math.max(2, half * 0.22),
      'rgba(183, 184, 169, .5)',
      'rgba(9, 15, 24, .84)',
    )
    ctx.strokeStyle = 'rgba(174, 180, 171, .28)'
    ctx.lineWidth = Math.max(0.6, ww * 0.0012)
    for (const side of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(center + side * half * 0.22, bodyTop + buildingHeight * 0.39)
      ctx.lineTo(center + side * half * 0.22, bodyBottom - buildingHeight * 0.18)
      ctx.stroke()
    }
    for (let slit = 0; slit < 3; slit += 1) {
      const slitX = center + (slit - 1) * half * 0.28
      ctx.fillStyle = slit === 1 && index % 3 === 0 ? 'rgba(224, 177, 107, .54)' : 'rgba(130, 160, 173, .32)'
      ctx.beginPath()
      ctx.moveTo(slitX - half * 0.06, bodyBottom - buildingHeight * 0.32)
      ctx.lineTo(slitX - half * 0.045, bodyBottom - buildingHeight * 0.44)
      ctx.quadraticCurveTo(slitX, bodyBottom - buildingHeight * 0.5, slitX + half * 0.045, bodyBottom - buildingHeight * 0.44)
      ctx.lineTo(slitX + half * 0.06, bodyBottom - buildingHeight * 0.32)
      ctx.closePath()
      ctx.fill()
    }
    // Repeated flying buttresses tie each tower back to the deck at multiple levels.
    for (const side of [-1, 1]) {
      for (let tier = 0; tier < 2; tier += 1) {
        const shoulderY = bodyTop + buildingHeight * (0.46 + tier * 0.2)
        const pierX = center + side * (half * (0.82 + tier * 0.08) + ww * 0.025)
        drawOpenworkButtress(
          ctx,
          center + side * half * 0.48,
          shoulderY,
          pierX,
          bodyBottom,
          Math.max(2, ww * 0.012),
          tier === 0 ? 'rgba(94, 126, 142, .56)' : 'rgba(111, 137, 148, .46)',
        )
      }
    }
  }

  // A middle terrace adds a second readable depth plane without introducing roofs.
  ctx.restore()
  ctx.save()
  ctx.translate(cameraX * 0.3, cameraY * 0.3)
  const middleBase = wy + wh * 0.88
  for (let index = 0; index < 5; index += 1) {
    const center = wx + ww * (-0.08 + index * 0.27)
    const towerWidth = ww * (0.12 + (index % 2) * 0.025)
    const towerHeight = wh * (0.28 + (index % 3) * 0.035)
    const top = middleBase - towerHeight
    const half = towerWidth / 2
    ctx.fillStyle = index % 2 ? 'rgba(8, 12, 20, .9)' : 'rgba(12, 16, 25, .86)'
    ctx.fillRect(center - half * 0.68, top + towerHeight * 0.18, half * 1.36, middleBase - top)
    ctx.beginPath()
    ctx.moveTo(center - half * 0.72, top + towerHeight * 0.2)
    ctx.lineTo(center, top - towerHeight * 0.27)
    ctx.lineTo(center + half * 0.72, top + towerHeight * 0.2)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = 'rgba(167, 172, 168, .3)'
    ctx.lineWidth = Math.max(0.8, ww * 0.002)
    for (let level = 0; level < 3; level += 1) {
      const levelY = top + towerHeight * (0.35 + level * 0.18)
      ctx.beginPath()
      ctx.moveTo(center - half * 0.58, levelY)
      ctx.lineTo(center + half * 0.58, levelY)
      ctx.stroke()
    }
    drawGothicRosette(
      ctx,
      center,
      top + towerHeight * 0.27,
      Math.max(3, half * 0.27),
      'rgba(193, 187, 165, .52)',
      'rgba(7, 11, 18, .88)',
    )
    ctx.strokeStyle = 'rgba(188, 183, 166, .3)'
    ctx.lineWidth = Math.max(0.7, ww * 0.0015)
    for (const side of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(center + side * half * 0.25, top + towerHeight * 0.39)
      ctx.lineTo(center + side * half * 0.25, middleBase - towerHeight * 0.1)
      ctx.stroke()
    }
    ctx.fillStyle = index === 2 ? 'rgba(226, 176, 103, .5)' : 'rgba(130, 158, 169, .3)'
    ctx.beginPath()
    ctx.moveTo(center - half * 0.12, middleBase - towerHeight * 0.55)
    ctx.lineTo(center - half * 0.1, middleBase - towerHeight * 0.72)
    ctx.quadraticCurveTo(center, middleBase - towerHeight * 0.82, center + half * 0.1, middleBase - towerHeight * 0.72)
    ctx.lineTo(center + half * 0.12, middleBase - towerHeight * 0.55)
    ctx.closePath()
    ctx.fill()
    for (const side of [-1, 1]) {
      for (let level = 0; level < 2; level += 1) {
        const archY = top + towerHeight * (0.54 + level * 0.19)
        const pierX = center + side * (half * 0.92 + ww * (0.035 + level * 0.012))
        drawOpenworkButtress(
          ctx,
          center + side * half * 0.46,
          archY,
          pierX,
          middleBase,
          Math.max(2.4, ww * 0.016),
          'rgba(112, 132, 139, .58)',
        )
      }
    }
  }

  // A pair of distant bare branches breaks the geometric skyline at the edges.
  ctx.restore()
  ctx.strokeStyle = 'rgba(5, 8, 14, .78)'
  ctx.lineCap = 'round'
  ctx.lineWidth = Math.max(1.2, ww * 0.006)
  for (const side of [-1, 1]) {
    const rootX = wx + (side < 0 ? ww * 0.08 : ww * 0.92)
    const rootY = wy + wh * 0.82
    ctx.beginPath()
    ctx.moveTo(rootX, rootY)
    ctx.bezierCurveTo(rootX + side * ww * 0.02, rootY - wh * 0.2, rootX + side * ww * 0.1, rootY - wh * 0.28, rootX + side * ww * 0.06, rootY - wh * 0.42)
    ctx.stroke()
    for (let branch = 0; branch < 4; branch += 1) {
      const branchY = rootY - wh * (0.14 + branch * 0.075)
      ctx.lineWidth = Math.max(0.65, ww * (0.0038 - branch * 0.0005))
      ctx.beginPath()
      ctx.moveTo(rootX + side * ww * 0.02, branchY)
      ctx.quadraticCurveTo(rootX + side * ww * (0.09 + branch * 0.015), branchY - wh * 0.035, rootX + side * ww * (0.17 + branch * 0.02), branchY - wh * 0.12)
      ctx.stroke()
    }
  }

  const windowMist = ctx.createLinearGradient(wx, wy + wh * 0.53, wx, wy + wh)
  windowMist.addColorStop(0, 'rgba(164, 177, 185, 0)')
  windowMist.addColorStop(0.55, 'rgba(164, 177, 185, .11)')
  windowMist.addColorStop(1, 'rgba(164, 177, 185, .34)')
  ctx.fillStyle = windowMist
  ctx.fillRect(wx, wy + wh * 0.5, ww, wh * 0.5)
  ctx.restore()
}

const drawFlame = (ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, t: number, active: boolean) => {
  if (!active) return
  const flicker = Math.sin(t * 7.2) * 0.08 + Math.sin(t * 11.3 + 1.5) * 0.045
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(1 + flicker, 1 - flicker * 0.5)
  const glow = ctx.createRadialGradient(0, -scale * 0.8, 0, 0, -scale * 0.8, scale * 4.2)
  glow.addColorStop(0, 'rgba(255, 198, 116, .64)')
  glow.addColorStop(0.45, 'rgba(191, 72, 43, .26)')
  glow.addColorStop(1, 'rgba(87, 28, 30, 0)')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(0, -scale * 0.8, scale * 4.2, 0, Math.PI * 2)
  ctx.fill()

  const outer = ctx.createLinearGradient(0, 0, 0, -scale * 3.3)
  outer.addColorStop(0, '#7e211f')
  outer.addColorStop(0.55, '#d66d39')
  outer.addColorStop(1, '#edbd76')
  ctx.fillStyle = outer
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.bezierCurveTo(-scale * 1.4, -scale * 0.3, -scale * 1.25, -scale * 1.6, -scale * 0.32, -scale * 2.35)
  ctx.bezierCurveTo(-scale * 0.14, -scale * 2.62, -scale * 0.28, -scale * 3.15, scale * 0.35, -scale * 3.55)
  ctx.bezierCurveTo(scale * 0.27, -scale * 2.25, scale * 1.48, -scale * 1.9, scale * 1.18, -scale * 0.78)
  ctx.bezierCurveTo(scale * 1.02, -scale * 0.28, scale * 0.55, -scale * 0.07, 0, 0)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#f9d9a0'
  ctx.beginPath()
  ctx.moveTo(0, -scale * 0.2)
  ctx.bezierCurveTo(-scale * 0.62, -scale * 0.72, -scale * 0.34, -scale * 1.55, scale * 0.16, -scale * 2.1)
  ctx.bezierCurveTo(scale * 0.45, -scale * 1.28, scale * 0.73, -scale * 0.75, 0, -scale * 0.2)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

// The old clock is intentionally unreliable: mixed frequencies make its hands reverse direction.
const clockChaosAngle = (time: number, phase = 0) => (
  time * 0.42
  + Math.sin(time * 1.25 + phase) * 1.65
  + Math.sin(time * 2.95 + phase * 1.7) * 0.62
  + Math.sin(time * 0.19 + phase * 0.4) * 0.9
)

function drawLibrary(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  rain: RainDrop[],
  embers: Ember[],
  backdrop: HTMLImageElement | null,
  portrait: HTMLCanvasElement | null,
  portraitName: string,
  portraitVisible: boolean,
  portraitObscured: boolean,
  lampActive: boolean,
  chandelierActive: boolean,
  cameraX: number,
  cameraY: number,
  rainActive: boolean,
  fireActive: boolean,
  reducedMotion: boolean,
) {
  const t = reducedMotion ? 0 : time / 1000
  ctx.clearRect(0, 0, width, height)
  ctx.save()
  ctx.translate(-cameraX, -cameraY)

  const worldLeft = -width * 0.4
  const worldWidth = width * 1.9
  const wall = ctx.createLinearGradient(worldLeft, 0, worldLeft + worldWidth, height)
  wall.addColorStop(0, '#080b12')
  wall.addColorStop(0.44, '#17121a')
  wall.addColorStop(0.72, '#28151a')
  wall.addColorStop(1, '#0b090c')
  ctx.fillStyle = wall
  const verticalOverscan = height * 0.34
  ctx.fillRect(worldLeft, -verticalOverscan, worldWidth, height + verticalOverscan * 2)

  // Keep the room opaque. The local cathedral plate is composited only inside the window below.
  const distantWash = ctx.createLinearGradient(0, 0, 0, height)
  distantWash.addColorStop(0, 'rgba(8, 12, 22, .42)')
  distantWash.addColorStop(0.58, 'rgba(17, 18, 28, .18)')
  distantWash.addColorStop(1, 'rgba(9, 8, 14, .72)')
  ctx.fillStyle = distantWash
  ctx.fillRect(worldLeft, -verticalOverscan, worldWidth, height + verticalOverscan * 2)

  // Rear wall architecture drifts only slightly with the camera, establishing the first interior depth plane.
  drawInteriorBackLayer(ctx, width, height, cameraX, cameraY)
  drawPerspectiveSideWalls(ctx, width, height, cameraX, cameraY)

  // Stained plaster texture and a restrained amber wash from the hearth.
  ctx.save()
  ctx.globalAlpha = 0.13
  for (let i = 0; i < 300; i += 1) {
    const x = (i * 97.31) % width
    const y = (i * 47.73) % height
    ctx.fillStyle = i % 4 === 0 ? '#b28568' : '#13111a'
    ctx.fillRect(x, y, 1 + (i % 3), 1 + (i % 2))
  }
  ctx.restore()
  const hearthWash = ctx.createRadialGradient(width * 0.18, height * 0.7, 0, width * 0.18, height * 0.7, width * 0.5)
  hearthWash.addColorStop(0, fireActive ? 'rgba(245, 145, 67, .48)' : 'rgba(183, 84, 42, .06)')
  hearthWash.addColorStop(0.3, fireActive ? 'rgba(207, 92, 49, .24)' : 'rgba(183, 84, 42, .025)')
  hearthWash.addColorStop(1, 'rgba(183, 84, 42, 0)')
  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  ctx.fillStyle = hearthWash
  ctx.fillRect(0, height * 0.22, width * 0.76, height * 0.78)
  ctx.restore()

  // Large plaster panels and a carved cornice stop the room from reading as one dark gradient.
  ctx.save()
  ctx.strokeStyle = 'rgba(157, 125, 118, .18)'
  ctx.lineWidth = Math.max(1, width * 0.0011)
  for (let panel = 0; panel < 7; panel += 1) {
    const panelX = width * (0.035 + panel * 0.135)
    ctx.beginPath()
    ctx.moveTo(panelX, height * 0.08)
    ctx.lineTo(panelX, height * 0.68)
    ctx.stroke()
  }
  ctx.strokeStyle = 'rgba(209, 172, 130, .26)'
  ctx.lineWidth = Math.max(1, width * 0.002)
  ctx.beginPath()
  ctx.moveTo(width * 0.03, height * 0.12)
  ctx.lineTo(width * 0.95, height * 0.12)
  ctx.moveTo(width * 0.03, height * 0.14)
  ctx.lineTo(width * 0.95, height * 0.14)
  ctx.stroke()
  ctx.fillStyle = 'rgba(188, 144, 101, .16)'
  for (let rosette = 0; rosette < 12; rosette += 1) {
    ctx.beginPath()
    ctx.arc(width * (0.055 + rosette * 0.08), height * 0.13, Math.max(2, width * 0.005), 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()

  // Golden-ratio composition: the window owns roughly 61.8% of the room's width.
  const wx = width * 0.045
  const wy = height * 0.105
  const ww = width * 0.618
  const wh = height * 0.62
  ctx.save()
  ctx.shadowColor = 'rgba(113, 154, 190, .15)'
  ctx.shadowBlur = 28
  const glass = ctx.createLinearGradient(wx, wy, wx + ww, wy + wh)
  glass.addColorStop(0, '#101a2a')
  glass.addColorStop(0.4, '#172535')
  glass.addColorStop(1, '#211629')
  ctx.fillStyle = glass
  drawRoundedRect(ctx, wx, wy, ww, wh, 5)
  ctx.fill()
  ctx.shadowBlur = 0

  // The clipped window receives the detailed local backdrop and a layered cathedral silhouette.
  drawWindowArchitecture(ctx, wx, wy, ww, wh, backdrop, cameraX, cameraY)

  ctx.strokeStyle = '#574a50'
  ctx.lineWidth = Math.max(4, width * 0.007)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(203, 187, 170, .42)'
  ctx.lineWidth = Math.max(1, width * 0.002)
  ctx.strokeRect(wx + ww * 0.045, wy + wh * 0.04, ww * 0.91, wh * 0.92)
  ctx.beginPath()
  ctx.moveTo(wx + ww * 0.5, wy + wh * 0.04)
  ctx.lineTo(wx + ww * 0.5, wy + wh * 0.96)
  ctx.moveTo(wx + ww * 0.045, wy + wh * 0.51)
  ctx.lineTo(wx + ww * 0.955, wy + wh * 0.51)
  ctx.stroke()
  // A clouded moon is intentionally imperfect and slightly off-centre.
  const moon = ctx.createRadialGradient(wx + ww * 0.66, wy + wh * 0.29, 1, wx + ww * 0.66, wy + wh * 0.29, ww * 0.16)
  moon.addColorStop(0, 'rgba(225, 215, 190, .78)')
  moon.addColorStop(0.58, 'rgba(199, 190, 174, .24)')
  moon.addColorStop(1, 'rgba(199, 190, 174, 0)')
  ctx.fillStyle = moon
  ctx.fillRect(wx + ww * 0.45, wy + wh * 0.07, ww * 0.43, wh * 0.45)
  ctx.restore()

  // Rain is clipped to the glass, with uneven lengths and opacity.
  ctx.save()
  ctx.beginPath()
  ctx.rect(wx + 4, wy + 4, ww - 8, wh - 8)
  ctx.clip()
  if (rainActive) {
    for (const drop of rain) {
      if (!reducedMotion) {
        drop.y += drop.speed
        drop.x += drop.slant * 0.13
        if (drop.y > wh + wy + drop.length) {
          drop.y = wy - drop.length
          drop.x = wx + (drop.x - wx + ww * 0.9) % ww
        }
      }
      ctx.strokeStyle = `rgba(180, 202, 213, ${drop.opacity})`
      ctx.lineWidth = drop.width
      ctx.beginPath()
      ctx.moveTo(drop.x, drop.y)
      ctx.lineTo(drop.x + drop.slant, drop.y + drop.length)
      ctx.stroke()
    }
  }
  ctx.restore()

  // A solid lower wall and a single perspective floor plane establish the
  // room's depth before any furniture is painted. Keeping the plane behind
  // the props prevents plank seams from cutting through legs and hearths.
  ctx.save()
  ctx.translate(cameraX * 0.1, cameraY * 0.1)
  const lowerWallTop = height * 0.69
  const floorHorizon = height * 0.775
  const lowerWall = ctx.createLinearGradient(0, lowerWallTop, 0, floorHorizon)
  lowerWall.addColorStop(0, '#2a222c')
  lowerWall.addColorStop(0.48, '#221a23')
  lowerWall.addColorStop(1, '#151118')
  ctx.fillStyle = lowerWall
  ctx.fillRect(worldLeft, lowerWallTop, worldWidth, floorHorizon - lowerWallTop)
  ctx.fillStyle = 'rgba(174, 131, 101, .15)'
  ctx.fillRect(worldLeft, lowerWallTop, worldWidth, Math.max(3, height * 0.009))
  ctx.fillStyle = 'rgba(10, 8, 13, .42)'
  ctx.fillRect(worldLeft, floorHorizon - height * 0.014, worldWidth, height * 0.014)
  ctx.strokeStyle = 'rgba(193, 151, 111, .22)'
  ctx.lineWidth = Math.max(1, width * 0.0012)
  for (let panel = 0; panel < 10; panel += 1) {
    const panelX = worldLeft + worldWidth * (0.035 + panel * 0.105)
    ctx.beginPath()
    ctx.moveTo(panelX, lowerWallTop + height * 0.015)
    ctx.lineTo(panelX + worldWidth * 0.018, floorHorizon - height * 0.018)
    ctx.stroke()
  }

  const sceneBottom = height + verticalOverscan
  const floor = ctx.createLinearGradient(0, floorHorizon, 0, sceneBottom)
  floor.addColorStop(0, '#34232a')
  floor.addColorStop(0.34, '#271b23')
  floor.addColorStop(1, '#110d15')
  ctx.fillStyle = floor
  ctx.beginPath()
  ctx.moveTo(worldLeft, floorHorizon)
  ctx.lineTo(worldLeft + worldWidth, floorHorizon)
  ctx.lineTo(worldLeft + worldWidth * 1.08, sceneBottom)
  ctx.lineTo(worldLeft - worldWidth * 0.08, sceneBottom)
  ctx.closePath()
  ctx.fill()

  // Broad board faces read as wood grain without turning the floor into a
  // field of intersecting line-art strokes.
  for (let plank = 0; plank < 10; plank += 1) {
    const nearY = floorHorizon + (sceneBottom - floorHorizon) * (plank + 1) / 10
    const farY = floorHorizon + (sceneBottom - floorHorizon) * plank / 10
    const inset = (nearY - floorHorizon) * 0.13
    ctx.fillStyle = plank % 2 === 0 ? 'rgba(105, 65, 62, .18)' : 'rgba(51, 35, 43, .22)'
    ctx.beginPath()
    ctx.moveTo(worldLeft + inset, farY)
    ctx.lineTo(worldLeft + worldWidth - inset, farY)
    ctx.lineTo(worldLeft + worldWidth - inset * 1.12, nearY)
    ctx.lineTo(worldLeft + inset * 1.12, nearY)
    ctx.closePath()
    ctx.fill()
  }
  ctx.strokeStyle = fireActive ? 'rgba(181, 111, 77, .24)' : 'rgba(135, 91, 84, .2)'
  ctx.lineWidth = Math.max(1, width * 0.0011)
  for (let seam = 0; seam <= 10; seam += 1) {
    const progress = seam / 10
    const y = floorHorizon + (sceneBottom - floorHorizon) * progress
    const inset = (y - floorHorizon) * 0.13
    ctx.beginPath()
    ctx.moveTo(worldLeft + inset, y)
    ctx.lineTo(worldLeft + worldWidth - inset, y + height * 0.003)
    ctx.stroke()
  }
  ctx.strokeStyle = 'rgba(173, 107, 78, .17)'
  ctx.lineWidth = Math.max(0.8, width * 0.0009)
  for (let board = 0; board < 13; board += 1) {
    const x = worldLeft + worldWidth * (board / 12)
    ctx.beginPath()
    ctx.moveTo(x, floorHorizon)
    ctx.lineTo(x + (x - width * 0.5) * 0.18, sceneBottom)
    ctx.stroke()
  }

  // The rug is part of the floor plane, so chair and table shadows remain on
  // top of it instead of appearing to sink below its edge.
  ctx.globalAlpha = 0.7
  ctx.fillStyle = '#321d23'
  ctx.beginPath()
  ctx.ellipse(width * 0.58, height * 0.925, width * 0.4, height * 0.105, -0.03, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1
  ctx.restore()

  // Near columns frame the room and move faster than the rear wall, making the central chamber feel deep.
  drawForegroundPillars(ctx, width, height, cameraX, cameraY, fireActive)

  // The shelf wall recedes to the right so the window remains the dominant 61.8% plane.
  const sx = width * 0.72
  const sy = height * 0.17
  const sw = width * 0.22
  const sh = height * 0.48
  ctx.save()
  ctx.translate(cameraX * 0.18, cameraY * 0.18)
  ctx.fillStyle = '#120d12'
  ctx.shadowColor = 'rgba(0, 0, 0, .7)'
  ctx.shadowBlur = 22
  drawRoundedRect(ctx, sx, sy, sw, sh, 2)
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.fillStyle = '#4a302c'
  ctx.beginPath()
  ctx.moveTo(sx - sw * 0.035, sy + sh * 0.04)
  ctx.lineTo(sx + sw * 0.05, sy - sh * 0.025)
  ctx.lineTo(sx + sw * 0.5, sy - sh * 0.08)
  ctx.lineTo(sx + sw * 0.95, sy - sh * 0.025)
  ctx.lineTo(sx + sw * 1.035, sy + sh * 0.04)
  ctx.lineTo(sx + sw * 0.98, sy + sh * 0.09)
  ctx.lineTo(sx + sw * 0.02, sy + sh * 0.09)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(211, 169, 112, .54)'
  ctx.lineWidth = Math.max(1, width * 0.0018)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(145, 102, 84, .24)'
  ctx.lineWidth = Math.max(1, width * 0.001)
  for (let groove = 0; groove < 7; groove += 1) {
    const grooveX = sx + sw * (0.08 + groove * 0.14)
    ctx.beginPath()
    ctx.moveTo(grooveX, sy + sh * 0.1)
    ctx.lineTo(grooveX + sw * 0.018, sy + sh * 0.91)
    ctx.stroke()
  }
  ctx.fillStyle = '#302027'
  ctx.fillRect(sx + sw * 0.015, sy + sh * 0.035, sw * 0.03, sh * 0.93)
  ctx.fillRect(sx + sw * 0.955, sy + sh * 0.035, sw * 0.03, sh * 0.93)
  const shelfYs = [sy + sh * 0.3, sy + sh * 0.62, sy + sh * 0.91]
  shelfYs.forEach((y, shelfIndex) => {
    ctx.fillStyle = '#3b2725'
    ctx.fillRect(sx, y, sw, Math.max(7, height * 0.012))
    ctx.fillStyle = 'rgba(202, 152, 110, .36)'
    ctx.fillRect(sx + sw * 0.02, y, sw * 0.96, Math.max(1, height * 0.002))
    ctx.fillStyle = 'rgba(0, 0, 0, .55)'
    ctx.fillRect(sx + sw * 0.02, y + Math.max(7, height * 0.012), sw * 0.96, Math.max(3, height * 0.006))
    const count = shelfIndex === 1 ? 7 : 6
    for (let book = 0; book < count; book += 1) {
      const random = ((book * 37 + shelfIndex * 71) % 100) / 100
      const bw = sw * (0.033 + random * 0.032)
      const bh = sh * (0.16 + ((book * 17 + shelfIndex * 9) % 27) / 100)
      const bx = sx + sw * (0.05 + book * (0.89 / count)) + (book % 3) * sw * 0.004
      const by = y - height * 0.011
      drawBook(ctx, bx + bw / 2, by, bw, Math.min(bh, sh * 0.27), 330 + ((book * 19 + shelfIndex * 13) % 52), (book % 4 - 1.5) * 0.012)
      if (book % 2 === 0) {
        ctx.fillStyle = 'rgba(219, 174, 107, .38)'
        ctx.fillRect(bx + bw * 0.16, by - Math.min(bh, sh * 0.27) * 0.62, Math.max(1, bw * 0.08), Math.min(bh, sh * 0.27) * 0.08)
      }
    }
  })
  // Carved uprights, brass shelf pins and small spine labels add material scale to the reduced shelf.
  ctx.strokeStyle = 'rgba(159, 117, 90, .54)'
  ctx.lineWidth = Math.max(1, width * 0.002)
  ctx.beginPath()
  ctx.moveTo(sx + sw * 0.05, sy + sh * 0.02)
  ctx.lineTo(sx + sw * 0.05, sy + sh * 0.94)
  ctx.moveTo(sx + sw * 0.95, sy + sh * 0.02)
  ctx.lineTo(sx + sw * 0.95, sy + sh * 0.94)
  ctx.stroke()
  for (let shelf = 0; shelf < shelfYs.length; shelf += 1) {
    const y = shelfYs[shelf]
    for (let pin = 0; pin < 5; pin += 1) {
      ctx.fillStyle = 'rgba(214, 169, 103, .52)'
      ctx.beginPath()
      ctx.arc(sx + sw * (0.12 + pin * 0.19), y + Math.max(3, height * 0.006), Math.max(1, width * 0.0018), 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.fillStyle = 'rgba(210, 175, 135, .56)'
  ctx.font = `600 ${Math.max(6, width * 0.005)}px "Cormorant Garamond", serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ;['IX', 'M', 'VII'].forEach((label, index) => {
    ctx.fillText(label, sx + sw * 0.18, shelfYs[index] - sh * 0.11)
  })
  ctx.fillStyle = 'rgba(197, 145, 93, .5)'
  for (const bracket of [0.11, 0.5, 0.89]) {
    ctx.beginPath()
    ctx.moveTo(sx + sw * bracket, sy + sh * 0.92)
    ctx.lineTo(sx + sw * (bracket - 0.025), sy + sh * 0.98)
    ctx.lineTo(sx + sw * (bracket + 0.025), sy + sh * 0.98)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()

  // A small brass wall clock gives the room a quiet focal point.
  ctx.save()
  ctx.translate(cameraX * 0.18, cameraY * 0.18)
  const clockX = width * 0.69
  const clockY = height * 0.2
  const clockR = Math.max(22, width * 0.026)
  ctx.fillStyle = '#171017'
  ctx.strokeStyle = '#9e7448'
  ctx.lineWidth = Math.max(2, width * 0.003)
  ctx.beginPath()
  ctx.arc(clockX, clockY, clockR, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.strokeStyle = 'rgba(216, 183, 131, .75)'
  ctx.lineWidth = Math.max(1, width * 0.0012)
  const minuteAngle = clockChaosAngle(t) - Math.PI / 2
  const hourAngle = clockChaosAngle(t * 0.72, 2.3) * 0.68 - Math.PI / 2
  ctx.beginPath()
  ctx.moveTo(clockX, clockY)
  ctx.lineTo(clockX + Math.cos(minuteAngle) * clockR * 0.62, clockY + Math.sin(minuteAngle) * clockR * 0.62)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(231, 199, 146, .86)'
  ctx.lineWidth = Math.max(1.4, width * 0.0018)
  ctx.beginPath()
  ctx.moveTo(clockX, clockY)
  ctx.lineTo(clockX + Math.cos(hourAngle) * clockR * 0.4, clockY + Math.sin(hourAngle) * clockR * 0.4)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(216, 183, 131, .48)'
  ctx.lineWidth = Math.max(0.8, width * 0.0009)
  for (let tick = 0; tick < 12; tick += 1) {
    const angle = (tick / 12) * Math.PI * 2
    const inner = clockR * 0.74
    const outer = clockR * 0.88
    ctx.beginPath()
    ctx.moveTo(clockX + Math.cos(angle) * inner, clockY + Math.sin(angle) * inner)
    ctx.lineTo(clockX + Math.cos(angle) * outer, clockY + Math.sin(angle) * outer)
    ctx.stroke()
  }
  ctx.fillStyle = '#c6a777'
  ctx.beginPath()
  ctx.arc(clockX, clockY, Math.max(1.8, width * 0.002), 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // Stone fireplace and grate.
  const fx = width * 0.07
  const fy = height * 0.62
  const fw = width * 0.22
  const fh = height * 0.27
  ctx.save()
  // The hearth is a near architectural anchor, ahead of the stool's middle plane.
  ctx.translate(cameraX * 0.03, cameraY * 0.03)
  const stone = ctx.createLinearGradient(fx, fy, fx + fw, fy + fh)
  stone.addColorStop(0, fireActive ? '#68423d' : '#4a3437')
  stone.addColorStop(0.52, fireActive ? '#3f2c31' : '#2f252d')
  stone.addColorStop(1, '#18131a')
  ctx.fillStyle = stone
  drawRoundedRect(ctx, fx, fy, fw, fh, 5)
  ctx.fill()
  // Individual ashlar blocks break up the flat silhouette while preserving
  // the dark opening. Their staggered fills create depth without hatch-lines.
  for (let row = 0; row < 4; row += 1) {
    const rowY = fy + fh * (0.08 + row * 0.2)
    const blockH = fh * 0.15
    for (let block = 0; block < 5; block += 1) {
      const blockX = fx + fw * (0.035 + block * 0.205 + (row % 2) * 0.026)
      const blockW = fw * (0.17 + ((block + row) % 2) * 0.025)
      ctx.fillStyle = (block + row) % 3 === 0
        ? 'rgba(182, 127, 92, .18)'
        : 'rgba(18, 14, 21, .18)'
      ctx.fillRect(blockX, rowY, blockW, blockH)
    }
  }
  ctx.strokeStyle = '#755b59'
  ctx.lineWidth = Math.max(2, width * 0.003)
  ctx.stroke()
  ctx.fillStyle = fireActive ? '#8b5b4a' : '#5a4140'
  ctx.fillRect(fx - fw * 0.045, fy - fh * 0.035, fw * 1.09, fh * 0.075)
  ctx.strokeStyle = 'rgba(208, 163, 119, .58)'
  ctx.lineWidth = Math.max(1, width * 0.0015)
  ctx.strokeRect(fx - fw * 0.045, fy - fh * 0.035, fw * 1.09, fh * 0.075)
  ctx.fillStyle = '#111015'
  ctx.beginPath()
  ctx.moveTo(fx + fw * 0.12, fy + fh)
  ctx.lineTo(fx + fw * 0.18, fy + fh * 0.4)
  ctx.quadraticCurveTo(fx + fw * 0.5, fy + fh * 0.05, fx + fw * 0.82, fy + fh * 0.4)
  ctx.lineTo(fx + fw * 0.88, fy + fh)
  ctx.closePath()
  ctx.fill()
  // A projecting hearth slab anchors the fireplace to the new floor plane.
  ctx.fillStyle = fireActive ? '#70473f' : '#4e393b'
  ctx.beginPath()
  ctx.moveTo(fx - fw * 0.08, fy + fh * 0.92)
  ctx.lineTo(fx + fw * 1.08, fy + fh * 0.92)
  ctx.lineTo(fx + fw * 0.98, fy + fh * 1.06)
  ctx.lineTo(fx + fw * 0.02, fy + fh * 1.06)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(214, 163, 115, .42)'
  ctx.lineWidth = Math.max(1, width * 0.0015)
  ctx.stroke()
  ctx.strokeStyle = fireActive ? 'rgba(219, 163, 113, .48)' : 'rgba(169, 130, 102, .32)'
  ctx.lineWidth = Math.max(1, width * 0.0015)
  for (let i = 0; i < 12; i += 1) {
    const bx = fx + fw * (0.08 + (i % 4) * 0.27)
    const by = fy + fh * (0.14 + Math.floor(i / 4) * 0.13)
    ctx.beginPath()
    ctx.moveTo(bx, by)
    ctx.lineTo(bx + fw * 0.1, by + fh * 0.03)
    ctx.stroke()
  }
  ctx.strokeStyle = '#8a7471'
  ctx.lineWidth = Math.max(1, width * 0.002)
  for (let bar = 0; bar < 5; bar += 1) {
    const bx = fx + fw * (0.24 + bar * 0.13)
    ctx.beginPath()
    ctx.moveTo(bx, fy + fh * 0.73)
    ctx.lineTo(bx - fw * 0.025, fy + fh * 0.98)
    ctx.stroke()
  }
  drawFlame(ctx, fx + fw * 0.5, fy + fh * 0.82, Math.max(13, fw * (fireActive ? 0.16 : 0.11)), t, fireActive)
  if (fireActive && !reducedMotion) {
    ctx.save()
    for (const ember of embers) {
      ember.y -= ember.speed
      ember.x += Math.sin(t * 2 + ember.phase) * ember.drift
      ember.life -= 0.007
      if (ember.life <= 0 || ember.y < fy + fh * 0.23) {
        ember.phase += 1.618
        const resetNoise = (Math.sin(ember.phase * 13.1) + 1) / 2
        ember.x = fx + fw * (0.39 + resetNoise * 0.22)
        ember.y = fy + fh * 0.75
        ember.life = 0.45 + ((Math.sin(ember.phase * 7.7) + 1) / 2) * 0.55
      }
      ctx.fillStyle = `rgba(239, 166, 87, ${ember.life * 0.8})`
      ctx.beginPath()
      ctx.arc(ember.x, ember.y, ember.size, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }
  ctx.restore()

  // Desk, a brass inkwell and the clickable book.
  ctx.save()
  ctx.translate(cameraX * 0.1, cameraY * 0.1)
  drawReadingChair(ctx, width * 0.66, height * 0.94, width * 0.16, height * 0.25)
  ctx.restore()
  const dx = width * 0.46
  const dy = height * 0.73
  const dw = width * 0.38
  const dh = height * 0.15
  ctx.save()
  ctx.fillStyle = '#281a1b'
  ctx.shadowColor = 'rgba(0, 0, 0, .7)'
  ctx.shadowBlur = 18
  ctx.beginPath()
  ctx.moveTo(dx, dy)
  ctx.lineTo(dx + dw, dy - height * 0.015)
  ctx.lineTo(dx + dw * 0.97, dy + height * 0.08)
  ctx.lineTo(dx + dw * 0.04, dy + height * 0.1)
  ctx.closePath()
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.strokeStyle = '#76504b'
  ctx.lineWidth = Math.max(2, width * 0.0024)
  ctx.stroke()
  ctx.fillStyle = '#1b1217'
  ctx.fillRect(dx + dw * 0.24, dy + height * 0.045, dw * 0.5, dh * 0.54)
  ctx.strokeStyle = 'rgba(147, 101, 84, .6)'
  ctx.lineWidth = Math.max(1, width * 0.0014)
  ctx.strokeRect(dx + dw * 0.24, dy + height * 0.045, dw * 0.5, dh * 0.54)
  ctx.fillStyle = 'rgba(194, 145, 93, .58)'
  ctx.beginPath()
  ctx.arc(dx + dw * 0.5, dy + height * 0.08, Math.max(1.2, width * 0.0024), 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(182, 132, 92, .36)'
  ctx.beginPath()
  ctx.moveTo(dx + dw * 0.1, dy + height * 0.025)
  ctx.lineTo(dx + dw * 0.31, dy + height * 0.04)
  ctx.moveTo(dx + dw * 0.77, dy + height * 0.015)
  ctx.lineTo(dx + dw * 0.92, dy + height * 0.005)
  ctx.stroke()
  ctx.fillStyle = '#171117'
  ctx.fillRect(dx + dw * 0.06, dy + height * 0.07, width * 0.018, height * 0.16)
  ctx.fillRect(dx + dw * 0.87, dy + height * 0.06, width * 0.018, height * 0.17)
  ctx.fillStyle = 'rgba(181, 127, 77, .46)'
  ctx.beginPath()
  ctx.arc(dx + dw * 0.22, dy - height * 0.015, width * 0.012, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(218, 197, 163, .72)'
  ctx.beginPath()
  ctx.moveTo(dx + dw * 0.35, dy - height * 0.022)
  ctx.lineTo(dx + dw * 0.48, dy - height * 0.03)
  ctx.lineTo(dx + dw * 0.47, dy + height * 0.005)
  ctx.lineTo(dx + dw * 0.35, dy + height * 0.01)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#3a2224'
  ctx.beginPath()
  ctx.arc(dx + dw * 0.83, dy - height * 0.018, width * 0.009, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(236, 189, 112, .76)'
  ctx.fillRect(dx + dw * 0.823, dy - height * 0.055, width * 0.014, height * 0.035)
  // desk book (DOM hotspot is aligned with this rectangle)
  drawBook(ctx, dx + dw * 0.6, dy - height * 0.02, dw * 0.3, height * 0.085, 346, -0.045)
  ctx.fillStyle = '#b28a5c'
  ctx.fillRect(dx + dw * 0.72, dy - height * 0.086, width * 0.004, height * 0.055)
  ctx.restore()

  // The room continues into a side gallery; the portrait is deliberately beyond the initial camera.
  drawGalleryExtension(ctx, width, height, portrait, portraitName, portraitVisible, portraitObscured, cameraX, cameraY)

  // The left chandelier hangs in a deeper corridor plane than the statue and furniture.
  ctx.save()
  ctx.translate(cameraX * 0.42, cameraY * 0.42)
  drawChandelier(ctx, -width * 0.14, height * 0.1, width * 0.052, t, chandelierActive)
  ctx.restore()

  // Side furnishings sit between the rear wall and the foreground floor, so their drift reads as a separate plane.
  ctx.save()
  ctx.translate(cameraX * 0.12, cameraY * 0.12)
  drawSculpture(ctx, -width * 0.3, height * 0.84, width * 0.105, t)
  drawSideTable(ctx, width * 0.4, height * 0.84, width * 0.13, height * 0.13)
  drawVintageLamp(ctx, width * 1.31, height * 0.84, width * 0.075, t, lampActive)
  drawSideTable(ctx, width * 1.31, height * 0.84, width * 0.19, height * 0.12)
  ctx.restore()

  ctx.restore()
  const vignette = ctx.createRadialGradient(width * 0.48, height * 0.52, Math.min(width, height) * 0.18, width * 0.48, height * 0.52, Math.max(width, height) * 0.78)
  vignette.addColorStop(0, 'rgba(1, 2, 5, 0)')
  vignette.addColorStop(1, fireActive ? 'rgba(1, 1, 4, .48)' : 'rgba(1, 1, 4, .7)')
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, width, height)
}

export default function RainLibrary({
  reducedMotion = false,
  rainEnabled,
  fireEnabled,
  effectsEnabled = true,
  onRainToggle,
  onFireToggle,
  onAmbientCue,
  onBookOpen,
  onTarotOpen,
  className = '',
}: RainLibraryProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const [localRain, setLocalRain] = useState(rainEnabled ?? true)
  const [localFire, setLocalFire] = useState(fireEnabled ?? true)
  const [poemIndex, setPoemIndex] = useState<number | null>(null)
  const [libraryNotice, setLibraryNotice] = useState<string | null>(null)
  const [focused, setFocused] = useState(false)
  const [portraitState, setPortraitState] = useState<PortraitState>(() => {
    const index = Math.floor(Math.random() * portraitVariants.length)
    return { index, seenMask: portraitMask(index), lampActive: true, obscured: false, unlocked: false }
  })
  const [chandelierActive, setChandelierActive] = useState(true)
  const frameRef = useRef<number | null>(null)
  const noticeTimer = useRef<number | null>(null)
  const cameraPosition = useRef(0)
  const cameraYPosition = useRef(0)

  const rainActive = rainEnabled ?? localRain
  const fireActive = fireEnabled ?? localFire

  useEffect(() => {
    if (rainEnabled !== undefined) setLocalRain(rainEnabled)
  }, [rainEnabled])

  useEffect(() => {
    if (fireEnabled !== undefined) setLocalFire(fireEnabled)
  }, [fireEnabled])

  useEffect(() => {
    if (!effectsEnabled || !rainActive) return undefined
    return startRainAmbience()
  }, [effectsEnabled, rainActive])

  useEffect(() => {
    if (portraitState.unlocked || !portraitState.lampActive || !allPortraitsSeen(portraitState.seenMask)) return undefined
    const timer = window.setTimeout(() => {
      setPortraitState((previous) => {
        if (previous.unlocked || !previous.lampActive || !allPortraitsSeen(previous.seenMask)) return previous
        return { ...previous, unlocked: true, obscured: false }
      })
    }, reducedMotion ? 0 : 900)
    return () => window.clearTimeout(timer)
  }, [portraitState.lampActive, portraitState.seenMask, portraitState.unlocked, reducedMotion])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (poemIndex !== null) {
        setPoemIndex(null)
      } else if (libraryNotice !== null) {
        setLibraryNotice(null)
      } else if (focused) {
        setFocused(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [focused, libraryNotice, poemIndex])

  useEffect(() => () => {
    if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const stage = stageRef.current
    if (!canvas || !stage) return undefined
    const ctx = canvas.getContext('2d')
    if (!ctx) return undefined

    let width = 1
    let height = 1
    let previousWidth = 0
    let previousHeight = 0
    let disposed = false
    let backdrop: HTMLImageElement | null = null
    let portrait: HTMLCanvasElement | null = null
    let cameraX = cameraPosition.current
    let cameraY = cameraYPosition.current
    let dragStartX = 0
    let dragStartY = 0
    let dragStartCamera = 0
    let dragStartCameraY = 0
    let dragging = false
    const random = seededRandom(0x4c494252)
    const rain: RainDrop[] = Array.from({ length: 120 }, () => ({
      x: random(),
      y: random(),
      speed: 1.2 + random() * 2.8,
      length: 8 + random() * 24,
      opacity: 0.1 + random() * 0.32,
      slant: -3 + random() * 5,
      width: 0.5 + random() * 1.2,
    }))
    const embers: Ember[] = Array.from({ length: 26 }, () => ({
      x: width * (0.16 + random() * 0.07),
      y: height * (0.72 + random() * 0.07),
      speed: 0.2 + random() * 0.7,
      drift: 0.2 + random() * 0.8,
      size: 0.7 + random() * 1.8,
      life: 0.3 + random() * 0.7,
      phase: random() * Math.PI * 2,
    }))

    const portraitUnlocked = portraitState.unlocked && allPortraitsSeen(portraitState.seenMask)
    const portraitName = !portraitState.lampActive
      ? ''
      : portraitUnlocked
        ? portraitState.obscured ? 'Nyarlathotep' : 'Alice Liddell'
        : portraitVariants[portraitState.index]?.name ?? 'Mynoghra'
    const portraitSource = portraitUnlocked ? '/image.png' : portraitVariants[portraitState.index]?.src ?? '/image1.png'
    const drawFrame = () => drawLibrary(
      ctx,
      width,
      height,
      0,
      rain,
      embers,
      backdrop,
      portrait,
      portraitName,
      portraitState.lampActive,
      portraitState.obscured && portraitUnlocked,
      portraitState.lampActive,
      chandelierActive,
      cameraX,
      cameraY,
      rainActive,
      fireActive,
      reducedMotion,
    )

    const updateHotspotParallax = () => {
      stage.style.setProperty('--library-hotspot-window-shift', `${cameraX * 0.62}px`)
      stage.style.setProperty('--library-hotspot-fire-shift', `${cameraX * 0.03}px`)
      stage.style.setProperty('--library-hotspot-door-shift', `${cameraX * 0.34}px`)
      stage.style.setProperty('--library-hotspot-chandelier-shift', `${cameraX * 0.42}px`)
      stage.style.setProperty('--library-camera-y', `${cameraY}px`)
    }

    const updateCamera = (nextCamera: number, nextCameraY = cameraY) => {
      cameraX = clamp(nextCamera, -width * 0.36, width * 0.44)
      cameraY = clamp(nextCameraY, -height * 0.18, height * 0.18)
      cameraPosition.current = cameraX
      cameraYPosition.current = cameraY
      stage.style.setProperty('--library-camera-x', `${cameraX}px`)
      stage.style.setProperty('--library-camera-y', `${cameraY}px`)
      updateHotspotParallax()
      drawFrame()
    }

    const resize = () => {
      const rect = stage.getBoundingClientRect()
      const nextWidth = Math.max(1, rect.width)
      const nextHeight = Math.max(1, rect.height)
      if (previousWidth > 0 && previousHeight > 0) {
        const scaleX = nextWidth / previousWidth
        const scaleY = nextHeight / previousHeight
        rain.forEach((drop) => {
          drop.x *= scaleX
          drop.y *= scaleY
        })
      } else {
        rain.forEach((drop) => {
          drop.x = clamp(drop.x, 0, 1) * nextWidth
          drop.y = clamp(drop.y, 0, 1) * nextHeight
        })
      }
      width = nextWidth
      height = nextHeight
      cameraX = clamp(cameraX, -width * 0.36, width * 0.44)
      cameraY = clamp(cameraY, -height * 0.18, height * 0.18)
      cameraPosition.current = cameraX
      cameraYPosition.current = cameraY
      stage.style.setProperty('--library-camera-x', `${cameraX}px`)
      stage.style.setProperty('--library-camera-y', `${cameraY}px`)
      updateHotspotParallax()
      previousWidth = width
      previousHeight = height
      embers.forEach((ember) => {
        ember.x = width * (0.16 + random() * 0.07)
        ember.y = height * (0.72 + random() * 0.07)
      })
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      drawFrame()
    }

    const render = (time: number) => {
      if (disposed) return
      drawLibrary(
        ctx,
        width,
        height,
        time,
        rain,
        embers,
        backdrop,
        portrait,
        portraitName,
        portraitState.lampActive,
        portraitState.obscured && portraitUnlocked,
        portraitState.lampActive,
        chandelierActive,
        cameraX,
        cameraY,
        rainActive,
        fireActive,
        reducedMotion,
      )
      if (!reducedMotion) frameRef.current = window.requestAnimationFrame(render)
    }

    const onPointerDown = (event: PointerEvent) => {
      if ((event.target as HTMLElement | null)?.closest('button')) return
      dragging = true
      dragStartX = event.clientX
      dragStartY = event.clientY
      dragStartCamera = cameraX
      dragStartCameraY = cameraY
      stage.classList.add('is-panning')
      stage.setPointerCapture?.(event.pointerId)
    }
    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) return
      updateCamera(
        dragStartCamera - (event.clientX - dragStartX),
        dragStartCameraY - (event.clientY - dragStartY),
      )
    }
    const endPointer = (event: PointerEvent) => {
      if (!dragging) return
      dragging = false
      stage.classList.remove('is-panning')
      if (stage.hasPointerCapture?.(event.pointerId)) stage.releasePointerCapture(event.pointerId)
    }
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaX) < 1 && Math.abs(event.deltaY) < 1) return
      event.preventDefault()
      // The gallery depth is laid out horizontally, so the ordinary vertical
      // wheel gesture controls the X camera rather than pushing the scene up.
      const horizontalDelta = Math.abs(event.deltaX) >= Math.abs(event.deltaY)
        ? event.deltaX
        : event.deltaY * 0.72
      updateCamera(cameraX + horizontalDelta, cameraY)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
      if ((event.target as HTMLElement | null)?.closest('button, input, textarea, select')) return
      event.preventDefault()
      const horizontal = event.key === 'ArrowRight' ? width * 0.12 : event.key === 'ArrowLeft' ? -width * 0.12 : 0
      const vertical = event.key === 'ArrowDown' ? height * 0.1 : event.key === 'ArrowUp' ? -height * 0.1 : 0
      updateCamera(cameraX + horizontal, cameraY + vertical)
    }

    const observer = new ResizeObserver(resize)
    observer.observe(stage)
    backdrop = new Image()
    backdrop.decoding = 'async'
    backdrop.src = '/library-cathedral-bg.png'
    backdrop.onload = () => {
      if (!disposed) drawFrame()
    }
    const portraitImage = new Image()
    portraitImage.decoding = 'async'
    portraitImage.src = portraitSource
    portraitImage.onload = () => {
      portrait = preparePortrait(portraitImage)
      if (!disposed) drawFrame()
    }
    stage.addEventListener('pointerdown', onPointerDown)
    stage.addEventListener('pointermove', onPointerMove)
    stage.addEventListener('pointerup', endPointer)
    stage.addEventListener('pointercancel', endPointer)
    stage.addEventListener('wheel', onWheel, { passive: false })
    stage.addEventListener('keydown', onKeyDown)
    resize()
    if (!reducedMotion) frameRef.current = window.requestAnimationFrame(render)

    return () => {
      disposed = true
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current)
      frameRef.current = null
      observer.disconnect()
      if (backdrop) backdrop.onload = null
      portraitImage.onload = null
      stage.removeEventListener('pointerdown', onPointerDown)
      stage.removeEventListener('pointermove', onPointerMove)
      stage.removeEventListener('pointerup', endPointer)
      stage.removeEventListener('pointercancel', endPointer)
      stage.removeEventListener('wheel', onWheel)
      stage.removeEventListener('keydown', onKeyDown)
      stage.classList.remove('is-panning')
      cameraPosition.current = cameraX
      cameraYPosition.current = cameraY
    }
  }, [chandelierActive, portraitState, rainActive, fireActive, reducedMotion])

  const showLibraryCopy = useCallback((pool: readonly string[], fixed?: string) => {
    const text = fixed ?? pool[Math.floor(Math.random() * pool.length)]
    if (!text) return
    if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current)
    setLibraryNotice(text)
    announce(text)
    noticeTimer.current = window.setTimeout(() => {
      setLibraryNotice(null)
      noticeTimer.current = null
    }, 4800)
  }, [])

  const toggleRain = useCallback(() => {
    const next = !rainActive
    setLocalRain(next)
    onRainToggle?.(next)
    if (effectsEnabled) onAmbientCue?.('rain')
    showLibraryCopy(libraryPhrases)
  }, [effectsEnabled, onAmbientCue, onRainToggle, rainActive, showLibraryCopy])

  const toggleFire = useCallback(() => {
    const next = !fireActive
    setLocalFire(next)
    onFireToggle?.(next)
    if (effectsEnabled) onAmbientCue?.('fire')
  }, [effectsEnabled, fireActive, onAmbientCue, onFireToggle])

  const toggleLamp = useCallback(() => {
    setPortraitState((previous) => {
      const lampActive = !previous.lampActive
      // Pick a new hidden portrait when switching off; reopening reveals that same portrait
      // so every illuminated variant has a chance to be genuinely seen.
      const index = lampActive && !previous.unlocked
        ? previous.index
        : randomOtherPortrait(previous.index)
      return {
        index,
        // Only an illuminated portrait counts as seen; the dark state hides its contents.
        seenMask: lampActive ? previous.seenMask | portraitMask(index) : previous.seenMask,
        lampActive,
        obscured: false,
        unlocked: previous.unlocked,
      }
    })
  }, [])

  const toggleChandelier = useCallback(() => {
    setChandelierActive((previous) => !previous)
  }, [])

  const handlePortraitClick = useCallback(() => {
    showLibraryCopy(portraitPhrases)
    if (!portraitState.unlocked) {
      return
    }
    setPortraitState((previous) => ({ ...previous, obscured: true }))
  }, [portraitState.seenMask, portraitState.unlocked, showLibraryCopy])

  const handleTarotClick = useCallback(() => {
    showLibraryCopy([], '塔罗圣堂的穹顶正在开启。')
    onTarotOpen?.()
  }, [onTarotOpen, showLibraryCopy])

  const openBook = useCallback(() => {
    const next = randomIndex(libraryPoems.length, poemIndex ?? -1)
    if (noticeTimer.current !== null) {
      window.clearTimeout(noticeTimer.current)
      noticeTimer.current = null
    }
    setLibraryNotice(null)
    setPoemIndex(next)
    onBookOpen?.(libraryPoems[next].text, next)
    if (effectsEnabled) onAmbientCue?.('book')
  }, [effectsEnabled, onAmbientCue, onBookOpen, poemIndex])

  const closeBook = () => setPoemIndex(null)

  const hotspotStyle = (left: string, top: string): CSSProperties => ({ left, top })

  return (
    <main
      className={`rain-library ${focused ? 'rain-library--focused' : ''} ${fireActive ? 'rain-library--fire' : ''} ${className}`.trim()}
      data-scene="library"
      data-portrait={portraitState.unlocked ? portraitState.obscured ? 'Nyarlathotep' : 'Alice Liddell' : portraitState.lampActive ? portraitVariants[portraitState.index]?.name : ''}
      data-portrait-seen={portraitState.seenMask}
      data-lamp={portraitState.lampActive ? 'on' : 'off'}
      data-chandelier={chandelierActive ? 'on' : 'off'}
      aria-labelledby="rain-library-title"
    >
      <div
        className="rain-library__stage"
        ref={stageRef}
        tabIndex={0}
        aria-label="图书馆之梦长廊，可左右探索"
        title="拖拽或滚轮探索图书馆之梦长廊"
      >
        <canvas
          ref={canvasRef}
          className="rain-library__canvas"
          role="img"
          aria-label="图书馆之梦：窗外雨幕、壁炉与满是书籍的书架"
        />
        <div className="rain-library__grain" aria-hidden="true" />
        <header className="rain-library__header">
          <p className="rain-library__kicker">第一展馆 <span>/</span> 环境音交互</p>
          <h1 id="rain-library-title">图书馆之梦</h1>
          <p className="rain-library__subtitle">THE DREAM OF THE LIBRARY</p>
        </header>

        <p className="rain-library__caption">你又回来了。</p>

        <nav className="rain-library__hotspots" aria-label="图书馆之梦交互热点">
          <button
            type="button"
            className={`library-hotspot library-hotspot--window ${rainActive ? 'is-active' : ''}`}
            style={hotspotStyle('36%', '35%')}
            aria-pressed={rainActive}
            aria-label={rainActive ? '关闭雨声' : '开启雨声'}
            onClick={toggleRain}
          >
            <CloudRain aria-hidden="true" />
            <span>{rainActive ? '雨声' : '静默雨声'}</span>
          </button>
          <button
            type="button"
            className={`library-hotspot library-hotspot--fire ${fireActive ? 'is-active' : ''}`}
            style={hotspotStyle('18%', '75%')}
            aria-pressed={fireActive}
            aria-label={fireActive ? '熄灭壁炉' : '点燃壁炉'}
            onClick={toggleFire}
          >
            <Flame aria-hidden="true" />
          </button>
          <button
            type="button"
            className={`library-hotspot library-hotspot--lamp ${portraitState.lampActive ? 'is-active' : ''}`}
            style={hotspotStyle('131%', '63%')}
            aria-pressed={portraitState.lampActive}
            aria-label={portraitState.lampActive ? '关闭右侧画像灯' : '打开右侧画像灯'}
            onClick={toggleLamp}
          >
            <Lightbulb aria-hidden="true" />
            <span>{portraitState.lampActive ? '关灯' : '开灯'}</span>
          </button>
          <button
            type="button"
            className={`library-hotspot library-hotspot--chandelier ${chandelierActive ? 'is-active' : ''}`}
            style={hotspotStyle('-14%', '27%')}
            aria-pressed={chandelierActive}
            aria-label={chandelierActive ? '关闭左侧吊灯' : '打开左侧吊灯'}
            onClick={toggleChandelier}
          >
            <Lightbulb aria-hidden="true" />
            <span>{chandelierActive ? '关吊灯' : '开吊灯'}</span>
          </button>
          <button
            type="button"
            className="library-hotspot library-hotspot--book"
            style={hotspotStyle('69%', '69%')}
            aria-label={poemIndex === null ? '翻开桌面上的孤本' : '再翻一页'}
            onClick={openBook}
          >
            <BookOpen aria-hidden="true" />
            <span>{poemIndex === null ? '翻开孤本' : '再翻一页'}</span>
          </button>
          <button
            type="button"
            className="library-hotspot library-hotspot--portrait"
            style={hotspotStyle('117%', '86%')}
            aria-label={portraitState.unlocked ? '遮盖画像面部' : '查看右侧画像'}
            onClick={handlePortraitClick}
          >
            <ImageIcon aria-hidden="true" />
            <span>画像</span>
          </button>
          {portraitState.unlocked && !portraitState.obscured && (
            <button
              type="button"
              className="library-hotspot library-hotspot--tarot"
              style={hotspotStyle('136%', '33%')}
              aria-label="进入塔罗圣堂"
              onClick={handleTarotClick}
            >
              <Sparkles aria-hidden="true" />
              <span>塔罗圣堂</span>
            </button>
          )}
          <button
            type="button"
            className="library-hotspot library-hotspot--door"
            style={hotspotStyle('-18%', '78%')}
            aria-label="尝试打开左侧哥特式的门"
            onClick={() => showLibraryCopy([], libraryDoorPhrase)}
          >
            <DoorOpen aria-hidden="true" />
            <span>侧门</span>
          </button>
        </nav>

        <div className="rain-library__controls" aria-label="图书馆设置">
          <button
            type="button"
            className="library-control"
            aria-pressed={focused}
            aria-label={focused ? '退出专注模式' : '进入专注模式'}
            title={focused ? '退出专注模式' : '进入专注模式'}
            onClick={() => {
              setFocused((value: boolean) => !value)
              showLibraryCopy(libraryPhrases)
            }}
          >
            {focused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
          </button>
          <span className="library-control__label">{focused ? '专注中' : '环境开放'}</span>
        </div>

        <p className="rain-library__instruction" aria-live="polite">
          {poemIndex === null ? '点击书页，让一句话在雨中留下。' : '书页还会继续翻动。'}
        </p>

        {libraryNotice !== null && <div className="library-quote" role="status" aria-live="polite">{libraryNotice}</div>}

        {poemIndex !== null && (
          <aside className="library-poem" role="dialog" aria-modal="false" aria-labelledby="library-poem-title">
            <button type="button" className="library-poem__close" onClick={closeBook} aria-label="关闭诗句">
              <X aria-hidden="true" />
            </button>
            <p className="library-poem__eyebrow" id="library-poem-title">从书页中脱落的句子</p>
            <blockquote>{libraryPoems[poemIndex].text}</blockquote>
            <p className="library-poem__source">来自心底 <span>/</span> 《致爱丽丝·利德尔》</p>
          </aside>
        )}
      </div>
      <div className="rain-library__sr-status" aria-live="polite" aria-atomic="true">
        {rainActive ? '雨声已开启' : '雨声已关闭'}
        {'。'}
        {fireActive ? '壁炉已点燃' : '壁炉已熄灭'}
      </div>
    </main>
  )
}
