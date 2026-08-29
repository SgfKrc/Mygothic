export type SceneId = 'cemetery' | 'library' | 'unavailable'

export type SceneRoute = {
  id: SceneId
  label: string
  hash: string
  available: boolean
}

export type AudioState = {
  bgmEnabled: boolean
  effectsEnabled: boolean
}

export const SCENE_ROUTES: readonly SceneRoute[] = [
  { id: 'cemetery', label: '利德尔墓地', hash: '#/cemetery', available: true },
  { id: 'library', label: '雨夜图书馆', hash: '#/library', available: true },
  { id: 'unavailable', label: '尚未开启的展馆', hash: '#/unavailable', available: false },
]
