import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'

// Only subscribe to safe invalidation metadata. Content is fetched through RLS.
export function useRealtimeUpdates(options: {
  client: () => SupabaseClient
  topic: () => string | null
  refresh: () => Promise<unknown>
  demo?: boolean
  storageKey?: string
}) {
  let channel: RealtimeChannel | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  let poll: ReturnType<typeof setInterval> | undefined
  let mounted = false; let disposed = false; let running = false; let dirty = false
  let generation = 0
  async function drain() {
    timer = undefined
    if (disposed || running || !options.topic() || document.hidden) return
    running = true
    try {
      while (dirty && !disposed && options.topic() && !document.hidden) {
        dirty = false
        try { await options.refresh() } catch { /* Reconcile again on reconnect or the next interval. */ }
      }
    } finally { running = false }
  }
  function schedule() {
    if (disposed) return
    dirty = true
    if (!timer && !running) timer = setTimeout(drain, 100)
  }
  function connect() {
    generation++
    const current = generation
    if (channel) { void options.client().removeChannel(channel); channel = undefined }
    const topic = options.topic()
    if (!topic || options.demo) return
    channel = options.client().channel(`updates:${topic}:${crypto.randomUUID()}`, {
      config: { postgres_changes_options: { wait: true } },
    }).on('postgres_changes', { event: '*', schema: 'public', table: 'realtime_updates', filter: `topic=eq.${topic}` }, schedule)
      .subscribe(status => { if (current === generation && status === 'SUBSCRIBED') schedule() })
  }
  function storage(event: StorageEvent) { if (options.demo && event.key === options.storageKey) schedule() }
  function visible() { if (!document.hidden) schedule() }
  watch(options.topic, () => { if (mounted) { connect(); schedule() } })
  onMounted(() => {
    mounted = true; connect(); schedule()
    // Also recovers missed events, expired membership and unavailable replication.
    poll = setInterval(schedule, 30000)
    window.addEventListener('storage', storage)
    window.addEventListener('online', schedule)
    document.addEventListener('visibilitychange', visible)
  })
  onBeforeUnmount(() => {
    disposed = true; generation++; clearTimeout(timer); clearInterval(poll)
    if (channel) void options.client().removeChannel(channel)
    window.removeEventListener('storage', storage); window.removeEventListener('online', schedule)
    document.removeEventListener('visibilitychange', visible)
  })
}
