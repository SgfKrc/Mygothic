export type LibraryPoem = {
  id: string
  text: string
  /** 非引用句统一标记为“来自心底”；引用句（如爱伦·坡）另设标签并标注作品。 */
  source: 'fromHeart'
}

/** 雨夜图书馆·孤本文案池：3 条作者句 + 9 条已通过补写句（规范 9.4），共 12 条。 */
export const libraryPoems: readonly LibraryPoem[] = [
  { id: 'loss', text: '凡有所得，必有失时。', source: 'fromHeart' },
  { id: 'flowers', text: '繁花艳丽，终或飘零。', source: 'fromHeart' },
  { id: 'wind', text: '剩下的事情，交给风。', source: 'fromHeart' },
  { id: 'rain-stele', text: '夜雨蚀碑，名字成灰。', source: 'fromHeart' },
  { id: 'scrolls-night', text: '阅尽千卷，长夜如魇。', source: 'fromHeart' },
  { id: 'lamp-shadow', text: '青灯欲烬，影独未眠。', source: 'fromHeart' },
  { id: 'unopened-page', text: '未启之页，尘积独厚。', source: 'fromHeart' },
  { id: 'eaves-bell', text: '檐雨如泣，钟声已歇。', source: 'fromHeart' },
  { id: 'eternity', text: '所谓永恒，无非屡灭。', source: 'fromHeart' },
  { id: 'madness', text: '古痴今狂，终成空。', source: 'fromHeart' },
  { id: 'dream-dust', text: '千古风流，尽付梦里。', source: 'fromHeart' },
  { id: 'summer-grass', text: '夏草空萋萋。', source: 'fromHeart' },
]

/** Short library responses selected from the author's local copy deck. */
export const libraryPhrases: readonly string[] = [
  '凡诸形相，皆是虚妄。',
  '倏忽幻梦，炽烈痴狂。',
  '森罗万象，皆为虚无。',
  '不曾开放，不惧凋零。',
  '若历华彩，终拥虚无。',
  '所念之人不得遇，所期之事不得成，所想所念皆虚妄。',
  '战争，瘟疫，饥荒，死亡。',
  '所谓挣扎，即是宿命。宇宙的琴弦，宿命的回响。',
]

/** Portrait-specific lines are kept separate so the image has its own voice. */
export const portraitPhrases: readonly string[] = [
  '爱丽丝究竟在何方？',
  '谁是爱丽丝？哪个爱丽丝？',
  '致蠕行潜伏的少女们',
  '前方，轮回是有效的。',
  '命运的气息。',
  '找到你了。',
  '原谅我，这是最后一次。',
]

export const libraryDoorPhrase = '不知为何握不住门把手'
