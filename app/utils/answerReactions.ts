export interface AnswerReactionStats { counts: Record<string, number>; mine: string[] }

const legacyEmoji: Record<string, string> = {
  heart: '❤️', laugh: '😂', fire: '🔥', clap: '👏', wow: '🤯', love: '😍',
}

export function normalizeAnswerReactions(value?: { counts?: Record<string, number>; mine?: string | string[] | null }): AnswerReactionStats {
  const counts: Record<string, number> = {}
  for (const [key, count] of Object.entries(value?.counts || {})) {
    if (Number.isSafeInteger(count) && count > 0) {
      const emoji = legacyEmoji[key] || key
      counts[emoji] = (counts[emoji] || 0) + count
    }
  }
  const mine = Array.isArray(value?.mine) ? value.mine : value?.mine ? [value.mine] : []
  return { counts, mine: [...new Set(mine.map(key => legacyEmoji[key] || key))] }
}

export function isReactionEmoji(value: string): boolean {
  if (!value || [...value].length > 32) return false
  if ([...new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(value)].length !== 1) return false
  return /^(?:\p{Regional_Indicator}{2}|[0-9#*]\uFE0F?\u20E3|\p{Extended_Pictographic}[\p{Extended_Pictographic}\p{Emoji_Modifier}\uFE0E\uFE0F\u200D\u{E0020}-\u{E007F}]*)$/u.test(value)
}
