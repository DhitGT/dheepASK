import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { test } from 'node:test'

test('public aggregate visits and unlimited reactions use protected atomic counters', async () => {
  const db = new PGlite()
  try {
    await db.exec('create role anon; create role authenticated; grant usage on schema public to anon,authenticated;')
    await db.exec(readFileSync(new URL('../supabase/migrations/006_site_engagement.sql', import.meta.url), 'utf8'))
    await db.exec('set role anon;')
    const call = async (sql, args = []) => (await db.query(sql, args)).rows[0].stats
    const get = () => call('select public.get_site_stats() as stats')
    const initial = await get()
    assert.equal(initial.hits, 0)
    assert.deepEqual(initial.reactions, { heart: 0, laugh: 0, fire: 0, clap: 0, wow: 0, love: 0 })
    assert.equal((await call('select public.record_site_hit() as stats')).hits, 1)
    assert.equal((await call('select public.record_site_hit() as stats')).hits, 2)
    const add = delta => call('select public.add_site_reactions($1::jsonb) as stats', [JSON.stringify(delta)])
    await add({ heart: 1000, fire: 5 })
    await add({ heart: 1000, love: 10 })
    const current = await add({ heart: 35, clap: 2, laugh: 3, wow: 4 })
    assert.equal(current.hits, 2); assert.equal(current.reactions.heart, 2035)
    assert.equal(current.reactions.fire, 5); assert.equal(current.reactions.love, 10)
    // Later invalid items must roll back earlier increments in the same batch.
    for (const delta of [{}, null, [], { heart: 1, wow: -1 }, { heart: 0 }, { heart: 1.5 }, { heart: '1' }, { heart: 1001 }, { hits: 1 }, { unknown: 1 }]) {
      await assert.rejects(add(delta), /reaction/i)
      assert.deepEqual(await get(), current)
    }
    await assert.rejects(db.query('select * from public.site_counters'), /permission denied/i)
    await assert.rejects(db.query("update public.site_counters set value = 123 where key = 'hits'"), /permission denied/i)
    await assert.rejects(db.query('delete from public.site_counters'), /permission denied/i)
    await db.exec('set role authenticated;')
    assert.equal((await add({ heart: 20 })).reactions.heart, 2055)
    assert.equal((await call('select public.record_site_hit() as stats')).hits, 3)
    await assert.rejects(db.query("insert into public.site_counters(key,value) values ('evil',1)"), /permission denied/i)
  } finally { await db.close() }
})
