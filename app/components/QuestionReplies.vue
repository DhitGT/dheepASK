<script setup lang="ts">
import type { Question } from '~/types'
const props = defineProps<{ question: Question; active?: boolean }>()
const { answers, loadAnswers, reply, watchUpdates } = useAsk()
const replies = computed(() => answers.value.filter(answer => answer.question_id === props.question.id))
const roots = computed(() => replies.value.filter(answer => !answer.parent_id || !replies.value.some(parent => parent.id === answer.parent_id)))
const loading = ref(true)
const loadError = ref('')
const body = ref('')
const saving = ref(false)
const error = ref('')
const success = ref('')
async function refresh() { await loadAnswers(props.question.id) }
async function load() {
  loading.value = true; loadError.value = ''
  try { await refresh() }
  catch { loadError.value = 'Jawaban belum bisa dimuat. Coba lagi.' }
  finally { loading.value = false }
}
onMounted(load)
watchUpdates(() => props.active === false ? null : `question:${props.question.id}`, refresh)
async function submit() {
  if (saving.value) return
  saving.value = true; error.value = ''; success.value = ''
  try { await reply(props.question.id, body.value); body.value = ''; success.value = 'Jawaban anonimmu sudah terkirim.' }
  catch { error.value = 'Jawaban belum terkirim. Periksa koneksi lalu coba lagi. Jika baru mengirim, tunggu 30 detik.' }
  finally { saving.value = false }
}
</script>
<template>
  <section class="inline-replies" :aria-label="`Jawaban untuk ${question.title}`">
    <p v-if="loading" role="status" class="py-4 text-xs text-muted">Memuat jawaban…</p>
    <p v-else-if="loadError" role="alert" class="error-box">{{ loadError }} <button class="underline" @click="load">Coba lagi</button></p>
    <template v-else>
      <p v-if="!replies.length" class="py-4 text-sm text-muted">Belum ada jawaban. Mulai obrolannya?</p>
      <AnswerThread v-for="answer in roots" :key="answer.id" :answer="answer" :answers="replies" :depth="1" />
      <form class="mt-5 border-t border-line pt-4" @submit.prevent="submit">
        <label :for="`answer-body-${question.id}`" class="text-xs font-medium">Jawaban anonim</label>
        <textarea :id="`answer-body-${question.id}`" v-model="body" class="form-input mt-2" rows="3" required minlength="2" maxlength="3000" placeholder="Bagikan sudut pandangmu…" :disabled="saving" />
        <p v-if="error" role="alert" class="error-box mt-2">{{ error }}</p>
        <p v-if="success" role="status" class="mt-2 text-xs text-emerald-300">{{ success }}</p>
        <div class="mt-3 flex items-center justify-between gap-3"><span class="text-xs text-muted">{{ body.length }}/3000</span><button class="primary-button" :disabled="saving || body.trim().length < 2">{{ saving ? 'Mengirim…' : 'Kirim jawaban' }}<AskIcon name="send" :size="15" /></button></div>
      </form>
    </template>
  </section>
</template>
