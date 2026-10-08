<script setup lang="ts">
const props = defineProps<{ anchor: HTMLButtonElement }>()
const emit = defineEmits<{ select: [emoji: string]; close: [restoreFocus?: boolean] }>()
const panel = ref<HTMLElement>()
const host = ref<HTMLElement>()
const closeButton = ref<HTMLButtonElement>()
const position = ref({ left: '12px', top: '12px' })
const loading = ref(true)
const error = ref('')
let disposed = false
let observer: ResizeObserver | undefined
let frame = 0
function schedulePlace() {
  if (!frame && !disposed) frame = requestAnimationFrame(() => { frame = 0; place() })
}
function place() {
  if (!panel.value) return
  const anchor = props.anchor.getBoundingClientRect()
  const popup = panel.value.getBoundingClientRect()
  const viewport = window.visualViewport
  const width = viewport?.width || window.innerWidth
  const height = viewport?.height || window.innerHeight
  const offset = viewport?.offsetTop || 0
  const below = anchor.bottom + 8
  const top = below + popup.height <= height + offset - 12 ? below : anchor.top - popup.height - 8
  position.value = {
    left: `${Math.max(12, Math.min(anchor.left, width - popup.width - 12))}px`,
    top: `${Math.max(offset + 12, Math.min(top, height + offset - popup.height - 12))}px`,
  }
}
function outside(event: Event) {
  const path = event.composedPath()
  if (panel.value && !path.includes(panel.value) && !path.includes(props.anchor)) emit('close', false)
}
function keydown(event: KeyboardEvent) {
  if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); emit('close', true) }
}
async function load() {
  error.value = ''; loading.value = true
  try {
    const [{ Picker }, { default: data }] = await Promise.all([import('emoji-mart'), import('@emoji-mart/data')])
    if (disposed || !host.value) return
    const picker = new Picker({
      data, theme: 'dark', set: 'native', autoFocus: true,
      perLine: 8, emojiButtonSize: 34, emojiSize: 24, previewPosition: 'bottom',
      noCountryFlags: false, skinTonePosition: 'search',
      i18n: {
        search: 'Cari emoji', search_no_results_1: 'Emoji tidak ditemukan', search_no_results_2: 'Coba nama lain (misalnya cat atau coffee).',
        pick: 'Pilih emoji', categories: {
          frequent: 'Sering dipakai', people: 'Ekspresi & orang', nature: 'Hewan & alam', foods: 'Makanan & minuman',
          activity: 'Aktivitas', places: 'Perjalanan & tempat', objects: 'Benda', symbols: 'Simbol', flags: 'Bendera', search: 'Hasil pencarian',
        },
        skins: { choose: 'Pilih warna kulit', 1: 'Default', 2: 'Terang', 3: 'Agak terang', 4: 'Sedang', 5: 'Agak gelap', 6: 'Gelap' },
      },
      onEmojiSelect: (emoji: { native: string }) => { if (!disposed) emit('select', emoji.native) },
    })
    host.value.replaceChildren(picker as unknown as HTMLElement)
  } catch { if (!disposed) error.value = 'Picker belum bisa dimuat. Coba lagi.' }
  finally { if (!disposed) { loading.value = false; await nextTick(); place() } }
}
onMounted(() => {
  place(); closeButton.value?.focus()
  observer = new ResizeObserver(schedulePlace)
  if (panel.value) observer.observe(panel.value)
  window.addEventListener('pointerdown', outside, true)
  window.addEventListener('focusin', outside)
  window.addEventListener('keydown', keydown, true)
  window.addEventListener('resize', schedulePlace)
  window.addEventListener('scroll', schedulePlace, { capture: true, passive: true })
  window.visualViewport?.addEventListener('resize', schedulePlace)
  window.visualViewport?.addEventListener('scroll', schedulePlace)
  void load()
})
onBeforeUnmount(() => {
  disposed = true; observer?.disconnect(); cancelAnimationFrame(frame)
  window.removeEventListener('pointerdown', outside, true)
  window.removeEventListener('focusin', outside)
  window.removeEventListener('keydown', keydown, true)
  window.removeEventListener('resize', schedulePlace)
  window.removeEventListener('scroll', schedulePlace, true)
  window.visualViewport?.removeEventListener('resize', schedulePlace)
  window.visualViewport?.removeEventListener('scroll', schedulePlace)
})
</script>
<template>
  <Teleport to="body">
    <section ref="panel" class="emoji-reaction-picker" :style="position" role="dialog" aria-label="Pilih reaction emoji">
      <div class="flex items-center justify-between px-3 py-2"><span class="text-xs font-semibold">Tambah reaction</span><button ref="closeButton" class="icon-button" aria-label="Tutup picker emoji" @click="emit('close', true)"><AskIcon name="close" :size="16" /></button></div>
      <p v-if="loading" role="status" class="px-3 py-6 text-xs text-muted">Memuat emoji…</p>
      <p v-if="error" role="alert" class="px-3 py-6 text-xs text-red-300">{{ error }} <button class="underline" @click="load">Coba lagi</button></p>
      <div ref="host" class="emoji-picker-host" />
      <p class="border-t border-line px-3 py-2 text-[10px] text-muted">Cari nama emoji, misalnya cat, coffee, atau heart.</p>
    </section>
  </Teleport>
</template>
