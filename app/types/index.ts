export type Category = 'Kehidupan' | 'Hubungan' | 'Karier' | 'Pendidikan' | 'Teknologi' | 'Random'
export interface Question { id: string; short_code: string; title: string; body: string; category: Category; created_at: string; answer_count: number }
export interface Answer { id: string; question_id: string; body: string; created_at: string }
