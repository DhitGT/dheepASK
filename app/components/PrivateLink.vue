<script setup lang="ts">
const props = defineProps<{ path: string; label?: string }>()
const origin = ref('')
const url = computed(() => origin.value ? `${origin.value}${props.path}` : '')
const copied = ref(false); const error = ref('')
let timer: ReturnType<typeof setTimeout> | undefined
onMounted(() => { origin.value = window.location.origin })
onBeforeUnmount(() => clearTimeout(timer))
async function copy() {
  error.value = ''
  try { await navigator.clipboard.writeText(url.value); copied.value = true; clearTimeout(timer); timer = setTimeout(() => copied.value = false, 2500) }
  catch { error.value = 'Pilih lalu salin tautan di atas.' }
}
</script>
<template>
  <section class="question-card mt-5" aria-label="Bagikan ruang private">
    <h2 class="text-lg font-semibold">{{ label || 'Undang lewat tautan' }}</h2>
    <p class="mt-2 text-xs leading-6 text-muted">Siapa pun yang menerima tautan ini bisa masuk, membaca, dan ikut tanya jawab. Bagikan ke orang yang kamu inginkan.</p>
    <label class="mt-3 block"><span class="sr-only">Tautan private</span><input :value="url" readonly class="form-input" @focus="($event.target as HTMLInputElement).select()"></label>
    <button class="primary-button mt-3" :disabled="!url" @click="copy"><AskIcon :name="copied ? 'check' : 'link'" :size="15" />{{ copied ? 'Tautan tersalin' : 'Salin tautan private' }}</button>
    <p v-if="error" role="status" class="mt-2 text-xs text-muted">{{ error }}</p>
  </section>
</template>
