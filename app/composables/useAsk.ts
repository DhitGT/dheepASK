import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Question, Answer, Category, Room } from '~/types'
import { demoData } from '~/utils/demo'
import { isReactionEmoji, normalizeAnswerReactions, type AnswerReactionStats } from '~/utils/answerReactions'
import { createShortCode } from '~/utils/shortCode'
import { createRoomCode, ROOM_CODE_PATTERN } from '~/utils/roomCode'

let client: SupabaseClient | undefined
let authPromise: Promise<void> | undefined
const questionColumns = 'id,title,body,category,created_at,answer_count,short_code,room_id,anon_name'
export function useAsk() {
  const config = useRuntimeConfig()
  const isDemo = !config.public.supabaseUrl || !config.public.supabaseAnonKey
  const questions = useState<Question[]>('questions', () => [])
  const answers = useState<Answer[]>('answers', () => [])
  const answerReactions = useState<Record<string, AnswerReactionStats>>('answer-reactions', () => ({}))
  const questionReactions = useState<Record<string, AnswerReactionStats>>('question-reactions', () => ({}))
  const rooms = useState<Room[]>('rooms', () => [])
  const demoAliases = useState<Record<string, string>>('demo-aliases', () => ({}))
  const bookmarks = useState<string[]>('bookmarks', () => [])
  const initialized = useState('ask-initialized', () => false)
  const busy = useState('ask-busy', () => false)
  const error = useState('ask-error', () => '')
  onMounted(() => {
    try { const saved = JSON.parse(localStorage.getItem('dheepask-bookmarks') || '[]'); if (Array.isArray(saved)) bookmarks.value = saved.filter(x => typeof x === 'string') } catch { /* use empty bookmarks */ }
  })
  const db = () => {
    if (!client) client = createClient(String(config.public.supabaseUrl), String(config.public.supabaseAnonKey))
    return client
  }
  async function identity() {
    if (!authPromise) authPromise = (async () => {
      const { data, error } = await db().auth.getSession()
      if (error) throw error
      if (!data.session) { const result = await db().auth.signInAnonymously(); if (result.error) throw result.error }
    })().catch(e => { authPromise = undefined; throw e })
    await authPromise
    const { data } = await db().auth.getSession()
    if (!data.session) { authPromise = undefined; throw new Error('Sesi berakhir. Silakan coba kembali.') }
    return data.session.user.id
  }
  function persist() {
    if (import.meta.client && isDemo) localStorage.setItem('dheepask-demo-v1', JSON.stringify({ questions: questions.value, answers: answers.value, rooms: rooms.value, aliases: demoAliases.value, answerReactions: answerReactions.value, questionReactions: questionReactions.value }))
  }
  function syncDemo() {
    if (!isDemo || !import.meta.client) return
    try {
      const saved = JSON.parse(localStorage.getItem('dheepask-demo-v1') || 'null')
      if (!saved || !Array.isArray(saved.questions) || !Array.isArray(saved.answers)) return
      questions.value = saved.questions; answers.value = saved.answers
      rooms.value = Array.isArray(saved.rooms) ? saved.rooms : []
      demoAliases.value = saved.aliases || {}
      answerReactions.value = saved.answerReactions || {}
      questionReactions.value = saved.questionReactions || {}
    } catch { /* Retain the last valid snapshot. */ }
  }
  function watchUpdates(topic: () => string | null, refresh: () => Promise<unknown>) {
    useRealtimeUpdates({ client: db, topic, demo: isDemo, storageKey: 'dheepask-demo-v1',
      refresh: async () => { syncDemo(); await refresh() },
    })
  }
  function demoAlias(scope: string) {
    return demoAliases.value[scope] ||= `anon-${crypto.randomUUID().replaceAll('-', '').slice(0, 8)}`
  }
  async function load() {
    error.value = ''; busy.value = true
    try {
      if (import.meta.client) {
        try { const saved = JSON.parse(localStorage.getItem('dheepask-bookmarks') || '[]'); if (Array.isArray(saved)) bookmarks.value = saved.filter(x => typeof x === 'string') } catch { /* use empty bookmarks */ }
      }
      if (isDemo) {
        if (!initialized.value) {
          let data = demoData()
          if (import.meta.client) { try { const saved = JSON.parse(localStorage.getItem('dheepask-demo-v1') || 'null'); if (saved && Array.isArray(saved.questions) && Array.isArray(saved.answers)) { data = saved; answerReactions.value = saved.answerReactions || {}; questionReactions.value = saved.questionReactions || {}; rooms.value = Array.isArray(saved.rooms) ? saved.rooms : []; demoAliases.value = saved.aliases && typeof saved.aliases === 'object' ? saved.aliases : {} } } catch { /* restore demo */ } }
          const used = new Set(data.questions.map(q => q.short_code).filter(code => /^[ABCDEFGHJKMNPQRSTUVWXYZ]{5}$/.test(code || '')))
          questions.value = data.questions.map(q => {
            if (/^[ABCDEFGHJKMNPQRSTUVWXYZ]{5}$/.test(q.short_code || '')) return q
            const short_code = createShortCode(used); used.add(short_code)
            return { ...q, short_code }
          }).map(q => ({ ...q, anon_name: q.anon_name || `anon-${q.id.replaceAll('-', '').slice(0, 8)}` }));
          answers.value = data.answers.map(a => ({ ...a, anon_name: a.anon_name || `anon-${crypto.randomUUID().replaceAll('-', '').slice(0, 8)}` }));
          const roomCodes = new Set(rooms.value.map(r => r.slug).filter(Boolean))
          rooms.value = rooms.value.map(r => { if (r.slug) return r; const slug = createRoomCode(roomCodes); roomCodes.add(slug); return { ...r, slug } }); persist()
        }
      } else {
        const result = await db().from('question_feed').select(questionColumns).order('created_at', { ascending: false }).limit(200)
        if (result.error) throw result.error
        questions.value = [...questions.value.filter(q => q.room_id), ...result.data as Question[]]
        await loadQuestionReactions(result.data.map(q => q.id))
      }
      initialized.value = true
    } catch { error.value = 'Pertanyaan belum bisa dimuat. Periksa koneksi atau konfigurasi Supabase, lalu coba lagi.' }
    finally { busy.value = false }
  }
  async function getQuestion(id: string, room_id: string | null = null) {
    const isCode = /^[a-z]{5}$/i.test(id)
    if (isCode) id = id.toUpperCase()
    else id = id.toLowerCase()
    if (!isCode && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null
    if (isDemo) return questions.value.find(q => (q.room_id || null) === room_id && (isCode ? q.short_code === id : q.id === id))
    let query = db().from(room_id ? 'room_question_feed' : 'question_feed').select(questionColumns).eq(isCode ? 'short_code' : 'id', id)
    if (room_id) query = query.eq('room_id', room_id)
    const result = await query.maybeSingle()
    if (result.error) throw result.error
    const question = result.data as Question | null
    if (question) { const index = questions.value.findIndex(q => q.id === question.id); if (index < 0) questions.value.push(question); else questions.value[index] = question; await loadQuestionReactions([question.id]) }
    else questions.value = questions.value.filter(q => !((q.room_id || null) === room_id && (isCode ? q.short_code === id : q.id === id)))
    return question
  }
  async function loadAnswers(id: string) {
    if (isDemo) {
      if (import.meta.client) {
        try { answerReactions.value = JSON.parse(localStorage.getItem('dheepask-demo-v1') || '{}').answerReactions || {} } catch { /* Retain the last valid reactions. */ }
      }
      return
    }
    const result = await db().from('answers').select('id,question_id,parent_id,body,created_at,anon_name').eq('question_id', id).order('created_at').order('id').limit(500)
    if (result.error) throw result.error
    answers.value = [...answers.value.filter(a => a.question_id !== id), ...result.data as Answer[]]
    await identity()
    const reactions = await db().rpc('get_answer_reactions', { question: id })
    if (reactions.error) throw reactions.error
    answerReactions.value = { ...answerReactions.value, ...reactions.data }
  }
  async function loadQuestionReactions(ids: string[]) {
    if (isDemo || !ids.length) return
    await identity()
    const result = await db().rpc('get_question_reactions', { question_ids: ids })
    if (result.error) throw result.error
    for (const id of ids) questionReactions.value[id] = result.data[id] || { counts: {}, mine: [] }
  }
  async function reactToPost(id: string, kind: 'answer' | 'question', emoji: string) {
    if (!isReactionEmoji(emoji)) throw new Error('Pilih satu emoji untuk reaction.')
    syncDemo()
    const state = kind === 'question' ? questionReactions : answerReactions
    const previous = normalizeAnswerReactions(state.value[id])
    const selected = !previous.mine.includes(emoji)
    if (isDemo) {
      const counts = { ...previous.counts }
      counts[emoji] = Math.max(0, (counts[emoji] || 0) + (selected ? 1 : -1))
      state.value[id] = { counts, mine: selected ? [...previous.mine, emoji] : previous.mine.filter(key => key !== emoji) }
      persist()
    } else {
      await identity()
      const result = await db().rpc(kind === 'question' ? 'set_question_emoji_reaction' : 'set_answer_emoji_reaction', { target: id, emoji, selected })
      if (result.error) throw result.error
      state.value[id] = result.data
    }
  }
  const reactToAnswer = (answer: Answer, emoji: string) => reactToPost(answer.id, 'answer', emoji)
  const reactToQuestion = (question: Question, emoji: string) => reactToPost(question.id, 'question', emoji)
  async function ask(title: string, body: string, category: Category, room_id: string | null = null) {
    syncDemo()
    let question: Question
    if (isDemo) {
      if (room_id && !rooms.value.some(r => r.id === room_id)) throw new Error('Room tidak ditemukan.')
      const id = crypto.randomUUID()
      question = { id, room_id, anon_name: demoAlias(room_id || id), short_code: createShortCode(questions.value.map(q => q.short_code)), title: title.trim(), body: body.trim(), category, created_at: new Date().toISOString(), answer_count: 0 }
    }
    else {
      const author_id = await identity()
      const result = await db().from('questions').insert({ title: title.trim(), body: body.trim(), category, author_id, room_id }).select('id,title,body,category,created_at,short_code,room_id,anon_name').single()
      if (result.error) throw result.error
      question = { ...result.data, answer_count: 0 } as Question
    }
    if (!questions.value.some(q => q.id === question.id)) questions.value.unshift(question)
    persist(); return question.short_code
  }
  async function reply(question_id: string, body: string, parent_id: string | null = null) {
    syncDemo()
    const content = body.trim()
    if (content.length < 2 || content.length > 3000) throw new Error('Jawaban harus berisi 2–3000 karakter.')
    if (parent_id && !answers.value.some(a => a.id === parent_id && a.question_id === question_id)) throw new Error('Jawaban yang dibalas tidak ditemukan.')
    let answer: Answer
    if (isDemo) {
      const question = questions.value.find(q => q.id === question_id)
      if (!question) throw new Error('Pertanyaan tidak ditemukan.')
      answer = { id: crypto.randomUUID(), question_id, parent_id, anon_name: demoAlias(question.room_id || question_id), body: content, created_at: new Date().toISOString() }
    }
    else {
      const author_id = await identity()
      const result = await db().from('answers').insert({ question_id, parent_id, body: content, author_id }).select('id,question_id,parent_id,body,created_at,anon_name').single()
      if (result.error) throw result.error
      answer = result.data as Answer
    }
    if (!answers.value.some(a => a.id === answer.id)) answers.value.push(answer)
    const question = questions.value.find(q => q.id === question_id)
    if (isDemo) { if (question) question.answer_count++ }
    else if (question) await getQuestion(question.id, question.room_id || null).catch(() => undefined)
    persist()
  }
  function toggleBookmark(id: string) {
    bookmarks.value = bookmarks.value.includes(id) ? bookmarks.value.filter(x => x !== id) : [...bookmarks.value, id]
    localStorage.setItem('dheepask-bookmarks', JSON.stringify(bookmarks.value))
  }
  async function createRoom(title: string, context: string, customSlug: string = '') {
    const requestedSlug = customSlug.trim()
    if (requestedSlug && !ROOM_CODE_PATTERN.test(requestedSlug)) throw new Error('Kode harus 3–32 karakter: huruf, angka, atau tanda hubung. Awali dan akhiri dengan huruf atau angka.')
    let room: Room
    if (isDemo) {
      await load()
      syncDemo()
      if (rooms.value.some(r => r.slug.toLowerCase() === requestedSlug.toLowerCase())) throw new Error('Kode ruang sudah dipakai. Pilih kode lain.')
      const id = crypto.randomUUID(); room = { id, slug: requestedSlug || createRoomCode(rooms.value.map(r => r.slug)), token: crypto.randomUUID(), title: title.trim(), context: context.trim(), created_at: new Date().toISOString(), my_alias: demoAlias(id), is_owner: true }
    }
    else { await identity(); const result = await db().rpc('create_room_short', { room_title: title, room_context: context, room_slug: requestedSlug || null }).single(); if (result.error) { if (result.error.code === '23505') throw new Error('Kode ruang sudah dipakai. Pilih kode lain.'); throw result.error }; room = result.data as Room }
    rooms.value.push(room); persist(); return room
  }
  async function joinRoom(link: string) {
    const isToken = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(link)
    if (!isToken && !ROOM_CODE_PATTERN.test(link)) return null
    if (isDemo) { await load(); return rooms.value.find(r => isToken ? r.token === link.toLowerCase() : r.slug.toLowerCase() === link.toLowerCase()) || null }
    await identity()
    const result = await db().rpc('resolve_room', { room_link: link }).maybeSingle()
    if (result.error) throw result.error
    const room = result.data as Room | null
    if (room) { rooms.value = [...rooms.value.filter(r => r.id !== room.id), room] }
    return room
  }
  async function loadRoomQuestions(room_id: string) {
    if (isDemo) return
    const result = await db().from('room_question_feed').select(questionColumns).eq('room_id', room_id).order('created_at', { ascending: false }).limit(200)
    if (result.error) throw result.error
    questions.value = [...questions.value.filter(q => q.room_id !== room_id), ...result.data as Question[]]
    await loadQuestionReactions(result.data.map(q => q.id))
  }
  return { isDemo, questions, answers, answerReactions, reactToAnswer, questionReactions, reactToQuestion, rooms, bookmarks, busy, error, load, getQuestion, loadAnswers, ask, reply, toggleBookmark, createRoom, joinRoom, loadRoomQuestions, watchUpdates }
}
