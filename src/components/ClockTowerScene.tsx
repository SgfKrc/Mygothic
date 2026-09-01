import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { BellRing, Cog, DoorOpen, KeyboardMusic, Lightbulb, X } from 'lucide-react'
import './clock-tower.css'

type ClockTowerSceneProps = {
  reducedMotion?: boolean
  effectsEnabled?: boolean
}

type GearSpec = {
  x: number
  y: number
  radius: number
  teeth: number
  speed: number
  phase: number
  depth: number
  hue: number
}

type PipeSpec = {
  points: Array<[number, number]>
  radius: number
  depth: number
  hue: number
}

type DrawOptions = {
  crazyActive: boolean
  sen: number
  bellPulseAt: number
  lampsActive: boolean
  gearPulseAt: number
  gearPulseSeed: number
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

let sharedAudioContext: AudioContext | null = null

const getAudioContext = () => {
  if (typeof window === 'undefined') return null
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextClass) return null
  if (!sharedAudioContext || sharedAudioContext.state === 'closed') sharedAudioContext = new AudioContextClass()
  if (sharedAudioContext.state === 'suspended') void sharedAudioContext.resume().catch(() => undefined)
  return sharedAudioContext
}

const playBellSound = () => {
  const context = getAudioContext()
  if (!context) return
  const now = context.currentTime
  const gain = context.createGain()
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(0.16, now + 0.03)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2)
  gain.connect(context.destination)
  for (const [frequency, detune] of [[132, -4], [198, 3], [264, 0]] as const) {
    const oscillator = context.createOscillator()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(frequency, now)
    oscillator.detune.setValueAtTime(detune, now)
    oscillator.connect(gain)
    oscillator.start(now)
    oscillator.stop(now + 2.3)
  }
}

const playUncannySound = () => {
  const context = getAudioContext()
  if (!context) return
  const now = context.currentTime
  const gain = context.createGain()
  const filter = context.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(420 + Math.random() * 620, now)
  filter.frequency.exponentialRampToValueAtTime(90 + Math.random() * 120, now + 1.2)
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(0.045 + Math.random() * 0.035, now + 0.025)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.35)
  filter.connect(gain).connect(context.destination)
  const oscillator = context.createOscillator()
  oscillator.type = Math.random() > 0.5 ? 'sawtooth' : 'triangle'
  const base = 62 + Math.random() * 80
  oscillator.frequency.setValueAtTime(base, now)
  oscillator.frequency.exponentialRampToValueAtTime(base * (2.6 + Math.random() * 2.4), now + 0.55)
  oscillator.detune.setValueAtTime(-18 + Math.random() * 36, now)
  oscillator.connect(filter)
  oscillator.start(now)
  oscillator.stop(now + 1.4)
}

const playGearTick = () => {
  const context = getAudioContext()
  if (!context) return
  const now = context.currentTime
  const output = context.createGain()
  const filter = context.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.setValueAtTime(1180 + Math.random() * 520, now)
  filter.Q.setValueAtTime(7.5, now)
  output.gain.setValueAtTime(0.0001, now)
  output.gain.exponentialRampToValueAtTime(0.035, now + 0.006)
  output.gain.exponentialRampToValueAtTime(0.0001, now + 0.16)
  filter.connect(output).connect(context.destination)
  const oscillator = context.createOscillator()
  oscillator.type = 'square'
  oscillator.frequency.setValueAtTime(860 + Math.random() * 140, now)
  oscillator.connect(filter)
  oscillator.start(now)
  oscillator.stop(now + 0.19)
}

const playKeyboardNote = (frequency: number) => {
  const context = getAudioContext()
  if (!context) return
  const now = context.currentTime
  const master = context.createGain()
  master.gain.setValueAtTime(0.0001, now)
  master.gain.exponentialRampToValueAtTime(0.17, now + 0.018)
  master.gain.exponentialRampToValueAtTime(0.0001, now + 2.4)
  master.connect(context.destination)

  const addTone = (type: OscillatorType, toneFrequency: number, level: number, duration: number, detune = 0) => {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = type
    oscillator.frequency.setValueAtTime(toneFrequency, now)
    oscillator.detune.setValueAtTime(detune, now)
    gain.gain.setValueAtTime(level, now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
    oscillator.connect(gain).connect(master)
    oscillator.start(now)
    oscillator.stop(now + duration + 0.06)
  }

  // A playable note is a small gothic ensemble: pipe-organ body, bell partials and a choir-like fifth.
  addTone('triangle', frequency, 0.42, 1.9)
  addTone('sawtooth', frequency * 2, 0.08, 1.55, -5)
  addTone('sine', frequency * 2.01, 0.14, 2.2)
  addTone('sine', frequency * 3.01, 0.08, 1.7, 4)
  addTone('sine', frequency * 1.5, 0.055, 1.45, -7)

  const chant = context.createOscillator()
  const chantGain = context.createGain()
  const chantLfo = context.createOscillator()
  const chantDepth = context.createGain()
  chant.type = 'sine'
  chant.frequency.setValueAtTime(frequency * 0.5, now)
  chant.detune.setValueAtTime(-9, now)
  chantGain.gain.setValueAtTime(0.0001, now)
  chantGain.gain.exponentialRampToValueAtTime(0.07, now + 0.16)
  chantGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.55)
  chantLfo.frequency.setValueAtTime(4.7, now)
  chantDepth.gain.setValueAtTime(8, now)
  chantLfo.connect(chantDepth).connect(chant.detune)
  chant.connect(chantGain).connect(master)
  chant.start(now)
  chantLfo.start(now)
  chant.stop(now + 2.62)
  chantLfo.stop(now + 2.62)

  const noise = context.createBufferSource()
  const noiseBuffer = context.createBuffer(1, Math.floor(context.sampleRate * 0.24), context.sampleRate)
  const noiseData = noiseBuffer.getChannelData(0)
  for (let index = 0; index < noiseData.length; index += 1) noiseData[index] = (Math.random() * 2 - 1) * (1 - index / noiseData.length)
  noise.buffer = noiseBuffer
  const noiseFilter = context.createBiquadFilter()
  noiseFilter.type = 'highpass'
  noiseFilter.frequency.setValueAtTime(920, now)
  const noiseGain = context.createGain()
  noiseGain.gain.setValueAtTime(0.035, now)
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.23)
  noise.connect(noiseFilter).connect(noiseGain).connect(master)
  noise.start(now)
  noise.stop(now + 0.25)
  playGearTick()
}

const startClocktowerAmbience = () => {
  const context = getAudioContext()
  if (!context) return () => undefined
  const now = context.currentTime
  const master = context.createGain()
  master.gain.setValueAtTime(0.0001, now)
  master.gain.linearRampToValueAtTime(0.038, now + 1.8)
  master.connect(context.destination)

  const lowpass = context.createBiquadFilter()
  lowpass.type = 'lowpass'
  lowpass.frequency.setValueAtTime(720, now)
  lowpass.Q.setValueAtTime(0.7, now)
  lowpass.connect(master)
  const drone = context.createOscillator()
  drone.type = 'sine'
  drone.frequency.setValueAtTime(43, now)
  drone.connect(lowpass)
  drone.start(now)

  const overtone = context.createOscillator()
  overtone.type = 'triangle'
  overtone.frequency.setValueAtTime(86.1, now)
  overtone.detune.setValueAtTime(-4, now)
  const overtoneGain = context.createGain()
  overtoneGain.gain.setValueAtTime(0.3, now)
  overtone.connect(overtoneGain).connect(lowpass)
  overtone.start(now)

  const air = context.createBufferSource()
  const airBuffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate)
  const airData = airBuffer.getChannelData(0)
  for (let index = 0; index < airData.length; index += 1) airData[index] = (Math.random() * 2 - 1) * 0.22
  air.buffer = airBuffer
  air.loop = true
  const airFilter = context.createBiquadFilter()
  airFilter.type = 'bandpass'
  airFilter.frequency.setValueAtTime(270, now)
  airFilter.Q.setValueAtTime(0.35, now)
  const airGain = context.createGain()
  airGain.gain.setValueAtTime(0.16, now)
  air.connect(airFilter).connect(airGain).connect(master)
  air.start(now)

  const tickTimer = window.setInterval(playGearTick, 5200)
  return () => {
    window.clearInterval(tickTimer)
    const stopAt = context.currentTime + 0.18
    master.gain.cancelScheduledValues(context.currentTime)
    master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), context.currentTime)
    master.gain.exponentialRampToValueAtTime(0.0001, stopAt)
    drone.stop(stopAt)
    overtone.stop(stopAt)
    air.stop(stopAt)
  }
}

const CLOCKTOWER_NOTES = [
  ['C4', 261.63, false], ['C#4', 277.18, true], ['D4', 293.66, false], ['D#4', 311.13, true], ['E4', 329.63, false], ['F4', 349.23, false], ['F#4', 369.99, true], ['G4', 392, false], ['G#4', 415.3, true], ['A4', 440, false], ['A#4', 466.16, true], ['B4', 493.88, false],
  ['C5', 523.25, false], ['C#5', 554.37, true], ['D5', 587.33, false], ['D#5', 622.25, true], ['E5', 659.25, false], ['F5', 698.46, false], ['F#5', 739.99, true], ['G5', 783.99, false], ['G#5', 830.61, true], ['A5', 880, false], ['A#5', 932.33, true], ['B5', 987.77, false],
] as const

const drawGear = (ctx: CanvasRenderingContext2D, gear: GearSpec, t: number, crazyActive = false, spread = 0, centerX = 0, pulseAt = -1, pulseSeed = 0) => {
  ctx.save()
  const direction = gear.x > centerX ? 1 : -1
  const spreadOffset = Math.abs(gear.x - centerX) * spread * 0.42 + spread * gear.radius * 1.35
  const tremor = crazyActive ? Math.sin(t * 18 + gear.phase * 4) * gear.radius * 0.018 : 0
  const pulseAge = pulseAt >= 0 ? t - pulseAt : -1
  const pulseProgress = pulseAge >= 0 && pulseAge < 0.82 ? Math.sin((pulseAge / 0.82) * Math.PI) : 0
  const randomJump = 0.045 + Math.abs(Math.sin(pulseSeed * 2.17 + gear.phase * 17.31)) * 0.09
  const pulseJump = -pulseProgress * gear.radius * randomJump
  ctx.translate(gear.x + direction * spreadOffset + tremor, gear.y + pulseJump + (crazyActive ? Math.cos(t * 14 + gear.phase) * gear.radius * 0.012 : 0))
  ctx.rotate(gear.phase + t * gear.speed * (crazyActive ? 2.7 : 1))
  const toothInner = gear.radius * 0.84
  const toothOuter = gear.radius * 1.06
  const metal = ctx.createRadialGradient(-gear.radius * 0.2, -gear.radius * 0.24, gear.radius * 0.08, 0, 0, gear.radius * 1.12)
  metal.addColorStop(0, `hsla(${gear.hue} 20% 64% / ${0.6 + gear.depth * 0.25})`)
  metal.addColorStop(0.45, `hsla(${gear.hue} 20% 37% / ${0.66 + gear.depth * 0.2})`)
  metal.addColorStop(1, `hsla(${gear.hue} 24% 13% / ${0.78 + gear.depth * 0.16})`)
  ctx.fillStyle = metal
  ctx.strokeStyle = `hsla(${gear.hue} 26% 76% / ${0.34 + gear.depth * 0.34})`
  ctx.lineWidth = Math.max(1, gear.radius * 0.035)
  ctx.beginPath()
  const steps = gear.teeth * 4
  for (let tooth = 0; tooth < steps; tooth += 1) {
    const angle = tooth / steps * Math.PI * 2
    const phase = tooth % 4
    const radius = phase === 0 || phase === 1 ? toothOuter : toothInner
    const px = Math.cos(angle) * radius
    const py = Math.sin(angle) * radius
    if (tooth === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.strokeStyle = `hsla(${gear.hue} 18% 76% / ${0.28 + gear.depth * 0.26})`
  ctx.lineWidth = Math.max(1, gear.radius * 0.026)
  ctx.beginPath()
  ctx.arc(0, 0, gear.radius * 0.74, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(0, 0, gear.radius * 0.2, 0, Math.PI * 2)
  ctx.fillStyle = `hsla(${gear.hue} 22% 17% / ${0.8 + gear.depth * 0.15})`
  ctx.fill()
  ctx.stroke()
  ctx.lineWidth = Math.max(1, gear.radius * 0.035)
  for (let spoke = 0; spoke < 8; spoke += 1) {
    const angle = spoke / 8 * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(Math.cos(angle) * gear.radius * 0.2, Math.sin(angle) * gear.radius * 0.2)
    ctx.lineTo(Math.cos(angle) * gear.radius * 0.7, Math.sin(angle) * gear.radius * 0.7)
    ctx.stroke()
  }
  for (let bolt = 0; bolt < 8; bolt += 1) {
    const angle = bolt / 8 * Math.PI * 2 + Math.PI / 8
    ctx.fillStyle = `hsla(${gear.hue} 26% 75% / ${0.3 + gear.depth * 0.2})`
    ctx.beginPath()
    ctx.arc(Math.cos(angle) * gear.radius * 0.59, Math.sin(angle) * gear.radius * 0.59, Math.max(1, gear.radius * 0.035), 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

const drawPipe = (ctx: CanvasRenderingContext2D, pipe: PipeSpec) => {
  if (pipe.points.length < 2) return
  ctx.save()
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.shadowColor = 'rgba(0, 0, 0, .7)'
  ctx.shadowBlur = pipe.radius * 2.2
  ctx.strokeStyle = `hsla(${pipe.hue} 22% 12% / ${0.76 + pipe.depth * 0.16})`
  ctx.lineWidth = pipe.radius * 2.5
  ctx.beginPath()
  ctx.moveTo(pipe.points[0][0], pipe.points[0][1])
  pipe.points.slice(1).forEach(([x, y]) => ctx.lineTo(x, y))
  ctx.stroke()
  ctx.shadowBlur = 0
  const metal = ctx.createLinearGradient(0, -pipe.radius, 0, pipe.radius)
  metal.addColorStop(0, `hsla(${pipe.hue} 28% 70% / ${0.3 + pipe.depth * 0.28})`)
  metal.addColorStop(0.28, `hsla(${pipe.hue} 25% 42% / ${0.76 + pipe.depth * 0.15})`)
  metal.addColorStop(0.72, `hsla(${pipe.hue} 26% 21% / ${0.9 + pipe.depth * 0.08})`)
  metal.addColorStop(1, `hsla(${pipe.hue} 30% 10% / ${0.9 + pipe.depth * 0.08})`)
  ctx.strokeStyle = metal
  ctx.lineWidth = pipe.radius * 1.65
  ctx.beginPath()
  ctx.moveTo(pipe.points[0][0], pipe.points[0][1])
  pipe.points.slice(1).forEach(([x, y]) => ctx.lineTo(x, y))
  ctx.stroke()
  ctx.strokeStyle = `hsla(${pipe.hue} 35% 76% / ${0.22 + pipe.depth * 0.25})`
  ctx.lineWidth = Math.max(0.7, pipe.radius * 0.22)
  ctx.beginPath()
  ctx.moveTo(pipe.points[0][0] - pipe.radius * 0.15, pipe.points[0][1] - pipe.radius * 0.2)
  pipe.points.slice(1).forEach(([x, y]) => ctx.lineTo(x - pipe.radius * 0.15, y - pipe.radius * 0.2))
  ctx.stroke()
  ctx.restore()
}

const drawWall = (ctx: CanvasRenderingContext2D, width: number, height: number, cameraX: number) => {
  ctx.save()
  ctx.translate(cameraX * 0.12, 0)
  const left = -width * 0.55
  const right = width * 1.9
  const wall = ctx.createLinearGradient(left, 0, right, height)
  wall.addColorStop(0, '#080b10')
  wall.addColorStop(0.42, '#1b1a20')
  wall.addColorStop(0.72, '#282127')
  wall.addColorStop(1, '#090b10')
  ctx.fillStyle = wall
  ctx.fillRect(left, 0, right - left, height)
  ctx.strokeStyle = 'rgba(153, 142, 132, .16)'
  ctx.lineWidth = Math.max(1, width * 0.001)
  for (let course = 0; course < 14; course += 1) {
    const y = height * (0.1 + course * 0.066)
    const offset = course % 2 ? width * 0.08 : 0
    ctx.beginPath()
    ctx.moveTo(left, y)
    ctx.lineTo(right, y + height * 0.002)
    ctx.stroke()
    for (let joint = -2; joint < 19; joint += 1) {
      const x = left + joint * width * 0.13 + offset
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + width * 0.012, y + height * 0.066)
      ctx.stroke()
    }
  }
  ctx.fillStyle = 'rgba(216, 169, 107, .26)'
  for (let rivet = -1; rivet < 18; rivet += 1) {
    ctx.beginPath()
    ctx.arc(left + rivet * width * 0.14, height * 0.105, Math.max(1, width * 0.002), 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

const drawLampPost = (ctx: CanvasRenderingContext2D, x: number, baseY: number, scale: number, t: number, active: boolean) => {
  ctx.save()
  const lampY = baseY - scale * 3.2
  if (active) {
    const pulse = 1 + Math.sin(t * 2.8) * 0.045
    const glow = ctx.createRadialGradient(x, lampY, 0, x, lampY, scale * 8.5 * pulse)
    glow.addColorStop(0, `rgba(255, 226, 164, ${0.68 + Math.sin(t * 2.8) * 0.04})`)
    glow.addColorStop(0.2, 'rgba(242, 171, 92, .34)')
    glow.addColorStop(0.58, 'rgba(196, 93, 48, .13)')
    glow.addColorStop(1, 'rgba(96, 43, 33, 0)')
    ctx.globalCompositeOperation = 'screen'
    ctx.fillStyle = glow
    ctx.fillRect(x - scale * 8.5, lampY - scale * 2.2, scale * 17, scale * 10)
    const beam = ctx.createLinearGradient(x, lampY, x, baseY + scale * 0.2)
    beam.addColorStop(0, 'rgba(255, 211, 132, .2)')
    beam.addColorStop(.55, 'rgba(204, 121, 59, .08)')
    beam.addColorStop(1, 'rgba(111, 48, 36, 0)')
    ctx.fillStyle = beam
    ctx.beginPath()
    ctx.moveTo(x - scale * 0.55, lampY + scale * 0.22)
    ctx.lineTo(x + scale * 0.55, lampY + scale * 0.22)
    ctx.lineTo(x + scale * 3.8, baseY + scale * 0.2)
    ctx.lineTo(x - scale * 3.8, baseY + scale * 0.2)
    ctx.closePath()
    ctx.fill()
    ctx.globalCompositeOperation = 'source-over'
  }
  ctx.strokeStyle = active ? 'rgba(181, 141, 89, .76)' : 'rgba(114, 95, 85, .54)'
  ctx.lineWidth = Math.max(1.5, scale * 0.07)
  ctx.beginPath()
  ctx.moveTo(x, baseY)
  ctx.lineTo(x, lampY + scale * 0.3)
  ctx.stroke()
  ctx.fillStyle = active ? '#916d45' : '#42343a'
  ctx.beginPath()
  ctx.ellipse(x, baseY - scale * 0.04, scale * 0.58, scale * 0.12, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = active ? '#bd8c55' : '#4d3a3d'
  ctx.beginPath()
  ctx.moveTo(x - scale * 0.62, lampY - scale * 0.12)
  ctx.quadraticCurveTo(x, lampY - scale * 0.48, x + scale * 0.62, lampY - scale * 0.12)
  ctx.lineTo(x + scale * 0.42, lampY + scale * 0.62)
  ctx.lineTo(x - scale * 0.42, lampY + scale * 0.62)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(226, 187, 123, .64)'
  ctx.lineWidth = Math.max(1, scale * 0.035)
  ctx.stroke()
  ctx.fillStyle = active ? '#fff0bd' : '#17141a'
  ctx.beginPath()
  ctx.arc(x, lampY + scale * 0.4, scale * (active ? 0.22 : 0.14), 0, Math.PI * 2)
  ctx.fill()
  if (!active) {
    ctx.strokeStyle = 'rgba(83, 67, 67, .42)'
    ctx.lineWidth = Math.max(1, scale * 0.03)
    ctx.beginPath()
    ctx.moveTo(x - scale * 0.28, lampY + scale * 0.04)
    ctx.lineTo(x + scale * 0.28, lampY + scale * 0.7)
    ctx.stroke()
  }
  ctx.restore()
}

const drawBell = (ctx: CanvasRenderingContext2D, x: number, topY: number, size: number, t: number, ringing: number) => {
  const swing = ringing >= 0 && ringing < 3.2 ? Math.sin(ringing * 7.4) * 0.09 * (1 - ringing / 3.2) : 0
  ctx.save()
  ctx.translate(x, topY)
  ctx.rotate(swing)
  ctx.strokeStyle = 'rgba(204, 171, 112, .72)'
  ctx.lineWidth = Math.max(1.5, size * 0.035)
  ctx.beginPath()
  ctx.moveTo(0, -size * 0.9)
  ctx.lineTo(0, -size * 0.18)
  ctx.stroke()
  ctx.fillStyle = '#47342e'
  ctx.strokeStyle = 'rgba(217, 180, 119, .72)'
  ctx.lineWidth = Math.max(1.2, size * 0.028)
  ctx.beginPath()
  ctx.moveTo(-size * 0.42, -size * 0.08)
  ctx.quadraticCurveTo(-size * 0.38, size * 0.47, -size * 0.72, size * 0.66)
  ctx.lineTo(size * 0.72, size * 0.66)
  ctx.quadraticCurveTo(size * 0.38, size * 0.47, size * 0.42, -size * 0.08)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#b88c54'
  ctx.beginPath()
  ctx.arc(0, size * 0.52, size * 0.13, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(234, 208, 160, .52)'
  ctx.lineWidth = Math.max(0.8, size * 0.018)
  ctx.beginPath()
  ctx.moveTo(-size * 0.3, size * 0.18)
  ctx.quadraticCurveTo(0, size * 0.3, size * 0.3, size * 0.18)
  ctx.stroke()
  ctx.restore()

  if (ringing >= 0 && ringing < 3.2) {
    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    ctx.strokeStyle = `rgba(226, 180, 107, ${Math.max(0, 0.42 - ringing * 0.12)})`
    ctx.lineWidth = Math.max(1, size * 0.018)
    for (let ring = 0; ring < 3; ring += 1) {
      const radius = size * (1.1 + ringing * 0.65 + ring * 0.33)
      ctx.beginPath()
      ctx.ellipse(x, topY + size * 0.3, radius, radius * 0.3, 0, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.restore()
  }

  // A very small brass glint keeps the bell readable while the room is dark.
  ctx.fillStyle = `rgba(247, 213, 151, ${0.28 + Math.sin(t * 2.2) * 0.05})`
  ctx.beginPath()
  ctx.arc(x - size * 0.18, topY + size * 0.08, Math.max(1, size * 0.035), 0, Math.PI * 2)
  ctx.fill()
}

const drawSkullHead = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, eyePulse: number, variant: number) => {
  const half = width / 2
  const top = -height * 0.5
  const bottom = height * 0.5
  const bone = ctx.createLinearGradient(0, top, 0, bottom)
  bone.addColorStop(0, '#59616a')
  bone.addColorStop(0.28, '#252b33')
  bone.addColorStop(0.7, '#11151c')
  bone.addColorStop(1, '#05070b')

  ctx.save()
  ctx.translate(x, y)
  ctx.shadowColor = 'rgba(0, 0, 0, .94)'
  ctx.shadowBlur = width * 0.22
  ctx.fillStyle = bone
  ctx.strokeStyle = 'rgba(177, 187, 190, .9)'
  ctx.lineWidth = Math.max(1.2, width * 0.028)
  ctx.beginPath()
  ctx.moveTo(-half * 0.82, top)
  ctx.lineTo(-half * 0.35, top - height * 0.08)
  ctx.lineTo(half * 0.34, top - height * 0.06)
  ctx.lineTo(half * 0.84, top + height * 0.02)
  ctx.lineTo(half, top + height * 0.23)
  ctx.lineTo(half * 0.92, bottom * 0.18)
  ctx.lineTo(half * 0.57, bottom * 0.45)
  ctx.lineTo(half * 0.34, bottom)
  ctx.lineTo(-half * 0.34, bottom)
  ctx.lineTo(-half * 0.57, bottom * 0.45)
  ctx.lineTo(-half * 0.91, bottom * 0.17)
  ctx.lineTo(-half, top + height * 0.23)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.shadowBlur = 0

  // Forehead plate and cheek planes keep each head readable at a distance.
  ctx.fillStyle = `rgba(211, 218, 216, ${0.16 + variant * 0.02})`
  ctx.beginPath()
  ctx.moveTo(-half * 0.7, top + height * 0.05)
  ctx.lineTo(-half * 0.27, top - height * 0.01)
  ctx.lineTo(half * 0.34, top + height * 0.01)
  ctx.lineTo(half * 0.63, top + height * 0.15)
  ctx.lineTo(half * 0.24, top + height * 0.2)
  ctx.lineTo(-half * 0.5, top + height * 0.16)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(220, 229, 226, .42)'
  ctx.lineWidth = Math.max(0.7, width * 0.014)
  ctx.beginPath()
  ctx.moveTo(-half * 0.62, top + height * 0.18)
  ctx.lineTo(-half * 0.26, top + height * 0.12)
  ctx.moveTo(half * 0.2, top + height * 0.12)
  ctx.lineTo(half * 0.62, top + height * 0.18)
  ctx.stroke()

  ctx.strokeStyle = 'rgba(220, 228, 225, .58)'
  ctx.lineWidth = Math.max(0.8, width * 0.015)
  for (const side of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(side * half * 0.82, top + height * 0.3)
    ctx.lineTo(side * half * 0.66, top + height * 0.52)
    ctx.lineTo(side * half * 0.4, top + height * 0.57)
    ctx.moveTo(side * half * 0.84, top + height * 0.37)
    ctx.lineTo(side * half * 0.72, top + height * 0.2)
    ctx.stroke()
  }

  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  for (const side of [-1, 1]) {
    const glow = ctx.createRadialGradient(side * half * 0.4, top + height * 0.35, 0, side * half * 0.4, top + height * 0.35, width * 0.34)
    glow.addColorStop(0, `rgba(227, 255, 249, ${0.2 + eyePulse * 0.11})`)
    glow.addColorStop(0.32, `rgba(157, 235, 220, ${0.09 + eyePulse * 0.04})`)
    glow.addColorStop(1, 'rgba(96, 170, 166, 0)')
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(side * half * 0.4, top + height * 0.35, width * 0.34, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()

  // Deep sockets are drawn first; only narrow white slits emit light.
  ctx.fillStyle = '#020307'
  for (const side of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(side * half * 0.72, top + height * 0.27)
    ctx.lineTo(side * half * 0.18, top + height * 0.2)
    ctx.lineTo(side * half * 0.08, top + height * 0.42)
    ctx.lineTo(side * half * 0.57, top + height * 0.48)
    ctx.closePath()
    ctx.fill()
  }
  ctx.globalCompositeOperation = 'screen'
  ctx.shadowColor = `rgba(225, 255, 248, ${eyePulse})`
  ctx.shadowBlur = width * 0.18
  ctx.fillStyle = `rgba(248, 255, 250, ${0.72 + eyePulse * 0.22})`
  for (const side of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(side * half * 0.61, top + height * 0.31)
    ctx.lineTo(side * half * 0.2, top + height * 0.28)
    ctx.lineTo(side * half * 0.16, top + height * 0.34)
    ctx.lineTo(side * half * 0.53, top + height * 0.39)
    ctx.closePath()
    ctx.fill()
  }
  ctx.globalCompositeOperation = 'source-over'
  ctx.shadowBlur = 0

  // Nose cavity and a separated lower jaw prevent the old single-band mouth.
  ctx.fillStyle = '#030408'
  ctx.beginPath()
  ctx.moveTo(-half * 0.1, top + height * 0.37)
  ctx.lineTo(half * 0.1, top + height * 0.37)
  ctx.lineTo(half * 0.2, top + height * 0.58)
  ctx.lineTo(0, top + height * 0.66)
  ctx.lineTo(-half * 0.2, top + height * 0.58)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#080a0e'
  ctx.strokeStyle = 'rgba(185, 194, 193, .62)'
  ctx.lineWidth = Math.max(0.8, width * 0.018)
  ctx.beginPath()
  ctx.moveTo(-half * 0.6, top + height * 0.66)
  ctx.quadraticCurveTo(0, top + height * 0.78, half * 0.6, top + height * 0.66)
  ctx.lineTo(half * 0.43, bottom * 0.82)
  ctx.quadraticCurveTo(0, bottom, -half * 0.43, bottom * 0.82)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.strokeStyle = 'rgba(205, 213, 209, .66)'
  ctx.lineWidth = Math.max(0.7, width * 0.012)
  ctx.beginPath()
  ctx.moveTo(-half * 0.48, top + height * 0.7)
  ctx.quadraticCurveTo(0, top + height * 0.84, half * 0.48, top + height * 0.7)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(236, 241, 235, .28)'
  ctx.lineWidth = Math.max(0.7, width * 0.01)
  ctx.beginPath()
  ctx.moveTo(-half * 0.34, bottom * 0.82)
  ctx.lineTo(-half * 0.2, bottom * 0.94)
  ctx.moveTo(half * 0.34, bottom * 0.82)
  ctx.lineTo(half * 0.2, bottom * 0.94)
  ctx.stroke()
  for (let tooth = 0; tooth < 6; tooth += 1) {
    const tx = -half * 0.38 + tooth * half * 0.15
    const toothHeight = height * (0.1 + ((tooth + variant) % 3) * 0.02)
    ctx.fillStyle = tooth % 2 === 0 ? 'rgba(221, 229, 223, .86)' : 'rgba(147, 157, 158, .72)'
    ctx.beginPath()
    ctx.moveTo(tx, top + height * 0.7)
    ctx.lineTo(tx + half * 0.09, top + height * 0.7)
    ctx.lineTo(tx + half * 0.06, top + height * 0.7 + toothHeight)
    ctx.lineTo(tx + half * 0.02, top + height * 0.7 + toothHeight * 0.78)
    ctx.closePath()
    ctx.fill()
  }

  // Small square chips make the edges feel carved instead of computer-perfect.
  ctx.fillStyle = 'rgba(217, 225, 220, .58)'
  const chip = Math.max(1.2, width * 0.025)
  for (const [cx, cy, scale] of [[-0.72, -0.12, 1], [0.69, 0.03, .75], [-0.45, .42, .7], [0.42, -.36, .58]] as const) {
    ctx.fillRect(half * cx, height * cy, chip * scale, chip * (scale * 0.75))
  }
  ctx.strokeStyle = 'rgba(8, 10, 14, .8)'
  ctx.lineWidth = Math.max(0.7, width * 0.01)
  ctx.beginPath()
  ctx.moveTo(-half * 0.32, top + height * 0.05)
  ctx.lineTo(-half * 0.38, top + height * 0.18)
  ctx.lineTo(-half * 0.3, top + height * 0.25)
  ctx.moveTo(half * 0.27, top + height * 0.08)
  ctx.lineTo(half * 0.2, top + height * 0.2)
  ctx.stroke()
  ctx.restore()
}

const drawWitherStatue = (ctx: CanvasRenderingContext2D, x: number, baseY: number, size: number, t: number, active: boolean) => {
  if (!active) return
  const eyePulse = 0.72 + Math.sin(t * 4.8) * 0.16 + Math.sin(t * 8.1) * 0.035
  const bob = Math.sin(t * 2.1) * size * 0.022
  const sway = Math.sin(t * 1.27 + 0.6) * size * 0.014
  ctx.save()
  ctx.translate(x + sway, baseY + bob)
  ctx.rotate(Math.sin(t * 1.27 + 0.6) * 0.012)

  // The suspended torso sits behind the heads, with a distinct shoulder span and a tapered rib cage.
  ctx.save()
  ctx.shadowColor = 'rgba(0, 0, 0, .95)'
  ctx.shadowBlur = size * 0.16
  ctx.fillStyle = '#070a0f'
  ctx.strokeStyle = 'rgba(147, 157, 161, .72)'
  ctx.lineWidth = Math.max(1.2, size * 0.018)
  ctx.beginPath()
  ctx.moveTo(-size * 0.18, -size * 0.61)
  ctx.lineTo(-size * 0.46, -size * 0.56)
  ctx.lineTo(-size * 0.55, -size * 0.38)
  ctx.lineTo(-size * 0.31, -size * 0.2)
  ctx.lineTo(-size * 0.22, size * 0.02)
  ctx.lineTo(size * 0.22, size * 0.02)
  ctx.lineTo(size * 0.31, -size * 0.2)
  ctx.lineTo(size * 0.55, -size * 0.38)
  ctx.lineTo(size * 0.46, -size * 0.56)
  ctx.lineTo(size * 0.18, -size * 0.61)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.restore()

  // Broken shoulder and arm bones give the statue a full silhouette in front of the portal.
  ctx.strokeStyle = '#030408'
  ctx.lineWidth = Math.max(3, size * 0.06)
  for (const side of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(side * size * 0.27, -size * 0.47)
    ctx.quadraticCurveTo(side * size * 0.58, -size * 0.34, side * size * 0.72, -size * 0.03)
    ctx.lineTo(side * size * 0.63, size * 0.07)
    ctx.stroke()
    ctx.fillStyle = '#11151b'
    ctx.strokeStyle = 'rgba(161, 170, 171, .65)'
    ctx.lineWidth = Math.max(1, size * 0.014)
    ctx.beginPath()
    ctx.arc(side * size * 0.72, -size * 0.02, size * 0.075, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }

  // Sternum, vertebrae and five ribs read as a body rather than a floating blob.
  ctx.strokeStyle = 'rgba(190, 199, 198, .82)'
  ctx.lineWidth = Math.max(1, size * 0.019)
  for (const offset of [-0.29, 0, 0.29]) {
    ctx.beginPath()
    ctx.moveTo(size * offset, -size * 0.63)
    ctx.lineTo(size * offset, -size * 0.48)
    ctx.stroke()
  }
  ctx.beginPath()
  ctx.moveTo(0, -size * 0.48)
  ctx.lineTo(0, size * 0.02)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(0, -size * 0.52)
  ctx.quadraticCurveTo(-size * 0.22, -size * 0.48, -size * 0.43, -size * 0.37)
  ctx.moveTo(0, -size * 0.52)
  ctx.quadraticCurveTo(size * 0.22, -size * 0.48, size * 0.43, -size * 0.37)
  ctx.stroke()
  for (let rib = 0; rib < 5; rib += 1) {
    const y = -size * (0.4 - rib * 0.095)
    const span = size * (0.2 - rib * 0.018)
    ctx.beginPath()
    ctx.moveTo(-span * 0.22, y)
    ctx.quadraticCurveTo(-span, y + size * 0.07, -span * 0.9, y + size * 0.13)
    ctx.moveTo(span * 0.22, y)
    ctx.quadraticCurveTo(span, y + size * 0.07, span * 0.9, y + size * 0.13)
    ctx.stroke()
    ctx.strokeStyle = 'rgba(93, 105, 109, .76)'
    ctx.lineWidth = Math.max(0.7, size * 0.009)
    ctx.beginPath()
    ctx.moveTo(-span * 0.2, y + size * 0.025)
    ctx.quadraticCurveTo(-span * 0.82, y + size * 0.095, -span * 0.76, y + size * 0.13)
    ctx.moveTo(span * 0.2, y + size * 0.025)
    ctx.quadraticCurveTo(span * 0.82, y + size * 0.095, span * 0.76, y + size * 0.13)
    ctx.stroke()
    ctx.strokeStyle = 'rgba(190, 199, 198, .82)'
    ctx.lineWidth = Math.max(1, size * 0.019)
  }
  ctx.fillStyle = 'rgba(197, 207, 205, .66)'
  for (let vertebra = 0; vertebra < 5; vertebra += 1) {
    const vy = -size * (0.43 - vertebra * 0.1)
    ctx.fillRect(-size * 0.028, vy, size * 0.056, size * 0.04)
  }

  // Tattered lower wisps and a few bright bone shards anchor the otherwise suspended figure.
  ctx.strokeStyle = '#020306'
  ctx.lineWidth = Math.max(1.6, size * 0.032)
  for (const side of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(side * size * 0.17, -size * 0.02)
    ctx.quadraticCurveTo(side * size * 0.25, size * 0.16, side * size * 0.12, size * 0.28)
    ctx.quadraticCurveTo(side * size * 0.29, size * 0.18, side * size * 0.35, size * 0.08)
    ctx.stroke()
  }
  ctx.fillStyle = 'rgba(201, 211, 208, .64)'
  for (const [sx, sy, sw, sh] of [[-0.48, -0.5, .07, .025], [0.43, -0.45, .05, .02], [-0.3, -0.03, .04, .06], [0.27, -0.12, .035, .05]] as const) {
    ctx.fillRect(size * sx, size * sy, size * sw, size * sh)
  }

  const headWidth = size * 0.28
  const headHeight = size * 0.32
  const headY = -size * 0.75
  for (const [index, offset] of [-1, 0, 1].entries()) {
    const nod = Math.sin(t * 1.7 + index * 1.6) * size * 0.012
    drawSkullHead(ctx, offset * size * 0.29, headY + (index === 1 ? -size * 0.018 : size * 0.012) + nod, headWidth, headHeight, eyePulse, index)
  }
  ctx.restore()
}

const drawRelicEntrance = (ctx: CanvasRenderingContext2D, x: number, baseY: number, width: number, height: number, t: number, active: boolean) => {
  if (!active) return
  const half = width / 2
  const top = baseY - height
  const shoulder = top + height * 0.28
  ctx.save()
  ctx.shadowColor = 'rgba(0, 0, 0, .9)'
  ctx.shadowBlur = width * 0.18
  ctx.fillStyle = '#05060a'
  ctx.strokeStyle = 'rgba(182, 151, 103, .76)'
  ctx.lineWidth = Math.max(2, width * 0.026)
  ctx.beginPath()
  ctx.moveTo(x - half, baseY)
  ctx.lineTo(x - half, shoulder)
  ctx.quadraticCurveTo(x - half * 0.76, top + height * 0.08, x, top)
  ctx.quadraticCurveTo(x + half * 0.76, top + height * 0.08, x + half, shoulder)
  ctx.lineTo(x + half, baseY)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.shadowBlur = 0

  const inner = ctx.createRadialGradient(x, top + height * 0.38, 0, x, top + height * 0.38, width * 0.66)
  inner.addColorStop(0, `rgba(188, 83, 125, ${0.22 + Math.sin(t * 3.2) * 0.05})`)
  inner.addColorStop(0.5, 'rgba(82, 31, 61, .13)')
  inner.addColorStop(1, 'rgba(8, 7, 13, 0)')
  ctx.fillStyle = inner
  ctx.fillRect(x - half * 0.86, top + height * 0.1, width * 0.86, height * 0.9)

  // Layered archivolts and a pointed finial make the opening read as a Gothic portal.
  for (let ring = 0; ring < 3; ring += 1) {
    const inset = width * (0.07 + ring * 0.06)
    ctx.strokeStyle = `rgba(184, 153, 105, ${0.68 - ring * 0.14})`
    ctx.lineWidth = Math.max(1, width * (0.018 - ring * 0.003))
    ctx.beginPath()
    ctx.moveTo(x - half + inset, baseY)
    ctx.lineTo(x - half + inset, shoulder + height * 0.02)
    ctx.quadraticCurveTo(x - half * 0.7, top + height * (0.12 + ring * 0.015), x, top + height * ring * 0.018)
    ctx.quadraticCurveTo(x + half * 0.7, top + height * (0.12 + ring * 0.015), x + half - inset, shoulder + height * 0.02)
    ctx.lineTo(x + half - inset, baseY)
    ctx.stroke()
  }
  ctx.fillStyle = 'rgba(208, 173, 117, .75)'
  ctx.beginPath()
  ctx.moveTo(x, top - height * 0.12)
  ctx.lineTo(x - width * 0.035, top + height * 0.02)
  ctx.lineTo(x + width * 0.035, top + height * 0.02)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(221, 187, 127, .58)'
  ctx.lineWidth = Math.max(1, width * 0.012)
  ctx.beginPath()
  ctx.moveTo(x - half * 0.42, baseY - height * 0.08)
  ctx.lineTo(x + half * 0.42, baseY - height * 0.08)
  ctx.stroke()
  ctx.restore()
  const statueSize = width < 240 ? width * 1.2 : width * 0.72
  drawWitherStatue(ctx, x, baseY + height * 0.06, statueSize, t, active)
}

const drawUncannyEffects = (ctx: CanvasRenderingContext2D, width: number, height: number, t: number, active: boolean) => {
  if (!active) return
  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  ctx.globalAlpha = 0.18 + Math.sin(t * 8.2) * 0.04
  ctx.strokeStyle = '#bd4774'
  ctx.lineWidth = Math.max(1, width * 0.002)
  for (let ray = 0; ray < 15; ray += 1) {
    const y = height * (0.12 + ((ray * 0.137 + t * 0.025) % 0.78))
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y + Math.sin(t * 3 + ray) * height * 0.025)
    ctx.stroke()
  }
  ctx.fillStyle = `rgba(152, 36, 102, ${0.05 + Math.sin(t * 5.4) * 0.02})`
  ctx.fillRect(0, 0, width, height)
  ctx.restore()
}

const drawClockTower = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  cameraX: number,
  reducedMotion: boolean,
  options: DrawOptions,
) => {
  const t = reducedMotion ? 0 : time / 1000
  const { crazyActive, sen, bellPulseAt, lampsActive, gearPulseAt, gearPulseSeed } = options
  const spread = sen === 0 ? 1 : crazyActive ? 0.06 : 0
  const ringing = bellPulseAt > 0 ? t - bellPulseAt : -1
  ctx.clearRect(0, 0, width, height)
  drawWall(ctx, width, height, cameraX)
  ctx.save()
  ctx.translate(-cameraX, 0)
  const worldLeft = -width * 0.48
  const worldRight = width * 1.82
  ctx.fillStyle = 'rgba(4, 7, 11, .52)'
  ctx.fillRect(worldLeft, height * 0.12, worldRight - worldLeft, height * 0.67)

  // Recessed transmission shafts and pipe banks.
  ctx.save()
  ctx.translate(cameraX * 0.28, 0)
  const farPipes: PipeSpec[] = [
    { points: [[-width * 0.3, height * 0.12], [-width * 0.3, height * 0.79]], radius: width * 0.009, depth: 0.25, hue: 210 },
    { points: [[width * 0.08, height * 0.1], [width * 0.08, height * 0.54], [width * 0.2, height * 0.66], [width * 0.2, height * 0.81]], radius: width * 0.012, depth: 0.24, hue: 194 },
    { points: [[width * 0.46, height * 0.08], [width * 0.46, height * 0.76]], radius: width * 0.008, depth: 0.2, hue: 205 },
    { points: [[width * 0.95, height * 0.08], [width * 0.95, height * 0.44], [width * 0.81, height * 0.59], [width * 0.81, height * 0.81]], radius: width * 0.011, depth: 0.26, hue: 187 },
    { points: [[width * 1.33, height * 0.12], [width * 1.33, height * 0.79]], radius: width * 0.008, depth: 0.22, hue: 205 },
  ]
  farPipes.forEach((pipe) => drawPipe(ctx, pipe))
  ctx.restore()

  ctx.save()
  ctx.translate(cameraX * 0.36, 0)
  const farGears: GearSpec[] = [
    { x: -width * 0.23, y: height * 0.31, radius: width * 0.105, teeth: 20, speed: 0.42, phase: 0.4, depth: 0.24, hue: 205 },
    { x: width * 0.12, y: height * 0.34, radius: width * 0.07, teeth: 16, speed: -0.58, phase: 1.8, depth: 0.22, hue: 188 },
    { x: width * 0.34, y: height * 0.23, radius: width * 0.12, teeth: 22, speed: 0.3, phase: 0.8, depth: 0.28, hue: 218 },
    { x: width * 0.67, y: height * 0.32, radius: width * 0.085, teeth: 18, speed: -0.49, phase: 2.2, depth: 0.23, hue: 194 },
    { x: width * 0.96, y: height * 0.24, radius: width * 0.14, teeth: 24, speed: 0.25, phase: 1.1, depth: 0.3, hue: 211 },
    { x: width * 1.31, y: height * 0.35, radius: width * 0.09, teeth: 18, speed: -0.38, phase: 2.4, depth: 0.22, hue: 188 },
    { x: width * 1.58, y: height * 0.22, radius: width * 0.12, teeth: 22, speed: 0.36, phase: 0.7, depth: 0.25, hue: 210 },
  ]
  farGears.forEach((gear) => drawGear(ctx, gear, t, crazyActive, spread, width * 0.73, gearPulseAt, gearPulseSeed))
  ctx.restore()

  ctx.save()
  ctx.translate(cameraX * 0.48, 0)
  drawBell(ctx, width * 0.18, height * 0.2, width * 0.085, t, ringing)
  ctx.restore()

  // Mid-depth gantries create an interlocking second mechanical plane.
  ctx.save()
  ctx.translate(cameraX * 0.55, 0)
  const midPipes: PipeSpec[] = [
    { points: [[-width * 0.08, height * 0.13], [-width * 0.08, height * 0.73], [width * 0.08, height * 0.73]], radius: width * 0.016, depth: 0.5, hue: 31 },
    { points: [[width * 0.4, height * 0.13], [width * 0.4, height * 0.66], [width * 0.58, height * 0.79]], radius: width * 0.018, depth: 0.56, hue: 23 },
    { points: [[width * 0.78, height * 0.11], [width * 0.78, height * 0.74]], radius: width * 0.014, depth: 0.46, hue: 34 },
    { points: [[width * 1.22, height * 0.14], [width * 1.22, height * 0.67], [width * 1.07, height * 0.79]], radius: width * 0.018, depth: 0.55, hue: 25 },
  ]
  midPipes.forEach((pipe) => drawPipe(ctx, pipe))
  const midGears: GearSpec[] = [
    { x: width * 0.02, y: height * 0.46, radius: width * 0.15, teeth: 24, speed: -0.3, phase: 0.5, depth: 0.56, hue: 29 },
    { x: width * 0.3, y: height * 0.58, radius: width * 0.085, teeth: 18, speed: 0.72, phase: 2.1, depth: 0.5, hue: 39 },
    { x: width * 0.56, y: height * 0.38, radius: width * 0.18, teeth: 28, speed: 0.2, phase: 1.6, depth: 0.58, hue: 27 },
    { x: width * 0.91, y: height * 0.5, radius: width * 0.11, teeth: 20, speed: -0.62, phase: 0.8, depth: 0.52, hue: 42 },
    { x: width * 1.18, y: height * 0.35, radius: width * 0.16, teeth: 24, speed: 0.34, phase: 2.7, depth: 0.55, hue: 25 },
    { x: width * 1.49, y: height * 0.54, radius: width * 0.105, teeth: 18, speed: -0.54, phase: 1.1, depth: 0.48, hue: 37 },
  ]
  midGears.forEach((gear) => drawGear(ctx, gear, t, crazyActive, spread, width * 0.73, gearPulseAt, gearPulseSeed))
  ctx.restore()

  // Near machinery: heavy rails, crankshafts, and three large gear trains.
  ctx.save()
  ctx.translate(cameraX * 0.78, 0)
  const nearPipes: PipeSpec[] = [
    { points: [[width * 0.16, height * 0.08], [width * 0.16, height * 0.46], [width * 0.29, height * 0.6], [width * 0.29, height * 0.83]], radius: width * 0.024, depth: 0.86, hue: 28 },
    { points: [[width * 0.69, height * 0.09], [width * 0.69, height * 0.42], [width * 0.6, height * 0.54], [width * 0.6, height * 0.84]], radius: width * 0.022, depth: 0.78, hue: 22 },
    { points: [[width * 1.04, height * 0.1], [width * 1.04, height * 0.76]], radius: width * 0.026, depth: 0.84, hue: 31 },
    { points: [[width * 1.39, height * 0.1], [width * 1.39, height * 0.46], [width * 1.29, height * 0.58], [width * 1.29, height * 0.83]], radius: width * 0.02, depth: 0.75, hue: 24 },
  ]
  nearPipes.forEach((pipe) => drawPipe(ctx, pipe))
  const nearGears: GearSpec[] = [
    { x: -width * 0.12, y: height * 0.61, radius: width * 0.19, teeth: 28, speed: 0.17, phase: 2.2, depth: 0.9, hue: 35 },
    { x: width * 0.26, y: height * 0.31, radius: width * 0.12, teeth: 22, speed: -0.54, phase: 0.4, depth: 0.86, hue: 26 },
    { x: width * 0.53, y: height * 0.66, radius: width * 0.23, teeth: 32, speed: 0.13, phase: 1.5, depth: 0.92, hue: 40 },
    { x: width * 0.83, y: height * 0.29, radius: width * 0.14, teeth: 24, speed: -0.48, phase: 2.8, depth: 0.84, hue: 27 },
    { x: width * 1.11, y: height * 0.63, radius: width * 0.2, teeth: 30, speed: 0.2, phase: 0.2, depth: 0.9, hue: 34 },
    { x: width * 1.42, y: height * 0.3, radius: width * 0.12, teeth: 22, speed: -0.58, phase: 1.8, depth: 0.82, hue: 25 },
  ]
  nearGears.forEach((gear) => drawGear(ctx, gear, t, crazyActive, spread, width * 0.73, gearPulseAt, gearPulseSeed))
  ctx.strokeStyle = 'rgba(207, 171, 113, .42)'
  ctx.lineWidth = Math.max(2, width * 0.003)
  for (const shaft of [0.1, 0.49, 0.98, 1.34]) {
    const shaftX = width * shaft
    const bob = reducedMotion ? 0 : Math.sin(t * 2.2 + shaft * 5) * height * 0.018
    ctx.beginPath()
    ctx.moveTo(shaftX, height * 0.2 + bob)
    ctx.lineTo(shaftX, height * 0.82 + bob)
    ctx.stroke()
    ctx.fillStyle = '#886642'
    ctx.beginPath()
    ctx.arc(shaftX, height * 0.47 + bob, Math.max(2, width * 0.006), 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()

  // Standing lamp columns are part of the room architecture, not floating overlays.
  ctx.save()
  ctx.translate(cameraX * 0.68, 0)
  drawLampPost(ctx, width * 0.12, height * 0.88, width * 0.052, t, lampsActive)
  drawLampPost(ctx, width * 0.88, height * 0.88, width * 0.052, t, lampsActive)
  ctx.restore()

  ctx.save()
  ctx.translate(cameraX * 0.9, 0)
  ctx.fillStyle = '#111116'
  ctx.fillRect(worldLeft, height * 0.82, worldRight - worldLeft, height * 0.2)
  ctx.strokeStyle = 'rgba(187, 143, 91, .3)'
  ctx.lineWidth = Math.max(1, width * 0.0014)
  for (let rail = 0; rail < 4; rail += 1) {
    const y = height * (0.83 + rail * 0.045)
    ctx.beginPath()
    ctx.moveTo(worldLeft, y)
    ctx.lineTo(worldRight, y + height * 0.008)
    ctx.stroke()
  }
  ctx.restore()
  ctx.restore()

  // The switch changes the exposure of the whole room, not just the lamp pixels.
  ctx.save()
  if (lampsActive) {
    ctx.globalCompositeOperation = 'screen'
    for (const lampX of [width * 0.16 - cameraX * 0.68, width * 0.84 - cameraX * 0.68]) {
      const roomGlow = ctx.createRadialGradient(lampX, height * 0.42, 0, lampX, height * 0.42, width * 0.62)
      roomGlow.addColorStop(0, 'rgba(244, 167, 86, .2)')
      roomGlow.addColorStop(0.35, 'rgba(177, 82, 49, .08)')
      roomGlow.addColorStop(1, 'rgba(55, 28, 28, 0)')
      ctx.fillStyle = roomGlow
      ctx.fillRect(lampX - width * 0.62, 0, width * 1.24, height)
    }
  } else {
    ctx.fillStyle = 'rgba(2, 3, 9, .48)'
    ctx.fillRect(0, 0, width, height)
    ctx.globalCompositeOperation = 'screen'
    const emergency = ctx.createLinearGradient(0, height * 0.2, width, height * 0.8)
    emergency.addColorStop(0, 'rgba(42, 55, 82, .08)')
    emergency.addColorStop(.5, 'rgba(34, 37, 61, .16)')
    emergency.addColorStop(1, 'rgba(20, 17, 33, .04)')
    ctx.fillStyle = emergency
    ctx.fillRect(0, 0, width, height)
  }
  ctx.restore()

  // The breach is a foreground reveal: its portal and eyes remain readable even in emergency darkness.
  ctx.save()
  ctx.translate(cameraX * 0.62, 0)
  drawRelicEntrance(ctx, width * 0.73, height * 0.85, width * 0.32, height * 0.58, t, sen === 0)
  ctx.restore()

  drawUncannyEffects(ctx, width, height, t, sen === 0 && crazyActive)

  const vignette = ctx.createRadialGradient(width * 0.5, height * 0.48, Math.min(width, height) * 0.2, width * 0.5, height * 0.48, Math.max(width, height) * 0.78)
  vignette.addColorStop(0, 'rgba(1, 2, 5, 0)')
  vignette.addColorStop(1, 'rgba(1, 2, 5, .66)')
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, width, height)
}

export default function ClockTowerScene({ reducedMotion = false, effectsEnabled = true }: ClockTowerSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const [lampsActive, setLampsActive] = useState(true)
  const [crazyActive, setCrazyActive] = useState(false)
  const [sen, setSen] = useState(3)
  const [bellPulse, setBellPulse] = useState(0)
  const [timezone, setTimezone] = useState<string | null>(null)
  const [keyboardOpen, setKeyboardOpen] = useState(false)
  const [gearPulse, setGearPulse] = useState(0)
  const frameRef = useRef<number | null>(null)
  const cameraPosition = useRef(0)
  const bellPulseAt = useRef(0)
  const gearPulseAt = useRef(-1)
  const gearPulseSeed = useRef(0)

  useEffect(() => {
    if (sen !== 0 || !crazyActive || !effectsEnabled) return undefined
    playUncannySound()
    const interval = window.setInterval(playUncannySound, 2400)
    return () => window.clearInterval(interval)
  }, [crazyActive, effectsEnabled, sen])

  useEffect(() => {
    if (!effectsEnabled) return undefined
    return startClocktowerAmbience()
  }, [effectsEnabled])

  useEffect(() => {
    const canvas = canvasRef.current
    const stage = stageRef.current
    if (!canvas || !stage) return undefined
    const ctx = canvas.getContext('2d')
    if (!ctx) return undefined
    let width = 1
    let height = 1
    let cameraX = cameraPosition.current
    let disposed = false
    let previousWidth = 0
    let previousHeight = 0
    let dragging = false
    let dragStartX = 0
    let dragStartCamera = 0

    const updateCamera = (next: number) => {
      cameraX = clamp(next, -width * 0.5, width * 0.55)
      cameraPosition.current = cameraX
      stage.style.setProperty('--clocktower-camera-x', `${cameraX}px`)
      drawClockTower(ctx, width, height, 0, cameraX, reducedMotion, { crazyActive, sen, bellPulseAt: bellPulseAt.current, lampsActive, gearPulseAt: gearPulseAt.current, gearPulseSeed: gearPulseSeed.current })
    }
    const resize = () => {
      const rect = stage.getBoundingClientRect()
      width = Math.max(1, rect.width)
      height = Math.max(1, rect.height)
      if (previousWidth > 0 && previousHeight > 0) {
        cameraX *= width / previousWidth
      }
      cameraX = clamp(cameraX, -width * 0.5, width * 0.55)
      cameraPosition.current = cameraX
      stage.style.setProperty('--clocktower-camera-x', `${cameraX}px`)
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      previousWidth = width
      previousHeight = height
      drawClockTower(ctx, width, height, 0, cameraX, reducedMotion, { crazyActive, sen, bellPulseAt: bellPulseAt.current, lampsActive, gearPulseAt: gearPulseAt.current, gearPulseSeed: gearPulseSeed.current })
    }
    const render = (time: number) => {
      if (disposed) return
      drawClockTower(ctx, width, height, time, cameraX, reducedMotion, { crazyActive, sen, bellPulseAt: bellPulseAt.current, lampsActive, gearPulseAt: gearPulseAt.current, gearPulseSeed: gearPulseSeed.current })
      if (!reducedMotion) frameRef.current = window.requestAnimationFrame(render)
    }
    const onPointerDown = (event: PointerEvent) => {
      if ((event.target as HTMLElement | null)?.closest('button')) return
      dragging = true
      dragStartX = event.clientX
      dragStartCamera = cameraX
      stage.classList.add('is-panning')
      stage.setPointerCapture?.(event.pointerId)
    }
    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) return
      updateCamera(dragStartCamera - (event.clientX - dragStartX))
    }
    const endPointer = (event: PointerEvent) => {
      if (!dragging) return
      dragging = false
      stage.classList.remove('is-panning')
      if (stage.hasPointerCapture?.(event.pointerId)) stage.releasePointerCapture(event.pointerId)
    }
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaX) < 1 && Math.abs(event.deltaY) < 1) return
      event.preventDefault()
      updateCamera(cameraX + (Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY * 0.72))
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
      if ((event.target as HTMLElement | null)?.closest('button, input, textarea, select')) return
      event.preventDefault()
      updateCamera(cameraX + (event.key === 'ArrowRight' ? width * 0.12 : -width * 0.12))
    }
    const observer = new ResizeObserver(resize)
    observer.observe(stage)
    stage.addEventListener('pointerdown', onPointerDown)
    stage.addEventListener('pointermove', onPointerMove)
    stage.addEventListener('pointerup', endPointer)
    stage.addEventListener('pointercancel', endPointer)
    stage.addEventListener('wheel', onWheel, { passive: false })
    stage.addEventListener('keydown', onKeyDown)
    resize()
    if (!reducedMotion) frameRef.current = window.requestAnimationFrame(render)
    return () => {
      disposed = true
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current)
      frameRef.current = null
      observer.disconnect()
      stage.removeEventListener('pointerdown', onPointerDown)
      stage.removeEventListener('pointermove', onPointerMove)
      stage.removeEventListener('pointerup', endPointer)
      stage.removeEventListener('pointercancel', endPointer)
      stage.removeEventListener('wheel', onWheel)
      stage.removeEventListener('keydown', onKeyDown)
      stage.classList.remove('is-panning')
      cameraPosition.current = cameraX
    }
  }, [bellPulse, crazyActive, gearPulse, lampsActive, reducedMotion, sen])

  const hotspotStyle = (left: string, top: string): CSSProperties => ({ left, top })
  const toggleLamps = useCallback(() => setLampsActive((previous) => !previous), [])
  const ringBell = useCallback(() => {
    bellPulseAt.current = performance.now() / 1000
    setBellPulse((previous) => previous + 1)
    if (effectsEnabled) playBellSound()
  }, [effectsEnabled])
  const ringTimezone = useCallback(() => {
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC')
    ringBell()
  }, [ringBell])
  const toggleCrazyGears = useCallback(() => {
    const nextSen = Math.max(0, sen - 1)
    setSen(nextSen)
    setCrazyActive((previous) => nextSen === 0 ? true : !previous)
    if (effectsEnabled) playUncannySound()
  }, [effectsEnabled, sen])
  const toggleKeyboard = useCallback(() => setKeyboardOpen((previous) => !previous), [])
  const closeKeyboard = useCallback(() => setKeyboardOpen(false), [])
  const enterSaintRelic = useCallback(() => { window.location.hash = '#/saint-relic' }, [])
  const triggerKeyboardNote = useCallback((frequency: number) => {
    gearPulseAt.current = performance.now() / 1000
    gearPulseSeed.current = Math.random() * 1000
    setGearPulse((previous) => previous + 1)
    if (effectsEnabled) playKeyboardNote(frequency)
  }, [effectsEnabled])

  return (
    <main className={`clocktower-scene ${crazyActive ? 'clocktower-scene--crazy' : ''} ${sen === 0 ? 'clocktower-scene--breach' : ''}`} data-scene="clocktower" data-lamps={lampsActive ? 'on' : 'off'} data-sen={sen} data-crazy={crazyActive ? 'on' : 'off'} data-relic={sen === 0 ? 'visible' : 'sealed'} data-bell-pulse={bellPulse} data-gear-pulse={gearPulse} data-timezone={timezone ?? ''} aria-labelledby="clocktower-title">
      <div className="clocktower-stage" ref={stageRef} tabIndex={0} aria-label="钟楼回响机械内室">
        <canvas ref={canvasRef} className="clocktower-canvas" role="img" aria-label="没有窗户的钟楼内室，充满齿轮、管道和金属传动结构" />
        <header className="clocktower-header">
          <p className="clocktower-kicker">第二展馆 <span>/</span> 机械祷告室</p>
          <h1 id="clocktower-title">钟楼回响</h1>
          <p className="clocktower-subtitle">THE CLOCKTOWER ECHO</p>
        </header>
        <nav className="clocktower-hotspots" aria-label="钟楼机械内室交互热点">
          <button
            type="button"
            className="clocktower-hotspot clocktower-hotspot--bell"
            style={hotspotStyle('15%', '40%')}
            aria-label="敲响钟铃"
            onClick={ringBell}
          >
            <BellRing aria-hidden="true" />
            <span>钟铃</span>
          </button>
          <button
            type="button"
            className="clocktower-hotspot clocktower-hotspot--timezone"
            style={hotspotStyle('15%', '53%')}
            aria-label="敲响我的时区"
            title={timezone ? `时区：${timezone}` : '敲响我的时区'}
            onClick={ringTimezone}
          >
            <BellRing aria-hidden="true" />
            <span>我的时区</span>
          </button>
          <button
            type="button"
            className={`clocktower-hotspot ${lampsActive ? 'is-active' : ''}`}
            style={hotspotStyle('16%', '72%')}
            aria-pressed={lampsActive}
            aria-label={lampsActive ? '关闭立式灯柱' : '打开立式灯柱'}
            onClick={toggleLamps}
          >
            <Lightbulb aria-hidden="true" />
            <span>{lampsActive ? '关灯柱' : '开灯柱'}</span>
          </button>
          <button
            type="button"
            className={`clocktower-hotspot clocktower-hotspot--crazy ${crazyActive ? 'is-active' : ''}`}
            style={hotspotStyle('33%', '72%')}
            aria-pressed={crazyActive}
            aria-label={`疯狂齿轮，SEN ${sen}`}
            onClick={toggleCrazyGears}
          >
            <Cog aria-hidden="true" />
            <span>疯狂齿轮 · SEN {sen}</span>
          </button>
          <button
            type="button"
            className={`clocktower-hotspot clocktower-hotspot--keyboard ${keyboardOpen ? 'is-active' : ''}`}
            style={hotspotStyle('48%', '84%')}
            aria-expanded={keyboardOpen}
            aria-controls="clocktower-keyboard"
            aria-label={keyboardOpen ? '关闭无间之钟键盘' : '打开无间之钟键盘'}
            onClick={toggleKeyboard}
          >
            {keyboardOpen ? <X aria-hidden="true" /> : <KeyboardMusic aria-hidden="true" />}
            <span>无间之钟</span>
          </button>
          {sen === 0 && (
            <button
              type="button"
              className="clocktower-hotspot clocktower-hotspot--relic"
              style={hotspotStyle('73%', '82%')}
              aria-label="进入圣遗物室"
              onClick={enterSaintRelic}
            >
              <DoorOpen aria-hidden="true" />
              <span>圣徒遗骨</span>
            </button>
          )}
        </nav>
        {keyboardOpen && (
          <section id="clocktower-keyboard" className="clocktower-keyboard" aria-label="无间之钟，两组八度键盘">
            <div className="clocktower-keyboard__header">
              <span>无间之钟</span>
              <div className="clocktower-keyboard__actions">
                <span className="clocktower-keyboard__range">C4 - B5</span>
                <button type="button" className="clocktower-keyboard__close" aria-label="关闭无间之钟键盘" onClick={closeKeyboard}>
                  <X aria-hidden="true" />
                </button>
              </div>
            </div>
            <div className="clocktower-keyboard__keys">
              {CLOCKTOWER_NOTES.map(([name, frequency, black]) => (
                <button
                  key={name}
                  type="button"
                  className={`clocktower-key ${black ? 'is-black' : 'is-white'}`}
                  aria-label={`${name} 音符`}
                  onClick={() => triggerKeyboardNote(frequency)}
                >
                  <span>{name.replace(/[0-9]/g, '')}</span>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
