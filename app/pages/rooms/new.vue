<script setup lang="ts">
const { createRoom, isDemo } = useAsk()
const title = ref(''); const context = ref(''); const saving = ref(false); const error = ref('')
const slug = ref('')
const showModal = ref(false)
useHead({ title: 'Buat ruang private — DheepASK' })
async function submit() {
  if (saving.value) return
  if (title.value.trim().length < 3 || context.value.trim().length < 2) { error.value = 'Isi nama ruang dan konteksnya dulu.'; return }
  saving.value = true; error.value = ''
  try { const room = await createRoom(title.value, context.value, slug.value); await navigateTo(`/r/${room.slug}`) }
  catch (cause) { const message = cause instanceof Error ? cause.message : ''; error.value = message.startsWith('Kode') ? message : 'Ruang belum dibuat. Periksa koneksi lalu coba lagi. Jika baru mengirim, tunggu 30 detik.' }
  finally { saving.value = false }
}
function navigate(topic: string) { navigateTo({ path: '/', query: topic === 'Semua' ? {} : { topic } }) }
</script>
<template>
  <AskShell @ask="showModal = true" @navigate="navigate">
    <main class="conversation-content">
      <NuxtLink to="/" class="inline-flex items-center gap-2 text-sm text-muted"><AskIcon name="back" :size="16" />Kembali ke beranda</NuxtLink>
      <section class="question-card mt-5">
        <span class="eyebrow">OBROLAN UNTUK LINGKARANMU</span>
        <h1 class="mt-3 text-3xl font-bold">Buat ruang private</h1>
        <p class="mt-3 text-sm leading-7 text-muted">Satu ruang, satu konteks. Undang orang lewat tautan untuk bertanya dan saling membalas dengan nama samaran.</p>
        <form class="mt-6 space-y-5" @submit.prevent="submit">
          <div><label for="room-title" class="form-label">Nama ruang</label><input id="room-title" v-model="title" class="form-input" required minlength="3" maxlength="180" placeholder="Tanya apa aja tentang gw!"></div>
          <div><label for="room-slug" class="form-label">Kode tautan <span class="font-normal text-muted">(opsional)</span></label><input id="room-slug" v-model="slug" class="form-input" minlength="3" maxlength="32" pattern="[A-Za-z0-9][A-Za-z0-9-]{1,30}[A-Za-z0-9]" placeholder="tanya-gw" autocapitalize="none" spellcheck="false" aria-describedby="room-slug-help"><p id="room-slug-help" class="mt-2 text-xs leading-6 text-muted">3–32 karakter: huruf, angka, atau tanda hubung. Kosongkan untuk kode acak 7 huruf.</p><p class="mt-2 break-all text-xs text-accent">Tautanmu: /r/{{ slug.trim() || 'AUIDWIG' }}{{ slug.trim() ? '' : ' (contoh)' }}</p></div>
          <div><label for="room-context" class="form-label">Konteks ruang</label><textarea id="room-context" v-model="context" class="form-input" required minlength="2" maxlength="2000" rows="5" placeholder="Aku lagi buka sesi tanya jawab. Boleh tanya soal keseharian, hobi, atau hal yang bikin penasaran." /><p class="mt-1 text-right text-xs text-muted">{{ context.length }}/2000</p></div>
          <p class="text-xs leading-6 text-muted">Ruang ini tidak muncul di beranda. Siapa pun yang punya tautan bisa bergabung, termasuk jika tautannya diteruskan.</p>
          <p v-if="isDemo" class="text-xs leading-6 text-accent">Mode demo: ruang hanya tersimpan di browser ini. Hubungkan Supabase untuk berbagi dengan orang lain.</p>
          <p v-if="error" role="alert" class="error-box">{{ error }}</p>
          <button class="primary-button" :disabled="saving">{{ saving ? 'Membuat…' : 'Buat ruang' }}<AskIcon name="right" :size="16" /></button>
        </form>
      </section>
    </main>
    <AskModal v-if="showModal" @close="showModal = false" @created="code => { showModal = false; navigateTo(`/${code}`) }" />
  </AskShell>
</template>
