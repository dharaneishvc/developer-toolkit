import { useEffect, useRef, useState } from 'react'
import { ArrowDownToLine, ArrowRight, ArrowRightLeft, Check, Copy, FileUp, FlaskConical, Play, Square, Trash2 } from 'lucide-react'
import { Shell, IconButton } from './Shell'
import { tools } from './tools'
import type { Options } from './tools'
import { recordHistory } from './storage'
import './ui.css'

function initialTool() { return tools.find(tool => tool.id === window.location.hash.slice(1))?.id ?? tools[0].id }
function Workbench({ id }: { id: string }) {
  const tool = tools.find(item => item.id === id)!
  const [input, setInput] = useState('')
  const [secondary, setSecondary] = useState('')
  const [output, setOutput] = useState('')
  const [options, setOptions] = useState<Options>(Object.fromEntries(tool.fields?.map(field => [field.key, field.value]) ?? []))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const worker = useRef<Worker | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const upload = useRef<HTMLInputElement>(null)
  useEffect(() => () => { worker.current?.terminate(); clearTimeout(timer.current) }, [])
  function cancel() { worker.current?.terminate(); worker.current = null; clearTimeout(timer.current); setBusy(false) }
  function run() {
    cancel(); setError(''); setOutput(''); setBusy(true); setCopied(false)
    const start = performance.now()
    const job = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
    worker.current = job
    timer.current = setTimeout(() => { cancel(); setError('Job exceeded 15 seconds and was stopped. Reduce the input or simplify the expression.') }, 15000)
    job.onmessage = event => {
      cancel(); setElapsed(Math.round(performance.now() - start))
      if (event.data.error) setError(event.data.error)
      else { setOutput(event.data.output); recordHistory(id, tool.name).catch(() => setError('Output generated, but local history could not be saved.')) }
    }
    job.onerror = () => { cancel(); setError('Worker failed. Please retry or reload the application.') }
    job.postMessage({ id, input, options, secondary })
  }
  async function copy() { try { await navigator.clipboard.writeText(output); setCopied(true) } catch { setError('Clipboard unavailable. Select and copy the output manually.') } }
  function download() {
    const url = URL.createObjectURL(new Blob([output], { type: 'text/plain;charset=utf-8' }))
    const link = document.createElement('a'); link.href = url; link.download = `${id}.txt`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  async function importText(file?: File) { if (!file) return; if (file.size > 4_000_000) { setError('Text files are limited to 4 MB.'); return }; try { setInput(await file.text()); setError('') } catch { setError('Could not read the file.') } }
  return <div className="workbench" onKeyDown={event => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && !busy) { event.preventDefault(); run() } }}>
    {tool.fields && <div className="options-bar">{tool.fields.map(field => <label key={field.key}>{field.label}{field.choices ? <select value={options[field.key]} onChange={event => setOptions({ ...options, [field.key]: event.target.value })}>{field.choices.map(choice => <option key={choice}>{choice}</option>)}</select> : <input type={field.key === 'key' ? 'password' : 'text'} autoComplete="off" value={options[field.key]} onChange={event => setOptions({ ...options, [field.key]: event.target.value })} />}</label>)}</div>}
    <div className="editor-grid"><section className="editor-pane"><div className="section-toolbar"><h3>Input</h3><div className="actions"><IconButton label="Load example" onClick={() => { setInput(tool.sample); setSecondary(tool.secondary ?? ''); setError('') }}><FlaskConical size={17} /></IconButton><IconButton label="Import text file" onClick={() => upload.current?.click()}><FileUp size={17} /></IconButton><IconButton label="Clear input" onClick={() => { setInput(''); setSecondary('') }}><Trash2 size={17} /></IconButton></div></div><input hidden type="file" ref={upload} accept=".txt,.json,.yaml,.yml,.csv,.tsv,.md,.html,.css,.js,.ts,.sql,.log" onChange={event => { void importText(event.target.files?.[0]); event.target.value = '' }} /><textarea aria-label="Input" spellCheck={false} value={input} onChange={event => setInput(event.target.value)} />{tool.secondary !== undefined && <><div className="section-toolbar"><h3>{id === 'json-schema' ? 'Schema' : 'Comparison input'}</h3><IconButton label="Swap inputs" onClick={() => { setInput(secondary); setSecondary(input) }}><ArrowRightLeft size={17} /></IconButton></div><textarea className="secondary-editor" aria-label={id === 'json-schema' ? 'Schema' : 'Comparison input'} spellCheck={false} value={secondary} onChange={event => setSecondary(event.target.value)} /></>}<div className="editor-footer"><span>{input.length.toLocaleString()} characters</span><span>UTF-8</span></div></section>
    <section className="editor-pane output-pane"><div className="section-toolbar"><h3>Output</h3><div className="actions"><IconButton label="Use output as input" disabled={!output} onClick={() => setInput(output)}><ArrowRightLeft size={17} /></IconButton><IconButton label={copied ? 'Copied' : 'Copy output'} disabled={!output} onClick={() => { void copy() }}>{copied ? <Check size={17} /> : <Copy size={17} />}</IconButton><IconButton label="Download output" disabled={!output} onClick={download}><ArrowDownToLine size={17} /></IconButton></div></div><textarea aria-label="Output" readOnly spellCheck={false} value={output} />{!output && !busy && <div className="output-empty"><ArrowRight size={28} /></div>}<div className="editor-footer"><span role="status">{busy ? 'Processing...' : output ? `${output.length.toLocaleString()} characters` : 'Ready'}</span><span>{output ? `${elapsed} ms` : 'TEXT'}</span></div></section></div>
    <div className="run-bar">{error ? <p className="error" role="alert">{error}</p> : <span className="run-status"><span className={`status-dot ${busy ? 'busy' : ''}`} />{busy ? 'Running' : 'Ready'}</span>}<button className="primary-button" onClick={busy ? cancel : run}>{busy ? <Square size={16} /> : <Play size={16} />}{busy ? 'Stop' : 'Run'}</button></div>
  </div>
}
export default function App() {
  const [active, setActive] = useState(initialTool)
  useEffect(() => { const handler = () => setActive(initialTool()); window.addEventListener('hashchange', handler); return () => window.removeEventListener('hashchange', handler) }, [])
  return <Shell title="Developer toolbox" subtitle="Developer" tools={tools} active={active} onSelect={setActive}><Workbench key={active} id={active} /></Shell>
}