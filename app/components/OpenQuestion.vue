<script setup lang="ts">
const code = ref('')
const ready = ref(false)
onMounted(() => { ready.value = true })
async function open() { if (/^[a-z]{5}$/i.test(code.value)) await navigateTo(`/${code.value.toUpperCase()}`) }
</script>
<template>
  <form class="open-code-form" @submit.prevent="open">
    <div class="flex items-center gap-3"><span class="community-icon"><AskIcon name="qr" :size="18" /></span><div><label for="open-code" class="text-sm font-semibold">Punya kode pertanyaan?</label><p class="mt-1 text-[11px] text-muted">Masukkan 5 huruf untuk langsung membuka percakapan.</p></div></div>
    <div class="flex gap-2"><input id="open-code" v-model="code" :disabled="!ready" class="form-input code-input" type="text" autocapitalize="characters" spellcheck="false" pattern="[A-Za-z]{5}" minlength="5" maxlength="5" required autocomplete="off" placeholder="KTMXZ" aria-label="Kode pertanyaan 5 huruf"><button class="primary-button" type="submit" :disabled="!ready">Buka<AskIcon name="right" :size="16" /></button></div>
  </form>
</template>
