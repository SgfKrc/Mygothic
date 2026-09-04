import { ArrowLeft, Dices, DoorOpen, RefreshCw } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import './saint-relic.css'

type SaintRelicSceneProps = {
  reducedMotion?: boolean
}

type Point = [number, number]
type RelicFrameImage = HTMLImageElement | null

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

const seededRandom = (seed: number) => {
  let state = (seed >>> 0) || 0x51a17
  return () => {
    state = Math.imul(state ^ (state >>> 15), 1 | state)
    state ^= state + Math.imul(state ^ (state >>> 7), 61 | state)
    return ((state ^ (state >>> 14)) >>> 0) / 4294967296
  }
}

const drawPixelRelic = (ctx: CanvasRenderingContext2D, centerX: number, baseY: number, width: number, t: number, reducedMotion: boolean, seed: number) => {
  // Every part of the relic uses the same fine logical grid, including the body.
  const unit = clamp(Math.round(width / 520), 2, 4)
  const gridWidth = 76
  const gridHeight = 104
  const random = seededRandom(seed)
  const bob = reducedMotion ? 0 : Math.round(Math.sin(t * 1.8 + seed * .0007) * unit * .55)
  const lean = (random() - .5) * .18
  const shift = Math.floor((random() - .5) * 5)
  const skullTilt = Math.floor(random() * 5) - 2
  const skullTop = 11 + Math.floor(random() * 4)
  const eyeGap = 9 + Math.floor(random() * 3)
  const armRaise = random() > .5 ? -5 : 4
  const ribBend = Math.floor((random() - .5) * 5)
  const ornamentMode = Math.floor(random() * 3)
  // A seed always selects at least one ceremonial object, with combinations
  // making redraws read as different relic arrangements rather than recolors.
  const artifactMask = 1 + Math.floor(random() * 7)
  const artifactSide: -1 | 1 = random() > .5 ? 1 : -1
  const oppositeSide: -1 | 1 = artifactSide === -1 ? 1 : -1
  const palette = ['#e0cea3', '#c8b78f', '#9b8c75', '#70685e', '#4c4b49']
  const accent = random() > .5 ? '#bb8b57' : '#8c6a82'
  const originX = Math.round(-gridWidth * unit / 2)
  const originY = Math.round(-gridHeight * unit)
  const pixel = (gx: number, gy: number, color: string, gw = 1, gh = 1) => {
    if (gx < 0 || gy < 0 || gx >= gridWidth || gy >= gridHeight) return
    ctx.fillStyle = color
    ctx.fillRect(originX + gx * unit, originY + gy * unit, Math.max(1, gw * unit), Math.max(1, gh * unit))
  }
  const bonePixel = (gx: number, gy: number, shade = 0, gw = 2, gh = 2) => pixel(gx, gy, palette[clamp(shade, 0, palette.length - 1)], gw, gh)
  const boneSegment = (x1: number, y1: number, x2: number, y2: number, shade = 0, thickness = 1) => {
    const length = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1))
    for (let step = 0; step <= length; step += 1) {
      const amount = length === 0 ? 0 : step / length
      const gx = Math.round(x1 + (x2 - x1) * amount)
      const gy = Math.round(y1 + (y2 - y1) * amount)
      for (let offset = 0; offset < thickness; offset += 1) bonePixel(gx, gy + (offset > 0 ? (offset % 2 ? 1 : -1) : 0), shade)
    }
  }
  const shadowPixel = (gx: number, gy: number, gw = 1, gh = 1) => pixel(gx, gy, 'rgba(4, 6, 9, .82)', gw, gh)
  const shadowSegment = (x1: number, y1: number, x2: number, y2: number, thickness = 3) => {
    const length = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1))
    for (let step = 0; step <= length; step += 1) {
      const amount = length === 0 ? 0 : step / length
      const gx = Math.round(x1 + (x2 - x1) * amount)
      const gy = Math.round(y1 + (y2 - y1) * amount)
      for (let offset = 0; offset < thickness; offset += 1) shadowPixel(gx, gy + (offset > 0 ? (offset % 2 ? 1 : -1) : 0))
    }
  }

  const drawSword = (side: -1 | 1) => {
    const baseX = side === -1 ? 9 : 67
    const inward = side === -1 ? 1 : -1
    for (let step = 0; step < 27; step += 1) {
      const gx = baseX + Math.round(inward * step * .32)
      const gy = 75 - step
      pixel(gx, gy, step < 22 ? '#d8c99f' : '#8b704f', 2, 1)
      if (step > 3 && step < 23 && step % 3 === 0) pixel(gx - inward, gy, '#6e6960', 1, 1)
    }
    const guardX = baseX + Math.round(inward * 8)
    pixel(guardX - 5, 76, accent, 11, 2)
    pixel(guardX - 1, 78, '#8b704f', 3, 6)
    pixel(guardX - 2, 84, '#d6bd82', 5, 2)
  }

  const drawStaff = (side: -1 | 1) => {
    const x = side === -1 ? 6 : 70
    pixel(x - 1, 18, '#c8b58c', 3, 67)
    pixel(x - 2, 15, '#8f704f', 5, 3)
    pixel(x - 1, 11, accent, 3, 5)
    pixel(x - 4, 9, '#d8c99f', 9, 2)
    pixel(x - 3, 7, '#c8b58c', 2, 2)
    pixel(x + 2, 7, '#c8b58c', 2, 2)
    pixel(x - 2, 84, '#8c6a4a', 5, 2)
  }

  const drawShield = (side: -1 | 1) => {
    const center = side === -1 ? 10 : 66
    for (let row = 0; row < 19; row += 1) {
      const span = row < 3 ? 3 : row < 14 ? 6 : Math.max(2, 6 - Math.ceil((row - 13) * 1.25))
      pixel(center - span, 51 + row, '#6c6258', span * 2 + 1, 1)
      if (span > 2) pixel(center - span + 1, 52 + row, '#292d31', span * 2 - 1, 1)
    }
    pixel(center - 1, 57, accent, 3, 9)
    pixel(center - 3, 60, '#d7c28c', 7, 3)
    pixel(center - 1, 59, '#f0dfae', 3, 5)
    pixel(center - 5, 55, '#b7a37e', 2, 2)
    pixel(center + 4, 55, '#b7a37e', 2, 2)
    pixel(center - 5, 66, '#b7a37e', 2, 2)
    pixel(center + 4, 66, '#b7a37e', 2, 2)
  }

  ctx.save()
  ctx.translate(centerX, baseY + bob)
  ctx.rotate(lean)
  ctx.scale(1.22, 1.22)
  ctx.imageSmoothingEnabled = false
  ctx.globalCompositeOperation = 'screen'
  const haloPulse = 0.12 + (reducedMotion ? 0 : Math.sin(t * 2.4 + seed * .001) * .04)
  const halo = ctx.createRadialGradient(0, originY + unit * 49, unit * 3, 0, originY + unit * 49, unit * 50)
  halo.addColorStop(0, `rgba(224, 183, 103, ${haloPulse})`)
  halo.addColorStop(.42, `rgba(224, 183, 103, ${haloPulse * .38})`)
  halo.addColorStop(1, 'rgba(224, 183, 103, 0)')
  ctx.fillStyle = halo
  ctx.fillRect(originX - unit * 10, originY + unit * 2, unit * 96, unit * 94)
  ctx.globalCompositeOperation = 'source-over'

  // A solid, stepped shadow gives the bone drawing a readable silhouette over
  // the detailed illustration in the reliquary instead of letting both images
  // compete at the same contrast.
  ctx.fillStyle = 'rgba(4, 6, 9, .58)'
  ctx.beginPath()
  ctx.ellipse(0, originY + unit * 23, unit * 20, unit * 19, 0, 0, Math.PI * 2)
  ctx.moveTo(-unit * 14, originY + unit * 40)
  ctx.lineTo(unit * 14, originY + unit * 40)
  ctx.lineTo(unit * 11, originY + unit * 79)
  ctx.lineTo(unit * 7, originY + unit * 85)
  ctx.lineTo(-unit * 7, originY + unit * 85)
  ctx.lineTo(-unit * 11, originY + unit * 79)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(4, 6, 9, .58)'
  ctx.lineWidth = unit * 6
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-unit * 13, originY + unit * 43)
  ctx.lineTo(-unit * 24, originY + unit * 73)
  ctx.moveTo(unit * 13, originY + unit * 43)
  ctx.lineTo(unit * 24, originY + unit * 73)
  ctx.moveTo(-unit * 7, originY + unit * 82)
  ctx.lineTo(-unit * 10, originY + unit * 103)
  ctx.moveTo(unit * 7, originY + unit * 82)
  ctx.lineTo(unit * 10, originY + unit * 103)
  ctx.stroke()
  ctx.lineCap = 'butt'

  // The frame and ornament are seed variants, not a fixed stamp behind the body.
  pixel(36 + shift, 1, accent, ornamentMode === 2 ? 5 : 4, 2)
  pixel(27 + shift, 3, '#765d49', ornamentMode === 1 ? 20 : 16, 2)
  pixel(22 + shift, 5, '#987552', 2, 24)
  pixel(50 + shift, 5, '#987552', 2, 24)
  pixel(29 + shift, 25, accent, ornamentMode === 0 ? 16 : 11, 2)
  pixel(36 + shift, 4, '#c19a5f', 3, 39)
  pixel(27 + shift, 21, '#8c6a48', ornamentMode === 2 ? 19 : 15, 3)
  if (ornamentMode === 1) {
    for (let bead = 0; bead < 8; bead += 1) pixel(26 + shift + (bead % 2 ? 1 : -1), 30 + bead * 5, '#b98c5b', 2, 2)
  }
  if (ornamentMode === 2) {
    for (let ray = 0; ray < 7; ray += 1) {
      const rayX = 36 + shift + (ray - 3) * 4
      pixel(rayX, 8 - Math.abs(ray - 3), '#b28b5d', 2, 2 + Math.max(0, 3 - Math.abs(ray - 3)))
    }
  }

  // A translucent pixel silhouette separates the relic from the artwork in
  // the rear frame, while the bone cells above it retain their fine texture.
  const shadowCenter = 38 + skullTilt + shift
  const shadowRows = [7, 10, 13, 16, 19, 20, 20, 20, 20, 19, 19, 18, 18, 18, 17, 17, 17, 17, 16, 16, 15, 15, 14, 14, 13, 12, 11, 10, 9, 8]
  for (let row = 0; row < shadowRows.length; row += 1) {
    const half = shadowRows[row]
    for (let gx = shadowCenter - half; gx <= shadowCenter + half; gx += 1) shadowPixel(gx, skullTop + row)
  }
  shadowSegment(shadowCenter, 42, shadowCenter, 83, 5)
  shadowSegment(shadowCenter - 2, 45, shadowCenter - 15, 49, 4)
  shadowSegment(shadowCenter + 2, 45, shadowCenter + 15, 49, 4)
  shadowSegment(shadowCenter - 12, 49, shadowCenter - 16, 62, 4)
  shadowSegment(shadowCenter + 12, 49, shadowCenter + 16, 62, 4)
  shadowSegment(shadowCenter - 16, 62, shadowCenter - 23, 76, 4)
  shadowSegment(shadowCenter + 16, 62, shadowCenter + 23, 76, 4)
  shadowSegment(shadowCenter - 10, 80, shadowCenter - 8, 103, 5)
  shadowSegment(shadowCenter + 6, 80, shadowCenter + 8, 103, 5)

  // Seeded skull with a rounded cranium, cheek taper and a separate jaw.
  const skullCenter = shadowCenter
  const skullRows = [7, 11, 15, 18, 20, 21, 21, 21, 21, 21, 21, 20, 20, 20, 19, 19, 19, 18, 18, 18, 17, 17, 16, 16, 15, 14, 13, 12, 11, 10]
  for (let row = 0; row < skullRows.length; row += 1) {
    const gy = skullTop + row
    const half = skullRows[row] + Math.round((random() - .5) * 1.2)
    const left = skullCenter - half
    const right = skullCenter + half
    for (let gx = left; gx <= right; gx += 1) {
      const eyeRow = row >= 9 && row <= 16
      const eyeCavity = eyeRow && ((gx >= skullCenter - eyeGap - 5 && gx <= skullCenter - eyeGap + 1) || (gx >= skullCenter + eyeGap - 1 && gx <= skullCenter + eyeGap + 5))
      const noseCavity = row >= 17 && row <= 21 && gx >= skullCenter - 3 && gx <= skullCenter + 3
      if (eyeCavity || noseCavity) continue
      const edge = gx === left || gx === right || row < 2 || row > skullRows.length - 3
      bonePixel(gx, gy, edge ? 2 : Math.floor(random() * 3))
    }
  }
  // Cheek plates and a narrow, articulated lower jaw.
  for (const side of [-1, 1] as const) {
    boneSegment(skullCenter + side * 8, skullTop + 22, skullCenter + side * 11, skullTop + 28, 2)
    boneSegment(skullCenter + side * 11, skullTop + 28, skullCenter + side * 7, skullTop + 32, 1)
  }
  for (let jaw = 0; jaw < 3; jaw += 1) {
    boneSegment(skullCenter - (9 - jaw), skullTop + 31 + jaw, skullCenter + (9 - jaw), skullTop + 31 + jaw, jaw === 1 ? 1 : 2)
  }
  for (const side of [-1, 1] as const) {
    const eyeX = skullCenter + side * eyeGap
    for (let eyeRow = 0; eyeRow < 6; eyeRow += 1) {
      pixel(eyeX - 4 + (eyeRow > 2 ? side : 0), skullTop + 10 + eyeRow, '#090c11', 7, 1)
    }
    pixel(eyeX - 1, skullTop + 13, '#eff4dd', 3, 1)
    pixel(eyeX + side * 2, skullTop + 15, '#aebd9d', 2, 1)
  }
  pixel(skullCenter - 2, skullTop + 18, '#0a0c10', 5, 5)
  for (let tooth = 0; tooth < 9; tooth += 1) {
    const toothX = skullCenter - 8 + tooth * 2
    const toothHeight = 2 + ((tooth + Math.floor(random() * 3)) % 3)
    pixel(toothX, skullTop + 32, tooth % 2 ? '#817865' : '#e0d0a5', 1, toothHeight)
  }

  // Fine-grained torso: vertebrae, clavicles and curved ribs follow an
  // anatomical cage instead of rectangular bars.
  const spineX = 37 + shift
  for (let vertebra = 0; vertebra < 42; vertebra += 1) {
    const gy = skullTop + 36 + vertebra
    if (gy > 82) break
    bonePixel(spineX + (vertebra % 4 === 0 ? 1 : 0), gy, vertebra % 3 === 0 ? 1 : 2)
  }
  boneSegment(spineX - 1, 43 + armRaise, spineX - 12, 46 + armRaise, 1, 2)
  boneSegment(spineX + 1, 43 - armRaise, spineX + 12, 46 - armRaise, 1, 2)
  for (let rib = 0; rib < 9; rib += 1) {
    const ribY = 48 + rib * 3
    const ribSpan = 14 - Math.floor(rib * .65)
    const ribDepth = 3 + Math.floor(rib * .35)
    for (const side of [-1, 1] as const) {
      for (let segment = 0; segment <= ribSpan; segment += 1) {
        const amount = segment / ribSpan
        const gx = spineX + side * (3 + segment)
        const gy = ribY + Math.round(Math.sin(amount * Math.PI) * ribDepth) + Math.round(Math.sin(rib * .7 + ribBend) * .4)
        if (segment % 5 !== 4 || segment === ribSpan) bonePixel(gx, gy, rib % 2 ? 1 : 2)
      }
    }
    pixel(spineX - ribSpan - 3, ribY + 1, '#55534d')
    pixel(spineX + ribSpan + 3, ribY + 1, '#55534d')
  }

  // Small plates at the sternum, scapulae and knees break up the old stick
  // silhouette while staying on the same fine logical grid as every other bone.
  bonePixel(spineX - 2, 46, 1, 4, 3)
  bonePixel(spineX - 2, 53, 0, 4, 3)
  for (const side of [-1, 1] as const) {
    bonePixel(spineX + side * 13, 47, 1, 4, 3)
    bonePixel(spineX + side * 16, 61, 2, 3, 3)
    bonePixel(spineX + side * 9, 91, 0, 4, 3)
    bonePixel(spineX + side * 6, 99, 1, 3, 3)
  }

  // Arms are two bone segments with visible elbows and wrists.
  const leftShoulder = [22 + shift, 45 + armRaise]
  const rightShoulder = [52 + shift, 45 - armRaise]
  const leftElbow = [14 + shift - Math.floor(armRaise * .25), 61 + armRaise]
  const rightElbow = [60 + shift + Math.floor(armRaise * .25), 60 - armRaise]
  const leftWrist = [9 + shift, 75 + armRaise]
  const rightWrist = [66 + shift, 74 - armRaise]
  boneSegment(leftShoulder[0], leftShoulder[1], leftElbow[0], leftElbow[1], 1, 2)
  boneSegment(leftElbow[0], leftElbow[1], leftWrist[0], leftWrist[1], 2, 2)
  boneSegment(rightShoulder[0], rightShoulder[1], rightElbow[0], rightElbow[1], 1, 2)
  boneSegment(rightElbow[0], rightElbow[1], rightWrist[0], rightWrist[1], 2, 2)
  pixel(leftElbow[0], leftElbow[1], '#e0cea3', 3, 3)
  pixel(rightElbow[0], rightElbow[1], '#e0cea3', 3, 3)
  for (let finger = 0; finger < 5; finger += 1) {
    pixel(leftWrist[0] - finger, leftWrist[1] + 2 + (finger % 2), '#71685d')
    pixel(rightWrist[0] + finger, rightWrist[1] + 2 + (finger % 2), '#71685d')
  }

  // Iliac wings, sacrum and two articulated legs complete the silhouette.
  for (const side of [-1, 1] as const) {
    boneSegment(spineX, 78, spineX + side * 13, 76, 2, 2)
    boneSegment(spineX + side * 13, 76, spineX + side * 17, 82, 1, 2)
    boneSegment(spineX + side * 5, 82, spineX + side * 9, 94, 2, 2)
    pixel(spineX + side * 9, 94, '#e0cea3', 3, 3)
    boneSegment(spineX + side * 9, 96, spineX + side * 7, 102, 1, 2)
    boneSegment(spineX + side * 7, 102, spineX + side * 4, 103, 2, 2)
  }
  boneSegment(spineX - 2, 79, spineX + 2, 84, 1, 2)

  if (artifactMask & 1) drawSword(artifactSide)
  if (artifactMask & 2) drawStaff(oppositeSide)
  if (artifactMask & 4) drawShield(artifactMask & 1 ? oppositeSide : artifactSide)

  // A few restrained flecks sit near joints and bone edges; unrestricted noise
  // made the fine grid read as static instead of an anatomical figure.
  for (let fleck = 0; fleck < 20; fleck += 1) {
    const gx = 14 + Math.floor(random() * 48)
    const gy = 44 + Math.floor(random() * 52)
    if (Math.abs(gx - spineX) < 18 || gy > 78) pixel(gx, gy, random() > .5 ? 'rgba(245, 224, 169, .62)' : '#5d5a54', 1, 1)
  }
  ctx.restore()
}

const drawRelicCase = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, hue: number, t: number, image?: RelicFrameImage) => {
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
  const innerX = x - width * .39
  const innerY = y - height * .79
  const innerWidth = width * .78
  const innerHeight = height * .56
  ctx.fillStyle = '#17151d'
  ctx.fillRect(innerX, innerY, innerWidth, innerHeight)
  if (image?.complete && image.naturalWidth > 0 && image.naturalHeight > 0) {
    const sourceRatio = image.naturalWidth / image.naturalHeight
    const frameRatio = innerWidth / innerHeight
    let sourceWidth = image.naturalWidth
    let sourceHeight = image.naturalHeight
    let sourceX = 0
    let sourceY = 0
    if (sourceRatio > frameRatio) {
      sourceWidth = image.naturalHeight * frameRatio
      sourceX = (image.naturalWidth - sourceWidth) / 2
    } else {
      sourceHeight = image.naturalWidth / frameRatio
      sourceY = (image.naturalHeight - sourceHeight) / 2
    }
    ctx.save()
    ctx.beginPath()
    ctx.rect(innerX, innerY, innerWidth, innerHeight)
    ctx.clip()
    ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, innerX, innerY, innerWidth, innerHeight)
    ctx.fillStyle = 'rgba(7, 9, 14, .26)'
    ctx.fillRect(innerX, innerY, innerWidth, innerHeight)
    const wash = ctx.createLinearGradient(innerX, innerY, innerX, innerY + innerHeight)
    wash.addColorStop(0, 'rgba(7, 8, 13, .08)')
    wash.addColorStop(1, 'rgba(7, 8, 13, .42)')
    ctx.fillStyle = wash
    ctx.fillRect(innerX, innerY, innerWidth, innerHeight)
    ctx.restore()
  }
  ctx.strokeStyle = 'rgba(137, 148, 150, .38)'
  ctx.lineWidth = Math.max(1, width * .009)
  ctx.strokeRect(innerX, innerY, innerWidth, innerHeight)
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

const drawVaultDetails = (ctx: CanvasRenderingContext2D, width: number, height: number, t: number, frameImages: readonly RelicFrameImage[]) => {
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

  drawRelicCase(ctx, width * .16, height * .67, width * .12 * sideScale, height * .22 * sideScale, 344, t, frameImages[0])
  drawRelicCase(ctx, width * .84, height * .67, width * .12 * sideScale, height * .22 * sideScale, 44, t, frameImages[1])
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

const drawHolyLight = (ctx: CanvasRenderingContext2D, width: number, height: number, vpX: number, floorY: number, t: number, reducedMotion: boolean) => {
  const pulse = reducedMotion ? 0 : Math.sin(t * 1.7) * .018
  const topX = vpX + (reducedMotion ? 0 : Math.sin(t * .35) * width * .012)
  const topY = -height * .04
  const bottomY = floorY + height * .16
  const topHalf = width * .026
  const bottomHalf = width * .2

  // Clip the shaft before compositing so the room outside the holy beam stays dark.
  ctx.save()
  polygon(ctx, [[topX - topHalf, topY], [topX + topHalf, topY], [vpX + bottomHalf, bottomY], [vpX - bottomHalf, bottomY]])
  ctx.clip()
  ctx.globalCompositeOperation = 'screen'
  const beam = ctx.createLinearGradient(topX, topY, vpX, bottomY)
  beam.addColorStop(0, 'rgba(255, 248, 211, .025)')
  beam.addColorStop(.34, `rgba(255, 240, 187, ${.065 + pulse})`)
  beam.addColorStop(1, `rgba(224, 183, 103, ${.13 + pulse})`)
  ctx.fillStyle = beam
  ctx.fillRect(vpX - bottomHalf, topY, bottomHalf * 2, bottomY - topY)
  const shaft = ctx.createRadialGradient(vpX, floorY * .82, 0, vpX, floorY * .82, bottomHalf * 1.2)
  shaft.addColorStop(0, 'rgba(255, 249, 218, .16)')
  shaft.addColorStop(1, 'rgba(255, 223, 153, 0)')
  ctx.fillStyle = shaft
  ctx.fillRect(vpX - bottomHalf * 1.2, topY, bottomHalf * 2.4, bottomY - topY)
  ctx.restore()

  // The beam leaves a restrained, perspective grid-shaped caustic on the floor.
  const spotX = vpX + (reducedMotion ? 0 : Math.sin(t * .35) * width * .01)
  const spotY = height * .95
  const spotWidth = width * .3
  const spotHeight = height * .055
  ctx.save()
  ctx.beginPath()
  ctx.ellipse(spotX, spotY, spotWidth, spotHeight, 0, 0, Math.PI * 2)
  ctx.clip()
  ctx.beginPath()
  ctx.rect(0, height * .9, width, height * .1)
  ctx.clip()
  ctx.globalCompositeOperation = 'screen'
  const spot = ctx.createRadialGradient(spotX, spotY, 0, spotX, spotY, spotWidth)
  spot.addColorStop(0, 'rgba(255, 241, 190, .18)')
  spot.addColorStop(.62, 'rgba(222, 177, 101, .065)')
  spot.addColorStop(1, 'rgba(222, 177, 101, 0)')
  ctx.fillStyle = spot
  ctx.fillRect(spotX - spotWidth, spotY - spotHeight, spotWidth * 2, spotHeight * 2)
  ctx.strokeStyle = `rgba(255, 227, 161, ${.2 + pulse})`
  ctx.lineWidth = Math.max(1, width * .0012)
  for (let line = -6; line <= 6; line += 1) {
    const startX = spotX + line * spotWidth * .15
    ctx.beginPath()
    ctx.moveTo(startX, spotY - spotHeight)
    ctx.lineTo(spotX + line * spotWidth * .42, spotY + spotHeight)
    ctx.stroke()
  }
  for (let row = 0; row < 5; row += 1) {
    const y = spotY - spotHeight + row * spotHeight * .5
    ctx.beginPath()
    ctx.moveTo(spotX - spotWidth, y)
    ctx.lineTo(spotX + spotWidth, y)
    ctx.stroke()
  }
  ctx.restore()
}

const drawSaintRelicRoom = (ctx: CanvasRenderingContext2D, width: number, height: number, time: number, reducedMotion: boolean, seed: number, frameImages: readonly RelicFrameImage[]) => {
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
  drawVaultDetails(ctx, width, height, t, frameImages)
  drawRelicCase(ctx, vpX, height * .86, width * .25, height * .36, 316, t, frameImages[2])
  drawPixelRelic(ctx, vpX, height * .84, width, t, reducedMotion, seed)
  drawHolyLight(ctx, width, height, vpX, floorY, t, reducedMotion)

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
  const [seed, setSeed] = useState(20260903)
  const [seedInput, setSeedInput] = useState('20260903')
  const [frameImages, setFrameImages] = useState<readonly RelicFrameImage[]>([])

  useEffect(() => {
    let disposed = false
    const sources = ['/relic-frame-01.png', '/relic-frame-02.png', '/relic-frame-03.png']
    const images = sources.map((source) => {
      const image = new Image()
      image.decoding = 'async'
      image.src = source
      return image
    })
    Promise.all(images.map((image) => image.decode().catch(() => undefined))).then(() => {
      if (!disposed) setFrameImages(images)
    })
    return () => { disposed = true }
  }, [])

  const redrawWithSeed = () => {
    const parsed = Number.parseInt(seedInput, 10)
    const nextSeed = Number.isFinite(parsed) ? (parsed >>> 0) : seed
    setSeed(nextSeed)
    setSeedInput(String(nextSeed))
  }

  const redrawRandom = () => {
    const nextSeed = Math.floor(Math.random() * 0xffffffff) >>> 0
    setSeed(nextSeed)
    setSeedInput(String(nextSeed))
  }

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
      drawSaintRelicRoom(ctx, width, height, 0, reducedMotion, seed, frameImages)
    }
    const render = (time: number) => {
      if (disposed) return
      drawSaintRelicRoom(ctx, width, height, time, reducedMotion, seed, frameImages)
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
  }, [frameImages, reducedMotion, seed])

  const backStyle: CSSProperties = { left: '50%', bottom: '6%' }
  return (
    <main className="saint-relic-scene" data-scene="saint-relic" data-seed={seed} aria-labelledby="saint-relic-title">
      <div className="saint-relic-stage" ref={stageRef}>
        <canvas ref={canvasRef} className="saint-relic-canvas" role="img" aria-label="具有透视墙壁和中央像素圣徒遗骨像的圣遗物室" />
        <header className="saint-relic-header">
          <p className="saint-relic-kicker">第三展馆 <span>/</span> 遗骨室</p>
          <h1 id="saint-relic-title">圣遗物室</h1>
          <p className="saint-relic-subtitle">THE RELIC VAULT</p>
        </header>
        <section className="saint-relic-controls" aria-label="圣徒遗骨重绘控制">
          <div className="saint-relic-seed-field">
            <label htmlFor="saint-relic-seed">种子</label>
            <input id="saint-relic-seed" type="number" inputMode="numeric" value={seedInput} onChange={(event) => setSeedInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') redrawWithSeed() }} />
          </div>
          <button type="button" className="saint-relic-action" onClick={redrawWithSeed}>
            <RefreshCw aria-hidden="true" />
            <span>按种子重绘</span>
          </button>
          <button type="button" className="saint-relic-action saint-relic-action--quiet" onClick={redrawRandom}>
            <Dices aria-hidden="true" />
            <span>随机种子</span>
          </button>
          <button type="button" className="saint-relic-action saint-relic-action--garden" onClick={() => { window.location.hash = '#/bone-garden' }} title="前往骨园">
            <DoorOpen aria-hidden="true" />
            <span>进入骨园</span>
          </button>
        </section>
        <button type="button" className="saint-relic-back" style={backStyle} onClick={() => { window.location.hash = '#/clocktower' }}>
          <ArrowLeft aria-hidden="true" />
          <span>返回钟楼</span>
        </button>
      </div>
    </main>
  )
}
