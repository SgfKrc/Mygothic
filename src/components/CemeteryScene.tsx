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

type StoneDetail = 'cross' | 'arch' | 'obelisk' | 'broken'

const stoneNoise = (seed: number) => {
  const value = Math.sin(seed * 127.19) * 43758.5453
  return value - Math.floor(value)
}

const drawTombstone = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  tilt: number,
  tone: string,
  detail: StoneDetail,
  index: number,
  inscription?: string,
) => {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(tilt)

  const half = width / 2
  const bodyTop = -height * 0.82
  const shoulder = detail === 'obelisk' ? height * 0.05 : height * 0.2
  const cap = detail === 'arch' || detail === 'cross' ? height * 0.2 : height * 0.12

  const stone = ctx.createLinearGradient(-half, bodyTop, half, 0)
  stone.addColorStop(0, tone)
  stone.addColorStop(0.48, '#6f5b62')
  stone.addColorStop(1, '#241d26')
  ctx.fillStyle = stone
  ctx.strokeStyle = index === 2 ? '#c8a36b' : '#837079'
  ctx.lineWidth = Math.max(1.4, width * 0.012)

  ctx.beginPath()
  ctx.moveTo(-half, 0)
  ctx.lineTo(-half * 0.96, bodyTop + shoulder)
  if (detail === 'broken') {
    ctx.lineTo(-half * 0.64, bodyTop - cap * 0.3)
    ctx.lineTo(-half * 0.25, bodyTop + cap * 0.05)
    ctx.lineTo(half * 0.04, bodyTop - cap * 0.24)
    ctx.lineTo(half * 0.36, bodyTop + cap * 0.08)
    ctx.lineTo(half * 0.95, bodyTop + shoulder)
  } else if (detail === 'obelisk') {
    ctx.lineTo(-half * 0.42, bodyTop)
    ctx.lineTo(0, bodyTop - cap)
    ctx.lineTo(half * 0.42, bodyTop)
    ctx.lineTo(half * 0.96, bodyTop + shoulder)
  } else {
    ctx.quadraticCurveTo(0, bodyTop - cap, half * 0.96, bodyTop + shoulder)
  }
  ctx.lineTo(half, 0)
  ctx.closePath()
  ctx.fill()
  ctx.globalAlpha = 0.72
  ctx.stroke()
  ctx.globalAlpha = 1

  // Recessed face and a worn inner bevel make the stone read at a distance.
  ctx.fillStyle = 'rgba(12, 9, 14, 0.22)'
  ctx.beginPath()
  ctx.moveTo(-half * 0.72, -height * 0.1)
  ctx.lineTo(-half * 0.66, bodyTop + shoulder + height * 0.08)
  if (detail === 'obelisk') {
    ctx.lineTo(0, bodyTop + height * 0.02)
    ctx.lineTo(half * 0.66, bodyTop + shoulder + height * 0.08)
  } else {
    ctx.quadraticCurveTo(0, bodyTop - cap * 0.58, half * 0.66, bodyTop + shoulder + height * 0.08)
  }
  ctx.lineTo(half * 0.72, -height * 0.1)
  ctx.closePath()
  ctx.fill()

  ctx.strokeStyle = 'rgba(227, 207, 182, 0.22)'
  ctx.lineWidth = Math.max(1, width * 0.007)
  ctx.beginPath()
  ctx.moveTo(-half * 0.73, -height * 0.08)
  ctx.lineTo(-half * 0.67, bodyTop + shoulder + height * 0.1)
  ctx.stroke()

  // Deterministic pitting and hairline cracks keep repeated stones from looking stamped.
  ctx.strokeStyle = 'rgba(21, 15, 22, 0.56)'
  ctx.fillStyle = 'rgba(20, 15, 21, 0.38)'
  ctx.lineWidth = Math.max(0.8, width * 0.004)
  for (let mark = 0; mark < 7; mark += 1) {
    const px = -half * 0.7 + stoneNoise(index * 41 + mark * 7) * width * 1.4
    const py = bodyTop * 0.24 + stoneNoise(index * 73 + mark * 11) * height * 0.58
    const radius = Math.max(0.8, width * (0.006 + stoneNoise(index * 91 + mark) * 0.012))
    ctx.beginPath()
    ctx.arc(px, py, radius, 0, Math.PI * 2)
    ctx.fill()
  }
  for (let crack = 0; crack < 3; crack += 1) {
    const startX = -half * 0.58 + stoneNoise(index * 19 + crack) * width
    const startY = bodyTop * (0.28 + stoneNoise(index * 23 + crack * 4) * 0.35)
    ctx.beginPath()
    ctx.moveTo(startX, startY)
    ctx.lineTo(startX - width * 0.05, startY + height * 0.08)
    ctx.lineTo(startX + width * 0.015, startY + height * 0.14)
    ctx.lineTo(startX - width * 0.03, startY + height * 0.22)
    ctx.stroke()
  }

  if (detail === 'cross') {
    ctx.strokeStyle = 'rgba(221, 197, 166, 0.68)'
    ctx.lineWidth = Math.max(1.3, width * 0.02)
    ctx.beginPath()
    ctx.moveTo(0, bodyTop + height * 0.08)
    ctx.lineTo(0, bodyTop + height * 0.36)
    ctx.moveTo(-width * 0.13, bodyTop + height * 0.2)
    ctx.lineTo(width * 0.13, bodyTop + height * 0.2)
    ctx.stroke()
  }

  if (inscription) {
    ctx.fillStyle = '#dbc8ad'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `600 ${Math.max(10, width * 0.075)}px "Noto Serif SC", serif`
    ctx.fillText(inscription, 0, -height * 0.38, width * 0.82)
    ctx.fillStyle = 'rgba(203, 177, 147, 0.74)'
    ctx.font = `400 ${Math.max(7, width * 0.048)}px "Cormorant Garamond", serif`
    ctx.fillText('ALICE · LIDDELL', 0, -height * 0.27, width * 0.8)
  }

  // Heavy base and small moss strokes anchor the stone in the ground.
  ctx.fillStyle = '#211921'
  ctx.strokeStyle = 'rgba(157, 125, 113, 0.48)'
  ctx.lineWidth = Math.max(1.2, width * 0.009)
  ctx.fillRect(-half * 1.12, -height * 0.03, width * 1.12, height * 0.075)
  ctx.strokeRect(-half * 1.12, -height * 0.03, width * 1.12, height * 0.075)
  ctx.strokeStyle = 'rgba(108, 130, 92, 0.74)'
  ctx.lineWidth = Math.max(1, width * 0.008)
  for (let blade = 0; blade < 5; blade += 1) {
    const bx = -half * 0.82 + blade * width * 0.37
    ctx.beginPath()
    ctx.moveTo(bx, height * 0.02)
    ctx.lineTo(bx + width * 0.04, -height * 0.05)
    ctx.stroke()
  }

  // A few square pigment chips add a restrained pixel-art accent without pixelating the silhouette.
  const chip = Math.max(2, width * 0.0022)
  ctx.fillStyle = 'rgba(222, 194, 157, 0.24)'
  ctx.fillRect(-half * 0.66, bodyTop + height * 0.12, chip * 1.5, chip)
  ctx.fillRect(half * 0.38, bodyTop + height * 0.31, chip, chip * 1.7)
  ctx.fillStyle = 'rgba(19, 14, 20, 0.5)'
  ctx.fillRect(-half * 0.32, bodyTop + height * 0.53, chip * 1.8, chip)
  ctx.restore()
}

const drawDeadTree = (
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  height: number,
  width: number,
  seed: number,
  alpha = 1,
) => {
  const sway = (stoneNoise(seed + 9) - 0.5) * width * 0.28
  const trunkTopX = x + sway
  const trunkTopY = baseY - height
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  // A crooked split trunk gives the silhouette a recognizable dead-tree gesture.
  ctx.strokeStyle = '#0b0a10'
  ctx.lineWidth = Math.max(2, width * 0.16)
  ctx.beginPath()
  ctx.moveTo(x, baseY)
  ctx.bezierCurveTo(x - width * 0.04, baseY - height * 0.22, x + width * 0.08, baseY - height * 0.47, trunkTopX, trunkTopY)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x + width * 0.01, baseY - height * 0.42)
  ctx.bezierCurveTo(x + width * 0.22, baseY - height * 0.55, x + width * 0.17, baseY - height * 0.7, x + width * 0.26, baseY - height * 0.82)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x - width * 0.01, baseY - height * 0.32)
  ctx.bezierCurveTo(x - width * 0.19, baseY - height * 0.46, x - width * 0.27, baseY - height * 0.61, x - width * 0.34, baseY - height * 0.74)
  ctx.stroke()

  // Broken branches fan out in uneven directions; each has two fine twigs.
  const branches = [
    { y: 0.22, side: -1, reach: 0.33, rise: 0.18 },
    { y: 0.3, side: 1, reach: 0.42, rise: 0.12 },
    { y: 0.43, side: -1, reach: 0.47, rise: 0.12 },
    { y: 0.53, side: 1, reach: 0.35, rise: 0.2 },
    { y: 0.62, side: -1, reach: 0.28, rise: 0.14 },
    { y: 0.7, side: 1, reach: 0.27, rise: 0.11 },
  ]
  branches.forEach((branch, index) => {
    const nodeX = x + (stoneNoise(seed + index * 17) - 0.5) * width * 0.18
    const nodeY = baseY - height * branch.y
    const endX = nodeX + branch.side * width * (branch.reach + stoneNoise(seed + index * 31) * 0.12)
    const endY = nodeY - height * (branch.rise + stoneNoise(seed + index * 23) * 0.07)
    ctx.strokeStyle = '#0c0a10'
    ctx.lineWidth = Math.max(1.1, width * (0.06 - index * 0.004))
    ctx.beginPath()
    ctx.moveTo(nodeX, nodeY)
    ctx.quadraticCurveTo(nodeX + branch.side * width * 0.12, nodeY - height * 0.03, endX, endY)
    ctx.stroke()
    ctx.strokeStyle = 'rgba(117, 98, 105, 0.3)'
    ctx.lineWidth = Math.max(0.7, width * 0.018)
    ctx.beginPath()
    ctx.moveTo(nodeX + branch.side * width * 0.05, nodeY - height * 0.015)
    ctx.lineTo(nodeX + branch.side * width * 0.12, nodeY - height * 0.08)
    ctx.stroke()
    for (let twig = 0; twig < 2; twig += 1) {
      const twigStartX = nodeX + branch.side * width * (0.18 + twig * 0.16)
      const twigStartY = nodeY - height * (0.06 + twig * 0.025)
      ctx.strokeStyle = '#0a090f'
      ctx.lineWidth = Math.max(0.75, width * 0.014)
      ctx.beginPath()
      ctx.moveTo(twigStartX, twigStartY)
      ctx.lineTo(twigStartX + branch.side * width * (0.12 + twig * 0.04), twigStartY - height * (0.07 + twig * 0.025))
      ctx.stroke()
    }
  })

  // Roots and a few square bark chips are visible only at the base, never across the whole form.
  ctx.strokeStyle = '#0a090f'
  ctx.lineWidth = Math.max(1.5, width * 0.08)
  for (const side of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(x + side * width * 0.02, baseY - height * 0.03)
    ctx.quadraticCurveTo(x + side * width * 0.14, baseY + height * 0.01, x + side * width * 0.26, baseY + height * 0.015)
    ctx.stroke()
  }
  const chip = Math.max(1.5, width * 0.018)
  ctx.fillStyle = 'rgba(161, 128, 119, 0.25)'
  ctx.fillRect(x - width * 0.05, baseY - height * 0.37, chip * 1.5, chip)
  ctx.fillRect(trunkTopX + width * 0.02, trunkTopY + height * 0.18, chip, chip * 1.6)
  ctx.restore()
}

const drawTowerWindow = (
  ctx: CanvasRenderingContext2D,
  x: number,
  top: number,
  width: number,
  height: number,
  rose = false,
) => {
  const half = width / 2
  const base = top + height
  ctx.save()
  ctx.fillStyle = '#090a10'
  ctx.strokeStyle = 'rgba(203, 172, 142, 0.68)'
  ctx.lineWidth = Math.max(1, width * 0.035)
  ctx.beginPath()
  ctx.moveTo(x - half, base)
  ctx.lineTo(x - half * 0.9, top + height * 0.24)
  ctx.quadraticCurveTo(x - half * 0.36, top + height * 0.04, x, top)
  ctx.quadraticCurveTo(x + half * 0.36, top + height * 0.04, x + half * 0.9, top + height * 0.24)
  ctx.lineTo(x + half, base)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  ctx.strokeStyle = 'rgba(162, 133, 125, 0.58)'
  ctx.lineWidth = Math.max(0.8, width * 0.014)
  ctx.beginPath()
  ctx.moveTo(x, top + height * 0.06)
  ctx.lineTo(x, base - height * 0.03)
  ctx.moveTo(x - half * 0.54, base - height * 0.04)
  ctx.lineTo(x, top + height * 0.22)
  ctx.lineTo(x + half * 0.54, base - height * 0.04)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x - half * 0.72, top + height * 0.45)
  ctx.lineTo(x + half * 0.72, top + height * 0.45)
  ctx.stroke()

  if (rose) {
    const ringY = top + height * 0.45
    const ringRadius = width * 0.24
    ctx.strokeStyle = 'rgba(224, 190, 153, 0.72)'
    ctx.lineWidth = Math.max(0.8, width * 0.012)
    ctx.beginPath()
    ctx.arc(x, ringY, ringRadius, 0, Math.PI * 2)
    ctx.stroke()
    for (let petal = 0; petal < 8; petal += 1) {
      const angle = (petal / 8) * Math.PI * 2
      ctx.beginPath()
      ctx.arc(x + Math.cos(angle) * ringRadius * 0.56, ringY + Math.sin(angle) * ringRadius * 0.56, ringRadius * 0.28, 0, Math.PI * 2)
      ctx.stroke()
      ctx.moveTo(x, ringY)
      ctx.lineTo(x + Math.cos(angle) * ringRadius * 0.9, ringY + Math.sin(angle) * ringRadius * 0.9)
      ctx.stroke()
    }
    ctx.fillStyle = 'rgba(187, 138, 84, 0.6)'
    ctx.beginPath()
    ctx.arc(x, ringY, ringRadius * 0.18, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

const drawAngelStatue = (ctx: CanvasRenderingContext2D, x: number, baseY: number, size: number) => {
  const headY = baseY - size * 0.76
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.fillStyle = 'rgba(165, 145, 139, 0.92)'
  ctx.strokeStyle = 'rgba(46, 35, 42, 0.96)'
  ctx.lineWidth = Math.max(1, size * 0.035)

  // Back wings are carved as layered stone feathers, not a single flat triangle.
  ctx.beginPath()
  ctx.moveTo(x - size * 0.05, baseY - size * 0.35)
  ctx.bezierCurveTo(x - size * 0.46, baseY - size * 0.25, x - size * 0.7, baseY - size * 0.62, x - size * 0.85, baseY - size * 0.7)
  ctx.bezierCurveTo(x - size * 0.75, baseY - size * 0.34, x - size * 0.52, baseY - size * 0.08, x - size * 0.13, baseY - size * 0.16)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x + size * 0.05, baseY - size * 0.35)
  ctx.bezierCurveTo(x + size * 0.46, baseY - size * 0.25, x + size * 0.7, baseY - size * 0.62, x + size * 0.85, baseY - size * 0.7)
  ctx.bezierCurveTo(x + size * 0.75, baseY - size * 0.34, x + size * 0.52, baseY - size * 0.08, x + size * 0.13, baseY - size * 0.16)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.strokeStyle = 'rgba(77, 58, 62, 0.58)'
  ctx.lineWidth = Math.max(0.8, size * 0.02)
  for (const side of [-1, 1]) {
    for (let feather = 0; feather < 4; feather += 1) {
      ctx.beginPath()
      ctx.moveTo(x + side * size * (0.16 + feather * 0.05), baseY - size * (0.28 + feather * 0.02))
      ctx.lineTo(x + side * size * (0.5 + feather * 0.07), baseY - size * (0.45 + feather * 0.04))
      ctx.stroke()
    }
  }

  // Small head, halo and draped body sit on a narrow carved pedestal.
  ctx.fillStyle = '#8d7878'
  ctx.beginPath()
  ctx.arc(x, headY, size * 0.12, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.strokeStyle = 'rgba(205, 171, 126, 0.72)'
  ctx.lineWidth = Math.max(0.8, size * 0.018)
  ctx.beginPath()
  ctx.arc(x, headY, size * 0.19, Math.PI * 1.08, Math.PI * 1.92)
  ctx.stroke()
  ctx.fillStyle = '#78666b'
  ctx.beginPath()
  ctx.moveTo(x - size * 0.13, headY + size * 0.12)
  ctx.quadraticCurveTo(x - size * 0.28, baseY - size * 0.35, x - size * 0.2, baseY - size * 0.08)
  ctx.lineTo(x + size * 0.2, baseY - size * 0.08)
  ctx.quadraticCurveTo(x + size * 0.28, baseY - size * 0.35, x + size * 0.13, headY + size * 0.12)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.strokeStyle = 'rgba(212, 183, 147, 0.55)'
  ctx.lineWidth = Math.max(0.7, size * 0.02)
  ctx.beginPath()
  ctx.moveTo(x - size * 0.07, headY + size * 0.15)
  ctx.lineTo(x - size * 0.07, baseY - size * 0.1)
  ctx.moveTo(x + size * 0.07, headY + size * 0.15)
  ctx.lineTo(x + size * 0.07, baseY - size * 0.1)
  ctx.stroke()
  ctx.fillStyle = '#4a3944'
  ctx.fillRect(x - size * 0.22, baseY - size * 0.06, size * 0.44, size * 0.09)
  ctx.restore()
}

const drawSecondarySpire = (
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  spireWidth: number,
  spireHeight: number,
  side: number,
) => {
  const bodyHeight = spireHeight * 0.48
  const bodyTop = baseY - bodyHeight
  const roofTop = bodyTop - spireHeight * 0.52
  const half = spireWidth / 2

  ctx.save()
  ctx.fillStyle = '#151119'
  ctx.strokeStyle = 'rgba(132, 103, 108, 0.78)'
  ctx.lineWidth = Math.max(1, spireWidth * 0.035)
  ctx.beginPath()
  ctx.moveTo(x - half * 0.82, baseY)
  ctx.lineTo(x - half * 0.78, bodyTop + spireHeight * 0.04)
  ctx.lineTo(x - half * 0.62, bodyTop)
  ctx.lineTo(x + half * 0.62, bodyTop)
  ctx.lineTo(x + half * 0.78, bodyTop + spireHeight * 0.04)
  ctx.lineTo(x + half * 0.82, baseY)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  // A steep roof, tiny crockets and a cross finial give the outer pair a distinct silhouette.
  ctx.fillStyle = '#0d0c12'
  ctx.beginPath()
  ctx.moveTo(x - half * 0.98, bodyTop + spireHeight * 0.025)
  ctx.lineTo(x, roofTop)
  ctx.lineTo(x + half * 0.98, bodyTop + spireHeight * 0.025)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = 'rgba(189, 149, 111, 0.62)'
  for (let ornament = 1; ornament < 4; ornament += 1) {
    const ratio = ornament / 4
    const ornamentX = x + side * (half * (0.86 - ratio * 0.65))
    const ornamentY = bodyTop - spireHeight * (0.02 + ratio * 0.32)
    ctx.beginPath()
    ctx.moveTo(ornamentX, ornamentY - spireHeight * 0.016)
    ctx.lineTo(ornamentX + side * spireWidth * 0.07, ornamentY)
    ctx.lineTo(ornamentX, ornamentY + spireHeight * 0.022)
    ctx.closePath()
    ctx.fill()
  }
  ctx.strokeStyle = 'rgba(202, 169, 127, 0.7)'
  ctx.lineWidth = Math.max(0.8, spireWidth * 0.028)
  ctx.beginPath()
  ctx.moveTo(x, roofTop)
  ctx.lineTo(x, roofTop - spireHeight * 0.12)
  ctx.moveTo(x - spireWidth * 0.09, roofTop - spireHeight * 0.08)
  ctx.lineTo(x + spireWidth * 0.09, roofTop - spireHeight * 0.08)
  ctx.stroke()

  drawTowerWindow(ctx, x, bodyTop + spireHeight * 0.08, spireWidth * 0.52, spireHeight * 0.25)
  ctx.strokeStyle = 'rgba(200, 166, 128, 0.4)'
  ctx.lineWidth = Math.max(0.8, spireWidth * 0.02)
  ctx.beginPath()
  ctx.moveTo(x - half * 0.62, bodyTop + spireHeight * 0.34)
  ctx.lineTo(x + half * 0.62, bodyTop + spireHeight * 0.34)
  ctx.stroke()
  ctx.restore()
}

const drawFlyingButtress = (
  ctx: CanvasRenderingContext2D,
  side: number,
  towerWidth: number,
  towerBase: number,
  horizon: number,
  height: number,
  level: 0 | 1,
) => {
  const innerX = side * towerWidth * 0.33
  const outerX = side * towerWidth * (0.68 + level * 0.055)
  const innerY = horizon - height * (level === 0 ? 0.145 : 0.035)
  const outerY = horizon - height * (level === 0 ? 0.025 : -0.015)
  const rise = height * (level === 0 ? 0.045 : 0.032)
  const thickness = towerWidth * (level === 0 ? 0.062 : 0.052)
  const midX = (innerX + outerX) / 2
  const midY = (innerY + outerY) / 2 - rise

  ctx.save()
  ctx.lineJoin = 'round'
  ctx.fillStyle = level === 0 ? '#1d1720' : '#241a22'
  ctx.strokeStyle = 'rgba(116, 91, 98, 0.82)'
  ctx.lineWidth = Math.max(1, towerWidth * 0.012)
  ctx.beginPath()
  ctx.moveTo(innerX, innerY)
  ctx.quadraticCurveTo(midX, midY, outerX, outerY)
  ctx.lineTo(outerX, outerY + thickness)
  ctx.quadraticCurveTo(midX, midY + thickness, innerX, innerY + thickness)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  // A pale upper rib separates the two layers and keeps the stonework readable against the sky.
  ctx.strokeStyle = level === 0 ? 'rgba(212, 178, 139, 0.46)' : 'rgba(174, 133, 112, 0.34)'
  ctx.lineWidth = Math.max(0.9, towerWidth * 0.009)
  ctx.beginPath()
  ctx.moveTo(innerX, innerY + thickness * 0.26)
  ctx.quadraticCurveTo(midX, midY + thickness * 0.26, outerX, outerY + thickness * 0.26)
  ctx.stroke()

  // Outer pier, cap and a short pinnacle complete the load path.
  const pierWidth = towerWidth * (level === 0 ? 0.085 : 0.07)
  const pierTop = outerY - height * 0.014
  const pierBottom = towerBase + height * 0.018
  ctx.fillStyle = '#17131a'
  ctx.fillRect(outerX - pierWidth / 2, pierTop, pierWidth, pierBottom - pierTop)
  ctx.strokeStyle = 'rgba(126, 99, 101, 0.7)'
  ctx.lineWidth = Math.max(0.9, towerWidth * 0.009)
  ctx.strokeRect(outerX - pierWidth / 2, pierTop, pierWidth, pierBottom - pierTop)
  ctx.fillStyle = 'rgba(191, 150, 111, 0.58)'
  ctx.beginPath()
  ctx.moveTo(outerX - pierWidth * 0.72, pierTop)
  ctx.lineTo(outerX, pierTop - height * 0.055)
  ctx.lineTo(outerX + pierWidth * 0.72, pierTop)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}

const drawGroundDetails = (ctx: CanvasRenderingContext2D, width: number, height: number, horizon: number, time: number) => {
  const pixel = Math.max(2, width * 0.0018)
  const groundTop = horizon + height * 0.02
  const pathVanishingX = width * 0.505
  const pathBottomY = height * 1.04

  // Hand-laid path: broad perspective slabs with irregular joints, rather than a single flat trapezoid.
  ctx.save()
  ctx.globalAlpha = 0.76
  for (let row = 0; row < 12; row += 1) {
    const near = row / 12
    const next = (row + 1) / 12
    const y0 = groundTop + Math.pow(near, 1.62) * (pathBottomY - groundTop)
    const y1 = groundTop + Math.pow(next, 1.62) * (pathBottomY - groundTop)
    const half0 = width * (0.035 + near * 0.31)
    const half1 = width * (0.035 + next * 0.31)
    const wobble = (stoneNoise(row * 17 + 3) - 0.5) * width * 0.012
    ctx.fillStyle = row % 2 === 0 ? 'rgba(67, 48, 56, 0.56)' : 'rgba(48, 36, 45, 0.66)'
    ctx.strokeStyle = 'rgba(138, 107, 105, 0.28)'
    ctx.lineWidth = Math.max(1, pixel * 0.45)
    ctx.beginPath()
    ctx.moveTo(pathVanishingX - half0 + wobble, y0)
    ctx.lineTo(pathVanishingX + half0 + wobble, y0)
    ctx.lineTo(pathVanishingX + half1 + wobble, y1)
    ctx.lineTo(pathVanishingX - half1 + wobble, y1)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    const splitCount = 3 + (row % 3)
    for (let split = 1; split < splitCount; split += 1) {
      const ratio = split / splitCount + (stoneNoise(row * 31 + split) - 0.5) * 0.08
      const topX = pathVanishingX - half0 + ratio * half0 * 2 + wobble
      const bottomX = pathVanishingX - half1 + ratio * half1 * 2 + wobble
      ctx.beginPath()
      ctx.moveTo(topX, y0)
      ctx.lineTo(bottomX, y1)
      ctx.stroke()
    }
  }
  ctx.restore()

  // Rain pools catch a thin, broken reflection from the sky and keep the lower frame alive.
  const puddles = [
    { x: 0.16, y: 0.91, rx: 0.09, ry: 0.018, tilt: -0.08 },
    { x: 0.39, y: 0.78, rx: 0.055, ry: 0.012, tilt: 0.04 },
    { x: 0.78, y: 0.94, rx: 0.12, ry: 0.022, tilt: 0.06 },
    { x: 0.61, y: 0.84, rx: 0.045, ry: 0.009, tilt: -0.03 },
  ]
  puddles.forEach((puddle, index) => {
    const x = width * puddle.x
    const y = height * puddle.y
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(puddle.tilt)
    ctx.fillStyle = 'rgba(19, 28, 35, 0.52)'
    ctx.strokeStyle = 'rgba(181, 161, 151, 0.22)'
    ctx.lineWidth = Math.max(1, pixel * 0.42)
    ctx.beginPath()
    ctx.ellipse(0, 0, width * puddle.rx, height * puddle.ry, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.strokeStyle = index % 2 === 0 ? 'rgba(209, 190, 170, 0.26)' : 'rgba(155, 105, 111, 0.22)'
    ctx.beginPath()
    ctx.moveTo(-width * puddle.rx * 0.62, -pixel)
    ctx.quadraticCurveTo(0, -height * puddle.ry * 0.42, width * puddle.rx * 0.56, -pixel * 0.5)
    ctx.stroke()
    ctx.restore()
  })

  // Grass, leaves and stones use the same deterministic seed as the graves, so every visit remains reproducible.
  ctx.save()
  for (let index = 0; index < 84; index += 1) {
    const x = width * (0.02 + stoneNoise(index * 13 + 7) * 0.96)
    const y = height * (0.76 + stoneNoise(index * 17 + 4) * 0.25)
    const size = pixel * (0.8 + stoneNoise(index * 23 + 8) * 2.5)
    if (index % 4 === 0) {
      ctx.fillStyle = index % 8 === 0 ? 'rgba(142, 119, 105, 0.46)' : 'rgba(93, 75, 80, 0.58)'
      ctx.beginPath()
      ctx.moveTo(x - size * 2, y)
      ctx.lineTo(x - size, y - size * 1.4)
      ctx.lineTo(x + size * 1.2, y - size * 0.65)
      ctx.lineTo(x + size * 2.2, y)
      ctx.closePath()
      ctx.fill()
    } else {
      ctx.strokeStyle = index % 3 === 0 ? 'rgba(96, 125, 87, 0.72)' : 'rgba(72, 92, 76, 0.55)'
      ctx.lineWidth = Math.max(1, pixel * 0.5)
      ctx.beginPath()
      ctx.moveTo(x, y + size * 1.8)
      ctx.lineTo(x - size * 0.6, y - size * 1.3)
      ctx.moveTo(x + size * 0.3, y + size * 1.6)
      ctx.lineTo(x + size * 0.95, y - size * 0.9)
      ctx.stroke()
    }
  }
  ctx.restore()

  // A slow, broken highlight on the wet stones gives the ground a hand-painted animation glint.
  if (time > 0) {
    const glintX = width * (0.18 + ((time / 1000) % 7) * 0.1)
    const glintY = height * 0.88
    ctx.fillStyle = 'rgba(227, 210, 183, 0.16)'
    ctx.fillRect(glintX, glintY, pixel * 3.2, pixel * 0.7)
    ctx.fillRect(glintX + pixel * 4, glintY + pixel * 1.2, pixel * 1.3, pixel * 0.55)
  }
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
    ctx.globalAlpha = 0.42
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
  for (let index = 0; index < 14; index += 1) {
    const treeX = width * (index / 13) - width * 0.04 + (stoneNoise(index * 7 + 2) - 0.5) * width * 0.018
    const treeHeight = height * (0.15 + (index % 5) * 0.032)
    const treeWidth = width * (0.06 + stoneNoise(index * 13 + 5) * 0.032)
    drawDeadTree(ctx, treeX, horizon + height * 0.11, treeHeight, treeWidth, index * 83 + 19, index % 3 === 0 ? 0.78 : 0.92)
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
  ctx.lineTo(-towerWidth * 0.39, horizon - height * 0.16)
  ctx.lineTo(-towerWidth * 0.28, horizon - height * 0.22)
  ctx.lineTo(0, horizon - height * 0.43)
  ctx.lineTo(towerWidth * 0.28, horizon - height * 0.22)
  ctx.lineTo(towerWidth * 0.39, horizon - height * 0.16)
  ctx.lineTo(towerWidth * 0.46, towerBase)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  // Stepped eaves and a needle finial make the roof read as pointed Gothic architecture.
  ctx.strokeStyle = 'rgba(174, 139, 111, 0.5)'
  ctx.lineWidth = Math.max(1, width * 0.0013)
  ctx.beginPath()
  ctx.moveTo(-towerWidth * 0.3, horizon - height * 0.22)
  ctx.lineTo(-towerWidth * 0.24, horizon - height * 0.27)
  ctx.lineTo(0, horizon - height * 0.44)
  ctx.lineTo(towerWidth * 0.24, horizon - height * 0.27)
  ctx.lineTo(towerWidth * 0.3, horizon - height * 0.22)
  ctx.stroke()
  // Tiny crockets along the roof edge add repeated carved ornament without turning the roof into noise.
  ctx.fillStyle = 'rgba(181, 143, 106, 0.58)'
  for (const side of [-1, 1]) {
    for (let ornament = 1; ornament < 4; ornament += 1) {
      const ratio = ornament / 4
      const ornamentX = side * towerWidth * (0.3 - ratio * 0.24)
      const ornamentY = horizon - height * (0.22 + ratio * 0.18)
      ctx.beginPath()
      ctx.moveTo(ornamentX, ornamentY - height * 0.012)
      ctx.lineTo(ornamentX + side * towerWidth * 0.025, ornamentY)
      ctx.lineTo(ornamentX, ornamentY + height * 0.018)
      ctx.closePath()
      ctx.fill()
    }
  }
  ctx.strokeStyle = '#af8355'
  ctx.lineWidth = Math.max(1.2, width * 0.0018)
  ctx.beginPath()
  ctx.moveTo(0, horizon - height * 0.43)
  ctx.lineTo(0, horizon - height * 0.53)
  ctx.moveTo(-towerWidth * 0.035, horizon - height * 0.5)
  ctx.lineTo(towerWidth * 0.035, horizon - height * 0.5)
  ctx.stroke()
  ctx.fillStyle = '#211922'
  ctx.fillRect(-towerWidth * 0.34, horizon - height * 0.2, towerWidth * 0.68, height * 0.42)
  ctx.strokeRect(-towerWidth * 0.34, horizon - height * 0.2, towerWidth * 0.68, height * 0.42)
  for (const side of [-1, 1]) {
    const turretX = side * towerWidth * 0.33
    const turretBase = horizon - height * 0.12
    const turretTop = horizon - height * 0.31
    ctx.fillStyle = '#121018'
    ctx.strokeStyle = 'rgba(126, 98, 104, 0.7)'
    ctx.lineWidth = Math.max(1, width * 0.0011)
    ctx.beginPath()
    ctx.moveTo(turretX - towerWidth * 0.075, turretBase)
    ctx.lineTo(turretX - towerWidth * 0.065, turretTop + height * 0.04)
    ctx.lineTo(turretX, turretTop)
    ctx.lineTo(turretX + towerWidth * 0.065, turretTop + height * 0.04)
    ctx.lineTo(turretX + towerWidth * 0.075, turretBase)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = 'rgba(196, 166, 133, 0.45)'
    ctx.fillRect(turretX - towerWidth * 0.018, turretBase - height * 0.1, towerWidth * 0.036, height * 0.045)
    ctx.fillStyle = '#08090e'
    ctx.beginPath()
    ctx.moveTo(turretX - towerWidth * 0.028, turretBase - height * 0.04)
    ctx.lineTo(turretX - towerWidth * 0.025, turretBase - height * 0.12)
    ctx.quadraticCurveTo(turretX, turretBase - height * 0.17, turretX + towerWidth * 0.025, turretBase - height * 0.12)
    ctx.lineTo(turretX + towerWidth * 0.028, turretBase - height * 0.04)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = 'rgba(184, 142, 104, 0.62)'
    ctx.lineWidth = Math.max(0.9, width * 0.0011)
    ctx.beginPath()
    ctx.moveTo(turretX, turretTop)
    ctx.lineTo(turretX, turretTop - height * 0.055)
    ctx.moveTo(turretX - towerWidth * 0.018, turretTop - height * 0.04)
    ctx.lineTo(turretX + towerWidth * 0.018, turretTop - height * 0.04)
    ctx.stroke()
  }
  // A second, wider pair of pinnacled towers establishes the cathedral's outer rhythm.
  for (const side of [-1, 1]) {
    drawSecondarySpire(
      ctx,
      side * towerWidth * 0.61,
      horizon + height * 0.045,
      towerWidth * 0.2,
      height * 0.34,
      side,
    )
  }
  // Narrow masonry courses and buttresses keep the tower from reading as one filled rectangle.
  ctx.strokeStyle = 'rgba(135, 104, 111, 0.28)'
  ctx.lineWidth = Math.max(1, width * 0.001)
  for (let course = 0; course < 6; course += 1) {
    const courseY = horizon - height * 0.15 + course * height * 0.058
    ctx.beginPath()
    ctx.moveTo(-towerWidth * 0.34, courseY)
    ctx.lineTo(towerWidth * 0.34, courseY)
    ctx.stroke()
    for (let block = -2; block < 3; block += 1) {
      const blockX = towerWidth * (block * 0.18 + (course % 2 ? 0.08 : 0))
      ctx.beginPath()
      ctx.moveTo(blockX, courseY)
      ctx.lineTo(blockX, courseY + height * 0.052)
      ctx.stroke()
    }
  }
  // Tracery windows break the facade into real voids: dark openings, leaded bars and a small rose window.
  drawTowerWindow(ctx, -towerWidth * 0.18, horizon - height * 0.12, towerWidth * 0.17, height * 0.13)
  drawTowerWindow(ctx, towerWidth * 0.18, horizon - height * 0.12, towerWidth * 0.17, height * 0.13)
  drawTowerWindow(ctx, 0, horizon - height * 0.2, towerWidth * 0.28, height * 0.14, true)
  ctx.strokeStyle = 'rgba(180, 142, 112, 0.5)'
  ctx.lineWidth = Math.max(1, width * 0.0012)
  for (const side of [-1, 1]) {
    const reliefX = side * towerWidth * 0.29
    const reliefY = horizon - height * 0.01
    ctx.beginPath()
    ctx.arc(reliefX, reliefY, towerWidth * 0.045, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(reliefX - towerWidth * 0.032, reliefY)
    ctx.lineTo(reliefX + towerWidth * 0.032, reliefY)
    ctx.moveTo(reliefX, reliefY - towerWidth * 0.032)
    ctx.lineTo(reliefX, reliefY + towerWidth * 0.032)
    ctx.stroke()
  }
  ctx.fillStyle = '#352630'
  ctx.beginPath()
  ctx.moveTo(-towerWidth * 0.45, towerBase)
  ctx.lineTo(-towerWidth * 0.35, horizon - height * 0.16)
  ctx.lineTo(-towerWidth * 0.31, horizon - height * 0.12)
  ctx.lineTo(-towerWidth * 0.39, towerBase)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(towerWidth * 0.45, towerBase)
  ctx.lineTo(towerWidth * 0.35, horizon - height * 0.16)
  ctx.lineTo(towerWidth * 0.31, horizon - height * 0.12)
  ctx.lineTo(towerWidth * 0.39, towerBase)
  ctx.closePath()
  ctx.fill()
  // Two stacked flying buttresses on each side make the side load-bearing structure legible.
  for (const side of [-1, 1]) {
    drawFlyingButtress(ctx, side, towerWidth, towerBase, horizon, height, 0)
    drawFlyingButtress(ctx, side, towerWidth, towerBase, horizon, height, 1)
  }
  ctx.fillStyle = '#08080c'
  ctx.beginPath()
  ctx.arc(0, horizon - height * 0.08, towerWidth * 0.18, Math.PI, 0)
  ctx.lineTo(towerWidth * 0.18, horizon + height * 0.02)
  ctx.lineTo(-towerWidth * 0.18, horizon + height * 0.02)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = 'rgba(201, 180, 152, 0.45)'
  ctx.beginPath()
  ctx.arc(-towerWidth * 0.09, horizon - height * 0.075, towerWidth * 0.014, 0, Math.PI * 2)
  ctx.arc(towerWidth * 0.09, horizon - height * 0.075, towerWidth * 0.014, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(193, 167, 141, 0.46)'
  ctx.lineWidth = Math.max(1, width * 0.0012)
  ctx.beginPath()
  ctx.moveTo(0, horizon - height * 0.2)
  ctx.lineTo(0, horizon - height * 0.03)
  ctx.moveTo(-towerWidth * 0.17, horizon - height * 0.11)
  ctx.lineTo(towerWidth * 0.17, horizon - height * 0.11)
  ctx.stroke()
  drawAngelStatue(ctx, 0, horizon - height * 0.43, towerWidth * 0.34)
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

  drawGroundDetails(ctx, width, height, horizon, time)

  // Small distant graves establish multiple depth bands before the readable foreground stones.
  ctx.save()
  ctx.translate(parallax(0.18), 0)
  for (let row = 0; row < 3; row += 1) {
    const count = 15 - row * 2
    const rowY = horizon + height * (0.08 + row * 0.075)
    for (let index = 0; index < count; index += 1) {
      const seed = row * 100 + index
      const graveX = width * ((index + 0.4) / count) + (stoneNoise(seed) - 0.5) * width * 0.03
      const graveW = width * (0.018 + stoneNoise(seed + 4) * 0.014) * (1 + row * 0.18)
      const graveH = height * (0.05 + stoneNoise(seed + 8) * 0.035) * (1 + row * 0.14)
      ctx.fillStyle = row === 0 ? '#2a2029' : '#362731'
      ctx.strokeStyle = 'rgba(145, 118, 124, 0.38)'
      ctx.lineWidth = Math.max(1, width * 0.001)
      ctx.beginPath()
      ctx.moveTo(graveX - graveW / 2, rowY)
      ctx.lineTo(graveX - graveW * 0.42, rowY - graveH * 0.76)
      ctx.quadraticCurveTo(graveX, rowY - graveH, graveX + graveW * 0.42, rowY - graveH * 0.76)
      ctx.lineTo(graveX + graveW / 2, rowY)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      if (index % 3 === 0) {
        ctx.strokeStyle = 'rgba(208, 183, 150, 0.24)'
        ctx.beginPath()
        ctx.moveTo(graveX, rowY - graveH * 0.66)
        ctx.lineTo(graveX, rowY - graveH * 0.28)
        ctx.moveTo(graveX - graveW * 0.18, rowY - graveH * 0.48)
        ctx.lineTo(graveX + graveW * 0.18, rowY - graveH * 0.48)
        ctx.stroke()
      }
    }
  }
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

  // Foreground stones are deliberately oversized: the cemetery should read as a place, not a backdrop.
  const stones = [
    { x: 0.08, y: 0.94, w: 0.2, h: 0.34, tilt: -0.07, tone: '#52434b', detail: 'broken' as StoneDetail },
    { x: 0.27, y: 0.87, w: 0.13, h: 0.22, tilt: 0.025, tone: '#3d3039', detail: 'cross' as StoneDetail },
    { x: 0.505, y: 0.9, w: 0.29, h: 0.38, tilt: -0.012, tone: '#67545a', detail: 'arch' as StoneDetail, inscription: '致爱丽丝·利德尔' },
    { x: 0.745, y: 0.89, w: 0.16, h: 0.27, tilt: 0.045, tone: '#40323d', detail: 'obelisk' as StoneDetail },
    { x: 0.94, y: 0.95, w: 0.22, h: 0.36, tilt: -0.045, tone: '#4c3b45', detail: 'cross' as StoneDetail },
  ]
  stones.forEach((stone, index) => {
    drawTombstone(
      ctx,
      width * stone.x + parallax(0.47 + index * 0.01),
      height * stone.y,
      width * stone.w,
      height * stone.h,
      stone.tilt,
      stone.tone,
      stone.detail,
      index,
      stone.inscription,
    )
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
    dispatchAnnouncement('正在进入图书馆之梦')
    window.location.hash = '#/library'
  }

  const enterClockTower = () => {
    dispatchAnnouncement('正在进入钟楼回响')
    window.location.hash = '#/clocktower'
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
            aria-label="进入图书馆之梦"
          >
            <BookOpen aria-hidden="true" />
            <span>图书馆之梦</span>
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
            onClick={enterClockTower}
            aria-label="进入钟楼回响数字祷告室"
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
