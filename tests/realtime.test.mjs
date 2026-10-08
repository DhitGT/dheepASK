import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { test } from 'node:test'

test('realtime invalidations cover threads, edits, deletions and counters while isolating rooms', async () => {
  const db = new PGlite()
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema public,auth to anon,authenticated;`)
    for (const file of ['001_initial.sql','002_short_codes.sql','003_answer_threads.sql','004_private_rooms.sql','005_short_room_links.sql','006_site_engagement.sql','007_realtime_updates.sql']) {
      if (file === '007_realtime_updates.sql') await db.exec('create publication supabase_realtime for table public.questions, public.answers, public.rooms;')
      await db.exec(readFileSync(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8'))
    }
    const users = (await db.query('insert into auth.users select gen_random_uuid() from generate_series(1,2) returning id')).rows.map(row => row.id)
    const session = id => db.exec(`reset role; set role authenticated; set request.jwt.claim.sub = '${id}';`)
    const age = () => db.exec(`reset role; update public.rooms set created_at = now()-interval '1 minute'; update public.questions set created_at = now()-interval '1 minute'; update public.answers set created_at = now()-interval '1 minute';`)
    const revision = async topic => (await db.query('select revision from public.realtime_updates where topic=$1',[topic])).rows[0]?.revision
    await session(users[0])
    const room = (await db.query("select * from public.create_room_short('Room realtime', 'Konteks privat', 'realtime-room')")).rows[0]
    await age(); await session(users[0])
    const privateQuestion = (await db.query("insert into public.questions(title,category,author_id,room_id) values ('Pertanyaan untuk room private','Random',auth.uid(),$1) returning id",[room.id])).rows[0].id
    const topic = `question:${privateQuestion}`
    assert.ok(await revision(topic)); assert.ok(await revision(`room:${room.id}`))
    const feedBefore = await revision('feed')
    await session(users[1])
    assert.equal(await revision(topic), undefined)
    assert.equal(await revision(`room:${room.id}`), undefined)
    await assert.rejects(db.query("select public.bump_realtime_topic('feed')"), /permission denied/i)
    await assert.rejects(db.query("update public.realtime_updates set revision=99"), /permission denied/i)
    await db.query('select * from public.resolve_room($1)',[room.slug])
    assert.ok(await revision(topic))
    const beforeAnswer = await revision(topic)
    const answer = (await db.query("insert into public.answers(question_id,body,author_id) values ($1,'Jawaban room',auth.uid()) returning id",[privateQuestion])).rows[0].id
    assert.ok(await revision(topic) > beforeAnswer)
    assert.equal(await revision('feed'), feedBefore)
    await age(); await session(users[0])
    const beforeReply = await revision(topic)
    await db.query("insert into public.answers(question_id,parent_id,body,author_id) values ($1,$2,'Balasan thread',auth.uid())",[privateQuestion,answer])
    assert.ok(await revision(topic) > beforeReply)
    await db.exec('reset role;')
    const beforeEdit = await revision(topic)
    await db.query("update public.answers set body='Jawaban diedit' where id=$1",[answer])
    assert.ok(await revision(topic) > beforeEdit)
    const beforeDelete = await revision(topic)
    await db.query('delete from public.answers where id=$1',[answer])
    assert.ok(await revision(topic) > beforeDelete)
    await db.query('delete from public.questions where id=$1',[privateQuestion])
    assert.ok(await revision(topic) > beforeDelete)
    // The deleted question's topic retains the private scope, even as a tombstone.
    await db.exec("set role anon; set request.jwt.claim.sub='';")
    assert.equal(await revision(topic), undefined)
    assert.equal(await revision(`room:${room.id}`), undefined)
    const beforeSite = await revision('site')
    await db.query('select public.record_site_hit()'); await db.query(`select public.add_site_reactions('{"heart":10}')`)
    assert.ok(await revision('site') > beforeSite)
    await age(); await session(users[1])
    const publicQuestion = (await db.query("insert into public.questions(title,category,author_id) values ('Pertanyaan publik realtime','Random',auth.uid()) returning id")).rows[0].id
    await db.exec("set role anon; set request.jwt.claim.sub='';")
    assert.ok(await revision('feed') > feedBefore)
    assert.ok(await revision(`question:${publicQuestion}`))
    assert.deepEqual((await db.query('select * from public.realtime_updates limit 1')).fields.map(field => field.name), ['topic','room_id','revision'])
    await db.exec('reset role;')
    const published = (await db.query("select tablename from pg_publication_tables where pubname='supabase_realtime'")).rows.map(row => row.tablename)
    assert.deepEqual(published, ['realtime_updates'])
    const beforeRollback = await revision('feed')
    await db.exec("begin; update public.questions set title='Update yang dibatalkan'; rollback;")
    assert.equal(await revision('feed'), beforeRollback)
  } finally { await db.close() }
})
