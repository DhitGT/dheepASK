<script setup lang="ts">
import QRCode from 'qrcode'
const props = defineProps<{ code: string }>()
const origin = ref(''); const qrImage = ref(''); const qrError = ref(''); const copied = ref(false); const copyError = ref('')
const url = computed(() => origin.value ? `${origin.value}/${props.code}` : '')
let copyTimer: ReturnType<typeof setTimeout> | undefined
onMounted(() => { origin.value = window.location.origin })
onBeforeUnmount(() => { clearTimeout(copyTimer) })
async function generate() {
  if (!url.value) return
  const value = url.value
  qrError.value = ''; qrImage.value = ''
  try {
    const result = await QRCode.toDataURL(value, { width: 320, margin: 4, errorCorrectionLevel: 'M', color: { dark: '#30303f', light: '#ffffff' } })
    if (url.value === value) qrImage.value = result
  } catch { qrError.value = 'QR belum bisa dibuat. Coba lagi.' }
}
watch(url, generate)
async function copy() {
  copyError.value = ''
  try { await navigator.clipboard.writeText(url.value); copied.value = true; clearTimeout(copyTimer); copyTimer = setTimeout(() => copied.value = false, 2500) }
  catch { copyError.value = 'Pilih lalu salin tautan di atas secara manual.' }
}
</script>
<template>
  <section class="question-card share-card mt-5" aria-labelledby="share-heading">
    <div class="share-copy">
      <span class="eyebrow">MUDAH DIBUKA, MUDAH DIBAGIKAN</span>
      <h2 id="share-heading" class="mt-2 text-lg font-semibold">Kode pertanyaan</h2>
      <p class="question-code" data-testid="question-code">{{ code }}</p>
      <p class="text-xs leading-6 text-muted">Ketik kode ini di beranda, atau pindai QR untuk ikut menjawab.</p>
      <label for="share-url" class="sr-only">Tautan pendek pertanyaan</label>
      <input id="share-url" :value="url" readonly class="form-input mt-3" @focus="($event.target as HTMLInputElement).select()">
      <div class="mt-3 flex flex-wrap gap-3"><button type="button" class="primary-button" :disabled="!url" @click="copy"><AskIcon :name="copied ? 'check' : 'link'" :size="15" />{{ copied ? 'Tautan tersalin' : 'Salin tautan' }}</button><a v-if="qrImage" :href="qrImage" :download="`dheepask-${code}.png`" class="qr-download"><AskIcon name="download" :size="16" />Unduh QR</a></div>
      <p v-if="copyError" class="mt-2 text-xs text-muted" role="status">{{ copyError }}</p>
    </div>
    <div class="qr-block"><img v-if="qrImage" :src="qrImage" :alt="`QR tautan pertanyaan ${code}`" width="168" height="168"><p v-else-if="qrError" role="alert" class="text-xs leading-5 text-muted">{{ qrError }}<button class="mt-2 block text-accent underline" @click="generate">Coba lagi</button></p><div v-else class="h-[168px] w-[168px] animate-pulse rounded-lg bg-white" aria-label="Membuat QR"><AskIcon name="qr" :size="32" class="m-auto mt-16 text-accent" /></div><p class="text-center text-[10px] text-muted">Pindai untuk membuka pertanyaan</p></div>
  </section>
</template>
