<script setup lang="ts">
const { questions, bookmarks, busy, error, load, watchUpdates } = useAsk();
const route = useRoute();
const active = ref(String(route.query.topic || "Semua"));
const search = ref("");
const tab = ref("Terbaru");
const showModal = ref(false);
const topics = [
  "Semua",
  "Kehidupan",
  "Hubungan",
  "Karier",
  "Pendidikan",
  "Teknologi",
  "Random",
];
const publicQuestions = computed(() => questions.value.filter(q => !q.room_id));
const filtered = computed(() => {
  let result = publicQuestions.value.filter(
    (q) =>
      (active.value === "Semua" ||
        (active.value === "Tersimpan"
          ? bookmarks.value.includes(q.id)
          : q.category === active.value)) &&
      `${q.title} ${q.body}`.toLowerCase().includes(search.value.toLowerCase()),
  );
  if (tab.value === "Belum dijawab")
    result = result.filter((q) => q.answer_count === 0);
  return [...result].sort((a, b) =>
    tab.value === "Ramai dibahas"
      ? b.answer_count - a.answer_count
      : Date.parse(b.created_at) - Date.parse(a.created_at),
  );
});
const trending = computed(() =>
  [...publicQuestions.value]
    .sort((a, b) => b.answer_count - a.answer_count)
    .slice(0, 3),
);
onMounted(load);
watchUpdates(() => 'feed', load);
function created(id: string) {
  showModal.value = false;
  navigateTo(`/${id}`);
}
function choose(topic: string) {
  active.value = topic;
  navigateTo(
    { path: "/", query: topic === "Semua" ? {} : { topic } },
    { replace: true },
  );
}
watch(
  () => route.query.topic,
  (value) => {
    active.value = String(value || "Semua");
  },
);
</script>
<template>
  <AskShell :active="active" @ask="showModal = true" @navigate="choose">
    <main class="page-content">
      <section class="hero">
        <HeroAtmosphere />
        <div class="hero-copy">
          <span class="hero-badge"
            ><span class="badge-spark"
              ><AskIcon name="sparkles" :size="12" /></span
            >Anonim. Tanpa perlu akun.</span
          >
          <h1>
            Bebas bertanya.<br /><span class="gradient-text"
              >Jujur menjawab.</span
            >
          </h1>
          <p>
            Ruang untuk pertanyaan yang belum terucap.<br
              class="hidden sm:block"
            />
            Temukan perspektif baru, tanpa membuka identitasmu.
          </p>
          <div class="hero-actions">
            <button class="hero-button" @click="showModal = true">
              Mulai bertanya<AskIcon name="arrow" :size="17" /></button
            ><a href="#explore" class="hero-secondary"
              >Jelajahi percakapan<AskIcon name="right" :size="16"
            /></a>
          </div>
          <span class="hero-footnote"
            ><AskIcon name="shield" :size="13" />Tanpa nama. Tanpa
            penghakiman.</span
          >
          <HeroReactions />
        </div>
      </section>
      <section class="community-card mb-6 flex flex-wrap items-center justify-between gap-4" aria-label="Ruang private"><div><h2 class="text-lg font-semibold">Punya konteks sendiri?</h2><p class="mt-2 text-xs leading-6 text-muted">Buat ruang untuk “Tanya apa aja tentang gw!” dan undang lewat tautan.</p></div><NuxtLink to="/rooms/new" class="primary-button"><AskIcon name="shield" :size="16" />Buat ruang private</NuxtLink></section>
      <section id="explore" class="explore-panel" aria-label="Ruang percakapan">
        <div class="panel-chrome">
          <div class="flex items-center gap-3">
            <span class="window-dots" aria-hidden="true"><i /><i /><i /></span
            ><span>Ruang percakapan</span>
          </div>
          <span class="privacy-pill"
            ><AskIcon name="shield" :size="13" />Selalu anonim</span
          >
        </div>
        <OpenQuestion />
        <div class="content-grid">
          <section class="feed-section" aria-label="Daftar pertanyaan">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h2 class="text-[22px] font-bold tracking-tight">
                  {{
                    active === "Tersimpan"
                      ? "Pertanyaan tersimpan"
                      : "Jelajahi pertanyaan"
                  }}
                </h2>
                <p class="mt-1.5 text-xs text-muted">
                  Mungkin ada yang sedang kamu pikirkan juga.
                </p>
              </div>
              <span class="feed-count">{{ filtered.length }} pertanyaan</span>
            </div>
            <div class="search-field">
              <AskIcon name="search" :size="18" /><input
                v-model="search"
                aria-label="Cari pertanyaan"
                placeholder="Cari pertanyaan atau sesuatu yang kamu pikirkan…"
              /><button
                v-if="search"
                aria-label="Hapus pencarian"
                @click="search = ''"
              >
                <AskIcon name="close" :size="16" /></button
              ><span v-else class="search-hint">Cari</span>
            </div>
            <div class="topic-chips">
              <button
                v-for="topic in topics"
                :key="topic"
                :class="{ active: active === topic }"
                @click="choose(topic)"
              >
                {{ topic === "Semua" ? "✦ Semua topik" : topic }}
              </button>
            </div>
            <div
              class="feed-tabs"
              role="tablist"
              aria-label="Urutkan pertanyaan"
            >
              <button
                v-for="item in ['Terbaru', 'Ramai dibahas', 'Belum dijawab']"
                :key="item"
                role="tab"
                :aria-selected="tab === item"
                :class="{ active: tab === item }"
                @click="tab = item"
              >
                {{ item }}</button
              ><button
                class="ml-auto refresh-button"
                aria-label="Muat ulang pertanyaan"
                :disabled="busy"
                @click="load"
              >
                <AskIcon name="refresh" :size="15" />
              </button>
            </div>
            <div v-if="error" role="alert" class="error-box mb-4">
              {{ error
              }}<button class="ml-2 underline" @click="load">Coba lagi</button>
            </div>
            <div
              v-if="busy && !questions.length"
              class="space-y-4"
              aria-label="Memuat pertanyaan"
            >
              <div
                v-for="n in 3"
                :key="n"
                class="feed-skeleton h-52 animate-pulse rounded-2xl"
              />
            </div>
            <div v-else-if="!filtered.length && !error" class="empty-state">
              <AskIcon
                :name="active === 'Tersimpan' ? 'bookmark' : 'message'"
                :size="35"
              />
              <h3>
                {{
                  active === "Tersimpan"
                    ? "Simpan cerita yang berarti."
                    : "Belum ada pertanyaan di sini."
                }}
              </h3>
              <p>
                {{
                  active === "Tersimpan"
                    ? "Klik ikon bookmark pada pertanyaan untuk membacanya lagi nanti."
                    : "Coba kata kunci lain, atau mulai percakapan pertama."
                }}
              </p>
              <button class="primary-button mt-5" @click="showModal = true">
                <AskIcon name="plus" :size="16" />Buat pertanyaan
              </button>
            </div>
            <div v-else class="space-y-4">
              <QuestionCard
                v-for="question in filtered"
                :key="question.id"
                :question="question"
              />
            </div>
            <p v-if="filtered.length" class="feed-footer">
              Kamu sudah sampai di sini. Mungkin sekarang giliranmu bercerita?
              <span>✦</span>
            </p>
          </section>
          <aside class="right-rail">
            <section class="community-card">
              <div class="flex items-center gap-2">
                <span class="community-icon"
                  ><AskIcon name="sparkles" :size="17"
                /></span>
                <h3 class="font-semibold text-sm">Sedikit tentang ruang ini</h3>
              </div>
              <p class="mt-4 text-xs leading-[1.9] text-muted">
                Tempat untuk pertanyaan yang belum berani kamu ucapkan. Dan
                jawaban yang mungkin perlu seseorang dengar.
              </p>
              <div class="community-stats">
                <div>
                  <strong>{{ publicQuestions.length }}</strong
                  ><span>Pertanyaan</span>
                </div>
                <div>
                  <strong>{{
                    publicQuestions.reduce((sum, q) => sum + q.answer_count, 0)
                  }}</strong
                  ><span>Jawaban</span>
                </div>
                <div><strong>∞</strong><span>Perspektif</span></div>
              </div>
              <div class="flex items-center gap-2 text-[11px] text-accent">
                <span class="status-dot" />Satu pertanyaan, banyak sudut
                pandang.
              </div>
            </section>
            <section class="rail-section">
              <h3 class="flex items-center gap-2 text-sm font-semibold">
                <span class="text-orange-400">↗</span> Sedang jadi obrolan
              </h3>
              <NuxtLink
                v-for="(question, index) in trending"
                :key="question.id"
                :to="`/${question.short_code}`"
                class="trending-item"
                ><span class="trend-number">0{{ index + 1 }}</span>
                <div>
                  <h4>{{ question.title }}</h4>
                  <span
                    >{{ question.answer_count }} jawaban ·
                    {{ question.category }}</span
                  >
                </div></NuxtLink
              >
            </section>
            <section class="kindness-card">
              <div class="kindness-art" aria-hidden="true">✳</div>
              <h3>Di balik anonim,<br />tetap ada manusia.</h3>
              <p>
                Jaga kata-kata, hargai perbedaan.<br />Jawaban kecilmu bisa
                berarti besar<br />untuk seseorang.
              </p>
              <span
                class="mt-5 inline-flex items-center gap-2 text-xs font-medium"
                ><AskIcon name="heart" :size="14" />Bawa empati, tinggalkan
                penghakiman.</span
              >
            </section>
            <div class="rail-note">
              <AskIcon name="shield" :size="16" />
              <p>
                Nama dan identitasmu tidak ditampilkan pada pertanyaan atau
                jawaban.
              </p>
            </div>
          </aside>
        </div>
      </section>
      <section class="closing-cta">
        <span class="eyebrow">SETIAP CERITA PUNYA TEMPAT</span>
        <h2>
          Satu pertanyaan.<br /><span class="gradient-text"
            >Perspektif tak terbatas.</span
          >
        </h2>
        <p>
          Kadang, jawaban yang kamu cari dimulai dari keberanian untuk bertanya.
        </p>
        <button class="hero-button" @click="showModal = true">
          Bagikan pikiranmu<AskIcon name="arrow" :size="17" /></button
        ><span class="hero-footnote"
          ><AskIcon name="heart" :size="13" />Bawa empati ke setiap
          percakapan.</span
        >
      </section>
    </main>
    <AskModal v-if="showModal" @close="showModal = false" @created="created" />
  </AskShell>
</template>
