<script setup lang="ts">
import type { Category } from '~/types'
const emit = defineEmits<{ close: []; created: [id: string] }>()
const { ask, isDemo } = useAsk()
const title = ref(''); const body = ref(''); const category = ref<Category>('Kehidupan')
const saving = ref(false); const error = ref(''); const dialog = ref<HTMLElement>()
const categories: Category[] = ['Kehidupan', 'Hubungan', 'Karier', 'Pendidikan', 'Teknologi', 'Random']
async function submit() {
  if (saving.value) return
  if (title.value.trim().length < 10) { error.value = 'Tulis pertanyaan minimal 10 karakter.'; return }
  saving.value = true; error.value = ''
  try { emit('created', await ask(title.value, body.value, category.value)) }
  catch { error.value = 'Belum berhasil dikirim. Periksa koneksi dan aktivasi anonymous sign-in Supabase. Jika baru mengirim, tunggu 30 detik.' }
  finally { saving.value = false }
}
let previousFocus: HTMLElement | null = null
function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape' && !saving.value) emit('close')
  if (event.key === 'Tab') {
    const nodes = dialog.value?.querySelectorAll<HTMLElement>('button:not(:disabled), input, textarea, select')
    const first = nodes?.[0]; const last = nodes?.[nodes.length - 1]
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
  }
}
onMounted(() => { previousFocus = document.activeElement as HTMLElement; document.body.style.overflow = 'hidden'; document.addEventListener('keydown', onKey); dialog.value?.querySelector('input')?.focus() })
onBeforeUnmount(() => { document.body.style.overflow = ''; document.removeEventListener('keydown', onKey); previousFocus?.focus() })
</script>
<template>
  <Teleport to="body"><div class="modal-overlay" @click.self="!saving && emit('close')">
    <section ref="dialog" class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="flex items-center justify-between"><span class="eyebrow">CERITA DIMULAI DARI RASA INGIN TAHU</span><button class="icon-button" aria-label="Tutup" :disabled="saving" @click="emit('close')"><AskIcon name="close" /></button></div>
      <h2 id="modal-title" class="mt-5 text-3xl font-bold tracking-tight">Apa yang ada di pikiranmu?</h2><p class="mt-2 text-sm text-muted">Tidak perlu nama. Cukup pertanyaan yang jujur.</p>
      <form class="mt-7 space-y-5" @submit.prevent="submit">
        <div><label for="question-title" class="form-label">Pertanyaanmu <span class="text-purple-500">*</span></label><input id="question-title" v-model="title" required minlength="10" maxlength="180" class="form-input" placeholder="Hal yang selalu ingin kamu tanyakan…"><p class="mt-1 text-right text-xs text-muted">{{ title.length }}/180</p></div>
        <div><label for="question-body" class="form-label">Sedikit konteks <span class="font-normal text-muted">(opsional)</span></label><textarea id="question-body" v-model="body" maxlength="2000" rows="4" class="form-input" placeholder="Ceritakan sedikit agar orang lain lebih memahami…" /></div>
        <div><label for="category" class="form-label">Pilih topik</label><select id="category" v-model="category" class="form-input"><option v-for="item in categories" :key="item">{{ item }}</option></select></div>
        <p v-if="error" role="alert" class="error-box">{{ error }}</p>
        <div class="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5"><span class="flex items-center gap-2 text-xs text-muted"><AskIcon name="shield" :size="16" /> {{ isDemo ? 'Demo · disimpan di browser ini' : 'Identitas tidak ditampilkan' }}</span><button class="primary-button" :disabled="saving">{{ saving ? 'Mengirim…' : 'Kirim pertanyaan' }}<AskIcon name="right" :size="17" /></button></div>
      </form>
    </section>
  </div></Teleport>
</template>
