import { execute } from './tools'
self.onmessage = async event => {
  const { id, input, options, secondary } = event.data
  try { self.postMessage({ output: await execute(id, input, options, secondary) }) }
  catch (error) { self.postMessage({ error: error instanceof Error ? error.message : 'Processing failed.' }) }
}