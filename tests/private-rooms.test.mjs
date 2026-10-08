import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { test } from 'node:test'

test('private room access, stable aliases, feed isolation and upgrade', async () => {
  const db = new PGlite()
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema public,auth to anon,authenticated;`)
    for (const file of ['001_initial.sql', '002_short_codes.sql', '003_answer_threads.sql']) await db.exec(readFileSync(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8'))
    const users = (await db.query('insert into auth.users select gen_random_uuid() from generate_series(1, 4) returning id')).rows.map(row => row.id)
    const session = async (id) => db.exec(`reset role; set role authenticated; set request.jwt.claim.sub = '${id}';`)
    const agePosts = async () => { await db.exec(`reset role; update public.rooms set created_at = now() - interval '1 minute'; update public.questions set created_at = now() - interval '1 minute'; update public.answers set created_at = now() - interval '1 minute';`) }
    await session(users[0])
    const legacy = (await db.query(`insert into public.questions(title,category,author_id) values ('Pertanyaan sebelum fitur room','Random',auth.uid()) returning id`)).rows[0]
    await db.exec('reset role;')
    await db.exec(readFileSync(new URL('../supabase/migrations/004_private_rooms.sql', import.meta.url), 'utf8'))
    const upgraded = (await db.query('select * from public.question_feed where id = $1', [legacy.id])).rows[0]
    assert.equal(upgraded.room_id, null); assert.match(upgraded.anon_name, /^anon-[a-f0-9]{8}$/)
    await agePosts(); await session(users[0])
    const room = (await db.query(`select * from public.create_room('Tanya apa aja tentang gw!', 'Tanya soal hobi dan keseharian.')`)).rows[0]
    assert.ok(room.is_owner); assert.match(room.my_alias, /^anon-[a-f0-9]{8}$/)
    await assert.rejects(db.query(`select token from public.rooms`), /permission denied/i)
    await assert.rejects(db.query(`select * from public.room_members`), /permission denied/i)
    await assert.rejects(db.query(`select * from public.anonymous_names`), /permission denied/i)
    await assert.rejects(db.query(`select public.anonymous_alias('${room.id}','${users[1]}')`), /permission denied/i)
    await assert.rejects(db.query(`select * from public.create_room('Room terlalu cepat','Konteks')`), /wait 30 seconds/i)
    await agePosts(); await session(users[0])
    const question = (await db.query(`insert into public.questions(title,category,author_id,room_id) values ('Apa hobi kamu sekarang?', 'Random',auth.uid(),$1) returning id,short_code,anon_name`, [room.id])).rows[0]
    assert.equal(question.anon_name, room.my_alias)
    assert.equal((await db.query('select id from public.question_feed where id = $1', [question.id])).rows.length, 0)
    await agePosts(); await session(users[0])
    const answer = (await db.query(`insert into public.answers(question_id,body,author_id) values ($1,'Aku suka melukis.',auth.uid()) returning id,anon_name`, [question.id])).rows[0]
    assert.equal(answer.anon_name, room.my_alias)
    await assert.rejects(db.query(`insert into public.answers(question_id,body,author_id,anon_name) values ('${question.id}','Nama palsu',auth.uid(),'anon-palsu')`), /permission denied/i)
    await session(users[1])
    assert.equal((await db.query('select id from public.questions where id = $1', [question.id])).rows.length, 0)
    assert.equal((await db.query('select id from public.room_question_feed where short_code = $1', [question.short_code])).rows.length, 0)
    assert.equal((await db.query('select id from public.answers where question_id = $1', [question.id])).rows.length, 0)
    await assert.rejects(db.query(`insert into public.questions(title,category,author_id,room_id) values ('Mencoba bertanya tanpa tautan','Random',auth.uid(),'${room.id}')`), /row-level security/i)
    await assert.rejects(db.query(`insert into public.answers(question_id,body,author_id) values ('${question.id}','Tanpa undangan',auth.uid())`), /row-level security/i)
    assert.equal((await db.query(`select * from public.join_room('00000000-0000-4000-8000-000000000000')`)).rows.length, 0)
    const guest = (await db.query('select * from public.join_room($1)', [room.token])).rows[0]
    assert.equal(guest.is_owner, false); assert.notEqual(guest.my_alias, room.my_alias)
    assert.equal((await db.query('select * from public.join_room($1)', [room.token])).rows[0].my_alias, guest.my_alias)
    assert.equal((await db.query('select id from public.room_question_feed where id = $1', [question.id])).rows.length, 1)
    const child = (await db.query(`insert into public.answers(question_id,parent_id,body,author_id) values ($1,$2,'Aku juga suka melukis!',auth.uid()) returning anon_name`, [question.id, answer.id])).rows[0]
    assert.equal(child.anon_name, guest.my_alias)
    await assert.rejects(db.query('select author_id from public.answers'), /permission denied/i)
    await session(users[2])
    const secondRoom = (await db.query(`select * from public.create_room('Room lain','Konteks lain')`)).rows[0]
    await session(users[1])
    const secondAlias = (await db.query('select * from public.join_room($1)', [secondRoom.token])).rows[0].my_alias
    assert.notEqual(secondAlias, guest.my_alias)
    // Even joined members never see private questions in the public feed.
    assert.equal((await db.query('select id from public.question_feed where id = $1', [question.id])).rows.length, 0)
    await db.exec('reset role;')
    await db.exec(readFileSync(new URL('../supabase/migrations/005_short_room_links.sql', import.meta.url), 'utf8'))
    const upgradedRoom = (await db.query('select id,slug,token from public.rooms where id = $1', [room.id])).rows[0]
    assert.equal(upgradedRoom.token, room.token); assert.match(upgradedRoom.slug, /^[A-Z]{7}$/)
    await session(users[1])
    const shortRoom = (await db.query('select * from public.resolve_room($1)', [upgradedRoom.slug.toLowerCase()])).rows[0]
    assert.equal(shortRoom.id, room.id); assert.equal(shortRoom.my_alias, guest.my_alias)
    assert.equal((await db.query('select * from public.resolve_room($1)', [room.token])).rows[0].slug, upgradedRoom.slug)
    assert.equal((await db.query("select * from public.resolve_room('not-an-existing-room')")).rows.length, 0)
    await assert.rejects(db.query('select slug from public.rooms'), /permission denied/i)
    await assert.rejects(db.query('select public.next_room_slug()'), /permission denied/i)
    await session(users[3])
    const custom = (await db.query("select * from public.create_room_short('Room custom', 'Konteks custom', ' tanya-gw ')")).rows[0]
    assert.equal(custom.slug, 'tanya-gw'); assert.ok(custom.is_owner)
    await agePosts(); await session(users[3])
    await assert.rejects(db.query("select * from public.create_room_short('Kode kembar', 'Konteks lain', 'TANYA-GW')"), /unique constraint/i)
    for (const invalid of ['ab', '-abc', 'abc-', 'a/b', 'a b', 'a'.repeat(33)]) {
      await assert.rejects(db.query("select * from public.create_room_short('Kode invalid', 'Konteks lain', $1)", [invalid]), /check constraint/i)
    }
    const automatic = (await db.query("select * from public.create_room_short('Kode otomatis', 'Konteks otomatis')")).rows[0]
    assert.match(automatic.slug, /^[A-Z]{7}$/)
    assert.notEqual(automatic.slug, upgradedRoom.slug)
    await session(users[2])
    assert.equal((await db.query("select * from public.resolve_room('TANYA-GW')")).rows[0].id, custom.id)
    assert.equal((await db.query('select id from public.question_feed where id = $1', [question.id])).rows.length, 0)
    await db.exec("set role anon; set request.jwt.claim.sub = '';")
    assert.equal((await db.query('select id from public.questions where id = $1', [question.id])).rows.length, 0)
    assert.equal((await db.query('select id from public.answers where question_id = $1', [question.id])).rows.length, 0)
    await assert.rejects(db.query('select * from public.join_room($1)', [room.token]), /permission denied/i)
    await assert.rejects(db.query('select * from public.resolve_room($1)', [custom.slug]), /permission denied/i)
  } finally { await db.close() }
})
