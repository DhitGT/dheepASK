// Skip I, L and O so codes are easier to read and type.
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ'
export function createShortCode(existing: Iterable<string>): string {
  const used = new Set(existing)
  const capacity = CODE_ALPHABET.length ** 5
  if (used.size >= capacity) throw new Error('Seluruh kode pertanyaan sudah terpakai.')
  const values = new Uint32Array(5)
  for (let attempt = 0; attempt < 1000; attempt++) {
    crypto.getRandomValues(values)
    const code = Array.from(values, value => CODE_ALPHABET[value % CODE_ALPHABET.length]).join('')
    if (!used.has(code)) return code
  }
  for (let value = 0; value < capacity; value++) {
    let code = ''
    for (let position = 4; position >= 0; position--) code += CODE_ALPHABET[Math.floor(value / CODE_ALPHABET.length ** position) % CODE_ALPHABET.length]
    if (!used.has(code)) return code
  }
  throw new Error('Seluruh kode pertanyaan sudah terpakai.')
}
