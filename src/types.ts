export type SceneId = 'cemetery' | 'library' | 'clocktower' | 'saint-relic' | 'unavailable'

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
  { id: 'library', label: '图书馆之梦', hash: '#/library', available: true },
  { id: 'clocktower', label: '钟楼回响', hash: '#/clocktower', available: true },
  { id: 'saint-relic', label: '圣遗物室', hash: '#/saint-relic', available: true },
  { id: 'unavailable', label: '尚未开启的展馆', hash: '#/unavailable', available: false },
]
