<script setup lang="ts">
import type { Question } from '~/types'
const props = defineProps<{ question: Question; roomCode?: string }>()
const expanded = ref(false)
const opened = ref(false)
watch(expanded, value => { if (value) opened.value = true })
const link = computed(() => props.roomCode ? `/r/${props.roomCode}/${props.question.short_code}` : `/${props.question.short_code}`)
const shareUrl = ref('')
const copied = ref(false)
const copyError = ref('')
let copyTimer: ReturnType<typeof setTimeout> | undefined
onBeforeUnmount(() => clearTimeout(copyTimer))
async function share() {
  shareUrl.value = `${window.location.origin}${link.value}`
  copyError.value = ''
  copied.value = false
  clearTimeout(copyTimer)
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    copied.value = true
    copyTimer = setTimeout(() => copied.value = false, 2500)
  } catch { copyError.value = 'Pilih lalu salin tautan di bawah secara manual.' }
}
const { bookmarks, toggleBookmark } = useAsk()
const relativeTime = computed(() => {
  const hours = Math.max(0, Math.floor((Date.now() - new Date(props.question.created_at).getTime()) / 3600000))
  return hours < 1 ? 'Baru saja' : hours < 24 ? `${hours} jam lalu` : `${Math.floor(hours / 24)} hari lalu`
})
</script>
<template>
  <article class="question-card">
    <div class="flex items-center justify-between gap-3"><div class="flex items-center gap-3"><div class="anon-avatar"><AskIcon name="message" :size="18" /></div><div><span class="text-[13px] font-semibold">{{ question.anon_name || 'Seseorang anonim' }}</span><p class="mt-0.5 text-[11px] text-muted">{{ relativeTime }}</p></div></div><span class="category-tag" :data-category="question.category">{{ question.category }}</span></div>
    <button type="button" class="question-link w-full text-left" :aria-expanded="expanded" :aria-controls="`question-replies-${question.id}`" @click="expanded = !expanded"><h2 class="mt-5 text-[19px] font-semibold leading-[1.5] tracking-[-0.4px]">{{ question.title }}</h2><p v-if="question.body" :class="{ 'line-clamp-2': !expanded }" class="mt-2 text-[13px] leading-6 text-muted">{{ question.body }}</p></button>
    <div class="mt-5 flex items-center justify-between border-t border-line pt-4"><button type="button" class="flex items-center gap-2 text-xs font-medium text-muted hover:text-accent" :aria-expanded="expanded" :aria-controls="`question-replies-${question.id}`" @click="expanded = !expanded"><AskIcon name="message" :size="17" />{{ question.answer_count }} jawaban <span class="ml-2 text-accent">{{ expanded ? 'Tutup' : 'Lihat & balas' }}</span></button><button class="icon-button" :class="{ 'text-accent': bookmarks.includes(question.id) }" :aria-pressed="bookmarks.includes(question.id)" :aria-label="bookmarks.includes(question.id) ? 'Hapus dari tersimpan' : 'Simpan pertanyaan'" @click="toggleBookmark(question.id)"><AskIcon name="bookmark" :size="18" /></button></div>
    <QuestionReactions :question="question" />
    <div class="mt-4 flex flex-wrap items-center gap-4">
      <NuxtLink :to="link" class="inline-flex items-center gap-1.5 text-xs text-muted hover:text-accent">Buka pertanyaan<AskIcon name="arrow" :size="15" /></NuxtLink>
      <button type="button" class="inline-flex items-center gap-1.5 text-xs text-muted hover:text-accent" @click="share"><AskIcon :name="copied ? 'check' : 'link'" :size="15" />{{ copied ? 'Tautan tersalin' : 'Bagikan' }}</button>
    </div>
    <div v-if="shareUrl" class="mt-3">
      <label :for="`share-url-${question.id}`" class="sr-only">Tautan pertanyaan</label>
      <input :id="`share-url-${question.id}`" :value="shareUrl" readonly class="form-input" @focus="($event.target as HTMLInputElement).select()">
      <p v-if="copyError" role="status" class="mt-2 text-xs text-muted">{{ copyError }}</p>
      <p v-else-if="copied" role="status" class="mt-2 text-xs text-accent">Tautan pertanyaan sudah disalin.</p>
    </div>
    <div v-if="opened" v-show="expanded" :id="`question-replies-${question.id}`">
      <QuestionReplies :question="question" />
    </div>
  </article>
</template>
