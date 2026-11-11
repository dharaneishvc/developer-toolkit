import { describe, expect, it } from 'vitest'
import { execute, tools } from './tools'

describe('supported catalog', () => {
  it('has unique tool identifiers', () => expect(new Set(tools.map(tool => tool.id)).size).toBe(tools.length))
  for (const tool of tools) {
    it(`runs the ${tool.name} sample`, async () => {
      const output = await execute(tool.id, tool.sample, {}, tool.secondary ?? '')
      expect(typeof output).toBe('string')
      expect(output.length).toBeGreaterThan(0)
    })
  }
})
describe('correctness and boundaries', () => {
  it('roundtrips Unicode base64', async () => expect(await execute('base64-decode', await execute('base64-encode', 'cafe \u2603 \ud83d\ude80'))).toBe('cafe \u2603 \ud83d\ude80'))
  it('roundtrips UTF-8 hex', async () => expect(await execute('hex-decode', await execute('hex-encode', '\u00e9'))).toBe('\u00e9'))
  it('preserves large integers', async () => expect(await execute('number-base', '18446744073709551615', { to: '16' })).toBe('ffffffffffffffff'))
  it('sorts recursively without reordering arrays', async () => expect(JSON.parse(await execute('json-sort', '{"z":[3,1],"a":{"z":0,"a":1}}'))).toEqual({ a: { a: 1, z: 0 }, z: [3, 1] }))
  it('computes a known SHA-256 vector', async () => expect(await execute('hash', 'hello')).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'))
  it('computes 21:1 contrast for black and white', async () => expect(JSON.parse(await execute('contrast', '#000', {}, '#fff')).ratio).toBe(21))
  it('does not verify decoded JWTs', async () => expect(await execute('jwt', tools.find(tool => tool.id === 'jwt')!.sample)).toContain('NOT verified'))
  it('escapes spreadsheet formulas on CSV export', async () => expect(await execute('json-csv', '[{"value":"=1+1"}]')).toContain("'=1+1"))
  it('reports schema mismatches', async () => expect(await execute('json-schema', '{"name":4}', {}, '{"type":"object","properties":{"name":{"type":"string"}}}')).toContain('must be string'))
  it.each([['json-format', '{'], ['hex-decode', 'xyz'], ['url-decode', '%zz'], ['number-base', '12'], ['date-timestamp', 'nonsense'], ['csv-json', 'a,b\n1,2,3'], ['json-csv', '{}']])('rejects invalid %s input', async (id, input) => {
    await expect(execute(id, input, id === 'number-base' ? { from: '2' } : {})).rejects.toThrow()
  })
  it('rejects oversized input', async () => { await expect(execute('json-format', 'a'.repeat(2_000_001))).rejects.toThrow('limited') })
  it('rejects unreasonable generators', async () => { await expect(execute('password', '', { length: '999999' })).rejects.toThrow('integer') })
  it('rejects unknown tools', async () => { await expect(execute('missing', '')).rejects.toThrow('Unknown') })
})