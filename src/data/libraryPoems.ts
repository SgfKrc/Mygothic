export type LibraryPoem = {
  id: string
  text: string
  source: 'author'
}

/** Approved author copy for the first Rain Library release. */
export const libraryPoems: readonly LibraryPoem[] = [
  { id: 'loss', text: '凡有所得，必有失时。', source: 'author' },
  { id: 'flowers', text: '繁花艳丽，终或飘零。', source: 'author' },
  { id: 'wind', text: '剩下的事情，交给风。', source: 'author' },
]
