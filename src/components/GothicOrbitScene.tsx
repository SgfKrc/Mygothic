import { Crosshair, Dices, Link2, RotateCcw, RotateCw, Sparkles, Zap } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import './gothic-orbit.css'

type GothicOrbitSceneProps = { reducedMotion?: boolean }

type OrbitTone = 'negative' | 'still' | 'positive'

type OrbitStar = {
  id: string
  name: string
  glyph: string
  tone: OrbitTone
  intensity: number
  angle: number
  radius: number
  sample: string
  reading: string
}

const ZODIAC_NAMES = ['白羊宫', '金牛宫', '双子宫', '巨蟹宫', '狮子宫', '处女宫', '天秤宫', '天蝎宫', '射手宫', '摩羯宫', '水瓶宫', '双鱼宫'] as const

const ORBIT_STARS: readonly OrbitStar[] = [
  { id: 'ash-bell', name: '灰钟', glyph: '☽', tone: 'negative', intensity: .9, angle: -.08, radius: .48, sample: '钟声沉入灰烬，仍有回音在地下行走。', reading: '失落并未消失，只是换成了更慢的脉搏。' },
  { id: 'red-veil', name: '赤帷', glyph: '✦', tone: 'negative', intensity: .72, angle: .5, radius: .73, sample: '帷幕之后的火光尚未熄灭，风却先一步离席。', reading: '欲望与告别交叠，热度正在褪成暗红。' },
  { id: 'mourning-crown', name: '悼冠', glyph: '♄', tone: 'negative', intensity: .62, angle: 1.02, radius: .54, sample: '一顶没有头颅的冠冕，在黑夜里保持端正。', reading: '秩序仍在，承载它的名字已经空缺。' },
  { id: 'quiet-rose', name: '静玫', glyph: '❈', tone: 'still', intensity: .44, angle: 1.6, radius: .76, sample: '花瓣停在坠落之前，露水替它保管最后的颜色。', reading: '平静不是终点，而是正在发生的暂停。' },
  { id: 'silver-key', name: '银钥', glyph: '◇', tone: 'still', intensity: .56, angle: 2.05, radius: .5, sample: '钥匙悬在锁孔前，没有门愿意承认自己存在。', reading: '未知保持着入口的形状，等待一次凝视。' },
  { id: 'veiled-eye', name: '帷眼', glyph: '◉', tone: 'still', intensity: .36, angle: 2.58, radius: .82, sample: '一只眼睛沉默地合拢，梦境因此没有泄露。', reading: '克制让黑暗保持完整，也让秘密继续呼吸。' },
  { id: 'golden-thorn', name: '金棘', glyph: '✢', tone: 'positive', intensity: .76, angle: 3.05, radius: .57, sample: '金色荆棘从石缝升起，刺穿了昨夜的霜。', reading: '微弱的希望依然锋利，足以划开一线天光。' },
  { id: 'saint-lantern', name: '圣灯', glyph: '✧', tone: 'positive', intensity: .92, angle: 3.58, radius: .74, sample: '无人持灯，光却沿着阶梯一盏一盏亮起。', reading: '被遗忘的方向正在重新获得名字。' },
  { id: 'green-orison', name: '绿祷', glyph: '♆', tone: 'positive', intensity: .48, angle: 4.1, radius: .51, sample: '苔痕覆盖祷文，新的根系替它完成朗诵。', reading: '复苏不需要许可，它从裂缝里自行开始。' },
  { id: 'blue-witness', name: '蓝证', glyph: '✥', tone: 'positive', intensity: .64, angle: 4.66, radius: .8, sample: '蓝色星尘落在空椅上，像一位迟到的见证者。', reading: '记忆仍能抵达，即使无人再开口。' },
  { id: 'black-mass', name: '黑弥撒', glyph: '✣', tone: 'negative', intensity: .82, angle: 5.18, radius: .59, sample: '黑色的合唱没有歌词，低音却使石墙微微发热。', reading: '恐惧拥有重量，正因此也能够被搬动。' },
  { id: 'dawn-ash', name: '晓灰', glyph: '⊙', tone: 'still', intensity: .5, angle: 5.72, radius: .72, sample: '黎明还没有抵达，灰尘先替它试探窗沿。', reading: '变化尚未发生，但它已经留下了轮廓。' },
]

const CONNECTIONS: readonly [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10], [10, 11], [11, 0],
  [0, 4], [2, 6], [4, 8], [6, 10], [8, 0], [1, 7], [3, 9], [5, 11],
]

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const hashString = (value: string) => {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

const seededRandom = (seed: number) => {
  let state = (seed >>> 0) || 0x6d2b79f5
  return () => {
    state = Math.imul(state ^ (state >>> 16), 2246822507)
    state = Math.imul(state ^ (state >>> 13), 3266489909)
    return ((state ^ (state >>> 16)) >>> 0) / 4294967296
  }
}

const toneLabel: Record<OrbitTone, string> = {
  negative: '暗潮',
  still: '静默',
  positive: '微光',
}

const toneColor = (tone: OrbitTone) => tone === 'negative' ? '#a34d57' : tone === 'positive' ? '#d5ae67' : '#b7c3c1'

const getLayout = (seed: number) => {
  const random = seededRandom(seed)
  return ORBIT_STARS.map((star, index) => ({
    ...star,
    zodiac: ZODIAC_NAMES[index],
    index,
    angle: star.angle + (random() - .5) * .13,
    radius: clamp(star.radius + (random() - .5) * .1, .42, .87),
    phase: random() * Math.PI * 2,
  }))
}

type OrbitMetrics = { centerX: number; centerY: number; radius: number }

const getMetrics = (width: number, height: number): OrbitMetrics => {
  const mobile = width < 720
  const radius = Math.min(width * (mobile ? .42 : .31), height * (mobile ? .35 : .36))
  return { centerX: mobile ? width * .5 : width * .43, centerY: height * (mobile ? .49 : .54), radius }
}

const drawGothicRosette = (ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string, alpha: number) => {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.strokeStyle = color
  ctx.lineWidth = Math.max(1, radius * .012)
  for (let petal = 0; petal < 8; petal += 1) {
    const angle = petal * Math.PI / 4
    ctx.beginPath()
    ctx.ellipse(x + Math.cos(angle) * radius * .4, y + Math.sin(angle) * radius * .4, radius * .23, radius * .5, angle, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.beginPath()
  ctx.arc(x, y, radius * .17, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

const drawStarEffect = (ctx: CanvasRenderingContext2D, index: number, x: number, y: number, radius: number, time: number, reducedMotion: boolean, color: string) => {
  const phase = reducedMotion ? 0 : time * .001
  const pulse = reducedMotion ? 1 : .82 + Math.sin(phase * 1.7 + index) * .18
  ctx.save()
  ctx.translate(x, y)
  ctx.globalAlpha = .5 * pulse
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = Math.max(1, radius * .12)
  if (index === 0) {
    // Ash bell: three sound ripples.
    for (let ring = 1; ring <= 3; ring += 1) {
      ctx.beginPath()
      ctx.arc(0, 0, radius * (1.8 + ring * .65) + Math.sin(phase + ring) * radius * .16, Math.PI * 1.08, Math.PI * 1.92)
      ctx.stroke()
    }
  } else if (index === 1) {
    // Red veil: two curtain folds drifting around the star.
    for (const side of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(side * radius * 1.1, -radius * 2.8)
      ctx.bezierCurveTo(side * radius * (2.2 + Math.sin(phase) * .3), -radius, side * radius * (1.2 - Math.sin(phase) * .2), radius, side * radius * 2.1, radius * 2.7)
      ctx.stroke()
    }
  } else if (index === 2) {
    // Mourning crown: a five-point crown that rocks in place.
    ctx.rotate(Math.sin(phase * .8) * .15)
    ctx.beginPath()
    ctx.moveTo(-radius * 2.2, radius * 1.2)
    ctx.lineTo(-radius * 1.5, -radius * 1.2)
    ctx.lineTo(-radius * .65, radius * .1)
    ctx.lineTo(0, -radius * 1.9)
    ctx.lineTo(radius * .65, radius * .1)
    ctx.lineTo(radius * 1.5, -radius * 1.2)
    ctx.lineTo(radius * 2.2, radius * 1.2)
    ctx.closePath()
    ctx.stroke()
  } else if (index === 3) {
    // Quiet rose: a small eight-petal opening.
    ctx.rotate(phase * .12)
    for (let petal = 0; petal < 8; petal += 1) {
      const angle = petal * Math.PI / 4
      ctx.beginPath()
      ctx.ellipse(Math.cos(angle) * radius * 1.5, Math.sin(angle) * radius * 1.5, radius * .45, radius * 1.15, angle, 0, Math.PI * 2)
      ctx.stroke()
    }
  } else if (index === 4) {
    // Silver key: a ring with teeth that rotates independently.
    ctx.rotate(phase * .5)
    ctx.beginPath()
    ctx.arc(-radius * 1.1, 0, radius * .95, 0, Math.PI * 2)
    ctx.moveTo(-radius * .15, 0)
    ctx.lineTo(radius * 2.25, 0)
    ctx.moveTo(radius * 1.5, 0)
    ctx.lineTo(radius * 1.5, -radius * .65)
    ctx.moveTo(radius * 1.95, 0)
    ctx.lineTo(radius * 1.95, radius * .62)
    ctx.stroke()
  } else if (index === 5) {
    // Veiled eye: lids breathe open and closed.
    const aperture = radius * (1.2 + pulse * .65)
    ctx.beginPath()
    ctx.arc(0, 0, aperture, Math.PI * 1.12, Math.PI * 1.88)
    ctx.arc(0, 0, aperture, Math.PI * .12, Math.PI * .88)
    ctx.stroke()
    ctx.beginPath()
    ctx.ellipse(0, 0, radius * .62, radius * .32 * pulse, 0, 0, Math.PI * 2)
    ctx.stroke()
  } else if (index === 6) {
    // Golden thorn: four curved thorns reach toward the cardinal points.
    for (let thorn = 0; thorn < 4; thorn += 1) {
      const angle = thorn * Math.PI / 2 + phase * .08
      ctx.save()
      ctx.rotate(angle)
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.quadraticCurveTo(radius * .8, -radius * 1.7, radius * 2.4, -radius * 2.05)
      ctx.stroke()
      ctx.restore()
    }
  } else if (index === 7) {
    // Saint lantern: a breathing halo with four light rays.
    ctx.globalAlpha = .28 * pulse
    ctx.beginPath()
    ctx.arc(0, 0, radius * (2.2 + pulse * .55), 0, Math.PI * 2)
    ctx.stroke()
    ctx.globalAlpha = .6 * pulse
    for (let ray = 0; ray < 4; ray += 1) {
      const angle = ray * Math.PI / 2 + Math.PI / 4
      ctx.beginPath()
      ctx.moveTo(Math.cos(angle) * radius * 1.1, Math.sin(angle) * radius * 1.1)
      ctx.lineTo(Math.cos(angle) * radius * 2.7, Math.sin(angle) * radius * 2.7)
      ctx.stroke()
    }
  } else if (index === 8) {
    // Green orison: a pair of vines curl out from the star.
    for (const side of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.bezierCurveTo(side * radius * .4, radius * .9, side * radius * 2.4, radius * .7, side * radius * 2.2, -radius * 1.7)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(side * radius * 1.45, -radius * .55, radius * .4, 0, Math.PI * 2)
      ctx.stroke()
    }
  } else if (index === 9) {
    // Blue witness: falling witness marks orbit the point.
    for (let mark = 0; mark < 5; mark += 1) {
      const offset = ((phase * (0.45 + mark * .04) + mark * .8) % 1) * radius * 4.2
      ctx.globalAlpha = .7 - mark * .1
      ctx.beginPath()
      ctx.moveTo(-radius * 2.5 + mark * radius * 1.1, -radius * 2.4 + offset)
      ctx.lineTo(-radius * 2.5 + mark * radius * 1.1, -radius * 1.9 + offset)
      ctx.stroke()
    }
  } else if (index === 10) {
    // Black mass: a low waveform circles the star.
    ctx.rotate(-phase * .1)
    ctx.beginPath()
    for (let wave = 0; wave <= 24; wave += 1) {
      const angle = wave / 24 * Math.PI * 2
      const waveRadius = radius * (2.15 + Math.sin(angle * 5 + phase) * .3)
      const px = Math.cos(angle) * waveRadius
      const py = Math.sin(angle) * waveRadius
      if (wave === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.closePath()
    ctx.stroke()
  } else {
    // Dawn ash: nested arcs rise like a horizon line.
    for (let arc = 0; arc < 3; arc += 1) {
      ctx.beginPath()
      ctx.arc(0, radius * (2.5 - arc * .38), radius * (1.5 + arc * .42), Math.PI * 1.12, Math.PI * 1.88)
      ctx.stroke()
    }
  }
  ctx.restore()
}

const drawGothicOrbit = (ctx: CanvasRenderingContext2D, width: number, height: number, time: number, reducedMotion: boolean, rotation: number, seed: number, selectedId: string, hoveredId: string, showConnections: boolean, ritualMode: boolean, parallaxX: number, parallaxY: number, backgroundImage: HTMLImageElement | null) => {
  const metrics = getMetrics(width, height)
  const centerX = metrics.centerX + parallaxX * width * .026
  const centerY = metrics.centerY + parallaxY * height * .02
  const { radius } = metrics
  const layout = getLayout(seed)
  const autoRotation = reducedMotion ? 0 : time * .00012
  const orbitRotation = rotation + autoRotation
  const random = seededRandom(seed ^ 0x9e3779b9)

  ctx.clearRect(0, 0, width, height)
  const backdrop = ctx.createRadialGradient(width * .42, height * .45, 0, width * .42, height * .5, Math.max(width, height) * .82)
  backdrop.addColorStop(0, '#1b252c')
  backdrop.addColorStop(.46, '#0d151d')
  backdrop.addColorStop(1, '#05070b')
  ctx.fillStyle = backdrop
  ctx.fillRect(0, 0, width, height)

  // Low-alpha art plate keeps the supplied 90s reference behind the observatory layers.
  if (backgroundImage?.complete && backgroundImage.naturalWidth > 0) {
    ctx.save()
    const imageScale = Math.max(width / backgroundImage.naturalWidth, height / backgroundImage.naturalHeight)
    const imageWidth = backgroundImage.naturalWidth * imageScale
    const imageHeight = backgroundImage.naturalHeight * imageScale
    ctx.translate(parallaxX * width * .018, parallaxY * height * .012)
    ctx.globalAlpha = .46
    ctx.drawImage(backgroundImage, (width - imageWidth) / 2, (height - imageHeight) / 2, imageWidth, imageHeight)
    ctx.restore()
  }

  // The observatory walls are deliberately quiet so the instrument remains the focal point.
  ctx.save()
  ctx.translate(parallaxX * width * .014, parallaxY * height * .01)
  const wallGradient = ctx.createLinearGradient(0, 0, width, 0)
  wallGradient.addColorStop(0, 'rgba(7, 10, 15, .92)')
  wallGradient.addColorStop(.18, 'rgba(36, 43, 49, .38)')
  wallGradient.addColorStop(.5, 'rgba(62, 67, 67, .12)')
  wallGradient.addColorStop(.82, 'rgba(36, 43, 49, .38)')
  wallGradient.addColorStop(1, 'rgba(7, 10, 15, .92)')
  ctx.fillStyle = wallGradient
  ctx.fillRect(0, 0, width, height)
  ctx.strokeStyle = 'rgba(179, 157, 117, .12)'
  ctx.lineWidth = Math.max(1, width * .001)
  for (const side of [-1, 1]) {
    const x = side < 0 ? width * .12 : width * .88
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(width * (.5 + side * .1), height)
    ctx.moveTo(x + side * width * .05, 0)
    ctx.lineTo(width * (.5 + side * .28), height)
    ctx.stroke()
  }
  ctx.restore()

  // Mid-distance cloud shelves move more than the masonry behind them.
  ctx.save()
  ctx.translate(parallaxX * width * .045, parallaxY * height * .03)
  ctx.strokeStyle = 'rgba(104, 132, 137, .15)'
  ctx.lineWidth = Math.max(1, width * .003)
  for (let shelf = 0; shelf < 5; shelf += 1) {
    const y = height * (.19 + shelf * .13)
    ctx.beginPath()
    ctx.moveTo(-width * .1, y)
    ctx.bezierCurveTo(width * .23, y - height * .045, width * .38, y + height * .04, width * .63, y - height * .02)
    ctx.bezierCurveTo(width * .82, y - height * .065, width * 1.05, y + height * .025, width * 1.1, y)
    ctx.stroke()
  }
  ctx.restore()

  // A small, fixed set of distant dust motes gives the room depth without implying external data.
  ctx.save()
  ctx.translate(parallaxX * width * .06, parallaxY * height * .045)
  for (let mote = 0; mote < 46; mote += 1) {
    const x = random() * width
    const y = random() * height
    const alpha = .08 + random() * .16
    ctx.fillStyle = `rgba(195, 183, 147, ${alpha})`
    ctx.fillRect(x, y, Math.max(1, width * .0012), Math.max(1, width * .0012))
  }
  ctx.restore()

  // Layered observatory mechanics sit behind the zodiac ring. The eccentric
  // tracks, rotating sweep and drifting motes make pointer parallax visible
  // even when the supplied background plate is quiet.
  ctx.save()
  ctx.translate(centerX, centerY)
  const backgroundPhase = reducedMotion ? 0 : time * .001
  ctx.rotate(backgroundPhase * .12 + rotation * .18)
  for (let track = 0; track < 6; track += 1) {
    const trackRadius = radius * (1.22 + track * .16)
    ctx.strokeStyle = `rgba(${track % 2 ? '126, 157, 158' : '192, 157, 101'}, ${.15 + track * .018})`
    ctx.lineWidth = Math.max(1, radius * (.0042 - track * .00015))
    ctx.setLineDash(track % 2 ? [radius * .055, radius * .08] : [])
    ctx.beginPath()
    ctx.ellipse(0, 0, trackRadius, trackRadius * (.42 + (track % 3) * .08), (track - 2) * .12, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.setLineDash([])
  // Bright maintenance motes travel around the eccentric tracks, making the
  // depth layers readable even when the pointer is still.
  ctx.globalCompositeOperation = 'screen'
  for (let mote = 0; mote < 18; mote += 1) {
    const track = mote % 6
    const trackRadius = radius * (1.22 + track * .16)
    const ellipseY = trackRadius * (.42 + (track % 3) * .08)
    const angle = backgroundPhase * (.32 + track * .035) + mote * 1.91
    const x = Math.cos(angle) * trackRadius
    const y = Math.sin(angle) * ellipseY
    const moteRadius = Math.max(2.2, radius * (.009 + (mote % 3) * .0022))
    ctx.fillStyle = mote % 3 === 0 ? 'rgba(255, 214, 127, .96)' : 'rgba(151, 220, 218, .82)'
    ctx.shadowColor = ctx.fillStyle
    ctx.shadowBlur = radius * .08
    ctx.beginPath()
    ctx.arc(x, y, moteRadius, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.shadowBlur = 0
  ctx.globalCompositeOperation = 'screen'
  const pulse = ritualMode ? .62 + Math.sin(backgroundPhase * 3.2) * .2 : .3 + Math.sin(backgroundPhase * 2.1) * .08
  const halo = ctx.createRadialGradient(0, 0, radius * .34, 0, 0, radius * (ritualMode ? 1.85 : 1.42))
  halo.addColorStop(0, `rgba(211, 177, 105, ${pulse * .28})`)
  halo.addColorStop(.5, `rgba(109, 161, 164, ${pulse * .14})`)
  halo.addColorStop(1, 'rgba(48, 71, 72, 0)')
  ctx.fillStyle = halo
  ctx.beginPath()
  ctx.arc(0, 0, radius * (ritualMode ? 1.75 : 1.28), 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = `rgba(245, 207, 128, ${ritualMode ? .72 : .46})`
  ctx.lineWidth = Math.max(1.5, radius * .009)
  ctx.beginPath()
  const sweepRadius = radius * 1.18
  const sweepAngle = backgroundPhase * (ritualMode ? 1.15 : .7)
  ctx.moveTo(0, 0)
  ctx.lineTo(Math.cos(sweepAngle) * sweepRadius, Math.sin(sweepAngle) * sweepRadius)
  ctx.stroke()
  ctx.fillStyle = `rgba(245, 207, 128, ${ritualMode ? .13 : .06})`
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.arc(0, 0, sweepRadius, sweepAngle - .055, sweepAngle + .055)
  ctx.closePath()
  ctx.fill()
  // A second, broad sweep catches the outer rings and produces a readable
  // moving highlight instead of a barely visible centre line.
  ctx.globalAlpha = ritualMode ? .9 : .58
  ctx.strokeStyle = ritualMode ? 'rgba(255, 222, 145, .62)' : 'rgba(226, 190, 113, .34)'
  ctx.lineWidth = Math.max(2, radius * .014)
  ctx.beginPath()
  ctx.arc(0, 0, radius * 1.34, sweepAngle - .12, sweepAngle + .12)
  ctx.stroke()
  ctx.globalAlpha = 1
  ctx.restore()

  ctx.save()
  ctx.translate(centerX, centerY)
  ctx.rotate(orbitRotation)
  ctx.shadowColor = 'rgba(196, 157, 92, .25)'
  ctx.shadowBlur = radius * .12
  ctx.strokeStyle = 'rgba(200, 171, 112, .78)'
  ctx.lineWidth = Math.max(1.5, radius * .014)
  ctx.beginPath()
  ctx.arc(0, 0, radius * 1.02, 0, Math.PI * 2)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(133, 160, 158, .58)'
  ctx.lineWidth = Math.max(1, radius * .008)
  ctx.beginPath()
  ctx.arc(0, 0, radius * .94, 0, Math.PI * 2)
  ctx.arc(0, 0, radius * .76, 0, Math.PI * 2)
  ctx.arc(0, 0, radius * .47, 0, Math.PI * 2)
  ctx.stroke()

  // Zodiac divisions and engraved cardinal marks.
  for (let tick = 0; tick < 72; tick += 1) {
    const angle = tick / 72 * Math.PI * 2
    const outer = radius * (tick % 6 === 0 ? 1.02 : .99)
    const inner = radius * (tick % 6 === 0 ? .9 : .95)
    ctx.strokeStyle = tick % 6 === 0 ? 'rgba(214, 181, 115, .72)' : 'rgba(177, 192, 183, .3)'
    ctx.lineWidth = tick % 6 === 0 ? Math.max(1.2, radius * .009) : Math.max(.7, radius * .004)
    ctx.beginPath()
    ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner)
    ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer)
    ctx.stroke()
  }
  const zodiac = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓']
  ctx.fillStyle = 'rgba(222, 207, 168, .72)'
  ctx.font = `${Math.max(11, radius * .085)}px serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  zodiac.forEach((glyph, index) => {
    const angle = index / zodiac.length * Math.PI * 2
    ctx.fillText(glyph, Math.cos(angle) * radius * .855, Math.sin(angle) * radius * .855)
  })

  // Gothic crosshair and central lens.
  ctx.strokeStyle = 'rgba(211, 184, 123, .54)'
  ctx.lineWidth = Math.max(1.2, radius * .009)
  ctx.beginPath()
  ctx.moveTo(-radius * .57, 0)
  ctx.lineTo(radius * .57, 0)
  ctx.moveTo(0, -radius * .57)
  ctx.lineTo(0, radius * .57)
  ctx.stroke()
  ctx.fillStyle = 'rgba(8, 12, 17, .9)'
  ctx.strokeStyle = 'rgba(212, 178, 108, .88)'
  ctx.lineWidth = Math.max(1.5, radius * .014)
  ctx.beginPath()
  ctx.arc(0, 0, radius * .27, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  drawGothicRosette(ctx, 0, 0, radius * .22, '#b7c8c0', .5)
  ctx.fillStyle = '#d4b66f'
  ctx.beginPath()
  ctx.arc(0, 0, radius * .055, 0, Math.PI * 2)
  ctx.fill()

  // Constellation spokes sit above the brass rings and below the star lights.
  ctx.lineCap = 'round'
  if (showConnections) {
    CONNECTIONS.forEach(([from, to]) => {
      const a = layout[from]
      const b = layout[to]
      const ax = Math.cos(a.angle) * radius * a.radius
      const ay = Math.sin(a.angle) * radius * a.radius
      const bx = Math.cos(b.angle) * radius * b.radius
      const by = Math.sin(b.angle) * radius * b.radius
      const connectedToSelection = a.id === selectedId || b.id === selectedId
      ctx.strokeStyle = connectedToSelection ? 'rgba(218, 183, 111, .58)' : 'rgba(157, 177, 170, .3)'
      ctx.lineWidth = Math.max(1, radius * (connectedToSelection ? .008 : .006))
      ctx.beginPath()
      ctx.moveTo(ax, ay)
      ctx.lineTo(bx, by)
      ctx.stroke()
    })
  }
  layout.forEach((star) => {
    const x = Math.cos(star.angle) * radius * star.radius
    const y = Math.sin(star.angle) * radius * star.radius
    const twinkle = reducedMotion ? 1 : .68 + Math.sin(time * .004 + star.phase) * .32
    const selected = star.id === selectedId
    const hovered = star.id === hoveredId
    const starRadius = radius * (.018 + star.intensity * .012) * (selected ? 1.35 : hovered ? 1.2 : 1)
    const color = toneColor(star.tone)
    if (selected) {
      ctx.save()
      ctx.globalAlpha = .52 + star.intensity * .2
      ctx.strokeStyle = color
      ctx.lineWidth = Math.max(1.5, radius * .011)
      ctx.beginPath()
      ctx.arc(x, y, starRadius * 3.4 + Math.sin(time * .006) * radius * .024, 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha = .15 + star.intensity * .12
      ctx.lineWidth = Math.max(1, radius * .004)
      ctx.beginPath()
      ctx.moveTo(x - radius * .11, y)
      ctx.lineTo(x + radius * .11, y)
      ctx.moveTo(x, y - radius * .11)
      ctx.lineTo(x, y + radius * .11)
      ctx.stroke()
      ctx.restore()
    }
    if (hovered && !selected) {
      ctx.save()
      ctx.globalAlpha = .34 + star.intensity * .18
      ctx.strokeStyle = color
      ctx.lineWidth = Math.max(1, radius * .006)
      ctx.setLineDash([radius * .025, radius * .04])
      ctx.beginPath()
      ctx.arc(x, y, starRadius * 2.25 + Math.sin(time * .003) * radius * .01, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }
    ctx.save()
    ctx.globalAlpha = twinkle
    ctx.shadowColor = color
    ctx.shadowBlur = radius * (.04 + star.intensity * .08)
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(x, y, starRadius, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    drawStarEffect(ctx, star.index, x, y, starRadius, time, reducedMotion, color)
  })
  ctx.restore()

  // Fixed architectural finials anchor the instrument to the room.
  ctx.save()
  ctx.strokeStyle = 'rgba(185, 161, 111, .34)'
  ctx.lineWidth = Math.max(1, width * .002)
  for (const side of [-1, 1]) {
    const x = width * (side < 0 ? .08 : .92)
    ctx.beginPath()
    ctx.moveTo(x, height * .83)
    ctx.lineTo(x, height * .25)
    ctx.lineTo(x + side * width * .05, height * .15)
    ctx.lineTo(x + side * width * .1, height * .25)
    ctx.lineTo(x + side * width * .1, height * .83)
    ctx.stroke()
    ctx.fillStyle = 'rgba(201, 171, 105, .6)'
    ctx.beginPath()
    ctx.arc(x + side * width * .05, height * .14, Math.max(2, width * .008), 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

export default function GothicOrbitScene({ reducedMotion = false }: GothicOrbitSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const pointerRef = useRef<{ startX: number; startY: number; startRotation: number; moved: boolean } | null>(null)
  const parallaxRef = useRef({ x: 0, y: 0 })
  const rotationRef = useRef(0)
  const selectedIdRef = useRef(ORBIT_STARS[0].id)
  const hoveredIdRef = useRef('')
  const showConnectionsRef = useRef(true)
  const ritualModeRef = useRef(false)
  const renderRef = useRef<((time: number) => void) | null>(null)
  const [, setRotation] = useState(0)
  const [selectedId, setSelectedId] = useState(ORBIT_STARS[0].id)
  const [showConnections, setShowConnections] = useState(true)
  const [ritualMode, setRitualMode] = useState(false)
  showConnectionsRef.current = showConnections
  ritualModeRef.current = ritualMode
  const [daySeed] = useState(() => hashString(new Date().toISOString().slice(0, 10)))
  const layout = useMemo(() => getLayout(daySeed), [daySeed])
  const selected = layout.find((star) => star.id === selectedId) ?? layout[0]

  const pickStar = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const width = rect.width
    const height = rect.height
    const metrics = getMetrics(width, height)
    const centerX = metrics.centerX + parallaxRef.current.x * width * .026
    const centerY = metrics.centerY + parallaxRef.current.y * height * .02
    const { radius } = metrics
    const x = clientX - rect.left - centerX
    const y = clientY - rect.top - centerY
    const instrumentRotation = rotationRef.current + (reducedMotion ? 0 : performance.now() * .00012)
    let nearest = ''
    let nearestDistance = Number.POSITIVE_INFINITY
    layout.forEach((star) => {
      const angle = star.angle + instrumentRotation
      const starX = Math.cos(angle) * radius * star.radius
      const starY = Math.sin(angle) * radius * star.radius
      const distance = Math.hypot(x - starX, y - starY)
      if (distance < nearestDistance) {
        nearest = star.id
        nearestDistance = distance
      }
    })
    if (nearest && nearestDistance < Math.max(24, radius * .12)) {
      selectedIdRef.current = nearest
      setSelectedId(nearest)
      if (reducedMotion) renderRef.current?.(performance.now())
    }
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    pointerRef.current = { startX: event.clientX, startY: event.clientY, startRotation: rotationRef.current, moved: false }
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const pointer = pointerRef.current
    if (!pointer) return
    const distance = Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY)
    if (distance > 5) pointer.moved = true
    if (!pointer.moved) return
    const canvas = canvasRef.current
    if (!canvas) return
    const nextRotation = pointer.startRotation + (event.clientX - pointer.startX) / canvas.getBoundingClientRect().width * Math.PI * 1.8
    rotationRef.current = nextRotation
    setRotation(nextRotation)
  }

  const onPointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!pointerRef.current?.moved) pickStar(event.clientX, event.clientY)
    pointerRef.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  const selectStar = (id: string) => {
    selectedIdRef.current = id
    setSelectedId(id)
    if (reducedMotion) renderRef.current?.(performance.now())
  }

  const rotateBy = (delta: number) => {
    const nextRotation = rotationRef.current + delta
    rotationRef.current = nextRotation
    setRotation(nextRotation)
    if (reducedMotion) renderRef.current?.(performance.now())
  }

  const toggleConnections = () => {
    setShowConnections((value) => !value)
    if (reducedMotion) window.requestAnimationFrame(() => renderRef.current?.(performance.now()))
  }

  const toggleRitualMode = () => {
    setRitualMode((value) => !value)
    if (reducedMotion) window.requestAnimationFrame(() => renderRef.current?.(performance.now()))
  }

  useEffect(() => {
    const stage = stageRef.current
    const canvas = canvasRef.current
    if (!stage || !canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let width = 0
    let height = 0
    let frame = 0
    let disposed = false
    let backgroundImage: HTMLImageElement | null = null
    const resize = () => {
      const rect = stage.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = Math.max(320, rect.width)
      height = Math.max(560, rect.height)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    const render = (time: number) => {
      if (disposed) return
      drawGothicOrbit(ctx, width, height, time, reducedMotion, rotationRef.current, daySeed, selectedIdRef.current, hoveredIdRef.current, showConnectionsRef.current, ritualModeRef.current, parallaxRef.current.x, parallaxRef.current.y, backgroundImage)
      if (!reducedMotion) frame = window.requestAnimationFrame(render)
    }
    renderRef.current = render
    const onStagePointerMove = (event: globalThis.PointerEvent) => {
      const rect = stage.getBoundingClientRect()
      parallaxRef.current = {
        x: clamp((event.clientX - rect.left) / rect.width * 2 - 1, -1, 1),
        y: clamp((event.clientY - rect.top) / rect.height * 2 - 1, -1, 1),
      }
      const metrics = getMetrics(width, height)
      const centerX = metrics.centerX + parallaxRef.current.x * width * .026
      const centerY = metrics.centerY + parallaxRef.current.y * height * .02
      const instrumentRotation = rotationRef.current + (reducedMotion ? 0 : performance.now() * .00012)
      const localX = event.clientX - rect.left - centerX
      const localY = event.clientY - rect.top - centerY
      let nearest = ''
      let nearestDistance = Number.POSITIVE_INFINITY
      layout.forEach((star) => {
        const angle = star.angle + instrumentRotation
        const starX = Math.cos(angle) * metrics.radius * star.radius
        const starY = Math.sin(angle) * metrics.radius * star.radius
        const distance = Math.hypot(localX - starX, localY - starY)
        if (distance < nearestDistance) {
          nearest = star.id
          nearestDistance = distance
        }
      })
      const nextHovered = nearestDistance < Math.max(24, metrics.radius * .12) ? nearest : ''
      if (nextHovered !== hoveredIdRef.current) {
        hoveredIdRef.current = nextHovered
        stage.classList.toggle('is-hovering-star', Boolean(nextHovered))
      }
      stage.style.setProperty('--orbit-parallax-x', parallaxRef.current.x.toFixed(3))
      stage.style.setProperty('--orbit-parallax-y', parallaxRef.current.y.toFixed(3))
      if (reducedMotion) renderRef.current?.(performance.now())
    }
    const onStagePointerLeave = () => {
      parallaxRef.current = { x: 0, y: 0 }
      hoveredIdRef.current = ''
      stage.classList.remove('is-hovering-star')
      stage.style.setProperty('--orbit-parallax-x', '0')
      stage.style.setProperty('--orbit-parallax-y', '0')
      if (reducedMotion) renderRef.current?.(performance.now())
    }
    const observer = new ResizeObserver(resize)
    observer.observe(stage)
    stage.addEventListener('pointermove', onStagePointerMove)
    stage.addEventListener('pointerleave', onStagePointerLeave)
    backgroundImage = new Image()
    backgroundImage.decoding = 'async'
    backgroundImage.src = '/gothic-orbit-bg.png'
    backgroundImage.onload = () => render(performance.now())
    resize()
    render(reducedMotion ? 0 : performance.now())
    if (!reducedMotion) frame = window.requestAnimationFrame(render)
    return () => {
      disposed = true
      window.cancelAnimationFrame(frame)
      observer.disconnect()
      stage.removeEventListener('pointermove', onStagePointerMove)
      stage.removeEventListener('pointerleave', onStagePointerLeave)
      renderRef.current = null
    }
  }, [daySeed, reducedMotion])

  return (
    <main className="gothic-orbit-scene" data-scene="gothic-orbit" data-seed={daySeed} aria-labelledby="gothic-orbit-title">
      <div className="gothic-orbit-stage" ref={stageRef}>
        <canvas
          ref={canvasRef}
          className="gothic-orbit-canvas"
          role="img"
          aria-label="哥特式星座盘：黄道环、样本情绪星点与星座连线"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => { pointerRef.current = null }}
        />
        <header className="gothic-orbit-header">
          <p className="gothic-orbit-kicker">第七展馆 <span>/</span> 星盘台</p>
          <h1 id="gothic-orbit-title">哥特式星座盘</h1>
          <p className="gothic-orbit-subtitle">THE GOTHIC ORRERY</p>
          <p className="gothic-orbit-caption">让不可测量之物，在黄道环上留下短暂的光。</p>
        </header>

        <section className="gothic-orbit-detail" aria-live="polite" aria-label="星点说明">
          <p className="gothic-orbit-detail__eyebrow">{selected.zodiac} · 样本情绪 · {toneLabel[selected.tone]}</p>
          <h2>{selected.glyph} {selected.name}</h2>
          <p className="gothic-orbit-detail__sample">{selected.sample}</p>
          <p className="gothic-orbit-detail__reading">{selected.reading}</p>
          <div className="gothic-orbit-detail__meter" aria-label={`情绪强度 ${Math.round(selected.intensity * 100)}%`}>
            <span style={{ width: `${selected.intensity * 100}%`, background: toneColor(selected.tone) }} />
          </div>
          <small>强度 {Math.round(selected.intensity * 100)} / 100</small>
        </section>

        <section className="gothic-orbit-console" aria-label="星盘控制">
          <div className="gothic-orbit-console__heading">
            <Sparkles aria-hidden="true" />
            <span>今日星尘 · {daySeed.toString(16).padStart(8, '0')}</span>
          </div>
          <div className="gothic-orbit-console__actions">
            <button type="button" className={showConnections ? 'is-active' : ''} onClick={toggleConnections} title="Toggle constellation links" aria-label="Toggle constellation links" aria-pressed={showConnections}><Link2 aria-hidden="true" /></button>
            <button type="button" className={ritualMode ? 'is-active' : ''} onClick={toggleRitualMode} title="Toggle ritual pulse" aria-label="Toggle ritual pulse" aria-pressed={ritualMode}><Zap aria-hidden="true" /></button>
            <button type="button" onClick={() => rotateBy(-Math.PI / 12)} title="逆时针旋转" aria-label="逆时针旋转"><RotateCcw aria-hidden="true" /></button>
            <button type="button" onClick={() => rotateBy(-rotationRef.current)} title="校准星盘" aria-label="校准星盘"><Crosshair aria-hidden="true" /></button>
            <button type="button" onClick={() => rotateBy(Math.PI / 12)} title="顺时针旋转" aria-label="顺时针旋转"><RotateCw aria-hidden="true" /></button>
          </div>
          <p>拖曳星盘以改变观测方向，点击星点查看样本情绪。</p>
        </section>

        <aside className="gothic-orbit-stars" aria-label="星点列表">
          <p className="gothic-orbit-stars__title">星点目录</p>
          <div className="gothic-orbit-stars__list">
            {layout.map((star) => (
              <button
                type="button"
                key={star.id}
                className={star.id === selectedId ? 'is-selected' : ''}
                onClick={() => selectStar(star.id)}
                aria-pressed={star.id === selectedId}
              >
                <i style={{ background: toneColor(star.tone) }} aria-hidden="true" />
                <span>{star.glyph} {star.name}</span>
              </button>
            ))}
          </div>
        </aside>

        <nav className="gothic-orbit-nav" aria-label="星盘台导航">
          <button type="button" onClick={() => selectStar(layout[Math.floor(Math.random() * layout.length)].id)}><Dices aria-hidden="true" /><span>观测星点</span></button>
        </nav>
      </div>
    </main>
  )
}
