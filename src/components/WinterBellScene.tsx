import { BellRing, CloudSnow, Snowflake } from 'lucide-react'
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import './winter-bell.css'

type WinterBellSceneProps = {
  reducedMotion?: boolean
  effectsEnabled?: boolean
}

type SnowParticle = {
  x: number
  y: number
  speed: number
  size: number
  drift: number
  phase: number
  opacity: number
}

const seededRandom = (seed: number) => {
  let state = (seed >>> 0) || 0x6d2b79f5
  return () => {
    state = Math.imul(state ^ (state >>> 16), 2246822507)
    state = Math.imul(state ^ (state >>> 13), 3266489909)
    return ((state ^ (state >>> 16)) >>> 0) / 4294967296
  }
}

const createSnow = () => {
  const random = seededRandom(0x12081989)
  return Array.from({ length: 150 }, () => ({
    x: random(),
    y: random(),
    speed: .018 + random() * .06,
    size: .8 + random() * 2.8,
    drift: .004 + random() * .018,
    phase: random() * Math.PI * 2,
    opacity: .22 + random() * .55,
  }))
}

const drawSnowTombstone = (ctx: CanvasRenderingContext2D, x: number, base: number, width: number, height: number, alpha: number, tilt: number, snow: boolean, tone: string, variant = 0) => {
  ctx.save()
  ctx.translate(x, base)
  ctx.rotate(tilt)
  const half = width / 2
  const top = -height
  const stone = ctx.createLinearGradient(-half, top, half, 0)
  stone.addColorStop(0, tone)
  stone.addColorStop(.58, '#2a3035')
  stone.addColorStop(1, '#12171d')
  ctx.globalAlpha = alpha
  ctx.fillStyle = stone
  ctx.strokeStyle = 'rgba(183, 193, 188, .55)'
  ctx.lineWidth = Math.max(1, width * .026)
  ctx.beginPath()
  ctx.moveTo(-half, 0)
  if (variant % 3 === 0) {
    ctx.lineTo(-half * .96, top + height * .18)
    ctx.quadraticCurveTo(0, top - height * .12, half * .96, top + height * .18)
  } else if (variant % 3 === 1) {
    ctx.lineTo(-half * .96, top + height * .16)
    ctx.lineTo(0, top - height * .16)
    ctx.lineTo(half * .96, top + height * .16)
  } else {
    ctx.lineTo(-half * .96, top + height * .2)
    ctx.lineTo(-half * .58, top + height * .08)
    ctx.quadraticCurveTo(0, top - height * .1, half * .58, top + height * .08)
    ctx.lineTo(half * .96, top + height * .2)
  }
  ctx.lineTo(half, 0)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.strokeStyle = 'rgba(121, 145, 150, .34)'
  ctx.lineWidth = Math.max(1, width * .014)
  ctx.beginPath()
  ctx.moveTo(-half * .52, top + height * .36)
  ctx.lineTo(half * .52, top + height * .36)
  ctx.moveTo(-half * .18, top + height * .23)
  ctx.lineTo(-half * .18, top + height * .5)
  ctx.stroke()
  if (snow) {
    ctx.fillStyle = 'rgba(224, 231, 222, .86)'
    ctx.beginPath()
    ctx.moveTo(-half * 1.02, top + height * .2)
    ctx.quadraticCurveTo(-half * .18, top - height * .13, half * 1.02, top + height * .2)
    ctx.lineTo(half * .86, top + height * .29)
    ctx.quadraticCurveTo(0, top + height * .02, -half * .88, top + height * .3)
    ctx.closePath()
    ctx.fill()
  }
  // Weathered engraving and small fractures keep distant stones readable as
  // carved objects instead of uniform geometric tiles.
  ctx.save()
  ctx.globalAlpha = alpha * .48
  ctx.strokeStyle = 'rgba(182, 195, 190, .62)'
  ctx.lineWidth = Math.max(.8, width * .009)
  for (let inscription = 0; inscription < 3; inscription += 1) {
    const rowY = top + height * (.48 + inscription * .075)
    const rowWidth = half * (.36 - inscription * .045)
    ctx.beginPath()
    ctx.moveTo(-rowWidth, rowY)
    ctx.lineTo(rowWidth, rowY + (inscription % 2 ? .7 : -.4))
    ctx.stroke()
  }
  ctx.strokeStyle = 'rgba(112, 137, 141, .64)'
  ctx.beginPath()
  ctx.moveTo(-half * .62, top + height * .28)
  ctx.lineTo(-half * .47, top + height * .37)
  ctx.lineTo(-half * .53, top + height * .45)
  ctx.moveTo(half * .5, top + height * .34)
  ctx.lineTo(half * .38, top + height * .43)
  ctx.lineTo(half * .44, top + height * .52)
  ctx.stroke()
  // Each marker gets one readable carved motif instead of detached triangles.
  ctx.strokeStyle = 'rgba(201, 207, 197, .46)'
  ctx.lineWidth = Math.max(.8, width * .008)
  if (variant % 3 === 1) {
    const crossY = top + height * .42
    ctx.beginPath()
    ctx.moveTo(0, top + height * .25)
    ctx.lineTo(0, top + height * .66)
    ctx.moveTo(-half * .3, crossY)
    ctx.lineTo(half * .3, crossY)
    ctx.stroke()
    ctx.fillStyle = 'rgba(201, 207, 197, .28)'
    ctx.beginPath()
    ctx.arc(0, crossY, Math.max(1, width * .018), 0, Math.PI * 2)
    ctx.fill()
  } else if (variant % 3 === 2) {
    for (const side of [-1, 1] as const) {
      const windowX = side * half * .28
      ctx.beginPath()
      ctx.moveTo(windowX - half * .09, top + height * .62)
      ctx.lineTo(windowX - half * .09, top + height * .42)
      ctx.quadraticCurveTo(windowX, top + height * .3, windowX + half * .09, top + height * .42)
      ctx.lineTo(windowX + half * .09, top + height * .62)
      ctx.stroke()
    }
  } else {
    ctx.beginPath()
    ctx.moveTo(0, top + height * .25)
    ctx.lineTo(-half * .2, top + height * .42)
    ctx.lineTo(0, top + height * .6)
    ctx.lineTo(half * .2, top + height * .42)
    ctx.closePath()
    ctx.stroke()
  }
  ctx.restore()
  ctx.restore()
}

const drawDistantGothicTower = (ctx: CanvasRenderingContext2D, x: number, base: number, width: number, height: number, alpha: number, variant: number) => {
  ctx.save()
  ctx.translate(x, base)
  const half = width / 2
  const top = -height
  ctx.globalAlpha = alpha
  const stone = ctx.createLinearGradient(-half, top, half, 0)
  stone.addColorStop(0, '#26343d')
  stone.addColorStop(.5, '#101a24')
  stone.addColorStop(1, '#070d15')
  ctx.fillStyle = stone
  ctx.strokeStyle = 'rgba(168, 185, 183, .36)'
  ctx.lineWidth = Math.max(1, width * .018)
  ctx.beginPath()
  ctx.moveTo(-half * .7, 0)
  ctx.lineTo(-half * .7, top + height * .2)
  ctx.lineTo(-half * .42, top + height * .15)
  ctx.lineTo(-half * .34, top + height * .04)
  ctx.lineTo(0, top - height * .13)
  ctx.lineTo(half * .34, top + height * .04)
  ctx.lineTo(half * .42, top + height * .15)
  ctx.lineTo(half * .7, top + height * .2)
  ctx.lineTo(half * .7, 0)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  // One continuous snow lip follows the roof ridge; a second inverted V here
  // used to create a field of accidental M-shaped marks.
  ctx.strokeStyle = 'rgba(218, 225, 216, .64)'
  ctx.lineWidth = Math.max(1, width * .014)
  ctx.beginPath()
  ctx.moveTo(-half * .38, top + height * .06)
  ctx.quadraticCurveTo(0, top - height * .12, half * .38, top + height * .06)
  ctx.stroke()

  // A wall pier and one closed flying-buttress profile on each side establish
  // a believable load path instead of loose M-shaped lines.
  for (const side of [-1, 1] as const) {
    if (variant % 3 !== 0) continue
    const pinX = side * half * .56
    const pierX = side * half * .9
    ctx.fillStyle = 'rgba(20, 31, 39, .8)'
    ctx.strokeStyle = 'rgba(177, 195, 191, .42)'
    ctx.lineWidth = Math.max(1, width * .014)
    ctx.beginPath()
    ctx.moveTo(pierX - side * half * .1, 0)
    ctx.lineTo(pierX - side * half * .1, top + height * .24)
    ctx.lineTo(pierX, top + height * .13)
    ctx.lineTo(pierX + side * half * .1, top + height * .24)
    ctx.lineTo(pierX + side * half * .1, 0)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = 'rgba(214, 223, 215, .52)'
    ctx.beginPath()
    ctx.moveTo(pierX - side * half * .09, top + height * .24)
    ctx.lineTo(pierX, top + height * .11)
    ctx.lineTo(pierX + side * half * .09, top + height * .24)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = 'rgba(22, 34, 41, .9)'
    ctx.strokeStyle = 'rgba(203, 190, 147, .46)'
    ctx.beginPath()
    ctx.moveTo(pinX, top + height * .5)
    ctx.lineTo(pierX - side * half * .055, top + height * .28)
    ctx.lineTo(pierX + side * half * .055, top + height * .28)
    ctx.lineTo(pinX + side * half * .07, top + height * .53)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }

  ctx.strokeStyle = 'rgba(152, 184, 184, .58)'
  ctx.lineWidth = Math.max(1, width * .012)
  const windowRows = 2 + (variant % 2)
  for (let row = 0; row < windowRows; row += 1) {
    const rowY = top + height * (.3 + row * .17)
    const windowWidth = half * (.16 - row * .015)
    ctx.beginPath()
    ctx.moveTo(-windowWidth, rowY + height * .09)
    ctx.lineTo(-windowWidth, rowY + height * .025)
    ctx.quadraticCurveTo(0, rowY - height * .06, windowWidth, rowY + height * .025)
    ctx.lineTo(windowWidth, rowY + height * .09)
    ctx.moveTo(0, rowY - height * .055)
    ctx.lineTo(0, rowY + height * .09)
    ctx.stroke()
  }
  ctx.strokeStyle = 'rgba(204, 191, 145, .3)'
  ctx.lineWidth = Math.max(1, width * .006)
  ctx.beginPath()
  ctx.moveTo(-half * .76, top + height * .72)
  ctx.lineTo(-half * .56, top + height * .56)
  ctx.lineTo(-half * .38, top + height * .72)
  ctx.moveTo(half * .76, top + height * .72)
  ctx.lineTo(half * .56, top + height * .56)
  ctx.lineTo(half * .38, top + height * .72)
  ctx.stroke()
  ctx.restore()
}

const drawMonument = (ctx: CanvasRenderingContext2D, x: number, base: number, width: number, height: number, time: number, pulse: number) => {
  ctx.save()
  ctx.translate(x, base)
  const half = width / 2
  const top = -height
  const stone = ctx.createLinearGradient(-half, top, half, 0)
  stone.addColorStop(0, '#4c5558')
  stone.addColorStop(.35, '#20282d')
  stone.addColorStop(.75, '#11171d')
  stone.addColorStop(1, '#090d13')
  ctx.shadowColor = 'rgba(154, 185, 183, .28)'
  ctx.shadowBlur = 22 + pulse * 35
  ctx.fillStyle = stone
  ctx.strokeStyle = 'rgba(203, 190, 148, .58)'
  ctx.lineWidth = Math.max(2, width * .014)
  ctx.beginPath()
  ctx.moveTo(-half, 0)
  ctx.lineTo(-half * .9, top + height * .2)
  ctx.lineTo(-half * .62, top + height * .13)
  ctx.lineTo(-half * .48, top + height * .02)
  ctx.lineTo(0, top - height * .16)
  ctx.lineTo(half * .48, top + height * .02)
  ctx.lineTo(half * .62, top + height * .13)
  ctx.lineTo(half * .9, top + height * .2)
  ctx.lineTo(half, 0)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = 'rgba(4, 7, 11, .88)'
  ctx.strokeStyle = 'rgba(187, 166, 116, .76)'
  ctx.lineWidth = Math.max(1.5, width * .011)
  ctx.beginPath()
  ctx.moveTo(-width * .22, -height * .14)
  ctx.lineTo(-width * .22, -height * .52)
  ctx.quadraticCurveTo(0, -height * .83, width * .22, -height * .52)
  ctx.lineTo(width * .22, -height * .14)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = '#b59a63'
  ctx.beginPath()
  ctx.arc(0, -height * .49, Math.max(2, width * .025), 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(206, 185, 130, .48)'
  ctx.lineWidth = Math.max(1, width * .008)
  ctx.beginPath()
  ctx.moveTo(-half * .55, top + height * .35)
  ctx.lineTo(half * .55, top + height * .35)
  ctx.moveTo(-half * .68, top + height * .52)
  ctx.lineTo(half * .68, top + height * .52)
  ctx.stroke()

  ctx.fillStyle = 'rgba(228, 234, 225, .9)'
  ctx.beginPath()
  ctx.moveTo(-half * .7, top + height * .18)
  ctx.quadraticCurveTo(-half * .18, top - height * .2, 0, top - height * .16)
  ctx.quadraticCurveTo(half * .34, top - height * .13, half * .72, top + height * .18)
  ctx.lineTo(half * .58, top + height * .27)
  ctx.quadraticCurveTo(0, top + height * .02, -half * .58, top + height * .29)
  ctx.closePath()
  ctx.fill()

  // Layered masonry, ribs and side finials give the memorial a constructed
  // Gothic silhouette beneath the snow cap.
  ctx.save()
  ctx.globalAlpha = .52
  ctx.strokeStyle = 'rgba(142, 164, 162, .44)'
  ctx.lineWidth = Math.max(1, width * .006)
  for (let seam = 0; seam < 5; seam += 1) {
    const seamY = top + height * (.28 + seam * .12)
    const inset = half * (.84 - seam * .06)
    ctx.beginPath()
    ctx.moveTo(-inset, seamY)
    ctx.lineTo(inset, seamY)
    ctx.stroke()
  }
  ctx.strokeStyle = 'rgba(193, 175, 125, .48)'
  ctx.lineWidth = Math.max(1.1, width * .008)
  for (const side of [-1, 1] as const) {
    const edgeX = side * half * .66
    ctx.beginPath()
    ctx.moveTo(edgeX, top + height * .1)
    ctx.lineTo(side * half * .82, top + height * .78)
    ctx.moveTo(side * half * .52, top + height * .12)
    ctx.lineTo(side * half * .6, top + height * .78)
    ctx.stroke()
    ctx.fillStyle = 'rgba(215, 201, 160, .78)'
    ctx.beginPath()
    ctx.moveTo(side * half * .8, top + height * .1)
    ctx.lineTo(side * half * .9, top + height * .02)
    ctx.lineTo(side * half * .78, top + height * .02)
    ctx.closePath()
    ctx.fill()
  }
  ctx.strokeStyle = 'rgba(210, 191, 140, .42)'
  ctx.lineWidth = Math.max(1, width * .005)
  ctx.beginPath()
  ctx.moveTo(-width * .14, -height * .77)
  ctx.lineTo(0, -height * .9)
  ctx.lineTo(width * .14, -height * .77)
  ctx.moveTo(-width * .12, -height * .69)
  ctx.lineTo(0, -height * .81)
  ctx.lineTo(width * .12, -height * .69)
  ctx.stroke()
  ctx.restore()

  // Recessed side niches and a rose-window tracery give the central memorial
  // a carved interior instead of a single flat silhouette.
  ctx.save()
  ctx.globalAlpha = .72
  for (const side of [-1, 1] as const) {
    const nicheX = side * width * .28
    ctx.fillStyle = 'rgba(5, 9, 14, .74)'
    ctx.strokeStyle = 'rgba(190, 176, 133, .5)'
    ctx.lineWidth = Math.max(1, width * .006)
    ctx.beginPath()
    ctx.moveTo(nicheX - side * width * .075, -height * .16)
    ctx.lineTo(nicheX - side * width * .075, -height * .42)
    ctx.quadraticCurveTo(nicheX, -height * .58, nicheX + side * width * .075, -height * .42)
    ctx.lineTo(nicheX + side * width * .075, -height * .16)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.strokeStyle = 'rgba(139, 166, 164, .48)'
    ctx.beginPath()
    ctx.moveTo(nicheX, -height * .51)
    ctx.lineTo(nicheX, -height * .2)
    ctx.moveTo(nicheX - side * width * .05, -height * .37)
    ctx.lineTo(nicheX + side * width * .05, -height * .37)
    ctx.stroke()
  }
  ctx.strokeStyle = 'rgba(215, 193, 141, .64)'
  ctx.lineWidth = Math.max(1, width * .005)
  ctx.beginPath()
  ctx.arc(0, -height * .62, width * .095, 0, Math.PI * 2)
  for (let spoke = 0; spoke < 8; spoke += 1) {
    const angle = spoke * Math.PI / 4
    ctx.moveTo(0, -height * .62)
    ctx.lineTo(Math.cos(angle) * width * .095, -height * .62 + Math.sin(angle) * width * .095)
  }
  ctx.stroke()
  ctx.restore()

  // Stepped plinth and snow shelves separate the monument from the ground.
  ctx.save()
  ctx.fillStyle = 'rgba(12, 18, 23, .94)'
  ctx.strokeStyle = 'rgba(188, 177, 143, .5)'
  ctx.lineWidth = Math.max(1, width * .008)
  ctx.beginPath()
  ctx.moveTo(-half * 1.12, 0)
  ctx.lineTo(half * 1.12, 0)
  ctx.lineTo(half * .98, height * .065)
  ctx.lineTo(-half * .98, height * .065)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(-half * .94, height * .065)
  ctx.lineTo(half * .94, height * .065)
  ctx.lineTo(half * .82, height * .115)
  ctx.lineTo(-half * .82, height * .115)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = 'rgba(226, 233, 224, .78)'
  ctx.beginPath()
  ctx.moveTo(-half * 1.02, height * .01)
  ctx.quadraticCurveTo(-half * .45, -height * .03, 0, height * .012)
  ctx.quadraticCurveTo(half * .48, -height * .02, half * 1.02, height * .01)
  ctx.lineTo(half * .92, height * .035)
  ctx.quadraticCurveTo(0, height * .055, -half * .92, height * .035)
  ctx.closePath()
  ctx.fill()
  ctx.restore()

  if (pulse > 0) {
    ctx.save()
    ctx.globalAlpha = pulse * .62
    ctx.strokeStyle = '#d9be77'
    ctx.lineWidth = Math.max(1.5, width * .009)
    for (let ring = 0; ring < 3; ring += 1) {
      ctx.beginPath()
      ctx.arc(0, -height * .49, width * (.32 + ring * .16) + (1 - pulse) * width * .18, Math.PI * 1.08, Math.PI * 1.92)
      ctx.stroke()
    }
    ctx.restore()
  }
  if (!pulse) {
    ctx.globalAlpha = .3 + Math.sin(time * .001) * .05
    ctx.strokeStyle = '#8ea8a4'
    ctx.lineWidth = Math.max(1, width * .006)
    ctx.beginPath()
    ctx.arc(0, -height * .49, width * .24, Math.PI * 1.1, Math.PI * 1.9)
    ctx.stroke()
  }
  ctx.restore()
}

const drawWinterBell = (ctx: CanvasRenderingContext2D, width: number, height: number, time: number, reducedMotion: boolean, pulse: number, parallaxX: number, parallaxY: number, particles: SnowParticle[], backgroundImage: HTMLImageElement | null) => {
  const drift = reducedMotion ? 0 : time * .000008
  const snowGradient = ctx.createLinearGradient(0, 0, 0, height)
  snowGradient.addColorStop(0, '#111b27')
  snowGradient.addColorStop(.52, '#273744')
  snowGradient.addColorStop(1, '#c0cbd0')
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = snowGradient
  ctx.fillRect(0, 0, width, height)

  // Low-alpha art plate keeps the supplied 90s reference behind the snow layers.
  if (backgroundImage?.complete && backgroundImage.naturalWidth > 0) {
    ctx.save()
    const imageScale = Math.max(width / backgroundImage.naturalWidth, height / backgroundImage.naturalHeight) * 1.12
    const imageWidth = backgroundImage.naturalWidth * imageScale
    const imageHeight = backgroundImage.naturalHeight * imageScale
    ctx.globalAlpha = .5
    ctx.translate(parallaxX * width * .04, parallaxY * height * .022)
    ctx.drawImage(backgroundImage, (width - imageWidth) / 2, (height - imageHeight) / 2, imageWidth, imageHeight)
    ctx.restore()
  } else {
    ctx.save()
    ctx.globalAlpha = .1
    ctx.translate(parallaxX * width * .04, parallaxY * height * .022)
    ctx.fillStyle = '#60747a'
    ctx.fillRect(-width * .1, height * .09, width * 1.2, height * .48)
    ctx.restore()
  }

  // Far skyline: varied Gothic towers, open buttresses and lit lancets hold
  // the deepest plane behind the snow field.
  ctx.save()
    ctx.translate(parallaxX * width * .032, parallaxY * height * .018)
  const skyline = [
    { x: .04, w: .1, h: .24 },
    { x: .2, w: .08, h: .2 },
    { x: .34, w: .13, h: .33 },
    { x: .55, w: .09, h: .22 },
    { x: .72, w: .12, h: .29 },
    { x: .92, w: .1, h: .23 },
  ]
  skyline.forEach((tower, index) => drawDistantGothicTower(ctx, width * tower.x, height * (.64 + (index % 3) * .035), width * tower.w, height * tower.h, .38 + (index % 3) * .06, index))
  ctx.restore()

  // Open-air ridge and cloud shelves keep the horizon outdoors rather than
  // reading as a ceiling, arcade or interior window grid.
  ctx.save()
  ctx.translate(parallaxX * width * .052, parallaxY * height * .03)
  ctx.fillStyle = 'rgba(7, 13, 21, .84)'
  ctx.beginPath()
  ctx.moveTo(-width * .08, height * .65)
  ctx.bezierCurveTo(width * .08, height * .55, width * .16, height * .61, width * .28, height * .52)
  ctx.bezierCurveTo(width * .41, height * .43, width * .5, height * .6, width * .62, height * .5)
  ctx.bezierCurveTo(width * .76, height * .4, width * .87, height * .58, width * 1.08, height * .48)
  ctx.lineTo(width * 1.1, height * .65)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(164, 182, 181, .3)'
  ctx.lineWidth = Math.max(1, width * .0022)
  ctx.beginPath()
  ctx.moveTo(-width * .04, height * .61)
  ctx.bezierCurveTo(width * .18, height * .51, width * .31, height * .6, width * .47, height * .51)
  ctx.bezierCurveTo(width * .68, height * .39, width * .85, height * .58, width * 1.04, height * .48)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(184, 198, 197, .18)'
  ctx.lineWidth = Math.max(1, width * .003)
  for (let cloud = 0; cloud < 4; cloud += 1) {
    const cloudX = width * (.08 + cloud * .27)
    const cloudY = height * (.2 + (cloud % 2) * .08)
    ctx.beginPath()
    ctx.moveTo(cloudX - width * .1, cloudY)
    ctx.bezierCurveTo(cloudX - width * .04, cloudY - height * .025, cloudX + width * .02, cloudY + height * .018, cloudX + width * .08, cloudY - height * .01)
    ctx.bezierCurveTo(cloudX + width * .14, cloudY - height * .035, cloudX + width * .18, cloudY + height * .012, cloudX + width * .23, cloudY)
    ctx.stroke()
  }
  ctx.restore()

  // Mid-ground banks add a separate horizontal depth plane.
  ctx.save()
  ctx.translate(parallaxX * width * .045, parallaxY * height * .028)
  const bank = ctx.createLinearGradient(0, height * .48, 0, height * .8)
  bank.addColorStop(0, 'rgba(172, 190, 193, .86)')
  bank.addColorStop(1, 'rgba(107, 127, 136, .72)')
  ctx.fillStyle = bank
  ctx.beginPath()
  ctx.moveTo(-width * .1, height * .62)
  ctx.bezierCurveTo(width * .18, height * .5, width * .35, height * .72, width * .53, height * .6)
  ctx.bezierCurveTo(width * .72, height * .48, width * .88, height * .68, width * 1.1, height * .55)
  ctx.lineTo(width * 1.1, height)
  ctx.lineTo(-width * .1, height)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(234, 239, 231, .52)'
  ctx.lineWidth = Math.max(1, width * .003)
  ctx.beginPath()
  ctx.moveTo(-width * .08, height * .62)
  ctx.bezierCurveTo(width * .2, height * .54, width * .35, height * .7, width * .56, height * .6)
  ctx.bezierCurveTo(width * .76, height * .5, width * .92, height * .66, width * 1.08, height * .56)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(80, 100, 109, .36)'
  ctx.lineWidth = Math.max(1, width * .002)
  for (let driftLine = 0; driftLine < 6; driftLine += 1) {
    const y = height * (.68 + driftLine * .028)
    ctx.beginPath()
    ctx.moveTo(width * (.08 - driftLine * .025), y)
    ctx.quadraticCurveTo(width * .5, y - height * .018, width * (.94 + driftLine * .01), y + height * .012)
    ctx.stroke()
  }
  ctx.restore()

  // Grave rows are intentionally split into three parallax bands.
  const layers = [
    { depth: .2, count: 15, y: .73, alpha: .6, scale: .7, tone: '#38474e' },
    { depth: .52, count: 12, y: .81, alpha: .84, scale: .93, tone: '#2a353d' },
    { depth: .9, count: 9, y: .92, alpha: 1, scale: 1.28, tone: '#1b252d' },
  ]
  layers.forEach((layer, layerIndex) => {
    const random = seededRandom(0x4400 + layerIndex * 977)
    ctx.save()
    ctx.translate(parallaxX * width * (.035 + layer.depth * .08), parallaxY * height * (.025 + layer.depth * .06))
    for (let index = 0; index < layer.count; index += 1) {
      const x = width * (-.04 + index / (layer.count - 1) * 1.08) + (random() - .5) * width * .055
      const h = height * (.09 + random() * .13) * layer.scale
      drawSnowTombstone(ctx, x, height * layer.y + (random() - .5) * height * .025, width * (.035 + random() * .026) * layer.scale, h, layer.alpha, (random() - .5) * .09, layerIndex < 2, layer.tone, index + layerIndex * 3)
    }
    ctx.restore()
  })

  // A close iron rail supplies a fourth scale cue in front of the grave rows.
  ctx.save()
  ctx.translate(parallaxX * width * .15, parallaxY * height * .1)
  ctx.strokeStyle = 'rgba(35, 45, 51, .88)'
  ctx.lineWidth = Math.max(1.5, width * .004)
  const railY = height * .855
  ctx.beginPath()
  ctx.moveTo(-width * .05, railY)
  ctx.lineTo(width * 1.05, railY + height * .012)
  ctx.moveTo(-width * .05, railY + height * .035)
  ctx.lineTo(width * 1.05, railY + height * .047)
  ctx.stroke()
  for (let post = 0; post < 14; post += 1) {
    const postX = width * (-.02 + post * .08)
    ctx.beginPath()
    ctx.moveTo(postX, railY - height * .075)
    ctx.lineTo(postX, railY + height * .065)
    ctx.lineTo(postX + width * .012, railY + height * .065)
    ctx.lineTo(postX + width * .012, railY - height * .075)
    ctx.stroke()
    ctx.fillStyle = 'rgba(211, 221, 213, .72)'
    ctx.beginPath()
    ctx.moveTo(postX - width * .009, railY - height * .075)
    ctx.lineTo(postX + width * .006, railY - height * .11)
    ctx.lineTo(postX + width * .021, railY - height * .075)
    ctx.closePath()
    ctx.fill()
    if (post < 13) {
      ctx.strokeStyle = 'rgba(51, 66, 71, .74)'
      ctx.lineWidth = Math.max(1, width * .0025)
      ctx.beginPath()
      ctx.moveTo(postX + width * .012, railY - height * .01)
      ctx.lineTo(postX + width * .08, railY - height * .06)
      ctx.moveTo(postX + width * .012, railY + height * .04)
      ctx.lineTo(postX + width * .08, railY - height * .01)
      ctx.stroke()
      ctx.strokeStyle = 'rgba(229, 235, 228, .42)'
      ctx.lineWidth = Math.max(1, width * .003)
      ctx.beginPath()
      ctx.moveTo(postX + width * .018, railY - height * .075)
      ctx.lineTo(postX + width * .076, railY - height * .04)
      ctx.stroke()
    }
  }
  ctx.restore()

  const monumentX = width * .5 + parallaxX * width * .12
  const monumentBase = height * .93 + parallaxY * height * .08
  drawMonument(ctx, monumentX, monumentBase, Math.min(width * .28, height * .3), height * .59, time + drift * 1e5, pulse)

  // Snow in the foreground has the strongest parallax and falls through the scene.
  ctx.save()
  ctx.translate(parallaxX * width * .13, parallaxY * height * .09)
  particles.forEach((particle) => {
    const progress = reducedMotion ? particle.y : (particle.y + time * particle.speed * .000035) % 1
    const x = particle.x * width + Math.sin(time * .0008 + particle.phase) * particle.drift * width
    const y = progress * height
    ctx.globalAlpha = particle.opacity
    ctx.fillStyle = '#f1f5ee'
    ctx.beginPath()
    ctx.arc(x, y, particle.size, 0, Math.PI * 2)
    ctx.fill()
  })
  ctx.restore()

  ctx.fillStyle = 'rgba(238, 242, 235, .18)'
  ctx.fillRect(0, height * .95, width, height * .05)
}

const playWinterBell = (enabled: boolean) => {
  if (!enabled || typeof window === 'undefined') return
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextClass) return
  const context = new AudioContextClass()
  const gain = context.createGain()
  const oscillator = context.createOscillator()
  const overtone = context.createOscillator()
  const now = context.currentTime
  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(132, now)
  oscillator.frequency.exponentialRampToValueAtTime(88, now + 2.4)
  overtone.type = 'triangle'
  overtone.frequency.setValueAtTime(264, now)
  overtone.frequency.exponentialRampToValueAtTime(176, now + 2.1)
  gain.gain.setValueAtTime(.0001, now)
  gain.gain.exponentialRampToValueAtTime(.16, now + .02)
  gain.gain.exponentialRampToValueAtTime(.0001, now + 2.8)
  oscillator.connect(gain)
  overtone.connect(gain)
  gain.connect(context.destination)
  oscillator.start(now)
  overtone.start(now)
  oscillator.stop(now + 2.9)
  overtone.stop(now + 2.9)
  window.setTimeout(() => void context.close(), 3400)
}

export default function WinterBellScene({ reducedMotion = false, effectsEnabled = true }: WinterBellSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const parallaxRef = useRef({ x: 0, y: 0 })
  const particlesRef = useRef<SnowParticle[]>(createSnow())
  const pulseAtRef = useRef(0)
  const [pulse, setPulse] = useState(0)

  const ringBell = () => {
    pulseAtRef.current = performance.now()
    setPulse((value) => value + 1)
    playWinterBell(effectsEnabled)
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
      height = Math.max(600, rect.height)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    const render = (time: number) => {
      if (disposed) return
      const bellPulse = pulseAtRef.current ? Math.max(0, 1 - (time - pulseAtRef.current) / 1400) : 0
      drawWinterBell(ctx, width, height, time, reducedMotion, bellPulse, parallaxRef.current.x, parallaxRef.current.y, particlesRef.current, backgroundImage)
      if (!reducedMotion) frame = window.requestAnimationFrame(render)
    }
    const onPointerMove = (event: globalThis.PointerEvent) => {
      const rect = stage.getBoundingClientRect()
      parallaxRef.current = {
        x: Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1)),
        y: Math.max(-1, Math.min(1, (event.clientY - rect.top) / rect.height * 2 - 1)),
      }
      stage.style.setProperty('--winter-parallax-x', parallaxRef.current.x.toFixed(3))
      stage.style.setProperty('--winter-parallax-y', parallaxRef.current.y.toFixed(3))
    }
    const onPointerLeave = () => {
      parallaxRef.current = { x: 0, y: 0 }
      stage.style.setProperty('--winter-parallax-x', '0')
      stage.style.setProperty('--winter-parallax-y', '0')
    }
    const observer = new ResizeObserver(resize)
    observer.observe(stage)
    stage.addEventListener('pointermove', onPointerMove)
    stage.addEventListener('pointerleave', onPointerLeave)
    backgroundImage = new Image()
    backgroundImage.decoding = 'async'
    backgroundImage.src = '/winter-bell-bg.png'
    backgroundImage.onload = () => render(performance.now())
    resize()
    render(reducedMotion ? 0 : performance.now())
    if (!reducedMotion) frame = window.requestAnimationFrame(render)
    return () => {
      disposed = true
      window.cancelAnimationFrame(frame)
      observer.disconnect()
      stage.removeEventListener('pointermove', onPointerMove)
      stage.removeEventListener('pointerleave', onPointerLeave)
    }
  }, [reducedMotion])

  return (
    <main className="winter-bell-scene" data-scene="winter-bell" aria-labelledby="winter-bell-title">
      <div className="winter-bell-stage" ref={stageRef}>
        <canvas className="winter-bell-canvas" ref={canvasRef} role="img" aria-label="冬之钟：大雪覆盖的墓碑群与中央纪念碑" />
        <header className="winter-bell-header">
          <p className="winter-bell-kicker">第八展馆 <span>/</span> 冬之钟</p>
          <h1 id="winter-bell-title">冬之钟</h1>
          <p className="winter-bell-subtitle">THE WINTER BELL</p>
          <p className="winter-bell-caption">雪覆盖了所有名字，中央的钟替它们记得。</p>
        </header>
        <section className="winter-bell-console" aria-label="冬之钟控制">
          <div className="winter-bell-console__label"><CloudSnow aria-hidden="true" /><span>雪幕观测</span></div>
          <p>远景、墓碑与纪念碑处在不同的雪层中。</p>
          <button type="button" onClick={ringBell}><BellRing aria-hidden="true" /><span>敲响冬之钟</span></button>
        </section>
        <div className="winter-bell-badge" aria-live="polite"><Snowflake aria-hidden="true" /><span>{pulse ? '钟声穿过雪幕' : '雪落无声'}</span></div>
      </div>
    </main>
  )
}
