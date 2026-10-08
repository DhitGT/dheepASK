<script setup lang="ts">
import type { Question } from '~/types'
const props = defineProps<{ question: Question; roomCode?: string }>()
const link = computed(() => props.roomCode ? `/r/${props.roomCode}/${props.question.short_code}` : `/${props.question.short_code}`)
const { bookmarks, toggleBookmark } = useAsk()
const relativeTime = computed(() => {
  const hours = Math.max(0, Math.floor((Date.now() - new Date(props.question.created_at).getTime()) / 3600000))
  return hours < 1 ? 'Baru saja' : hours < 24 ? `${hours} jam lalu` : `${Math.floor(hours / 24)} hari lalu`
})
</script>
<template>
  <article class="question-card">
    <div class="flex items-center justify-between gap-3"><div class="flex items-center gap-3"><div class="anon-avatar"><AskIcon name="message" :size="18" /></div><div><span class="text-[13px] font-semibold">{{ question.anon_name || 'Seseorang anonim' }}</span><p class="mt-0.5 text-[11px] text-muted">{{ relativeTime }}</p></div></div><span class="category-tag" :data-category="question.category">{{ question.category }}</span></div>
    <NuxtLink :to="link" class="question-link"><h2 class="mt-5 text-[19px] font-semibold leading-[1.5] tracking-[-0.4px]">{{ question.title }}</h2><p v-if="question.body" class="mt-2 line-clamp-2 text-[13px] leading-6 text-muted">{{ question.body }}</p></NuxtLink>
    <div class="mt-5 flex items-center justify-between border-t border-line pt-4"><NuxtLink :to="link" class="flex items-center gap-2 text-xs font-medium text-muted hover:text-accent"><AskIcon name="message" :size="17" />{{ question.answer_count }} jawaban <span class="ml-3 hidden text-accent sm:inline">Ikut menjawab <span class="ml-1">↗</span></span></NuxtLink><button class="icon-button" :class="{ 'text-accent': bookmarks.includes(question.id) }" :aria-pressed="bookmarks.includes(question.id)" :aria-label="bookmarks.includes(question.id) ? 'Hapus dari tersimpan' : 'Simpan pertanyaan'" @click="toggleBookmark(question.id)"><AskIcon name="bookmark" :size="18" /></button></div>
  </article>
</template>
