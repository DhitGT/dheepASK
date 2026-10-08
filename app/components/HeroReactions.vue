<script setup lang="ts">
import { SITE_REACTIONS, type ReactionKey } from '~/utils/reactions'
const { stats, ready, error, isDemo, react, retry } = useSiteEngagement()
const bursts = ref<{ id: number; image: string; staticImage: string; left: string; drift: string; spin: string }[]>([])
const announcement = ref('')
const heldReaction = ref<ReactionKey | null>(null)
type Hold = { key: ReactionKey; button: HTMLButtonElement; pointerId?: number; keyboardKey?: string }
let hold: Hold | null = null
let holdDelay: ReturnType<typeof setTimeout> | undefined
let holdRepeat: ReturnType<typeof setInterval> | undefined
let nextId = 0
const timers = new Set<ReturnType<typeof setTimeout>>()
function send(key: ReactionKey, button: HTMLButtonElement) {
  if (!ready.value) return
  react(key)
  const reaction = SITE_REACTIONS.find(item => item.key === key)!
  announcement.value = `Terima kasih! Reaksi ${reaction.label} ditambahkan.`
  const panel = button.closest('.hero-reactions')!.getBoundingClientRect()
  const bounds = button.getBoundingClientRect()
  const id = nextId++
  bursts.value = [...bursts.value.slice(-29), { id, image: reaction.image, staticImage: reaction.staticImage, left: `${bounds.left - panel.left + bounds.width / 2}px`, drift: `${(id % 5 - 2) * 22}px`, spin: `${(id % 2 ? 1 : -1) * 22}deg` }]
  const timer = setTimeout(() => { bursts.value = bursts.value.filter(burst => burst.id !== id); timers.delete(timer) }, 1100)
  timers.add(timer)
}
function stopHold() {
  const previous = hold
  hold = null; heldReaction.value = null
  clearTimeout(holdDelay); clearInterval(holdRepeat)
  if (previous?.pointerId !== undefined && previous.button.hasPointerCapture(previous.pointerId)) previous.button.releasePointerCapture(previous.pointerId)
}
function startHold(press: Hold) {
  if (!ready.value) return
  stopHold(); hold = press; heldReaction.value = press.key
  send(press.key, press.button)
  holdDelay = setTimeout(() => {
    if (hold !== press) return
    send(press.key, press.button)
    holdRepeat = setInterval(() => { if (hold === press) send(press.key, press.button) }, 80)
  }, 350)
}
function pointerDown(key: ReactionKey, event: PointerEvent) {
  if (!event.isPrimary || event.button !== 0) return
  const button = event.currentTarget as HTMLButtonElement
  startHold({ key, button, pointerId: event.pointerId })
  try { button.setPointerCapture(event.pointerId) } catch { /* Global release listener remains a fallback. */ }
}
function pointerEnd(event: PointerEvent) { if (hold?.pointerId === event.pointerId) stopHold() }
function buttonBlur(event: FocusEvent) { if (hold?.button === event.currentTarget) stopHold() }
function pointerMove(event: PointerEvent) {
  if (!hold || hold.pointerId !== event.pointerId) return
  const rect = hold.button.getBoundingClientRect()
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) stopHold()
}
function keyDown(key: ReactionKey, event: KeyboardEvent) {
  if (event.key !== ' ' && event.key !== 'Enter') return
  event.preventDefault()
  if (!event.repeat) startHold({ key, button: event.currentTarget as HTMLButtonElement, keyboardKey: event.key })
}
function keyUp(event: KeyboardEvent) {
  if (event.key !== ' ' && event.key !== 'Enter') return
  event.preventDefault()
  if (hold?.keyboardKey === event.key) stopHold()
}
function click(key: ReactionKey, event: MouseEvent) {
  // Pointer and keyboard presses are already counted above; keep assistive and programmatic clicks working.
  if (event.detail === 0) send(key, event.currentTarget as HTMLButtonElement)
}
function visibility() { if (document.hidden) stopHold() }
onMounted(() => { window.addEventListener('pointerup', pointerEnd); window.addEventListener('pointercancel', pointerEnd); window.addEventListener('blur', stopHold); document.addEventListener('visibilitychange', visibility) })
onBeforeUnmount(() => {
  stopHold(); timers.forEach(clearTimeout)
  window.removeEventListener('pointerup', pointerEnd); window.removeEventListener('pointercancel', pointerEnd); window.removeEventListener('blur', stopHold); document.removeEventListener('visibilitychange', visibility)
})
function number(value: number) { return value.toLocaleString('id-ID') }
</script>
<template>
  <section class="hero-reactions" aria-label="Reaksi untuk DheepASK">
    <div class="reaction-heading"><span>Suka ruang ini? Kasih reaksi.</span><span class="hit-counter" title="Setiap beranda dibuka atau dimuat ulang dihitung sebagai satu kunjungan."><AskIcon name="compass" :size="13" /><strong data-testid="site-hits">{{ ready ? number(stats.hits) : '—' }}</strong> kunjungan</span></div>
    <div class="reaction-buttons" role="group" aria-label="Pilih reaksi emoji">
      <button v-for="reaction in SITE_REACTIONS" :key="reaction.key" type="button" class="reaction-button" :class="{ 'is-holding': heldReaction === reaction.key }" :aria-label="`Kirim reaksi ${reaction.emoji} ${reaction.label}`" :title="`${reaction.label}: ${number(stats.reactions[reaction.key])} reaksi · Tekan lama untuk spam`" :disabled="!ready" @pointerdown="pointerDown(reaction.key, $event)" @pointerup="pointerEnd" @pointercancel="pointerEnd" @lostpointercapture="pointerEnd" @pointermove="pointerMove" @keydown="keyDown(reaction.key, $event)" @keyup="keyUp" @blur="buttonBlur" @contextmenu.prevent @dragstart.prevent @click="click(reaction.key, $event)">
        <picture aria-hidden="true"><source media="(prefers-reduced-motion: reduce)" :srcset="reaction.staticImage" type="image/png"><source :srcset="reaction.image" type="image/webp"><img class="reaction-emoji" :data-reaction="reaction.key" :src="reaction.staticImage" alt="" width="32" height="32" decoding="async" draggable="false"></picture>
        <span class="reaction-count" :data-testid="`reaction-count-${reaction.key}`" aria-hidden="true">{{ ready ? number(stats.reactions[reaction.key]) : '—' }}</span>
      </button>
    </div>
    <div class="reaction-note">Klik sekali, atau tekan lama untuk spam reaksi.<span v-if="isDemo"> · Demo di browser ini</span></div>
    <div class="emoji-credit"><a href="/emoji/noto/ATTRIBUTION.txt" target="_blank" rel="noopener">Emoji animasi: Google Noto</a></div>
    <span v-for="burst in bursts" :key="burst.id" class="reaction-burst" :style="{ left: burst.left, '--burst-drift': burst.drift, '--burst-spin': burst.spin }" aria-hidden="true"><picture><source media="(prefers-reduced-motion: reduce)" :srcset="burst.staticImage" type="image/png"><source :srcset="burst.image" type="image/webp"><img :src="burst.staticImage" alt="" width="40" height="40" decoding="async"></picture></span>
    <div class="sr-only" role="status">{{ announcement }}</div>
    <div v-if="error" class="reaction-error" role="alert">{{ error }} <button type="button" class="underline" @click="retry">Coba lagi</button></div>
  </section>
</template>
<style scoped>
.hero-reactions { position: relative; width: min(100%, 460px); margin: 27px auto 0; padding: 15px 17px 12px; border: 1px solid #c797f42b; border-radius: 14px; background: linear-gradient(135deg, #36154855, #0c0813a8); backdrop-filter: blur(12px); box-shadow: inset 0 1px 0 #e8c5ff09; }
.reaction-heading { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 8px; font-size: 11px; color: #d4bddf; text-align: left; }
.hit-counter { display: inline-flex; align-items: center; gap: 5px; color: #ad9ab9; font-size: 10px; }
.hit-counter strong { color: #dcc5ed; font-variant-numeric: tabular-nums; font-weight: 550; }
.reaction-buttons { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 7px; margin-top: 13px; }
.reaction-button { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; min-width: 0; min-height: 65px; padding: 7px 3px; border: 1px solid #c593ec1c; border-radius: 10px; background: #ffffff04; touch-action: manipulation; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
.reaction-button.is-holding { border-color: #c593ec99; background: #b771f632; box-shadow: 0 0 22px #b164ed33; }
.reaction-button:hover { border-color: #c593ec66; background: #b771f61c; box-shadow: 0 0 20px #b164ed17; transform: translateY(-3px); }
.reaction-button:active { transform: scale(.9); }
.reaction-emoji { display: block; width: 32px; height: 32px; object-fit: contain; }
.reaction-count { max-width: 100%; font-size: 10px; color: #c4afcf; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.reaction-note { margin-top: 10px; color: #a795b3; font-size: 9px; line-height: 1.7; }
.emoji-credit { margin-top: 3px; color: #a795b3; font-size: 9px; }
.emoji-credit a:hover { color: #dcc5ed; }
.reaction-burst { position: absolute; z-index: 3; top: 42px; pointer-events: none; animation: emoji-burst 1.05s ease-out both; }
.reaction-burst img { display: block; width: 40px; height: 40px; object-fit: contain; }
.reaction-error { margin-top: 9px; color: #f2b2c4; font-size: 11px; line-height: 1.7; }
@keyframes emoji-burst { 0% { opacity: 1; transform: translate(-50%, 0) scale(.7); } 25% { opacity: 1; } 100% { opacity: 0; transform: translate(calc(-50% + var(--burst-drift)), -150px) rotate(var(--burst-spin)) scale(1.5); } }
@media (max-width: 420px) { .hero-reactions { padding: 13px 11px 10px; } .reaction-heading { font-size: 10px; } .reaction-buttons { gap: 5px; } .reaction-emoji { width: 30px; height: 30px; } }
@media (prefers-reduced-motion: reduce) { .reaction-emoji, .reaction-burst { animation: none; } .reaction-burst { display: none; } .reaction-button { transition: none; } .reaction-button:hover, .reaction-button:active { transform: none; } }
</style>
