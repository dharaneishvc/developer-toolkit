import YAML from 'yaml'
import Papa from 'papaparse'
import { createTwoFilesPatch } from 'diff'
import { format as formatSql } from 'sql-formatter'
import Ajv from 'ajv'
import { marked } from 'marked'

export type Options = Record<string, string>
export type Field = { key: string; label: string; value: string; choices?: string[] }
export type Tool = { id: string; name: string; category: string; sample: string; secondary?: string; fields?: Field[]; run: (input: string, options: Options, secondary: string) => string | Promise<string> }
const encoder = new TextEncoder()
const json = (value: unknown) => JSON.stringify(value, null, 2)
const parse = (value: string): unknown => JSON.parse(value)
const field = (key: string, label: string, value: string, choices?: string[]): Field => ({ key, label, value, choices })
const textSample = 'Hello, world!\Developer tools, private by default.'
const jsonSample = '{"name":"Developer Toolkit","active":true,"tags":["free","private"]}'
const hex = (bytes: ArrayBuffer | Uint8Array) => Array.from(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('')
function fromHex(input: string) {
  if (!/^(?:[\da-f]{2})*$/i.test(input)) throw new Error('Enter an even number of hexadecimal digits.')
  return Uint8Array.from(input.match(/../g) ?? [], byte => Number.parseInt(byte, 16))
}
function base64(input: string) { return btoa(Array.from(encoder.encode(input), byte => String.fromCharCode(byte)).join('')) }
function unbase64(input: string) { return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(atob(input.replace(/-/g, '+').replace(/_/g, '/')), character => character.charCodeAt(0))) }
function sorted(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sorted)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([first], [second]) => first.localeCompare(second)).map(([key, item]) => [key, sorted(item)]))
  return value
}
function csv(input: string) {
  const result = Papa.parse<Record<string, string>>(input, { header: true, skipEmptyLines: true })
  if (result.errors.length) throw new Error(result.errors.map(error => error.message).join('\n'))
  return result.data
}
function integer(input: string, min: number, max: number) {
  const value = Number(input)
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(`Enter an integer between ${min} and ${max}.`)
  return value
}
async function pretty(input: string, parser: string) {
  const prettier = await import('prettier/standalone')
  const [babel, estree, html, postcss, markdown] = await Promise.all([import('prettier/plugins/babel'), import('prettier/plugins/estree'), import('prettier/plugins/html'), import('prettier/plugins/postcss'), import('prettier/plugins/markdown')])
  return prettier.format(input, { parser, plugins: [babel, estree, html, postcss, markdown] })
}
function date(input: string) {
  const value = new Date(input)
  if (Number.isNaN(value.getTime())) throw new Error('Enter a valid date, preferably ISO 8601 with a timezone.')
  return value
}
function rgb(input: string): number[] {
  const normalized = input.trim().replace(/^#/, '')
  if (!/^(?:[\da-f]{3}|[\da-f]{6})$/i.test(normalized)) throw new Error('Enter a three- or six-digit hex color.')
  const full = normalized.length === 3 ? [...normalized].map(character => character.repeat(2)).join('') : normalized
  return [0, 2, 4].map(offset => Number.parseInt(full.slice(offset, offset + 2), 16))
}
function luminance(color: number[]) {
  const linear = color.map(channel => { const value = channel / 255; return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4 })
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722
}
export const tools: Tool[] = [
  { id: 'json-format', name: 'JSON formatter', category: 'Data', sample: jsonSample, run: input => json(parse(input)) },
  { id: 'json-minify', name: 'JSON minifier', category: 'Data', sample: jsonSample, run: input => JSON.stringify(parse(input)) },
  { id: 'json-sort', name: 'Sort JSON keys', category: 'Data', sample: jsonSample, run: input => json(sorted(parse(input))) },
  { id: 'json-validate', name: 'JSON validator', category: 'Data', sample: jsonSample, run: input => { parse(input); return 'Valid JSON' } },
  { id: 'json-schema', name: 'JSON Schema validator', category: 'Data', sample: jsonSample, secondary: '{"type":"object","required":["name"],"properties":{"name":{"type":"string"}}}', run: (input, _options, secondary) => { const ajv = new Ajv({ allErrors: true, strict: false }); const validate = ajv.compile(JSON.parse(secondary)); return validate(parse(input)) ? 'Valid against schema' : json(validate.errors) } },
  { id: 'json-yaml', name: 'JSON to YAML', category: 'Data', sample: jsonSample, run: input => YAML.stringify(parse(input)) },
  { id: 'yaml-json', name: 'YAML to JSON', category: 'Data', sample: 'name: Developer Toolkit\nactive: true\ntags:\n  - private', run: input => json(YAML.parse(input, { maxAliasCount: 50 })) },
  { id: 'yaml-format', name: 'YAML formatter', category: 'Data', sample: 'name: Developer Toolkit\ntags: [free, private]', run: input => YAML.stringify(YAML.parse(input, { maxAliasCount: 50 })) },
  { id: 'csv-json', name: 'CSV to JSON', category: 'Data', sample: 'name,count\nAlpha,2\nBeta,3', run: input => json(csv(input)) },
  { id: 'json-csv', name: 'JSON to CSV', category: 'Data', sample: '[{"name":"Alpha","count":2},{"name":"Beta","count":3}]', run: input => { const value = parse(input); if (!Array.isArray(value) || value.some(item => !item || typeof item !== 'object' || Array.isArray(item))) throw new Error('Enter an array of flat objects.'); return Papa.unparse(value, { escapeFormulae: true }) } },
  { id: 'csv-tsv', name: 'CSV to TSV', category: 'Data', sample: 'name,count\nAlpha,2', run: input => Papa.unparse(csv(input), { delimiter: '\t', escapeFormulae: true }) },
  { id: 'json-lines', name: 'JSON to JSON Lines', category: 'Data', sample: '[{"name":"Alpha"},{"name":"Beta"}]', run: input => { const value = parse(input); if (!Array.isArray(value)) throw new Error('Enter a JSON array.'); return value.map(item => JSON.stringify(item)).join('\n') } },
  { id: 'lines-json', name: 'JSON Lines to JSON', category: 'Data', sample: '{"name":"Alpha"}\n{"name":"Beta"}', run: input => json(input.split(/\r?\n/).filter(line => line.trim()).map(line => parse(line))) },
  { id: 'js-format', name: 'JavaScript formatter', category: 'Code', sample: 'const greet=(name)=>{return `Hello ${name}`};', run: input => pretty(input, 'babel') },
  { id: 'ts-format', name: 'TypeScript formatter', category: 'Code', sample: 'type User={name:string;age:number};', run: input => pretty(input, 'babel-ts') },
  { id: 'html-format', name: 'HTML formatter', category: 'Code', sample: '<main><h1>Hello</h1><p>Developer tools</p></main>', run: input => pretty(input, 'html') },
  { id: 'css-format', name: 'CSS formatter', category: 'Code', sample: '.panel{display:grid;gap:16px;color:#155e75}', run: input => pretty(input, 'css') },
  { id: 'markdown-format', name: 'Markdown formatter', category: 'Code', sample: '# Title\n\n- first\n- second', run: input => pretty(input, 'markdown') },
  { id: 'markdown-html', name: 'Markdown to HTML', category: 'Code', sample: '# Hello\n\n**Private** by default.', run: input => marked.parse(input, { async: false }) },
  { id: 'sql-format', name: 'SQL formatter', category: 'Code', sample: 'select name,count(*) from users where active=true group by name;', fields: [field('dialect', 'Dialect', 'sql', ['sql', 'postgresql', 'mysql', 'sqlite', 'transactsql'])], run: (input, options) => formatSql(input, { language: options.dialect as 'sql' }) },
  { id: 'diff', name: 'Text diff', category: 'Text', sample: 'Hello world\nVersion one', secondary: 'Hello world\nVersion two', run: (input, _options, secondary) => createTwoFilesPatch('before', 'after', input, secondary) },
  { id: 'regex', name: 'Regex tester', category: 'Text', sample: 'Order #123, order #456', fields: [field('pattern', 'Pattern', '\\d+'), field('flags', 'Flags', 'g')], run: (input, options) => { const expression = new RegExp(options.pattern, options.flags); const matches = expression.global ? [...input.matchAll(expression)] : [expression.exec(input)].filter(match => match !== null); return json(matches.slice(0, 1000).map(match => ({ match: match[0], index: match.index, groups: match.slice(1), namedGroups: match.groups }))) } },
  { id: 'replace', name: 'Find and replace', category: 'Text', sample: textSample, fields: [field('find', 'Find (literal)', 'world'), field('replacement', 'Replacement', 'developer')], run: (input, options) => { if (!options.find) throw new Error('Find cannot be empty.'); return input.split(options.find).join(options.replacement) } },
  { id: 'text-case', name: 'Case converter', category: 'Text', sample: 'hello local developer', fields: [field('mode', 'Case', 'title', ['title', 'upper', 'lower', 'camel', 'snake', 'kebab'])], run: (input, options) => { const words = input.replace(/([a-z])([A-Z])/g, '$1 $2').split(/[^\p{L}\p{N}]+/u).filter(Boolean).map(word => word.toLowerCase()); switch (options.mode) { case 'upper': return input.toUpperCase(); case 'lower': return input.toLowerCase(); case 'camel': return words.map((word, index) => index ? word[0].toUpperCase() + word.slice(1) : word).join(''); case 'snake': return words.join('_'); case 'kebab': return words.join('-'); default: return words.map(word => word[0].toUpperCase() + word.slice(1)).join(' ') } } },
  { id: 'slug', name: 'Slug generator', category: 'Text', sample: 'Cafe & Code: Hello World!', run: input => input.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') },
  { id: 'text-stats', name: 'Text statistics', category: 'Text', sample: textSample, run: input => json({ characters: [...input].length, utf8Bytes: encoder.encode(input).length, words: input.match(/\S+/g)?.length ?? 0, lines: input ? input.split(/\r?\n/).length : 0, readingMinutes: Math.ceil((input.match(/\S+/g)?.length ?? 0) / 200) }) },
  { id: 'sort-lines', name: 'Sort lines', category: 'Text', sample: 'banana\napple\ncherry', fields: [field('order', 'Order', 'ascending', ['ascending', 'descending'])], run: (input, options) => { const lines = input.split(/\r?\n/).sort((first, second) => first.localeCompare(second, undefined, { numeric: true })); return (options.order === 'descending' ? lines.reverse() : lines).join('\n') } },
  { id: 'unique-lines', name: 'Deduplicate lines', category: 'Text', sample: 'apple\nbanana\napple', run: input => [...new Set(input.split(/\r?\n/))].join('\n') },
  { id: 'trim-lines', name: 'Trim whitespace', category: 'Text', sample: '  hello  \n  world  ', run: input => input.split(/\r?\n/).map(line => line.trim()).join('\n').trim() },
  { id: 'reverse', name: 'Reverse text', category: 'Text', sample: 'Hello world', run: input => [...input].reverse().join('') },
  { id: 'base64-encode', name: 'Base64 encode', category: 'Encoding', sample: textSample, run: input => base64(input) },
  { id: 'base64-decode', name: 'Base64 decode', category: 'Encoding', sample: 'SGVsbG8sIHdvcmxkIQ==', run: input => unbase64(input.trim()) },
  { id: 'url-encode', name: 'URL encode', category: 'Encoding', sample: 'hello world & tools', run: input => encodeURIComponent(input) },
  { id: 'url-decode', name: 'URL decode', category: 'Encoding', sample: 'hello%20world%20%26%20tools', run: input => decodeURIComponent(input) },
  { id: 'url-inspect', name: 'URL inspector', category: 'Encoding', sample: 'https://example.com/tools?q=hello&tag=one&tag=two#data', run: input => { const url = new URL(input); return json({ protocol: url.protocol, hostname: url.hostname, port: url.port, pathname: url.pathname, hash: url.hash, parameters: [...url.searchParams.entries()] }) } },
  { id: 'html-escape', name: 'HTML escape', category: 'Encoding', sample: '<div title="test">A & B</div>', run: input => input.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;') },
  { id: 'json-escape', name: 'JSON string escape', category: 'Encoding', sample: textSample, run: input => JSON.stringify(input) },
  { id: 'json-unescape', name: 'JSON string unescape', category: 'Encoding', sample: '"Hello\\nworld"', run: input => { const value = parse(input); if (typeof value !== 'string') throw new Error('Enter a quoted JSON string.'); return value } },
  { id: 'hex-encode', name: 'Text to hex', category: 'Encoding', sample: 'Hello', run: input => hex(encoder.encode(input)) },
  { id: 'hex-decode', name: 'Hex to text', category: 'Encoding', sample: '48656c6c6f', run: input => new TextDecoder('utf-8', { fatal: true }).decode(fromHex(input.trim())) },
  { id: 'jwt', name: 'JWT decoder', category: 'Crypto', sample: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJuYW1lIjoiQWxwaGEifQ.signature', run: input => { const pieces = input.trim().split('.'); if (pieces.length !== 3) throw new Error('Enter a three-part JWT.'); return json({ warning: 'Decoded only. Signature, issuer, audience, and expiry are NOT verified.', header: parse(unbase64(pieces[0])), payload: parse(unbase64(pieces[1])) }) } },
  { id: 'hash', name: 'SHA hash', category: 'Crypto', sample: 'hello', fields: [field('algorithm', 'Algorithm', 'SHA-256', ['SHA-256', 'SHA-384', 'SHA-512', 'SHA-1'])], run: async (input, options) => hex(await crypto.subtle.digest(options.algorithm, encoder.encode(input))) },
  { id: 'hmac', name: 'HMAC generator', category: 'Crypto', sample: 'message', fields: [field('key', 'Secret key (session only)', 'sample-key'), field('algorithm', 'Algorithm', 'SHA-256', ['SHA-256', 'SHA-384', 'SHA-512'])], run: async (input, options) => { if (!options.key) throw new Error('Enter a secret key.'); const key = await crypto.subtle.importKey('raw', encoder.encode(options.key), { name: 'HMAC', hash: options.algorithm }, false, ['sign']); return hex(await crypto.subtle.sign('HMAC', key, encoder.encode(input))) } },
  { id: 'uuid', name: 'UUID generator', category: 'Generators', sample: '', fields: [field('count', 'Count', '5')], run: (_input, options) => Array.from({ length: integer(options.count, 1, 1000) }, () => crypto.randomUUID()).join('\n') },
  { id: 'password', name: 'Password generator', category: 'Generators', sample: '', fields: [field('length', 'Length', '24'), field('count', 'Count', '5'), field('alphabet', 'Alphabet', 'all', ['all', 'alphanumeric', 'hex'])], run: (_input, options) => { const alphabet = options.alphabet === 'hex' ? '0123456789abcdef' : 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789' + (options.alphabet === 'all' ? '!@#$%&*+-_?' : ''); const length = integer(options.length, 8, 256); return Array.from({ length: integer(options.count, 1, 100) }, () => { let output = ''; const limit = 256 - 256 % alphabet.length; while (output.length < length) { const bytes = crypto.getRandomValues(new Uint8Array(length * 2)); for (const byte of bytes) { if (byte < limit && output.length < length) output += alphabet[byte % alphabet.length] } } return output }).join('\n') } },
  { id: 'random-bytes', name: 'Random hex generator', category: 'Generators', sample: '', fields: [field('length', 'Bytes', '32')], run: (_input, options) => hex(crypto.getRandomValues(new Uint8Array(integer(options.length, 1, 4096)))) },
  { id: 'lorem', name: 'Lorem ipsum generator', category: 'Generators', sample: '', fields: [field('count', 'Paragraphs', '3')], run: (_input, options) => Array.from({ length: integer(options.count, 1, 100) }, () => 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vitae libero ac sapien faucibus consectetur. Donec posuere, velit sed facilisis tempor, justo lacus egestas urna, et tincidunt mi arcu at ipsum.').join('\n\n') },
  { id: 'timestamp-date', name: 'Timestamp to date', category: 'Date & Numbers', sample: '1704067200', fields: [field('unit', 'Unit', 'seconds', ['seconds', 'milliseconds'])], run: (input, options) => { if (!/^-?\d+$/.test(input.trim())) throw new Error('Enter an integer timestamp.'); const value = new Date(Number(input) * (options.unit === 'seconds' ? 1000 : 1)); if (Number.isNaN(value.getTime())) throw new Error('Timestamp is out of range.'); return json({ iso: value.toISOString(), utc: value.toUTCString(), local: value.toString() }) } },
  { id: 'date-timestamp', name: 'Date to timestamp', category: 'Date & Numbers', sample: '2024-01-01T00:00:00Z', run: input => { const value = date(input); return json({ seconds: Math.floor(value.getTime() / 1000), milliseconds: value.getTime(), iso: value.toISOString() }) } },
  { id: 'date-diff', name: 'Date difference', category: 'Date & Numbers', sample: '2024-01-01T00:00:00Z', secondary: '2024-01-08T00:00:00Z', run: (input, _options, secondary) => { const milliseconds = date(secondary).getTime() - date(input).getTime(); return json({ milliseconds, seconds: milliseconds / 1000, hours: milliseconds / 3600000, days: milliseconds / 86400000 }) } },
  { id: 'number-base', name: 'Number base converter', category: 'Date & Numbers', sample: '255', fields: [field('from', 'From base', '10', ['2', '8', '10', '16']), field('to', 'To base', '16', ['2', '8', '10', '16'])], run: (input, options) => { const normalized = input.trim(); const patterns: Record<string, RegExp> = { '2': /^[01]+$/, '8': /^[0-7]+$/, '10': /^\d+$/, '16': /^[\da-f]+$/i }; const unsigned = normalized.replace(/^-/, ''); if (!patterns[options.from]?.test(unsigned)) throw new Error('Invalid digits for the selected base.'); const prefixes: Options = { '2': '0b', '8': '0o', '10': '', '16': '0x' }; const value = BigInt(prefixes[options.from] + unsigned) * (normalized.startsWith('-') ? -1n : 1n); return value.toString(Number(options.to)) } },
  { id: 'bytes', name: 'Byte size converter', category: 'Date & Numbers', sample: '1048576', run: input => { const value = Number(input); if (!input.trim() || !Number.isFinite(value) || value < 0) throw new Error('Enter a non-negative finite byte count.'); return json(Object.fromEntries(['B', 'KiB', 'MiB', 'GiB', 'TiB'].map((unit, index) => [unit, value / 1024 ** index]))) } },
  { id: 'color', name: 'Hex to RGB / HSL', category: 'Color', sample: '#0891b2', run: input => { const color = rgb(input); const [red, green, blue] = color.map(channel => channel / 255); const maximum = Math.max(red, green, blue); const minimum = Math.min(red, green, blue); const delta = maximum - minimum; const lightness = (maximum + minimum) / 2; const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1)); let hue = 0; if (delta) hue = (maximum === red ? ((green - blue) / delta + 6) % 6 : maximum === green ? (blue - red) / delta + 2 : (red - green) / delta + 4) * 60; return json({ hex: '#' + color.map(channel => channel.toString(16).padStart(2, '0')).join(''), rgb: `rgb(${color.join(', ')})`, hsl: `hsl(${Math.round(hue)}, ${Math.round(saturation * 100)}%, ${Math.round(lightness * 100)}%)` }) } },
  { id: 'contrast', name: 'WCAG contrast checker', category: 'Color', sample: '#155e75', secondary: '#ffffff', run: (input, _options, secondary) => { const first = luminance(rgb(input)); const second = luminance(rgb(secondary)); const ratio = (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05); return json({ ratio: Number(ratio.toFixed(2)), AA_normal: ratio >= 4.5, AA_large: ratio >= 3, AAA_normal: ratio >= 7, AAA_large: ratio >= 4.5 }) } },
]

export async function execute(id: string, input: string, options: Options = {}, secondary = '') {
  if (input.length + secondary.length > 2_000_000) throw new Error('Text input is limited to 2 million characters per job.')
  const tool = tools.find(item => item.id === id)
  if (!tool) throw new Error('Unknown tool.')
  const defaults = Object.fromEntries(tool.fields?.map(item => [item.key, item.value]) ?? [])
  const output = await tool.run(input, { ...defaults, ...options }, secondary)
  if (output.length > 5_000_000) throw new Error('Output exceeds the 5 million character limit.')
  return output
}