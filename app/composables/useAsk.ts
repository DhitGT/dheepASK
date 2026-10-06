import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Question, Answer, Category } from '~/types'
import { demoData } from '~/utils/demo'
import { createShortCode } from '~/utils/shortCode'

let client: SupabaseClient | undefined
let authPromise: Promise<void> | undefined
const questionColumns = 'id,title,body,category,created_at,answer_count,short_code'
export function useAsk() {
  const config = useRuntimeConfig()
  const isDemo = !config.public.supabaseUrl || !config.public.supabaseAnonKey
  const questions = useState<Question[]>('questions', () => [])
  const answers = useState<Answer[]>('answers', () => [])
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
    if (import.meta.client && isDemo) localStorage.setItem('dheepask-demo-v1', JSON.stringify({ questions: questions.value, answers: answers.value }))
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
          if (import.meta.client) { try { const saved = JSON.parse(localStorage.getItem('dheepask-demo-v1') || 'null'); if (saved && Array.isArray(saved.questions) && Array.isArray(saved.answers)) data = saved } catch { /* restore demo */ } }
          const used = new Set(data.questions.map(q => q.short_code).filter(code => /^[ABCDEFGHJKMNPQRSTUVWXYZ]{5}$/.test(code || '')))
          questions.value = data.questions.map(q => {
            if (/^[ABCDEFGHJKMNPQRSTUVWXYZ]{5}$/.test(q.short_code || '')) return q
            const short_code = createShortCode(used); used.add(short_code)
            return { ...q, short_code }
          }); answers.value = data.answers; persist()
        }
      } else {
        const result = await db().from('question_feed').select(questionColumns).order('created_at', { ascending: false }).limit(200)
        if (result.error) throw result.error
        questions.value = result.data as Question[]
      }
      initialized.value = true
    } catch { error.value = 'Pertanyaan belum bisa dimuat. Periksa koneksi atau konfigurasi Supabase, lalu coba lagi.' }
    finally { busy.value = false }
  }
  async function getQuestion(id: string) {
    const isCode = /^[a-z]{5}$/i.test(id)
    if (isCode) id = id.toUpperCase()
    else id = id.toLowerCase()
    if (!isCode && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null
    if (isDemo) return questions.value.find(q => isCode ? q.short_code === id : q.id === id)
    const result = await db().from('question_feed').select(questionColumns).eq(isCode ? 'short_code' : 'id', id).maybeSingle()
    if (result.error) throw result.error
    const question = result.data as Question | null
    if (question) { const index = questions.value.findIndex(q => q.id === question.id); if (index < 0) questions.value.push(question); else questions.value[index] = question }
    return question
  }
  async function loadAnswers(id: string) {
    if (isDemo) return
    const result = await db().from('answers').select('id,question_id,body,created_at').eq('question_id', id).order('created_at').limit(500)
    if (result.error) throw result.error
    answers.value = [...answers.value.filter(a => a.question_id !== id), ...result.data as Answer[]]
  }
  async function ask(title: string, body: string, category: Category) {
    let question: Question
    if (isDemo) question = { id: crypto.randomUUID(), short_code: createShortCode(questions.value.map(q => q.short_code)), title: title.trim(), body: body.trim(), category, created_at: new Date().toISOString(), answer_count: 0 }
    else {
      const author_id = await identity()
      const result = await db().from('questions').insert({ title: title.trim(), body: body.trim(), category, author_id }).select('id,title,body,category,created_at,short_code').single()
      if (result.error) throw result.error
      question = { ...result.data, answer_count: 0 } as Question
    }
    questions.value.unshift(question); persist(); return question.short_code
  }
  async function reply(question_id: string, body: string) {
    let answer: Answer
    if (isDemo) answer = { id: crypto.randomUUID(), question_id, body: body.trim(), created_at: new Date().toISOString() }
    else {
      const author_id = await identity()
      const result = await db().from('answers').insert({ question_id, body: body.trim(), author_id }).select('id,question_id,body,created_at').single()
      if (result.error) throw result.error
      answer = result.data as Answer
    }
    answers.value.push(answer)
    const question = questions.value.find(q => q.id === question_id); if (question) question.answer_count++
    persist()
  }
  function toggleBookmark(id: string) {
    bookmarks.value = bookmarks.value.includes(id) ? bookmarks.value.filter(x => x !== id) : [...bookmarks.value, id]
    localStorage.setItem('dheepask-bookmarks', JSON.stringify(bookmarks.value))
  }
  return { isDemo, questions, answers, bookmarks, busy, error, load, getQuestion, loadAnswers, ask, reply, toggleBookmark }
}
