<script setup lang="ts">
const route = useRoute(); const identifier = String(route.params.code ?? route.params.id).toUpperCase()
const { questions, answers, bookmarks, isDemo, load, getQuestion, loadAnswers, reply, toggleBookmark } = useAsk()
const question = computed(() => questions.value.find(q => q.id.toUpperCase() === identifier || q.short_code === identifier))
const id = computed(() => question.value?.id || '')
const replies = computed(() => answers.value.filter(a => a.question_id === id.value))
const loading = ref(true); const loadError = ref(''); const body = ref(''); const saving = ref(false); const error = ref(''); const success = ref(''); const showModal = ref(false); const copied = ref(false)
useHead({ title: computed(() => question.value ? `${question.value.title} — DheepASK` : 'Percakapan — DheepASK') })
async function fetchConversation() {
  loading.value = true; loadError.value = ''
  try { if (isDemo) await load(); const found = await getQuestion(identifier); if (found) await loadAnswers(found.id) }
  catch { loadError.value = 'Percakapan belum bisa dimuat. Periksa koneksi lalu coba lagi.' }
  finally { loading.value = false }
}
onMounted(fetchConversation)
async function submit() {
  if (saving.value) return
  if (!id.value) return
  if (body.value.trim().length < 2) { error.value = 'Jawaban minimal 2 karakter.'; return }
  saving.value = true; error.value = ''; success.value = ''
  try { await reply(id.value, body.value); body.value = ''; success.value = 'Terima kasih. Jawaban anonimmu sudah terkirim.' }
  catch { error.value = 'Jawaban belum terkirim. Periksa koneksi dan konfigurasi Supabase. Jika baru mengirim, tunggu 30 detik.' }
  finally { saving.value = false }
}
async function share() { try { await navigator.clipboard.writeText(`${window.location.origin}/${question.value!.short_code}`); copied.value = true; setTimeout(() => copied.value = false, 2500) } catch { error.value = 'Salin tautan pendek di bagian kode pertanyaan.' } }
function date(value: string) { return new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) }
function navigate(topic: string) { navigateTo({ path: '/', query: topic === 'Semua' ? {} : { topic } }) }
</script>
<template>
  <AskShell @ask="showModal = true" @navigate="navigate">
    <header class="topbar"><NuxtLink to="/" class="flex items-center gap-2 text-sm font-medium"><AskIcon name="back" :size="18" />Kembali menjelajah</NuxtLink><span class="privacy-pill"><AskIcon name="shield" :size="15" />Selalu anonim</span></header>
    <main class="conversation-content">
      <div v-if="loading" class="question-card animate-pulse h-64" aria-label="Memuat percakapan" />
      <div v-else-if="loadError" role="alert" class="error-box">{{ loadError }} <button class="underline" @click="fetchConversation">Coba lagi</button></div>
      <div v-else-if="!question" class="empty-state"><AskIcon name="message" :size="40" /><h1>Pertanyaan tidak ditemukan.</h1><p>Pertanyaan mungkin sudah dihapus atau alamatnya kurang tepat.</p><NuxtLink to="/" class="primary-button mt-5">Jelajahi pertanyaan</NuxtLink></div>
      <template v-else>
        <span class="eyebrow">SATU PERTANYAAN, BANYAK PERSPEKTIF</span>
        <article class="question-card mt-5"><div class="flex items-center justify-between"><div class="flex items-center gap-3"><div class="anon-avatar"><AskIcon name="message" :size="20" /></div><div><p class="text-sm font-semibold">Seseorang anonim</p><p class="mt-1 text-xs text-muted">{{ date(question.created_at) }}</p></div></div><span class="category-tag" :data-category="question.category">{{ question.category }}</span></div><h1 class="mt-6 text-2xl font-bold leading-normal tracking-tight sm:text-3xl">{{ question.title }}</h1><p class="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-muted">{{ question.body }}</p><div class="mt-6 flex justify-between border-t border-line pt-4"><span class="flex items-center gap-2 text-xs text-muted"><AskIcon name="message" :size="17" />{{ question.answer_count }} jawaban</span><div class="flex items-center gap-3"><button class="flex items-center gap-1.5 text-xs text-muted" @click="share"><AskIcon :name="copied ? 'check' : 'link'" :size="16" />{{ copied ? 'Tersalin' : 'Bagikan' }}</button><button class="icon-button" :class="{ 'text-accent': bookmarks.includes(id) }" :aria-pressed="bookmarks.includes(id)" aria-label="Simpan pertanyaan" @click="toggleBookmark(id)"><AskIcon name="bookmark" :size="18" /></button></div></div></article>
        <QuestionShare :code="question.short_code" />
        <form class="question-card mt-5" @submit.prevent="submit"><h2 class="text-lg font-semibold">Sudut pandangmu berarti.</h2><p class="mt-1.5 text-xs text-muted">Bagikan jawaban atau pengalamanmu. Tetap anonim, selalu dengan empati.</p><label for="answer-body" class="sr-only">Jawaban anonim</label><textarea id="answer-body" v-model="body" rows="4" required minlength="2" maxlength="3000" class="form-input mt-5" placeholder="Kalau menurutku…" /><p class="mt-1 text-right text-xs text-muted">{{ body.length }}/3000</p><p v-if="error" class="error-box mt-3" role="alert">{{ error }}</p><p v-if="success" class="mt-3 text-sm text-emerald-700" role="status">{{ success }}</p><div class="mt-4 flex flex-wrap items-center justify-between gap-4"><span class="flex items-center gap-2 text-xs text-muted"><AskIcon name="shield" :size="15" />{{ isDemo ? 'Jawaban demo disimpan di browser' : 'Identitasmu tidak ditampilkan' }}</span><button class="primary-button" :disabled="saving">{{ saving ? 'Mengirim…' : 'Kirim jawaban' }}<AskIcon name="send" :size="16" /></button></div></form>
        <div class="mt-9 mb-5 flex items-center justify-between"><h2 class="text-lg font-bold">Jawaban <span class="ml-2 text-sm font-normal text-muted">{{ replies.length }}</span></h2><button class="flex items-center gap-2 text-xs text-muted" @click="fetchConversation"><AskIcon name="refresh" :size="14" />Perbarui</button></div>
        <div v-if="!replies.length" class="empty-state"><AskIcon name="sparkles" :size="28" /><h3>Jadilah suara pertama.</h3><p>Jawaban sederhana darimu bisa membuat seseorang merasa dimengerti.</p></div>
        <article v-for="(answer, index) in replies" :key="answer.id" class="question-card mb-4"><div class="flex items-center gap-3"><div class="anon-avatar answer-avatar"><AskIcon name="message" :size="18" /></div><div><p class="text-xs font-semibold">Anonim #{{ String(index + 1).padStart(2, '0') }}</p><p class="mt-1 text-[11px] text-muted">{{ date(answer.created_at) }}</p></div></div><p class="mt-4 whitespace-pre-wrap break-words text-sm leading-7">{{ answer.body }}</p></article>
      </template>
    </main>
    <AskModal v-if="showModal" @close="showModal = false" @created="newId => { showModal = false; navigateTo(`/${newId}`) }" />
  </AskShell>
</template>
