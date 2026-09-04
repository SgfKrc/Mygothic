import { ArrowLeft, Dices, DoorOpen, Move3d, RefreshCw, RotateCw, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import './bone-garden.css'

type BoneGardenSceneProps = {
  reducedMotion?: boolean
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const seededRandom = (seed: number) => {
  let state = (seed >>> 0) || 0x7f4a7c15
  return () => {
    state = Math.imul(state ^ (state >>> 16), 2246822507)
    state = Math.imul(state ^ (state >>> 13), 3266489909)
    return ((state ^ (state >>> 16)) >>> 0) / 4294967296
  }
}

const randomSeed = () => Math.floor(Math.random() * 900000000) + 100000000

const drawPointedArch = (ctx: CanvasRenderingContext2D, x: number, base: number, width: number, height: number, fill: string, stroke: string, lineWidth: number) => {
  const left = x - width / 2
  const right = x + width / 2
  const shoulder = base - height * .57
  ctx.beginPath()
  ctx.moveTo(left, base)
  ctx.lineTo(left, shoulder)
  ctx.quadraticCurveTo(left, base - height * .78, x, base - height)
  ctx.quadraticCurveTo(right, base - height * .78, right, shoulder)
  ctx.lineTo(right, base)
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
  ctx.strokeStyle = stroke
  ctx.lineWidth = lineWidth
  ctx.stroke()
}

const drawBone = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, width: number, alpha = 1, warm = false) => {
  const gradient = ctx.createLinearGradient(x1, y1, x2, y2)
  gradient.addColorStop(0, warm ? `rgba(183, 148, 97, ${alpha * .68})` : `rgba(199, 203, 190, ${alpha * .7})`)
  gradient.addColorStop(.5, warm ? `rgba(236, 205, 144, ${alpha})` : `rgba(237, 234, 211, ${alpha})`)
  gradient.addColorStop(1, warm ? `rgba(129, 97, 62, ${alpha * .68})` : `rgba(149, 155, 148, ${alpha * .72})`)
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = gradient
  ctx.lineWidth = width
  ctx.shadowColor = warm ? `rgba(223, 174, 93, ${alpha * .22})` : `rgba(238, 234, 204, ${alpha * .15})`
  ctx.shadowBlur = Math.max(1.4, width * .9)
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
  ctx.restore()
}

const drawCurvedBone = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, bend: number, width: number, alpha = 1, warm = false) => {
  const gradient = ctx.createLinearGradient(x1, y1, x2, y2)
  gradient.addColorStop(0, warm ? `rgba(173, 135, 83, ${alpha * .6})` : `rgba(190, 196, 184, ${alpha * .6})`)
  gradient.addColorStop(.52, warm ? `rgba(235, 199, 133, ${alpha})` : `rgba(233, 232, 211, ${alpha})`)
  gradient.addColorStop(1, warm ? `rgba(125, 94, 60, ${alpha * .64})` : `rgba(141, 150, 142, ${alpha * .7})`)
  ctx.save()
  ctx.strokeStyle = gradient
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = width
  ctx.shadowColor = warm ? 'rgba(214, 166, 84, .18)' : 'rgba(228, 232, 211, .13)'
  ctx.shadowBlur = Math.max(1.2, width * .8)
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.quadraticCurveTo((x1 + x2) * .5 + bend, (y1 + y2) * .5, x2, y2)
  ctx.stroke()
  ctx.restore()
}

const drawSkull = (ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, alpha: number, warm: boolean) => {
  ctx.save()
  ctx.translate(x, y)
  ctx.globalAlpha = alpha
  const bone = warm ? '#dfbd7f' : '#dddcc8'
  const shade = warm ? '#876740' : '#838a82'
  ctx.fillStyle = shade
  ctx.strokeStyle = bone
  ctx.lineWidth = Math.max(2.2, scale * 3)
  ctx.beginPath()
  ctx.moveTo(-27 * scale, 8 * scale)
  ctx.quadraticCurveTo(-31 * scale, -31 * scale, 0, -42 * scale)
  ctx.quadraticCurveTo(31 * scale, -31 * scale, 27 * scale, 8 * scale)
  ctx.lineTo(18 * scale, 26 * scale)
  ctx.lineTo(-18 * scale, 26 * scale)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#0c1012'
  ctx.beginPath()
  ctx.ellipse(-11 * scale, -12 * scale, 7.5 * scale, 9 * scale, -.16, 0, Math.PI * 2)
  ctx.ellipse(11 * scale, -12 * scale, 7.5 * scale, 9 * scale, .16, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(-8 * scale, 9 * scale)
  ctx.lineTo(8 * scale, 9 * scale)
  ctx.lineTo(5 * scale, 18 * scale)
  ctx.lineTo(-5 * scale, 18 * scale)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = `rgba(246, 237, 200, ${alpha * .55})`
  ctx.lineWidth = Math.max(1, scale)
  for (let tooth = -2; tooth <= 2; tooth += 1) {
    ctx.beginPath()
    ctx.moveTo(tooth * 4 * scale, 10 * scale)
    ctx.lineTo(tooth * 4 * scale, 20 * scale)
    ctx.stroke()
  }
  ctx.restore()
}

const drawBranchTree = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  length: number,
  angle: number,
  thickness: number,
  depth: number,
  random: () => number,
  growth: number,
  warm: boolean,
  layerAlpha: number,
) => {
  if (depth <= 0 || growth <= .01) return
  const reach = length * clamp(growth * (1 + depth * .035), .02, 1)
  const endX = x + Math.cos(angle) * reach
  const endY = y + Math.sin(angle) * reach
  const alpha = layerAlpha * (.58 + depth * .09)
  drawCurvedBone(ctx, x, y, endX, endY, (random() - .5) * length * .2, Math.max(.95, thickness), alpha, warm)

  ctx.save()
  ctx.globalAlpha = alpha * .82
  ctx.fillStyle = warm ? '#ae8653' : '#aeb9ae'
  ctx.beginPath()
  ctx.arc(endX, endY, Math.max(1.8, thickness * 1.3), 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  if (depth === 1) {
    const tips = 2 + Math.floor(random() * 3)
    for (let tip = 0; tip < tips; tip += 1) {
      const tipCentered = tip - (tips - 1) / 2
      const tipAngle = angle + tipCentered * (.54 + random() * .3) + (random() - .5) * .22
      const tipLength = length * (.2 + random() * .22)
      drawCurvedBone(ctx, endX, endY, endX + Math.cos(tipAngle) * tipLength, endY + Math.sin(tipAngle) * tipLength, (random() - .5) * tipLength * .25, thickness * .46, alpha * .8, warm)
    }
    return
  }

  // Every node gets its own child count and spread, so the seed changes topology rather than just hue.
  const children = 2 + (depth > 2 && random() > .73 ? 1 : 0)
  const spread = .58 + random() * .38
  const lean = (random() - .5) * .22
  for (let child = 0; child < children; child += 1) {
    const centered = child - (children - 1) / 2
    const childAngle = clamp(angle + centered * spread + lean + (random() - .5) * .16, -Math.PI + .3, -.24)
    const childLength = length * (.56 + random() * .2)
    drawBranchTree(ctx, endX, endY, childLength, childAngle, thickness * (.64 + random() * .15), depth - 1, random, growth, warm, layerAlpha * (.92 + random() * .08))
  }
}

const drawFractalFork = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  length: number,
  angle: number,
  thickness: number,
  depth: number,
  random: () => number,
  growth: number,
  warm: boolean,
  alpha: number,
) => {
  if (depth <= 0 || growth <= .01) return
  const reach = length * clamp(growth * (1 + depth * .08), .04, 1)
  const endX = x + Math.cos(angle) * reach
  const endY = y + Math.sin(angle) * reach
  drawCurvedBone(ctx, x, y, endX, endY, (random() - .5) * length * .3, Math.max(1.05, thickness), alpha, warm)
  ctx.save()
  ctx.globalAlpha = alpha * .72
  ctx.fillStyle = warm ? '#b58b56' : '#a9bcb0'
  ctx.beginPath()
  ctx.arc(endX, endY, Math.max(1.6, thickness * 1.12), 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
  if (depth === 1) {
    for (let tip = 0; tip < 2; tip += 1) {
      const tipAngle = angle + (tip ? 1 : -1) * (.22 + random() * .28)
      const tipLength = length * (.28 + random() * .13)
      drawCurvedBone(ctx, endX, endY, endX + Math.cos(tipAngle) * tipLength, endY + Math.sin(tipAngle) * tipLength, (random() - .5) * 4, thickness * .38, alpha * .78, warm)
    }
    return
  }
  const children = depth > 2 && random() > .55 ? 3 : 2
  const spread = .32 + random() * .36
  for (let child = 0; child < children; child += 1) {
    const centered = child - (children - 1) / 2
    const childAngle = angle + centered * spread + (random() - .5) * .18
    drawFractalFork(ctx, endX, endY, length * (.48 + random() * .16), childAngle, thickness * (.56 + random() * .12), depth - 1, random, growth, warm, alpha * .78)
  }
}

const drawRibCageMotif = (
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  height: number,
  width: number,
  random: () => number,
  warm: boolean,
  alpha: number,
) => {
  const ribCount = 5 + Math.floor(random() * 3)
  const topY = baseY - height * .82
  const spineHeight = height * .58
  drawCurvedBone(ctx, x, topY, x + (random() - .5) * width * .08, topY + spineHeight, (random() - .5) * 8, Math.max(2, width * .018), alpha * .72, warm)
  for (let rib = 0; rib < ribCount; rib += 1) {
    const ratio = rib / Math.max(1, ribCount - 1)
    const y = topY + height * (.12 + ratio * .48)
    const span = width * (.24 + (1 - Math.abs(ratio - .48) * 1.3) * .17) * (.88 + random() * .18)
    const sag = height * (.055 + random() * .035)
    drawCurvedBone(ctx, x, y, x - span, y + sag, -span * (.28 + random() * .16), Math.max(1.35, width * (.011 - ratio * .002)), alpha * (.66 - ratio * .12), warm)
    drawCurvedBone(ctx, x, y + height * .012, x + span, y + sag, span * (.28 + random() * .16), Math.max(1.35, width * (.011 - ratio * .002)), alpha * (.66 - ratio * .12), warm)
  }
}

const drawBoneVines = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  height: number,
  width: number,
  side: -1 | 1,
  random: () => number,
  warm: boolean,
  alpha: number,
) => {
  const startX = x + side * width * .12
  const endX = x + side * width * (.68 + random() * .2)
  const endY = y - height * (.38 + random() * .2)
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.strokeStyle = warm ? '#bd925d' : '#a9c2b7'
  ctx.lineWidth = Math.max(1, width * .012)
  ctx.beginPath()
  ctx.moveTo(startX, y)
  ctx.bezierCurveTo(startX + side * width * .2, y - height * .12, endX - side * width * .28, endY + height * .14, endX, endY)
  ctx.stroke()
  for (let loop = 0; loop < 3; loop += 1) {
    const progress = .35 + loop * .2
    const px = startX + (endX - startX) * progress
    const py = y + (endY - y) * progress
    ctx.beginPath()
    ctx.arc(px + side * width * .035, py, width * (.045 + random() * .018), Math.PI * .2, Math.PI * 1.8)
    ctx.stroke()
  }
  ctx.restore()
}

// A structured, tiered tree keeps each seed's silhouette legible while retaining
// enough variation in crown width, lean and fork spacing to make redraws distinct.
const drawTieredBoneTree = (
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  height: number,
  width: number,
  lean: number,
  thickness: number,
  tiers: number,
  pattern: number,
  random: () => number,
  growth: number,
  warm: boolean,
  alpha: number,
) => {
  if (growth <= .01) return
  const visibleHeight = height * clamp(growth, .02, 1)
  const topX = Math.sin(lean) * visibleHeight * (.16 + pattern * .025)
  const trunkBend = (random() - .5) * height * .08
  drawCurvedBone(ctx, x, baseY, x + topX, baseY - visibleHeight, trunkBend, thickness * 1.18, alpha * .95, warm)

  const tierTotal = Math.max(3, Math.min(7, tiers + (pattern === 3 ? 1 : 0)))
  for (let tier = 0; tier < tierTotal; tier += 1) {
    const ratioBase = tier / Math.max(1, tierTotal - 1)
    const ratio = .16 + ratioBase * (.7 + pattern * .025) + Math.sin(tier * 1.3 + lean) * .018
    const branchY = baseY - visibleHeight * ratio
    const trunkX = x + topX * ratio + Math.sin(tier * 1.7 + lean) * height * (.018 + pattern * .006)
    const spread = width * (.34 + ratio * (.62 + pattern * .05)) * (.78 + random() * .34)
    const branchAlpha = alpha * (.76 - tier * .045)
    const branchThickness = Math.max(1.3, thickness * (.94 - tier * .075))

    for (const side of [-1, 1] as const) {
      const sidePhase = pattern === 1 ? Math.sin(tier * .9 + side) * spread * .16 : 0
      const endX = trunkX + side * spread + sidePhase
      const endY = branchY - visibleHeight * (.018 + random() * .035)
      const bend = side * spread * (.1 + (random() - .5) * .13)
      drawCurvedBone(ctx, trunkX, branchY, endX, endY, bend, branchThickness, branchAlpha, warm)

      // Each bough grows a small recursive fork system rather than a single
      // decorative tine, making the seed change the actual topology.
      const forkAngle = -Math.PI / 2 + side * (.26 + random() * .46) + (pattern === 2 ? side * .14 : 0)
      const forkDepth = 1 + Math.floor(random() * 2) + (pattern === 3 && tier % 2 === 0 ? 1 : 0)
      drawFractalFork(ctx, endX, endY, visibleHeight * (.12 + random() * .09), forkAngle, branchThickness * .58, forkDepth, random, growth, warm, branchAlpha * .86)

      ctx.save()
      ctx.globalAlpha = branchAlpha * .78
      ctx.fillStyle = warm ? '#b78e58' : '#aab9b0'
      ctx.beginPath()
      ctx.arc(endX, endY, Math.max(2, branchThickness * 1.12), 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    // A faint connecting arc gives the crown a layered, nebula-like contour.
    ctx.save()
    ctx.globalAlpha = alpha * (.08 + (1 - tier / tierTotal) * .08)
    ctx.strokeStyle = warm ? '#c49b61' : '#aec7bb'
    ctx.lineWidth = Math.max(.8, thickness * .24)
    ctx.beginPath()
    ctx.ellipse(trunkX, branchY + visibleHeight * .016, spread * .94, visibleHeight * (.025 + random() * .018), 0, Math.PI, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }

  if (pattern === 1 || pattern === 3) drawRibCageMotif(ctx, x + topX * .08, baseY - visibleHeight * .08, visibleHeight * .72, width * .68, random, warm, alpha * .32)
  if (pattern === 2 || pattern === 3) {
    drawBoneVines(ctx, x, baseY - visibleHeight * .08, visibleHeight, width, -1, random, warm, alpha * .42)
    drawBoneVines(ctx, x, baseY - visibleHeight * .14, visibleHeight * .92, width, 1, random, warm, alpha * .36)
  }
}

const drawBoneNebula = (
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  width: number,
  height: number,
  time: number,
  reducedMotion: boolean,
  random: () => number,
  warm: boolean,
  resonance: number,
) => {
  const radius = Math.min(width, height) * (.31 + random() * .08) * (1 + resonance * .1)
  const drift = reducedMotion ? 0 : Math.sin(time * .00032) * width * .012
  ctx.save()
  ctx.translate(centerX + drift, centerY)
  ctx.globalCompositeOperation = 'screen'

  const cloud = ctx.createRadialGradient(0, 0, radius * .04, 0, 0, radius)
  cloud.addColorStop(0, warm ? `rgba(226, 178, 111, ${.32 + resonance * .2})` : `rgba(190, 224, 206, ${.3 + resonance * .18})`)
  cloud.addColorStop(.32, warm ? `rgba(145, 86, 76, ${.24 + resonance * .1})` : `rgba(89, 133, 133, ${.22 + resonance * .1})`)
  cloud.addColorStop(.72, warm ? `rgba(69, 31, 49, ${.13 + resonance * .05})` : `rgba(37, 66, 75, ${.12 + resonance * .05})`)
  cloud.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = cloud
  ctx.beginPath()
  ctx.ellipse(0, 0, radius * 1.25, radius * .62, -.12, 0, Math.PI * 2)
  ctx.fill()

  // Layered elliptical lanes give the cloud a coherent spiral instead of random crossing lines.
  ctx.lineCap = 'round'
  for (let lane = 0; lane < 6; lane += 1) {
    const laneRatio = lane / 6
    const laneWidth = radius * (.22 + laneRatio * .72)
    const laneHeight = radius * (.08 + laneRatio * .29)
    const phase = (random() - .5) * .22 + (reducedMotion ? 0 : time * (.00008 + resonance * .00012) * (lane % 2 ? 1 : -1))
    ctx.save()
    ctx.rotate(phase)
    ctx.globalAlpha = .035 + (1 - laneRatio) * .075 + resonance * .08
    ctx.strokeStyle = lane % 3 === 0 ? (warm ? '#d6a267' : '#b7d3c7') : (warm ? '#8a5660' : '#718d98')
    ctx.lineWidth = Math.max(1, radius * (.006 - laneRatio * .002))
    ctx.beginPath()
    ctx.ellipse(0, 0, laneWidth, laneHeight, 0, Math.PI * .04, Math.PI * 1.92)
    ctx.stroke()
    ctx.restore()
  }

  // Stars are concentrated in the core and fade into a dusty halo.
  for (let star = 0; star < 92; star += 1) {
    const angle = random() * Math.PI * 2
    const distance = Math.pow(random(), .62) * radius * 1.08
    const x = Math.cos(angle) * distance * 1.2
    const y = Math.sin(angle) * distance * .55
    const size = Math.max(1, radius * (.004 + random() * .009))
    ctx.globalAlpha = .12 + (1 - distance / (radius * 1.08)) * .34 + resonance * .24
    ctx.fillStyle = star % 7 === 0 ? (warm ? '#eed08f' : '#dbf0d6') : (warm ? '#b78875' : '#9ebdb8')
    ctx.beginPath()
    ctx.arc(x, y, size, 0, Math.PI * 2)
    ctx.fill()
  }

  if (resonance > .01) {
    ctx.save()
    ctx.globalAlpha = resonance * .48
    ctx.strokeStyle = warm ? '#f0c678' : '#c9eee0'
    ctx.lineWidth = Math.max(1, radius * .008)
    for (let wave = 0; wave < 3; wave += 1) {
      const waveRatio = clamp(1 - resonance + wave * .18, .08, 1.1)
      ctx.beginPath()
      ctx.ellipse(0, 0, radius * (.2 + waveRatio * .88), radius * (.1 + waveRatio * .4), -.12, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.restore()
  }
  ctx.restore()
}

const drawBoneGarden = (ctx: CanvasRenderingContext2D, width: number, height: number, time: number, reducedMotion: boolean, seed: number, yaw: number, growth: number, resonance: number) => {
  const random = seededRandom(seed)
  const horizon = height * .47
  const unit = Math.max(1, Math.min(width, height) / 720)
  const pulse = reducedMotion ? 0 : Math.sin(time * .0017) * .5 + .5
  const warm = random() > .52

  ctx.clearRect(0, 0, width, height)
  const sky = ctx.createRadialGradient(width * .5, height * .37, 0, width * .5, height * .42, Math.max(width, height) * .8)
  sky.addColorStop(0, warm ? '#332720' : '#262b2d')
  sky.addColorStop(.34, '#17171d')
  sky.addColorStop(1, '#07090d')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, width, height)

  // Deep arched niches establish the garden's repeating, cathedral-like depth.
  const archCount = Math.max(5, Math.round(width / 230))
  for (let layer = 0; layer < 3; layer += 1) {
    const depth = layer / 3
    const count = archCount + layer * 2
    const span = width * (1.2 + depth * .3)
    const offset = ((yaw * (layer + 1) * 30) % (width / count)) - width * .1
    for (let index = -1; index <= count; index += 1) {
      const x = offset + (index + .5) * span / count
      const archWidth = span / count * (.75 - depth * .08)
      const archHeight = height * (.38 - depth * .025)
      drawPointedArch(ctx, x, horizon + height * (.16 + depth * .04), archWidth, archHeight, `rgba(${layer === 0 ? '65, 49, 45' : layer === 1 ? '38, 39, 45' : '19, 23, 29'}, ${.42 - depth * .08})`, `rgba(163, 139, 111, ${.16 - depth * .025})`, Math.max(1, unit * (2.2 - depth)))
      ctx.strokeStyle = `rgba(204, 183, 147, ${.12 - depth * .02})`
      ctx.lineWidth = Math.max(1, unit)
      for (let rib = 1; rib < 4; rib += 1) {
        const ribX = x - archWidth * .5 + archWidth * rib / 4
        ctx.beginPath()
        ctx.moveTo(ribX, horizon + height * (.16 + depth * .04))
        ctx.lineTo(x + (rib - 2.5) * archWidth * .08, horizon - archHeight * .53)
        ctx.stroke()
      }
    }
  }

  // Hanging vines and thin dust make the space feel alive without obscuring the subject.
  ctx.save()
  ctx.globalAlpha = .12
  ctx.strokeStyle = warm ? '#9d7c57' : '#98aaa1'
  ctx.lineWidth = Math.max(1, unit * .75)
  for (let index = 0; index < 10; index += 1) {
    const x = random() * width
    const length = height * (.04 + random() * .15)
    const sway = Math.sin(time * .0006 + index) * unit * 4
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.bezierCurveTo(x + sway, length * .34, x - sway, length * .72, x + sway * .4, length)
    ctx.stroke()
  }
  ctx.restore()

  // Perspective floor and recessed burial plots.
  const floor = ctx.createLinearGradient(0, horizon, 0, height)
  floor.addColorStop(0, '#262027')
  floor.addColorStop(1, '#0a0b0e')
  ctx.fillStyle = floor
  ctx.beginPath()
  ctx.moveTo(0, horizon)
  ctx.lineTo(width, horizon)
  ctx.lineTo(width, height)
  ctx.lineTo(0, height)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(190, 170, 137, .09)'
  ctx.lineWidth = Math.max(1, unit)
  for (let index = -5; index <= 5; index += 1) {
    const bottomX = width * .5 + index * width * .12
    ctx.beginPath()
    ctx.moveTo(width * .5, horizon)
    ctx.lineTo(bottomX, height)
    ctx.stroke()
  }
  for (let row = 1; row < 6; row += 1) {
    const y = horizon + (height - horizon) * Math.pow(row / 8, 1.72)
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }
  for (let index = 0; index < 9; index += 1) {
    const x = width * (.08 + random() * .84)
    const y = horizon + height * (.12 + random() * .25)
    const plotWidth = width * (.025 + random() * .05)
    ctx.fillStyle = `rgba(8, 9, 12, ${.42 + random() * .2})`
    ctx.fillRect(x, y, plotWidth, height * (.03 + random() * .045))
    drawBone(ctx, x + plotWidth * .2, y + 2 * unit, x + plotWidth * .78, y + height * (.018 + random() * .02), unit * (1.2 + random() * 1.8), .42)
  }

  drawBoneNebula(ctx, width * .5, height * .47, width, height, time, reducedMotion, random, warm, resonance)

  // A circular ossuary dais anchors the generated organism.
  const centerX = width * .5
  const centerY = height * .69
  ctx.save()
  ctx.translate(centerX, centerY)
  ctx.scale(1 + yaw * .025, 1)
  ctx.fillStyle = 'rgba(4, 5, 8, .72)'
  ctx.beginPath()
  ctx.ellipse(0, height * .055, width * .22, height * .055, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = warm ? 'rgba(206, 166, 101, .62)' : 'rgba(192, 208, 194, .5)'
  ctx.lineWidth = Math.max(1.2, unit * 1.45)
  ctx.beginPath()
  ctx.ellipse(0, height * .045, width * .19, height * .045, 0, 0, Math.PI * 2)
  ctx.stroke()
  ctx.globalAlpha = .5
  for (let ring = 1; ring < 4; ring += 1) {
    ctx.beginPath()
    ctx.ellipse(0, height * (.045 - ring * .008), width * (.19 - ring * .032), height * (.045 - ring * .008), 0, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.restore()

  // The garden is a layered forest of bone trees. Seed values alter counts, depth, lean and topology.
  const bodyScale = Math.min(width, height) / 620
  const sway = Math.sin(time * .0007 + (seed % 13)) * (reducedMotion ? 0 : .035)
  const visible = clamp(growth, .02, 1)
  const generationStyle = Math.abs(seed) % 4
  const treeCount = generationStyle === 2 ? 3 + Math.floor(random() * 2) : 2 + Math.floor(random() * 3)
  const layerCount = generationStyle === 1 ? 3 : 3 + Math.floor(random() * 2)
  const maxDepth = generationStyle === 2 ? 3 + Math.floor(random() * 2) : 2 + Math.floor(random() * 3)
  const canopyWidth = generationStyle === 3 ? 235 + random() * 150 : 125 + random() * 235
  const seedLean = (random() - .5) * (generationStyle === 3 ? 1.8 : 1.3)
  ctx.save()
  ctx.translate(centerX, centerY + height * .015)
  ctx.rotate(yaw * .22 + sway)
  ctx.scale(bodyScale * visible, bodyScale * visible)

  for (let layer = layerCount - 1; layer >= 0; layer -= 1) {
    const depth = layer / Math.max(1, layerCount - 1)
    const frontness = 1 - depth
    const treesInLayer = Math.max(1, treeCount - Math.floor(depth * (generationStyle === 2 ? .85 : 1.35)) + (random() > .7 ? 1 : 0))
    const layerScale = (generationStyle === 3 ? .48 : .56) + frontness * (generationStyle === 1 ? .5 : .42)
    const layerY = 48 + depth * (generationStyle === 1 ? 38 : 32) + random() * 16
    const layerAlpha = .1 + frontness * (generationStyle === 2 ? .3 : .25)
    const layerLean = seedLean * (.45 + frontness * (generationStyle === 3 ? .55 : .35))
    for (let tree = 0; tree < treesInLayer; tree += 1) {
      const centered = treesInLayer === 1 ? 0 : tree / (treesInLayer - 1) - .5
      const x = centered * canopyWidth * layerScale + (random() - .5) * 18
      const baseY = layerY + (random() - .5) * 20
      const heightFactor = ((generationStyle === 1 ? 148 : 124) + random() * (generationStyle === 2 ? 112 : 92)) * layerScale
      const trunkAngle = clamp(-Math.PI / 2 + layerLean + centered * (.14 + random() * (generationStyle === 3 ? .42 : .22)), -Math.PI + .3, -.24)
      const branchDepth = Math.max(3, maxDepth + 1 - Math.floor(depth * .8) + (random() > (generationStyle === 2 ? .55 : .8) ? 1 : 0))
      const thickness = (3.1 + random() * 2.1) * (.82 + frontness * .3)
      const treeWarm = random() > .36 ? warm : !warm
      const pattern = (generationStyle + layer + tree + Math.floor(random() * 2)) % 4
      drawTieredBoneTree(ctx, x, baseY, heightFactor, canopyWidth * (.19 + random() * .075) * layerScale, trunkAngle + Math.PI / 2, thickness, branchDepth + 1, pattern, random, visible, treeWarm, layerAlpha)
    }
  }

  // A seed-specific mother tree ties the layered branches back to the central bud.
  // Its lean and tier rhythm make the overall silhouette change dramatically per seed.
  const motherLean = seedLean * .7 + (random() - .5) * .18
  const motherDepth = maxDepth + (random() > .5 ? 1 : 0)
  const motherPattern = generationStyle
  drawTieredBoneTree(
    ctx,
    (random() - .5) * 18,
    72 + random() * 18,
    (generationStyle === 1 ? 250 : 194) + random() * (generationStyle === 3 ? 118 : 92),
    (generationStyle === 2 ? 158 : 102) + random() * (generationStyle === 1 ? 76 : 62),
    motherLean,
    4.2 + random() * 1.7,
    motherDepth + 1,
    motherPattern,
    random,
    visible,
    warm,
    .58,
  )

  // The oldest central tree carries a small skull-bud; the surrounding canopy remains purely branching.
  const budY = -188 - random() * (generationStyle === 1 ? 58 : 38)
  const budScale = .46 + random() * .18
  drawSkull(ctx, seedLean * 32, budY, budScale, .82 + random() * .18, warm)
  ctx.strokeStyle = warm ? 'rgba(221, 180, 108, .88)' : 'rgba(205, 219, 203, .84)'
  ctx.lineWidth = 3.2 + random() * 2
  ctx.beginPath()
  ctx.moveTo(seedLean * 42, budY + 20)
  ctx.lineTo(seedLean * 28, budY + 58)
  ctx.stroke()

  // A few front-layer branch silhouettes frame the garden and make the depth stack apparent.
  const foregroundBranches = random() > .58 ? 1 : 0
  for (let branch = 0; branch < foregroundBranches; branch += 1) {
    const side = branch % 2 === 0 ? -1 : 1
    const startX = side * (105 + random() * 95)
    const startY = 82 + random() * 26
    drawTieredBoneTree(ctx, startX, startY, 108 + random() * 54, 58 + random() * 24, side * (.2 + random() * .18), 2.2 + random() * 1.2, 3, Math.floor(random() * 4), random, visible, !warm, .11)
  }
  ctx.restore()

  // A sparse field of motes follows the current seed, so every regeneration has a distinct atmosphere.
  ctx.save()
  for (let mote = 0; mote < 36; mote += 1) {
    const x = random() * width
    const y = horizon + random() * (height - horizon)
    const radius = unit * (.45 + random() * 1.7)
    const drift = reducedMotion ? 0 : Math.sin(time * .0005 + mote) * unit * 5
    ctx.globalAlpha = .16 + random() * .33
    ctx.fillStyle = mote % 4 === 0 ? '#d6ad69' : '#b4c6bd'
    ctx.beginPath()
    ctx.arc(x + drift, y, radius, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()

  if (!reducedMotion) {
    ctx.save()
    ctx.globalAlpha = .04 + pulse * .04
    ctx.fillStyle = warm ? '#c99554' : '#aac7ba'
    ctx.fillRect(0, 0, width, height)
    ctx.restore()
  }
}

export default function BoneGardenScene({ reducedMotion = false }: BoneGardenSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const growthStartRef = useRef(0)
  const resonanceStartRef = useRef(0)
  const draggingRef = useRef(false)
  const lastPointerRef = useRef(0)
  const pointerStartRef = useRef({ x: 0, y: 0 })
  const pointerMovedRef = useRef(false)
  const [seed, setSeed] = useState(() => randomSeed())
  const [seedInput, setSeedInput] = useState(() => String(seed))
  const [yaw, setYaw] = useState(0)
  const [growing, setGrowing] = useState(!reducedMotion)
  const [autoOrbit, setAutoOrbit] = useState(false)
  const [resonanceCount, setResonanceCount] = useState(0)

  const regenerate = useCallback((nextSeed: number) => {
    const normalized = Math.abs(Math.trunc(nextSeed)) || randomSeed()
    growthStartRef.current = performance.now()
    setSeed(normalized)
    setSeedInput(String(normalized))
    setGrowing(!reducedMotion)
  }, [reducedMotion])

  const redrawFromInput = () => {
    const parsed = Number.parseInt(seedInput, 10)
    regenerate(Number.isFinite(parsed) ? parsed : randomSeed())
  }

  const resonate = useCallback(() => {
    resonanceStartRef.current = performance.now()
    setResonanceCount((value) => value + 1)
  }, [])

  useEffect(() => {
    growthStartRef.current = performance.now()
    if (reducedMotion) {
      setGrowing(false)
      return
    }
    const timer = window.setTimeout(() => setGrowing(false), 1750)
    return () => window.clearTimeout(timer)
  }, [seed, reducedMotion])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target instanceof Element ? event.target : null
      if (event.code !== 'Space' || target?.closest('button, input, textarea, select')) return
      event.preventDefault()
      regenerate(randomSeed())
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [regenerate])

  useEffect(() => {
    const stage = stageRef.current
    const canvas = canvasRef.current
    if (!stage || !canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let disposed = false
    let frame = 0
    let width = 0
    let height = 0
    const resize = () => {
      const rect = stage.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = Math.max(320, rect.width)
      height = Math.max(480, rect.height)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const now = reducedMotion ? 0 : performance.now()
      const resonance = resonanceStartRef.current > 0 ? clamp(1 - (now - resonanceStartRef.current) / 1700, 0, 1) : 0
      const orbitYaw = autoOrbit && !reducedMotion ? now * .00009 : 0
      drawBoneGarden(ctx, width, height, now, reducedMotion, seed, yaw + orbitYaw, reducedMotion ? 1 : clamp((now - growthStartRef.current) / 1600, .02, 1), resonance)
    }
    const render = (time: number) => {
      if (disposed) return
      const growth = reducedMotion ? 1 : clamp((time - growthStartRef.current) / 1600, .02, 1)
      const resonance = resonanceStartRef.current > 0 ? clamp(1 - (time - resonanceStartRef.current) / 1700, 0, 1) : 0
      const orbitYaw = autoOrbit && !reducedMotion ? time * .00009 : 0
      drawBoneGarden(ctx, width, height, time, reducedMotion, seed, yaw + orbitYaw, growth, resonance)
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
  }, [autoOrbit, reducedMotion, resonanceCount, seed, yaw])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null
      if (target?.closest('button, input, textarea, select')) return
      draggingRef.current = true
      lastPointerRef.current = event.clientX
      pointerStartRef.current = { x: event.clientX, y: event.clientY }
      pointerMovedRef.current = false
      stage.setPointerCapture?.(event.pointerId)
      stage.classList.add('bone-garden-stage--dragging')
    }
    const onPointerMove = (event: PointerEvent) => {
      if (!draggingRef.current) return
      const delta = event.clientX - lastPointerRef.current
      lastPointerRef.current = event.clientX
      if (Math.hypot(event.clientX - pointerStartRef.current.x, event.clientY - pointerStartRef.current.y) > 6) pointerMovedRef.current = true
      setYaw((value) => clamp(value + delta * .006, -1.35, 1.35))
    }
    const release = (event?: PointerEvent) => {
      const target = event?.target instanceof Element ? event.target : null
      if (draggingRef.current && !pointerMovedRef.current && !target?.closest('button, input, textarea, select')) resonate()
      draggingRef.current = false
      stage.classList.remove('bone-garden-stage--dragging')
    }
    stage.addEventListener('pointerdown', onPointerDown)
    stage.addEventListener('pointermove', onPointerMove)
    stage.addEventListener('pointerup', release)
    stage.addEventListener('pointercancel', release)
    stage.addEventListener('pointerleave', release)
    return () => {
      stage.removeEventListener('pointerdown', onPointerDown)
      stage.removeEventListener('pointermove', onPointerMove)
      stage.removeEventListener('pointerup', release)
      stage.removeEventListener('pointercancel', release)
      stage.removeEventListener('pointerleave', release)
    }
  }, [])

  return (
    <main className="bone-garden-scene" data-scene="bone-garden" data-seed={seed} aria-labelledby="bone-garden-title">
      <div className="bone-garden-stage" ref={stageRef}>
        <canvas ref={canvasRef} className="bone-garden-canvas" role="img" aria-label="深红哥特拱廊中的算法骨骼花园，中央骨骼正在生长" />
        <header className="bone-garden-header">
          <p className="bone-garden-kicker">第四展馆 <span>/</span> 骨园</p>
          <h1 id="bone-garden-title">骨骼生长</h1>
          <p className="bone-garden-subtitle">THE BONE GARDEN</p>
        </header>
        <section className="bone-garden-controls" aria-label="骨骼生长控制">
          <div className="bone-garden-seed-field">
            <label htmlFor="bone-garden-seed">种子</label>
            <input id="bone-garden-seed" type="number" inputMode="numeric" value={seedInput} onChange={(event) => setSeedInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') redrawFromInput() }} />
          </div>
          <button type="button" className="bone-garden-action" onClick={redrawFromInput} title="按种子重绘">
            <RefreshCw aria-hidden="true" />
            <span>按种子重绘</span>
          </button>
          <button type="button" className="bone-garden-action bone-garden-action--quiet" onClick={() => regenerate(randomSeed())} title="生成新的骨骼形态">
            <Dices aria-hidden="true" />
            <span>随机种子</span>
          </button>
          <button type="button" className={`bone-garden-action bone-garden-action--orbit${autoOrbit ? ' bone-garden-action--active' : ''}`} aria-pressed={autoOrbit} onClick={() => setAutoOrbit((value) => !value)} title={autoOrbit ? '停止星云旋转' : '启动星云旋转'}>
            <RotateCw aria-hidden="true" />
            <span>自动旋转</span>
          </button>
          <button type="button" className="bone-garden-action bone-garden-action--resonate" onClick={resonate} title="触发星云共鸣">
            <Sparkles aria-hidden="true" />
            <span>星云共鸣</span>
          </button>
        </section>
        <div className={`bone-garden-status${growing ? ' bone-garden-status--growing' : ''}`} aria-live="polite">
          <span className="bone-garden-status__mark" aria-hidden="true" />
          {growing ? '骨骼正在生长' : resonanceCount > 0 ? `星云共鸣 · ${resonanceCount}` : '骨园已稳定'}
        </div>
        <div className="bone-garden-gesture" aria-label="拖拽旋转，点击触发共鸣" title="拖拽旋转，点击触发共鸣"><Move3d /></div>
        <nav className="bone-garden-nav" aria-label="骨园展馆导航">
          <button type="button" className="bone-garden-link bone-garden-link--relic" onClick={() => { window.location.hash = '#/saint-relic' }}>
            <DoorOpen aria-hidden="true" />
            <span>前往圣遗物室</span>
          </button>
          <button type="button" className="bone-garden-link" onClick={() => { window.location.hash = '#/cemetery' }}>
            <ArrowLeft aria-hidden="true" />
            <span>返回墓地</span>
          </button>
        </nav>
      </div>
    </main>
  )
}
