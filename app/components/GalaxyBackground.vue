<script setup lang="ts">
const background = ref<HTMLElement>()
// Seeded positions keep the sky identical during server rendering and hydration.
let seed = 7319
function random() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646 }
const stars = Array.from({ length: 112 }, (_, index) => ({
  x: `${(random() * 100).toFixed(2)}%`, y: `${(random() * 100).toFixed(2)}%`,
  size: `${index % 9 === 0 ? 2.5 : index % 3 === 0 ? 1.5 : 1}px`,
  opacity: (0.22 + random() * 0.48).toFixed(2),
  duration: `${(6 + random() * 9).toFixed(2)}s`, delay: `${(-random() * 24).toFixed(2)}s`,
}))
// Uneven gaps keep neighboring constellations far apart, including across the wrap.
const zodiacGaps = Array.from({ length: 12 }, () => 480 + random() * 320)
const zodiacSpan = zodiacGaps.reduce((total, gap) => total + gap, 0)
let zodiacOffset = random() * zodiacSpan
const zodiacPositions = zodiacGaps.map(gap => {
  zodiacOffset = (zodiacOffset + gap) % zodiacSpan
  return {
    x: `${(zodiacOffset / zodiacSpan * 100).toFixed(2)}%`,
    y: `${(9 + random() * 61).toFixed(2)}%`,
    rotation: `${(-25 + random() * 50).toFixed(2)}deg`,
    size: `${(140 + random() * 45).toFixed(2)}px`,
    delay: `${(-random() * 20).toFixed(2)}s`,
  }
})
// Shuffle which zodiac occupies each position rather than displaying calendar order.
for (let index = zodiacPositions.length - 1; index > 0; index--) {
  const other = Math.floor(random() * (index + 1))
  ;[zodiacPositions[index], zodiacPositions[other]] = [zodiacPositions[other]!, zodiacPositions[index]!]
}
const constellations = [
  { name: 'Aries', path: 'M28,105 L72,62 L112,54 L139,75', points: [[28,105],[72,62],[112,54],[139,75]] },
  { name: 'Taurus', path: 'M20,25 L65,75 L88,100 L119,74 L153,27 M65,75 L110,54 L119,74 M88,100 L65,120', points: [[20,25],[65,75],[88,100],[119,74],[153,27],[110,54],[65,120]] },
  { name: 'Gemini', path: 'M45,24 L57,56 L50,88 L30,122 M57,56 L91,53 M105,22 L91,53 L105,89 L126,119 M50,88 L75,123 M105,89 L93,124', points: [[45,24],[57,56],[50,88],[30,122],[91,53],[105,22],[105,89],[126,119],[75,123],[93,124]] },
  { name: 'Cancer', path: 'M87,20 L77,64 L89,90 L119,127 M77,64 L34,110', points: [[87,20],[77,64],[89,90],[119,127],[34,110]] },
  { name: 'Leo', path: 'M143,35 L120,22 L100,40 L112,64 L110,103 L37,110 L20,78 L112,64 M20,78 L110,103', points: [[143,35],[120,22],[100,40],[112,64],[110,103],[37,110],[20,78]] },
  { name: 'Virgo', path: 'M25,40 L61,67 L83,59 L115,84 L142,126 M61,67 L48,105 M83,59 L112,30 L140,40 M115,84 L96,116', points: [[25,40],[61,67],[83,59],[115,84],[142,126],[48,105],[112,30],[140,40],[96,116]] },
  { name: 'Libra', path: 'M84,26 L31,70 L76,100 L136,61 L84,26 M76,100 L53,133 M136,61 L145,113', points: [[84,26],[31,70],[76,100],[136,61],[53,133],[145,113]] },
  { name: 'Scorpio', path: 'M23,20 L48,42 L62,65 L68,92 L91,123 L119,132 L144,110 L147,86 L132,77 M48,42 L21,57 M48,42 L59,25', points: [[23,20],[48,42],[62,65],[68,92],[91,123],[119,132],[144,110],[147,86],[132,77],[21,57],[59,25]] },
  { name: 'Sagittarius', path: 'M23,77 L50,50 L80,24 L103,53 L139,48 L146,89 L112,103 L90,123 L47,108 L50,50 M50,50 L103,53 L112,103 L47,108 M23,77 L47,108', points: [[23,77],[50,50],[80,24],[103,53],[139,48],[146,89],[112,103],[90,123],[47,108]] },
  { name: 'Capricorn', path: 'M22,37 L60,62 L108,47 L148,24 L126,82 L91,121 L63,112 L39,90 L22,37 M108,47 L126,82', points: [[22,37],[60,62],[108,47],[148,24],[126,82],[91,121],[63,112],[39,90]] },
  { name: 'Aquarius', path: 'M23,35 L57,56 L84,40 L100,63 L135,50 M100,63 L86,87 L103,113 L87,135 M86,87 L49,105 L28,123 M103,113 L141,127', points: [[23,35],[57,56],[84,40],[100,63],[135,50],[86,87],[103,113],[87,135],[49,105],[28,123],[141,127]] },
  { name: 'Pisces', path: 'M25,33 L51,25 L65,48 L44,64 L25,33 M44,64 L69,91 L91,121 L116,95 L131,66 M131,66 L116,43 L146,35 L157,57 L131,66', points: [[25,33],[51,25],[65,48],[44,64],[69,91],[91,121],[116,95],[131,66],[116,43],[146,35],[157,57]] },
].map((constellation, index) => ({ ...constellation, ...zodiacPositions[index]! }))
const meteors = [
  { x: '87%', y: '8%', duration: '9s', delay: '-6s', length: '150px' },
  { x: '38%', y: '20%', duration: '11s', delay: '-3s', length: '110px' },
  { x: '98%', y: '56%', duration: '13s', delay: '-9s', length: '130px' },
  { x: '62%', y: '38%', duration: '12s', delay: '-1s', length: '120px' },
  { x: '46%', y: '72%', duration: '15s', delay: '-7s', length: '100px' },
  { x: '78%', y: '84%', duration: '17s', delay: '-12s', length: '140px' },
]
onMounted(() => {
  const pause = () => background.value?.classList.toggle('galaxy-paused', document.hidden)
  document.addEventListener('visibilitychange', pause)
  pause()
  onBeforeUnmount(() => document.removeEventListener('visibilitychange', pause))
})
</script>

<template>
  <div ref="background" class="galaxy-background" aria-hidden="true">
    <div class="galaxy-nebula" />
    <div class="galaxy-dust" />
    <div class="galaxy-starfield">
      <!-- Identical sky tiles wrap horizontally without a jump at the loop boundary. -->
      <div v-for="tile in 2" :key="tile" class="galaxy-star-tile" :style="{ left: `${(tile - 1) * 50}%` }">
        <i v-for="(star, index) in stars" :key="index" class="galaxy-star galaxy-twinkle"
          :style="{ left: star.x, top: star.y, width: star.size, height: star.size, '--star-opacity': star.opacity, animationDuration: star.duration, animationDelay: star.delay }" />
      </div>
    </div>
    <div class="galaxy-zodiac-field">
      <div v-for="tile in 2" :key="tile" class="galaxy-zodiac-tile" :style="{ left: `${(tile - 1) * 50}%` }">
        <svg v-for="constellation in constellations" :key="constellation.name" class="galaxy-constellation" :data-zodiac="constellation.name" viewBox="0 0 170 165" fill="none"
          :style="{ left: constellation.x, top: constellation.y, width: constellation.size, transform: `rotate(${constellation.rotation})`, animationDelay: constellation.delay }">
          <path :d="constellation.path" />
          <circle v-for="(point, index) in constellation.points" :key="index" :cx="point[0]" :cy="point[1]" r="1.8" />
        </svg>
      </div>
    </div>
    <div v-for="(meteor, index) in meteors" :key="index" class="galaxy-meteor"
      :style="{ left: meteor.x, top: meteor.y, '--meteor-length': meteor.length, animationDuration: meteor.duration, animationDelay: meteor.delay }" />
  </div>
</template>

<style scoped>
.galaxy-background { position: fixed; inset: 0; z-index: -1; overflow: hidden; pointer-events: none; user-select: none; background: #030204; }
.galaxy-nebula { position: absolute; inset: -8%; background: radial-gradient(ellipse at 5% 28%, #56298840, transparent 42%), radial-gradient(ellipse at 94% 65%, #244f8740, transparent 38%), radial-gradient(ellipse at 50% 108%, #70296330, transparent 42%); animation: galaxy-nebula-flow 55s ease-in-out infinite alternate; }
.galaxy-starfield { position: absolute; top: 0; left: 0; width: 200%; height: 100%; animation: galaxy-orbit 160s linear infinite; }
.galaxy-star-tile { position: absolute; top: 0; width: 50%; height: 100%; }
.galaxy-dust { position: absolute; inset: 0; opacity: .28; background-image: radial-gradient(circle, #e3d2ff 0 .6px, transparent 1px), radial-gradient(circle, #91b7e0 0 .5px, transparent .9px); background-size: 137px 173px, 211px 127px; background-position: 23px 47px, 111px 19px; animation: galaxy-dust-orbit 70s linear infinite; }
.galaxy-star { position: absolute; display: block; border-radius: 50%; background: #e9ddff; opacity: var(--star-opacity); }
.galaxy-twinkle { box-shadow: 0 0 6px #bc9bff70; animation: galaxy-twinkle 8s ease-in-out infinite; }
.galaxy-zodiac-field { --zodiac-width: max(400vw, 7600px); position: absolute; top: 0; left: 0; width: calc(var(--zodiac-width) * 2); height: 100%; animation: galaxy-orbit 840s linear infinite; }
.galaxy-zodiac-tile { position: absolute; top: 0; width: 50%; height: 100%; }
.galaxy-constellation { position: absolute; width: clamp(140px, 14vw, 210px); opacity: .55; animation: galaxy-constellation-glimmer 13s ease-in-out infinite; }
.galaxy-constellation path { stroke: #c6b0ee; stroke-width: .8; stroke-opacity: .4; stroke-linecap: round; stroke-linejoin: round; }
.galaxy-constellation circle { fill: #e9ddff; fill-opacity: .85; }
.galaxy-meteor { position: absolute; width: 3px; height: 3px; border-radius: 50%; background: #f3eaff; box-shadow: 0 0 8px #c3a0ff; opacity: 0; animation: galaxy-meteor 23s linear infinite; }
.galaxy-meteor::after { content: ''; position: absolute; left: 1px; top: 1px; width: var(--meteor-length); height: 1px; transform-origin: left center; transform: rotate(-32deg); background: linear-gradient(90deg, #dfceffa6, #aabbf533 40%, transparent); }
.galaxy-paused *, .galaxy-paused *::after { animation-play-state: paused !important; }
@keyframes galaxy-twinkle { 0%, 100% { opacity: calc(var(--star-opacity) * .45); transform: scale(.8); } 50% { opacity: var(--star-opacity); transform: scale(1.2); } }
@keyframes galaxy-orbit { from { transform: translate3d(0, 0, 0); } to { transform: translate3d(-50%, 0, 0); } }
@keyframes galaxy-dust-orbit { from { background-position: 23px 47px, 111px 19px; } to { background-position: -114px 47px, -100px 19px; } }
@keyframes galaxy-nebula-flow { from { transform: translate3d(-1.5%, 1%, 0) scale(1); opacity: .65; } to { transform: translate3d(2%, -2%, 0) scale(1.06); opacity: 1; } }
@keyframes galaxy-constellation-glimmer { 0%, 100% { opacity: .3; } 50% { opacity: .65; } }
@keyframes galaxy-meteor { 0%, 88% { opacity: 0; transform: translate3d(50px, -31.25px, 0); } 89% { opacity: .7; } 92% { opacity: .45; } 94%, 100% { opacity: 0; transform: translate3d(-430px, 268.75px, 0); } }
@media (max-width: 700px) { .galaxy-star:nth-of-type(n+65) { display: none; } .galaxy-dust { opacity: .18; } .galaxy-meteor:nth-last-child(1) { display: none; } }
@media (prefers-reduced-motion: reduce) { .galaxy-nebula, .galaxy-starfield, .galaxy-dust, .galaxy-zodiac-field, .galaxy-constellation { animation: none; } .galaxy-starfield, .galaxy-zodiac-field, .galaxy-nebula { transform: none; } .galaxy-twinkle { animation: none; transform: none; opacity: var(--star-opacity); } .galaxy-meteor { display: none; } }
</style>
