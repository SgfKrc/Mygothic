import { ArrowLeft } from 'lucide-react'
import { useEffect, useRef, type CSSProperties } from 'react'
import './saint-relic.css'

type SaintRelicSceneProps = {
  reducedMotion?: boolean
}

type Point = [number, number]

const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const polygon = (ctx: CanvasRenderingContext2D, points: Point[]) => {
  ctx.beginPath()
  ctx.moveTo(points[0][0], points[0][1])
  points.slice(1).forEach(([x, y]) => ctx.lineTo(x, y))
  ctx.closePath()
}

const drawPointedArch = (ctx: CanvasRenderingContext2D, x: number, baseY: number, width: number, height: number, stroke: string, lineWidth: number, fill?: string) => {
  const half = width / 2
  const top = baseY - height
  const shoulder = top + height * 0.36
  if (fill) {
    ctx.fillStyle = fill
    polygon(ctx, [[x - half, baseY], [x - half, shoulder], [x - half * 0.72, top + height * 0.1], [x, top], [x + half * 0.72, top + height * 0.1], [x + half, shoulder], [x + half, baseY]])
    ctx.fill()
  }
  ctx.strokeStyle = stroke
  ctx.lineWidth = lineWidth
  ctx.beginPath()
  ctx.moveTo(x - half, baseY)
  ctx.lineTo(x - half, shoulder)
  ctx.quadraticCurveTo(x - half * 0.72, top + height * 0.1, x, top)
  ctx.quadraticCurveTo(x + half * 0.72, top + height * 0.1, x + half, shoulder)
  ctx.lineTo(x + half, baseY)
  ctx.stroke()
}

const drawNiche = (ctx: CanvasRenderingContext2D, side: -1 | 1, depth: number, width: number, height: number, vpX: number, vpY: number) => {
  const edgeX = side < 0 ? width * 0.1 : width * 0.9
  const x = lerp(edgeX, vpX, depth)
  const y = lerp(height * 0.7, vpY + height * 0.05, depth)
  const nicheWidth = lerp(width * 0.19, width * 0.045, depth)
  const nicheHeight = lerp(height * 0.33, height * 0.09, depth)
  const opacity = 0.58 - depth * 0.25
  ctx.save()
  ctx.fillStyle = `rgba(5, 7, 11, ${0.7 - depth * 0.24})`
  drawPointedArch(ctx, x, y, nicheWidth, nicheHeight, `rgba(188, 151, 103, ${opacity})`, Math.max(1, width * 0.0022), '#0a0c12')
  ctx.strokeStyle = `rgba(130, 145, 151, ${0.25 - depth * 0.07})`
  ctx.lineWidth = Math.max(1, width * 0.0015)
  const half = nicheWidth / 2
  const top = y - nicheHeight
  ctx.beginPath()
  ctx.moveTo(x - half * 0.52, y)
  ctx.lineTo(x - half * 0.52, top + nicheHeight * 0.33)
  ctx.lineTo(x, top + nicheHeight * 0.16)
  ctx.lineTo(x + half * 0.52, top + nicheHeight * 0.33)
  ctx.lineTo(x + half * 0.52, y)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x, top + nicheHeight * 0.23)
  ctx.lineTo(x, y - nicheHeight * 0.05)
  ctx.moveTo(x - half * 0.42, top + nicheHeight * 0.5)
  ctx.lineTo(x + half * 0.42, top + nicheHeight * 0.5)
  ctx.stroke()
  ctx.fillStyle = `rgba(213, 177, 117, ${0.5 - depth * 0.18})`
  ctx.fillRect(x - Math.max(1, nicheWidth * 0.025), top + nicheHeight * 0.18, Math.max(2, nicheWidth * 0.05), Math.max(2, nicheHeight * 0.08))
  ctx.restore()
}

const drawPixelRelic = (ctx: CanvasRenderingContext2D, centerX: number, baseY: number, width: number, t: number, reducedMotion: boolean) => {
  const unit = clamp(Math.round(width / 150), 2, 6)
  const gridWidth = 38
  const gridHeight = 53
  const originX = Math.round(centerX - gridWidth * unit / 2)
  const originY = Math.round(baseY - gridHeight * unit)
  const bob = reducedMotion ? 0 : Math.round(Math.sin(t * 1.8) * unit * 0.55)
  const px = (gx: number, gy: number, gw: number, gh: number, color: string) => {
    ctx.fillStyle = color
    ctx.fillRect(originX + gx * unit, originY + gy * unit + bob, Math.max(unit, gw * unit), Math.max(unit, gh * unit))
  }

  ctx.save()
  ctx.imageSmoothingEnabled = false
  ctx.globalCompositeOperation = 'screen'
  const haloPulse = 0.14 + (reducedMotion ? 0 : Math.sin(t * 2.4) * 0.045)
  ctx.fillStyle = `rgba(224, 183, 103, ${haloPulse})`
  ctx.fillRect(originX - unit * 4, originY + unit * 2 + bob, unit * 46, unit * 42)
  ctx.globalCompositeOperation = 'source-over'

  // Pixel halo and reliquary cross.
  px(13, 0, 12, 2, '#b78e58')
  px(9, 2, 20, 2, '#6f583f')
  px(7, 4, 2, 13, '#8d6c47')
  px(29, 4, 2, 13, '#8d6c47')
  px(11, 16, 16, 2, '#b78e58')
  px(17, 2, 4, 28, '#c09a5e')
  px(13, 25, 12, 3, '#84623e')

  // Skull cap, cheekbones and jaw in stepped bone pixels.
  px(14, 6, 10, 2, '#d9c69d')
  px(11, 8, 16, 7, '#a99576')
  px(9, 10, 3, 7, '#726b62')
  px(26, 10, 3, 7, '#6c6560')
  px(12, 15, 14, 3, '#d1bd92')
  px(14, 18, 10, 4, '#8e806d')
  px(16, 20, 6, 3, '#d5c49a')
  px(14, 11, 4, 4, '#10141b')
  px(22, 11, 4, 4, '#10141b')
  px(15, 12, 2, 1, '#e7f1d5')
  px(23, 12, 2, 1, '#e7f1d5')
  px(18, 15, 2, 3, '#1a1a1d')
  px(20, 15, 2, 3, '#1a1a1d')
  px(14, 19, 2, 3, '#d7c399')
  px(17, 19, 2, 3, '#655e58')
  px(20, 19, 2, 3, '#d7c399')
  px(23, 19, 2, 3, '#655e58')

  // Spine and ribs.
  px(18, 23, 4, 22, '#d5c29b')
  for (let rib = 0; rib < 6; rib += 1) {
    const y = 25 + rib * 3
    const span = 7 - Math.floor(rib * 0.65)
    px(18 - span, y, span, 2, rib % 2 ? '#9a896e' : '#c8b48b')
    px(22, y, span, 2, rib % 2 ? '#9a896e' : '#c8b48b')
    px(18 - span, y + 1, 2, 2, '#665b52')
    px(20 + span, y + 1, 2, 2, '#665b52')
  }

  // Shoulder blades, arms and pelvis.
  px(8, 24, 9, 3, '#8f7e68')
  px(21, 24, 9, 3, '#8f7e68')
  px(6, 27, 4, 11, '#c6b38b')
  px(28, 27, 4, 11, '#c6b38b')
  px(4, 36, 5, 3, '#71675d')
  px(30, 36, 5, 3, '#71675d')
  px(12, 44, 14, 4, '#c6b38b')
  px(14, 48, 4, 5, '#9d8c70')
  px(20, 48, 4, 5, '#9d8c70')

  ctx.fillStyle = 'rgba(245, 224, 169, .7)'
  for (const [gx, gy] of [[12, 8], [25, 9], [10, 16], [27, 17], [16, 26], [23, 31], [11, 38], [26, 39]] as const) {
    ctx.fillRect(originX + gx * unit, originY + gy * unit + bob, Math.max(1, Math.ceil(unit * 0.45)), Math.max(1, Math.ceil(unit * 0.45)))
  }
  ctx.restore()
}

const drawRelicCase = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, hue: number, t: number) => {
  ctx.save()
  ctx.shadowColor = 'rgba(0, 0, 0, .82)'
  ctx.shadowBlur = width * .14
  ctx.fillStyle = '#0a0c12'
  ctx.strokeStyle = 'rgba(194, 159, 106, .58)'
  ctx.lineWidth = Math.max(1.2, width * .018)
  ctx.fillRect(x - width / 2, y - height, width, height)
  ctx.strokeRect(x - width / 2, y - height, width, height)
  ctx.shadowBlur = 0
  const glow = ctx.createRadialGradient(x, y - height * .56, 0, x, y - height * .56, width * .7)
  glow.addColorStop(0, `hsla(${hue} 64% 67% / ${.17 + Math.sin(t * 1.7 + hue) * .025})`)
  glow.addColorStop(1, 'rgba(10, 11, 17, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(x - width * .46, y - height * .94, width * .92, height * .88)
  ctx.fillStyle = '#17151d'
  ctx.fillRect(x - width * .39, y - height * .79, width * .78, height * .56)
  ctx.strokeStyle = 'rgba(137, 148, 150, .38)'
  ctx.lineWidth = Math.max(1, width * .009)
  ctx.strokeRect(x - width * .39, y - height * .79, width * .78, height * .56)
  ctx.fillStyle = `hsla(${hue} 58% 65% / .8)`
  ctx.beginPath()
  ctx.arc(x, y - height * .5, width * .14, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(232, 207, 155, .55)'
  ctx.fillRect(x - width * .025, y - height * .72, width * .05, height * .43)
  ctx.fillRect(x - width * .2, y - height * .52, width * .4, Math.max(1, height * .035))
  ctx.fillStyle = '#2a2025'
  ctx.fillRect(x - width * .58, y - height * .06, width * 1.16, height * .08)
  ctx.strokeStyle = 'rgba(215, 177, 116, .42)'
  ctx.strokeRect(x - width * .58, y - height * .06, width * 1.16, height * .08)
  ctx.restore()
}

const drawCandle = (ctx: CanvasRenderingContext2D, x: number, baseY: number, size: number, t: number) => {
  const flicker = 1 + Math.sin(t * 5.4 + x) * .09
  ctx.save()
  ctx.fillStyle = '#3a2a29'
  ctx.fillRect(x - size * .18, baseY - size * .72, size * .36, size * .72)
  ctx.strokeStyle = 'rgba(217, 177, 119, .44)'
  ctx.lineWidth = Math.max(1, size * .035)
  ctx.strokeRect(x - size * .18, baseY - size * .72, size * .36, size * .72)
  ctx.globalCompositeOperation = 'screen'
  const glow = ctx.createRadialGradient(x, baseY - size * .95, 0, x, baseY - size * .95, size * 2.2)
  glow.addColorStop(0, 'rgba(255, 227, 163, .4)')
  glow.addColorStop(1, 'rgba(169, 91, 48, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(x - size * 2.2, baseY - size * 2.8, size * 4.4, size * 4.4)
  ctx.fillStyle = '#ffeab0'
  ctx.beginPath()
  ctx.ellipse(x, baseY - size * .95, size * .12 * flicker, size * .28 * flicker, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

const drawVaultDetails = (ctx: CanvasRenderingContext2D, width: number, height: number, t: number) => {
  const sideScale = Math.max(0.72, Math.min(1.2, width / 1100))
  const shelfY = height * .68
  ctx.save()
  ctx.strokeStyle = 'rgba(185, 149, 99, .46)'
  ctx.lineWidth = Math.max(1, width * .0018)
  for (const side of [-1, 1] as const) {
    const x = side < 0 ? width * .16 : width * .84
    const shelfWidth = width * .18
    for (let shelf = 0; shelf < 3; shelf += 1) {
      const y = shelfY - shelf * height * .12
      ctx.fillStyle = '#17131a'
      ctx.fillRect(x - shelfWidth / 2, y, shelfWidth, height * .025)
      ctx.strokeRect(x - shelfWidth / 2, y, shelfWidth, height * .025)
      for (let item = 0; item < 3; item += 1) {
        const itemX = x - shelfWidth * .36 + item * shelfWidth * .36
        const itemHeight = height * (.045 + ((item + shelf) % 2) * .02)
        ctx.fillStyle = item % 2 ? '#423332' : '#2d2930'
        ctx.fillRect(itemX, y - itemHeight, shelfWidth * .12, itemHeight)
        ctx.strokeStyle = 'rgba(206, 172, 116, .38)'
        ctx.strokeRect(itemX, y - itemHeight, shelfWidth * .12, itemHeight)
      }
    }
    ctx.strokeStyle = 'rgba(130, 144, 147, .35)'
    ctx.lineWidth = Math.max(1, width * .0012)
    ctx.strokeRect(x - shelfWidth * .56, shelfY - height * .29, shelfWidth * 1.12, height * .33)
  }

  drawRelicCase(ctx, width * .16, height * .67, width * .12 * sideScale, height * .22 * sideScale, 344, t)
  drawRelicCase(ctx, width * .84, height * .67, width * .12 * sideScale, height * .22 * sideScale, 44, t)
  drawCandle(ctx, width * .28, height * .74, width * .025, t)
  drawCandle(ctx, width * .72, height * .74, width * .025, t + 1.4)

  // Suspended chains and a seal on the floor reinforce the vault's ritual function.
  ctx.strokeStyle = 'rgba(178, 153, 119, .4)'
  ctx.lineWidth = Math.max(1, width * .0013)
  for (const chainX of [width * .39, width * .61]) {
    ctx.beginPath()
    ctx.moveTo(chainX, height * .1)
    ctx.lineTo(chainX, height * .3)
    ctx.stroke()
    for (let link = 0; link < 7; link += 1) {
      ctx.beginPath()
      ctx.ellipse(chainX, height * (.12 + link * .026), width * .008, height * .012, link % 2 ? .35 : -.35, 0, Math.PI * 2)
      ctx.stroke()
    }
  }
  const sealY = height * .9
  ctx.strokeStyle = 'rgba(183, 137, 91, .38)'
  ctx.lineWidth = Math.max(1, width * .0016)
  ctx.beginPath()
  ctx.arc(width * .5, sealY, width * .105, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(width * .5, sealY, width * .075, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(width * .5, sealY - width * .07)
  ctx.lineTo(width * .5, sealY + width * .07)
  ctx.moveTo(width * .43, sealY)
  ctx.lineTo(width * .57, sealY)
  ctx.stroke()
  ctx.restore()
}

const drawSaintRelicRoom = (ctx: CanvasRenderingContext2D, width: number, height: number, time: number, reducedMotion: boolean) => {
  const t = reducedMotion ? 0 : time / 1000
  const vpX = width * 0.5
  const vpY = height * 0.39
  const floorY = height * 0.73
  ctx.clearRect(0, 0, width, height)
  ctx.imageSmoothingEnabled = false

  const room = ctx.createLinearGradient(0, 0, width, height)
  room.addColorStop(0, '#070a11')
  room.addColorStop(.48, '#17141a')
  room.addColorStop(1, '#08090e')
  ctx.fillStyle = room
  ctx.fillRect(0, 0, width, height)

  // Two walls and a ceiling plane converge at the shrine's vanishing point.
  ctx.fillStyle = '#13151d'
  polygon(ctx, [[0, height * .08], [width * .36, height * .09], [vpX, vpY], [vpX, floorY], [0, height]])
  ctx.fill()
  ctx.fillStyle = '#10131a'
  polygon(ctx, [[width, height * .08], [width * .64, height * .09], [vpX, vpY], [vpX, floorY], [width, height]])
  ctx.fill()
  ctx.fillStyle = '#0d1017'
  polygon(ctx, [[0, height * .08], [width, height * .08], [width * .64, height * .09], [vpX, vpY], [width * .36, height * .09]])
  ctx.fill()
  ctx.fillStyle = '#090b10'
  polygon(ctx, [[0, floorY], [vpX, vpY], [width, floorY], [width, height], [0, height]])
  ctx.fill()

  // Masonry courses bend toward the center instead of reading as a flat backdrop.
  ctx.strokeStyle = 'rgba(126, 139, 147, .2)'
  ctx.lineWidth = Math.max(1, width * .0012)
  for (let course = 0; course < 11; course += 1) {
    const y = lerp(height * .12, floorY, course / 10)
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(vpX, lerp(height * .12, vpY, course / 10))
    ctx.lineTo(width, y)
    ctx.stroke()
  }
  for (const x of [0.08, 0.2, 0.32, 0.68, 0.8, 0.92]) {
    ctx.beginPath()
    ctx.moveTo(width * x, height * .08)
    ctx.lineTo(vpX, vpY)
    ctx.lineTo(width * (x < .5 ? x * .72 : 1 - (1 - x) * .72), height)
    ctx.stroke()
  }

  // Deep rows of pointed niches make both side walls legible at a glance.
  for (const side of [-1, 1] as const) {
    for (let row = 0; row < 4; row += 1) {
      for (let column = 0; column < 2; column += 1) {
        drawNiche(ctx, side, 0.12 + row * .18 + column * .035, width, height, vpX, vpY)
      }
    }
    ctx.strokeStyle = 'rgba(208, 172, 112, .34)'
    ctx.lineWidth = Math.max(2, width * .003)
    ctx.beginPath()
    ctx.moveTo(side < 0 ? width * .06 : width * .94, height * .08)
    ctx.lineTo(vpX, vpY)
    ctx.lineTo(side < 0 ? width * .04 : width * .96, height * .88)
    ctx.stroke()
  }

  // Ceiling ribs and a stepped back-wall altar emphasize the depth axis.
  ctx.strokeStyle = 'rgba(191, 157, 103, .3)'
  ctx.lineWidth = Math.max(1, width * .002)
  for (let rib = 0; rib < 7; rib += 1) {
    const x = width * (rib / 6)
    ctx.beginPath()
    ctx.moveTo(x, height * .08)
    ctx.lineTo(vpX, vpY)
    ctx.stroke()
  }
  ctx.fillStyle = '#0a0d13'
  polygon(ctx, [[width * .35, floorY], [width * .39, height * .18], [width * .5, height * .12], [width * .61, height * .18], [width * .65, floorY]])
  ctx.fill()
  drawPointedArch(ctx, vpX, floorY, width * .28, height * .5, 'rgba(198, 163, 104, .65)', Math.max(2, width * .003), 'rgba(4, 5, 9, .94)')
  drawPointedArch(ctx, vpX, floorY - height * .005, width * .22, height * .42, 'rgba(128, 139, 147, .38)', Math.max(1, width * .0018))
  ctx.fillStyle = `rgba(182, 101, 116, ${0.08 + Math.sin(t * 2.2) * .025})`
  ctx.fillRect(vpX - width * .08, height * .27, width * .16, height * .4)

  // Perspective floor strips lead toward the reliquary.
  ctx.strokeStyle = 'rgba(169, 139, 99, .28)'
  ctx.lineWidth = Math.max(1, width * .0015)
  for (let strip = 0; strip < 9; strip += 1) {
    const bottomX = width * (strip / 8)
    ctx.beginPath()
    ctx.moveTo(vpX, floorY)
    ctx.lineTo(bottomX, height)
    ctx.stroke()
  }
  for (let row = 1; row < 7; row += 1) {
    const amount = row / 7
    const y = lerp(floorY, height, amount * amount)
    const spread = (y - floorY) / (height - floorY)
    ctx.beginPath()
    ctx.moveTo(lerp(vpX, 0, spread), y)
    ctx.lineTo(lerp(vpX, width, spread), y)
    ctx.stroke()
  }

  const pedestalY = height * .88
  ctx.fillStyle = '#15131a'
  polygon(ctx, [[width * .27, pedestalY], [width * .73, pedestalY], [width * .67, height * .73], [width * .33, height * .73]])
  ctx.fill()
  ctx.strokeStyle = 'rgba(204, 166, 103, .58)'
  ctx.lineWidth = Math.max(2, width * .0026)
  ctx.stroke()
  ctx.fillStyle = '#25202a'
  polygon(ctx, [[width * .2, height * .96], [width * .8, height * .96], [width * .73, pedestalY], [width * .27, pedestalY]])
  ctx.fill()
  ctx.strokeStyle = 'rgba(132, 145, 148, .46)'
  ctx.stroke()
  ctx.fillStyle = `rgba(216, 172, 99, ${0.12 + Math.sin(t * 2.1) * .03})`
  ctx.fillRect(width * .34, height * .77, width * .32, height * .18)
  drawVaultDetails(ctx, width, height, t)
  drawRelicCase(ctx, vpX, height * .86, width * .25, height * .36, 316, t)
  drawPixelRelic(ctx, vpX, height * .84, width, t, reducedMotion)

  // Slow dust motes provide scale without flattening the architecture.
  ctx.fillStyle = 'rgba(230, 202, 146, .5)'
  for (let mote = 0; mote < 22; mote += 1) {
    const seed = mote * 17.17
    const x = (Math.sin(seed) * .5 + .5) * width
    const y = ((mote * .147 + t * (.008 + (mote % 3) * .004)) % .86 + .08) * height
    const size = Math.max(1, width * (.001 + (mote % 3) * .0008))
    ctx.fillRect(Math.round(x), Math.round(y), size, size)
  }
}

export default function SaintRelicScene({ reducedMotion = false }: SaintRelicSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const stage = stageRef.current
    if (!canvas || !stage) return undefined
    const ctx = canvas.getContext('2d')
    if (!ctx) return undefined
    let width = 1
    let height = 1
    let frame = 0
    let disposed = false

    const resize = () => {
      const rect = stage.getBoundingClientRect()
      width = Math.max(1, rect.width)
      height = Math.max(1, rect.height)
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      drawSaintRelicRoom(ctx, width, height, 0, reducedMotion)
    }
    const render = (time: number) => {
      if (disposed) return
      drawSaintRelicRoom(ctx, width, height, time, reducedMotion)
      if (!reducedMotion) frame = window.requestAnimationFrame(render)
    }
    const observer = new ResizeObserver(resize)
    observer.observe(stage)
    resize()
    if (!reducedMotion) frame = window.requestAnimationFrame(render)
    return () => {
      disposed = true
      window.cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [reducedMotion])

  const backStyle: CSSProperties = { left: '50%', bottom: '6%' }
  return (
    <main className="saint-relic-scene" data-scene="saint-relic" aria-labelledby="saint-relic-title">
      <div className="saint-relic-stage" ref={stageRef}>
        <canvas ref={canvasRef} className="saint-relic-canvas" role="img" aria-label="具有透视墙壁和中央像素圣徒遗骨像的圣遗物室" />
        <header className="saint-relic-header">
          <p className="saint-relic-kicker">第三展馆 <span>/</span> 遗骨室</p>
          <h1 id="saint-relic-title">圣遗物室</h1>
          <p className="saint-relic-subtitle">THE RELIC VAULT</p>
        </header>
        <button type="button" className="saint-relic-back" style={backStyle} onClick={() => { window.location.hash = '#/clocktower' }}>
          <ArrowLeft aria-hidden="true" />
          <span>返回钟楼</span>
        </button>
      </div>
    </main>
  )
}
