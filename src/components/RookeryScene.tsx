import { ArrowLeft, Bird, Dices, Download, Feather, Radio, Sparkles, WandSparkles } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import './rookery.css'

type RookerySceneProps = { reducedMotion?: boolean }

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

const randomWord = () => {
  const words = ['NOCTURNE', 'MOURNING', 'VESPERS', 'RAVEN', 'LIDDELL', 'UMBRA', 'NEVERMORE']
  return words[Math.floor(Math.random() * words.length)]
}

const drawPointedArch = (ctx: CanvasRenderingContext2D, x: number, base: number, width: number, height: number, alpha: number, detail = 0) => {
  const half = width / 2
  ctx.save()
  ctx.fillStyle = `rgba(19, 25, 34, ${alpha})`
  ctx.strokeStyle = `rgba(137, 157, 160, ${alpha * .72})`
  ctx.lineWidth = Math.max(1, width * .014)
  ctx.beginPath()
  ctx.moveTo(x - half, base)
  ctx.lineTo(x - half, base - height * .55)
  ctx.quadraticCurveTo(x - half, base - height * .8, x, base - height)
  ctx.quadraticCurveTo(x + half, base - height * .8, x + half, base - height * .55)
  ctx.lineTo(x + half, base)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = `rgba(5, 9, 15, ${alpha * .72})`
  ctx.strokeStyle = `rgba(174, 161, 126, ${alpha * .5})`
  ctx.lineWidth = Math.max(1, width * .007)
  ctx.beginPath()
  ctx.moveTo(-half * .68, base)
  ctx.lineTo(-half * .68, base - height * .48)
  ctx.quadraticCurveTo(-half * .5, base - height * .7, 0, base - height * .88)
  ctx.quadraticCurveTo(half * .5, base - height * .7, half * .68, base - height * .48)
  ctx.lineTo(half * .68, base)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.strokeStyle = `rgba(184, 156, 111, ${alpha * .52})`
  ctx.lineWidth = Math.max(1, width * .007)
  ctx.beginPath()
  ctx.moveTo(x, base - height * .88)
  ctx.lineTo(x, base - height * .1)
  ctx.moveTo(x - half * .72, base - height * .1)
  ctx.lineTo(x, base - height * .5)
  ctx.lineTo(x + half * .72, base - height * .1)
  ctx.stroke()
  ctx.strokeStyle = `rgba(155, 180, 177, ${alpha * .4})`
  ctx.lineWidth = Math.max(1, width * .004)
  for (let stone = 0; stone < 4; stone += 1) {
    const y = base - height * (.14 + stone * .15)
    ctx.beginPath()
    ctx.moveTo(-half * (.8 - stone * .04), y)
    ctx.lineTo(half * (.8 - stone * .04), y)
    ctx.stroke()
  }
  if (detail > 0) {
    ctx.strokeStyle = `rgba(204, 176, 112, ${alpha * .5})`
    ctx.lineWidth = Math.max(1, width * .005)
    ctx.beginPath()
    ctx.arc(x, base - height * .66, width * .13, 0, Math.PI * 2)
    ctx.moveTo(x - width * .13, base - height * .66)
    ctx.lineTo(x + width * .13, base - height * .66)
    ctx.moveTo(x, base - height * .79)
    ctx.lineTo(x, base - height * .53)
    ctx.stroke()
  }
  ctx.restore()
}

const drawRaven = (ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, angle: number, alpha: number, featherTone: string) => {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.globalAlpha = alpha
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const body = ctx.createLinearGradient(-scale * 20, -scale * 20, scale * 30, scale * 22)
  body.addColorStop(0, '#202b34')
  body.addColorStop(.42, '#0a0d14')
  body.addColorStop(1, '#03050a')
  ctx.fillStyle = body
  ctx.strokeStyle = featherTone
  ctx.lineWidth = Math.max(1.2, scale * 2.5)
  ctx.shadowColor = 'rgba(120, 173, 174, .34)'
  ctx.shadowBlur = scale * 11
  ctx.beginPath()
  ctx.ellipse(0, scale * 2, scale * 29, scale * 18, -.08, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(-scale * 18, scale * 9)
  ctx.quadraticCurveTo(-scale * 34, scale * 23, -scale * 47, scale * 30)
  ctx.quadraticCurveTo(-scale * 28, scale * 34, -scale * 8, scale * 15)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(scale * 23, -scale * 8, scale * 12.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#cba963'
  ctx.strokeStyle = '#ebd18b'
  ctx.lineWidth = Math.max(1, scale * 1.5)
  ctx.beginPath()
  ctx.moveTo(scale * 32, -scale * 9)
  ctx.lineTo(scale * 51, -scale * 4)
  ctx.lineTo(scale * 32, scale * 1)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#f2d889'
  ctx.beginPath()
  ctx.arc(scale * 26, -scale * 10, scale * 2.3, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowColor = '#e7c66d'
  ctx.shadowBlur = scale * 7
  ctx.beginPath()
  ctx.arc(scale * 26, -scale * 10, scale * 1.05, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.strokeStyle = featherTone
  ctx.lineWidth = Math.max(1, scale * 2)
  ctx.beginPath()
  ctx.moveTo(-scale * 9, -scale * 7)
  ctx.quadraticCurveTo(-scale * 34, -scale * 39, -scale * 59, -scale * 48)
  ctx.quadraticCurveTo(-scale * 42, -scale * 11, -scale * 13, scale * 8)
  ctx.stroke()
  for (let feather = 0; feather < 5; feather += 1) {
    ctx.beginPath()
    ctx.moveTo(-scale * (15 + feather * 4), -scale * (4 + feather * 1.5))
    ctx.quadraticCurveTo(-scale * (31 + feather * 3), -scale * (20 + feather * 4), -scale * (45 + feather * 3), -scale * (28 + feather * 4))
    ctx.stroke()
  }
  ctx.beginPath()
  ctx.moveTo(-scale * 8, scale * 12)
  ctx.quadraticCurveTo(-scale * 37, scale * 32, -scale * 57, scale * 26)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(201, 169, 102, .68)'
  ctx.lineWidth = Math.max(1, scale * 1.4)
  ctx.beginPath()
  ctx.moveTo(-scale * 5, scale * 15)
  ctx.lineTo(-scale * 10, scale * 27)
  ctx.moveTo(scale * 7, scale * 16)
  ctx.lineTo(scale * 3, scale * 27)
  ctx.stroke()
  ctx.restore()
}

type CrestPalette = {
  name: string
  base: string
  shadow: string
  light: string
  accent: string
  glow: string
}

const CREST_PALETTE: readonly CrestPalette[] = [
  { name: '黑', base: '#11151c', shadow: '#05070c', light: '#29323c', accent: '#c7a45d', glow: '#83a9b0' },
  { name: '白', base: '#d8d5cb', shadow: '#8e9695', light: '#f6f1df', accent: '#7d4f52', glow: '#bad5d0' },
  { name: '红', base: '#651f2c', shadow: '#280d18', light: '#a34a51', accent: '#e4be6d', glow: '#d88878' },
  { name: '金', base: '#a3793d', shadow: '#49321d', light: '#e4c77e', accent: '#f3e8ba', glow: '#d9a654' },
  { name: '蓝', base: '#1b4663', shadow: '#0b1c30', light: '#3d7891', accent: '#d4bd79', glow: '#77c2d1' },
  { name: '绿', base: '#285344', shadow: '#0d241f', light: '#5e8b68', accent: '#d8bd73', glow: '#8ac6a0' },
  { name: '紫', base: '#4a315d', shadow: '#1b132b', light: '#835b8e', accent: '#e1c27e', glow: '#c397d3' },
]

type CrestFrame = 'heater' | 'round' | 'pointed' | 'lozenge' | 'cartouche' | 'scallop'

const CREST_FRAME_LABELS: readonly string[] = ['盾牌', '圆徽', '尖拱', '菱形', '卷轴', '花瓣']
const CREST_MOTIF_LABELS: readonly string[] = ['麦穗', '长剑', '小盾', '雄狮', '灵蛇', '权杖', '酒桶']

const drawCrestFramePath = (ctx: CanvasRenderingContext2D, frame: CrestFrame, width: number, height: number) => {
  const half = width / 2
  ctx.beginPath()
  if (frame === 'round') {
    ctx.ellipse(0, 0, half, height * .48, 0, 0, Math.PI * 2)
  } else if (frame === 'pointed') {
    ctx.moveTo(0, -height * .56)
    ctx.lineTo(half * .95, -height * .09)
    ctx.quadraticCurveTo(half * .68, height * .43, 0, height * .58)
    ctx.quadraticCurveTo(-half * .68, height * .43, -half * .95, -height * .09)
    ctx.closePath()
  } else if (frame === 'lozenge') {
    ctx.moveTo(0, -height * .58)
    ctx.lineTo(half * .94, 0)
    ctx.lineTo(0, height * .58)
    ctx.lineTo(-half * .94, 0)
    ctx.closePath()
  } else if (frame === 'cartouche') {
    ctx.moveTo(-half * .84, -height * .42)
    ctx.quadraticCurveTo(-half * 1.08, -height * .2, -half * .82, 0)
    ctx.quadraticCurveTo(-half * 1.08, height * .2, -half * .84, height * .42)
    ctx.quadraticCurveTo(0, height * .58, half * .84, height * .42)
    ctx.quadraticCurveTo(half * 1.08, height * .2, half * .82, 0)
    ctx.quadraticCurveTo(half * 1.08, -height * .2, half * .84, -height * .42)
    ctx.quadraticCurveTo(0, -height * .58, -half * .84, -height * .42)
    ctx.closePath()
  } else if (frame === 'scallop') {
    ctx.moveTo(0, -height * .55)
    for (let petal = 0; petal < 8; petal += 1) {
      const angle = -Math.PI / 2 + petal * Math.PI / 4
      const x = Math.cos(angle) * half
      const y = Math.sin(angle) * height * .49
      const next = angle + Math.PI / 4
      ctx.quadraticCurveTo(Math.cos(angle + Math.PI / 8) * half * 1.1, Math.sin(angle + Math.PI / 8) * height * .56, Math.cos(next) * half, Math.sin(next) * height * .49)
      if (petal === 7) ctx.lineTo(0, -height * .55)
      void x
      void y
    }
    ctx.closePath()
  } else {
    ctx.moveTo(-half, -height * .39)
    ctx.lineTo(half, -height * .39)
    ctx.lineTo(half * .93, height * .12)
    ctx.quadraticCurveTo(half * .7, height * .43, 0, height * .56)
    ctx.quadraticCurveTo(-half * .7, height * .43, -half * .93, height * .12)
    ctx.closePath()
  }
}

const drawWheatMotif = (ctx: CanvasRenderingContext2D, width: number, height: number, color: string, light: string, random: () => number) => {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = Math.max(2, width * .014)
  ctx.lineCap = 'round'
  for (const side of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(0, height * .34)
    ctx.quadraticCurveTo(side * width * .04, height * .02, side * width * .17, -height * .32)
    ctx.stroke()
    for (let grain = 0; grain < 6; grain += 1) {
      const ratio = grain / 6
      const x = side * width * (.045 + ratio * .11)
      const y = height * (.2 - ratio * .5)
      ctx.fillStyle = grain % 2 ? light : color
      ctx.beginPath()
      ctx.ellipse(x + side * width * .025, y, width * (.025 + random() * .012), height * (.032 + random() * .01), side * .52, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()
}

const drawSwordMotif = (ctx: CanvasRenderingContext2D, width: number, height: number, color: string, light: string, accent: string, random: () => number) => {
  ctx.save()
  ctx.rotate((random() - .5) * .14)
  ctx.strokeStyle = color
  ctx.fillStyle = light
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = Math.max(2, width * .014)
  ctx.beginPath()
  ctx.moveTo(0, height * .36)
  ctx.lineTo(0, -height * .35)
  ctx.stroke()
  ctx.fillStyle = light
  ctx.beginPath()
  ctx.moveTo(0, -height * .43)
  ctx.lineTo(-width * .055, -height * .28)
  ctx.lineTo(width * .055, -height * .28)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.strokeStyle = accent
  ctx.lineWidth = Math.max(2, width * .022)
  ctx.beginPath()
  ctx.moveTo(-width * .16, height * .17)
  ctx.lineTo(width * .16, height * .17)
  ctx.moveTo(0, height * .17)
  ctx.lineTo(0, height * .34)
  ctx.stroke()
  ctx.fillStyle = accent
  ctx.beginPath()
  ctx.arc(0, height * .38, width * .035, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

const drawSmallShieldMotif = (ctx: CanvasRenderingContext2D, width: number, height: number, color: string, light: string, accent: string) => {
  ctx.save()
  ctx.fillStyle = color
  ctx.strokeStyle = light
  ctx.lineWidth = Math.max(2, width * .012)
  ctx.beginPath()
  ctx.moveTo(0, -height * .32)
  ctx.lineTo(width * .2, -height * .2)
  ctx.lineTo(width * .16, height * .18)
  ctx.quadraticCurveTo(0, height * .39, -width * .16, height * .18)
  ctx.lineTo(-width * .2, -height * .2)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.strokeStyle = accent
  ctx.lineWidth = Math.max(1.5, width * .009)
  ctx.beginPath()
  ctx.moveTo(0, -height * .28)
  ctx.lineTo(0, height * .25)
  ctx.moveTo(-width * .15, -height * .02)
  ctx.lineTo(width * .15, -height * .02)
  ctx.stroke()
  ctx.restore()
}

const drawLionMotif = (ctx: CanvasRenderingContext2D, width: number, height: number, color: string, light: string, accent: string, random: () => number) => {
  ctx.save()
  ctx.scale(1, .96)
  ctx.fillStyle = color
  ctx.strokeStyle = light
  ctx.lineWidth = Math.max(2, width * .011)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  // Rampant lion: mane, chest, raised forelegs, hind legs and a curled tail.
  ctx.beginPath()
  ctx.moveTo(-width * .17, height * .28)
  ctx.bezierCurveTo(-width * .3, height * .14, -width * .28, -height * .08, -width * .13, -height * .14)
  ctx.bezierCurveTo(-width * .03, -height * .18, width * .08, -height * .12, width * .15, -height * .02)
  ctx.bezierCurveTo(width * .22, height * .08, width * .2, height * .2, width * .14, height * .29)
  ctx.lineTo(width * .08, height * .36)
  ctx.lineTo(width * .03, height * .35)
  ctx.lineTo(width * .02, height * .08)
  ctx.lineTo(-width * .02, height * .04)
  ctx.lineTo(-width * .05, height * .36)
  ctx.lineTo(-width * .12, height * .37)
  ctx.lineTo(-width * .14, height * .1)
  ctx.lineTo(-width * .19, height * .04)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(width * .1, -height * .02)
  ctx.bezierCurveTo(width * .14, -height * .19, width * .26, -height * .31, width * .34, -height * .22)
  ctx.bezierCurveTo(width * .41, -height * .15, width * .33, -height * .05, width * .22, height * .02)
  ctx.lineTo(width * .12, height * .08)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.strokeStyle = accent
  ctx.lineWidth = Math.max(1.5, width * .008)
  ctx.beginPath()
  ctx.moveTo(width * .3, -height * .16)
  ctx.quadraticCurveTo(width * .5, -height * .32, width * .42, -height * .48)
  ctx.quadraticCurveTo(width * .34, -height * .55, width * .28, -height * .44)
  ctx.stroke()
  ctx.strokeStyle = light
  ctx.lineWidth = Math.max(1.5, width * .009)
  ctx.beginPath()
  ctx.moveTo(width * .12, height * .08)
  ctx.lineTo(width * .31, height * .27)
  ctx.moveTo(width * .17, height * .02)
  ctx.lineTo(width * .36, height * .16)
  ctx.moveTo(-width * .18, height * .28)
  ctx.lineTo(-width * .27, height * .4)
  ctx.moveTo(width * .07, height * .32)
  ctx.lineTo(width * .12, height * .42)
  ctx.stroke()
  ctx.strokeStyle = accent
  ctx.lineWidth = Math.max(1, width * .006)
  for (let fur = 0; fur < 9; fur += 1) {
    const angle = Math.PI * 1.1 + fur / 8 * Math.PI * 1.8
    ctx.beginPath()
    ctx.moveTo(width * .12 + Math.cos(angle) * width * .17, -height * .09 + Math.sin(angle) * width * .17)
    ctx.lineTo(width * .12 + Math.cos(angle) * width * (.21 + random() * .035), -height * .09 + Math.sin(angle) * width * (.21 + random() * .035))
    ctx.stroke()
  }
  ctx.fillStyle = accent
  ctx.beginPath()
  ctx.arc(width * .25, -height * .15, width * .018, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

const drawSnakeMotif = (ctx: CanvasRenderingContext2D, width: number, height: number, color: string, light: string, accent: string, random: () => number) => {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = Math.max(3, width * .025)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-width * .05, height * .36)
  ctx.bezierCurveTo(width * .24, height * .2, -width * .24, 0, width * .04, -height * .2)
  ctx.bezierCurveTo(width * .18, -height * .32, width * .24, -height * .18, width * .22, -height * .1)
  ctx.stroke()
  ctx.fillStyle = light
  ctx.strokeStyle = light
  ctx.lineWidth = Math.max(1.5, width * .01)
  ctx.beginPath()
  ctx.ellipse(width * .22, -height * .1, width * .1, height * .07, -.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = accent
  ctx.beginPath()
  ctx.arc(width * .25, -height * .12, width * .015, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = color
  for (let scale = 0; scale < 4; scale += 1) {
    ctx.beginPath()
    ctx.arc(-width * (.02 + random() * .07), height * (.2 - scale * .1), width * .018, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

const drawStaffMotif = (ctx: CanvasRenderingContext2D, width: number, height: number, color: string, light: string, accent: string, random: () => number) => {
  ctx.save()
  ctx.strokeStyle = light
  ctx.lineWidth = Math.max(3, width * .018)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(0, height * .38)
  ctx.lineTo(0, -height * .35)
  ctx.stroke()
  ctx.strokeStyle = color
  ctx.lineWidth = Math.max(2, width * .012)
  ctx.beginPath()
  ctx.arc(0, -height * .3, width * .11, Math.PI * .15, Math.PI * 1.75)
  ctx.stroke()
  ctx.fillStyle = accent
  ctx.shadowColor = accent
  ctx.shadowBlur = width * (.08 + random() * .08)
  ctx.beginPath()
  ctx.arc(0, -height * .3, width * .065, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

const drawBarrelMotif = (ctx: CanvasRenderingContext2D, width: number, height: number, color: string, light: string, accent: string, random: () => number) => {
  ctx.save()
  ctx.fillStyle = color
  ctx.strokeStyle = light
  ctx.lineWidth = Math.max(2, width * .012)
  ctx.beginPath()
  ctx.moveTo(-width * .22, -height * .25)
  ctx.quadraticCurveTo(0, -height * .4, width * .22, -height * .25)
  ctx.lineTo(width * .19, height * .27)
  ctx.quadraticCurveTo(0, height * .42, -width * .19, height * .27)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.strokeStyle = accent
  ctx.lineWidth = Math.max(2, width * .02)
  for (const ratio of [-.19, .02, .21]) {
    ctx.beginPath()
    ctx.ellipse(0, height * ratio, width * .2, height * .07, 0, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.fillStyle = light
  ctx.beginPath()
  ctx.ellipse(0, -height * .27, width * .18, height * .06, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(width * (.03 + random() * .04), -height * .27, width * .035, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

const drawCrestMotif = (ctx: CanvasRenderingContext2D, motif: number, width: number, height: number, palette: CrestPalette, random: () => number) => {
  const colors = [palette.shadow, palette.light, palette.accent]
  if (motif === 0) drawWheatMotif(ctx, width, height, colors[0], colors[1], random)
  else if (motif === 1) drawSwordMotif(ctx, width, height, palette.accent, palette.light, palette.glow, random)
  else if (motif === 2) drawSmallShieldMotif(ctx, width, height, palette.shadow, palette.light, palette.accent)
  else if (motif === 3) drawLionMotif(ctx, width, height, palette.accent, palette.light, palette.glow, random)
  else if (motif === 4) drawSnakeMotif(ctx, width, height, palette.accent, palette.light, palette.glow, random)
  else if (motif === 5) drawStaffMotif(ctx, width, height, palette.accent, palette.light, palette.glow, random)
  else drawBarrelMotif(ctx, width, height, palette.accent, palette.light, palette.glow, random)
}

const drawCrestFiligree = (ctx: CanvasRenderingContext2D, width: number, height: number, palette: CrestPalette, random: () => number) => {
  ctx.save()
  ctx.strokeStyle = palette.accent
  ctx.lineWidth = Math.max(1.5, width * .008)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const side of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(side * width * .31, height * .33)
    ctx.bezierCurveTo(side * width * (.53 + random() * .05), height * .22, side * width * (.54 + random() * .04), -height * .03, side * width * .34, -height * .2)
    ctx.bezierCurveTo(side * width * (.46 + random() * .05), -height * .32, side * width * (.52 + random() * .02), -height * .43, side * width * .42, -height * .49)
    ctx.stroke()
    ctx.strokeStyle = palette.light
    ctx.beginPath()
    ctx.arc(side * width * .42, -height * .47, width * .055, Math.PI * (side < 0 ? .2 : .8), Math.PI * (side < 0 ? 1.8 : 1.2))
    ctx.stroke()
    ctx.strokeStyle = palette.accent
  }
  for (let leaf = 0; leaf < 5; leaf += 1) {
    const t = leaf / 5
    for (const side of [-1, 1]) {
      const leafX = side * width * (.35 + t * .14)
      const leafY = height * (.2 - t * .15)
      ctx.beginPath()
      ctx.ellipse(leafX, leafY, width * .035, height * .075, side * .6, 0, Math.PI * 2)
      ctx.stroke()
    }
  }
  ctx.restore()
}

const drawCrestField = (ctx: CanvasRenderingContext2D, frame: CrestFrame, width: number, height: number, palette: CrestPalette) => {
  ctx.save()
  drawCrestFramePath(ctx, frame, width, height)
  ctx.clip()
  const field = ctx.createLinearGradient(-width * .5, -height * .5, width * .5, height * .5)
  field.addColorStop(0, 'rgba(255, 255, 255, .12)')
  field.addColorStop(.45, 'rgba(0, 0, 0, .02)')
  field.addColorStop(1, 'rgba(0, 0, 0, .22)')
  ctx.fillStyle = field
  ctx.fillRect(-width, -height, width * 2, height * 2)
  ctx.globalAlpha = .24
  ctx.strokeStyle = palette.accent
  ctx.lineWidth = Math.max(1, width * .006)
  for (let stripe = -4; stripe < 7; stripe += 1) {
    ctx.beginPath()
    ctx.moveTo(-width + stripe * width * .24, -height)
    ctx.lineTo(width + stripe * width * .24, height)
    ctx.stroke()
  }
  ctx.globalAlpha = .18
  ctx.strokeStyle = palette.light
  for (let lattice = -3; lattice < 5; lattice += 1) {
    ctx.beginPath()
    ctx.moveTo(-width, lattice * height * .24)
    ctx.lineTo(width, lattice * height * .24)
    ctx.stroke()
  }
  ctx.restore()
}

const drawShield = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number, width: number, height: number, random: () => number, seed: number, pulse: number) => {
  const half = width / 2
  const palette = CREST_PALETTE[(seed >>> 1) % CREST_PALETTE.length]
  const frameTypes: readonly CrestFrame[] = ['heater', 'round', 'pointed', 'lozenge', 'cartouche', 'scallop']
  const frame = frameTypes[(seed >>> 8) % frameTypes.length]
  const crest = random() > .5
  const shieldGradient = ctx.createLinearGradient(centerX - half, centerY - height * .5, centerX + half, centerY + height * .55)
  shieldGradient.addColorStop(0, palette.light)
  shieldGradient.addColorStop(.32, palette.base)
  shieldGradient.addColorStop(1, palette.shadow)
  ctx.save()
  ctx.translate(centerX, centerY)
  ctx.shadowColor = palette.glow
  ctx.shadowBlur = 26 + pulse * 22
  ctx.fillStyle = shieldGradient
  ctx.strokeStyle = palette.accent
  ctx.lineWidth = Math.max(2.2, width * .015)
  drawCrestFramePath(ctx, frame, width, height)
  ctx.fill()
  ctx.stroke()

  drawCrestField(ctx, frame, width, height, palette)

  ctx.save()
  ctx.globalAlpha = .72
  ctx.strokeStyle = palette.light
  ctx.lineWidth = Math.max(1, width * .006)
  ctx.scale(.9, .9)
  drawCrestFramePath(ctx, frame, width, height)
  ctx.stroke()
  ctx.restore()

  ctx.save()
  ctx.globalAlpha = .5
  ctx.strokeStyle = palette.glow
  ctx.lineWidth = Math.max(1, width * .006)
  ctx.beginPath()
  ctx.moveTo(0, -height * .4)
  ctx.lineTo(0, height * .4)
  ctx.moveTo(-half * .72, 0)
  ctx.lineTo(half * .72, 0)
  ctx.stroke()
  ctx.restore()

  const emblem = (seed >>> 4) % 7
  drawCrestFiligree(ctx, width, height, palette, random)
  drawCrestMotif(ctx, emblem, width, height, palette, random)

  // Split crown changes shape and ornament count per input.
  ctx.fillStyle = crest ? palette.accent : palette.light
  ctx.strokeStyle = crest ? palette.light : palette.glow
  ctx.lineWidth = Math.max(1.5, width * .01)
  ctx.beginPath()
  ctx.moveTo(-half * .55, -height * .48)
  ctx.lineTo(-half * .28, -height * (.66 + random() * .1))
  ctx.lineTo(0, -height * .5)
  ctx.lineTo(half * .25, -height * (.68 + random() * .08))
  ctx.lineTo(half * .55, -height * .48)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  // Small corner bosses make the outer frame read as carved heraldic metalwork.
  ctx.fillStyle = palette.accent
  ctx.strokeStyle = palette.light
  ctx.lineWidth = Math.max(1, width * .006)
  const bosses = frame === 'round' ? 8 : 4
  for (let boss = 0; boss < bosses; boss += 1) {
    const angle = boss / bosses * Math.PI * 2 - Math.PI / 2
    const bossX = Math.cos(angle) * half * .87
    const bossY = Math.sin(angle) * height * .43
    ctx.beginPath()
    ctx.arc(bossX, bossY, Math.max(2, width * .018), 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }
  ctx.restore()
}

const drawRookery = (ctx: CanvasRenderingContext2D, width: number, height: number, time: number, reducedMotion: boolean, seed: number, pulse: number, flightMode: boolean, parallaxX = 0, parallaxY = 0, backgroundImage: HTMLImageElement | null = null) => {
  const random = seededRandom(seed)
  const unit = Math.min(width, height) / 720
  const drift = flightMode && !reducedMotion ? Math.sin(time * .00055) * width * .02 : 0
  const sky = ctx.createRadialGradient(width * .5, height * .34, 0, width * .5, height * .45, Math.max(width, height) * .78)
  sky.addColorStop(0, '#1d353b')
  sky.addColorStop(.4, '#111922')
  sky.addColorStop(1, '#06080d')
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, width, height)

  // Optional art plate: replace rookery-bg.png when the finished background is supplied.
  if (backgroundImage?.complete && backgroundImage.naturalWidth > 0) {
    ctx.save()
    const imageScale = Math.max(width / backgroundImage.naturalWidth, height / backgroundImage.naturalHeight)
    const imageWidth = backgroundImage.naturalWidth * imageScale
    const imageHeight = backgroundImage.naturalHeight * imageScale
    ctx.globalAlpha = .14
    ctx.translate(parallaxX * width * .012, parallaxY * height * .008)
    ctx.drawImage(backgroundImage, (width - imageWidth) / 2, (height - imageHeight) / 2, imageWidth, imageHeight)
    ctx.restore()
  }

  // Far towers hold the vertical perspective and move only a little with the observer.
  ctx.save()
  ctx.translate(parallaxX * width * .018, parallaxY * height * .012)
  ctx.fillStyle = 'rgba(7, 11, 18, .68)'
  for (let tower = 0; tower < 9; tower += 1) {
    const towerX = width * (-.02 + tower * .125)
    const towerWidth = width * (.065 + (tower % 3) * .012)
    const towerHeight = height * (.32 + (tower % 4) * .055)
    const towerBase = height * .65
    ctx.beginPath()
    ctx.moveTo(towerX, towerBase)
    ctx.lineTo(towerX, towerBase - towerHeight * .77)
    ctx.lineTo(towerX + towerWidth * .5, towerBase - towerHeight)
    ctx.lineTo(towerX + towerWidth, towerBase - towerHeight * .77)
    ctx.lineTo(towerX + towerWidth, towerBase)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = 'rgba(128, 151, 155, .24)'
    ctx.lineWidth = Math.max(1, unit * .85)
    ctx.stroke()
    for (let window = 0; window < 3; window += 1) {
      const windowX = towerX + towerWidth * (.25 + window * .25)
      const windowY = towerBase - towerHeight * (.55 + (window % 2) * .11)
      ctx.beginPath()
      ctx.moveTo(windowX - towerWidth * .055, windowY + towerHeight * .16)
      ctx.lineTo(windowX - towerWidth * .055, windowY)
      ctx.quadraticCurveTo(windowX, windowY - towerHeight * .09, windowX + towerWidth * .055, windowY)
      ctx.lineTo(windowX + towerWidth * .055, windowY + towerHeight * .16)
      ctx.stroke()
    }
  }
  ctx.restore()

  // Mid-distance arcades provide a second plane of masonry and tracery.
  ctx.save()
  ctx.translate(drift + parallaxX * width * .052, parallaxY * height * .034)
  for (let layer = 0; layer < 3; layer += 1) {
    const depth = layer / 3
    const count = 5 + layer * 2
    const span = width * (1.18 + depth * .26)
    for (let index = -1; index <= count; index += 1) {
      const x = width * .5 - span * .5 + index * span / count + Math.sin(seed + index) * width * .008
      drawPointedArch(ctx, x, height * (.61 + depth * .035), span / count * .76, height * (.46 - depth * .03), .37 - depth * .08, layer + 1)
    }
  }
  ctx.restore()

  // Stone ribs and suspended walkways sit close to the viewer.
  ctx.save()
  ctx.translate(parallaxX * width * .09, parallaxY * height * .06)
  ctx.strokeStyle = 'rgba(150, 174, 171, .18)'
  ctx.lineWidth = Math.max(1, unit * 1.25)
  for (let rib = 0; rib < 12; rib += 1) {
    const x = width * (.1 + rib * .073) + drift * (rib % 2 ? .4 : .8)
    ctx.beginPath()
    ctx.moveTo(width * .5, height * .18)
    ctx.quadraticCurveTo(x, height * .38, x, height)
    ctx.stroke()
  }
  ctx.strokeStyle = 'rgba(193, 159, 101, .24)'
  ctx.lineWidth = Math.max(1, unit * 1.4)
  for (let shelf = 0; shelf < 4; shelf += 1) {
    const y = height * (.3 + shelf * .14)
    ctx.beginPath()
    ctx.moveTo(width * .08, y)
    ctx.lineTo(width * .92, y + Math.sin(seed + shelf) * height * .008)
    ctx.stroke()
  }
  ctx.restore()

  // Ground plane is painted before the emblem so its perspective lines never cut across it.
  const centerX = width * .5 + drift * .4 + parallaxX * width * .08
  const centerY = height * .53 + parallaxY * height * .03
  const ground = ctx.createLinearGradient(0, height * .66, 0, height)
  ground.addColorStop(0, 'rgba(25, 30, 34, .18)')
  ground.addColorStop(1, '#07090e')
  ctx.fillStyle = ground
  ctx.fillRect(0, height * .66, width, height * .34)
  ctx.strokeStyle = 'rgba(178, 156, 113, .2)'
  ctx.lineWidth = Math.max(1, unit)
  for (let line = -6; line <= 6; line += 1) {
    ctx.beginPath()
    ctx.moveTo(centerX, height * .66)
    ctx.lineTo(centerX + line * width * .17 + parallaxX * width * .1, height)
    ctx.stroke()
  }

  // Orbiting ravens are seed-specific in count, radius and direction.
  const flock = 5 + Math.floor(random() * 5)
  for (let index = 0; index < flock; index += 1) {
    const phase = random() * Math.PI * 2
    const radiusX = width * (.19 + random() * .26)
    const radiusY = height * (.08 + random() * .13)
    const orbit = reducedMotion ? phase : phase + time * (.00018 + random() * .00018) * (index % 2 ? -1 : 1)
    drawRaven(ctx, centerX + Math.cos(orbit) * radiusX, centerY + Math.sin(orbit) * radiusY - height * (.06 + random() * .15), unit * (.46 + random() * .42), Math.sin(orbit) * .28, .55 + random() * .3, index % 2 ? '#7c9b9e' : '#aa8a5a')
  }

  const shieldSize = Math.min(width * .35, height * .36)
  drawShield(ctx, centerX, centerY + height * .035, shieldSize, shieldSize * 1.3, random, seed, pulse)

  ctx.save()
  ctx.globalAlpha = .34 + pulse * .2
  ctx.strokeStyle = '#c5a56b'
  ctx.lineWidth = Math.max(1, unit * 1.2)
  for (let ring = 0; ring < 3; ring += 1) {
    ctx.beginPath()
    ctx.ellipse(centerX, centerY + height * .27, shieldSize * (.74 + ring * .17), height * (.032 + ring * .01), 0, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.restore()

  // Floating feathers tie the flock to the crest and respond to the pulse.
  ctx.save()
  for (let feather = 0; feather < 26; feather += 1) {
    const angle = random() * Math.PI * 2
    const distance = Math.pow(random(), .55) * Math.min(width, height) * .43
    const x = centerX + Math.cos(angle) * distance
    const y = centerY + Math.sin(angle) * distance * .58
    const length = unit * (6 + random() * 17)
    ctx.globalAlpha = .12 + random() * .3 + pulse * .2
    ctx.strokeStyle = feather % 4 === 0 ? '#cfad70' : '#99bab4'
    ctx.lineWidth = Math.max(.7, unit * .75)
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + Math.cos(angle + .35) * length, y + Math.sin(angle + .35) * length)
    ctx.stroke()
  }
  ctx.restore()

  ctx.fillStyle = 'rgba(215, 183, 119, .78)'
  ctx.font = `600 ${Math.max(10, unit * 15)}px "Noto Serif SC", serif`
  ctx.textAlign = 'center'
  ctx.letterSpacing = `${Math.max(1, unit * 2)}px`
  ctx.fillText('THE ROOKERY', centerX, height * .9)
  ctx.fillStyle = 'rgba(177, 196, 183, .55)'
  ctx.font = `${Math.max(8, unit * 10)}px "Cormorant Garamond", serif`
  ctx.fillText(`ALICE LIDDELL GOTHIC COLLECTION · ${new Date().toISOString().slice(0, 10)}`, centerX, height * .93)
}

export default function RookeryScene({ reducedMotion = false }: RookerySceneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const parallaxRef = useRef({ x: 0, y: 0 })
  const [word, setWord] = useState('')
  const [seed, setSeed] = useState(() => hashString('NOCTURNE'))
  const [pulse, setPulse] = useState(0)
  const [flightMode, setFlightMode] = useState(true)
  const pulseAtRef = useRef(0)

  const forge = useCallback((value: string) => {
    const normalized = value.trim().normalize('NFC')
    if (!normalized) return
    setWord(normalized)
    setSeed(hashString(normalized.toLocaleLowerCase()))
    pulseAtRef.current = performance.now()
    setPulse((count) => count + 1)
  }, [])

  const randomize = () => forge(randomWord())

  const paletteName = CREST_PALETTE[(seed >>> 1) % CREST_PALETTE.length].name
  const frameName = CREST_FRAME_LABELS[(seed >>> 8) % CREST_FRAME_LABELS.length]
  const motifName = CREST_MOTIF_LABELS[(seed >>> 4) % CREST_MOTIF_LABELS.length]

  const download = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `rookery-crest-${new Date().toISOString().slice(0, 10)}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
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
      height = Math.max(480, rect.height)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    const render = (time: number) => {
      if (disposed) return
      const resonance = pulseAtRef.current ? clamp(1 - (time - pulseAtRef.current) / 1800, 0, 1) : 0
      drawRookery(ctx, width, height, time, reducedMotion, seed, resonance, flightMode, parallaxRef.current.x, parallaxRef.current.y, backgroundImage)
      if (!reducedMotion) frame = window.requestAnimationFrame(render)
    }
    const onStagePointerMove = (event: globalThis.PointerEvent) => {
      const rect = stage.getBoundingClientRect()
      parallaxRef.current = {
        x: Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1)),
        y: Math.max(-1, Math.min(1, (event.clientY - rect.top) / rect.height * 2 - 1)),
      }
      stage.style.setProperty('--rookery-parallax-x', parallaxRef.current.x.toFixed(3))
      stage.style.setProperty('--rookery-parallax-y', parallaxRef.current.y.toFixed(3))
    }
    const onStagePointerLeave = () => {
      parallaxRef.current = { x: 0, y: 0 }
      stage.style.setProperty('--rookery-parallax-x', '0')
      stage.style.setProperty('--rookery-parallax-y', '0')
    }
    const observer = new ResizeObserver(resize)
    observer.observe(stage)
    stage.addEventListener('pointermove', onStagePointerMove)
    stage.addEventListener('pointerleave', onStagePointerLeave)
    backgroundImage = new Image()
    backgroundImage.decoding = 'async'
    backgroundImage.src = '/rookery-bg.png'
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
    }
  }, [flightMode, pulse, reducedMotion, seed])

  return (
    <main className="rookery-scene" data-scene="rookery" data-seed={seed} aria-labelledby="rookery-title">
      <div className="rookery-stage" ref={stageRef}>
        <canvas ref={canvasRef} className="rookery-canvas" role="img" aria-label="鸦巢中的乌鸦信使生成式哥特纹章" />
        <header className="rookery-header">
          <p className="rookery-kicker">第五展馆 <span>/</span> 鸦巢</p>
          <h1 id="rookery-title">乌鸦信使</h1>
          <p className="rookery-subtitle">THE ROOKERY</p>
          <p className="rookery-caption">让一枚属于你的黑暗家徽，在塔楼深处振翅。</p>
        </header>
        <section className="rookery-controls" aria-label="乌鸦信使纹章生成控制">
          <label htmlFor="rookery-word">名字或词语</label>
          <div className="rookery-input-row">
            <input id="rookery-word" value={word} onChange={(event) => setWord(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') forge(word) }} placeholder="输入一个词语" maxLength={48} />
            <button type="button" className="rookery-action rookery-action--forge" onClick={() => forge(word)} title="生成纹章"><WandSparkles aria-hidden="true" /><span>生成</span></button>
            <button type="button" className="rookery-action" onClick={randomize} title="随机词语"><Dices aria-hidden="true" /><span>随机</span></button>
          </div>
          <div className="rookery-control-footer">
            <button type="button" className={`rookery-toggle${flightMode ? ' rookery-toggle--active' : ''}`} aria-pressed={flightMode} onClick={() => setFlightMode((value) => !value)}><Radio aria-hidden="true" /><span>鸦群巡夜</span></button>
            <button type="button" className="rookery-download" onClick={download}><Download aria-hidden="true" /><span>下载 PNG</span></button>
          </div>
        </section>
        <div className="rookery-status" aria-live="polite"><Feather aria-hidden="true" /><span>{word ? `纹章已为「${word}」铸成 · ${paletteName}底 · ${frameName} · ${motifName}` : '等待一名信使'}</span></div>
        <nav className="rookery-nav" aria-label="鸦巢展馆导航">
          <button type="button" className="rookery-link" onClick={() => { window.location.hash = '#/cemetery' }}><ArrowLeft aria-hidden="true" /><span>返回墓地</span></button>
        </nav>
      </div>
    </main>
  )
}
