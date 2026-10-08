<script setup lang="ts">
import type { Answer } from '~/types'

const props = withDefaults(defineProps<{ answer: Answer; answers: Answer[]; depth?: number }>(), { depth: 0 })
const { reply } = useAsk()
const children = computed(() => props.answers.filter(answer => answer.parent_id === props.answer.id))
const alias = computed(() => props.answer.anon_name || 'Anonim #' + number.value)
const number = computed(() => String(props.answers.findIndex(answer => answer.id === props.answer.id) + 1).padStart(2, '0'))
const composing = ref(false)
const expanded = ref(false)
const body = ref('')
const saving = ref(false)
const error = ref('')
const success = ref('')
const input = ref<HTMLTextAreaElement>()
watch(() => children.value.length, () => { if (composing.value) expanded.value = true })
async function startReply() {
  composing.value = true; success.value = ''
  await nextTick()
  input.value?.focus()
}
function cancel() { composing.value = false; body.value = ''; error.value = '' }
async function submit() {
  if (saving.value) return
  if (body.value.trim().length < 2) { error.value = 'Balasan minimal 2 karakter.'; return }
  saving.value = true; error.value = ''
  try {
    await reply(props.answer.question_id, body.value, props.answer.id)
    cancel(); expanded.value = true; success.value = 'Balasan anonimmu sudah terkirim.'
  } catch { error.value = 'Balasan belum terkirim. Periksa koneksi lalu coba lagi. Jika baru mengirim, tunggu 30 detik.' }
  finally { saving.value = false }
}
function date(value: string) { return new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) }
</script>

<template>
  <article :data-answer-id="answer.id" :aria-label="`Jawaban ${alias}`" :class="depth === 0 ? 'question-card mb-4' : 'border-t border-line pt-4 mt-4'">
    <div class="flex items-center gap-3">
      <div class="anon-avatar answer-avatar"><AskIcon name="message" :size="18" /></div>
      <div><p class="text-xs font-semibold">{{ alias }}</p><p class="mt-1 text-[11px] text-muted">{{ date(answer.created_at) }}</p></div>
    </div>
    <p class="mt-4 whitespace-pre-wrap break-words text-sm leading-7">{{ answer.body }}</p>
    <AnswerReactions :answer="answer" />
    <button class="mt-3 flex items-center gap-2 text-xs text-muted hover:text-accent" :aria-expanded="composing" :aria-controls="`reply-form-${answer.id}`" @click="startReply"><AskIcon name="message" :size="15" />Balas<span class="sr-only"> {{ alias }}</span></button>
    <p v-if="success" role="status" class="mt-3 text-sm text-emerald-300">{{ success }}</p>
    <form v-if="composing" :id="`reply-form-${answer.id}`" class="mt-4" @submit.prevent="submit">
      <label :for="`reply-body-${answer.id}`" class="text-xs text-muted">Balas {{ alias }}</label>
      <textarea :id="`reply-body-${answer.id}`" ref="input" v-model="body" rows="3" required minlength="2" maxlength="3000" class="form-input mt-2" placeholder="Tulis balasanmu…" :disabled="saving" />
      <p class="mt-1 text-right text-xs text-muted">{{ body.length }}/3000</p>
      <p v-if="error" class="error-box mt-3" role="alert">{{ error }}</p>
      <div class="mt-3 flex flex-wrap items-center justify-end gap-3">
        <button type="button" class="text-sm text-muted" :disabled="saving" @click="cancel">Batal</button>
        <button class="primary-button" :disabled="saving">{{ saving ? 'Mengirim…' : 'Kirim balasan' }}<AskIcon name="send" :size="16" /></button>
      </div>
    </form>
    <button v-if="children.length" type="button" class="mt-4 flex items-center gap-2 text-xs font-medium text-accent" :aria-expanded="expanded" :aria-controls="`answer-children-${answer.id}`" @click="expanded = !expanded">
      <span aria-hidden="true">{{ expanded ? '−' : '+' }}</span>{{ expanded ? 'Sembunyikan balasan' : `Lihat ${children.length} balasan` }}
    </button>
    <div v-if="children.length" v-show="expanded" :id="`answer-children-${answer.id}`" :class="depth < 3 ? 'ml-2 border-l border-line pl-3 sm:ml-4 sm:pl-4' : ''">
      <AnswerThread v-for="child in children" :key="child.id" :answer="child" :answers="answers" :depth="depth + 1" />
    </div>
  </article>
</template>
