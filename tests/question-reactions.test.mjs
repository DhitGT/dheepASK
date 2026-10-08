import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { test } from 'node:test'

test('question reactions aggregate independently, preserve identity privacy and restrict private rooms', async () => {
  const db = new PGlite()
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema public,auth to anon,authenticated;`)
    for (const file of ['001_initial.sql','002_short_codes.sql','003_answer_threads.sql','004_private_rooms.sql','005_short_room_links.sql','006_site_engagement.sql','007_realtime_updates.sql','008_answer_reactions.sql','009_discord_reactions.sql','010_question_reactions.sql']) {
      await db.exec(readFileSync(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8'))
    }
    const users = (await db.query('insert into auth.users select gen_random_uuid() from generate_series(1,3) returning id')).rows.map(row => row.id)
    const session = id => db.exec(`reset role; set role authenticated; set request.jwt.claim.sub='${id}';`)
    const age = () => db.exec(`reset role; update public.questions set created_at=now()-interval '1 minute'; update public.answers set created_at=now()-interval '1 minute'; update public.rooms set created_at=now()-interval '1 minute';`)
    const get = async ids => (await db.query('select public.get_question_reactions($1) as stats',[ids])).rows[0].stats
    const set = async (target, emoji, selected=true) => (await db.query('select public.set_question_emoji_reaction($1,$2,$3) as stats',[target,emoji,selected])).rows[0].stats
    const revision = async topic => (await db.query('select revision from public.realtime_updates where topic=$1',[topic])).rows[0]?.revision
    await session(users[0])
    const q = (await db.query("insert into public.questions(title,category,author_id) values ('Pertanyaan dengan reaction','Random',auth.uid()) returning id")).rows[0].id
    const before = await revision('feed')
    assert.deepEqual(await set(q,'🐈'), { counts: { '🐈': 1 }, mine: ['🐈'] })
    assert.deepEqual(await set(q,'🐈'), { counts: { '🐈': 1 }, mine: ['🐈'] })
    await set(q,'👍🏽')
    assert.ok(await revision('feed') > before)
    await session(users[1])
    assert.deepEqual(await set(q,'🐈'), { counts: { '🐈': 2, '👍🏽': 1 }, mine: ['🐈'] })
    assert.deepEqual(await set(q,'🐈',false), { counts: { '🐈': 1, '👍🏽': 1 }, mine: [] })
    for (const invalid of ['hello','😀😀','',null]) await assert.rejects(set(q,invalid), /invalid emoji/i)
    await assert.rejects(set(q,'🐈',null), /invalid emoji/i)
    await assert.rejects(set('00000000-0000-4000-8000-000000000000','🐈'), /question not available/i)
    await assert.rejects(db.query('select author_id from public.question_reactions'), /permission denied/i)
    await assert.rejects(db.query('delete from public.question_reactions'), /permission denied/i)
    const answer = (await db.query("insert into public.answers(question_id,body,author_id) values ($1,'Jawaban terpisah',auth.uid()) returning id",[q])).rows[0].id
    await db.query('select public.set_answer_emoji_reaction($1,$2,true)',[answer,'☕'])
    assert.equal((await get([q]))[q].counts['☕'],undefined)
    await age(); await session(users[0])
    const room = (await db.query("select * from public.create_room_short('Ruang reaction pertanyaan','Konteks privat','question-reactions')")).rows[0]
    await age(); await session(users[0])
    const pq = (await db.query("insert into public.questions(title,category,author_id,room_id) values ('Pertanyaan reaction privat','Random',auth.uid(),$1) returning id",[room.id])).rows[0].id
    const privateBefore = await revision(`question:${pq}`)
    const publicBefore = await revision('feed')
    await set(pq,'🇮🇩')
    assert.ok(await revision(`question:${pq}`) > privateBefore)
    assert.equal(await revision('feed'),publicBefore)
    await session(users[2])
    const batch = await get([q,pq,q])
    assert.deepEqual(Object.keys(batch),[q])
    assert.deepEqual(batch[q].mine,[])
    await assert.rejects(set(pq,'🐈'), /question not available/i)
    await db.query('select * from public.resolve_room($1)',[room.slug])
    assert.deepEqual((await get([pq]))[pq],{ counts: { '🇮🇩': 1 }, mine: [] })
    await set(pq,'🐈')
    await db.exec("set role anon; set request.jwt.claim.sub='';")
    assert.deepEqual(await get([pq]),{})
    assert.deepEqual((await get([q]))[q].mine,[])
    await assert.rejects(set(q,'🐈'), /permission denied/i)
    await db.exec('reset role;')
    await db.query('delete from public.questions where id=$1',[pq])
    assert.equal((await db.query('select * from public.question_reactions where question_id=$1',[pq])).rows.length,0)
  } finally { await db.close() }
})
