import { ArrowLeft, Feather, LockKeyhole, Send, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import './rose-ash.css'

type RoseAshSceneProps = {
  reducedMotion?: boolean
}

type MemorialPhase = 'idle' | 'germinating' | 'bloomed'

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
  let state = (seed >>> 0) || 0x9e3779b9
  return () => {
    state = Math.imul(state ^ (state >>> 16), 2246822507)
    state = Math.imul(state ^ (state >>> 13), 3266489909)
    return ((state ^ (state >>> 16)) >>> 0) / 4294967296
  }
}

const hexToRgb = (hex: string) => {
  const value = hex.replace('#', '')
  const normalized = value.length === 3 ? value.split('').map((digit) => digit + digit).join('') : value
  return [0, 2, 4].map((offset) => Number.parseInt(normalized.slice(offset, offset + 2), 16))
}

const shadeHex = (hex: string, amount: number) => {
  const [red, green, blue] = hexToRgb(hex)
  const target = amount >= 0 ? 255 : 0
  const mix = Math.min(1, Math.abs(amount))
  return `#${[red, green, blue].map((channel) => Math.round(channel + (target - channel) * mix).toString(16).padStart(2, '0')).join('')}`
}

const luminance = (hex: string) => {
  const [red, green, blue] = hexToRgb(hex).map((channel) => channel / 255)
  return red * .2126 + green * .7152 + blue * .0722
}

const contrastingEdge = (fill: string) => luminance(fill) > .52 ? shadeHex(fill, -.62) : shadeHex(fill, .72)

const drawPetal = (ctx: CanvasRenderingContext2D, x: number, y: number, length: number, angle: number, width: number, fill: string, alpha: number, curl: number, fold = .5) => {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.globalAlpha = alpha
  const shade = ctx.createLinearGradient(-width * .7, 0, width * .7, -length)
  shade.addColorStop(0, shadeHex(fill, -.28))
  shade.addColorStop(.34, shadeHex(fill, -.06))
  shade.addColorStop(.72, fill)
  shade.addColorStop(1, shadeHex(fill, .18))
  ctx.fillStyle = shade
  ctx.beginPath()
  ctx.moveTo(-width * .16, 0)
  ctx.bezierCurveTo(-width * (.78 + fold * .16), -length * (.08 + curl * .09), -width * (.82 + fold * .2), -length * (.52 + curl * .1), -width * (.18 + curl * .12), -length * (.91 + curl * .04))
  ctx.quadraticCurveTo(0, -length * (1.06 + curl * .06), width * (.22 + curl * .08), -length * (.88 - curl * .03))
  ctx.bezierCurveTo(width * (.78 + fold * .2), -length * (.5 + curl * .12), width * (.78 + curl * .18), -length * (.1 + curl * .03), width * .16, 0)
  ctx.quadraticCurveTo(0, length * .08, -width * .16, 0)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = contrastingEdge(fill)
  ctx.lineWidth = Math.max(1, length * .02)
  ctx.beginPath()
  ctx.moveTo(-width * .14, 0)
  ctx.bezierCurveTo(-width * .72, -length * .18, -width * .64, -length * .66, -width * .18, -length * .91)
  ctx.quadraticCurveTo(0, -length * 1.02, width * .22, -length * .87)
  ctx.bezierCurveTo(width * .68, -length * .64, width * .74, -length * .18, width * .14, 0)
  ctx.stroke()
  ctx.globalAlpha = alpha * .58
  ctx.beginPath()
  ctx.moveTo(0, -length * .06)
  ctx.quadraticCurveTo(width * fold, -length * (.42 + curl * .12), width * .1, -length * .83)
  ctx.moveTo(0, -length * .06)
  ctx.quadraticCurveTo(-width * (fold * .72), -length * (.48 + curl * .08), -width * .12, -length * .78)
  ctx.stroke()
  ctx.restore()
}

type RoseBloomOptions = {
  roseX: number
  roseY: number
  rootX: number
  rootY: number
  flowerWidth: number
  flowerHeight: number
  lean: number
  bloom: number
  opening: number
  stemColor: string
  colorA: string
  colorB: string
  palette: readonly string[]
  roseIndex: number
  random: () => number
  width: number
  height: number
}

const drawRoseBloom = (ctx: CanvasRenderingContext2D, options: RoseBloomOptions) => {
  const { roseX, roseY, rootX, rootY, flowerWidth, flowerHeight, lean, bloom, opening, stemColor, colorA, colorB, palette, roseIndex, random, width, height } = options
  const outward = roseIndex === 0 ? -1 : roseIndex === 2 ? 1 : 0
  const stemAmplitude = width * (.095 + random() * .075)
  const lowerBias = [width * .055, -width * .018, -width * .082][roseIndex]
  const upperBias = [-width * .1, width * .042, width * .13][roseIndex]
  const lowBend = outward * stemAmplitude + lowerBias + (random() - .5) * width * .045
  const highBend = -outward * stemAmplitude * (.52 + random() * .24) + upperBias + (random() - .5) * width * .06
  const stemLift = (random() - .5) * height * .055
  const stemTopX = roseX + (random() - .5) * width * .025
  const stemTopY = roseY + flowerHeight * .055
  const controlOne = {
    x: rootX + (stemTopX - rootX) * (.28 + random() * .08) + lowBend,
    y: rootY - height * (.18 + random() * .045),
  }
  const controlTwo = {
    x: rootX + (stemTopX - rootX) * (.72 + random() * .08) + highBend,
    y: roseY + flowerHeight * (.3 + random() * .12) + stemLift,
  }
  const stemPoint = (progress: number) => {
    const inverse = 1 - progress
    return {
      x: inverse * inverse * inverse * rootX + 3 * inverse * inverse * progress * controlOne.x + 3 * inverse * progress * progress * controlTwo.x + progress * progress * progress * stemTopX,
      y: inverse * inverse * inverse * rootY + 3 * inverse * inverse * progress * controlOne.y + 3 * inverse * progress * progress * controlTwo.y + progress * progress * progress * stemTopY,
    }
  }

  const stemGradient = ctx.createLinearGradient(rootX, rootY, stemTopX, stemTopY)
  stemGradient.addColorStop(0, shadeHex(stemColor, -.28))
  stemGradient.addColorStop(.45, stemColor)
  stemGradient.addColorStop(1, shadeHex(stemColor, .18))
  ctx.strokeStyle = stemGradient
  ctx.lineWidth = Math.max(3, width * (.0048 + random() * .0014))
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(rootX, rootY)
  ctx.bezierCurveTo(controlOne.x, controlOne.y, controlTwo.x, controlTwo.y, stemTopX, stemTopY)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(202, 195, 134, .34)'
  ctx.lineWidth = Math.max(1, width * .0011)
  ctx.beginPath()
  ctx.moveTo(rootX - width * .002, rootY)
  ctx.bezierCurveTo(controlOne.x - width * .002, controlOne.y, controlTwo.x - width * .002, controlTwo.y, stemTopX - width * .002, stemTopY)
  ctx.stroke()

  ctx.fillStyle = stemColor
  ctx.beginPath()
  ctx.ellipse(rootX, rootY, width * .012, height * .008, lean * .7, 0, Math.PI * 2)
  ctx.fill()

  const drawLeaf = (x: number, y: number, angle: number, leafLength: number, leafWidth: number, leafFill: string) => {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(angle)
    ctx.fillStyle = leafFill
    ctx.strokeStyle = contrastingEdge(leafFill)
    ctx.lineWidth = Math.max(1, width * .0011)
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.bezierCurveTo(leafWidth * .42, -leafLength * .18, leafWidth * .82, -leafLength * .74, 0, -leafLength)
    ctx.bezierCurveTo(-leafWidth * .72, -leafLength * .76, -leafWidth * .36, -leafLength * .22, 0, 0)
    ctx.fill()
    ctx.stroke()
    ctx.strokeStyle = 'rgba(213, 200, 133, .46)'
    ctx.lineWidth = Math.max(1, width * .0009)
    ctx.beginPath()
    ctx.moveTo(0, -leafLength * .03)
    ctx.quadraticCurveTo(leafWidth * .06, -leafLength * .48, 0, -leafLength * .92)
    ctx.stroke()
    ctx.strokeStyle = 'rgba(210, 198, 139, .27)'
    for (let vein = 1; vein < 4; vein += 1) {
      const veinY = -leafLength * (.2 + vein * .16)
      ctx.beginPath()
      ctx.moveTo(0, veinY)
      ctx.lineTo(leafWidth * (.34 - vein * .035), veinY - leafLength * .08)
      ctx.moveTo(0, veinY)
      ctx.lineTo(-leafWidth * (.28 - vein * .025), veinY - leafLength * .06)
      ctx.stroke()
    }
    ctx.restore()
  }

  const leafCount = 3 + Math.floor(random() * 2)
  for (let leaf = 0; leaf < leafCount; leaf += 1) {
    const side = (leaf + roseIndex) % 2 ? 1 : -1
    const leafProgress = .3 + leaf * .16 + random() * .075
    const point = stemPoint(Math.min(.91, leafProgress))
    const leafAngle = side * (Math.PI * (.19 + random() * .12)) + (random() - .5) * .16
    drawLeaf(point.x, point.y, leafAngle, height * (.066 + random() * .038), width * (.032 + random() * .014), leaf % 2 ? '#626447' : '#414b3d')
  }

  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  const roseGlow = ctx.createRadialGradient(stemTopX, roseY, 0, stemTopX, roseY, width * (.13 + bloom * .05))
  roseGlow.addColorStop(0, `rgba(177, 74, 73, ${.15 + bloom * .08})`)
  roseGlow.addColorStop(1, 'rgba(87, 27, 39, 0)')
  ctx.fillStyle = roseGlow
  ctx.fillRect(stemTopX - width * .2, roseY - width * .2, width * .4, width * .4)
  ctx.restore()

  ctx.save()
  ctx.translate(stemTopX, roseY)
  ctx.rotate(lean)
  const petalColor = (index: number, layer: number) => {
    const base = palette.length > 2
      ? palette[(index + layer * 7 + roseIndex * 3) % palette.length]
      : random() > (.58 - layer * .045) ? colorB : colorA
    const shade = (random() - .46) * (.42 + layer * .09)
    const fill = shadeHex(base, shade)
    return { fill, alpha: (.56 + layer * .1) * bloom }
  }
  const scaleX = (.94 + random() * .18) * (.82 + opening * .18)
  const scaleY = (.92 + random() * .2) * (.86 + opening * .14)
  const petalW = flowerWidth * scaleX
  const petalH = flowerHeight * scaleY

  // Outer ring: a compact ellipse with a low front edge reads as a rose cup.
  const outerCount = 13 + Math.floor(random() * 3)
  for (let index = outerCount - 1; index >= 0; index -= 1) {
    const radial = index / outerCount * Math.PI * 2 + (random() - .5) * .1
    const x = Math.cos(radial) * petalW * (.19 + random() * .025)
    const y = Math.sin(radial) * petalH * (.105 + random() * .02) + petalH * .015
    const { fill, alpha } = petalColor(index, 0)
    const length = petalH * (.25 + random() * .055) * (.55 + opening * .45)
    drawPetal(ctx, x, y, length, radial - Math.PI / 2 + (random() - .5) * .18, petalW * (.135 + random() * .03), fill, Math.min(1, alpha + .03), (random() - .5) * .18, .55 + random() * .34)
  }

  // Middle ring folds toward the flower heart.
  const middleCount = 10 + Math.floor(random() * 2)
  for (let index = middleCount - 1; index >= 0; index -= 1) {
    const radial = index / middleCount * Math.PI * 2 + .23 + (random() - .5) * .12
    const x = Math.cos(radial) * petalW * (.105 + random() * .018)
    const y = Math.sin(radial) * petalH * (.065 + random() * .012)
    const { fill, alpha } = petalColor(index + 14, 1)
    const length = petalH * (.16 + random() * .045) * (.5 + opening * .5)
    drawPetal(ctx, x, y, length, radial - Math.PI / 2 + (random() - .5) * .22, petalW * (.105 + random() * .025), fill, Math.min(1, alpha + .1), (random() - .5) * .16, .46 + random() * .32)
  }

  // Inner petals make a small offset spiral instead of a flat centre.
  const innerCount = 7 + Math.floor(random() * 2)
  const innerOffsetX = (random() - .5) * petalW * .025
  const innerOffsetY = (random() - .5) * petalH * .018
  for (let index = innerCount - 1; index >= 0; index -= 1) {
    const radial = index / innerCount * Math.PI * 2 + .58
    const x = innerOffsetX + Math.cos(radial) * petalW * (.045 + random() * .012)
    const y = innerOffsetY + Math.sin(radial) * petalH * (.028 + random() * .008)
    const { fill, alpha } = petalColor(index + 26, 2)
    const length = petalH * (.095 + random() * .025) * (.48 + opening * .52)
    drawPetal(ctx, x, y, length, radial - Math.PI / 2 + (random() - .5) * .2, petalW * (.075 + random() * .018), fill, Math.min(1, alpha + .16), (random() - .5) * .13, .4 + random() * .28)
  }

  ctx.strokeStyle = contrastingEdge(colorB)
  ctx.lineWidth = Math.max(1, width * .0022)
  ctx.lineCap = 'round'
  ctx.beginPath()
  for (let step = 0; step <= 34; step += 1) {
    const progress = step / 34
    const angle = progress * Math.PI * 2 * 2.45 + .55
    const radius = petalW * (.008 + progress * .07)
    const px = Math.cos(angle) * radius
    const py = Math.sin(angle) * radius * .54 - petalH * .012
    if (step === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.stroke()
  ctx.lineCap = 'butt'
  ctx.restore()

  // Five separate sepals fold around the flower base. Their pointed blades,
  // veins and varied lengths read as a calyx instead of a single flat icon.
  ctx.save()
  ctx.translate(stemTopX, roseY + flowerHeight * .085)
  ctx.rotate(lean)
  for (let sepal = 0; sepal < 5; sepal += 1) {
    const angle = -Math.PI / 2 + (sepal - 2) * .57 + (random() - .5) * .1
    const sepalLength = flowerHeight * (.075 + random() * .055)
    const sepalWidth = flowerWidth * (.045 + random() * .018)
    const sepalFill = sepal % 2 ? shadeHex(stemColor, -.12) : shadeHex(stemColor, .08)
    ctx.save()
    ctx.rotate(angle)
    ctx.globalAlpha = (.78 + bloom * .22)
    ctx.fillStyle = sepalFill
    ctx.strokeStyle = contrastingEdge(sepalFill)
    ctx.lineWidth = Math.max(1, width * .0012)
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.bezierCurveTo(sepalWidth * .58, -sepalLength * .2, sepalWidth * .72, -sepalLength * .72, 0, -sepalLength)
    ctx.bezierCurveTo(-sepalWidth * .72, -sepalLength * .73, -sepalWidth * .54, -sepalLength * .2, 0, 0)
    ctx.fill()
    ctx.stroke()
    ctx.strokeStyle = 'rgba(218, 202, 137, .42)'
    ctx.lineWidth = Math.max(1, width * .0009)
    ctx.beginPath()
    ctx.moveTo(0, -sepalLength * .04)
    ctx.quadraticCurveTo(sepalWidth * .08, -sepalLength * .5, 0, -sepalLength * .9)
    ctx.stroke()
    ctx.restore()
  }
  ctx.restore()

  ctx.strokeStyle = '#9b8762'
  ctx.lineWidth = Math.max(1, width * .0018)
  for (let thorn = 0; thorn < 6; thorn += 1) {
    const thornProgress = .2 + thorn * .115
    const thornPoint = stemPoint(thornProgress)
    const thornSide = (thorn + roseIndex) % 2 ? 1 : -1
    ctx.beginPath()
    ctx.moveTo(thornPoint.x, thornPoint.y)
    ctx.lineTo(thornPoint.x + thornSide * width * (.018 + random() * .012), thornPoint.y - height * (.012 + random() * .009))
    ctx.stroke()
  }
}

const drawEasterLight = (ctx: CanvasRenderingContext2D, width: number, height: number, time: number, reducedMotion: boolean) => {
  const t = reducedMotion ? 0 : time / 1000
  const pulse = .8 + Math.sin(t * 2.2) * .12
  const center = width * .5
  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  const beam = ctx.createLinearGradient(center, 0, center, height * .82)
  beam.addColorStop(0, `rgba(231, 245, 255, ${.2 * pulse})`)
  beam.addColorStop(.55, `rgba(198, 174, 255, ${.1 * pulse})`)
  beam.addColorStop(1, 'rgba(86, 173, 255, 0)')
  ctx.fillStyle = beam
  ctx.beginPath()
  ctx.moveTo(center - width * .025, 0)
  ctx.lineTo(center + width * .025, 0)
  ctx.lineTo(center + width * .32, height * .84)
  ctx.lineTo(center - width * .32, height * .84)
  ctx.closePath()
  ctx.fill()
  const halo = ctx.createRadialGradient(center, height * .43, 0, center, height * .43, width * .38)
  halo.addColorStop(0, `rgba(255, 242, 206, ${.16 * pulse})`)
  halo.addColorStop(1, 'rgba(255, 242, 206, 0)')
  ctx.fillStyle = halo
  ctx.fillRect(center - width * .4, height * .08, width * .8, height * .68)
  ctx.restore()
}

const drawPrayerFlower = (ctx: CanvasRenderingContext2D, width: number, height: number, time: number, reducedMotion: boolean, seed: number, palette: readonly string[]) => {
  const t = reducedMotion ? 0 : time / 1000
  const cycle = reducedMotion ? .7 : .5 + Math.sin(t * 1.35 + seed * .0003) * .5
  const x = width * .12
  const y = height * .84
  const size = width * (.02 + cycle * .018)
  const random = seededRandom(seed ^ 0x4f1a)
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(t * .72)
  for (let petal = 0; petal < 8; petal += 1) {
    const angle = petal / 8 * Math.PI * 2
    drawPetal(ctx, Math.cos(angle) * size * .18, Math.sin(angle) * size * .18, size * (.72 + cycle * .5), angle + Math.PI / 2, size * (.56 + random() * .16), palette[petal % palette.length], .35 + cycle * .5, (random() - .5) * .2, .6)
  }
  ctx.fillStyle = '#d7b86c'
  ctx.beginPath()
  ctx.arc(0, 0, Math.max(1.5, size * .2), 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

const drawRoseAsh = (ctx: CanvasRenderingContext2D, width: number, height: number, time: number, reducedMotion: boolean, phase: MemorialPhase, phaseStarted: number, duration: number, seed: number, easter = false) => {
  const t = reducedMotion ? 0 : time / 1000
  const progress = phase === 'idle' ? .26 : phase === 'germinating' ? clamp((time - phaseStarted) / duration, 0, 1) : 1
  const bloom = .2 + progress * .8
  const opening = clamp((bloom - .18) / .82, 0, 1)
  const random = seededRandom(seed)
  const centerX = width * .5
  const lean = (random() - .5) * .28
  const roseY = height * (.43 + (random() - .5) * .055)
  const groundY = height * (.79 + (random() - .5) * .035)
  const bloomScale = .95 + random() * .35
  const flowerWidth = width * (.17 + random() * .065)
  const flowerHeight = height * (.34 + random() * .09)
  const roseColors = ['#050507', '#e6c986', '#a32f3e', '#f1eee2'] as const
  // Pick independently so same-color pairings remain valid outcomes.
  const colorA = roseColors[Math.floor(random() * roseColors.length)]
  const colorB = roseColors[Math.floor(random() * roseColors.length)]
  const stemColor = random() > .5 ? '#4b5b43' : '#626447'
  const palette = easter ? ['#d13f52', '#47a676', '#4e84d8', '#8f5bc4'] : [colorA, colorB]

  ctx.clearRect(0, 0, width, height)
  const background = ctx.createLinearGradient(0, 0, 0, height)
  background.addColorStop(0, '#100d14')
  background.addColorStop(.56, '#1d1219')
  background.addColorStop(1, '#09090d')
  ctx.fillStyle = background
  ctx.fillRect(0, 0, width, height)

  // Glasshouse ribs and a rose window give the room a quiet gothic silhouette.
  ctx.strokeStyle = 'rgba(181, 136, 116, .22)'
  ctx.lineWidth = Math.max(1, width * .0013)
  for (let rib = -4; rib <= 4; rib += 1) {
    const baseX = centerX + rib * width * .15
    ctx.beginPath()
    ctx.moveTo(baseX, height)
    ctx.quadraticCurveTo(centerX + rib * width * .08, height * .29, centerX, height * .13)
    ctx.stroke()
  }
  ctx.strokeStyle = 'rgba(202, 158, 121, .28)'
  ctx.beginPath()
  ctx.arc(centerX, height * .2, width * .12, Math.PI, Math.PI * 2)
  ctx.stroke()
  for (let spoke = 0; spoke < 12; spoke += 1) {
    const angle = spoke / 12 * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(centerX, height * .2)
    ctx.lineTo(centerX + Math.cos(angle) * width * .115, height * .2 + Math.sin(angle) * width * .115)
    ctx.stroke()
  }

  ctx.fillStyle = '#0c0a0e'
  ctx.fillRect(0, groundY, width, height - groundY)
  ctx.strokeStyle = 'rgba(189, 147, 116, .2)'
  ctx.lineWidth = Math.max(1, width * .001)
  for (let row = 0; row < 7; row += 1) {
    const y = groundY + Math.pow(row / 6, 1.6) * (height - groundY)
    ctx.beginPath()
    ctx.moveTo(width * .08, y)
    ctx.lineTo(width * .92, y)
    ctx.stroke()
  }
  for (let strip = 0; strip < 11; strip += 1) {
    ctx.beginPath()
    ctx.moveTo(centerX, groundY)
    ctx.lineTo(width * (strip / 10), height)
    ctx.stroke()
  }

  const ash = ctx.createRadialGradient(centerX, groundY, 0, centerX, groundY, width * .42)
  ash.addColorStop(0, 'rgba(127, 54, 56, .18)')
  ash.addColorStop(.56, 'rgba(88, 49, 54, .08)')
  ash.addColorStop(1, 'rgba(10, 8, 12, 0)')
  ctx.fillStyle = ash
  ctx.fillRect(centerX - width * .44, groundY - height * .13, width * .88, height * .22)

  if (easter) drawEasterLight(ctx, width, height, time, reducedMotion)
  // Three stems share one palette while their seed offsets create distinct
  // poses, heights and bloom proportions for the same memorial word.
  const rootPositions: number[] = []
  for (let roseIndex = 0; roseIndex < 3; roseIndex += 1) {
    const roseRandom = seededRandom(seed ^ (0x9e3779b9 + roseIndex * 0x6d2b79f5))
    const roseX = centerX + (roseIndex - 1) * width * (.17 + roseRandom() * .045) + (roseRandom() - .5) * width * .025
    const roseYVariant = height * (.37 + roseIndex * .05 + (roseRandom() - .5) * .065)
    const potRootOffsets = [-.085, 0, .085] as const
    const rootX = centerX + potRootOffsets[roseIndex] * width + (roseRandom() - .5) * width * .025
    const rootY = groundY + height * (.025 + roseRandom() * .018)
    rootPositions.push(rootX)
    drawRoseBloom(ctx, {
      roseX,
      roseY: roseYVariant,
      rootX,
      rootY,
      flowerWidth: width * (.15 + roseRandom() * .09) * (easter ? 1.05 : 1),
      flowerHeight: height * (.24 + roseRandom() * .14) * (easter ? 1.03 : 1),
      lean: (roseRandom() - .5) * .5,
      bloom,
      opening,
      stemColor: roseRandom() > .5 ? '#4b5b43' : '#626447',
      colorA,
      colorB,
      palette,
      roseIndex,
      random: roseRandom,
      width,
      height,
    })
  }
  drawPrayerFlower(ctx, width, height, time, reducedMotion, seed, easter ? palette : [colorA, colorB])

  // The original single-stem pass remains as a dormant compatibility sketch;
  // the composed trio above is the active rendering.
  if (false) {
  // The stem bends with the generated memorial, while the bloom opens over time.
  const stemBend = (random() - .5) * width * .1
  const stemTopX = centerX + stemBend
  ctx.strokeStyle = stemColor
  ctx.lineWidth = Math.max(2, width * .004)
  ctx.beginPath()
  ctx.moveTo(centerX, groundY)
  ctx.quadraticCurveTo(centerX - stemBend * .55, height * (.67 + lean * .04), stemTopX, roseY + flowerHeight * .05)
  ctx.stroke()
  const leafCount = 2 + Math.floor(random() * 3)
  for (let leaf = 0; leaf < leafCount; leaf += 1) {
    const side = leaf % 2 ? 1 : -1
    const leafY = height * (.58 + leaf * .055 + random() * .035)
    const leafX = centerX + stemBend * (leaf / leafCount)
    ctx.fillStyle = leaf % 2 ? '#626447' : '#414b3d'
    ctx.beginPath()
    ctx.moveTo(leafX, leafY)
    ctx.quadraticCurveTo(leafX + side * width * .045, leafY - height * .06, leafX + side * width * (.09 + random() * .035), leafY - height * .025)
    ctx.quadraticCurveTo(leafX + side * width * .04, leafY + height * .02, leafX, leafY)
    ctx.fill()
    ctx.strokeStyle = 'rgba(188, 179, 111, .24)'
    ctx.lineWidth = Math.max(1, width * .0011)
    ctx.beginPath()
    ctx.moveTo(leafX, leafY)
    ctx.lineTo(leafX + side * width * .075, leafY - height * .028)
    ctx.stroke()
    ctx.strokeStyle = stemColor
  }

  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  const roseGlow = ctx.createRadialGradient(stemTopX, roseY, 0, stemTopX, roseY, width * (.17 + bloom * .06))
  roseGlow.addColorStop(0, `rgba(177, 74, 73, ${.18 + bloom * .1})`)
  roseGlow.addColorStop(1, 'rgba(87, 27, 39, 0)')
  ctx.fillStyle = roseGlow
  ctx.fillRect(stemTopX - width * .25, roseY - width * .25, width * .5, width * .5)
  ctx.restore()

  // Build the bloom as a rose-facing cup rather than a circular rosette:
  // a single scalloped silhouette establishes the flower head, then broad
  // overlapping petals and a tight spiral describe its folded structure.
  ctx.save()
  ctx.translate(stemTopX, roseY)
  ctx.rotate(lean)
  const petalColor = (index: number, layer: number) => {
    const base = random() > (.58 - layer * .045) ? colorB : colorA
    const shade = (random() - .46) * (.42 + layer * .09)
    const fill = shadeHex(base, shade)
    return { fill, edge: contrastingEdge(fill), alpha: (.56 + layer * .1) * bloom, index }
  }
  const scaleX = bloomScale * (.82 + opening * .18)
  const scaleY = bloomScale * (.86 + opening * .14)
  const petalW = flowerWidth * scaleX
  const petalH = flowerHeight * scaleY

  // Outer ring: petals radiate around an ellipse, with the lower pair
  // deliberately overlapping the sepals to make a full rose head.
  const outerCount = 13 + Math.floor(random() * 3)
  for (let index = outerCount - 1; index >= 0; index -= 1) {
    const radial = index / outerCount * Math.PI * 2 + (random() - .5) * .1
    const x = Math.cos(radial) * petalW * (.19 + random() * .025)
    const y = Math.sin(radial) * petalH * (.105 + random() * .02) + petalH * .015
    const { fill, alpha } = petalColor(index, 0)
    const length = petalH * (.25 + random() * .055) * (.55 + opening * .45)
    drawPetal(ctx, x, y, length, radial - Math.PI / 2 + (random() - .5) * .18, petalW * (.135 + random() * .03), fill, Math.min(1, alpha + .03), (random() - .5) * .18, .55 + random() * .34)
  }

  // Middle ring folds back toward the centre, alternating its two colours so
  // a repeated seed still has visible value changes from petal to petal.
  const middleCount = 10 + Math.floor(random() * 2)
  for (let index = middleCount - 1; index >= 0; index -= 1) {
    const radial = index / middleCount * Math.PI * 2 + .23 + (random() - .5) * .12
    const x = Math.cos(radial) * petalW * (.105 + random() * .018)
    const y = Math.sin(radial) * petalH * (.065 + random() * .012)
    const { fill, alpha } = petalColor(index + 14, 1)
    const length = petalH * (.16 + random() * .045) * (.5 + opening * .5)
    drawPetal(ctx, x, y, length, radial - Math.PI / 2 + (random() - .5) * .22, petalW * (.105 + random() * .025), fill, Math.min(1, alpha + .1), (random() - .5) * .16, .46 + random() * .32)
  }

  // Inner petals form the tightly curled bowl of the rose. The slight offset
  // keeps the centre organic rather than perfectly concentric.
  const innerCount = 7 + Math.floor(random() * 2)
  const innerOffsetX = (random() - .5) * petalW * .025
  const innerOffsetY = (random() - .5) * petalH * .018
  for (let index = innerCount - 1; index >= 0; index -= 1) {
    const radial = index / innerCount * Math.PI * 2 + .58
    const x = innerOffsetX + Math.cos(radial) * petalW * (.045 + random() * .012)
    const y = innerOffsetY + Math.sin(radial) * petalH * (.028 + random() * .008)
    const { fill, alpha } = petalColor(index + 26, 2)
    const length = petalH * (.095 + random() * .025) * (.48 + opening * .52)
    drawPetal(ctx, x, y, length, radial - Math.PI / 2 + (random() - .5) * .2, petalW * (.075 + random() * .018), fill, Math.min(1, alpha + .16), (random() - .5) * .13, .4 + random() * .28)
  }

  // A compact, off-centre spiral is the focal point of the flower.
  ctx.strokeStyle = contrastingEdge(colorB)
  ctx.lineWidth = Math.max(1, width * .0022)
  ctx.lineCap = 'round'
  ctx.beginPath()
  const spiralTurns = 2.45
  for (let step = 0; step <= 34; step += 1) {
    const progress = step / 34
    const angle = progress * Math.PI * 2 * spiralTurns + .55
    const radius = petalW * (.008 + progress * .07)
    const px = Math.cos(angle) * radius
    const py = Math.sin(angle) * radius * .54 - petalH * .012
    if (step === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.stroke()
  ctx.lineCap = 'butt'
  ctx.fillStyle = shadeHex(colorA, -.64)
  ctx.beginPath()
  ctx.moveTo(-flowerWidth * .08 * bloom, flowerHeight * .02)
  ctx.quadraticCurveTo(-flowerWidth * .01, -flowerHeight * .065 * bloom, flowerWidth * .045 * bloom, -flowerHeight * .02)
  ctx.quadraticCurveTo(flowerWidth * .1 * bloom, flowerHeight * .04, flowerWidth * .025 * bloom, flowerHeight * .075 * bloom)
  ctx.quadraticCurveTo(-flowerWidth * .035 * bloom, flowerHeight * .095 * bloom, -flowerWidth * .08 * bloom, flowerHeight * .02)
  ctx.fill()
  ctx.strokeStyle = contrastingEdge(colorA)
  ctx.lineWidth = Math.max(1, width * .0018)
  ctx.beginPath()
  ctx.moveTo(-flowerWidth * .075 * bloom, flowerHeight * .02)
  ctx.quadraticCurveTo(0, -flowerHeight * .08 * bloom, flowerWidth * .075 * bloom, flowerHeight * .02)
  ctx.stroke()
  ctx.strokeStyle = contrastingEdge(colorB)
  ctx.lineWidth = Math.max(1, width * .0015)
  ctx.beginPath()
  for (let coil = 0; coil < 3; coil += 1) {
    const start = coil * 2.1
    ctx.moveTo(Math.cos(start) * flowerWidth * .025, Math.sin(start) * flowerHeight * .018)
    ctx.bezierCurveTo(Math.cos(start + .8) * flowerWidth * .08, Math.sin(start + .8) * flowerHeight * .05, Math.cos(start + 1.5) * flowerWidth * .07, Math.sin(start + 1.5) * flowerHeight * .05, Math.cos(start + 2.3) * flowerWidth * .02, Math.sin(start + 2.3) * flowerHeight * .01)
  }
  ctx.stroke()
  ctx.restore()

  // Angular sepals sit below the cup and distinguish the bloom from a pom-pom.
  ctx.save()
  ctx.translate(stemTopX, roseY + flowerHeight * .1)
  ctx.rotate(lean)
  ctx.fillStyle = stemColor
  ctx.strokeStyle = 'rgba(194, 178, 114, .4)'
  ctx.lineWidth = Math.max(1, width * .0013)
  ctx.beginPath()
  ctx.moveTo(-flowerWidth * .16, flowerHeight * .03)
  ctx.lineTo(-flowerWidth * .05, -flowerHeight * .015)
  ctx.lineTo(0, flowerHeight * .08)
  ctx.lineTo(flowerWidth * .05, -flowerHeight * .015)
  ctx.lineTo(flowerWidth * .16, flowerHeight * .03)
  ctx.lineTo(flowerWidth * .08, flowerHeight * .12)
  ctx.lineTo(-flowerWidth * .08, flowerHeight * .12)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.restore()

  // Thorns are deliberate, angular interruptions against the soft petals.
  ctx.strokeStyle = '#9b8762'
  ctx.lineWidth = Math.max(1, width * .0018)
  for (let thorn = 0; thorn < 5; thorn += 1) {
    const thornY = groundY - (thorn + 1) * height * .06
    const thornSide = thorn % 2 ? 1 : -1
    ctx.beginPath()
    ctx.moveTo(centerX + stemBend * .52, thornY)
    ctx.lineTo(centerX + stemBend * .52 + thornSide * width * .027, thornY - height * .018)
    ctx.stroke()
  }
  }

  // Petals that have already fallen drift into the ash bed.
  ctx.fillStyle = '#75424a'
  for (let fallen = 0; fallen < 13; fallen += 1) {
    const drift = (Math.sin(fallen * 3.1 + t * .7) * .5 + .5) * width * .36
    const fall = ((t * (.018 + fallen * .0008) + fallen * .083) % .22) * height
    const x = centerX + (fallen % 2 ? drift : -drift)
    const y = groundY - fall
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(fallen + t * .3)
    ctx.globalAlpha = .18 + ((fallen + 2) % 4) * .06
    ctx.fillRect(-width * .009, -height * .003, width * .018, height * .006)
    ctx.restore()
  }

  ctx.fillStyle = 'rgba(200, 181, 172, .42)'
  for (let mote = 0; mote < 44; mote += 1) {
    const x = ((Math.sin(mote * 8.1) * .5 + .5) * width + Math.sin(t * (.16 + mote * .003)) * width * .025) % width
    const y = groundY + ((mote * .097 - t * (.006 + mote * .0006)) % .2 + .2) * height
    const size = Math.max(1, width * (.0009 + mote % 3 * .0004))
    ctx.fillRect(x, y, size, size)
  }

  // A small ash altar anchors the generated bloom to the room.
  ctx.fillStyle = '#211820'
  ctx.strokeStyle = 'rgba(189, 147, 116, .4)'
  ctx.lineWidth = Math.max(1, width * .0017)
  ctx.beginPath()
  ctx.moveTo(centerX - width * .13, groundY + height * .035)
  ctx.lineTo(centerX + width * .13, groundY + height * .035)
  ctx.lineTo(centerX + width * .1, groundY + height * .11)
  ctx.lineTo(centerX - width * .1, groundY + height * .11)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.strokeStyle = 'rgba(148, 111, 94, .3)'
  ctx.beginPath()
  ctx.moveTo(centerX - width * .08, groundY + height * .058)
  ctx.lineTo(centerX + width * .08, groundY + height * .058)
  ctx.stroke()

  // The roots sit below the rim, so every stem visibly enters the same pot
  // while retaining its own offset and lean.
  rootPositions.forEach((rootX, index) => {
    const rootY = groundY + height * (.052 + (index % 2) * .006)
    ctx.strokeStyle = index % 2 ? '#596047' : '#414b3d'
    ctx.lineWidth = Math.max(2, width * .003)
    ctx.beginPath()
    ctx.moveTo(rootX, rootY - height * .018)
    ctx.quadraticCurveTo(rootX + (index - 1) * width * .012, rootY, rootX + (index - 1) * width * .018, rootY + height * .012)
    ctx.stroke()
    ctx.fillStyle = index % 2 ? '#69704e' : '#4f5a43'
    ctx.beginPath()
    ctx.ellipse(rootX + (index - 1) * width * .018, rootY + height * .012, width * .017, height * .009, (index - 1) * .18, 0, Math.PI * 2)
    ctx.fill()
  })
}

export default function RoseAshScene({ reducedMotion = false }: RoseAshSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const phaseStartedRef = useRef(0)
  const generationDurationRef = useRef(2800)
  const generationTimerRef = useRef<number | null>(null)
  const [phase, setPhase] = useState<MemorialPhase>('idle')
  const [message, setMessage] = useState('')
  const [activeMessage, setActiveMessage] = useState<string | null>(null)
  const [localOnly, setLocalOnly] = useState(true)
  const [hovered, setHovered] = useState(false)
  const [seed, setSeed] = useState(0x7a5e)
  const [easterActive, setEasterActive] = useState(false)
  const [easterCaption, setEasterCaption] = useState<string | null>(null)
  const [easterPulse, setEasterPulse] = useState(0)

  const easterCaptions = ['鲜血，腐溃，无常，炽欲。', '此乃破灭福音。', '你送我的花也早晚会凋零。']

  const submitMemorial = () => {
    const trimmed = message.trim()
    if (!trimmed) return
    if (generationTimerRef.current !== null) window.clearTimeout(generationTimerRef.current)
    // The memorial text itself is the seed. Re-entering the same word therefore
    // recreates the same rose silhouette, petal palette, and ornament layout.
    const nextSeed = hashString(trimmed.normalize('NFC').toLocaleLowerCase())
    const aliceKey = trimmed.normalize('NFC').toLocaleLowerCase().replace(/[\s·・]/g, '')
    const isAliceEaster = ['爱丽丝利德尔', '爱丽丝', '利德尔'].includes(aliceKey)
    const duration = 2000 + Math.floor(Math.random() * 2001)
    generationDurationRef.current = duration
    phaseStartedRef.current = performance.now()
    setSeed(nextSeed)
    setActiveMessage(trimmed)
    setEasterActive(isAliceEaster)
    if (isAliceEaster) {
      setEasterCaption(easterCaptions[nextSeed % easterCaptions.length])
      setEasterPulse((previous) => previous + 1)
    } else {
      setEasterCaption(null)
    }
    setPhase('germinating')
    if (localOnly) {
      try {
        const existing = JSON.parse(window.localStorage.getItem('rose-ash-memorials') ?? '[]') as string[]
        window.localStorage.setItem('rose-ash-memorials', JSON.stringify([...existing.slice(-11), trimmed]))
      } catch {
        // Storage can be unavailable in private browsing; the ritual remains local to this view.
      }
    }
    generationTimerRef.current = window.setTimeout(() => setPhase('bloomed'), duration)
  }

  useEffect(() => () => {
    if (generationTimerRef.current !== null) window.clearTimeout(generationTimerRef.current)
  }, [])

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
      drawRoseAsh(ctx, width, height, 0, reducedMotion, phase, phaseStartedRef.current, generationDurationRef.current, seed, easterActive)
    }
    const render = (time: number) => {
      if (disposed) return
      drawRoseAsh(ctx, width, height, time, reducedMotion, phase, phaseStartedRef.current, generationDurationRef.current, seed, easterActive)
      if (!reducedMotion) frame = window.requestAnimationFrame(render)
    }
    const observer = new ResizeObserver(resize)
    observer.observe(stage)
    const onPointerMove = (event: PointerEvent) => {
      const rect = stage.getBoundingClientRect()
      const x = (event.clientX - rect.left) / rect.width
      const y = (event.clientY - rect.top) / rect.height
      setHovered(Math.hypot(x - .5, (y - .48) * .8) < .16)
    }
    stage.addEventListener('pointermove', onPointerMove)
    resize()
    if (!reducedMotion) frame = window.requestAnimationFrame(render)
    return () => {
      disposed = true
      window.cancelAnimationFrame(frame)
      observer.disconnect()
      stage.removeEventListener('pointermove', onPointerMove)
    }
  }, [easterActive, phase, reducedMotion, seed])

  const backStyle: CSSProperties = { left: '50%', bottom: '5%' }
  return (
    <main className="rose-ash-scene" data-scene="rose-ash" data-seed={seed} aria-labelledby="rose-ash-title">
      <div className="rose-ash-stage" ref={stageRef}>
        <canvas ref={canvasRef} className="rose-ash-canvas" role="img" aria-label="玫瑰与灰烬展馆中的枯萎玫瑰与灰烬花园" />
        <header className="rose-ash-header">
          <p className="rose-ash-kicker">第一展馆 <span>/</span> 数字挽歌馆</p>
          <h1 id="rose-ash-title">玫瑰与灰烬</h1>
          <p className="rose-ash-subtitle">ROSE &amp; ASHES</p>
          <p className="rose-ash-caption">把失去交给一朵不会追问的花。</p>
        </header>

        <section className="rose-ash-form" aria-label="安放失去之物">
          <label htmlFor="rose-ash-message">写下你失去的事物</label>
          <div className="rose-ash-input-row">
            <input
              id="rose-ash-message"
              type="text"
              maxLength={80}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') submitMemorial() }}
              placeholder="在这里写下你失去的事物"
            />
            <button type="button" className="rose-ash-submit" onClick={submitMemorial} aria-label="安放这段失去" title="安放这段失去">
              <Send aria-hidden="true" />
            </button>
          </div>
          <div className="rose-ash-form-footer">
            <label className="rose-ash-local-toggle">
              <input type="checkbox" checked={localOnly} onChange={(event) => setLocalOnly(event.target.checked)} />
              <LockKeyhole aria-hidden="true" />
              <span>只保存本地</span>
            </label>
            <span className="rose-ash-count">{message.length}/80</span>
          </div>
        </section>

        <div className={`rose-ash-state rose-ash-state--${phase}`} role="status" aria-live="polite">
          {phase === 'germinating' && <><Sparkles aria-hidden="true" /><span>它正在被安放</span></>}
          {phase === 'bloomed' && <><Feather aria-hidden="true" /><span>它已被安放</span></>}
        </div>
        {easterCaption && <p key={easterPulse} className="rose-ash-easter-caption" role="status" aria-live="assertive">{easterCaption}</p>}
        <p className="rose-ash-prayer" aria-hidden="true"><span>少</span><span>女</span><span>祈</span><span>祷</span><span>中</span><span>…</span><span>…</span></p>
        {hovered && activeMessage && phase === 'bloomed' && <p className="rose-ash-memory" role="status">“{activeMessage}”</p>}
        <button type="button" className="rose-ash-back" style={backStyle} onClick={() => { window.location.hash = '#/cemetery' }}>
          <ArrowLeft aria-hidden="true" />
          <span>返回墓地</span>
        </button>
      </div>
    </main>
  )
}
