<script setup lang="ts">
import type { Room } from '~/types'
const route = useRoute(); const link = String(route.params.slug ?? route.params.token)
const { questions, joinRoom, loadRoomQuestions, isDemo, watchUpdates } = useAsk()
const room = ref<Room | null>(null); const loading = ref(true); const error = ref(''); const showModal = ref(false)
const roomQuestions = computed(() => questions.value.filter(q => q.room_id === room.value?.id).sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)))
useHead({ title: computed(() => room.value ? `${room.value.title} — DheepASK` : 'Ruang private — DheepASK'), meta: [{ name: 'robots', content: 'noindex, nofollow' }, { name: 'referrer', content: 'no-referrer' }] })
async function load() {
  loading.value = true; error.value = ''
  try { room.value = await joinRoom(link); if (room.value) { await loadRoomQuestions(room.value.id); if (route.path !== `/r/${room.value.slug}`) await navigateTo(`/r/${room.value.slug}`, { replace: true }) } }
  catch { error.value = 'Ruang belum bisa dimuat. Periksa koneksi lalu coba lagi.' }
  finally { loading.value = false }
}
onMounted(load)
watchUpdates(() => room.value ? `room:${room.value.id}` : null, async () => {
  room.value = await joinRoom(link)
  if (room.value) await loadRoomQuestions(room.value.id)
})
function created(code: string) { showModal.value = false; navigateTo(`/r/${room.value!.slug}/${code}`) }
function navigate(topic: string) { navigateTo({ path: '/', query: topic === 'Semua' ? {} : { topic } }) }
</script>
<template>
  <AskShell @ask="room && (showModal = true)" @navigate="navigate">
    <main class="conversation-content">
      <div v-if="loading" class="question-card h-64 animate-pulse" aria-label="Memuat ruang" />
      <div v-else-if="error" role="alert" class="error-box">{{ error }} <button class="underline" @click="load">Coba lagi</button></div>
      <div v-else-if="!room" class="empty-state"><AskIcon name="shield" :size="36" /><h1>Ruang tidak ditemukan.</h1><p>Periksa tautan undanganmu. {{ isDemo ? 'Di mode demo, ruang hanya tersedia di browser pembuatnya.' : '' }}</p><NuxtLink to="/" class="primary-button mt-5">Ke beranda</NuxtLink></div>
      <template v-else>
        <section class="question-card">
          <span class="eyebrow">RUANG PRIVATE · AKSES LEWAT TAUTAN</span>
          <h1 class="mt-4 break-words text-3xl font-bold">{{ room.title }}</h1>
          <p class="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-muted">{{ room.context }}</p>
          <p class="mt-5 text-xs text-accent">Kamu: <strong data-testid="my-alias">{{ room.my_alias }}</strong><span v-if="room.is_owner"> · Pembuat ruang</span></p>
          <p class="mt-2 text-xs leading-6 text-muted">Nama samaranmu tetap sama di ruang ini. Orang lain mendapat nama samaran berbeda.</p>
          <p v-if="isDemo" class="mt-3 text-xs leading-6 text-muted">Demo tersimpan di browser ini. Berbagi antar pengguna membutuhkan Supabase.</p>
        </section>
        <PrivateLink :path="`/r/${room.slug}`" />
        <div class="mt-8 mb-5 flex flex-wrap items-center justify-between gap-3"><h2 class="text-lg font-semibold">{{ roomQuestions.length }} pertanyaan di ruang ini</h2><div class="flex items-center gap-3"><button class="text-xs text-muted" @click="load">Perbarui</button><button class="primary-button" @click="showModal = true"><AskIcon name="plus" :size="15" />Tanya di ruang ini</button></div></div>
        <div v-if="!roomQuestions.length" class="empty-state"><AskIcon name="message" :size="30" /><h3>Mulai obrolan pertama.</h3><p>Tanyakan sesuatu yang sesuai dengan konteks ruang ini.</p></div>
        <div v-else class="space-y-4"><QuestionCard v-for="question in roomQuestions" :key="question.id" :question="question" :room-code="room.slug" /></div>
      </template>
    </main>
    <AskModal v-if="showModal && room" :room-id="room.id" :room-title="room.title" @close="showModal = false" @created="created" />
  </AskShell>
</template>
