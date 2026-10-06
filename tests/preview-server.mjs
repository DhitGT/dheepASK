import { spawn } from 'node:child_process'
import { resolve } from 'node:path'

// Verify production assets without Vite hot reload or shared dev-server caches.
const env = { ...process.env, NITRO_PRESET: 'node-server', ASK_TEST_BUILD_DIR: '.nuxt-test', NUXT_PUBLIC_SUPABASE_URL: '', NUXT_PUBLIC_SUPABASE_ANON_KEY: '', PORT: '3107', HOST: '127.0.0.1' }
let child
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { child?.kill(); process.exit(0) })
child = spawn(process.execPath, [resolve('node_modules/nuxt/bin/nuxt.mjs'), 'build', '--dotenv', 'tests/demo.env'], { env, stdio: 'inherit' })
const code = await new Promise((done, reject) => { child.once('error', reject); child.once('exit', done) })
if (code !== 0) process.exit(typeof code === 'number' ? code : 1)
child = spawn(process.execPath, [resolve('.output/server/index.mjs')], { env, stdio: 'inherit' })
child.once('error', error => { console.error(error.message); process.exit(1) })
child.once('exit', code => process.exit(code ?? 1))
