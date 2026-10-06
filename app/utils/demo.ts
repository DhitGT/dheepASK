import type { Question, Answer } from '~/types'
const timestamp = (hours: number) => new Date(Date.now() - hours * 3600000).toISOString()
export function demoData(): { questions: Question[]; answers: Answer[] } {
  const questions: Omit<Question, 'short_code'>[] = [
    { id: '11111111-1111-4111-8111-111111111111', title: 'Apa hal kecil yang belakangan ini bikin kamu merasa bahagia?', body: 'Kadang kita terlalu sibuk mengejar hal besar sampai lupa menikmati yang sederhana. Kalau kamu, apa?', category: 'Kehidupan', created_at: timestamp(1), answer_count: 2 },
    { id: '22222222-2222-4222-8222-222222222222', title: 'Pernah nggak merasa tertinggal dari teman-teman seumuran?', body: 'Teman-teman sudah punya karier bagus, ada yang menikah. Sementara aku masih mencari arah. Gimana kalian menghadapi perasaan ini?', category: 'Kehidupan', created_at: timestamp(2), answer_count: 1 },
    { id: '33333333-3333-4333-8333-333333333333', title: 'Lebih baik kerja sesuai passion atau yang gajinya lebih besar?', body: 'Lagi di persimpangan antara dua pilihan. Penasaran sama pengalaman dan sudut pandang kalian.', category: 'Karier', created_at: timestamp(3), answer_count: 0 },
    { id: '44444444-4444-4444-8444-444444444444', title: 'Apa green flag dalam hubungan yang sering dianggap biasa?', body: 'Menurutku, bisa nyaman diam bareng tanpa merasa canggung. Kalau menurut kalian?', category: 'Hubungan', created_at: timestamp(5), answer_count: 1 },
    { id: '55555555-5555-4555-8555-555555555555', title: 'Kalau bisa mengulang satu hari dalam hidup, kamu pilih hari apa?', body: 'Bukan untuk mengubah apa-apa. Cuma untuk merasakan momen itu sekali lagi.', category: 'Random', created_at: timestamp(7), answer_count: 0 },
  ]
  const answers: Answer[] = [
    { id: 'demo-a1', question_id: questions[0]!.id, body: 'Kopi pagi sambil lihat hujan, tanpa harus buru-buru ke mana-mana. Sederhana tapi rasanya cukup banget.', created_at: timestamp(.5) },
    { id: 'demo-a2', question_id: questions[0]!.id, body: 'Ditelepon ibu cuma untuk ditanya sudah makan atau belum. Dulu biasa aja, sekarang jadi hal yang paling aku tunggu.', created_at: timestamp(.2) },
    { id: 'demo-a3', question_id: questions[1]!.id, body: 'Pernah. Tapi kita cuma lihat cuplikan hidup orang lain. Pelan-pelan juga tetap maju. Kamu nggak sendirian.', created_at: timestamp(1) },
    { id: 'demo-a4', question_id: questions[3]!.id, body: 'Bisa bilang tidak tanpa takut dia marah. Saling menghargai batasan itu penting.', created_at: timestamp(2) },
  ]
  return { questions: questions.map((question, index) => ({ ...question, short_code: ['KTMXZ', 'BPRVA', 'ZHFQS', 'WCNDE', 'ACFGH'][index]! })), answers }
}
