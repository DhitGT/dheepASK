import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { emptySiteStats, SITE_REACTIONS, type ReactionKey, type SiteStats } from '~/utils/reactions'

export function useSiteEngagement() {
  const config = useRuntimeConfig()
  const isDemo = !config.public.supabaseUrl || !config.public.supabaseAnonKey
  const stats = ref<SiteStats>(emptySiteStats())
  const ready = ref(false); const error = ref('')
  const pending: Partial<Record<ReactionKey, number>> = {}
  let client: SupabaseClient | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  let sending = false; let recorded = false; let disposed = false; let revision = 0; let needsRefresh = false
  const storageKey = 'dheepask-site-stats-v1'
  const hasPending = () => Object.values(pending).some(value => value && value > 0)
  async function rpc(name: 'get_site_stats' | 'record_site_hit' | 'add_site_reactions', args = {}) {
    client ||= createClient(String(config.public.supabaseUrl), String(config.public.supabaseAnonKey), {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'dheepask-site-public-auth' },
      // Small reaction batches can finish when a visitor navigates away.
      global: { fetch: (input, init) => fetch(input, { ...init, keepalive: true }) },
    })
    const result = await client.rpc(name, args)
    if (result.error) throw result.error
    return result.data as SiteStats
  }
  function readDemo() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || 'null')
      if (!saved) return
      const next = emptySiteStats()
      if (Number.isSafeInteger(saved.hits) && saved.hits >= 0) next.hits = saved.hits
      for (const { key } of SITE_REACTIONS) if (Number.isSafeInteger(saved.reactions?.[key]) && saved.reactions[key] >= 0) next.reactions[key] = saved.reactions[key]
      stats.value = next
    } catch { /* Invalid demo data starts from zero. */ }
  }
  function persistDemo() { localStorage.setItem(storageKey, JSON.stringify(stats.value)) }
  async function start() {
    error.value = ''
    try {
      if (isDemo) { readDemo(); if (!recorded) stats.value.hits++; persistDemo() }
      else stats.value = await rpc(recorded ? 'get_site_stats' : 'record_site_hit')
      recorded = true; ready.value = true
    } catch { error.value = 'Angka kunjungan dan reaksi belum bisa dimuat. Periksa koneksi lalu coba lagi.' }
  }
  async function flush() {
    clearTimeout(timer); timer = undefined
    if (sending || !hasPending()) return
    sending = true; error.value = ''
    const batch: Partial<Record<ReactionKey, number>> = {}
    for (const { key } of SITE_REACTIONS) {
      if (pending[key]) { batch[key] = Math.min(pending[key]!, 1000); pending[key]! -= batch[key]! }
    }
    let succeeded = false
    try {
      const saved = await rpc('add_site_reactions', { delta: batch })
      for (const { key } of SITE_REACTIONS) saved.reactions[key] += pending[key] || 0
      stats.value = saved; succeeded = true
    } catch {
      for (const { key } of SITE_REACTIONS) pending[key] = (pending[key] || 0) + (batch[key] || 0)
      error.value = 'Reaksi belum tersimpan. Periksa koneksi lalu coba lagi.'
    } finally {
      sending = false
      if (succeeded && hasPending()) { if (disposed) void flush(); else timer = setTimeout(flush, 400) }
      else if (succeeded && needsRefresh && !disposed) void refresh()
    }
  }
  function react(key: ReactionKey) {
    if (!ready.value) return
    revision++; stats.value.reactions[key]++
    if (isDemo) {
      if (!timer) timer = setTimeout(() => {
        timer = undefined
        try { persistDemo(); error.value = '' }
        catch { error.value = 'Reaksi belum tersimpan di browser. Periksa pengaturan penyimpanan.' }
      }, 100)
    } else { pending[key] = (pending[key] || 0) + 1; if (!sending && !timer) timer = setTimeout(flush, 400) }
  }
  async function refresh() {
    if (isDemo || disposed || !ready.value || document.hidden || error.value) return
    if (sending || hasPending()) { needsRefresh = true; return }
    needsRefresh = false
    const before = revision
    try { const saved = await rpc('get_site_stats'); if (!disposed && revision === before && !sending && !hasPending()) stats.value = saved }
    catch { /* Keep the last successful totals during a polling failure. */ }
  }
  async function retry() {
    if (!ready.value) return start()
    if (isDemo) { try { persistDemo(); error.value = '' } catch { /* Keep the storage error. */ } }
    else if (hasPending()) await flush()
    else await start()
  }
  function pagehide() {
    if (!isDemo) void flush()
    else if (timer) { clearTimeout(timer); timer = undefined; try { persistDemo() } catch { /* Keep local totals if storage is unavailable. */ } }
  }
  function storage(event: StorageEvent) { if (isDemo && event.key === storageKey) readDemo() }
  useRealtimeUpdates({ client: () => client!, topic: () => ready.value ? 'site' : null, refresh, demo: isDemo })
  onMounted(() => { void start(); window.addEventListener('pagehide', pagehide); window.addEventListener('storage', storage) })
  onBeforeUnmount(() => { disposed = true; pagehide(); clearTimeout(timer); window.removeEventListener('pagehide', pagehide); window.removeEventListener('storage', storage) })
  return { stats, ready, error, isDemo, react, retry }
}
