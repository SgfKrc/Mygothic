export type SceneId = 'cemetery' | 'library' | 'tarot' | 'clocktower' | 'saint-relic' | 'bone-garden' | 'rookery' | 'rose-ash' | 'gothic-orbit' | 'winter-bell' | 'unavailable'

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
  { id: 'tarot', label: '塔罗圣堂', hash: '#/tarot', available: true },
  { id: 'clocktower', label: '钟楼回响', hash: '#/clocktower', available: true },
  { id: 'saint-relic', label: '圣遗物室', hash: '#/saint-relic', available: true },
  { id: 'bone-garden', label: '骨园', hash: '#/bone-garden', available: true },
  { id: 'rookery', label: '鸦巢', hash: '#/rookery', available: true },
  { id: 'rose-ash', label: '玫瑰与灰烬', hash: '#/rose-ash', available: true },
  { id: 'gothic-orbit', label: '哥特式星座盘', hash: '#/gothic-orbit', available: true },
  { id: 'winter-bell', label: '冬之钟', hash: '#/winter-bell', available: true },
  { id: 'unavailable', label: '尚未开启的展馆', hash: '#/unavailable', available: false },
]
