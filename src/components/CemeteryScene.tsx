import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { BookOpen, Flame, Moon, Sparkles } from 'lucide-react'
import './cemetery.css'

export type CemeterySceneProps = {
  reducedMotion?: boolean
}

type Particle = {
  x: number
  y: number
  speed: number
  length: number
  opacity: number
  drift: number
  phase: number
}

const random = (seed: number) => {
  let value = seed >>> 0
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0
    return value / 4294967296
  }
}

const roundedRect = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) => {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + width, y, x + width, y + height, r)
  ctx.arcTo(x + width, y + height, x, y + height, r)
  ctx.arcTo(x, y + height, x, y, r)
  ctx.arcTo(x, y, x + width, y, r)
  ctx.closePath()
}

const dispatchAnnouncement = (message: string) => {
  window.dispatchEvent(new CustomEvent('gothic:announce', { detail: message }))
}

function drawCemetery(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  image: HTMLImageElement | null,
  particles: Particle[],
  pointer: { x: number; y: number },
  reducedMotion: boolean,
) {
  const t = reducedMotion ? 0 : time / 1000
  const horizon = height * 0.57
  const parallax = (layer: number) => (pointer.x - 0.5) * width * layer

  ctx.clearRect(0, 0, width, height)

  const sky = ctx.createLinearGradient(0, 0, 0, height)
  sky.addColorStop(0, '#090b13')
  sky.addColorStop(0.42, '#1b1019')
  sky.addColorStop(0.72, '#30141c')
  sky.addColorStop(1, '#0b090d')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, width, height)

  if (image && image.complete && image.naturalWidth > 0) {
    const imageRatio = image.naturalWidth / image.naturalHeight
    const viewportRatio = width / height
    let sourceX = 0
    let sourceY = 0
    let sourceWidth = image.naturalWidth
    let sourceHeight = image.naturalHeight
    if (imageRatio > viewportRatio) {
      sourceWidth = image.naturalHeight * viewportRatio
      sourceX = (image.naturalWidth - sourceWidth) / 2
    } else {
      sourceHeight = image.naturalWidth / viewportRatio
      sourceY = (image.naturalHeight - sourceHeight) / 2
    }
    ctx.save()
    ctx.globalAlpha = 0.2
    ctx.globalCompositeOperation = 'screen'
    ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height)
    ctx.restore()
  }

  // A grain-like veil keeps the painted background integrated with the hand-drawn layers.
  ctx.save()
  ctx.globalAlpha = 0.09
  for (let index = 0; index < 260; index += 1) {
    const x = (index * 73.17) % width
    const y = (index * 137.41) % height
    ctx.fillStyle = index % 3 === 0 ? '#d6b99d' : '#3a1e29'
    ctx.fillRect(x, y, 1, 1)
  }
  ctx.restore()

  const moonX = width * 0.73 + parallax(0.012)
  const moonY = height * 0.2 + pointer.y * 8
  const moonRadius = Math.max(42, Math.min(width, height) * 0.105)
  const moonGlow = ctx.createRadialGradient(moonX, moonY, moonRadius * 0.35, moonX, moonY, moonRadius * 2.5)
  moonGlow.addColorStop(0, 'rgba(229, 211, 183, 0.2)')
  moonGlow.addColorStop(1, 'rgba(229, 211, 183, 0)')
  ctx.fillStyle = moonGlow
  ctx.fillRect(moonX - moonRadius * 3, moonY - moonRadius * 3, moonRadius * 6, moonRadius * 6)
  ctx.fillStyle = '#d8c9af'
  ctx.beginPath()
  ctx.arc(moonX, moonY, moonRadius, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(45, 26, 36, 0.23)'
  ctx.beginPath()
  ctx.arc(moonX + moonRadius * 0.28, moonY - moonRadius * 0.18, moonRadius * 0.82, 0, Math.PI * 2)
  ctx.fill()

  // Distant clouds move at a slower parallax rate than the foreground.
  ctx.save()
  ctx.globalAlpha = 0.25
  ctx.fillStyle = '#4a2633'
  for (let index = 0; index < 6; index += 1) {
    const cloudX = ((index * width * 0.27 + parallax(0.03) + t * (4 + index)) % (width + 300)) - 150
    const cloudY = height * (0.19 + (index % 3) * 0.065)
    ctx.beginPath()
    ctx.ellipse(cloudX, cloudY, width * 0.12, height * 0.025, 0, 0, Math.PI * 2)
    ctx.ellipse(cloudX + width * 0.085, cloudY + 3, width * 0.1, height * 0.018, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()

  // Far wall and cypress silhouettes.
  ctx.save()
  ctx.translate(parallax(0.06), 0)
  ctx.fillStyle = '#120d16'
  ctx.beginPath()
  ctx.moveTo(-width, horizon + height * 0.1)
  ctx.lineTo(-width, horizon - 8)
  for (let x = -width; x < width * 2; x += width * 0.07) {
    ctx.lineTo(x + width * 0.035, horizon - 4 - ((x / width) % 2) * 9)
    ctx.lineTo(x + width * 0.07, horizon - 8)
  }
  ctx.lineTo(width * 2, horizon + height * 0.1)
  ctx.closePath()
  ctx.fill()
  for (let index = 0; index < 12; index += 1) {
    const treeX = width * (index / 11) - width * 0.04
    const treeHeight = height * (0.15 + (index % 4) * 0.035)
    ctx.fillStyle = index % 2 ? '#0d0b12' : '#17101a'
    ctx.fillRect(treeX - 2, horizon - treeHeight * 0.2, 4, treeHeight * 0.42)
    ctx.beginPath()
    ctx.moveTo(treeX, horizon - treeHeight)
    ctx.lineTo(treeX - width * 0.035, horizon - treeHeight * 0.18)
    ctx.lineTo(treeX + width * 0.035, horizon - treeHeight * 0.18)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()

  // Central bell tower.
  const towerX = width * 0.48 + parallax(0.12)
  const towerWidth = Math.max(108, width * 0.115)
  const towerBase = horizon + height * 0.16
  ctx.save()
  ctx.translate(towerX, 0)
  ctx.fillStyle = '#17131a'
  ctx.strokeStyle = '#6e5960'
  ctx.lineWidth = Math.max(1, width * 0.0015)
  ctx.beginPath()
  ctx.moveTo(-towerWidth * 0.46, towerBase)
  ctx.lineTo(-towerWidth * 0.39, horizon - height * 0.18)
  ctx.lineTo(-towerWidth * 0.25, horizon - height * 0.26)
  ctx.lineTo(towerWidth * 0.25, horizon - height * 0.26)
  ctx.lineTo(towerWidth * 0.39, horizon - height * 0.18)
  ctx.lineTo(towerWidth * 0.46, towerBase)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#211922'
  ctx.fillRect(-towerWidth * 0.34, horizon - height * 0.2, towerWidth * 0.68, height * 0.42)
  ctx.strokeRect(-towerWidth * 0.34, horizon - height * 0.2, towerWidth * 0.68, height * 0.42)
  ctx.fillStyle = '#08080c'
  ctx.beginPath()
  ctx.arc(0, horizon - height * 0.08, towerWidth * 0.18, Math.PI, 0)
  ctx.lineTo(towerWidth * 0.18, horizon + height * 0.02)
  ctx.lineTo(-towerWidth * 0.18, horizon + height * 0.02)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#af8355'
  ctx.fillRect(-towerWidth * 0.012, horizon - height * 0.25, towerWidth * 0.024, height * 0.06)
  ctx.beginPath()
  ctx.moveTo(0, horizon - height * 0.3)
  ctx.lineTo(-towerWidth * 0.055, horizon - height * 0.24)
  ctx.lineTo(towerWidth * 0.055, horizon - height * 0.24)
  ctx.closePath()
  ctx.fill()
  ctx.restore()

  // Grounds and path.
  const ground = ctx.createLinearGradient(0, horizon, 0, height)
  ground.addColorStop(0, '#1d131a')
  ground.addColorStop(0.4, '#110d13')
  ground.addColorStop(1, '#07080a')
  ctx.fillStyle = ground
  ctx.beginPath()
  ctx.moveTo(0, horizon)
  ctx.lineTo(width, horizon)
  ctx.lineTo(width, height)
  ctx.lineTo(0, height)
  ctx.closePath()
  ctx.fill()
  ctx.save()
  ctx.globalAlpha = 0.35
  ctx.fillStyle = '#33212a'
  ctx.beginPath()
  ctx.moveTo(width * 0.44, horizon)
  ctx.lineTo(width * 0.57, horizon)
  ctx.lineTo(width * 0.83, height)
  ctx.lineTo(width * 0.23, height)
  ctx.closePath()
  ctx.fill()
  ctx.restore()

  // Foreground iron fence.
  ctx.save()
  ctx.translate(parallax(0.32), 0)
  ctx.strokeStyle = 'rgba(7, 7, 10, 0.96)'
  ctx.lineWidth = Math.max(2, width * 0.003)
  const fenceY = height * 0.72
  for (let x = -width * 0.1; x < width * 1.1; x += width * 0.065) {
    ctx.beginPath()
    ctx.moveTo(x, height)
    ctx.lineTo(x, fenceY)
    ctx.lineTo(x + width * 0.0325, fenceY - height * 0.045)
    ctx.lineTo(x + width * 0.065, fenceY)
    ctx.lineTo(x + width * 0.065, height)
    ctx.stroke()
  }
  ctx.beginPath()
  ctx.moveTo(-width * 0.1, fenceY)
  ctx.lineTo(width * 1.1, fenceY)
  ctx.moveTo(-width * 0.1, fenceY + height * 0.085)
  ctx.lineTo(width * 1.1, fenceY + height * 0.085)
  ctx.stroke()
  ctx.restore()

  // Tombstones: the center stone remains legible as the narrative anchor.
  const stones = [
    { x: 0.14, y: 0.74, w: 0.105, h: 0.19, tilt: -0.03, tone: '#3c3037' },
    { x: 0.31, y: 0.79, w: 0.09, h: 0.14, tilt: 0.02, tone: '#2c262d' },
    { x: 0.51, y: 0.78, w: 0.2, h: 0.26, tilt: -0.01, tone: '#53434a' },
    { x: 0.72, y: 0.77, w: 0.11, h: 0.18, tilt: 0.04, tone: '#30272f' },
    { x: 0.88, y: 0.81, w: 0.1, h: 0.14, tilt: -0.02, tone: '#3a2d35' },
  ]
  stones.forEach((stone, index) => {
    const x = width * stone.x + parallax(0.47 + index * 0.01)
    const y = height * stone.y
    const w = width * stone.w
    const h = height * stone.h
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(stone.tilt)
    ctx.fillStyle = stone.tone
    ctx.strokeStyle = index === 2 ? '#b18a59' : '#756269'
    ctx.lineWidth = Math.max(1, width * 0.0018)
    roundedRect(ctx, -w / 2, -h, w, h, w * 0.12)
    ctx.fill()
    ctx.globalAlpha = 0.5
    ctx.stroke()
    ctx.globalAlpha = 1
    ctx.strokeStyle = 'rgba(13, 9, 14, 0.65)'
    ctx.lineWidth = Math.max(1, width * 0.001)
    for (let crack = 0; crack < 3; crack += 1) {
      ctx.beginPath()
      ctx.moveTo(-w * 0.25 + crack * w * 0.2, -h * 0.78)
      ctx.lineTo(-w * 0.14 + crack * w * 0.1, -h * (0.62 - crack * 0.03))
      ctx.lineTo(-w * 0.2 + crack * w * 0.18, -h * 0.5)
      ctx.stroke()
    }
    if (index === 2) {
      ctx.fillStyle = '#d9c4a4'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = `600 ${Math.max(11, width * 0.018)}px "Noto Serif SC", serif`
      ctx.fillText('致爱丽丝·利德尔', 0, -h * 0.57)
      ctx.font = `400 ${Math.max(8, width * 0.009)}px "Cormorant Garamond", serif`
      ctx.fillStyle = '#a88d78'
      ctx.fillText('只 是 睡 着 了', 0, -h * 0.39)
    }
    ctx.restore()
  })

  // Candle lights and firefly-sized ash.
  const candlePoints = [
    { x: width * 0.39 + parallax(0.5), y: height * 0.84, r: Math.max(3, width * 0.004) },
    { x: width * 0.64 + parallax(0.5), y: height * 0.88, r: Math.max(3, width * 0.003) },
  ]
  candlePoints.forEach((point, index) => {
    const flicker = reducedMotion ? 0 : Math.sin(t * (5 + index) + index) * 0.16
    const glow = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, point.r * 12)
    glow.addColorStop(0, `rgba(232, 174, 99, ${0.42 + flicker})`)
    glow.addColorStop(1, 'rgba(232, 174, 99, 0)')
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(point.x, point.y, point.r * 12, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#f6d298'
    ctx.beginPath()
    ctx.ellipse(point.x, point.y, point.r * 0.7, point.r * (1.5 + flicker), 0, 0, Math.PI * 2)
    ctx.fill()
  })

  if (!reducedMotion) {
    ctx.save()
    particles.forEach((particle) => {
      particle.y += particle.speed
      particle.x += Math.sin(t * 0.8 + particle.phase) * particle.drift
      if (particle.y > height + particle.length) {
        particle.y = -particle.length
        particle.x = (particle.x + width * 0.42) % width
      }
      if (particle.x < -10) particle.x = width + 10
      if (particle.x > width + 10) particle.x = -10
      ctx.strokeStyle = `rgba(183, 174, 177, ${particle.opacity})`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(particle.x, particle.y)
      ctx.lineTo(particle.x - particle.drift * 2, particle.y + particle.length)
      ctx.stroke()
    })
    ctx.restore()
  }

  // Low mist is drawn last to soften the distance between the viewer and the grounds.
  ctx.save()
  ctx.globalAlpha = reducedMotion ? 0.15 : 0.12 + Math.sin(t * 0.24) * 0.025
  ctx.fillStyle = '#98838b'
  for (let index = 0; index < 4; index += 1) {
    const mistX = ((index * width * 0.35 + t * (index % 2 ? 4 : -3)) % (width + 300)) - 150
    ctx.beginPath()
    ctx.ellipse(mistX, height * (0.7 + index * 0.06), width * 0.24, height * 0.035, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()

  const vignette = ctx.createRadialGradient(width / 2, height * 0.5, Math.min(width, height) * 0.2, width / 2, height * 0.5, Math.max(width, height) * 0.78)
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)')
  vignette.addColorStop(1, 'rgba(2, 2, 5, 0.68)')
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, width, height)
}

export default function CemeteryScene({ reducedMotion = false }: CemeterySceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const [notice, setNotice] = useState('')
  const noticeTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    const canvas = canvasRef.current
    const stage = stageRef.current
    if (!canvas || !stage) return undefined
    const ctx = canvas.getContext('2d')
    if (!ctx) return undefined

    let width = 1
    let height = 1
    let previousWidth = 1
    let previousHeight = 1
    let frame = 0
    let disposed = false
    let image: HTMLImageElement | null = null
    const pointer = { x: 0.5, y: 0.45 }
    const seededRandom = random(0x1dd1ce)
    const particles: Particle[] = Array.from({ length: 105 }, () => ({
      x: seededRandom(),
      y: seededRandom(),
      speed: 0.35 + seededRandom() * 1.15,
      length: 4 + seededRandom() * 10,
      opacity: 0.08 + seededRandom() * 0.22,
      drift: 0.1 + seededRandom() * 0.55,
      phase: seededRandom() * Math.PI * 2,
    }))

    const draw = (time: number) => {
      if (disposed) return
      drawCemetery(ctx, width, height, time, image, particles, pointer, reducedMotion)
    }

    const resize = () => {
      const rect = stage.getBoundingClientRect()
      width = Math.max(1, rect.width)
      height = Math.max(1, rect.height)
      const scaleX = width / previousWidth
      const scaleY = height / previousHeight
      particles.forEach((particle) => {
        particle.x *= scaleX
        particle.y *= scaleY
      })
      previousWidth = width
      previousHeight = height
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      draw(0)
    }

    const onPointerMove = (event: globalThis.PointerEvent) => {
      const rect = stage.getBoundingClientRect()
      pointer.x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
      pointer.y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))
      stage.style.setProperty('--cemetery-pointer-x', `${(pointer.x - 0.5) * 2}`)
      stage.style.setProperty('--cemetery-pointer-y', `${(pointer.y - 0.5) * 2}`)
    }

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(stage)
    stage.addEventListener('pointermove', onPointerMove)
    image = new Image()
    image.decoding = 'async'
    image.src = '/90年代复古动漫风格.png'
    image.onload = () => draw(0)
    resize()
    if (!reducedMotion) frame = window.requestAnimationFrame(function renderFrame(time) {
      draw(time)
      if (!disposed) frame = window.requestAnimationFrame(renderFrame)
    })

    return () => {
      disposed = true
      window.cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      stage.removeEventListener('pointermove', onPointerMove)
    }
  }, [reducedMotion])

  useEffect(() => () => {
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current)
  }, [])

  const showUnavailable = (label: string) => {
    window.location.hash = '#/unavailable'
    setNotice(`${label} 尚未开放。它仍在墓地深处等待自己的季节。`)
    dispatchAnnouncement(`${label}尚未开放`)
    noticeTimer.current = window.setTimeout(() => setNotice(''), 4200)
  }

  const enterLibrary = () => {
    dispatchAnnouncement('正在进入雨夜图书馆')
    window.location.hash = '#/library'
  }

  const hotspotStyle = (left: string, top: string): CSSProperties => ({ left, top })

  return (
    <main className="cemetery-scene" data-scene="cemetery" aria-labelledby="cemetery-title">
      <div className="cemetery-stage" ref={stageRef}>
        <canvas
          className="cemetery-canvas"
          ref={canvasRef}
          role="img"
          aria-label="利德尔墓地：月亮、钟楼、墓碑与雨雾中的烛火"
        />
        <div className="cemetery-scanlines" aria-hidden="true" />
        <div className="cemetery-header">
          <p className="cemetery-kicker">玫瑰与灰烬 · 数字挽歌馆</p>
          <h1 id="cemetery-title">致爱丽丝·利德尔</h1>
          <p className="cemetery-subtitle">SHADOWS OF NEVER-WERE</p>
        </div>
        <p className="cemetery-epitaph" aria-label="墓碑铭文">
          这里埋着三个爱丽丝。<br />
          <span>只是睡着了。</span>
        </p>

        <nav className="cemetery-hotspots" aria-label="墓地展馆入口">
          <button
            type="button"
            className="cemetery-hotspot cemetery-hotspot--library"
            style={hotspotStyle('68%', '57%')}
            onClick={enterLibrary}
            aria-label="进入雨夜图书馆"
          >
            <BookOpen aria-hidden="true" />
            <span>雨夜图书馆</span>
          </button>
          <button
            type="button"
            className="cemetery-hotspot cemetery-hotspot--rose"
            style={hotspotStyle('27%', '64%')}
            onClick={() => showUnavailable('玫瑰与灰烬')}
            aria-label="玫瑰与灰烬数字挽歌馆，尚未开放"
          >
            <Flame aria-hidden="true" />
            <span>玫瑰与灰烬</span>
          </button>
          <button
            type="button"
            className="cemetery-hotspot cemetery-hotspot--tower"
            style={hotspotStyle('48%', '38%')}
            onClick={() => showUnavailable('钟楼回响')}
            aria-label="钟楼回响数字祷告室，尚未开放"
          >
            <Moon aria-hidden="true" />
            <span>钟楼回响</span>
          </button>
          <button
            type="button"
            className="cemetery-hotspot cemetery-hotspot--orbit"
            style={hotspotStyle('82%', '32%')}
            onClick={() => showUnavailable('哥特式星座盘')}
            aria-label="哥特式星座盘，尚未开放"
          >
            <Sparkles aria-hidden="true" />
            <span>哥特式星座盘</span>
          </button>
        </nav>

        <div className="cemetery-footer" aria-hidden="true">
          <span>夜行者，欢迎来到利德尔墓地</span>
          <span>雨水打湿了墓地的钟声</span>
        </div>

        {notice && (
          <div className="cemetery-notice" role="status" aria-live="polite">
            {notice}
          </div>
        )}
      </div>
    </main>
  )
}
