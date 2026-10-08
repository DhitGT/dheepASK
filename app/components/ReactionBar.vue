<script setup lang="ts">
import { normalizeAnswerReactions, type AnswerReactionStats } from '~/utils/answerReactions'
const props = defineProps<{ stats?: AnswerReactionStats; label: string; onReact: (emoji: string) => Promise<void> }>()
const stats = computed(() => normalizeAnswerReactions(props.stats))
const reactions = computed(() => Object.entries(stats.value.counts).filter(([, count]) => count > 0))
const pending = ref(false)
const error = ref('')
const picking = ref(false)
const addButton = ref<HTMLButtonElement>()
function closePicker(restoreFocus = true) {
  picking.value = false
  if (restoreFocus) nextTick(() => addButton.value?.focus())
}
async function react(emoji: string) {
  if (pending.value) return
  pending.value = true; error.value = ''
  try { await props.onReact(emoji) }
  catch { error.value = 'Reaksi belum tersimpan. Coba lagi.' }
  finally { pending.value = false }
}
function select(emoji: string) { closePicker(); void react(emoji) }
</script>
<template>
  <div class="mt-3 flex flex-wrap items-center gap-1.5" role="group" :aria-label="label" :aria-busy="pending">
    <button v-for="[emoji, count] in reactions" :key="emoji" type="button"
      class="answer-reaction" :class="{ selected: stats.mine.includes(emoji) }"
      :aria-label="'Reaksi ' + emoji + ', ' + count" :aria-pressed="stats.mine.includes(emoji)"
      :title="stats.mine.includes(emoji) ? 'Hapus reaksimu' : 'Tambahkan reaksi ini'"
      :disabled="pending" @click="react(emoji)">
      <span class="reaction-emoji" aria-hidden="true">{{ emoji }}</span><span>{{ count }}</span>
    </button>
    <button ref="addButton" type="button" class="add-reaction-button" aria-label="Tambah reaction"
      title="Tambah reaction" :aria-expanded="picking" aria-haspopup="dialog"
      :disabled="pending" @click="picking ? closePicker() : picking = true">
      <AskIcon name="reaction" :size="18" />
    </button>
  </div>
  <EmojiReactionPicker v-if="picking && addButton" :anchor="addButton" @select="select" @close="closePicker" />
  <p v-if="error" role="alert" class="mt-2 text-xs text-red-300">{{ error }}</p>
</template>
