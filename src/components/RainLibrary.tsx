import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { BookOpen, CloudRain, Flame, Pause, Play, X } from 'lucide-react'
import { libraryPoems } from '../data/libraryPoems'
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

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const seededRandom = (seed: number) => {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
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

const drawFlame = (ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, t: number, active: boolean) => {
  if (!active) return
  const flicker = Math.sin(t * 7.2) * 0.08 + Math.sin(t * 11.3 + 1.5) * 0.045
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(1 + flicker, 1 - flicker * 0.5)
  const glow = ctx.createRadialGradient(0, -scale * 0.8, 0, 0, -scale * 0.8, scale * 4.2)
  glow.addColorStop(0, 'rgba(227, 153, 76, .38)')
  glow.addColorStop(0.45, 'rgba(165, 60, 43, .18)')
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

function drawLibrary(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  rain: RainDrop[],
  embers: Ember[],
  rainActive: boolean,
  fireActive: boolean,
  reducedMotion: boolean,
) {
  const t = reducedMotion ? 0 : time / 1000
  ctx.clearRect(0, 0, width, height)

  const wall = ctx.createLinearGradient(0, 0, width, height)
  wall.addColorStop(0, '#080b12')
  wall.addColorStop(0.44, '#17121a')
  wall.addColorStop(0.72, '#28151a')
  wall.addColorStop(1, '#0b090c')
  ctx.fillStyle = wall
  ctx.fillRect(0, 0, width, height)

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
  const hearthWash = ctx.createRadialGradient(width * 0.18, height * 0.7, 0, width * 0.18, height * 0.7, width * 0.43)
  hearthWash.addColorStop(0, fireActive ? 'rgba(183, 84, 42, .2)' : 'rgba(183, 84, 42, .06)')
  hearthWash.addColorStop(1, 'rgba(183, 84, 42, 0)')
  ctx.fillStyle = hearthWash
  ctx.fillRect(0, height * 0.3, width * 0.7, height * 0.7)

  // Tall leaded window, with a cool silver reflection behind the rain.
  const wx = width * 0.065
  const wy = height * 0.115
  const ww = width * 0.34
  const wh = height * 0.47
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
  ctx.strokeStyle = '#574a50'
  ctx.lineWidth = Math.max(4, width * 0.007)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(203, 187, 170, .42)'
  ctx.lineWidth = Math.max(1, width * 0.002)
  ctx.strokeRect(wx + ww * 0.07, wy + wh * 0.055, ww * 0.86, wh * 0.89)
  ctx.beginPath()
  ctx.moveTo(wx + ww * 0.5, wy + wh * 0.055)
  ctx.lineTo(wx + ww * 0.5, wy + wh * 0.945)
  ctx.moveTo(wx + ww * 0.07, wy + wh * 0.51)
  ctx.lineTo(wx + ww * 0.93, wy + wh * 0.51)
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

  // Iron shelf wall, with book spines, labels and bevel highlights.
  const sx = width * 0.53
  const sy = height * 0.1
  const sw = width * 0.42
  const sh = height * 0.61
  ctx.save()
  ctx.fillStyle = '#120d12'
  ctx.shadowColor = 'rgba(0, 0, 0, .7)'
  ctx.shadowBlur = 22
  drawRoundedRect(ctx, sx, sy, sw, sh, 2)
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.fillStyle = '#302027'
  ctx.fillRect(sx + sw * 0.015, sy + sh * 0.035, sw * 0.03, sh * 0.93)
  ctx.fillRect(sx + sw * 0.955, sy + sh * 0.035, sw * 0.03, sh * 0.93)
  const shelfYs = [sy + sh * 0.31, sy + sh * 0.61, sy + sh * 0.9]
  shelfYs.forEach((y, shelfIndex) => {
    ctx.fillStyle = '#3b2725'
    ctx.fillRect(sx, y, sw, Math.max(7, height * 0.012))
    ctx.fillStyle = 'rgba(202, 152, 110, .36)'
    ctx.fillRect(sx + sw * 0.02, y, sw * 0.96, Math.max(1, height * 0.002))
    ctx.fillStyle = 'rgba(0, 0, 0, .55)'
    ctx.fillRect(sx + sw * 0.02, y + Math.max(7, height * 0.012), sw * 0.96, Math.max(3, height * 0.006))
    const count = shelfIndex === 1 ? 10 : 9
    for (let book = 0; book < count; book += 1) {
      const random = ((book * 37 + shelfIndex * 71) % 100) / 100
      const bw = sw * (0.033 + random * 0.032)
      const bh = sh * (0.16 + ((book * 17 + shelfIndex * 9) % 27) / 100)
      const bx = sx + sw * (0.05 + book * (0.89 / count)) + (book % 3) * sw * 0.004
      const by = y - height * 0.011
      drawBook(ctx, bx + bw / 2, by, bw, Math.min(bh, sh * 0.27), 330 + ((book * 19 + shelfIndex * 13) % 52), (book % 4 - 1.5) * 0.012)
    }
  })
  ctx.restore()

  // A small brass wall clock gives the room a quiet focal point.
  const clockX = width * 0.46
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
  ctx.beginPath()
  ctx.moveTo(clockX, clockY)
  ctx.lineTo(clockX, clockY - clockR * 0.58)
  ctx.moveTo(clockX, clockY)
  ctx.lineTo(clockX + clockR * 0.43, clockY + clockR * 0.18)
  ctx.stroke()
  ctx.fillStyle = '#c6a777'
  ctx.beginPath()
  ctx.arc(clockX, clockY, Math.max(1.8, width * 0.002), 0, Math.PI * 2)
  ctx.fill()

  // Stone fireplace and grate.
  const fx = width * 0.065
  const fy = height * 0.54
  const fw = width * 0.3
  const fh = height * 0.35
  ctx.save()
  const stone = ctx.createLinearGradient(fx, fy, fx + fw, fy + fh)
  stone.addColorStop(0, '#4a3437')
  stone.addColorStop(0.52, '#2f252d')
  stone.addColorStop(1, '#18131a')
  ctx.fillStyle = stone
  drawRoundedRect(ctx, fx, fy, fw, fh, 5)
  ctx.fill()
  ctx.strokeStyle = '#755b59'
  ctx.lineWidth = Math.max(2, width * 0.003)
  ctx.stroke()
  ctx.fillStyle = '#111015'
  ctx.beginPath()
  ctx.moveTo(fx + fw * 0.12, fy + fh)
  ctx.lineTo(fx + fw * 0.18, fy + fh * 0.4)
  ctx.quadraticCurveTo(fx + fw * 0.5, fy + fh * 0.05, fx + fw * 0.82, fy + fh * 0.4)
  ctx.lineTo(fx + fw * 0.88, fy + fh)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(169, 130, 102, .32)'
  ctx.lineWidth = Math.max(1, width * 0.0015)
  for (let i = 0; i < 9; i += 1) {
    const bx = fx + fw * (0.08 + (i % 4) * 0.27)
    const by = fy + fh * (0.14 + Math.floor(i / 4) * 0.12)
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
  drawFlame(ctx, fx + fw * 0.5, fy + fh * 0.82, Math.max(13, fw * 0.11), t, fireActive)
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
  const dx = width * 0.34
  const dy = height * 0.67
  const dw = width * 0.55
  const dh = height * 0.2
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
  ctx.fillStyle = '#171117'
  ctx.fillRect(dx + dw * 0.06, dy + height * 0.09, width * 0.025, height * 0.22)
  ctx.fillRect(dx + dw * 0.87, dy + height * 0.08, width * 0.025, height * 0.23)
  ctx.fillStyle = 'rgba(181, 127, 77, .46)'
  ctx.beginPath()
  ctx.arc(dx + dw * 0.22, dy - height * 0.015, width * 0.012, 0, Math.PI * 2)
  ctx.fill()
  // desk book (DOM hotspot is aligned with this rectangle)
  drawBook(ctx, dx + dw * 0.6, dy - height * 0.02, dw * 0.3, height * 0.105, 346, -0.045)
  ctx.fillStyle = '#b28a5c'
  ctx.fillRect(dx + dw * 0.72, dy - height * 0.106, width * 0.006, height * 0.07)
  ctx.restore()

  // Foreground rug and ink-dark vignette.
  ctx.save()
  ctx.globalAlpha = 0.48
  ctx.fillStyle = '#321d23'
  ctx.beginPath()
  ctx.ellipse(width * 0.58, height * 0.96, width * 0.42, height * 0.12, -0.03, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#684044'
  ctx.lineWidth = Math.max(1, width * 0.0012)
  ctx.stroke()
  ctx.restore()

  const vignette = ctx.createRadialGradient(width * 0.48, height * 0.52, Math.min(width, height) * 0.18, width * 0.48, height * 0.52, Math.max(width, height) * 0.78)
  vignette.addColorStop(0, 'rgba(1, 2, 5, 0)')
  vignette.addColorStop(1, 'rgba(1, 1, 4, .7)')
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
  className = '',
}: RainLibraryProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const [localRain, setLocalRain] = useState(rainEnabled ?? true)
  const [localFire, setLocalFire] = useState(fireEnabled ?? true)
  const [poemIndex, setPoemIndex] = useState<number | null>(null)
  const [focused, setFocused] = useState(false)
  const frameRef = useRef<number | null>(null)

  const rainActive = rainEnabled ?? localRain
  const fireActive = fireEnabled ?? localFire

  useEffect(() => {
    if (rainEnabled !== undefined) setLocalRain(rainEnabled)
  }, [rainEnabled])

  useEffect(() => {
    if (fireEnabled !== undefined) setLocalFire(fireEnabled)
  }, [fireEnabled])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (poemIndex !== null) {
        setPoemIndex(null)
      } else if (focused) {
        setFocused(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [focused, poemIndex])

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
      drawLibrary(ctx, width, height, 0, rain, embers, rainActive, fireActive, reducedMotion)
    }

    const render = (time: number) => {
      if (disposed) return
      drawLibrary(ctx, width, height, time, rain, embers, rainActive, fireActive, reducedMotion)
      if (!reducedMotion) frameRef.current = window.requestAnimationFrame(render)
    }

    const observer = new ResizeObserver(resize)
    observer.observe(stage)
    resize()
    if (!reducedMotion) frameRef.current = window.requestAnimationFrame(render)

    return () => {
      disposed = true
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current)
      frameRef.current = null
      observer.disconnect()
    }
  }, [rainActive, fireActive, reducedMotion])

  const toggleRain = useCallback(() => {
    const next = !rainActive
    setLocalRain(next)
    onRainToggle?.(next)
    if (effectsEnabled) onAmbientCue?.('rain')
    announce(next ? '雨声已开启' : '雨声已静默')
  }, [effectsEnabled, onAmbientCue, onRainToggle, rainActive])

  const toggleFire = useCallback(() => {
    const next = !fireActive
    setLocalFire(next)
    onFireToggle?.(next)
    if (effectsEnabled) onAmbientCue?.('fire')
    announce(next ? '炉火已点燃' : '炉火已熄灭')
  }, [effectsEnabled, fireActive, onAmbientCue, onFireToggle])

  const openBook = useCallback(() => {
    const next = poemIndex === null ? 0 : (poemIndex + 1) % libraryPoems.length
    setPoemIndex(next)
    onBookOpen?.(libraryPoems[next].text, next)
    if (effectsEnabled) onAmbientCue?.('book')
    announce('书页已翻开')
  }, [effectsEnabled, onAmbientCue, onBookOpen, poemIndex])

  const closeBook = () => setPoemIndex(null)

  const hotspotStyle = (left: string, top: string): CSSProperties => ({ left, top })

  return (
    <main className={`rain-library ${focused ? 'rain-library--focused' : ''} ${className}`.trim()} data-scene="library" aria-labelledby="rain-library-title">
      <div className="rain-library__stage" ref={stageRef}>
        <canvas
          ref={canvasRef}
          className="rain-library__canvas"
          role="img"
          aria-label="雨夜图书馆：窗外雨幕、壁炉与满是书籍的书架"
        />
        <div className="rain-library__grain" aria-hidden="true" />
        <header className="rain-library__header">
          <p className="rain-library__kicker">第一展馆 <span>/</span> 环境音交互</p>
          <h1 id="rain-library-title">雨夜图书馆</h1>
          <p className="rain-library__subtitle">THE LIBRARY AFTER THE LAST RAIN</p>
        </header>

        <p className="rain-library__caption">雨水打湿了墓地的钟声。</p>

        <nav className="rain-library__hotspots" aria-label="图书馆交互热点">
          <button
            type="button"
            className={`library-hotspot library-hotspot--window ${rainActive ? 'is-active' : ''}`}
            style={hotspotStyle('23%', '34%')}
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
            style={hotspotStyle('19%', '72%')}
            aria-pressed={fireActive}
            aria-label={fireActive ? '熄灭壁炉' : '点燃壁炉'}
            onClick={toggleFire}
          >
            <Flame aria-hidden="true" />
            <span>{fireActive ? '壁炉燃着' : '壁炉熄灭'}</span>
          </button>
          <button
            type="button"
            className="library-hotspot library-hotspot--book"
            style={hotspotStyle('67%', '64%')}
            aria-label={poemIndex === null ? '翻开桌面上的孤本' : '再翻一页'}
            onClick={openBook}
          >
            <BookOpen aria-hidden="true" />
            <span>{poemIndex === null ? '翻开孤本' : '再翻一页'}</span>
          </button>
        </nav>

        <div className="rain-library__controls" aria-label="图书馆设置">
          <button
            type="button"
            className="library-control"
            aria-pressed={focused}
            aria-label={focused ? '退出专注模式' : '进入专注模式'}
            title={focused ? '退出专注模式' : '进入专注模式'}
            onClick={() => setFocused((value: boolean) => !value)}
          >
            {focused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
          </button>
          <span className="library-control__label">{focused ? '专注中' : '环境开放'}</span>
        </div>

        <p className="rain-library__instruction" aria-live="polite">
          {poemIndex === null ? '点击书页，让一句话在雨中留下。' : '书页还会继续翻动。'}
        </p>

        {poemIndex !== null && (
          <aside className="library-poem" role="dialog" aria-modal="false" aria-labelledby="library-poem-title">
            <button type="button" className="library-poem__close" onClick={closeBook} aria-label="关闭诗句">
              <X aria-hidden="true" />
            </button>
            <p className="library-poem__eyebrow" id="library-poem-title">从书页中脱落的句子</p>
            <blockquote>{libraryPoems[poemIndex].text}</blockquote>
            <p className="library-poem__source">作者原创 <span>/</span> 《致爱丽丝·利德尔》</p>
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
