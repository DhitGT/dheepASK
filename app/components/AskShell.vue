<script setup lang="ts">
const props = defineProps<{ active?: string }>()
const emit = defineEmits<{ ask: []; navigate: [value: string] }>()
const { isDemo } = useAsk()
const mobileOpen = ref(false)
const topics = [{ name: 'Kehidupan', icon: 'life' }, { name: 'Hubungan', icon: 'heart' }, { name: 'Karier', icon: 'career' }, { name: 'Pendidikan', icon: 'education' }, { name: 'Teknologi', icon: 'tech' }, { name: 'Random', icon: 'random' }]
function navigate(value: string) { mobileOpen.value = false; emit('navigate', value) }
const menu = ref<HTMLElement>()
function outside(event: MouseEvent) { if (menu.value && !event.composedPath().includes(menu.value)) mobileOpen.value = false }
function key(event: KeyboardEvent) { if (event.key === 'Escape') mobileOpen.value = false }
onMounted(() => { document.addEventListener('click', outside); document.addEventListener('keydown', key) })
onBeforeUnmount(() => { document.removeEventListener('click', outside); document.removeEventListener('keydown', key) })
</script>
<template>
  <div class="app-layout">
    <a class="skip-link" href="#main-content">Lewati ke konten</a>
    <header class="site-header">
      <div ref="menu" class="site-navigation">
        <NuxtLink to="/" class="brand" aria-label="DheepASK beranda"><span class="brand-symbol"><AskIcon name="sparkles" :size="19" /></span>Dheep<span class="brand-accent">ASK</span><span class="brand-dot">.</span></NuxtLink>
        <nav class="desktop-nav" aria-label="Navigasi utama">
          <button :class="{ selected: props.active === 'Semua' }" @click="navigate('Semua')">Jelajahi</button>
          <button :class="{ selected: props.active === 'Tersimpan' }" @click="navigate('Tersimpan')">Tersimpan</button>
          <button :aria-expanded="mobileOpen" aria-controls="topic-menu" @click="mobileOpen = !mobileOpen">Topik<AskIcon name="down" :size="13" /></button>
        </nav>
        <div class="header-actions"><button class="primary-button" @click="emit('ask'); mobileOpen = false"><AskIcon name="plus" :size="16" /><span>Buat pertanyaan</span></button><button class="icon-button menu-toggle" aria-label="Buka navigasi" aria-controls="topic-menu" :aria-expanded="mobileOpen" @click="mobileOpen = !mobileOpen"><AskIcon :name="mobileOpen ? 'close' : 'menu'" /></button></div>
        <nav v-if="mobileOpen" id="topic-menu" class="navigation-popover" aria-label="Topik pertanyaan">
          <div class="mobile-nav-links"><button class="nav-item" @click="navigate('Semua')"><AskIcon name="compass" :size="18" />Jelajahi</button><button class="nav-item" @click="navigate('Tersimpan')"><AskIcon name="bookmark" :size="18" />Tersimpan</button></div>
          <p class="eyebrow px-3 pb-2 pt-3">TEMUKAN TOPIKMU</p><button v-for="topic in topics" :key="topic.name" class="nav-item topic-nav" :class="{ selected: props.active === topic.name }" @click="navigate(topic.name)"><AskIcon :name="topic.icon" :size="18" />{{ topic.name }}</button>
        </nav>
      </div>
    </header>
    <div id="main-content" class="main-layout"><slot /></div>
    <footer class="site-footer"><div><NuxtLink to="/" class="brand"><span class="brand-symbol"><AskIcon name="sparkles" :size="17" /></span>Dheep<span class="brand-accent">ASK</span><span class="brand-dot">.</span></NuxtLink><p>Pikiran bebas. Cerita tanpa nama.</p></div><div class="footer-right"><span class="footer-status"><span class="status-dot" />{{ isDemo ? 'Mode demo · tersimpan di browser' : 'Ruang untuk semua perspektif' }}</span><p>© {{ new Date().getFullYear() }} DheepASK. Selalu dengan empati.</p></div></footer>
  </div>
</template>
