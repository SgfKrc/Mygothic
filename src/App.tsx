import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Accessibility, ArrowLeft, VolumeX, Waves } from 'lucide-react'
import CemeteryScene from './components/CemeteryScene'
import ClockTowerScene from './components/ClockTowerScene'
import RainLibrary, { type RainLibraryCue } from './components/RainLibrary'
import SaintRelicScene from './components/SaintRelicScene'
import { SCENE_ROUTES, type AudioState, type SceneId } from './types'

const getSceneFromHash = (): SceneId => {
  const route = window.location.hash.replace(/^#\/?/, '').split('/')[0]
  if (route === 'library') return 'library'
  if (route === 'clocktower') return 'clocktower'
  if (route === 'saint-relic') return 'saint-relic'
  if (route === 'unavailable') return 'unavailable'
  return 'cemetery'
}

const announce = (message: string) => {
  window.dispatchEvent(new CustomEvent('gothic:announce', { detail: message }))
}

function AudioControls({ audio, onChange }: { audio: AudioState; onChange: (next: AudioState) => void }) {
  const toggle = (key: keyof AudioState, label: string) => {
    const next = { ...audio, [key]: !audio[key] }
    onChange(next)
    announce(`${label}${next[key] ? '已开启' : '已关闭'}`)
  }

  return (
    <div className="hud__audio" aria-label="声音设置">
      <button className="icon-button" type="button" aria-disabled="true" aria-label="背景音乐等待个人音轨接入" title="背景音乐等待个人音轨接入" onClick={() => announce('背景音乐等待个人音轨接入')}>
        <VolumeX aria-hidden="true" />
      </button>
      <button className="icon-button" type="button" aria-pressed={audio.effectsEnabled} aria-label={audio.effectsEnabled ? '关闭环境音效' : '开启环境音效'} title={audio.effectsEnabled ? '关闭环境音效' : '开启环境音效'} onClick={() => toggle('effectsEnabled', '环境音效')}>
        <Waves aria-hidden="true" />
      </button>
    </div>
  )
}

function playCue(cue: RainLibraryCue, enabled: boolean) {
  if (!enabled || typeof window === 'undefined') return
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextClass) return
  const context = new AudioContextClass()
  const gain = context.createGain()
  const oscillator = context.createOscillator()
  const now = context.currentTime
  const frequency = cue === 'fire' ? 118 : cue === 'book' ? 196 : 74
  oscillator.type = cue === 'book' ? 'triangle' : 'sine'
  oscillator.frequency.setValueAtTime(frequency, now)
  oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.72, now + 0.42)
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(cue === 'book' ? 0.035 : 0.06, now + 0.03)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.52)
  oscillator.connect(gain).connect(context.destination)
  oscillator.start(now)
  oscillator.stop(now + 0.56)
  window.setTimeout(() => void context.close(), 700)
}

function UnavailableScene() {
  return (
    <main className="scene scene--unavailable" data-scene="unavailable" aria-labelledby="scene-title">
      <div className="scene__content">
        <p className="scene__eyebrow">利德尔墓地 · 封存入口</p>
        <h1 id="scene-title">此处尚未开放</h1>
        <p className="scene__hint">这段回声还在等待合适的季节。</p>
        <p className="scene__quote">森罗万象，皆为虚无。</p>
      </div>
    </main>
  )
}

export default function App() {
  const [scene, setScene] = useState<SceneId>(() => getSceneFromHash())
  const [audio, setAudio] = useState<AudioState>({ bgmEnabled: false, effectsEnabled: true })
  const [reducedMotion, setReducedMotion] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const audioRef = useRef(audio)

  useEffect(() => { audioRef.current = audio }, [audio])

  useEffect(() => {
    const onHashChange = () => setScene(getSceneFromHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(media.matches)
    update()
    media.addEventListener?.('change', update)
    return () => media.removeEventListener?.('change', update)
  }, [])

  useEffect(() => {
    const onAnnounce = (event: Event) => setAnnouncement((event as CustomEvent<string>).detail)
    window.addEventListener('gothic:announce', onAnnounce)
    return () => window.removeEventListener('gothic:announce', onAnnounce)
  }, [])

  useEffect(() => { document.documentElement.dataset.motion = reducedMotion ? 'reduced' : 'full' }, [reducedMotion])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && scene !== 'cemetery') window.location.hash = '#/cemetery'
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [scene])

  const currentRoute = useMemo(() => SCENE_ROUTES.find((route) => route.id === scene) ?? SCENE_ROUTES[0], [scene])
  const goToCemetery = useCallback(() => { window.location.hash = '#/cemetery' }, [])
  const onAmbientCue = useCallback((cue: RainLibraryCue) => playCue(cue, audioRef.current.effectsEnabled), [])

  return (
    <div className="app-shell">
      {scene === 'cemetery' && <CemeteryScene reducedMotion={reducedMotion} />}
      {scene === 'library' && <RainLibrary reducedMotion={reducedMotion} effectsEnabled={audio.effectsEnabled} onAmbientCue={onAmbientCue} />}
      {scene === 'clocktower' && <ClockTowerScene reducedMotion={reducedMotion} effectsEnabled={audio.effectsEnabled} />}
      {scene === 'saint-relic' && <SaintRelicScene reducedMotion={reducedMotion} />}
      {scene === 'unavailable' && <UnavailableScene />}
      <header className="hud" aria-label="场景导航">
        <div className="hud__location" aria-live="polite"><span className="hud__kicker">当前位置</span><strong>{currentRoute.label}</strong></div>
        <div className="hud__actions">
          {scene !== 'cemetery' && <button className="text-button" type="button" onClick={goToCemetery}><ArrowLeft aria-hidden="true" />返回墓地</button>}
          <button className="icon-button" type="button" aria-pressed={reducedMotion} aria-label={reducedMotion ? '启用动态效果' : '减少动态效果'} title={reducedMotion ? '启用动态效果' : '减少动态效果'} onClick={() => { setReducedMotion((value) => !value); announce(reducedMotion ? '动态效果已启用' : '动态效果已减少') }}><Accessibility aria-hidden="true" /></button>
          <AudioControls audio={audio} onChange={setAudio} />
        </div>
      </header>
      <div className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</div>
    </div>
  )
}
