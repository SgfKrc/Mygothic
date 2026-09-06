import { useEffect, useRef, useState } from 'react'
import { Sparkles } from 'lucide-react'
import './tarot-sanctuary.css'

export type TarotSanctuarySceneProps = {
  reducedMotion?: boolean
  effectsEnabled?: boolean
}

type Point = { x: number; y: number }

type MajorArcanaCard = {
  number: number
  roman: string
  name: string
  english: string
  keyword: string
  symbol: string
  accent: string
}

type CardOrientation = 'upright' | 'reversed'
type ReadingPosition = 'past' | 'present' | 'future'
type DrawnCard = {
  card: MajorArcanaCard
  orientation: CardOrientation
  position: ReadingPosition
}
type TarotReading = {
  date: string
  cards: [DrawnCard, DrawnCard, DrawnCard]
}

const tarotDailyStorageKey = 'gothic-tarot-major-reading'
const readingPositions: readonly { key: ReadingPosition; label: string; english: string }[] = [
  { key: 'past', label: '过去', english: 'THE PAST' },
  { key: 'present', label: '现在', english: 'THE PRESENT' },
  { key: 'future', label: '未来', english: 'THE FUTURE' },
]

const localDateKey = () => {
  const now = new Date()
  const month = `${now.getMonth() + 1}`.padStart(2, '0')
  const day = `${now.getDate()}`.padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

const loadDailyReading = (): TarotReading | null => {
  let raw: string | null = null
  try {
    raw = window.localStorage.getItem(tarotDailyStorageKey)
  } catch { /* storage may be blocked */ }
  if (!raw) {
    try {
      raw = window.sessionStorage.getItem(tarotDailyStorageKey)
    } catch { /* storage may be blocked */ }
  }
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as TarotReading
    if (value.date !== localDateKey() || !Array.isArray(value.cards) || value.cards.length !== 3) return null
    if (value.cards.some((item) => !item?.card || !item.orientation || !item.position)) return null
    return value
  } catch { return null }
}

const majorArcana: readonly MajorArcanaCard[] = [
  { number: 0, roman: '0', name: '愚者', english: 'THE FOOL', keyword: '出发 · 无垠的可能', symbol: 'fool', accent: '#d8b474' },
  { number: 1, roman: 'I', name: '魔术师', english: 'THE MAGICIAN', keyword: '意志 · 显现', symbol: 'magician', accent: '#bb8d55' },
  { number: 2, roman: 'II', name: '女祭司', english: 'THE HIGH PRIESTESS', keyword: '月影 · 内在之门', symbol: 'priestess', accent: '#9ca9c5' },
  { number: 3, roman: 'III', name: '皇后', english: 'THE EMPRESS', keyword: '丰饶 · 生长', symbol: 'empress', accent: '#c98c82' },
  { number: 4, roman: 'IV', name: '皇帝', english: 'THE EMPEROR', keyword: '秩序 · 王座', symbol: 'emperor', accent: '#bd885d' },
  { number: 5, roman: 'V', name: '教皇', english: 'THE HIEROPHANT', keyword: '仪式 · 传承', symbol: 'hierophant', accent: '#cbb88d' },
  { number: 6, roman: 'VI', name: '恋人', english: 'THE LOVERS', keyword: '选择 · 共鸣', symbol: 'lovers', accent: '#bd6d70' },
  { number: 7, roman: 'VII', name: '战车', english: 'THE CHARIOT', keyword: '推进 · 驾驭', symbol: 'chariot', accent: '#a5a8b9' },
  { number: 8, roman: 'VIII', name: '力量', english: 'STRENGTH', keyword: '驯服 · 温柔的勇气', symbol: 'strength', accent: '#ce9c63' },
  { number: 9, roman: 'IX', name: '隐者', english: 'THE HERMIT', keyword: '独行 · 灯火', symbol: 'hermit', accent: '#ad9a74' },
  { number: 10, roman: 'X', name: '命运之轮', english: 'WHEEL OF FORTUNE', keyword: '循环 · 转向', symbol: 'wheel', accent: '#c1a05f' },
  { number: 11, roman: 'XI', name: '正义', english: 'JUSTICE', keyword: '衡量 · 真相', symbol: 'justice', accent: '#b4b9c2' },
  { number: 12, roman: 'XII', name: '倒吊人', english: 'THE HANGED MAN', keyword: '停驻 · 反转', symbol: 'hanged', accent: '#879e9e' },
  { number: 13, roman: 'XIII', name: '死神', english: 'DEATH', keyword: '蜕变 · 终点之后', symbol: 'death', accent: '#c1c1b2' },
  { number: 14, roman: 'XIV', name: '节制', english: 'TEMPERANCE', keyword: '调和 · 流动', symbol: 'temperance', accent: '#a5b4ad' },
  { number: 15, roman: 'XV', name: '恶魔', english: 'THE DEVIL', keyword: '束缚 · 欲望', symbol: 'devil', accent: '#a8615b' },
  { number: 16, roman: 'XVI', name: '高塔', english: 'THE TOWER', keyword: '崩解 · 雷鸣', symbol: 'tower', accent: '#d59659' },
  { number: 17, roman: 'XVII', name: '星星', english: 'THE STAR', keyword: '希望 · 远方', symbol: 'star', accent: '#91b2cb' },
  { number: 18, roman: 'XVIII', name: '月亮', english: 'THE MOON', keyword: '梦境 · 潮汐', symbol: 'moon', accent: '#a18dbb' },
  { number: 19, roman: 'XIX', name: '太阳', english: 'THE SUN', keyword: '照耀 · 生命', symbol: 'sun', accent: '#e0ae58' },
  { number: 20, roman: 'XX', name: '审判', english: 'JUDGEMENT', keyword: '召唤 · 苏醒', symbol: 'judgement', accent: '#c79d83' },
  { number: 21, roman: 'XXI', name: '世界', english: 'THE WORLD', keyword: '完成 · 环抱', symbol: 'world', accent: '#9db28f' },
]

const arcanaReadings: Record<string, { upright: string; reversed: string }> = {
  fool: { upright: '新的道路正在打开，保留好奇，迈出不必完美的第一步。', reversed: '脚下的路尚未稳固，先保留轻盈，不要把冲动当成召唤。' },
  magician: { upright: '意志与工具已经齐备，把想法落成一道可见的门。', reversed: '工具齐全却彼此分散，收束意志后再施展。' },
  priestess: { upright: '安静会带来答案，信任尚未说出口的直觉。', reversed: '直觉被杂音遮住，给沉默留出真正的空间。' },
  empress: { upright: '丰饶正在生长，让创造力获得持续的照料。', reversed: '过度照料正在消耗自己，重新划定滋养的边界。' },
  emperor: { upright: '建立清晰的边界，秩序会为行动提供骨架。', reversed: '控制感过重，僵硬的秩序需要一处可以呼吸的缝隙。' },
  hierophant: { upright: '旧知识仍有回响，从可靠的传统中取出自己的仪式。', reversed: '旧仪式失去回应，辨别传统与束缚的差别。' },
  lovers: { upright: '一次真诚的选择会让两条道路重新产生共鸣。', reversed: '选择被恐惧拉扯，先说清自己真正愿意承担什么。' },
  chariot: { upright: '方向已经出现，驾驭分歧，向前推进。', reversed: '方向相互冲撞，放慢缰绳才能重新掌舵。' },
  strength: { upright: '温柔不是退让，耐心会驯服最难安放的力量。', reversed: '柔软被误认为退让，恢复温和而坚定的力量。' },
  hermit: { upright: '一盏小灯足以照出下一步，独行也能保持清醒。', reversed: '独处逐渐变成封闭，带一盏灯回到人群边缘。' },
  wheel: { upright: '循环开始转动，顺势而行，接受命运的转向。', reversed: '循环卡在旧轨道，接受暂时失速，再换一条轨道。' },
  justice: { upright: '让事实与选择各归其位，诚实会带来平衡。', reversed: '判断受偏见倾斜，补回被忽略的那一端。' },
  hanged: { upright: '暂时停驻能换来新的视角，答案会在放手后出现。', reversed: '停顿过久，换一个角度后必须做出落地的动作。' },
  death: { upright: '旧形状正在结束，为真正的蜕变腾出空间。', reversed: '舍不得结束的事占据新生空间，允许旧形状脱落。' },
  temperance: { upright: '让两股流动慢慢相融，平衡会形成新的节奏。', reversed: '两股流体没有真正相融，降低极端，重新调和。' },
  devil: { upright: '看清欲望与代价，承认选择后才能掌握锁链。', reversed: '欲望正在替你做决定，认领代价才能解开锁链。' },
  tower: { upright: '崩塌带来诚实的空间，旧结构裂开后才能重建。', reversed: '裂缝已经出现，不要修补表面，先撤离危险的结构。' },
  star: { upright: '微弱却真实的希望正在远处发光，保持方向。', reversed: '希望变得遥远，先照亮身边一小块可以行动的地方。' },
  moon: { upright: '梦与现实交叠，沿着潮汐辨认内心真正的形状。', reversed: '想象放大了恐惧，等待事实从潮汐里浮出。' },
  sun: { upright: '热度与清晰一同抵达，允许生命被看见。', reversed: '光线太强反而忽略细节，收敛炫耀，保留真实的热度。' },
  judgement: { upright: '旧日的呼唤再次响起，听见它并作出回应。', reversed: '旧呼唤尚未听清，别替他人宣判，先倾听回声。' },
  world: { upright: '一段旅程完整闭合，新的圆环正等待被进入。', reversed: '完成感让循环停住，留一道出口给下一阶段。' },
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const seededRandom = (seed: number) => {
  let state = seed >>> 0
  return () => {
    state = Math.imul(state ^ (state >>> 16), 2246822507)
    state = Math.imul(state ^ (state >>> 13), 3266489909)
    return ((state ^ (state >>> 16)) >>> 0) / 4294967296
  }
}

const drawCover = (ctx: CanvasRenderingContext2D, image: HTMLImageElement | null, width: number, height: number, alpha: number, offsetX = 0, offsetY = 0) => {
  if (!image || !image.complete || image.naturalWidth === 0) return
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight) * 1.08
  const imageWidth = image.naturalWidth * scale
  const imageHeight = image.naturalHeight * scale
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.drawImage(image, (width - imageWidth) / 2 + offsetX, (height - imageHeight) / 2 + offsetY, imageWidth, imageHeight)
  ctx.restore()
}

const pathPolygon = (ctx: CanvasRenderingContext2D, points: Point[]) => {
  ctx.beginPath()
  points.forEach((point, index) => index === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y))
  ctx.closePath()
}

const drawArch = (ctx: CanvasRenderingContext2D, x: number, base: number, width: number, height: number, alpha: number) => {
  const half = width / 2
  const top = base - height
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle = '#211c20'
  ctx.strokeStyle = 'rgba(184, 158, 124, .46)'
  ctx.lineWidth = Math.max(1, width * .012)
  ctx.beginPath()
  ctx.moveTo(x - half, base)
  ctx.lineTo(x - half, top + height * .34)
  ctx.quadraticCurveTo(x - half * .72, top, x, top - height * .04)
  ctx.quadraticCurveTo(x + half * .72, top, x + half, top + height * .34)
  ctx.lineTo(x + half, base)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.strokeStyle = 'rgba(220, 191, 145, .19)'
  ctx.lineWidth = Math.max(.7, width * .006)
  ctx.beginPath()
  ctx.moveTo(x - half * .78, base)
  ctx.lineTo(x - half * .78, top + height * .37)
  ctx.quadraticCurveTo(x - half * .54, top + height * .12, x, top + height * .07)
  ctx.quadraticCurveTo(x + half * .54, top + height * .12, x + half * .78, top + height * .37)
  ctx.lineTo(x + half * .78, base)
  ctx.stroke()
  ctx.restore()
}

const drawColumn = (ctx: CanvasRenderingContext2D, x: number, base: number, width: number, height: number, depth: number, glow: number) => {
  const top = base - height
  const half = width / 2
  const shaft = ctx.createLinearGradient(x - half, 0, x + half, 0)
  shaft.addColorStop(0, '#17161a')
  shaft.addColorStop(.34, '#77665f')
  shaft.addColorStop(.55, '#30282d')
  shaft.addColorStop(1, '#0f1014')
  ctx.save()
  ctx.globalAlpha = .8 + depth * .18
  ctx.fillStyle = shaft
  ctx.strokeStyle = 'rgba(218, 184, 135, .32)'
  ctx.lineWidth = Math.max(1, width * .018)
  ctx.beginPath()
  ctx.moveTo(x - half * .82, top)
  ctx.lineTo(x + half * .82, top)
  ctx.lineTo(x + half, base)
  ctx.lineTo(x - half, base)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = 'rgba(231, 198, 145, .16)'
  ctx.beginPath()
  ctx.moveTo(x - half * .42, top + height * .01)
  ctx.lineTo(x - half * .2, top + height * .01)
  ctx.lineTo(x - half * .32, base - height * .02)
  ctx.lineTo(x - half * .62, base - height * .02)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#18161a'
  ctx.fillRect(x - half * 1.35, top - height * .045, width * 1.7, height * .055)
  ctx.fillRect(x - half * 1.65, top - height * .105, width * 2.3, height * .065)
  ctx.fillStyle = 'rgba(199, 164, 117, .22)'
  ctx.fillRect(x - half * 1.03, top - height * .145, width * 2.06, height * .035)
  ctx.fillStyle = '#18161a'
  ctx.fillRect(x - half * 1.2, base - height * .045, width * 1.4, height * .06)
  ctx.fillRect(x - half * 1.45, base + height * .012, width * 1.9, height * .065)
  ctx.strokeStyle = `rgba(245, 208, 141, ${.12 + glow * .3})`
  ctx.lineWidth = Math.max(.8, width * .012)
  for (let flute = -1; flute <= 1; flute += 1) {
    ctx.beginPath()
    ctx.moveTo(x + flute * half * .42, top + height * .08)
    ctx.lineTo(x + flute * half * .57, base - height * .08)
    ctx.stroke()
  }
  ctx.strokeStyle = 'rgba(10, 9, 13, .62)'
  ctx.lineWidth = Math.max(.7, width * .009)
  ctx.beginPath()
  ctx.moveTo(x + half * .24, top + height * .08)
  ctx.lineTo(x + half * .33, base - height * .07)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(237, 207, 161, .12)'
  ctx.lineWidth = Math.max(.7, width * .006)
  for (let course = 1; course < 7; course += 1) {
    const courseY = top + height * (.12 + course * .115)
    ctx.beginPath()
    ctx.moveTo(x - half * (.84 - course * .018), courseY)
    ctx.lineTo(x + half * (.84 - course * .018), courseY)
    ctx.stroke()
  }
  ctx.restore()
}

const drawFloor = (ctx: CanvasRenderingContext2D, width: number, height: number, cx: number, parallaxY: number, pulse: number) => {
  const horizonY = height * .56 + parallaxY * .6
  const floorTop = height * .58 + parallaxY
  const floorGradient = ctx.createLinearGradient(0, horizonY, 0, height)
  floorGradient.addColorStop(0, '#242027')
  floorGradient.addColorStop(.42, '#19171e')
  floorGradient.addColorStop(1, '#08090d')
  ctx.fillStyle = floorGradient
  ctx.beginPath()
  ctx.moveTo(0, horizonY)
  ctx.lineTo(width, horizonY)
  ctx.lineTo(width, height)
  ctx.lineTo(0, height)
  ctx.closePath()
  ctx.fill()

  ctx.save()
  ctx.beginPath()
  ctx.rect(0, floorTop, width, height - floorTop)
  ctx.clip()
  // Broad horizontal courses establish the floor plane before the finer tile
  // lines are added, so the room cannot read as a floating wireframe.
  for (let row = 0; row < 11; row += 1) {
    const progress = row / 11
    const y = floorTop + Math.pow(progress, 1.72) * (height - floorTop)
    const nextY = floorTop + Math.pow((row + 1) / 11, 1.72) * (height - floorTop)
    ctx.fillStyle = row % 2 === 0 ? 'rgba(111, 92, 88, .12)' : 'rgba(15, 14, 20, .3)'
    ctx.fillRect(0, y, width, Math.max(1, nextY - y))
    ctx.strokeStyle = 'rgba(196, 163, 122, .2)'
    ctx.lineWidth = Math.max(.7, width * .001)
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }
  const vanishingY = floorTop
  for (let ray = -14; ray <= 14; ray += 1) {
    const bottomX = cx + ray * width * .075
    ctx.strokeStyle = ray % 2 === 0 ? 'rgba(207, 174, 126, .2)' : 'rgba(72, 64, 68, .34)'
    ctx.lineWidth = Math.max(.7, width * .0011)
    ctx.beginPath()
    ctx.moveTo(cx + ray * width * .009, vanishingY)
    ctx.lineTo(bottomX, height)
    ctx.stroke()
  }
  // A large circular opus-sectile medallion anchors the centre of the room.
  const medallionY = height * .82 + parallaxY
  const medallionW = width * .29
  const medallionH = height * .08
  for (let ring = 4; ring >= 0; ring -= 1) {
    const ratio = (ring + 1) / 5
    ctx.strokeStyle = ring === 0 ? `rgba(242, 204, 137, ${.55 + pulse * .22})` : `rgba(174, 141, 105, ${.24 - ring * .025})`
    ctx.lineWidth = Math.max(1, width * (.002 + (4 - ring) * .001))
    ctx.beginPath()
    ctx.ellipse(cx, medallionY, medallionW * ratio, medallionH * ratio, 0, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.fillStyle = 'rgba(220, 181, 112, .08)'
  ctx.beginPath()
  ctx.ellipse(cx, medallionY, medallionW * .42, medallionH * .43, 0, 0, Math.PI * 2)
  ctx.fill()
  for (let spoke = 0; spoke < 12; spoke += 1) {
    const angle = spoke / 12 * Math.PI * 2
    ctx.strokeStyle = 'rgba(206, 170, 117, .28)'
    ctx.lineWidth = Math.max(.8, width * .0012)
    ctx.beginPath()
    ctx.moveTo(cx + Math.cos(angle) * medallionW * .08, medallionY + Math.sin(angle) * medallionH * .08)
    ctx.lineTo(cx + Math.cos(angle) * medallionW * .9, medallionY + Math.sin(angle) * medallionH * .9)
    ctx.stroke()
  }
  ctx.restore()
  ctx.fillStyle = 'rgba(2, 2, 5, .38)'
  ctx.fillRect(0, height * .93, width, height * .07)
}

const drawRearNiches = (ctx: CanvasRenderingContext2D, width: number, height: number, cx: number, parallaxX: number, parallaxY: number) => {
  const horizon = height * .56 + parallaxY * .42
  const random = seededRandom(0x90a7)
  const niches = [-1, -1, -1, 1, 1, 1]
  niches.forEach((side, index) => {
    const row = index % 3
    const distance = .28 + row * .12
    const x = cx + side * width * distance + parallaxX * (1.1 - distance)
    const nicheWidth = width * (.075 - row * .006)
    const nicheHeight = height * (.23 - row * .018)
    const base = horizon + height * (.1 + row * .045)
    const top = base - nicheHeight
    ctx.save()
    ctx.globalAlpha = .58 - row * .07
    ctx.fillStyle = '#121117'
    ctx.strokeStyle = 'rgba(199, 164, 118, .3)'
    ctx.lineWidth = Math.max(1, width * .0016)
    ctx.beginPath()
    ctx.moveTo(x - nicheWidth, base)
    ctx.lineTo(x - nicheWidth, top + nicheHeight * .3)
    ctx.quadraticCurveTo(x - nicheWidth * .66, top, x, top - nicheHeight * .05)
    ctx.quadraticCurveTo(x + nicheWidth * .66, top, x + nicheWidth, top + nicheHeight * .3)
    ctx.lineTo(x + nicheWidth, base)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.strokeStyle = 'rgba(230, 196, 144, .2)'
    ctx.lineWidth = Math.max(.8, width * .001)
    ctx.beginPath()
    ctx.moveTo(x - nicheWidth * .8, base)
    ctx.lineTo(x - nicheWidth * .8, top + nicheHeight * .34)
    ctx.quadraticCurveTo(x - nicheWidth * .5, top + nicheHeight * .1, x, top + nicheHeight * .06)
    ctx.quadraticCurveTo(x + nicheWidth * .5, top + nicheHeight * .1, x + nicheWidth * .8, top + nicheHeight * .34)
    ctx.lineTo(x + nicheWidth * .8, base)
    ctx.stroke()
    const statueHeight = nicheHeight * (.42 + random() * .13)
    ctx.fillStyle = 'rgba(192, 169, 143, .28)'
    ctx.beginPath()
    ctx.arc(x, base - statueHeight * .86, nicheWidth * .18, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(x - nicheWidth * .38, base)
    ctx.quadraticCurveTo(x - nicheWidth * .24, base - statueHeight * .75, x, base - statueHeight * .7)
    ctx.quadraticCurveTo(x + nicheWidth * .24, base - statueHeight * .75, x + nicheWidth * .38, base)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = 'rgba(235, 196, 130, .17)'
    ctx.beginPath()
    ctx.moveTo(x - nicheWidth * .7, base + height * .012)
    ctx.lineTo(x + nicheWidth * .7, base + height * .012)
    ctx.moveTo(x - nicheWidth * .57, base + height * .032)
    ctx.lineTo(x + nicheWidth * .57, base + height * .032)
    ctx.stroke()
    ctx.restore()
  })
  ctx.save()
  ctx.globalAlpha = .4
  ctx.strokeStyle = 'rgba(218, 181, 130, .35)'
  ctx.lineWidth = Math.max(1, width * .002)
  ctx.beginPath()
  ctx.moveTo(0, horizon)
  ctx.lineTo(width, horizon)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(218, 181, 130, .14)'
  ctx.lineWidth = Math.max(2, width * .004)
  ctx.beginPath()
  ctx.moveTo(0, horizon - height * .025)
  ctx.lineTo(width, horizon - height * .025)
  ctx.stroke()
  ctx.restore()
}

const drawPantheonWallLayers = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  parallaxX: number,
  parallaxY: number,
  pulse: number,
) => {
  const horizon = height * .56 + parallaxY * .16

  // Far drum: a broad, quiet mass that moves least and keeps the supplied
  // background from reading as a single unmoving plate.
  ctx.save()
  ctx.translate(parallaxX * .12, parallaxY * .08)
  const drum = ctx.createLinearGradient(0, 0, 0, horizon)
  drum.addColorStop(0, 'rgba(19, 17, 23, .2)')
  drum.addColorStop(.62, 'rgba(43, 35, 39, .18)')
  drum.addColorStop(1, 'rgba(10, 10, 15, .46)')
  ctx.fillStyle = drum
  ctx.fillRect(-width * .1, -height * .1, width * 1.2, horizon + height * .1)
  ctx.strokeStyle = 'rgba(222, 188, 136, .17)'
  ctx.lineWidth = Math.max(1, width * .002)
  for (let ring = 0; ring < 5; ring += 1) {
    const y = height * (.11 + ring * .09)
    ctx.beginPath()
    ctx.ellipse(width * .5, y, width * (.35 + ring * .085), height * (.09 + ring * .016), 0, Math.PI, Math.PI * 2)
    ctx.stroke()
  }
  for (let rib = -5; rib <= 5; rib += 1) {
    const topX = width * .5 + rib * width * .055
    ctx.strokeStyle = 'rgba(198, 167, 126, .1)'
    ctx.lineWidth = Math.max(.8, width * .0011)
    ctx.beginPath()
    ctx.moveTo(width * .5, height * .04)
    ctx.quadraticCurveTo(topX, height * .27, width * (.5 + rib * .115), horizon)
    ctx.stroke()
  }
  ctx.restore()

  // Middle arcade: recessed arches are offset more strongly than the drum,
  // with a dark inner wall and a thin lit reveal on each stone edge.
  ctx.save()
  ctx.translate(parallaxX * .38, parallaxY * .24)
  const arcadeBase = height * .64
  const archWidth = width * .145
  const archHeight = height * .3
  for (let index = -4; index <= 4; index += 1) {
    const x = width * .5 + index * width * .135
    const depth = 1 - Math.min(1, Math.abs(index) / 5) * .22
    drawArch(ctx, x, arcadeBase + Math.abs(index) * height * .008, archWidth * depth, archHeight * depth, .2 + (4 - Math.min(4, Math.abs(index))) * .035)
    ctx.fillStyle = 'rgba(7, 7, 11, .35)'
    ctx.fillRect(x - archWidth * .3, arcadeBase - archHeight * .16, archWidth * .6, archHeight * .16)
  }
  ctx.strokeStyle = 'rgba(214, 176, 125, .18)'
  ctx.lineWidth = Math.max(1, width * .002)
  ctx.beginPath()
  ctx.moveTo(-width * .1, arcadeBase)
  ctx.quadraticCurveTo(width * .5, arcadeBase - height * .06, width * 1.1, arcadeBase)
  ctx.stroke()
  ctx.restore()
}

const drawPantheonForeground = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cx: number,
  parallaxX: number,
  parallaxY: number,
  pulse: number,
) => {
  const nearX = parallaxX * .86
  const nearY = parallaxY * .9
  const horizon = height * .67 + nearY
  const edge = height * .95 + nearY
  ctx.save()
  ctx.translate(nearX, 0)
  const leftWall = ctx.createLinearGradient(0, horizon, width * .35, edge)
  leftWall.addColorStop(0, 'rgba(48, 39, 44, .08)')
  leftWall.addColorStop(1, 'rgba(4, 5, 8, .58)')
  ctx.fillStyle = leftWall
  pathPolygon(ctx, [{ x: 0, y: horizon }, { x: width * .28, y: horizon + height * .04 }, { x: width * .07, y: edge }, { x: 0, y: edge }])
  ctx.fill()
  const rightWall = ctx.createLinearGradient(width, horizon, width * .65, edge)
  rightWall.addColorStop(0, 'rgba(48, 39, 44, .08)')
  rightWall.addColorStop(1, 'rgba(4, 5, 8, .58)')
  ctx.fillStyle = rightWall
  pathPolygon(ctx, [{ x: width, y: horizon }, { x: width * .72, y: horizon + height * .04 }, { x: width * .93, y: edge }, { x: width, y: edge }])
  ctx.fill()

  // Three shallow steps around the sword socket create a near occlusion edge
  // and make the central floor read as stone instead of a wireframe overlay.
  for (let step = 0; step < 3; step += 1) {
    const y = height * (.84 + step * .045) + nearY
    const half = width * (.18 + step * .11)
    ctx.fillStyle = step === 0 ? 'rgba(111, 88, 76, .22)' : 'rgba(24, 22, 27, .64)'
    ctx.strokeStyle = `rgba(213, 174, 123, ${.24 - step * .045 + pulse * .06})`
    ctx.lineWidth = Math.max(1, width * .0014)
    pathPolygon(ctx, [{ x: cx - half, y }, { x: cx + half, y }, { x: cx + half * 1.12, y: y + height * .026 }, { x: cx - half * 1.12, y: y + height * .026 }])
    ctx.fill()
    ctx.stroke()
  }
  ctx.restore()
}

const drawCardOrnament = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, accent: string, flip = false) => {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(flip ? Math.PI / 4 : -Math.PI / 4)
  ctx.strokeStyle = accent
  ctx.globalAlpha = .78
  ctx.lineWidth = Math.max(1, size * .08)
  ctx.strokeRect(-size / 2, -size / 2, size, size)
  ctx.lineWidth = Math.max(.7, size * .035)
  ctx.strokeRect(-size * .34, -size * .34, size * .68, size * .68)
  ctx.restore()
}

const drawCardSymbol = (ctx: CanvasRenderingContext2D, card: MajorArcanaCard, cx: number, cy: number, size: number, time: number, orientation: CardOrientation) => {
  const color = card.accent
  const line = Math.max(1.5, size * .025)
  const reversed = orientation === 'reversed'
  ctx.save()
  ctx.translate(cx, cy)
  // Reversed cards use a second composition: the symbol remains readable, but
  // a low eclipse, offset shadow and broken baseline change its visual weight.
  // This is intentionally not a canvas rotation of the upright drawing.
  if (reversed) {
    ctx.globalAlpha = .72
    ctx.fillStyle = 'rgba(8, 8, 13, .68)'
    ctx.beginPath()
    ctx.ellipse(size * .08, size * .19, size * .42, size * .16, -.12, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.translate(-size * .035, size * .035)
  }
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = line
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const circle = (x: number, y: number, radius: number, fill = false) => {
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    fill ? ctx.fill() : ctx.stroke()
  }
  const ray = (count: number, radius: number, inner: number, phase = 0) => {
    for (let index = 0; index < count; index += 1) {
      const angle = phase + index / count * Math.PI * 2
      ctx.beginPath()
      ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner)
      ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius)
      ctx.stroke()
    }
  }
  switch (card.symbol) {
    case 'fool':
      ctx.beginPath(); ctx.moveTo(-size * .24, size * .3); ctx.lineTo(size * .06, -size * .24); ctx.lineTo(size * .3, size * .3); ctx.stroke()
      circle(-size * .06, -size * .34, size * .09)
      ctx.beginPath(); ctx.moveTo(-size * .06, -size * .25); ctx.lineTo(-size * .09, size * .1); ctx.lineTo(-size * .25, size * .26); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(size * .02, size * .1); ctx.lineTo(size * .3, size * .03); ctx.stroke()
      break
    case 'magician':
      circle(0, 0, size * .25)
      ctx.beginPath(); ctx.moveTo(-size * .34, -size * .02); ctx.bezierCurveTo(-size * .12, -size * .3, size * .12, size * .3, size * .34, 0); ctx.bezierCurveTo(size * .12, -size * .3, -size * .12, size * .3, -size * .34, .02); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, -size * .25); ctx.lineTo(0, -size * .5); ctx.stroke()
      break
    case 'priestess':
      ctx.fillStyle = 'rgba(156, 169, 197, .16)'; ctx.fillRect(-size * .34, -size * .52, size * .16, size * 1.02); ctx.fillRect(size * .18, -size * .52, size * .16, size * 1.02)
      ctx.strokeRect(-size * .34, -size * .52, size * .16, size * 1.02); ctx.strokeRect(size * .18, -size * .52, size * .16, size * 1.02)
      ctx.beginPath(); ctx.arc(0, -size * .03, size * .29, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke(); circle(0, size * .27, size * .08)
      break
    case 'empress':
      circle(0, 0, size * .1, true); for (let petal = 0; petal < 8; petal += 1) { const a = petal / 8 * Math.PI * 2; ctx.beginPath(); ctx.ellipse(Math.cos(a) * size * .18, Math.sin(a) * size * .18, size * .1, size * .2, a, 0, Math.PI * 2); ctx.stroke() }
      ctx.beginPath(); ctx.moveTo(0, size * .3); ctx.quadraticCurveTo(-size * .2, size * .08, -size * .28, -size * .04); ctx.moveTo(0, size * .3); ctx.quadraticCurveTo(size * .18, size * .08, size * .28, -size * .04); ctx.stroke()
      break
    case 'emperor':
      ctx.beginPath(); ctx.moveTo(-size * .32, size * .27); ctx.lineTo(-size * .26, -size * .18); ctx.lineTo(-size * .16, -size * .38); ctx.lineTo(0, -size * .19); ctx.lineTo(size * .16, -size * .38); ctx.lineTo(size * .26, -size * .18); ctx.lineTo(size * .32, size * .27); ctx.closePath(); ctx.stroke(); circle(0, -size * .03, size * .1)
      break
    case 'hierophant':
      ctx.beginPath(); ctx.moveTo(0, -size * .43); ctx.lineTo(0, size * .4); ctx.moveTo(-size * .19, -size * .25); ctx.lineTo(size * .19, -size * .25); ctx.moveTo(-size * .12, size * .06); ctx.lineTo(size * .12, size * .06); ctx.stroke(); ctx.beginPath(); ctx.arc(0, -size * .12, size * .2, Math.PI, 0); ctx.stroke()
      break
    case 'lovers':
      ctx.beginPath(); ctx.moveTo(0, size * .34); ctx.bezierCurveTo(-size * .58, -size * .03, -size * .2, -size * .4, 0, -size * .12); ctx.bezierCurveTo(size * .2, -size * .4, size * .58, -size * .03, 0, size * .34); ctx.stroke(); ray(7, size * .5, size * .31, -Math.PI / 2)
      break
    case 'chariot':
      ctx.strokeRect(-size * .31, -size * .25, size * .62, size * .43); circle(-size * .26, size * .3, size * .12); circle(size * .26, size * .3, size * .12); ctx.beginPath(); ctx.moveTo(-size * .37, -size * .26); ctx.lineTo(-size * .19, -size * .43); ctx.lineTo(0, -size * .28); ctx.lineTo(size * .19, -size * .43); ctx.lineTo(size * .37, -size * .26); ctx.stroke()
      break
    case 'strength':
      circle(0, -size * .2, size * .13); ctx.beginPath(); ctx.moveTo(-size * .27, size * .28); ctx.quadraticCurveTo(-size * .22, -size * .06, 0, -size * .02); ctx.quadraticCurveTo(size * .22, -size * .06, size * .27, size * .28); ctx.stroke(); ctx.beginPath(); ctx.arc(0, size * .03, size * .25, Math.PI * .2, Math.PI * .8); ctx.stroke()
      break
    case 'hermit':
      ctx.beginPath(); ctx.moveTo(0, -size * .38); ctx.lineTo(-size * .21, size * .32); ctx.lineTo(size * .21, size * .32); ctx.closePath(); ctx.stroke(); circle(0, -size * .1, size * .16); circle(0, -size * .1, size * .07, true); ctx.beginPath(); ctx.moveTo(size * .22, size * .36); ctx.lineTo(size * .38, size * .48); ctx.stroke()
      break
    case 'wheel':
      circle(0, 0, size * .3); circle(0, 0, size * .08); ray(8, size * .3, size * .08, time * .0002); ctx.beginPath(); ctx.arc(0, 0, size * .45, 0, Math.PI * 2); ctx.stroke()
      break
    case 'justice':
      ctx.beginPath(); ctx.moveTo(0, -size * .42); ctx.lineTo(0, size * .38); ctx.moveTo(-size * .32, -size * .2); ctx.lineTo(size * .32, -size * .2); ctx.moveTo(-size * .27, -size * .2); ctx.lineTo(-size * .35, size * .04); ctx.quadraticCurveTo(-size * .27, size * .15, -size * .19, size * .04); ctx.closePath(); ctx.moveTo(size * .27, -size * .2); ctx.lineTo(size * .35, size * .04); ctx.quadraticCurveTo(size * .27, size * .15, size * .19, size * .04); ctx.closePath(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-size * .2, size * .38); ctx.lineTo(size * .2, size * .38); ctx.stroke()
      break
    case 'hanged':
      ctx.beginPath(); ctx.moveTo(-size * .42, -size * .35); ctx.lineTo(size * .42, -size * .35); ctx.moveTo(-size * .27, -size * .35); ctx.lineTo(-size * .1, size * .05); ctx.lineTo(-size * .25, size * .34); ctx.moveTo(size * .27, -size * .35); ctx.lineTo(size * .1, size * .05); ctx.lineTo(size * .25, size * .34); ctx.stroke(); circle(0, size * .12, size * .1)
      break
    case 'death':
      circle(0, -size * .05, size * .22); ctx.fillStyle = '#111117'; circle(-size * .08, -size * .08, size * .035, true); circle(size * .08, -size * .08, size * .035, true); ctx.beginPath(); ctx.moveTo(-size * .1, size * .08); ctx.lineTo(size * .1, size * .08); ctx.moveTo(0, -size * .27); ctx.lineTo(size * .2, -size * .47); ctx.lineTo(size * .3, -size * .32); ctx.stroke()
      break
    case 'temperance':
      ctx.beginPath(); ctx.moveTo(-size * .28, -size * .25); ctx.lineTo(size * .28, size * .2); ctx.moveTo(size * .28, -size * .25); ctx.lineTo(-size * .28, size * .2); ctx.stroke(); ctx.strokeRect(-size * .39, -size * .34, size * .17, size * .2); ctx.strokeRect(size * .22, size * .1, size * .17, size * .2); ctx.beginPath(); ctx.arc(0, 0, size * .08, 0, Math.PI * 2); ctx.stroke()
      break
    case 'devil':
      ctx.beginPath(); ctx.moveTo(-size * .3, -size * .23); ctx.lineTo(-size * .18, -size * .46); ctx.lineTo(0, -size * .28); ctx.lineTo(size * .18, -size * .46); ctx.lineTo(size * .3, -size * .23); ctx.stroke(); circle(0, 0, size * .22); ctx.fillStyle = '#111117'; circle(-size * .08, -size * .03, size * .03, true); circle(size * .08, -size * .03, size * .03, true); ctx.beginPath(); ctx.moveTo(-size * .34, size * .3); ctx.lineTo(size * .34, size * .3); ctx.stroke()
      break
    case 'tower':
      ctx.beginPath(); ctx.moveTo(-size * .22, size * .4); ctx.lineTo(-size * .22, -size * .27); ctx.lineTo(0, -size * .43); ctx.lineTo(size * .22, -size * .27); ctx.lineTo(size * .22, size * .4); ctx.closePath(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(size * .12, -size * .58); ctx.lineTo(-size * .08, -size * .12); ctx.lineTo(size * .04, -size * .15); ctx.lineTo(-size * .11, size * .24); ctx.stroke(); ctx.fillStyle = 'rgba(213, 150, 89, .22)'; ctx.fillRect(-size * .15, size * .02, size * .1, size * .13); ctx.fillRect(size * .05, size * .02, size * .1, size * .13)
      break
    case 'star':
      circle(0, 0, size * .09, true); ray(8, size * .42, size * .14); circle(-size * .3, size * .28, size * .07); circle(size * .3, size * .28, size * .07); ctx.beginPath(); ctx.moveTo(-size * .4, size * .4); ctx.quadraticCurveTo(0, size * .2, size * .4, size * .4); ctx.stroke()
      break
    case 'moon':
      ctx.beginPath(); ctx.arc(-size * .08, -size * .05, size * .29, Math.PI * .25, Math.PI * 1.75); ctx.stroke(); ctx.beginPath(); ctx.arc(size * .07, -size * .05, size * .29, Math.PI * .7, Math.PI * 1.3); ctx.stroke(); circle(-size * .33, size * .3, size * .07); circle(size * .33, size * .3, size * .07); ctx.beginPath(); ctx.moveTo(-size * .25, size * .38); ctx.lineTo(size * .25, size * .38); ctx.stroke()
      break
    case 'sun':
      circle(0, 0, size * .22); ray(16, size * .47, size * .3, time * .0001); circle(0, 0, size * .08, true)
      break
    case 'judgement':
      ctx.beginPath(); ctx.moveTo(-size * .38, -size * .18); ctx.lineTo(size * .1, -size * .35); ctx.lineTo(size * .35, -size * .08); ctx.stroke(); ctx.beginPath(); ctx.arc(size * .14, -size * .1, size * .1, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-size * .25, size * .3); ctx.lineTo(-size * .25, size * .02); ctx.moveTo(0, size * .3); ctx.lineTo(0, size * .02); ctx.moveTo(size * .25, size * .3); ctx.lineTo(size * .25, size * .02); ctx.stroke(); circle(-size * .25, size * .02, size * .07); circle(0, size * .02, size * .07); circle(size * .25, size * .02, size * .07)
      break
    case 'world':
      ctx.beginPath(); ctx.ellipse(0, 0, size * .3, size * .45, 0, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.ellipse(0, 0, size * .45, size * .15, 0, 0, Math.PI * 2); ctx.stroke(); circle(0, 0, size * .1, true); ray(4, size * .42, size * .31, Math.PI / 4)
      break
  }
  ctx.restore()
}

const drawTarotCard = (ctx: CanvasRenderingContext2D, width: number, height: number, card: MajorArcanaCard | null, back: boolean, time: number, orientation: CardOrientation = 'upright') => {
  ctx.clearRect(0, 0, width, height)
  const inset = Math.min(width, height) * .045
  const gradient = ctx.createLinearGradient(0, 0, width, height)
  gradient.addColorStop(0, '#221a1d')
  gradient.addColorStop(.5, '#100f15')
  gradient.addColorStop(1, '#050609')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)
  ctx.strokeStyle = 'rgba(218, 176, 105, .84)'
  ctx.lineWidth = Math.max(1.5, width * .014)
  ctx.strokeRect(inset, inset, width - inset * 2, height - inset * 2)
  ctx.strokeStyle = 'rgba(218, 176, 105, .38)'
  ctx.lineWidth = Math.max(.8, width * .006)
  ctx.strokeRect(inset * 2.1, inset * 2.1, width - inset * 4.2, height - inset * 4.2)
  drawCardOrnament(ctx, inset * 2.4, inset * 2.4, inset * 1.4, card?.accent ?? '#b18a59')
  drawCardOrnament(ctx, width - inset * 2.4, height - inset * 2.4, inset * 1.4, card?.accent ?? '#b18a59', true)
  if (back || !card) {
    const centerX = width / 2
    const centerY = height / 2
    ctx.save()
    ctx.translate(centerX, centerY)
    ctx.strokeStyle = 'rgba(214, 170, 102, .54)'
    ctx.lineWidth = Math.max(1, width * .008)
    for (let ring = 1; ring <= 4; ring += 1) {
      ctx.beginPath(); ctx.arc(0, 0, Math.min(width, height) * ring * .085, 0, Math.PI * 2); ctx.stroke()
    }
    for (let rayIndex = 0; rayIndex < 12; rayIndex += 1) {
      const angle = rayIndex / 12 * Math.PI * 2 + time * .00015
      ctx.beginPath(); ctx.moveTo(Math.cos(angle) * width * .08, Math.sin(angle) * height * .08); ctx.lineTo(Math.cos(angle) * width * .36, Math.sin(angle) * height * .36); ctx.stroke()
    }
    ctx.fillStyle = 'rgba(214, 170, 102, .8)'
    ctx.beginPath(); ctx.arc(0, 0, Math.min(width, height) * .06, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
    ctx.fillStyle = 'rgba(237, 218, 179, .76)'
    ctx.font = `${Math.max(9, width * .055)}px 'Cormorant Garamond', serif`
    ctx.textAlign = 'center'
    ctx.fillText('ARCANA', width / 2, height * .88)
    return
  }
  const accent = card.accent
  ctx.fillStyle = accent
  ctx.font = `600 ${Math.max(11, width * .072)}px 'Noto Serif SC', serif`
  ctx.textAlign = 'center'
  ctx.fillText(card.roman, width / 2, height * .115)
  ctx.fillStyle = 'rgba(238, 224, 197, .83)'
  ctx.font = `${Math.max(8, width * .043)}px 'Cormorant Garamond', serif`
  ctx.fillText(card.english, width / 2, height * .19)
  ctx.strokeStyle = `${accent}8c`
  ctx.lineWidth = Math.max(.7, width * .004)
  ctx.beginPath(); ctx.moveTo(width * .19, height * .23); ctx.lineTo(width * .81, height * .23); ctx.stroke()
  drawCardSymbol(ctx, card, width / 2, height * .49, Math.min(width, height) * .43, time, orientation)
  if (orientation === 'reversed') {
    ctx.save()
    ctx.strokeStyle = 'rgba(231, 172, 112, .65)'
    ctx.lineWidth = Math.max(1, width * .009)
    ctx.setLineDash([width * .055, width * .035])
    ctx.beginPath()
    ctx.moveTo(width * .2, height * .66)
    ctx.lineTo(width * .8, height * .66)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = 'rgba(235, 212, 171, .78)'
    ctx.font = `${Math.max(8, width * .04)}px 'Noto Serif SC', serif`
    ctx.fillText('逆位', width / 2, height * .72)
    ctx.restore()
  }
  ctx.fillStyle = '#f2e5cb'
  ctx.font = `600 ${Math.max(13, width * .09)}px 'Noto Serif SC', serif`
  ctx.fillText(card.name, width / 2, height * .79)
  ctx.fillStyle = 'rgba(222, 198, 153, .72)'
  ctx.font = `${Math.max(8, width * .042)}px 'Noto Serif SC', serif`
  ctx.fillText(`${orientation === 'reversed' ? '逆位 · ' : '正位 · '}${card.keyword}`, width / 2, height * .88)
}

const interpretDrawnCard = ({ card, orientation, position }: DrawnCard) => {
  const positionLabel = readingPositions.find((item) => item.key === position)?.label ?? position
  const reading = arcanaReadings[card.symbol]
  const detail = reading?.[orientation] ?? card.keyword
  return `${positionLabel}的「${card.name}」为${orientation === 'reversed' ? '逆位' : '正位'}：${detail}`
}

const drawPantheon = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  reducedMotion: boolean,
  pointerX: number,
  pointerY: number,
  pulse: number,
  backgroundImage: HTMLImageElement | null,
) => {
  const t = reducedMotion ? 0 : time / 1000
  const parallaxX = pointerX * width * .055
  const parallaxY = pointerY * height * .035
  const cx = width * .5 + parallaxX
  const floorY = height * .76 + parallaxY
  const scale = Math.min(width / 1200, height / 780)

  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = '#09090d'
  ctx.fillRect(0, 0, width, height)
  drawCover(ctx, backgroundImage, width, height, .68, parallaxX * .18, parallaxY * .12)
  ctx.fillStyle = 'rgba(7, 6, 11, .47)'
  ctx.fillRect(0, 0, width, height)

  drawPantheonWallLayers(ctx, width, height, parallaxX, parallaxY, pulse)

  // The dome is built from nested rings rather than a flat backdrop, making
  // the oculus and its ribs read as a deep circular room.
  ctx.save()
  ctx.translate(cx, height * .28 + parallaxY * .25)
  for (let ring = 0; ring < 8; ring += 1) {
    const radiusX = width * (.17 + ring * .075)
    const radiusY = height * (.12 + ring * .043)
    ctx.strokeStyle = `rgba(194, 163, 121, ${.3 - ring * .025})`
    ctx.lineWidth = Math.max(1, scale * (5 - ring * .3))
    ctx.beginPath()
    ctx.ellipse(0, 0, radiusX, radiusY, 0, Math.PI, Math.PI * 2)
    ctx.stroke()
    if (ring < 7) {
      ctx.strokeStyle = 'rgba(53, 49, 57, .7)'
      ctx.lineWidth = Math.max(.7, scale * 1.4)
      ctx.beginPath()
      ctx.ellipse(0, 0, radiusX * .94, radiusY * .92, 0, Math.PI, Math.PI * 2)
      ctx.stroke()
    }
  }
  const oculusRadius = Math.min(width, height) * .095
  const oculus = ctx.createRadialGradient(0, 0, 0, 0, 0, oculusRadius * 1.3)
  oculus.addColorStop(0, 'rgba(255, 247, 211, .98)')
  oculus.addColorStop(.38, 'rgba(226, 190, 128, .62)')
  oculus.addColorStop(1, 'rgba(83, 60, 50, 0)')
  ctx.fillStyle = oculus
  ctx.beginPath()
  ctx.arc(0, 0, oculusRadius * 1.28, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(235, 204, 153, .7)'
  ctx.lineWidth = Math.max(1.2, scale * 2.4)
  ctx.beginPath()
  ctx.arc(0, 0, oculusRadius, 0, Math.PI * 2)
  ctx.stroke()
  for (let spoke = 0; spoke < 16; spoke += 1) {
    const angle = spoke / 16 * Math.PI * 2 + t * .015
    ctx.strokeStyle = 'rgba(178, 151, 115, .28)'
    ctx.lineWidth = Math.max(.6, scale)
    ctx.beginPath()
    ctx.moveTo(Math.cos(angle) * oculusRadius * 1.12, Math.sin(angle) * oculusRadius * .75)
    ctx.lineTo(Math.cos(angle) * width * .48, Math.sin(angle) * height * .28)
    ctx.stroke()
  }
  ctx.restore()

  // Lay the floor before the near architectural pieces so column feet and
  // arches sit on the paving instead of being painted over by it.
  drawFloor(ctx, width, height, cx, parallaxY, pulse)
  drawRearNiches(ctx, width, height, cx, parallaxX, parallaxY)

  // Deep side arcades and columns. Their offsets differ by depth to give the
  // rotunda a clear vanishing point when the pointer moves.
  const columnSpecs = [
    { x: -.47, depth: .22, width: .105, height: .48 },
    { x: -.33, depth: .42, width: .082, height: .58 },
    { x: -.2, depth: .66, width: .064, height: .68 },
    { x: .2, depth: .66, width: .064, height: .68 },
    { x: .33, depth: .42, width: .082, height: .58 },
    { x: .47, depth: .22, width: .105, height: .48 },
  ]
  columnSpecs.forEach((spec) => {
    const columnX = width * (.5 + spec.x) + parallaxX * (1.2 - spec.depth)
    const base = height * (.83 + spec.depth * .035)
    const columnWidth = width * spec.width * (.72 + spec.depth * .55)
    const columnHeight = height * spec.height * (.72 + spec.depth * .45)
    drawColumn(ctx, columnX, base, columnWidth, columnHeight, spec.depth, pulse)
  })
  drawArch(ctx, width * (.16 + parallaxX / width), height * .79, width * .25, height * .39, .48)
  drawArch(ctx, width * (.84 + parallaxX / width), height * .79, width * .25, height * .39, .48)
  drawArch(ctx, cx, height * .78, width * .31, height * .45, .28)
  drawPantheonForeground(ctx, width, height, cx, parallaxX, parallaxY, pulse)

  // A volumetric shaft descends from the oculus and blooms around the stone.
  const beamTop = { x: cx, y: height * .27 + parallaxY * .2 }
  const beamBottom = { x: cx, y: height * .72 + parallaxY }
  const beamWidth = width * (.18 + pulse * .04)
  const beam = ctx.createLinearGradient(beamTop.x, beamTop.y, beamBottom.x, beamBottom.y)
  beam.addColorStop(0, 'rgba(255, 240, 193, .28)')
  beam.addColorStop(.55, 'rgba(255, 225, 161, .12)')
  beam.addColorStop(1, 'rgba(255, 216, 139, .02)')
  ctx.fillStyle = beam
  ctx.beginPath()
  ctx.moveTo(beamTop.x - width * .035, beamTop.y)
  ctx.lineTo(beamTop.x + width * .035, beamTop.y)
  ctx.lineTo(beamBottom.x + beamWidth, beamBottom.y)
  ctx.lineTo(beamBottom.x - beamWidth, beamBottom.y)
  ctx.closePath()
  ctx.fill()
  const halo = ctx.createRadialGradient(cx, height * .71, 0, cx, height * .71, width * (.21 + pulse * .08))
  halo.addColorStop(0, `rgba(255, 231, 164, ${.27 + pulse * .32})`)
  halo.addColorStop(.44, 'rgba(224, 178, 108, .11)')
  halo.addColorStop(1, 'rgba(224, 178, 108, 0)')
  ctx.fillStyle = halo
  ctx.fillRect(0, height * .48, width, height * .48)

  // Dust catches the light, with a deterministic orbit so the scene remains
  // calm and legible instead of turning into random noise.
  const dust = seededRandom(0x781204)
  for (let i = 0; i < 46; i += 1) {
    const phase = dust() * Math.PI * 2
    const x = cx + Math.sin(t * (.12 + dust() * .22) + phase) * width * (.08 + dust() * .2)
    const y = height * (.29 + ((t * (.018 + dust() * .03) + dust()) % .52))
    const size = .6 + dust() * 2.2
    ctx.fillStyle = `rgba(255, 235, 177, ${.12 + dust() * .42})`
    ctx.fillRect(x, y, size, size)
  }

  // Stone socket and broken hero sword.
  const stoneY = height * .75 + parallaxY
  const stoneW = width * .22
  const stoneH = height * .12
  ctx.save()
  ctx.fillStyle = 'rgba(0, 0, 0, .52)'
  ctx.beginPath()
  ctx.ellipse(cx, stoneY + stoneH * .05, stoneW * .75, stoneH * .2, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
  const stone = ctx.createLinearGradient(cx - stoneW / 2, stoneY - stoneH, cx + stoneW / 2, stoneY)
  stone.addColorStop(0, '#968576')
  stone.addColorStop(.45, '#4e4647')
  stone.addColorStop(1, '#1d1a20')
  pathPolygon(ctx, [
    { x: cx - stoneW * .52, y: stoneY },
    { x: cx - stoneW * .43, y: stoneY - stoneH * .72 },
    { x: cx - stoneW * .18, y: stoneY - stoneH },
    { x: cx + stoneW * .16, y: stoneY - stoneH * .93 },
    { x: cx + stoneW * .48, y: stoneY - stoneH * .52 },
    { x: cx + stoneW * .55, y: stoneY },
  ])
  ctx.fillStyle = stone
  ctx.strokeStyle = 'rgba(228, 196, 150, .46)'
  ctx.lineWidth = Math.max(1.5, scale * 2)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#2a252a'
  ctx.strokeStyle = 'rgba(205, 169, 124, .34)'
  ctx.lineWidth = Math.max(1, scale * 1.2)
  ctx.beginPath()
  ctx.moveTo(cx - stoneW * .58, stoneY - height * .005)
  ctx.lineTo(cx - stoneW * .5, stoneY + stoneH * .12)
  ctx.lineTo(cx + stoneW * .5, stoneY + stoneH * .12)
  ctx.lineTo(cx + stoneW * .58, stoneY - height * .005)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.strokeStyle = 'rgba(19, 17, 21, .7)'
  ctx.lineWidth = Math.max(1, scale * 1.2)
  ctx.beginPath()
  ctx.moveTo(cx - stoneW * .16, stoneY - stoneH * .84)
  ctx.lineTo(cx - stoneW * .2, stoneY - stoneH * .46)
  ctx.lineTo(cx - stoneW * .1, stoneY - stoneH * .22)
  ctx.moveTo(cx + stoneW * .18, stoneY - stoneH * .72)
  ctx.lineTo(cx + stoneW * .1, stoneY - stoneH * .43)
  ctx.lineTo(cx + stoneW * .2, stoneY - stoneH * .13)
  ctx.stroke()

  // The blade points down into the stone. The guard, grip and pommel sit above
  // the rock; keeping these layers explicit prevents the old upside-down
  // silhouette from returning during later redraws.
  const guardY = height * .38 + parallaxY * .14
  const bladeTop = guardY + height * .035
  const bladeBottom = stoneY - stoneH * .28
  const bladeW = width * .022
  const bladeGradient = ctx.createLinearGradient(cx - bladeW, bladeTop, cx + bladeW, bladeBottom)
  bladeGradient.addColorStop(0, '#d9d7c7')
  bladeGradient.addColorStop(.3, '#887f78')
  bladeGradient.addColorStop(.54, '#f1e7cc')
  bladeGradient.addColorStop(1, '#4e4a4d')
  pathPolygon(ctx, [
    { x: cx - bladeW * 1.15, y: bladeTop },
    { x: cx + bladeW * 1.15, y: bladeTop },
    { x: cx + bladeW * .64, y: bladeBottom - height * .02 },
    { x: cx, y: bladeBottom },
    { x: cx - bladeW * .64, y: bladeBottom - height * .02 },
  ])
  ctx.fillStyle = bladeGradient
  ctx.strokeStyle = 'rgba(248, 228, 177, .82)'
  ctx.lineWidth = Math.max(1, scale * 1.7)
  ctx.fill()
  ctx.stroke()
  ctx.strokeStyle = 'rgba(42, 37, 40, .52)'
  ctx.lineWidth = Math.max(.8, scale)
  ctx.beginPath()
  ctx.moveTo(cx, bladeTop + height * .01)
  ctx.lineTo(cx, bladeBottom - height * .02)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(255, 245, 215, .34)'
  ctx.lineWidth = Math.max(.7, scale * .9)
  ctx.beginPath()
  ctx.moveTo(cx - bladeW * .68, bladeTop + height * .025)
  ctx.lineTo(cx - bladeW * .25, bladeBottom - height * .05)
  ctx.moveTo(cx + bladeW * .68, bladeTop + height * .025)
  ctx.lineTo(cx + bladeW * .25, bladeBottom - height * .05)
  ctx.stroke()
  ctx.strokeStyle = '#c99c58'
  ctx.lineWidth = Math.max(3, scale * 6)
  ctx.beginPath()
  ctx.moveTo(cx - width * .075, guardY)
  ctx.quadraticCurveTo(cx, guardY + height * .026, cx + width * .075, guardY)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(255, 224, 157, .8)'
  ctx.lineWidth = Math.max(1, scale * 1.5)
  ctx.stroke()
  ctx.fillStyle = '#3a2424'
  ctx.fillRect(cx - width * .017, guardY - height * .12, width * .034, height * .1)
  ctx.strokeStyle = '#b88b52'
  ctx.lineWidth = Math.max(1, scale * 1.4)
  for (let wrap = 0; wrap < 4; wrap += 1) {
    ctx.beginPath()
    ctx.moveTo(cx - width * .018, guardY - height * (.096 - wrap * .019))
    ctx.lineTo(cx + width * .018, guardY - height * (.11 - wrap * .019))
    ctx.stroke()
  }
  ctx.fillStyle = '#d4b16b'
  ctx.beginPath()
  ctx.arc(cx, guardY - height * .145, width * .015, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(17, 14, 18, .85)'
  ctx.strokeStyle = 'rgba(228, 185, 112, .72)'
  ctx.lineWidth = Math.max(1, scale * 1.2)
  ctx.beginPath()
  ctx.ellipse(cx, stoneY - stoneH * .42, bladeW * 1.7, stoneH * .08, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  if (pulse > .01) {
    ctx.strokeStyle = `rgba(255, 235, 169, ${pulse * .7})`
    ctx.lineWidth = Math.max(1, scale * 2)
    ctx.beginPath()
    ctx.arc(cx, stoneY - stoneH * .35, width * (.1 + (1 - pulse) * .2), 0, Math.PI * 2)
    ctx.stroke()
  }

  const vignette = ctx.createRadialGradient(cx, height * .56, Math.min(width, height) * .18, cx, height * .55, Math.max(width, height) * .78)
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)')
  vignette.addColorStop(1, 'rgba(3, 3, 7, .68)')
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, width, height)
}

export default function TarotSanctuaryScene({ reducedMotion = false, effectsEnabled = true }: TarotSanctuarySceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cardCanvasRefs = useRef<Array<HTMLCanvasElement | null>>([])
  const stageRef = useRef<HTMLDivElement>(null)
  const pointerRef = useRef({ x: 0, y: 0 })
  const pulseRef = useRef(0)
  const frameRef = useRef<number | null>(null)
  const drawTimerRef = useRef<number | null>(null)
  const [reading, setReading] = useState<TarotReading | null>(() => loadDailyReading())
  const [isDrawing, setIsDrawing] = useState(false)
  const [status, setStatus] = useState('断裂英雄剑沉睡在圣光之下。')

  useEffect(() => {
    cardCanvasRefs.current.forEach((canvas, index) => {
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const width = Math.max(1, rect.width)
      const height = Math.max(1, rect.height)
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const drawn = reading?.cards[index]
      drawTarotCard(ctx, width, height, drawn?.card ?? null, isDrawing || !drawn, reducedMotion ? 0 : performance.now(), drawn?.orientation ?? 'upright')
    })
    return undefined
  }, [isDrawing, reducedMotion, reading])

  useEffect(() => () => {
    if (drawTimerRef.current !== null) window.clearTimeout(drawTimerRef.current)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const stage = stageRef.current
    if (!canvas || !stage) return undefined
    const ctx = canvas.getContext('2d')
    if (!ctx) return undefined
    let width = 1
    let height = 1
    let disposed = false
    let backgroundImage: HTMLImageElement | null = null

    const paint = (time: number) => {
      drawPantheon(ctx, width, height, time, reducedMotion, pointerRef.current.x, pointerRef.current.y, pulseRef.current, backgroundImage)
    }
    const draw = (time: number) => {
      if (disposed) return
      if (!reducedMotion && pulseRef.current > .001) pulseRef.current *= .92
      paint(time)
      if (!reducedMotion) frameRef.current = window.requestAnimationFrame(draw)
    }
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
      paint(reducedMotion ? 0 : performance.now())
    }
    const onPointerMove = (event: PointerEvent) => {
      const rect = stage.getBoundingClientRect()
      pointerRef.current = {
        x: clamp((event.clientX - rect.left) / rect.width * 2 - 1, -1, 1),
        y: clamp((event.clientY - rect.top) / rect.height * 2 - 1, -1, 1),
      }
      stage.style.setProperty('--tarot-pointer-x', `${pointerRef.current.x}`)
      stage.style.setProperty('--tarot-pointer-y', `${pointerRef.current.y}`)
      if (reducedMotion) paint(0)
    }
    const observer = new ResizeObserver(resize)
    observer.observe(stage)
    backgroundImage = new Image()
    backgroundImage.decoding = 'async'
    backgroundImage.src = '/tarot-pantheon-bg.jpeg'
    backgroundImage.onload = () => { if (!disposed) paint(reducedMotion ? 0 : performance.now()) }
    stage.addEventListener('pointermove', onPointerMove)
    resize()
    if (!reducedMotion) frameRef.current = window.requestAnimationFrame(draw)
    return () => {
      disposed = true
      observer.disconnect()
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current)
      frameRef.current = null
      if (backgroundImage) backgroundImage.onload = null
      stage.removeEventListener('pointermove', onPointerMove)
    }
  }, [reducedMotion])

  const activateSword = () => {
    pulseRef.current = 1
    setStatus('断裂英雄剑回应了天顶的光。')
    window.dispatchEvent(new CustomEvent('gothic:announce', { detail: '断裂英雄剑回应了天顶的光。' }))
    if (effectsEnabled && !reducedMotion) window.setTimeout(() => setStatus('断裂英雄剑沉睡在圣光之下。'), 2600)
  }

  const drawMajorArcana = () => {
    if (reading || isDrawing) return
    const pool = [...majorArcana]
    const cards = readingPositions.map((position) => {
      const index = Math.floor(Math.random() * pool.length)
      const card = pool.splice(index, 1)[0] ?? majorArcana[0]
      return { card, orientation: Math.random() > .5 ? 'upright' : 'reversed', position: position.key } as DrawnCard
    }) as [DrawnCard, DrawnCard, DrawnCard]
    if (drawTimerRef.current !== null) window.clearTimeout(drawTimerRef.current)
    setIsDrawing(true)
    setStatus('牌阵正在回应：过去、现在与未来。')
    window.dispatchEvent(new CustomEvent('gothic:announce', { detail: '正在抽取大阿卡那。' }))
    drawTimerRef.current = window.setTimeout(() => {
      const nextReading: TarotReading = { date: localDateKey(), cards }
      setReading(nextReading)
      setIsDrawing(false)
      try {
        window.localStorage.setItem(tarotDailyStorageKey, JSON.stringify(nextReading))
      } catch {
        try {
          window.sessionStorage.setItem(tarotDailyStorageKey, JSON.stringify(nextReading))
        } catch {
          // A fully restricted context still keeps the reading locked in the
          // mounted scene; persistent storage is simply unavailable there.
        }
      }
      setStatus('三张牌已落定：过去、现在与未来。')
      window.dispatchEvent(new CustomEvent('gothic:announce', { detail: '三张大阿卡那已落定。' }))
      drawTimerRef.current = null
    }, reducedMotion ? 0 : 560)
  }

  return (
    <main className="tarot-sanctuary-scene" data-scene="tarot" aria-labelledby="tarot-sanctuary-title">
      <div className="tarot-sanctuary__stage" ref={stageRef}>
        <canvas className="tarot-sanctuary__canvas" ref={canvasRef} role="img" aria-label="塔罗圣堂：古罗马万神殿穹顶、天顶圣光与插在石中的断裂英雄剑" />
        <div className="tarot-sanctuary__grain" aria-hidden="true" />
        <header className="tarot-sanctuary__header">
          <p className="tarot-sanctuary__kicker">第八展馆 <span>/</span> 塔罗圣堂</p>
          <h1 id="tarot-sanctuary-title">塔罗圣堂</h1>
          <p className="tarot-sanctuary__subtitle">THE TAROT PANTHEON</p>
          <p className="tarot-sanctuary__caption">圆顶敞向无名的天穹，光只为一把断剑落下。</p>
        </header>
        <button className="tarot-sanctuary__sword-hotspot" type="button" onClick={activateSword} aria-label="触碰断裂英雄剑">
          <Sparkles aria-hidden="true" />
          <span>断裂英雄剑</span>
        </button>
        <aside className={`tarot-sanctuary__oracle-panel ${isDrawing ? 'is-drawing' : ''}`} aria-label="大阿卡那三牌阵">
          <div className="tarot-sanctuary__oracle-cards">
            {readingPositions.map((position, index) => {
              const drawn = reading?.cards[index]
              const visible = Boolean(drawn && !isDrawing)
              return (
                <figure className="tarot-sanctuary__oracle-slot" key={position.key}>
                  <figcaption>
                    <span>{position.label}</span>
                    <small>{visible ? drawn?.orientation === 'reversed' ? '逆位' : '正位' : '未揭示'}</small>
                  </figcaption>
                  <div className="tarot-sanctuary__oracle-card">
                    <canvas
                      ref={(element) => { cardCanvasRefs.current[index] = element }}
                      className="tarot-sanctuary__card-canvas"
                      role="img"
                      aria-label={visible ? `大阿卡那${drawn?.card.name}${drawn?.orientation === 'reversed' ? '逆位' : '正位'}` : '大阿卡那牌背'}
                    />
                  </div>
                  <p>{visible ? drawn?.card.name : '—'}</p>
                </figure>
              )
            })}
          </div>
          <div className="tarot-sanctuary__oracle-copy">
            <p className="tarot-sanctuary__oracle-kicker">MAJOR ARCANA / THREE-CARD READING</p>
            <h2>{reading && !isDrawing ? '今日三牌阵' : '今日尚未抽卡'}</h2>
            <p className="tarot-sanctuary__oracle-intro">{reading && !isDrawing ? '过去、现在与未来已经落定。' : '每日限抽一次，一次揭示过去、现在与未来。'}</p>
            {reading && !isDrawing && (
              <div className="tarot-sanctuary__reading-list">
                {reading.cards.map((drawn) => <p key={drawn.position}>{interpretDrawnCard(drawn)}</p>)}
              </div>
            )}
          </div>
          <button className="tarot-sanctuary__draw-button" type="button" onClick={drawMajorArcana} disabled={Boolean(reading) || isDrawing} aria-label={isDrawing ? '正在抽取大阿卡那' : reading ? '今日已经抽取过三张牌' : '抽取今日三张大阿卡那'}>
            <Sparkles aria-hidden="true" />
            <span>{isDrawing ? '翻牌中…' : reading ? '今日已抽取' : '抽取今日三牌阵'}</span>
          </button>
        </aside>
        <p className="tarot-sanctuary__status" aria-live="polite">{status}</p>
        <p className="tarot-sanctuary__hint">移动指针，窥见穹顶的层层回廊</p>
      </div>
    </main>
  )
}
