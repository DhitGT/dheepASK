<script setup lang="ts">
const atmosphere = ref<HTMLElement>()
// Deterministic positions keep server rendering and hydration identical.
const particles = Array.from({ length: 42 }, (_, i) => ({
  left: `${(i * 47 + 13) % 100}%`,
  top: `${18 + (i * 31) % 75}%`,
  size: `${i % 7 === 0 ? 3 : 1 + i % 2}px`,
  delay: `${-(i * 1.7)}s`,
  duration: `${9 + i % 9}s`,
}))
onMounted(() => {
  const element = atmosphere.value!
  const hero = element.parentElement!
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  let frame = 0
  let previousTime = 0
  let y = 0, targetY = 0
  function animate(time: number) {
    // Use elapsed time so scrolling stays responsive at lower frame rates.
    const blend = 1 - Math.exp(-(time - previousTime) / 100)
    previousTime = time
    y += (targetY - y) * blend
    if (Math.abs(targetY - y) < .1) y = targetY
    element.style.setProperty('--parallax-y', `${y.toFixed(2)}px`)
    frame = Math.abs(targetY - y) > .1 ? requestAnimationFrame(animate) : 0
  }
  function scroll() {
    if (reducedMotion.matches) {
      cancelAnimationFrame(frame); frame = 0; y = targetY = 0
      element.style.setProperty('--parallax-y', '0px')
      return
    }
    targetY = Math.min(Math.max(window.scrollY, 0) * .55, 280)
    if (!frame) {
      previousTime = performance.now()
      frame = requestAnimationFrame(animate)
    }
  }
  const observer = new IntersectionObserver(([entry]) => {
    element.classList.toggle('is-paused', !entry?.isIntersecting)
  })
  observer.observe(hero)
  window.addEventListener('scroll', scroll, { passive: true })
  reducedMotion.addEventListener('change', scroll)
  scroll()
  onBeforeUnmount(() => {
    cancelAnimationFrame(frame)
    observer.disconnect()
    window.removeEventListener('scroll', scroll)
    reducedMotion.removeEventListener('change', scroll)
  })
})
</script>

<template>
  <div ref="atmosphere" class="hero-atmosphere immersive-atmosphere" aria-hidden="true">
    <div class="nebula-depth">
      <div class="aurora aurora-violet" />
      <div class="aurora aurora-blue" />
      <div class="aurora aurora-rose" />
      <div class="hero-glow" />
    </div>
    <div class="star-depth"><div class="hero-stars" /></div>
    <div class="orbital-depth">
      <div class="hero-orbit orbit-one" />
      <div class="hero-orbit orbit-two" />
      <div class="hero-orbit orbit-three" />
      <div class="horizon"><div class="horizon-grid" /></div>
      <div class="horizon-light" />
    </div>
    <div class="particle-depth">
      <i v-for="(particle, index) in particles" :key="index" class="space-particle"
        :style="{ left: particle.left, top: particle.top, width: particle.size, height: particle.size, animationDelay: particle.delay, animationDuration: particle.duration }" />
      <div class="shooting-star shooting-one" />
      <div class="shooting-star shooting-two" />
    </div>
  </div>
</template>

<style scoped>
.immersive-atmosphere { --parallax-y: 0px; mask-image: linear-gradient(to bottom, transparent, #000 12%, #000 68%, transparent 98%); }
.nebula-depth, .star-depth, .orbital-depth, .particle-depth { position: absolute; inset: -35px; }
.nebula-depth { transform: translate3d(0, calc(var(--parallax-y) * .85), 0); }
.star-depth { transform: translate3d(0, calc(var(--parallax-y) * .5), 0); }
.orbital-depth { transform: translate3d(0, calc(var(--parallax-y) * .3), 0); }
.particle-depth { transform: translate3d(0, calc(var(--parallax-y) * -.2), 0); }
.aurora { position: absolute; width: 72%; height: 290px; top: 38%; left: 10%; border-radius: 50%; filter: blur(48px); mix-blend-mode: screen; opacity: .6; animation: aurora-flow 13s ease-in-out infinite alternate; }
.aurora-violet { background: radial-gradient(ellipse, #9b32eeaa, #6b1baf55 45%, transparent 72%); transform: rotate(-22deg); }
.aurora-blue { width: 52%; left: 45%; top: 33%; background: radial-gradient(ellipse, #4855db85, #342c9d40 45%, transparent 72%); animation-duration: 17s; animation-delay: -8s; }
.aurora-rose { width: 48%; left: 4%; top: 48%; background: radial-gradient(ellipse, #d04aab75, #7e228f40 45%, transparent 72%); animation-duration: 19s; animation-delay: -12s; }
.horizon { position: absolute; top: 50%; left: -10%; width: 120%; height: 380px; perspective: 450px; opacity: .35; mask-image: radial-gradient(ellipse at 50% 35%, #000, transparent 68%); }
.horizon-grid { position: absolute; inset: -100% 0 0; background-image: linear-gradient(#b983ef30 1px, transparent 1px), linear-gradient(90deg, #b983ef30 1px, transparent 1px); background-size: 65px 65px; transform: rotateX(68deg); animation: grid-travel 9s linear infinite; }
.horizon-light { position: absolute; top: 58%; left: 13%; width: 74%; height: 95px; border-top: 1px solid #c293ff80; border-radius: 50%; box-shadow: 0 -12px 28px -17px #ddb8ff, 0 -35px 65px -40px #a65bff; opacity: .7; animation: horizon-breathe 7s ease-in-out infinite; }
.space-particle { position: absolute; display: block; border-radius: 50%; background: #eed6ff; box-shadow: 0 0 10px 2px #c383ff60; animation: particle-rise 12s ease-in-out infinite; }
.shooting-star { --tail-length: 115px; position: absolute; top: 31%; left: 68%; width: 3px; height: 3px; border-radius: 50%; background: #fff; box-shadow: 0 0 8px 1px #c68cff; opacity: 0; animation: meteor-pass 12s linear infinite; }
/* The head moves down-left; its tail extends behind it toward the upper-right. */
.shooting-star::before { content: ''; position: absolute; left: 1px; top: 1px; width: var(--tail-length); height: 1px; transform-origin: left center; transform: rotate(-32deg); background: linear-gradient(90deg, #e8d8ffcc, #b584ef55 25%, transparent); }
.shooting-two { --tail-length: 80px; top: 43%; left: 28%; animation-duration: 17s; animation-delay: -8s; }
.is-paused :deep(*) { animation-play-state: paused !important; }
@keyframes aurora-flow { from { translate: -6% 12%; rotate: -16deg; scale: .9 1; opacity: .4; } to { translate: 7% -12%; rotate: 12deg; scale: 1.15 1.25; opacity: .85; } }
@keyframes grid-travel { to { background-position: 0 65px; } }
@keyframes horizon-breathe { 0%, 100% { opacity: .35; transform: scaleX(.95); } 50% { opacity: .85; transform: scaleX(1.05); } }
@keyframes particle-rise { 0% { transform: translate3d(0, 35px, 0); opacity: 0; } 20% { opacity: .7; } 70% { opacity: .45; } 100% { transform: translate3d(25px, -95px, 0); opacity: 0; } }
@keyframes meteor-pass { 0%, 82% { opacity: 0; transform: translate3d(60px, -37.5px, 0); } 85%, 91% { opacity: .8; } 94%, 100% { opacity: 0; transform: translate3d(-300px, 187.5px, 0); } }
@media (max-width: 700px) { .aurora { filter: blur(30px); height: 230px; } .horizon { opacity: .22; } .space-particle:nth-child(n+25) { display: none; } }
@media (prefers-reduced-motion: reduce) { .nebula-depth, .star-depth, .orbital-depth, .particle-depth { transform: none; } .space-particle { opacity: .4; } .shooting-star { display: none; } }
</style>
