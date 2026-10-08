export type Category = 'Kehidupan' | 'Hubungan' | 'Karier' | 'Pendidikan' | 'Teknologi' | 'Random'
export interface Question { id: string; short_code: string; title: string; body: string; category: Category; created_at: string; answer_count: number; room_id?: string | null; anon_name?: string }
export interface Answer { id: string; question_id: string; parent_id?: string | null; body: string; created_at: string; anon_name?: string }
export interface Room { id: string; title: string; context: string; token: string; slug: string; created_at: string; my_alias: string; is_owner: boolean }
