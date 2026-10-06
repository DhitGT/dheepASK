<script setup lang="ts">
const props = defineProps<{ active?: string }>()
const emit = defineEmits<{ ask: []; navigate: [value: string] }>()
const { isDemo } = useAsk()
const mobileOpen = ref(false)
const topics = [{ name: 'Kehidupan', icon: 'life' }, { name: 'Hubungan', icon: 'heart' }, { name: 'Karier', icon: 'career' }, { name: 'Pendidikan', icon: 'education' }, { name: 'Teknologi', icon: 'tech' }, { name: 'Random', icon: 'random' }]
function navigate(value: string) { mobileOpen.value = false; emit('navigate', value) }
</script>
<template>
  <div class="app-layout">
    <header class="mobile-header"><NuxtLink to="/" class="brand"><span class="brand-symbol"><AskIcon name="message" :size="23" /></span>Dheep<span class="text-accent">ASK</span><span class="brand-dot">.</span></NuxtLink><button class="icon-button" aria-label="Buka navigasi" :aria-expanded="mobileOpen" @click="mobileOpen = !mobileOpen"><AskIcon :name="mobileOpen ? 'close' : 'menu'" /></button></header>
    <aside class="sidebar" :class="{ 'mobile-open': mobileOpen }">
      <NuxtLink to="/" class="brand"><span class="brand-symbol"><AskIcon name="message" :size="23" /></span>Dheep<span class="text-accent">ASK</span><span class="brand-dot">.</span></NuxtLink>
      <p class="sidebar-tagline">Pikiran bebas. Cerita tanpa nama.</p>
      <button class="primary-button sidebar-ask" @click="emit('ask'); mobileOpen = false"><AskIcon name="plus" :size="19" />Buat pertanyaan</button>
      <nav aria-label="Navigasi utama" class="mt-8 space-y-1"><button class="nav-item" :class="{ selected: props.active === 'Semua' }" @click="navigate('Semua')"><AskIcon name="compass" />Jelajahi<span class="ml-auto text-lg">›</span></button><button class="nav-item" :class="{ selected: props.active === 'Tersimpan' }" @click="navigate('Tersimpan')"><AskIcon name="bookmark" />Tersimpan</button></nav>
      <p class="eyebrow mt-9 mb-4 pl-3">TEMUKAN TOPIKMU</p>
      <nav class="space-y-1" aria-label="Topik pertanyaan"><button v-for="topic in topics" :key="topic.name" class="nav-item topic-nav" :class="{ selected: props.active === topic.name }" @click="navigate(topic.name)"><AskIcon :name="topic.icon" :size="18" />{{ topic.name }}</button></nav>
      <div class="sidebar-bottom"><div class="flex items-center gap-2 text-xs font-semibold"><span class="status-dot" />{{ isDemo ? 'Mode demo aktif' : 'Terhubung ke Supabase' }}</div><p class="mt-2 text-[11px] leading-5 text-muted">{{ isDemo ? 'Coba bertanya dan menjawab. Data demo tersimpan di browser ini.' : 'Berbagi tanpa menampilkan identitas. Tidak perlu akun pribadi.' }}</p><div class="mt-5 border-t border-line pt-4 text-[10px] text-muted">© {{ new Date().getFullYear() }} DheepASK <span class="float-right">Made for your thoughts.</span></div></div>
    </aside>
    <div class="main-layout"><slot /></div>
  </div>
</template>
