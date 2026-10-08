import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
const db = new PGlite()
await db.exec(`create role anon; create role authenticated; create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema public,auth to anon,authenticated;
grant execute on function auth.uid() to anon,authenticated;
insert into auth.users values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');`)
await db.exec(readFileSync(new URL('../supabase/migrations/001_initial.sql', import.meta.url), 'utf8'))
await db.exec(`set role authenticated; set request.jwt.claim.sub = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';`)
const { rows } = await db.query(`insert into public.questions(title,body,category,author_id) values ('Apakah pertanyaan anonim tersimpan?', 'Konteks uji', 'Random', auth.uid()) returning id,title`)
const id = rows[0].id
async function denied(sql, expected) { await assert.rejects(db.query(sql), expected) }
await denied(`select author_id from public.questions`, /permission denied/i)
await denied(`insert into public.questions(title,category,author_id) values ('Pertanyaan terlalu cepat dikirim', 'Random', auth.uid())`, /wait 30 seconds/i)
await denied(`insert into public.questions(title,category,author_id) values ('Pemalsuan identitas penulis ditolak', 'Random', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')`, /row-level security/i)
await db.exec(`set request.jwt.claim.sub = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';`)
await db.query(`insert into public.answers(question_id,body,author_id) values ($1, 'Jawaban dari sesi berbeda', auth.uid()) returning id,body`, [id])
await db.exec('set role anon;')
const feed = await db.query('select * from public.question_feed')
assert.equal(feed.rows.length, 1); assert.equal(feed.rows[0].answer_count, 1); assert.ok(!('author_id' in feed.rows[0]))
assert.equal((await db.query('select id,body from public.answers')).rows.length, 1)
await denied('select author_id from public.answers', /permission denied/i)
await denied(`insert into public.questions(title,category,author_id) values ('Tanpa sesi tidak bisa mengirim', 'Random', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')`, /permission denied/i)
await denied(`update public.questions set title = 'Perubahan tidak boleh dilakukan'`, /permission denied/i)
await denied('delete from public.answers', /permission denied/i)
// Upgrade an existing database: UUIDs and answers must survive the backfill.
await db.exec('reset role;')
await db.exec(readFileSync(new URL('../supabase/migrations/002_short_codes.sql', import.meta.url), 'utf8'))
const upgraded = (await db.query('select * from public.question_feed')).rows[0]
assert.equal(upgraded.id, id); assert.equal(upgraded.answer_count, 1)
assert.match(upgraded.short_code, /^[ABCDEFGHJKMNPQRSTUVWXYZ]{5}$/)
await db.exec(`insert into auth.users select gen_random_uuid() from generate_series(1, 250);`)
await db.exec(`insert into public.questions(title,category,author_id)
  select 'Pertanyaan uji kode pendek unik', 'Random', id from auth.users
  where id not in ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');`)
const codes = (await db.query('select short_code from public.questions')).rows.map(row => row.short_code)
assert.equal(codes.length, 251); assert.equal(new Set(codes).size, codes.length)
for (const code of codes) assert.match(code, /^[ABCDEFGHJKMNPQRSTUVWXYZ]{5}$/)
const otherCode = (await db.query('select short_code from public.questions where id <> $1 limit 1', [id])).rows[0].short_code
await assert.rejects(db.query('update public.questions set short_code = $1 where id = $2', [otherCode, id]), /unique constraint/i)
await assert.rejects(db.query("update public.questions set short_code = '12345' where id = $1", [id]), /check constraint/i)
if (codes.includes('AAAAA')) await db.query("update public.questions set short_code = public.next_question_code() where short_code = 'AAAAA'")
await db.query("update public.questions set short_code = 'AAAAA' where id = $1", [id])
await db.exec('set role anon;')
assert.equal((await db.query("select * from public.question_feed where short_code = 'AAAAA'")).rows[0].id, id)
await denied('select author_id from public.questions', /permission denied/i)
await denied('select public.next_question_code()', /permission denied/i)
await db.exec("set role authenticated; set request.jwt.claim.sub = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';")
await denied(`insert into public.questions(title,category,author_id,short_code) values ('Tidak bisa memilih kode sendiri', 'Random', auth.uid(), '12345')`, /permission denied/i)
await db.exec('reset role;')
await db.exec(readFileSync(new URL('../supabase/migrations/003_answer_threads.sql', import.meta.url), 'utf8'))
const parent = (await db.query('select id,parent_id from public.answers where question_id = $1', [id])).rows[0]
assert.equal(parent.parent_id, null)
// Fresh sessions avoid the posting cooldown while exercising threaded inserts.
const users = (await db.query(`insert into auth.users select gen_random_uuid() from generate_series(1, 4) returning id`)).rows
const otherQuestion = (await db.query('select id from public.questions where id <> $1 limit 1', [id])).rows[0].id
await db.exec(`set role authenticated; set request.jwt.claim.sub = '${users[0].id}';`)
const child = (await db.query(`insert into public.answers(question_id,parent_id,body,author_id) values ($1,$2,'Balasan dalam thread',auth.uid()) returning id,parent_id`, [id, parent.id])).rows[0]
assert.equal(child.parent_id, parent.id)
await denied(`insert into public.answers(question_id,parent_id,body,author_id) values ('${id}','${child.id}','Balasan terlalu cepat',auth.uid())`, /wait 30 seconds/i)
await db.exec(`set request.jwt.claim.sub = '${users[1].id}';`)
await db.query(`insert into public.answers(question_id,parent_id,body,author_id) values ($1,$2,'Balasan bertingkat',auth.uid())`, [id, child.id])
await db.exec(`set request.jwt.claim.sub = '${users[2].id}';`)
await denied(`insert into public.answers(question_id,parent_id,body,author_id) values ('${otherQuestion}','${parent.id}','Lintas pertanyaan ditolak',auth.uid())`, /foreign key constraint/i)
await denied(`insert into public.answers(question_id,parent_id,body,author_id) values ('${id}','00000000-0000-4000-8000-000000000000','Parent hilang ditolak',auth.uid())`, /foreign key constraint/i)
await db.exec('set role anon;')
assert.equal((await db.query('select answer_count from public.question_feed where id = $1', [id])).rows[0].answer_count, 3)
assert.equal((await db.query('select parent_id from public.answers where id = $1', [child.id])).rows[0].parent_id, parent.id)
await denied('select author_id from public.answers', /permission denied/i)
await denied(`update public.answers set parent_id = null`, /permission denied/i)
await db.close()
console.log('PASS: migrations, public codes, uniqueness, backfill, letter codes, author privacy, ownership, counts, cooldown, write restrictions.')

