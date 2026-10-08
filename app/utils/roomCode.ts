export const ROOM_CODE_PATTERN = /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/i
export function createRoomCode(existing: Iterable<string>): string {
  const used = new Set(Array.from(existing, code => code.toLowerCase()))
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  for (let attempt = 0; attempt < 1000; attempt++) {
    let code = ''
    while (code.length < 7) {
      const bytes = crypto.getRandomValues(new Uint8Array(16))
      for (const value of bytes) {
        if (value < 234) code += alphabet[value % 26]
        if (code.length === 7) break
      }
    }
    if (!used.has(code.toLowerCase())) return code
  }
  throw new Error('Kode ruang belum bisa dibuat. Coba lagi.')
}
