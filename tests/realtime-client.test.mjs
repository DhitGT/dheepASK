import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import ts from 'typescript'
import assert from 'node:assert/strict'
import { test } from 'node:test'

const source = readFileSync(new URL('../app/composables/useRealtimeUpdates.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText.replace('export function', 'function')
const create = new Function('watch','onMounted','onBeforeUnmount','window','document','crypto', `${compiled}\nreturn useRealtimeUpdates`)
const tick = () => new Promise(resolve => setTimeout(resolve, 130))
function harness(refresh, demo = false) {
  let mounted, unmount, watcher; let topic = 'question:private-question'
  const channels = []; const removed = []
  const window = new EventTarget(); const document = new EventTarget(); document.hidden = false
  const client = {
    channel(name, config) {
      const channel = { name, config,
        on(kind, filter, listener) { Object.assign(this, { kind, filter, listener }); return this },
        subscribe(callback) { this.status = callback; return this },
      }
      channels.push(channel); return channel
    },
    async removeChannel(channel) { removed.push(channel) },
  }
  const useUpdates = create((_source, callback) => { watcher = callback }, callback => { mounted = callback }, callback => { unmount = callback }, window, document, { randomUUID })
  useUpdates({ client: () => client, topic: () => topic, refresh, demo, storageKey: 'demo-data' })
  mounted()
  return { channels, removed, window, document, unmount, setTopic(value) { topic = value; watcher() } }
}

test('realtime subscribes to scoped metadata, reconciles joins, and drains events during an in-flight fetch', async () => {
  let count = 0; let release
  const app = harness(async () => { count++; if (count === 2) await new Promise(resolve => { release = resolve }) })
  try {
    assert.equal(app.channels[0].filter.table, 'realtime_updates')
    assert.equal(app.channels[0].filter.filter, 'topic=eq.question:private-question')
    assert.equal(app.channels[0].config.config.postgres_changes_options.wait, true)
    await tick(); assert.equal(count, 1)
    app.channels[0].status('SUBSCRIBED'); await tick(); assert.equal(count, 2)
    // Changes that arrive while loading must trigger a second fetch afterwards.
    app.channels[0].listener(); app.channels[0].listener(); release(); await tick()
    assert.equal(count, 3)
    app.setTopic('room:another-room')
    assert.equal(app.removed.length, 1)
    assert.equal(app.channels[1].filter.filter, 'topic=eq.room:another-room')
    await tick(); assert.equal(count, 4)
    app.channels[0].status('SUBSCRIBED'); await tick(); assert.equal(count, 4)
  } finally { app.unmount() }
  assert.equal(app.removed.length, 2)
  app.channels[1].listener(); await tick(); assert.equal(count, 4)
})

test('hidden tabs defer updates until visible and recover from failed fetches', async () => {
  let count = 0
  const app = harness(async () => { count++; if (count === 1) throw new Error('offline') })
  try {
    await tick(); assert.equal(count, 1)
    app.document.hidden = true; app.channels[0].listener(); await tick(); assert.equal(count, 1)
    app.document.hidden = false; app.document.dispatchEvent(new Event('visibilitychange'))
    await tick(); assert.equal(count, 2)
    app.window.dispatchEvent(new Event('online')); await tick(); assert.equal(count, 3)
  } finally { app.unmount() }
})

test('demo uses cross-tab storage events without creating a network subscription', async () => {
  let count = 0
  const app = harness(async () => { count++ }, true)
  try {
    await tick(); assert.equal(count, 1); assert.equal(app.channels.length, 0)
    app.window.dispatchEvent(Object.assign(new Event('storage'), { key: 'unrelated' }))
    await tick(); assert.equal(count, 1)
    app.window.dispatchEvent(Object.assign(new Event('storage'), { key: 'demo-data' }))
    await tick(); assert.equal(count, 2)
  } finally { app.unmount() }
})
