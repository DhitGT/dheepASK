import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createRequire } from 'node:module'
import { isReactionEmoji, normalizeAnswerReactions } from '../app/utils/answerReactions.ts'

test('all picker variants are valid reactions and legacy demo choices are preserved', () => {
  const data = createRequire(import.meta.url)('@emoji-mart/data')
  for (const emoji of Object.values(data.emojis)) {
    for (const skin of emoji.skins) assert.equal(isReactionEmoji(skin.native), true, skin.native)
  }
  for (const invalid of ['hello','', '😀😀', '12', '🇮', '<script>', '🏽', '💜 hello']) assert.equal(isReactionEmoji(invalid), false, invalid)
  assert.deepEqual(normalizeAnswerReactions({ counts: { heart: 2, fire: 0 }, mine: 'heart' }), { counts: { '❤️': 2 }, mine: ['❤️'] })
})

test('answer reactions switch, remove, aggregate and protect private rooms and identities', async () => {
  const db = new PGlite()
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema public,auth to anon,authenticated;`)
    for (const file of ['001_initial.sql','002_short_codes.sql','003_answer_threads.sql','004_private_rooms.sql','005_short_room_links.sql','006_site_engagement.sql','007_realtime_updates.sql','008_answer_reactions.sql']) {
      await db.exec(readFileSync(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8'))
    }
    const users = (await db.query('insert into auth.users select gen_random_uuid() from generate_series(1,3) returning id')).rows.map(row => row.id)
    const session = id => db.exec(`reset role; set role authenticated; set request.jwt.claim.sub = '${id}';`)
    const age = () => db.exec(`reset role; update public.questions set created_at=now()-interval '1 minute'; update public.answers set created_at=now()-interval '1 minute'; update public.rooms set created_at=now()-interval '1 minute';`)
    await session(users[0])
    const q = (await db.query("insert into public.questions(title,category,author_id) values ('Pertanyaan reaction publik','Random',auth.uid()) returning id")).rows[0].id
    await session(users[1])
    const a = (await db.query("insert into public.answers(question_id,body,author_id) values ($1,'Jawaban untuk reaction',auth.uid()) returning id",[q])).rows[0].id
    const set = async key => (await db.query('select public.set_answer_reaction($1,$2) as stats',[a,key])).rows[0].stats
    assert.deepEqual(await set('heart'), { counts: { heart: 1 }, mine: 'heart' })
    assert.deepEqual(await set('heart'), { counts: { heart: 1 }, mine: 'heart' })
    assert.deepEqual(await set('clap'), { counts: { clap: 1 }, mine: 'clap' })
    await session(users[2])
    assert.deepEqual(await set('clap'), { counts: { clap: 2 }, mine: 'clap' })
    assert.deepEqual(await set(null), { counts: { clap: 1 }, mine: null })
    await assert.rejects(set('invalid'), /invalid reaction/i)
    await assert.rejects(db.query('select * from public.answer_reactions'), /permission denied/i)
    await db.exec("set role anon; set request.jwt.claim.sub='';")
    const stats = (await db.query('select public.get_answer_reactions($1) as stats',[q])).rows[0].stats
    assert.deepEqual(stats[a], { counts: { clap: 1 }, mine: null })
    await assert.rejects(set('heart'), /permission denied/i)
    await age(); await session(users[0])
    const room = (await db.query("select * from public.create_room_short('Ruang reaction','Konteks privat','reaction-room')")).rows[0]
    await age(); await session(users[0])
    const pq = (await db.query("insert into public.questions(title,category,author_id,room_id) values ('Pertanyaan reaction privat','Random',auth.uid(),$1) returning id",[room.id])).rows[0].id
    await age(); await session(users[0])
    const pa = (await db.query("insert into public.answers(question_id,body,author_id) values ($1,'Jawaban privat',auth.uid()) returning id",[pq])).rows[0].id
    const revision = (await db.query('select revision from public.realtime_updates where topic=$1',[`question:${pq}`])).rows[0].revision
    await db.query('select public.set_answer_reaction($1,$2)',[pa,'love'])
    assert.ok((await db.query('select revision from public.realtime_updates where topic=$1',[`question:${pq}`])).rows[0].revision > revision)
    await session(users[2])
    assert.deepEqual((await db.query('select public.get_answer_reactions($1) as stats',[pq])).rows[0].stats,{})
    await assert.rejects(db.query('select public.set_answer_reaction($1,$2)',[pa,'heart']), /answer not available/i)
    await db.query('select * from public.resolve_room($1)',[room.slug])
    assert.deepEqual((await db.query('select public.get_answer_reactions($1) as stats',[pq])).rows[0].stats[pa],{ counts: { love: 1 }, mine: null })
    await db.exec('reset role;')
    await db.exec(readFileSync(new URL('../supabase/migrations/009_discord_reactions.sql', import.meta.url), 'utf8'))
    await session(users[1])
    assert.deepEqual((await db.query('select public.get_answer_reactions($1) as stats',[q])).rows[0].stats[a], { counts: { '👏': 1 }, mine: ['👏'] })
    const emojiSet = async (emoji, selected = true, target = a) => (await db.query('select public.set_answer_emoji_reaction($1,$2,$3) as stats',[target,emoji,selected])).rows[0].stats
    assert.deepEqual((await emojiSet('🐈')).counts, { '👏': 1, '🐈': 1 })
    assert.deepEqual((await emojiSet('🐈')).counts, { '👏': 1, '🐈': 1 })
    for (const emoji of ['👍🏽','👨‍👩‍👧‍👦','🇮🇩','1️⃣','☕']) await emojiSet(emoji)
    assert.equal((await emojiSet('🐈', false)).mine.length, 6)
    await emojiSet('🐈', false)
    await session(users[2])
    assert.equal((await emojiSet('👍🏽')).counts['👍🏽'], 2)
    assert.deepEqual((await emojiSet('👍🏽', false)).mine, [])
    for (const invalid of ['text','😀😀','',null,'🇮']) await assert.rejects(emojiSet(invalid), /invalid emoji/i)
    await assert.rejects(emojiSet('🐈', null), /invalid emoji/i)
    await session(users[1])
    await assert.rejects(emojiSet('🐈', true, pa), /answer not available/i)
    await assert.rejects(db.query('select author_id from public.answer_reactions'), /permission denied/i)
    await assert.rejects(db.query('select * from public.reaction_emojis'), /permission denied/i)
    await session(users[0])
    assert.deepEqual((await db.query('select public.get_answer_reactions($1) as stats',[pq])).rows[0].stats[pa], { counts: { '😍': 1 }, mine: ['😍'] })
    await db.exec("set role anon; set request.jwt.claim.sub='';")
    assert.deepEqual((await db.query('select public.get_answer_reactions($1) as stats',[pq])).rows[0].stats, {})
    await assert.rejects(emojiSet('🐈'), /permission denied/i)
    await db.exec('reset role;')
    await db.query('delete from public.answers where id=$1',[pa])
    assert.equal((await db.query('select * from public.answer_reactions where answer_id=$1',[pa])).rows.length,0)
  } finally { await db.close() }
})
