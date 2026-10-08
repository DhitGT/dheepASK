export const SITE_REACTIONS = [
  { key: 'heart', emoji: '❤️', label: 'Suka', image: '/emoji/noto/heart.webp', staticImage: '/emoji/noto/heart.png' },
  { key: 'laugh', emoji: '😂', label: 'Lucu', image: '/emoji/noto/laugh.webp', staticImage: '/emoji/noto/laugh.png' },
  { key: 'fire', emoji: '🔥', label: 'Keren', image: '/emoji/noto/fire.webp', staticImage: '/emoji/noto/fire.png' },
  { key: 'clap', emoji: '👏', label: 'Apresiasi', image: '/emoji/noto/clap.webp', staticImage: '/emoji/noto/clap.png' },
  { key: 'wow', emoji: '🤯', label: 'Wow', image: '/emoji/noto/wow.webp', staticImage: '/emoji/noto/wow.png' },
  { key: 'love', emoji: '😍', label: 'Jatuh hati', image: '/emoji/noto/love.webp', staticImage: '/emoji/noto/love.png' },
] as const
export type ReactionKey = typeof SITE_REACTIONS[number]['key']
export interface SiteStats { hits: number; reactions: Record<ReactionKey, number> }
export function emptySiteStats(): SiteStats {
  return { hits: 0, reactions: { heart: 0, laugh: 0, fire: 0, clap: 0, wow: 0, love: 0 } }
}
